import { createClient } from '@supabase/supabase-js';
import { HandbookTemplateAccessResponse } from '../../src/onboarding-portal/signing/types.js';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function getBearerToken(authorization: string | undefined): string {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('A Supabase Auth bearer token is required.');
  return match[1];
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    res.status(500).json({ error: 'Handbook template access is not configured.' });
    return;
  }

  try {
    const token = getBearerToken(req.headers.authorization);
    const sessionId = String(req.query?.sessionId || '').trim();
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required.' });
      return;
    }

    const authenticated = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: userError,
    } = await authenticated.auth.getUser(token);
    if (userError || !user) {
      res.status(401).json({ error: 'The handbook session is not authenticated.' });
      return;
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: session, error: sessionError } = await admin
      .from('onboarding_signing_sessions')
      .select('template_id, signer_user_id')
      .eq('id', sessionId)
      .single();
    if (sessionError || !session) {
      res.status(404).json({ error: 'Signing session was not found.' });
      return;
    }
    if (session.signer_user_id !== user.id) {
      res.status(403).json({ error: 'This handbook session belongs to another user.' });
      return;
    }

    const { data: template, error: templateError } = await admin
      .from('handbook_templates')
      .select('version, storage_path, page_count, sha256')
      .eq('id', session.template_id)
      .single();
    if (templateError || !template) {
      res.status(404).json({ error: 'The handbook template is unavailable.' });
      return;
    }

    const { data: signedUrl, error: signedUrlError } = await admin.storage
      .from('handbook-templates')
      .createSignedUrl(template.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signedUrlError || !signedUrl?.signedUrl) {
      throw new Error('The official handbook PDF could not be opened.');
    }

    const response: HandbookTemplateAccessResponse = {
      downloadUrl: signedUrl.signedUrl,
      version: template.version,
      pageCount: template.page_count,
      sha256: template.sha256,
      expiresIn: SIGNED_URL_TTL_SECONDS,
    };
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Handbook access failed.';
    res.status(message.includes('bearer token') ? 401 : 500).json({ error: message });
  }
}
