import {
  createEmployeeAdminClient,
  createMainAdminClient,
  getEmployeeAuthUser,
  requirePermission,
} from './employeeAccountServer.js';
import { sendEmailTemplate } from './email/emailService.js';
import {
  EmployeePortalBootstrap,
  EmployeeProfileChangeRequest,
  EmployeeProfileChangeType,
  EmployeeServiceMessage,
  EmployeeServiceRequest,
  EmployeeServiceRequestCategory,
  EmployeeServiceRequestPriority,
  EmployeeServiceRequestStatus,
} from '../../src/lib/employeeServiceTypes.js';
import {
  calculateLeaveBalances,
  calculateLeaveDateDays,
  LeaveRequest,
} from '../../src/lib/leaveDomain.js';

const HR_SUPPORT_EMAIL = process.env.HR_SUPPORT_EMAIL || 'hr@redpoint.com.my';

const toCamel = (value: any): any => {
  if (Array.isArray(value)) return value.map(toCamel);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
    toCamel(item),
  ]));
};

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const EMPLOYEE_PORTAL_COLUMNS = [
  'id',
  'entity_id',
  'entity_name',
  'name',
  'email',
  'designation',
  'department',
  'status',
  'bank_name',
  'account_no',
  'basic_salary',
  'housing_allowance',
  'transport_allowance',
  'overtime',
  'performance_bonus',
  'epf_rate_employee',
  'epf_rate_employer',
  'socso_employee',
  'socso_employer',
  'skbbk_employee',
  'skbbk_employer',
  'eis_employee',
  'eis_employer',
  'tax_pcb',
  'unpaid_leave',
  'hrd_corp',
  'avatar_url',
  'gender',
  'nric_passport',
  'nationality',
  'contact_number',
  'tax_number',
  'epf_number',
  'employment_type',
  'marital_status',
  'eligible_for_statutory',
  // Optional in older production employee schemas. Portal access must not
  // fail when this payroll-only field has not been migrated yet.
  'payroll_document_display_settings',
  'opt_in_epf',
  'opt_in_socso',
  'opt_in_eis',
  'opt_in_pcb',
  'enable_lindung24',
  'emergency_contact_name',
  'emergency_contact_relation',
  'emergency_contact_phone',
  'date_of_joined',
  'date_of_confirmation',
  'date_of_termination',
  'allowance_general',
  'allowance_transport',
  'allowance_parking',
  'allowance_meal',
  'allowance_accommodation',
  'allowance_phone',
  'reimbursement_amount',
  'reimbursement_desc',
  'bonus_amount',
  'bonus_desc',
  'commission_amount',
  'commission_desc',
  'back_pay_amount',
  'back_pay_desc',
  'aws_amount',
  'aws_desc',
  'compensation_amount',
  'compensation_desc',
  'deduction_in_lieu',
  'deduction_cp38',
  'deduction_others',
  'deduction_others_desc',
  'spouse_name',
  'spouse_nric',
  'spouse_is_working',
  'spouse_company',
  'spouse_position',
  'has_dependants',
  'dependants',
].join(',');

const EMPLOYEE_PORTAL_COLUMN_LIST = EMPLOYEE_PORTAL_COLUMNS.split(',');

const getMissingEmployeeColumn = (error: any) => {
  const message = String(error?.message || error || '');
  const qualifiedColumn = message.match(/column [\w$]+\.(\w+) does not exist/i);
  if (qualifiedColumn) return qualifiedColumn[1];
  const schemaColumn = message.match(/(?:Could not find|not find) the ['"]([^'"]+)['"] column/i);
  return schemaColumn?.[1] || null;
};

// Production databases can lag behind the portal code during migrations.
// Retry employee reads without only the optional column reported by PostgREST.
const selectEmployeePortal = async <T = any>(
  queryFactory: (columns: string) => PromiseLike<{ data: T; error: any }>,
) => {
  let columns = [...EMPLOYEE_PORTAL_COLUMN_LIST];
  for (let attempt = 0; attempt < EMPLOYEE_PORTAL_COLUMN_LIST.length; attempt += 1) {
    const result = await queryFactory(columns.join(','));
    if (!result.error) return result;

    const missingColumn = getMissingEmployeeColumn(result.error);
    if (!missingColumn || !columns.includes(missingColumn)) return result;
    columns = columns.filter((column) => column !== missingColumn);
  }
  return queryFactory(columns.join(','));
};

const PAYROLL_PORTAL_COLUMNS = [
  'id',
  'employee_email',
  'payroll_month',
  'payroll_year',
  'basic_salary',
  'allowance_general',
  'allowance_transport',
  'allowance_parking',
  'allowance_meal',
  'allowance_accommodation',
  'allowance_phone',
  'overtime',
  'bonus_amount',
  'bonus_desc',
  'commission_amount',
  'commission_desc',
  'back_pay_amount',
  'back_pay_desc',
  'aws_amount',
  'aws_desc',
  'compensation_amount',
  'compensation_desc',
  'reimbursement_amount',
  'reimbursement_desc',
  'unpaid_leave',
  'incomplete_month_deduction',
  'gross_pay',
  'gross_salary',
  'total_allowance',
  'deduction_in_lieu',
  'deduction_cp38',
  'deduction_others',
  'deduction_others_desc',
  'actual_pcb_deducted',
  'tax_pcb',
  'epf_employee',
  'epf_employer',
  'socso_employee',
  'socso_employer',
  'lindung24_employee',
  'eis_employee',
  'eis_employer',
  'hrd_corp',
  'net_pay',
  'net_salary',
  'payment_date',
  'payslip_descriptions',
  'payout_kind',
  'is_separate_payout',
  'statutory_treatment',
  'payout_title',
  'payout_description',
  'line_notes',
  'document_type',
  'compensation_label',
  'display_settings_snapshot',
  'calculation_version',
  'status',
  'created_at',
  'updated_at',
].join(',');

const PERFORMANCE_PORTAL_COLUMNS = [
  'id',
  'employee_id',
  'employee_email',
  'review_cycle_id',
  'manager_name',
  'review_status',
  'rating',
  'teamwork_score',
  'communication_score',
  'problem_solving_score',
  'self_evaluation',
  'manager_comments',
  'goals',
  'created_at',
  'updated_at',
].join(',');

const SERVICE_REQUEST_COLUMNS = [
  'id',
  'employee_id',
  'employee_email',
  'employee_name',
  'entity_id',
  'category',
  'subject',
  'description',
  'priority',
  'status',
  'assigned_to',
  'resolved_at',
  'created_at',
  'updated_at',
].join(',');

const SERVICE_MESSAGE_COLUMNS = [
  'id',
  'request_id',
  'author_type',
  'author_id',
  'author_name',
  'body',
  'created_at',
].join(',');

const PROFILE_CHANGE_COLUMNS = [
  'id',
  'employee_id',
  'employee_email',
  'change_type',
  'current_values',
  'requested_values',
  'status',
  'reviewed_by',
  'reviewed_at',
  'review_note',
  'created_at',
  'updated_at',
].join(',');

const NOTIFICATION_COLUMNS = [
  'id',
  'employee_id',
  'request_id',
  'type',
  'title',
  'body',
  'read_at',
  'created_at',
].join(',');

const serviceError = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const isMissingTable = (error: any) => (
  /employee_service_|employee_notifications|notification_outbox|schema cache|could not find the table/i.test(
    String(error?.message || error || '')
  )
);

const throwIfMissingServiceTable = (error: any, label: string) => {
  if (isMissingTable(error)) {
    throw serviceError(
      `The employee service database tables are not deployed yet. Please run the employee service migration before using ${label}.`,
      503
    );
  }
};

const isMissingFunction = (error: any) => (
  /function .* does not exist|could not find the function|schema cache/i.test(
    String(error?.message || error || '')
  )
);

