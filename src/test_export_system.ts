import assert from 'node:assert/strict';
import { buildPayrollFileExportRow, csvEscape, safeFilename, workbookBuffer } from '../api/_lib/exportService';
import { canExportSensitive, getExportPermissions, hasExportPermission } from './lib/exportPermissions';
import { PAYROLL_FILE_EXPORT_COLUMNS } from './lib/exportTypes';
import * as XLSX from 'xlsx';

assert.equal(csvEscape('Tan, Mei "Ling"'), '"Tan, Mei ""Ling"""');
assert.equal(csvEscape('张伟'), '张伟');
assert.equal(safeFilename('Payroll Details / August 2026', 'xlsx'), 'Payroll_Details_August_2026.xlsx');
assert.equal(safeFilename('Employee_EMP0001_Profile.pdf', 'pdf'), 'Employee_EMP0001_Profile.pdf');

assert.equal(hasExportPermission('Global Administrator', 'payroll.export'), true);
assert.equal(hasExportPermission('Leader', 'payroll.export'), false);
assert.equal(canExportSensitive('Payroll Tax Approver', 'payroll'), true);
assert.equal(canExportSensitive('Leader', 'performance'), false);
assert.deepEqual(getExportPermissions('Leader').modules.sort(), ['employees', 'performance', 'reports']);

assert.deepEqual(
  PAYROLL_FILE_EXPORT_COLUMNS.map(column => column.key),
  [
    'serial_no',
    'employee_name',
    'employment_type',
    'payment_mode',
    'nric_passport',
    'bank_name',
    'account_no',
    'basic_salary',
    'commission_amount',
    'allowances',
    'unpaid_leave',
    'incomplete_month_deduction',
    'gross_pay',
    'epf_employee',
    'socso_employee',
    'skbbk_employee',
    'eis_employee',
    'actual_pcb_deducted',
    'total_deduction',
    'net_pay',
    'epf_employer',
    'socso_employer',
    'eis_employer',
    'payment_description',
  ],
);

const payrollExportRow = buildPayrollFileExportRow(
  {
    employee_email: 'payroll@example.com',
    payroll_month: 7,
    payroll_year: 2026,
    basic_salary: 5000,
    allowance_general: 200,
    allowance_transport: 100,
    commission_amount: 300,
    unpaid_leave: 50,
    epf_employee: 550,
    socso_employee: 20,
    eis_employee: 10,
    actual_pcb_deducted: 100,
    net_pay: 4870,
    epf_employer: 650,
    socso_employer: 70,
    eis_employer: 20,
    payout_title: 'July Payroll',
    entity_id: 'Red Point',
  },
  {
    name: 'Payroll Employee',
    employment_type: 'Permanent',
    payment_mode: 'Bank Transfer',
    nric_passport: '900101-14-5555',
    bank_name: 'Maybank',
    account_no: '001234567890',
    skbbk_employee: 5,
  },
  1,
);
assert.equal(payrollExportRow.nric_passport, '900101-14-5555');
assert.equal(payrollExportRow.bank_name, 'Maybank');
assert.equal(payrollExportRow.account_no, '001234567890');
assert.equal(payrollExportRow.allowances, 300);
assert.equal(payrollExportRow.payment_description, 'July Payroll');

const legacySchemaPayrollRow = buildPayrollFileExportRow(
  {
    employee_email: 'payroll@example.com',
    payroll_month: 8,
    payroll_year: 2026,
    status: 'Processed',
    basic_salary: 5000,
    total_allowance: 300,
    gross_salary: 5180,
    epf_employee: 570,
    socso_employee: 20,
    eis_employee: 10,
    tax_pcb: 100,
    net_salary: 4780,
  },
  { name: 'Payroll Employee', employment_type: 'Permanent' },
  1,
);
assert.equal(legacySchemaPayrollRow.allowances, 300);
assert.equal(legacySchemaPayrollRow.gross_pay, 5180);
assert.equal(legacySchemaPayrollRow.net_pay, 4780);
assert.equal(legacySchemaPayrollRow.total_deduction, 400);

const payrollBook = XLSX.read(
  workbookBuffer('Jul 2026', [payrollExportRow], PAYROLL_FILE_EXPORT_COLUMNS, 'payroll'),
  { type: 'buffer' },
);
const payrollSheet = payrollBook.Sheets['Jul 2026'];
const payrollValues = XLSX.utils.sheet_to_json(payrollSheet, { header: 1, raw: true }) as any[][];
assert.equal(payrollValues[0][1], 'Company Name:');
assert.equal(payrollValues[5][4], 'IC/Passport number');
assert.equal(payrollValues[5][5], 'Bank Name');
assert.equal(payrollValues[5][6], 'Bank Account Number');
assert.equal(payrollValues[7][4], '900101-14-5555');
assert.equal(payrollValues[7][5], 'Maybank');
assert.equal(payrollValues[7][6], '001234567890');

console.log('Export system tests passed.');
