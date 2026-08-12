const normalizeRole = (role: string | null | undefined) =>
  String(role || '').trim().toLowerCase();

const normalizeEmail = (email: string | null | undefined) =>
  String(email || '').trim().toLowerCase();

export const MASTER_ACCESS_ADMIN_EMAIL = 'hr.redpoint';

const ADMIN_PORTAL_ROLES = new Set([
  'global administrator',
  'master user',
  'administrator',
  'regional manager',
  'leader',
  'payroll tax approver',
]);

export type LoginPortal = 'admin' | 'employee';

export const isEmployeePortalRole = (role: string | null | undefined) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole.includes('employee');
};

export const isEmployeeSignerRole = (role: string | null | undefined) => {
  const normalizedRole = normalizeRole(role);
  return isEmployeePortalRole(role) || normalizedRole === 'candidate';
};

export const isAdminPortalRole = (role: string | null | undefined) => {
  const normalizedRole = normalizeRole(role);
  return ADMIN_PORTAL_ROLES.has(normalizedRole);
};

export const isRoleAllowedForLoginPortal = (
  role: string | null | undefined,
  portal: LoginPortal
) => portal === 'employee'
  ? isEmployeeSignerRole(role)
  : isAdminPortalRole(role);

export const hasGlobalAdminPrivileges = (role: string | null | undefined) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'global administrator' || normalizedRole === 'master user';
};

export const canManageAppAccess = (email: string | null | undefined) =>
  normalizeEmail(email) === MASTER_ACCESS_ADMIN_EMAIL;
