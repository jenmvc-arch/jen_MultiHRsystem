import fs from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import { stampHandbookTemplate } from '../src/onboarding-portal/signing/handbookPdf';
import {
  HandbookPdfMarkInput,
  HandbookPlacementManifest,
} from '../src/onboarding-portal/signing/types';

function readArg(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value || value.startsWith('--')) throw new Error(`Missing required argument --${name}.`);
  return value;
}

function drawLine(png: PNG, x1: number, y1: number, x2: number, y2: number, width = 3) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(x1 + ((x2 - x1) * step) / steps);
    const y = Math.round(y1 + ((y2 - y1) * step) / steps);
    for (let dx = -width; dx <= width; dx += 1) {
      for (let dy = -width; dy <= width; dy += 1) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
        const index = (png.width * py + px) << 2;
        png.data[index] = 24;
        png.data[index + 1] = 24;
        png.data[index + 2] = 24;
        png.data[index + 3] = 255;
      }
    }
  }
}

function createTestMark(isFinalSignature: boolean): Uint8Array {
  const png = new PNG({ width: isFinalSignature ? 520 : 180, height: isFinalSignature ? 110 : 70 });
  if (isFinalSignature) {
    drawLine(png, 14, 76, 68, 24, 2);
    drawLine(png, 68, 24, 104, 82, 2);
    drawLine(png, 42, 58, 118, 55, 2);
    drawLine(png, 124, 73, 185, 37, 2);
    drawLine(png, 185, 37, 230, 75, 2);
    drawLine(png, 222, 75, 310, 42, 2);
    drawLine(png, 303, 43, 386, 72, 2);
    drawLine(png, 377, 72, 500, 58, 2);
  } else {
    drawLine(png, 18, 58, 45, 12, 2);
    drawLine(png, 45, 12, 74, 58, 2);
    drawLine(png, 31, 40, 62, 40, 2);
    drawLine(png, 91, 14, 91, 58, 2);
    drawLine(png, 91, 14, 145, 14, 2);
    drawLine(png, 145, 14, 101, 36, 2);
    drawLine(png, 101, 36, 153, 58, 2);
  }
  return PNG.sync.write(png);
}

async function main() {
  const pdfPath = path.resolve(readArg('pdf'));
  const manifestPath = path.resolve(readArg('manifest'));
  const outputPath = path.resolve(readArg('output'));
  const [templateBytes, manifestText] = await Promise.all([
    fs.readFile(pdfPath),
    fs.readFile(manifestPath, 'utf8'),
  ]);
  const manifest = JSON.parse(manifestText) as HandbookPlacementManifest;
  const capturedAt = '2026-08-02T12:00:00.000Z';
  const marks: HandbookPdfMarkInput[] = manifest.placements.map((placement) => ({
    partNumber: placement.partNumber,
    kind: placement.kind,
    imageBytes: createTestMark(placement.kind === 'final_signature'),
    capturedAt,
  }));
  const output = await stampHandbookTemplate({
    templateBytes,
    manifest,
    marks,
    audit: {
      recordId: 'placement-preview-only',
      employeeName: 'Placement Test Employee',
      employeeId: 'EMP-PREVIEW',
      employeeEmail: 'preview@redpoint.com.my',
      department: 'Human Resources',
      position: 'People Operations Specialist',
      templateVersion: manifest.templateVersion,
      templateSha256: 'a7a676f8b0b0ce0812404635d2c28320e17cff5bd9f4e0b0b40c62e296f8214e',
      revision: 1,
      finalizedAt: capturedAt,
      quizScorePercent: 100,
      quizGrade: 'PASSED',
    },
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, output);
  console.log(`Created placement preview: ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
