import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { PNG } from 'pngjs';
import { stampHandbookTemplate } from '../../src/onboarding-portal/signing/handbookPdf.js';
import {
  FINAL_SIGNATURE_PART_NUMBER,
  FinalizeHandbookResponse,
  HandbookPdfMarkInput,
  HandbookPlacementManifest,
  INITIAL_PART_NUMBERS,
} from '../../src/onboarding-portal/signing/types.js';

const SIGNED_URL_TTL_SECONDS = 5 * 60;
const MAX_SIGNATURE_IMAGE_BYTES = 2 * 1024 * 1024;

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function getBearerToken(authorization: string | undefined): string {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('A Supabase Auth bearer token is required.');
  return match[1];
}

function safePathSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._@-]+/g, '_');
}

function validateSignaturePng(bytes: Uint8Array, partNumber: number): void {
  if (bytes.length === 0 || bytes.length > MAX_SIGNATURE_IMAGE_BYTES) {
    throw new Error(`The Part ${partNumber} signature image has an invalid file size.`);
  }

  let png: PNG;
  try {
    png = PNG.sync.read(Buffer.from(bytes));
  } catch {
    throw new Error(`The Part ${partNumber} signature image is not a valid PNG.`);
  }
  if (png.width < 2 || png.height < 2 || png.width > 2400 || png.height > 1200) {
    throw new Error(`The Part ${partNumber} signature image dimensions are invalid.`);
  }

  let visiblePixels = 0;
  for (let index = 3; index < png.data.length; index += 4) {
    if (png.data[index] > 8) visiblePixels += 1;
    if (visiblePixels >= 12) return;
  }
  throw new Error(`The Part ${partNumber} signature image is blank.`);
}

