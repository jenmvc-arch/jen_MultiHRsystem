import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PayslipPDFDocument } from '../../src/components/PayslipPDFDocument';
import { seedSocsoConfigurationsAndBrackets } from '../../src/data';
import type {
  CorporateEntity,
  Employee,
  PayrollDocumentDisplaySettings,
  PayrollRecord2026,
} from '../../src/types';

type Row = Record<string, any>;

const numberValue = (value: unknown) => Number(value ?? 0) || 0;
const stringValue = (value: unknown) => String(value ?? '');

const parseJson = <T,>(value: unknown, fallback: T): T => {
  if (value && typeof value === 'object') return value as T;
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const validEmploymentTypes = new Set<Employee['employmentType']>([
  'Internship',
  'Probation',
  'Permanent',
  'Contract',
  'Fixed Term Contract',
  'Independent Contractor',
  'Part Time',
  'Probationary',
  'Confirmation',
  'Independent Contractor / Freelance',
]);

const validStatuses = new Set<Employee['status']>([
  'Active',
  'Active - Probation',
  'Active - Confirmation',
  'On Leave',
  'Resigned',
  'Terminated',
  'Suspended',
]);

const validMaritalStatuses = new Set<Employee['maritalStatus']>([
  'Single',
  'Married',
  'Divorced',
  'Widowed',
]);

const asEmploymentType = (value: unknown): Employee['employmentType'] =>
  validEmploymentTypes.has(value as Employee['employmentType'])
    ? value as Employee['employmentType']
    : 'Permanent';

const asStatus = (value: unknown): Employee['status'] =>
  validStatuses.has(value as Employee['status'])
    ? value as Employee['status']
    : 'Active';

const asMaritalStatus = (value: unknown): Employee['maritalStatus'] =>
  validMaritalStatuses.has(value as Employee['maritalStatus'])
    ? value as Employee['maritalStatus']
    : 'Single';

export const mapPayrollRowToEmployee = (row: Row, payrollRow: Row): Employee => ({
  id: stringValue(row.id || row.email || payrollRow.employee_email),
  entityId: stringValue(row.entity_id || row.entity_name || payrollRow.entity_id),
  name: stringValue(row.name || payrollRow.employee_name || payrollRow.employee_email),
  email: stringValue(row.email || payrollRow.employee_email),
  designation: stringValue(row.designation),
  department: stringValue(row.department),
  status: asStatus(row.status),
  bankName: stringValue(row.bank_name || row.bankName),
  accountNo: stringValue(row.account_no || row.accountNo),
  basicSalary: numberValue(row.basic_salary),
  housingAllowance: numberValue(row.housing_allowance),
  transportAllowance: numberValue(row.transport_allowance),
  overtime: numberValue(row.overtime),
  performanceBonus: numberValue(row.performance_bonus),
  allowanceGeneral: numberValue(row.allowance_general),
  allowanceTransport: numberValue(row.allowance_transport),
  allowanceParking: numberValue(row.allowance_parking),
  allowanceMeal: numberValue(row.allowance_meal),
  allowanceAccommodation: numberValue(row.allowance_accommodation),
  allowancePhone: numberValue(row.allowance_phone),
  paymentDate: row.payment_date ? stringValue(row.payment_date) : undefined,
  payslipDescriptions: parseJson(row.payslip_descriptions, undefined),
  reimbursementAmount: numberValue(row.reimbursement_amount),
  reimbursementDesc: row.reimbursement_desc ? stringValue(row.reimbursement_desc) : undefined,
  incompleteMonthDeduction: numberValue(row.incomplete_month_deduction),
  bonusAmount: numberValue(row.bonus_amount),
  bonusDesc: row.bonus_desc ? stringValue(row.bonus_desc) : undefined,
  commissionAmount: numberValue(row.commission_amount),
  commissionDesc: row.commission_desc ? stringValue(row.commission_desc) : undefined,
  backPayAmount: numberValue(row.back_pay_amount),
  backPayDesc: row.back_pay_desc ? stringValue(row.back_pay_desc) : undefined,
  awsAmount: numberValue(row.aws_amount),
  awsDesc: row.aws_desc ? stringValue(row.aws_desc) : undefined,
  compensationAmount: numberValue(row.compensation_amount),
  compensationDesc: row.compensation_desc ? stringValue(row.compensation_desc) : undefined,
  deductionInLieu: numberValue(row.deduction_in_lieu),
  deductionCp38: numberValue(row.deduction_cp38),
  deductionOthers: numberValue(row.deduction_others),
  deductionOthersDesc: row.deduction_others_desc ? stringValue(row.deduction_others_desc) : undefined,
  epfRateEmployee: numberValue(row.epf_rate_employee) || 11,
  epfRateEmployer: numberValue(row.epf_rate_employer) || 13,
  socsoEmployee: numberValue(row.socso_employee),
  socsoEmployer: numberValue(row.socso_employer),
  eisEmployee: numberValue(row.eis_employee),
  eisEmployer: numberValue(row.eis_employer),
  skbbkEmployee: numberValue(row.skbbk_employee || row.lindung24_employee),
  skbbkEmployer: numberValue(row.skbbk_employer),
  taxPcb: numberValue(row.tax_pcb),
  unpaidLeave: numberValue(row.unpaid_leave),
  hrdCorp: numberValue(row.hrd_corp),
  nricPassport: stringValue(row.nric_passport),
  nationality: stringValue(row.nationality),
  contactNumber: row.contact_number ? stringValue(row.contact_number) : undefined,
  taxNumber: stringValue(row.tax_number),
  epfNumber: row.epf_number ? stringValue(row.epf_number) : undefined,
  employmentType: asEmploymentType(row.employment_type),
  maritalStatus: asMaritalStatus(row.marital_status),
  eligibleForStatutory: row.eligible_for_statutory === 'No' ? 'No' : 'Yes',
  contractStatutoryTreatment: row.contract_statutory_treatment || undefined,
  payrollDocumentDisplaySettings: parseJson<PayrollDocumentDisplaySettings | undefined>(
    row.payroll_document_display_settings,
    undefined,
  ),
  optInEpf: row.opt_in_epf !== false,
  optInSocso: row.opt_in_socso !== false,
  optInEis: row.opt_in_eis !== false,
  optInPcb: row.opt_in_pcb !== false,
  enableLindung24: row.enable_lindung24 === true,
  emergencyContactName: stringValue(row.emergency_contact_name),
  emergencyContactRelation: stringValue(row.emergency_contact_relation),
  emergencyContactPhone: stringValue(row.emergency_contact_phone),
  dateOfJoined: stringValue(row.date_of_joined),
  dateOfConfirmation: row.date_of_confirmation ? stringValue(row.date_of_confirmation) : undefined,
  dateOfTermination: row.date_of_termination ? stringValue(row.date_of_termination) : undefined,
  spouseName: row.spouse_name ? stringValue(row.spouse_name) : undefined,
  spouseNric: row.spouse_nric ? stringValue(row.spouse_nric) : undefined,
  spouseIsWorking: row.spouse_is_working || undefined,
  spouseCompany: row.spouse_company ? stringValue(row.spouse_company) : undefined,
  spousePosition: row.spouse_position ? stringValue(row.spouse_position) : undefined,
  hasDependants: row.has_dependants || undefined,
  dependants: parseJson(row.dependants, undefined),
  careerHistory: parseJson(row.career_history, []),
  salaryAdjustments: parseJson(row.salary_adjustments, []),
});

export const mapPayrollRowToRecord = (row: Row, employee: Employee): PayrollRecord2026 => ({
  id: stringValue(row.id),
  employeeId: stringValue(row.employee_id || employee.id),
  employeeEmail: stringValue(row.employee_email || employee.email),
  payrollMonth: Number(row.payroll_month || new Date().getMonth() + 1),
  payrollYear: Number(row.payroll_year || new Date().getFullYear()),
  status: row.status || 'Draft',
  paymentDate: row.payment_date ? stringValue(row.payment_date) : undefined,
  basicSalary: numberValue(row.basic_salary),
  allowanceGeneral: numberValue(row.allowance_general),
  allowanceTransport: numberValue(row.allowance_transport),
  allowanceParking: numberValue(row.allowance_parking),
  allowanceMeal: numberValue(row.allowance_meal),
  allowanceAccommodation: numberValue(row.allowance_accommodation),
  allowancePhone: numberValue(row.allowance_phone),
  overtime: numberValue(row.overtime),
  bonusAmount: numberValue(row.bonus_amount),
  bonusDesc: row.bonus_desc ? stringValue(row.bonus_desc) : undefined,
  commissionAmount: numberValue(row.commission_amount),
  commissionDesc: row.commission_desc ? stringValue(row.commission_desc) : undefined,
  backPayAmount: numberValue(row.back_pay_amount),
  backPayDesc: row.back_pay_desc ? stringValue(row.back_pay_desc) : undefined,
  awsAmount: numberValue(row.aws_amount),
  awsDesc: row.aws_desc ? stringValue(row.aws_desc) : undefined,
  compensationAmount: numberValue(row.compensation_amount),
  compensationDesc: row.compensation_desc ? stringValue(row.compensation_desc) : undefined,
  reimbursementAmount: numberValue(row.reimbursement_amount),
  reimbursementDesc: row.reimbursement_desc ? stringValue(row.reimbursement_desc) : undefined,
  unpaidLeave: numberValue(row.unpaid_leave),
  incompleteMonthDeduction: numberValue(row.incomplete_month_deduction || row.proration_deduction),
  deductionInLieu: numberValue(row.deduction_in_lieu),
  deductionCp38: numberValue(row.deduction_cp38),
  deductionOthers: numberValue(row.deduction_others),
  deductionOthersDesc: row.deduction_others_desc ? stringValue(row.deduction_others_desc) : undefined,
  payslipDescriptions: parseJson(row.payslip_descriptions, undefined),
  payoutKind: row.payout_kind || 'regular',
  isSeparatePayout: row.is_separate_payout === true || row.is_separate_payout === 'true',
  statutoryTreatment: row.statutory_treatment || undefined,
  payoutTitle: row.payout_title ? stringValue(row.payout_title) : undefined,
  payoutDescription: row.payout_description ? stringValue(row.payout_description) : undefined,
  lineNotes: parseJson(row.line_notes, undefined),
  documentType: row.document_type || undefined,
  compensationLabel: row.compensation_label || undefined,
  displaySettingsSnapshot: parseJson(row.display_settings_snapshot, undefined),
  grossPay: row.gross_pay === null || row.gross_pay === undefined ? undefined : numberValue(row.gross_pay),
  calculationVersion: row.calculation_version || undefined,
  actualPCBDeducted: numberValue(row.actual_pcb_deducted || row.tax_pcb),
  epfEmployee: numberValue(row.epf_employee),
  epfEmployer: numberValue(row.epf_employer),
  socsoEmployee: numberValue(row.socso_employee),
  socsoEmployer: numberValue(row.socso_employer),
  lindung24Employee: numberValue(row.lindung24_employee || row.skbbk_employee),
  eisEmployee: numberValue(row.eis_employee),
  eisEmployer: numberValue(row.eis_employer),
  hrdCorp: numberValue(row.hrd_corp),
  netPay: numberValue(row.net_pay || row.net_salary),
  createdAt: stringValue(row.created_at),
  updatedAt: row.updated_at ? stringValue(row.updated_at) : undefined,
  publishedAt: row.published_at ? stringValue(row.published_at) : undefined,
  publishedBy: row.published_by ? stringValue(row.published_by) : undefined,
  publishError: row.publish_error ? stringValue(row.publish_error) : undefined,
  payslipSentAt: row.payslip_sent_at ? stringValue(row.payslip_sent_at) : undefined,
  payslipSentBy: row.payslip_sent_by ? stringValue(row.payslip_sent_by) : undefined,
  payslipEmailStatus: row.payslip_email_status || undefined,
  payslipEmailError: row.payslip_email_error ? stringValue(row.payslip_email_error) : undefined,
});

export const mapEntityRow = (row: Row | undefined, employee: Employee): CorporateEntity => ({
  id: stringValue(row?.id || employee.entityId || 'default'),
  name: stringValue(row?.name || employee.entityId || 'Red Point Sdn Bhd'),
  registrationNumber: stringValue(row?.registration_number),
  address: stringValue(row?.address),
  taxReferenceNo: stringValue(row?.tax_reference_no),
  epfReferenceNo: stringValue(row?.epf_reference_no),
  socsoReferenceNo: stringValue(row?.socso_reference_no),
  currency: stringValue(row?.currency || 'RM'),
  isActive: row?.is_active !== false,
  logoUrl: row?.logo_url ? stringValue(row.logo_url) : undefined,
  theme: row?.theme || undefined,
  googleScriptUrl: row?.google_script_url ? stringValue(row.google_script_url) : undefined,
  enableLindung24: row?.enable_lindung24 === true,
});

const defaultLogoDataUri = async () => {
  const logoPath = path.join(process.cwd(), 'public', 'redpoint-logo.png');
  const contents = await readFile(logoPath);
  return `data:image/png;base64,${contents.toString('base64')}`;
};

const ensureServerLocalStorage = () => {
  const current = (globalThis as any).localStorage;
  if (current && typeof current.getItem === 'function' && typeof current.setItem === 'function') return;
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(String(key)) ?? null,
      setItem: (key: string, value: string) => values.set(String(key), String(value)),
      removeItem: (key: string) => values.delete(String(key)),
      clear: () => values.clear(),
    },
  });
};

