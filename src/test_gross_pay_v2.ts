import assert from 'node:assert/strict';
import {
  INITIAL_EMPLOYEES,
  calculatePayslip,
  seedSocsoConfigurationsAndBrackets
} from './data';
import { GROSS_PAY_CALCULATION_VERSION } from './types';
import type { Employee } from './types';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear()
};
seedSocsoConfigurationsAndBrackets();

const employee: Employee = {
  ...INITIAL_EMPLOYEES[0],
  id: 'gross-pay-v2@example.com',
  email: 'gross-pay-v2@example.com',
  basicSalary: 5000,
  allowanceGeneral: 100,
  allowanceTransport: 200,
  allowanceParking: 50,
  allowanceMeal: 25,
  allowanceAccommodation: 75,
  allowancePhone: 30,
  commissionAmount: 300,
  overtime: 900,
  bonusAmount: 800,
  backPayAmount: 700,
  awsAmount: 600,
  compensationAmount: 500,
  reimbursementAmount: 250,
  unpaidLeave: 100,
  incompleteMonthDeduction: 500,
  historicalPayrollRecords: [],
  effectiveDatedProfiles: [],
  salaryAdjustments: [],
  epfRateEmployee: 11,
  epfRateEmployer: 13,
  optInEpf: true,
  optInSocso: true,
  optInEis: true,
  optInPcb: true
};

const breakdown = calculatePayslip(employee, 8, 2026, {
  calculationVersion: GROSS_PAY_CALCULATION_VERSION,
  basicSalaryOverride: 5000,
  ignoreSavedStatutory: true
});

assert.equal(breakdown.grossPay, 5180);
assert.equal(breakdown.grossEarnings, 5180);
assert.equal(breakdown.grossReductions, 600);
assert.equal(breakdown.reimbursementsSum, 250);
assert.equal(breakdown.epfEmployeeValue, Math.round(5180 * 0.11));
assert.equal(
  breakdown.netPay,
  breakdown.grossPay + breakdown.reimbursementsSum - breakdown.netDeductions
);

const negativeGross = calculatePayslip(
  { ...employee, basicSalary: 100, unpaidLeave: 1000, incompleteMonthDeduction: 1000 },
  8,
  2026,
  {
    calculationVersion: GROSS_PAY_CALCULATION_VERSION,
    basicSalaryOverride: 100,
    ignoreSavedStatutory: true
  }
);
assert.equal(negativeGross.grossPay, 0);

const legacy = calculatePayslip(employee, 8, 2026, {
  basicSalaryOverride: 5000,
  ignoreSavedStatutory: true
});
assert.equal(legacy.grossPay, 5000 + 480 + 900 + 800 + 300 + 700 + 600 + 500);

console.log('Gross Pay v2 tests passed.');
