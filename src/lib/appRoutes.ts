import type { AppTab } from '../types';
import {
  isAdminPortalRole,
  isEmployeePortalRole,
  type LoginPortal,
} from './userRoles';
import { getPortalSite } from './portalHosts';

export const AUTH_PATHS: Record<LoginPortal, string> = {
  admin: '/login',
  employee: '/employee-login',
};

export const EMPLOYEE_PORTAL_PATH = '/employee-portal';
export const LEGACY_EMPLOYEE_DEMO_PATH = '/employee-portal/demo';

export const APP_TAB_PATHS: Record<AppTab, string> = {
  dashboard: '/dashboard',
  'employee-portal': EMPLOYEE_PORTAL_PATH,
  'employee-requests': '/employee-requests',
  directory: '/employee-directory',
  payroll: '/payroll',
  'payroll-mockup': '/payroll/mockup',
  'payslip-viewer': '/payroll/payslip',
  performance: '/performance-appraisal',
  reports: '/reports',
  settings: '/settings',
  help: '/help',
  entities: '/entities',
  'tax-settings': '/tax-compliance',
  'leave-management': '/leave-management',
  'work-shift-groups': '/work-shift-groups',
  'forms-directory': '/forms-directory',
  'hire-onboarding': '/hire-onboarding',
  'department-role': '/department-roles',
  'socso-config': '/socso-config',
  'email-template-setup': '/email-template-setup'
};

const APP_PATH_ALIASES: Partial<Record<string, AppTab>> = {
  '/directory': 'directory',
  '/employees': 'directory',
  '/performance': 'performance',
  '/tax-settings': 'tax-settings',
  '/department-role': 'department-role'
};

const normalizePath = (pathname: string) => {
  const path = pathname.trim() || '/';
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
};

export const isEmployerLoginPath = (pathname: string) =>
  normalizePath(pathname) === AUTH_PATHS.admin;

export const isEmployeeLoginPath = (pathname: string) =>
  normalizePath(pathname) === AUTH_PATHS.employee;

export const isEmployeePortalPath = (pathname: string) =>
  normalizePath(pathname) === EMPLOYEE_PORTAL_PATH;

export const isLegacyEmployeeDemoPath = (pathname: string) =>
  normalizePath(pathname) === LEGACY_EMPLOYEE_DEMO_PATH;

const isPublicEmployerPath = (pathname: string, search = '') => {
  const params = new URLSearchParams(search);
  return (
    params.has('candidateShare')
    || params.get('form') === 'job-apply'
    || params.get('form') === 'onboarding'
    || params.get('print') === 'true'
  );
};

export const getPortalHostRedirectPath = (
  hostname: string,
  pathname: string,
  search = ''
): string | null => {
  const site = getPortalSite(hostname);
  const normalizedPath = normalizePath(pathname);

  if (site === 'employee') {
    if (
      isEmployeeLoginPath(normalizedPath)
      || isEmployeePortalPath(normalizedPath)
      || isLegacyEmployeeDemoPath(normalizedPath)
    ) {
      return null;
    }
    return AUTH_PATHS.employee;
  }

  if (site === 'employer') {
    if (
      isEmployeeLoginPath(normalizedPath)
      || isEmployeePortalPath(normalizedPath)
      || isLegacyEmployeeDemoPath(normalizedPath)
    ) {
      return AUTH_PATHS.admin;
    }
    if (isPublicEmployerPath(normalizedPath, search)) return null;
  }

  return null;
};

export const getLoginPortalFromPath = (pathname: string): LoginPortal | null => {
  if (isEmployeeLoginPath(pathname)) return 'employee';
  if (isEmployerLoginPath(pathname)) return 'admin';
  return null;
};

export const getAuthRedirectPath = (
  pathname: string,
  role?: string | null
): string | null => {
  const normalizedPath = normalizePath(pathname);

  if (isLegacyEmployeeDemoPath(normalizedPath)) {
    return `${AUTH_PATHS.employee}?notice=demo-removed`;
  }

  if (!role) {
    if (isEmployeeLoginPath(normalizedPath) || isEmployerLoginPath(normalizedPath)) return null;
    return isEmployeePortalPath(normalizedPath)
      ? AUTH_PATHS.employee
      : AUTH_PATHS.admin;
  }

  if (isEmployeePortalRole(role)) {
    return normalizedPath === EMPLOYEE_PORTAL_PATH ? null : EMPLOYEE_PORTAL_PATH;
  }

  if (isAdminPortalRole(role)) {
    return normalizedPath === APP_TAB_PATHS.dashboard ? null : APP_TAB_PATHS.dashboard;
  }

  return AUTH_PATHS.admin;
};

export const getPathForAppTab = (tab: AppTab) => APP_TAB_PATHS[tab];

export const getAppTabFromPath = (pathname: string): AppTab | null => {
  const normalizedPath = normalizePath(pathname);
  const alias = APP_PATH_ALIASES[normalizedPath];
  if (alias) return alias;

  const matches = (Object.entries(APP_TAB_PATHS) as Array<[AppTab, string]>)
    .sort(([, left], [, right]) => right.length - left.length);

  if (isLegacyEmployeeDemoPath(normalizedPath)) return null;

  const match = matches.find(([, path]) => (
    normalizedPath === path || normalizedPath.startsWith(`${path}/`)
  ));

  return match?.[0] || null;
};

export type HireOnboardingSection =
  | 'pipeline'
  | 'application-form'
  | 'onboarding-form'
  | 'onboarding-portal';

export const HIRE_ONBOARDING_SECTION_PATHS: Record<HireOnboardingSection, string> = {
  pipeline: '/hire-onboarding',
  'application-form': '/hire-onboarding/job-application',
  'onboarding-form': '/hire-onboarding/employee-enrollment',
  'onboarding-portal': '/hire-onboarding/onboarding-portal'
};

export const getPathForHireOnboardingSection = (section: HireOnboardingSection) => (
  HIRE_ONBOARDING_SECTION_PATHS[section]
);

export const getHireOnboardingSectionFromPath = (pathname: string): HireOnboardingSection => {
  const normalizedPath = normalizePath(pathname);
  const match = (Object.entries(HIRE_ONBOARDING_SECTION_PATHS) as Array<[HireOnboardingSection, string]>)
    .sort(([, left], [, right]) => right.length - left.length)
    .find(([, path]) => normalizedPath === path);

  return match?.[0] || 'pipeline';
};
