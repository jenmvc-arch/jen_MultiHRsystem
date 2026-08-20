import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminSessionActor } from './employeeAccountServer.js';
import { createMainAdminClient } from './employeeAccountServer.js';
import { canExportSensitive, hasExportPermission, EXPORT_PERMISSIONS } from '../../src/lib/exportPermissions.js';
import type { ExportColumn, ExportFilterSet, ExportFormat, ExportModule, ExportRequest } from '../../src/lib/exportTypes.js';

const MAX_ROWS = 5000;
const MAX_CELLS = 100000;

type Row = Record<string, any>;

const employeeColumns: ExportColumn[] = [
  { key: 'id', label: 'Employee ID' },
  { key: 'name', label: 'Employee Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'designation', label: 'Position' },
  { key: 'status', label: 'Employment Status' },
  { key: 'employment_type', label: 'Employment Type' },
  { key: 'date_of_joined', label: 'Join Date', type: 'date' },
  { key: 'date_of_confirmation', label: 'Confirmation Date', type: 'date' },
  { key: 'contact_number', label: 'Contact Number' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'nric_passport', label: 'NRIC / Passport', sensitive: true },
  { key: 'tax_number', label: 'Tax Number', sensitive: true },
  { key: 'epf_number', label: 'EPF Number', sensitive: true },
  { key: 'bank_name', label: 'Bank Name', sensitive: true },
  { key: 'account_no', label: 'Bank Account', sensitive: true },
  { key: 'basic_salary', label: 'Basic Salary', sensitive: true, type: 'currency' },
];

const payrollColumns: ExportColumn[] = [
  { key: 'employee_email', label: 'Employee Email' },
  { key: 'employee_name', label: 'Employee Name' },
  { key: 'department', label: 'Department' },
  { key: 'payroll_month', label: 'Payroll Month', type: 'number' },
  { key: 'payroll_year', label: 'Payroll Year', type: 'number' },
  { key: 'status', label: 'Payroll Status' },
  { key: 'basic_salary', label: 'Basic Salary', sensitive: true, type: 'currency' },
  { key: 'gross_salary', label: 'Gross Salary', sensitive: true, type: 'currency' },
  { key: 'epf_employee', label: 'EPF Employee', sensitive: true, type: 'currency' },
  { key: 'socso_employee', label: 'SOCSO Employee', sensitive: true, type: 'currency' },
  { key: 'eis_employee', label: 'EIS Employee', sensitive: true, type: 'currency' },
  { key: 'actual_pcb_deducted', label: 'PCB Deducted', sensitive: true, type: 'currency' },
  { key: 'net_pay', label: 'Net Pay', sensitive: true, type: 'currency' },
  { key: 'payment_date', label: 'Payment Date', type: 'date' },
  { key: 'created_at', label: 'Processed At', type: 'date' },
];

const performanceColumns: ExportColumn[] = [
  { key: 'employee_id', label: 'Employee ID' },
  { key: 'employee_name', label: 'Employee Name' },
  { key: 'department', label: 'Department' },
  { key: 'review_cycle_id', label: 'Review Cycle' },
  { key: 'review_status', label: 'Review Status' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'teamwork_score', label: 'Teamwork', type: 'number' },
  { key: 'communication_score', label: 'Communication', type: 'number' },
  { key: 'problem_solving_score', label: 'Problem Solving', type: 'number' },
  { key: 'self_evaluation', label: 'Self Evaluation', sensitive: true },
  { key: 'manager_comments', label: 'Manager Comments', sensitive: true },
];

const manifest = (module: ExportModule) => module === 'employees'
  ? { title: 'Employee Master List', columns: employeeColumns }
  : module === 'payroll' || module === 'payslips'
    ? { title: 'Payroll Report', columns: payrollColumns }
    : { title: 'Performance Report', columns: performanceColumns };

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();
export const safeFilename = (value: string, extension: string) => {
  const base = String(value || 'HRMS_Export')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9._-]+/gi, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 120) || 'HRMS_Export';
  return `${base}.${extension}`;
};

