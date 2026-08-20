/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CopyPlus,
  FileText,
  Layers3,
  ListChecks,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  UserCog,
  Users,
  XCircle
} from 'lucide-react';
import { Employee } from '../types';
import EmployeeAvatar from './EmployeeAvatar';
import LeaveCalendar from './LeaveCalendar';
import { getGmt8DateString, formatToDDMMMYYYY } from '../lib/dateUtils';
import { isCurrentActiveEmployee } from '../data';
import {
  addOneMonth,
  calculateLeaveBalances,
  calculateLeaveDateDays,
  calculatePayrollDeduction,
  calculateWorkingHours,
  consumeReplacementLeaveFIFO,
  CarryOverLeaveBalanceSettings,
  DEFAULT_CARRY_OVER_SETTINGS,
  DEFAULT_LEAVE_CONDITIONING_POLICIES,
  DEFAULT_LEAVE_CONFIGS,
  DEFAULT_LEAVE_GROUPS,
  DEFAULT_PUBLIC_HOLIDAY_GROUPS,
  DEFAULT_PUBLIC_HOLIDAYS,
  DEFAULT_PUBLIC_HOLIDAY_GROUP_ID,
  DEFAULT_WORK_SHIFT_GROUP_DAYS,
  DEFAULT_WORK_SHIFT_GROUPS,
  calculateShiftHours,
  calculateWorkShiftWeeklyHours,
  addHoursToTime,
  normalizeWorkShiftGroupDays,
  EmployeeLeaveGroupAssignment,
  EmployeeWorkShiftAssignment,
  eligibleOffInLieuDays,
  findDuplicateAssignedLeaveTypes,
  getGroupItems,
  LeaveBalanceLedgerEntry,
  LeaveConfig,
  LeaveConditioningPolicy,
  LeaveGroup,
  LeaveGroupItem,
  LeavePayrollDeduction,
  LeaveRequest,
  LeaveRequestStatus,
  PublicHoliday,
  PublicHolidayCategory,
  PublicHolidayGroup,
  OffInLieuEntry,
  OffInLieuRequest,
  OffInLieuSubmissionMode,
  OffInLieuStatus,
  roundToHalfDay,
  splitLeaveDaysAcrossPayrollMonths,
  STANDARD_CARRY_OVER_ID,
  STANDARD_POLICY_ID,
  REPLACEMENT_LEAVE_TYPE_ID,
  WorkShiftDayType,
  WorkShiftGroup,
  WorkShiftGroupDay,
} from '../lib/leaveDomain';
import { loadLeaveWorkspace, persistLeaveWorkspace } from '../lib/leaveService';
import { useFeedback } from './GlobalFeedbackSystem';

export {
  DEFAULT_CARRY_OVER_SETTINGS,
  DEFAULT_LEAVE_CONDITIONING_POLICIES,
  DEFAULT_LEAVE_CONFIGS,
  DEFAULT_LEAVE_GROUPS,
} from '../lib/leaveDomain';
export type {
  LeaveConditioningPolicy,
  LeaveConfig,
  LeaveGroup,
  LeaveRequest,
  OffInLieuEntry,
  OffInLieuRequest,
} from '../lib/leaveDomain';

interface LeaveManagementViewProps {
  employees: Employee[];
  onShowNotification: (title: string, message: string) => void;
  activeEntityId: string;
  onUpdateEmployee?: (id: string, updates: Partial<Employee>) => Promise<void>;
}

type LeaveWorkspaceSection = 'overview' | 'off-in-lieu' | 'groups' | 'employee-assignment' | 'work-shifts' | 'public-holidays' | 'types' | 'policy' | 'carry-over' | 'calendar';
type RequestStatusFilter = 'All' | LeaveRequestStatus;
type OffInLieuStatusFilter = 'All' | OffInLieuStatus;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WORK_SHIFT_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SECTION_TABS: Array<{ id: LeaveWorkspaceSection; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Requests & Balances', icon: ListChecks },
  { id: 'off-in-lieu', label: 'Off in Lieu', icon: Clock3 },
  { id: 'groups', label: 'Leave Groups', icon: Layers3 },
  { id: 'employee-assignment', label: 'Employee Assignment', icon: UserCog },
  { id: 'public-holidays', label: 'Public Holidays', icon: Calendar },
  { id: 'types', label: 'Type of Leave', icon: FileText },
  { id: 'policy', label: 'Conditioning Policy', icon: SlidersHorizontal },
  { id: 'carry-over', label: 'Carry Over Settings', icon: RotateCcw },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays }
];

const inputClass = 'w-full rounded-md border border-neutral-border bg-white px-3 py-2 text-xs text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10';
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant';
const cardClass = 'rounded-xl border border-neutral-border bg-white shadow-sm';

function readScopedJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeScopedJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local preview storage can be unavailable in restricted browser contexts.
  }
}

function buildCalendarDays(year: number, month: number) {
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const previousMonthTotalDays = new Date(year, month, 0).getDate();
  const days: Array<{ dateString: string; day: number; isCurrentMonth: boolean }> = [];

  for (let index = firstDayIndex - 1; index >= 0; index -= 1) {
    const day = previousMonthTotalDays - index;
    const previousMonth = month === 0 ? 11 : month - 1;
    const previousYear = month === 0 ? year - 1 : year;
    days.push({
      day,
      isCurrentMonth: false,
      dateString: `${previousYear}-${String(previousMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push({
      day,
      isCurrentMonth: true,
      dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    });
  }

  let nextDay = 1;
  while (days.length < 42) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    days.push({
      day: nextDay,
      isCurrentMonth: false,
      dateString: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`
    });
    nextDay += 1;
  }

  return days;
}

function normalizeLeaveConfig(config: LeaveConfig, index: number): LeaveConfig {
  const fallback = DEFAULT_LEAVE_CONFIGS[index] || DEFAULT_LEAVE_CONFIGS[0];
  return {
    ...fallback,
    ...config,
    code: config.code || fallback.code,
    enabled: config.enabled !== false,
    policyId: config.policyId || STANDARD_POLICY_ID,
    carryOverId: config.carryOverId || STANDARD_CARRY_OVER_ID
  };
}

