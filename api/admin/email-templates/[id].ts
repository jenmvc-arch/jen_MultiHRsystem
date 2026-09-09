import { updateEmailTemplate } from '../../_lib/emailTemplateServer.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await updateEmailTemplate(req));
  } catch (error: any) {
    res.status(Number(error?.statusCode || 500)).json({
      error: error instanceof Error ? error.message : 'Email template update failed.',
    });
  }
}
