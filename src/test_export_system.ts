import assert from 'node:assert/strict';
import { buildPayrollFileExportRow, csvEscape, matchesExportEntity, renderPayrollPdf, safeFilename, workbookBuffer } from '../api/_lib/exportService';
import { canExportSensitive, getExportPermissions, hasExportPermission } from './lib/exportPermissions';
import { PAYROLL_FILE_EXPORT_COLUMNS, PAYROLL_XLSX_TEMPLATE_COLUMNS } from './lib/exportTypes';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';

assert.equal(csvEscape('Tan, Mei "Ling"'), '"Tan, Mei ""Ling"""');
assert.equal(csvEscape('张伟'), '张伟');
assert.equal(safeFilename('Payroll Details / August 2026', 'xlsx'), 'Payroll_Details_August_2026.xlsx');
assert.equal(safeFilename('Employee_EMP0001_Profile.pdf', 'pdf'), 'Employee_EMP0001_Profile.pdf');
assert.equal(matchesExportEntity({ entity_id: 'ENT-92' }, 'ENT-92'), true);
assert.equal(matchesExportEntity({ entity_name: 'Red Point Sdn Bhd' }, 'Red Point Sdn Bhd'), true);
assert.equal(matchesExportEntity({ entity_name: 'Red Point Sdn Bhd' }, 'ENT-92', ['Red Point Sdn Bhd']), true);
assert.equal(matchesExportEntity({ entityId: 'ENT-86' }, 'ENT-92'), false);

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

