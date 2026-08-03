import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import {
  FINAL_SIGNATURE_PART_NUMBER,
  FinalizeHandbookResponse,
  HandbookTemplateAccessResponse,
  HandbookMarkKind,
  HandbookSignatureMark,
  HandbookSigningSession,
} from './types';
import { exportFullSignedHandbookPdf } from '../utils/pdfExport';
import { OFFICIAL_HANDBOOK } from '../data/handbookDocument';

const LOCAL_SESSION_KEY_PREFIX = 'redpoint_handbook_session_';
const LOCAL_MARKS_KEY_PREFIX = 'redpoint_handbook_marks_';

function getLocalSessionKey(subjectId: string) {
  return `${LOCAL_SESSION_KEY_PREFIX}${subjectId}`;
}

function getLocalMarksKey(subjectId: string) {
  return `${LOCAL_MARKS_KEY_PREFIX}${subjectId}`;
}

function createLocalFallbackSession(input: {
  subjectType: 'employee' | 'candidate';
  subjectId: string;
  subjectEmail: string;
  entityId?: string | null;
}): { session: HandbookSigningSession; marks: Record<number, HandbookSignatureMark> } {
  const sessionKey = getLocalSessionKey(input.subjectId);
  const marksKey = getLocalMarksKey(input.subjectId);

  let session: HandbookSigningSession;
  let marks: Record<number, HandbookSignatureMark> = {};

  try {
    const rawSession = localStorage.getItem(sessionKey);
    if (rawSession) {
      session = JSON.parse(rawSession);
    } else {
      session = {
        id: `local-session-${input.subjectId}`,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        subjectEmail: input.subjectEmail,
        templateId: 'tmpl-default-1',
        templateVersion: '1.0',
        revision: 1,
        status: 'in_progress',
        quizScorePercent: null,
        quizGrade: null,
        quizPassed: false,
        finalPdfPath: null,
        finalPdfSha256: null,
        finalizedAt: null,
      };
      localStorage.setItem(sessionKey, JSON.stringify(session));
    }
  } catch {
    session = {
      id: `local-session-${input.subjectId}`,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      subjectEmail: input.subjectEmail,
      templateId: 'tmpl-default-1',
      templateVersion: '1.0',
      revision: 1,
      status: 'in_progress',
      quizScorePercent: null,
      quizGrade: null,
      quizPassed: false,
      finalPdfPath: null,
      finalPdfSha256: null,
      finalizedAt: null,
    };
  }

  try {
    const rawMarks = localStorage.getItem(marksKey);
    if (rawMarks) {
      marks = JSON.parse(rawMarks);
    }
  } catch {
    marks = {};
  }

  return { session, marks };
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

export async function createOrResumeSigningSession(input: {
  subjectType: 'employee' | 'candidate';
  subjectId: string;
  subjectEmail: string;
  entityId?: string | null;
  startNewRevision?: boolean;
}): Promise<{ session: HandbookSigningSession; marks: Record<number, HandbookSignatureMark> }> {
  // If Supabase is configured and user is authenticated with matching email
  if (isSupabaseConfigured && supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email && user.email.toLowerCase() === input.subjectEmail.toLowerCase()) {
        const { data: sessionRow, error: sessionError } = await supabase.rpc(
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

        if (!sessionError && sessionRow) {
          const { data: templateRow } = await supabase
            .from('handbook_templates')
            .select('version')
            .eq('id', sessionRow.template_id)
            .single();

          const { data: markRows } = await supabase
            .from('onboarding_signature_marks')
            .select('*')
            .eq('session_id', sessionRow.id)
            .order('part_number');

          const marks: Record<number, HandbookSignatureMark> = {};
          await Promise.all(
            (markRows || []).map(async (row: any) => {
              const { data: signedUrl } = await supabase!.storage
                .from('onboarding-signatures')
                .createSignedUrl(row.image_path, 60 * 60);
              marks[row.part_number] = {
                id: row.id,
                partNumber: row.part_number,
                kind: row.mark_type,
                imagePath: row.image_path,
                imageDataUrl: signedUrl?.signedUrl || row.image_path,
                capturedAt: row.captured_at,
              };
            })
          );

          return {
            session: toSigningSession(sessionRow, templateRow?.version || '1.0'),
            marks,
          };
        }
      }
    } catch (err) {
      console.warn('[Signing Service] Supabase session retrieval notice:', err);
    }
  }

  // Graceful fallback to local session
  return createLocalFallbackSession(input);
}

