import {
  calculatePCB2026,
  truncateToTwoDecimals,
  roundUpToFiveSen,
  determineTaxCategory,
  calculateAccumulatedPCBHistory,
  recalculatePCBForward
} from './data';
import { 
  EmployeeTaxProfile, 
  Dependant, 
  TP1Declaration, 
  TP3Data, 
  EmployeePCBHistoryLedgerEntry, 
  EmployeeTP3Declaration,
  Employee 
} from './types';

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

console.log("\n--------------------------------------------------");
console.log("RUNNING CUMULATIVE & LEDGER REGRESSION CHECKS");
console.log("--------------------------------------------------");

// Test 1: Estimated annual tax: RM1,200.00, X: RM320.00, remaining months: 8 -> Expected PCB: RM110.00
const profileT1: EmployeeTaxProfile = {
  effectiveDate: '2026-05-01',
  basicSalary: 8333.33,
  maritalStatus: 'Single',
  eligibleForStatutory: 'Yes',
  taxResidenceStatus: 'RESIDENT',
  taxCalculationType: 'RESIDENT_PROGRESSIVE',
  nricPassport: 'P_TEST1'
};
const resT1 = calculatePCB2026({
  employeeTaxProfile: profileT1,
  payrollMonth: 5,
  currentNormalRemuneration: 8333.33,
  currentQualifyingEPF: 0,
  currentAdditionalRemuneration: 0,
  accumulatedPCB: 320.00, // X
  // We simulate estimatedAnnualTax is RM1,200.00. Since we calculate it progressive,
  // let's pass it so that estimatedAnnualTax is RM1,200.00.
  // Wait! To get exactly RM1,200.00 annual tax progressive:
  // Personal relief = 9000. EPF = 4000. Total relief = 13000.
  // Chargeable Income P = Annual Income - Reliefs.
  // We want Tax = 1200.00.
  // Bracket: CI 35000 to 50000 has base tax 600, rate 6% on CI exceeding 35000.
  // Tax = 600 + (CI - 35000) * 0.06.
  // 1200 = 600 + (CI - 35000) * 0.06 => 600 = (CI - 35000) * 0.06 => CI - 35000 = 10000 => CI = 45000.
  // CI = Annual Income - Reliefs => 45000 = Annual Income - 13000 => Annual Income = 58000.
  // Annual Income = 58000 => Monthly Normal Remuneration = 58000 / 12 = 4833.33.
  // Perfect! If salary is 4833.33, EPF is 4000/12 = 333.33.
});

// Let's test the formula directly using our calculatePCB2026 function or verify the formula output
// We can assert the calculation formula:
// { [((P - M) * R) + B] - (Z + X) } / (n + 1)
// Let's assert the outputs from calculatePCB2026 for Test 1:
const resT1_actual = calculatePCB2026({
  employeeTaxProfile: {
    ...profileT1,
    basicSalary: 4833.333
  },
  payrollMonth: 5,
  currentNormalRemuneration: 4833.333,
  currentQualifyingEPF: 333.333,
  currentAdditionalRemuneration: 0,
  accumulatedPCB: 320.00, // X
  accumulatedNormal: 4833.333 * 4,
  accumulatedEPF: 333.333 * 4
});
// Estimated Annual Tax = 1200.00. n = 7. n + 1 = 8.
// Expected PCB = (1200 - 320) / 8 = 110.00
console.log("Test 1 Result (X=320):", resT1_actual.finalPCB);
assert(resT1_actual.finalPCB === 110.00, "Test 1: Spread shortfall (Expected RM110.00)");

// Test 2: Estimated annual tax: RM1,200.00, X: RM240.00, remaining months: 8 -> Expected PCB: RM120.00
const resT2_actual = calculatePCB2026({
  employeeTaxProfile: {
    ...profileT1,
    basicSalary: 4833.333
  },
  payrollMonth: 5,
  currentNormalRemuneration: 4833.333,
  currentQualifyingEPF: 333.333,
  currentAdditionalRemuneration: 0,
  accumulatedPCB: 240.00, // X
  accumulatedNormal: 4833.333 * 4,
  accumulatedEPF: 333.333 * 4
});
console.log("Test 2 Result (X=240):", resT2_actual.finalPCB);
assert(resT2_actual.finalPCB === 120.00, "Test 2: Spread shortfall (Expected RM120.00)");

