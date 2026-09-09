import { handleEmployeePortalLeaveWorkspace } from '../_lib/employeeServiceHandlers';

export default async function handler(req: any, res: any) {
  return handleEmployeePortalLeaveWorkspace(req, res);
}