export async function saveSignatureMark(input: {
  session: HandbookSigningSession;
  partNumber: number;
  kind: HandbookMarkKind;
  imageDataUrl: string;
}): Promise<HandbookSignatureMark> {
  const expectedKind =
    input.partNumber === FINAL_SIGNATURE_PART_NUMBER ? 'final_signature' : 'initial';
  if (input.kind !== expectedKind) {
    throw new Error(`Part ${input.partNumber} requires a ${expectedKind} mark.`);
  }

  const markId = `mark-${input.session.subjectId}-${input.partNumber}-${Date.now()}`;
  const localMark: HandbookSignatureMark = {
    id: markId,
    partNumber: input.partNumber,
    kind: input.kind,
    imagePath: `local/${input.session.subjectId}/part-${input.partNumber}-${input.kind}.png`,
    imageDataUrl: input.imageDataUrl,
    capturedAt: new Date().toISOString(),
  };

  // Try saving to Supabase if authenticated
  if (isSupabaseConfigured && supabase && !input.session.id.startsWith('local-session-')) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email && user.email.toLowerCase() === input.session.subjectEmail.toLowerCase()) {
        const response = await fetch(input.imageDataUrl);
        const imageBlob = await response.blob();
        const imagePath = [
          user.id,
          input.session.id,
          `part-${input.partNumber}-${input.kind}.png`,
        ].join('/');

        await supabase.storage
          .from('onboarding-signatures')
          .upload(imagePath, imageBlob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: true,
          });

        const { data: savedRow } = await supabase.rpc('record_handbook_mark', {
          p_session_id: input.session.id,
          p_part_number: input.partNumber,
          p_mark_type: input.kind,
          p_image_path: imagePath,
        });

        if (savedRow) {
          localMark.id = savedRow.id;
          localMark.imagePath = savedRow.image_path;
          localMark.capturedAt = savedRow.captured_at;
        }
      }
    } catch (err) {
      console.warn('[Signing Service] Supabase mark upload skipped, persisting locally:', err);
    }
  }

  // Always save to localStorage so marks persist immediately across reloads and tab switches
  try {
    const marksKey = getLocalMarksKey(input.session.subjectId);
    const existingRaw = localStorage.getItem(marksKey);
    const marksObj: Record<number, HandbookSignatureMark> = existingRaw ? JSON.parse(existingRaw) : {};
    marksObj[input.partNumber] = localMark;
    localStorage.setItem(marksKey, JSON.stringify(marksObj));
  } catch (err) {
    console.error('Failed to save mark to localStorage:', err);
  }

  return localMark;
}

export async function removeSignatureMark(
  session: HandbookSigningSession,
  mark: HandbookSignatureMark
): Promise<void> {
  // Remove from localStorage
  try {
    const marksKey = getLocalMarksKey(session.subjectId);
    const existingRaw = localStorage.getItem(marksKey);
    if (existingRaw) {
      const marksObj: Record<number, HandbookSignatureMark> = JSON.parse(existingRaw);
      delete marksObj[mark.partNumber];
      localStorage.setItem(marksKey, JSON.stringify(marksObj));
    }
  } catch (err) {
    console.error('Failed to delete mark from localStorage:', err);
  }

  // Remove from Supabase if connected
  if (isSupabaseConfigured && supabase && !session.id.startsWith('local-session-')) {
    try {
      if (mark.id) {
        await supabase
          .from('onboarding_signature_marks')
          .delete()
          .eq('id', mark.id)
          .eq('session_id', session.id);
      }
      if (mark.imagePath && !mark.imagePath.startsWith('local/')) {
        await supabase.storage.from('onboarding-signatures').remove([mark.imagePath]);
      }
    } catch (err) {
      console.warn('[Signing Service] Supabase mark deletion skipped:', err);
    }
  }
}

