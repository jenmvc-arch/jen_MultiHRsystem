import { 
  calculatePCB2026,
  truncateToTwoDecimals,
  roundUpToFiveSen,
  determineTaxCategory
} from './data';
import { EmployeeTaxProfile, Dependant, TP1Declaration, TP3Data } from './types';

// Simple assert helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

console.log("==================================================");
console.log("RUNNING MALAYSIA MTD / PCB 2026 REGRESSION SUITE");
console.log("==================================================");

// Test Truncation utility
assert(truncateToTwoDecimals(123.4534) === 123.45, "Truncate 123.4534 to 123.45");
assert(truncateToTwoDecimals(108.2048) === 108.20, "Truncate 108.2048 to 108.20");
assert(truncateToTwoDecimals(54.6599) === 54.65, "Truncate 54.6599 to 54.65");
assert(truncateToTwoDecimals(10.9999) === 10.99, "Truncate 10.9999 to 10.99");

// Test Round Up To Five Sen utility
assert(roundUpToFiveSen(287.00) === 287.00, "Round 287.00 to 287.00");
assert(roundUpToFiveSen(287.01) === 287.05, "Round 287.01 to 287.05");
assert(roundUpToFiveSen(287.06) === 287.10, "Round 287.06 to 287.10");

// Test Tax Category Determination
assert(determineTaxCategory('Single', 'No', false) === 'CATEGORY_1', "Single, no child -> Category 1");
assert(determineTaxCategory('Married', 'No', true) === 'CATEGORY_2', "Married, spouse not working -> Category 2");
assert(determineTaxCategory('Married', 'Yes', true) === 'CATEGORY_3', "Married, spouse working -> Category 3");

// Question 1 Regression Fixture: Expatriate C-Suite Worker with TP3 and TP1
const profileQ1: EmployeeTaxProfile = {
  effectiveDate: '2026-07-01',
  basicSalary: 20000,
  maritalStatus: 'Married',
  spouseIsWorking: 'No',
  dependantsCount: 2,
  eligibleForStatutory: 'Yes',
  taxResidenceStatus: 'RESIDENT',
  taxCalculationType: 'NON_CITIZEN_C_SUITE_APPROVED_COMPANY', // 15% rate, no T deduction
  nricPassport: 'P1234567'
};

const tp3Q1: TP3Data = {
  taxYear: 2026,
  previousEmployerRemuneration: 24500,
  previousEmployerEpf: 2695,
  previousEmployerPcb: 1100,
  previousEmployerZakat: 100
};

const tp1Q1: TP1Declaration[] = [
  {
    taxYear: 2026,
    declarationDate: '2026-07-01',
    effectivePayrollMonth: 7,
    claimCategory: 'tp1_parent_medical',
    claimedAmount: 2000,
    qualifyingAmount: 2000,
    approvalStatus: 'APPROVED'
  }
];

const resQ1 = calculatePCB2026({
  employeeTaxProfile: profileQ1,
  payrollMonth: 7,
  currentNormalRemuneration: 20000,
  currentQualifyingEPF: 2200,
  currentAdditionalRemuneration: 0,
  tp3Declaration: tp3Q1,
  tp1Declarations: tp1Q1,
  currentZakat: 100
});

console.log("Question 1 Result:", resQ1.finalPCB);
assert(resQ1.finalPCB > 0, "Question 1 should produce a valid positive PCB");
assert(resQ1.calculationType === 'NON_CITIZEN_C_SUITE_APPROVED_COMPANY', "Question 1 uses C-Suite 15% rate");

// Question 2 Regression Fixture: Additional Remuneration (Quarterly Director's Fee)
const profileQ2: EmployeeTaxProfile = {
  effectiveDate: '2026-04-01',
  basicSalary: 12000,
  maritalStatus: 'Married',
  spouseIsWorking: 'Yes',
  dependantsCount: 2,
  eligibleForStatutory: 'Yes',
  taxResidenceStatus: 'RESIDENT',
  taxCalculationType: 'RESIDENT_PROGRESSIVE',
  nricPassport: 'P7654321'
};