const getIdempotencyKey = (req: any, prefix: string) => {
  const supplied = String(
    req.headers?.['x-idempotency-key']
      || req.body?.idempotencyKey
      || ''
  ).trim();
  return supplied.slice(0, 160) || `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
};

const parseIsoDate = (value: unknown) => {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? null : date;
};

const mapEmployeePortalDto = (row: any) => {
  const dto = Object.fromEntries(
    EMPLOYEE_PORTAL_COLUMNS.split(',').map((column) => [
      column,
      row[column] ?? row[column.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())],
    ])
  );
  return toCamel(dto);
};

const assertConfigured = () => {
  if (!process.env.EMPLOYEE_SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw serviceError('Employee portal server credentials are not configured.', 503);
  }
};

const mapMessage = (row: any): EmployeeServiceMessage => ({
  id: String(row.id),
  requestId: String(row.request_id),
  authorType: row.author_type,
  authorId: row.author_id || undefined,
  authorName: row.author_name,
  body: row.body,
  createdAt: row.created_at,
});

const mapRequest = (row: any, messages: EmployeeServiceMessage[] = []): EmployeeServiceRequest => ({
  id: String(row.id),
  employeeId: row.employee_id,
  employeeEmail: row.employee_email,
  employeeName: row.employee_name,
  entityId: row.entity_id || undefined,
  category: row.category,
  subject: row.subject,
  description: row.description,
  priority: row.priority,
  status: row.status,
  assignedTo: row.assigned_to || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  resolvedAt: row.resolved_at || undefined,
  messages,
});

const mapProfileChange = (row: any): EmployeeProfileChangeRequest => ({
  id: String(row.id),
  employeeId: row.employee_id,
  employeeEmail: row.employee_email,
  changeType: row.change_type,
  currentValues: row.current_values || {},
  requestedValues: row.requested_values || {},
  status: row.status,
  reviewedBy: row.reviewed_by || undefined,
  reviewedAt: row.reviewed_at || undefined,
  reviewNote: row.review_note || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapNotification = (row: any) => ({
  id: String(row.id),
  employeeId: row.employee_id,
  requestId: row.request_id || undefined,
  type: row.type,
  title: row.title,
  body: row.body,
  readAt: row.read_at || undefined,
  createdAt: row.created_at,
});

const getEmployeeContext = async (req: any) => {
  assertConfigured();
  const { user } = await getEmployeeAuthUser(req);
  const employeeAdmin = createEmployeeAdminClient();
  const { data: account, error: accountError } = await employeeAdmin
    .from('employee_accounts')
    .select('employee_id,employee_email,account_status')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (accountError) throw new Error(`Employee account lookup failed: ${accountError.message}`);
  if (
    !account?.employee_id
    || String(account.account_status) !== 'active'
  ) {
    throw serviceError('This employee account is not linked to an active employee profile.', 403);
  }

  const main = createMainAdminClient();
  const { data: employee, error: employeeError } = await selectEmployeePortal((columns) => main
    .from('employees')
    .select(columns)
    .eq('id', account.employee_id)
    .maybeSingle());
  if (employeeError) throw new Error(`Employee profile lookup failed: ${employeeError.message}`);
  if (!employee) throw serviceError('The employee profile could not be found.', 404);

  const employeeRow = employee as any;
  return {
    user,
    employeeAdmin,
    main,
    employee: toCamel(employeeRow),
    employeeId: String(employeeRow.id),
    employeeEmail: normalize(employeeRow.email || account.employee_email || user.email),
  };
};

const loadMessages = async (client: any, requestIds: string[]) => {
  if (requestIds.length === 0) return new Map<string, EmployeeServiceMessage[]>();
  const { data, error } = await client
    .from('employee_service_request_messages')
    .select(SERVICE_MESSAGE_COLUMNS)
    .in('request_id', requestIds)
    .order('created_at', { ascending: true });
  if (error) {
    throwIfMissingServiceTable(error, 'employee requests');
    throw new Error(`Employee request messages could not be loaded: ${error.message}`);
  }
  const grouped = new Map<string, EmployeeServiceMessage[]>();
  (data || []).forEach((row: any) => {
    const message = mapMessage(row);
    grouped.set(message.requestId, [...(grouped.get(message.requestId) || []), message]);
  });
  return grouped;
};

const loadRequests = async (client: any, query: any = {}) => {
  let requestQuery = client
    .from('employee_service_requests')
    .select(SERVICE_REQUEST_COLUMNS)
    .order('updated_at', { ascending: false });
  if (query.employeeId) requestQuery = requestQuery.eq('employee_id', query.employeeId);
  if (query.status) requestQuery = requestQuery.eq('status', query.status);
  if (query.priority) requestQuery = requestQuery.eq('priority', query.priority);
  if (query.entityId) requestQuery = requestQuery.eq('entity_id', query.entityId);
  if (query.search) {
    const escaped = String(query.search).replace(/[%(),]/g, '');
    requestQuery = requestQuery.or(
      `subject.ilike.%${escaped}%,employee_name.ilike.%${escaped}%,employee_email.ilike.%${escaped}%`
    );
  }
  const { data, error } = await requestQuery;
  if (error) {
    throwIfMissingServiceTable(error, 'employee requests');
    throw new Error(`Employee requests could not be loaded: ${error.message}`);
  }
  const rows = data || [];
  const messages = await loadMessages(client, rows.map((row: any) => String(row.id)));
  return rows.map((row: any) => mapRequest(row, messages.get(String(row.id)) || []));
};

const loadProfileChanges = async (client: any, employeeId?: string) => {
  let query = client
    .from('employee_profile_change_requests')
    .select(PROFILE_CHANGE_COLUMNS)
    .order('created_at', { ascending: false });
  if (employeeId) query = query.eq('employee_id', employeeId);
  const { data, error } = await query;
  if (error) {
    throwIfMissingServiceTable(error, 'profile change requests');
    throw new Error(`Profile change requests could not be loaded: ${error.message}`);
  }
  return (data || []).map(mapProfileChange);
};

const loadNotifications = async (client: any, employeeId: string) => {
  const { data, error } = await client
    .from('employee_notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    throwIfMissingServiceTable(error, 'employee notifications');
    throw new Error(`Employee notifications could not be loaded: ${error.message}`);
  }
  return (data || []).map(mapNotification);
};

const loadAppraisalAccessGrants = async (
  client: any,
  entityId: string | undefined,
  employeeId: string,
  employeeEmail: string,
) => {
  let query = client
    .from('appraisal_access_grants')
    .select('*');
  if (entityId) query = query.eq('entity_id', entityId);
  const identityValues = [employeeId, employeeEmail]
    .map(normalize)
    .filter(Boolean);
  if (identityValues.length === 1) {
    query = query.eq('employee_id', identityValues[0]);
  } else if (identityValues.length > 1) {
    query = query.or(`employee_id.eq.${identityValues[0]},employee_id.eq.${identityValues[1]}`);
  }
  const { data, error } = await query;
  if (error && /appraisal_access_grants|schema cache|could not find the table/i.test(error.message || '')) {
    return [];
  }
  if (error) throw new Error(`Employee appraisal access could not be loaded: ${error.message}`);
  return (data || []).map(toCamel);
};

export const loadEmployeePortalBootstrap = async (req: any): Promise<EmployeePortalBootstrap> => {
  const context = await getEmployeeContext(req);
  const { employee, employeeId, employeeEmail, employeeAdmin, main } = context;
  const entityId = employee.entityId || employee.entity_id;

  const [
    payrollResult,
    performanceResult,
    reviewCyclesResult,
    appraisalAccessGrants,
    entitiesResult,
    serviceRequests,
    profileChangeRequests,
    notifications,
  ] = await Promise.all([
    main.from('payroll_records_2026')
      .select(PAYROLL_PORTAL_COLUMNS)
      .ilike('employee_email', employeeEmail)
      .in('status', ['Published']),
    main.from('performances').select(PERFORMANCE_PORTAL_COLUMNS).or(
      `employee_id.eq.${employeeId},employee_email.ilike.${employeeEmail}`
    ),
    main.from('review_cycles').select('id,name,status,start_date,end_date,created_at,updated_at').order('created_at', { ascending: false }),
    loadAppraisalAccessGrants(main, entityId, employeeId, employeeEmail),
    entityId
      ? main.from('corporate_entities').select('id,name,registration_number,address,currency,is_active,logo_url').eq('id', entityId)
      : Promise.resolve({ data: [], error: null }),
    loadRequests(employeeAdmin, { employeeId }),
    loadProfileChanges(employeeAdmin, employeeId),
    loadNotifications(employeeAdmin, employeeId),
  ]);

  if (payrollResult.error) throw new Error(`Employee payroll could not be loaded: ${payrollResult.error.message}`);
  if (performanceResult.error) throw new Error(`Employee performance could not be loaded: ${performanceResult.error.message}`);
  if (reviewCyclesResult.error && !/review_cycles|schema cache|could not find the table/i.test(reviewCyclesResult.error.message)) {
    throw new Error(`Employee review cycles could not be loaded: ${reviewCyclesResult.error.message}`);
  }
  if (entitiesResult.error) throw new Error(`Employee company could not be loaded: ${entitiesResult.error.message}`);

  return {
    employee: mapEmployeePortalDto(employee),
    payrollRecords: (payrollResult.data || []).map(toCamel),
    performances: (performanceResult.data || []).map(toCamel),
    appraisalAccessGrants,
    reviewCycles: (reviewCyclesResult.data || []).map(toCamel),
    entities: (entitiesResult.data || []).map(toCamel),
    serviceRequests,
    profileChangeRequests,
    notifications: notifications as any,
  };
};

const LEAVE_REQUEST_SELECT = 'id,entity_id,employee_id,employee_name,leave_type_id,leave_type,start_date,end_date,total_days,reason,status,applied_date,approved_at,approved_by,review_note,excess_days,payroll_month,payroll_year,attachment_path,attachment_name,attachment_type,attachment_size,created_at,updated_at';
const LEAVE_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const LEAVE_ATTACHMENT_MAX_SIZE = 5 * 1024 * 1024;

const mapLeaveRequest = (row: any): LeaveRequest => {
  const mapped = toCamel(row) as LeaveRequest & {
    attachmentPath?: string;
    attachmentName?: string;
    attachmentType?: string;
    attachmentSize?: number;
    attachmentUrl?: string;
  };
  if (mapped.attachmentName || mapped.attachmentPath) {
    mapped.attachment = {
      name: mapped.attachmentName || 'Supporting document',
      type: (mapped.attachmentType || 'application/pdf') as 'image/jpeg' | 'image/png' | 'application/pdf',
      size: Number(mapped.attachmentSize || 0),
      path: mapped.attachmentPath,
      url: mapped.attachmentUrl,
    };
  }
  return mapped;
};

const validateAndCalculateLeaveRequest = async (context: any, input: {
  leaveTypeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}) => {
  const start = parseIsoDate(input.startDate);
  const end = parseIsoDate(input.endDate);
  if (!start || !end || start > end) {
    throw serviceError('Please choose a valid leave date range.');
  }

  const entityId = String(context.employee.entityId || '').trim();
  if (!entityId) throw serviceError('The employee is not linked to a company.', 409);

  const { data: leaveType, error: leaveTypeError } = await context.employeeAdmin
    .from('leave_types')
    .select('id,entity_id,name,enabled,policy_id,default_entitlement_days,condition,requires_attachment')
    .eq('id', input.leaveTypeId)
    .eq('entity_id', entityId)
    .eq('enabled', true)
    .maybeSingle();
  if (leaveTypeError) throw new Error(`Leave type lookup failed: ${leaveTypeError.message}`);
  if (!leaveType || leaveType.name !== input.leaveType) {
    throw serviceError('The selected leave type is not available for this employee.', 409);
  }

  let policy: any = {
    deductionRule: 'working_days_excluding_holidays',
    roundingRule: 'nearest_half_day',
    excludeWeekends: true,
    excludePublicHolidays: true,
    paidTreatment: String(leaveType.condition || '').toLowerCase().includes('unpaid') ? 'unpaid' : 'paid',
  };
  if (leaveType.policy_id) {
    const { data: policyRow, error: policyError } = await context.employeeAdmin
      .from('leave_condition_policies')
      .select('deduction_rule,rounding_rule,exclude_weekends,exclude_public_holidays,paid_treatment')
      .eq('id', leaveType.policy_id)
      .eq('entity_id', entityId)
      .maybeSingle();
    if (policyError) throw new Error(`Leave policy lookup failed: ${policyError.message}`);
    if (policyRow) {
      policy = toCamel(policyRow);
    }
  }

  const { data: holidays, error: holidayError } = await context.employeeAdmin
    .from('public_holidays')
    .select('holiday_date,observed_date')
    .eq('entity_id', entityId)
    .eq('enabled', true);
  if (holidayError && !/public_holidays|schema cache|could not find the table/i.test(holidayError.message || '')) {
    throw new Error(`Public holiday lookup failed: ${holidayError.message}`);
  }
  const holidayDates = (holidays || []).flatMap((holiday: any) => (
    [holiday.holiday_date, holiday.observed_date].filter(Boolean)
  ));
  const totalDays = calculateLeaveDateDays(
    input.startDate,
    input.endDate,
    policy,
    holidayDates,
  );
  if (!Number.isFinite(totalDays) || totalDays <= 0) {
    throw serviceError('The selected dates do not produce any eligible leave days.');
  }

  const { data: existingRequests, error: requestError } = await context.employeeAdmin
    .from('leave_requests')
    .select('id,leave_type_id,start_date,end_date,total_days,status')
    .eq('employee_id', context.employeeId)
    .eq('leave_type_id', input.leaveTypeId)
    .in('status', ['Pending', 'Approved']);
  if (requestError) throw new Error(`Existing leave lookup failed: ${requestError.message}`);
  const overlaps = (existingRequests || []).some((request: any) => (
    String(request.start_date) <= input.endDate && String(request.end_date) >= input.startDate
  ));
  if (overlaps) throw serviceError('The selected dates overlap an existing leave request.', 409);

  const isUnpaid = String(policy.paidTreatment || '').toLowerCase() === 'unpaid'
    || String(leaveType.condition || '').toLowerCase().includes('unpaid');
  if (!isUnpaid) {
    const entitlement = Number(leaveType.default_entitlement_days || 0);
    const reserved = (existingRequests || []).reduce(
      (sum: number, request: any) => sum + Number(request.total_days || 0),
      0,
    );
    if (entitlement > 0 && reserved + totalDays > entitlement) {
      throw serviceError('This request exceeds the available leave entitlement.', 409);
    }
  }

  return { entityId, totalDays };
};

export const loadEmployeeLeaveRequests = async (req: any) => {
  const context = await getEmployeeContext(req);
  const { data, error } = await context.employeeAdmin
    .from('leave_requests')
    .select(LEAVE_REQUEST_SELECT)
    .eq('employee_id', context.employeeId)
    .order('applied_date', { ascending: false });
  if (error) {
    if (/leave_requests|schema cache|could not find the table/i.test(error.message || '')) {
      throw serviceError('The employee leave database table is not deployed yet.', 503);
    }
    throw new Error(`Employee leave requests could not be loaded: ${error.message}`);
  }
  const requests = await Promise.all((data || []).map(async (row: any) => {
    if (row.attachment_path) {
      const signed = await context.employeeAdmin.storage
        .from('hr-documents')
        .createSignedUrl(row.attachment_path, 60 * 60 * 24);
      if (!signed.error && signed.data?.signedUrl) row.attachment_url = signed.data.signedUrl;
    }
    return mapLeaveRequest(row);
  }));
  return { requests };
};

export const loadEmployeeLeaveWorkspace = async (req: any) => {
  const context = await getEmployeeContext(req);
  const entityId = String(context.employee.entityId || '').trim();
  if (!entityId) throw serviceError('The employee is not linked to a company.', 409);
  const client = context.employeeAdmin;
  const select = async (table: string, columns: string, filters: Array<[string, string]> = []) => {
    let query = client.from(table).select(columns).eq('entity_id', entityId);
    filters.forEach(([column, value]) => {
      query = query.eq(column, value);
    });
    const result = await query;
    if (result.error && !/relation .* does not exist|schema cache|could not find the table/i.test(result.error.message || '')) {
      throw new Error(`${table} could not be loaded: ${result.error.message}`);
    }
    return (result.data || []).map(toCamel);
  };

  const [
    types,
    policies,
    carryOverSettings,
    groups,
    items,
    assignments,
    requests,
    ledgerEntries,
    payrollDeductions,
    workShiftGroups,
    workShiftGroupDays,
    employeeWorkShiftAssignments,
    publicHolidayGroups,
    publicHolidays,
  ] = await Promise.all([
    select('leave_types', 'id,entity_id,name,code,default_entitlement_days,leave_group,condition,is_default,system_managed,enabled,policy_id,carry_over_id,can_carry_over'),
    select('leave_condition_policies', 'id,entity_id,name,deduction_rule,rounding_rule,proration_rule,entitlement_rule,entitlement_days,paid_treatment,excess_leave_handling,payroll_deduction_behavior,exclude_weekends,exclude_public_holidays,notes,enabled'),
    select('leave_carryover_settings', 'id,entity_id,name,carry_forward_rule,max_carry_forward_days,expiry_rule,expiry_date,expiry_months,rule_details,notes,enabled'),
    select('leave_groups', 'id,entity_id,name,description,policy_id,carry_over_id,public_holiday_group_ids,enabled'),
    select('leave_group_items', 'id,entity_id,group_id,leave_type_id,policy_id,carry_over_id,entitlement_days,enabled'),
    select('employee_leave_group_assignments', 'id,entity_id,employee_id,group_id,active,assigned_at', [['employee_id', context.employeeId]]),
    select('leave_requests', `${LEAVE_REQUEST_SELECT}`, [['employee_id', context.employeeId]]),
    select('leave_balance_ledger', 'id,entity_id,employee_id,leave_type_id,leave_type,entry_type,source_type,source_id,quantity,expires_at,occurred_at,notes,created_at', [['employee_id', context.employeeId]]),
    select('leave_payroll_deductions', 'id,entity_id,employee_id,leave_request_id,payroll_month,payroll_year,leave_days,daily_rate,amount,status,synced_at,reason,created_at,updated_at', [['employee_id', context.employeeId]]),
    select('work_shift_groups', 'id,entity_id,name,description,enabled,weekly_hours,weekly_hours_warning'),
    select('work_shift_group_days', 'id,entity_id,group_id,weekday,start_time,end_time,day_type,is_work_day,actual_hours'),
    select('employee_work_shift_assignments', 'id,entity_id,employee_id,group_id,effective_date,end_date,active', [['employee_id', context.employeeId]]),
    select('public_holiday_groups', 'id,entity_id,name,category,state_code,enabled'),
    select('public_holidays', 'id,entity_id,group_id,name,holiday_date,observed_date,year,enabled'),
  ]);

  const configRows = types.map((row: any) => ({
    id: row.id,
    entityId,
    leaveType: row.name,
    daysEntitled: Number(row.defaultEntitlementDays || 0),
    leaveGroup: row.leaveGroup || '',
    condition: row.condition || 'Paid leave',
    code: row.code || '',
    isDefault: row.isDefault === true,
    enabled: row.enabled !== false,
    systemManaged: row.systemManaged === true,
    canCarryOver: row.canCarryOver !== false,
    policyId: row.policyId || undefined,
    carryOverId: row.carryOverId || undefined,
  }));
  const mappedGroups = groups.map((group: any) => ({
    ...group,
    leaveTypeIds: items
      .filter((item: any) => item.groupId === group.id && item.enabled !== false)
      .map((item: any) => item.leaveTypeId),
    items: items.filter((item: any) => item.groupId === group.id),
    assignedEmployeeIds: assignments
      .filter((assignment: any) => assignment.groupId === group.id && assignment.active)
      .map((assignment: any) => assignment.employeeId),
  }));

  return {
    configs: configRows,
    policies,
    carryOverSettings,
    groups: mappedGroups,
    assignments,
    workShiftGroups,
    workShiftGroupDays,
    employeeWorkShiftAssignments,
    publicHolidayGroups,
    publicHolidays,
    requests,
    offInLieuRequests: [],
    ledgerEntries,
    payrollDeductions,
    source: 'supabase',
  };
};

export const createEmployeeLeaveRequest = async (req: any) => {
  const context = await getEmployeeContext(req);
  const body = req.body || {};
  const leaveType = String(body.leaveType || '').trim();
  const leaveTypeId = String(body.leaveTypeId || '').trim();
  const startDate = String(body.startDate || '').trim();
  const endDate = String(body.endDate || '').trim();
  const reason = String(body.reason || '').trim();
  if (!leaveType || !leaveTypeId || !startDate || !endDate || !reason || reason.length > 2000) {
    throw serviceError('A complete leave request is required.');
  }
  const attachmentInput = body.attachment && typeof body.attachment === 'object' ? body.attachment : null;
  let attachmentPath = '';
  const { entityId, totalDays } = await validateAndCalculateLeaveRequest(context, {
    leaveTypeId,
    leaveType,
    startDate,
    endDate,
    reason,
  });
  const { data: selectedLeaveType } = await context.employeeAdmin
    .from('leave_types')
    .select('requires_attachment')
    .eq('id', leaveTypeId)
    .eq('entity_id', entityId)
    .eq('enabled', true)
    .maybeSingle();
  if (selectedLeaveType?.requires_attachment === true && !attachmentInput) {
    throw serviceError('An attachment is required for the selected leave type.');
  }
  if (attachmentInput) {
    const contentType = String(attachmentInput.contentType || '').trim().toLowerCase();
    const fileName = String(attachmentInput.fileName || '').trim();
    const encoded = String(attachmentInput.base64 || '').replace(/^data:[^;]+;base64,/, '');
    if (!fileName || !LEAVE_ATTACHMENT_TYPES.has(contentType) || !encoded) {
      throw serviceError('Only JPG, PNG, or PDF attachments are supported.');
    }
    const attachmentBuffer = Buffer.from(encoded, 'base64');
    if (!attachmentBuffer.length || attachmentBuffer.length > LEAVE_ATTACHMENT_MAX_SIZE) {
      throw serviceError('Attachments must be 5 MB or smaller.');
    }
    const safeName = fileName.replace(/[^a-z0-9._-]+/gi, '_').slice(-120) || 'attachment';
    attachmentPath = `leave-attachments/${context.employeeId}/${Date.now()}-${safeName}`;
    const upload = await context.employeeAdmin.storage
      .from('hr-documents')
      .upload(attachmentPath, attachmentBuffer, { contentType, upsert: false });
    if (upload.error) throw new Error(`Leave attachment upload failed: ${upload.error.message}`);
  }
  const idempotencyKey = getIdempotencyKey(req, `leave:${context.employeeId}`);
  const requestId = `LR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rpcResult = await context.employeeAdmin.rpc('create_leave_request', {
    p_id: requestId,
    p_entity_id: entityId,
    p_employee_id: context.employeeId,
    p_employee_name: context.employee.name,
    p_leave_type_id: leaveTypeId,
    p_leave_type: leaveType,
    p_start_date: startDate,
    p_end_date: endDate,
    p_total_days: totalDays,
    p_reason: reason,
    p_applied_date: new Date().toISOString().slice(0, 10),
    p_idempotency_key: idempotencyKey,
  });
  let data = rpcResult.data?.[0];
  let error = rpcResult.error;
  if (error && isMissingFunction(error)) {
    const existing = await context.employeeAdmin
      .from('leave_requests')
      .select('id,entity_id,employee_id,employee_name,leave_type_id,leave_type,start_date,end_date,total_days,reason,status,applied_date,approved_at,approved_by,review_note,excess_days,payroll_month,payroll_year,created_at,updated_at')
      .eq('employee_id', context.employeeId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existing.error) throw new Error(`Employee leave request lookup failed: ${existing.error.message}`);
    const fallback = existing.data
      ? existing
      : await context.employeeAdmin
        .from('leave_requests')
        .insert({
        id: requestId,
        entity_id: entityId,
        employee_id: context.employeeId,
        employee_name: context.employee.name,
        leave_type_id: leaveTypeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason,
        status: 'Pending',
        applied_date: new Date().toISOString().slice(0, 10),
        idempotency_key: idempotencyKey,
        })
        .select(LEAVE_REQUEST_SELECT)
        .single();
    data = fallback.data;
    error = fallback.error;
  }
  if (error || !data) throw new Error(`Employee leave request could not be created: ${error?.message || 'unknown error'}`);
  if (attachmentPath) {
    const contentType = String(attachmentInput.contentType).toLowerCase();
    const fileName = String(attachmentInput.fileName).trim();
    const attachmentSize = Buffer.from(String(attachmentInput.base64).replace(/^data:[^;]+;base64,/, ''), 'base64').length;
    const updated = await context.employeeAdmin
      .from('leave_requests')
      .update({
        attachment_path: attachmentPath,
        attachment_name: fileName,
        attachment_type: contentType,
        attachment_size: attachmentSize,
      })
      .eq('id', data.id)
      .eq('employee_id', context.employeeId)
      .select(LEAVE_REQUEST_SELECT)
      .single();
    if (updated.error || !updated.data) {
      throw new Error(`Leave attachment metadata could not be saved: ${updated.error?.message || 'unknown error'}`);
    }
    data = updated.data;
  }
  if (data.attachment_path) {
    const signed = await context.employeeAdmin.storage
      .from('hr-documents')
      .createSignedUrl(data.attachment_path, 60 * 60 * 24);
    if (!signed.error && signed.data?.signedUrl) data.attachment_url = signed.data.signedUrl;
  }
  return { request: mapLeaveRequest(data) };
};

