import {
  PDFDocument,
  PDFImage,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import {
  FINAL_SIGNATURE_PART_NUMBER,
  HandbookAuditData,
  HandbookPdfMarkInput,
  HandbookPlacementManifest,
  HandbookStampPlacement,
  HandbookTextPlacement,
  INITIAL_PART_NUMBERS,
} from './types.js';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 46;
const RED = rgb(129 / 255, 9 / 255, 18 / 255);
const GOLD = rgb(199 / 255, 154 / 255, 34 / 255);
const DARK = rgb(32 / 255, 33 / 255, 36 / 255);
const MUTED = rgb(95 / 255, 99 / 255, 104 / 255);
const LIGHT = rgb(248 / 255, 244 / 255, 240 / 255);

function assertPositiveNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number.`);
  }
}

export function validatePlacementManifest(manifest: HandbookPlacementManifest): void {
  if (manifest.schemaVersion !== 1) {
    throw new Error(`Unsupported placement manifest schema: ${manifest.schemaVersion}.`);
  }
  if (!manifest.templateVersion.trim()) {
    throw new Error('Placement manifest templateVersion is required.');
  }
  if (!Number.isInteger(manifest.pageCount) || manifest.pageCount < 1) {
    throw new Error('Placement manifest pageCount must be a positive integer.');
  }

  const expectedParts = [...INITIAL_PART_NUMBERS, FINAL_SIGNATURE_PART_NUMBER];
  for (const partNumber of expectedParts) {
    const placements = manifest.placements.filter((item) => item.partNumber === partNumber);
    if (placements.length !== 1) {
      throw new Error(`Part ${partNumber} must have exactly one PDF placement.`);
    }
    const placement = placements[0];
    const expectedKind =
      partNumber === FINAL_SIGNATURE_PART_NUMBER ? 'final_signature' : 'initial';
    if (placement.kind !== expectedKind) {
      throw new Error(`Part ${partNumber} must use mark kind ${expectedKind}.`);
    }
  }

  if (manifest.placements.length !== expectedParts.length) {
    throw new Error('Placement manifest contains unexpected duplicate or extra placements.');
  }

  manifest.placements.forEach((placement) => {
    if (
      !Number.isInteger(placement.page) ||
      placement.page < 1 ||
      placement.page > manifest.pageCount
    ) {
      throw new Error(`Part ${placement.partNumber} references an invalid PDF page.`);
    }
    assertPositiveNumber(placement.x, `Part ${placement.partNumber} x`);
    assertPositiveNumber(placement.y, `Part ${placement.partNumber} y`);
    assertPositiveNumber(placement.width, `Part ${placement.partNumber} width`);
    assertPositiveNumber(placement.height, `Part ${placement.partNumber} height`);
    assertPositiveNumber(placement.date.x, `Part ${placement.partNumber} date.x`);
    assertPositiveNumber(placement.date.y, `Part ${placement.partNumber} date.y`);
    if (placement.date.fontSize !== undefined) {
      assertPositiveNumber(
        placement.date.fontSize,
        `Part ${placement.partNumber} date.fontSize`
      );
      if (placement.date.fontSize === 0) {
        throw new Error(`Part ${placement.partNumber} date font size must be greater than zero.`);
      }
    }
    if (placement.width === 0 || placement.height === 0) {
      throw new Error(`Part ${placement.partNumber} placement size must be greater than zero.`);
    }
  });

  if (manifest.identity) {
    if (
      !Number.isInteger(manifest.identity.page) ||
      manifest.identity.page < 1 ||
      manifest.identity.page > manifest.pageCount
    ) {
      throw new Error('Employee identity placement references an invalid PDF page.');
    }
    const fields: Array<[string, HandbookTextPlacement]> = [
      ['employeeName', manifest.identity.employeeName],
      ['department', manifest.identity.department],
      ['position', manifest.identity.position],
    ];
    fields.forEach(([name, placement]) => {
      assertPositiveNumber(placement.x, `Identity ${name} x`);
      assertPositiveNumber(placement.y, `Identity ${name} y`);
      assertPositiveNumber(placement.maxWidth, `Identity ${name} maxWidth`);
      if (placement.maxWidth === 0) {
        throw new Error(`Identity ${name} maxWidth must be greater than zero.`);
      }
      if (placement.fontSize !== undefined) {
        assertPositiveNumber(placement.fontSize, `Identity ${name} fontSize`);
        if (placement.fontSize === 0) {
          throw new Error(`Identity ${name} fontSize must be greater than zero.`);
        }
      }
    });
  }
}

function validatePlacementBounds(page: PDFPage, placement: HandbookStampPlacement): void {
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const dateFontSize = placement.date.fontSize ?? 8;

  if (
    placement.x + placement.width > pageWidth ||
    placement.y + placement.height > pageHeight
  ) {
    throw new Error(
      `Part ${placement.partNumber} signature placement exceeds PDF page ${placement.page}.`
    );
  }
  if (
    placement.date.x >= pageWidth ||
    placement.date.y + dateFontSize > pageHeight
  ) {
    throw new Error(
      `Part ${placement.partNumber} date placement exceeds PDF page ${placement.page}.`
    );
  }
}

function formatMalaysiaTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid signature timestamp: ${isoDate}.`);
  }
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function topLeftY(page: PDFPage, top: number, height = 0): number {
  return page.getHeight() - top - height;
}

