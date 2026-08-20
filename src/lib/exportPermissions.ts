import type { ExportModule } from './exportTypes';

export const EXPORT_PERMISSIONS = {
  employees: 'employee.export',
  payroll: 'payroll.export',
  performance: 'performance.export',
  reports: 'reports.export',
  payslips: 'payroll.export',
} as const satisfies Record<ExportModule, string>;

export const SENSITIVE_EXPORT_PERMISSIONS = new Set([
  'employee.export_sensitive',
  'payroll.export_sensitive',
  'performance.export_sensitive',
]);

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  'global administrator': new Set(['*', 'employee.export_sensitive', 'payroll.export_sensitive', 'performance.export_sensitive']),
  'master user': new Set(['*', 'employee.export_sensitive', 'payroll.export_sensitive', 'performance.export_sensitive']),
  administrator: new Set(['employee.export', 'payroll.export', 'performance.export', 'reports.export', 'payroll.export_sensitive']),
  'payroll tax approver': new Set(['payroll.export', 'reports.export', 'payroll.export_sensitive']),
  'regional manager': new Set(['employee.export', 'attendance.export', 'leave.export', 'reports.export']),
  leader: new Set(['employee.export', 'performance.export', 'reports.export']),
  employee: new Set(['employee.export', 'payroll.export']),
};

export const hasExportPermission = (role: string | null | undefined, permission: string) => {
  const permissions = ROLE_PERMISSIONS[normalize(role)] || new Set<string>();
  return permissions.has('*') || permissions.has(permission);
};

export const canExportSensitive = (role: string | null | undefined, module: ExportModule) => {
  const permission = module === 'employees'
    ? 'employee.export_sensitive'
    : module === 'performance'
      ? 'performance.export_sensitive'
      : 'payroll.export_sensitive';
  return hasExportPermission(role, permission);
};

export const getExportPermissions = (role: string | null | undefined) => {
  const permissions = ROLE_PERMISSIONS[normalize(role)] || new Set<string>();
  return {
    modules: Object.entries(EXPORT_PERMISSIONS)
      .filter(([, permission]) => permissions.has('*') || permissions.has(permission))
      .map(([module]) => module),
    sensitive: [...SENSITIVE_EXPORT_PERMISSIONS].filter(permission => permissions.has('*') || permissions.has(permission)),
  };
};
