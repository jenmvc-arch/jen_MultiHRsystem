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
  ChevronLeft,
  ChevronRight,
  Clock3,
  CopyPlus,
  FileText,
  Layers3,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Users,
  XCircle
} from 'lucide-react';
import { Employee } from '../types';
import EmployeeAvatar from './EmployeeAvatar';
import LeaveCalendar from './LeaveCalendar';
import { getGmt8DateString, formatToDDMMMYYYY } from '../lib/dateUtils';
import { isCurrentActiveEmployee } from '../data';

export type LeaveRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveRequestStatus;
  appliedDate: string;
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

export interface LeaveConditioningPolicy {
  id: string;
  name: string;
  deductionRule: LeaveDeductionRule;
  roundingRule: LeaveRoundingRule;
  prorationRule: LeaveProrationRule;
  entitlementRule: LeaveEntitlementRule;
  excludeWeekends: boolean;
  excludePublicHolidays: boolean;
  notes: string;
}

export type CarryForwardRule = 'none' | 'full_balance' | 'capped';
export type CarryOverExpiryRule = 'no_expiry' | 'fixed_date' | 'months_after_year_end';

export interface CarryOverLeaveBalanceSettings {
  id: string;
  name: string;
  carryForwardRule: CarryForwardRule;
  maxCarryForwardDays: number;
  expiryRule: CarryOverExpiryRule;
  expiryDate: string;
  expiryMonths: number;
  notes: string;
}

export interface LeaveConfig {
  id: string;
  leaveType: string;
  daysEntitled: number;
  leaveGroup: string;
  condition: string;
  code?: string;
  isDefault?: boolean;
  enabled?: boolean;
  policyId?: string;
  carryOverId?: string;
}

export interface LeaveGroup {
  id: string;
  name: string;
  description: string;
  policyId: string;
  carryOverId: string;
  leaveTypeIds: string[];
  assignedEmployeeIds: string[];
  enabled: boolean;
}

export interface OffInLieuEntry {
  id: string;
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
  employeeIds: string[];
  employeeNames: string[];
  entries: OffInLieuEntry[];
  expiryDate: string;
  totalDaysPerEmployee: number;
  totalDays: number;
  status: OffInLieuStatus;
  submissionMode: OffInLieuSubmissionMode;
  appliedDate: string;
  submittedBy: string;
}

const STANDARD_POLICY_ID = 'leave-policy-standard';
const STANDARD_CARRY_OVER_ID = 'leave-carry-over-standard';

export const DEFAULT_LEAVE_CONDITIONING_POLICIES: LeaveConditioningPolicy[] = [
  {
    id: STANDARD_POLICY_ID,
    name: 'Standard Malaysia Leave Policy',
    deductionRule: 'working_days_excluding_holidays',
    roundingRule: 'nearest_half_day',
    prorationRule: 'joiner_proration',
    entitlementRule: 'calendar_year',
    excludeWeekends: true,
    excludePublicHolidays: true,
    notes: 'Use for the standard full-time employee population. Half-day requests are supported.'
  }
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
    notes: 'Unused carried-forward days expire at the end of the first quarter.'
  }
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
    carryOverId: STANDARD_CARRY_OVER_ID
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
    carryOverId: STANDARD_CARRY_OVER_ID
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
    carryOverId: STANDARD_CARRY_OVER_ID
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
    carryOverId: STANDARD_CARRY_OVER_ID
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
    carryOverId: STANDARD_CARRY_OVER_ID
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
    carryOverId: STANDARD_CARRY_OVER_ID
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
    carryOverId: STANDARD_CARRY_OVER_ID
  }
];

export const DEFAULT_LEAVE_GROUPS: LeaveGroup[] = [
  {
    id: 'full-time-standard',
    name: 'Full-Time Standard',
    description: 'Standard leave package for permanent and fixed-term employees.',
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
    leaveTypeIds: ['annual-leave', 'sick-leave', 'hospitalisation-leave', 'maternity-leave', 'paternity-leave', 'compassionate-leave', 'unpaid-leave'],
    assignedEmployeeIds: [],
    enabled: true
  },
  {
    id: 'all-staff',
    name: 'All Staff',
    description: 'Shared leave package available to every active employee.',
    policyId: STANDARD_POLICY_ID,
    carryOverId: STANDARD_CARRY_OVER_ID,
    leaveTypeIds: ['sick-leave', 'hospitalisation-leave', 'compassionate-leave', 'unpaid-leave'],
    assignedEmployeeIds: [],
    enabled: true
  }
];