function fitImage(image: PDFImage, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  return {
    width: image.width * scale,
    height: image.height * scale,
  };
}

function stampMark(
  page: PDFPage,
  placement: HandbookStampPlacement,
  image: PDFImage,
  capturedAt: string,
  font: PDFFont
) {
  const fitted = fitImage(image, placement.width, placement.height);
  const x = placement.x + (placement.width - fitted.width) / 2;
  const y = topLeftY(page, placement.y, placement.height) +
    (placement.height - fitted.height) / 2;

  page.drawImage(image, {
    x,
    y,
    width: fitted.width,
    height: fitted.height,
  });

  page.drawText(formatMalaysiaTimestamp(capturedAt), {
    x: placement.date.x,
    y: topLeftY(page, placement.date.y, placement.date.fontSize ?? 8),
    size: placement.date.fontSize ?? 8,
    font,
    color: DARK,
  });
}

function prependQuizResultSummary(
  pdf: PDFDocument,
  audit: HandbookAuditData,
  font: PDFFont,
  boldFont: PDFFont
) {
  const page = pdf.insertPage(0, [A4_WIDTH, A4_HEIGHT]);
  drawAuditHeader(page, 'SIGNED EMPLOYEE HANDBOOK', font, boldFont);

  page.drawText('QUIZ RESULT SUMMARY', {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 112,
    size: 20,
    font: boldFont,
    color: RED,
  });
  page.drawText(
    'This summary is followed by the complete employee handbook with the employee\'s handwritten marks and timestamps.',
    {
      x: PAGE_MARGIN,
      y: A4_HEIGHT - 134,
      size: 8.5,
      font,
      color: MUTED,
      maxWidth: A4_WIDTH - PAGE_MARGIN * 2,
    }
  );

  page.drawRectangle({
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 285,
    width: A4_WIDTH - PAGE_MARGIN * 2,
    height: 120,
    color: LIGHT,
    borderColor: RED,
    borderWidth: 0.75,
  });
  page.drawText(`${audit.quizScorePercent}%`, {
    x: PAGE_MARGIN + 22,
    y: A4_HEIGHT - 232,
    size: 34,
    font: boldFont,
    color: RED,
  });
  page.drawText('FINAL SCORE', {
    x: PAGE_MARGIN + 24,
    y: A4_HEIGHT - 253,
    size: 8,
    font: boldFont,
    color: MUTED,
  });
  page.drawText(audit.quizGrade, {
    x: PAGE_MARGIN + 165,
    y: A4_HEIGHT - 224,
    size: 15,
    font: boldFont,
    color: DARK,
    maxWidth: A4_WIDTH - PAGE_MARGIN * 2 - 185,
  });
  page.drawText('ASSESSMENT GRADE', {
    x: PAGE_MARGIN + 165,
    y: A4_HEIGHT - 247,
    size: 8,
    font: boldFont,
    color: MUTED,
  });

  page.drawText('EMPLOYEE', {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 335,
    size: 11,
    font: boldFont,
    color: RED,
  });
  let y = A4_HEIGHT - 365;
  y = drawLabelValue(page, 'Name', audit.employeeName, PAGE_MARGIN, y, 225, font, boldFont);
  y = drawLabelValue(page, 'Employee ID', audit.employeeId, PAGE_MARGIN, y, 225, font, boldFont);
  y = drawLabelValue(page, 'Email', audit.employeeEmail, PAGE_MARGIN, y, 225, font, boldFont);
  y = drawLabelValue(page, 'Department', audit.department, PAGE_MARGIN, y, 225, font, boldFont);
  drawLabelValue(page, 'Position', audit.position, PAGE_MARGIN, y, 225, font, boldFont);

  page.drawText('SIGNING RECORD', {
    x: A4_WIDTH / 2 + 12,
    y: A4_HEIGHT - 335,
    size: 11,
    font: boldFont,
    color: RED,
  });
  y = A4_HEIGHT - 365;
  const rightX = A4_WIDTH / 2 + 12;
  y = drawLabelValue(page, 'Record ID', audit.recordId, rightX, y, 225, font, boldFont);
  y = drawLabelValue(
    page,
    'Template / Revision',
    `${audit.templateVersion} / Revision ${audit.revision}`,
    rightX,
    y,
    225,
    font,
    boldFont
  );
  y = drawLabelValue(
    page,
    'Completed (Malaysia time)',
    new Date(audit.finalizedAt).toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      hourCycle: 'h23',
    }),
    rightX,
    y,
    225,
    font,
    boldFont
  );
  drawLabelValue(page, 'Template SHA-256', audit.templateSha256, rightX, y, 225, font, boldFont);

  page.drawRectangle({
    x: PAGE_MARGIN,
    y: 120,
    width: A4_WIDTH - PAGE_MARGIN * 2,
    height: 92,
    color: LIGHT,
  });
  page.drawText('COMPLETE SIGNED HANDBOOK', {
    x: PAGE_MARGIN + 14,
    y: 182,
    size: 11,
    font: boldFont,
    color: RED,
  });
  const noteLines = wrapText(
    'The pages that follow preserve the original handbook page order. Parts 1-14 include the employee handwritten initial and Malaysia timestamp; Part 15 includes the final handwritten signature and timestamp.',
    font,
    9,
    A4_WIDTH - PAGE_MARGIN * 2 - 28
  );
  noteLines.forEach((line, index) => {
    page.drawText(line, {
      x: PAGE_MARGIN + 14,
      y: 159 - index * 13,
      size: 9,
      font,
      color: DARK,
    });
  });
}