// Test 3: Estimated annual tax: RM1,200.00, X: RM400.00, remaining months: 8 -> Expected PCB: RM100.00
const resT3_actual = calculatePCB2026({
  employeeTaxProfile: {
    ...profileT1,
    basicSalary: 4833.333
  },
  payrollMonth: 5,
  currentNormalRemuneration: 4833.333,
  currentQualifyingEPF: 333.333,
  currentAdditionalRemuneration: 0,
  accumulatedPCB: 400.00, // X
  accumulatedNormal: 4833.333 * 4,
  accumulatedEPF: 333.333 * 4
});
console.log("Test 3 Result (X=400):", resT3_actual.finalPCB);
assert(resT3_actual.finalPCB === 100.00, "Test 3: Spread shortfall (Expected RM100.00)");

// Test 4: Estimated annual tax: RM1,200.00, X: RM1,200.00 -> Expected PCB: RM0.00
const resT4_actual = calculatePCB2026({
  employeeTaxProfile: {
    ...profileT1,
    basicSalary: 4833.333
  },
  payrollMonth: 5,
  currentNormalRemuneration: 4833.333,
  currentQualifyingEPF: 333.333,
  currentAdditionalRemuneration: 0,
  accumulatedPCB: 1200.00, // X
  accumulatedNormal: 4833.333 * 4,
  accumulatedEPF: 333.333 * 4
});
console.log("Test 4 Result (X=1200):", resT4_actual.finalPCB);
assert(resT4_actual.finalPCB === 0.00, "Test 4: Capping at RM0.00 (Expected RM0.00)");

// Test 5: Estimated annual tax: RM1,200.00, X: RM1,300.00 -> Expected PCB: RM0.00 (no negative)
const resT5_actual = calculatePCB2026({
  employeeTaxProfile: {
    ...profileT1,
    basicSalary: 4833.333
  },
  payrollMonth: 5,
  currentNormalRemuneration: 4833.333,
  currentQualifyingEPF: 333.333,
  currentAdditionalRemuneration: 0,
  accumulatedPCB: 1300.00, // X
  accumulatedNormal: 4833.333 * 4,
  accumulatedEPF: 333.333 * 4
});
console.log("Test 5 Result (X=1300):", resT5_actual.finalPCB);
assert(resT5_actual.finalPCB === 0.00, "Test 5: Capping negative at RM0.00 (Expected RM0.00)");

// Test 6: Previous employer PCB: RM160.00, March PCB: RM80.00, April PCB: RM80.00 -> Expected X for May: RM320.00
const tp3RecordsT6: EmployeeTP3Declaration[] = [
  {
    id: 'tp3_1',
    employee_id: 'E_T6',
    taxYear: 2026,
    previousEmployerRemuneration: 10000,
    previousEmployerAdditionalRemuneration: 0,
    previousEmployerEpf: 1100,
    previousEmployerAllowableDeductions: 0,
    previousEmployerPcb: 160.00,
    previousEmployerZakat: 0,
    previousEmployerStartDate: '2026-01-01',
    previousEmployerEndDate: '2026-02-28',
    declarationDate: '2026-03-01',
    verificationStatus: 'VERIFIED'
  }
];
const ledgerT6: EmployeePCBHistoryLedgerEntry[] = [
  {
    id: 'pay_3',
    employee_id: 'E_T6',
    assessment_year: 2026,
    payroll_month: 3,
    source_type: 'CURRENT_EMPLOYER_PAYROLL',
    source_reference: 'March Payroll',
    source_record_id: 'rec_3',
    original_amount: 80.00,
    adjustment_amount: 0,
    effective_amount: 80.00,
    normal_remuneration_pcb: 80.00,
    additional_remuneration_pcb: 0,
    total_pcb: 80.00,
    status: 'FINALIZED',
    included_in_accumulated_x: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'pay_4',
    employee_id: 'E_T6',
    assessment_year: 2026,
    payroll_month: 4,
    source_type: 'CURRENT_EMPLOYER_PAYROLL',
    source_reference: 'April Payroll',
    source_record_id: 'rec_4',
    original_amount: 80.00,
    adjustment_amount: 0,
    effective_amount: 80.00,
    normal_remuneration_pcb: 80.00,
    additional_remuneration_pcb: 0,
    total_pcb: 80.00,
    status: 'FINALIZED',
    included_in_accumulated_x: true,
    created_at: '',
    updated_at: ''
  }
];
const histT6 = calculateAccumulatedPCBHistory({
  employeeId: 'E_T6',
  assessmentYear: 2026,
  currentPayrollMonth: 5,
  verifiedTP3Records: tp3RecordsT6,
  finalizedPayrollHistory: ledgerT6
});
console.log("Test 6 Accumulated X for May:", histT6.accumulatedPCB_X);
assert(histT6.accumulatedPCB_X === 320.00, "Test 6: X accumulation equal to 320.00");

