import { Employee } from '../types';

export type LeaveRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  entityId?: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveRequestStatus;
  appliedDate: string;
  approvedAt?: string;
  approvedBy?: string;
  excessDays?: number;
  payrollMonth?: number;
  payrollYear?: number;
}

export type LeaveDeductionRule =
  | 'calendar_days'
  | 'working_days'
  | 'working_days_excluding_holidays';

export type LeaveRoundingRule =
  | 'exact'
  | 'nearest_half_day'
  | 'round_up_half_day';

export type LeaveProrationRule =
  | 'none'
  | 'joiner_proration'
  | 'monthly_accrual';

export type LeaveEntitlementRule =
  | 'calendar_year'
  | 'anniversary_year'
  | 'monthly_accrual';

export type LeavePaidTreatment = 'paid' | 'unpaid';
export type LeaveExcessHandling = 'allow' | 'reject' | 'payroll_deduction';
export type LeavePayrollDeductionBehavior = 'none' | 'deduct_excess' | 'deduct_all';

export interface LeaveConditioningPolicy {
  id: string;
  entityId?: string;
  name: string;
  deductionRule: LeaveDeductionRule;
  roundingRule: LeaveRoundingRule;
  prorationRule: LeaveProrationRule;
  entitlementRule: LeaveEntitlementRule;
  entitlementDays?: number;
  paidTreatment?: LeavePaidTreatment;
  excessLeaveHandling?: LeaveExcessHandling;
  payrollDeductionBehavior?: LeavePayrollDeductionBehavior;
  excludeWeekends: boolean;
  excludePublicHolidays: boolean;
  notes: string;
  enabled?: boolean;
}

export type CarryForwardRule = 'none' | 'full_balance' | 'half_balance' | 'capped';
export type CarryOverExpiryRule = 'no_expiry' | 'fixed_date' | 'months_after_year_end';

export interface CarryOverLeaveBalanceSettings {
  id: string;
  entityId?: string;
  name: string;
  carryForwardRule: CarryForwardRule;
  maxCarryForwardDays: number;
  expiryRule: CarryOverExpiryRule;
  expiryDate: string;
  expiryMonths: number;
  ruleDetails?: string;
  notes: string;
  enabled?: boolean;
}

export interface LeaveConfig {
  id: string;
  entityId?: string;
  leaveType: string;
  daysEntitled: number;
  leaveGroup: string;
  condition: string;
  code?: string;
  isDefault?: boolean;
  enabled?: boolean;
  systemManaged?: boolean;
  canCarryOver?: boolean;
  policyId?: string;
  carryOverId?: string;
}

export interface LeaveType extends LeaveConfig {
  name?: string;
  defaultEntitlementDays?: number;
}

export interface LeaveGroupItem {
  id: string;
  groupId: string;
  leaveTypeId: string;
  policyId: string;
  carryOverId: string;
  entitlementDays?: number;
  enabled?: boolean;
}

export interface LeaveGroup {
  id: string;
  entityId?: string;
  name: string;
  description: string;
  policyId: string;
  carryOverId: string;
  leaveTypeIds: string[];
  publicHolidayGroupIds?: string[];
  items?: LeaveGroupItem[];
  assignedEmployeeIds: string[];
  enabled: boolean;
}

export interface EmployeeLeaveGroupAssignment {
  id: string;
  entityId?: string;
  employeeId: string;
  groupId: string;
  active: boolean;
  assignedAt?: string;
}

export interface OffInLieuEntry {
  id: string;
  requestId?: string;
  date: string;
  startTime: string;
  endTime: string;
  workingHours: number;
  eligibleDays: number;
}

export type OffInLieuSubmissionMode = 'single' | 'bulk';
export type OffInLieuStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected';

export interface OffInLieuRequest {
  id: string;
  entityId?: string;
  employeeIds: string[];
  employeeNames: string[];
  entries: OffInLieuEntry[];
  notes?: string;
  expiryDate: string;
  totalDaysPerEmployee: number;
  totalDays: number;
  status: OffInLieuStatus;
  submissionMode: OffInLieuSubmissionMode;
  appliedDate: string;
  submittedBy: string;
  approvedAt?: string;
  approvedBy?: string;
}

