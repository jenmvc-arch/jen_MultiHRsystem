import { handleAdminSession } from '../_lib/employeeAccountHandlers';
import { handleAdminProfile } from '../_lib/employeeAccountHandlers';

export default async function handleAdminSessionRoute(req: any, res: any) {
  if (req.method === 'POST') {
    return handleAdminProfile(req, res);
  }
  return handleAdminSession(req, res);
}