function toCamelSession(row: any) {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    subjectEmail: row.subject_email,
    signerUserId: row.signer_user_id,
    templateId: row.template_id,
    revision: row.revision,
    status: row.status,
    quizScorePercent: Number(row.quiz_score_percent),
    quizGrade: row.quiz_grade,
    quizPassed: row.quiz_passed,
    finalPdfPath: row.final_pdf_path,
    finalPdfSha256: row.final_pdf_sha256,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    res.status(500).json({ error: 'Handbook finalization environment is not configured.' });
    return;
  }

  let sessionLocked = false;
  let sessionId = '';

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const token = getBearerToken(req.headers.authorization);
    sessionId = String(req.body?.sessionId || '').trim();
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required.' });
      return;
    }

    const authenticated = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: userError,
    } = await authenticated.auth.getUser(token);
    if (userError || !user) {
      res.status(401).json({ error: 'The signing session is not authenticated.' });
      return;
    }

    const { data: sessionRow, error: sessionError } = await admin
      .from('onboarding_signing_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (sessionError || !sessionRow) {
      res.status(404).json({ error: 'Signing session was not found.' });
      return;
    }

    const session = toCamelSession(sessionRow);
    if (session.signerUserId !== user.id) {
      res.status(403).json({ error: 'This signing session belongs to another user.' });
      return;
    }

    if (session.status === 'finalized' && session.finalPdfPath && session.finalPdfSha256) {
      const { data: signedUrl, error: signedUrlError } = await admin.storage
        .from('signed-handbooks')
        .createSignedUrl(session.finalPdfPath, SIGNED_URL_TTL_SECONDS);
      if (signedUrlError || !signedUrl?.signedUrl) {
        throw new Error('The finalized handbook could not be opened.');
      }
      const existing: FinalizeHandbookResponse = {
        recordId: session.id,
        revision: session.revision,
        downloadUrl: signedUrl.signedUrl,
        sha256: session.finalPdfSha256,
      };
      res.status(200).json(existing);
      return;
    }

    if (session.status !== 'in_progress') {
      res.status(409).json({ error: 'This handbook is already being finalized.' });
      return;
    }
    if (!session.quizPassed || !Number.isFinite(session.quizScorePercent)) {
      res.status(409).json({ error: 'A passing compliance quiz is required.' });
      return;
    }

    const { data: lockedRows, error: lockError } = await admin
      .from('onboarding_signing_sessions')
      .update({ status: 'finalizing', updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('status', 'in_progress')
      .select('*');
    if (lockError || !lockedRows || lockedRows.length !== 1) {
      res.status(409).json({ error: 'This handbook is already being finalized.' });
      return;
    }
    sessionLocked = true;

    const [{ data: template, error: templateError }, { data: markRows, error: marksError }] =
      await Promise.all([
        admin.from('handbook_templates').select('*').eq('id', session.templateId).single(),
        admin
          .from('onboarding_signature_marks')
          .select('*')
          .eq('session_id', sessionId)
          .order('part_number'),
      ]);
    if (templateError || !template) throw new Error('The handbook template is unavailable.');
    if (marksError || !markRows) throw new Error('The signature marks could not be loaded.');

    const requiredParts = [...INITIAL_PART_NUMBERS, FINAL_SIGNATURE_PART_NUMBER];
    if (markRows.length !== requiredParts.length) {
      throw new Error('The signing session must contain exactly 15 signature marks.');
    }
    for (const partNumber of requiredParts) {
      const mark = markRows.find((item: any) => item.part_number === partNumber);
      if (!mark) throw new Error(`Part ${partNumber} has not been signed.`);
      const expectedKind =
        partNumber === FINAL_SIGNATURE_PART_NUMBER ? 'final_signature' : 'initial';
      if (mark.mark_type !== expectedKind) {
        throw new Error(`Part ${partNumber} has an invalid signature mark.`);
      }
    }

    const { data: templateBlob, error: templateDownloadError } = await admin.storage
      .from('handbook-templates')
      .download(template.storage_path);
    if (templateDownloadError || !templateBlob) {
      throw new Error('The original handbook PDF could not be downloaded.');
    }
    const templateBytes = new Uint8Array(await templateBlob.arrayBuffer());
    const templateHash = sha256Hex(templateBytes);
    if (templateHash !== String(template.sha256).toLowerCase()) {
      throw new Error('The handbook template SHA-256 does not match its registered version.');
    }

    const markInputs: HandbookPdfMarkInput[] = await Promise.all(
      markRows.map(async (mark: any) => {
        const { data: imageBlob, error: imageError } = await admin.storage
          .from('onboarding-signatures')
          .download(mark.image_path);
        if (imageError || !imageBlob) {
          throw new Error(`The Part ${mark.part_number} signature image is unavailable.`);
        }
        const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
        validateSignaturePng(imageBytes, mark.part_number);
        return {
          partNumber: mark.part_number,
          kind: mark.mark_type,
          imageBytes,
          capturedAt: mark.captured_at,
        };
      })
    );

    const subjectTable = session.subjectType === 'employee' ? 'employees' : 'candidates';
    let { data: subject } = await admin
      .from(subjectTable)
      .select('*')
      .eq('id', session.subjectId)
      .ilike('email', session.subjectEmail)
      .maybeSingle();
    if (!subject) {
      const { data: subjectByEmail } = await admin
        .from(subjectTable)
        .select('*')
        .eq('email', session.subjectEmail)
        .maybeSingle();
      subject = subjectByEmail;
    }
    if (!subject) throw new Error('The employee or candidate record is unavailable.');

    const finalizedAt = new Date().toISOString();
    const finalizedBytes = await stampHandbookTemplate({
      templateBytes,
      manifest: template.coordinate_map as HandbookPlacementManifest,
      marks: markInputs,
      audit: {
        recordId: session.id,
        employeeName: subject.name || session.subjectEmail,
        employeeId: session.subjectId,
        employeeEmail: session.subjectEmail,
        department: subject.department || 'Not specified',
        position: subject.designation || 'Employee',
        templateVersion: template.version,
        templateSha256: templateHash,
        revision: session.revision,
        finalizedAt,
        quizScorePercent: session.quizScorePercent,
        quizGrade: session.quizGrade || 'Passed',
      },
    });
    const finalHash = sha256Hex(finalizedBytes);
    const finalPath = [
      'signed',
      safePathSegment(session.subjectId),
      safePathSegment(template.version),
      `revision-${session.revision}.pdf`,
    ].join('/');

    const { error: uploadError } = await admin.storage
      .from('signed-handbooks')
      .upload(finalPath, finalizedBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (uploadError) throw new Error(`Final PDF upload failed: ${uploadError.message}`);

    const { data: finalizedRows, error: finalizeError } = await admin
      .from('onboarding_signing_sessions')
      .update({
        status: 'finalized',
        final_pdf_path: finalPath,
        final_pdf_sha256: finalHash,
        finalized_at: finalizedAt,
        updated_at: finalizedAt,
      })
      .eq('id', sessionId)
      .eq('status', 'finalizing')
      .select('id');
    if (finalizeError || finalizedRows?.length !== 1) {
      throw new Error(
        `Final signing record failed: ${finalizeError?.message || 'session lock was lost'}`
      );
    }

    await admin.from('audit_logs').insert({
      employee_email: session.subjectEmail,
      changed_by: session.subjectEmail,
      change_type: 'HANDBOOK_FINALIZED',
      old_value: null,
      new_value: JSON.stringify({
        recordId: session.id,
        revision: session.revision,
        templateVersion: template.version,
        finalPdfSha256: finalHash,
      }),
    });

    const { data: signedUrl, error: signedUrlError } = await admin.storage
      .from('signed-handbooks')
      .createSignedUrl(finalPath, SIGNED_URL_TTL_SECONDS);
    if (signedUrlError || !signedUrl?.signedUrl) {
      throw new Error('The signed handbook was saved but its download link could not be created.');
    }

    const response: FinalizeHandbookResponse = {
      recordId: session.id,
      revision: session.revision,
      downloadUrl: signedUrl.signedUrl,
      sha256: finalHash,
    };
    res.status(200).json(response);
  } catch (error: any) {
    if (sessionLocked && sessionId) {
      await admin
        .from('onboarding_signing_sessions')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('status', 'finalizing');
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Handbook finalization failed.',
    });
  }
}
