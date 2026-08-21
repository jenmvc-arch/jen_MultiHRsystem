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
const MARGIN_LEFT = 14;
const MARGIN_RIGHT = 196;
const CONTENT_WIDTH = MARGIN_RIGHT - MARGIN_LEFT;
const FOOTER_Y = 286;
const CONTENT_TOP = 31;
const CONTENT_BOTTOM = 276;
const COLUMN_GAP = 5;
const CARD_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2;

const COLORS = {
  primary: [130, 10, 18] as const,
  pale: [250, 244, 243] as const,
  warm: [246, 237, 224] as const,
  border: [210, 197, 191] as const,
  text: [35, 31, 31] as const,
  muted: [104, 94, 91] as const,
  white: [255, 255, 255] as const,
  footerLine: [206, 190, 184] as const,
};

const displayValue = (value: unknown, fallback = '-') => {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  return String(value);
};

const formatTimestamp = (value: string | undefined) => {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(parsed).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} GMT+8`;
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

const scoreText = (value: number | '') => value === '' ? '-' : Number(value).toFixed(1);

type Cell = { value: unknown; align?: 'left' | 'center' | 'right' };

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

  let currentY = CONTENT_TOP;

  const setText = (color: readonly [number, number, number], font: 'normal' | 'bold', size: number) => {
    doc.setTextColor(...color);
    doc.setFont('helvetica', font);
    doc.setFontSize(size);
  };

  const linesFor = (value: unknown, width: number, size = 8) => {
    setText(COLORS.text, 'normal', size);
    return doc.splitTextToSize(displayValue(value), width) as string[];
  };

  const drawTopHeader = (firstPage: boolean) => {
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, PAGE_WIDTH, firstPage ? 27 : 13, 'F');
    if (firstPage) {
      setText(COLORS.white, 'bold', 16);
      doc.text('Red Point HRMS', MARGIN_LEFT, 8);
      setText(COLORS.white, 'bold', 10);
      doc.text('Performance Appraisal Review', MARGIN_LEFT, 15.5);
      setText(COLORS.white, 'bold', 8);
      doc.text('SANDBOX REVIEW COPY', MARGIN_RIGHT, 8, { align: 'right' });
      setText(COLORS.white, 'normal', 8);
      doc.text(`${mode === 'manager' ? 'Manager' : 'Employee'} report`, MARGIN_RIGHT, 15.5, { align: 'right' });
      doc.setFillColor(...COLORS.warm);
      doc.rect(0, 27, PAGE_WIDTH, 1.5, 'F');
      currentY = 33;
    } else {
      setText(COLORS.white, 'bold', 8);
      doc.text('Red Point HRMS | Performance Appraisal | SANDBOX REVIEW COPY', MARGIN_LEFT, 8.5);
      currentY = 21;
    }
  };

  const addPage = () => {
    doc.addPage();
    drawTopHeader(false);
  };

  const ensureSpace = (height: number) => {
    if (currentY + height > CONTENT_BOTTOM) addPage();
  };

  const drawSectionHeading = (title: string, keepWithNext = 0) => {
    ensureSpace(9 + keepWithNext);
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 8, 1, 1, 'F');
    setText(COLORS.white, 'bold', 9);
    doc.text(title, MARGIN_LEFT + 3, currentY + 5.4);
    currentY += 11;
  };

  const drawCard = (x: number, y: number, width: number, height: number, label: string, value: unknown) => {
    doc.setFillColor(...COLORS.pale);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, width, height, 1.7, 1.7, 'FD');
    setText(COLORS.primary, 'bold', 7);
    doc.text(label.toUpperCase(), x + 3, y + 5.4);
    const lines = linesFor(value, width - 6, 8);
    setText(COLORS.text, 'normal', 8);
    doc.text(lines, x + 3, y + 12, { lineHeightFactor: 1.12 });
  };

  const drawInfoCards = (rows: Array<[string, unknown]>) => {
    for (let index = 0; index < rows.length; index += 2) {
      const row = rows.slice(index, index + 2);
      const lines = row.map(([, value]) => linesFor(value, CARD_WIDTH - 6, 8));
      const height = Math.max(17, ...lines.map((valueLines) => 10 + valueLines.length * 3.4));
      ensureSpace(height + 3);
      row.forEach(([label, value], columnIndex) => {
        drawCard(
          MARGIN_LEFT + columnIndex * (CARD_WIDTH + COLUMN_GAP),
          currentY,
          CARD_WIDTH,
          height,
          label,
          value,
        );
      });
      currentY += height + 3;
    }
  };

  const drawLabelledText = (label: string, value: unknown) => {
    const lines = linesFor(value, CONTENT_WIDTH, 8);
    const height = 8 + lines.length * 3.4;
    ensureSpace(height + 4);
    setText(COLORS.primary, 'bold', 7);
    doc.text(label.toUpperCase(), MARGIN_LEFT, currentY + 3.5);
    setText(COLORS.text, 'normal', 8);
    doc.text(lines, MARGIN_LEFT, currentY + 8, { lineHeightFactor: 1.12 });
    currentY += height + 4;
  };

  const drawTable = (
    headers: string[],
    widths: number[],
    rows: Cell[][],
    options: { category?: string } = {},
  ) => {
    const drawHeader = () => {
      const headerHeight = 11;
      doc.setFillColor(...COLORS.primary);
      doc.setDrawColor(...COLORS.primary);
      let x = MARGIN_LEFT;
      headers.forEach((header, index) => {
        doc.setFillColor(...COLORS.primary);
        doc.rect(x, currentY, widths[index], headerHeight, 'F');
        setText(COLORS.white, 'bold', 7);
        const headerLines = doc.splitTextToSize(header, widths[index] - 3) as string[];
        doc.text(headerLines, x + 1.5, currentY + 4.2, { lineHeightFactor: 1.05 });
        x += widths[index];
      });
      currentY += headerHeight;
    };

    const drawCategory = () => {
      if (!options.category) return;
      doc.setFillColor(...COLORS.warm);
      doc.roundedRect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 8, 1.5, 1.5, 'F');
      setText(COLORS.primary, 'bold', 8);
      doc.text(options.category, MARGIN_LEFT + 3, currentY + 5.3);
      currentY += 11;
    };

    ensureSpace(options.category ? 37 : 26);
    drawCategory();
    drawHeader();
    rows.forEach((row) => {
      const cellLines = row.map((cell, index) => linesFor(cell.value, widths[index] - 3, 7.2));
      const rowHeight = Math.max(15, ...cellLines.map((lines) => 7 + lines.length * 3.25));
      if (currentY + rowHeight > CONTENT_BOTTOM) {
        addPage();
        drawCategory();
        drawHeader();
      }
      let x = MARGIN_LEFT;
      row.forEach((cell, index) => {
        const fillColor: readonly [number, number, number] = index % 2 === 0
          ? COLORS.white
          : [253, 251, 249];
        doc.setFillColor(...fillColor);
        doc.setDrawColor(...COLORS.border);
        doc.rect(x, currentY, widths[index], rowHeight, 'FD');
        setText(COLORS.text, 'normal', 7.2);
        const align = cell.align || 'left';
        const textX = align === 'right' ? x + widths[index] - 1.5 : align === 'center' ? x + widths[index] / 2 : x + 1.5;
        doc.text(cellLines[index], textX, currentY + 4.8, {
          align,
          lineHeightFactor: 1.08,
        });
        x += widths[index];
      });
      currentY += rowHeight;
    });
    currentY += 5;
  };

  const drawSummaryTable = () => {
    drawTable(
      ['Measure', 'Raw / average', 'Weighted points', 'Notes'],
      [38, 38, 43, CONTENT_WIDTH - 119],
      [
        [
          { value: 'KPI score' },
          { value: `${scores.kpiRawPercent.toFixed(2)}%` },
          { value: `${scores.kpiWeightedPoints.toFixed(2)} / 60` },
          { value: `Weight total: ${scores.kpiWeightTotal.toFixed(1)}%` },
        ],
        [
          { value: 'Competency score' },
          { value: `${scores.competencyRawPercent.toFixed(2)}%` },
          { value: `${scores.competencyWeightedPoints.toFixed(2)} / 40` },
          { value: `Average: ${scores.competencyAgreedAverage.toFixed(2)} / 5` },
        ],
        [
          { value: 'Total score' },
          { value: `${scores.totalPoints.toFixed(2)} / 100` },
          { value: `${scores.finalRating ? scores.finalRating.toFixed(1) : '-'} / 5` },
          { value: `${scores.tierLabel}` },
        ],
      ],
    );
  };

  const drawSignatures = () => {
    const cardHeight = 34;
    const width = (CONTENT_WIDTH - 10) / 3;
    ensureSpace(cardHeight + 8);
    const signatureRows = [
      ['APPRAISEE', draft.signatures.appraiseeName, draft.signatures.appraiseeDate],
      ['APPRAISER', draft.signatures.appraiserName, draft.signatures.appraiserDate],
      ['HR REVIEWER', draft.signatures.hrReviewerName, draft.signatures.hrReviewerDate],
    ] as const;
    signatureRows.forEach(([label, name, date], index) => {
      const x = MARGIN_LEFT + index * (width + 5);
      doc.setFillColor(...COLORS.pale);
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(x, currentY, width, cardHeight, 1.7, 1.7, 'FD');
      setText(COLORS.primary, 'bold', 7);
      doc.text(label, x + 3, currentY + 5.4);
      doc.setDrawColor(...COLORS.muted);
      doc.line(x + 3, currentY + 21, x + width - 3, currentY + 21);
      setText(COLORS.text, 'normal', 8);
      doc.text(displayValue(name), x + 3, currentY + 24.5);
      setText(COLORS.muted, 'normal', 7);
      doc.text(`Date: ${displayValue(date)}`, x + 3, currentY + 31);
    });
    currentY += cardHeight + 6;
  };

  drawTopHeader(true);
  setText(COLORS.text, 'bold', 13);
  doc.text('Performance Appraisal', MARGIN_LEFT, currentY + 7);
  setText(COLORS.muted, 'normal', 8);
  doc.text(displayValue(draft.subtitle || reviewCycle.name), MARGIN_LEFT, currentY + 14);
  currentY += 22;

  drawInfoCards([
    ['Status', draft.status],
    ['Report Mode', mode === 'manager' ? 'Manager' : 'Employee'],
    ['Generated At', formatTimestamp(generatedAt)],
    ['Last Saved At', formatTimestamp(draft.updatedAt)],
  ]);

  drawSectionHeading('1. Employee and Review Information');
  drawInfoCards([
    ['Employee Name', draft.employeeInfo.employeeName],
    ['Employee ID / IC', draft.employeeInfo.employeeIdOrIc],
    ['Position Title', draft.employeeInfo.positionTitle],
    ['Department', draft.employeeInfo.department],
    ['Appraiser Name', draft.appraiserName],
    ['Review Type', draft.reviewType],
    ['Review Period', `${displayValue(draft.reviewFrom)} to ${displayValue(draft.reviewTo)}`],
    ['Probation Stage', draft.probationStage],
    ['Probation End Date', draft.probationEndDate],
    ['Project Name', draft.projectName],
    ['Project Client', draft.projectClient],
  ]);
  drawLabelledText('Review Purpose', draft.reviewPurpose);

  drawSectionHeading('2. Key Performance Indicators - 60%', 37);
  draft.kpiCategories.forEach((category) => {
    drawTable(
      ['KRA', 'Expected outcome', 'Wt.', 'Self', 'Agreed', 'Achievement / result', 'Verification', 'Evidence', 'Status'],
      [24, 29, 9, 10, 13, 31, 28, 25, 13],
      category.rows.map((row) => [
        { value: row.kra },
        { value: row.outcome },
        { value: `${Number(row.weight || 0).toFixed(0)}%`, align: 'center' },
        { value: scoreText(row.appraiseeScore), align: 'center' },
        { value: scoreText(row.agreedScore), align: 'center' },
        { value: row.evidence.achievement },
        { value: row.evidence.managerVerification },
        { value: `${displayValue(row.evidence.evidenceType)}\nCompletion: ${displayValue(row.evidence.completionPercent)}` },
        { value: row.evidence.status },
      ]),
      { category: displayValue(category.name, 'KPI Category') },
    );
  });

  drawSectionHeading('3. Competency and Behavioural Assessment - 40%', 26);
  drawTable(
    ['Competency', 'Description', 'Self', 'Agreed', 'Appraisee comment', 'Manager comment', 'Supporting example'],
    [27, 37, 10, 10, 32, 32, CONTENT_WIDTH - 148],
    draft.competencies.map((competency) => [
      { value: competency.name },
      { value: competency.description },
      { value: scoreText(competency.appraiseeRating), align: 'center' },
      { value: scoreText(competency.agreedRating), align: 'center' },
      { value: competency.appraiseeComment },
      { value: competency.managerComment },
      { value: competency.supportingExample },
    ]),
  );

  drawSectionHeading('4. Overall Scoring Summary', 26);
  drawSummaryTable();

  drawSectionHeading('5. Qualitative Comments and Development');
  drawLabelledText('Employee Overall Comment', draft.qualitative.employeeOverallComment);
  drawLabelledText('Key Strengths', draft.qualitative.keyStrengths);
  drawLabelledText('Main Areas for Improvement', draft.qualitative.improvementAreas);
  drawLabelledText('Support and Training Required', draft.qualitative.supportTraining);
  drawLabelledText('Next Review Objectives', draft.qualitative.nextObjectives);
  drawLabelledText('Manager Overall Feedback', draft.qualitative.managerOverallComment);

  if (mode === 'manager') {
    drawSectionHeading('6. Management Usage Only');
    drawInfoCards([
      ['Management Decision', draft.management.decision],
      ['Effective Date', draft.management.effectiveDate],
      ['New Position', draft.management.newPosition],
      ['New Probation End Date', draft.management.newProbationEndDate],
    ]);
    drawLabelledText(
      'Reason / Notes',
      draft.management.decision === 'Other' ? draft.management.other : draft.management.reason,
    );
  }

  drawSectionHeading(mode === 'manager' ? '7. Acknowledgement and Signatures' : '6. Acknowledgement and Signatures');
  drawLabelledText(
    'Acknowledgement',
    'I acknowledge that this appraisal has been reviewed and discussed with me. Acknowledgement confirms receipt and discussion, not necessarily agreement with every rating or comment.',
  );
  drawSignatures();

  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(...COLORS.footerLine);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, 280, MARGIN_RIGHT, 280);
    setText(COLORS.muted, 'normal', 6.5);
    doc.text('SANDBOX REVIEW COPY', MARGIN_LEFT, FOOTER_Y);
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
