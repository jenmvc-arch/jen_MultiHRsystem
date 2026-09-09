import assert from 'node:assert/strict';
import {
  EMAIL_TEMPLATE_PLACEHOLDER_VALUES,
  extractEmailTemplatePlaceholders,
  getEmailTemplateFunctionLabel,
  replaceEmailTemplatePlaceholders,
} from './lib/emailTemplateTypes';
import { createEmailService } from '../api/_lib/email/emailService.js';

process.env.GMAIL_USER = 'smtp-test@example.com';
process.env.GMAIL_APP_PASSWORD = 'not-a-real-pass1';

const sent: any[] = [];
const templateQuery: any = {
  select() { return this; },
  eq() { return this; },
  then(resolve: (value: any) => unknown) {
    return Promise.resolve({
      data: [{
        entity_id: 'ENT-92',
        subject_template: 'Payslip {{payroll_month}} for {{employee_name}}',
        body_template: 'Hello {{employee_name}} <unsafe>\\n{{details}}',
        is_active: true,
      }],
      error: null,
    }).then(resolve);
  },
};

const service = createEmailService({
  templateDb: { from: () => templateQuery } as any,
  transporter: {
    sendMail: async (message: any) => {
      sent.push(message);
      return { messageId: '<template-test-message>' };
    },
  } as any,
});

const rendered = await service.sendTemplate(
  'payslip_notification',
  'employee@example.com',
  {
    name: 'Alicia Tan',
    employee_name: 'Alicia Tan',
    payslipType: 'Payslip',
    payrollMonth: 'August',
    payrollYear: '2026',
    entityName: 'Red Point Sdn Bhd',
    details: '<script>alert(1)</script>',
  },
  undefined,
  { entityId: 'ENT-92' },
);

assert.deepEqual(
  extractEmailTemplatePlaceholders('Hello {{ employee_name }} on {{date}}: {{details lowercase}} / {{pay type}}'),
  ['employee_name', 'date', 'details', 'pay type'],
);
assert.equal(EMAIL_TEMPLATE_PLACEHOLDER_VALUES.has('employee_name'), true);
assert.equal(EMAIL_TEMPLATE_PLACEHOLDER_VALUES.has('pay type'), true);
assert.equal(EMAIL_TEMPLATE_PLACEHOLDER_VALUES.has('unknown_value'), false);
assert.deepEqual(
  extractEmailTemplatePlaceholders('{{unknown-value}}'),
  ['unknown-value'],
);
assert.equal(getEmailTemplateFunctionLabel('payslip_notification'), 'Payslip Notification');
assert.equal(getEmailTemplateFunctionLabel('custom:announcement'), 'Custom: announcement');
assert.equal(
  replaceEmailTemplatePlaceholders(
    '{{employee_name uppercase}} / {{pay type}} / {{details lowercase}}',
    (key) => ({
      employee_name: 'Alicia Tan',
      'pay type': 'Salary',
      details: 'PDF Attached',
    }[key] || ''),
  ),
  'ALICIA TAN / Salary / pdf attached',
);
assert.equal(rendered.ok, true);
assert.equal(sent[0].subject, 'Payslip August for Alicia Tan');
assert.match(sent[0].html, /&lt;unsafe&gt;/);
assert.match(sent[0].html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);

const payslipTemplateQuery: any = {
  select() { return this; },
  eq() { return this; },
  then(resolve: (value: any) => unknown) {
    return Promise.resolve({
      data: [{
        entity_id: 'ENT-92',
        subject_template: '{{payslip_type}} - {{pay type}} - {{payroll_month}} {{payroll_year}}',
        body_template: '{{employee_name uppercase}} / {{entity_name}} / {{details}}',
        is_active: true,
      }],
      error: null,
    }).then(resolve);
  },
};
const payslipSent: any[] = [];
const payslipService = createEmailService({
  templateDb: { from: () => payslipTemplateQuery } as any,
  transporter: {
    sendMail: async (message: any) => {
      payslipSent.push(message);
      return { messageId: '<payslip-template-message>' };
    },
  } as any,
});
await payslipService.sendTemplate(
  'payslip_notification',
  'employee@example.com',
  {
    name: 'Alicia Tan',
    payslipType: 'Payslip',
    payType: 'Salary',
    payrollMonth: 'August',
    payrollYear: '2026',
    entityName: 'Red Point Sdn Bhd',
    details: 'Payslip PDF attached.',
  },
  undefined,
  { entityId: 'ENT-92', entityName: 'Red Point Sdn Bhd' },
);
assert.equal(payslipSent[0].subject, 'Payslip - Salary - August 2026');
assert.match(payslipSent[0].text, /ALICIA TAN \/ Red Point Sdn Bhd \/ Payslip PDF attached\./);

console.log('Email template tests passed.');
