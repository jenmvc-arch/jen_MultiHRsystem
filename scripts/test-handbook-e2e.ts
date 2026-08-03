import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { PDFDocument } from 'pdf-lib';
import finalizeHandbook from '../api/onboarding/finalize-handbook';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('Supabase URL, anon key, and service role key are required.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const signer = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const nonce = Date.now();
const employeeId = `codex-handbook-e2e-${nonce}`;
const email = `${employeeId}@example.invalid`;
const password = `Tmp-${randomUUID()}!Aa9`;
let userId = '';
let signingSessionId = '';
let finalPdfPath = '';
const signaturePaths: string[] = [];

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function invokeFinalize(accessToken: string) {
  let statusCode = 0;
  let payload: any = null;
  const response = {
    setHeader: () => undefined,
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      payload = body;
      return this;
    },
  };
  await finalizeHandbook(
    {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body: { sessionId: signingSessionId },
    },
    response
  );
  assert.equal(statusCode, 200, payload?.error || 'Finalization did not return HTTP 200.');
  return payload;
}

async function cleanup() {
  if (signaturePaths.length) {
    await admin.storage.from('onboarding-signatures').remove(signaturePaths);
  }
  if (finalPdfPath) {
    await admin.storage.from('signed-handbooks').remove([finalPdfPath]);
  }
  if (signingSessionId) {
    await admin.from('onboarding_signing_sessions').delete().eq('id', signingSessionId);
  }
  await admin.from('audit_logs').delete().eq('employee_email', email);
  await admin.from('employees').delete().eq('id', employeeId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

async function run() {
  console.log('RUNNING LIVE HANDBOOK SIGNING E2E TEST');
  try {
    const { data: createdUser, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (userError || !createdUser.user) throw userError || new Error('Test Auth user was not created.');
    userId = createdUser.user.id;

    const { error: employeeError } = await admin.from('employees').insert({
      id: employeeId,
      entity_id: 'ENT-92',
      entity_name: 'Red Point Sdn Bhd',
      name: 'Handbook E2E Test Employee',
      email,
      designation: 'Test Employee',
      department: 'Human Resources',
      status: 'Active',
      basic_salary: 0,
    });
    if (employeeError) throw employeeError;

    const { data: authData, error: authError } = await signer.auth.signInWithPassword({
      email,
      password,
    });
    if (authError || !authData.session) throw authError || new Error('Test signer could not authenticate.');

    const { data: session, error: sessionError } = await signer.rpc(
      'create_or_resume_handbook_session',
      {
        p_subject_type: 'employee',
        p_subject_id: employeeId,
        p_subject_email: email,
        p_entity_id: 'ENT-92',
        p_template_version: 'redpoint-handbook-v1.0-2026-08-02',
        p_start_new_revision: false,
      }
    );
    if (sessionError || !session) throw sessionError || new Error('Signing session was not created.');
    signingSessionId = session.id;

    const markBytes = new Uint8Array(
      await readFile(new URL('../public/redpoint-logo.png', import.meta.url))
    );
    for (let partNumber = 1; partNumber <= 15; partNumber += 1) {
      const markType = partNumber === 15 ? 'final_signature' : 'initial';
      const imagePath = `${userId}/${signingSessionId}/part-${partNumber}-${markType}.png`;
      signaturePaths.push(imagePath);
      const { error: uploadError } = await signer.storage
        .from('onboarding-signatures')
        .upload(imagePath, markBytes, { contentType: 'image/png', upsert: false });
      if (uploadError) throw uploadError;
      const { error: markError } = await signer.rpc('record_handbook_mark', {
        p_session_id: signingSessionId,
        p_part_number: partNumber,
        p_mark_type: markType,
        p_image_path: imagePath,
      });
      if (markError) throw markError;
    }

    const { error: quizError } = await signer.rpc('record_handbook_quiz_result', {
      p_session_id: signingSessionId,
      p_score_percent: 100,
      p_grade: 'PASSED',
    });
    if (quizError) throw quizError;

    const firstResult = await invokeFinalize(authData.session.access_token);
    const { data: finalizedSession, error: finalizedError } = await admin
      .from('onboarding_signing_sessions')
      .select('*')
      .eq('id', signingSessionId)
      .single();
    if (finalizedError || !finalizedSession) throw finalizedError || new Error('Final record missing.');
    assert.equal(finalizedSession.status, 'finalized');
    assert.equal(firstResult.sha256, finalizedSession.final_pdf_sha256);
    finalPdfPath = finalizedSession.final_pdf_path;

    const { data: finalBlob, error: finalDownloadError } = await admin.storage
      .from('signed-handbooks')
      .download(finalPdfPath);
    if (finalDownloadError || !finalBlob) throw finalDownloadError || new Error('Final PDF missing.');
    const finalBytes = new Uint8Array(await finalBlob.arrayBuffer());
    assert.equal(sha256(finalBytes), firstResult.sha256);
    const finalPdf = await PDFDocument.load(finalBytes);
    assert.equal(finalPdf.getPageCount(), 93);

    const secondResult = await invokeFinalize(authData.session.access_token);
    assert.equal(secondResult.sha256, firstResult.sha256, 'Finalization must be idempotent.');
    assert.equal(secondResult.recordId, firstResult.recordId);

    const { error: lockedMarkError } = await signer.rpc('record_handbook_mark', {
      p_session_id: signingSessionId,
      p_part_number: 1,
      p_mark_type: 'initial',
      p_image_path: signaturePaths[0],
    });
    assert.ok(lockedMarkError, 'Finalized sessions must reject mark changes.');

    console.log('Live session finalized and locked.');
    console.log('Final PDF pages: 93');
    console.log('Idempotent final SHA-256:', firstResult.sha256);
    console.log('LIVE HANDBOOK SIGNING E2E TEST PASSED');
  } finally {
    await signer.auth.signOut();
    await cleanup();
    console.log('Temporary Auth, employee, signing, audit, and Storage records removed.');
  }
}

run().catch((error) => {
  console.error('LIVE HANDBOOK SIGNING E2E TEST FAILED');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