// Test 7: Previous employer PCB: RM80.00, March PCB: RM80.00, April PCB: RM80.00 -> Expected X for May: RM240.00
const tp3RecordsT7 = [{ ...tp3RecordsT6[0], previousEmployerPcb: 80.00 }];
const histT7 = calculateAccumulatedPCBHistory({
  employeeId: 'E_T6',
  assessmentYear: 2026,
  currentPayrollMonth: 5,
  verifiedTP3Records: tp3RecordsT7,
  finalizedPayrollHistory: ledgerT6
});
console.log("Test 7 Accumulated X for May:", histT7.accumulatedPCB_X);
assert(histT7.accumulatedPCB_X === 240.00, "Test 7: X accumulation equal to 240.00");

// Test 8: May calculation must not include May PCB in X
const ledgerT8: EmployeePCBHistoryLedgerEntry[] = [
  ...ledgerT6,
  {
    id: 'pay_5',
    employee_id: 'E_T6',
    assessment_year: 2026,
    payroll_month: 5,
    source_type: 'CURRENT_EMPLOYER_PAYROLL',
    source_reference: 'May Payroll',
    source_record_id: 'rec_5',
    original_amount: 90.00,
    adjustment_amount: 0,
    effective_amount: 90.00,
    normal_remuneration_pcb: 90.00,
    additional_remuneration_pcb: 0,
    total_pcb: 90.00,
    status: 'FINALIZED',
    included_in_accumulated_x: true,
    created_at: '',
    updated_at: ''
  }
];
const histT8 = calculateAccumulatedPCBHistory({
  employeeId: 'E_T6',
  assessmentYear: 2026,
  currentPayrollMonth: 5,
  verifiedTP3Records: tp3RecordsT6,
  finalizedPayrollHistory: ledgerT8
});
console.log("Test 8 Accumulated X for May (with May record):", histT8.accumulatedPCB_X);
assert(histT8.accumulatedPCB_X === 320.00, "Test 8: Cutoff boundary excludes current month");

// Test 9: June calculation must include finalized May PCB in X
const histT9 = calculateAccumulatedPCBHistory({
  employeeId: 'E_T6',
  assessmentYear: 2026,
  currentPayrollMonth: 6,
  verifiedTP3Records: tp3RecordsT6,
  finalizedPayrollHistory: ledgerT8
});
console.log("Test 9 Accumulated X for June:", histT9.accumulatedPCB_X);
assert(histT9.accumulatedPCB_X === 410.00, "Test 9: Cutoff boundary includes prior month");

