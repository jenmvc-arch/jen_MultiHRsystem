import nodemailer, { Transporter } from 'nodemailer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildTemplate } from './templates.js';
import { renderPlainTextAsHtml } from './templates.js';
import {
  EMAIL_TEMPLATE_PLACEHOLDER_VALUES,
  extractEmailTemplatePlaceholders,
} from '../../../src/lib/emailTemplateTypes.js';
import {
  EmailDeliveryResult,
  EmailTemplateInput,
  EmailType,
} from './emailTypes.js';

const RETRYABLE_CODES = new Set([
  'ETIMEDOUT',
  'ECONNECTION',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENETUNREACH',
]);

export interface EmailServiceOptions {
  transporter?: Transporter;
  db?: SupabaseClient;
  templateDb?: SupabaseClient;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface EmailTemplateContext {
  entityId?: string;
  entityName?: string;
}

const buildTemplateValues = (
  data: Record<string, unknown>,
  context: EmailTemplateContext,
) => {
  const values: Record<string, unknown> = {};
  EMAIL_TEMPLATE_PLACEHOLDER_VALUES.forEach((key) => {
    values[key] = '';
  });
  Object.assign(values, data);
  Object.assign(values, {
    employee_name: data.employee_name ?? data.name ?? '',
    entity_name: data.entity_name ?? data.entityName ?? context.entityName ?? '',
    date: data.date ?? new Date().toLocaleDateString('en-GB'),
    payslip_type: data.payslip_type ?? data.payslipType ?? '',
    payroll_month: data.payroll_month ?? data.payrollMonth ?? '',
    payroll_year: data.payroll_year ?? data.payrollYear ?? '',
    action_link: data.action_link ?? data.actionLink ?? '',
    request_subject: data.request_subject ?? data.subject ?? '',
  });
  return values;
};

const getConfig = () => {
  const user = process.env.GMAIL_USER;
  // Google displays App Passwords in groups; SMTP expects the 16 characters
  // without separators.
  const password = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  const fromName = process.env.EMAIL_FROM_NAME || 'RedPoint HRMS';
  if (!user || !password) {
    throw new Error('Gmail SMTP is not configured on the server.');
  }
  if (password.length !== 16) {
    throw new Error('GMAIL_APP_PASSWORD must be a valid 16-character Google App Password.');
  }
  return { user, password, fromName };
};

const defaultSleep = (milliseconds: number) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

const writeDeliveryLog = async (
  db: SupabaseClient | undefined,
  result: EmailDeliveryResult
) => {
  if (!db) return;
  const { error } = await db.from('email_delivery_logs').insert({
    recipient: result.recipient,
    email_type: result.emailType,
    status: result.status,
    sent_at: result.status === 'sent' ? new Date().toISOString() : null,
    provider_message_id: result.providerMessageId || null,
    failure_reason: result.failureReason || null,
  });
  if (error) console.warn('[Email Delivery] Delivery log write failed:', error.message);
};

const isRetryable = (error: any) => RETRYABLE_CODES.has(String(error?.code || ''))
  || Number(error?.responseCode) >= 500;

export const createEmailService = (options: EmailServiceOptions = {}) => {
  const sleep = options.sleep || defaultSleep;
  const getTransporter = () => {
    if (options.transporter) return options.transporter;
    const config = getConfig();
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: config.user, pass: config.password },
    });
  };

  const send = async (input: EmailTemplateInput): Promise<EmailDeliveryResult> => {
    const config = getConfig();
    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const info = await getTransporter().sendMail({
          from: `"${config.fromName}" <${config.user}>`,
          to: input.recipient,
          subject: input.subject,
          text: input.text,
          html: input.html,
          attachments: input.attachments,
        });
        const result: EmailDeliveryResult = {
          ok: true,
          recipient: input.recipient,
          emailType: input.type,
          status: 'sent',
          providerMessageId: info.messageId,
        };
        await writeDeliveryLog(options.db, result);
        return result;
      } catch (error: any) {
        lastError = error;
        if (!isRetryable(error) || attempt === 2) break;
        await sleep(250 * (2 ** attempt));
      }
    }
    const result: EmailDeliveryResult = {
      ok: false,
      recipient: input.recipient,
      emailType: input.type,
      status: 'failed',
      failureReason: String(lastError?.message || 'Email delivery failed.').slice(0, 500),
    };
    await writeDeliveryLog(options.db, result);
    return result;
  };

  const sendTemplate = async (
    type: EmailType,
    recipient: string,
    data: Record<string, unknown>,
    attachments?: EmailTemplateInput['attachments'],
    context: EmailTemplateContext = {},
  ) => {
    let template = buildTemplate(type, data);
    const templateDb = options.templateDb;
    if (templateDb) {
      try {
        const { data: rows, error } = await templateDb
          .from('email_templates')
          .select('entity_id,subject_template,body_template,is_active')
          .eq('assigned_function', type)
          .eq('is_active', true);
        if (!error) {
          const entityId = String(context.entityId || '').trim();
          const configured = (rows || []).find((row: any) => (
            entityId && String(row.entity_id || '') === entityId
          )) || (rows || []).find((row: any) => !row.entity_id);
          if (configured) {
            const values = buildTemplateValues(data, context);
            const replace = (value: string) => value.replace(
              /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
              (_match, key) => String(values[key] ?? ''),
            );
            const subject = replace(String(configured.subject_template || '')).replace(/[\r\n]/g, ' ').trim();
            const body = replace(String(configured.body_template || ''));
            const subjectPlaceholders = extractEmailTemplatePlaceholders(String(configured.subject_template || ''));
            const bodyPlaceholders = extractEmailTemplatePlaceholders(String(configured.body_template || ''));
            if (
              subject
              && body.trim()
              && [...subjectPlaceholders, ...bodyPlaceholders].every((key) => (
                Object.prototype.hasOwnProperty.call(values, key)
              ))
            ) {
              template = {
                subject,
                text: body,
                html: renderPlainTextAsHtml(body),
              };
            }
          }
        } else if (!/email_templates|schema cache|could not find the table/i.test(error.message || '')) {
          console.warn('[Email Template] Template lookup failed:', error.message);
        }
      } catch (error: any) {
        console.warn('[Email Template] Template lookup skipped:', error?.message || error);
      }
    }
    return send({
      type,
      recipient,
      subject: template.subject,
      html: template.html,
      text: template.text,
      attachments,
    });
  };

  return { send, sendTemplate };
};

export const sendEmailTemplate = async (
  type: EmailType,
  recipient: string,
  data: Record<string, unknown>,
  db?: SupabaseClient,
  attachments?: EmailTemplateInput['attachments'],
  context?: EmailTemplateContext,
  templateDb?: SupabaseClient,
) => createEmailService({ db, templateDb }).sendTemplate(type, recipient, data, attachments, context);