assert.deepEqual(
  PAYROLL_XLSX_TEMPLATE_COLUMNS.map(column => column.key),
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
    'total_cost_pax',
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
assert.equal(payrollExportRow.total_cost_pax, 6340);

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
assert.equal(legacySchemaPayrollRow.actual_pcb_deducted, 100);
assert.equal(legacySchemaPayrollRow.total_deduction, 400);

const grossPayV2Row = buildPayrollFileExportRow(
  {
    employee_email: 'v2@example.com',
    payroll_month: 7,
    payroll_year: 2026,
    calculation_version: 'gross_pay_v2',
    basic_salary: 5000,
    allowance_general: 200,
    allowance_transport: 100,
    commission_amount: 300,
    unpaid_leave: 50,
    incomplete_month_deduction: 100,
    epf_employee: 550,
    socso_employee: 20,
    skbbk_employee: 5,
    eis_employee: 10,
    actual_pcb_deducted: 100,
    net_pay: 4670,
    epf_employer: 650,
    socso_employer: 70,
    eis_employer: 20,
  },
  { name: 'Gross Pay v2 Employee', employment_type: 'Permanent' },
  2,
);
assert.equal(grossPayV2Row.gross_pay, 5450);
assert.equal(grossPayV2Row.total_cost_pax, 6190);

const legacyStatutoryAliasRow = buildPayrollFileExportRow(
  {
    employee_email: 'legacy-alias@example.com',
    payroll_month: 8,
    payroll_year: 2026,
    basic_salary: 5000,
    gross_pay: 5000,
    epf_employee: 550,
    socso_employee: 20,
    lindung24_employee: 15,
    eis_employee: 10,
    actual_pcb_deducted: 0,
    tax_pcb: 100,
    net_pay: 4305,
    epf_employer: 650,
    socso_employer: 70,
    eis_employer: 20,
  },
  { name: 'Legacy Alias Employee', employment_type: 'Permanent' },
  3,
);
assert.equal(legacyStatutoryAliasRow.skbbk_employee, 15);
assert.equal(legacyStatutoryAliasRow.actual_pcb_deducted, 100);
assert.equal(legacyStatutoryAliasRow.total_deduction, 695);
assert.equal(legacyStatutoryAliasRow.net_pay, 4305);

const separatePayoutRow = buildPayrollFileExportRow(
  {
    employee_email: 'bonus@example.com',
    payroll_month: 7,
    payroll_year: 2026,
    payout_kind: 'bonus',
    is_separate_payout: true,
    gross_pay: 1000,
    net_pay: 1000,
    epf_employee: 0,
    socso_employee: 0,
    skbbk_employee: 0,
    eis_employee: 0,
    epf_employer: 100,
    socso_employer: 30,
    eis_employer: 10,
    payout_description: 'Performance bonus',
  },
  { name: 'Separate Payout Employee', employment_type: 'Permanent' },
  4,
);
assert.equal(separatePayoutRow.gross_pay, 1000);
assert.equal(separatePayoutRow.total_cost_pax, 1140);

const payrollBook = XLSX.read(
  workbookBuffer('Aug-26 Payroll Summary', [payrollExportRow, grossPayV2Row, separatePayoutRow], PAYROLL_XLSX_TEMPLATE_COLUMNS, 'payroll'),
  { type: 'buffer', cellNF: true, cellStyles: true },
);
const payrollSheet = payrollBook.Sheets['Aug-26 Payroll Summary'];
const payrollValues = XLSX.utils.sheet_to_json(payrollSheet, { header: 1, raw: true }) as any[][];
assert.equal(payrollValues[0][1], 'Company Name:');
assert.equal(payrollValues[1][2], 'Jul-26 Payroll Summary');
assert.equal(payrollValues[5][4], 'IC / Passport number');
assert.equal(payrollValues[5][5], 'Bank name');
assert.equal(payrollValues[5][6], 'Bank account number');
assert.equal(payrollValues[5][24], 'Total Cost / pax');
assert.equal(payrollValues[7][4], '900101-14-5555');
assert.equal(payrollValues[7][5], 'Maybank');
assert.equal(payrollValues[7][6], '001234567890');
assert.equal(payrollSheet['Y8'].f, 'M8+U8+V8+W8');
assert.equal(payrollSheet['Y8'].v, 6340);
assert.equal(payrollSheet['Y9'].f, 'M9+U9+V9+W9');
assert.equal(payrollSheet['Y9'].v, 6190);
assert.equal(payrollSheet['Y10'].f, 'M10+U10+V10+W10');
assert.equal(payrollSheet['Y10'].v, 1140);
assert.equal(payrollSheet['H8'].z, '[$RM]#,##0.00');
assert.equal(payrollSheet['Y8'].z, '[$RM]#,##0.00');
assert.equal(payrollSheet['Y12'].f, 'SUM(Y8:Y10)');
assert.equal(payrollSheet['T13'].f, 'SUM(T8:T10)');
assert.equal(payrollSheet['N14'].f, 'SUM(N8:N10)+SUM(U8:U10)');
assert.equal(payrollSheet['O15'].f, 'SUM(O8:O10)+SUM(V8:V10)');
assert.equal(payrollSheet['P16'].f, 'SUM(P8:P10)');
assert.equal(payrollSheet['Q17'].f, 'SUM(Q8:Q10)+SUM(W8:W10)');
assert.equal(payrollSheet['Y18'].f, 'SUM(Y8:Y10)');
assert.equal(payrollSheet['Y19'].f, 'N14+O15+P16+Q17');
assert.ok(payrollSheet['!merges']?.some(merge => (
  merge.s.r === 5 && merge.s.c === 7 && merge.e.r === 5 && merge.e.c === 9
)));

const restrictedBook = XLSX.read(
  workbookBuffer('Aug-26 Payroll Summary', [payrollExportRow], PAYROLL_XLSX_TEMPLATE_COLUMNS, 'payroll', false),
  { type: 'buffer', cellNF: true, cellStyles: true },
);
const restrictedSheet = restrictedBook.Sheets['Aug-26 Payroll Summary'];
assert.equal(restrictedSheet['E8']?.v, '');
assert.equal(restrictedSheet['H8']?.v, '');
assert.equal(restrictedSheet['Y8']?.v, '');
assert.equal(restrictedSheet['Y17']?.v ?? '', '');

const payrollPdfBytes = await renderPayrollPdf(
  'August 2026 Payroll Summary',
  [payrollExportRow, grossPayV2Row, separatePayoutRow],
);
const payrollPdf = await PDFDocument.load(payrollPdfBytes);
assert.equal(payrollPdf.getPageCount(), 7);
payrollPdf.getPages().forEach(page => {
  assert.equal(Math.round(page.getWidth() * 100) / 100, 595.28);
  assert.equal(Math.round(page.getHeight() * 100) / 100, 841.89);
});

const restrictedPayrollPdf = await PDFDocument.load(await renderPayrollPdf(
  'August 2026 Payroll Summary',
  [payrollExportRow],
  false,
));
assert.equal(restrictedPayrollPdf.getPageCount(), 7);

console.log('Export system tests passed.');
