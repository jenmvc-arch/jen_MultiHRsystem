import type { SupabaseClient } from '@supabase/supabase-js';
import { safeFilename } from './exportService.js';
import { renderOfficialPayslipPdf } from './officialPayslipPdf.js';
import {
  createEmployeeAdminClient,
  createMainAdminClient,
  requirePermission,
} from './employeeAccountServer.js';
import { sendEmailTemplate } from './email/emailService.js';

type PayrollAction = 'process' | 'publish' | 'unpublish';

const serviceError = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const readRecordIds = (value: unknown) => {
  const ids = Array.isArray(value) ? value : value ? [value] : [];
  const unique = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!unique.length) throw serviceError('At least one payroll record is required.');
  if (unique.length > 500) throw serviceError('A maximum of 500 payroll records can be processed at once.', 413);
  return unique;
};

const missingColumnFromError = (message: string) => {
  const direct = message.match(/Could not find the '([^']+)' column/i);
  if (direct) return direct[1];
  const relation = message.match(/column "([^"]+)" of relation/i);
  return relation?.[1] || null;
};

const updatePayrollRow = async (
  client: SupabaseClient,
  recordId: string,
  values: Record<string, unknown>,
) => {
  const retryValues = { ...values };
  const maxRetries = Object.keys(retryValues).length + 1;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const result = await client
      .from('payroll_records_2026')
      .update(retryValues)
      .eq('id', recordId);
    if (!result.error) return;
    const missingColumn = missingColumnFromError(result.error.message || '');
    if (!missingColumn || retryValues[missingColumn] === undefined) {
      throw new Error(result.error.message);
    }
    delete retryValues[missingColumn];
  }
  throw new Error('Payroll update failed after schema compatibility retries.');
};

const loadPayrollContext = async (client: SupabaseClient, recordIds: string[]) => {
  const { data: records, error: recordError } = await client
    .from('payroll_records_2026')
    .select('*')
    .in('id', recordIds);
  if (recordError) throw new Error(`Payroll records could not be loaded: ${recordError.message}`);

  const emails = [...new Set((records || []).map((row: any) => normalize(row.employee_email)).filter(Boolean))];
  const employeeResult = emails.length
    ? await client.from('employees').select('*').in('email', emails)
    : { data: [], error: null };
  if (employeeResult.error) {
    throw new Error(`Payroll employees could not be loaded: ${employeeResult.error.message}`);
  }

  return {
    rows: records || [],
    employeeByEmail: new Map((employeeResult.data || []).map((employee: any) => [
      normalize(employee.email),
      employee,
    ])),
  };
};

export const updatePayrollStatuses = async (req: any, action: PayrollAction) => {
  const actor = await requirePermission(req, 'payroll.manage');
  const recordIds = readRecordIds(req.body?.recordIds);
  const client = createMainAdminClient();
  const { rows } = await loadPayrollContext(client, recordIds);
  const byId = new Map(rows.map((row: any) => [String(row.id), row]));
  const results: Array<{ ok: boolean; recordId: string; status?: string; message?: string; error?: string }> = [];

  for (const recordId of recordIds) {
    const row = byId.get(recordId);
    if (!row) {
      results.push({ ok: false, recordId, error: 'Payroll record was not found.' });
      continue;
    }
    if (action === 'process' && String(row.status || 'Draft') !== 'Draft') {
      results.push({ ok: false, recordId, error: 'Only Draft payroll can be processed.' });
      continue;
    }
    if (action === 'publish' && String(row.status || 'Draft') !== 'Processed') {
      results.push({ ok: false, recordId, error: 'Only Processed payroll can be published.' });
      continue;
    }
    if (action === 'unpublish' && String(row.status || '') !== 'Published') {
      results.push({ ok: false, recordId, error: 'Only Published payroll can be unpublished.' });
      continue;
    }

    const status = action === 'process'
      ? 'Processed'
      : action === 'publish' ? 'Published' : 'Processed';
    try {
      await updatePayrollRow(client, recordId, {
        status,
        published_at: action === 'publish' ? new Date().toISOString() : null,
        published_by: action === 'publish' ? actor.username : null,
        publish_error: null,
        updated_at: new Date().toISOString(),
      })
    } catch (error: any) {
      results.push({ ok: false, recordId, error: error?.message || 'Payroll update failed.' });
      continue;
    }
    try {
      await client.from('audit_logs').insert({
        id: `payroll_${action}_${recordId}_${Date.now()}`,
        employee_email: row.employee_email || null,
        changed_by: actor.username,
        change_type: `PAYROLL_${action.toUpperCase()}`,
        old_value: JSON.stringify({ status: row.status || 'Draft' }),
        new_value: JSON.stringify({ status }),
        created_at: new Date().toISOString(),
      });
    } catch (auditError: any) {
      console.warn('[Payroll Audit] Could not persist status audit record:', auditError?.message || auditError);
    }
    results.push({
      ok: true,
      recordId,
      status,
      message: action === 'process'
        ? 'Payroll was processed and is ready to publish.'
        : action === 'publish'
          ? 'Payroll published to the employee site.'
          : 'Payroll was returned to Processed.',
    });
  }

  return { results };
};

