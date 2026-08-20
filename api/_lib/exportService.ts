import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminSessionActor } from './employeeAccountServer.js';
import { createMainAdminClient } from './employeeAccountServer.js';
import { canExportSensitive, hasExportPermission, EXPORT_PERMISSIONS } from '../../src/lib/exportPermissions.js';
import { PAYROLL_FILE_EXPORT_COLUMNS } from '../../src/lib/exportTypes.js';
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
    ? { title: 'Payroll File', columns: PAYROLL_FILE_EXPORT_COLUMNS }
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

const numericValue = (value: unknown) => Number(value || 0);

const sumFields = (row: Row, fields: string[]) =>
  fields.reduce((total, field) => total + numericValue(row[field]), 0);

export const buildPayrollFileExportRow = (row: Row, employee: Row | undefined, serialNo: number): Row => {
  const allowances = row.allowances !== undefined
    ? numericValue(row.allowances)
    : sumFields(row, [
      'allowance_general',
      'allowance_transport',
      'allowance_parking',
      'allowance_meal',
      'allowance_accommodation',
      'allowance_phone',
    ]);
  const isGrossPayV2 = row.calculation_version === 'gross_pay_v2';
  const grossPay = row.gross_pay ?? row.gross_salary ?? (isGrossPayV2
    ? Math.max(0, numericValue(row.basic_salary) + allowances + numericValue(row.commission_amount) - numericValue(row.unpaid_leave) - numericValue(row.incomplete_month_deduction ?? row.proration_deduction))
    : sumFields(row, [
      'basic_salary',
      'allowance_general',
      'allowance_transport',
      'allowance_parking',
      'allowance_meal',
      'allowance_accommodation',
      'allowance_phone',
      'overtime',
      'bonus_amount',
      'commission_amount',
      'back_pay_amount',
      'aws_amount',
      'compensation_amount',
    ]));
  const totalDeduction = row.total_deduction ?? sumFields(row, [
    'actual_pcb_deducted',
    'epf_employee',
    'socso_employee',
    'lindung24_employee',
    'eis_employee',
    'deduction_in_lieu',
    'deduction_cp38',
    'deduction_others',
  ]) + (isGrossPayV2 ? 0 : numericValue(row.unpaid_leave));
  const paymentDescription = row.payment_description
    || row.payout_description
    || row.payout_title
    || row.document_type
    || 'Payroll';

  return {
    ...row,
    serial_no: serialNo,
    employee_name: employee?.name || row.employee_name || row.employee_email || '',
    entity_name: employee?.entity_id || row.entity_name || row.entity_id || '',
    employment_type: employee?.employment_type || row.employment_type || '',
    payment_mode: employee?.payment_mode || employee?.payment_method || row.payment_mode || row.payment_method || 'Bank Transfer',
    nric_passport: employee?.nric_passport || employee?.nricPassport || row.nric_passport || '',
    bank_name: employee?.bank_name || employee?.bankName || row.bank_name || '',
    account_no: employee?.account_no || employee?.accountNo || row.account_no || '',
    basic_salary: numericValue(row.basic_salary),
    commission_amount: numericValue(row.commission_amount),
    allowances,
    unpaid_leave: numericValue(row.unpaid_leave),
    incomplete_month_deduction: numericValue(row.incomplete_month_deduction ?? row.proration_deduction),
    gross_pay: numericValue(grossPay),
    epf_employee: numericValue(row.epf_employee),
    socso_employee: numericValue(row.socso_employee),
    skbbk_employee: numericValue(row.skbbk_employee ?? employee?.skbbk_employee),
    eis_employee: numericValue(row.eis_employee),
    actual_pcb_deducted: numericValue(row.actual_pcb_deducted),
    total_deduction: numericValue(totalDeduction),
    net_pay: numericValue(row.net_pay),
    epf_employer: numericValue(row.epf_employer),
    socso_employer: numericValue(row.socso_employer),
    eis_employer: numericValue(row.eis_employer),
    payment_description: paymentDescription,
  };
};

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
      entity_name: employeeByEmail.get(normalize(row.employee_email))?.entity_id || '',
    })).filter((row: Row) => employeeByEmail.has(normalize(row.employee_email)));
    rows = applyPayrollFilters(rows, filters);
    if (request.scope === 'selected' || request.scope === 'record') {
      rows = rows.filter(row => selected.has(normalize(row.id)) || selected.has(normalize(row.employee_email)));
    }
    return rows.map((row, index) => buildPayrollFileExportRow(
      row,
      employeeByEmail.get(normalize(row.employee_email)),
      index + 1,
    ));
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

const payrollHeaderGroups: Record<string, string> = {
  basic_salary: 'EARNINGS',
  commission_amount: 'EARNINGS',
  allowances: 'EARNINGS',
  unpaid_leave: 'DEDUCTIONS',
  incomplete_month_deduction: 'DEDUCTIONS',
  epf_employee: "EMPLOYEE'S CONTRIBUTION",
  socso_employee: "EMPLOYEE'S CONTRIBUTION",
  skbbk_employee: "EMPLOYEE'S CONTRIBUTION",
  eis_employee: "EMPLOYEE'S CONTRIBUTION",
  actual_pcb_deducted: "EMPLOYEE'S CONTRIBUTION",
  epf_employer: 'EMPLOYER CONTRIBUTIONS',
  socso_employer: 'EMPLOYER CONTRIBUTIONS',
  eis_employer: 'EMPLOYER CONTRIBUTIONS',
};

const payrollMonthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const formatPayrollPeriod = (month: unknown, year: unknown) => {
  const monthNumber = Number(month);
  const monthName = payrollMonthNames[monthNumber - 1] || 'Payroll';
  return `${monthName} ${year || ''}`.trim();
};

const columnLetter = (index: number) => {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
};

const payrollCellStyle = (column: ExportColumn, group = false) => ({
  font: {
    name: 'Century Gothic',
    sz: group ? 12 : 10,
    bold: true,
    italic: !group,
  },
  alignment: {
    horizontal: 'center',
    vertical: 'center',
    wrap_text: true,
  },
  border: {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  },
  numFmt: column.type === 'currency' ? '[$RM]#,##0.00' : column.type === 'number' ? '0' : '@',
});

const stylePayrollTemplateSheet = (sheet: XLSX.WorkSheet, columns: ExportColumn[], dataRowCount: number) => {
  const lastColumn = columnLetter(columns.length - 1);
  const lastRow = 7 + dataRowCount;
  sheet['!freeze'] = { xSplit: 0, ySplit: 7 };
  sheet['!cols'] = columns.map(column => {
    const widths: Record<string, number> = {
      serial_no: 8,
      employee_name: 24,
      employment_type: 18,
      payment_mode: 16,
      nric_passport: 20,
      bank_name: 20,
      account_no: 21,
      payment_description: 28,
    };
    return { wch: widths[column.key] || 16 };
  });
  sheet['!rows'] = [
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 8 },
    { hpt: 8 },
    { hpt: 34 },
    { hpt: 42 },
  ];
  sheet['!autofilter'] = { ref: `A7:${lastColumn}${lastRow}` };

  columns.forEach((column, index) => {
    const letter = columnLetter(index);
    const group = payrollHeaderGroups[column.key];
    const topCell = sheet[`${letter}6`];
    const bottomCell = sheet[`${letter}7`];
    if (topCell) topCell.s = payrollCellStyle(column, Boolean(group));
    if (bottomCell) bottomCell.s = payrollCellStyle(column);
    for (let row = 8; row <= lastRow; row += 1) {
      const dataCell = sheet[`${letter}${row}`];
      if (!dataCell) continue;
      dataCell.s = { font: { name: 'Century Gothic', sz: 10 } };
      if (column.type === 'currency') dataCell.z = '[$RM]#,##0.00';
      if (column.type === 'number') dataCell.z = '0';
      if (column.key === 'nric_passport' || column.key === 'account_no') dataCell.z = '@';
    }
  });
};

const payrollWorkbookBuffer = (title: string, rows: Row[], columns: ExportColumn[]) => {
  const period = rows[0]?.payroll_month && rows[0]?.payroll_year
    ? formatPayrollPeriod(rows[0].payroll_month, rows[0].payroll_year)
    : '';
  const companyNames = [...new Set(rows.map(row => String(row.entity_name || '').trim()).filter(Boolean))];
  const companyName = companyNames.length === 1 ? companyNames[0] : companyNames.length > 1 ? 'Multiple Entities' : '';
  const values = [
    [null, 'Company Name:', companyName],
    [null, 'Description', 'Payroll File'],
    [null, 'Date', period],
    [],
    [],
    columns.map(column => payrollHeaderGroups[column.key] || column.label),
    columns.map(column => payrollHeaderGroups[column.key] ? column.label : null),
    ...toMatrix(rows, columns),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(values);
  const merges: any[] = [];
  let groupStart = 0;
  while (groupStart < columns.length) {
    const group = payrollHeaderGroups[columns[groupStart].key];
    if (!group) {
      merges.push({ s: { r: 5, c: groupStart }, e: { r: 6, c: groupStart } });
      groupStart += 1;
      continue;
    }
    let groupEnd = groupStart;
    while (groupEnd + 1 < columns.length && payrollHeaderGroups[columns[groupEnd + 1].key] === group) groupEnd += 1;
    merges.push({ s: { r: 5, c: groupStart }, e: { r: 5, c: groupEnd } });
    groupStart = groupEnd + 1;
  }
  columns.forEach((column, index) => {
    if (payrollHeaderGroups[column.key]) return;
    sheet[`${columnLetter(index)}6`].v = column.label;
  });
  sheet['!merges'] = merges;
  stylePayrollTemplateSheet(sheet, columns, rows.length);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, title.slice(0, 31));
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx', cellStyles: true }) as Buffer;
};

export const workbookBuffer = (
  title: string,
  rows: Row[],
  columns: ExportColumn[],
  module: ExportModule = 'employees',
) => {
  if (module === 'payroll' || module === 'payslips') return payrollWorkbookBuffer(title, rows, columns);
  const sheet = XLSX.utils.aoa_to_sheet([columns.map(column => column.label), ...toMatrix(rows, columns)]);
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  sheet['!cols'] = columns.map(column => ({ wch: Math.min(32, Math.max(12, column.label.length + 2)) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, title.slice(0, 31));
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

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
    const sheetTitle = request.module === 'payroll' || request.module === 'payslips'
      ? formatPayrollPeriod(rows[0]?.payroll_month, rows[0]?.payroll_year)
      : manifest(request.module).title;
    buffer = workbookBuffer(sheetTitle, rows, columns, request.module);
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
