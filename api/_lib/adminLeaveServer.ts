import { createMainAdminClient, requirePermission } from './employeeAccountServer.js';

const TABLES = [
  'leave_types',
  'leave_condition_policies',
  'leave_carryover_settings',
  'leave_groups',
  'leave_group_items',
  'employee_leave_group_assignments',
  'leave_requests',
  'off_in_lieu_requests',
  'off_in_lieu_entries',
  'leave_balance_ledger',
  'leave_payroll_deductions',
  'work_shift_groups',
  'work_shift_group_days',
  'employee_work_shift_assignments',
  'public_holiday_groups',
  'public_holidays',
] as const;

const toSnake = (value: any): any => {
  if (Array.isArray(value)) return value.map(toSnake);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/([A-Z])/g, '_$1').toLowerCase(),
    toSnake(item),
  ]));
};

export const loadAdminLeaveWorkspace = async (req: any) => {
  await requirePermission(req, 'leave.manage');
  const entityId = String(req.query?.entityId || '').trim();
  if (!entityId) throw Object.assign(new Error('entityId is required.'), { statusCode: 400 });
  const client = createMainAdminClient();
  const results = await Promise.all(TABLES.map(async (table) => {
    const { data, error } = await client.from(table).select('*').eq('entity_id', entityId);
    if (error) throw new Error(`Admin ${table} data could not be loaded: ${error.message}`);
    return [table, data || []] as const;
  }));
  return Object.fromEntries(results);
};

export const persistAdminLeaveWorkspace = async (req: any) => {
  await requirePermission(req, 'leave.manage');
  const entityId = String(req.body?.entityId || '').trim();
  const workspace = req.body?.workspace;
  if (!entityId || !workspace || typeof workspace !== 'object') {
    throw Object.assign(new Error('entityId and workspace are required.'), { statusCode: 400 });
  }
  const client = createMainAdminClient();
  const rowsByTable: Record<string, any[]> = {
    leave_types: (workspace.configs || []).map((row: any) => ({
      id: row.id,
      entityId,
      name: row.leaveType,
      code: row.code,
      defaultEntitlementDays: row.daysEntitled,
      leaveGroup: row.leaveGroup,
      condition: row.condition,
      isDefault: row.isDefault === true,
      systemManaged: row.systemManaged === true,
      enabled: row.enabled !== false,
      policyId: row.policyId,
      carryOverId: row.carryOverId,
      canCarryOver: row.canCarryOver !== false,
      requiresAttachment: row.requiresAttachment === true,
    })),
    leave_condition_policies: workspace.policies || [],
    leave_carryover_settings: workspace.carryOverSettings || [],
    leave_groups: (workspace.groups || []).map(({ items: _items, leaveTypeIds: _ids, assignedEmployeeIds: _employees, ...group }: any) => group),
    leave_group_items: (workspace.groups || []).flatMap((group: any) => group.items || []),
    employee_leave_group_assignments: workspace.assignments || [],
    leave_requests: workspace.requests || [],
    off_in_lieu_requests: (workspace.offInLieuRequests || []).map(({ entries: _entries, ...request }: any) => request),
    off_in_lieu_entries: (workspace.offInLieuRequests || []).flatMap((request: any) => (
      (request.entries || []).map((entry: any) => ({ ...entry, requestId: request.id }))
    )),
    leave_balance_ledger: workspace.ledgerEntries || [],
    leave_payroll_deductions: workspace.payrollDeductions || [],
    work_shift_groups: workspace.workShiftGroups || [],
    work_shift_group_days: workspace.workShiftGroupDays || [],
    employee_work_shift_assignments: workspace.employeeWorkShiftAssignments || [],
    public_holiday_groups: workspace.publicHolidayGroups || [],
    public_holidays: workspace.publicHolidays || [],
  };
  for (const table of TABLES) {
    const rows = (rowsByTable[table] || []).map((row: any) => toSnake({ ...row, entityId }));
    if (rows.length === 0) continue;
    const { error } = await client.from(table).upsert(rows);
    if (error) throw new Error(`Admin ${table} data could not be saved: ${error.message}`);
  }
  return { ok: true };
};
