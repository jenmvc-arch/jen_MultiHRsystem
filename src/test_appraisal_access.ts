import assert from 'node:assert/strict';
import {
  createAppraisalAccessGrant,
  getAppraisalAccessStatus,
  getAppraisalAccessGrant,
  upsertAppraisalAccessGrant,
} from './lib/appraisalAccess';
import { Employee, EmployeePerformance, ReviewCycle } from './types';

const employee = {
  id: 'EMP-1',
  email: 'employee@example.com',
  entityId: 'ENT-92',
} as Employee;
const currentCycle: ReviewCycle = {
  id: 'cycle-current',
  name: 'Annual Review',
  period: '2026',
  status: 'In Progress',
};
const completedCycle: ReviewCycle = {
  ...currentCycle,
  id: 'cycle-completed',
  status: 'Completed',
};
const performance: EmployeePerformance = {
  employeeId: employee.id,
  reviewCycleId: currentCycle.id,
  managerName: 'Manager',
  reviewStatus: 'Not Started',
  rating: 0,
  teamworkScore: 0,
  communicationScore: 0,
  problemSolvingScore: 0,
  selfEvaluation: '',
  managerComments: '',
  goals: [],
};

assert.equal(getAppraisalAccessStatus([], employee, currentCycle, performance), 'closed');
assert.equal(
  getAppraisalAccessStatus(
    [createAppraisalAccessGrant({
      entityId: employee.entityId,
      employeeId: employee.id,
      reviewCycleId: currentCycle.id,
      status: 'open',
    })],
    employee,
    currentCycle,
    performance,
  ),
  'open',
);
assert.equal(
  getAppraisalAccessStatus(
    [createAppraisalAccessGrant({
      entityId: employee.entityId,
      employeeId: employee.email,
      reviewCycleId: currentCycle.id,
      status: 'sent',
    })],
    employee,
    currentCycle,
    performance,
  ),
  'sent',
);
assert.equal(getAppraisalAccessStatus([], employee, completedCycle, undefined), 'historical');

const first = createAppraisalAccessGrant({
  entityId: employee.entityId,
  employeeId: employee.id,
  reviewCycleId: currentCycle.id,
  status: 'open',
});
const second = { ...first, status: 'sent' as const, updatedAt: new Date().toISOString() };
const updated = upsertAppraisalAccessGrant([first], second);
assert.equal(updated.length, 1);
assert.equal(getAppraisalAccessGrant(updated, employee, currentCycle.id)?.status, 'sent');

console.log('Appraisal access tests passed.');