const DIRECT_PROFILE_FIELDS = new Set([
  'contactNumber',
  'emergencyContactName',
  'emergencyContactRelation',
  'emergencyContactPhone',
  'avatarUrl',
]);

const DIRECT_PROFILE_DB_FIELDS: Record<string, string> = {
  contactNumber: 'contact_number',
  emergencyContactName: 'emergency_contact_name',
  emergencyContactRelation: 'emergency_contact_relation',
  emergencyContactPhone: 'emergency_contact_phone',
  avatarUrl: 'avatar_url',
};

export const updateEmployeePortalProfile = async (req: any) => {
  const context = await getEmployeeContext(req);
  const updates = req.body?.updates;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw serviceError('A profile updates object is required.');
  }
  const keys = Object.keys(updates);
  const invalid = keys.filter((key) => !DIRECT_PROFILE_FIELDS.has(key));
  if (invalid.length > 0) {
    throw serviceError(`These fields require HR approval: ${invalid.join(', ')}`, 403);
  }
  if (keys.length === 0) throw serviceError('At least one profile field is required.');

  const cleanUpdates = Object.fromEntries(keys.map((key) => [
    DIRECT_PROFILE_DB_FIELDS[key],
    String(updates[key] ?? '').trim(),
  ]));
  const { data, error } = await selectEmployeePortal((columns) => context.main
    .from('employees')
    .update(cleanUpdates)
    .eq('id', context.employeeId)
    .select(columns)
    .single());
  if (error) throw new Error(`Employee profile could not be updated: ${error.message}`);
  return { employee: mapEmployeePortalDto(data) };
};