const attachmentName = (email: string, month: number, year: number) =>
  safeFilename(`Payslip_${email}_${year}_${String(month).padStart(2, '0')}`, 'pdf');

const payrollMonthLabel = (month: number, year: number) => {
  const parsed = new Date(Date.UTC(year, month - 1, 1));
  return Number.isNaN(parsed.getTime())
    ? String(month)
    : parsed.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
};

const payrollTypeLabel = (row: any) => {
  if (row.document_type === 'Payment Voucher') return 'Payment Voucher';
  if (row.document_type === 'Payslip') return 'Payslip';
  return row.statutory_treatment === 'without_statutory'
    ? 'Payment Voucher'
    : 'Payslip';
};

export const sendPayrollPayslipEmails = async (req: any) => {
  const actor = await requirePermission(req, 'payroll.manage');
  const recordIds = readRecordIds(req.body?.recordIds);
  const client = createMainAdminClient();
  const { rows, employeeByEmail } = await loadPayrollContext(client, recordIds);
  const entityResult = await client.from('corporate_entities').select('*');
  if (entityResult.error) {
    throw new Error(`Payroll entities could not be loaded: ${entityResult.error.message}`);
  }
  const entities = entityResult.data || [];
  const byId = new Map(rows.map((row: any) => [String(row.id), row]));
  const results: Array<{ ok: boolean; recordId: string; status?: string; message?: string; error?: string }> = [];

  for (const recordId of recordIds) {
    const row = byId.get(recordId);
    const employee = row ? employeeByEmail.get(normalize(row.employee_email)) : undefined;
    if (!row) {
      results.push({ ok: false, recordId, error: 'Payroll record was not found.' });
      continue;
    }
    if (String(row.status || '') !== 'Processed') {
      results.push({ ok: false, recordId, error: 'Only Processed payroll can be emailed.' });
      continue;
    }
    if (!employee?.email || !String(employee.email).includes('@')) {
      results.push({ ok: false, recordId, error: 'A valid employee email is required.' });
      continue;
    }

    try {
      const employeeEntity = entities.find((entity: any) => (
        normalize(entity.id) === normalize(employee.entity_id)
        || normalize(entity.name) === normalize(employee.entity_id)
        || normalize(entity.id) === normalize(row.entity_id)
        || normalize(entity.name) === normalize(row.entity_name)
      ));
      const pdf = await renderOfficialPayslipPdf(row, employee, employeeEntity);
      const emailResult = await sendEmailTemplate(
        'payslip_notification',
        employee.email,
        {
          name: employee.name,
          employee_name: employee.name,
          entity_name: employeeEntity?.name || row.entity_name || employee.entity_id,
          payslip_type: payrollTypeLabel(row),
          payroll_month: payrollMonthLabel(Number(row.payroll_month), Number(row.payroll_year)),
          payroll_year: String(row.payroll_year || ''),
          details: `${row.payroll_month}/${row.payroll_year} payslip attached.`,
        },
        createEmployeeAdminClient(),
        [{
          filename: attachmentName(employee.email, Number(row.payroll_month), Number(row.payroll_year)),
          content: pdf,
          contentType: 'application/pdf',
        }],
        {
          entityId: employeeEntity?.id || employee?.entity_id || row.entity_id,
          entityName: employeeEntity?.name,
        },
        client,
      );
      const message = emailResult.ok ? 'Payslip PDF sent by email.' : emailResult.failureReason;
      await updatePayrollRow(client, recordId, {
        payslip_sent_at: emailResult.ok ? new Date().toISOString() : null,
        payslip_sent_by: actor.username,
        payslip_email_status: emailResult.ok ? 'sent' : 'failed',
        payslip_email_error: emailResult.failureReason || null,
        updated_at: new Date().toISOString(),
      });
      results.push({
        ok: emailResult.ok,
        recordId,
        status: emailResult.ok ? 'sent' : 'failed',
        message: emailResult.ok ? message : undefined,
        error: emailResult.ok ? undefined : message,
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Payslip email failed.';
      await updatePayrollRow(client, recordId, {
        payslip_sent_by: actor.username,
        payslip_email_status: 'failed',
        payslip_email_error: message,
        updated_at: new Date().toISOString(),
      });
      results.push({ ok: false, recordId, status: 'failed', error: message });
    }
  }

  return { results };
};
