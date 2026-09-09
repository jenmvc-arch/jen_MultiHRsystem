import { employeeSupabase, isEmployeeSupabaseConfigured } from './supabaseClient';
import {
  CarryOverLeaveBalanceSettings,
  DEFAULT_CARRY_OVER_SETTINGS,
  DEFAULT_LEAVE_CONDITIONING_POLICIES,
  DEFAULT_LEAVE_CONFIGS,
  DEFAULT_LEAVE_GROUPS,
  DEFAULT_PUBLIC_HOLIDAY_GROUPS,
  DEFAULT_PUBLIC_HOLIDAYS,
  DEFAULT_WORK_SHIFT_GROUP_DAYS,
  DEFAULT_WORK_SHIFT_GROUPS,
  EmployeeLeaveGroupAssignment,
  EmployeeWorkShiftAssignment,
  LeaveBalanceLedgerEntry,
  LeaveConfig,
  LeaveConditioningPolicy,
  LeaveGroup,
  LeaveGroupItem,
  LeavePayrollDeduction,
  LeaveRequest,
  LeaveWorkspaceData,
  PublicHoliday,
  PublicHolidayGroup,
  WorkShiftGroup,
  WorkShiftGroupDay,
  calculateWorkShiftWeeklyHours,
  normalizeWorkShiftGroupDays,
  OffInLieuRequest,
} from './leaveDomain';

const toCamel = (value: any): any => {
  if (Array.isArray(value)) return value.map(toCamel);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
    toCamel(item),
  ]));
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local preview storage is optional.
  }
}

async function requestAdminLeaveWorkspace<T>(entityId: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/leave-workspace?entityId=${encodeURIComponent(entityId)}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Admin leave workspace request failed (${response.status}).`);
  return payload as T;
}

async function requestEmployeeLeaveWorkspace(): Promise<LeaveWorkspaceData> {
  const response = await fetch('/api/employee-portal/leave-workspace', {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Employee leave workspace request failed (${response.status}).`);
  }
  return payload as LeaveWorkspaceData;
}

function hasLegacyLeaveData(entityId: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  return [
    `leave_requests_${entityId}`,
    `leave_configs_${entityId}`,
    `leave_conditioning_policies_${entityId}`,
    `leave_carry_over_settings_${entityId}`,
    `leave_groups_${entityId}`,
    `off_in_lieu_requests_${entityId}`,
    `work_shift_groups_${entityId}`,
    `employee_work_shift_assignments_${entityId}`,
    `public_holiday_groups_${entityId}`,
    `public_holidays_${entityId}`,
  ].some((key) => Boolean(localStorage.getItem(key)));
}

function normalizeConfig(value: LeaveConfig, index: number): LeaveConfig {
  const fallback = DEFAULT_LEAVE_CONFIGS[index] || DEFAULT_LEAVE_CONFIGS[0];
  return {
    ...fallback,
    ...value,
    leaveType: value.leaveType || fallback.leaveType,
    daysEntitled: Number(value.daysEntitled ?? fallback.daysEntitled),
    enabled: value.enabled !== false,
    policyId: value.policyId || fallback.policyId,
    carryOverId: value.carryOverId || fallback.carryOverId,
    canCarryOver: value.canCarryOver !== false,
    requiresAttachment: value.requiresAttachment === true,
  };
}

function normalizeLeaveGroup(group: LeaveGroup): LeaveGroup {
  return {
    ...group,
    publicHolidayGroupIds: group.publicHolidayGroupIds?.length
      ? [...new Set(group.publicHolidayGroupIds)].slice(0, 2)
      : ['public-holiday-malaysia-national'],
  };
}

