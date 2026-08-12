import {
  authenticateAdmin,
  clearAdminSessionCookie,
  completeEmployeeAuthSetup,
  loadEmployeeAuthProfile,
  loadAccountEvents,
  loadAccountSummaries,
  performEmployeeAccountAction,
  requireAdminSession,
  requireMasterUser,
  resolveEmployeeAccountTarget,
  setAdminSessionCookie,
  toChannel,
  toEmployeeAccountTarget,
  updateAdminProfile,
  updateEmployeeAuthProfile,
} from './employeeAccountServer.js';

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

export async function handleAdminLogout(_req: any, res: any) {
  clearAdminSessionCookie(res);
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
    await requireMasterUser(req);
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
    await requireMasterUser(req);
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
    const actor = await requireMasterUser(req);
    const target = await resolveEmployeeAccountTarget(toEmployeeAccountTarget(req.body));
    const channel = toChannel(req.body?.channel);
    const result = await performEmployeeAccountAction({
      target,
      actor,
      action,
      channel,
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
    res.status(200).json(await completeEmployeeAuthSetup(req));
  } catch (error) {
    sendError(res, error);
  }
}
