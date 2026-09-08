import {
  buildPayrollFileExportRow,
  renderPayrollPdf,
  safeFilename,
} from './_lib/exportService.js';
import {
  canExportSensitive,
  hasExportPermission,
} from '../src/lib/exportPermissions.js';
import {
  createMainAdminClient,
  requireAdminSession,
} from './_lib/employeeAccountServer.js';

const sendError = (res: any, error: any) => {
  const message = error instanceof Error ? error.message : 'PDF generation failed.';
  res.status(Number(error?.statusCode || 500)).json({ error: message });
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const actor = await requireAdminSession(req);
    if (!hasExportPermission(actor.role, 'payroll.export')) {
      res.status(403).json({ error: 'You do not have permission to export payroll.' });
      return;
    }

    const employeeId = String(req.query?.employeeId || '').trim();
    const recordId = String(req.query?.recordId || '').trim();
    if (!employeeId && !recordId) {
      res.status(400).json({ error: 'employeeId or recordId is required.' });
      return;
    }

    const client = createMainAdminClient();
    const employeeQuery = client
      .from('employees')
      .select('id,name,email,entity_id,entity_name,employment_type,payment_mode,payment_method,nric_passport,bank_name,account_no,skbbk_employee,lindung24_employee')
      .eq('id', employeeId)
      .maybeSingle();
    const { data: employee, error: employeeError } = employeeId
      ? await employeeQuery
      : { data: null, error: null };
    if (employeeError) throw new Error(`Employee lookup failed: ${employeeError.message}`);
    if (employeeId && !employee) {
      res.status(404).json({ error: 'Employee was not found.' });
      return;
    }

    let payrollQuery = client
      .from('payroll_records_2026')
      .select([
        'id',
        'employee_email',
        'payroll_month',
        'payroll_year',
        'basic_salary',
        'allowance_general',
        'allowance_transport',
        'allowance_parking',
        'allowance_meal',
        'allowance_accommodation',
        'allowance_phone',
        'overtime',
        'bonus_amount',
        'commission_amount',
        'back_pay_amount',
        'aws_amount',
        'compensation_amount',
        'reimbursement_amount',
        'unpaid_leave',
        'incomplete_month_deduction',
        'gross_pay',
        'gross_salary',
        'epf_employee',
        'epf_employer',
        'socso_employee',
        'socso_employer',
        'lindung24_employee',
        'skbbk_employee',
        'eis_employee',
        'eis_employer',
        'actual_pcb_deducted',
        'tax_pcb',
        'deduction_in_lieu',
        'deduction_cp38',
        'deduction_others',
        'net_pay',
        'net_salary',
        'payout_kind',
        'payout_title',
        'payout_description',
        'document_type',
        'compensation_label',
        'status',
        'payment_date',
        'created_at',
        'updated_at',
      ].join(','));
    if (recordId) payrollQuery = payrollQuery.eq('id', recordId);
    if (employee?.email) payrollQuery = payrollQuery.ilike('employee_email', employee.email);
    const { data: record, error: recordError } = await payrollQuery
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recordError) throw new Error(`Payroll record lookup failed: ${recordError.message}`);
    if (!record) {
      res.status(404).json({ error: 'Processed payroll record was not found.' });
      return;
    }

    const payrollRow = record as any;
    if (employee && String(payrollRow.employee_email || '').toLowerCase() !== String(employee.email || '').toLowerCase()) {
      res.status(403).json({ error: 'The payroll record does not belong to the selected employee.' });
      return;
    }
    const employeeRow = employee as any;
    const row = buildPayrollFileExportRow(payrollRow, employeeRow || undefined, 1);
    const title = `${payrollRow.payroll_year || new Date().getFullYear()} Payroll Payslip`;
    const buffer = await renderPayrollPdf(
      title,
      [row],
      canExportSensitive(actor.role, 'payroll'),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(`Payslip_${payrollRow.employee_email}`, 'pdf')}"`);
    res.status(200).send(buffer);
  } catch (error) {
    sendError(res, error);
  }
}