const validCategories = new Set<EmployeeServiceRequestCategory>([
  'Leave question',
  'Payslip issue',
  'Profile update',
  'Bank details change',
  'Statutory details change',
  'Document request',
  'IT / equipment',
  'Suggestion',
  'Confidential complaint',
  'Other',
]);

const validPriorities = new Set<EmployeeServiceRequestPriority>(['Low', 'Normal', 'High']);
const validStatuses = new Set<EmployeeServiceRequestStatus>([
  'Open',
  'In Progress',
  'Waiting for Employee',
  'Resolved',
  'Closed',
]);

const notifyEmployee = async (
  client: any,
  employeeId: string,
  title: string,
  body: string,
  requestId?: string,
  eventKey?: string,
) => {
  const notificationKey = eventKey || `portal-notification:${requestId || employeeId}:${title}:${body}`;
  const { error } = await client.from('employee_notifications').insert({
    employee_id: employeeId,
    request_id: requestId || null,
    type: requestId ? 'service_request' : 'profile_change',
    title,
    body,
    idempotency_key: notificationKey,
  });
  if (!error) return;
  if (String(error.code || '') === '23505' || /duplicate key/i.test(String(error.message || ''))) return;
  if (!/employee_notifications|schema cache|could not find the table/i.test(String(error.message || ''))) {
    throw new Error(`Employee notification could not be saved: ${error.message}`);
  }
  const queued = await client.from('notification_outbox').insert({
    event_key: notificationKey,
    employee_id: employeeId,
    request_id: requestId || null,
    channel: 'portal',
    template: 'portal_notification',
    payload: { title, body, idempotencyKey: notificationKey },
  });
  if (String(queued.error?.code || '') === '23505' || /duplicate key/i.test(String(queued.error?.message || ''))) return;
  if (queued.error) {
    throw new Error(`Employee notification could not be queued: ${queued.error.message}`);
  }
};

