import assert from 'node:assert/strict';
import {
  INITIAL_EMPLOYEES,
  calculateHrdCorpLevy,
  calculatePayslip,
  getHrdCorpLevyRate,
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

const createEmployee = (index: number, overrides: Partial<Employee> = {}): Employee => ({
  ...INITIAL_EMPLOYEES[0],
  id: `hrd-local-${index}`,
  email: `hrd-local-${index}@redpoint.test`,
  entityId: 'ENT-HRD',
  name: `HRD LOCAL ${index}`,
  basicSalary: 3000,
  allowanceGeneral: 200,
  allowanceTransport: 100,
  allowanceParking: 0,
  allowanceMeal: 0,
  allowanceAccommodation: 0,
  allowancePhone: 0,
  housingAllowance: 0,
  transportAllowance: 0,
  overtime: 0,
  performanceBonus: 0,
  hrdCorp: 999,
  status: 'Active',
  dateOfJoined: '2020-01-01',
  nationality: 'Malaysian',
  nricPassport: `900101-14-${String(5000 + index).padStart(4, '0')}`,
  historicalPayrollRecords: [],
  salaryAdjustments: [],
  effectiveDatedProfiles: [],
  ...overrides
});

const createRoster = (count: number) => Array.from({ length: count }, (_, index) => createEmployee(index + 1));

assert.equal(getHrdCorpLevyRate(4), 0);
assert.equal(getHrdCorpLevyRate(5), 0.005);
assert.equal(getHrdCorpLevyRate(9), 0.005);
assert.equal(getHrdCorpLevyRate(10), 0.01);

const levyWages = 3300;
const fourLocalWorkers = createRoster(4);
assert.equal(calculateHrdCorpLevy(fourLocalWorkers[0], levyWages, fourLocalWorkers, '2026-08-31'), 0);

const fiveLocalWorkers = createRoster(5);
assert.equal(calculateHrdCorpLevy(fiveLocalWorkers[0], levyWages, fiveLocalWorkers, '2026-08-31'), 16.5);
assert.equal(
  calculatePayslip(fiveLocalWorkers[0], 8, 2026, {
    ignoreSavedStatutory: true,
    companyEmployees: fiveLocalWorkers
  }).hrdCorpVal,
  16.5
);

const tenLocalWorkers = createRoster(10);
assert.equal(calculateHrdCorpLevy(tenLocalWorkers[0], levyWages, tenLocalWorkers, '2026-08-31'), 33);
assert.equal(
  calculatePayslip(tenLocalWorkers[0], 8, 2026, {
    ignoreSavedStatutory: true,
    companyEmployees: tenLocalWorkers
  }).hrdCorpVal,
  33
);

const foreignEmployee = createEmployee(99, {
  email: 'foreign-worker@redpoint.test',
  id: 'foreign-worker',
  nationality: 'British',
  nricPassport: 'A59483721'
});
assert.equal(calculateHrdCorpLevy(foreignEmployee, levyWages, tenLocalWorkers, '2026-08-31'), 0);

console.log('HRD Corp levy tests passed.');