interface LeaveManagementViewProps {
  employees: Employee[];
  onShowNotification: (title: string, message: string) => void;
  activeEntityId: string;
}

type LeaveWorkspaceSection = 'overview' | 'policy' | 'types' | 'groups' | 'off-in-lieu';
type RequestStatusFilter = 'All' | LeaveRequestStatus;
type OffInLieuStatusFilter = 'All' | OffInLieuStatus;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SECTION_TABS: Array<{ id: LeaveWorkspaceSection; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview & Requests', icon: ListChecks },
  { id: 'policy', label: 'Policy Rules', icon: SlidersHorizontal },
  { id: 'types', label: 'Leave Types', icon: FileText },
  { id: 'groups', label: 'Leave Groups', icon: Layers3 },
  { id: 'off-in-lieu', label: 'Off in Lieu', icon: Clock3 }
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

function roundToHalfDay(value: number) {
  return Math.round(value * 2) / 2;
}

function calculateLeaveDateDays(startDate: string, endDate: string, policy?: LeaveConditioningPolicy) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    const isWeekend = day === 0 || day === 6;
    if (policy?.deductionRule === 'calendar_days' || !policy?.excludeWeekends || !isWeekend) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (policy?.roundingRule === 'nearest_half_day') return roundToHalfDay(count);
  if (policy?.roundingRule === 'round_up_half_day') return Math.ceil(count * 2) / 2;
  return count;
}

function calculateWorkingHours(startTime: string, endTime: string) {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  if ([startHours, startMinutes, endHours, endMinutes].some(Number.isNaN)) return 0;

  let start = startHours * 60 + startMinutes;
  let end = endHours * 60 + endMinutes;
  if (end <= start) end += 24 * 60;
  return Math.round(((end - start) / 60) * 100) / 100;
}

function eligibleOffInLieuDays(hours: number) {
  if (hours <= 0) return 0;
  return hours > 6 ? 1 : 0.5;
}

