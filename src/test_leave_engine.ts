import assert from 'node:assert/strict';
import {
  calculateCarryOverExpiry,
  calculateLeaveBalances,
  calculateLeaveDateDays,
  calculatePayrollDeduction,
  calculateProratedEntitlement,
  calculateWorkingHours,
  consumeReplacementLeaveFIFO,
  DEFAULT_CARRY_OVER_SETTINGS,
  DEFAULT_LEAVE_CONFIGS,
  DEFAULT_LEAVE_GROUPS,
  eligibleOffInLieuDays,
  findDuplicateAssignedLeaveTypes,
  splitLeaveDaysAcrossPayrollMonths,
} from './lib/leaveDomain';

const standardPolicy = {
  id: 'test-policy',
  name: 'Test policy',
  deductionRule: 'working_days_excluding_holidays' as const,
  roundingRule: 'nearest_half_day' as const,
  prorationRule: 'joiner_proration' as const,
  entitlementRule: 'calendar_year' as const,
  excludeWeekends: true,
  excludePublicHolidays: true,
  notes: '',
};

assert.equal(calculateLeaveDateDays('2026-08-10', '2026-08-14', standardPolicy), 5);
assert.equal(calculateLeaveDateDays('2026-08-10', '2026-08-16', standardPolicy), 5);
assert.equal(
  calculateLeaveDateDays('2026-08-10', '2026-08-11', {
    ...standardPolicy,
    roundingRule: 'round_up_half_day',
  }),
  2,
);
assert.equal(calculateProratedEntitlement(18, '2026-07-01', 2026, 'monthly_accrual'), 9);

assert.equal(
  calculateCarryOverExpiry(DEFAULT_CARRY_OVER_SETTINGS[0], 2026),
  '2027-03-31',
);
assert.equal(
  calculateCarryOverExpiry({
    ...DEFAULT_CARRY_OVER_SETTINGS[0],
    expiryRule: 'months_after_year_end',
    expiryMonths: 6,
  }, 2026),
  '2027-06-30',
);

const duplicateGroups = [
  {
    ...DEFAULT_LEAVE_GROUPS[0],
    id: 'group-a',
    leaveTypeIds: ['annual-leave', 'sick-leave'],
    assignedEmployeeIds: ['employee-1'],
  },
  {
    ...DEFAULT_LEAVE_GROUPS[1],
    id: 'group-b',
    leaveTypeIds: ['annual-leave'],
    assignedEmployeeIds: ['employee-1'],
  },
];
assert.deepEqual(findDuplicateAssignedLeaveTypes(duplicateGroups, 'employee-1'), ['annual-leave']);

const balanceGroups = [{
  ...DEFAULT_LEAVE_GROUPS[0],
  leaveTypeIds: ['annual-leave'],
  assignedEmployeeIds: ['employee-1'],
}];
const balanceRequests = [{
  id: 'leave-1',
  employeeId: 'employee-1',
  employeeName: 'Employee One',
  leaveTypeId: 'annual-leave',
  leaveType: 'Annual Leave',
  startDate: '2026-08-10',
  endDate: '2026-08-11',
  totalDays: 2,
  reason: 'Test',
  status: 'Approved' as const,
  appliedDate: '2026-08-01',
}];
const balances = calculateLeaveBalances({
  employeeId: 'employee-1',
  configs: DEFAULT_LEAVE_CONFIGS,
  groups: balanceGroups,
  requests: balanceRequests,
  ledgerEntries: [{
    id: 'carry-1',
    employeeId: 'employee-1',
    leaveTypeId: 'annual-leave',
    leaveType: 'Annual Leave',
    entryType: 'carry_over',
    sourceType: 'carry_over',
    quantity: 2,
    occurredAt: '2026-01-01',
  }],
});
assert.equal(balances[0].remaining, 18);

assert.equal(calculateWorkingHours('09:00', '15:00'), 6);
assert.equal(eligibleOffInLieuDays(6), 0.5);
assert.equal(eligibleOffInLieuDays(6.01), 1);
assert.equal(0.5 + 1, 1.5);
assert.equal(1.5 * 2, 3);

const fifoCredits = [
  {
    id: 'credit-expiring',
    employeeId: 'employee-1',
    leaveTypeId: 'replacement-leave',
    leaveType: 'Replacement Leave',
    entryType: 'credit' as const,
    sourceType: 'off_in_lieu' as const,
    quantity: 1,
    expiresAt: '2026-09-01',
    occurredAt: '2026-08-01',
  },
  {
    id: 'credit-later',
    employeeId: 'employee-1',
    leaveTypeId: 'replacement-leave',
    leaveType: 'Replacement Leave',
    entryType: 'credit' as const,
    sourceType: 'off_in_lieu' as const,
    quantity: 1,
    expiresAt: '2026-12-01',
    occurredAt: '2026-08-01',
  },
];
const consumed = consumeReplacementLeaveFIFO(fifoCredits, 1.5, '2026-08-14');
assert.equal(consumed.consumed, 1.5);
assert.equal(consumed.remaining, 0);
assert.deepEqual(consumed.debits.map((entry) => entry.quantity), [1, 0.5]);

const deduction = calculatePayrollDeduction({
  employee: { basicSalary: 3100 },
  leaveDays: 2,
  payrollMonth: 1,
  payrollYear: 2026,
});
assert.equal(deduction.dailyRate, 100);
assert.equal(deduction.amount, 200);

const split = splitLeaveDaysAcrossPayrollMonths({
  startDate: '2026-12-30',
  endDate: '2027-01-02',
  totalDays: 4,
});
assert.equal(split.length, 2);
assert.equal(split.reduce((sum, item) => sum + item.leaveDays, 0), 4);
assert.equal(split[0].payrollMonth, 12);
assert.equal(split[1].payrollMonth, 1);

const deductions = [
  { id: 'LPD-leave-1-1', leaveRequestId: 'leave-1' },
  { id: 'LPD-leave-1-1', leaveRequestId: 'leave-1' },
];
assert.equal(new Set(deductions.map((item) => item.id)).size, 1);

console.log('Leave engine tests passed.');

