import {
  createEmployeeAdminClient,
  createMainAdminClient,
  getEmployeeAuthUser,
  requireAdminSession,
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
import { LeaveRequest } from '../../src/lib/leaveDomain.js';

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

const serviceError = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const isMissingTable = (error: any) => (
  /employee_service_|employee_notifications|schema cache|could not find the table/i.test(
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
  if (!account?.employee_id || account.account_status === 'disabled') {
    throw serviceError('This employee account is not linked to an active employee profile.', 403);
  }

  const main = createMainAdminClient();
  const { data: employee, error: employeeError } = await main
    .from('employees')
    .select('*')
    .eq('id', account.employee_id)
    .maybeSingle();
  if (employeeError) throw new Error(`Employee profile lookup failed: ${employeeError.message}`);
  if (!employee) throw serviceError('The employee profile could not be found.', 404);

  return {
    user,
    employeeAdmin,
    main,
    employee: toCamel(employee),
    employeeId: String(employee.id),
    employeeEmail: normalize(employee.email || account.employee_email || user.email),
  };
};

const loadMessages = async (client: any, requestIds: string[]) => {
  if (requestIds.length === 0) return new Map<string, EmployeeServiceMessage[]>();
  const { data, error } = await client
    .from('employee_service_request_messages')
    .select('*')
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
    .select('*')
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
    .select('*')
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
    .select('*')
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
    main.from('payroll_records_2026').select('*').ilike('employee_email', employeeEmail),
    main.from('performances').select('*').or(
      `employee_id.eq.${employeeId},employee_email.ilike.${employeeEmail}`
    ),
    main.from('review_cycles').select('*').order('created_at', { ascending: false }),
    loadAppraisalAccessGrants(main, entityId, employeeId, employeeEmail),
    entityId
      ? main.from('corporate_entities').select('*').eq('id', entityId)
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
    employee,
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

const mapLeaveRequest = (row: any): LeaveRequest => toCamel(row) as LeaveRequest;

export const loadEmployeeLeaveRequests = async (req: any) => {
  const context = await getEmployeeContext(req);
  const { data, error } = await context.employeeAdmin
    .from('leave_requests')
    .select('*')
    .eq('employee_id', context.employeeId)
    .order('applied_date', { ascending: false });
  if (error) {
    if (/leave_requests|schema cache|could not find the table/i.test(error.message || '')) {
      throw serviceError('The employee leave database table is not deployed yet.', 503);
    }
    throw new Error(`Employee leave requests could not be loaded: ${error.message}`);
  }
  return { requests: (data || []).map(mapLeaveRequest) };
};

export const createEmployeeLeaveRequest = async (req: any) => {
  const context = await getEmployeeContext(req);
  const body = req.body || {};
  const leaveType = String(body.leaveType || '').trim();
  const leaveTypeId = String(body.leaveTypeId || '').trim();
  const startDate = String(body.startDate || '').trim();
  const endDate = String(body.endDate || '').trim();
  const reason = String(body.reason || '').trim();
  const totalDays = Number(body.totalDays || 0);
  if (!leaveType || !leaveTypeId || !startDate || !endDate || !reason || !Number.isFinite(totalDays) || totalDays <= 0) {
    throw serviceError('A complete leave request is required.');
  }
  const { data, error } = await context.employeeAdmin
    .from('leave_requests')
    .insert({
      id: `LR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entity_id: context.employee.entityId || null,
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
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(`Employee leave request could not be created: ${error?.message || 'unknown error'}`);
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
  const { data, error } = await context.main
    .from('employees')
    .update(cleanUpdates)
    .eq('id', context.employeeId)
    .select('*')
    .single();
  if (error) throw new Error(`Employee profile could not be updated: ${error.message}`);
  return { employee: toCamel(data) };
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
) => {
  const { error } = await client.from('employee_notifications').insert({
    employee_id: employeeId,
    request_id: requestId || null,
    type: requestId ? 'service_request' : 'profile_change',
    title,
    body,
  });
  if (error) console.warn('[Employee Notifications] Could not save notification:', error.message);
};

const emailEmployee = async (
  email: string,
  name: string,
  subject: string,
  details: string,
) => {
  try {
    await sendEmailTemplate('employee_request_updated', email, {
      name,
      subject,
      details,
    }, createEmployeeAdminClient());
  } catch (error) {
    console.warn('[Employee Request Email] Employee notification failed:', error);
  }
};

const notifyHr = async (request: EmployeeServiceRequest) => {
  try {
    await sendEmailTemplate('employee_request_created', HR_SUPPORT_EMAIL, {
      name: request.employeeName,
      subject: request.subject,
      category: request.category,
      priority: request.priority,
      details: request.description,
    }, createEmployeeAdminClient());
  } catch (error) {
    console.warn('[Employee Request Email] HR notification failed:', error);
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

  const { data, error } = await context.employeeAdmin
    .from('employee_service_requests')
    .insert({
      employee_id: context.employeeId,
      employee_email: context.employeeEmail,
      employee_name: context.employee.name,
      entity_id: context.employee.entityId || null,
      category,
      subject,
      description,
      priority,
      status: 'Open',
    })
    .select('*')
    .single();
  if (error || !data) {
    if (error) throwIfMissingServiceTable(error, 'employee requests');
    throw new Error(`Employee request could not be created: ${error?.message || 'unknown error'}`);
  }

  const { error: messageError } = await context.employeeAdmin
    .from('employee_service_request_messages')
    .insert({
      request_id: data.id,
      author_type: 'employee',
      author_id: context.employeeId,
      author_name: context.employee.name,
      body: description,
    });
  if (messageError) {
    throwIfMissingServiceTable(messageError, 'employee requests');
    throw new Error(`Employee request message could not be saved: ${messageError.message}`);
  }

  const request = mapRequest(data, []);
  await notifyHr(request);
  return { request };
};

const getOwnedRequest = async (context: any, requestId: string) => {
  const { data, error } = await context.employeeAdmin
    .from('employee_service_requests')
    .select('*')
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

  const { data, error } = await context.employeeAdmin
    .from('employee_service_request_messages')
    .insert({
      request_id: requestId,
      author_type: 'employee',
      author_id: context.employeeId,
      author_name: context.employee.name,
      body,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(`Employee request message could not be saved: ${error?.message || 'unknown error'}`);
  let updatedRequest = request;
  if (request.status === 'Resolved') {
    const { data: reopened, error: reopenError } = await context.employeeAdmin
      .from('employee_service_requests')
      .update({ status: 'Open' })
      .eq('id', requestId)
      .eq('employee_id', context.employeeId)
      .select('*')
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
    .select('*')
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

export const createEmployeeProfileChangeRequest = async (req: any) => {
  const context = await getEmployeeContext(req);
  const changeType = String(req.body?.changeType || '') as EmployeeProfileChangeType;
  const requestedValues = req.body?.requestedValues;
  const allowedFields = profileChangeFields[changeType];
  if (!allowedFields) throw serviceError('Choose a valid profile change type.');
  if (!requestedValues || typeof requestedValues !== 'object' || Array.isArray(requestedValues)) {
    throw serviceError('Requested profile values are required.');
  }
  const invalid = Object.keys(requestedValues).filter((key) => !allowedFields.includes(key));
  if (invalid.length > 0) throw serviceError(`Unsupported profile fields: ${invalid.join(', ')}`);
  if (Object.keys(requestedValues).length === 0) throw serviceError('At least one profile value is required.');

  const currentValues = Object.fromEntries(allowedFields.map((key) => [key, context.employee[key] ?? null]));
  const { data, error } = await context.employeeAdmin
    .from('employee_profile_change_requests')
    .insert({
      employee_id: context.employeeId,
      employee_email: context.employeeEmail,
      change_type: changeType,
      current_values: currentValues,
      requested_values: requestedValues,
      status: 'Pending',
    })
    .select('*')
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
    .select('*')
    .single();
  if (error || !data) throw serviceError('The notification could not be found.', 404);
  return { notification: mapNotification(data) };
};

export const listAdminEmployeeRequests = async (req: any) => {
  await requireAdminSession(req);
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
  const actor = await requireAdminSession(req);
  const requestId = String(req.body?.requestId || '').trim();
  const status = req.body?.status
    ? String(req.body.status) as EmployeeServiceRequestStatus
    : undefined;
  const message = String(req.body?.message || '').trim();
  const assignedTo = req.body?.assignedTo === null ? null : String(req.body?.assignedTo || '').trim() || undefined;
  if (!requestId) throw serviceError('requestId is required.');
  if (status && !validStatuses.has(status)) throw serviceError('Choose a valid request status.');
  const employeeAdmin = createEmployeeAdminClient();
  const { data: existing, error: lookupError } = await employeeAdmin
    .from('employee_service_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
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
      .select('*')
      .single();
    if (result.error || !result.data) throw new Error(`Employee request could not be updated: ${result.error?.message || 'unknown error'}`);
    updated = result.data;
  }

  if (message) {
    const { error } = await employeeAdmin.from('employee_service_request_messages').insert({
      request_id: requestId,
      author_type: 'hr',
      author_id: actor.username,
      author_name: actor.name || actor.username,
      body: message,
    });
    if (error) throw new Error(`HR reply could not be saved: ${error.message}`);
    await notifyEmployee(
      employeeAdmin,
      existing.employee_id,
      `HR replied to ${existing.subject}`,
      message,
      requestId
    );
    await emailEmployee(existing.employee_email, existing.employee_name, existing.subject, message);
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
      `Your request is now ${status}.`
    );
  }

  const messages = await loadMessages(employeeAdmin, [requestId]);
  return { request: mapRequest(updated, messages.get(requestId) || []) };
};

export const updateAdminProfileChangeRequest = async (req: any) => {
  const actor = await requireAdminSession(req);
  const requestId = String(req.body?.requestId || '').trim();
  const status = String(req.body?.status || '') as 'Approved' | 'Rejected';
  const reviewNote = String(req.body?.reviewNote || '').trim();
  if (!requestId || !['Approved', 'Rejected'].includes(status)) {
    throw serviceError('requestId and a valid approval status are required.');
  }

  const employeeAdmin = createEmployeeAdminClient();
  const { data: change, error: lookupError } = await employeeAdmin
    .from('employee_profile_change_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (lookupError) throw new Error(`Profile change lookup failed: ${lookupError.message}`);
  if (!change) throw serviceError('The profile change request could not be found.', 404);
  if (change.status !== 'Pending') throw serviceError('This profile change request has already been reviewed.', 409);

  let updatedEmployee: any;
  if (status === 'Approved') {
    const main = createMainAdminClient();
    const approvedValues = Object.fromEntries(
      Object.entries(change.requested_values || {}).map(([key, value]) => [
        profileChangeDbFields[key],
        key === 'dependants' ? value : String(value ?? '').trim(),
      ])
    );
    const { data, error } = await main
      .from('employees')
      .update(approvedValues)
      .eq('id', change.employee_id)
      .select('*')
      .single();
    if (error || !data) throw new Error(`Approved profile changes could not be applied: ${error?.message || 'unknown error'}`);
    updatedEmployee = toCamel(data);
    try {
      await main.from('audit_logs').insert({
        id: `profile-change-${Date.now()}`,
        employee_email: change.employee_email,
        changed_by: actor.username,
        change_type: 'EMPLOYEE_PROFILE_CHANGE_APPROVED',
        old_value: JSON.stringify(change.current_values || {}),
        new_value: JSON.stringify(change.requested_values || {}),
      });
    } catch (auditError) {
      console.warn('[Profile Change Audit] Could not write audit record:', auditError);
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
    .select('*')
    .single();
  if (error || !data) throw new Error(`Profile change decision could not be saved: ${error?.message || 'unknown error'}`);

  await notifyEmployee(
    employeeAdmin,
    change.employee_id,
    'Profile change request reviewed',
    status === 'Approved'
      ? 'Your requested profile changes have been approved.'
      : `Your requested profile changes were rejected.${reviewNote ? ` Note: ${reviewNote}` : ''}`
  );

  return { request: mapProfileChange(data), employee: updatedEmployee };
};

export const getEmployeeServiceTableError = isMissingTable;
