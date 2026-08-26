export type EmployeeServiceRequestStatus =
  | 'Open'
  | 'In Progress'
  | 'Waiting for Employee'
  | 'Resolved'
  | 'Closed';

export type EmployeeServiceRequestPriority = 'Low' | 'Normal' | 'High';

export type EmployeeServiceRequestCategory =
  | 'Leave question'
  | 'Payslip issue'
  | 'Profile update'
  | 'Bank details change'
  | 'Statutory details change'
  | 'Document request'
  | 'IT / equipment'
  | 'Suggestion'
  | 'Confidential complaint'
  | 'Other';

export interface EmployeeServiceMessage {
  id: string;
  requestId: string;
  authorType: 'employee' | 'hr' | 'system';
  authorId?: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface EmployeeServiceRequest {
  id: string;
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  entityId?: string;
  category: EmployeeServiceRequestCategory;
  subject: string;
  description: string;
  priority: EmployeeServiceRequestPriority;
  status: EmployeeServiceRequestStatus;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  messages: EmployeeServiceMessage[];
}

export type EmployeeProfileChangeType =
  | 'bank_details'
  | 'statutory_details'
  | 'identity_details'
  | 'family_details';

export type EmployeeProfileChangeStatus = 'Pending' | 'Approved' | 'Rejected';

export interface EmployeeProfileChangeRequest {
  id: string;
  employeeId: string;
  employeeEmail: string;
  changeType: EmployeeProfileChangeType;
  currentValues: Record<string, unknown>;
  requestedValues: Record<string, unknown>;
  status: EmployeeProfileChangeStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeNotification {
  id: string;
  employeeId: string;
  requestId?: string;
  type: 'service_request' | 'profile_change' | 'announcement';
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export interface EmployeePortalBootstrap {
  employee: Record<string, unknown>;
  payrollRecords: Record<string, unknown>[];
  performances: Record<string, unknown>[];
  appraisalAccessGrants: Record<string, unknown>[];
  reviewCycles: Record<string, unknown>[];
  entities: Record<string, unknown>[];
  serviceRequests: EmployeeServiceRequest[];
  profileChangeRequests: EmployeeProfileChangeRequest[];
  notifications: EmployeeNotification[];
}
