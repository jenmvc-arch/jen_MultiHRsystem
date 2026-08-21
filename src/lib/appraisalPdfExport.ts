import { jsPDF } from 'jspdf';
import type { ReviewCycle } from '../types';
import { getGmt8Timestamp } from './dateUtils';
import type {
  AppraisalKpiRow,
  AppraisalScoreSummary,
  PerformanceAppraisalDraft,
} from './performanceAppraisalDraft';

export interface AppraisalPdfExportInput {
  draft: PerformanceAppraisalDraft;
  scores: AppraisalScoreSummary;
  reviewCycle: ReviewCycle;
  mode: 'manager' | 'employee';
  generatedAt?: string;
}

export interface AppraisalPdfExportResult {
  filename: string;
  generatedAt: string;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 14;
const MARGIN_RIGHT = 196;
const CONTENT_WIDTH = MARGIN_RIGHT - MARGIN_LEFT;
const FOOTER_Y = 286;
const CONTENT_BOTTOM = 274;

const COLORS = {
  primary: [129, 9, 18] as const,
  accent: [224, 191, 188] as const,
  soft: [248, 242, 235] as const,
  border: [218, 205, 195] as const,
  text: [48, 44, 42] as const,
  muted: [104, 96, 91] as const,
  white: [255, 255, 255] as const,
  success: [29, 110, 66] as const,
  warning: [151, 91, 13] as const,
};

const SCORING_SCALE: Array<[string, string, string]> = [
  ['5.0', 'Outstanding', 'Consistently exceeds targets and delivers measurable additional value.'],
  ['4.0-4.5', 'Exceeds', 'Frequently exceeds agreed targets or required performance standard.'],
  ['3.0-3.5', 'Meets', 'Achieves agreed targets and performs the role satisfactorily.'],
  ['2.0-2.5', 'Partially Meets', 'Achieves some requirements, but improvement is required.'],
  ['1.0-1.5', 'Does Not Meet', 'Fails to achieve most requirements or has repeated gaps.'],
];

const displayValue = (value: unknown, fallback = 'Not provided') => {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  return String(value);
};

const formatTimestamp = (value: string | undefined) => {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: false,
  }).format(parsed)} GMT+8`;
};

const safeFilenamePart = (value: string) => (
  displayValue(value, 'Appraisal')
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 80) || 'Appraisal'
);

const compactTimestamp = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits.length === 14 ? digits : 'undated';
};

export const buildAppraisalPdfFilename = (
  draft: PerformanceAppraisalDraft,
  generatedAt: string,
) => (
  `Appraisal_Review_${safeFilenamePart(draft.employeeInfo.employeeName || draft.employeeId)}`
  + `_${safeFilenamePart(draft.subtitle || draft.reviewCycleId)}`
  + `_${compactTimestamp(generatedAt)}_SANDBOX.pdf`
);

const scoreText = (value: number | '') => value === '' ? 'Not rated' : Number(value).toFixed(1);

const getKpiCalculatedPercent = (row: AppraisalKpiRow) => {
  const activeScore = Number(row.agreedScore || row.appraiseeScore || 0);
  return `${((activeScore / 5) * Number(row.weight || 0)).toFixed(1)}%`;
};

export function createAppraisalReviewPdf({
  draft,
  scores,
  reviewCycle,
  mode,
  generatedAt = getGmt8Timestamp(),
}: AppraisalPdfExportInput): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false,
  });

  doc.setProperties({
    title: `Appraisal Review - ${draft.employeeInfo.employeeName}`,
    subject: `${reviewCycle.name} appraisal review sandbox copy`,
    author: 'Red Point HRMS',
    creator: 'Red Point HRMS',
  });

  let currentY = 0;

  const drawHeader = (firstPage: boolean) => {
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, PAGE_WIDTH, 19, 'F');
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 19, PAGE_WIDTH, 1.5, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RED POINT SDN. BHD.', MARGIN_LEFT, 10.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('APPRAISAL REVIEW REPORT', MARGIN_RIGHT, 10.5, { align: 'right' });

    currentY = firstPage ? 31 : 28;
    if (firstPage) {
      doc.setTextColor(...COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Performance Appraisal Review', MARGIN_LEFT, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.muted);
      doc.text(`${draft.employeeInfo.employeeName} - ${reviewCycle.name}`, MARGIN_LEFT, currentY);
      doc.setFillColor(...COLORS.warning);
      doc.roundedRect(MARGIN_RIGHT - 39, currentY - 5.5, 39, 7, 1.5, 1.5, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text('SANDBOX REVIEW COPY', MARGIN_RIGHT - 19.5, currentY - 1, { align: 'center' });
      currentY += 10;
    }
  };

  const addPage = () => {
    doc.addPage();
    drawHeader(false);
  };

  const ensureSpace = (height: number) => {
    if (currentY + height > CONTENT_BOTTOM) addPage();
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(12);
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 8, 1, 1, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title, MARGIN_LEFT + 3, currentY + 5.4);
    currentY += 12;
  };

  const drawTextLines = (text: string, width: number, size = 8, lineHeight = 3.7) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(displayValue(text), width) as string[];
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    for (const line of lines) {
      if (currentY + lineHeight > CONTENT_BOTTOM) addPage();
      doc.text(line, MARGIN_LEFT, currentY);
      currentY += lineHeight;
    }
    return lines.length * lineHeight;
  };

  const drawKeyValueRows = (rows: Array<[string, unknown]>) => {
    rows.forEach(([label, value]) => {
      const labelWidth = 43;
      const valueWidth = CONTENT_WIDTH - labelWidth;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const lines = doc.splitTextToSize(displayValue(value), valueWidth - 5) as string[];
      const rowHeight = Math.max(8, lines.length * 3.4 + 4);
      ensureSpace(rowHeight);
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.25);
      doc.setFillColor(...COLORS.soft);
      doc.rect(MARGIN_LEFT, currentY, labelWidth, rowHeight, 'F');
      doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, rowHeight, 'S');
      doc.setTextColor(...COLORS.muted);
      doc.setFont('helvetica', 'bold');
      doc.text(label, MARGIN_LEFT + 2.5, currentY + 5.2);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'normal');
      doc.text(lines, MARGIN_LEFT + labelWidth + 2.5, currentY + 4.5, { lineHeightFactor: 1.15 });
      currentY += rowHeight;
    });
    currentY += 3;
  };

  const drawLabeledParagraph = (label: string, value: unknown) => {
    const text = displayValue(value);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 6) as string[];
    const blockHeight = Math.max(12, 5 + lines.length * 3.5);
    ensureSpace(blockHeight);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.25);
    doc.setFillColor(252, 250, 247);
    doc.roundedRect(MARGIN_LEFT, currentY, CONTENT_WIDTH, blockHeight, 1, 1, 'FD');
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), MARGIN_LEFT + 3, currentY + 4.5);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(lines, MARGIN_LEFT + 3, currentY + 9, { lineHeightFactor: 1.15 });
    currentY += blockHeight + 3;
  };

  const drawKpiRow = (categoryName: string, row: AppraisalKpiRow, index: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const title = `${categoryName} - KPI ${index + 1}: ${displayValue(row.kra, 'Unnamed KPI')}`;
    const titleLines = doc.splitTextToSize(title, CONTENT_WIDTH - 6) as string[];
    const outcomeLines = doc.splitTextToSize(`Expected outcome: ${displayValue(row.outcome)}`, CONTENT_WIDTH - 6) as string[];
    const cardHeight = 14 + titleLines.length * 3.4 + outcomeLines.length * 3.4;
    ensureSpace(cardHeight);
    doc.setFillColor(...COLORS.soft);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(MARGIN_LEFT, currentY, CONTENT_WIDTH, cardHeight, 1.5, 1.5, 'FD');
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(titleLines, MARGIN_LEFT + 3, currentY + 5, { lineHeightFactor: 1.1 });
    let blockY = currentY + 5 + titleLines.length * 3.4;
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(outcomeLines, MARGIN_LEFT + 3, blockY, { lineHeightFactor: 1.1 });
    blockY += outcomeLines.length * 3.4 + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(
      `Weight ${Number(row.weight || 0).toFixed(1)}%   |   Appraisee ${scoreText(row.appraiseeScore)}   |   Agreed ${scoreText(row.agreedScore)}   |   Calculated ${getKpiCalculatedPercent(row)}`,
      MARGIN_LEFT + 3,
      blockY,
    );
    currentY += cardHeight + 3;

    drawKeyValueRows([
      ['Achievement / Result', row.evidence.achievement],
      ['Manager Verification', row.evidence.managerVerification],
      ['Evidence Details', `${displayValue(row.evidence.evidenceType)} | Completion: ${displayValue(row.evidence.completionPercent, 'Not recorded')}% | Status: ${displayValue(row.evidence.status)}`],
      ['Evidence Link', row.evidence.evidenceLink],
    ]);
  };

  const drawCompetency = (competency: PerformanceAppraisalDraft['competencies'][number]) => {
    const descriptionLines = doc.splitTextToSize(displayValue(competency.description), CONTENT_WIDTH - 6) as string[];
    const cardHeight = Math.max(17, 11 + descriptionLines.length * 3.2);
    ensureSpace(cardHeight);
    doc.setDrawColor(...COLORS.border);
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(MARGIN_LEFT, currentY, CONTENT_WIDTH, cardHeight, 1.5, 1.5, 'FD');
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(displayValue(competency.name, 'Competency'), MARGIN_LEFT + 3, currentY + 5);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(descriptionLines, MARGIN_LEFT + 3, currentY + 9, { lineHeightFactor: 1.1 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(
      `Appraisee rating: ${scoreText(competency.appraiseeRating)}   |   Agreed rating: ${scoreText(competency.agreedRating)}`,
      MARGIN_LEFT + 3,
      currentY + cardHeight - 3,
    );
    currentY += cardHeight + 3;

    drawKeyValueRows([
      ['Appraisee Comment', competency.appraiseeComment],
      ['Manager Comment', competency.managerComment],
      ['Supporting Example', competency.supportingExample],
    ]);
  };

  drawHeader(true);
  drawSectionHeading('1. Employee Information');
  drawKeyValueRows([
    ['Employee Name', draft.employeeInfo.employeeName],
    ['Employee ID / IC', draft.employeeInfo.employeeIdOrIc],
    ['Position Title', draft.employeeInfo.positionTitle],
    ['Department', draft.employeeInfo.department],
    ['Appraiser Name', draft.appraiserName],
    ['Review Cycle', reviewCycle.name],
    ['Review Period', reviewCycle.period],
    ['Review Type', draft.reviewType],
    ['Review From', draft.reviewFrom],
    ['Review To', draft.reviewTo],
    ['Workflow Status', draft.status],
    ['Review Purpose', draft.reviewPurpose],
    ['Project / Client', [draft.projectName, draft.projectClient].filter(Boolean).join(' - ')],
  ]);

  drawSectionHeading('Scoring Scale');
  SCORING_SCALE.forEach(([score, title, description]) => {
    drawKeyValueRows([[`${score} - ${title}`, description]]);
  });

  drawSectionHeading('2. Key Performance Indicators - 60%');
  drawKeyValueRows([['Total KPI Weight', `${scores.kpiWeightTotal.toFixed(1)}%${scores.isKpiWeightValid ? '' : ' (requires review)'}`]]);
  draft.kpiCategories.forEach((category) => {
    // Keep a category heading with the start of its first KPI card.
    ensureSpace(42);
    doc.setFillColor(...COLORS.accent);
    doc.roundedRect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 7, 1, 1, 'F');
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(displayValue(category.name, 'KPI Category'), MARGIN_LEFT + 3, currentY + 4.8);
    currentY += 10;
    category.rows.forEach((row, index) => drawKpiRow(category.name, row, index));
  });

  drawSectionHeading('3. Competency & Behavioural Assessment - 40%');
  draft.competencies.forEach(drawCompetency);

  drawSectionHeading('4. Summary and Evaluation');
  drawKeyValueRows([
    ['KPI Raw Score', `${scores.kpiRawPercent.toFixed(2)}%`],
    ['KPI Weighted Points', `${scores.kpiWeightedPoints.toFixed(2)} / 60`],
    ['Competency Raw Score', `${scores.competencyRawPercent.toFixed(2)}%`],
    ['Competency Weighted Points', `${scores.competencyWeightedPoints.toFixed(2)} / 40`],
    ['Total Points', `${scores.totalPoints.toFixed(2)} / 100`],
    ['Final Level', scores.tierLabel],
    ['Final Rating', scores.finalRating ? `${scores.finalRating.toFixed(1)} / 5.0` : 'Not rated'],
  ]);

  drawSectionHeading('5. Qualitative Comments & Development');
  drawLabeledParagraph('Employee Overall Comment', draft.qualitative.employeeOverallComment);
  drawLabeledParagraph('Key Strengths', draft.qualitative.keyStrengths);
  drawLabeledParagraph('Main Areas for Improvement', draft.qualitative.improvementAreas);
  drawLabeledParagraph('Support & Training Required', draft.qualitative.supportTraining);
  drawLabeledParagraph('Next Review Objectives', draft.qualitative.nextObjectives);
  drawLabeledParagraph('Manager Overall Feedback', draft.qualitative.managerOverallComment);

  if (mode === 'manager') {
    drawSectionHeading('6. Management Usage Only');
    drawKeyValueRows([
      ['Management Decision', draft.management.decision],
      ['Effective Date', draft.management.effectiveDate],
      ['New Position', draft.management.newPosition],
      ['New Probation End Date', draft.management.newProbationEndDate],
      ['Reason / Notes', draft.management.decision === 'Other' ? draft.management.other : draft.management.reason],
    ]);
  }

  drawSectionHeading(mode === 'manager' ? '7. Acknowledgement & Signatures' : '6. Acknowledgement & Signatures');
  drawLabeledParagraph(
    'Acknowledgement',
    'I acknowledge that this appraisal has been reviewed and discussed with me. Acknowledgement confirms receipt and discussion, not necessarily agreement with every rating or comment.',
  );
  drawKeyValueRows([
    ['Appraisee Signature', draft.signatures.appraiseeName],
    ['Appraisee Date', draft.signatures.appraiseeDate],
    ['Appraiser Signature', draft.signatures.appraiserName],
    ['Appraiser Date', draft.signatures.appraiserDate],
    ['HR Reviewer', draft.signatures.hrReviewerName],
    ['HR Reviewer Date', draft.signatures.hrReviewerDate],
  ]);

  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.35);
    doc.line(MARGIN_LEFT, 280, MARGIN_RIGHT, 280);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`Sandbox copy | Generated: ${formatTimestamp(generatedAt)}`, MARGIN_LEFT, FOOTER_Y);
    doc.text(`Last saved: ${formatTimestamp(draft.updatedAt)}`, PAGE_WIDTH / 2, FOOTER_Y, { align: 'center' });
    doc.text(`Page ${pageNumber} of ${totalPages}`, MARGIN_RIGHT, FOOTER_Y, { align: 'right' });
  }

  return doc;
}

export function downloadAppraisalReviewPdf(input: AppraisalPdfExportInput): AppraisalPdfExportResult {
  const generatedAt = input.generatedAt || getGmt8Timestamp();
  const filename = buildAppraisalPdfFilename(input.draft, generatedAt);
  createAppraisalReviewPdf({ ...input, generatedAt }).save(filename);
  return { filename, generatedAt };
}

export { formatTimestamp as formatAppraisalPdfTimestamp };