const enqueueNotificationOutbox = async (
  client: any,
  eventKey: string,
  input: {
    employeeId?: string;
    requestId?: string;
    recipient?: string;
    template: string;
    payload: Record<string, unknown>;
  },
) => {
  const { error } = await client.from('notification_outbox').insert({
    event_key: eventKey,
    employee_id: input.employeeId || null,
    request_id: input.requestId || null,
    channel: 'email',
    recipient: input.recipient || null,
    template: input.template,
    payload: input.payload,
  });
  if (error && /notification_outbox|schema cache|could not find the table/i.test(error.message || '')) return;
  if (error) throw new Error(`Notification could not be queued: ${error.message}`);
};

const emailEmployee = async (
  email: string,
  name: string,
  subject: string,
  details: string,
  entityId?: string,
) => {
  try {
    const delivery = await sendEmailTemplate('employee_request_updated', email, {
      name,
      subject,
      details,
    }, createEmployeeAdminClient(), undefined, { entityId }, createMainAdminClient());
    if (!delivery.ok) throw new Error(delivery.failureReason || 'Employee notification email failed.');
  } catch (error) {
    console.warn('[Employee Request Email] Employee notification failed:', error);
    await enqueueNotificationOutbox(createEmployeeAdminClient(), `employee-email:${email}:${subject}:${details}`, {
      recipient: email,
      template: 'employee_request_updated',
      payload: { name, subject, details, entityId },
    });
  }
};

const notifyHr = async (request: EmployeeServiceRequest) => {
  try {
    const delivery = await sendEmailTemplate('employee_request_created', HR_SUPPORT_EMAIL, {
      name: request.employeeName,
      subject: request.subject,
      category: request.category,
      priority: request.priority,
      details: request.description,
      entity_name: request.entityId,
    }, createEmployeeAdminClient(), undefined, { entityId: request.entityId }, createMainAdminClient());
    if (!delivery.ok) throw new Error(delivery.failureReason || 'HR notification email failed.');
  } catch (error) {
    console.warn('[Employee Request Email] HR notification failed:', error);
    await enqueueNotificationOutbox(createEmployeeAdminClient(), `hr-email:${request.id}`, {
      requestId: request.id,
      recipient: HR_SUPPORT_EMAIL,
      template: 'employee_request_created',
      payload: {
        name: request.employeeName,
        subject: request.subject,
        category: request.category,
        priority: request.priority,
        details: request.description,
        entityId: request.entityId,
      },
    });
  }
};

