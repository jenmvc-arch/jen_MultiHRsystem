import assert from 'node:assert/strict';
import {
  INITIAL_EMPLOYEES,
  calculatePayslip,
  getEmployeeForMonth,
  getPayrollBasicSalary,
  getSalaryProration,
  seedSocsoConfigurationsAndBrackets
} from './data';
import type { Employee } from './types';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear()
};
seedSocsoConfigurationsAndBrackets();

const createEmployee = (updates: Partial<Employee> = {}): Employee => ({
  ...INITIAL_EMPLOYEES[0],
  basicSalary: 3100,
  dateOfJoined: '2020-01-01',
  salaryAdjustments: [],
  effectiveDatedProfiles: [],
  historicalPayrollRecords: [],
  allowanceGeneral: 0,
  allowanceTransport: 0,
  allowanceParking: 0,
  allowanceMeal: 0,
  allowanceAccommodation: 0,
  allowancePhone: 0,
  housingAllowance: 0,
  transportAllowance: 0,
  overtime: 0,
  performanceBonus: 0,
  bonusAmount: 0,
  commissionAmount: 0,
  backPayAmount: 0,
  awsAmount: 0,
  compensationAmount: 0,
  reimbursementAmount: 0,
  unpaidLeave: 0,
  deductionInLieu: 0,
  deductionCp38: 0,
  deductionOthers: 0,
  ...updates
});

const januaryJoin = getSalaryProration(
  createEmployee({ dateOfJoined: '2026-01-16' }),
  1,
  2026
);
assert.equal(januaryJoin.calendarDays, 31);
assert.equal(januaryJoin.eligibleDays, 16);
assert.equal(januaryJoin.payableSalary, 1600);
assert.equal(januaryJoin.prorationDeduction, 1500);

const firstDayJoin = getSalaryProration(
  createEmployee({ dateOfJoined: '2026-01-01' }),
  1,
  2026
);
assert.equal(firstDayJoin.payableSalary, 3100);
assert.equal(firstDayJoin.isProrated, false);

const leapFebruary = getSalaryProration(
  createEmployee({ basicSalary: 2900, dateOfJoined: '2024-02-15' }),
  2,
  2024
);
assert.equal(leapFebruary.calendarDays, 29);
assert.equal(leapFebruary.eligibleDays, 15);
assert.equal(leapFebruary.payableSalary, 1500);

const terminationMonth = getSalaryProration(
  createEmployee({
    basicSalary: 3000,
    effectiveDatedProfiles: [{
      effectiveDate: '2024-01-01',
      dateOfTermination: '2024-04-10'
    } as any]
  }),
  4,
  2024
);
assert.equal(terminationMonth.eligibleDays, 10);
assert.equal(terminationMonth.payableSalary, 1000);

const afterTermination = getSalaryProration(
  createEmployee({
    effectiveDatedProfiles: [{
      effectiveDate: '2024-01-01',
      dateOfTermination: '2024-04-10'
    } as any]
  }),
  5,
  2024
);
assert.equal(afterTermination.fullPeriodSalary, 0);
assert.equal(afterTermination.payableSalary, 0);

const midMonthAdjustment = getSalaryProration(
  createEmployee({
    salaryAdjustments: [{
      id: 'adjustment-1',
      startDate: '2026-01-16',
      effectiveDate: '2026-01-16',
      adjustedSalary: 6200,
      createdAt: '2026-01-01T00:00:00.000Z'
    }]
  }),
  1,
  2026
);
assert.equal(midMonthAdjustment.payableSalary, 4700);
assert.equal(midMonthAdjustment.fullPeriodSalary, 4700);

const savedPayrollEmployee = createEmployee({
  dateOfJoined: '2026-01-16',
  historicalPayrollRecords: [{
    payrollMonth: 1,
    payrollYear: 2026,
    basicSalary: 1600,
    actualPCBDeducted: 0
  }]
});
assert.equal(getEmployeeForMonth(savedPayrollEmployee, 1, 2026).basicSalary, 3100);
assert.equal(getPayrollBasicSalary(savedPayrollEmployee, 1, 2026), 1600);
assert.equal(calculatePayslip(savedPayrollEmployee, 1, 2026).grossEarnings, 1600);

const manualPayPeriodSalary = calculatePayslip(savedPayrollEmployee, 1, 2026, 1850);
assert.equal(manualPayPeriodSalary.grossEarnings, 1850);
assert.equal(savedPayrollEmployee.basicSalary, 3100);

console.log('Salary proration tests passed.');
