import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import type { Employee, ReviewCycle } from './types';
import {
  buildAppraisalPdfFilename,
  createAppraisalReviewPdf,
  formatAppraisalPdfTimestamp,
} from './lib/appraisalPdfExport';
import {
  calculateAppraisalScores,
  createDefaultAppraisalDraft,
} from './lib/performanceAppraisalDraft';

const employee = {
  id: 'EMP/QA 001',
  name: 'Aisha Tan / Quality Lead',
  designation: 'Quality Engineering Lead',
  department: 'Product & Engineering',
  nricPassport: '900101-14-5555',
} as Employee;

const reviewCycle: ReviewCycle = {
  id: 'cycle-2026-annual',
  name: 'Annual Review 2026',
  period: 'Jan 1 - Feb 28, 2026',
  status: 'In Progress',
};

const draft = createDefaultAppraisalDraft(employee, reviewCycle, null, 'Test Manager');
draft.reviewFrom = '2026-01';
draft.reviewTo = '2026-12';
draft.reviewPurpose = 'Validate the full printable appraisal review package with enough content to exercise pagination.';
draft.qualitative = {
  employeeOverallComment: 'Delivered a reliable test strategy and improved release confidence across several teams.',
  keyStrengths: 'Clear communication, dependable execution, and strong cross-functional collaboration.',
  improvementAreas: 'Continue delegating test automation ownership and build more reusable quality dashboards.',
  supportTraining: 'Advanced leadership coaching and additional time for quality engineering enablement.',
  nextObjectives: 'Publish the next-cycle quality roadmap\nMentor two senior engineers\nReduce escaped defects by 15%',
  managerOverallComment: 'A strong contributor who is ready to take on broader quality leadership responsibilities.',
};
draft.management = {
  decision: 'Promote Employee',
  effectiveDate: '2027-01-01',
  newPosition: 'Head of Quality Engineering',
  newProbationEndDate: '',
  reason: 'Promotion recommended based on sustained performance and leadership impact.',
  other: '',
};
draft.signatures = {
  appraiseeName: 'Aisha Tan',
  appraiseeDate: '2026-12-15',
  appraiserName: 'Test Manager',
  appraiserDate: '2026-12-16',
  hrReviewerName: 'HR Reviewer',
  hrReviewerDate: '2026-12-17',
};

draft.kpiCategories = Array.from({ length: 3 }, (_, categoryIndex) => ({
  id: `category-${categoryIndex}`,
  name: `KPI Category ${categoryIndex + 1}`,
  rows: Array.from({ length: 4 }, (_, rowIndex) => ({
    id: `row-${categoryIndex}-${rowIndex}`,
    kra: `Key result area ${categoryIndex + 1}.${rowIndex + 1} with a deliberately long description to confirm wrapped PDF text remains readable.`,
    outcome: `Expected outcome ${categoryIndex + 1}.${rowIndex + 1}: complete the agreed deliverable within the review period and document measurable business impact.`,
    weight: 100 / 12,
    appraiseeScore: 4,
    agreedScore: 4.5,
    evidence: {
      achievement: 'Completed the deliverable with documented evidence and a measurable improvement over the previous review cycle.',
      managerVerification: 'Verified against the submitted project record and team delivery notes.',
      evidenceType: 'Document' as const,
      evidenceLink: 'https://example.test/evidence',
      completionPercent: 100,
      status: 'Verified' as const,
    },
  })),
}));

draft.competencies = draft.competencies.map((competency) => ({
  ...competency,
  appraiseeRating: 4,
  agreedRating: 4.5,
  appraiseeComment: 'Demonstrated this competency consistently throughout the review period.',
  managerComment: 'Strong and reliable performance with clear evidence of growth.',
  supportingExample: 'Led a cross-functional improvement initiative and documented the resulting process changes.',
}));

const generatedAt = '2026-08-21T04:30:00.000+08:00';

const pdfBytes = (mode: 'manager' | 'employee') => {
  const pdf = createAppraisalReviewPdf({
    draft,
    scores: calculateAppraisalScores(draft),
    reviewCycle,
    mode,
    generatedAt,
  });
  return new Uint8Array(pdf.output('arraybuffer'));
};

assert.match(formatAppraisalPdfTimestamp(generatedAt), /2026/);
assert.match(formatAppraisalPdfTimestamp(generatedAt), /GMT\+8$/);

assert.equal(
  buildAppraisalPdfFilename(draft, generatedAt),
  'Appraisal_Review_Aisha_Tan_Quality_Lead_Annual_Review_2026_20260821043000_SANDBOX.pdf',
);

const managerPdfBytes = pdfBytes('manager');
const employeePdfBytes = pdfBytes('employee');
if (process.env.APPRAISAL_PDF_TEST_OUTPUT) {
  await writeFile(process.env.APPRAISAL_PDF_TEST_OUTPUT, managerPdfBytes);
}
assert.ok(managerPdfBytes.length > 5000, 'The manager PDF should contain the populated report content.');
assert.ok(employeePdfBytes.length > 5000, 'The employee PDF should contain the populated report content.');

const managerPdf = await PDFDocument.load(managerPdfBytes);
const employeePdf = await PDFDocument.load(employeePdfBytes);
assert.ok(managerPdf.getPageCount() >= 3, 'The populated manager report should span multiple pages.');
assert.ok(employeePdf.getPageCount() >= 2, 'The populated employee report should span multiple pages.');
assert.ok(managerPdfBytes.length > employeePdfBytes.length, 'Manager mode should include additional management content.');

console.log('Appraisal PDF export tests passed.');