export const createEmployeeServiceRequest = async (req: any) => {
  const context = await getEmployeeContext(req);
  const category = String(req.body?.category || '') as EmployeeServiceRequestCategory;
  const subject = String(req.body?.subject || '').trim();
  const description = String(req.body?.description || '').trim();
  const priority = String(req.body?.priority || 'Normal') as EmployeeServiceRequestPriority;
  if (!validCategories.has(category)) throw serviceError('Choose a valid request category.');
  if (!subject || subject.length > 160) throw serviceError('Subject is required and must be under 160 characters.');
  if (!description || description.length > 5000) throw serviceError('Description is required and must be under 5,000 characters.');
  if (!validPriorities.has(priority)) throw serviceError('Choose a valid request priority.');

  const idempotencyKey = getIdempotencyKey(req, `service-request:${context.employeeId}`);
  const rpcResult = await context.employeeAdmin.rpc('create_employee_service_request_with_message', {
    p_employee_id: context.employeeId,
    p_employee_email: context.employeeEmail,
    p_employee_name: context.employee.name,
    p_entity_id: context.employee.entityId || null,
    p_category: category,
    p_subject: subject,
    p_description: description,
    p_priority: priority,
    p_idempotency_key: idempotencyKey,
  });
  let data = rpcResult.data?.[0];
  let error = rpcResult.error;
  let usedFallback = false;
  if (error && isMissingFunction(error)) {
    const existing = await context.employeeAdmin
      .from('employee_service_requests')
      .select(SERVICE_REQUEST_COLUMNS)
      .eq('employee_id', context.employeeId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existing.error) throw new Error(`Employee request lookup failed: ${existing.error.message}`);
    if (existing.data) {
      data = existing.data;
      error = null;
    } else {
      usedFallback = true;
      const fallback = await context.employeeAdmin
        .from('employee_service_requests')
        .upsert({
          employee_id: context.employeeId,
          employee_email: context.employeeEmail,
          employee_name: context.employee.name,
          entity_id: context.employee.entityId || null,
          category,
          subject,
          description,
          priority,
          status: 'Open',
          idempotency_key: idempotencyKey,
        }, { onConflict: 'employee_id,idempotency_key' })
        .select(SERVICE_REQUEST_COLUMNS)
        .single();
      data = fallback.data;
      error = fallback.error;
    }
  }
  if (error || !data) {
    if (error) throwIfMissingServiceTable(error, 'employee requests');
    throw new Error(`Employee request could not be created: ${error?.message || 'unknown error'}`);
  }

  if (usedFallback) {
    const { error: messageError } = await context.employeeAdmin
      .from('employee_service_request_messages')
      .upsert({
        request_id: data.id,
        author_type: 'employee',
        author_id: context.employeeId,
        author_name: context.employee.name,
        body: description,
        idempotency_key: `${idempotencyKey}:initial`,
      }, { onConflict: 'request_id,idempotency_key' });
    if (messageError) {
      throwIfMissingServiceTable(messageError, 'employee requests');
      const cleanup = await context.employeeAdmin
        .from('employee_service_requests')
        .delete()
        .eq('id', data.id)
        .eq('employee_id', context.employeeId);
      if (cleanup.error) {
        throw new Error(`Employee request message could not be saved and orphan cleanup failed: ${messageError.message}; ${cleanup.error.message}`);
      }
      throw new Error(`Employee request message could not be saved: ${messageError.message}`);
    }
  }

  const messages = await loadMessages(context.employeeAdmin, [String(data.id)]);
  const request = mapRequest(data, messages.get(String(data.id)) || []);
  if (usedFallback) await notifyHr(request);
  return { request };
};

const getOwnedRequest = async (context: any, requestId: string) => {
  const { data, error } = await context.employeeAdmin
    .from('employee_service_requests')
    .select(SERVICE_REQUEST_COLUMNS)
    .eq('id', requestId)
    .eq('employee_id', context.employeeId)
    .maybeSingle();
  if (error) throw new Error(`Employee request lookup failed: ${error.message}`);
  if (!data) throw serviceError('The request could not be found.', 404);
  return data;
};

export const addEmployeeServiceMessage = async (req: any) => {
  const context = await getEmployeeContext(req);
  const requestId = String(req.body?.requestId || '').trim();
  const body = String(req.body?.body || '').trim();
  if (!requestId || !body || body.length > 5000) throw serviceError('A message under 5,000 characters is required.');
  const request = await getOwnedRequest(context, requestId);
  if (request.status === 'Closed') throw serviceError('Closed requests cannot receive new messages.', 409);

  const messageIdempotencyKey = getIdempotencyKey(req, `service-message:${requestId}:${context.employeeId}`);
  const { data, error } = await context.employeeAdmin
    .from('employee_service_request_messages')
    .upsert({
      request_id: requestId,
      author_type: 'employee',
      author_id: context.employeeId,
      author_name: context.employee.name,
      body,
      idempotency_key: messageIdempotencyKey,
    }, { onConflict: 'request_id,idempotency_key' })
    .select(SERVICE_MESSAGE_COLUMNS)
    .single();
  if (error || !data) throw new Error(`Employee request message could not be saved: ${error?.message || 'unknown error'}`);
  let updatedRequest = request;
  if (request.status === 'Resolved') {
    const { data: reopened, error: reopenError } = await context.employeeAdmin
      .from('employee_service_requests')
      .update({ status: 'Open' })
      .eq('id', requestId)
      .eq('employee_id', context.employeeId)
      .select(SERVICE_REQUEST_COLUMNS)
      .single();
    if (reopenError || !reopened) {
      throw new Error(`Resolved employee request could not be reopened: ${reopenError?.message || 'unknown error'}`);
    }
    updatedRequest = reopened;
  }
  const messages = await loadMessages(context.employeeAdmin, [requestId]);
  return { message: mapMessage(data), request: mapRequest(updatedRequest, messages.get(requestId) || []) };
};

export const reopenEmployeeServiceRequest = async (req: any) => {
  const context = await getEmployeeContext(req);
  const requestId = String(req.body?.requestId || '').trim();
  const request = await getOwnedRequest(context, requestId);
  if (request.status !== 'Resolved' && request.status !== 'Closed') {
    throw serviceError('This request is already active.', 409);
  }
  const { data, error } = await context.employeeAdmin
    .from('employee_service_requests')
    .update({ status: 'Open', resolved_at: null })
    .eq('id', requestId)
    .eq('employee_id', context.employeeId)
    .select(SERVICE_REQUEST_COLUMNS)
    .single();
  if (error || !data) throw new Error(`Employee request could not be reopened: ${error?.message || 'unknown error'}`);
  return { request: mapRequest(data) };
};

const profileChangeFields: Record<EmployeeProfileChangeType, string[]> = {
  bank_details: ['bankName', 'accountNo'],
  statutory_details: ['taxNumber', 'epfNumber'],
  identity_details: ['nricPassport', 'nationality'],
  family_details: ['maritalStatus', 'spouseName', 'spouseNric', 'spouseIsWorking', 'spouseCompany', 'spousePosition', 'hasDependants', 'dependants'],
};

const profileChangeDbFields: Record<string, string> = {
  bankName: 'bank_name',
  accountNo: 'account_no',
  taxNumber: 'tax_number',
  epfNumber: 'epf_number',
  nricPassport: 'nric_passport',
  nationality: 'nationality',
  maritalStatus: 'marital_status',
  spouseName: 'spouse_name',
  spouseNric: 'spouse_nric',
  spouseIsWorking: 'spouse_is_working',
  spouseCompany: 'spouse_company',
  spousePosition: 'spouse_position',
  hasDependants: 'has_dependants',
  dependants: 'dependants',
};

