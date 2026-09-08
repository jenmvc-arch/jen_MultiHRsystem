import { sendPayrollPayslipEmails } from '../../_lib/payrollWorkflowServer.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await sendPayrollPayslipEmails(req));
  } catch (error: any) {
    res.status(Number(error?.statusCode || 500)).json({
      error: error instanceof Error ? error.message : 'Payslip email failed.',
    });
  }
}
