import assert from 'node:assert/strict';
import { buildTemplate } from '../api/_lib/email/templates.js';
import { createEmailService } from '../api/_lib/email/emailService.js';

process.env.GMAIL_USER = 'smtp-test@example.com';
process.env.GMAIL_APP_PASSWORD = 'not-a-real-password';
process.env.EMAIL_FROM_NAME = 'RedPoint HRMS';

const sent: any[] = [];
let attempts = 0;
const service = createEmailService({
  sleep: async () => undefined,
  transporter: {
    sendMail: async (message: any) => {
      attempts += 1;
      if (attempts < 3) {
        const error: any = new Error('temporary network failure');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      sent.push(message);
      return { messageId: '<smtp-test-message>' };
    },
  } as any,
});

const result = await service.sendTemplate('otp_verification', 'employee@example.com', {
  name: 'Employee',
  otp: '123456',
  action: 'sign in',
});

assert.equal(result.ok, true);
assert.equal(result.providerMessageId, '<smtp-test-message>');
assert.equal(attempts, 3);
assert.equal(sent[0].to, 'employee@example.com');
assert.match(sent[0].html, /123456/);
assert.equal(JSON.stringify(result).includes('not-a-real-password'), false);

const leave = buildTemplate('leave_decision', {
  name: 'Employee',
  status: 'approved',
  details: 'Annual Leave',
});
assert.match(leave.html, /approved/);
assert.match(buildTemplate('password_reset', { name: 'Employee', otp: '654321' }).text, /654321/);

console.log('Email service tests passed.');
