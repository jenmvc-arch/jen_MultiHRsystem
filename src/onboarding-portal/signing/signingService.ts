import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import {
  FINAL_SIGNATURE_PART_NUMBER,
  FinalizeHandbookResponse,
  HandbookMarkKind,
  HandbookSignatureMark,
  HandbookSigningSession,
} from './types';

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Secure handbook signing requires a configured Supabase project.');
  }
  return supabase;
}

function toSigningSession(row: any, templateVersion = ''): HandbookSigningSession {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    subjectEmail: row.subject_email,
    templateId: row.template_id,
    templateVersion,
    revision: row.revision,
    status: row.status,
    quizScorePercent:
      row.quiz_score_percent === null || row.quiz_score_percent === undefined
        ? null
        : Number(row.quiz_score_percent),
    quizGrade: row.quiz_grade,
    quizPassed: Boolean(row.quiz_passed),
    finalPdfPath: row.final_pdf_path,
    finalPdfSha256: row.final_pdf_sha256,
    finalizedAt: row.finalized_at,
  };
}

async function requireAuthenticatedSigner(expectedEmail?: string) {
  const client = requireSupabase();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user?.email) {
    throw new Error('Please sign in through the secure employee onboarding link.');
  }
  if (expectedEmail && user.email.toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error('The authenticated employee does not match this onboarding record.');
  }
  return user;
}

export async function createOrResumeSigningSession(input: {
  subjectType: 'employee' | 'candidate';
  subjectId: string;
  subjectEmail: string;
  entityId?: string | null;
  startNewRevision?: boolean;
}): Promise<{ session: HandbookSigningSession; marks: Record<number, HandbookSignatureMark> }> {
  const client = requireSupabase();
  await requireAuthenticatedSigner(input.subjectEmail);

  const { data: sessionRow, error: sessionError } = await client.rpc(
    'create_or_resume_handbook_session',
    {
      p_subject_type: input.subjectType,
      p_subject_id: input.subjectId,
      p_subject_email: input.subjectEmail,
      p_entity_id: input.entityId || null,
      p_template_version: null,
      p_start_new_revision: Boolean(input.startNewRevision),
    }
  );
  if (sessionError || !sessionRow) {
    throw new Error(sessionError?.message || 'The handbook signing session could not be opened.');
  }

  const { data: templateRow, error: templateError } = await client
    .from('handbook_templates')
    .select('version')
    .eq('id', sessionRow.template_id)
    .single();
  if (templateError || !templateRow) {
    throw new Error('The active handbook template could not be loaded.');
  }

  const { data: markRows, error: marksError } = await client
    .from('onboarding_signature_marks')
    .select('*')
    .eq('session_id', sessionRow.id)
    .order('part_number');
  if (marksError) {
    throw new Error(marksError.message || 'Existing handbook initials could not be loaded.');
  }

  const marks: Record<number, HandbookSignatureMark> = {};
  await Promise.all(
    (markRows || []).map(async (row: any) => {
      const { data: signedUrl } = await client.storage
        .from('onboarding-signatures')
        .createSignedUrl(row.image_path, 60 * 60);
      marks[row.part_number] = {
        id: row.id,
        partNumber: row.part_number,
        kind: row.mark_type,
        imagePath: row.image_path,
        imageDataUrl: signedUrl?.signedUrl,
        capturedAt: row.captured_at,
      };
    })
  );

  return {
    session: toSigningSession(sessionRow, templateRow.version),
    marks,
  };
}

export async function saveSignatureMark(input: {
  session: HandbookSigningSession;
  partNumber: number;
  kind: HandbookMarkKind;
  imageDataUrl: string;
}): Promise<HandbookSignatureMark> {
  const client = requireSupabase();
  const user = await requireAuthenticatedSigner(input.session.subjectEmail);
  if (input.session.status !== 'in_progress') {
    throw new Error('This signed handbook revision is locked.');
  }

  const expectedKind =
    input.partNumber === FINAL_SIGNATURE_PART_NUMBER ? 'final_signature' : 'initial';
  if (input.kind !== expectedKind) {
    throw new Error(`Part ${input.partNumber} requires a ${expectedKind} mark.`);
  }

  const response = await fetch(input.imageDataUrl);
  const imageBlob = await response.blob();
  const imagePath = [
    user.id,
    input.session.id,
    `part-${input.partNumber}-${input.kind}.png`,
  ].join('/');

  const { error: uploadError } = await client.storage
    .from('onboarding-signatures')
    .upload(imagePath, imageBlob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true,
    });
  if (uploadError) throw new Error(`Signature image upload failed: ${uploadError.message}`);

  const { data: savedRow, error: markError } = await client.rpc('record_handbook_mark', {
    p_session_id: input.session.id,
    p_part_number: input.partNumber,
    p_mark_type: input.kind,
    p_image_path: imagePath,
  });
  if (markError || !savedRow) {
    throw new Error(markError?.message || 'The signature timestamp could not be recorded.');
  }

  return {
    id: savedRow.id,
    partNumber: savedRow.part_number,
    kind: savedRow.mark_type,
    imagePath: savedRow.image_path,
    imageDataUrl: input.imageDataUrl,
    capturedAt: savedRow.captured_at,
  };
}

export async function removeSignatureMark(
  session: HandbookSigningSession,
  mark: HandbookSignatureMark
): Promise<void> {
  const client = requireSupabase();
  await requireAuthenticatedSigner(session.subjectEmail);
  if (session.status !== 'in_progress') {
    throw new Error('This signed handbook revision is locked.');
  }

  const { error: deleteError } = await client
    .from('onboarding_signature_marks')
    .delete()
    .eq('id', mark.id || '')
    .eq('session_id', session.id);
  if (deleteError) throw new Error(deleteError.message);

  await client.storage.from('onboarding-signatures').remove([mark.imagePath]);
}

export async function saveSigningQuizResult(
  session: HandbookSigningSession,
  score: number,
  grade: string
): Promise<HandbookSigningSession> {
  const client = requireSupabase();
  await requireAuthenticatedSigner(session.subjectEmail);
  const { data, error } = await client.rpc('record_handbook_quiz_result', {
    p_session_id: session.id,
    p_score_percent: score,
    p_grade: grade,
  });
  if (error || !data) {
    throw new Error(error?.message || 'The compliance quiz result could not be saved.');
  }
  return toSigningSession(data, session.templateVersion);
}

export async function finalizeSignedHandbook(
  session: HandbookSigningSession
): Promise<FinalizeHandbookResponse> {
  const client = requireSupabase();
  await requireAuthenticatedSigner(session.subjectEmail);
  const {
    data: { session: authSession },
  } = await client.auth.getSession();
  if (!authSession?.access_token) {
    throw new Error('The secure employee session has expired.');
  }

  const response = await fetch('/api/onboarding/finalize-handbook', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authSession.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId: session.id }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'The signed handbook could not be finalized.');
  }
  return payload as FinalizeHandbookResponse;
}

export function downloadFinalizedHandbook(
  downloadUrl: string,
  employeeName: string,
  revision: number
) {
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `RedPoint_Employee_Handbook_${employeeName.replace(/\s+/g, '_')}_R${revision}.pdf`;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
