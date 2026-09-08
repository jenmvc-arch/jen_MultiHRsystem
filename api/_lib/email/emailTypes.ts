export type EmailType =
  | 'otp_verification'
  | 'password_reset'
  | 'welcome'
  | 'account_activation'
  | 'leave_decision'
  | 'claim_decision'
  | 'payslip_notification'
  | 'employee_request_created'
  | 'employee_request_updated'
  | 'test_email';

export type EmailDeliveryStatus = 'sent' | 'failed';

export interface EmailTemplateInput {
  type: EmailType;
  recipient: string;
  subject: string;
  html: string;
  text: string;
  metadata?: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export interface EmailDeliveryResult {
  ok: boolean;
  recipient: string;
  emailType: EmailType;
  status: EmailDeliveryStatus;
  providerMessageId?: string;
  failureReason?: string;
}
