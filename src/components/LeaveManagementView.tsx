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
  OffInLieuEntry,
  OffInLieuRequest,
  OffInLieuSubmissionMode,
  OffInLieuStatus,
  roundToHalfDay,
  splitLeaveDaysAcrossPayrollMonths,
  STANDARD_CARRY_OVER_ID,
  STANDARD_POLICY_ID,
  REPLACEMENT_LEAVE_TYPE_ID,
} from '../lib/leaveDomain';
import { loadLeaveWorkspace, persistLeaveWorkspace } from '../lib/leaveService';

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
  const [activeSection, setActiveSection] = useState<LeaveWorkspaceSection>('overview');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveConfigs, setLeaveConfigs] = useState<LeaveConfig[]>(DEFAULT_LEAVE_CONFIGS);
  const [conditioningPolicies, setConditioningPolicies] = useState<LeaveConditioningPolicy[]>(DEFAULT_LEAVE_CONDITIONING_POLICIES);
  const [carryOverSettings, setCarryOverSettings] = useState<CarryOverLeaveBalanceSettings[]>(DEFAULT_CARRY_OVER_SETTINGS);
  const [leaveGroups, setLeaveGroups] = useState<LeaveGroup[]>(DEFAULT_LEAVE_GROUPS);
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

  const [offInLieuMode, setOffInLieuMode] = useState<OffInLieuSubmissionMode>('single');
  const [offInLieuEmployeeIds, setOffInLieuEmployeeIds] = useState<string[]>([]);
  const [offInLieuExpiryDate, setOffInLieuExpiryDate] = useState(addOneMonth(getGmt8DateString()));
  const [offInLieuEntries, setOffInLieuEntries] = useState<OffInLieuEntry[]>([]);
  const [offInLieuCalendarDate, setOffInLieuCalendarDate] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  useEffect(() => {
    let cancelled = false;
    if (!activeEntityId) return () => {
      cancelled = true;
    };

    void loadLeaveWorkspace(activeEntityId).then((workspace) => {
      if (cancelled) return;
      setRequests(workspace.requests);
      setLeaveConfigs(workspace.configs.map(normalizeLeaveConfig));
      setConditioningPolicies(workspace.policies.length > 0 ? workspace.policies : DEFAULT_LEAVE_CONDITIONING_POLICIES);
      setCarryOverSettings(workspace.carryOverSettings.length > 0 ? workspace.carryOverSettings : DEFAULT_CARRY_OVER_SETTINGS);
      setLeaveGroups(workspace.groups.length > 0 ? workspace.groups : DEFAULT_LEAVE_GROUPS);
      setOffInLieuRequests(workspace.offInLieuRequests);
      setLedgerEntries(workspace.ledgerEntries);
      setPayrollDeductions(workspace.payrollDeductions);
    });

    return () => {
      cancelled = true;
    };
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

  const saveGroups = (next: LeaveGroup[]) => {
    setLeaveGroups(next);
    if (activeEntityId) writeScopedJson(`leave_groups_${activeEntityId}`, next);
    persistWorkspace({ groups: next });
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
      assignments: [],
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
      return group;
    });
    const duplicates = findDuplicateAssignedLeaveTypes(next, employeeId);
    if (checked && duplicates.length > 0) {
      const duplicateNames = duplicates
        .map((id) => leaveConfigs.find((config) => config.id === id)?.leaveType || id)
        .join(', ');
      onShowNotification(
        'Leave Group Conflict',
        `This employee already has an active group containing: ${duplicateNames}. Remove the duplicate leave type before assigning this group.`,
      );
      return;
    }
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

  const updateLeaveRequestStatus = (id: string, status: Exclude<LeaveRequestStatus, 'Pending'>) => {
    const request = requests.find((item) => item.id === id);
    if (!request) return;
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
      entityId: activeEntityId,
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
    const request = offInLieuRequests.find((item) => item.id === id);
    if (!request) return;
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
            const balance = selectedEmployeeBalances.find((item) => item.leaveTypeId === config.id);
            const remaining = balance?.remaining ?? config.daysEntitled;
            return (
              <div key={config.id} className="rounded-lg border border-neutral-border/60 bg-neutral-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{config.leaveType}</span>
                <div className="mt-2 flex items-end justify-between">
                  <span className="font-mono text-2xl font-bold text-primary">{remaining}</span>
                  <span className="text-[10px] text-on-surface-variant">/ {(balance?.entitlement ?? config.daysEntitled) + (balance?.carryOver ?? 0)} days</span>
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