const validateProfileRequestedValues = (
  changeType: EmployeeProfileChangeType,
  requestedValues: Record<string, unknown>,
) => {
  const allowedFields = profileChangeFields[changeType];
  if (!allowedFields) throw serviceError('Choose a valid profile change type.');
  const invalid = Object.keys(requestedValues).filter((key) => !allowedFields.includes(key));
  if (invalid.length > 0) throw serviceError(`Unsupported profile fields: ${invalid.join(', ')}`);
  if (Object.keys(requestedValues).length === 0) throw serviceError('At least one profile value is required.');

  for (const [key, value] of Object.entries(requestedValues)) {
    if (key === 'dependants') {
      if (!Array.isArray(value) || value.length > 20) {
        throw serviceError('Dependants must be a list of no more than 20 people.');
      }
      value.forEach((dependant: any) => {
        if (!dependant || typeof dependant !== 'object') {
          throw serviceError('Each dependant must be a valid profile object.');
        }
        if (String(dependant.name || '').length > 160 || String(dependant.dob || '').length > 20) {
          throw serviceError('Dependant details are too long.');
        }
      });
      continue;
    }
    if (typeof value === 'boolean') continue;
    if (typeof value !== 'string' || value.length > 240) {
      throw serviceError(`${key} must be a text value under 240 characters.`);
    }
    const text = value.trim();
    if (['accountNo', 'taxNumber', 'epfNumber', 'nricPassport'].includes(key)
      && text
      && !/^[A-Za-z0-9][A-Za-z0-9 ./_-]{2,239}$/.test(text)) {
      throw serviceError(`${key} contains unsupported characters.`);
    }
    if (key === 'maritalStatus' && text && !['Single', 'Married', 'Divorced', 'Widowed'].includes(text)) {
      throw serviceError('Please choose a valid marital status.');
    }
    if (['spouseIsWorking', 'hasDependants'].includes(key) && text && !['Yes', 'No'].includes(text)) {
      throw serviceError(`${key} must be Yes or No.`);
    }
  }
};

export const createEmployeeProfileChangeRequest = async (req: any) => {
  const context = await getEmployeeContext(req);
  const changeType = String(req.body?.changeType || '') as EmployeeProfileChangeType;
  const requestedValues = req.body?.requestedValues;
  const allowedFields = profileChangeFields[changeType];
  if (!allowedFields) throw serviceError('Choose a valid profile change type.');
  if (!requestedValues || typeof requestedValues !== 'object' || Array.isArray(requestedValues)) {
    throw serviceError('Requested profile values are required.');
  }
  validateProfileRequestedValues(changeType, requestedValues);

  const currentValues = Object.fromEntries(allowedFields.map((key) => [key, context.employee[key] ?? null]));
  const idempotencyKey = getIdempotencyKey(req, `profile-change:${context.employeeId}`);
  const { data, error } = await context.employeeAdmin
    .from('employee_profile_change_requests')
    .upsert({
      employee_id: context.employeeId,
      employee_email: context.employeeEmail,
      change_type: changeType,
      current_values: currentValues,
      requested_values: requestedValues,
      status: 'Pending',
      idempotency_key: idempotencyKey,
    }, { onConflict: 'employee_id,idempotency_key' })
    .select(PROFILE_CHANGE_COLUMNS)
    .single();
  if (error || !data) {
    if (error) throwIfMissingServiceTable(error, 'profile changes');
    throw new Error(`Profile change request could not be created: ${error?.message || 'unknown error'}`);
  }
  return { request: mapProfileChange(data) };
};

