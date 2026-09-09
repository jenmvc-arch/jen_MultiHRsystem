import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { renderOfficialPayslipPdf } from '../api/_lib/officialPayslipPdf';

const employee = {
  id: 'EMP-TEST',
  entity_id: 'Red Point Sdn Bhd',
  name: 'LAW MEI JERN',
  email: 'mei.jern@example.com',
  designation: 'HR Specialist',
  department: 'Human Resources',
  status: 'Active',
  employment_type: 'Permanent',
  bank_name: 'MAYBANK BERHAD',
  account_no: '114405161215',
  basic_salary: 6500,
  housing_allowance: 0,
  transport_allowance: 0,
  overtime: 0,
  performance_bonus: 0,
  epf_rate_employee: 11,
  epf_rate_employer: 13,
  nric_passport: '970616-14-5396',
  nationality: 'Malaysian',
  tax_number: 'IG2563454545',
  epf_number: '20651988',
  marital_status: 'Single',
  eligible_for_statutory: 'Yes',
  date_of_joined: '2026-07-01',
  opt_in_epf: true,
  opt_in_socso: true,
  opt_in_eis: true,
  opt_in_pcb: true,
  emergency_contact_name: '',
  emergency_contact_relation: '',
  emergency_contact_phone: '',
};

const payroll = {
  id: 'EMP-TEST_8_2026',
  employee_email: employee.email,
  payroll_month: 8,
  payroll_year: 2026,
  basic_salary: 6500,
  allowance_general: 0,
  allowance_transport: 0,
  allowance_parking: 0,
  allowance_meal: 0,
  allowance_accommodation: 0,
  allowance_phone: 0,
  overtime: 0,
  bonus_amount: 0,
  commission_amount: 0,
  back_pay_amount: 0,
  aws_amount: 0,
  compensation_amount: 0,
  reimbursement_amount: 0,
  unpaid_leave: 0,
  incomplete_month_deduction: 0,
  deduction_in_lieu: 0,
  deduction_cp38: 0,
  deduction_others: 0,
  epf_employee: 715,
  epf_employer: 845,
  socso_employee: 29.75,
  socso_employer: 104.15,
  lindung24_employee: 44.65,
  eis_employee: 11.9,
  eis_employer: 11.9,
  actual_pcb_deducted: 262.5,
  gross_pay: 6500,
  net_pay: 5436.2,
  payment_date: '2026-08-28',
  status: 'Processed',
  calculation_version: 'gross_pay_v2',
  display_settings_snapshot: {
    showTin: true,
    showEpfNumber: true,
    showNricPassport: true,
    showDateJoined: true,
    showEmail: true,
    showDepartment: true,
    showDesignation: true,
    showBankAccount: true,
    showCompanyAddress: true,
    showEarningsDetails: true,
    showDeductionDetails: true,
    showEmployerContributions: true,
    showNotesFooter: true,
  },
  created_at: '2026-08-28T00:00:00.000Z',
};

const entity = {
  id: 'Red Point Sdn Bhd',
  name: 'Red Point Sdn Bhd',
  registration_number: '202301040351',
  address: 'NO. 181, 1st Floor, Hui Sing Garden Commercial Centre, Taman Hui Sing, 93350, Kuching, Sarawak',
  currency: 'RM',
  is_active: true,
};

const bytes = await renderOfficialPayslipPdf(payroll, employee, entity);
const document = await PDFDocument.load(bytes);
const [page] = document.getPages();

assert.equal(document.getPageCount(), 1);
assert.equal(Math.round(page.getWidth() * 100) / 100, 595.28);
assert.equal(Math.round(page.getHeight() * 100) / 100, 841.89);
assert.ok(bytes.length > 100_000);

console.log('Official payslip PDF test passed.');