export type LeaveLedgerEntryType = 'credit' | 'debit' | 'carry_over' | 'expiry' | 'adjustment';
export type LeaveLedgerSourceType = 'entitlement' | 'leave_request' | 'off_in_lieu' | 'carry_over' | 'manual' | 'expiry';

export interface LeaveBalanceLedgerEntry {
  id: string;
  entityId?: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType: string;
  entryType: LeaveLedgerEntryType;
  sourceType: LeaveLedgerSourceType;
  sourceId?: string;
  quantity: number;
  expiresAt?: string;
  occurredAt: string;
  notes?: string;
}

export interface LeavePayrollDeduction {
  id: string;
  entityId?: string;
  employeeId: string;
  leaveRequestId?: string;
  payrollMonth: number;
  payrollYear: number;
  leaveDays: number;
  dailyRate: number;
  amount: number;
  status: 'Pending' | 'Synced' | 'Failed';
  syncedAt?: string;
  reason?: string;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveType: string;
  entitlement: number;
  carryOver: number;
  credited: number;
  taken: number;
  pending: number;
  expired: number;
  remaining: number;
  replacementCredit?: number;
}

export interface LeaveWorkspaceData {
  configs: LeaveConfig[];
  policies: LeaveConditioningPolicy[];
  carryOverSettings: CarryOverLeaveBalanceSettings[];
  groups: LeaveGroup[];
  assignments: EmployeeLeaveGroupAssignment[];
  workShiftGroups: WorkShiftGroup[];
  workShiftGroupDays: WorkShiftGroupDay[];
  employeeWorkShiftAssignments: EmployeeWorkShiftAssignment[];
  publicHolidayGroups: PublicHolidayGroup[];
  publicHolidays: PublicHoliday[];
  requests: LeaveRequest[];
  offInLieuRequests: OffInLieuRequest[];
  ledgerEntries: LeaveBalanceLedgerEntry[];
  payrollDeductions: LeavePayrollDeduction[];
  source: 'supabase' | 'local';
}

export type WorkShiftDayType = 'full_day' | 'half_day' | 'rest';

export interface WorkShiftGroup {
  id: string;
  entityId?: string;
  name: string;
  description: string;
  enabled: boolean;
  weeklyHours: number;
  weeklyHoursWarning: boolean;
}

export interface WorkShiftGroupDay {
  id: string;
  entityId?: string;
  groupId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  dayType: WorkShiftDayType;
  isWorkDay: boolean;
  actualHours: number;
}

export interface EmployeeWorkShiftAssignment {
  id: string;
  entityId?: string;
  employeeId: string;
  groupId: string;
  effectiveDate: string;
  endDate?: string;
  active: boolean;
  assignedAt?: string;
}

export type PublicHolidayCategory = 'national' | 'state';

export interface PublicHolidayGroup {
  id: string;
  entityId?: string;
  name: string;
  category: PublicHolidayCategory;
  stateCode?: string;
  enabled: boolean;
}

export interface PublicHoliday {
  id: string;
  entityId?: string;
  groupId: string;
  name: string;
  holidayDate: string;
  observedDate?: string;
  year: number;
  notes?: string;
  enabled: boolean;
}

export const STANDARD_POLICY_ID = 'leave-policy-standard';
export const STANDARD_CARRY_OVER_ID = 'leave-carry-over-standard';
export const REPLACEMENT_LEAVE_TYPE_ID = 'replacement-leave';

export const DEFAULT_WORK_SHIFT_GROUP_ID = 'work-shift-malaysia-standard';
export const DEFAULT_PUBLIC_HOLIDAY_GROUP_ID = 'public-holiday-malaysia-national';

