import assert from 'node:assert/strict';
import {
  AUTH_PATHS,
  EMPLOYEE_PORTAL_PATH,
  getAuthRedirectPath,
  getAppTabFromPath,
  getHireOnboardingSectionFromPath,
  getPathForAppTab,
  getPathForHireOnboardingSection,
  getLoginPortalFromPath,
  getPortalHostRedirectPath,
  isEmployeePortalPath,
  isLegacyEmployeeDemoPath,
} from './lib/appRoutes';

assert.equal(AUTH_PATHS.admin, '/login');
assert.equal(AUTH_PATHS.employee, '/employee-login');
assert.equal(EMPLOYEE_PORTAL_PATH, '/employee-portal');
assert.equal(getLoginPortalFromPath('/login'), 'admin');
assert.equal(getLoginPortalFromPath('/employee-login/'), 'employee');
assert.equal(isEmployeePortalPath('/employee-portal'), true);
assert.equal(isEmployeePortalPath('/employee-portal/demo'), false);
assert.equal(isLegacyEmployeeDemoPath('/employee-portal/demo/'), true);
assert.equal(getAuthRedirectPath('/employee-portal', null), '/employee-login');
assert.equal(getAuthRedirectPath('/dashboard', null), '/login');
assert.equal(getAuthRedirectPath('/login', 'Employee'), '/employee-portal');
assert.equal(getAuthRedirectPath('/employee-login', 'Master User'), '/dashboard');
assert.equal(getAuthRedirectPath('/employee-portal/demo', null), '/employee-login?notice=demo-removed');
assert.equal(getAuthRedirectPath('/employee-portal', 'Employee'), null);
assert.equal(getAuthRedirectPath('/dashboard', 'Master User'), null);
assert.equal(getPortalHostRedirectPath('user-redpoint.hrmsystem.app', '/', ''), '/employee-login');
assert.equal(getPortalHostRedirectPath('user-redpoint.hrmsystem.app', '/dashboard', ''), '/employee-login');
assert.equal(getPortalHostRedirectPath('user-redpoint.hrmsystem.app', '/employee-portal', ''), null);
assert.equal(getPortalHostRedirectPath('admin-redpoint.hrmsystem.app', '/employee-login', ''), '/login');
assert.equal(getPortalHostRedirectPath('admin-redpoint.hrmsystem.app', '/employee-portal', ''), '/login');
assert.equal(getPortalHostRedirectPath('admin-redpoint.hrmsystem.app', '/payroll', ''), null);
assert.equal(getPortalHostRedirectPath('localhost:3000', '/employee-login', ''), null);

assert.equal(getPathForAppTab('payroll'), '/payroll');
assert.equal(getAppTabFromPath('/payroll'), 'payroll');
assert.equal(getPathForAppTab('payroll-mockup'), '/payroll/mockup');
assert.equal(getAppTabFromPath('/payroll/mockup'), 'payroll-mockup');
assert.equal(getAppTabFromPath('/payroll/payslip'), 'payslip-viewer');
assert.equal(getPathForAppTab('employee-portal'), '/employee-portal');
assert.equal(getAppTabFromPath('/employee-portal'), 'employee-portal');
assert.equal(getPathForAppTab('work-shift-groups'), '/work-shift-groups');
assert.equal(getAppTabFromPath('/work-shift-groups'), 'work-shift-groups');
assert.equal(getPathForAppTab('email-template-setup'), '/email-template-setup');
assert.equal(getAppTabFromPath('/email-template-setup'), 'email-template-setup');
assert.equal(getAppTabFromPath('/employee-portal/demo'), null);
assert.equal(getAppTabFromPath('/employee-directory/'), 'directory');
assert.equal(getAppTabFromPath('/hire-onboarding/onboarding-portal'), 'hire-onboarding');
assert.equal(getAppTabFromPath('/unknown-page'), null);

assert.equal(
  getPathForHireOnboardingSection('onboarding-portal'),
  '/hire-onboarding/onboarding-portal'
);
assert.equal(
  getHireOnboardingSectionFromPath('/hire-onboarding/employee-enrollment'),
  'onboarding-form'
);
assert.equal(getHireOnboardingSectionFromPath('/hire-onboarding'), 'pipeline');

console.log('App route tests passed.');
