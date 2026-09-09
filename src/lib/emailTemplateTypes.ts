import type { EmailTemplate } from '../types';

export const EMAIL_TEMPLATE_FUNCTIONS = [
  { value: 'otp_verification', label: 'OTP Verification' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'account_activation', label: 'Account Activation' },
  { value: 'leave_decision', label: 'Leave Decision' },
  { value: 'claim_decision', label: 'Claim Decision' },
  { value: 'payslip_notification', label: 'Payslip Notification' },
  { value: 'employee_request_created', label: 'Employee Request Created' },
  { value: 'employee_request_updated', label: 'Employee Request Updated' },
  { value: 'test_email', label: 'Test Email' },
] as const;

export const EMAIL_TEMPLATE_PLACEHOLDERS = [
  { value: 'employee_name', label: 'Employee name' },
  { value: 'date', label: 'Date' },
  { value: 'entity_name', label: 'Entity name' },
  { value: 'payslip_type', label: 'Payslip type' },
  { value: 'payroll_month', label: 'Payroll month' },
  { value: 'payroll_year', label: 'Payroll year' },
  { value: 'details', label: 'Details' },
  { value: 'status', label: 'Status' },
  { value: 'action_link', label: 'Action link' },
  { value: 'otp', label: 'OTP code' },
  { value: 'action', label: 'Action' },
  { value: 'request_subject', label: 'Request subject' },
  { value: 'category', label: 'Category' },
  { value: 'priority', label: 'Priority' },
] as const;

export const EMAIL_TEMPLATE_PLACEHOLDER_VALUES: Set<string> = new Set(
  EMAIL_TEMPLATE_PLACEHOLDERS.map((placeholder) => placeholder.value),
);

export const getEmailTemplateFunctionLabel = (value: string) => (
  EMAIL_TEMPLATE_FUNCTIONS.find((item) => item.value === value)?.label
  || (value.startsWith('custom:') ? `Custom: ${value.slice(7)}` : value)
);

export const extractEmailTemplatePlaceholders = (value: string) => (
  [...value.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)]
    .map((match) => match[1])
);

export const normalizeEmailTemplate = (raw: any): EmailTemplate => ({
  id: String(raw?.id || ''),
  entityId: raw?.entityId || raw?.entity_id || undefined,
  name: String(raw?.name || ''),
  assignedFunction: String(raw?.assignedFunction || raw?.assigned_function || ''),
  subjectTemplate: String(raw?.subjectTemplate || raw?.subject_template || ''),
  bodyTemplate: String(raw?.bodyTemplate || raw?.body_template || ''),
  isActive: raw?.isActive !== false && raw?.is_active !== false,
  createdBy: raw?.createdBy || raw?.created_by || undefined,
  updatedBy: raw?.updatedBy || raw?.updated_by || undefined,
  createdAt: String(raw?.createdAt || raw?.created_at || ''),
  updatedAt: String(raw?.updatedAt || raw?.updated_at || ''),
});