const DEFAULT_WEEKDAY_TIMES: Array<{
  weekday: number;
  startTime: string;
  endTime: string;
  dayType: WorkShiftDayType;
}> = [
  { weekday: 0, startTime: '', endTime: '', dayType: 'rest' },
  { weekday: 1, startTime: '09:00', endTime: '18:00', dayType: 'full_day' },
  { weekday: 2, startTime: '09:00', endTime: '18:00', dayType: 'full_day' },
  { weekday: 3, startTime: '09:00', endTime: '18:00', dayType: 'full_day' },
  { weekday: 4, startTime: '09:00', endTime: '18:00', dayType: 'full_day' },
  { weekday: 5, startTime: '09:00', endTime: '18:00', dayType: 'full_day' },
  { weekday: 6, startTime: '', endTime: '', dayType: 'rest' },
];

export const DEFAULT_WORK_SHIFT_GROUPS: WorkShiftGroup[] = [{
  id: DEFAULT_WORK_SHIFT_GROUP_ID,
  name: 'Malaysia Standard',
  description: 'Monday to Friday standard working schedule.',
  enabled: true,
  weeklyHours: 40,
  weeklyHoursWarning: false,
}];

export const DEFAULT_WORK_SHIFT_GROUP_DAYS: WorkShiftGroupDay[] = DEFAULT_WEEKDAY_TIMES.map((day) => ({
  id: `${DEFAULT_WORK_SHIFT_GROUP_ID}-${day.weekday}`,
  groupId: DEFAULT_WORK_SHIFT_GROUP_ID,
  ...day,
  isWorkDay: day.dayType !== 'rest',
  actualHours: calculateShiftHours(day.startTime, day.endTime, day.dayType),
}));

export const MALAYSIA_PUBLIC_HOLIDAY_GROUPS: Array<Pick<PublicHolidayGroup, 'id' | 'name' | 'category' | 'stateCode'>> = [
  { id: DEFAULT_PUBLIC_HOLIDAY_GROUP_ID, name: 'Malaysia National', category: 'national' },
  { id: 'public-holiday-johor', name: 'Johor', category: 'state', stateCode: 'JHR' },
  { id: 'public-holiday-kedah', name: 'Kedah', category: 'state', stateCode: 'KDH' },
  { id: 'public-holiday-kelantan', name: 'Kelantan', category: 'state', stateCode: 'KTN' },
  { id: 'public-holiday-melaka', name: 'Melaka', category: 'state', stateCode: 'MLK' },
  { id: 'public-holiday-negeri-sembilan', name: 'Negeri Sembilan', category: 'state', stateCode: 'NSN' },
  { id: 'public-holiday-pahang', name: 'Pahang', category: 'state', stateCode: 'PHG' },
  { id: 'public-holiday-penang', name: 'Pulau Pinang', category: 'state', stateCode: 'PNG' },
  { id: 'public-holiday-perak', name: 'Perak', category: 'state', stateCode: 'PRK' },
  { id: 'public-holiday-perlis', name: 'Perlis', category: 'state', stateCode: 'PLS' },
  { id: 'public-holiday-sabah', name: 'Sabah', category: 'state', stateCode: 'SBH' },
  { id: 'public-holiday-sarawak', name: 'Sarawak', category: 'state', stateCode: 'SWK' },
  { id: 'public-holiday-selangor', name: 'Selangor', category: 'state', stateCode: 'SGR' },
  { id: 'public-holiday-terengganu', name: 'Terengganu', category: 'state', stateCode: 'TRG' },
  { id: 'public-holiday-kuala-lumpur', name: 'Kuala Lumpur', category: 'state', stateCode: 'KUL' },
  { id: 'public-holiday-labuan', name: 'Labuan', category: 'state', stateCode: 'LBN' },
  { id: 'public-holiday-putrajaya', name: 'Putrajaya', category: 'state', stateCode: 'PJY' },
];

export const DEFAULT_PUBLIC_HOLIDAY_GROUPS: PublicHolidayGroup[] = MALAYSIA_PUBLIC_HOLIDAY_GROUPS.map((group) => ({
  ...group,
  enabled: true,
}));

