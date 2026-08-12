export type EmployeeAccountStatus =
  | 'not_created'
  | 'invited'
  | 'active'
  | 'must_change_password'
  | 'disabled'
  | 'error';

export type AccountDeliveryChannel = 'email' | 'whatsapp' | 'both';

export type EmployeeAccountAction =
  | 'provision'
  | 'share'
  | 'reset_password';

export type AccountDeliveryStatus = 'sent' | 'queued' | 'handoff' | 'failed' | 'skipped';

export interface EmployeeAccountSummary {
  employeeId: string;
  employeeEmail: string;
  username: string;
  accountStatus: EmployeeAccountStatus;
  mustChangePassword: boolean;
  authUserId?: string;
  lastInvitedAt?: string;
  lastPasswordResetAt?: string;
  lastDeliveryChannel?: AccountDeliveryChannel;
  lastDeliveryStatus?: AccountDeliveryStatus;
}

export interface AccountDeliveryResult {
  channel: Exclude<AccountDeliveryChannel, 'both'>;
  provider: string;
  status: AccountDeliveryStatus;
  recipient?: string;
  handoffUrl?: string;
  error?: string;
}

export interface AccountActionResult {
  ok: boolean;
  action: EmployeeAccountAction;
  employeeId: string;
  account: EmployeeAccountSummary;
  deliveries: AccountDeliveryResult[];
  message?: string;
}

export interface EmployeeAccountEvent {
  id: string;
  employeeId: string;
  employeeEmail: string;
  actorUsername: string;
  action: EmployeeAccountAction;
  channel?: AccountDeliveryChannel;
  provider?: string;
  result: AccountDeliveryStatus;
  createdAt: string;
}