function addOneMonth(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  activeEntityId
}: LeaveManagementViewProps) {
  const [activeSection, setActiveSection] = useState<LeaveWorkspaceSection>('overview');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveConfigs, setLeaveConfigs] = useState<LeaveConfig[]>(DEFAULT_LEAVE_CONFIGS);
  const [conditioningPolicies, setConditioningPolicies] = useState<LeaveConditioningPolicy[]>(DEFAULT_LEAVE_CONDITIONING_POLICIES);
  const [carryOverSettings, setCarryOverSettings] = useState<CarryOverLeaveBalanceSettings[]>(DEFAULT_CARRY_OVER_SETTINGS);
  const [leaveGroups, setLeaveGroups] = useState<LeaveGroup[]>(DEFAULT_LEAVE_GROUPS);
  const [offInLieuRequests, setOffInLieuRequests] = useState<OffInLieuRequest[]>([]);

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

  const [offInLieuMode, setOffInLieuMode] = useState<OffInLieuSubmissionMode>('single');
  const [offInLieuEmployeeIds, setOffInLieuEmployeeIds] = useState<string[]>([]);
  const [offInLieuExpiryDate, setOffInLieuExpiryDate] = useState(addOneMonth(getGmt8DateString()));
  const [offInLieuEntries, setOffInLieuEntries] = useState<OffInLieuEntry[]>([]);
  const [offInLieuCalendarDate, setOffInLieuCalendarDate] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  useEffect(() => {
    if (!activeEntityId) return;

    const savedRequests = readScopedJson<LeaveRequest[]>(`leave_requests_${activeEntityId}`, []);
    const savedConfigs = readScopedJson<LeaveConfig[]>(`leave_configs_${activeEntityId}`, DEFAULT_LEAVE_CONFIGS);
    const savedPolicies = readScopedJson<LeaveConditioningPolicy[]>(
      `leave_conditioning_policies_${activeEntityId}`,
      DEFAULT_LEAVE_CONDITIONING_POLICIES
    );
    const savedCarryOver = readScopedJson<CarryOverLeaveBalanceSettings[]>(
      `leave_carry_over_settings_${activeEntityId}`,
      DEFAULT_CARRY_OVER_SETTINGS
    );
    const savedGroups = readScopedJson<LeaveGroup[]>(
      `leave_groups_${activeEntityId}`,
      DEFAULT_LEAVE_GROUPS
    );
    const savedOffInLieu = readScopedJson<OffInLieuRequest[]>(
      `off_in_lieu_requests_${activeEntityId}`,
      []
    );

    setRequests(savedRequests);
    setLeaveConfigs(savedConfigs.map(normalizeLeaveConfig));
    setConditioningPolicies(savedPolicies.length > 0 ? savedPolicies : DEFAULT_LEAVE_CONDITIONING_POLICIES);
    setCarryOverSettings(savedCarryOver.length > 0 ? savedCarryOver : DEFAULT_CARRY_OVER_SETTINGS);
    setLeaveGroups(savedGroups.length > 0 ? savedGroups : DEFAULT_LEAVE_GROUPS);
    setOffInLieuRequests(savedOffInLieu);
  }, [activeEntityId]);

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

  const saveRequests = (next: LeaveRequest[]) => {
    setRequests(next);
    if (activeEntityId) writeScopedJson(`leave_requests_${activeEntityId}`, next);
  };

  const saveConfigs = (next: LeaveConfig[]) => {
    setLeaveConfigs(next);
    if (activeEntityId) writeScopedJson(`leave_configs_${activeEntityId}`, next);
  };

  const savePolicies = (next: LeaveConditioningPolicy[]) => {
    setConditioningPolicies(next);
    if (activeEntityId) writeScopedJson(`leave_conditioning_policies_${activeEntityId}`, next);
  };

  const saveCarryOver = (next: CarryOverLeaveBalanceSettings[]) => {
    setCarryOverSettings(next);
    if (activeEntityId) writeScopedJson(`leave_carry_over_settings_${activeEntityId}`, next);
  };

  const saveGroups = (next: LeaveGroup[]) => {
    setLeaveGroups(next);
    if (activeEntityId) writeScopedJson(`leave_groups_${activeEntityId}`, next);
  };

  const saveOffInLieuRequests = (next: OffInLieuRequest[]) => {
    setOffInLieuRequests(next);
    if (activeEntityId) writeScopedJson(`off_in_lieu_requests_${activeEntityId}`, next);
  };

  const currentEmployee = activeEmployees.find((employee) => employee.id === selectedEmployeeId);
  const enabledLeaveConfigs = leaveConfigs.filter((config) => config.enabled !== false);
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
    value: string | boolean
  ) => {
    savePolicies(conditioningPolicies.map((policy) => policy.id === id ? { ...policy, [field]: value } : policy));
  };

  const updateCarryOver = (
    id: string,
    field: keyof CarryOverLeaveBalanceSettings,
    value: string | number
  ) => {
    saveCarryOver(carryOverSettings.map((setting) => setting.id === id ? { ...setting, [field]: value } : setting));
  };

  const applyLeaveGroupAssignments = (groupId: string, employeeId: string, checked: boolean) => {
    const next = leaveGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          assignedEmployeeIds: checked
            ? [...new Set([...group.assignedEmployeeIds, employeeId])]
            : group.assignedEmployeeIds.filter((id) => id !== employeeId)
        };
      }
      if (checked) {
        return {
          ...group,
          assignedEmployeeIds: group.assignedEmployeeIds.filter((id) => id !== employeeId)
        };
      }
      return group;
    });
    saveGroups(next);
  };

  const calculateDays = (start: string, end: string) => calculateLeaveDateDays(start, end, policyForLeaveType);

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
      employeeId: employee.id,
      employeeName: employee.name,
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

  const updateLeaveRequestStatus = (id: string, status: Exclude<LeaveRequestStatus, 'Pending'>) => {
    saveRequests(requests.map((request) => request.id === id ? { ...request, status } : request));
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
      leaveTypeIds: [],
      assignedEmployeeIds: [],
      enabled: true
    };
    saveGroups([...leaveGroups, nextGroup]);
    setNewGroupName('');
    setNewGroupDescription('');
    onShowNotification('Leave Group Added', `${name} can now be assigned to active employees.`);
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
      employeeIds: [...offInLieuEmployeeIds],
      employeeNames: names,
      entries: offInLieuEntries.map((entry) => ({ ...entry })),
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

  const updateOffInLieuStatus = (id: string, status: Exclude<OffInLieuStatus, 'Draft' | 'Pending'>) => {
    saveOffInLieuRequests(offInLieuRequests.map((request) => request.id === id ? { ...request, status } : request));
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
      return {
        ...group,
        leaveTypeIds: checked
          ? [...new Set([...group.leaveTypeIds, leaveTypeId])]
          : group.leaveTypeIds.filter((id) => id !== leaveTypeId)
      };
    }));
  };

  const getGroupPolicyName = (group: LeaveGroup) => conditioningPolicies.find((policy) => policy.id === group.policyId)?.name || 'Not configured';
  const getGroupCarryOverName = (group: LeaveGroup) => carryOverSettings.find((setting) => setting.id === group.carryOverId)?.name || 'Not configured';

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'Active leave types', value: enabledLeaveConfigs.length, icon: FileText, tone: 'text-primary bg-primary/10' },
          { label: 'Leave groups', value: leaveGroups.filter((group) => group.enabled).length, icon: Layers3, tone: 'text-secondary bg-secondary/10' },
          { label: 'Pending leave', value: pendingLeaveCount, icon: CalendarDays, tone: 'text-amber-700 bg-amber-100' },
          { label: 'Pending off in lieu', value: pendingOffInLieuCount, icon: Clock3, tone: 'text-emerald-700 bg-emerald-100' }
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`${cardClass} p-4`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</span>
              <span className={`rounded-lg p-2 ${tone}`}><Icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-4 font-mono text-3xl font-bold text-on-surface">{value}</p>
          </div>
        ))}
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

      <div className={`${cardClass} overflow-hidden p-5`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-on-surface">Leave Balance Snapshot</h2>
            <p className="mt-1 text-xs text-on-surface-variant">Select an active employee to review the current entitlement picture.</p>
          </div>
          <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)} className={`${inputClass} max-w-[250px]`}>
            {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {enabledLeaveConfigs.slice(0, 8).map((config) => {
            const approvedDays = requests
              .filter((request) => request.employeeId === selectedEmployeeId && request.leaveType === config.leaveType && request.status === 'Approved')
              .reduce((total, request) => total + request.totalDays, 0);
            const remaining = Math.max(0, config.daysEntitled - approvedDays);
            return (
              <div key={config.id} className="rounded-lg border border-neutral-border/60 bg-neutral-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{config.leaveType}</span>
                <div className="mt-2 flex items-end justify-between">
                  <span className="font-mono text-2xl font-bold text-primary">{remaining}</span>
                  <span className="text-[10px] text-on-surface-variant">/ {config.daysEntitled} days</span>
                </div>
                <span className="mt-2 block text-[10px] text-on-surface-variant">{config.condition}</span>
              </div>
            );
          })}
        </div>
      </div>

      <LeaveCalendar requests={requests} employees={activeEmployees} />
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
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Policy Rule Set</p>
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
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ToggleRow label="Exclude weekends" checked={policy.excludeWeekends} onChange={(checked) => updatePolicy(policy.id, 'excludeWeekends', checked)} />
              <ToggleRow label="Exclude public holidays" checked={policy.excludePublicHolidays} onChange={(checked) => updatePolicy(policy.id, 'excludePublicHolidays', checked)} />
            </div>

            <div className="mt-5">
              <label className={labelClass}>Rule Notes</label>
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
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Carry-Over Rule Set</p>
                <input value={setting.name} onChange={(event) => updateCarryOver(setting.id, 'name', event.target.value)} className="mt-1 w-full border-0 bg-transparent p-0 text-base font-bold text-on-surface outline-none focus:ring-0" />
              </div>
              <RotateCcw className="h-5 w-5 text-secondary" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Carry Forward Rules" value={setting.carryForwardRule} onChange={(value) => updateCarryOver(setting.id, 'carryForwardRule', value)} options={[
                ['none', 'Do not carry forward'],
                ['full_balance', 'Carry full unused balance'],
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
            <div className="mt-5">
              <label className={labelClass}>Rule Notes</label>
              <textarea rows={3} value={setting.notes} onChange={(event) => updateCarryOver(setting.id, 'notes', event.target.value)} className={inputClass} />
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
                <th className="p-4">Carry Over</th>
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
                        <input value={config.leaveType} onChange={(event) => updateConfig(config.id, 'leaveType', event.target.value)} className="w-full bg-transparent font-bold text-on-surface outline-none" />
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
                    <select value={config.carryOverId} onChange={(event) => updateConfig(config.id, 'carryOverId', event.target.value)} className={inputClass}>
                      {carryOverSettings.map((setting) => <option key={setting.id} value={setting.id}>{setting.name}</option>)}
                    </select>
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {leaveGroups.map((group) => (
          <div key={group.id} className={`${cardClass} p-5`}>
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

            <div className="mt-4">
              <p className={labelClass}>Type of Leave in this group</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {leaveConfigs.map((config) => (
                  <label key={config.id} className="flex items-center gap-2 rounded-md border border-neutral-border/60 px-2.5 py-2 text-xs">
                    <input type="checkbox" checked={group.leaveTypeIds.includes(config.id)} onChange={(event) => changeGroupLeaveType(group.id, config.id, event.target.checked)} className="h-3.5 w-3.5 accent-[#b42318]" />
                    <span className="font-semibold text-on-surface">{config.leaveType}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className={labelClass}>Assigned active employees</p>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{group.assignedEmployeeIds.length} assigned</span>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-neutral-border/60 p-2">
                {activeEmployees.length === 0 ? (
                  <p className="p-2 text-xs text-on-surface-variant">No active employees available.</p>
                ) : activeEmployees.map((employee) => (
                  <label key={employee.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-neutral-50">
                    <input type="checkbox" checked={group.assignedEmployeeIds.includes(employee.id)} onChange={(event) => applyLeaveGroupAssignments(group.id, employee.id, event.target.checked)} className="h-3.5 w-3.5 accent-[#b42318]" />
                    <EmployeeAvatar employee={employee} className="h-6 w-6 rounded-full" />
                    <span className="font-semibold text-on-surface">{employee.name}</span>
                    <span className="ml-auto text-[10px] text-on-surface-variant">{employee.department}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-[10px] text-on-surface-variant">
              <span>{group.leaveTypeIds.length} leave types</span>
              <span>{getGroupPolicyName(group)} | {getGroupCarryOverName(group)}</span>
            </div>
          </div>
        ))}
      </div>
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
                <button key={mode} type="button" onClick={() => { setOffInLieuMode(mode); if (mode === 'single') setOffInLieuEmployeeIds((ids) => ids.slice(0, 1)); }} className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase ${offInLieuMode === mode ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}>
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
                <select multiple value={offInLieuEmployeeIds} onChange={(event) => setOffInLieuEmployeeIds(Array.from(event.target.selectedOptions).map((option) => (option as HTMLOptionElement).value))} className={`${inputClass} min-h-[112px]`}>
                  {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} | {employee.department} | {employee.designation}</option>)}
                </select>
                <p className="mt-2 text-[10px] text-on-surface-variant">Hold Ctrl/Cmd to select more than one active employee.</p>
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
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
            <Briefcase className="h-3.5 w-3.5" /> Leave Administration
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-on-background">Leave Management</h1>
          <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">Configure leave rules, build employee leave groups, review applications, and convert approved overtime into replacement leave.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-bold uppercase text-primary">{activeEmployees.length} active employees</span>
          <button type="button" onClick={() => setActiveSection('off-in-lieu')} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90"><Plus className="h-4 w-4" /> Off in Lieu Request</button>
        </div>
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

      {activeSection === 'overview' && renderOverview()}
      {activeSection === 'policy' && renderPolicy()}
      {activeSection === 'types' && renderLeaveTypes()}
      {activeSection === 'groups' && renderLeaveGroups()}
      {activeSection === 'off-in-lieu' && renderOffInLieu()}
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
