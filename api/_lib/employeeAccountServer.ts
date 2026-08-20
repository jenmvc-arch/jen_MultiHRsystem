import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import dotenv from 'dotenv';
import {
  AccountDeliveryChannel,
  AccountDeliveryResult,
  AccountActionResult,
  EmployeeAccountAction,
  EmployeeAccountStatus,
  EmployeeAccountSummary,
} from '../../src/lib/employeeAccountTypes.js';
import { isAdminPortalRole } from '../../src/lib/userRoles.js';
import { sendEmailTemplate } from './email/emailService.js';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  OTP_MAX_VERIFICATION_ATTEMPTS,
  OTP_REQUEST_LIMIT_PER_HOUR,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
} from './email/otpPolicy.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

export const ADMIN_USERNAME = 'hr.redpoint';
export const ADMIN_SESSION_COOKIE = 'redpoint_admin_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

interface AdminUserRecord {
  email: string;
  password?: string;
  password_hash?: string;
  name: string;
  role: string;
  must_change_password?: boolean;
}

export interface AdminSessionActor {
  username: string;
  name: string;
  role: string;
}

interface SessionPayload extends AdminSessionActor {
  issuedAt: number;
  expiresAt: number;
}

interface EmployeeAccountRow {
  employee_id: string;
  employee_email: string;
  username: string;
  auth_user_id?: string | null;
  account_status: EmployeeAccountStatus;
  must_change_password: boolean;
  last_invited_at?: string | null;
  last_password_reset_at?: string | null;
  last_delivery_channel?: AccountDeliveryChannel | null;
  last_delivery_status?: AccountDeliveryResult['status'] | null;
}

export interface EmployeeAccountTarget {
  id: string;
  email: string;
  name: string;
  contactNumber?: string;
}

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();
const EMPLOYEE_OTP_SESSION_COOKIE = 'redpoint_employee_otp_session';
const EMPLOYEE_OTP_SESSION_TTL_SECONDS = 8 * 60 * 60;

const isAccountSchemaMissing = (message: string) => (
  /employee_accounts|employee_account_events|schema cache|could not find the table/i.test(message)
);

const getMainSupabaseConfig = () => ({
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
});

const getEmployeeSupabaseConfig = () => ({
  url: process.env.EMPLOYEE_SUPABASE_URL
    || process.env.VITE_EMPLOYEE_SUPABASE_URL
    || process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || '',
  serviceRoleKey: process.env.EMPLOYEE_SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || '',
});