function stampIdentityField(
  page: PDFPage,
  placement: HandbookTextPlacement,
  value: string,
  font: PDFFont
) {
  const fontSize = placement.fontSize ?? 9;
  const text = value.trim() || '-';
  const fittedSize = Math.max(
    6,
    Math.min(fontSize, fontSize * (placement.maxWidth / font.widthOfTextAtSize(text, fontSize)))
  );
  page.drawText(text, {
    x: placement.x,
    y: topLeftY(page, placement.y, fittedSize),
    size: fittedSize,
    font,
    color: DARK,
    maxWidth: placement.maxWidth,
  });
}

function stampEmployeeIdentity(
  pdf: PDFDocument,
  manifest: HandbookPlacementManifest,
  audit: HandbookAuditData,
  font: PDFFont
) {
  if (!manifest.identity) return;
  const page = pdf.getPage(manifest.identity.page - 1);
  const fields: Array<[HandbookTextPlacement, string]> = [
    [manifest.identity.employeeName, audit.employeeName],
    [manifest.identity.department, audit.department],
    [manifest.identity.position, audit.position],
  ];
  fields.forEach(([placement, value]) => {
    const fontSize = placement.fontSize ?? 9;
    if (
      placement.x + placement.maxWidth > page.getWidth() ||
      placement.y + fontSize > page.getHeight()
    ) {
      throw new Error('Employee identity placement exceeds the PDF page bounds.');
    }
    stampIdentityField(page, placement, value, font);
  });
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text
    .trim()
    .split(/\s+/)
    .flatMap((word) => {
      if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) return [word];
      const chunks: string[] = [];
      let chunk = '';
      for (const character of word) {
        const candidate = `${chunk}${character}`;
        if (chunk && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
          chunks.push(chunk);
          chunk = character;
        } else {
          chunk = candidate;
        }
      }
      if (chunk) chunks.push(chunk);
      return chunks;
    });
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawAuditHeader(page: PDFPage, title: string, font: PDFFont, boldFont: PDFFont) {
  page.drawRectangle({
    x: 0,
    y: A4_HEIGHT - 58,
    width: A4_WIDTH,
    height: 58,
    color: RED,
  });
  page.drawRectangle({
    x: 0,
    y: A4_HEIGHT - 62,
    width: A4_WIDTH,
    height: 4,
    color: GOLD,
  });
  page.drawText('REDPOINT SDN. BHD.', {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 30,
    size: 13,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  page.drawText(title, {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 47,
    size: 9,
    font,
    color: rgb(0.92, 0.92, 0.92),
  });
}

function drawLabelValue(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  boldFont: PDFFont
): number {
  page.drawText(label, { x, y, size: 8, font: boldFont, color: RED });
  const lines = wrapText(value || '-', font, 9, width);
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - 14 - index * 12, size: 9, font, color: DARK });
  });
  return y - 22 - Math.max(0, lines.length - 1) * 12;
}

