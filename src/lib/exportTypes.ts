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

