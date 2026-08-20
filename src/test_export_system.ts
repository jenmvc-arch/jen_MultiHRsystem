import assert from 'node:assert/strict';
import { csvEscape, safeFilename } from '../api/_lib/exportService';
import { canExportSensitive, getExportPermissions, hasExportPermission } from './lib/exportPermissions';

assert.equal(csvEscape('Tan, Mei "Ling"'), '"Tan, Mei ""Ling"""');
assert.equal(csvEscape('张伟'), '张伟');
assert.equal(safeFilename('Payroll Details / August 2026', 'xlsx'), 'Payroll_Details_August_2026.xlsx');
assert.equal(safeFilename('Employee_EMP0001_Profile.pdf', 'pdf'), 'Employee_EMP0001_Profile.pdf');

assert.equal(hasExportPermission('Global Administrator', 'payroll.export'), true);
assert.equal(hasExportPermission('Leader', 'payroll.export'), false);
assert.equal(canExportSensitive('Payroll Tax Approver', 'payroll'), true);
assert.equal(canExportSensitive('Leader', 'performance'), false);
assert.deepEqual(getExportPermissions('Leader').modules.sort(), ['employees', 'performance', 'reports']);

console.log('Export system tests passed.');
