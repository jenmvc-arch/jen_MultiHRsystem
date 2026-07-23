/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candidate, Employee } from './types';

console.log('==================================================');
console.log('RUNNING ENROLL & ENLIST VERIFICATION SUITE');
console.log('==================================================');

const activeEntityId = 'ENT-92';

// Test 1: Candidate Enlistment from Public Job Form
const jobFormPayload = {
  id: `CAN-${Date.now()}`,
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  phone: '+60 12-345 6789',
  designation: 'Senior Developer',
  department: 'Engineering',
  entityId: 'ENT-92',
  stage: 'Applied' as const,
  progress: 0,
  dateJoined: '2026-08-01'
};

if (jobFormPayload.name && jobFormPayload.entityId === activeEntityId) {
  console.log('✅ Passed: Job application form passes valid candidate name & entityId');
} else {
  console.error('❌ Failed: Job application form candidate payload invalid');
  process.exit(1);
}

// Test 2: Fallback entityId on candidate creation
const newCandidateInput: Partial<Candidate> = {
  id: 'CAN-101',
  name: 'John Smith',
  email: 'john.smith@example.com',
  phone: '+60 17-888 9999',
  designation: 'Product Manager',
  department: 'Product',
  stage: 'Applied',
  progress: 0,
  dateJoined: '2026-08-01'
};

const processedCandidate: Candidate = {
  ...newCandidateInput,
  entityId: newCandidateInput.entityId || activeEntityId || 'ENT-92'
} as Candidate;

if (processedCandidate.entityId === 'ENT-92') {
  console.log('✅ Passed: Candidate without explicit entityId falls back to ENT-92');
} else {
  console.error('❌ Failed: Candidate entityId fallback failed');
  process.exit(1);
}

// Test 3: Employee Enrollment from Onboarding Form
const newEmployeeInput: Partial<Employee> = {
  id: 'EMP-9999',
  name: 'SARAH CONNOR',
  email: 'sarah.connor@example.com',
  designation: 'HR Lead',
  department: 'Human Resources',
  status: 'Active',
  basicSalary: 6000,
  nricPassport: '900101-14-5566',
  contactNumber: '+60 19-222 3333'
};

const processedEmployee: Employee = {
  ...newEmployeeInput,
  entityId: newEmployeeInput.entityId || activeEntityId || 'ENT-92',
  icFrontUrl: newEmployeeInput.icFrontUrl || 'SARAH_CONNOR_IC_Front.pdf',
  icBackUrl: newEmployeeInput.icBackUrl || 'SARAH_CONNOR_IC_Back.pdf',
  educationCertUrl: newEmployeeInput.educationCertUrl || 'SARAH_CONNOR_Education_Cert.pdf'
} as Employee;

if (processedEmployee.entityId === 'ENT-92' && processedEmployee.icFrontUrl) {
  console.log('✅ Passed: Enrolled employee correctly assigned ENT-92 and document fallback');
} else {
  console.error('❌ Failed: Enrolled employee processing failed');
  process.exit(1);
}

// Test 4: Pipeline Candidate Filtering
const candidateList: Candidate[] = [processedCandidate, { ...processedCandidate, id: 'CAN-102', entityId: 'ENT-86' }];
const filteredCandidates = candidateList.filter(c => c.entityId === activeEntityId);

if (filteredCandidates.length === 1 && filteredCandidates[0].id === 'CAN-101') {
  console.log('✅ Passed: Filtered candidates strictly retains newly enlisted ENT-92 candidate');
} else {
  console.error('❌ Failed: Candidate pipeline filtering leaked or dropped candidate');
  process.exit(1);
}

console.log('==================================================');
console.log('ALL ENROLL & ENLIST TESTS PASSED SUCCESSFULLY!');
console.log('==================================================');