// Test 10: A reversed April PCB must be removed from X
const ledgerT10: EmployeePCBHistoryLedgerEntry[] = [
  ledgerT6[0], // March 80.00
  { ...ledgerT6[1], status: 'REVERSED' as const }, // April 80.00 reversed
  {
    id: 'rev_4',
    employee_id: 'E_T6',
    assessment_year: 2026,
    payroll_month: 4,
    source_type: 'REVERSAL',
    source_reference: 'Reversal',
    source_record_id: 'pay_4',
    original_amount: 80.00,
    adjustment_amount: -80.00,
    effective_amount: -80.00,
    normal_remuneration_pcb: -80.00,
    additional_remuneration_pcb: 0,
    total_pcb: -80.00,
    status: 'APPROVED',
    included_in_accumulated_x: true,
    created_at: '',
    updated_at: ''
  }
];
const histT10 = calculateAccumulatedPCBHistory({
  employeeId: 'E_T6',
  assessmentYear: 2026,
  currentPayrollMonth: 5,
  verifiedTP3Records: tp3RecordsT6,
  finalizedPayrollHistory: ledgerT10
});
console.log("Test 10 Accumulated X with reversal:", histT10.accumulatedPCB_X);
// 160 (TP3) + 80 (March) + 80 (April) - 80 (Reversal) = 240.00
assert(histT10.accumulatedPCB_X === 240.00, "Test 10: Reversed deductions are subtracted");

// Test 11: A cancelled payroll must not form part of X
const ledgerT11 = [
  ledgerT6[0],
  { ...ledgerT6[1], status: 'CANCELLED' as const }
];
const histT11 = calculateAccumulatedPCBHistory({
  employeeId: 'E_T6',
  assessmentYear: 2026,
  currentPayrollMonth: 5,
  verifiedTP3Records: tp3RecordsT6,
  finalizedPayrollHistory: ledgerT11
});
console.log("Test 11 Accumulated X with cancelled payroll:", histT11.accumulatedPCB_X);
assert(histT11.accumulatedPCB_X === 240.00, "Test 11: Cancelled payroll excluded");

// Test 12: A draft payroll must not form part of X
const ledgerT12 = [
  ledgerT6[0],
  { ...ledgerT6[1], status: 'DRAFT' as const }
];
const histT12 = calculateAccumulatedPCBHistory({
  employeeId: 'E_T6',
  assessmentYear: 2026,
  currentPayrollMonth: 5,
  verifiedTP3Records: tp3RecordsT6,
  finalizedPayrollHistory: ledgerT12
});
console.log("Test 12 Accumulated X with draft payroll:", histT12.accumulatedPCB_X);
assert(histT12.accumulatedPCB_X === 240.00, "Test 12: Draft payroll excluded");

// Test 13: CP38 must remain separate and must not form part of X
// We ensure CP38 amount is not part of total_pcb in history calculations.
const resT13 = calculatePCB2026({
  employeeTaxProfile: {
    ...profileT1,
    basicSalary: 4833.333
  },
  payrollMonth: 5,
  currentNormalRemuneration: 4833.333,
  currentQualifyingEPF: 333.333,
  currentAdditionalRemuneration: 0,
  accumulatedPCB: 320.00,
  accumulatedNormal: 4833.333 * 4,
  accumulatedEPF: 333.333 * 4,
  cp38Instruction: 150.00 // separate
});
console.log("Test 13 finalPCB vs totalTaxDeduction:", resT13.finalPCB, resT13.totalTaxDeduction);
assert(resT13.finalPCB === 110.00, "Test 13: CP38 does not affect final PCB");
assert(resT13.totalTaxDeduction === 260.00, "Test 13: totalTaxDeduction includes final PCB + CP38");

