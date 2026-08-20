import nodemailer, { Transporter } from 'nodemailer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildTemplate } from './templates.js';
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
  sleep?: (milliseconds: number) => Promise<void>;
}

const getConfig = () => {
  const user = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD;
  const fromName = process.env.EMAIL_FROM_NAME || 'RedPoint HRMS';
  if (!user || !password) {
    throw new Error('Gmail SMTP is not configured on the server.');
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
    data: Record<string, unknown>
  ) => {
    const template = buildTemplate(type, data);
    return send({
      type,
      recipient,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  };

  return { send, sendTemplate };
};

export const sendEmailTemplate = async (
  type: EmailType,
  recipient: string,
  data: Record<string, unknown>,
  db?: SupabaseClient
) => createEmailService({ db }).sendTemplate(type, recipient, data);
