import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { PDFDocument } from 'pdf-lib';
import { validatePlacementManifest } from '../src/onboarding-portal/signing/handbookPdf';
import { HandbookPlacementManifest } from '../src/onboarding-portal/signing/types';

config({ path: '.env.local' });
config();

function readArg(name: string, required = true): string | null {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (required && (!value || value.startsWith('--'))) {
    throw new Error(`Missing required argument --${name}.`);
  }
  return value;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function main() {
  const pdfPath = path.resolve(readArg('pdf')!);
  const manifestPath = path.resolve(readArg('manifest')!);
  const entityId = readArg('entity', false);
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  const [pdfBytes, manifestText] = await Promise.all([
    fs.readFile(pdfPath),
    fs.readFile(manifestPath, 'utf8'),
  ]);
  const manifest = JSON.parse(manifestText) as HandbookPlacementManifest;
  validatePlacementManifest(manifest);

  const document = await PDFDocument.load(pdfBytes);
  if (document.getPageCount() !== manifest.pageCount) {
    throw new Error(
      `PDF has ${document.getPageCount()} pages but manifest expects ${manifest.pageCount}.`
    );
  }

  const sha256 = sha256Hex(pdfBytes);
  const entitySegment = entityId ? entityId.replace(/[^a-zA-Z0-9._-]+/g, '_') : 'GLOBAL';
  const versionSegment = manifest.templateVersion.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const storagePath = `templates/${entitySegment}/${versionSegment}/source.pdf`;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let existingQuery = admin
    .from('handbook_templates')
    .select('*')
    .eq('version', manifest.templateVersion);
  existingQuery = entityId
    ? existingQuery.eq('entity_id', entityId)
    : existingQuery.is('entity_id', null);
  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const sameManifest =
      JSON.stringify(existing.coordinate_map) === JSON.stringify(manifest);
    if (
      existing.sha256 !== sha256 ||
      existing.page_count !== manifest.pageCount ||
      !sameManifest
    ) {
      throw new Error(
        `Template ${manifest.templateVersion} is immutable. Use a new version for PDF or coordinate changes.`
      );
    }
  } else {
    const { error: uploadError } = await admin.storage
      .from('handbook-templates')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (uploadError) throw new Error(`Template upload failed: ${uploadError.message}`);

    const { error: insertError } = await admin.from('handbook_templates').insert({
      entity_id: entityId,
      version: manifest.templateVersion,
      storage_path: storagePath,
      page_count: manifest.pageCount,
      sha256,
      coordinate_map: manifest,
      is_active: false,
    });
    if (insertError) {
      await admin.storage.from('handbook-templates').remove([storagePath]);
      throw new Error(`Template registration failed: ${insertError.message}`);
    }
  }

  let deactivateQuery = admin
    .from('handbook_templates')
    .update({ is_active: false })
    .neq('version', manifest.templateVersion);
  deactivateQuery = entityId
    ? deactivateQuery.eq('entity_id', entityId)
    : deactivateQuery.is('entity_id', null);
  const { error: deactivateError } = await deactivateQuery;
  if (deactivateError) throw new Error(deactivateError.message);

  let activateQuery = admin
    .from('handbook_templates')
    .update({ is_active: true })
    .eq('version', manifest.templateVersion);
  activateQuery = entityId
    ? activateQuery.eq('entity_id', entityId)
    : activateQuery.is('entity_id', null);
  const { error: activateError } = await activateQuery;
  if (activateError) throw new Error(activateError.message);

  console.log(
    JSON.stringify(
      {
        status: 'active',
        entityId: entityId || null,
        version: manifest.templateVersion,
        pageCount: manifest.pageCount,
        sha256,
        storagePath,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