const resQ2 = calculatePCB2026({
  employeeTaxProfile: profileQ2,
  payrollMonth: 4,
  currentNormalRemuneration: 12000,
  currentQualifyingEPF: 1320,
  currentAdditionalRemuneration: 30000, // Director's fee
  additionalRemunerationQualifyingEPF: 3300,
  currentZakat: 50
});

console.log("Question 2 Result:", resQ2.finalPCB);
assert(resQ2.finalPCB > 0, "Question 2 with Additional Remuneration should calculate positive PCB");

// Question 3 Regression Fixture: Returning Expert Programme (15% rate with T table)
const profileQ3: EmployeeTaxProfile = {
  effectiveDate: '2026-09-01',
  basicSalary: 15000,
  maritalStatus: 'Divorced', // Category 3
  spouseIsWorking: 'No',
  dependantsCount: 1,
  eligibleForStatutory: 'Yes',
  taxResidenceStatus: 'RESIDENT',
  taxCalculationType: 'RETURNING_EXPERT_PROGRAMME',
  nricPassport: 'P3333333'
};

const resQ3 = calculatePCB2026({
  employeeTaxProfile: profileQ3,
  payrollMonth: 9,
  currentNormalRemuneration: 15000,
  currentQualifyingEPF: 1650,
  currentAdditionalRemuneration: 0
});

console.log("Question 3 Result:", resQ3.finalPCB);
assert(resQ3.finalPCB > 0, "Question 3 (REP) should calculate valid positive PCB");
assert(resQ3.calculationType === 'RETURNING_EXPERT_PROGRAMME', "Question 3 uses REP 15% progressive rate");

// Question 4 Regression Fixture: Expatriate with Non-Resident flat 30% tax
const profileQ4: EmployeeTaxProfile = {
  effectiveDate: '2026-02-01',
  basicSalary: 18000,
  maritalStatus: 'Single',
  eligibleForStatutory: 'Yes',
  taxResidenceStatus: 'NON_RESIDENT',
  taxCalculationType: 'NON_RESIDENT',
  nricPassport: 'P4444444'
};

const resQ4 = calculatePCB2026({
  employeeTaxProfile: profileQ4,
  payrollMonth: 2,
  currentNormalRemuneration: 18000,
  currentQualifyingEPF: 0,
  currentAdditionalRemuneration: 0
});

console.log("Question 4 Result:", resQ4.finalPCB);
// 18000 * 30% = 5400.00
assert(resQ4.finalPCB === 5400.00, "Question 4 (Non-resident 30%) should equal exactly 5400.00");

// Question 5 Regression Fixture: Knowledge Worker in Specified Region (15% rate with T table)
const profileQ5: EmployeeTaxProfile = {
  effectiveDate: '2026-11-01',
  basicSalary: 8500,
  maritalStatus: 'Single',
  dependantsCount: 0,
  eligibleForStatutory: 'Yes',
  taxResidenceStatus: 'RESIDENT',
  taxCalculationType: 'KNOWLEDGE_WORKER_SPECIFIED_REGION',
  nricPassport: 'P5555555'
};

const resQ5 = calculatePCB2026({
  employeeTaxProfile: profileQ5,
  payrollMonth: 11,
  currentNormalRemuneration: 8500,
  currentQualifyingEPF: 935,
  currentAdditionalRemuneration: 0
});

console.log("Question 5 Result:", resQ5.finalPCB);
assert(resQ5.finalPCB > 0, "Question 5 (Knowledge Worker) should calculate valid positive PCB");
assert(resQ5.calculationType === 'KNOWLEDGE_WORKER_SPECIFIED_REGION', "Question 5 uses Knowledge Worker 15% rate");

console.log("==================================================");
console.log("ALL REGRESSION FIXTURE CHECKS PASSED SUCCESSFULLY!");
console.log("==================================================");
process.exit(0);