export const createMainAdminClient = (): SupabaseClient => {
  const { url, serviceRoleKey } = getMainSupabaseConfig();
  if (!url || !serviceRoleKey) {
    throw new Error('The primary Supabase server credentials are not configured.');
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export const createEmployeeAdminClient = (): SupabaseClient => {
  const { url, serviceRoleKey } = getEmployeeSupabaseConfig();
  if (!url || !serviceRoleKey) {
    throw new Error('The employee Supabase server credentials are not configured.');
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const otpError = (message: string, statusCode = 400) => (
  Object.assign(new Error(message), { statusCode })
);

const setEmployeeOtpSessionCookie = (
  res: any,
  email: string,
  authUserId: string
) => {
  const now = Math.floor(Date.now() / 1000);
  const body = encode(JSON.stringify({
    email,
    authUserId,
    expiresAt: now + EMPLOYEE_OTP_SESSION_TTL_SECONDS,
  }));
  res.setHeader(
    'Set-Cookie',
    `${EMPLOYEE_OTP_SESSION_COOKIE}=${encodeURIComponent(`${body}.${sign(body)}`)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${EMPLOYEE_OTP_SESSION_TTL_SECONDS}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
};

const getEmployeeOtpSession = (req: any) => {
  const cookies = parseCookieHeader(req.headers?.cookie);
  const raw = cookies[EMPLOYEE_OTP_SESSION_COOKIE];
  if (!raw) return null;
  const [body, signature] = raw.split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(actualBuffer, expectedBuffer)
  ) return null;
  try {
    const payload = JSON.parse(decode(body));
    return payload.expiresAt > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
};

export interface OtpRequestResult {
  ok: boolean;
  email: string;
  resendAvailableAt: string;
}

export interface OtpVerificationResult {
  ok: boolean;
  email: string;
}

export const requestEmployeeOtp = async (input: {
  email: string;
  purpose?: 'login' | 'password_reset' | 'activation';
  name?: string;
}): Promise<OtpRequestResult> => {
  const email = normalize(input.email);
  const purpose = input.purpose || 'login';
  if (!email.includes('@')) throw otpError('A valid employee email is required.');

  const employeeAdmin = createEmployeeAdminClient();
  const authUsers = await employeeAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authUsers.error) throw new Error(`Employee Auth lookup failed: ${authUsers.error.message}`);
  const authUser = (authUsers.data?.users || []).find((user: any) => normalize(user.email) === email);
  if (!authUser) throw otpError('This employee account is not available for OTP sign-in.', 404);

  const now = new Date();
  const { data: recent, error: recentError } = await employeeAdmin
    .from('email_otp_challenges')
    .select('created_at,resend_available_at')
    .eq('email', email)
    .eq('purpose', purpose)
    .gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
  if (recentError) throw new Error(`OTP rate lookup failed: ${recentError.message}`);
  const latest = recent?.[0] as any;
  if (latest?.resend_available_at && new Date(latest.resend_available_at).getTime() > now.getTime()) {
    throw otpError('Please wait 60 seconds before requesting another code.', 429);
  }
  if ((recent || []).length >= OTP_REQUEST_LIMIT_PER_HOUR) {
    throw otpError('Too many OTP requests. Please try again later.', 429);
  }

  const otp = generateOtp();
  const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);
  const resendAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
  const { data: challenge, error: insertError } = await employeeAdmin
    .from('email_otp_challenges')
    .insert({
      email,
      auth_user_id: authUser.id,
      otp_hash: hashOtp(otp),
      purpose,
      expires_at: expiresAt.toISOString(),
      resend_available_at: resendAvailableAt.toISOString(),
      request_count_window_start: now.toISOString(),
      request_count: (recent || []).length + 1,
      max_verification_attempts: OTP_MAX_VERIFICATION_ATTEMPTS,
    })
    .select('id')
    .single();
  if (insertError || !challenge) throw new Error(`OTP challenge could not be saved: ${insertError?.message || 'unknown error'}`);

  const delivery = await sendEmailTemplate('otp_verification', email, {
    name: input.name || authUser.user_metadata?.name || email,
    otp,
    action: purpose === 'login' ? 'sign in' : purpose.replace('_', ' '),
  }, employeeAdmin);
  if (!delivery.ok) {
    await employeeAdmin.from('email_otp_challenges').update({ invalidated_at: new Date().toISOString() }).eq('id', challenge.id);
    throw otpError('The verification email could not be sent. Please try again later.', 502);
  }

  return { ok: true, email, resendAvailableAt: resendAvailableAt.toISOString() };
};

export const verifyEmployeeOtp = async (input: {
  email: string;
  otp: string;
  purpose?: 'login' | 'password_reset' | 'activation';
  res?: any;
}): Promise<OtpVerificationResult> => {
  const email = normalize(input.email);
  const purpose = input.purpose || 'login';
  const employeeAdmin = createEmployeeAdminClient();
  const { data: challenge, error } = await employeeAdmin
    .from('email_otp_challenges')
    .select('*')
    .eq('email', email)
    .eq('purpose', purpose)
    .is('verified_at', null)
    .is('invalidated_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`OTP lookup failed: ${error.message}`);
  if (!challenge) throw otpError('The verification code is invalid or expired.', 401);
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    await employeeAdmin.from('email_otp_challenges').update({ invalidated_at: new Date().toISOString() }).eq('id', challenge.id);
    throw otpError('The verification code has expired.', 401);
  }
  if (challenge.verification_attempts >= challenge.max_verification_attempts) {
    await employeeAdmin.from('email_otp_challenges').update({ invalidated_at: new Date().toISOString() }).eq('id', challenge.id);
    throw otpError('Too many verification attempts. Request a new code.', 401);
  }

  const valid = verifyOtpHash(String(input.otp || ''), challenge.otp_hash);
  if (!valid) {
    const attempts = Number(challenge.verification_attempts || 0) + 1;
    await employeeAdmin.from('email_otp_challenges').update({
      verification_attempts: attempts,
      invalidated_at: attempts >= challenge.max_verification_attempts ? new Date().toISOString() : null,
    }).eq('id', challenge.id);
    throw otpError('The verification code is invalid.', 401);
  }

  await employeeAdmin.from('email_otp_challenges').update({
    verified_at: new Date().toISOString(),
    invalidated_at: new Date().toISOString(),
  }).eq('id', challenge.id);
  if (input.res && challenge.auth_user_id) {
    setEmployeeOtpSessionCookie(input.res, email, challenge.auth_user_id);
  }
  return { ok: true, email };
};

export const isEmployeeProjectConfigured = () => {
  const config = getEmployeeSupabaseConfig();
  return !!config.url && !!config.serviceRoleKey;
};

const getSessionSecret = () => {
  const secret = process.env.ADMIN_SESSION_SECRET
    || (process.env.NODE_ENV === 'production'
      ? ''
      : 'redpoint-local-admin-session-secret-change-me');
  if (!secret || secret.length < 24) {
    throw new Error('ADMIN_SESSION_SECRET must be configured with at least 24 characters.');
  }
  return secret;
};

const encode = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

const sign = (value: string) => createHmac('sha256', getSessionSecret()).update(value).digest('base64url');

const serializeSession = (session: SessionPayload) => {
  const body = encode(JSON.stringify(session));
  return `${body}.${sign(body)}`;
};

const parseCookieHeader = (header: string | undefined) => {
  const cookies: Record<string, string> = {};
  for (const segment of String(header || '').split(';')) {
    const index = segment.indexOf('=');
    if (index <= 0) continue;
    const key = segment.slice(0, index).trim();
    const value = segment.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
};

const parseSession = (raw: string | undefined): SessionPayload | null => {
  if (!raw) return null;
  const [body, signature] = raw.split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(decode(body)) as SessionPayload;
    if (!session.expiresAt || session.expiresAt <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

export const getAdminSession = (req: any): AdminSessionActor | null => {
  const cookies = parseCookieHeader(req.headers?.cookie);
  const session = parseSession(cookies[ADMIN_SESSION_COOKIE]);
  if (!session) return null;
  return {
    username: session.username,
    name: session.name,
    role: session.role,
  };
};

export const setAdminSessionCookie = (res: any, actor: AdminSessionActor) => {
  const now = Math.floor(Date.now() / 1000);
  const session: SessionPayload = {
    ...actor,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_SECONDS,
  };
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(serializeSession(session))}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`
  );
};

export const clearAdminSessionCookie = (res: any) => {
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
};

export const clearEmployeeOtpSessionCookie = (res: any) => {
  res.append?.(
    'Set-Cookie',
    `${EMPLOYEE_OTP_SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
};

const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('base64url');
  const derived = scryptSync(password, salt, 64).toString('base64url');
  return `scrypt$${salt}$${derived}`;
};

const verifyPassword = (password: string, storedHash: string) => {
  const [algorithm, salt, expected] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString('base64url');
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

const verifyLegacyPassword = (password: string, storedPassword: string) => {
  const actualBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(storedPassword);
  return (
    actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

const findAdminUser = async (username: string): Promise<AdminUserRecord | null> => {
  const admin = createMainAdminClient();
  const extended = await admin
    .from('users')
    .select('email,password,password_hash,name,role,must_change_password')
    .ilike('email', username.trim())
    .maybeSingle();
  if (!extended.error) return extended.data as AdminUserRecord | null;

  // Existing deployments may not have the password-hash migration yet.
  // Keep the lookup compatible while the server upgrades successful logins.
  if (!/column .* does not exist|could not find the .* column/i.test(extended.error.message)) {
    throw new Error(`Admin account lookup failed: ${extended.error.message}`);
  }
  const legacy = await admin
    .from('users')
    .select('email,password,name,role')
    .ilike('email', username.trim())
    .maybeSingle();
  if (legacy.error) throw new Error(`Admin account lookup failed: ${legacy.error.message}`);
  return legacy.data as AdminUserRecord | null;
};

export const authenticateAdmin = async (
  username: string,
  password: string
): Promise<AdminSessionActor | null> => {
  const user = await findAdminUser(username);
  if (!user || !isAdminPortalRole(user.role)) return null;

  const valid = user.password_hash
    ? verifyPassword(password, user.password_hash)
    : !!user.password && verifyLegacyPassword(password, user.password);
  if (!valid) return null;

  if (!user.password_hash && user.password) {
    try {
      await createMainAdminClient()
        .from('users')
        .update({ password_hash: hashPassword(password), updated_at: new Date().toISOString() })
        .eq('email', user.email);
    } catch (error) {
      console.warn('[Admin Auth] Password hash upgrade failed:', error);
    }
  }

  return {
    username: user.email,
    name: user.name,
    role: user.role,
  };
};

export const requireAdminSession = async (req: any): Promise<AdminSessionActor> => {
  const session = getAdminSession(req);
  if (!session) throw Object.assign(new Error('An authenticated admin session is required.'), { statusCode: 401 });

  const current = await findAdminUser(session.username);
  if (!current || !isAdminPortalRole(current.role)) {
    throw Object.assign(new Error('This admin account is no longer active.'), { statusCode: 403 });
  }

  return {
    username: current.email,
    name: current.name,
    role: current.role,
  };
};

export const requireMasterUser = async (req: any): Promise<AdminSessionActor> => {
  const actor = await requireAdminSession(req);
  if (normalize(actor.username) !== ADMIN_USERNAME) {
    throw Object.assign(new Error('Only hr.redpoint may manage employee accounts.'), { statusCode: 403 });
  }
  return actor;
};

export const updateAdminProfile = async (req: any, res: any) => {
  const actor = await requireAdminSession(req);
  setAdminSessionCookie(res, actor);
  return { user: actor };
};

export const normalizePhoneNumber = (value: string | undefined): string | null => {
  const phone = String(value || '').trim().replace(/[^\d+]/g, '');
  if (!/^\+\d{8,15}$/.test(phone)) return null;
  return phone;
};

const mapAccountRow = (row: EmployeeAccountRow): EmployeeAccountSummary => ({
  employeeId: row.employee_id,
  employeeEmail: row.employee_email,
  username: row.username,
  accountStatus: row.account_status,
  mustChangePassword: row.must_change_password,
  authUserId: row.auth_user_id || undefined,
  lastInvitedAt: row.last_invited_at || undefined,
  lastPasswordResetAt: row.last_password_reset_at || undefined,
  lastDeliveryChannel: row.last_delivery_channel || undefined,
  lastDeliveryStatus: row.last_delivery_status || undefined,
});

const buildMissingAccountSummary = (employeeId: string): EmployeeAccountSummary => {
  const normalized = normalize(employeeId);
  return {
    employeeId,
    employeeEmail: normalized,
    username: normalized,
    accountStatus: 'not_created',
    mustChangePassword: false,
  };
};

export const loadAccountSummaries = async (
  employeeIds?: string[]
): Promise<EmployeeAccountSummary[]> => {
  const employeeAdmin = createEmployeeAdminClient();
  let query = employeeAdmin
    .from('employee_accounts')
    .select('*')
    .order('employee_email');
  if (employeeIds && employeeIds.length > 0) {
    query = query.in('employee_id', employeeIds);
  }
  const { data, error } = await query;
  if (error) {
    if (isAccountSchemaMissing(error.message || '')) {
      return (employeeIds || []).map(buildMissingAccountSummary);
    }
    throw new Error(`Employee account lookup failed: ${error.message}`);
  }
  return (data || []).map(mapAccountRow);
};

export const loadAccountEvents = async (employeeId: string) => {
  const employeeAdmin = createEmployeeAdminClient();
  const { data, error } = await employeeAdmin
    .from('employee_account_events')
    .select('id,employee_id,employee_email,actor_username,action,channel,provider,result,created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    if (isAccountSchemaMissing(error.message || '')) return [];
    throw new Error(`Employee account history lookup failed: ${error.message}`);
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    employeeId: row.employee_id,
    employeeEmail: row.employee_email,
    actorUsername: row.actor_username,
    action: row.action,
    channel: row.channel || undefined,
    provider: row.provider || undefined,
    result: row.result,
    createdAt: row.created_at,
  }));
};

const loadEmployeeAccount = async (employeeId: string, employeeEmail: string) => {
  const employeeAdmin = createEmployeeAdminClient();
  const { data, error } = await employeeAdmin
    .from('employee_accounts')
    .select('*')
    .eq('employee_id', employeeId)
    .maybeSingle();
  if (error) throw new Error(`Employee account lookup failed: ${error.message}`);
  return (data || {
    employee_id: employeeId,
    employee_email: employeeEmail,
    username: employeeEmail,
    account_status: 'not_created',
    must_change_password: false,
  }) as EmployeeAccountRow;
};

const upsertEmployeeAccount = async (row: Partial<EmployeeAccountRow> & {
  employee_id: string;
  employee_email: string;
  username: string;
}) => {
  const employeeAdmin = createEmployeeAdminClient();
  const { data, error } = await employeeAdmin
    .from('employee_accounts')
    .upsert({
      ...row,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'employee_id' })
    .select('*')
    .single();
  if (error) throw new Error(`Employee account save failed: ${error.message}`);
  return mapAccountRow(data as EmployeeAccountRow);
};

const writeAccountEvent = async (input: {
  target: EmployeeAccountTarget;
  actor: AdminSessionActor;
  action: EmployeeAccountAction;
  channel?: AccountDeliveryChannel;
  provider?: string;
  result: AccountDeliveryResult['status'];
}) => {
  const employeeAdmin = createEmployeeAdminClient();
  const { error } = await employeeAdmin.from('employee_account_events').insert({
    employee_id: input.target.id,
    employee_email: normalize(input.target.email),
    actor_username: input.actor.username,
    action: input.action,
    channel: input.channel || null,
    provider: input.provider || null,
    result: input.result,
  });
  if (error) console.warn('[Employee Account Audit] Event write failed:', error.message);
};

const getEmployeeProjectUrl = () => getEmployeeSupabaseConfig().url;

const createActionLink = async (target: EmployeeAccountTarget, action: EmployeeAccountAction) => {
  const employeeAdmin = createEmployeeAdminClient();
  const existing = await employeeAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (existing.error) {
    throw new Error(`Employee Auth account lookup failed: ${existing.error.message}`);
  }
  let authUser = (existing.data?.users || []).find((user: any) => (
    normalize(user.email) === normalize(target.email)
  ));
  let isNew = false;

  if (!authUser) {
    const temporaryPassword = randomBytes(32).toString('base64url');
    const created = await employeeAdmin.auth.admin.createUser({
      email: target.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        employee_id: target.id,
        role: 'Employee',
        must_change_password: true,
      },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message || 'Employee Auth account could not be created.');
    }
    authUser = created.data.user;
    isNew = true;
  } else {
    const updated = await employeeAdmin.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...(authUser.user_metadata || {}),
        employee_id: target.id,
        role: 'Employee',
        must_change_password: true,
      },
    });
    if (updated.error) {
      throw new Error(`Employee Auth metadata could not be updated: ${updated.error.message}`);
    }
  }

  const linkType = action === 'provision' && isNew ? 'invite' : 'recovery';
  const generated = await employeeAdmin.auth.admin.generateLink({
    type: linkType,
    email: target.email,
    options: {
      redirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/employee-portal`,
    },
  });
  if (generated.error || !generated.data?.properties?.action_link) {
    throw new Error(generated.error?.message || 'A one-time account link could not be generated.');
  }

  return {
    authUserId: authUser.id,
    actionLink: generated.data.properties.action_link,
    isNew,
    projectUrl: getEmployeeProjectUrl(),
  };
};

const buildMessage = (target: EmployeeAccountTarget, action: EmployeeAccountAction, actionLink: string) => {
  const actionLabel = action === 'reset_password' ? 'reset your password' : 'set up your account';
  return [
    `Hello ${target.name},`,
    '',
    'Your RedPoint HRMS employee account is ready.',
    `Username: ${target.email}`,
    '',
    `Use this one-time link to ${actionLabel}:`,
    actionLink,
    '',
    'For your security, do not forward this link after using it.',
  ].join('\n');
};

const sendEmail = async (
  target: EmployeeAccountTarget,
  subject: string,
  message: string
): Promise<AccountDeliveryResult> => {
  const actionType = subject.toLowerCase().includes('reset')
    ? 'password_reset'
    : 'account_activation';
  const delivery = await sendEmailTemplate(actionType, target.email, {
    name: target.name,
    actionLink: message.match(/https?:\/\/\S+/)?.[0] || '',
  }, createEmployeeAdminClient());
  return {
    channel: 'email',
    provider: 'Gmail SMTP',
    status: delivery.ok ? 'sent' : 'failed',
    recipient: target.email,
    error: delivery.failureReason,
  };
};

const sendWhatsApp = async (
  target: EmployeeAccountTarget,
  message: string
): Promise<AccountDeliveryResult> => {
  const phone = normalizePhoneNumber(target.contactNumber);
  if (!phone) {
    return {
      channel: 'whatsapp',
      provider: 'Twilio WhatsApp',
      status: 'failed',
      error: 'Employee contact number must use E.164 format, for example +60123456789.',
    };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !from) {
    if (process.env.NODE_ENV === 'production') {
      return {
        channel: 'whatsapp',
        provider: 'Twilio WhatsApp',
        status: 'failed',
        recipient: phone,
        error: 'Twilio WhatsApp is not configured on the server.',
      };
    }
    return {
      channel: 'whatsapp',
      provider: 'wa.me fallback',
      status: 'handoff',
      recipient: phone,
      handoffUrl: `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(message)}`,
    };
  }

  const body = new URLSearchParams({
    To: `whatsapp:${phone}`,
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    Body: message,
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    return {
      channel: 'whatsapp',
      provider: 'Twilio WhatsApp',
      status: 'failed',
      recipient: phone,
      error: detail || `Twilio returned ${response.status}.`,
    };
  }
  return {
    channel: 'whatsapp',
    provider: 'Twilio WhatsApp',
    status: 'sent',
    recipient: phone,
  };
};

const deliver = async (
  target: EmployeeAccountTarget,
  action: EmployeeAccountAction,
  channel: AccountDeliveryChannel,
  actionLink: string
) => {
  const message = buildMessage(target, action, actionLink);
  const subject = action === 'reset_password'
    ? 'RedPoint HRMS password reset'
    : 'RedPoint HRMS account access';
  const channels: Array<Exclude<AccountDeliveryChannel, 'both'>> =
    channel === 'both' ? ['email', 'whatsapp'] : [channel];
  return Promise.all(channels.map((item) => (
    item === 'email'
      ? sendEmail(target, subject, message)
      : sendWhatsApp(target, message)
  )));
};

export const performEmployeeAccountAction = async (input: {
  target: EmployeeAccountTarget;
  actor: AdminSessionActor;
  action: EmployeeAccountAction;
  channel: AccountDeliveryChannel;
}): Promise<AccountActionResult> => {
  const existing = await loadEmployeeAccount(input.target.id, input.target.email);
  const generated = await createActionLink(input.target, input.action);
  const now = new Date().toISOString();
  const deliveries = await deliver(input.target, input.action, input.channel, generated.actionLink);
  const hasSuccess = deliveries.some((delivery) => (
    delivery.status === 'sent' || delivery.status === 'queued' || delivery.status === 'handoff'
  ));
  const nextStatus: EmployeeAccountStatus = input.action === 'reset_password'
    ? 'must_change_password'
    : hasSuccess ? 'invited' : 'error';
  const deliveryStatus = hasSuccess
    ? deliveries.some((delivery) => delivery.status === 'sent' || delivery.status === 'queued')
      ? 'sent'
      : 'handoff'
    : 'failed';
  const account = await upsertEmployeeAccount({
    employee_id: input.target.id,
    employee_email: normalize(input.target.email),
    username: normalize(input.target.email),
    auth_user_id: generated.authUserId,
    account_status: nextStatus,
    must_change_password: true,
    last_invited_at: input.action === 'provision' || input.action === 'share'
      ? now
      : existing.last_invited_at,
    last_password_reset_at: input.action === 'reset_password'
      ? now
      : existing.last_password_reset_at,
    last_delivery_channel: input.channel,
    last_delivery_status: deliveryStatus,
  });

  await Promise.all(deliveries.map((delivery) => writeAccountEvent({
    target: input.target,
    actor: input.actor,
    action: input.action,
    channel: input.channel,
    provider: delivery.provider,
    result: delivery.status,
  })));

  return {
    ok: hasSuccess,
    action: input.action,
    employeeId: input.target.id,
    account,
    deliveries,
    message: hasSuccess
      ? 'Account action completed without exposing a password.'
      : 'No delivery provider completed the account action.',
  };
};

export const toEmployeeAccountTarget = (body: any): EmployeeAccountTarget => {
  const id = String(body?.employeeId || '').trim();
  const email = String(body?.employeeEmail || '').trim().toLowerCase();
  const name = String(body?.employeeName || body?.name || email).trim();
  const contactNumber = body?.contactNumber ? String(body.contactNumber).trim() : undefined;
  if (!id || !email || !email.includes('@')) {
    throw Object.assign(new Error('employeeId and a valid employeeEmail are required.'), { statusCode: 400 });
  }
  return { id, email, name, contactNumber };
};

export const resolveEmployeeAccountTarget = async (
  requested: EmployeeAccountTarget
): Promise<EmployeeAccountTarget> => {
  const admin = createMainAdminClient();
  const { data: byId, error: idError } = await admin
    .from('employees')
    .select('id,email,name,contact_number')
    .eq('id', requested.id)
    .maybeSingle();
  if (idError) throw new Error(`Employee target lookup failed: ${idError.message}`);

  const row = byId || (await admin
    .from('employees')
    .select('id,email,name,contact_number')
    .ilike('email', requested.email)
    .maybeSingle()).data;
  if (!row) {
    throw Object.assign(new Error('The selected employee record could not be found.'), { statusCode: 404 });
  }

  return {
    id: String(row.id || requested.id),
    email: String(row.email || requested.email).trim().toLowerCase(),
    name: String(row.name || requested.name).trim(),
    contactNumber: row.contact_number ? String(row.contact_number).trim() : undefined,
  };
};

export const toChannel = (value: unknown): AccountDeliveryChannel => {
  const channel = String(value || 'email').trim().toLowerCase();
  if (channel === 'email' || channel === 'whatsapp' || channel === 'both') return channel;
  throw Object.assign(new Error('channel must be email, whatsapp, or both.'), { statusCode: 400 });
};

const getEmployeeAnonConfig = () => ({
  url: process.env.EMPLOYEE_SUPABASE_URL
    || process.env.VITE_EMPLOYEE_SUPABASE_URL
    || process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || '',
  anonKey: process.env.EMPLOYEE_SUPABASE_ANON_KEY
    || process.env.VITE_EMPLOYEE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || '',
});

const getBearerToken = (authorization: string | undefined) => {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw Object.assign(new Error('A Supabase employee session is required.'), { statusCode: 401 });
  }
  return match[1];
};

export const getEmployeeAuthUser = async (req: any) => {
  const config = getEmployeeAnonConfig();
  const authorization = req.headers?.authorization;
  if (authorization) {
    const token = getBearerToken(authorization);
    if (!config.url || !config.anonKey) {
      throw new Error('The employee Supabase public credentials are not configured.');
    }
    const authenticated = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await authenticated.auth.getUser(token);
    if (error || !data.user) {
      throw Object.assign(new Error('The employee session is not authenticated.'), { statusCode: 401 });
    }
    return { token, user: data.user };
  }
  const otpSession = getEmployeeOtpSession(req);
  if (!otpSession) {
    throw Object.assign(new Error('The employee session is not authenticated.'), { statusCode: 401 });
  }
  const employeeAdmin = createEmployeeAdminClient();
  const { data, error } = await employeeAdmin.auth.admin.getUserById(otpSession.authUserId);
  if (error || !data.user) {
    throw Object.assign(new Error('The employee session is not authenticated.'), { statusCode: 401 });
  }
  return { token: '', user: data.user };
};

export const loadEmployeeAuthProfile = async (req: any) => {
  const { user } = await getEmployeeAuthUser(req);
  const employeeAdmin = createEmployeeAdminClient();
  const { data: account, error } = await employeeAdmin
    .from('employee_accounts')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(`Employee account profile lookup failed: ${error.message}`);

  return {
    email: user.email || '',
    mustChangePassword: Boolean(
      account?.must_change_password ?? user.user_metadata?.must_change_password
    ),
    accountStatus: account?.account_status || 'active',
    employeeId: account?.employee_id || user.user_metadata?.employee_id || '',
  };
};

export const completeEmployeeAuthSetup = async (req: any) => {
  const { user } = await getEmployeeAuthUser(req);

  const employeeAdmin = createEmployeeAdminClient();
  const updatedUser = await employeeAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata || {}),
      must_change_password: false,
    },
  });
  if (updatedUser.error) {
    throw new Error(`Employee Auth profile could not be updated: ${updatedUser.error.message}`);
  }

  const employeeId = String(
    user.user_metadata?.employee_id
    || updatedUser.data.user?.user_metadata?.employee_id
    || ''
  ).trim();
  if (employeeId) {
    const { error } = await employeeAdmin
      .from('employee_accounts')
      .update({
        account_status: 'active',
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('employee_id', employeeId);
    if (error) throw new Error(`Employee account setup could not be saved: ${error.message}`);
  }

  return {
    email: user.email || '',
    mustChangePassword: false,
    employeeId,
  };
};

export const updateEmployeeAuthProfile = async (req: any) => {
  const { user } = await getEmployeeAuthUser(req);
  const employeeAdmin = createEmployeeAdminClient();
  const { data: account, error: accountError } = await employeeAdmin
    .from('employee_accounts')
    .select('must_change_password,employee_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (accountError) {
    throw new Error(`Employee account profile lookup failed: ${accountError.message}`);
  }

  return {
    email: user.email || '',
    mustChangePassword: Boolean(
      account?.must_change_password ?? user.user_metadata?.must_change_password
    ),
    employeeId: account?.employee_id || user.user_metadata?.employee_id || '',
  };
};