function appendAuditAppendix(
  pdf: PDFDocument,
  audit: HandbookAuditData,
  marks: HandbookPdfMarkInput[],
  finalSignatureImage: PDFImage,
  font: PDFFont,
  boldFont: PDFFont
) {
  const first = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  drawAuditHeader(first, 'HANDBOOK ELECTRONIC SIGNING AUDIT APPENDIX', font, boldFont);

  first.drawText('SIGNING RECORD', {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 95,
    size: 16,
    font: boldFont,
    color: RED,
  });
  first.drawText(
    'This appendix records signer identity, document version, acknowledgement timestamps, and assessment result.',
    {
      x: PAGE_MARGIN,
      y: A4_HEIGHT - 116,
      size: 8,
      font,
      color: MUTED,
      maxWidth: A4_WIDTH - PAGE_MARGIN * 2,
    }
  );

  first.drawRectangle({
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 330,
    width: A4_WIDTH - PAGE_MARGIN * 2,
    height: 190,
    color: LIGHT,
    borderColor: RED,
    borderWidth: 0.75,
  });

  let y = A4_HEIGHT - 165;
  y = drawLabelValue(first, 'Employee', audit.employeeName, PAGE_MARGIN + 14, y, 210, font, boldFont);
  y = drawLabelValue(first, 'Employee ID', audit.employeeId, PAGE_MARGIN + 14, y, 210, font, boldFont);
  y = drawLabelValue(first, 'Email', audit.employeeEmail, PAGE_MARGIN + 14, y, 210, font, boldFont);
  y = drawLabelValue(first, 'Department', audit.department, PAGE_MARGIN + 14, y, 210, font, boldFont);
  drawLabelValue(first, 'Position', audit.position, PAGE_MARGIN + 14, y, 210, font, boldFont);

  y = A4_HEIGHT - 165;
  const rightX = A4_WIDTH / 2 + 10;
  y = drawLabelValue(first, 'Record ID', audit.recordId, rightX, y, 220, font, boldFont);
  y = drawLabelValue(
    first,
    'Template / Revision',
    `${audit.templateVersion} / Revision ${audit.revision}`,
    rightX,
    y,
    220,
    font,
    boldFont
  );
  y = drawLabelValue(
    first,
    'Finalized',
    new Date(audit.finalizedAt).toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
    }),
    rightX,
    y,
    220,
    font,
    boldFont
  );
  y = drawLabelValue(
    first,
    'Quiz Result',
    `${audit.quizScorePercent}% (${audit.quizGrade})`,
    rightX,
    y,
    220,
    font,
    boldFont
  );
  drawLabelValue(
    first,
    'Template SHA-256',
    audit.templateSha256,
    rightX,
    y,
    220,
    font,
    boldFont
  );

  first.drawText('SECTION ACKNOWLEDGEMENT TIMESTAMPS', {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 365,
    size: 11,
    font: boldFont,
    color: RED,
  });

  const sortedMarks = [...marks].sort((a, b) => a.partNumber - b.partNumber);
  const rowHeight = 27;
  sortedMarks.forEach((mark, index) => {
    const rowY = A4_HEIGHT - 395 - index * rowHeight;
    if (index > 14) return;
    first.drawRectangle({
      x: PAGE_MARGIN,
      y: rowY - 7,
      width: A4_WIDTH - PAGE_MARGIN * 2,
      height: rowHeight,
      color: index % 2 === 0 ? LIGHT : rgb(1, 1, 1),
    });
    first.drawText(
      mark.kind === 'final_signature'
        ? 'Part 15 - Final Signature'
        : `Part ${mark.partNumber} - Initial`,
      {
        x: PAGE_MARGIN + 10,
        y: rowY,
        size: 8.5,
        font: boldFont,
        color: DARK,
      }
    );
    first.drawText(
      new Date(mark.capturedAt).toLocaleString('en-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
      }),
      {
        x: A4_WIDTH - PAGE_MARGIN - 190,
        y: rowY,
        size: 8.5,
        font,
        color: MUTED,
      }
    );
  });

  const hashNote = wrapText(
    'The completed PDF SHA-256 is stored in the private signing record. It is not embedded because doing so would change the file hash.',
    font,
    7,
    A4_WIDTH - PAGE_MARGIN * 2
  );
  hashNote.forEach((line, index) => {
    first.drawText(line, {
      x: PAGE_MARGIN,
      y: 35 - index * 9,
      size: 7,
      font,
      color: MUTED,
    });
  });

  const finalMark = marks.find(
    (mark) =>
      mark.partNumber === FINAL_SIGNATURE_PART_NUMBER &&
      mark.kind === 'final_signature'
  );
  if (!finalMark) {
    throw new Error('The final signature is missing from the audit appendix.');
  }

  const signaturePage = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  drawAuditHeader(
    signaturePage,
    'HANDBOOK ELECTRONIC SIGNING AUDIT APPENDIX',
    font,
    boldFont
  );
  signaturePage.drawText('FINAL SIGNATURE EVIDENCE', {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 100,
    size: 16,
    font: boldFont,
    color: RED,
  });
  signaturePage.drawText(
    'The signature below is the final Part 15 mark recorded for this immutable handbook revision.',
    {
      x: PAGE_MARGIN,
      y: A4_HEIGHT - 122,
      size: 8.5,
      font,
      color: MUTED,
    }
  );
  signaturePage.drawText('Employee final signature', {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 165,
    size: 9,
    font: boldFont,
    color: DARK,
  });
  signaturePage.drawRectangle({
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 365,
    width: A4_WIDTH - PAGE_MARGIN * 2,
    height: 180,
    color: rgb(1, 1, 1),
    borderColor: RED,
    borderWidth: 0.75,
  });
  const fittedSignature = fitImage(
    finalSignatureImage,
    A4_WIDTH - PAGE_MARGIN * 2 - 48,
    130
  );
  signaturePage.drawImage(finalSignatureImage, {
    x: (A4_WIDTH - fittedSignature.width) / 2,
    y: A4_HEIGHT - 275 - fittedSignature.height / 2,
    width: fittedSignature.width,
    height: fittedSignature.height,
  });

  const signedAt = new Date(finalMark.capturedAt).toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
  });
  drawLabelValue(
    signaturePage,
    'Captured at (Asia/Kuala_Lumpur)',
    signedAt,
    PAGE_MARGIN,
    A4_HEIGHT - 405,
    240,
    font,
    boldFont
  );
  drawLabelValue(
    signaturePage,
    'Record ID / Revision',
    `${audit.recordId} / Revision ${audit.revision}`,
    A4_WIDTH / 2 + 10,
    A4_HEIGHT - 405,
    220,
    font,
    boldFont
  );
  signaturePage.drawRectangle({
    x: PAGE_MARGIN,
    y: 215,
    width: A4_WIDTH - PAGE_MARGIN * 2,
    height: 165,
    color: LIGHT,
  });
  signaturePage.drawText('RECORD DECLARATION', {
    x: PAGE_MARGIN + 14,
    y: 350,
    size: 10,
    font: boldFont,
    color: RED,
  });
  const declaration = [
    `Signer: ${audit.employeeName} (${audit.employeeEmail})`,
    `Template: ${audit.templateVersion}`,
    `Template SHA-256: ${audit.templateSha256}`,
    `Quiz result: ${audit.quizScorePercent}% (${audit.quizGrade})`,
  ];
  declaration.forEach((line, index) => {
    signaturePage.drawText(line, {
      x: PAGE_MARGIN + 14,
      y: 326 - index * 25,
      size: 8.5,
      font,
      color: DARK,
      maxWidth: A4_WIDTH - PAGE_MARGIN * 2 - 28,
    });
  });
  signaturePage.drawText(
    'The completed PDF SHA-256 is stored with the private signing session record.',
    {
      x: PAGE_MARGIN,
      y: 38,
      size: 7,
      font,
      color: MUTED,
    }
  );
}

