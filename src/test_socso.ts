/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const store: Record<string, string> = {};
if (typeof global !== 'undefined') {
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; }
  };
}

import * as fs from 'fs';
import * as path from 'path';
import { Employee } from './types';

// Dynamically import data functions to prevent hoisting before localStorage is defined
const {
  seedSocsoConfigurationsAndBrackets,
  calculateSocsoContribution
} = await import('./data');

// Run statutory configurations seeder
seedSocsoConfigurationsAndBrackets();

console.log("--------------------------------------------------");
console.log("RUNNING MALAYSIA PERKESO/SOCSO COMPLIANCE TEST SUITE");
console.log("--------------------------------------------------");

let passCount = 0;
let failCount = 0;

function runTest(testName: string, employee: Employee, period: string, items: any[], expected: {
  category: string;
  employerTotal: number;
  employeeTotal: number;
  lindung24: number;
}) {
  try {
    const res = calculateSocsoContribution({
      employee,
      payrollPeriod: period,
      payrollItems: items
    });

    const categoryPass = res.contributionCategory === expected.category;
    const employerPass = Math.abs(res.employerSocsoTotal - expected.employerTotal) < 0.01;
    const employeePass = Math.abs(res.employeeSocsoTotal - expected.employeeTotal) < 0.01;
    const lindungPass = Math.abs(res.employeeLindung24 - expected.lindung24) < 0.01;

    const isPass = categoryPass && employerPass && employeePass && lindungPass;

    if (isPass) {
      console.log(`✅ [PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      console.error(`   Expected: Cat=${expected.category}, Er=${expected.employerTotal}, Ee=${expected.employeeTotal}, L24=${expected.lindung24}`);
      console.error(`   Actual  : Cat=${res.contributionCategory}, Er=${res.employerSocsoTotal}, Ee=${res.employeeSocsoTotal}, L24=${res.employeeLindung24}`);
      failCount++;
    }
  } catch (err: any) {
    console.error(`❌ [FAIL] ${testName} threw an unexpected error:`, err.message);
    failCount++;
  }
}

// Baseline Template Employee
const baseEmp: any = {
  id: "EMP-001",
  entityId: "ENT-01",
  name: "Ahmad",
  email: "ahmad@nexus.com",
  designation: "Consultant",
  department: "Tech",
  status: "Active",
  basicSalary: 5000,
  maritalStatus: "Single",
  nationality: "Malaysian",
  nricPassport: "950101-14-1111",
  dateOfJoined: "2026-01-01",
  employmentType: "Confirmation",
  eligibleForStatutory: "Yes",
  socsoProfile: {
    employeeId: "ahmad@nexus.com",
    nationality: "Malaysian",
    identityNumber: "950101-14-1111",
    dateOfBirth: "1995-01-01",
    employmentStartDate: "2026-01-01",
    contractType: "Permanent",
    isUnderContractOfService: true,
    socsoRegistrationNumber: "REG-123",
    socsoRegistered: true,
    socsoCoverageStatus: "Covered",
    hasPreviousSocsoContribution: true,
    contributionCategory: "FIRST_CATEGORY",
    multipleEmployerStatus: "Single Employer",
    selectedEmployerForLindung24: true,
    foreignWorkerStatus: "Local",
    domesticWorkerStatus: false,
    effectiveFrom: "2026-01-01",
    effectiveTo: "9999-12-31"
  }
};

// 1. Wages up to RM30 (Wages = 25)
const emp1 = { ...baseEmp };
runTest("Test 1: Wages up to RM30", emp1, "2026-06", [{ code: 'basic_salary', amount: 25.00 }], {
  category: "FIRST_CATEGORY",
  employerTotal: 0.40,
  employeeTotal: 0.30,
  lindung24: 0.20
});

// 2. Wages exactly RM30
const emp2 = { ...baseEmp };
runTest("Test 2: Wages exactly RM30", emp2, "2026-06", [{ code: 'basic_salary', amount: 30.00 }], {
  category: "FIRST_CATEGORY",
  employerTotal: 0.40,
  employeeTotal: 0.30,
  lindung24: 0.20
});

// 3. Wages RM30.01 (falls in next bracket)
const emp3 = { ...baseEmp };
runTest("Test 3: Wages RM30.01", emp3, "2026-06", [{ code: 'basic_salary', amount: 30.01 }], {
  category: "FIRST_CATEGORY",
  employerTotal: 0.70,
  employeeTotal: 0.50,
  lindung24: 0.30
});

// 5. Wages exactly RM900 (post-June 2026 Phase 1)
const emp5 = { ...baseEmp };
runTest("Test 5: Wages exactly RM900", emp5, "2026-06", [{ code: 'basic_salary', amount: 900.00 }], {
  category: "FIRST_CATEGORY",
  employerTotal: 14.85,
  employeeTotal: 10.60,
  lindung24: 6.35
});

// 6. Wages RM900.01 (falls in next bracket)
const emp6 = { ...baseEmp };
runTest("Test 6: Wages RM900.01", emp6, "2026-06", [{ code: 'basic_salary', amount: 900.01 }], {
  category: "FIRST_CATEGORY",
  employerTotal: 16.65,
  employeeTotal: 11.90,
  lindung24: 7.15
});

// 11. Wages exactly RM6,000 (Ceiling)
const emp11 = { ...baseEmp };
runTest("Test 11: Wages exactly RM6,000", emp11, "2026-06", [{ code: 'basic_salary', amount: 6000.00 }], {
  category: "FIRST_CATEGORY",
  employerTotal: 104.15,
  employeeTotal: 74.40,
  lindung24: 44.65
});

// 12. Wages above RM6,000 (Capped at RM6k)
const emp12 = { ...baseEmp };
runTest("Test 12: Wages above RM6,000 (Capped)", emp12, "2026-06", [{ code: 'basic_salary', amount: 8000.00 }], {
  category: "FIRST_CATEGORY",
  employerTotal: 104.15,
  employeeTotal: 74.40,
  lindung24: 44.65
});

// 13. First Category employee pre-June 2026
const emp13 = { ...baseEmp };
runTest("Test 13: First Category Pre-June 2026", emp13, "2026-05", [{ code: 'basic_salary', amount: 5000.00 }], {
  category: "FIRST_CATEGORY",
  employerTotal: 86.50,
  employeeTotal: 25.00,
  lindung24: 0.00
});

// 14. Second Category employee (Age >= 60)
const emp14 = { ...baseEmp };
emp14.socsoProfile = {
  ...baseEmp.socsoProfile!,
  dateOfBirth: "1965-01-01", // age 61 in 2026
  contributionCategory: "SECOND_CATEGORY"
};
runTest("Test 14: Second Category Age >= 60", emp14, "2026-06", [{ code: 'basic_salary', amount: 5000.00 }], {
  category: "SECOND_CATEGORY",
  employerTotal: 61.90,
  employeeTotal: 37.15,
  lindung24: 37.15
});

// 15. New employee age 55 with no previous contribution
const emp15 = { ...baseEmp };
emp15.socsoProfile = {
  ...baseEmp.socsoProfile!,
  dateOfBirth: "1971-01-01", // age 55 in 2026
  hasPreviousSocsoContribution: false,
  firstSocsoContributionDate: "2026-06-15"
};
runTest("Test 15: New Employee Age 55 No Prev Contribution", emp15, "2026-06", [{ code: 'basic_salary', amount: 4000.00 }], {
  category: "SECOND_CATEGORY",
  employerTotal: 49.40,
  employeeTotal: 29.65,
  lindung24: 29.65
});

// 16. Employee age 55 with previous contribution
const emp16 = { ...baseEmp };
emp16.socsoProfile = {
  ...baseEmp.socsoProfile!,
  dateOfBirth: "1971-01-01", // age 55 in 2026
  hasPreviousSocsoContribution: true,
  firstSocsoContributionDate: "2020-01-01" // signed up at age 49
};
runTest("Test 16: Employee Age 55 With Prev Contribution (First Cat)", emp16, "2026-06", [{ code: 'basic_salary', amount: 4000.00 }], {
  category: "FIRST_CATEGORY",
  employerTotal: 69.15,
  employeeTotal: 49.40,
  lindung24: 29.65
});

// 17. Employee with multiple employers, not selected for Lindung 24 Jam
const emp17 = { ...baseEmp };
emp17.socsoProfile = {
  ...baseEmp.socsoProfile!,
  multipleEmployerStatus: "Multiple Employers",
  selectedEmployerForLindung24: false
};
runTest("Test 17: Multiple Employers (Bypass Lindung 24)", emp17, "2026-06", [{ code: 'basic_salary', amount: 5000.00 }], {
  category: "FIRST_CATEGORY",
  employerTotal: 86.65,
  employeeTotal: 24.75, // LINDUNG 24 is bypassed (0.00), only invalidity (24.75) remains
  lindung24: 0.00
});

// 18. Earning Exclusions (dismissal, gratuity, retrenchment, annual bonus)
const emp18 = { ...baseEmp };
const items18 = [
  { code: 'basic_salary', amount: 3000.00 },
  { code: 'overtime', amount: 500.00 },
  { code: 'bonus', amount: 1000.00 }, // excluded
  { code: 'reimbursement', amount: 200.00 }, // excluded
  { code: 'compensation', amount: 1500.00 } // excluded
];
runTest("Test 18: Remuneration Exclusions", emp18, "2026-06", items18, {
  category: "FIRST_CATEGORY",
  employerTotal: 60.35, // Calculated on RM 3500 (3000 + 500)
  employeeTotal: 43.10,
  lindung24: 25.85
});

// 19. Unpaid Leave Wages Reduction
const emp19 = { ...baseEmp };
const items19 = [
  { code: 'basic_salary', amount: 5000.00 },
  { code: 'unpaid_leave', amount: 1500.00 } // subtracted
];
runTest("Test 19: Unpaid Leave Wages Reduction", emp19, "2026-06", items19, {
  category: "FIRST_CATEGORY",
  employerTotal: 60.35, // Calculated on RM 3500 (5000 - 1500)
  employeeTotal: 43.10,
  lindung24: 25.85
});

// 20. RM0.00 wages edge case
const empZero = { ...baseEmp };
runTest("Test 20: RM0.00 wages (Exempt)", empZero, "2026-06", [{ code: 'basic_salary', amount: 0.00 }], {
  category: "FIRST_CATEGORY",
  employerTotal: 0.00,
  employeeTotal: 0.00,
  lindung24: 0.00
});

// Load the JSON directly from the file system
const jsonPath = path.resolve('./src/data/perkeso_lindung24_phase1_2026.json');
const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log(`Loaded ${rawData.rows.length} rows for dynamic boundary verification.`);

// Loop over all 65 brackets
rawData.rows.forEach((r: any) => {
  const num = r.bracket_number;

  // Let's test the upper bound of the bracket (upper_bound_sen / 100)
  if (r.upper_bound_sen !== null) {
    const upperAmount = r.upper_bound_sen / 100;
    const testNameUpper = `Bracket ${num} Upper Boundary Check: Wages = RM ${upperAmount.toFixed(2)}`;
    runTest(testNameUpper, baseEmp, "2026-06", [{ code: 'basic_salary', amount: upperAmount }], {
      category: "FIRST_CATEGORY",
      employerTotal: r.category1_employer_total_sen / 100,
      employeeTotal: r.category1_employee_total_sen / 100,
      lindung24: r.category1_employee_lindung24_sen / 100
    });

    // Test 1 sen above upper boundary (must fall in the next bracket)
    const aboveUpperAmount = (r.upper_bound_sen + 1) / 100;
    const nextRow = rawData.rows.find((x: any) => x.bracket_number === num + 1);
    if (nextRow) {
      const testNameAbove = `Bracket ${num} + 1 sen Check: Wages = RM ${aboveUpperAmount.toFixed(2)}`;
      runTest(testNameAbove, baseEmp, "2026-06", [{ code: 'basic_salary', amount: aboveUpperAmount }], {
        category: "FIRST_CATEGORY",
        employerTotal: nextRow.category1_employer_total_sen / 100,
        employeeTotal: nextRow.category1_employee_total_sen / 100,
        lindung24: nextRow.category1_employee_lindung24_sen / 100
      });
    }
  } else {
    // Maximum bracket (Bracket 65) upper limit is null.
    // Let's test a very high wage (e.g. RM10,000) to check capping
    runTest("Bracket 65 Ceiling capping: Wages = RM 10,000.00", baseEmp, "2026-06", [{ code: 'basic_salary', amount: 10000.00 }], {
      category: "FIRST_CATEGORY",
      employerTotal: r.category1_employer_total_sen / 100,
      employeeTotal: r.category1_employee_total_sen / 100,
      lindung24: r.category1_employee_lindung24_sen / 100
    });
  }
});

// Final results display
console.log("--------------------------------------------------");
console.log("TEST RUN COMPLETION SUMMARY");
console.log(`Passed: ${passCount} tests`);
console.error(`Failed: ${failCount} tests`);
console.log("--------------------------------------------------");

if (failCount > 0) {
  process.exit(1);
} else {
  console.log("All statutory compliance regression cases verify successfully!");
  process.exit(0);
}
