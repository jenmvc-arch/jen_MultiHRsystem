import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminSessionActor } from './employeeAccountServer.js';
import { createMainAdminClient } from './employeeAccountServer.js';
import { canExportSensitive, hasExportPermission, EXPORT_PERMISSIONS } from '../../src/lib/exportPermissions.js';
import { PAYROLL_FILE_EXPORT_COLUMNS, PAYROLL_XLSX_TEMPLATE_COLUMNS } from '../../src/lib/exportTypes.js';
import type { ExportColumn, ExportFilterSet, ExportFormat, ExportModule, ExportRequest } from '../../src/lib/exportTypes.js';

const MAX_ROWS = 5000;
const MAX_CELLS = 100000;

type Row = Record<string, any>;

const EMPLOYEE_EXPORT_DB_COLUMNS = [
  'id',
  'entity_id',
  'entity_name',
  'name',
  'email',
  'department',
  'designation',
  'status',
  'employment_type',
  'date_of_joined',
  'date_of_confirmation',
  'contact_number',
  'nationality',
  'nric_passport',
  'tax_number',
  'epf_number',
  'bank_name',
  'account_no',
  'basic_salary',
  'skbbk_employee',
  'lindung24_employee',
  'payment_mode',
  'payment_method',
].join(',');

const PAYROLL_EXPORT_DB_COLUMNS = [
  'id',
  'employee_email',
  'payroll_month',
  'payroll_year',
  'basic_salary',
  'allowance_general',
  'allowance_transport',
  'allowance_parking',
  'allowance_meal',
  'allowance_accommodation',
  'allowance_phone',
  'overtime',
  'bonus_amount',
  'bonus_desc',
  'commission_amount',
  'commission_desc',
  'back_pay_amount',
  'back_pay_desc',
  'aws_amount',
  'aws_desc',
  'compensation_amount',
  'compensation_desc',
  'reimbursement_amount',
  'reimbursement_desc',
  'unpaid_leave',
  'incomplete_month_deduction',
  'proration_deduction',
  'gross_pay',
  'gross_salary',
  'total_allowance',
  'deduction_in_lieu',
  'deduction_cp38',
  'deduction_others',
  'deduction_others_desc',
  'actual_pcb_deducted',
  'tax_pcb',
  'epf_employee',
  'epf_employer',
  'socso_employee',
  'socso_employer',
  'lindung24_employee',
  'skbbk_employee',
  'eis_employee',
  'eis_employer',
  'hrd_corp',
  'net_pay',
  'net_salary',
  'payment_date',
  'payslip_descriptions',
  'payout_kind',
  'is_separate_payout',
  'statutory_treatment',
  'payout_title',
  'payout_description',
  'line_notes',
  'document_type',
  'compensation_label',
  'display_settings_snapshot',
  'calculation_version',
  'status',
  'created_at',
  'updated_at',
].join(',');

const PERFORMANCE_EXPORT_DB_COLUMNS = [
  'id',
  'employee_id',
  'employee_email',
  'review_cycle_id',
  'manager_name',
  'review_status',
  'rating',
  'teamwork_score',
  'communication_score',
  'problem_solving_score',
  'self_evaluation',
  'manager_comments',
  'goals',
  'created_at',
  'updated_at',
].join(',');

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

const entityValues = (row: Row) => [
  row.entity_id,
  row.entity_name,
  row.entityId,
  row.entityName,
].map(normalize).filter(Boolean);

export const matchesExportEntity = (row: Row, entityId: unknown, aliases: unknown[] = []) => {
  const target = normalize(entityId);
  if (!target) return true;
  const targets = new Set([target, ...aliases.map(normalize).filter(Boolean)]);
  return entityValues(row).some(value => targets.has(value));
};

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

const preferPopulatedNumericValue = (primary: unknown, fallback: unknown) => {
  if (primary !== undefined && primary !== null && numericValue(primary) !== 0) return numericValue(primary);
  if (fallback !== undefined && fallback !== null && numericValue(fallback) !== 0) return numericValue(fallback);
  return numericValue(primary ?? fallback);
};

