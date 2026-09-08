import type { PayrollRecord2026 } from '../types';

export interface PayrollActionResult {
  ok: boolean;
  recordId: string;
  status?: PayrollRecord2026['status'];
  message?: string;
  error?: string;
}

const request = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Payroll action failed with status ${response.status}.`);
  }
  return payload as T;
};

export const updatePayrollStatus = (
  recordIds: string[],
  action: 'process' | 'publish' | 'unpublish',
) => request<{ results: PayrollActionResult[] }>('/api/admin/payroll/publish', {
  method: 'POST',
  body: JSON.stringify({ recordIds, action }),
});

export const sendPayslipEmails = (recordIds: string[]) =>
  request<{ results: PayrollActionResult[] }>('/api/admin/payroll/email', {
    method: 'POST',
    body: JSON.stringify({ recordIds }),
  });