// Test 14: A salary increment must not reset historical PCB
const employeeT14 = {
  id: 'E_T14',
  name: 'Increment Test',
  email: 'test@increment.com',
  designation: 'Staff',
  department: 'HR',
  status: 'Active',
  bankName: 'Maybank',
  accountNo: '12345',
  basicSalary: 5000,
  taxPcb: 0,
  unpaidLeave: 0,
  hrdCorp: 0,
  nricPassport: 'P_T14',
  nationality: 'Malaysian',
  contactNumber: '1234',
  taxNumber: '1234',
  employmentType: 'Confirmation',
  maritalStatus: 'Single',
  eligibleForStatutory: 'Yes',
  emergencyContactName: 'A',
  emergencyContactRelation: 'Spouse',
  emergencyContactPhone: '1',
  dateOfJoined: '2026-01-01',
  employee_tp3_declarations: [],
  employee_pcb_history_ledger: [
    {
      id: 'pay_1',
      employee_id: 'E_T14',
      assessment_year: 2026,
      payroll_month: 1,
      source_type: 'CURRENT_EMPLOYER_PAYROLL',
      source_reference: 'Jan',
      source_record_id: 'rec_1',
      original_amount: 70.00,
      adjustment_amount: 0,
      effective_amount: 70.00,
      normal_remuneration_pcb: 70.00,
      additional_remuneration_pcb: 0,
      total_pcb: 70.00,
      status: 'FINALIZED',
      included_in_accumulated_x: true,
      created_at: '',
      updated_at: ''
    }
  ],
  effectiveDatedProfiles: [
    {
      effectiveDate: '2026-01-01',
      basicSalary: 5000,
      maritalStatus: 'Single',
      spouseIsWorking: 'No',
      dependantsCount: 0,
      eligibleForStatutory: 'Yes'
    },
    {
      // Increment in February
      effectiveDate: '2026-02-01',
      basicSalary: 5500,
      maritalStatus: 'Single',
      spouseIsWorking: 'No',
      dependantsCount: 0,
      eligibleForStatutory: 'Yes'
    }
  ],
  historicalPayrollRecords: [
    { payrollMonth: 1, basicSalary: 5000, epfEmployee: 550, actualPCBDeducted: 70.00, zakat: 0, cp38: 0 },
    { payrollMonth: 2, basicSalary: 5500, epfEmployee: 605, actualPCBDeducted: 0, zakat: 0, cp38: 0 }
  ]
} as unknown as Employee;

// Sequential recalculation up to Feb should preserve Jan PCB (70)
const recalcT14 = recalculatePCBForward({
  employee: employeeT14,
  assessmentYear: 2026,
  changedEffectiveMonth: 2,
  reason: 'Increment',
  changedBy: 'Jenny'
});
console.log("Test 14 months recalculated:", recalcT14.monthsRecalculated);
assert(recalcT14.monthsRecalculated.includes(2), "Test 14: Recalculates month 2 after increment");
assert(!recalcT14.monthsRecalculated.includes(1), "Test 14: Preserves historical month 1");

// Test 15: Changing TP3 PCB must trigger forward recalculation or current-month adjustment
const employeeT15 = {
  ...employeeT14,
  employee_tp3_declarations: [
    {
      id: 'tp3_T15',
      employee_id: 'E_T14',
      taxYear: 2026,
      previousEmployerRemuneration: 10000,
      previousEmployerAdditionalRemuneration: 0,
      previousEmployerEpf: 1100,
      previousEmployerAllowableDeductions: 0,
      previousEmployerPcb: 100.00, // old value was 100
      previousEmployerZakat: 0,
      previousEmployerStartDate: '2026-01-01',
      previousEmployerEndDate: '2026-02-28',
      declarationDate: '2026-03-01',
      verificationStatus: 'VERIFIED' as const
    }
  ]
};
// Change TP3 PCB to 200.00
const updatedEmployeeT15 = {
  ...employeeT15,
  employee_tp3_declarations: [
    {
      ...employeeT15.employee_tp3_declarations[0],
      previousEmployerPcb: 200.00 // new value
    }
  ]
};
const recalcT15 = recalculatePCBForward({
  employee: updatedEmployeeT15,
  assessmentYear: 2026,
  changedEffectiveMonth: 1,
  reason: 'TP3 PCB Change',
  changedBy: 'Jenny'
});
console.log("Test 15 difference on TP3 change:", recalcT15.difference);
assert(Math.abs(recalcT15.difference) > 0, "Test 15: Changing TP3 triggers a forward recalculation change");

console.log("==================================================");
console.log("ALL REGRESSION FIXTURE CHECKS PASSED SUCCESSFULLY!");
console.log("==================================================");
process.exit(0);
