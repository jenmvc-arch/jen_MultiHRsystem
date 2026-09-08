import {
  loadAdminLeaveWorkspace,
  persistAdminLeaveWorkspace,
} from '../_lib/adminLeaveServer.js';

export default async function handler(req: any, res: any) {
  try {
    const result = req.method === 'GET'
      ? await loadAdminLeaveWorkspace(req)
      : req.method === 'POST'
        ? await persistAdminLeaveWorkspace(req)
        : null;
    if (result === null) {
      res.setHeader('Allow', 'GET, POST');
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }
    res.status(200).json(result);
  } catch (error: any) {
    res.status(Number(error?.statusCode || 500)).json({
      error: error instanceof Error ? error.message : 'Admin leave workspace request failed.',
    });
  }
}
