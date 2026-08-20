import { EmailType } from './emailTypes.js';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const layout = (title: string, body: string) => `
<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f1eb;font-family:Arial,sans-serif;color:#263238">
    <div style="max-width:620px;margin:32px auto;padding:28px;background:#fff;border:1px solid #e3ded4">
      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#9a6b32">RedPoint HRMS</div>
      <h1 style="font-size:25px;margin:18px 0 12px">${escapeHtml(title)}</h1>
      ${body}
      <p style="margin-top:28px;font-size:12px;color:#68737a">This is an automated message. Please do not reply.</p>
    </div>
  </body>
</html>`;

export const buildTemplate = (type: EmailType, data: Record<string, unknown>) => {
  const name = escapeHtml(data.name || 'there');
  const otp = escapeHtml(data.otp);
  const action = escapeHtml(data.action || 'continue');
  const status = escapeHtml(data.status || '');
  const details = escapeHtml(data.details || '');

  switch (type) {
    case 'otp_verification':
      return {
        subject: 'Your RedPoint HRMS verification code',
        text: `Hello ${data.name || 'there'}, your verification code is ${data.otp}. It expires in 10 minutes.`,
        html: layout('Verify your email', `<p>Hello ${name},</p><p>Use this verification code to ${action}:</p><p style="font-size:34px;font-weight:bold;letter-spacing:.3em">${otp}</p><p>This code expires in 10 minutes.</p>`),
      };
    case 'password_reset':
      return {
        subject: 'RedPoint HRMS password reset',
        text: `Hello ${data.name || 'there'}, use code ${data.otp} to reset your password. It expires in 10 minutes.`,
        html: layout('Reset your password', `<p>Hello ${name},</p><p>Use this code to reset your password:</p><p style="font-size:34px;font-weight:bold;letter-spacing:.3em">${otp}</p><p>This code expires in 10 minutes.</p>`),
      };
    case 'welcome':
      return {
        subject: 'Welcome to RedPoint HRMS',
        text: `Welcome ${data.name || 'there'}! Your RedPoint HRMS account is ready. ${data.actionLink || ''}`,
        html: layout('Welcome to RedPoint HRMS', `<p>Hello ${name},</p><p>Your account is ready. Use the secure link below to complete your profile:</p><p><a href="${escapeHtml(data.actionLink)}">${escapeHtml(data.actionLink)}</a></p>`),
      };
    case 'account_activation':
      return {
        subject: 'Activate your RedPoint HRMS account',
        text: `Hello ${data.name || 'there'}, use this secure link to activate your account: ${data.actionLink || ''}`,
        html: layout('Activate your account', `<p>Hello ${name},</p><p>Use this secure link to activate your account:</p><p><a href="${escapeHtml(data.actionLink)}">${escapeHtml(data.actionLink)}</a></p>`),
      };
    case 'leave_decision':
      return {
        subject: `Leave request ${data.status || 'updated'}`,
        text: `Your leave request has been ${data.status || 'updated'}. ${data.details || ''}`,
        html: layout('Leave request update', `<p>Hello ${name},</p><p>Your leave request has been <strong>${status}</strong>.</p><p>${details}</p>`),
      };
    case 'claim_decision':
      return {
        subject: `Claim request ${data.status || 'updated'}`,
        text: `Your claim request has been ${data.status || 'updated'}. ${data.details || ''}`,
        html: layout('Claim request update', `<p>Hello ${name},</p><p>Your claim request has been <strong>${status}</strong>.</p><p>${details}</p>`),
      };
    case 'payslip_notification':
      return {
        subject: 'Your RedPoint HRMS payslip is available',
        text: `Hello ${data.name || 'there'}, your payslip is now available. ${data.details || ''}`,
        html: layout('Payslip available', `<p>Hello ${name},</p><p>Your payslip is now available in the HRMS portal.</p><p>${details}</p>`),
      };
    case 'test_email':
      return {
        subject: 'RedPoint HRMS SMTP test',
        text: 'This is a RedPoint HRMS Gmail SMTP test email.',
        html: layout('SMTP test successful', '<p>This email confirms that Gmail SMTP is configured correctly for RedPoint HRMS.</p>'),
      };
  }
};