function loadLocalWorkspace(entityId: string, employeeId?: string): LeaveWorkspaceData {
  const configs = readJson<LeaveConfig[]>(
    `leave_configs_${entityId}`,
    DEFAULT_LEAVE_CONFIGS,
  ).map(normalizeConfig);
  const policies = readJson<LeaveConditioningPolicy[]>(
    `leave_conditioning_policies_${entityId}`,
    DEFAULT_LEAVE_CONDITIONING_POLICIES,
  );
  const carryOverSettings = readJson<CarryOverLeaveBalanceSettings[]>(
    `leave_carry_over_settings_${entityId}`,
    DEFAULT_CARRY_OVER_SETTINGS,
  );
  const groups = readJson<LeaveGroup[]>(
    `leave_groups_${entityId}`,
    DEFAULT_LEAVE_GROUPS,
  ).map(normalizeLeaveGroup);
  const workShiftGroups = readJson<WorkShiftGroup[]>(
    `work_shift_groups_${entityId}`,
    DEFAULT_WORK_SHIFT_GROUPS,
  );
  const workShiftGroupDays = workShiftGroups.flatMap((group) => normalizeWorkShiftGroupDays(
    readJson<WorkShiftGroupDay[]>(`work_shift_group_days_${entityId}`, DEFAULT_WORK_SHIFT_GROUP_DAYS),
    group.id,
  ));
  const employeeWorkShiftAssignments = readJson<EmployeeWorkShiftAssignment[]>(
    `employee_work_shift_assignments_${entityId}`,
    [],
  );
  const publicHolidayGroups = readJson<PublicHolidayGroup[]>(
    `public_holiday_groups_${entityId}`,
    DEFAULT_PUBLIC_HOLIDAY_GROUPS,
  );
  const publicHolidays = readJson<PublicHoliday[]>(
    `public_holidays_${entityId}`,
    DEFAULT_PUBLIC_HOLIDAYS,
  );
  const requests = readJson<LeaveRequest[]>(`leave_requests_${entityId}`, [])
    .filter((request) => !employeeId || request.employeeId === employeeId);
  const offInLieuRequests = readJson<OffInLieuRequest[]>(
    `off_in_lieu_requests_${entityId}`,
    [],
  );
  const ledgerEntries = readJson<LeaveBalanceLedgerEntry[]>(
    `leave_balance_ledger_${entityId}`,
    [],
  );
  const payrollDeductions = readJson<LeavePayrollDeduction[]>(
    `leave_payroll_deductions_${entityId}`,
    [],
  );
  const savedAssignments = readJson<EmployeeLeaveGroupAssignment[]>(
    `leave_group_assignments_${entityId}`,
    [],
  );
  const assignments = savedAssignments.length > 0
    ? savedAssignments.map((assignment) => ({ ...assignment, entityId }))
    : groups.flatMap((group) => group.assignedEmployeeIds.map((employeeId) => ({
      id: `${group.id}-${employeeId}`,
      entityId,
      employeeId,
      groupId: group.id,
      active: group.enabled,
    })));

  return {
    configs,
    policies: policies.length > 0 ? policies : DEFAULT_LEAVE_CONDITIONING_POLICIES,
    carryOverSettings: carryOverSettings.length > 0 ? carryOverSettings : DEFAULT_CARRY_OVER_SETTINGS,
    groups: groups.length > 0 ? groups : DEFAULT_LEAVE_GROUPS,
    assignments,
    workShiftGroups: workShiftGroups.map((group) => ({
      ...group,
      weeklyHours: calculateWorkShiftWeeklyHours(workShiftGroupDays, group.id),
      weeklyHoursWarning: calculateWorkShiftWeeklyHours(workShiftGroupDays, group.id) > 45,
    })),
    workShiftGroupDays,
    employeeWorkShiftAssignments,
    publicHolidayGroups,
    publicHolidays,
    requests: requests.map((request) => ({
      ...request,
      entityId: request.entityId || entityId,
      leaveTypeId: request.leaveTypeId || configs.find((config) => config.leaveType === request.leaveType)?.id,
    })),
    offInLieuRequests,
    ledgerEntries,
    payrollDeductions,
    source: 'local',
  };
}

function persistLocalWorkspace(entityId: string, workspace: LeaveWorkspaceData) {
  writeJson(`leave_configs_${entityId}`, workspace.configs);
  writeJson(`leave_conditioning_policies_${entityId}`, workspace.policies);
  writeJson(`leave_carry_over_settings_${entityId}`, workspace.carryOverSettings);
  writeJson(`leave_groups_${entityId}`, workspace.groups);
  writeJson(`leave_group_assignments_${entityId}`, workspace.assignments);
  writeJson(`work_shift_groups_${entityId}`, workspace.workShiftGroups);
  writeJson(`work_shift_group_days_${entityId}`, workspace.workShiftGroupDays);
  writeJson(`employee_work_shift_assignments_${entityId}`, workspace.employeeWorkShiftAssignments);
  writeJson(`public_holiday_groups_${entityId}`, workspace.publicHolidayGroups);
  writeJson(`public_holidays_${entityId}`, workspace.publicHolidays);
  writeJson(`leave_requests_${entityId}`, workspace.requests);
  writeJson(`off_in_lieu_requests_${entityId}`, workspace.offInLieuRequests);
  writeJson(`leave_balance_ledger_${entityId}`, workspace.ledgerEntries);
  writeJson(`leave_payroll_deductions_${entityId}`, workspace.payrollDeductions);
}

