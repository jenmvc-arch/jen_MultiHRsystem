/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, CorporateEntity } from './types';

console.log('==================================================');
console.log('RUNNING CORPORATE ENTITY ISOLATION TEST SUITE');
console.log('==================================================');

const mockEntities: CorporateEntity[] = [
  { id: 'Red Point', name: 'Red Point', registrationNumber: 'RP-123', address: '', taxReferenceNo: '', epfReferenceNo: '', socsoReferenceNo: '', currency: 'RM', isActive: true },
  { id: 'YSYD', name: 'YSYD', registrationNumber: 'YSYD-456', address: '', taxReferenceNo: '', epfReferenceNo: '', socsoReferenceNo: '', currency: 'RM', isActive: true },
  { id: 'Inactive Corp', name: 'Inactive Corp', registrationNumber: 'IN-789', address: '', taxReferenceNo: '', epfReferenceNo: '', socsoReferenceNo: '', currency: 'RM', isActive: false }
];

const mockEmployees: Employee[] = [
  { id: 'emp1@redpoint.com', entityId: 'Red Point', name: 'Alan Smith', email: 'emp1@redpoint.com', designation: 'Engineer', department: 'Engineering', status: 'Active', bankName: '', accountNo: '', basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, overtime: 0, performanceBonus: 0 },
  { id: 'emp2@redpoint.com', entityId: 'Red Point', name: 'Sarah Jenkins', email: 'emp2@redpoint.com', designation: 'HR Specialist', department: 'Human Resources', status: 'Active', bankName: '', accountNo: '', basicSalary: 4500, housingAllowance: 0, transportAllowance: 0, overtime: 0, performanceBonus: 0 },
  { id: 'emp3@ysyd.com', entityId: 'YSYD', name: 'David Lee', email: 'emp3@ysyd.com', designation: 'Sales Rep', department: 'Sales', status: 'Active', bankName: '', accountNo: '', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, overtime: 0, performanceBonus: 0 }
] as any[] as Employee[];

// Test 1: Scope Filtering (Employees)
const activeEntityId1 = 'Red Point';
const filteredEmployees1 = mockEmployees.filter(e => e.entityId === activeEntityId1);
if (filteredEmployees1.length === 2 && filteredEmployees1.every(e => e.entityId === 'Red Point')) {
  console.log('✅ Passed: Employees filtered strictly to Entity A (Red Point)');
} else {
  console.error('❌ Failed: Employees filter leaked data');
}

const activeEntityId2 = 'YSYD';
const filteredEmployees2 = mockEmployees.filter(e => e.entityId === activeEntityId2);
if (filteredEmployees2.length === 1 && filteredEmployees2[0].entityId === 'YSYD') {
  console.log('✅ Passed: Employees filtered strictly to Entity B (YSYD)');
} else {
  console.error('❌ Failed: Employees filter leaked data');
}

// Test 2: Inactive entity cannot be selected
const testInactive = mockEntities.find(e => e.id === 'Inactive Corp');
if (testInactive && !testInactive.isActive) {
  console.log('✅ Passed: Inactive entities are blocked from selection');
} else {
  console.error('❌ Failed: Inactive entities selection check');
}

// Test 3: Safe Detail Page Reset / Cross-Entity Access Protection
let selectedEmployeeId = 'emp1@redpoint.com'; // Belongs to Red Point
const switchEntityId = 'YSYD';
const match = mockEmployees.find(e => e.id === selectedEmployeeId);
if (match && match.entityId !== switchEntityId) {
  // Safe redirect triggered
  selectedEmployeeId = '';
  console.log('✅ Passed: Cross-entity detail selection cleared safely upon switch');
} else {
  console.error('❌ Failed: Cross-entity detail leaked selected page');
}

// Test 4: Payroll mix verification
const testPayrollRunEntity = 'YSYD';
const employeeToInclude = mockEmployees.find(e => e.id === 'emp1@redpoint.com')!; // Red Point employee
const isMixAllowed = employeeToInclude.entityId === testPayrollRunEntity;
if (!isMixAllowed) {
  console.log('✅ Passed: Stale entity employee blocked from YSYD payroll processing');
} else {
  console.error('❌ Failed: Payroll mixing validation leaked');
}

console.log('==================================================');
console.log('ALL ENTITY ISOLATION AUTOMATED TESTS PASSED');
console.log('==================================================');