export const buildPayrollFileExportRow = (row: Row, employee: Row | undefined, serialNo: number): Row => {
  const allowanceFields = [
    'allowance_general',
    'allowance_transport',
    'allowance_parking',
    'allowance_meal',
    'allowance_accommodation',
    'allowance_phone',
  ];
  const hasDetailedAllowanceFields = allowanceFields.some(field => row[field] !== undefined && row[field] !== null);
  const allowances = row.allowances !== undefined
    ? numericValue(row.allowances)
    : hasDetailedAllowanceFields
      ? sumFields(row, allowanceFields)
      : numericValue(row.total_allowance ?? row.totalAllowance);
  const isGrossPayV2 = row.calculation_version === 'gross_pay_v2';
  const hasPersistedGrossPay = row.gross_pay !== undefined && row.gross_pay !== null;
  const hasLegacyPersistedGrossSalary = row.gross_salary !== undefined
    && row.gross_salary !== null
    && (numericValue(row.gross_salary) !== 0 || isGrossPayV2);
  const calculatedLegacyGross = sumFields(row, [
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
  ]);
  const grossPay = hasPersistedGrossPay
    ? numericValue(row.gross_pay)
    : hasLegacyPersistedGrossSalary
      ? numericValue(row.gross_salary)
      : (isGrossPayV2
    ? Math.max(0, numericValue(row.basic_salary) + allowances + numericValue(row.commission_amount) - numericValue(row.unpaid_leave) - numericValue(row.incomplete_month_deduction ?? row.proration_deduction))
    : calculatedLegacyGross);
  const persistedNetPay = row.net_pay ?? row.net_salary;
  const actualPcbDeducted = preferPopulatedNumericValue(row.actual_pcb_deducted, row.tax_pcb);
  const skbbkEmployee = row.skbbk_employee !== undefined && row.skbbk_employee !== null
    ? preferPopulatedNumericValue(row.skbbk_employee, row.lindung24_employee)
    : numericValue(row.lindung24_employee ?? employee?.skbbk_employee ?? employee?.lindung24_employee);
  const totalDeduction = row.total_deduction ?? (persistedNetPay !== undefined && persistedNetPay !== null
    ? Math.max(0, grossPay + numericValue(row.reimbursement_amount) - numericValue(persistedNetPay))
    : actualPcbDeducted
      + numericValue(row.epf_employee)
      + numericValue(row.socso_employee)
      + skbbkEmployee
      + numericValue(row.eis_employee)
      + numericValue(row.deduction_in_lieu)
      + numericValue(row.deduction_cp38)
      + numericValue(row.deduction_others)
      + (isGrossPayV2 ? 0 : numericValue(row.unpaid_leave)));
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
    skbbk_employee: skbbkEmployee,
    eis_employee: numericValue(row.eis_employee),
    actual_pcb_deducted: actualPcbDeducted,
    total_deduction: numericValue(totalDeduction),
    net_pay: numericValue(persistedNetPay),
    epf_employer: numericValue(row.epf_employer),
    socso_employer: numericValue(row.socso_employer),
    eis_employer: numericValue(row.eis_employer),
    payment_description: paymentDescription,
    total_cost_pax: numericValue(grossPay)
      + numericValue(row.epf_employer)
      + numericValue(row.socso_employer)
      + numericValue(row.eis_employer),
  };
};

