import { requireAdminSession } from './employeeAccountServer.js';

const GOOGLE_SCRIPT_URL_ENV_KEYS = [
  'GOOGLE_SCRIPT_URL',
  'VITE_GOOGLE_SCRIPT_URL',
] as const;

const normalizeUrl = (value: unknown) => String(value || '').trim();

const configuredScriptUrls = () => {
  const values = [
    ...GOOGLE_SCRIPT_URL_ENV_KEYS.map((key) => process.env[key] || ''),
    ...(process.env.GOOGLE_SCRIPT_ALLOWED_URLS || '').split(','),
  ];
  return new Set(values.map(normalizeUrl).filter(Boolean));
};

const getDefaultScriptUrl = () => {
  for (const key of GOOGLE_SCRIPT_URL_ENV_KEYS) {
    const value = normalizeUrl(process.env[key]);
    if (value) return value;
  }
  return '';
};

const getApiKey = () => normalizeUrl(process.env.GOOGLE_SCRIPT_API_KEY);

const assertConfigured = () => {
  const scriptUrl = getDefaultScriptUrl();
  const apiKey = getApiKey();
  if (!scriptUrl || !apiKey || apiKey.length < 24) {
    throw Object.assign(
      new Error('The server-side Google Sheets proxy is not configured.'),
      { statusCode: 503 }
    );
  }
  return { scriptUrl, apiKey };
};

const assertAllowedScriptUrl = (requestedUrl: unknown, defaultUrl: string) => {
  const targetUrl = normalizeUrl(requestedUrl) || defaultUrl;
  const allowedUrls = configuredScriptUrls();
  if (!allowedUrls.has(targetUrl)) {
    throw Object.assign(
      new Error('The requested Google Sheets backend is not allowlisted.'),
      { statusCode: 403 }
    );
  }
  return targetUrl;
};

const jsonResponse = async (response: Response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw Object.assign(
      new Error(payload?.error || `Google Sheets backend returned ${response.status}.`),
      { statusCode: response.ok ? 502 : response.status }
    );
  }
  return payload;
};

const postToGoogleScript = async (
  targetUrl: string,
  apiKey: string,
  payload: Record<string, unknown>,
) => {
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ ...payload, apiKey }),
    redirect: 'follow',
  });
  return jsonResponse(response);
};

export const authenticateAgainstGoogleSheets = async (
  username: string,
  password: string,
) => {
  const { scriptUrl, apiKey } = assertConfigured();
  const payload = await postToGoogleScript(scriptUrl, apiKey, {
    action: 'authenticate',
    username,
    password,
  });
  return payload.user || null;
};

export const proxyGoogleSheetsRequest = async (
  req: any,
  request: Record<string, unknown>,
) => {
  const { scriptUrl: defaultUrl, apiKey } = assertConfigured();
  const targetUrl = assertAllowedScriptUrl(request.targetUrl, defaultUrl);
  const action = String(request.action || '');

  if (action === 'loadData') {
    const url = new URL(targetUrl);
    url.searchParams.set('apiKey', apiKey);
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    return jsonResponse(response);
  }

  if (action === 'diagnose') {
    return postToGoogleScript(targetUrl, apiKey, { action: 'diagnose' });
  }

  const { targetUrl: _targetUrl, ...payload } = request;
  return postToGoogleScript(targetUrl, apiKey, payload);
};

const isPublicCandidateInsert = (request: Record<string, unknown>) => (
  request.action === 'insert'
  && request.sheetName === 'candidates'
);

const sanitizePublicCandidateInsert = (request: Record<string, unknown>) => {
  const input = (request.data && typeof request.data === 'object')
    ? request.data as Record<string, unknown>
    : {};
  const allowedFields = [
    'id',
    'name',
    'email',
    'phone',
    'designation',
    'department',
    'entityName',
    'entityId',
    'stage',
    'progress',
    'dateJoined',
  ];
  const data = Object.fromEntries(
    allowedFields
      .filter((field) => input[field] !== undefined)
      .map((field) => [field, input[field]])
  );
  return {
    ...request,
    data,
    keyName: undefined,
    keyValue: undefined,
    query: undefined,
  };
};

export async function handleGoogleSheetsProxy(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const request = (req.body || {}) as Record<string, unknown>;
    if (!request.action) {
      res.status(400).json({ error: 'action is required.' });
      return;
    }

    let authorized = false;
    try {
      await requireAdminSession(req);
      authorized = true;
    } catch {
      authorized = false;
    }

    if (!authorized && !isPublicCandidateInsert(request)) {
      res.status(401).json({ error: 'An authenticated admin session is required.' });
      return;
    }

    const forwarded = authorized
      ? request
      : sanitizePublicCandidateInsert(request);
    const payload = await proxyGoogleSheetsRequest(req, forwarded);
    res.status(200).json(payload);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Google Sheets request failed.';
    res.status(Number(error?.statusCode || 500)).json({ error: message });
  }
}