const stringify = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const csvEscape = (value: unknown) => {
  const text = stringify(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const selectedColumns = (module: ExportModule, requested: string[] | undefined, sensitiveAllowed: boolean) => {
  const available = manifest(module).columns;
  const requestedKeys = requested?.length ? requested : available.filter(column => !column.sensitive).map(column => column.key);
  const invalid = requestedKeys.filter(key => !available.some(column => column.key === key));
  if (invalid.length) throw Object.assign(new Error(`Unsupported export columns: ${invalid.join(', ')}`), { statusCode: 400 });
  const sensitive = available.filter(column => requestedKeys.includes(column.key) && column.sensitive);
  if (sensitive.length && !sensitiveAllowed) {
    throw Object.assign(new Error('One or more requested columns require sensitive export permission.'), { statusCode: 403 });
  }
  return available.filter(column => requestedKeys.includes(column.key));
};

const applyEmployeeFilters = (rows: Row[], filters: ExportFilterSet = {}) => rows.filter(row => {
  if (filters.department && filters.department !== 'All Departments' && row.department !== filters.department) return false;
  if (filters.status && filters.status !== 'All Statuses' && row.status !== filters.status) return false;
  if (filters.search) {
    const term = normalize(filters.search);
    if (![row.id, row.name, row.email, row.department].some(value => normalize(value).includes(term))) return false;
  }
  if (filters.employeeId && normalize(row.id) !== normalize(filters.employeeId) && normalize(row.email) !== normalize(filters.employeeId)) return false;
  return true;
});

const applyPayrollFilters = (rows: Row[], filters: ExportFilterSet = {}) => rows.filter(row => {
  if (filters.department && filters.department !== 'All Departments' && row.department !== filters.department) return false;
  if (filters.payrollMonth && Number(row.payroll_month) !== Number(filters.payrollMonth)) return false;
  if (filters.payrollYear && Number(row.payroll_year) !== Number(filters.payrollYear)) return false;
  if (filters.status && filters.status !== 'All Statuses' && row.status !== filters.status) return false;
  if (filters.employeeId && normalize(row.employee_email) !== normalize(filters.employeeId) && normalize(row.id) !== normalize(filters.employeeId)) return false;
  return true;
});

async function loadRows(actor: AdminSessionActor, request: ExportRequest, client: SupabaseClient) {
  const filters = request.filters || {};
  const isEmployee = normalize(actor.role) === 'employee';
  const employeeResult = await client.from('employees').select('*');
  if (employeeResult.error) throw new Error(employeeResult.error.message);
  let employees = (employeeResult.data || []) as Row[];
  if (isEmployee) employees = employees.filter(row => normalize(row.email) === normalize(actor.username));
  if (filters.entityId) employees = employees.filter(row => row.entity_id === filters.entityId);
  employees = applyEmployeeFilters(employees, filters);

  const selected = new Set((request.selectedRecordIds || []).map(normalize));
  if (
    request.module === 'employees'
    && (request.scope === 'selected' || request.scope === 'record')
  ) {
    employees = employees.filter(row => selected.has(normalize(row.id)) || selected.has(normalize(row.email)));
  }

  if (request.module === 'employees') return employees;

  if (request.module === 'payroll' || request.module === 'payslips') {
    const result = await client.from('payroll_records_2026').select('*');
    if (result.error) throw new Error(result.error.message);
    const employeeByEmail = new Map(employees.map(row => [normalize(row.email), row]));
    let rows: Row[] = (result.data || []).map((row: Row) => ({
      ...row,
      employee_name: employeeByEmail.get(normalize(row.employee_email))?.name || row.employee_email,
      department: employeeByEmail.get(normalize(row.employee_email))?.department || '',
    })).filter((row: Row) => employeeByEmail.has(normalize(row.employee_email)));
    rows = applyPayrollFilters(rows, filters);
    if (request.scope === 'selected' || request.scope === 'record') {
      rows = rows.filter(row => selected.has(normalize(row.id)) || selected.has(normalize(row.employee_email)));
    }
    return rows;
  }

  const result = await client.from('performances').select('*');
  if (result.error) throw new Error(result.error.message);
  const employeeById = new Map(employees.map(row => [normalize(row.id), row]));
  const employeeByEmail = new Map(employees.map(row => [normalize(row.email), row]));
  let rows: Row[] = (result.data || []).map((row: Row) => {
    const employee = employeeById.get(normalize(row.employee_id)) || employeeByEmail.get(normalize(row.employee_email));
    return { ...row, employee_name: employee?.name || '', department: employee?.department || '' };
  }).filter((row: Row) => row.employee_name);
  if (filters.department && filters.department !== 'All Departments') rows = rows.filter(row => row.department === filters.department);
  return rows;
}

const toMatrix = (rows: Row[], columns: ExportColumn[]) => rows.map(row => columns.map(column => row[column.key]));

async function renderPdf(title: string, rows: Row[], columns: ExportColumn[], actor: AdminSessionActor, filters?: ExportFilterSet) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842;
  const pageHeight = 595;
  const columnWidth = Math.max(55, Math.min(160, (pageWidth - 60) / Math.max(columns.length, 1)));
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 34;
  const drawHeader = () => {
    page.drawText(title, { x: 30, y, size: 16, font: bold, color: rgb(0.55, 0.08, 0.08) });
    y -= 20;
    page.drawText(`Generated by ${actor.name} on ${new Date().toISOString()}`, { x: 30, y, size: 7, font });
    y -= 18;
    page.drawText('CONFIDENTIAL', { x: pageWidth - 100, y: pageHeight - 34, size: 7, font: bold, color: rgb(0.55, 0.08, 0.08) });
    if (filters && Object.keys(filters).length) {
      page.drawText(`Filters: ${JSON.stringify(filters).slice(0, 150)}`, { x: 30, y, size: 7, font });
      y -= 15;
    }
  };
  drawHeader();
  const drawCell = (text: string, x: number, top: number, width: number, header = false) => {
    page.drawRectangle({ x, y: top - 14, width, height: 16, borderWidth: 0.3, borderColor: rgb(0.8, 0.8, 0.8), color: header ? rgb(0.94, 0.94, 0.94) : rgb(1, 1, 1) });
    page.drawText(text.slice(0, Math.max(8, Math.floor(width / 4))), { x: x + 3, y: top - 10, size: 6, font: header ? bold : font });
  };
  columns.forEach((column, index) => drawCell(column.label, 30 + index * columnWidth, y, columnWidth, true));
  y -= 16;
  for (const row of rows) {
    if (y < 35) { page = pdf.addPage([pageWidth, pageHeight]); y = pageHeight - 34; drawHeader(); columns.forEach((column, index) => drawCell(column.label, 30 + index * columnWidth, y, columnWidth, true)); y -= 16; }
    columns.forEach((column, index) => drawCell(stringify(row[column.key]), 30 + index * columnWidth, y, columnWidth));
    y -= 16;
  }
  return Buffer.from(await pdf.save());
}

function workbookBuffer(title: string, rows: Row[], columns: ExportColumn[]) {
  const sheet = XLSX.utils.aoa_to_sheet([columns.map(column => column.label), ...toMatrix(rows, columns)]);
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  sheet['!cols'] = columns.map(column => ({ wch: Math.min(32, Math.max(12, column.label.length + 2)) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, title.slice(0, 31));
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function executeExport(actor: AdminSessionActor, request: ExportRequest) {
  if (!['pdf', 'xlsx', 'csv', 'txt'].includes(request.format)) {
    throw Object.assign(new Error('Unsupported export format.'), { statusCode: 400 });
  }
  const permission = EXPORT_PERMISSIONS[request.module];
  if (!hasExportPermission(actor.role, permission)) throw Object.assign(new Error('You do not have permission to export this module.'), { statusCode: 403 });
  const sensitiveAllowed = canExportSensitive(actor.role, request.module);
  const columns = selectedColumns(request.module, request.columns, sensitiveAllowed);
  const client = createMainAdminClient();
  const rows = await loadRows(actor, request, client);
  if (!rows.length) throw Object.assign(new Error('No records are available for export.'), { statusCode: 404 });
  if (rows.length > MAX_ROWS || rows.length * columns.length > MAX_CELLS) {
    throw Object.assign(new Error(`This export is too large. Narrow the filters to ${MAX_ROWS} records or fewer.`), { statusCode: 413 });
  }

  let buffer: Buffer;
  let extension: string = request.format;
  if (request.format === 'csv') {
    buffer = Buffer.from([columns.map(column => csvEscape(column.label)).join(','), ...toMatrix(rows, columns).map(values => values.map(csvEscape).join(','))].join('\r\n'), 'utf8');
  } else if (request.format === 'txt') {
    const lines = [manifest(request.module).title, '', columns.map(column => column.label).join(' | '), ...toMatrix(rows, columns).map(values => values.map(stringify).join(' | '))];
    buffer = Buffer.from(lines.join('\n'), 'utf8');
  } else if (request.format === 'xlsx') {
    buffer = workbookBuffer(manifest(request.module).title, rows, columns);
    extension = 'xlsx';
  } else {
    buffer = await renderPdf(manifest(request.module).title, rows, columns, actor, request.includeFilters ? request.filters : undefined);
  }

  const base = request.filename || `${manifest(request.module).title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
  return { buffer, filename: safeFilename(base, extension), recordCount: rows.length, columns: columns.map(column => column.key) };
}

export async function executeBulkPayslipZip(actor: AdminSessionActor, request: ExportRequest) {
  const result = await executeExport(actor, { ...request, module: 'payroll', format: 'pdf' });
  const zip = new JSZip();
  zip.file(result.filename, result.buffer);
  return { buffer: Buffer.from(await zip.generateAsync({ type: 'nodebuffer' })), filename: safeFilename(request.filename || 'Payslips_Bulk', 'zip'), recordCount: result.recordCount, columns: result.columns };
}

export async function writeExportAudit(actor: AdminSessionActor, request: ExportRequest, result: { recordCount: number; columns: string[] }, status: 'success' | 'failed', errorMessage?: string) {
  try {
    await createMainAdminClient().from('export_audit_logs').insert({
      user_id: actor.username,
      user_name: actor.name,
      role: actor.role,
      module: request.module,
      format: request.format,
      scope: request.scope,
      record_count: result.recordCount,
      selected_fields: result.columns,
      filters: request.filters || {},
      status,
      error_message: errorMessage || null,
      ip_address: null,
    });
  } catch (error) {
    console.warn('[Export Audit] Could not persist audit record:', error);
  }
}
