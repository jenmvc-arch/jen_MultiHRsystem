export const INITIAL_PART_NUMBERS = Array.from({ length: 14 }, (_, index) => index + 1);
export const FINAL_SIGNATURE_PART_NUMBER = 15;

export type HandbookMarkKind = 'initial' | 'final_signature';
export type HandbookSigningStatus =
  | 'in_progress'
  | 'finalizing'
  | 'finalized'
  | 'superseded';

export interface HandbookDatePlacement {
  x: number;
  y: number;
  fontSize?: number;
}

export interface HandbookTextPlacement extends HandbookDatePlacement {
  maxWidth: number;
}

export interface HandbookIdentityPlacement {
  page: number;
  employeeName: HandbookTextPlacement;
  department: HandbookTextPlacement;
  position: HandbookTextPlacement;
}

export interface HandbookStampPlacement {
  partNumber: number;
  kind: HandbookMarkKind;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  date: HandbookDatePlacement;
}

export interface HandbookPlacementManifest {
  schemaVersion: 1;
  templateVersion: string;
  pageCount: number;
  placements: HandbookStampPlacement[];
  identity?: HandbookIdentityPlacement;
}

export interface HandbookSignatureMark {
  id?: string;
  partNumber: number;
  kind: HandbookMarkKind;
  imagePath: string;
  imageDataUrl?: string;
  capturedAt: string;
}

export interface HandbookSigningSession {
  id: string;
  subjectType: 'employee' | 'candidate';
  subjectId: string;
  subjectEmail: string;
  templateId: string;
  templateVersion: string;
  revision: number;
  status: HandbookSigningStatus;
  quizScorePercent?: number | null;
  quizGrade?: string | null;
  quizPassed?: boolean;
  finalPdfPath?: string | null;
  finalPdfSha256?: string | null;
  finalizedAt?: string | null;
}

export interface HandbookSigningState {
  session: HandbookSigningSession | null;
  marks: Record<number, HandbookSignatureMark>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export interface HandbookPdfMarkInput {
  partNumber: number;
  kind: HandbookMarkKind;
  imageBytes: Uint8Array;
  capturedAt: string;
}

export interface HandbookAuditData {
  recordId: string;
  employeeName: string;
  employeeId: string;
  employeeEmail: string;
  department: string;
  position: string;
  templateVersion: string;
  templateSha256: string;
  revision: number;
  finalizedAt: string;
  quizScorePercent: number;
  quizGrade: string;
}

export interface FinalizeHandbookResponse {
  recordId: string;
  revision: number;
  downloadUrl: string;
  sha256: string;
}

export interface HandbookTemplateAccessResponse {
  downloadUrl: string;
  version: string;
  pageCount: number;
  sha256: string;
  expiresIn: number;
}
