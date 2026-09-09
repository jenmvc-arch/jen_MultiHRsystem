import {
  createEmailTemplate,
  loadEmailTemplates,
} from '../../_lib/emailTemplateServer.js';

export default async function handler(req: any, res: any) {
  try {
    const result = req.method === 'GET'
      ? await loadEmailTemplates(req)
      : req.method === 'POST'
        ? await createEmailTemplate(req)
        : null;
    if (result === null) {
      res.setHeader('Allow', 'GET, POST');
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }
    res.status(200).json(result);
  } catch (error: any) {
    res.status(Number(error?.statusCode || 500)).json({
      error: error instanceof Error ? error.message : 'Email template request failed.',
    });
  }
}
