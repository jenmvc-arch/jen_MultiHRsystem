import {
  getCurrentActiveEmployees,
  isCurrentActiveEmployee,
} from './data';
import { Employee } from './types';

const employee = (
  id: string,
  status: Employee['status'],
  overrides: Partial<Employee> = {}
): Employee => ({
  id,
  entityId: 'ENT-92',
  name: id,
  email: `${id}@redpoint.test`,
  designation: 'Staff',
  department: 'Operations',
  status,
  bankName: '',
  accountNo: '',
  basicSalary: 5000,
  housingAllowance: 0,
  transportAllowance: 0,
  overtime: 0,
  performanceBonus: 0,
  epfRateEmployee: 11,
  epfRateEmployer: 13,
  socsoEmployee: 0,
  socsoEmployer: 0,
  eisEmployee: 0,
  eisEmployer: 0,
  taxPcb: 0,
  unpaidLeave: 0,
  hrdCorp: 0,
  nricPassport: '',
  nationality: 'Malaysian',
  taxNumber: '',
  employmentType: 'Permanent',
  maritalStatus: 'Single',
  emergencyContactName: '',
  emergencyContactRelation: '',
  emergencyContactPhone: '',
  dateOfJoined: '2020-01-01',
  ...overrides,
});

const currentEmployees = getCurrentActiveEmployees([
  employee('active', 'Active'),
  employee('leave', 'On Leave'),
  employee('resigned', 'Resigned'),
  employee('terminated', 'Terminated'),
  employee('suspended', 'Suspended'),
  employee('future-hire', 'Active', { dateOfJoined: '2026-12-01' }),
  employee('past-termination', 'Active', { dateOfTermination: '2026-01-31' }),
], '2026-08-12');

if (currentEmployees.map((item) => item.id).join(',') !== 'active') {
  throw new Error('Current employee filtering should keep only Active records.');
}

if (!isCurrentActiveEmployee(employee('active', 'Active'), '2026-08-12')) {
  throw new Error('Active employees should remain visible.');
}

if (isCurrentActiveEmployee(employee('leave', 'On Leave'), '2026-08-12')) {
  throw new Error('Employees on leave should not appear in active-only operational functions.');
}

if (isCurrentActiveEmployee(employee('future-hire', 'Active', { dateOfJoined: '2026-12-01' }), '2026-08-12')) {
  throw new Error('Future hires should not be visible as current employees.');
}

if (isCurrentActiveEmployee(employee('past-termination', 'Active', { dateOfTermination: '2026-01-31' }), '2026-08-12')) {
  throw new Error('Past terminations should not be visible as current employees.');
}

console.log('active employee filtering tests passed');
