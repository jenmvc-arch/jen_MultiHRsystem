export type BusinessEmailType = 'leave_decision' | 'claim_decision' | 'payslip_notification';

export async function requestBusinessEmail(input: {
  type: BusinessEmailType;
  recipient: string;
  name?: string;
  status?: string;
  details?: string;
}) {
  const response = await fetch('/api/admin/email/notification', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Email notification could not be sent.');
  return payload;
}
