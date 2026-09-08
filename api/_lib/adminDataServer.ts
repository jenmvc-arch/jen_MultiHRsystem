import {
  createMainAdminClient,
  requirePermission,
} from './employeeAccountServer.js';

const TABLES = new Set([
  'corporate_entities',
  'employees',
  'candidates',
  'performances',
  'appraisal_access_grants',
  'payroll_records_2026',
  'audit_logs',
  'candidate_share_links',
]);

const serviceError = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const assertTable = (table: unknown) => {
  const value = String(table || '').trim();
  if (!TABLES.has(value)) throw serviceError('This data resource is not available.', 403);
  return value;
};

const readRows = async (table: string) => {
  const { data, error } = await createMainAdminClient().from(table).select('*');
  if (error) throw new Error(`Admin data could not be loaded: ${error.message}`);
  return data || [];
};

export const loadAdminData = async (req: any) => {
  await requirePermission(req, 'admin.data.read');
  const client = createMainAdminClient();
  const tables = [
    'corporate_entities',
    'employees',
    'candidates',
    'performances',
    'appraisal_access_grants',
    'payroll_records_2026',
    'audit_logs',
  ];
  const results = await Promise.all(tables.map(async (table) => {
    const { data, error } = await client.from(table).select('*');
    if (error) throw new Error(`Admin ${table} data could not be loaded: ${error.message}`);
    return [table, data || []] as const;
  }));
  return Object.fromEntries(results);
};

export const mutateAdminData = async (req: any) => {
  await requirePermission(req, 'admin.data.write');
  const table = assertTable(req.body?.table);
  const operation = String(req.body?.operation || '').trim();
  const data = req.body?.data;
  const idValue = req.body?.idValue;
  const idColumn = String(req.body?.idColumn || 'id').trim();
  if (!['insert', 'update', 'delete', 'upsert'].includes(operation)) {
    throw serviceError('Unsupported data operation.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw serviceError('A data object is required.');
  }

  const client = createMainAdminClient();
  if (operation === 'insert') {
    const result = await client.from(table).insert(data).select().single();
    if (result.error) throw new Error(`Admin ${table} insert failed: ${result.error.message}`);
    return result.data;
  }
  if (operation === 'upsert') {
    const result = await client.from(table).upsert(data).select().single();
    if (result.error) throw new Error(`Admin ${table} upsert failed: ${result.error.message}`);
    return result.data;
  }
  if (idValue === undefined || idValue === null || !idColumn) {
    throw serviceError('An identifier is required for this operation.');
  }
  if (operation === 'update') {
    const result = await client
      .from(table)
      .update(data)
      .eq(idColumn, idValue)
      .select()
      .single();
    if (result.error) throw new Error(`Admin ${table} update failed: ${result.error.message}`);
    return result.data;
  }
  const result = await client
    .from(table)
    .delete()
    .eq(idColumn, idValue)
    .select()
    .single();
  if (result.error) throw new Error(`Admin ${table} delete failed: ${result.error.message}`);
  return result.data;
};

export const uploadAdminDocument = async (req: any) => {
  await requirePermission(req, 'documents.manage');
  const fileName = String(req.body?.fileName || '').trim();
  const contentType = String(req.body?.contentType || 'application/octet-stream').trim();
  const base64 = String(req.body?.base64 || '').trim();
  if (!fileName || !base64) throw serviceError('A document file is required.');
  if (base64.length > 25 * 1024 * 1024) throw serviceError('The document is too large.', 413);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}_${safeName}`;
  const buffer = Buffer.from(base64, 'base64');
  const client = createMainAdminClient();
  const uploaded = await client.storage.from('hr-documents').upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (uploaded.error) throw new Error(`Document upload failed: ${uploaded.error.message}`);
  const signed = await client.storage.from('hr-documents').createSignedUrl(path, 60 * 60);
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(`Document signed URL could not be created: ${signed.error?.message || 'unknown error'}`);
  }
  return signed.data.signedUrl;
};