async function loadRows(actor: AdminSessionActor, request: ExportRequest, client: SupabaseClient) {
  const filters = request.filters || {};
  const isEmployee = normalize(actor.role) === 'employee';
  let employeeQuery = client.from('employees').select(EMPLOYEE_EXPORT_DB_COLUMNS);
  if (filters.department && filters.department !== 'All Departments') {
    employeeQuery = employeeQuery.eq('department', filters.department);
  }
  if (filters.status && filters.status !== 'All Statuses') {
    employeeQuery = employeeQuery.eq('status', filters.status);
  }
  if (filters.employeeId) {
    employeeQuery = employeeQuery.or(
      `id.eq.${String(filters.employeeId).replace(/[(),]/g, '')},email.ilike.${String(filters.employeeId).replace(/[(),]/g, '')}`
    );
  }
  const employeeResult = await employeeQuery;
  if (employeeResult.error) throw new Error(employeeResult.error.message);
  let employees = (employeeResult.data || []) as Row[];
  if (isEmployee) employees = employees.filter(row => normalize(row.email) === normalize(actor.username));
  let entityAliases: string[] = [];
  if (filters.entityId) {
    const entityResult = await client.from('corporate_entities').select('id,name');
    if (!entityResult.error) {
      const requestedEntity = normalize(filters.entityId);
      const matchedEntity = (entityResult.data || []).find((entity: Row) => (
          normalize(entity.id) === requestedEntity || normalize(entity.name) === requestedEntity
      ));
      if (matchedEntity) {
        entityAliases = [matchedEntity.id, matchedEntity.name].filter(Boolean);
      }
    }
    employees = employees.filter(row => matchesExportEntity(row, filters.entityId, entityAliases));
  }
  if (filters.entityId && entityAliases.length === 0) {
    throw Object.assign(new Error('The selected company entity could not be found.'), { statusCode: 404 });
  }
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
    let payrollQuery = client.from('payroll_records_2026').select(PAYROLL_EXPORT_DB_COLUMNS);
    if (filters.payrollMonth) payrollQuery = payrollQuery.eq('payroll_month', filters.payrollMonth);
    if (filters.payrollYear) payrollQuery = payrollQuery.eq('payroll_year', filters.payrollYear);
    if (filters.status && filters.status !== 'All Statuses') payrollQuery = payrollQuery.eq('status', filters.status);
    const employeeEmails = employees.map(row => normalize(row.email)).filter(Boolean);
    if (employeeEmails.length === 0) return [];
    payrollQuery = payrollQuery.in('employee_email', employeeEmails);
    const result = await payrollQuery;
    if (result.error) throw new Error(result.error.message);
    const employeeByEmail = new Map(employees.map(row => [normalize(row.email), row]));
    let rows: Row[] = (result.data || []).map((row: Row) => ({
      ...row,
      employee_name: employeeByEmail.get(normalize(row.employee_email))?.name || row.employee_email,
      department: employeeByEmail.get(normalize(row.employee_email))?.department || '',
      entity_name: employeeByEmail.get(normalize(row.employee_email))?.entity_id
        || employeeByEmail.get(normalize(row.employee_email))?.entity_name
        || row.entity_name
        || row.entity_id
        || '',
    })).filter((row: Row) => (
      employeeByEmail.has(normalize(row.employee_email))
      && ['processed', 'published'].includes(normalize(row.status))
    ));
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

  const performanceEmployeeIds = employees.map(row => String(row.id)).filter(Boolean);
  const performanceEmployeeEmails = employees.map(row => String(row.email || '').trim()).filter(Boolean);
  if (performanceEmployeeIds.length === 0 && performanceEmployeeEmails.length === 0) return [];
  const [byId, byEmail] = await Promise.all([
    performanceEmployeeIds.length > 0
      ? client.from('performances').select(PERFORMANCE_EXPORT_DB_COLUMNS).in('employee_id', performanceEmployeeIds)
      : Promise.resolve({ data: [], error: null }),
    performanceEmployeeEmails.length > 0
      ? client.from('performances').select(PERFORMANCE_EXPORT_DB_COLUMNS).in('employee_email', performanceEmployeeEmails)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (byId.error) throw new Error(byId.error.message);
  if (byEmail.error) throw new Error(byEmail.error.message);
  const performanceRows = [...(byId.data || []), ...(byEmail.data || [])]
    .filter((row: Row, index: number, all: Row[]) => all.findIndex(item => String(item.id) === String(row.id)) === index);
  const employeeById = new Map(employees.map(row => [normalize(row.id), row]));
  const employeeByEmail = new Map(employees.map(row => [normalize(row.email), row]));
  let rows: Row[] = performanceRows.map((row: Row) => {
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

const payrollPdfGroups = [
  ['serial_no', 'employee_name', 'employment_type'],
  ['payment_mode', 'nric_passport', 'bank_name'],
  ['account_no', 'basic_salary', 'commission_amount', 'allowances', 'unpaid_leave'],
  ['incomplete_month_deduction', 'gross_pay', 'epf_employee', 'socso_employee'],
  ['skbbk_employee', 'eis_employee', 'actual_pcb_deducted', 'total_deduction', 'net_pay'],
  ['epf_employer', 'socso_employer', 'eis_employer', 'payment_description'],
  ['total_cost_pax'],
] as const;

const payrollPdfColumnWidths: Record<string, number> = {
  serial_no: 26,
  employee_name: 260,
  employment_type: 143,
  payment_mode: 90,
  nric_passport: 122,
  bank_name: 183,
  account_no: 129,
  basic_salary: 76,
  commission_amount: 72,
  allowances: 70,
  unpaid_leave: 79,
  incomplete_month_deduction: 170,
  gross_pay: 76,
  epf_employee: 81,
  socso_employee: 104,
  skbbk_employee: 159,
  eis_employee: 78,
  actual_pcb_deducted: 86,
  total_deduction: 93,
  net_pay: 76,
  epf_employer: 78,
  socso_employer: 100,
  eis_employer: 74,
  payment_description: 146,
  total_cost_pax: 99,
};

const payrollPdfColors: Record<string, ReturnType<typeof rgb>> = {
  header: rgb(0.757, 0.898, 0.961),
  identity: rgb(0.867, 0.922, 0.969),
  earnings: rgb(0.918, 0.949, 0.973),
  employeeContribution: rgb(0.988, 0.894, 0.839),
  netPay: rgb(0.776, 0.878, 0.706),
  employerContribution: rgb(0.851, 0.851, 0.851),
  white: rgb(1, 1, 1),
};

const payrollPdfBand = (key: string) => {
  if (['serial_no', 'employee_name', 'employment_type', 'payment_mode', 'nric_passport', 'bank_name', 'account_no'].includes(key)) return 'identity';
  if (['basic_salary', 'commission_amount', 'allowances', 'unpaid_leave', 'incomplete_month_deduction', 'gross_pay'].includes(key)) return 'earnings';
  if (['epf_employee', 'socso_employee', 'skbbk_employee', 'eis_employee', 'actual_pcb_deducted', 'total_deduction'].includes(key)) return 'employeeContribution';
  if (key === 'net_pay') return 'netPay';
  if (['epf_employer', 'socso_employer', 'eis_employer'].includes(key)) return 'employerContribution';
  return 'white';
};

const payrollPdfHeaderColor = (key: string) => {
  const band = payrollPdfBand(key);
  return band === 'identity' || band === 'earnings' ? payrollPdfColors.header : payrollPdfColors[band];
};

const payrollPdfCurrency = (value: unknown) => {
  const number = numericValue(value);
  return number === 0 ? '-' : number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const payrollPdfText = (value: unknown) => String(value ?? '');

const payrollPdfDrawTextFit = (
  page: any,
  text: string,
  x: number,
  y: number,
  width: number,
  font: any,
  options: { size: number; minSize?: number; align?: 'left' | 'center' | 'right'; color?: ReturnType<typeof rgb> },
) => {
  const minSize = options.minSize || 4.5;
  let size = options.size;
  while (size > minSize && font.widthOfTextAtSize(text, size) > width) size -= 0.25;
  const textWidth = font.widthOfTextAtSize(text, size);
  const align = options.align || 'center';
  const textX = align === 'left' ? x : align === 'right' ? x + width - textWidth : x + (width - textWidth) / 2;
  page.drawText(text, {
    x: textX,
    y,
    size,
    font,
    color: options.color || rgb(0, 0, 0),
  });
};

const payrollPdfDrawCell = (
  page: any,
  key: string,
  value: unknown,
  x: number,
  top: number,
  width: number,
  height: number,
  font: any,
  bold: any,
  header = false,
) => {
  const band = payrollPdfBand(key);
  page.drawRectangle({
    x,
    y: top - height,
    width,
    height,
    borderWidth: 0.35,
    borderColor: rgb(0, 0, 0),
    color: header ? payrollPdfHeaderColor(key) : payrollPdfColors[band],
  });
  const text = payrollPdfText(value);
  if (!header && ['basic_salary', 'commission_amount', 'allowances', 'unpaid_leave', 'incomplete_month_deduction', 'gross_pay', 'epf_employee', 'socso_employee', 'skbbk_employee', 'eis_employee', 'actual_pcb_deducted', 'total_deduction', 'net_pay', 'epf_employer', 'socso_employer', 'eis_employer', 'total_cost_pax'].includes(key)) {
    if (value === '' || value === null || value === undefined) return;
    payrollPdfDrawTextFit(page, 'RM', x + 3, top - height + 5, 18, font, { size: 6.4, minSize: 5.2, align: 'left' });
    payrollPdfDrawTextFit(page, payrollPdfCurrency(value), x + 20, top - height + 5, width - 23, font, { size: 7.5, minSize: 4.5, align: 'right' });
    return;
  }
  payrollPdfDrawTextFit(page, payrollPdfText(text), x + 2, top - height + (height - 7) / 2, width - 4, header ? bold : font, {
    size: header ? 7.3 : 7.2,
    minSize: header ? 4.5 : 4.4,
    align: key === 'serial_no' ? 'center' : 'center',
  });
};

const payrollPdfSummaryRows = [
  ['NETT PAY TO EMPLOYEE', 'net_pay'],
  ['EPF (EMPLOYEE + EMPLOYER)', 'epf_total'],
  ['SOCSO  (EMPLOYEE + EMPLOYER)', 'socso_total'],
  ['LINDUNG 24 Jam', 'lindung_total'],
  ['EIS  (EMPLOYEE + EMPLOYER)', 'eis_total'],
  ['GRAND TOTAL COST', 'grand_cost'],
  ['GRAND TOTAL OF STATUTORIES', 'grand_statutories'],
] as const;

const payrollPdfSummaryValue = (rows: Row[], key: typeof payrollPdfSummaryRows[number][1]) => {
  if (key === 'net_pay') return rows.reduce((sum, row) => sum + numericValue(row.net_pay), 0);
  if (key === 'epf_total') return rows.reduce((sum, row) => sum + numericValue(row.epf_employee) + numericValue(row.epf_employer), 0);
  if (key === 'socso_total') return rows.reduce((sum, row) => sum + numericValue(row.socso_employee) + numericValue(row.socso_employer), 0);
  if (key === 'lindung_total') return rows.reduce((sum, row) => sum + numericValue(row.skbbk_employee), 0);
  if (key === 'eis_total') return rows.reduce((sum, row) => sum + numericValue(row.eis_employee) + numericValue(row.eis_employer), 0);
  if (key === 'grand_cost') return rows.reduce((sum, row) => sum + numericValue(row.total_cost_pax), 0);
  return payrollPdfSummaryValue(rows, 'epf_total')
    + payrollPdfSummaryValue(rows, 'socso_total')
    + payrollPdfSummaryValue(rows, 'lindung_total')
    + payrollPdfSummaryValue(rows, 'eis_total');
};

export async function renderPayrollPdf(
  title: string,
  rows: Row[],
  sensitiveAllowed = true,
) {
  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const italicBoldFont = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const pageMargin = 42;
  const dataHeaderHeight = 27;
  const dataRowHeight = 18;
  const visibleRows = redactSensitivePayrollRows(rows, PAYROLL_XLSX_TEMPLATE_COLUMNS, sensitiveAllowed);
  const companyNames = [...new Set(rows.map(row => String(row.entity_name || '').trim()).filter(Boolean))];
  const companyName = companyNames.length === 1 ? companyNames[0] : companyNames.length > 1 ? 'Multiple Entities' : '';
  const dataGroups = payrollPdfGroups.map(group => group.map(key => PAYROLL_XLSX_TEMPLATE_COLUMNS.find(column => column.key === key)!));
  const drawPayrollTable = (page: any, group: ExportColumn[], x: number, top: number) => {
    let currentX = x;
    group.forEach(column => {
      const width = payrollPdfColumnWidths[column.key];
      payrollPdfDrawCell(page, column.key, column.label, currentX, top, width, dataHeaderHeight, regularFont, boldFont, true);
      currentX += width;
    });
    let currentTop = top - dataHeaderHeight;
    visibleRows.forEach(row => {
      let rowX = x;
      group.forEach(column => {
        payrollPdfDrawCell(page, column.key, row[column.key], rowX, currentTop, payrollPdfColumnWidths[column.key], dataRowHeight, regularFont, boldFont);
        rowX += payrollPdfColumnWidths[column.key];
      });
      currentTop -= dataRowHeight;
    });
    return top - dataHeaderHeight - visibleRows.length * dataRowHeight;
  };
  const firstGroupWidth = payrollPdfGroups[0].reduce((sum, key) => sum + payrollPdfColumnWidths[key], 0);
  const firstTableX = (pageWidth - firstGroupWidth) / 2;
  const firstTableTop = pageHeight - 145;

  dataGroups.forEach((group, index) => {
    const page = pdf.addPage([pageWidth, pageHeight]);
    const groupWidth = group.reduce((sum, column) => sum + payrollPdfColumnWidths[column.key], 0);
    const x = (pageWidth - groupWidth) / 2;
    const tableTop = index === 0 ? firstTableTop : (pageHeight + dataHeaderHeight + visibleRows.length * dataRowHeight) / 2;
    if (index === 0) {
      const titleX = Math.max(pageMargin, firstTableX - 5);
      payrollPdfDrawTextFit(page, companyName, titleX, pageHeight - 71, firstGroupWidth + 10, italicBoldFont, {
        size: 16,
        minSize: 11,
        align: 'left',
      });
      payrollPdfDrawTextFit(page, title, titleX, pageHeight - 94, firstGroupWidth + 10, italicBoldFont, {
        size: 11,
        minSize: 8,
        align: 'left',
      });
    }
    const tableBottom = drawPayrollTable(page, group, index === 0 ? firstTableX : x, tableTop);

    if (index !== 0) return;

    const summaryWidth = 403;
    const summaryX = (pageWidth - summaryWidth) / 2;
    const summaryLabelWidth = 294;
    const summaryValueWidth = summaryWidth - summaryLabelWidth;
    const summaryHeaderHeight = 27;
    const summaryRowHeight = 25;
    let summaryTop = tableBottom - 27;
    page.drawRectangle({
      x: summaryX,
      y: summaryTop - summaryHeaderHeight,
      width: summaryWidth,
      height: summaryHeaderHeight,
      borderWidth: 0.9,
      borderColor: rgb(0, 0, 0),
      color: payrollPdfColors.white,
    });
    payrollPdfDrawTextFit(page, 'TOTAL', summaryX, summaryTop - summaryHeaderHeight + 9, summaryWidth, boldFont, {
      size: 10,
      minSize: 7,
      align: 'center',
    });
    summaryTop -= summaryHeaderHeight;
    payrollPdfSummaryRows.forEach(([label, key], rowIndex) => {
      const isGrand = rowIndex >= 5;
      page.drawRectangle({
        x: summaryX,
        y: summaryTop - summaryRowHeight,
        width: summaryLabelWidth,
        height: summaryRowHeight,
        borderWidth: isGrand ? 0.8 : 0.35,
        borderColor: rgb(0, 0, 0),
        color: payrollPdfColors.white,
      });
      page.drawRectangle({
        x: summaryX + summaryLabelWidth,
        y: summaryTop - summaryRowHeight,
        width: summaryValueWidth,
        height: summaryRowHeight,
        borderWidth: isGrand ? 0.8 : 0.35,
        borderColor: rgb(0, 0, 0),
        color: payrollPdfColors.white,
      });
      payrollPdfDrawTextFit(page, label, summaryX + 2, summaryTop - summaryRowHeight + 8, summaryLabelWidth - 4, isGrand ? boldFont : regularFont, {
        size: 9.2,
        minSize: 6,
        align: 'left',
      });
      if (sensitiveAllowed) {
        payrollPdfDrawTextFit(page, 'RM', summaryX + summaryLabelWidth + 4, summaryTop - summaryRowHeight + 8, 20, isGrand ? boldFont : regularFont, {
          size: 8,
          minSize: 6,
          align: 'left',
        });
        payrollPdfDrawTextFit(page, payrollPdfCurrency(payrollPdfSummaryValue(visibleRows, key)), summaryX + summaryLabelWidth + 24, summaryTop - summaryRowHeight + 8, summaryValueWidth - 28, isGrand ? boldFont : regularFont, {
          size: 9,
          minSize: 6,
          align: 'right',
        });
      }
      summaryTop -= summaryRowHeight;
    });
  });

  pdf.setTitle(title);
  pdf.setSubject('Payroll Summary');
  pdf.setAuthor('RedPoint Remote HR System');
  return Buffer.from(await pdf.save());
}

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

const formatPayrollShortPeriod = (month: unknown, year: unknown) => {
  const monthNumber = Number(month);
  const monthName = payrollMonthNames[monthNumber - 1] || 'Payroll';
  const yearText = String(year || '').trim();
  return `${monthName.slice(0, 3)}-${yearText.slice(-2)}`.replace(/-$/, '');
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

const stylePayrollTemplateSheet = (
  sheet: XLSX.WorkSheet,
  columns: ExportColumn[],
  dataRowCount: number,
  summaryEndRow: number,
) => {
  const lastColumn = columnLetter(columns.length - 1);
  const dataEndRow = 7 + dataRowCount;
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
  sheet['!autofilter'] = { ref: `A7:${lastColumn}${dataEndRow}` };

  columns.forEach((column, index) => {
    const letter = columnLetter(index);
    const group = payrollHeaderGroups[column.key];
    const topCell = sheet[`${letter}6`];
    const bottomCell = sheet[`${letter}7`];
    if (topCell) topCell.s = payrollCellStyle(column, Boolean(group));
    if (bottomCell) bottomCell.s = payrollCellStyle(column);
    for (let row = 8; row <= summaryEndRow; row += 1) {
      const dataCell = sheet[`${letter}${row}`];
      if (!dataCell) continue;
      dataCell.s = { font: { name: 'Century Gothic', sz: 10 } };
      if (column.type === 'currency') dataCell.z = '[$RM]#,##0.00';
      if (column.type === 'number') dataCell.z = '0';
      if (column.key === 'nric_passport' || column.key === 'account_no') dataCell.z = '@';
    }
  });

  for (let row = summaryEndRow - 7; row <= summaryEndRow; row += 1) {
    columns.forEach((column, index) => {
      const cell = sheet[`${columnLetter(index)}${row}`];
      if (!cell) return;
      cell.s = {
        ...payrollCellStyle(column),
        font: { name: 'Century Gothic', sz: 10, bold: true },
      };
    });
  }
};

const setPayrollFormula = (sheet: XLSX.WorkSheet, address: string, formula: string, cachedValue: number) => {
  sheet[address] = {
    t: 'n',
    f: formula.replace(/^=/, ''),
    v: cachedValue,
  };
};

const sumFormula = (column: string, firstRow: number, lastRow: number) => `SUM(${column}${firstRow}:${column}${lastRow})`;

const redactSensitivePayrollRows = (rows: Row[], columns: ExportColumn[], sensitiveAllowed: boolean) => {
  if (sensitiveAllowed) return rows;
  const sensitiveKeys = columns.filter(column => column.sensitive).map(column => column.key);
  return rows.map(row => {
    const redacted = { ...row };
    sensitiveKeys.forEach(key => {
      redacted[key] = '';
    });
    return redacted;
  });
};

const payrollWorkbookBuffer = (
  title: string,
  rows: Row[],
  columns: ExportColumn[],
  sensitiveAllowed = true,
) => {
  const period = rows[0]?.payroll_month && rows[0]?.payroll_year
    ? formatPayrollPeriod(rows[0].payroll_month, rows[0].payroll_year)
    : '';
  const shortPeriod = rows[0]?.payroll_month && rows[0]?.payroll_year
    ? formatPayrollShortPeriod(rows[0].payroll_month, rows[0].payroll_year)
    : title;
  const companyNames = [...new Set(rows.map(row => String(row.entity_name || '').trim()).filter(Boolean))];
  const companyName = companyNames.length === 1 ? companyNames[0] : companyNames.length > 1 ? 'Multiple Entities' : '';
  const dataStartRow = 8;
  const dataEndRow = dataStartRow + rows.length - 1;
  const blankSummaryRow = dataEndRow + 1;
  const totalRow = blankSummaryRow + 1;
  const nettPayRow = totalRow + 1;
  const epfSummaryRow = nettPayRow + 1;
  const socsoSummaryRow = epfSummaryRow + 1;
  const lindungSummaryRow = socsoSummaryRow + 1;
  const eisSummaryRow = lindungSummaryRow + 1;
  const grandCostRow = eisSummaryRow + 1;
  const grandStatutoriesRow = grandCostRow + 1;
  const summaryEndRow = grandStatutoriesRow;
  const visibleRows = redactSensitivePayrollRows(rows, columns, sensitiveAllowed);
  const numericKeys = new Set(columns.filter(column => column.type === 'currency').map(column => column.key));
  const valuesForRows = visibleRows.map(row => columns.map(column => row[column.key]));
  const values = [
    [null, 'Company Name:', companyName],
    [null, 'Description', `${shortPeriod} Payroll Summary`],
    [null, 'Date', period],
    [],
    [],
    columns.map(column => payrollHeaderGroups[column.key] || column.label),
    columns.map(column => payrollHeaderGroups[column.key] ? column.label : null),
    ...valuesForRows,
    [],
    Array(columns.length).fill(null),
    Array(columns.length).fill(null),
    Array(columns.length).fill(null),
    Array(columns.length).fill(null),
    Array(columns.length).fill(null),
    Array(columns.length).fill(null),
    Array(columns.length).fill(null),
    Array(columns.length).fill(null),
  ];
  values[totalRow - 1][1] = 'TOTAL';
  values[nettPayRow - 1][1] = 'NETT PAY TO EMPLOYEE';
  values[epfSummaryRow - 1][1] = 'EPF (EMPLOYEE + EMPLOYER)';
  values[socsoSummaryRow - 1][1] = 'SOCSO (EMPLOYEE + EMPLOYER)';
  values[lindungSummaryRow - 1][1] = 'LINDUNG 24 Jam';
  values[eisSummaryRow - 1][1] = 'EIS (EMPLOYEE + EMPLOYER)';
  values[grandCostRow - 1][1] = 'GRAND TOTAL COST';
  values[grandStatutoriesRow - 1][1] = 'GRAND TOTAL OF STATUTORIES';
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

  const columnIndex = new Map(columns.map((column, index) => [column.key, index]));
  const cellAddress = (key: string, row: number) => {
    const index = columnIndex.get(key);
    return index === undefined ? null : `${columnLetter(index)}${row}`;
  };
  const rowValues = (row: number) => visibleRows[row - dataStartRow];
  const formulaValue = (key: string, row: number) => numericValue(rowValues(row)?.[key]);

  if (sensitiveAllowed) {
    for (let row = dataStartRow; row <= dataEndRow; row += 1) {
      const address = cellAddress('total_cost_pax', row);
      if (address) {
        const rowData = rowValues(row);
        setPayrollFormula(
          sheet,
          address,
          `=M${row}+U${row}+V${row}+W${row}`,
          numericValue(rowData?.gross_pay)
            + numericValue(rowData?.epf_employer)
            + numericValue(rowData?.socso_employer)
            + numericValue(rowData?.eis_employer),
        );
      }
    }
  }

  const summaryFormula = (key: string, row: number, formula: string, cachedValue: number) => {
    if (!sensitiveAllowed) return;
    const address = cellAddress(key, row);
    if (address) setPayrollFormula(sheet, address, `=${formula}`, cachedValue);
  };

  if (sensitiveAllowed) {
    columns.forEach(column => {
      if (!numericKeys.has(column.key) || column.key === 'total_cost_pax') return;
      const address = cellAddress(column.key, totalRow);
      if (address) setPayrollFormula(sheet, address, `=${sumFormula(columnLetter(columnIndex.get(column.key) || 0), dataStartRow, dataEndRow)}`, visibleRows.reduce((sum, row) => sum + numericValue(row[column.key]), 0));
    });
    summaryFormula('net_pay', nettPayRow, sumFormula('T', dataStartRow, dataEndRow), visibleRows.reduce((sum, row) => sum + formulaValue('net_pay', dataStartRow + visibleRows.indexOf(row)), 0));
    summaryFormula('epf_employee', epfSummaryRow, `${sumFormula('N', dataStartRow, dataEndRow)}+${sumFormula('U', dataStartRow, dataEndRow)}`, visibleRows.reduce((sum, row) => sum + numericValue(row.epf_employee) + numericValue(row.epf_employer), 0));
    summaryFormula('socso_employee', socsoSummaryRow, `${sumFormula('O', dataStartRow, dataEndRow)}+${sumFormula('V', dataStartRow, dataEndRow)}`, visibleRows.reduce((sum, row) => sum + numericValue(row.socso_employee) + numericValue(row.socso_employer), 0));
    summaryFormula('skbbk_employee', lindungSummaryRow, sumFormula('P', dataStartRow, dataEndRow), visibleRows.reduce((sum, row) => sum + numericValue(row.skbbk_employee), 0));
    summaryFormula('eis_employee', eisSummaryRow, `${sumFormula('Q', dataStartRow, dataEndRow)}+${sumFormula('W', dataStartRow, dataEndRow)}`, visibleRows.reduce((sum, row) => sum + numericValue(row.eis_employee) + numericValue(row.eis_employer), 0));
    summaryFormula('total_cost_pax', grandCostRow, sumFormula('Y', dataStartRow, dataEndRow), visibleRows.reduce((sum, row) => sum + numericValue(row.total_cost_pax), 0));
    summaryFormula('total_cost_pax', grandStatutoriesRow, `N${epfSummaryRow}+O${socsoSummaryRow}+P${lindungSummaryRow}+Q${eisSummaryRow}`, visibleRows.reduce((sum, row) => sum + numericValue(row.epf_employee) + numericValue(row.epf_employer) + numericValue(row.socso_employee) + numericValue(row.socso_employer) + numericValue(row.skbbk_employee) + numericValue(row.eis_employee) + numericValue(row.eis_employer), 0));
    const totalCostAddress = cellAddress('total_cost_pax', totalRow);
    if (totalCostAddress) setPayrollFormula(sheet, totalCostAddress, `=${sumFormula('Y', dataStartRow, dataEndRow)}`, visibleRows.reduce((sum, row) => sum + numericValue(row.total_cost_pax), 0));
  }

  sheet['!merges'] = merges;
  stylePayrollTemplateSheet(sheet, columns, rows.length, summaryEndRow);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, title.slice(0, 31));
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx', cellStyles: true }) as Buffer;
};

export const workbookBuffer = (
  title: string,
  rows: Row[],
  columns: ExportColumn[],
  module: ExportModule = 'employees',
  sensitiveAllowed = true,
) => {
  if (module === 'payroll' || module === 'payslips') return payrollWorkbookBuffer(title, rows, columns, sensitiveAllowed);
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
  const role = normalize(actor.role);
  if (['regional manager', 'leader'].includes(role) && !request.filters?.entityId) {
    throw Object.assign(new Error('This role must export within a selected company entity.'), { statusCode: 403 });
  }
  const sensitiveAllowed = canExportSensitive(actor.role, request.module);
  const isPayrollTemplateExport = (request.format === 'xlsx' || request.format === 'pdf')
    && (request.module === 'payroll' || request.module === 'payslips');
  const columns = isPayrollTemplateExport
    ? PAYROLL_XLSX_TEMPLATE_COLUMNS
    : selectedColumns(request.module, request.columns, sensitiveAllowed);
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
      ? `${formatPayrollShortPeriod(rows[0]?.payroll_month, rows[0]?.payroll_year)} Payroll Summary`
      : manifest(request.module).title;
    buffer = workbookBuffer(sheetTitle, rows, columns, request.module, sensitiveAllowed);
    extension = 'xlsx';
  } else if (isPayrollTemplateExport) {
    const pdfTitle = `${formatPayrollPeriod(rows[0]?.payroll_month, rows[0]?.payroll_year)} Payroll Summary`;
    buffer = await renderPayrollPdf(pdfTitle, rows, sensitiveAllowed);
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

export async function writeExportAudit(
  actor: AdminSessionActor,
  request: ExportRequest,
  result: { recordCount: number; columns: string[] },
  status: 'success' | 'failed',
  errorMessage?: string,
  ipAddress?: string,
) {
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
      ip_address: ipAddress || null,
    });
  } catch (error) {
    console.warn('[Export Audit] Could not persist audit record:', error);
  }
}
