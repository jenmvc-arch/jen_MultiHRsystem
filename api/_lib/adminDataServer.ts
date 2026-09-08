import {
  createEmployeeAdminClient,
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

const missingColumnFromError = (message: string) => {
  const direct = message.match(/Could not find the '([^']+)' column/i);
  if (direct) return direct[1];
  const relation = message.match(/column "([^"]+)" of relation/i);
  return relation?.[1] || null;
};

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
    // Keep deployments usable while additive migrations are being rolled out.
    // New payroll metadata is removed one missing column at a time, rather
    // than turning a valid save into a total failure on an older schema.
    const retryData = { ...data };
    const maxRetries = Object.keys(retryData).length + 1;
    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      const result = await client.from(table).upsert(retryData).select().single();
      if (!result.error) return result.data;
      const missingColumn = missingColumnFromError(result.error.message || '');
      if (!missingColumn || retryData[missingColumn] === undefined) {
        throw new Error(`Admin ${table} upsert failed: ${result.error.message}`);
      }
      console.warn(`[Admin Data] Removing missing column '${missingColumn}' and retrying ${table} upsert.`);
      delete retryData[missingColumn];
    }
    throw new Error(`Admin ${table} upsert failed after schema compatibility retries.`);
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
    if (table === 'employees' && data.email) {
      try {
        const accountClient = createEmployeeAdminClient();
        const accountUpdate = await accountClient
          .from('employee_accounts')
          .update({
            employee_email: String(data.email).trim().toLowerCase(),
            username: String(data.email).trim().toLowerCase(),
            updated_at: new Date().toISOString(),
          })
          .eq('employee_id', String(result.data?.id || idValue));
        if (accountUpdate.error && !/employee_accounts|schema cache|could not find the table/i.test(accountUpdate.error.message || '')) {
          throw new Error(accountUpdate.error.message);
        }
      } catch (error: any) {
        console.warn('[Employee Account Sync] Email metadata could not be synchronized:', error?.message || error);
      }
    }
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
