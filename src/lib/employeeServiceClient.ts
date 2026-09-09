import {
  EmployeeNotification,
  EmployeePortalBootstrap,
  EmployeeProfileChangeRequest,
  EmployeeProfileChangeType,
  EmployeeServiceMessage,
  EmployeeServiceRequest,
  EmployeeServiceRequestCategory,
  EmployeeServiceRequestPriority,
  EmployeeServiceRequestStatus,
} from './employeeServiceTypes';
import { LeaveRequest } from './leaveDomain';
import { LeaveWorkspaceData } from './leaveDomain';
import { employeeSupabase, supabase } from './supabaseClient';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const employeeAuthClient = employeeSupabase || supabase;
  const { data: sessionData } = await employeeAuthClient?.auth.getSession()
    || { data: { session: null } };
  const accessToken = sessionData.session?.access_token;

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Employee portal request failed with status ${response.status}.`);
  }
  return payload as T;
}

const idempotencyKey = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

export const loadEmployeePortalBootstrap = () =>
  request<EmployeePortalBootstrap>('/api/employee-portal/bootstrap');

export const updateEmployeePortalProfile = (updates: Record<string, unknown>) =>
  request<{ employee: Record<string, unknown> }>('/api/employee-portal/profile', {
    method: 'PATCH',
    body: JSON.stringify({ updates }),
  });

export const createEmployeeServiceRequest = (input: {
  category: EmployeeServiceRequestCategory;
  subject: string;
  description: string;
  priority: EmployeeServiceRequestPriority;
}) => request<{ request: EmployeeServiceRequest }>('/api/employee-portal/requests', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': idempotencyKey() },
  body: JSON.stringify(input),
});

export const addEmployeeServiceMessage = (requestId: string, body: string) =>
  request<{ message: EmployeeServiceMessage; request?: EmployeeServiceRequest }>('/api/employee-portal/request-message', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ requestId, body }),
  });

export const reopenEmployeeServiceRequest = (requestId: string) =>
  request<{ request: EmployeeServiceRequest }>('/api/employee-portal/reopen-request', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ requestId }),
  });

export const createEmployeeProfileChangeRequest = (input: {
  changeType: EmployeeProfileChangeType;
  requestedValues: Record<string, unknown>;
}) => request<{ request: EmployeeProfileChangeRequest }>('/api/employee-portal/profile-change-requests', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': idempotencyKey() },
  body: JSON.stringify(input),
});

export const markEmployeeNotificationRead = (notificationId: string) =>
  request<{ notification: EmployeeNotification }>('/api/employee-portal/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ notificationId }),
  });

export const loadEmployeeLeaveRequests = () =>
  request<{ requests: LeaveRequest[] }>('/api/employee-portal/leave-requests');

export const loadEmployeeLeaveWorkspace = () =>
  request<LeaveWorkspaceData>('/api/employee-portal/leave-workspace');

export const createEmployeeLeaveRequest = (input: {
  leaveTypeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
}) => request<{ request: LeaveRequest }>('/api/employee-portal/leave-requests', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': idempotencyKey() },
  body: JSON.stringify(input),
});

export const listAdminEmployeeRequests = (query = '') =>
  request<{ requests: EmployeeServiceRequest[]; profileChanges: EmployeeProfileChangeRequest[] }>(
    `/api/admin/employee-requests${query ? `?${query}` : ''}`
  );

export const updateAdminEmployeeRequest = (input: {
  requestId: string;
  status?: EmployeeServiceRequestStatus;
  assignedTo?: string;
  message?: string;
}) => request<{ request: EmployeeServiceRequest }>('/api/admin/employee-requests/update', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': idempotencyKey() },
  body: JSON.stringify(input),
});

export const updateAdminProfileChangeRequest = (input: {
  requestId: string;
  status: 'Approved' | 'Rejected';
  reviewNote?: string;
}) => request<{ request: EmployeeProfileChangeRequest; employee?: Record<string, unknown> }>(
  '/api/admin/profile-change-requests/update',
  {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(input),
  }
);
