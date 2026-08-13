import assert from 'node:assert/strict';
import {
  INITIAL_EMPLOYEES,
  calculatePayslip,
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

const lowSalaryEmployee: Employee = {
  ...INITIAL_EMPLOYEES[0],
  id: 'directory-pcb-low',
  email: 'directory-pcb-low@redpoint.test',
  basicSalary: 3000,
  allowanceGeneral: 5000,
  allowanceTransport: 2500,
  taxPcb: 999,
  historicalPayrollRecords: [{
    payrollMonth: 8,
    payrollYear: 2026,
    basicSalary: 3000,
    actualPCBDeducted: 999
  } as any]
};

const directoryBreakdown = calculatePayslip(lowSalaryEmployee, 8, 2026, {
  companyEmployees: [lowSalaryEmployee],
  ignoreSavedPcb: true
});

assert.equal(directoryBreakdown.taxPcbVal, 0);

const defaultBreakdown = calculatePayslip(lowSalaryEmployee, 8, 2026);
assert.equal(defaultBreakdown.taxPcbVal, 999);

const sameBasicWithoutAllowances = calculatePayslip(
  { ...lowSalaryEmployee, allowanceGeneral: 0, allowanceTransport: 0 },
  8,
  2026,
  {
    companyEmployees: [lowSalaryEmployee],
    ignoreSavedPcb: true
  }
);
assert.equal(sameBasicWithoutAllowances.taxPcbVal, directoryBreakdown.taxPcbVal);

console.log('Employee Directory PCB eligibility tests passed.');