export default function LeaveManagementView({
  employees,
  onShowNotification,
  activeEntityId,
  onUpdateEmployee
}: LeaveManagementViewProps) {
  const { confirmAction } = useFeedback();
  const [activeSection, setActiveSection] = useState<LeaveWorkspaceSection>('overview');
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveConfigs, setLeaveConfigs] = useState<LeaveConfig[]>(DEFAULT_LEAVE_CONFIGS);
  const [conditioningPolicies, setConditioningPolicies] = useState<LeaveConditioningPolicy[]>(DEFAULT_LEAVE_CONDITIONING_POLICIES);
  const [carryOverSettings, setCarryOverSettings] = useState<CarryOverLeaveBalanceSettings[]>(DEFAULT_CARRY_OVER_SETTINGS);
  const [leaveGroups, setLeaveGroups] = useState<LeaveGroup[]>(DEFAULT_LEAVE_GROUPS);
  const [assignments, setAssignments] = useState<EmployeeLeaveGroupAssignment[]>([]);
  const [workShiftGroups, setWorkShiftGroups] = useState<WorkShiftGroup[]>(DEFAULT_WORK_SHIFT_GROUPS);
  const [workShiftGroupDays, setWorkShiftGroupDays] = useState<WorkShiftGroupDay[]>(DEFAULT_WORK_SHIFT_GROUP_DAYS);
  const [employeeWorkShiftAssignments, setEmployeeWorkShiftAssignments] = useState<EmployeeWorkShiftAssignment[]>([]);
  const [publicHolidayGroups, setPublicHolidayGroups] = useState<PublicHolidayGroup[]>(DEFAULT_PUBLIC_HOLIDAY_GROUPS);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>(DEFAULT_PUBLIC_HOLIDAYS);
  const [offInLieuRequests, setOffInLieuRequests] = useState<OffInLieuRequest[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LeaveBalanceLedgerEntry[]>([]);
  const [payrollDeductions, setPayrollDeductions] = useState<LeavePayrollDeduction[]>([]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => isCurrentActiveEmployee(employee)),
    [employees]
  );

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState(DEFAULT_LEAVE_CONFIGS[0].leaveType);
  const [startDate, setStartDate] = useState(getGmt8DateString());
  const [endDate, setEndDate] = useState(getGmt8DateString());
  const [reason, setReason] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<RequestStatusFilter>('All');
  const [offInLieuStatusFilter, setOffInLieuStatusFilter] = useState<OffInLieuStatusFilter>('All');

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeDays, setNewTypeDays] = useState(14);
  const [newTypeCondition, setNewTypeCondition] = useState('Paid leave');
  const [newTypePolicyId, setNewTypePolicyId] = useState(STANDARD_POLICY_ID);
  const [newTypeCarryOverId, setNewTypeCarryOverId] = useState(STANDARD_CARRY_OVER_ID);

  const [newPolicyName, setNewPolicyName] = useState('');
  const [newCarryOverName, setNewCarryOverName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupPolicyId, setNewGroupPolicyId] = useState(STANDARD_POLICY_ID);
  const [newGroupCarryOverId, setNewGroupCarryOverId] = useState(STANDARD_CARRY_OVER_ID);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [assignmentEmployeeId, setAssignmentEmployeeId] = useState('');
  const [assignmentGroupId, setAssignmentGroupId] = useState('');
  const [assignmentEffectiveDate, setAssignmentEffectiveDate] = useState(getGmt8DateString());
  const [assignmentDates, setAssignmentDates] = useState<Record<string, string>>({});
  const [selectedWorkShiftGroupId, setSelectedWorkShiftGroupId] = useState(DEFAULT_WORK_SHIFT_GROUPS[0].id);
  const [newWorkShiftName, setNewWorkShiftName] = useState('');
  const [newWorkShiftDescription, setNewWorkShiftDescription] = useState('');
  const [workShiftAssignmentMode, setWorkShiftAssignmentMode] = useState<'single' | 'bulk'>('single');
  const [workShiftAssignmentEmployeeIds, setWorkShiftAssignmentEmployeeIds] = useState<string[]>([]);
  const [workShiftAssignmentGroupId, setWorkShiftAssignmentGroupId] = useState(DEFAULT_WORK_SHIFT_GROUPS[0].id);
  const [workShiftAssignmentEffectiveDate, setWorkShiftAssignmentEffectiveDate] = useState(getGmt8DateString());
  const [workShiftAssignmentEndDate, setWorkShiftAssignmentEndDate] = useState('');
  const [selectedPublicHolidayGroupId, setSelectedPublicHolidayGroupId] = useState(DEFAULT_PUBLIC_HOLIDAY_GROUP_ID);
  const [publicHolidayCategory, setPublicHolidayCategory] = useState<PublicHolidayCategory>('national');
  const [publicHolidayYear, setPublicHolidayYear] = useState(new Date().getFullYear());
  const [newPublicHolidayGroupName, setNewPublicHolidayGroupName] = useState('');
  const [newPublicHolidayName, setNewPublicHolidayName] = useState('');
  const [newPublicHolidayDate, setNewPublicHolidayDate] = useState(getGmt8DateString());
  const [newPublicHolidayObservedDate, setNewPublicHolidayObservedDate] = useState('');
  const [newPublicHolidayNotes, setNewPublicHolidayNotes] = useState('');

  const [offInLieuMode, setOffInLieuMode] = useState<OffInLieuSubmissionMode>('single');
  const [offInLieuEmployeeIds, setOffInLieuEmployeeIds] = useState<string[]>([]);
  const [isOffInLieuEmployeePickerOpen, setIsOffInLieuEmployeePickerOpen] = useState(false);
  const [offInLieuExpiryDate, setOffInLieuExpiryDate] = useState(addOneMonth(getGmt8DateString()));
  const [offInLieuEntries, setOffInLieuEntries] = useState<OffInLieuEntry[]>([]);
  const [offInLieuNotes, setOffInLieuNotes] = useState('');
  const [offInLieuCalendarDate, setOffInLieuCalendarDate] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  useEffect(() => {
    let cancelled = false;
    if (!activeEntityId) {
      setIsLoadingWorkspace(false);
      return () => {
      cancelled = true;
      };
    }

    setIsLoadingWorkspace(true);
    void loadLeaveWorkspace(activeEntityId)
      .then((workspace) => {
        if (cancelled) return;
        setRequests(workspace.requests);
        setLeaveConfigs(workspace.configs.map(normalizeLeaveConfig));
        setConditioningPolicies(workspace.policies.length > 0 ? workspace.policies : DEFAULT_LEAVE_CONDITIONING_POLICIES);
        setCarryOverSettings(workspace.carryOverSettings.length > 0 ? workspace.carryOverSettings : DEFAULT_CARRY_OVER_SETTINGS);
        setLeaveGroups(workspace.groups.length > 0 ? workspace.groups : DEFAULT_LEAVE_GROUPS);
        setAssignments(workspace.assignments);
        setWorkShiftGroups(workspace.workShiftGroups.length > 0 ? workspace.workShiftGroups : DEFAULT_WORK_SHIFT_GROUPS);
        setWorkShiftGroupDays(workspace.workShiftGroupDays.length > 0 ? workspace.workShiftGroupDays : DEFAULT_WORK_SHIFT_GROUP_DAYS);
        setEmployeeWorkShiftAssignments(workspace.employeeWorkShiftAssignments);
        setPublicHolidayGroups(workspace.publicHolidayGroups.length > 0 ? workspace.publicHolidayGroups : DEFAULT_PUBLIC_HOLIDAY_GROUPS);
        setPublicHolidays(workspace.publicHolidays.length > 0 ? workspace.publicHolidays : DEFAULT_PUBLIC_HOLIDAYS);
        setOffInLieuRequests(workspace.offInLieuRequests);
        setLedgerEntries(workspace.ledgerEntries);
        setPayrollDeductions(workspace.payrollDeductions);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingWorkspace(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeEntityId, refreshKey]);

  useEffect(() => {
    setSelectedEmployeeId((previous) => (
      activeEmployees.some((employee) => employee.id === previous)
        ? previous
        : activeEmployees[0]?.id || ''
    ));
  }, [activeEmployees]);

  useEffect(() => {
    setLeaveType((previous) => (
      leaveConfigs.some((config) => config.leaveType === previous && config.enabled !== false)
        ? previous
        : leaveConfigs.find((config) => config.enabled !== false)?.leaveType || ''
    ));
  }, [leaveConfigs]);

  useEffect(() => {
    setAssignmentDates(activeEntityId ? readScopedJson(`leave_assignment_dates_${activeEntityId}`, {}) : {});
  }, [activeEntityId]);

  useEffect(() => {
    setAssignmentEmployeeId((previous) => (
      activeEmployees.some((employee) => employee.id === previous)
        ? previous
        : activeEmployees[0]?.id || ''
    ));
    setAssignmentGroupId((previous) => (
      leaveGroups.some((group) => group.enabled && group.id === previous)
        ? previous
        : leaveGroups.find((group) => group.enabled)?.id || ''
    ));
    setSelectedGroupId((previous) => (
      leaveGroups.some((group) => group.id === previous)
        ? previous
        : leaveGroups[0]?.id || ''
    ));
    setSelectedWorkShiftGroupId((previous) => (
      workShiftGroups.some((group) => group.id === previous)
        ? previous
        : workShiftGroups[0]?.id || ''
    ));
    setWorkShiftAssignmentGroupId((previous) => (
      workShiftGroups.some((group) => group.enabled && group.id === previous)
        ? previous
        : workShiftGroups.find((group) => group.enabled)?.id || ''
    ));
    setSelectedPublicHolidayGroupId((previous) => (
      publicHolidayGroups.some((group) => group.id === previous)
        ? previous
        : publicHolidayGroups[0]?.id || ''
    ));
  }, [activeEmployees, leaveGroups, workShiftGroups, publicHolidayGroups]);

  const saveRequests = (next: LeaveRequest[]) => {
    setRequests(next);
    if (activeEntityId) writeScopedJson(`leave_requests_${activeEntityId}`, next);
    persistWorkspace({ requests: next });
  };

  const saveConfigs = (next: LeaveConfig[]) => {
    setLeaveConfigs(next);
    if (activeEntityId) writeScopedJson(`leave_configs_${activeEntityId}`, next);
    persistWorkspace({ configs: next });
  };

  const savePolicies = (next: LeaveConditioningPolicy[]) => {
    setConditioningPolicies(next);
    if (activeEntityId) writeScopedJson(`leave_conditioning_policies_${activeEntityId}`, next);
    persistWorkspace({ policies: next });
  };

  const saveCarryOver = (next: CarryOverLeaveBalanceSettings[]) => {
    setCarryOverSettings(next);
    if (activeEntityId) writeScopedJson(`leave_carry_over_settings_${activeEntityId}`, next);
    persistWorkspace({ carryOverSettings: next });
  };

  const saveGroups = (next: LeaveGroup[], nextAssignments = assignments) => {
    setLeaveGroups(next);
    if (activeEntityId) writeScopedJson(`leave_groups_${activeEntityId}`, next);
    persistWorkspace({ groups: next, assignments: nextAssignments });
  };

  const saveAssignments = (next: EmployeeLeaveGroupAssignment[]) => {
    setAssignments(next);
    if (activeEntityId) writeScopedJson(`leave_group_assignments_${activeEntityId}`, next);
    persistWorkspace({ assignments: next });
  };

  const saveOffInLieuRequests = (next: OffInLieuRequest[]) => {
    setOffInLieuRequests(next);
    if (activeEntityId) writeScopedJson(`off_in_lieu_requests_${activeEntityId}`, next);
    persistWorkspace({ offInLieuRequests: next });
  };

  const persistWorkspace = (overrides: Partial<{
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
  }> = {}) => {
    if (!activeEntityId) return;
    const workspace = {
      configs: overrides.configs || leaveConfigs,
      policies: overrides.policies || conditioningPolicies,
      carryOverSettings: overrides.carryOverSettings || carryOverSettings,
      groups: overrides.groups || leaveGroups,
      assignments: overrides.assignments || assignments,
      workShiftGroups: overrides.workShiftGroups || workShiftGroups,
      workShiftGroupDays: overrides.workShiftGroupDays || workShiftGroupDays,
      employeeWorkShiftAssignments: overrides.employeeWorkShiftAssignments || employeeWorkShiftAssignments,
      publicHolidayGroups: overrides.publicHolidayGroups || publicHolidayGroups,
      publicHolidays: overrides.publicHolidays || publicHolidays,
      requests: overrides.requests || requests,
      offInLieuRequests: overrides.offInLieuRequests || offInLieuRequests,
      ledgerEntries: overrides.ledgerEntries || ledgerEntries,
      payrollDeductions: overrides.payrollDeductions || payrollDeductions,
      source: 'local' as const
    };
    void persistLeaveWorkspace(activeEntityId, workspace).catch((error) => {
      console.warn('[Leave Management] Supabase save failed; local fallback remains active:', error);
    });
  };

  const currentEmployee = activeEmployees.find((employee) => employee.id === selectedEmployeeId);
  const enabledLeaveConfigs = leaveConfigs.filter((config) => config.enabled !== false);
  const selectedEmployeeBalances = calculateLeaveBalances({
    employeeId: selectedEmployeeId,
    configs: leaveConfigs,
    groups: leaveGroups,
    requests,
    ledgerEntries,
    employee: currentEmployee,
  });
  const policyForLeaveType = conditioningPolicies.find(
    (policy) => policy.id === leaveConfigs.find((config) => config.leaveType === leaveType)?.policyId
  ) || conditioningPolicies[0];

  const filteredRequests = requestStatusFilter === 'All'
    ? requests
    : requests.filter((request) => request.status === requestStatusFilter);

  const filteredOffInLieuRequests = offInLieuStatusFilter === 'All'
    ? offInLieuRequests
    : offInLieuRequests.filter((request) => request.status === offInLieuStatusFilter);

  const pendingLeaveCount = requests.filter((request) => request.status === 'Pending').length;
  const pendingOffInLieuCount = offInLieuRequests.filter((request) => request.status === 'Pending').length;
  const visibleAssignments = assignments
    .filter((assignment) => activeEmployees.some((employee) => employee.id === assignment.employeeId))
    .map((assignment) => ({
      ...assignment,
      assignedAt: assignment.assignedAt || assignmentDates[`${assignment.groupId}-${assignment.employeeId}`] || getGmt8DateString(),
    }))
    .filter((assignment) => leaveGroups.some((group) => group.id === assignment.groupId));
  const selectedOffInLieuEmployees = activeEmployees.filter((employee) => offInLieuEmployeeIds.includes(employee.id));
  const offInLieuDaysPerEmployee = roundToHalfDay(
    offInLieuEntries.reduce((total, entry) => total + entry.eligibleDays, 0)
  );
  const offInLieuTotalDays = roundToHalfDay(offInLieuDaysPerEmployee * selectedOffInLieuEmployees.length);
  const offInLieuCalendarDays = useMemo(
    () => buildCalendarDays(offInLieuCalendarDate.year, offInLieuCalendarDate.month),
    [offInLieuCalendarDate]
  );

  const updateConfig = (id: string, field: keyof LeaveConfig, value: string | number | boolean) => {
    saveConfigs(leaveConfigs.map((config) => config.id === id ? { ...config, [field]: value } : config));
  };

  const updatePolicy = (
    id: string,
    field: keyof LeaveConditioningPolicy,
    value: string | boolean | number
  ) => {
    savePolicies(conditioningPolicies.map((policy) => policy.id === id ? { ...policy, [field]: value } : policy));
  };

  const updateCarryOver = (
    id: string,
    field: keyof CarryOverLeaveBalanceSettings,
    value: string | number | boolean
  ) => {
    saveCarryOver(carryOverSettings.map((setting) => setting.id === id ? { ...setting, [field]: value } : setting));
  };

  const getWorkShiftGroupForEmployee = (employeeId: string, effectiveDate: string) => {
    const assignment = [...employeeWorkShiftAssignments]
      .filter((item) => (
        item.employeeId === employeeId
        && item.active
        && item.effectiveDate <= effectiveDate
        && (!item.endDate || item.endDate >= effectiveDate)
      ))
      .sort((left, right) => right.effectiveDate.localeCompare(left.effectiveDate))[0];
    return workShiftGroups.find((group) => group.id === assignment?.groupId) || workShiftGroups[0];
  };

  const getPublicHolidayDatesForEmployee = (employeeId: string) => {
    const holidayGroupIds = leaveGroups
      .filter((group) => group.enabled && group.assignedEmployeeIds.includes(employeeId))
      .flatMap((group) => group.publicHolidayGroupIds || [])
      .slice(0, 2);
    const selectedHolidayGroupIds = holidayGroupIds.length > 0
      ? holidayGroupIds
      : [DEFAULT_PUBLIC_HOLIDAY_GROUP_ID];
    return publicHolidays
      .filter((holiday) => holiday.enabled && selectedHolidayGroupIds.includes(holiday.groupId))
      .flatMap((holiday) => [holiday.holidayDate, holiday.observedDate].filter(Boolean) as string[]);
  };

  const applyLeaveGroupAssignments = (groupId: string, employeeId: string, checked: boolean): boolean => {
    const assignmentKey = `${groupId}-${employeeId}`;
    const existing = assignments.find((assignment) => assignment.id === assignmentKey);
    const nextAssignments = existing
      ? assignments.map((assignment) => assignment.id === assignmentKey
        ? {
          ...assignment,
          active: checked,
          assignedAt: assignment.assignedAt || assignmentDates[assignmentKey] || getGmt8DateString(),
        }
        : assignment)
      : [
        ...assignments,
        {
          id: assignmentKey,
          entityId: activeEntityId,
          employeeId,
          groupId,
          active: checked,
          assignedAt: assignmentDates[assignmentKey] || getGmt8DateString(),
        },
      ];
    const next = leaveGroups.map((group) => ({
      ...group,
      assignedEmployeeIds: nextAssignments
        .filter((assignment) => assignment.groupId === group.id && assignment.active)
        .map((assignment) => assignment.employeeId),
    }));
    const duplicates = findDuplicateAssignedLeaveTypes(next, employeeId);
    if (checked && duplicates.length > 0) {
      const duplicateNames = duplicates
        .map((id) => leaveConfigs.find((config) => config.id === id)?.leaveType || id)
        .join(', ');
      onShowNotification(
        'Leave Group Conflict',
        `This employee already has an active group containing: ${duplicateNames}. Remove the duplicate leave type before assigning this group.`,
      );
      return false;
    }
    saveGroups(next, nextAssignments);
    saveAssignments(nextAssignments);
    return true;
  };

  const assignLeaveGroup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignmentEmployeeId || !assignmentGroupId) {
      onShowNotification('Validation Error', 'Select an active employee and leave group before assigning.');
      return;
    }
    const applied = applyLeaveGroupAssignments(assignmentGroupId, assignmentEmployeeId, true);
    if (!applied) return;
    const assignmentKey = `${assignmentGroupId}-${assignmentEmployeeId}`;
    const nextDates = { ...assignmentDates, [assignmentKey]: assignmentEffectiveDate };
    setAssignmentDates(nextDates);
    if (activeEntityId) writeScopedJson(`leave_assignment_dates_${activeEntityId}`, nextDates);
    onShowNotification(
      'Leave Group Assigned',
      `${leaveGroups.find((group) => group.id === assignmentGroupId)?.name || 'Leave group'} was assigned to ${
        activeEmployees.find((employee) => employee.id === assignmentEmployeeId)?.name || 'the employee'
      } effective ${formatToDDMMMYYYY(assignmentEffectiveDate)}.`
    );
  };

  const disableLeaveGroupAssignment = async (groupId: string, employeeId: string) => {
    const employee = activeEmployees.find((item) => item.id === employeeId);
    const group = leaveGroups.find((item) => item.id === groupId);
    const confirmed = await confirmAction({
      title: 'Disable Leave Group Assignment',
      message: `Disable ${group?.name || 'this leave group'} for ${employee?.name || 'this employee'}? Their historical leave records will remain unchanged.`,
      type: 'danger',
      confirmLabel: 'Disable Assignment',
    });
    if (!confirmed) return;
    if (applyLeaveGroupAssignments(groupId, employeeId, false)) {
      onShowNotification('Assignment Disabled', `${group?.name || 'Leave group'} is no longer active for ${employee?.name || 'the employee'}.`);
    }
  };

  const calculateDays = (start: string, end: string) => calculateLeaveDateDays(
    start,
    end,
    policyForLeaveType,
    selectedEmployeeId ? getPublicHolidayDatesForEmployee(selectedEmployeeId) : [],
    selectedEmployeeId ? getWorkShiftGroupForEmployee(selectedEmployeeId, start) : workShiftGroups[0],
    workShiftGroupDays,
  );

  const handleApplyLeave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEmployeeId || !leaveType || !reason.trim()) {
      onShowNotification('Validation Error', 'Select an active employee, leave type, and reason before submitting.');
      return;
    }
    const totalDays = calculateDays(startDate, endDate);
    if (totalDays <= 0) {
      onShowNotification('Validation Error', 'Please choose a valid leave date range.');
      return;
    }
    const employee = activeEmployees.find((item) => item.id === selectedEmployeeId);
    if (!employee) return;

    const newRequest: LeaveRequest = {
      id: `LR-${Date.now()}`,
      entityId: activeEntityId,
      employeeId: employee.id,
      employeeName: employee.name,
      leaveTypeId: leaveConfigs.find((config) => config.leaveType === leaveType)?.id,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason: reason.trim(),
      status: 'Pending',
      appliedDate: getGmt8DateString()
    };

    saveRequests([newRequest, ...requests]);
    setReason('');
    onShowNotification('Leave Request Submitted', `${totalDays} day(s) of ${leaveType} are pending review for ${employee.name}.`);
  };

  const updateLeaveRequestStatus = async (id: string, status: Exclude<LeaveRequestStatus, 'Pending'>) => {
    const request = requests.find((item) => item.id === id);
    if (!request) return;
    const confirmed = await confirmAction({
      title: status === 'Approved' ? 'Approve Leave Request' : 'Reject Leave Request',
      message: status === 'Approved'
        ? `Approve ${request.leaveType} for ${request.employeeName} from ${formatToDDMMMYYYY(request.startDate)} to ${formatToDDMMMYYYY(request.endDate)}?`
        : `Reject this leave request for ${request.employeeName}?`,
      type: status === 'Approved' ? 'info' : 'danger',
      confirmLabel: status === 'Approved' ? 'Approve Request' : 'Reject Request',
    });
    if (!confirmed) return;
    const updatedRequest = {
      ...request,
      status,
      approvedAt: status === 'Approved' ? new Date().toISOString() : undefined,
      approvedBy: status === 'Approved' ? 'HR Admin' : undefined,
    };
    const nextRequests = requests.map((item) => item.id === id ? updatedRequest : item);
    let nextLedgerEntries = ledgerEntries;
    let nextPayrollDeductions = payrollDeductions;

    if (status === 'Approved' && !ledgerEntries.some((entry) => entry.sourceId === request.id)) {
      const config = leaveConfigs.find((item) => item.id === request.leaveTypeId || item.leaveType === request.leaveType);
      const policy = conditioningPolicies.find((item) => item.id === config?.policyId) || conditioningPolicies[0];
      const employee = activeEmployees.find((item) => item.id === request.employeeId);
      const approvedPreviously = requests
        .filter((item) => item.employeeId === request.employeeId && item.leaveType === request.leaveType && item.status === 'Approved')
        .reduce((sum, item) => sum + item.totalDays, 0);
      const entitlement = config?.daysEntitled || 0;
      const excessDays = Math.max(0, approvedPreviously + request.totalDays - entitlement);
      if (excessDays > 0 && policy?.excessLeaveHandling === 'reject') {
        onShowNotification(
          'Leave Exceeds Entitlement',
          `This request exceeds the ${entitlement}-day entitlement by ${excessDays} day(s) and the active policy rejects excess leave.`,
        );
        return;
      }
      const isReplacementLeave = config?.systemManaged === true || request.leaveType === 'Replacement Leave';
      if (isReplacementLeave) {
        const consumption = consumeReplacementLeaveFIFO(
          ledgerEntries.filter((entry) => entry.employeeId === request.employeeId && entry.leaveTypeId === (config?.id || request.leaveTypeId)),
          request.totalDays,
          request.appliedDate,
        );
        if (consumption.remaining > 0) {
          onShowNotification(
            'Insufficient Replacement Leave',
            `This request needs ${request.totalDays} day(s), but only ${consumption.consumed} day(s) of unexpired Replacement Leave credit are available.`,
          );
          return;
        }
        nextLedgerEntries = [
          ...ledgerEntries,
          ...consumption.debits.map((debit) => ({
            ...debit,
            entityId: activeEntityId,
            sourceId: request.id,
            leaveTypeId: config?.id || request.leaveTypeId || REPLACEMENT_LEAVE_TYPE_ID,
            leaveType: 'Replacement Leave',
          })),
        ];
      }
      const deductionDays = isReplacementLeave
        ? 0
        : policy?.paidTreatment === 'unpaid' || policy?.payrollDeductionBehavior === 'deduct_all'
        ? request.totalDays
        : policy?.payrollDeductionBehavior === 'deduct_excess'
          ? excessDays
          : 0;
      const leaveTypeId = config?.id || request.leaveTypeId || request.leaveType;
      if (!isReplacementLeave) {
        const debit: LeaveBalanceLedgerEntry = {
          id: `LBD-${request.id}`,
          entityId: activeEntityId,
          employeeId: request.employeeId,
          leaveTypeId,
          leaveType: request.leaveType,
          entryType: 'debit',
          sourceType: 'leave_request',
          sourceId: request.id,
          quantity: request.totalDays,
          occurredAt: request.appliedDate,
          notes: `Approved by HR Admin${excessDays > 0 ? `; ${excessDays} excess day(s)` : ''}`,
        };
        nextLedgerEntries = [...ledgerEntries, debit];
      }

      if (deductionDays > 0 && employee) {
        const appliedDate = new Date(`${request.appliedDate}T00:00:00`);
        const fallbackMonth = request.payrollMonth || (Number.isNaN(appliedDate.getTime()) ? new Date().getMonth() + 1 : appliedDate.getMonth() + 1);
        const fallbackYear = request.payrollYear || (Number.isNaN(appliedDate.getTime()) ? new Date().getFullYear() : appliedDate.getFullYear());
        const periods = splitLeaveDaysAcrossPayrollMonths({
          startDate: request.startDate,
          endDate: request.endDate,
          totalDays: deductionDays,
        });
        const effectivePeriods = periods.length > 0
          ? periods
          : [{ payrollMonth: fallbackMonth, payrollYear: fallbackYear, leaveDays: deductionDays }];
        const deductions = effectivePeriods.map((period, index) => {
          const deductionBase = calculatePayrollDeduction({
            employee,
            leaveDays: period.leaveDays,
            payrollMonth: period.payrollMonth,
            payrollYear: period.payrollYear,
          });
          return {
            ...deductionBase,
            id: `LPD-${request.id}-${index + 1}`,
            entityId: activeEntityId,
            employeeId: request.employeeId,
            leaveRequestId: request.id,
            reason: policy?.paidTreatment === 'unpaid' ? 'Approved unpaid leave' : 'Approved excess leave',
          };
        });
        const deductionAmount = deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
        nextPayrollDeductions = [
          ...payrollDeductions.filter((item) => item.leaveRequestId !== request.id),
          ...deductions,
        ];
        void onUpdateEmployee?.(employee.id, {
          unpaidLeave: Math.round(((employee.unpaidLeave || 0) + deductionAmount) * 100) / 100,
        });
      }
    }

    setRequests(nextRequests);
    setLedgerEntries(nextLedgerEntries);
    setPayrollDeductions(nextPayrollDeductions);
    if (activeEntityId) {
      writeScopedJson(`leave_requests_${activeEntityId}`, nextRequests);
      writeScopedJson(`leave_balance_ledger_${activeEntityId}`, nextLedgerEntries);
      writeScopedJson(`leave_payroll_deductions_${activeEntityId}`, nextPayrollDeductions);
    }
    persistWorkspace({
      requests: nextRequests,
      ledgerEntries: nextLedgerEntries,
      payrollDeductions: nextPayrollDeductions,
    });
    onShowNotification(`Request ${status}`, `Leave request ${id} has been marked as ${status.toLowerCase()}.`);
  };

  const addPolicy = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newPolicyName.trim();
    if (!name) {
      onShowNotification('Validation Error', 'Please provide a name for the conditioning leave policy.');
      return;
    }
    const nextPolicy: LeaveConditioningPolicy = {
      ...DEFAULT_LEAVE_CONDITIONING_POLICIES[0],
      id: `leave-policy-${Date.now()}`,
      name
    };
    savePolicies([...conditioningPolicies, nextPolicy]);
    setNewPolicyName('');
    onShowNotification('Policy Added', `${name} is ready to configure.`);
  };

  const addCarryOverSetting = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newCarryOverName.trim();
    if (!name) {
      onShowNotification('Validation Error', 'Please provide a name for the carry-over setting.');
      return;
    }
    const nextSetting: CarryOverLeaveBalanceSettings = {
      ...DEFAULT_CARRY_OVER_SETTINGS[0],
      id: `leave-carry-over-${Date.now()}`,
      name
    };
    saveCarryOver([...carryOverSettings, nextSetting]);
    setNewCarryOverName('');
    onShowNotification('Carry-Over Setting Added', `${name} is ready to configure.`);
  };

  const addLeaveType = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newTypeName.trim();
    if (!name) {
      onShowNotification('Validation Error', 'Please specify a leave type name.');
      return;
    }

    const nextConfig: LeaveConfig = {
      id: `leave-type-${Date.now()}`,
      code: newTypeCode.trim().toUpperCase() || name.slice(0, 3).toUpperCase(),
      leaveType: name,
      daysEntitled: Math.max(0, Number(newTypeDays) || 0),
      leaveGroup: 'Unassigned',
      condition: newTypeCondition.trim() || 'Paid leave',
      isDefault: false,
      enabled: true,
      policyId: newTypePolicyId,
      carryOverId: newTypeCarryOverId
    };

    saveConfigs([...leaveConfigs, nextConfig]);
    setNewTypeName('');
    setNewTypeCode('');
    setNewTypeDays(14);
    setNewTypeCondition('Paid leave');
    onShowNotification('Leave Type Added', `${name} has been added to the leave type catalogue.`);
  };

  const addLeaveGroup = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newGroupName.trim();
    if (!name) {
      onShowNotification('Validation Error', 'Please specify a leave group name.');
      return;
    }
    const nextGroup: LeaveGroup = {
      id: `leave-group-${Date.now()}`,
      name,
      description: newGroupDescription.trim() || 'Custom employee leave group.',
      policyId: newGroupPolicyId,
      carryOverId: newGroupCarryOverId,
      publicHolidayGroupIds: [DEFAULT_PUBLIC_HOLIDAY_GROUP_ID],
      leaveTypeIds: [],
      assignedEmployeeIds: [],
      enabled: true
    };
    saveGroups([...leaveGroups, nextGroup]);
    setNewGroupName('');
    setNewGroupDescription('');
    onShowNotification('Leave Group Added', `${name} can now be assigned to active employees.`);
  };

  const getWorkShiftDays = (groupId: string) => normalizeWorkShiftGroupDays(workShiftGroupDays, groupId);

  const saveWorkShiftData = (nextGroups: WorkShiftGroup[], nextDays: WorkShiftGroupDay[]) => {
    setWorkShiftGroups(nextGroups);
    setWorkShiftGroupDays(nextDays);
    if (activeEntityId) {
      writeScopedJson(`work_shift_groups_${activeEntityId}`, nextGroups);
      writeScopedJson(`work_shift_group_days_${activeEntityId}`, nextDays);
    }
    persistWorkspace({
      workShiftGroups: nextGroups,
      workShiftGroupDays: nextDays,
    });
  };

  const updateWorkShiftDay = (
    groupId: string,
    weekday: number,
    field: 'startTime' | 'endTime' | 'dayType',
    value: string,
  ) => {
    const currentDays = getWorkShiftDays(groupId);
    const nextDays = currentDays.map((day) => {
      if (day.weekday !== weekday) return day;
      const nextDay = {
        ...day,
        [field]: value,
      } as WorkShiftGroupDay;
      const dayType = field === 'dayType'
        ? value as WorkShiftDayType
        : nextDay.dayType;
      const startTime = dayType === 'half_day'
        ? nextDay.startTime || day.startTime || '09:00'
        : nextDay.startTime;
      const endTime = dayType === 'half_day' && (field === 'dayType' || field === 'startTime')
        ? addHoursToTime(startTime, 4)
        : nextDay.endTime || (dayType === 'half_day' ? addHoursToTime(startTime, 4) : '');
      return {
        ...nextDay,
        dayType,
        isWorkDay: dayType !== 'rest',
        startTime,
        endTime,
        actualHours: calculateShiftHours(startTime, endTime, dayType),
      };
    });
    const mergedDays = [
      ...workShiftGroupDays.filter((day) => day.groupId !== groupId),
      ...nextDays,
    ];
    const weeklyHours = calculateWorkShiftWeeklyHours(nextDays, groupId);
    const nextGroups = workShiftGroups.map((group) => group.id === groupId
      ? { ...group, weeklyHours, weeklyHoursWarning: weeklyHours > 45 }
      : group);
    saveWorkShiftData(nextGroups, mergedDays);
  };

  const updateWorkShiftGroup = (
    groupId: string,
    field: 'name' | 'description' | 'enabled',
    value: string | boolean,
  ) => {
    const nextGroups = workShiftGroups.map((group) => group.id === groupId
      ? { ...group, [field]: value }
      : group);
    saveWorkShiftData(nextGroups, workShiftGroupDays);
  };

  const addWorkShiftGroup = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newWorkShiftName.trim();
    if (!name) {
      onShowNotification('Validation Error', 'Please provide a name for the Work & Shift Group.');
      return;
    }
    if (workShiftGroups.some((group) => group.name.trim().toLowerCase() === name.toLowerCase())) {
      onShowNotification('Validation Error', 'A Work & Shift Group with this name already exists.');
      return;
    }
    const id = `work-shift-${Date.now()}`;
    const days = normalizeWorkShiftGroupDays([], id);
    const weeklyHours = calculateWorkShiftWeeklyHours(days, id);
    const nextGroup: WorkShiftGroup = {
      id,
      entityId: activeEntityId,
      name,
      description: newWorkShiftDescription.trim() || 'Custom working schedule.',
      enabled: true,
      weeklyHours,
      weeklyHoursWarning: weeklyHours > 45,
    };
    saveWorkShiftData([...workShiftGroups, nextGroup], [...workShiftGroupDays, ...days]);
    setSelectedWorkShiftGroupId(id);
    setWorkShiftAssignmentGroupId(id);
    setNewWorkShiftName('');
    setNewWorkShiftDescription('');
    onShowNotification('Work & Shift Group Added', `${name} is ready to configure.`);
  };

  const saveWorkShiftGroup = (groupId: string) => {
    const group = workShiftGroups.find((item) => item.id === groupId);
    const days = getWorkShiftDays(groupId);
    if (!group) return;
    if (!days.some((day) => day.dayType !== 'rest')) {
      onShowNotification('Validation Error', 'A Work & Shift Group must contain at least one Work day.');
      return;
    }
    const invalidDay = days.find((day) => (
      day.dayType !== 'rest'
      && (!day.startTime || !day.endTime || day.startTime === day.endTime)
    ));
    if (invalidDay) {
      onShowNotification('Validation Error', `${WEEKDAYS[invalidDay.weekday]} needs different start and end times.`);
      return;
    }
    const weeklyHours = calculateWorkShiftWeeklyHours(days, groupId);
    const nextGroups = workShiftGroups.map((item) => item.id === groupId
      ? { ...item, weeklyHours, weeklyHoursWarning: weeklyHours > 45 }
      : item);
    saveWorkShiftData(nextGroups, [
      ...workShiftGroupDays.filter((day) => day.groupId !== groupId),
      ...days,
    ]);
    onShowNotification(
      'Work & Shift Group Saved',
      `${group.name} totals ${weeklyHours.toFixed(2)} hours per week${weeklyHours > 45 ? ' and exceeds the 45-hour weekly warning threshold.' : '.'}`,
    );
  };

  const deleteWorkShiftGroup = async (groupId: string) => {
    const group = workShiftGroups.find((item) => item.id === groupId);
    if (!group || group.id === DEFAULT_WORK_SHIFT_GROUPS[0].id) {
      onShowNotification('Work & Shift Group', 'The default Malaysia schedule cannot be deleted.');
      return;
    }
    const confirmed = await confirmAction({
      title: 'Delete Work & Shift Group',
      message: `Delete ${group.name}? Existing historical assignments will remain in the record.`,
      type: 'danger',
      confirmLabel: 'Delete Group',
    });
    if (!confirmed) return;
    const nextGroups = workShiftGroups.filter((item) => item.id !== groupId);
    const nextDays = workShiftGroupDays.filter((day) => day.groupId !== groupId);
    const nextAssignments = employeeWorkShiftAssignments.filter((assignment) => assignment.groupId !== groupId);
    setEmployeeWorkShiftAssignments(nextAssignments);
    if (activeEntityId) writeScopedJson(`employee_work_shift_assignments_${activeEntityId}`, nextAssignments);
    saveWorkShiftData(nextGroups, nextDays);
    persistWorkspace({ employeeWorkShiftAssignments: nextAssignments });
    setSelectedWorkShiftGroupId(nextGroups[0]?.id || '');
    setWorkShiftAssignmentGroupId(nextGroups.find((item) => item.enabled)?.id || '');
    onShowNotification('Work & Shift Group Deleted', `${group.name} was removed.`);
  };

  const subtractOneDay = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const assignWorkShiftGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    const employeeIds = workShiftAssignmentMode === 'single'
      ? workShiftAssignmentEmployeeIds.slice(0, 1)
      : [...new Set(workShiftAssignmentEmployeeIds)];
    const group = workShiftGroups.find((item) => item.id === workShiftAssignmentGroupId);
    if (employeeIds.length === 0 || !group) {
      onShowNotification('Validation Error', 'Select at least one employee and an active Work & Shift Group.');
      return;
    }
    if (!workShiftAssignmentEffectiveDate) {
      onShowNotification('Validation Error', 'Select an effective date for the assignment.');
      return;
    }
    if (workShiftAssignmentEndDate && workShiftAssignmentEndDate < workShiftAssignmentEffectiveDate) {
      onShowNotification('Validation Error', 'The assignment end date cannot be earlier than the effective date.');
      return;
    }

    const conflicts = employeeIds.flatMap((employeeId) => employeeWorkShiftAssignments
      .filter((assignment) => (
        assignment.employeeId === employeeId
        && assignment.active
        && assignment.groupId !== group.id
        && (assignment.endDate ? assignment.endDate >= workShiftAssignmentEffectiveDate : true)
      ))
      .map(() => activeEmployees.find((employee) => employee.id === employeeId)?.name || employeeId));
    if (conflicts.length > 0) {
      const confirmed = await confirmAction({
        title: workShiftAssignmentMode === 'bulk' ? 'Replace Work & Shift Assignments' : 'Replace Work & Shift Assignment',
        message: `${[...new Set(conflicts)].join(', ')} already have an active schedule. End the conflicting assignment before applying ${group.name}?`,
        type: 'warning',
        confirmLabel: 'Replace Assignment',
      });
      if (!confirmed) return;
    }

    let nextAssignments = [...employeeWorkShiftAssignments];
    const createdAt = new Date().toISOString();
    employeeIds.forEach((employeeId) => {
      nextAssignments = nextAssignments.map((assignment) => {
        if (
          assignment.employeeId !== employeeId
          || !assignment.active
          || assignment.endDate && assignment.endDate < workShiftAssignmentEffectiveDate
        ) {
          return assignment;
        }
        if (assignment.effectiveDate < workShiftAssignmentEffectiveDate) {
          return {
            ...assignment,
            endDate: subtractOneDay(workShiftAssignmentEffectiveDate),
          };
        }
        return { ...assignment, active: false };
      });
      nextAssignments.push({
        id: `work-shift-assignment-${Date.now()}-${employeeId}`,
        entityId: activeEntityId,
        employeeId,
        groupId: group.id,
        effectiveDate: workShiftAssignmentEffectiveDate,
        endDate: workShiftAssignmentEndDate || undefined,
        active: true,
        assignedAt: createdAt,
      });
    });

    setEmployeeWorkShiftAssignments(nextAssignments);
    if (activeEntityId) writeScopedJson(`employee_work_shift_assignments_${activeEntityId}`, nextAssignments);
    persistWorkspace({ employeeWorkShiftAssignments: nextAssignments });
    onShowNotification(
      'Work & Shift Group Assigned',
      `${group.name} was assigned to ${employeeIds.length} employee${employeeIds.length === 1 ? '' : 's'} from ${formatToDDMMMYYYY(workShiftAssignmentEffectiveDate)}.`,
    );
    setWorkShiftAssignmentEmployeeIds([]);
    setWorkShiftAssignmentEndDate('');
  };

  const updateGroupPublicHolidaySelection = (groupId: string, holidayGroupId: string, checked: boolean) => {
    const group = leaveGroups.find((item) => item.id === groupId);
    if (!group) return;
    const currentIds = [...new Set(group.publicHolidayGroupIds || [DEFAULT_PUBLIC_HOLIDAY_GROUP_ID])];
    if (checked && !currentIds.includes(holidayGroupId) && currentIds.length >= 2) {
      onShowNotification('Public Holiday Limit', 'Each Leave Group can select a maximum of two Public Holiday Groups.');
      return;
    }
    const nextIds = checked
      ? [...currentIds, holidayGroupId]
      : currentIds.filter((id) => id !== holidayGroupId);
    saveGroups(leaveGroups.map((item) => item.id === groupId
      ? { ...item, publicHolidayGroupIds: nextIds.length > 0 ? nextIds : [DEFAULT_PUBLIC_HOLIDAY_GROUP_ID] }
      : item));
  };

  const updatePublicHolidayGroup = (
    groupId: string,
    field: 'name' | 'category' | 'stateCode' | 'enabled',
    value: string | boolean,
  ) => {
    const nextGroups = publicHolidayGroups.map((group) => group.id === groupId
      ? { ...group, [field]: value }
      : group);
    setPublicHolidayGroups(nextGroups);
    if (activeEntityId) writeScopedJson(`public_holiday_groups_${activeEntityId}`, nextGroups);
    persistWorkspace({ publicHolidayGroups: nextGroups });
  };

  const addPublicHolidayGroup = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newPublicHolidayGroupName.trim();
    if (!name) {
      onShowNotification('Validation Error', 'Please provide a public holiday group name.');
      return;
    }
    if (publicHolidayGroups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
      onShowNotification('Validation Error', 'A public holiday group with this name already exists.');
      return;
    }
    const id = `public-holiday-group-${Date.now()}`;
    const nextGroups = [
      ...publicHolidayGroups,
      {
        id,
        entityId: activeEntityId,
        name,
        category: publicHolidayCategory,
        enabled: true,
      },
    ];
    setPublicHolidayGroups(nextGroups);
    setSelectedPublicHolidayGroupId(id);
    if (activeEntityId) writeScopedJson(`public_holiday_groups_${activeEntityId}`, nextGroups);
    persistWorkspace({ publicHolidayGroups: nextGroups });
    setNewPublicHolidayGroupName('');
    onShowNotification('Public Holiday Group Added', `${name} is ready for yearly holiday records.`);
  };

  const updatePublicHoliday = (
    holidayId: string,
    field: 'name' | 'holidayDate' | 'observedDate' | 'notes' | 'enabled',
    value: string | boolean,
  ) => {
    const nextHolidays = publicHolidays.map((holiday) => holiday.id === holidayId
      ? {
        ...holiday,
        [field]: value,
        year: field === 'holidayDate' ? Number(String(value).slice(0, 4)) : holiday.year,
      }
      : holiday);
    setPublicHolidays(nextHolidays);
    if (activeEntityId) writeScopedJson(`public_holidays_${activeEntityId}`, nextHolidays);
    persistWorkspace({ publicHolidays: nextHolidays });
  };

  const addPublicHoliday = (event: React.FormEvent) => {
    event.preventDefault();
    const group = publicHolidayGroups.find((item) => item.id === selectedPublicHolidayGroupId);
    if (!group || !newPublicHolidayName.trim() || !newPublicHolidayDate) {
      onShowNotification('Validation Error', 'Select a holiday group and provide a holiday name and date.');
      return;
    }
    const year = Number(newPublicHolidayDate.slice(0, 4));
    const nextHoliday: PublicHoliday = {
      id: `public-holiday-${Date.now()}`,
      entityId: activeEntityId,
      groupId: group.id,
      name: newPublicHolidayName.trim(),
      holidayDate: newPublicHolidayDate,
      observedDate: newPublicHolidayObservedDate || undefined,
      year,
      notes: newPublicHolidayNotes.trim(),
      enabled: true,
    };
    const nextHolidays = [nextHoliday, ...publicHolidays];
    setPublicHolidays(nextHolidays);
    if (activeEntityId) writeScopedJson(`public_holidays_${activeEntityId}`, nextHolidays);
    persistWorkspace({ publicHolidays: nextHolidays });
    setPublicHolidayYear(year);
    setNewPublicHolidayName('');
    setNewPublicHolidayObservedDate('');
    setNewPublicHolidayNotes('');
    onShowNotification('Public Holiday Added', `${nextHoliday.name} was added to ${group.name}.`);
  };

  const deletePublicHoliday = async (holidayId: string) => {
    const holiday = publicHolidays.find((item) => item.id === holidayId);
    if (!holiday) return;
    const confirmed = await confirmAction({
      title: 'Delete Public Holiday',
      message: `Delete ${holiday.name} from the holiday calendar?`,
      type: 'danger',
      confirmLabel: 'Delete Holiday',
    });
    if (!confirmed) return;
    const nextHolidays = publicHolidays.filter((item) => item.id !== holidayId);
    setPublicHolidays(nextHolidays);
    if (activeEntityId) writeScopedJson(`public_holidays_${activeEntityId}`, nextHolidays);
    persistWorkspace({ publicHolidays: nextHolidays });
    onShowNotification('Public Holiday Deleted', `${holiday.name} was removed.`);
  };

  const updateOffInLieuEntry = (
    id: string,
    field: keyof Pick<OffInLieuEntry, 'date' | 'startTime' | 'endTime'>,
    value: string
  ) => {
    setOffInLieuEntries((entries) => entries.map((entry) => {
      if (entry.id !== id) return entry;
      const nextEntry = { ...entry, [field]: value };
      const hours = calculateWorkingHours(nextEntry.startTime, nextEntry.endTime);
      return {
        ...nextEntry,
        workingHours: hours,
        eligibleDays: eligibleOffInLieuDays(hours)
      };
    }));
  };

  const toggleOffInLieuDate = (date: string) => {
    const existing = offInLieuEntries.find((entry) => entry.date === date);
    if (existing) {
      setOffInLieuEntries((entries) => entries.filter((entry) => entry.date !== date));
      return;
    }
    const startTime = '09:00';
    const endTime = '15:00';
    const hours = calculateWorkingHours(startTime, endTime);
    setOffInLieuEntries((entries) => [
      ...entries,
      {
        id: `ot-entry-${Date.now()}-${date}`,
        date,
        startTime,
        endTime,
        workingHours: hours,
        eligibleDays: eligibleOffInLieuDays(hours)
      }
    ].sort((a, b) => a.date.localeCompare(b.date)));
  };

  const resetOffInLieuForm = () => {
    setOffInLieuMode('single');
    setOffInLieuEmployeeIds([]);
    setOffInLieuExpiryDate(addOneMonth(getGmt8DateString()));
    setOffInLieuEntries([]);
    setOffInLieuNotes('');
  };

  const saveOffInLieu = (submit: boolean) => {
    if (offInLieuEmployeeIds.length === 0) {
      onShowNotification('Validation Error', 'Select at least one active employee for the replacement leave request.');
      return;
    }
    if (offInLieuEntries.length === 0 || offInLieuEntries.some((entry) => entry.workingHours <= 0)) {
      onShowNotification('Validation Error', 'Add at least one OT date and enter valid working hours.');
      return;
    }
    if (!offInLieuExpiryDate) {
      onShowNotification('Validation Error', 'Please select an expiry date for the replacement leave.');
      return;
    }

    const names = selectedOffInLieuEmployees.map((employee) => employee.name);
    const request: OffInLieuRequest = {
      id: `OIL-${Date.now()}`,
      entityId: activeEntityId,
      employeeIds: [...offInLieuEmployeeIds],
      employeeNames: names,
      entries: offInLieuEntries.map((entry) => ({ ...entry })),
      notes: offInLieuNotes.trim(),
      expiryDate: offInLieuExpiryDate,
      totalDaysPerEmployee: offInLieuDaysPerEmployee,
      totalDays: offInLieuTotalDays,
      status: submit ? 'Pending' : 'Draft',
      submissionMode: offInLieuMode,
      appliedDate: getGmt8DateString(),
      submittedBy: 'HR Admin'
    };

    saveOffInLieuRequests([request, ...offInLieuRequests]);
    resetOffInLieuForm();
    onShowNotification(
      submit ? 'Off in Lieu Submitted' : 'Off in Lieu Draft Saved',
      `${request.totalDaysPerEmployee} day(s) per employee for ${names.join(', ')}.`
    );
  };

  const updateOffInLieuStatus = async (id: string, status: Exclude<OffInLieuStatus, 'Draft' | 'Pending'>) => {
    const request = offInLieuRequests.find((item) => item.id === id);
    if (!request) return;
    const confirmed = await confirmAction({
      title: status === 'Approved' ? 'Approve Off in Lieu Request' : 'Reject Off in Lieu Request',
      message: status === 'Approved'
        ? `Approve ${request.totalDays.toFixed(1)} replacement leave day(s) for ${request.employeeNames.join(', ')}?`
        : `Reject this Off in Lieu request for ${request.employeeNames.join(', ')}?`,
      type: status === 'Approved' ? 'info' : 'danger',
      confirmLabel: status === 'Approved' ? 'Approve Request' : 'Reject Request',
    });
    if (!confirmed) return;
    const nextRequests = offInLieuRequests.map((item) => item.id === id ? {
      ...item,
      status,
      approvedAt: status === 'Approved' ? new Date().toISOString() : undefined,
      approvedBy: status === 'Approved' ? 'HR Admin' : undefined,
    } : item);
    let nextLedgerEntries = ledgerEntries;
    if (status === 'Approved' && !ledgerEntries.some((entry) => entry.sourceId === request.id)) {
      const credits = request.employeeIds.map((employeeId) => ({
        id: `LBC-${request.id}-${employeeId}`,
        entityId: activeEntityId,
        employeeId,
        leaveTypeId: REPLACEMENT_LEAVE_TYPE_ID,
        leaveType: 'Replacement Leave',
        entryType: 'credit' as const,
        sourceType: 'off_in_lieu' as const,
        sourceId: request.id,
        quantity: request.totalDaysPerEmployee,
        expiresAt: request.expiryDate,
        occurredAt: request.appliedDate,
        notes: 'Approved Off in Lieu credit',
      }));
      nextLedgerEntries = [...ledgerEntries, ...credits];
    }
    setOffInLieuRequests(nextRequests);
    setLedgerEntries(nextLedgerEntries);
    if (activeEntityId) {
      writeScopedJson(`off_in_lieu_requests_${activeEntityId}`, nextRequests);
      writeScopedJson(`leave_balance_ledger_${activeEntityId}`, nextLedgerEntries);
    }
    persistWorkspace({ offInLieuRequests: nextRequests, ledgerEntries: nextLedgerEntries });
    onShowNotification(`Off in Lieu ${status}`, `${id} has been marked as ${status.toLowerCase()}.`);
  };

  const moveOffInLieuMonth = (direction: -1 | 1) => {
    setOffInLieuCalendarDate((current) => {
      const nextMonth = current.month + direction;
      if (nextMonth < 0) return { year: current.year - 1, month: 11 };
      if (nextMonth > 11) return { year: current.year + 1, month: 0 };
      return { year: current.year, month: nextMonth };
    });
  };

  const changeGroupLeaveType = (groupId: string, leaveTypeId: string, checked: boolean) => {
    saveGroups(leaveGroups.map((group) => {
      if (group.id !== groupId) return group;
      const currentItems = getGroupItems(group, leaveConfigs);
      const nextItems = checked
        ? [...currentItems.filter((item) => item.leaveTypeId !== leaveTypeId), {
          id: `${group.id}-${leaveTypeId}`,
          groupId,
          leaveTypeId,
          policyId: group.policyId,
          carryOverId: group.carryOverId,
          entitlementDays: leaveConfigs.find((config) => config.id === leaveTypeId)?.daysEntitled || 0,
          enabled: true,
        }]
        : currentItems.filter((item) => item.leaveTypeId !== leaveTypeId);
      return {
        ...group,
        leaveTypeIds: checked
          ? [...new Set([...group.leaveTypeIds, leaveTypeId])]
          : group.leaveTypeIds.filter((id) => id !== leaveTypeId),
        items: nextItems,
      };
    }));
  };

  const updateGroupLeaveItem = (
    groupId: string,
    leaveTypeId: string,
    field: keyof Pick<LeaveGroupItem, 'policyId' | 'carryOverId' | 'entitlementDays'>,
    value: string | number,
  ) => {
    saveGroups(leaveGroups.map((group) => {
      if (group.id !== groupId) return group;
      const items = getGroupItems(group, leaveConfigs).map((item) => item.leaveTypeId === leaveTypeId
        ? { ...item, [field]: value }
        : item);
      return { ...group, items };
    }));
  };

  const getGroupPolicyName = (group: LeaveGroup) => conditioningPolicies.find((policy) => policy.id === group.policyId)?.name || 'Not configured';
  const getGroupCarryOverName = (group: LeaveGroup) => carryOverSettings.find((setting) => setting.id === group.carryOverId)?.name || 'Not configured';

  const renderOverview = () => (
    <div className="space-y-6">
      <div className={`${cardClass} overflow-hidden p-5`}>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-on-surface">Employee Leave Balance</h2>
            <p className="mt-1 text-xs text-on-surface-variant">Review remaining, taken, pending, carry-forward, and credit balances for an active employee.</p>
          </div>
          <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)} className={`${inputClass} sm:max-w-[280px]`}>
            {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
        </div>
        {currentEmployee && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/15 bg-primary/5 p-3">
            <EmployeeAvatar employee={currentEmployee} className="h-10 w-10 rounded-full" />
            <div>
              <p className="text-sm font-bold text-on-surface">{currentEmployee.name}</p>
              <p className="text-xs text-on-surface-variant">{currentEmployee.department} · {currentEmployee.designation}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {enabledLeaveConfigs.map((config) => {
            const balance = selectedEmployeeBalances.find((item) => item.leaveTypeId === config.id);
            const remaining = balance?.remaining ?? config.daysEntitled;
            const expiryDate = ledgerEntries
              .filter((entry) => entry.employeeId === selectedEmployeeId && entry.leaveTypeId === config.id && entry.expiresAt)
              .map((entry) => entry.expiresAt as string)
              .sort()[0];
            return (
              <div key={config.id} className="rounded-lg border border-neutral-border/60 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{config.leaveType}</span>
                  {balance?.replacementCredit ? <span className="rounded-full bg-secondary/10 px-1.5 py-0.5 text-[9px] font-bold text-secondary">Credit</span> : null}
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <span className="font-mono text-2xl font-bold text-primary">{remaining}</span>
                  <span className="text-[10px] text-on-surface-variant">/ {(balance?.entitlement ?? config.daysEntitled) + (balance?.carryOver ?? 0)} days</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-on-surface-variant">
                  <span>Approved taken <strong className="font-mono text-on-surface">{balance?.taken ?? 0}</strong></span>
                  <span>Pending <strong className="font-mono text-on-surface">{balance?.pending ?? 0}</strong></span>
                  <span>Carry forward <strong className="font-mono text-on-surface">{balance?.carryOver ?? 0}</strong></span>
                  <span>Credits <strong className="font-mono text-on-surface">{balance?.credited ?? 0}</strong></span>
                </div>
                {expiryDate && <p className="mt-2 border-t border-neutral-border/60 pt-2 text-[10px] text-amber-700">Expires {formatToDDMMMYYYY(expiryDate)}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className={`${cardClass} p-5 xl:col-span-5`}>
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-primary">File Leave Request</h2>
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">Submit a leave application for an active employee.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">Admin</span>
          </div>

          <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
            <div>
              <label className={labelClass}>Employee</label>
              <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)} className={inputClass}>
                <option value="">Select active employee</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name} ({employee.id})</option>
                ))}
              </select>
            </div>

            {currentEmployee && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-primary/15 bg-primary/5 p-3">
                <div>
                  <span className={labelClass}>Department</span>
                  <span className="font-semibold text-on-surface">{currentEmployee.department || 'Not set'}</span>
                </div>
                <div>
                  <span className={labelClass}>Designation</span>
                  <span className="font-semibold text-on-surface">{currentEmployee.designation || 'Not set'}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Type of Leave</label>
                <select value={leaveType} onChange={(event) => setLeaveType(event.target.value)} className={inputClass}>
                  {enabledLeaveConfigs.map((config) => <option key={config.id} value={config.leaveType}>{config.leaveType}</option>)}
                </select>
              </div>
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                <span className={labelClass}>Computed Days</span>
                <span className="font-mono text-2xl font-bold text-primary">{calculateDays(startDate, endDate)}</span>
                <span className="ml-1 text-[10px] text-on-surface-variant">under active policy</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-neutral-border/60 bg-neutral-50 px-3 py-2.5 text-[11px]">
              <span className={labelClass}>Applicable Policy</span>
              <span className="font-semibold text-on-surface">{policyForLeaveType?.name || 'Not configured'}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Start Date</label>
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={`${inputClass} font-mono`} />
              </div>
              <div>
                <label className={labelClass}>End Date</label>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={`${inputClass} font-mono`} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Reason / Notes</label>
              <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Add the reason or supporting reference." className={inputClass} />
            </div>

            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90">
              <Send className="h-4 w-4" /> Submit Leave Application
            </button>
          </form>
        </div>

        <div className={`${cardClass} p-5 xl:col-span-7`}>
          <div className="mb-5 flex flex-col justify-between gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-on-surface">Leave Applications Queue</h2>
              <p className="mt-1 text-xs text-on-surface-variant">Review requests and keep approval status visible.</p>
            </div>
            <div className="flex gap-1 rounded-md bg-neutral-100 p-1">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((filter) => (
                <button key={filter} type="button" onClick={() => setRequestStatusFilter(filter)} className={`rounded px-2.5 py-1 text-[10px] font-bold ${requestStatusFilter === filter ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'}`}>
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No leave requests" description="New applications will appear here for review." />
            ) : filteredRequests.map((request) => {
              const employee = activeEmployees.find((item) => item.id === request.employeeId);
              return (
                <div key={request.id} className="rounded-lg border border-neutral-border/70 bg-neutral-50/40 p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div className="flex items-center gap-3">
                      <EmployeeAvatar employee={employee} className="h-9 w-9 rounded-full" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">{request.employeeName}</p>
                        <p className="mt-0.5 text-[10px] text-on-surface-variant">{employee?.department || 'Department not set'} · {employee?.designation || 'Designation not set'}</p>
                        <p className="mt-0.5 text-[10px] font-mono text-on-surface-variant">{request.id} | Applied {formatToDDMMMYYYY(request.appliedDate)}</p>
                      </div>
                    </div>
                    <RequestStatusBadge status={request.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 rounded-md border border-neutral-border/40 bg-white p-3 text-[11px] sm:grid-cols-3">
                    <div><span className={labelClass}>Leave Type</span><span className="font-semibold text-primary">{request.leaveType}</span></div>
                    <div><span className={labelClass}>Dates</span><span className="font-mono font-semibold text-on-surface">{formatToDDMMMYYYY(request.startDate)} to {formatToDDMMMYYYY(request.endDate)}</span></div>
                    <div><span className={labelClass}>Days</span><span className="font-mono font-semibold text-on-surface">{request.totalDays}</span></div>
                  </div>
                  <p className="mt-3 text-xs italic text-on-surface-variant">"{request.reason}"</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-neutral-border/40 bg-white p-3 text-[10px] sm:grid-cols-2">
                    <div><span className={labelClass}>Payroll Deduction</span><span className="font-mono font-bold text-on-surface">RM {payrollDeductions.filter((deduction) => deduction.leaveRequestId === request.id).reduce((total, deduction) => total + deduction.amount, 0).toFixed(2)}</span></div>
                    <div><span className={labelClass}>Payroll Sync</span><span className={`font-bold ${payrollDeductions.some((deduction) => deduction.leaveRequestId === request.id && deduction.status === 'Synced') ? 'text-green-700' : 'text-on-surface-variant'}`}>{payrollDeductions.some((deduction) => deduction.leaveRequestId === request.id && deduction.status === 'Synced') ? 'Synced' : payrollDeductions.some((deduction) => deduction.leaveRequestId === request.id) ? 'Pending' : 'Not applicable'}</span></div>
                  </div>
                  {request.status === 'Pending' && (
                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" onClick={() => updateLeaveRequestStatus(request.id, 'Rejected')} className="flex items-center gap-1 rounded bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-700 transition hover:bg-red-100"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                      <button type="button" onClick={() => updateLeaveRequestStatus(request.id, 'Approved')} className="flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );

  const renderPolicy = () => (
    <div className="space-y-6">
      <SectionIntro
        icon={SlidersHorizontal}
        eyebrow="Conditioning Leave Policy"
        title="Control how leave is deducted and entitled"
        description="Build reusable policy rules for deductions, rounding, proration, and entitlement periods."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {conditioningPolicies.map((policy) => (
          <div key={policy.id} className={`${cardClass} p-5`}>
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase leading-5 tracking-[0.2em] text-primary">Conditioning Leave Policy Rule Set</p>
                <input value={policy.name} onChange={(event) => updatePolicy(policy.id, 'name', event.target.value)} className="mt-1 w-full border-0 bg-transparent p-0 text-base font-bold text-on-surface outline-none focus:ring-0" />
              </div>
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Deductions Rule" value={policy.deductionRule} onChange={(value) => updatePolicy(policy.id, 'deductionRule', value)} options={[
                ['calendar_days', 'Calendar days'],
                ['working_days', 'Working days'],
                ['working_days_excluding_holidays', 'Working days excluding holidays']
              ]} />
              <NumberField label="Entitlement Days" value={policy.entitlementDays || 0} onChange={(value) => updatePolicy(policy.id, 'entitlementDays', value)} min={0} />
              <SelectField label="Rounding Rule" value={policy.roundingRule} onChange={(value) => updatePolicy(policy.id, 'roundingRule', value)} options={[
                ['exact', 'Exact day count'],
                ['nearest_half_day', 'Nearest half day'],
                ['round_up_half_day', 'Round up to half day']
              ]} />
              <SelectField label="Proration Rule" value={policy.prorationRule} onChange={(value) => updatePolicy(policy.id, 'prorationRule', value)} options={[
                ['none', 'No proration'],
                ['joiner_proration', 'Prorate by joining date'],
                ['monthly_accrual', 'Monthly accrual']
              ]} />
              <SelectField label="Entitlement Rule" value={policy.entitlementRule} onChange={(value) => updatePolicy(policy.id, 'entitlementRule', value)} options={[
                ['calendar_year', 'Calendar year'],
                ['anniversary_year', 'Employment anniversary'],
                ['monthly_accrual', 'Monthly accrual period']
              ]} />
              <SelectField label="Paid / Unpaid Treatment" value={policy.paidTreatment || 'paid'} onChange={(value) => updatePolicy(policy.id, 'paidTreatment', value)} options={[
                ['paid', 'Paid leave'],
                ['unpaid', 'Unpaid leave']
              ]} />
              <SelectField label="Excess Leave Handling" value={policy.excessLeaveHandling || 'payroll_deduction'} onChange={(value) => updatePolicy(policy.id, 'excessLeaveHandling', value)} options={[
                ['allow', 'Allow excess leave'],
                ['reject', 'Reject excess leave'],
                ['payroll_deduction', 'Send excess to payroll']
              ]} />
              <SelectField label="Payroll Deduction Behavior" value={policy.payrollDeductionBehavior || 'deduct_excess'} onChange={(value) => updatePolicy(policy.id, 'payrollDeductionBehavior', value)} options={[
                ['none', 'No payroll deduction'],
                ['deduct_excess', 'Deduct excess days'],
                ['deduct_all', 'Deduct all days']
              ]} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ToggleRow label="Exclude weekends" checked={policy.excludeWeekends} onChange={(checked) => updatePolicy(policy.id, 'excludeWeekends', checked)} />
              <ToggleRow label="Exclude public holidays" checked={policy.excludePublicHolidays} onChange={(checked) => updatePolicy(policy.id, 'excludePublicHolidays', checked)} />
              <ToggleRow label="Sync payroll deductions" checked={policy.payrollDeductionBehavior !== 'none'} onChange={(checked) => updatePolicy(policy.id, 'payrollDeductionBehavior', checked ? 'deduct_excess' : 'none')} />
            </div>

            <div className="mt-5">
              <label className={labelClass}>Description</label>
              <textarea rows={3} value={policy.notes} onChange={(event) => updatePolicy(policy.id, 'notes', event.target.value)} className={inputClass} />
            </div>
          </div>
        ))}

        <div className={`${cardClass} border-dashed p-5`}>
          <div className="flex items-center gap-2">
            <CopyPlus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">Add another policy rule set</h3>
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">Create a different ruleset for a subsidiary, contract population, or special leave plan.</p>
          <form onSubmit={addPolicy} className="mt-4 flex gap-2">
            <input value={newPolicyName} onChange={(event) => setNewPolicyName(event.target.value)} placeholder="e.g. Contractor Leave Rules" className={inputClass} />
            <button type="submit" className="shrink-0 rounded-md bg-primary px-3 text-white transition hover:opacity-90"><Plus className="h-4 w-4" /></button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-on-surface-variant">
        <div className="flex gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>Policy rules are saved per subsidiary. Leave groups combine one leave type catalogue, one conditioning policy, and one carry-over setting.</p>
        </div>
      </div>

    </div>
  );

  const renderCarryOver = () => (
    <div className="space-y-6">
      <SectionIntro
        icon={RotateCcw}
        eyebrow="Carry Over Leave Balance Settings"
        title="Control expiry and carry-forward balances"
        description="Define how unused leave moves into the next period and when carried days expire."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {carryOverSettings.map((setting) => (
          <div key={setting.id} className={`${cardClass} p-5`}>
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase leading-5 tracking-[0.2em] text-secondary">Carry Over Leave Balance Settings</p>
                <input value={setting.name} onChange={(event) => updateCarryOver(setting.id, 'name', event.target.value)} className="mt-1 w-full border-0 bg-transparent p-0 text-base font-bold text-on-surface outline-none focus:ring-0" />
              </div>
              <RotateCcw className="h-5 w-5 text-secondary" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Carry Forward Rules" value={setting.carryForwardRule} onChange={(value) => updateCarryOver(setting.id, 'carryForwardRule', value)} options={[
                ['none', 'Do not carry forward'],
                ['full_balance', 'Carry full unused balance'],
                ['half_balance', 'Carry up to 50% balance leaves from last year'],
                ['capped', 'Carry forward up to a cap']
              ]} />
              <NumberField label="Maximum Carry Forward Days" value={setting.maxCarryForwardDays} onChange={(value) => updateCarryOver(setting.id, 'maxCarryForwardDays', value)} min={0} />
              <SelectField label="Expiry Rule" value={setting.expiryRule} onChange={(value) => updateCarryOver(setting.id, 'expiryRule', value)} options={[
                ['no_expiry', 'No expiry'],
                ['fixed_date', 'Fixed expiry date'],
                ['months_after_year_end', 'Months after year end']
              ]} />
              {setting.expiryRule === 'fixed_date' ? (
                <DateField label="Expiry Date" value={setting.expiryDate} onChange={(value) => updateCarryOver(setting.id, 'expiryDate', value)} />
              ) : (
                <NumberField label="Expiry Months After Year End" value={setting.expiryMonths} onChange={(value) => updateCarryOver(setting.id, 'expiryMonths', value)} min={0} />
              )}
            </div>
            <div className="mt-4">
              <ToggleRow label="Enable carry forward" checked={setting.enabled !== false} onChange={(checked) => updateCarryOver(setting.id, 'enabled', checked)} />
            </div>
            <div className="mt-5">
              <label className={labelClass}>Carry Forward Rule Details</label>
              <textarea rows={2} value={setting.ruleDetails || ''} onChange={(event) => updateCarryOver(setting.id, 'ruleDetails', event.target.value)} className={inputClass} placeholder="Explain how unused balances move into the next period." />
            </div>
            <div className="mt-3">
              <label className={labelClass}>Rule Notes</label>
              <textarea rows={2} value={setting.notes} onChange={(event) => updateCarryOver(setting.id, 'notes', event.target.value)} className={inputClass} />
            </div>
          </div>
        ))}

        <div className={`${cardClass} border-dashed p-5`}>
          <div className="flex items-center gap-2">
            <CopyPlus className="h-4 w-4 text-secondary" />
            <h3 className="text-sm font-bold text-on-surface">Add another carry-over setting</h3>
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">Use separate expiry rules for different leave groups.</p>
          <form onSubmit={addCarryOverSetting} className="mt-4 flex gap-2">
            <input value={newCarryOverName} onChange={(event) => setNewCarryOverName(event.target.value)} placeholder="e.g. Executive Leave Carry Over" className={inputClass} />
            <button type="submit" className="shrink-0 rounded-md bg-secondary px-3 text-white transition hover:opacity-90"><Plus className="h-4 w-4" /></button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderLeaveTypes = () => (
    <div className="space-y-6">
      <SectionIntro
        icon={FileText}
        eyebrow="Type of Leave"
        title="Keep defaults and add your own leave types"
        description="Default statutory and common corporate leave types remain available. Custom types can be enabled or disabled independently."
      />

      <div className={`${cardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-[940px] w-full text-left text-xs">
            <thead className="border-b border-neutral-border bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="p-4">Type of Leave</th>
                <th className="p-4">Entitlement</th>
                <th className="p-4">Conditioning Policy</th>
                <th className="p-4">Able to Carry Forward?</th>
                <th className="p-4 text-center">Enabled</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border/60">
              {leaveConfigs.map((config) => (
                <tr key={config.id} className="align-top hover:bg-neutral-50/50">
                  <td className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="rounded bg-primary/10 px-2 py-1 font-mono text-[10px] font-bold text-primary">{config.code}</span>
                      <div>
                        <input value={config.leaveType} disabled={config.systemManaged} onChange={(event) => updateConfig(config.id, 'leaveType', event.target.value)} className="w-full bg-transparent font-bold text-on-surface outline-none disabled:cursor-not-allowed disabled:opacity-60" />
                        <span className="mt-1 block text-[10px] text-on-surface-variant">{config.isDefault ? 'Default leave type' : 'Custom leave type'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} value={config.daysEntitled} onChange={(event) => updateConfig(config.id, 'daysEntitled', Number(event.target.value))} className={`${inputClass} max-w-[100px] font-mono`} />
                      <span className="text-[10px] text-on-surface-variant">days</span>
                    </div>
                    <input value={config.condition} onChange={(event) => updateConfig(config.id, 'condition', event.target.value)} className="mt-2 w-full border-0 bg-transparent p-0 text-[10px] text-on-surface-variant outline-none" />
                  </td>
                  <td className="p-3">
                    <select value={config.policyId} onChange={(event) => updateConfig(config.id, 'policyId', event.target.value)} className={inputClass}>
                      {conditioningPolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="space-y-2">
                      <select
                        value={config.canCarryOver === false ? 'no' : 'yes'}
                        onChange={(event) => updateConfig(config.id, 'canCarryOver', event.target.value === 'yes')}
                        className={inputClass}
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                      {config.canCarryOver !== false ? (
                        <select value={config.carryOverId || ''} onChange={(event) => updateConfig(config.id, 'carryOverId', event.target.value)} className={inputClass}>
                          {carryOverSettings.map((setting) => <option key={setting.id} value={setting.id}>{setting.name}</option>)}
                        </select>
                      ) : (
                        <p className="px-1 text-[10px] text-on-surface-variant">Carry-over policy not applicable.</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <input type="checkbox" checked={config.enabled !== false} onChange={(event) => updateConfig(config.id, 'enabled', event.target.checked)} className="h-4 w-4 accent-[#b42318]" />
                  </td>
                  <td className="p-4 text-right">
                    <button type="button" disabled={config.isDefault} onClick={() => saveConfigs(leaveConfigs.filter((item) => item.id !== config.id))} className="rounded p-2 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-20" title={config.isDefault ? 'Default leave types are retained' : 'Delete custom leave type'}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${cardClass} p-5`}>
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-on-surface">Self-define a leave type</h3>
            <p className="text-xs text-on-surface-variant">Add a corporate leave type without changing the statutory defaults.</p>
          </div>
        </div>
        <form onSubmit={addLeaveType} className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-3"><label className={labelClass}>Leave Type Name</label><input value={newTypeName} onChange={(event) => setNewTypeName(event.target.value)} placeholder="e.g. Volunteer Leave" className={inputClass} /></div>
          <div className="md:col-span-2"><label className={labelClass}>Code</label><input value={newTypeCode} onChange={(event) => setNewTypeCode(event.target.value)} placeholder="VL" className={inputClass} /></div>
          <div className="md:col-span-2"><label className={labelClass}>Entitlement Days</label><input type="number" min={0} value={newTypeDays} onChange={(event) => setNewTypeDays(Number(event.target.value))} className={`${inputClass} font-mono`} /></div>
          <div className="md:col-span-3"><label className={labelClass}>Condition</label><input value={newTypeCondition} onChange={(event) => setNewTypeCondition(event.target.value)} className={inputClass} /></div>
          <div className="md:col-span-2"><label className={labelClass}>Add</label><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90"><Plus className="h-4 w-4" /> Add Type</button></div>
          <div className="md:col-span-6"><label className={labelClass}>Conditioning Policy</label><select value={newTypePolicyId} onChange={(event) => setNewTypePolicyId(event.target.value)} className={inputClass}>{conditioningPolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name}</option>)}</select></div>
          <div className="md:col-span-6"><label className={labelClass}>Carry Over Setting</label><select value={newTypeCarryOverId} onChange={(event) => setNewTypeCarryOverId(event.target.value)} className={inputClass}>{carryOverSettings.map((setting) => <option key={setting.id} value={setting.id}>{setting.name}</option>)}</select></div>
        </form>
      </div>
    </div>
  );

  const renderLeaveGroups = () => (
    <div className="space-y-6">
      <SectionIntro
        icon={Layers3}
        eyebrow="Leave Group"
        title="Combine rules and assign them to active employees"
        description="A leave group is made from Type of Leave + Conditioning Leave Policy + Carry Over Leave Balance Settings."
      />

      <div className={`${cardClass} p-5`}>
        <form onSubmit={addLeaveGroup} className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-3"><label className={labelClass}>Group Name</label><input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="e.g. Executive Package" className={inputClass} /></div>
          <div className="md:col-span-3"><label className={labelClass}>Description</label><input value={newGroupDescription} onChange={(event) => setNewGroupDescription(event.target.value)} placeholder="Who is this for?" className={inputClass} /></div>
          <div className="md:col-span-2"><label className={labelClass}>Conditioning Policy</label><select value={newGroupPolicyId} onChange={(event) => setNewGroupPolicyId(event.target.value)} className={inputClass}>{conditioningPolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name}</option>)}</select></div>
          <div className="md:col-span-2"><label className={labelClass}>Carry Over</label><select value={newGroupCarryOverId} onChange={(event) => setNewGroupCarryOverId(event.target.value)} className={inputClass}>{carryOverSettings.map((setting) => <option key={setting.id} value={setting.id}>{setting.name}</option>)}</select></div>
          <div className="md:col-span-2"><label className={labelClass}>Add</label><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90"><Plus className="h-4 w-4" /> Add Group</button></div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className={`${cardClass} h-fit p-3`}>
          <div className="border-b border-neutral-border/60 px-3 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Leave Groups</p>
            <p className="mt-1 text-xs text-on-surface-variant">Select a group to configure its rules.</p>
          </div>
          <div className="mt-3 space-y-1">
            {leaveGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(group.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${selectedGroupId === group.id ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-transparent hover:bg-neutral-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-on-surface">{group.name}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${group.enabled ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-on-surface-variant'}`}>{group.enabled ? 'Active' : 'Disabled'}</span>
                </div>
                <span className="mt-1 block text-[10px] text-on-surface-variant">{group.leaveTypeIds.length} leave types · {group.assignedEmployeeIds.length} assigned</span>
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const group = leaveGroups.find((item) => item.id === selectedGroupId);
          if (!group) {
            return (
              <div className={`${cardClass} p-5`}>
                <EmptyState icon={Layers3} title="No leave group selected" description="Create or select a leave group to configure its rules." />
              </div>
            );
          }
          return (
          <div className={`${cardClass} p-5`}>
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-on-surface">{group.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${group.enabled ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-on-surface-variant'}`}>{group.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">{group.description}</p>
              </div>
              <button type="button" onClick={() => saveGroups(leaveGroups.map((item) => item.id === group.id ? { ...item, enabled: !item.enabled } : item))} className="rounded-md border border-neutral-border px-2 py-1 text-[10px] font-bold text-on-surface-variant transition hover:border-primary hover:text-primary">
                {group.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField label="Conditioning Policy" value={group.policyId} onChange={(value) => saveGroups(leaveGroups.map((item) => item.id === group.id ? { ...item, policyId: value } : item))} options={conditioningPolicies.map((policy) => [policy.id, policy.name])} />
              <SelectField label="Carry Over Setting" value={group.carryOverId} onChange={(value) => saveGroups(leaveGroups.map((item) => item.id === group.id ? { ...item, carryOverId: value } : item))} options={carryOverSettings.map((setting) => [setting.id, setting.name])} />
            </div>

            <div className="mt-4 rounded-lg border border-neutral-border/60 bg-neutral-50/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={labelClass}>Public Holiday Groups</p>
                  <p className="text-[10px] text-on-surface-variant">Select up to two calendars. Holiday dates are excluded only when the applicable policy enables public-holiday exclusion.</p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary">
                  {(group.publicHolidayGroupIds || [DEFAULT_PUBLIC_HOLIDAY_GROUP_ID]).length}/2 selected
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {publicHolidayGroups.filter((holidayGroup) => holidayGroup.enabled).map((holidayGroup) => {
                  const selectedHolidayGroups = group.publicHolidayGroupIds || [DEFAULT_PUBLIC_HOLIDAY_GROUP_ID];
                  return (
                    <label key={holidayGroup.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-neutral-border/60 bg-white px-3 py-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedHolidayGroups.includes(holidayGroup.id)}
                        onChange={(event) => updateGroupPublicHolidaySelection(group.id, holidayGroup.id, event.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 accent-[#b42318]"
                      />
                      <span>
                        <span className="block font-semibold text-on-surface">{holidayGroup.name}</span>
                        <span className="mt-0.5 block text-[9px] uppercase tracking-wider text-on-surface-variant">{holidayGroup.category}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-[10px] text-on-surface-variant">
              <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" />
              Rest/off-day source: <strong className="text-on-surface">Employee's active Work & Shift Group</strong>
            </div>

            <div className="mt-4">
              <p className={labelClass}>Type of Leave in this group</p>
              <div className="space-y-2">
                {leaveConfigs.filter((config) => !config.systemManaged).map((config) => {
                  const selected = group.leaveTypeIds.includes(config.id);
                  const item = getGroupItems(group, leaveConfigs).find((groupItem) => groupItem.leaveTypeId === config.id);
                  return (
                    <div key={config.id} className="grid grid-cols-1 gap-2 rounded-md border border-neutral-border/60 px-2.5 py-2 text-xs md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_100px] md:items-center">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={selected} onChange={(event) => changeGroupLeaveType(group.id, config.id, event.target.checked)} className="h-3.5 w-3.5 accent-[#b42318]" />
                        <span className="font-semibold text-on-surface">{config.leaveType}</span>
                      </label>
                      {selected ? (
                        <>
                          <select value={item?.policyId || group.policyId} onChange={(event) => updateGroupLeaveItem(group.id, config.id, 'policyId', event.target.value)} className={inputClass}>
                            {conditioningPolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name}</option>)}
                          </select>
                          <select value={item?.carryOverId || group.carryOverId} onChange={(event) => updateGroupLeaveItem(group.id, config.id, 'carryOverId', event.target.value)} className={inputClass}>
                            {carryOverSettings.map((setting) => <option key={setting.id} value={setting.id}>{setting.name}</option>)}
                          </select>
                          <input type="number" min={0} value={item?.entitlementDays ?? config.daysEntitled} onChange={(event) => updateGroupLeaveItem(group.id, config.id, 'entitlementDays', Number(event.target.value))} className={`${inputClass} font-mono`} title="Entitlement days for this group row" />
                        </>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant md:col-span-3">Not included in this group</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-[10px] text-on-surface-variant">
              <span>{group.leaveTypeIds.length} leave types · {group.assignedEmployeeIds.length} assigned</span>
              <span>{getGroupPolicyName(group)} | {getGroupCarryOverName(group)}</span>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );

  const renderWorkShiftGroups = () => {
    const selectedGroup = workShiftGroups.find((group) => group.id === selectedWorkShiftGroupId);
    const selectedDays = selectedGroup ? getWorkShiftDays(selectedGroup.id) : [];
    const activeScheduleAssignments = employeeWorkShiftAssignments.filter((assignment) => (
      activeEmployees.some((employee) => employee.id === assignment.employeeId)
    ));

    return (
      <div className="space-y-6">
        <SectionIntro
          icon={Clock3}
          eyebrow="Work & Shift Groups"
          title="Configure working days, shifts, and rest days"
          description="Full Day deducts a one-hour break, 0.5 Day has no break deduction, and Rest days contribute zero working hours."
        />

        <div className={`${cardClass} p-5`}>
          <form onSubmit={addWorkShiftGroup} className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <label className={labelClass}>Group Name</label>
              <input value={newWorkShiftName} onChange={(event) => setNewWorkShiftName(event.target.value)} placeholder="e.g. Retail 6-Day Shift" className={inputClass} />
            </div>
            <div className="md:col-span-6">
              <label className={labelClass}>Description</label>
              <input value={newWorkShiftDescription} onChange={(event) => setNewWorkShiftDescription(event.target.value)} placeholder="Describe the employee population or shift pattern." className={inputClass} />
            </div>
            <div className="flex items-end md:col-span-2">
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90">
                <Plus className="h-4 w-4" /> Add Group
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className={`${cardClass} h-fit p-3`}>
            <div className="border-b border-neutral-border/60 px-3 pb-3">
              <p className={labelClass}>Work & Shift Groups</p>
              <p className="text-xs text-on-surface-variant">Select a group to configure its seven-day schedule.</p>
            </div>
            <div className="mt-3 space-y-1">
              {workShiftGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedWorkShiftGroupId(group.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${selectedWorkShiftGroupId === group.id ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-transparent hover:bg-neutral-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-on-surface">{group.name}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${group.enabled ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-on-surface-variant'}`}>{group.enabled ? 'Active' : 'Disabled'}</span>
                  </div>
                  <span className="mt-1 block font-mono text-[10px] text-on-surface-variant">{group.weeklyHours.toFixed(2)} hours/week</span>
                  {group.weeklyHoursWarning && <span className="mt-1 block text-[9px] font-bold text-amber-700">Over 45-hour warning</span>}
                </button>
              ))}
            </div>
          </div>

          {!selectedGroup ? (
            <div className={`${cardClass} p-5`}>
              <EmptyState icon={Clock3} title="No Work & Shift Group selected" description="Create or select a group to configure its schedule." />
            </div>
          ) : (
            <div className={`${cardClass} overflow-hidden`}>
              <div className="flex flex-col justify-between gap-4 border-b border-neutral-border bg-neutral-50 p-5 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <label className={labelClass}>Group Name</label>
                  <input value={selectedGroup.name} onChange={(event) => updateWorkShiftGroup(selectedGroup.id, 'name', event.target.value)} className="w-full border-0 bg-transparent p-0 text-lg font-bold text-on-surface outline-none focus:ring-0" />
                  <label className={`${labelClass} mt-3`}>Description</label>
                  <textarea rows={2} value={selectedGroup.description} onChange={(event) => updateWorkShiftGroup(selectedGroup.id, 'description', event.target.value)} className={`${inputClass} bg-white`} />
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase ${selectedGroup.weeklyHoursWarning ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
                    {selectedGroup.weeklyHours.toFixed(2)} hours/week
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateWorkShiftGroup(selectedGroup.id, 'enabled', !selectedGroup.enabled)} className="rounded-md border border-neutral-border px-3 py-1.5 text-[10px] font-bold text-on-surface-variant hover:bg-white">
                      {selectedGroup.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button type="button" onClick={() => void deleteWorkShiftGroup(selectedGroup.id)} className="rounded-md border border-red-200 px-3 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {selectedGroup.weeklyHoursWarning && (
                <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span>Weekly working hours exceed 45 hours. Saving is allowed, but HR should review the schedule.</span>
                </div>
              )}

              <div className="overflow-x-auto p-5">
                <table className="min-w-[900px] w-full text-left text-xs">
                  <thead className="border-b border-neutral-border text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="p-3">Working Day</th>
                      <th className="p-3">Start</th>
                      <th className="p-3">End</th>
                      <th className="p-3">Day Setting</th>
                      <th className="p-3 text-center">Work</th>
                      <th className="p-3 text-center">Rest</th>
                      <th className="p-3 text-right">Actual Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-border/60">
                    {WORK_SHIFT_WEEKDAYS.map((weekday) => {
                      const day = selectedDays.find((item) => item.weekday === weekday) as WorkShiftGroupDay;
                      const isRest = day.dayType === 'rest';
                      return (
                        <tr key={day.id} className="align-middle">
                          <td className="p-3 font-bold text-on-surface">{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekday]}</td>
                          <td className="p-3"><input type="time" value={day.startTime} onChange={(event) => updateWorkShiftDay(selectedGroup.id, weekday, 'startTime', event.target.value)} className={`${inputClass} font-mono`} /></td>
                            <td className="p-3"><input type="time" value={day.endTime} onChange={(event) => updateWorkShiftDay(selectedGroup.id, weekday, 'endTime', event.target.value)} className={`${inputClass} font-mono`} /></td>
                          <td className="p-3">
                            <select value={day.dayType} onChange={(event) => updateWorkShiftDay(selectedGroup.id, weekday, 'dayType', event.target.value)} className={inputClass}>
                              <option value="full_day">Full Day</option>
                              <option value="half_day">Half-day</option>
                              <option value="rest">Rest</option>
                            </select>
                          </td>
                          <td className="p-3 text-center">
                            <input type="checkbox" checked={!isRest} onChange={() => updateWorkShiftDay(selectedGroup.id, weekday, 'dayType', isRest ? 'full_day' : 'rest')} className="h-4 w-4 accent-[#b42318]" aria-label={`Work on ${WEEKDAYS[weekday]}`} />
                          </td>
                          <td className="p-3 text-center">
                            <input type="checkbox" checked={isRest} onChange={() => updateWorkShiftDay(selectedGroup.id, weekday, 'dayType', isRest ? 'full_day' : 'rest')} className="h-4 w-4 accent-[#b42318]" aria-label={`Rest on ${WEEKDAYS[weekday]}`} />
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-primary">{day.actualHours.toFixed(2)} h</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col justify-between gap-3 border-t border-neutral-border bg-white px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-xs text-on-surface-variant">Full Day: (end - start) - 1 hour break. Half-day defaults to an end time four hours after the start, and the end time remains editable.</p>
                <button type="button" onClick={() => saveWorkShiftGroup(selectedGroup.id)} className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90">
                  <Save className="h-4 w-4" /> Save Group
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`${cardClass} p-5`}>
          <div className="mb-5 flex flex-col justify-between gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-base font-bold text-on-surface">Assign Work & Shift Group</h2>
              <p className="mt-1 text-xs text-on-surface-variant">Each employee resolves to one effective schedule at a time. Bulk replacements require confirmation.</p>
            </div>
            <div className="flex rounded-md bg-neutral-100 p-1">
              {(['single', 'bulk'] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => { setWorkShiftAssignmentMode(mode); if (mode === 'single') setWorkShiftAssignmentEmployeeIds((ids) => ids.slice(0, 1)); }} className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase ${workShiftAssignmentMode === mode ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}>
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={assignWorkShiftGroup} className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <label className={labelClass}>{workShiftAssignmentMode === 'single' ? 'Employee' : 'Employees'}</label>
              {workShiftAssignmentMode === 'single' ? (
                <select value={workShiftAssignmentEmployeeIds[0] || ''} onChange={(event) => setWorkShiftAssignmentEmployeeIds(event.target.value ? [event.target.value] : [])} className={inputClass}>
                  <option value="">Select active employee</option>
                  {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.department}</option>)}
                </select>
              ) : (
                <select multiple value={workShiftAssignmentEmployeeIds} onChange={(event) => setWorkShiftAssignmentEmployeeIds([...event.currentTarget.selectedOptions].map((option: HTMLOptionElement) => option.value))} className={`${inputClass} min-h-[92px]`}>
                  {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.department}</option>)}
                </select>
              )}
            </div>
            <div className="md:col-span-3">
              <label className={labelClass}>Work & Shift Group</label>
              <select value={workShiftAssignmentGroupId} onChange={(event) => setWorkShiftAssignmentGroupId(event.target.value)} className={inputClass}>
                {workShiftGroups.filter((group) => group.enabled).map((group) => <option key={group.id} value={group.id}>{group.name} · {group.weeklyHours.toFixed(2)}h</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><label className={labelClass}>Effective Date</label><input type="date" value={workShiftAssignmentEffectiveDate} onChange={(event) => setWorkShiftAssignmentEffectiveDate(event.target.value)} className={`${inputClass} font-mono`} /></div>
            <div className="md:col-span-2"><label className={labelClass}>End Date (Optional)</label><input type="date" value={workShiftAssignmentEndDate} onChange={(event) => setWorkShiftAssignmentEndDate(event.target.value)} className={`${inputClass} font-mono`} /></div>
            <div className="flex items-end md:col-span-1"><button type="submit" className="flex w-full items-center justify-center rounded-md bg-primary px-3 py-2.5 text-white hover:opacity-90" title="Assign group"><Plus className="h-4 w-4" /></button></div>
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-xs">
              <thead className="border-b border-neutral-border text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <tr><th className="p-3">Employee</th><th className="p-3">Group</th><th className="p-3">Effective</th><th className="p-3">End</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-border/60">
                {activeScheduleAssignments.length === 0 ? (
                  <tr><td colSpan={5} className="p-5"><EmptyState icon={UserCog} title="No work schedule assignments" description="Employees without an assignment use the Malaysia standard schedule." /></td></tr>
                ) : activeScheduleAssignments.map((assignment) => {
                  const employee = activeEmployees.find((item) => item.id === assignment.employeeId);
                  const group = workShiftGroups.find((item) => item.id === assignment.groupId);
                  if (!employee || !group) return null;
                  const isCurrent = assignment.active && assignment.effectiveDate <= getGmt8DateString() && (!assignment.endDate || assignment.endDate >= getGmt8DateString());
                  return (
                    <tr key={assignment.id}>
                      <td className="p-3"><p className="font-bold text-on-surface">{employee.name}</p><p className="text-[10px] text-on-surface-variant">{employee.department} · {employee.designation}</p></td>
                      <td className="p-3"><p className="font-semibold text-on-surface">{group.name}</p><p className="font-mono text-[10px] text-on-surface-variant">{group.weeklyHours.toFixed(2)} hours/week</p></td>
                      <td className="p-3 font-mono">{formatToDDMMMYYYY(assignment.effectiveDate)}</td>
                      <td className="p-3 font-mono">{assignment.endDate ? formatToDDMMMYYYY(assignment.endDate) : 'Open ended'}</td>
                      <td className="p-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${isCurrent ? 'bg-green-100 text-green-700' : assignment.effectiveDate > getGmt8DateString() ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-on-surface-variant'}`}>{isCurrent ? 'Current' : assignment.effectiveDate > getGmt8DateString() ? 'Future' : 'History'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPublicHolidays = () => {
    const categoryGroups = publicHolidayGroups.filter((group) => group.category === publicHolidayCategory);
    const selectedGroup = publicHolidayGroups.find((group) => group.id === selectedPublicHolidayGroupId)
      || categoryGroups[0];
    const selectedGroupHolidays = selectedGroup
      ? publicHolidays.filter((holiday) => holiday.groupId === selectedGroup.id && holiday.year === publicHolidayYear)
      : [];
    const years = [...new Set([2026, 2027, new Date().getFullYear(), ...publicHolidays.map((holiday) => holiday.year)])].sort();

    return (
      <div className="space-y-6">
        <SectionIntro
          icon={Calendar}
          eyebrow="Public Holiday Groups"
          title="Maintain National and State holiday calendars"
          description="Holiday groups are selected on Leave Groups and can be edited by year. Employees are not assigned automatically by nationality or address."
        />

        <div className={`${cardClass} p-5`}>
          <form onSubmit={addPublicHolidayGroup} className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-6"><label className={labelClass}>Group Name</label><input value={newPublicHolidayGroupName} onChange={(event) => setNewPublicHolidayGroupName(event.target.value)} placeholder="e.g. Sabah Operations" className={inputClass} /></div>
            <div className="md:col-span-3"><label className={labelClass}>Category</label><select value={publicHolidayCategory} onChange={(event) => { const category = event.target.value as PublicHolidayCategory; setPublicHolidayCategory(category); const firstGroup = publicHolidayGroups.find((group) => group.category === category); if (firstGroup) setSelectedPublicHolidayGroupId(firstGroup.id); }} className={inputClass}><option value="national">National</option><option value="state">State</option></select></div>
            <div className="flex items-end md:col-span-3"><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-xs font-bold text-white hover:opacity-90"><Plus className="h-4 w-4" /> Add Holiday Group</button></div>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className={`${cardClass} h-fit p-3`}>
            <div className="flex rounded-md bg-neutral-100 p-1">
              {(['national', 'state'] as const).map((category) => {
                const count = publicHolidayGroups.filter((group) => group.category === category).length;
                return <button key={category} type="button" onClick={() => { setPublicHolidayCategory(category); const next = publicHolidayGroups.find((group) => group.category === category); if (next) setSelectedPublicHolidayGroupId(next.id); }} className={`flex-1 rounded px-3 py-2 text-[10px] font-bold uppercase ${publicHolidayCategory === category ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}>{category} ({count})</button>;
              })}
            </div>
            <div className="mt-3 space-y-1">
              {categoryGroups.map((group) => (
                <button key={group.id} type="button" onClick={() => setSelectedPublicHolidayGroupId(group.id)} className={`w-full rounded-lg border p-3 text-left ${selectedGroup?.id === group.id ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:bg-neutral-50'}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-on-surface">{group.name}</span><span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${group.enabled ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-on-surface-variant'}`}>{group.enabled ? 'Enabled' : 'Disabled'}</span></div>
                  <span className="mt-1 block text-[10px] uppercase text-on-surface-variant">{group.stateCode || 'Malaysia'}</span>
                </button>
              ))}
            </div>
          </div>

          {!selectedGroup ? (
            <div className={`${cardClass} p-5`}><EmptyState icon={Calendar} title="No holiday group selected" description="Create a National or State group to manage holiday records." /></div>
          ) : (
            <div className={`${cardClass} overflow-hidden`}>
              <div className="flex flex-col justify-between gap-3 border-b border-neutral-border bg-neutral-50 p-5 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className={labelClass}>Group Name</label>
                  <input value={selectedGroup.name} onChange={(event) => updatePublicHolidayGroup(selectedGroup.id, 'name', event.target.value)} className="w-full border-0 bg-transparent p-0 text-lg font-bold text-on-surface outline-none focus:ring-0" />
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div><label className={labelClass}>Category</label><select value={selectedGroup.category} onChange={(event) => { const category = event.target.value as PublicHolidayCategory; updatePublicHolidayGroup(selectedGroup.id, 'category', category); setPublicHolidayCategory(category); }} className={inputClass}><option value="national">National</option><option value="state">State</option></select></div>
                    <div><label className={labelClass}>State Code</label><input value={selectedGroup.stateCode || ''} onChange={(event) => updatePublicHolidayGroup(selectedGroup.id, 'stateCode', event.target.value.toUpperCase())} placeholder="Optional" className={inputClass} /></div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <select value={publicHolidayYear} onChange={(event) => setPublicHolidayYear(Number(event.target.value))} className={`${inputClass} sm:w-[120px]`}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select>
                  <label className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant"><input type="checkbox" checked={selectedGroup.enabled} onChange={(event) => updatePublicHolidayGroup(selectedGroup.id, 'enabled', event.target.checked)} className="h-4 w-4 accent-[#b42318]" /> Enabled</label>
                </div>
              </div>

              <form onSubmit={addPublicHoliday} className="grid grid-cols-1 gap-3 border-b border-neutral-border p-5 md:grid-cols-12">
                <div className="md:col-span-3"><label className={labelClass}>Holiday Name</label><input value={newPublicHolidayName} onChange={(event) => setNewPublicHolidayName(event.target.value)} placeholder="e.g. Awal Muharram" className={inputClass} /></div>
                <div className="md:col-span-2"><label className={labelClass}>Date</label><input type="date" value={newPublicHolidayDate} onChange={(event) => setNewPublicHolidayDate(event.target.value)} className={`${inputClass} font-mono`} /></div>
                <div className="md:col-span-2"><label className={labelClass}>Observed Date</label><input type="date" value={newPublicHolidayObservedDate} onChange={(event) => setNewPublicHolidayObservedDate(event.target.value)} className={`${inputClass} font-mono`} /></div>
                <div className="md:col-span-3"><label className={labelClass}>Notes</label><input value={newPublicHolidayNotes} onChange={(event) => setNewPublicHolidayNotes(event.target.value)} placeholder="Optional HR note" className={inputClass} /></div>
                <div className="flex items-end md:col-span-2"><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-xs font-bold text-white hover:opacity-90"><Plus className="h-4 w-4" /> Add Holiday</button></div>
              </form>

              <div className="overflow-x-auto p-5">
                {selectedGroupHolidays.length === 0 ? (
                  <EmptyState icon={Calendar} title={`No ${publicHolidayYear} holidays recorded`} description="Add an editable holiday record for this group and year." />
                ) : (
                  <table className="min-w-[900px] w-full text-left text-xs">
                    <thead className="border-b border-neutral-border text-[10px] font-bold uppercase tracking-wider text-on-surface-variant"><tr><th className="p-3">Holiday Name</th><th className="p-3">Date</th><th className="p-3">Observed Date</th><th className="p-3">Notes</th><th className="p-3 text-center">Enabled</th><th className="p-3 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-neutral-border/60">
                      {selectedGroupHolidays.map((holiday) => (
                        <tr key={holiday.id}>
                          <td className="p-3"><input value={holiday.name} onChange={(event) => updatePublicHoliday(holiday.id, 'name', event.target.value)} className="w-full border-0 bg-transparent p-0 font-semibold text-on-surface outline-none focus:ring-0" /></td>
                          <td className="p-3"><input type="date" value={holiday.holidayDate} onChange={(event) => updatePublicHoliday(holiday.id, 'holidayDate', event.target.value)} className={`${inputClass} font-mono`} /></td>
                          <td className="p-3"><input type="date" value={holiday.observedDate || ''} onChange={(event) => updatePublicHoliday(holiday.id, 'observedDate', event.target.value)} className={`${inputClass} font-mono`} /></td>
                          <td className="p-3"><input value={holiday.notes || ''} onChange={(event) => updatePublicHoliday(holiday.id, 'notes', event.target.value)} className="w-full border-0 bg-transparent p-0 text-[10px] text-on-surface-variant outline-none focus:ring-0" placeholder="Optional note" /></td>
                          <td className="p-3 text-center"><input type="checkbox" checked={holiday.enabled} onChange={(event) => updatePublicHoliday(holiday.id, 'enabled', event.target.checked)} className="h-4 w-4 accent-[#b42318]" /></td>
                          <td className="p-3 text-right"><button type="button" onClick={() => void deletePublicHoliday(holiday.id)} className="rounded p-2 text-red-700 hover:bg-red-50" title="Delete holiday"><Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEmployeeAssignment = () => (
    <div className="space-y-6">
      <SectionIntro
        icon={UserCog}
        eyebrow="Employee Leave Group Assignment"
        title="Assign multiple leave groups to active employees"
        description="Assign groups by employee and prevent overlapping leave types across active group assignments."
      />

      <div className={`${cardClass} p-5`}>
        <form onSubmit={assignLeaveGroup} className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className={labelClass}>Employee</label>
            <select value={assignmentEmployeeId} onChange={(event) => setAssignmentEmployeeId(event.target.value)} className={inputClass}>
              <option value="">Select active employee</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name} · {employee.department}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>Leave Group</label>
            <select value={assignmentGroupId} onChange={(event) => setAssignmentGroupId(event.target.value)} className={inputClass}>
              <option value="">Select leave group</option>
              {leaveGroups.filter((group) => group.enabled).map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>Effective Date</label>
            <input type="date" value={assignmentEffectiveDate} onChange={(event) => setAssignmentEffectiveDate(event.target.value)} className={`${inputClass} font-mono`} />
          </div>
          <div className="flex items-end md:col-span-2">
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90">
              <Plus className="h-4 w-4" /> Assign Group
            </button>
          </div>
        </form>
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        <div className="flex flex-col justify-between gap-3 border-b border-neutral-border bg-neutral-50 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-on-surface">Current Assignments</h2>
            <p className="mt-1 text-xs text-on-surface-variant">Assignments inherit the selected group’s leave type, policy, and carry-over rules.</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase text-primary">{visibleAssignments.length} assignment(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-xs">
            <thead className="border-b border-neutral-border text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Leave Group</th>
                <th className="p-4">Effective Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border/60">
              {visibleAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6">
                    <EmptyState icon={UserCog} title="No leave group assignments" description="Assign a leave group to an active employee to begin." />
                  </td>
                </tr>
              ) : visibleAssignments.map((assignment) => {
                const employee = activeEmployees.find((item) => item.id === assignment.employeeId);
                const group = leaveGroups.find((item) => item.id === assignment.groupId);
                if (!employee || !group) return null;
                const assignmentIsActive = assignment.active && group.enabled;
                return (
                  <tr key={assignment.id} className="align-middle hover:bg-neutral-50/60">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar employee={employee} className="h-8 w-8 rounded-full" />
                        <div>
                          <p className="font-bold text-on-surface">{employee.name}</p>
                          <p className="text-[10px] text-on-surface-variant">{employee.department} · {employee.designation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-on-surface">{group.name}</p>
                      <p className="mt-1 text-[10px] text-on-surface-variant">{group.leaveTypeIds.length} leave types</p>
                    </td>
                    <td className="p-4 font-mono text-on-surface">{formatToDDMMMYYYY(assignment.assignedAt)}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${assignmentIsActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-on-surface-variant'}`}>
                        {assignmentIsActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        disabled={!group.enabled}
                        onClick={() => {
                          if (assignment.active) {
                            void disableLeaveGroupAssignment(group.id, employee.id);
                          } else if (applyLeaveGroupAssignments(group.id, employee.id, true)) {
                            onShowNotification('Assignment Re-enabled', `${group.name} is active again for ${employee.name}.`);
                          }
                        }}
                        className={`rounded-md border px-3 py-1.5 text-[10px] font-bold ${assignment.active ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-primary/20 text-primary hover:bg-primary/5'}`}
                      >
                        {!group.enabled ? 'Enable Group First' : assignment.active ? 'Disable' : 'Re-enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCalendar = () => (
    <div className="space-y-6">
      <SectionIntro
        icon={CalendarDays}
        eyebrow="Company Shift-Planning Leave Calendar"
        title="Coordinate approved leave and team coverage"
        description="Review approved leave dates, selected-date absences, active-duty counts, and recommended backup employees."
      />
      <LeaveCalendar
        requests={requests}
        employees={activeEmployees}
        workShiftGroups={workShiftGroups}
        workShiftGroupDays={workShiftGroupDays}
        employeeWorkShiftAssignments={employeeWorkShiftAssignments}
        publicHolidayGroups={publicHolidayGroups}
        publicHolidays={publicHolidays}
        leaveGroups={leaveGroups}
      />
    </div>
  );

  const renderOffInLieu = () => (
    <div className="space-y-6">
      <SectionIntro
        icon={Clock3}
        eyebrow="Off in Lieu Request (Replacement Leave)"
        title="Convert approved OT into replacement leave"
        description="Use single or bulk submission for work outside normal hours. Up to 6 hours earns 0.5 day; more than 6 hours earns 1 day."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className={`${cardClass} p-5 xl:col-span-7`}>
          <div className="mb-5 flex flex-col justify-between gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-base font-bold text-primary">Create Replacement Leave Request</h2>
              <p className="mt-1 text-xs text-on-surface-variant">Save as a draft or submit directly for approval.</p>
            </div>
            <div className="flex rounded-md bg-neutral-100 p-1">
              {(['single', 'bulk'] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => { setOffInLieuMode(mode); setIsOffInLieuEmployeePickerOpen(false); if (mode === 'single') setOffInLieuEmployeeIds((ids) => ids.slice(0, 1)); }} className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase ${offInLieuMode === mode ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}>
                  {mode === 'single' ? 'Single Submission' : 'Bulk Submission'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Employee Details</h3>
              </div>
              {offInLieuMode === 'single' && (
                <button type="button" onClick={() => setOffInLieuMode('bulk')} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add additional employee
                </button>
              )}
            </div>
            {offInLieuMode === 'single' ? (
              <>
                <label className={labelClass}>Employee Name</label>
                <select value={offInLieuEmployeeIds[0] || ''} onChange={(event) => setOffInLieuEmployeeIds(event.target.value ? [event.target.value] : [])} className={inputClass}>
                  <option value="">Select active employee</option>
                  {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                </select>
                {selectedOffInLieuEmployees[0] && <EmployeeDetailsStrip employee={selectedOffInLieuEmployees[0]} />}
              </>
            ) : (
              <>
                <label className={labelClass}>Employee Names</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsOffInLieuEmployeePickerOpen((open) => !open)}
                    className={`${inputClass} flex items-center justify-between gap-3 text-left`}
                    aria-expanded={isOffInLieuEmployeePickerOpen}
                  >
                    <span className="min-w-0 truncate">
                      {selectedOffInLieuEmployees.length === 0
                        ? 'Select active employees'
                        : `${selectedOffInLieuEmployees.length} active employee${selectedOffInLieuEmployees.length === 1 ? '' : 's'} selected`}
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOffInLieuEmployeePickerOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOffInLieuEmployeePickerOpen && (
                    <div className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-y-auto rounded-md border border-neutral-border bg-white p-1 shadow-lg">
                      {activeEmployees.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-on-surface-variant">No active employees available.</p>
                      ) : activeEmployees.map((employee) => {
                        const checked = offInLieuEmployeeIds.includes(employee.id);
                        return (
                          <label key={employee.id} className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-primary/5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setOffInLieuEmployeeIds((ids) => (
                                checked
                                  ? ids.filter((id) => id !== employee.id)
                                  : [...ids, employee.id]
                              ))}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-[#b42318]"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-on-surface">{employee.name}</span>
                              <span className="mt-0.5 block truncate text-[10px] text-on-surface-variant">{employee.department} | {employee.designation}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[10px] text-on-surface-variant">Select one or more active employees from the dropdown.</p>
                {selectedOffInLieuEmployees.length > 0 && <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{selectedOffInLieuEmployees.map((employee) => <div key={employee.id}><EmployeeDetailsStrip employee={employee} compact /></div>)}</div>}
              </>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">Date of OT</h3>
                <p className="mt-1 text-[10px] text-on-surface-variant">Select multiple dates in the calendar, then enter the working hours for each date.</p>
              </div>
              <span className="rounded-full bg-secondary/10 px-2 py-1 text-[10px] font-bold text-secondary">{offInLieuEntries.length} date(s)</span>
            </div>

            <div className="rounded-lg border border-neutral-border/70">
              <div className="flex items-center justify-between border-b border-neutral-border/60 px-3 py-2">
                <button type="button" onClick={() => moveOffInLieuMonth(-1)} className="rounded p-1.5 text-on-surface-variant hover:bg-neutral-100"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-xs font-bold text-on-surface">{MONTHS[offInLieuCalendarDate.month]} {offInLieuCalendarDate.year}</span>
                <button type="button" onClick={() => moveOffInLieuMonth(1)} className="rounded p-1.5 text-on-surface-variant hover:bg-neutral-100"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-7 border-b border-neutral-border/60 bg-neutral-50 text-center">
                {WEEKDAYS.map((day) => <span key={day} className="p-2 text-[9px] font-bold uppercase text-on-surface-variant">{day}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-px bg-neutral-border/50">
                {offInLieuCalendarDays.map((day) => {
                  const selected = offInLieuEntries.some((entry) => entry.date === day.dateString);
                  return (
                    <button key={day.dateString} type="button" onClick={() => toggleOffInLieuDate(day.dateString)} className={`min-h-[44px] bg-white p-1.5 text-left transition hover:bg-primary/5 ${!day.isCurrentMonth ? 'text-on-surface-variant/35' : 'text-on-surface'} ${selected ? 'bg-primary/10 ring-1 ring-inset ring-primary' : ''}`}>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${selected ? 'bg-primary text-white' : ''}`}>{day.day}</span>
                      {selected && <span className="mt-1 block text-[8px] font-bold text-primary">OT selected</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {offInLieuEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-border p-5 text-center text-xs text-on-surface-variant">Select an OT date above. You can add multiple dates.</div>
              ) : offInLieuEntries.map((entry, index) => (
                <div key={entry.id} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-neutral-border/60 bg-neutral-50/50 p-3 sm:grid-cols-12">
                  <div className="sm:col-span-3"><label className={labelClass}>Date {index + 1}</label><input type="date" value={entry.date} onChange={(event) => updateOffInLieuEntry(entry.id, 'date', event.target.value)} className={`${inputClass} font-mono`} /></div>
                  <div className="sm:col-span-2"><label className={labelClass}>From</label><input type="time" value={entry.startTime} onChange={(event) => updateOffInLieuEntry(entry.id, 'startTime', event.target.value)} className={`${inputClass} font-mono`} /></div>
                  <div className="sm:col-span-2"><label className={labelClass}>To</label><input type="time" value={entry.endTime} onChange={(event) => updateOffInLieuEntry(entry.id, 'endTime', event.target.value)} className={`${inputClass} font-mono`} /></div>
                  <div className="sm:col-span-2"><span className={labelClass}>Working Hours</span><span className="block rounded-md border border-neutral-border bg-white px-3 py-2 font-mono text-xs font-bold text-on-surface">{entry.workingHours.toFixed(2)} h</span></div>
                  <div className="sm:col-span-2"><span className={labelClass}>Eligible Off in Lieu</span><span className="block rounded-md border border-secondary/20 bg-secondary/5 px-3 py-2 font-mono text-xs font-bold text-secondary">{entry.eligibleDays.toFixed(1)} day</span></div>
                  <button type="button" onClick={() => setOffInLieuEntries((entries) => entries.filter((item) => item.id !== entry.id))} className="rounded-md p-2 text-red-700 hover:bg-red-50 sm:col-span-1" title="Remove date"><Trash2 className="mx-auto h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setOffInLieuEntries((entries) => [...entries, { id: `ot-entry-${Date.now()}`, date: getGmt8DateString(), startTime: '09:00', endTime: '15:00', workingHours: 6, eligibleDays: 0.5 }])} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"><Plus className="h-3.5 w-3.5" /> Add additional date and time</button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Expiry Date</label>
              <input type="date" value={offInLieuExpiryDate} onChange={(event) => setOffInLieuExpiryDate(event.target.value)} className={`${inputClass} font-mono`} />
              <p className="mt-1 text-[10px] text-on-surface-variant">Defaults to one month from submission.</p>
            </div>
            <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-3">
              <span className={labelClass}>Total Off in Lieu (Replacement Leave)</span>
              <span className="font-mono text-2xl font-bold text-secondary">{offInLieuDaysPerEmployee.toFixed(1)} day(s)</span>
              {offInLieuMode === 'bulk' && <span className="ml-2 text-[10px] text-on-surface-variant">({offInLieuTotalDays.toFixed(1)} total across {selectedOffInLieuEmployees.length} employees)</span>}
            </div>
          </div>

          <div className="mt-5">
            <label className={labelClass}>Notes</label>
            <textarea value={offInLieuNotes} onChange={(event) => setOffInLieuNotes(event.target.value)} rows={3} className={inputClass} placeholder="Add supporting notes for the overtime or replacement leave request." />
          </div>

          <div className="mt-5 flex flex-col-reverse justify-end gap-2 border-t border-neutral-100 pt-4 sm:flex-row">
            <button type="button" onClick={resetOffInLieuForm} className="flex items-center justify-center gap-2 rounded-md border border-neutral-border px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-neutral-50"><RotateCcw className="h-4 w-4" /> Cancel</button>
            <button type="button" onClick={() => saveOffInLieu(false)} className="flex items-center justify-center gap-2 rounded-md border border-primary px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5"><Save className="h-4 w-4" /> Save</button>
            <button type="button" onClick={() => saveOffInLieu(true)} className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90"><Send className="h-4 w-4" /> Save and Submit</button>
          </div>
        </div>

        <div className={`${cardClass} p-5 xl:col-span-5`}>
          <div className="mb-5 flex flex-col justify-between gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-on-surface">Off in Lieu Approval Queue</h2>
              <p className="mt-1 text-xs text-on-surface-variant">Approve or reject submitted replacement leave.</p>
            </div>
            <select value={offInLieuStatusFilter} onChange={(event) => setOffInLieuStatusFilter(event.target.value as OffInLieuStatusFilter)} className={`${inputClass} max-w-[130px]`}>
              {(['All', 'Draft', 'Pending', 'Approved', 'Rejected'] as const).map((filter) => <option key={filter} value={filter}>{filter}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {filteredOffInLieuRequests.length === 0 ? (
              <EmptyState icon={Clock3} title="No replacement requests" description="Saved drafts and submissions will appear here." />
            ) : filteredOffInLieuRequests.map((request) => (
              <div key={request.id} className="rounded-lg border border-neutral-border/60 bg-neutral-50/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-on-surface">{request.employeeNames.join(', ')}</p>
                    <p className="mt-1 text-[10px] font-mono text-on-surface-variant">{request.id} | {request.submissionMode} | {formatToDDMMMYYYY(request.appliedDate)}</p>
                  </div>
                  <OffInLieuStatusBadge status={request.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-neutral-border/40 bg-white p-3 text-[10px]">
                  <div><span className={labelClass}>OT Dates</span><span className="font-mono font-bold text-on-surface">{request.entries.length}</span></div>
                  <div><span className={labelClass}>Days / Employee</span><span className="font-mono font-bold text-secondary">{request.totalDaysPerEmployee.toFixed(1)}</span></div>
                  <div><span className={labelClass}>Total Days</span><span className="font-mono font-bold text-on-surface">{request.totalDays.toFixed(1)}</span></div>
                  <div><span className={labelClass}>Expiry Date</span><span className="font-mono font-bold text-on-surface">{formatToDDMMMYYYY(request.expiryDate)}</span></div>
                </div>
                <div className="mt-3 space-y-1">
                  {request.entries.map((entry) => <div key={entry.id} className="flex justify-between text-[10px] text-on-surface-variant"><span>{formatToDDMMMYYYY(entry.date)} | {entry.startTime} - {entry.endTime}</span><span className="font-mono font-bold text-secondary">{entry.eligibleDays.toFixed(1)} day</span></div>)}
                </div>
                {request.notes && <p className="mt-3 rounded-md bg-white p-2 text-[10px] italic text-on-surface-variant">“{request.notes}”</p>}
                {request.status === 'Pending' && (
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => updateOffInLieuStatus(request.id, 'Rejected')} className="rounded bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-100">Reject</button>
                    <button type="button" onClick={() => updateOffInLieuStatus(request.id, 'Approved')} className="rounded bg-green-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-green-700">Approve</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-8 text-left">
      <div className="flex flex-col justify-between gap-5 border-b border-neutral-border/70 pb-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-background">Leave Management</h1>
          <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">Configure leave policies, employee leave groups, leave requests, Off in Lieu credits, balances, and payroll deductions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-bold uppercase text-primary">{activeEmployees.length} active employees</span>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={isLoadingWorkspace}
            className="flex items-center justify-center gap-2 rounded-md border border-neutral-border bg-white px-3 py-2 text-xs font-bold text-on-surface transition hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingWorkspace ? 'animate-spin' : ''}`} /> {isLoadingWorkspace ? 'Loading leave data...' : 'Refresh Leave Data'}
          </button>
          <button type="button" onClick={() => setActiveSection('off-in-lieu')} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90"><Plus className="h-4 w-4" /> Off in Lieu Request</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Active Leave Types', value: enabledLeaveConfigs.length, icon: FileText, tone: 'text-primary bg-primary/10' },
          { label: 'Leave Groups', value: leaveGroups.filter((group) => group.enabled).length, icon: Layers3, tone: 'text-secondary bg-secondary/10' },
          { label: 'Pending Leave', value: pendingLeaveCount, icon: CalendarDays, tone: 'text-amber-700 bg-amber-100' },
          { label: 'Pending OIL', value: pendingOffInLieuCount, icon: Clock3, tone: 'text-emerald-700 bg-emerald-100' }
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`${cardClass} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</span>
              <span className={`rounded-lg p-2 ${tone}`}><Icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-4 font-mono text-3xl font-bold text-on-surface">{isLoadingWorkspace ? '—' : value}</p>
          </div>
        ))}
      </div>

      <div className={`${cardClass} overflow-x-auto p-2`}>
        <div className="flex min-w-max gap-1">
          {SECTION_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveSection(id)} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${activeSection === id ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-neutral-50 hover:text-on-surface'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div className="space-y-1 leading-relaxed">
          <p>Leave groups can be combined per employee, but overlapping leave types across active groups are not allowed.</p>
          <p>Replacement Leave is created only after an Off in Lieu request has been approved.</p>
        </div>
      </div>

      {isLoadingWorkspace ? (
        <div className={`${cardClass} flex min-h-64 flex-col items-center justify-center gap-3 p-8`}>
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-bold text-on-surface">Loading leave data...</p>
          <p className="text-xs text-on-surface-variant">Refreshing policies, balances, requests, and coverage records.</p>
        </div>
      ) : (
        <>
      {activeSection === 'overview' && renderOverview()}
      {activeSection === 'policy' && renderPolicy()}
      {activeSection === 'carry-over' && renderCarryOver()}
      {activeSection === 'types' && renderLeaveTypes()}
      {activeSection === 'groups' && renderLeaveGroups()}
      {activeSection === 'employee-assignment' && renderEmployeeAssignment()}
      {activeSection === 'public-holidays' && renderPublicHolidays()}
      {activeSection === 'off-in-lieu' && renderOffInLieu()}
      {activeSection === 'calendar' && renderCalendar()}
        </>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-border p-8 text-center">
      <Icon className="mx-auto mb-2 h-8 w-8 text-on-surface-variant/30" />
      <p className="text-xs font-bold text-on-surface">{title}</p>
      <p className="mt-1 text-xs text-on-surface-variant">{description}</p>
    </div>
  );
}

function SectionIntro({
  icon: Icon,
  eyebrow,
  title,
  description
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-white p-2 text-primary shadow-sm"><Icon className="h-5 w-5" /></span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-bold text-on-surface">{title}</h2>
          <p className="mt-1 max-w-3xl text-xs text-on-surface-variant">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input type="number" min={min} value={value} onChange={(event) => onChange(Number(event.target.value))} className={`${inputClass} font-mono`} />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} font-mono`} />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-md border border-neutral-border/60 bg-neutral-50 px-3 py-2.5 text-xs">
      <span className="font-semibold text-on-surface">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#b42318]" />
    </label>
  );
}

function EmployeeDetailsStrip({
  employee,
  compact = false
}: {
  employee: Employee;
  compact?: boolean;
}) {
  return (
    <div className={`mt-3 grid grid-cols-1 gap-2 rounded-md border border-primary/15 bg-white p-3 text-[10px] ${compact ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}>
      <div className="flex items-center gap-2">
        <EmployeeAvatar employee={employee} className="h-7 w-7 rounded-full" />
        <div>
          <p className="font-bold text-on-surface">{employee.name}</p>
          <p className="text-on-surface-variant">{employee.id}</p>
        </div>
      </div>
      <div className={compact ? '' : 'text-right'}>
        <p className="font-semibold text-on-surface">{employee.department || 'Department not set'}</p>
        <p className="text-on-surface-variant">{employee.designation || 'Designation not set'}</p>
      </div>
    </div>
  );
}

function RequestStatusBadge({ status }: { status: LeaveRequestStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${status === 'Approved' ? 'bg-green-100 text-green-700' : status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{status}</span>;
}

function OffInLieuStatusBadge({ status }: { status: OffInLieuStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${status === 'Approved' ? 'bg-green-100 text-green-700' : status === 'Rejected' ? 'bg-red-100 text-red-700' : status === 'Draft' ? 'bg-neutral-100 text-on-surface-variant' : 'bg-amber-100 text-amber-700'}`}>{status}</span>;
}