const DEFAULT_NATIONAL_HOLIDAYS_BY_YEAR: Record<number, Array<[string, string]>> = {
  2026: [
    ['New Year’s Day', '2026-01-01'],
    ['Labour Day', '2026-05-01'],
    ['Wesak Day', '2026-05-31'],
    ['Birthday of the Yang di-Pertuan Agong', '2026-06-01'],
    ['National Day', '2026-08-31'],
    ['Malaysia Day', '2026-09-16'],
    ['Christmas Day', '2026-12-25'],
  ],
  2027: [
    ['New Year’s Day', '2027-01-01'],
    ['Labour Day', '2027-05-01'],
    ['Wesak Day', '2027-05-20'],
    ['Birthday of the Yang di-Pertuan Agong', '2027-06-07'],
    ['National Day', '2027-08-31'],
    ['Malaysia Day', '2027-09-16'],
    ['Christmas Day', '2027-12-25'],
  ],
};

export const DEFAULT_PUBLIC_HOLIDAYS: PublicHoliday[] = Object.entries(DEFAULT_NATIONAL_HOLIDAYS_BY_YEAR)
  .flatMap(([year, holidays]) => holidays.map(([name, holidayDate], index) => ({
    id: `${DEFAULT_PUBLIC_HOLIDAY_GROUP_ID}-${year}-${index + 1}`,
    groupId: DEFAULT_PUBLIC_HOLIDAY_GROUP_ID,
    name,
    holidayDate,
    year: Number(year),
    enabled: true,
  })));

export const DEFAULT_LEAVE_CONDITIONING_POLICIES: LeaveConditioningPolicy[] = [
  {
    id: STANDARD_POLICY_ID,
    name: 'Standard Malaysia Leave Policy',
    deductionRule: 'working_days_excluding_holidays',
    roundingRule: 'nearest_half_day',
    prorationRule: 'joiner_proration',
    entitlementRule: 'calendar_year',
    entitlementDays: 18,
    paidTreatment: 'paid',
    excessLeaveHandling: 'payroll_deduction',
    payrollDeductionBehavior: 'deduct_excess',
    excludeWeekends: true,
    excludePublicHolidays: true,
    notes: 'Use for the standard full-time employee population. Half-day requests are supported.',
    enabled: true,
  },
];

export const DEFAULT_CARRY_OVER_SETTINGS: CarryOverLeaveBalanceSettings[] = [
  {
    id: STANDARD_CARRY_OVER_ID,
    name: 'Standard Annual Carry Over',
    carryForwardRule: 'capped',
    maxCarryForwardDays: 5,
    expiryRule: 'fixed_date',
    expiryDate: '2027-03-31',
    expiryMonths: 3,
    ruleDetails: 'Unused carried-forward days expire at the end of the first quarter.',
    notes: 'Unused carried-forward days expire at the end of the first quarter.',
    enabled: true,
  },
];

export const DEFAULT_LEAVE_CONFIGS: LeaveConfig[] = [
  {
    id: 'annual-leave',
    code: 'AL',
    leaveType: 'Annual Leave',
    daysEntitled: 18,
    leaveGroup: 'Full-Time Standard',
    condition: 'Paid leave',
    isDefault: true,
    enabled: true,
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
  },
  {
    id: 'sick-leave',
    code: 'SL',
    leaveType: 'Sick Leave',
    daysEntitled: 14,
    leaveGroup: 'All Staff',
    condition: 'Paid leave',
    isDefault: true,
    enabled: true,
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
  },
  {
    id: 'hospitalisation-leave',
    code: 'HL',
    leaveType: 'Hospitalisation Leave',
    daysEntitled: 60,
    leaveGroup: 'All Staff',
    condition: 'Paid leave',
    isDefault: true,
    enabled: true,
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
  },
  {
    id: 'maternity-leave',
    code: 'ML',
    leaveType: 'Maternity Leave',
    daysEntitled: 98,
    leaveGroup: 'Full-Time Standard',
    condition: 'Paid leave',
    isDefault: true,
    enabled: true,
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
  },
  {
    id: 'paternity-leave',
    code: 'PL',
    leaveType: 'Paternity Leave',
    daysEntitled: 7,
    leaveGroup: 'Full-Time Standard',
    condition: 'Paid leave',
    isDefault: true,
    enabled: true,
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
  },
  {
    id: 'compassionate-leave',
    code: 'CL',
    leaveType: 'Compassionate Leave',
    daysEntitled: 3,
    leaveGroup: 'All Staff',
    condition: 'Paid leave',
    isDefault: true,
    enabled: true,
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
  },
  {
    id: 'unpaid-leave',
    code: 'UL',
    leaveType: 'Unpaid Leave',
    daysEntitled: 30,
    leaveGroup: 'All Staff',
    condition: 'Unpaid leave',
    isDefault: true,
    enabled: true,
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
  },
  {
    id: REPLACEMENT_LEAVE_TYPE_ID,
    code: 'RPL',
    leaveType: 'Replacement Leave',
    daysEntitled: 0,
    leaveGroup: 'System Managed',
    condition: 'Off in Lieu credit',
    isDefault: true,
    systemManaged: true,
    enabled: true,
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
  },
];

