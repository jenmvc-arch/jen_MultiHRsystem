import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { stampHandbookTemplate, validatePlacementManifest } from './onboarding-portal/signing/handbookPdf';
import {
  HandbookAuditData,
  HandbookPdfMarkInput,
  HandbookPlacementManifest,
} from './onboarding-portal/signing/types';

async function createTemplate(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let partNumber = 1; partNumber <= 15; partNumber += 1) {
    const page = pdf.addPage([612, 792]);
    page.drawText(`Original handbook page ${partNumber}`, {
      x: 36,
      y: 740,
      size: 16,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }
  return pdf.save({ useObjectStreams: false });
}

function createManifest(): HandbookPlacementManifest {
  return {
    schemaVersion: 1,
    templateVersion: 'test-v1',
    pageCount: 15,
    placements: Array.from({ length: 15 }, (_, index) => {
      const partNumber = index + 1;
      return {
        partNumber,
        kind: partNumber === 15 ? 'final_signature' : 'initial',
        page: partNumber,
        x: 36,
        y: 90,
        width: partNumber === 15 ? 160 : 80,
        height: partNumber === 15 ? 60 : 40,
        date: {
          x: 225,
          y: 105,
          fontSize: 9,
        },
      };
    }),
    identity: {
      page: 15,
      employeeName: { x: 36, y: 190, maxWidth: 180, fontSize: 9 },
      department: { x: 36, y: 210, maxWidth: 180, fontSize: 9 },
      position: { x: 36, y: 230, maxWidth: 180, fontSize: 9 },
    },
  };
}

const audit: HandbookAuditData = {
  recordId: 'record-test-001',
  employeeName: 'Test Employee',
  employeeId: 'employee-test-001',
  employeeEmail: 'employee@example.com',
  department: 'Quality Assurance',
  position: 'Test Engineer',
  templateVersion: 'test-v1',
  templateSha256: 'a'.repeat(64),
  revision: 1,
  finalizedAt: '2026-07-31T04:30:00.000Z',
  quizScorePercent: 100,
  quizGrade: 'A',
};

async function expectReject(action: () => Promise<unknown>, messagePattern: RegExp) {
  await assert.rejects(action, messagePattern);
}

async function run() {
  console.log('RUNNING HANDBOOK SIGNING PDF TEST SUITE');
  const templateBytes = await createTemplate();
  const imageBytes = new Uint8Array(
    await readFile(new URL('../public/redpoint-logo.png', import.meta.url))
  );
  const manifest = createManifest();
  const marks: HandbookPdfMarkInput[] = manifest.placements.map((placement) => ({
    partNumber: placement.partNumber,
    kind: placement.kind,
    imageBytes,
    capturedAt: `2026-07-${String(placement.partNumber).padStart(2, '0')}T04:30:00.000Z`,
  }));

  validatePlacementManifest(manifest);
  const output = await stampHandbookTemplate({
    templateBytes,
    manifest,
    marks,
    audit,
  });
  const signedPdf = await PDFDocument.load(output);
  if (process.env.HANDBOOK_TEST_OUTPUT) {
    await writeFile(process.env.HANDBOOK_TEST_OUTPUT, output);
  }
  assert.equal(
    signedPdf.getPageCount(),
    16,
    'The quiz result summary must be followed by all 15 original handbook pages.'
  );
  assert.ok(output.length > templateBytes.length, 'The signed PDF should contain added overlays.');
  assert.deepEqual(
    signedPdf.getPage(1).getSize(),
    { width: 612, height: 792 },
    'The first original handbook page dimensions must remain unchanged.'
  );
  assert.deepEqual(
    signedPdf.getPage(0).getSize(),
    { width: 595.28, height: 841.89 },
    'The quiz result summary must be the first A4 page.'
  );

  await expectReject(
    () =>
      stampHandbookTemplate({
        templateBytes,
        manifest,
        marks: marks.filter((mark) => mark.partNumber !== 8),
        audit,
      }),
    /Missing signature mark for Part 8/
  );

  await expectReject(
    () =>
      stampHandbookTemplate({
        templateBytes,
        manifest: { ...manifest, pageCount: 14 },
        marks,
        audit,
      }),
    /invalid PDF page|page count mismatch/i
  );

  const outOfBoundsManifest = createManifest();
  outOfBoundsManifest.placements[0] = {
    ...outOfBoundsManifest.placements[0],
    x: 580,
    width: 80,
  };
  await expectReject(
    () =>
      stampHandbookTemplate({
        templateBytes,
        manifest: outOfBoundsManifest,
        marks,
        audit,
      }),
    /exceeds PDF page 1/
  );

  await expectReject(
    () =>
      stampHandbookTemplate({
        templateBytes,
        manifest: { ...manifest, templateVersion: 'wrong-version' },
        marks,
        audit,
      }),
    /version does not match/
  );

  const invalidIdentityManifest = createManifest();
  invalidIdentityManifest.identity = {
    ...invalidIdentityManifest.identity!,
    employeeName: {
      ...invalidIdentityManifest.identity!.employeeName,
      x: 600,
    },
  };
  await expectReject(
    () =>
      stampHandbookTemplate({
        templateBytes,
        manifest: invalidIdentityManifest,
        marks,
        audit,
      }),
    /identity placement exceeds/i
  );

  console.log('HANDBOOK SIGNING PDF TESTS PASSED');
}

run().catch((error) => {
  console.error('HANDBOOK SIGNING PDF TESTS FAILED', error);
  process.exit(1);
});