async function selectTable(table: string, entityId: string, employeeId?: string): Promise<any[]> {
  if (!employeeSupabase) return [];
  let query = employeeSupabase.from(table).select('*').eq('entity_id', entityId);
  if (table === 'leave_requests' && employeeId) {
    query = query.eq('employee_id', employeeId);
  }
  const result = await query;
  if (result.error) {
    if (/relation .* does not exist|schema cache|could not find the table/i.test(result.error.message || '')) {
      return [];
    }
    throw result.error;
  }
  return (result.data || []).map(toCamel);
}

function mapRowsToWorkspace(entityId: string, rows: Record<string, any[]>): LeaveWorkspaceData {
  const configs: LeaveConfig[] = rows.types.map((row) => ({
    id: row.id,
    entityId,
    leaveType: row.name,
    daysEntitled: Number(row.defaultEntitlementDays || 0),
    leaveGroup: row.leaveGroup || '',
    condition: row.condition || (row.paidTreatment === 'unpaid' ? 'Unpaid leave' : 'Paid leave'),
    code: row.code || '',
    isDefault: row.isDefault === true,
    enabled: row.enabled !== false,
    systemManaged: row.systemManaged === true,
    canCarryOver: row.canCarryOver !== false,
    policyId: row.policyId || undefined,
    carryOverId: row.carryOverId || undefined,
  }));
  const policies = rows.policies as LeaveConditioningPolicy[];
  const carryOverSettings = rows.carry as CarryOverLeaveBalanceSettings[];
  const items = rows.items as LeaveGroupItem[];
  const assignments = rows.assignments as EmployeeLeaveGroupAssignment[];
  const groups: LeaveGroup[] = rows.groups.map((group) => {
    const groupItems = items.filter((item) => item.groupId === group.id);
    const groupAssignments = assignments
      .filter((assignment) => assignment.groupId === group.id && assignment.active)
      .map((assignment) => assignment.employeeId);
    return {
      ...group,
      policyId: group.policyId || groupItems[0]?.policyId || policies[0]?.id,
      carryOverId: group.carryOverId || groupItems[0]?.carryOverId || carryOverSettings[0]?.id,
      leaveTypeIds: groupItems.filter((item) => item.enabled !== false).map((item) => item.leaveTypeId),
      publicHolidayGroupIds: group.publicHolidayGroupIds?.length
        ? [...new Set(group.publicHolidayGroupIds)].slice(0, 2)
        : ['public-holiday-malaysia-national'],
      items: groupItems,
      assignedEmployeeIds: groupAssignments,
      enabled: group.enabled !== false,
    };
  });
  const workShiftGroups: WorkShiftGroup[] = rows.workGroups.length > 0
    ? rows.workGroups.map((group) => ({ ...group }))
    : DEFAULT_WORK_SHIFT_GROUPS;
  const workShiftGroupDays = workShiftGroups.flatMap((group) => normalizeWorkShiftGroupDays(
    rows.workDays.map((day) => ({
      ...day,
      actualHours: Number(day.actualHours ?? 0),
    })),
    group.id,
  ));
  const normalizedWorkShiftGroups = workShiftGroups.map((group) => {
    const weeklyHours = calculateWorkShiftWeeklyHours(workShiftGroupDays, group.id);
    return {
      ...group,
      weeklyHours,
      weeklyHoursWarning: weeklyHours > 45,
    };
  });

  return {
    configs: configs.length > 0 ? configs : DEFAULT_LEAVE_CONFIGS,
    policies: policies.length > 0 ? policies : DEFAULT_LEAVE_CONDITIONING_POLICIES,
    carryOverSettings: carryOverSettings.length > 0 ? carryOverSettings : DEFAULT_CARRY_OVER_SETTINGS,
    groups: groups.length > 0 ? groups : DEFAULT_LEAVE_GROUPS,
    assignments,
    workShiftGroups: normalizedWorkShiftGroups,
    workShiftGroupDays,
    employeeWorkShiftAssignments: rows.workAssignments,
    publicHolidayGroups: rows.holidayGroups.length > 0
      ? [
        ...DEFAULT_PUBLIC_HOLIDAY_GROUPS.filter((defaultGroup) => !rows.holidayGroups.some((group) => group.id === defaultGroup.id)),
        ...rows.holidayGroups,
      ]
      : DEFAULT_PUBLIC_HOLIDAY_GROUPS,
    publicHolidays: rows.holidays.length > 0
      ? [...DEFAULT_PUBLIC_HOLIDAYS.filter((defaultHoliday) => !rows.holidays.some((holiday) => holiday.id === defaultHoliday.id)), ...rows.holidays]
      : DEFAULT_PUBLIC_HOLIDAYS,
    requests: rows.requests,
    offInLieuRequests: rows.offRequests.map((request) => ({
      ...request,
      entries: rows.offEntries.filter((entry) => entry.requestId === request.id),
    })),
    ledgerEntries: rows.ledger,
    payrollDeductions: rows.deductions,
    source: 'supabase',
  };
}

