import { loadAdminData } from '../_lib/adminDataServer.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await loadAdminData(req));
  } catch (error: any) {
    res.status(Number(error?.statusCode || 500)).json({
      error: error instanceof Error ? error.message : 'Admin data could not be loaded.',
    });
  }
}