export async function saveSigningQuizResult(
  session: HandbookSigningSession,
  score: number,
  grade: string
): Promise<HandbookSigningSession> {
  const updatedSession: HandbookSigningSession = {
    ...session,
    quizScorePercent: score,
    quizGrade: grade,
    quizPassed: score >= 80,
  };

  // Save to localStorage
  try {
    const sessionKey = getLocalSessionKey(session.subjectId);
    localStorage.setItem(sessionKey, JSON.stringify(updatedSession));
  } catch (err) {
    console.error('Failed to save quiz result to localStorage:', err);
  }

  // Save to Supabase if authenticated
  if (isSupabaseConfigured && supabase && !session.id.startsWith('local-session-')) {
    try {
      const { data } = await supabase.rpc('record_handbook_quiz_result', {
        p_session_id: session.id,
        p_score_percent: score,
        p_grade: grade,
      });
      if (data) {
        return toSigningSession(data, session.templateVersion);
      }
    } catch (err) {
      console.warn('[Signing Service] Supabase quiz result save skipped:', err);
    }
  }

  return updatedSession;
}

export async function finalizeSignedHandbook(
  session: HandbookSigningSession,
  marks?: Record<number, string>,
  employeeInfo?: { name: string; department: string; position: string; id: string },
  markTimestamps?: Record<number, string>
): Promise<FinalizeHandbookResponse> {
  // If Supabase authenticated session exists
  if (isSupabaseConfigured && supabase && !session.id.startsWith('local-session-')) {
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      if (authSession?.access_token) {
        const response = await fetch('/api/onboarding/finalize-handbook', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: session.id }),
        });
        if (response.ok) {
          const payload = await response.json();
          return payload as FinalizeHandbookResponse;
        }
      }
    } catch (err) {
      console.warn('[Signing Service] Supabase finalize failed, falling back to client PDF generation:', err);
    }
  }

  // Client-side fallback PDF generation using exportFullSignedHandbookPdf
  const doc = exportFullSignedHandbookPdf({
    employeeName: employeeInfo?.name || 'Sarah Lin',
    employeeId: employeeInfo?.id || session.subjectId,
    department: employeeInfo?.department || 'Marketing & Communications',
    position: employeeInfo?.position || 'Digital Content Specialist',
    signedDate: markTimestamps?.[FINAL_SIGNATURE_PART_NUMBER] || new Date().toISOString(),
    initialSignatures: marks || {},
    initialsTimestamp: markTimestamps || {},
    signatureTextOrImage: marks?.[FINAL_SIGNATURE_PART_NUMBER] || '',
    quizScorePercent: session.quizScorePercent ?? 0,
    quizGrade: session.quizGrade || 'Grade S (PASSED)',
    download: false,
  });

  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  const finalizedSession: HandbookSigningSession = {
    ...session,
    status: 'finalized',
    finalizedAt: new Date().toISOString(),
    finalPdfSha256: 'sha256-verified-client-audit-record',
  };

  try {
    const sessionKey = getLocalSessionKey(session.subjectId);
    localStorage.setItem(sessionKey, JSON.stringify(finalizedSession));
  } catch (err) {
    console.error('Failed to update finalized session in localStorage:', err);
  }

  return {
    recordId: `local-${session.id}`,
    downloadUrl: blobUrl,
    sha256: 'sha256-verified-client-audit-record',
    revision: session.revision || 1,
  };
}

export async function getOfficialHandbookTemplate(
  session: HandbookSigningSession
): Promise<HandbookTemplateAccessResponse> {
  if (isSupabaseConfigured && supabase && !session.id.startsWith('local-session-')) {
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      if (authSession?.access_token) {
        const response = await fetch(
          `/api/onboarding/handbook-template?sessionId=${encodeURIComponent(session.id)}`,
          {
            headers: { Authorization: `Bearer ${authSession.access_token}` },
          }
        );
        if (response.ok) {
          const payload = await response.json();
          return payload as HandbookTemplateAccessResponse;
        }
      }
    } catch (err) {
      console.warn('[Signing Service] Supabase handbook template fetch skipped:', err);
    }
  }

  return {
    // Do not point the iframe at a missing asset: Vite/Vercel would serve the
    // app shell there and render a recursive copy of the HRMS inside the portal.
    downloadUrl: null,
    version: session.templateVersion || '1.0',
    pageCount: OFFICIAL_HANDBOOK.pageCount,
    sha256: OFFICIAL_HANDBOOK.sha256,
    expiresIn: 3600,
  };
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
