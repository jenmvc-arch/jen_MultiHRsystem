import { 
  calculateAnnualTaxSpec, 
  getEffectiveProfileForMonth, 
  reconstructPCBHistory, 
  recalculatePCBFromMonth 
} from './data';
import { Employee, EmployeeTaxProfile, HistoricalPayrollRecord } from './types';

// Simple assert helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

console.log("--------------------------------------------------");
console.log("RUNNING PCB CHRONOLOGICAL CALCULATOR TEST SUITE");
console.log("--------------------------------------------------");

// Test 1: calculateAnnualTaxSpec bracket mapping
const taxLevel1 = calculateAnnualTaxSpec(4000);
assert(taxLevel1 === 0, `Tax on 4000 is 0, got ${taxLevel1}`);

const taxLevel2 = calculateAnnualTaxSpec(15000);
assert(taxLevel2 === 100, `Tax on 15000 is 100, got ${taxLevel2}`);

const taxLevel3 = calculateAnnualTaxSpec(25000);
assert(taxLevel3 === 300, `Tax on 25000 is 300, got ${taxLevel3}`);

// Test 2: getEffectiveProfileForMonth snapshots
const mockEmployee: Employee = {
  id: "EMP-TEST",
  entityId: "ENT-01",
  name: "John Doe",
  email: "john@doe.com",
  designation: "Engineer",
  department: "R&D",
  status: "Active",
  basicSalary: 6000,
  maritalStatus: "Single",
  epfRateEmployee: 11,
  epfRateEmployer: 13,
  effectiveDatedProfiles: [
    {
      effectiveDate: "2026-01-01",
      basicSalary: 6000,
      maritalStatus: "Single",
      dependantsCount: 0,
      eligibleForStatutory: "Yes"
    },
    {
      effectiveDate: "2026-03-01",
      basicSalary: 7500, // Salary revision starting March
      maritalStatus: "Married",
      spouseIsWorking: "No",
      dependantsCount: 1,
      eligibleForStatutory: "Yes"
    }
  ],
  historicalPayrollRecords: []
};

// Check profile matched in February (should get Jan profile)
const profileFeb = getEffectiveProfileForMonth(mockEmployee, 2, 2026);
assert(profileFeb.basicSalary === 6000, "Feb basic salary should be 6000");
assert(profileFeb.maritalStatus === "Single", "Feb status should be Single");

// Check profile matched in March (should get March profile)
const profileMar = getEffectiveProfileForMonth(mockEmployee, 3, 2026);
assert(profileMar.basicSalary === 7500, "March basic salary should be 7500");
assert(profileMar.maritalStatus === "Married", "March status should be Married");


// Test 3: reconstructPCBHistory sequential calculations
const employeeWithHistory: Employee = {
  id: "EMP-HIST",
  entityId: "ENT-01",
  name: "Sarah Jenkins",
  email: "sarah@acme.com",
  designation: "Consultant",
  department: "Tech",
  status: "Active",
  basicSalary: 5000,
  maritalStatus: "Single",
  dateOfJoined: "2026-01-01",
  effectiveDatedProfiles: [
    {
      effectiveDate: "2026-01-01",
      basicSalary: 5000,
      maritalStatus: "Single",
      dependantsCount: 0,
      eligibleForStatutory: "Yes"
    }
  ],
  historicalPayrollRecords: [
    {
      payrollMonth: 1,
      basicSalary: 5000,
      allowanceGeneral: 500,
      epfEmployee: 550,
      actualPCBDeducted: 120
    },
    {
      payrollMonth: 2,
      basicSalary: 5000,
      allowanceGeneral: 500,
      epfEmployee: 550,
      actualPCBDeducted: 120
    }
  ]
};

const historyResults = reconstructPCBHistory({
  employee: employeeWithHistory,
  taxYear: 2026,
  startMonth: 1,
  endMonth: 2,
  calculationBasis: "actual_deduction_history"
});

assert(historyResults.length === 2, "Should return exactly two reconstructed months");
assert(historyResults[0].payrollMonth === 1, "First result should be month 1");
assert(historyResults[1].payrollMonth === 2, "Second result should be month 2");

// Verify YTD accumulation in month 2 context
const m2Result = historyResults[1];
assert(m2Result.accumulatedPriorRemuneration === 5500, `Month 2 accumulatedPriorRemuneration should be 5500, got ${m2Result.accumulatedPriorRemuneration}`);
assert(m2Result.accumulatedPriorEPF === 550, `Month 2 accumulatedPriorEPF should be 550, got ${m2Result.accumulatedPriorEPF}`);
assert(m2Result.accumulatedPriorPCB === 120, `Month 2 accumulatedPriorPCB should be 120, got ${m2Result.accumulatedPriorPCB}`);

console.log("--------------------------------------------------");
console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
console.log("--------------------------------------------------");
process.exit(0);