export const DEFAULT_LEAVE_GROUPS: LeaveGroup[] = [
  {
    id: 'full-time-standard',
    name: 'Full-Time Standard',
    description: 'Standard leave package for permanent and fixed-term employees.',
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
    publicHolidayGroupIds: [DEFAULT_PUBLIC_HOLIDAY_GROUP_ID],
    leaveTypeIds: DEFAULT_LEAVE_CONFIGS
      .filter((config) => ['annual-leave', 'sick-leave', 'hospitalisation-leave', 'maternity-leave', 'paternity-leave', 'compassionate-leave', 'unpaid-leave'].includes(config.id))
      .map((config) => config.id),
    assignedEmployeeIds: [],
    enabled: true,
  },
  {
    id: 'all-staff',
    name: 'All Staff',
    description: 'Shared leave package available to every active employee.',
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
    publicHolidayGroupIds: [DEFAULT_PUBLIC_HOLIDAY_GROUP_ID],
    leaveTypeIds: ['sick-leave', 'hospitalisation-leave', 'compassionate-leave', 'unpaid-leave'],
    assignedEmployeeIds: [],
    enabled: true,
  },
];

export function roundToHalfDay(value: number): number {
  return Math.round(value * 2) / 2;
}

export function calculateLeaveDateDays(
  startDate: string,
  endDate: string,
  policy?: LeaveConditioningPolicy,
  publicHolidayDates: string[] = [],
  workShiftGroup?: WorkShiftGroup,
  workShiftGroupDays: WorkShiftGroupDay[] = [],
): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  const holidays = new Set(publicHolidayDates);
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateString = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
    const isHoliday = holidays.has(dateString);
    const scheduleDay = getWorkShiftDayForDate(workShiftGroup, workShiftGroupDays, cursor.getDay());
    const isRestDay = scheduleDay?.dayType === 'rest';
    const scheduleWeight = scheduleDay?.dayType === 'half_day' ? 0.5 : 1;
    const includeDay = policy?.deductionRule === 'calendar_days'
      ? true
      : (!isRestDay
        && (workShiftGroup || !policy?.excludeWeekends || !isWeekend)
        && (!policy?.excludePublicHolidays || !isHoliday));
    if (includeDay) count += workShiftGroup ? scheduleWeight : 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  if (policy?.roundingRule === 'nearest_half_day') return roundToHalfDay(count);
  if (policy?.roundingRule === 'round_up_half_day') return Math.ceil(count * 2) / 2;
  return count;
}