const logoDataUri = async (logoUrl: string | undefined) => {
  if (!logoUrl) return defaultLogoDataUri();
  if (logoUrl.startsWith('data:image/')) return logoUrl;
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) throw new Error(`Logo request returned ${response.status}.`);
    const type = response.headers.get('content-type') || 'image/png';
    return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
  } catch (error) {
    console.warn('[Payslip PDF] Could not load entity logo, using default logo:', error);
    return defaultLogoDataUri();
  }
};

const toBuffer = async (stream: NodeJS.ReadableStream) => new Promise<Buffer>((resolve, reject) => {
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer | Uint8Array | string) => chunks.push(Buffer.from(chunk)));
  stream.on('end', () => resolve(Buffer.concat(chunks)));
  stream.on('error', reject);
});

export const renderOfficialPayslipPdf = async (
  payrollRow: Row,
  employeeRow: Row,
  entityRow?: Row,
  options: { sensitiveAllowed?: boolean } = {},
) => {
  ensureServerLocalStorage();
  seedSocsoConfigurationsAndBrackets();
  const sensitiveAllowed = options.sensitiveAllowed !== false;
  const employee = mapPayrollRowToEmployee(employeeRow, payrollRow);
  const record = mapPayrollRowToRecord(payrollRow, employee);
  const entity = mapEntityRow(entityRow, employee);
  const displaySettingsOverride: Partial<PayrollDocumentDisplaySettings> = sensitiveAllowed
    ? {}
    : {
      showTin: false,
      showEpfNumber: false,
      showNricPassport: false,
      showBankAccount: false,
    };
  const restrictedEmployee = sensitiveAllowed
    ? employee
    : {
      ...employee,
      taxNumber: '',
      epfNumber: '',
      nricPassport: '',
      bankName: '',
      accountNo: '',
    };
  const document = React.createElement(PayslipPDFDocument, {
    employee: restrictedEmployee,
    entity,
    month: record.payrollMonth,
    year: record.payrollYear,
    payrollRecordOverride: record,
    displaySettingsOverride,
    logoSrc: await logoDataUri(entity.logoUrl),
  });
  return toBuffer(await pdf(document).toBuffer());
};
