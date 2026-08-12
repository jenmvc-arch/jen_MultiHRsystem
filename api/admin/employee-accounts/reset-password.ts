import { handleEmployeeAccountAction } from '../../_lib/employeeAccountHandlers';

export default (req: any, res: any) => handleEmployeeAccountAction(req, res, 'reset_password');
