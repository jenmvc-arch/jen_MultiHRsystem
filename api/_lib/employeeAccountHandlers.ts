import {
  authenticateAdmin,
  clearAdminSessionCookie,
  clearEmployeeOtpSessionCookie,
  completeEmployeeAuthSetup,
  loadEmployeeAuthProfile,
  loadAccountEvents,
  loadAccountSummaries,
  performEmployeeAccountAction,
  requestEmployeeOtp,
  requireAdminSession,
  requireMasterUser,
  requirePermission,
  requirePortalHost,
  resolveEmployeeAccountTarget,
  createEmployeeAdminClient,
  createMainAdminClient,
  setAdminSessionCookie,
  toChannel,
  toEmployeeAccountTarget,
  updateAdminProfile,
  updateEmployeeAuthProfile,
  verifyEmployeeOtp,
} from './employeeAccountServer.js';
import { sendEmailTemplate } from './email/emailService.js';
import { authenticateAgainstGoogleSheets } from './googleSheetsServer.js';
import { isAdminPortalRole } from '../../src/lib/userRoles.js';

const sendError = (res: any, error: any) => {
  const message = error instanceof Error ? error.message : 'Request failed.';
  const migrationMissing = /employee_accounts|employee_account_events|schema cache/i.test(message);
  const status = Number(error?.statusCode || (migrationMissing ? 503 : 500));
  res.status(status).json({ error: message });
};

export async function handleAdminLogin(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    requirePortalHost(req, 'employer');
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required.' });
      return;
    }
    const actor = await authenticateAdmin(username, password);
    if (!actor) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    setAdminSessionCookie(res, actor);
    res.status(200).json({
      user: {
        email: actor.username,
        name: actor.name,
        role: actor.role,
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleGoogleSheetsLogin(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    requirePortalHost(req, 'employer');
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required.' });
      return;
    }
    const user = await authenticateAgainstGoogleSheets(username, password);
    if (!user || !isAdminPortalRole(String(user.role || ''))) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    setAdminSessionCookie(res, {
      username: String(user.email || username),
      name: String(user.name || ''),
      role: String(user.role || ''),
    });
    res.status(200).json({
      user: {
        email: String(user.email || username),
        name: String(user.name || ''),
        role: String(user.role || ''),
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleAdminLogout(req: any, res: any) {
  try {
    requirePortalHost(req, 'employer');
  } catch (error) {
    sendError(res, error);
    return;
  }
  clearAdminSessionCookie(res);
  clearEmployeeOtpSessionCookie(res);
  res.status(200).json({ ok: true });
}

export async function handleAdminSession(req: any, res: any) {
  try {
    const actor = await requireAdminSession(req);
    res.status(200).json({ user: actor });
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleAdminProfile(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await updateAdminProfile(req, res));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeeAccountList(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    await requirePermission(req, 'employee.account.manage');
    const rawIds = String(req.query?.employeeIds || '');
    const employeeIds = rawIds.split(',').map((id) => id.trim()).filter(Boolean);
    res.status(200).json({ accounts: await loadAccountSummaries(employeeIds) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeeAccountEvents(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    await requirePermission(req, 'employee.account.manage');
    const employeeId = String(req.query?.employeeId || '').trim();
    if (!employeeId) {
      res.status(400).json({ error: 'employeeId is required.' });
      return;
    }
    res.status(200).json({ events: await loadAccountEvents(employeeId) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeeAccountAction(
  req: any,
  res: any,
  action: 'provision' | 'share' | 'reset_password'
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    const actor = await requirePermission(req, 'employee.account.manage');
    const target = await resolveEmployeeAccountTarget(toEmployeeAccountTarget(req.body));
    const channel = toChannel(req.body?.channel);
    const result = await performEmployeeAccountAction({
      target,
      actor,
      action,
      channel,
      idempotencyKey: String(
        req.headers?.['x-idempotency-key'] || req.body?.idempotencyKey || ''
      ).trim(),
    });
    res.status(result.ok ? 200 : 502).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeeAuthProfile(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    requirePortalHost(req, 'employee');
    res.status(200).json(
      req.method === 'POST'
        ? await updateEmployeeAuthProfile(req)
        : await loadEmployeeAuthProfile(req)
    );
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeeAuthSetup(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    requirePortalHost(req, 'employee');
    res.status(200).json(await completeEmployeeAuthSetup(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeeOtpRequest(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    requirePortalHost(req, 'employee');
    const result = await requestEmployeeOtp({
      email: String(req.body?.email || ''),
      purpose: req.body?.purpose,
      name: req.body?.name,
      ipAddress: String(
        req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || ''
      ).split(',')[0].trim(),
      deviceHash: String(req.headers?.['user-agent'] || '').slice(0, 256),
    });
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export const handleEmployeeOtpResend = handleEmployeeOtpRequest;

export async function handleEmployeeOtpVerify(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    requirePortalHost(req, 'employee');
    res.status(200).json(await verifyEmployeeOtp({
      email: String(req.body?.email || ''),
      otp: String(req.body?.otp || ''),
      purpose: req.body?.purpose,
      res,
    }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleAdminEmailTest(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    const actor = await requireMasterUser(req);
    const recipient = String(req.body?.recipient || '').trim().toLowerCase();
    if (!recipient || !recipient.includes('@')) {
      res.status(400).json({ error: 'A valid recipient email is required.' });
      return;
    }
    const result = await sendEmailTemplate('test_email', recipient, {
      requestedBy: actor.username,
    }, createEmployeeAdminClient(), undefined, undefined, createMainAdminClient());
    res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      recipient: result.recipient,
      status: result.status,
      message: result.ok ? 'Test email sent successfully.' : 'Test email could not be sent.',
    });
  } catch (error) {
    sendError(res, error);
  }
}

const notificationType = (value: unknown) => {
  const type = String(value || '').trim();
  if (type === 'leave_decision' || type === 'claim_decision' || type === 'payslip_notification') return type;
  throw Object.assign(new Error('Unsupported email notification type.'), { statusCode: 400 });
};

export async function handleBusinessEmailNotification(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    await requireAdminSession(req);
    const recipient = String(req.body?.recipient || '').trim().toLowerCase();
    if (!recipient.includes('@')) {
      res.status(400).json({ error: 'A valid recipient email is required.' });
      return;
    }
    const type = notificationType(req.body?.type);
    const result = await sendEmailTemplate(type, recipient, {
      name: req.body?.name,
      status: req.body?.status,
      details: req.body?.details,
      entity_name: req.body?.entityName,
    }, createEmployeeAdminClient(), undefined, { entityId: req.body?.entityId }, createMainAdminClient());
    res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      message: result.ok ? 'Notification email sent successfully.' : 'Notification email could not be sent.',
    });
  } catch (error) {
    sendError(res, error);
  }
}