export async function loadLeaveWorkspace(entityId: string, options?: { employeeId?: string; preferLocal?: boolean }): Promise<LeaveWorkspaceData> {
  const employeeId = options?.employeeId;
  const localFallback = loadLocalWorkspace(entityId, employeeId);
  if (options?.preferLocal) return localFallback;
  if (typeof window !== 'undefined' && isEmployeeSupabaseConfigured) {
    if (employeeId) {
      return requestEmployeeLeaveWorkspace();
    }
    const rows = await requestAdminLeaveWorkspace<Record<string, any[]>>(entityId);
    const workspace = mapRowsToWorkspace(entityId, {
      types: (rows.leave_types || []).map(toCamel),
      policies: (rows.leave_condition_policies || []).map(toCamel),
      carry: (rows.leave_carryover_settings || []).map(toCamel),
      groups: (rows.leave_groups || []).map(toCamel),
      items: (rows.leave_group_items || []).map(toCamel),
      assignments: (rows.employee_leave_group_assignments || []).map(toCamel),
      requests: (rows.leave_requests || []).map(toCamel),
      offRequests: (rows.off_in_lieu_requests || []).map(toCamel),
      offEntries: (rows.off_in_lieu_entries || []).map(toCamel),
      ledger: (rows.leave_balance_ledger || []).map(toCamel),
      deductions: (rows.leave_payroll_deductions || []).map(toCamel),
      workGroups: (rows.work_shift_groups || []).map(toCamel),
      workDays: (rows.work_shift_group_days || []).map(toCamel),
      workAssignments: (rows.employee_work_shift_assignments || []).map(toCamel),
      holidayGroups: (rows.public_holiday_groups || []).map(toCamel),
      holidays: (rows.public_holidays || []).map(toCamel),
    });
    persistLocalWorkspace(entityId, workspace);
    return workspace;
  }
  if (!entityId || !isEmployeeSupabaseConfigured || !employeeSupabase) return localFallback;

  try {
    const [types, policies, carry, groups, items, assignments, requests, offRequests, offEntries, ledger, deductions, workGroups, workDays, workAssignments, holidayGroups, holidays] = await Promise.all([
      selectTable('leave_types', entityId),
      selectTable('leave_condition_policies', entityId),
      selectTable('leave_carryover_settings', entityId),
      selectTable('leave_groups', entityId),
      selectTable('leave_group_items', entityId),
      selectTable('employee_leave_group_assignments', entityId),
      selectTable('leave_requests', entityId, employeeId),
      selectTable('off_in_lieu_requests', entityId),
      selectTable('off_in_lieu_entries', entityId),
      selectTable('leave_balance_ledger', entityId),
      selectTable('leave_payroll_deductions', entityId),
      selectTable('work_shift_groups', entityId),
      selectTable('work_shift_group_days', entityId),
      selectTable('employee_work_shift_assignments', entityId),
      selectTable('public_holiday_groups', entityId),
      selectTable('public_holidays', entityId),
    ]);
    const workspace = mapRowsToWorkspace(entityId, {
      types,
      policies,
      carry,
      groups,
      items,
      assignments,
      requests,
      offRequests,
      offEntries,
      ledger,
      deductions,
      workGroups,
      workDays,
      workAssignments,
      holidayGroups,
      holidays,
    });
    const hasRemoteData = types.length + policies.length + carry.length + groups.length + requests.length + offRequests.length + workGroups.length + holidayGroups.length > 0;
    const needsScheduleOrHolidaySeed = workGroups.length === 0 || workDays.length === 0 || holidayGroups.length === 0 || holidays.length === 0;
    if (!employeeId && hasLegacyLeaveData(entityId) && typeof localStorage !== 'undefined' && localStorage.getItem(`leave_legacy_imported_${entityId}`) !== 'true') {
      const merged: LeaveWorkspaceData = {
        ...workspace,
        requests: [
          ...workspace.requests,
          ...localFallback.requests.filter((request) => !workspace.requests.some((item) => item.id === request.id)),
        ],
        offInLieuRequests: [
          ...workspace.offInLieuRequests,
          ...localFallback.offInLieuRequests.filter((request) => !workspace.offInLieuRequests.some((item) => item.id === request.id)),
        ],
        ledgerEntries: [
          ...workspace.ledgerEntries,
          ...localFallback.ledgerEntries.filter((entry) => !workspace.ledgerEntries.some((item) => item.id === entry.id)),
        ],
        payrollDeductions: [
          ...workspace.payrollDeductions,
          ...localFallback.payrollDeductions.filter((deduction) => !workspace.payrollDeductions.some((item) => item.id === deduction.id)),
        ],
      };
      await persistLeaveWorkspace(entityId, merged);
      localStorage.setItem(`leave_legacy_imported_${entityId}`, 'true');
      return merged;
    }
    if (!employeeId && !hasRemoteData) {
      await importLegacyLeaveData(entityId, localFallback);
      return localFallback;
    }
    if (needsScheduleOrHolidaySeed) {
      await persistLeaveWorkspace(entityId, workspace);
    }
    persistLocalWorkspace(entityId, workspace);
    return workspace;
  } catch (error) {
    console.warn('[Leave Service] Falling back to local leave workspace:', error);
    return localFallback;
  }
}

