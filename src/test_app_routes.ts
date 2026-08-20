import assert from 'node:assert/strict';
import {
  getAppTabFromPath,
  getHireOnboardingSectionFromPath,
  getPathForAppTab,
  getPathForHireOnboardingSection
} from './lib/appRoutes';

assert.equal(getPathForAppTab('payroll'), '/payroll');
assert.equal(getAppTabFromPath('/payroll'), 'payroll');
assert.equal(getPathForAppTab('payroll-mockup'), '/payroll/mockup');
assert.equal(getAppTabFromPath('/payroll/mockup'), 'payroll-mockup');
assert.equal(getAppTabFromPath('/payroll/payslip'), 'payslip-viewer');
assert.equal(getPathForAppTab('employee-portal'), '/employee-portal');
assert.equal(getAppTabFromPath('/employee-portal'), 'employee-portal');
assert.equal(getPathForAppTab('work-shift-groups'), '/work-shift-groups');
assert.equal(getAppTabFromPath('/work-shift-groups'), 'work-shift-groups');
assert.equal(getAppTabFromPath('/employee-portal/demo'), 'employee-portal');
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