export async function stampHandbookTemplate(input: {
  templateBytes: Uint8Array;
  manifest: HandbookPlacementManifest;
  marks: HandbookPdfMarkInput[];
  audit: HandbookAuditData;
}): Promise<Uint8Array> {
  validatePlacementManifest(input.manifest);
  if (input.manifest.templateVersion !== input.audit.templateVersion) {
    throw new Error('Placement manifest version does not match the signing template version.');
  }

  const pdf = await PDFDocument.load(input.templateBytes);
  if (pdf.getPageCount() !== input.manifest.pageCount) {
    throw new Error(
      `Template page count mismatch. Expected ${input.manifest.pageCount}, received ${pdf.getPageCount()}.`
    );
  }

  const requiredParts = [...INITIAL_PART_NUMBERS, FINAL_SIGNATURE_PART_NUMBER];
  const marksByPart = new Map(input.marks.map((mark) => [mark.partNumber, mark]));
  for (const partNumber of requiredParts) {
    const mark = marksByPart.get(partNumber);
    if (!mark) throw new Error(`Missing signature mark for Part ${partNumber}.`);
    const expectedKind = partNumber === FINAL_SIGNATURE_PART_NUMBER
      ? 'final_signature'
      : 'initial';
    if (mark.kind !== expectedKind) {
      throw new Error(`Part ${partNumber} has the wrong signature mark kind.`);
    }
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  let finalSignatureImage: PDFImage | null = null;

  for (const placement of input.manifest.placements) {
    const mark = marksByPart.get(placement.partNumber)!;
    const page = pdf.getPage(placement.page - 1);
    validatePlacementBounds(page, placement);
    const image = await pdf.embedPng(mark.imageBytes);
    if (placement.partNumber === FINAL_SIGNATURE_PART_NUMBER) {
      finalSignatureImage = image;
    }
    stampMark(page, placement, image, mark.capturedAt, font);
  }

  stampEmployeeIdentity(pdf, input.manifest, input.audit, font);

  if (!finalSignatureImage) {
    throw new Error('The final signature image could not be embedded.');
  }
  prependQuizResultSummary(pdf, input.audit, font, boldFont);
  pdf.setTitle(`RedPoint Employee Handbook - ${input.audit.employeeName}`);
  pdf.setSubject(`Signed handbook record ${input.audit.recordId}`);
  pdf.setAuthor('RedPoint Sdn. Bhd.');
  pdf.setCreator('RedPoint Remote HR System');
  pdf.setProducer('RedPoint Remote HR System');
  pdf.setCreationDate(new Date(input.audit.finalizedAt));
  pdf.setModificationDate(new Date(input.audit.finalizedAt));

  return pdf.save({ useObjectStreams: false });
}