export async function persistLeaveWorkspace(entityId: string, workspace: LeaveWorkspaceData): Promise<void> {
  if (typeof window !== 'undefined' && isEmployeeSupabaseConfigured) {
    await requestAdminLeaveWorkspace<{ ok: boolean }>(entityId, {
      method: 'POST',
      body: JSON.stringify({ entityId, workspace }),
    });
    persistLocalWorkspace(entityId, workspace);
    return;
  }
  if (!isEmployeeSupabaseConfigured || !employeeSupabase) {
    persistLocalWorkspace(entityId, workspace);
    return;
  }

  throw new Error('Leave workspace writes require the protected admin API.');
}

export async function importLegacyLeaveData(entityId: string, workspace = loadLocalWorkspace(entityId)): Promise<void> {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(`leave_legacy_imported_${entityId}`) === 'true') return;
  persistLocalWorkspace(entityId, workspace);
  if (isEmployeeSupabaseConfigured && employeeSupabase) {
    try {
      await persistLeaveWorkspace(entityId, workspace);
      if (typeof localStorage !== 'undefined') localStorage.setItem(`leave_legacy_imported_${entityId}`, 'true');
    } catch (error) {
      console.warn('[Leave Service] Legacy leave import did not complete:', error);
    }
  }
}

export async function saveLeaveRequest(entityId: string, request: LeaveRequest): Promise<void> {
  const workspace = await loadLeaveWorkspace(entityId);
  const next = {
    ...workspace,
    requests: [request, ...workspace.requests.filter((item) => item.id !== request.id)],
  };
  await persistLeaveWorkspace(entityId, next);
}

export async function saveOffInLieuRequest(entityId: string, request: OffInLieuRequest): Promise<void> {
  const workspace = await loadLeaveWorkspace(entityId);
  const next = {
    ...workspace,
    offInLieuRequests: [request, ...workspace.offInLieuRequests.filter((item) => item.id !== request.id)],
  };
  await persistLeaveWorkspace(entityId, next);
}

export async function saveLeaveLedgerEntries(entityId: string, entries: LeaveBalanceLedgerEntry[]): Promise<void> {
  const workspace = await loadLeaveWorkspace(entityId);
  const byId = new Map(workspace.ledgerEntries.map((entry) => [entry.id, entry]));
  entries.forEach((entry) => byId.set(entry.id, entry));
  await persistLeaveWorkspace(entityId, { ...workspace, ledgerEntries: [...byId.values()] });
}

export async function savePayrollDeduction(entityId: string, deduction: LeavePayrollDeduction): Promise<void> {
  const workspace = await loadLeaveWorkspace(entityId);
  const next = [
    deduction,
    ...workspace.payrollDeductions.filter((item) => item.id !== deduction.id && item.leaveRequestId !== deduction.leaveRequestId),
  ];
  await persistLeaveWorkspace(entityId, { ...workspace, payrollDeductions: next });
}

export async function getLeaveWorkspaceForEmployee(entityId: string): Promise<LeaveWorkspaceData> {
  return loadLeaveWorkspace(entityId);
}

export async function saveLeaveWorkspace(entityId: string, workspace: LeaveWorkspaceData): Promise<void> {
  await persistLeaveWorkspace(entityId, workspace);
}
