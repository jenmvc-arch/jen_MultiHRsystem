export type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'txt';
export type ExportScope = 'record' | 'selected' | 'filtered' | 'all';
export type ExportModule = 'employees' | 'payroll' | 'performance' | 'reports' | 'payslips';

export interface ExportFilterSet {
  entityId?: string;
  employeeId?: string;
  employeeIds?: string[];
  department?: string;
  status?: string;
  search?: string;
  payrollMonth?: number;
  payrollYear?: number;
  startDate?: string;
  endDate?: string;
  reportType?: string;
  metrics?: string[];
}

export interface ExportColumn {
  key: string;
  label: string;
  sensitive?: boolean;
  type?: 'text' | 'date' | 'number' | 'currency';
}

export const PAYROLL_FILE_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'serial_no', label: 'S/No', type: 'number' },
  { key: 'employee_name', label: 'Employee Name' },
  { key: 'employment_type', label: 'Employment Type' },
  { key: 'payment_mode', label: 'Payment Mode' },
  { key: 'nric_passport', label: 'IC/Passport number', sensitive: true },
  { key: 'bank_name', label: 'Bank Name', sensitive: true },
  { key: 'account_no', label: 'Bank Account Number', sensitive: true },
  { key: 'basic_salary', label: 'Basic Salary', sensitive: true, type: 'currency' },
  { key: 'commission_amount', label: 'Commission', sensitive: true, type: 'currency' },
  { key: 'allowances', label: 'Allowances', sensitive: true, type: 'currency' },
  { key: 'unpaid_leave', label: 'Unpaid Leave', sensitive: true, type: 'currency' },
  { key: 'incomplete_month_deduction', label: 'Incomplete Month Deduction', sensitive: true, type: 'currency' },
  { key: 'gross_pay', label: 'Gross Pay', sensitive: true, type: 'currency' },
  { key: 'epf_employee', label: 'Employee EPF', sensitive: true, type: 'currency' },
  { key: 'socso_employee', label: 'Employee Socso', sensitive: true, type: 'currency' },
  { key: 'skbbk_employee', label: 'Employee SKBBK', sensitive: true, type: 'currency' },
  { key: 'eis_employee', label: 'Employee EIS', sensitive: true, type: 'currency' },
  { key: 'actual_pcb_deducted', label: 'PCB', sensitive: true, type: 'currency' },
  { key: 'total_deduction', label: 'Total Deduction', sensitive: true, type: 'currency' },
  { key: 'net_pay', label: 'Net Pay', sensitive: true, type: 'currency' },
  { key: 'epf_employer', label: 'Employer EPF', sensitive: true, type: 'currency' },
  { key: 'socso_employer', label: 'Employer Socso', sensitive: true, type: 'currency' },
  { key: 'eis_employer', label: 'Employer EIS', sensitive: true, type: 'currency' },
  { key: 'payment_description', label: 'Payment Description' },
];

export interface ExportRequest {
  module: ExportModule;
  format: ExportFormat;
  scope: ExportScope;
  filters?: ExportFilterSet;
  selectedRecordIds?: string[];
  columns?: string[];
  includeHeader?: boolean;
  includeFilters?: boolean;
  orientation?: 'portrait' | 'landscape';
  filename?: string;
}

export interface ExportManifest {
  module: ExportModule;
  title: string;
  columns: ExportColumn[];
  sensitiveColumns?: string[];
  defaultFormat?: ExportFormat;
}