export function calculateProratedEntitlement(
  annualEntitlement: number,
  dateJoined: string | undefined,
  year: number,
  rule: LeaveProrationRule = 'none',
): number {
  if (!annualEntitlement || rule === 'none' || !dateJoined) return annualEntitlement;
  const joined = new Date(`${dateJoined}T00:00:00`);
  if (Number.isNaN(joined.getTime()) || joined.getFullYear() !== year) return annualEntitlement;
  if (rule === 'monthly_accrual') {
    return roundToHalfDay(annualEntitlement * Math.max(0, 13 - (joined.getMonth() + 1)) / 12);
  }
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const remainingDays = Math.max(0, yearEnd.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24);
  const yearDays = (yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
  return roundToHalfDay(annualEntitlement * remainingDays / yearDays);
}

export function calculateWorkingHours(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  if ([startHours, startMinutes, endHours, endMinutes].some(Number.isNaN)) return 0;
  if (startTime === endTime) return 0;
  let start = startHours * 60 + startMinutes;
  let end = endHours * 60 + endMinutes;
  if (end <= start) end += 24 * 60;
  return Math.round(((end - start) / 60) * 100) / 100;
}

export function addHoursToTime(time: string, hours: number): string {
  const [hourValue, minuteValue] = time.split(':').map(Number);
  if ([hourValue, minuteValue].some(Number.isNaN)) return '';
  const totalMinutes = (hourValue * 60) + minuteValue + (hours * 60);
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const nextHours = Math.floor(normalizedMinutes / 60);
  const nextMinutes = normalizedMinutes % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

export function calculateShiftHours(
  startTime: string,
  endTime: string,
  dayType: WorkShiftDayType = 'full_day',
): number {
  if (dayType === 'rest') return 0;
  const hours = calculateWorkingHours(startTime, endTime);
  if (hours <= 0) return 0;
  if (dayType === 'half_day') return Math.round((hours / 2) * 100) / 100;
  return Math.max(0, Math.round((hours - 1) * 100) / 100);
}

export function getWorkShiftDayForDate(
  group: WorkShiftGroup | undefined,
  days: WorkShiftGroupDay[],
  weekday: number,
): WorkShiftGroupDay | undefined {
  if (!group) return undefined;
  return days.find((day) => day.groupId === group.id && day.weekday === weekday);
}

export function calculateWorkShiftWeeklyHours(
  days: WorkShiftGroupDay[],
  groupId?: string,
): number {
  return Math.round(days
    .filter((day) => !groupId || day.groupId === groupId)
    .reduce((total, day) => total + (day.dayType === 'rest' ? 0 : day.actualHours), 0) * 100) / 100;
}

export function normalizeWorkShiftGroupDays(
  days: WorkShiftGroupDay[],
  groupId: string,
): WorkShiftGroupDay[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const existing = days.find((day) => day.groupId === groupId && day.weekday === weekday);
    const fallback = DEFAULT_WORK_SHIFT_GROUP_DAYS[weekday];
    const next = existing || {
      ...fallback,
      id: `${groupId}-${weekday}`,
      groupId,
    };
    const dayType = next.dayType || (next.isWorkDay ? 'full_day' : 'rest');
    const startTime = dayType === 'half_day'
      ? next.startTime || '09:00'
      : next.startTime;
    const endTime = dayType === 'half_day'
      ? next.endTime || addHoursToTime(startTime, 4)
      : next.endTime;
    return {
      ...next,
      id: next.id || `${groupId}-${weekday}`,
      groupId,
      weekday,
      dayType,
      isWorkDay: dayType !== 'rest',
      startTime,
      endTime,
      actualHours: calculateShiftHours(startTime, endTime, dayType),
    };
  });
}

export function eligibleOffInLieuDays(hours: number): number {
  if (hours <= 0) return 0;
  return hours > 6 ? 1 : 0.5;
}