export const markEmployeeNotificationRead = async (req: any) => {
  const context = await getEmployeeContext(req);
  const notificationId = String(req.body?.notificationId || '').trim();
  if (!notificationId) throw serviceError('notificationId is required.');
  const { data, error } = await context.employeeAdmin
    .from('employee_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('employee_id', context.employeeId)
    .select(NOTIFICATION_COLUMNS)
    .single();
  if (error || !data) throw serviceError('The notification could not be found.', 404);
  return { notification: mapNotification(data) };
};

export const listAdminEmployeeRequests = async (req: any) => {
  await requirePermission(req, 'employee.request.manage');
  const employeeAdmin = createEmployeeAdminClient();
  const query = {
    status: req.query?.status,
    priority: req.query?.priority,
    entityId: req.query?.entityId,
    search: req.query?.search,
  };
  const [requests, profileChanges] = await Promise.all([
    loadRequests(employeeAdmin, query),
    loadProfileChanges(employeeAdmin),
  ]);
  return { requests, profileChanges };
};

export const updateAdminEmployeeRequest = async (req: any) => {
  const actor = await requirePermission(req, 'employee.request.manage');
  const requestId = String(req.body?.requestId || '').trim();
  const status = req.body?.status
    ? String(req.body.status) as EmployeeServiceRequestStatus
    : undefined;
  const message = String(req.body?.message || '').trim();
  const assignedTo = req.body?.assignedTo === null ? null : String(req.body?.assignedTo || '').trim() || undefined;
  if (!requestId) throw serviceError('requestId is required.');
  if (status && !validStatuses.has(status)) throw serviceError('Choose a valid request status.');
  const employeeAdmin = createEmployeeAdminClient();
  const { data: existingRow, error: lookupError } = await employeeAdmin
    .from('employee_service_requests')
    .select(SERVICE_REQUEST_COLUMNS)
    .eq('id', requestId)
    .maybeSingle();
  const existing: any = existingRow;
  if (lookupError) throw new Error(`Employee request lookup failed: ${lookupError.message}`);
  if (!existing) throw serviceError('The request could not be found.', 404);

  const updates: Record<string, unknown> = {};
  if (status) {
    updates.status = status;
    updates.resolved_at = status === 'Resolved' || status === 'Closed' ? new Date().toISOString() : null;
  }
  if (assignedTo !== undefined) updates.assigned_to = assignedTo;
  let updated = existing;
  if (Object.keys(updates).length > 0) {
    const result = await employeeAdmin
      .from('employee_service_requests')
      .update(updates)
      .eq('id', requestId)
      .select(SERVICE_REQUEST_COLUMNS)
      .single();
    if (result.error || !result.data) throw new Error(`Employee request could not be updated: ${result.error?.message || 'unknown error'}`);
    updated = result.data;
  }

  if (message) {
    const messageIdempotencyKey = getIdempotencyKey(req, `hr-message:${requestId}:${actor.username}`);
    const { error } = await employeeAdmin.from('employee_service_request_messages').upsert({
      request_id: requestId,
      author_type: 'hr',
      author_id: actor.username,
      author_name: actor.name || actor.username,
      body: message,
      idempotency_key: messageIdempotencyKey,
    }, { onConflict: 'request_id,idempotency_key' });
    if (error) throw new Error(`HR reply could not be saved: ${error.message}`);
    await notifyEmployee(
      employeeAdmin,
      existing.employee_id,
      `HR replied to ${existing.subject}`,
      message,
      requestId
    );
    await emailEmployee(existing.employee_email, existing.employee_name, existing.subject, message, existing.entity_id);
  } else if (status) {
    await notifyEmployee(
      employeeAdmin,
      existing.employee_id,
      `${existing.subject} updated`,
      `Your request is now ${status}.`,
      requestId
    );
    await emailEmployee(
      existing.employee_email,
      existing.employee_name,
      existing.subject,
      `Your request is now ${status}.`,
      existing.entity_id,
    );
  }

  const messages = await loadMessages(employeeAdmin, [requestId]);
  return { request: mapRequest(updated, messages.get(requestId) || []) };
};

export const updateAdminProfileChangeRequest = async (req: any) => {
  const actor = await requirePermission(req, 'profile.change.approve');
  const requestId = String(req.body?.requestId || '').trim();
  const status = String(req.body?.status || '') as 'Approved' | 'Rejected';
  const reviewNote = String(req.body?.reviewNote || '').trim();
  if (!requestId || !['Approved', 'Rejected'].includes(status)) {
    throw serviceError('requestId and a valid approval status are required.');
  }

  const employeeAdmin = createEmployeeAdminClient();
  const { data: changeRow, error: lookupError } = await employeeAdmin
      .from('employee_profile_change_requests')
      .select(PROFILE_CHANGE_COLUMNS)
    .eq('id', requestId)
    .maybeSingle();
  const change: any = changeRow;
  if (lookupError) throw new Error(`Profile change lookup failed: ${lookupError.message}`);
  if (!change) throw serviceError('The profile change request could not be found.', 404);
  if (!['Pending', 'Failed'].includes(change.status)) {
    throw serviceError('This profile change request has already been reviewed.', 409);
  }

  const mainUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const employeeUrl = String(
    process.env.EMPLOYEE_SUPABASE_URL
      || process.env.VITE_EMPLOYEE_SUPABASE_URL
      || process.env.SUPABASE_URL
      || process.env.VITE_SUPABASE_URL
      || ''
  ).replace(/\/+$/, '');
  const workflow = mainUrl && mainUrl === employeeUrl
    ? await employeeAdmin.rpc('approve_profile_change_workflow', {
      p_request_id: requestId,
      p_status: status,
      p_reviewed_by: actor.username,
      p_review_note: reviewNote || null,
    })
    : { data: null, error: { message: 'Workflow is split across Supabase projects.' } };
  if (!workflow.error || !isMissingFunction(workflow.error)) {
    if (workflow.error) {
      throw new Error(`Profile change workflow failed: ${workflow.error.message}`);
    }
    const workflowRow = workflow.data?.[0];
    if (!workflowRow) throw new Error('Profile change workflow returned no result.');
    const workflowRequest = mapProfileChange(workflowRow);
    if (workflowRequest.status === 'Failed') {
      return { request: workflowRequest };
    }
    let employee: any;
    if (workflowRequest.status === 'Approved') {
      const { data: employeeRow, error: employeeError } = await selectEmployeePortal((columns) => createMainAdminClient()
        .from('employees')
        .select(columns)
        .eq('id', change.employee_id)
        .maybeSingle());
      if (employeeError) throw new Error(`Approved employee profile could not be loaded: ${employeeError.message}`);
      employee = employeeRow ? toCamel(employeeRow) : undefined;
    }
    await notifyEmployee(
      employeeAdmin,
      change.employee_id,
      'Profile change request reviewed',
      workflowRequest.status === 'Approved'
        ? 'Your requested profile changes have been approved.'
        : `Your requested profile changes were rejected.${reviewNote ? ` Note: ${reviewNote}` : ''}`
    );
    return { request: workflowRequest, employee };
  }

  let updatedEmployee: any;
  let previousDbValues: Record<string, unknown> | undefined;
  try {
    if (status === 'Approved') {
      const main = createMainAdminClient();
      validateProfileRequestedValues(change.change_type, change.requested_values || {});
      const approvedValues = Object.fromEntries(
        Object.entries(change.requested_values || {}).map(([key, value]) => [
          profileChangeDbFields[key],
          key === 'dependants' ? value : String(value ?? '').trim(),
        ])
      );
      previousDbValues = Object.fromEntries(
        Object.keys(approvedValues).map((dbField) => {
          const profileField = Object.entries(profileChangeDbFields)
            .find(([, mappedDbField]) => mappedDbField === dbField)?.[0];
          return [dbField, change.current_values?.[profileField || dbField] ?? null];
        })
      );
      const { data, error } = await selectEmployeePortal((columns) => main
        .from('employees')
        .update(approvedValues)
        .eq('id', change.employee_id)
        .select(columns)
        .single());
      if (error || !data) throw new Error(`Approved profile changes could not be applied: ${error?.message || 'unknown error'}`);
      updatedEmployee = toCamel(data);
      const auditResult = await main.from('audit_logs').insert({
        id: `profile-change-${requestId}-${Date.now()}`,
        employee_email: change.employee_email,
        changed_by: actor.username,
        change_type: 'EMPLOYEE_PROFILE_CHANGE_APPROVED',
        old_value: JSON.stringify(change.current_values || {}),
        new_value: JSON.stringify(change.requested_values || {}),
      });
      if (auditResult.error) {
        const rollback = await main.from('employees').update(previousDbValues).eq('id', change.employee_id);
        if (rollback.error) {
          throw new Error(`Profile change audit failed and rollback failed: ${auditResult.error.message}; ${rollback.error.message}`);
        }
        throw new Error(`Profile change audit could not be saved: ${auditResult.error.message}`);
      }
    }

    const { data, error } = await employeeAdmin
      .from('employee_profile_change_requests')
      .update({
        status,
        reviewed_by: actor.username,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote || null,
      })
      .eq('id', requestId)
      .select(PROFILE_CHANGE_COLUMNS)
      .single();
    if (error || !data) {
      if (status === 'Approved' && updatedEmployee && previousDbValues) {
        const rollback = await createMainAdminClient()
          .from('employees')
          .update(previousDbValues)
          .eq('id', change.employee_id);
        if (rollback.error) {
          throw new Error(`Profile change decision failed and rollback failed: ${error?.message || 'unknown error'}; ${rollback.error.message}`);
        }
      }
      throw new Error(`Profile change decision could not be saved: ${error?.message || 'unknown error'}`);
    }

    await notifyEmployee(
      employeeAdmin,
      change.employee_id,
      'Profile change request reviewed',
      status === 'Approved'
        ? 'Your requested profile changes have been approved.'
        : `Your requested profile changes were rejected.${reviewNote ? ` Note: ${reviewNote}` : ''}`
    );

    return { request: mapProfileChange(data), employee: updatedEmployee };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = await employeeAdmin
      .from('employee_profile_change_requests')
      .update({
        status: 'Failed',
        reviewed_by: actor.username,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote || message,
      })
      .eq('id', requestId)
      .in('status', ['Pending', 'Failed'])
      .select(PROFILE_CHANGE_COLUMNS)
      .maybeSingle();
    if (failed.error) {
      throw new Error(`${message}; failed status could not be recorded: ${failed.error.message}`);
    }
    throw error;
  }
};

export const processNotificationOutbox = async (req: any) => {
  await requirePermission(req, 'notification.process');
  const client = createEmployeeAdminClient();
  const { data: pending, error } = await client
    .from('notification_outbox')
    .select('id,channel,recipient,template,payload,attempts,employee_id,request_id,created_at')
    .in('status', ['pending', 'failed'])
    .lte('available_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(25);
  if (error) {
    if (isMissingTable(error)) throw serviceError('Notification outbox is not deployed yet.', 503);
    throw new Error(`Notification outbox could not be loaded: ${error.message}`);
  }

  let sent = 0;
  let failed = 0;
  for (const item of (pending || []) as any[]) {
    const attempts = Number(item.attempts || 0) + 1;
    const claimed = await client
      .from('notification_outbox')
      .update({ status: 'processing', attempts })
      .eq('id', item.id)
      .in('status', ['pending', 'failed'])
      .select('id')
      .maybeSingle();
    if (claimed.error || !claimed.data) continue;

    try {
      if (item.channel === 'portal') {
        const payload = item.payload || {};
        const portal = await client.from('employee_notifications').insert({
          employee_id: item.employee_id,
          request_id: item.request_id || null,
          type: item.request_id ? 'service_request' : 'profile_change',
          title: String(payload.title || item.template),
          body: String(payload.body || ''),
          idempotency_key: String(payload.idempotencyKey || `outbox:${item.id}`),
        });
        if (portal.error && String(portal.error.code || '') !== '23505' && !/duplicate key/i.test(String(portal.error.message || ''))) {
          throw new Error(portal.error.message);
        }
      } else if (item.channel !== 'email' || !item.recipient) {
        throw new Error('Unsupported notification channel or missing recipient.');
      }
      if (item.channel === 'email') {
        const delivery = await sendEmailTemplate(
          item.template as any,
          item.recipient,
          item.payload || {},
          client,
          undefined,
          { entityId: item.payload?.entityId as string | undefined },
          createMainAdminClient(),
        );
        if (!delivery.ok) throw new Error(delivery.failureReason || 'Email delivery failed.');
      }
      await client.from('notification_outbox').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        last_error: null,
      }).eq('id', item.id);
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await client.from('notification_outbox').update({
        status: 'failed',
        last_error: message,
        available_at: new Date(Date.now() + Math.min(60, 2 ** Math.min(attempts, 6)) * 60 * 1000).toISOString(),
      }).eq('id', item.id);
      failed += 1;
    }
  }
  return { processed: sent + failed, sent, failed };
};

export const getEmployeeServiceTableError = isMissingTable;