export function addOneMonth(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getGroupItems(group: LeaveGroup, configs: LeaveConfig[]): LeaveGroupItem[] {
  return configs
    .filter((config) => group.leaveTypeIds.includes(config.id))
    .map((config) => group.items?.find((item) => item.leaveTypeId === config.id) || {
      id: `${group.id}-${config.id}`,
      groupId: group.id,
      leaveTypeId: config.id,
      policyId: config.policyId || group.policyId,
      carryOverId: config.carryOverId || group.carryOverId,
      entitlementDays: config.daysEntitled,
      enabled: true,
    });
}

export function getAssignedGroupIds(
  groups: LeaveGroup[],
  employeeId: string,
): string[] {
  return groups
    .filter((group) => group.enabled && group.assignedEmployeeIds.includes(employeeId))
    .map((group) => group.id);
}

export function findDuplicateAssignedLeaveTypes(
  groups: LeaveGroup[],
  employeeId: string,
  nextGroupIds?: string[],
): string[] {
  const groupIds = nextGroupIds || getAssignedGroupIds(groups, employeeId);
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  groups
    .filter((group) => group.enabled && groupIds.includes(group.id))
    .forEach((group) => group.leaveTypeIds.forEach((leaveTypeId) => {
      if (seen.has(leaveTypeId)) duplicates.add(leaveTypeId);
      seen.add(leaveTypeId);
    }));
  return [...duplicates];
}

export function getEmployeeLeaveTypeIds(
  groups: LeaveGroup[],
  employeeId: string,
): string[] {
  return [...new Set(
    groups
      .filter((group) => group.enabled && group.assignedEmployeeIds.includes(employeeId))
      .flatMap((group) => group.leaveTypeIds),
  )];
}

export function calculateLeaveBalances(params: {
  employeeId: string;
  configs: LeaveConfig[];
  groups?: LeaveGroup[];
  requests?: LeaveRequest[];
  ledgerEntries?: LeaveBalanceLedgerEntry[];
  year?: number;
  employee?: Pick<Employee, 'dateOfJoined'>;
}): LeaveBalance[] {
  const {
    employeeId,
    configs,
    groups = [],
    requests = [],
    ledgerEntries = [],
    year = new Date().getFullYear(),
    employee,
  } = params;
  const assignedTypeIds = groups.length > 0 ? getEmployeeLeaveTypeIds(groups, employeeId) : configs.map((config) => config.id);
  const effectiveConfigs = configs.filter((config) => (
    config.enabled !== false &&
    (assignedTypeIds.length === 0 || assignedTypeIds.includes(config.id))
  ));

  return effectiveConfigs.map((config) => {
    const policy = DEFAULT_LEAVE_CONDITIONING_POLICIES.find((item) => item.id === config.policyId);
    const entitlement = calculateProratedEntitlement(
      config.daysEntitled,
      employee?.dateOfJoined,
      year,
      policy?.prorationRule || 'none',
    );
    const entries = ledgerEntries.filter((entry) => entry.employeeId === employeeId && entry.leaveTypeId === config.id);
    const credited = entries
      .filter((entry) => entry.entryType === 'credit' || entry.entryType === 'adjustment')
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const explicitExpired = entries
      .filter((entry) => entry.entryType === 'expiry')
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const explicitExpirySources = new Set(
      entries.filter((entry) => entry.entryType === 'expiry').map((entry) => entry.sourceId),
    );
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dateExpired = entries
      .filter((entry) => (
        (entry.entryType === 'credit' || entry.entryType === 'carry_over' || entry.entryType === 'adjustment') &&
        Boolean(entry.expiresAt) &&
        String(entry.expiresAt) < todayString &&
        !explicitExpirySources.has(entry.id)
      ))
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const expired = explicitExpired + dateExpired;
    const ledgerTaken = entries
      .filter((entry) => entry.entryType === 'debit')
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const ledgerRequestIds = new Set(
      entries
        .filter((entry) => entry.entryType === 'debit' && entry.sourceType === 'leave_request')
        .map((entry) => entry.sourceId),
    );
    const requestTaken = requests
      .filter((request) => (
        request.employeeId === employeeId &&
        request.leaveTypeId === config.id &&
        request.status === 'Approved' &&
        !ledgerRequestIds.has(request.id)
      ))
      .reduce((sum, request) => sum + request.totalDays, 0);
    const taken = ledgerTaken + requestTaken;
    const pending = requests
      .filter((request) => request.employeeId === employeeId && request.leaveTypeId === config.id && request.status === 'Pending')
      .reduce((sum, request) => sum + request.totalDays, 0);
    const carryOver = entries
      .filter((entry) => entry.entryType === 'carry_over')
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const replacementCredit = config.id === REPLACEMENT_LEAVE_TYPE_ID ? credited - taken - expired : undefined;
    const baseRemaining = entitlement + carryOver + credited - taken - expired - pending;
    return {
      leaveTypeId: config.id,
      leaveType: config.leaveType,
      entitlement,
      carryOver,
      credited,
      taken,
      pending,
      expired,
      remaining: Math.max(0, baseRemaining),
      replacementCredit,
    };
  });
}

export function calculatePayrollDeduction(params: {
  employee: Pick<Employee, 'basicSalary'>;
  leaveDays: number;
  payrollMonth: number;
  payrollYear: number;
  basis?: 'calendar_days' | 'working_days';
}): LeavePayrollDeduction {
  const daysInMonth = new Date(params.payrollYear, params.payrollMonth, 0).getDate();
  const dailyRate = params.basis === 'working_days'
    ? params.employee.basicSalary / 26
    : params.employee.basicSalary / daysInMonth;
  const amount = Math.round(dailyRate * params.leaveDays * 100) / 100;
  return {
    id: `LPD-${params.payrollYear}-${String(params.payrollMonth).padStart(2, '0')}-${Date.now()}`,
    employeeId: '',
    payrollMonth: params.payrollMonth,
    payrollYear: params.payrollYear,
    leaveDays: params.leaveDays,
    dailyRate: Math.round(dailyRate * 100) / 100,
    amount,
    status: 'Pending',
  };
}

export function calculateCarryOverExpiry(
  setting: CarryOverLeaveBalanceSettings,
  year: number,
): string | undefined {
  if (setting.expiryRule === 'no_expiry') return undefined;
  if (setting.expiryRule === 'fixed_date') return setting.expiryDate || undefined;
  const months = Math.max(1, setting.expiryMonths || 1);
  const expiry = new Date(year + 1, months, 0);
  return `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}-${String(expiry.getDate()).padStart(2, '0')}`;
}

export function splitLeaveDaysAcrossPayrollMonths(params: {
  startDate: string;
  endDate: string;
  totalDays: number;
}): Array<{ payrollMonth: number; payrollYear: number; leaveDays: number }> {
  const start = new Date(`${params.startDate}T00:00:00`);
  const end = new Date(`${params.endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start || params.totalDays <= 0) return [];
  const calendarDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const counts = new Map<string, { payrollMonth: number; payrollYear: number; days: number }>();
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
    const current = counts.get(key) || {
      payrollMonth: cursor.getMonth() + 1,
      payrollYear: cursor.getFullYear(),
      days: 0,
    };
    current.days += 1;
    counts.set(key, current);
    cursor.setDate(cursor.getDate() + 1);
  }
  return [...counts.values()].map((item) => ({
    payrollMonth: item.payrollMonth,
    payrollYear: item.payrollYear,
    leaveDays: Math.round((params.totalDays * item.days / calendarDays) * 100) / 100,
  }));
}

export function consumeReplacementLeaveFIFO(
  credits: LeaveBalanceLedgerEntry[],
  requestedDays: number,
  asOfDate: string,
): {
  consumed: number;
  remaining: number;
  debits: LeaveBalanceLedgerEntry[];
} {
  let remaining = Math.max(0, requestedDays);
  let consumed = 0;
  const debits: LeaveBalanceLedgerEntry[] = [];
  const sorted = [...credits]
    .filter((credit) => credit.entryType === 'credit' && (!credit.expiresAt || credit.expiresAt >= asOfDate))
    .sort((left, right) => (left.expiresAt || '9999-12-31').localeCompare(right.expiresAt || '9999-12-31'));
  const consumedByCredit = new Map<string, number>();
  credits
    .filter((entry) => entry.entryType === 'debit')
    .forEach((entry) => {
      const creditId = entry.notes?.match(/replacement credit ([^ ]+)/i)?.[1];
      if (creditId) consumedByCredit.set(creditId, (consumedByCredit.get(creditId) || 0) + entry.quantity);
    });

  sorted.forEach((credit) => {
    if (remaining <= 0) return;
    const available = Math.max(0, credit.quantity - (consumedByCredit.get(credit.id) || 0));
    const amount = Math.min(remaining, available);
    if (amount <= 0) return;
    consumed += amount;
    remaining -= amount;
    debits.push({
      ...credit,
      id: `debit-${credit.id}-${Date.now()}-${debits.length}`,
      entryType: 'debit',
      sourceType: 'leave_request',
      sourceId: undefined,
      quantity: amount,
      occurredAt: asOfDate,
      notes: `Consumed from replacement credit ${credit.id}`,
    });
  });
  return { consumed, remaining, debits };
}
