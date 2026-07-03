/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import rawScheduleData from './data/perkeso_lindung24_phase1_2026.json';

import { 
  CorporateEntity, 
  Employee, 
  ReviewCycle, 
  EmployeePerformance, 
  Candidate,
  PCBProcessingMode,
  HistoricalCalculationBasis,
  HistoricalPCBStatus,
  EmployeeTaxProfile,
  HistoricalPayrollRecord,
  TP1Declaration,
  TP3Data,
  PCBCalculationStep,
  HistoricalPCBResult,
  PCBHistoricalVariance,
  HistoricalPCBMonthContext
} from './types';
import { getGmt8DateString } from './lib/dateUtils';
import { Decimal, dec } from './lib/decimal';
import {
  SOCSOSchemeCode,
  SOCSOCategory,
  SOCSOPhase,
  EmployeeSocsoProfile,
  SOCSOConfiguration,
  SOCSOBracket,
  SocsoEarningComponent,
  SocsoManualOverride,
  SocsoAuditLog,
  SocsoContributionResult,
  SOCSOContributionSchedule,
  SOCSOContributionBracket
} from './types';

export const INITIAL_ENTITIES: CorporateEntity[] = [];

export const INITIAL_EMPLOYEES: Employee[] = [];

export const INITIAL_REVIEW_CYCLES: ReviewCycle[] = [];

export const INITIAL_PERFORMANCES: EmployeePerformance[] = [];

export interface PayslipBreakdown {
  grossEarnings: number;
  epfEmployeeValue: number;
  epfEmployerValue: number;
  socsoEmployeeVal: number;
  socsoEmployerVal: number;
  eisEmployeeVal: number;
  eisEmployerVal: number;
  taxPcbVal: number;
  skbbkEmpVal: number;
  skbbkEmplyrVal: number;
  totalDeductions: number;
  totalEmployerContributions: number;
  netPay: number;
  allowancesSum: number;
  reimbursementsSum: number;
}

export function getPayslipLabel(employmentType: string): string {
  if (employmentType === 'Probationary' || employmentType === 'Confirmation') {
    return 'Basic Salary';
  }
  if (employmentType === 'Internship') {
    return 'Allowance';
  }
  if (employmentType === 'Independent Contractor / Freelance') {
    return 'Services Fees';
  }
  if (employmentType === 'Part Time') {
    return 'Wages / Retainer';
  }
  return 'Basic Salary';
}

export function getStatutoryDeductions2026(salary: number): {
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
} {
  if (salary <= 0) {
    return { socsoEmployee: 0, socsoEmployer: 0, eisEmployee: 0, eisEmployer: 0 };
  }

  // 1. EIS (0.2% Employee, 0.2% Employer, capped at RM6,000 ceiling in 2026)
  let eisEmployee = 0;
  let eisEmployer = 0;
  
  if (salary >= 6000) {
    eisEmployee = 11.90;
    eisEmployer = 11.90;
  } else {
    const bracketVal = Math.ceil(salary / 100) * 100;
    eisEmployee = parseFloat((bracketVal * 0.002 - 0.10).toFixed(2));
    eisEmployer = eisEmployee;
    if (eisEmployee < 0.10) {
      eisEmployee = 0.10;
      eisEmployer = 0.10;
    }
  }

  // 2. SOCSO (Category 1 - Employment Injury & Invalidity, capped at RM6,000 ceiling in 2026)
  let socsoEmployee = 0;
  let socsoEmployer = 0;

  if (salary >= 6000) {
    socsoEmployee = 29.15;
    socsoEmployer = 101.50;
  } else {
    const bracketVal = Math.ceil(salary / 100) * 100;
    if (bracketVal <= 1000) {
      socsoEmployee = parseFloat((bracketVal * 0.005 - 0.25).toFixed(2));
      socsoEmployer = parseFloat((bracketVal * 0.0175 - 0.75).toFixed(2));
    } else if (bracketVal <= 3000) {
      socsoEmployee = parseFloat((bracketVal * 0.005 - 0.25).toFixed(2));
      socsoEmployer = parseFloat((bracketVal * 0.0175 - 1.00).toFixed(2));
    } else if (bracketVal <= 4000) {
      socsoEmployee = parseFloat((bracketVal * 0.005 - 0.25).toFixed(2));
      socsoEmployer = parseFloat((bracketVal * 0.0175 - 1.50).toFixed(2));
    } else if (bracketVal <= 5000) {
      socsoEmployee = parseFloat((bracketVal * 0.005 - 0.75).toFixed(2));
      socsoEmployer = parseFloat((bracketVal * 0.0175 - 3.00).toFixed(2));
    } else { // 5000 to 6000
      socsoEmployee = parseFloat((bracketVal * 0.005 - 0.85).toFixed(2));
      socsoEmployer = parseFloat((bracketVal * 0.0175 - 3.50).toFixed(2));
    }

    if (socsoEmployee < 0.10) socsoEmployee = 0.10;
    if (socsoEmployer < 0.40) socsoEmployer = 0.40;
  }

  return { socsoEmployee, socsoEmployer, eisEmployee, eisEmployer };
}

export const DEFAULT_SOCSO_EARNING_COMPONENTS: SocsoEarningComponent[] = [
  { earningCode: 'basic_salary', earningName: 'Basic Salary', subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: 'Salary', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'overtime', earningName: 'Overtime Pay', subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: 'Overtime', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'commission', earningName: 'Commissions', subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: 'Commission', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'allowance_general', earningName: 'General Allowance', subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: 'Allowance', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'allowance_transport', earningName: 'Transport Allowance', subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: 'Allowance', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'allowance_parking', earningName: 'Parking Allowance', subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: 'Allowance', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'allowance_meal', earningName: 'Meal Allowance', subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: 'Allowance', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'allowance_accommodation', earningName: 'Accommodation Allowance', subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: 'Allowance', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'allowance_phone', earningName: 'Phone Allowance', subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: 'Allowance', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'bonus', earningName: 'Performance Bonus', subjectToSocso: false, includedInSocsoWages: false, excludedFromSocsoWages: true, earningCategory: 'Bonus', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'backpay', earningName: 'BackPay / Arrears', subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: 'Remuneration', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'aws', earningName: 'AWS (13th Month)', subjectToSocso: false, includedInSocsoWages: false, excludedFromSocsoWages: true, earningCategory: 'Bonus', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'compensation', earningName: 'Compensation / Severance', subjectToSocso: false, includedInSocsoWages: false, excludedFromSocsoWages: true, earningCategory: 'Compensation', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false },
  { earningCode: 'reimbursement', earningName: 'Reimbursement', subjectToSocso: false, includedInSocsoWages: false, excludedFromSocsoWages: true, earningCategory: 'Reimbursement', effectiveFrom: '2020-01-01', effectiveTo: '9999-12-31', statutoryReference: 'Act 4', requiresReview: false }
];

function roundToTwoDecimals(val: number): number {
  return Math.round(val * 100) / 100;
}

export function parseDobFromNric(nric: string): string {
  if (!nric) return '1990-01-01';
  const clean = nric.replace(/[^0-9]/g, '');
  if (clean.length < 6) return '1990-01-01';
  const yy = clean.substring(0, 2);
  const mm = clean.substring(2, 4);
  const dd = clean.substring(4, 6);
  const yearPrefix = parseInt(yy, 10) > 30 ? '19' : '20';
  return `${yearPrefix}${yy}-${mm}-${dd}`;
}

export function generateOfficialSocsoBrackets(configId: string, category: 'FIRST_CATEGORY' | 'SECOND_CATEGORY', phase: SOCSOPhase): SOCSOBracket[] {
  const boundaries = [
    { min: 0, max: 30, assumed: 30 },
    { min: 30, max: 50, assumed: 50 },
    { min: 50, max: 70, assumed: 70 },
    { min: 70, max: 100, assumed: 100 },
    { min: 100, max: 140, assumed: 140 },
    { min: 140, max: 200, assumed: 200 },
    { min: 200, max: 300, assumed: 300 },
    { min: 300, max: 400, assumed: 400 },
  ];

  for (let val = 400; val < 5900; val += 100) {
    boundaries.push({
      min: val,
      max: val + 100,
      assumed: val + 100
    });
  }
  
  // Maximum bracket 5900 to 6000 has midpoint assumed wage 5950
  boundaries.push({
    min: 5900,
    max: 6000,
    assumed: 5950
  });

  boundaries.push({
    min: 6000,
    max: 999999,
    assumed: 5950
  });

  return boundaries.map((b, index) => {
    let employerEmploymentInjury = 0;
    let employerInvalidity = 0;
    let employeeInvalidity = 0;
    let employeeNonEmploymentInjury = 0;

    const assumed = b.assumed;

    // Progressive deduction constants for employer and employee contributions to align with standard tables
    let C_er = 0;
    let C_ee_l24 = 0;

    if (phase === 'PRE_JUNE_2026') {
      if (assumed === 900) C_er = 0.10;
      else if (assumed === 1000) C_er = 0.15;
      else if (assumed === 4000) C_er = 0.30;
      else if (assumed === 5000) C_er = (category === 'FIRST_CATEGORY') ? 1.00 : 0.40;
      else if (assumed === 5950) C_er = 0.025;
    } else {
      if (assumed === 900) C_er = 0.10;
      else if (assumed === 1000) C_er = 0.15;
      else if (assumed === 3500) {
        C_er = 0.35;
        C_ee_l24 = 0.20;
      }
      else if (assumed === 4000) C_er = 0.30;
      else if (assumed === 5000) C_er = 0.40;
      else if (assumed === 5950) C_er = 0.025;
    }

    if (phase === 'PRE_JUNE_2026') {
      if (category === 'FIRST_CATEGORY') {
        const empTotal = roundToTwoDecimals(assumed * 0.0175 - C_er);
        employerInvalidity = roundToTwoDecimals(assumed * 0.005);
        employerEmploymentInjury = roundToTwoDecimals(empTotal - employerInvalidity);
        employeeInvalidity = roundToTwoDecimals(assumed * 0.005);
        employeeNonEmploymentInjury = 0;
      } else {
        employerEmploymentInjury = roundToTwoDecimals(assumed * 0.0125 - C_er);
        employerInvalidity = 0;
        employeeInvalidity = 0;
        employeeNonEmploymentInjury = 0;
      }
    } else {
      let lindung24Rate = 0.0075; // Phase 1
      if (phase === 'LINDUNG24_PHASE_2') lindung24Rate = 0.0100;
      if (phase === 'LINDUNG24_PHASE_3') lindung24Rate = 0.0125;

      if (category === 'FIRST_CATEGORY') {
        const empTotal = roundToTwoDecimals(assumed * 0.0175 - C_er);
        employerInvalidity = roundToTwoDecimals(assumed * 0.005);
        employerEmploymentInjury = roundToTwoDecimals(empTotal - employerInvalidity);

        employeeInvalidity = roundToTwoDecimals(assumed * 0.005);
        employeeNonEmploymentInjury = roundToTwoDecimals(assumed * lindung24Rate - C_ee_l24);
      } else {
        employerEmploymentInjury = roundToTwoDecimals(assumed * 0.0125 - C_er);
        employerInvalidity = 0;
        employeeInvalidity = 0;
        employeeNonEmploymentInjury = roundToTwoDecimals(assumed * lindung24Rate - C_ee_l24);
      }
    }

    // Min boundary limits override matching Act 4 guidelines
    if (b.min === 0) {
      if (phase === 'PRE_JUNE_2026') {
        if (category === 'FIRST_CATEGORY') {
          employerEmploymentInjury = 0.30;
          employerInvalidity = 0.10;
          employeeInvalidity = 0.10;
        } else {
          employerEmploymentInjury = 0.30;
        }
      } else {
        if (category === 'FIRST_CATEGORY') {
          employerEmploymentInjury = 0.40;
          employerInvalidity = 0.15;
          employeeInvalidity = 0.15;
          employeeNonEmploymentInjury = 0.25;
        } else {
          employerEmploymentInjury = 0.40;
          employeeNonEmploymentInjury = 0.25;
        }
      }
    }

    const employerTotal = roundToTwoDecimals(employerEmploymentInjury + employerInvalidity);
    const employeeTotal = roundToTwoDecimals(employeeInvalidity + employeeNonEmploymentInjury);
    const combinedTotal = roundToTwoDecimals(employerTotal + employeeTotal);

    return {
      id: `${configId}-bracket-${index + 1}`,
      configurationId: configId,
      contributionCategory: category,
      lowerWageLimit: b.min,
      upperWageLimit: b.max,
      lowerLimitInclusive: b.min > 0 ? false : true,
      upperLimitInclusive: true,
      wageBracketNumber: index + 1,
      assumedMonthlyWage: assumed,
      employerEmploymentInjury: parseFloat(employerEmploymentInjury.toFixed(2)),
      employerInvalidity: parseFloat(employerInvalidity.toFixed(2)),
      employerTotal: parseFloat(employerTotal.toFixed(2)),
      employeeInvalidity: parseFloat(employeeInvalidity.toFixed(2)),
      employeeNonEmploymentInjury: parseFloat(employeeNonEmploymentInjury.toFixed(2)),
      employeeTotal: parseFloat(employeeTotal.toFixed(2)),
      combinedTotal: parseFloat(combinedTotal.toFixed(2)),
      effectiveFrom: phase === 'PRE_JUNE_2026' ? '2020-01-01' : '2026-06-01',
      effectiveTo: phase === 'PRE_JUNE_2026' ? '2026-05-31' : '9999-12-31'
    };
  });
}

export function seedSocsoConfigurationsAndBrackets() {
  const existing = localStorage.getItem('socso_contribution_schedules');
  if (existing) return;

  const schedules: SOCSOContributionSchedule[] = [
    {
      id: 'cfg-perkeso-act4-lindung24-phase1-2026',
      schedule_code: 'PERKESO_ACT4_LINDUNG24_PHASE1_2026',
      schedule_name: 'PERKESO Act 4 First Phase Contribution Table including LINDUNG 24 JAM',
      effective_from: '2026-06-01',
      effective_to: null,
      currency: 'MYR',
      storage_unit: 'sen',
      wage_ceiling_sen: 600000,
      status: 'ACTIVE',
      official_source: 'https://www.perkeso.gov.my/images/arahan/Employer_Circular_No_2_2026-PekelilingLindung24Jam_English.pdf',
      compatibility_reference: 'https://payroll.my/payroll-software/socso-contribution-table',
      source_file_name: 'socso_perkeso_2026_contribution_table.json',
      source_file_hash: 'd3b07384d113edec49eaa6238ad5ff00',
      created_by: 'system',
      created_at: new Date().toISOString(),
      approved_by: 'system',
      approved_at: new Date().toISOString(),
      activated_by: 'system',
      activated_at: new Date().toISOString()
    }
  ];

  const brackets: SOCSOContributionBracket[] = [];
  rawScheduleData.rows.forEach((r: any) => {
    brackets.push({
      id: `cfg-perkeso-act4-lindung24-phase1-2026-bracket-${r.bracket_number}`,
      schedule_id: 'cfg-perkeso-act4-lindung24-phase1-2026',
      bracket_number: r.bracket_number,
      description: r.description,
      lower_bound_sen: r.lower_bound_sen,
      upper_bound_sen: r.upper_bound_sen,
      lower_bound_inclusive: r.lower_bound_inclusive,
      upper_bound_inclusive: r.upper_bound_inclusive,
      is_maximum_bracket: r.is_maximum_bracket,

      category1_employer_invalidity_sen: r.category1_employer_invalidity_sen,
      category1_employer_employment_injury_sen: r.category1_employer_employment_injury_sen,
      category1_employer_total_sen: r.category1_employer_total_sen,

      category1_employee_invalidity_sen: r.category1_employee_invalidity_sen,
      category1_employee_lindung24_sen: r.category1_employee_lindung24_sen,
      category1_employee_total_sen: r.category1_employee_total_sen,
      category1_grand_total_sen: r.category1_grand_total_sen,

      category2_employer_employment_injury_sen: r.category2_employer_employment_injury_sen,
      category2_employer_total_sen: r.category2_employer_total_sen,

      category2_employee_lindung24_sen: r.category2_employee_lindung24_sen,
      category2_employee_total_sen: r.category2_employee_total_sen,
      category2_grand_total_sen: r.category2_grand_total_sen,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  // Seed legacy layouts for backward compatibility in display cards/lists
  const legacyConfigs: SOCSOConfiguration[] = [
    {
      id: 'cfg-pre-june-2026-c1',
      schemeCode: 'SOCSO_ACT4',
      legislation: 'Employees Social Security Act 1969, Act 4',
      contributionCategory: 'FIRST_CATEGORY',
      phase: 'PRE_JUNE_2026',
      effectiveFrom: '2020-01',
      effectiveTo: '2026-05',
      wageCeiling: 6000,
      sourceDocument: 'PERKESO Contribution Schedule Table 1',
      sourceDocumentDate: '2020-01-01',
      sourceVersion: 'v1.0',
      status: 'approved',
      approvedBy: 'system-admin@nexus.com',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cfg-pre-june-2026-c2',
      schemeCode: 'SOCSO_ACT4',
      legislation: 'Employees Social Security Act 1969, Act 4',
      contributionCategory: 'SECOND_CATEGORY',
      phase: 'PRE_JUNE_2026',
      effectiveFrom: '2020-01',
      effectiveTo: '2026-05',
      wageCeiling: 6000,
      sourceDocument: 'PERKESO Contribution Schedule Table 2',
      sourceDocumentDate: '2020-01-01',
      sourceVersion: 'v1.0',
      status: 'approved',
      approvedBy: 'system-admin@nexus.com',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cfg-lindung24-p1-c1',
      schemeCode: 'LINDUNG_24_JAM',
      legislation: 'Employees Social Security Act 1969, Act 4',
      contributionCategory: 'FIRST_CATEGORY',
      phase: 'LINDUNG24_PHASE_1',
      effectiveFrom: '2026-06',
      effectiveTo: '9999-12',
      wageCeiling: 6000,
      sourceDocument: 'PERKESO Gazette June 2026 Table 1',
      sourceDocumentDate: '2026-05-01',
      sourceVersion: 'v2.0-p1',
      status: 'approved',
      approvedBy: 'system-admin@nexus.com',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cfg-lindung24-p1-c2',
      schemeCode: 'LINDUNG_24_JAM',
      legislation: 'Employees Social Security Act 1969, Act 4',
      contributionCategory: 'SECOND_CATEGORY',
      phase: 'LINDUNG24_PHASE_1',
      effectiveFrom: '2026-06',
      effectiveTo: '9999-12',
      wageCeiling: 6000,
      sourceDocument: 'PERKESO Gazette June 2026 Table 2',
      sourceDocumentDate: '2026-05-01',
      sourceVersion: 'v2.0-p1',
      status: 'approved',
      approvedBy: 'system-admin@nexus.com',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const legacyBrackets: SOCSOBracket[] = [];
  const preJune1Brackets = generateOfficialSocsoBrackets('cfg-pre-june-2026-c1', 'FIRST_CATEGORY', 'PRE_JUNE_2026');
  const preJune2Brackets = generateOfficialSocsoBrackets('cfg-pre-june-2026-c2', 'SECOND_CATEGORY', 'PRE_JUNE_2026');
  legacyBrackets.push(...preJune1Brackets, ...preJune2Brackets);
  rawScheduleData.rows.forEach((r: any) => {
    legacyBrackets.push({
      id: `cfg-lindung24-p1-c1-bracket-${r.bracket_number}`,
      configurationId: 'cfg-lindung24-p1-c1',
      contributionCategory: 'FIRST_CATEGORY',
      lowerWageLimit: r.lower_bound_sen / 100,
      upperWageLimit: (r.upper_bound_sen || 9999999) / 100,
      lowerLimitInclusive: r.lower_bound_inclusive,
      upperLimitInclusive: r.upper_bound_inclusive,
      wageBracketNumber: r.bracket_number,
      assumedMonthlyWage: r.lower_bound_sen / 100,
      employerEmploymentInjury: r.category1_employer_employment_injury_sen / 100,
      employerInvalidity: r.category1_employer_invalidity_sen / 100,
      employerTotal: r.category1_employer_total_sen / 100,
      employeeInvalidity: r.category1_employee_invalidity_sen / 100,
      employeeNonEmploymentInjury: r.category1_employee_lindung24_sen / 100,
      employeeTotal: r.category1_employee_total_sen / 100,
      combinedTotal: r.category1_grand_total_sen / 100,
      effectiveFrom: '2026-06-01',
      effectiveTo: '9999-12-31'
    });

    legacyBrackets.push({
      id: `cfg-lindung24-p1-c2-bracket-${r.bracket_number}`,
      configurationId: 'cfg-lindung24-p1-c2',
      contributionCategory: 'SECOND_CATEGORY',
      lowerWageLimit: r.lower_bound_sen / 100,
      upperWageLimit: (r.upper_bound_sen || 9999999) / 100,
      lowerLimitInclusive: r.lower_bound_inclusive,
      upperLimitInclusive: r.upper_bound_inclusive,
      wageBracketNumber: r.bracket_number,
      assumedMonthlyWage: r.lower_bound_sen / 100,
      employerEmploymentInjury: r.category2_employer_employment_injury_sen / 100,
      employerInvalidity: 0,
      employerTotal: r.category2_employer_total_sen / 100,
      employeeInvalidity: 0,
      employeeNonEmploymentInjury: r.category2_employee_lindung24_sen / 100,
      employeeTotal: r.category2_employee_total_sen / 100,
      combinedTotal: r.category2_grand_total_sen / 100,
      effectiveFrom: '2026-06-01',
      effectiveTo: '9999-12-31'
    });
  });

  localStorage.setItem('socso_contribution_schedules', JSON.stringify(schedules));
  localStorage.setItem('socso_contribution_brackets_new', JSON.stringify(brackets));
  localStorage.setItem('socso_configurations', JSON.stringify(legacyConfigs));
  localStorage.setItem('socso_contribution_brackets', JSON.stringify(legacyBrackets));
  localStorage.setItem('socso_earning_components', JSON.stringify(DEFAULT_SOCSO_EARNING_COMPONENTS));
}

export function determineSocsoCategory(employee: Employee, payrollPeriod: string): SOCSOCategory {
  const profile = employee.socsoProfile || {
    employeeId: employee.id,
    socsoCoverageStatus: 'Covered',
    contributionCategory: 'FIRST_CATEGORY',
    dateOfBirth: '1990-01-01',
    hasPreviousSocsoContribution: true,
    firstSocsoContributionDate: '2015-01-01',
    multipleEmployerStatus: 'Single Employer',
    selectedEmployerForLindung24: true
  };

  if (profile.socsoCoverageStatus === 'Exempt') {
    return 'EXEMPT';
  }

  if (!profile.dateOfBirth) {
    return 'REVIEW_REQUIRED';
  }

  const dob = new Date(profile.dateOfBirth);
  const payDate = new Date(payrollPeriod + '-01');
  let age = payDate.getFullYear() - dob.getFullYear();
  const m = payDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && payDate.getDate() < dob.getDate())) {
    age--;
  }

  if (age >= 60) {
    return 'SECOND_CATEGORY';
  }

  if (profile.hasPreviousSocsoContribution === undefined) return 'REVIEW_REQUIRED';

  if (!profile.hasPreviousSocsoContribution && !profile.firstSocsoContributionDate) {
    return 'REVIEW_REQUIRED';
  }

  if (profile.hasPreviousSocsoContribution === false && profile.firstSocsoContributionDate) {
    const firstDate = new Date(profile.firstSocsoContributionDate);
    let firstAge = firstDate.getFullYear() - dob.getFullYear();
    const firstM = firstDate.getMonth() - dob.getMonth();
    if (firstM < 0 || (firstM === 0 && firstDate.getDate() < dob.getDate())) {
      firstAge--;
    }
    if (firstAge >= 55) {
      return 'SECOND_CATEGORY';
    }
  }

  if (age >= 55 && profile.hasPreviousSocsoContribution && !profile.firstSocsoContributionDate) {
    return 'REVIEW_REQUIRED';
  }

  if (!profile.foreignWorkerStatus) return 'REVIEW_REQUIRED';
  if (profile.domesticWorkerStatus === undefined) return 'REVIEW_REQUIRED';

  if (profile.multipleEmployerStatus === 'Multiple Employers' && profile.selectedEmployerForLindung24 === undefined) {
    return 'REVIEW_REQUIRED';
  }

  return 'FIRST_CATEGORY';
}

export function formatMYRFromSen(amountInSen: number): string {
  const isNegative = amountInSen < 0;
  const absAmount = Math.abs(amountInSen);
  const ringgit = Math.floor(absAmount / 100);
  const cents = absAmount % 100;
  return `${isNegative ? '-' : ''}RM${ringgit}.${cents.toString().padStart(2, '0')}`;
}

export function calculateSocsoWagesInSen(payrollItems: { code: string; amount: number }[]): number {
  let wagesInSen = 0;
  const config = JSON.parse(localStorage.getItem('socso_earning_components') || '[]');
  const activeComponents = config.length > 0 ? config : DEFAULT_SOCSO_EARNING_COMPONENTS;

  for (const item of payrollItems) {
    if (item.code === 'unpaid_leave') continue;
    const comp = activeComponents.find(c => c.earningCode === item.code);
    if (comp && comp.includedInSocsoWages) {
      wagesInSen += new Decimal(item.amount).toIntegerCents();
    }
  }

  const unpaid = payrollItems.find(item => item.code === 'unpaid_leave');
  if (unpaid) {
    wagesInSen -= new Decimal(unpaid.amount).toIntegerCents();
  }

  return wagesInSen < 0 ? 0 : wagesInSen;
}

export function calculateSocsoWages(payrollItems: { code: string; amount: number }[]): number {
  return calculateSocsoWagesInSen(payrollItems) / 100;
}

export function findSocsoBracket(
  scheduleOrWage: SOCSOContributionSchedule | number,
  socsoWagesInSenOrCategory?: number | 'FIRST_CATEGORY' | 'SECOND_CATEGORY',
  period?: string
): any {
  if (typeof scheduleOrWage === 'object') {
    const schedule = scheduleOrWage as SOCSOContributionSchedule;
    const wagesInSen = socsoWagesInSenOrCategory as number;

    const brackets: SOCSOContributionBracket[] = JSON.parse(localStorage.getItem('socso_contribution_brackets_new') || '[]');
    const matched = brackets.filter(b => {
      if (b.schedule_id !== schedule.id) return false;
      const isAboveLower = b.lower_bound_inclusive ? (wagesInSen >= b.lower_bound_sen) : (wagesInSen > b.lower_bound_sen);
      if (!isAboveLower) return false;

      if (b.is_maximum_bracket || b.upper_bound_sen === null) {
        return true;
      }
      const isBelowUpper = b.upper_bound_inclusive ? (wagesInSen <= b.upper_bound_sen) : (wagesInSen < b.upper_bound_sen);
      return isBelowUpper;
    });

    if (matched.length === 0) {
      throw new Error(`No wage bracket is found for wage in sen: ${wagesInSen}`);
    }
    return matched[0];
  } else {
    // Legacy compatibility mode:
    const contributionWage = scheduleOrWage as number;
    const category = socsoWagesInSenOrCategory as 'FIRST_CATEGORY' | 'SECOND_CATEGORY';
    const activePeriod = period || '2026-06';
    const wagesInSen = Math.round(contributionWage * 100);

    // Find active schedule for that period and category
    const schedules: SOCSOContributionSchedule[] = JSON.parse(localStorage.getItem('socso_contribution_schedules') || '[]');
    let schedule = schedules.find(s => {
      const matchCat = s.schedule_code.includes(category === 'FIRST_CATEGORY' ? 'C1' : 'C2') || s.schedule_code.includes('PHASE1_2026') || s.schedule_code.includes('LINDUNG24');
      const startMonth = s.effective_from.substring(0, 7);
      const endMonth = s.effective_to ? s.effective_to.substring(0, 7) : null;
      return s.status === 'ACTIVE' && startMonth <= activePeriod && (endMonth === null || activePeriod <= endMonth);
    });

    if (!schedule) {
      // Fallback: use legacy SOCSOBracket mapping if no schedule active
      const brackets: SOCSOBracket[] = JSON.parse(localStorage.getItem('socso_contribution_brackets') || '[]');
      const legacyConfig = JSON.parse(localStorage.getItem('socso_configurations') || '[]').find((c: any) => c.status === 'approved' && c.effectiveFrom <= activePeriod && activePeriod <= c.effectiveTo && c.contributionCategory === category);
      if (legacyConfig) {
        const matched = brackets.filter(b => b.configurationId === legacyConfig.id && b.contributionCategory === category && contributionWage > b.lowerWageLimit && contributionWage <= b.upperWageLimit);
        if (matched.length > 0) return matched[0];
      }
      throw new Error('No active schedule found for period: ' + activePeriod);
    }

    const bracket = findSocsoBracket(schedule, wagesInSen);
    // Map SOCSOContributionBracket to legacy SOCSOBracket
    return {
      id: bracket.id,
      configurationId: bracket.schedule_id,
      contributionCategory: category,
      lowerWageLimit: bracket.lower_bound_sen / 100,
      upperWageLimit: (bracket.upper_bound_sen || 9999999) / 100,
      lowerLimitInclusive: bracket.lower_bound_inclusive,
      upperLimitInclusive: bracket.upper_bound_inclusive,
      wageBracketNumber: bracket.bracket_number,
      assumedMonthlyWage: bracket.lower_bound_sen / 100, // placeholder
      employerEmploymentInjury: (category === 'FIRST_CATEGORY' ? bracket.category1_employer_employment_injury_sen : bracket.category2_employer_employment_injury_sen) / 100,
      employerInvalidity: (category === 'FIRST_CATEGORY' ? bracket.category1_employer_invalidity_sen : 0) / 100,
      employerTotal: (category === 'FIRST_CATEGORY' ? bracket.category1_employer_total_sen : bracket.category2_employer_total_sen) / 100,
      employeeInvalidity: (category === 'FIRST_CATEGORY' ? bracket.category1_employee_invalidity_sen : 0) / 100,
      employeeNonEmploymentInjury: (category === 'FIRST_CATEGORY' ? bracket.category1_employee_lindung24_sen : bracket.category2_employee_lindung24_sen) / 100,
      employeeTotal: (category === 'FIRST_CATEGORY' ? bracket.category1_employee_total_sen : bracket.category2_employee_total_sen) / 100,
      combinedTotal: (category === 'FIRST_CATEGORY' ? bracket.category1_grand_total_sen : bracket.category2_grand_total_sen) / 100,
      effectiveFrom: schedule.effective_from,
      effectiveTo: schedule.effective_to || '9999-12-31'
    };
  }
}

export function calculateSocsoContribution(params: {
  employeeSocsoProfile?: EmployeeSocsoProfile;
  payrollContributionMonth?: string;
  payrollItems: { code: string; amount: number }[];
  contributionSchedule?: SOCSOContributionSchedule;
  // Compatibility:
  employee?: Employee;
  payrollPeriod?: string;
}): SocsoContributionResult & { display: any } {
  let profile = params.employeeSocsoProfile || params.employee?.socsoProfile;
  if (!profile && params.employee) {
    profile = {
      employeeId: params.employee.id,
      socsoCoverageStatus: 'Covered',
      contributionCategory: 'FIRST_CATEGORY',
      dateOfBirth: '1990-01-01',
      hasPreviousSocsoContribution: true,
      firstSocsoContributionDate: '2015-01-01',
      multipleEmployerStatus: 'Single Employer',
      selectedEmployerForLindung24: true
    };
  }

  if (!profile) {
    throw new Error('Employee SOCSO Profile is required.');
  }

  const rawPeriod = params.payrollContributionMonth || params.payrollPeriod || '2026-06';
  const period = rawPeriod.substring(0, 7); // e.g. "2026-06"
  const items = params.payrollItems;

  const warnings: string[] = [];
  const errors: string[] = [];

  const category = params.employee ? determineSocsoCategory(params.employee, period) : profile.contributionCategory;

  const actualWagesInSen = calculateSocsoWagesInSen(items);

  if (period < '2026-06') {
    // Legacy fallback path:
    const bracket = findSocsoBracket(actualWagesInSen / 100, category, period);
    const erEmploymentInjury = bracket.employerEmploymentInjury;
    const erInvalidity = bracket.employerInvalidity;
    const erTotal = bracket.employerTotal;
    const eeInvalidity = bracket.employeeInvalidity;
    const eeLindung24 = bracket.employeeNonEmploymentInjury || 0;
    const eeTotal = bracket.employeeTotal;

    // Overrides check
    let finalEmployer = erTotal;
    let finalEmployee = eeTotal;
    let calcStatus: 'calculated' | 'override_applied' = 'calculated';

    const employeeId = params.employee?.id || profile.employeeId;
    const overrides: SocsoManualOverride[] = JSON.parse(localStorage.getItem('socso_manual_overrides') || '[]');
    const activeOverride = overrides.find(o => o.employeeId === employeeId && o.payrollPeriod === period);

    if (activeOverride) {
      finalEmployer = activeOverride.correctedEmployerSocso;
      finalEmployee = activeOverride.correctedEmployeeSocso;
      calcStatus = 'override_applied';
      warnings.push(`Manual statutory override applied: Employer corrected to RM ${finalEmployer}, Employee corrected to RM ${finalEmployee}.`);
    }

    return {
      employeeId,
      payrollPeriod: period,
      effectiveDate: getGmt8DateString(),
      socsoCoverageStatus: profile.socsoCoverageStatus,
      contributionCategory: category,
      grossRemuneration: items.reduce((sum, item) => sum + item.amount, 0),
      includedSocsoWages: actualWagesInSen / 100,
      excludedSocsoWages: (items.reduce((sum, item) => sum + item.amount, 0) * 100 - actualWagesInSen) / 100,
      socsoWages: actualWagesInSen / 100,
      contributionWage: actualWagesInSen / 100,
      wageCeilingApplied: actualWagesInSen > 600000,
      wageBracketNumber: bracket.wageBracketNumber,
      wageBracketDescription: `${bracket.lowerWageLimit} to ${bracket.upperWageLimit}`,
      employerEmploymentInjury: erEmploymentInjury,
      employerInvalidity: erInvalidity,
      employerSocsoTotal: finalEmployer,
      employeeInvalidity: eeInvalidity,
      employeeLindung24: eeLindung24,
      employeeSocsoTotal: finalEmployee,
      totalSocsoContribution: finalEmployer + finalEmployee,
      configurationVersion: bracket.configurationId,
      calculationTimestamp: new Date().toISOString(),
      warningMessages: warnings,
      validationErrors: errors,
      calculationStatus: calcStatus,
      display: {
        actualSocsoWagesFormatted: `RM${(actualWagesInSen / 100).toFixed(2)}`,
        employerTotalFormatted: `RM${finalEmployer.toFixed(2)}`,
        employeeInvalidityFormatted: `RM${eeInvalidity.toFixed(2)}`,
        employeeLindung24Formatted: `RM${eeLindung24.toFixed(2)}`,
        employeeTotalFormatted: `RM${finalEmployee.toFixed(2)}`,
        grandTotalFormatted: `RM${(finalEmployer + finalEmployee).toFixed(2)}`
      }
    } as any;
  }

  // If wages are exactly RM0.00:
  if (actualWagesInSen === 0) {
    return {
      employeeId: profile.employeeId,
      payrollPeriod: period,
      effectiveDate: getGmt8DateString(),
      socsoCoverageStatus: profile.socsoCoverageStatus,
      contributionCategory: category,
      grossRemuneration: items.reduce((sum, item) => sum + item.amount, 0),
      includedSocsoWages: 0,
      excludedSocsoWages: 0,
      socsoWages: 0,
      contributionWage: 0,
      wageCeilingApplied: false,
      wageBracketNumber: 0,
      wageBracketDescription: 'No wages payable',
      employerEmploymentInjury: 0,
      employerInvalidity: 0,
      employerSocsoTotal: 0,
      employeeInvalidity: 0,
      employeeLindung24: 0,
      employeeSocsoTotal: 0,
      totalSocsoContribution: 0,
      configurationVersion: 'PERKESO_ACT4_LINDUNG24_PHASE1_2026',
      calculationTimestamp: new Date().toISOString(),
      warningMessages: [],
      validationErrors: [],
      calculationStatus: 'exempt',
      display: {
        actualSocsoWagesFormatted: 'RM0.00',
        employerTotalFormatted: 'RM0.00',
        employeeInvalidityFormatted: 'RM0.00',
        employeeLindung24Formatted: 'RM0.00',
        employeeTotalFormatted: 'RM0.00',
        grandTotalFormatted: 'RM0.00'
      }
    } as any;
  }

  // Get active schedule for period
  let schedule = params.contributionSchedule;
  if (!schedule) {
    const schedules: SOCSOContributionSchedule[] = JSON.parse(localStorage.getItem('socso_contribution_schedules') || '[]');
    schedule = schedules.find(s => {
      const startMonth = s.effective_from.substring(0, 7);
      const endMonth = s.effective_to ? s.effective_to.substring(0, 7) : null;
      return s.status === 'ACTIVE' && startMonth <= period && (endMonth === null || period <= endMonth);
    });
  }

  if (!schedule) {
    throw new Error('No active SOCSO contribution schedule found for period: ' + period);
  }

  const lookupWagesInSen = Math.min(actualWagesInSen, schedule.wage_ceiling_sen);
  const wageCeilingApplied = actualWagesInSen > schedule.wage_ceiling_sen;

  if (wageCeilingApplied) {
    warnings.push('The Monthly wage ceiling has been applied.');
  }

  // Exact lookup:
  const bracket = findSocsoBracket(schedule, actualWagesInSen);

  let erEmploymentInjury = 0;
  let erInvalidity = 0;
  let erTotal = 0;
  let eeInvalidity = 0;
  let eeLindung24 = 0;
  let eeTotal = 0;
  let grandTotal = 0;

  let calcCategory = category;
  if (calcCategory === 'REVIEW_REQUIRED') {
    calcCategory = profile.contributionCategory || 'FIRST_CATEGORY';
  }

  if (calcCategory === 'FIRST_CATEGORY') {
    erEmploymentInjury = bracket.category1_employer_employment_injury_sen;
    erInvalidity = bracket.category1_employer_invalidity_sen;
    erTotal = bracket.category1_employer_total_sen;

    eeInvalidity = bracket.category1_employee_invalidity_sen;
    eeLindung24 = bracket.category1_employee_lindung24_sen;
    eeTotal = bracket.category1_employee_total_sen;
    
    grandTotal = bracket.category1_grand_total_sen;
  } else {
    erEmploymentInjury = bracket.category2_employer_employment_injury_sen;
    erInvalidity = 0;
    erTotal = bracket.category2_employer_total_sen;

    eeInvalidity = 0;
    eeLindung24 = bracket.category2_employee_lindung24_sen;
    eeTotal = bracket.category2_employee_total_sen;

    grandTotal = bracket.category2_grand_total_sen;
  }

  // LINDUNG 24 Jam bypass logic
  if (profile.multipleEmployerStatus === 'Multiple Employers' && !profile.selectedEmployerForLindung24) {
    eeLindung24 = 0;
    eeTotal = eeInvalidity; // Employee total drops to just invalidity
    erTotal = erEmploymentInjury + erInvalidity;
    grandTotal = erTotal + eeTotal;
    warnings.push('LINDUNG 24 Jam contribution is bypassed as this employer is not selected for this multiple-employer account.');
  }

  // Overrides check
  let finalEmployer = erTotal;
  let finalEmployee = eeTotal;
  let calcStatus: 'calculated' | 'override_applied' = 'calculated';

  const employeeId = params.employee?.id || profile.employeeId;
  const overrides: SocsoManualOverride[] = JSON.parse(localStorage.getItem('socso_manual_overrides') || '[]');
  const activeOverride = overrides.find(o => o.employeeId === employeeId && o.payrollPeriod === period);

  if (activeOverride) {
    finalEmployer = Math.round(activeOverride.correctedEmployerSocso * 100);
    finalEmployee = Math.round(activeOverride.correctedEmployeeSocso * 100);
    calcStatus = 'override_applied';
    warnings.push(`Manual statutory override applied: Employer corrected to ${formatMYRFromSen(finalEmployer)}, Employee corrected to ${formatMYRFromSen(finalEmployee)}.`);
  }

  // Map to result object (both legacy fields and new ones)
  const result: any = {
    // New calculation values (as requested)
    employeeId: employeeId,
    payrollContributionMonth: period,
    contributionCategory: category,
    scheduleCode: schedule.schedule_code,
    scheduleVersion: '1.0',
    actualSocsoWagesInSen: actualWagesInSen,
    lookupWagesInSen: lookupWagesInSen,
    wageCeilingInSen: schedule.wage_ceiling_sen,
    wageCeilingApplied: wageCeilingApplied,
    bracketNumber: bracket.bracket_number,
    bracketDescription: bracket.description,

    employerInvalidityContributionInSen: erInvalidity,
    employerEmploymentInjuryContributionInSen: erEmploymentInjury,
    employerTotalContributionInSen: finalEmployer,

    employeeInvalidityContributionInSen: eeInvalidity,
    employeeLindung24ContributionInSen: eeLindung24,
    employeeTotalContributionInSen: finalEmployee,

    grandTotalContributionInSen: finalEmployer + finalEmployee,

    calculationStatus: calcStatus,
    warnings: warnings,
    errors: errors,
    calculatedAt: new Date().toISOString(),

    // Legacy fields for backward compatibility inside Payslips Views and Delta calculations
    payrollPeriod: period,
    effectiveDate: getGmt8DateString(),
    socsoCoverageStatus: profile.socsoCoverageStatus,
    grossRemuneration: items.reduce((sum, item) => sum + item.amount, 0),
    includedSocsoWages: actualWagesInSen / 100,
    excludedSocsoWages: (items.reduce((sum, item) => sum + item.amount, 0) * 100 - actualWagesInSen) / 100,
    socsoWages: actualWagesInSen / 100,
    contributionWage: lookupWagesInSen / 100,
    wageBracketNumber: bracket.bracket_number,
    wageBracketDescription: bracket.description,
    employerEmploymentInjury: erEmploymentInjury / 100,
    employerInvalidity: erInvalidity / 100,
    employerSocsoTotal: finalEmployer / 100,
    employeeInvalidity: eeInvalidity / 100,
    employeeLindung24: eeLindung24 / 100,
    employeeSocsoTotal: finalEmployee / 100,
    totalSocsoContribution: (finalEmployer + finalEmployee) / 100,
    configurationVersion: schedule.schedule_code,
    calculationTimestamp: new Date().toISOString(),
    warningMessages: warnings,
    validationErrors: errors,

    // Separate display object
    display: {
      actualSocsoWagesFormatted: formatMYRFromSen(actualWagesInSen),
      employerTotalFormatted: formatMYRFromSen(finalEmployer),
      employeeInvalidityFormatted: formatMYRFromSen(eeInvalidity),
      employeeLindung24Formatted: formatMYRFromSen(eeLindung24),
      employeeTotalFormatted: formatMYRFromSen(finalEmployee),
      grandTotalFormatted: formatMYRFromSen(finalEmployer + finalEmployee)
    }
  };

  return result;
}

export function truncateToTwoDecimals(value: number): number {
  const str = value.toString();
  if (str.includes('.')) {
    const parts = str.split('.');
    return parseFloat(parts[0] + '.' + parts[1].slice(0, 2));
  }
  return value;
}

export function roundUpToFiveSen(value: number): number {
  const amountInSen = Math.round(value * 100);
  if (amountInSen % 5 === 0) {
    return amountInSen / 100;
  }
  return (amountInSen + (5 - (amountInSen % 5))) / 100;
}

export function calculateAnnualTaxProgressive(P: Decimal, category: string): { annualTax: Decimal, M: number, R: number, B: number } {
  const pVal = P.toNumber();
  let M = 0;
  let R = 0;
  let B = 0;

  if (pVal <= 5000) {
    return { annualTax: dec(0), M: 0, R: 0, B: 0 };
  } else if (pVal <= 20000) {
    M = 5000;
    R = 0.01;
    B = category === 'CATEGORY_2' ? -800 : -400;
  } else if (pVal <= 35000) {
    M = 20000;
    R = 0.03;
    B = category === 'CATEGORY_2' ? -650 : -250;
  } else if (pVal <= 50000) {
    M = 35000;
    R = 0.06;
    B = 600;
  } else if (pVal <= 70000) {
    M = 50000;
    R = 0.11;
    B = 1500;
  } else if (pVal <= 100000) {
    M = 70000;
    R = 0.19;
    B = 3700;
  } else if (pVal <= 400000) {
    M = 100000;
    R = 0.25;
    B = 9400;
  } else if (pVal <= 600000) {
    M = 400000;
    R = 0.26;
    B = 84400;
  } else if (pVal <= 2000000) {
    M = 600000;
    R = 0.28;
    B = 136400;
  } else {
    M = 2000000;
    R = 0.30;
    B = 528400;
  }

  const pMinusM = P.sub(M);
  const tax = pMinusM.mul(R).add(B);
  const annualTax = Decimal.fromCents(Math.max(0, tax.toIntegerCents()));
  return { annualTax, M, R, B };
}

export function determineTaxCategory(
  maritalStatus: string,
  spouseIsWorking: string,
  hasChildren: boolean
): 'CATEGORY_1' | 'CATEGORY_2' | 'CATEGORY_3' {
  if (maritalStatus === 'Single' || maritalStatus === 'Divorced' || maritalStatus === 'Widowed') {
    return hasChildren ? 'CATEGORY_3' : 'CATEGORY_1';
  }
  if (maritalStatus === 'Married') {
    if (spouseIsWorking === 'No') {
      return 'CATEGORY_2';
    } else {
      return 'CATEGORY_3';
    }
  }
  return 'CATEGORY_1';
}

export interface PCB2026Params {
  employeeTaxProfile: EmployeeTaxProfile;
  employeeChildren?: Dependant[];
  payrollMonth: number;
  currentNormalRemuneration: number;
  currentAdditionalRemuneration: number;
  taxableBenefitsInKind?: number;
  valueOfLivingAccommodation?: number;
  taxablePerquisites?: number;
  taxExemptRemuneration?: number;
  currentQualifyingEPF: number;
  additionalRemunerationQualifyingEPF?: number;
  currentSocsoRelief?: number;
  payrollHistory?: HistoricalPayrollRecord[];
  tp1Declarations?: TP1Declaration[];
  tp3Declaration?: TP3Data;
  currentZakat?: number;
  accumulatedZakat?: number;
  currentDepartureLevy?: number;
  accumulatedDepartureLevy?: number;
  accumulatedPCB?: number;
  cp38Instruction?: number;
  statutoryConfiguration?: PCBConfiguration;
}

export interface PCBConfiguration {
  id: string;
  assessmentYear: number;
  configurationCode: string;
  configurationVersion: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE' | 'ARCHIVED' | 'REJECTED';
  sourceDocumentName: string;
  sourceDocumentVersion: string;
  sourceDocumentDate: string;
  officialCalculatorReference: string;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  activatedBy?: string;
  activatedAt?: string;
}

export function calculatePCB2026(params: PCB2026Params) {
  const {
    employeeTaxProfile,
    employeeChildren,
    payrollMonth,
    currentNormalRemuneration,
    currentAdditionalRemuneration,
    taxableBenefitsInKind,
    valueOfLivingAccommodation,
    taxablePerquisites,
    currentQualifyingEPF,
    additionalRemunerationQualifyingEPF,
    payrollHistory,
    tp1Declarations,
    tp3Declaration,
    currentZakat,
    accumulatedZakat,
    currentDepartureLevy,
    accumulatedDepartureLevy,
    accumulatedPCB,
    cp38Instruction,
    statutoryConfiguration
  } = params;

  const Y1 = dec(currentNormalRemuneration);
  const Yt = dec(currentAdditionalRemuneration);
  const K1 = dec(currentQualifyingEPF);
  const Kt = dec(additionalRemunerationQualifyingEPF || 0);

  const n = 12 - payrollMonth;

  let accumulatedNormal = dec(0);
  let accumulatedAdditional = dec(0);
  let accumulatedEPF = dec(0);
  let accumulatedPaidPCB = dec(accumulatedPCB || 0);
  let accumulatedPaidZakat = dec(accumulatedZakat || 0);
  let accumulatedPaidLevy = dec(accumulatedDepartureLevy || 0);

  if (payrollHistory && payrollHistory.length > 0) {
    for (const record of payrollHistory) {
      if (record.payrollMonth < payrollMonth) {
        const recordNormal = (record.basicSalary || 0) + 
          (record.allowanceGeneral || 0) +
          (record.allowanceTransport || 0) +
          (record.allowanceParking || 0) +
          (record.allowanceMeal || 0) +
          (record.allowanceAccommodation || 0) +
          (record.allowancePhone || 0);
        
        accumulatedNormal = accumulatedNormal.add(recordNormal);

        const recordAdditional = 
          (record.overtime || 0) +
          (record.performanceBonus || 0) +
          (record.bonusAmount || 0) +
          (record.commissionAmount || 0) +
          (record.backPayAmount || 0) +
          (record.awsAmount || 0) +
          (record.compensationAmount || 0);

        accumulatedAdditional = accumulatedAdditional.add(recordAdditional);
        accumulatedEPF = accumulatedEPF.add(record.epfEmployee || 0);
        accumulatedPaidPCB = accumulatedPaidPCB.add(record.actualPCBDeducted || 0);
        accumulatedPaidZakat = accumulatedPaidZakat.add(record.zakat || 0);
        accumulatedPaidLevy = accumulatedPaidLevy.add(0);
      }
    }
  }

  if (tp3Declaration) {
    accumulatedNormal = accumulatedNormal.add(tp3Declaration.previousEmployerRemuneration || tp3Declaration.accumulatedPriorRemuneration || 0);
    accumulatedAdditional = accumulatedAdditional.add(tp3Declaration.previousEmployerAdditionalRemuneration || 0);
    accumulatedEPF = accumulatedEPF.add(tp3Declaration.previousEmployerEpf || tp3Declaration.accumulatedPriorEPF || 0);
    accumulatedPaidPCB = accumulatedPaidPCB.add(tp3Declaration.previousEmployerPcb || tp3Declaration.accumulatedPriorPCB || 0);
    accumulatedPaidZakat = accumulatedPaidZakat.add(tp3Declaration.previousEmployerZakat || 0);
  }

  const Y2 = Y1;

  const annualQualifyingLimit = dec(4000);
  const totalEPFSoFar = accumulatedEPF.add(K1).add(Kt);
  const remainingEPFLimit = Decimal.fromCents(Math.max(0, annualQualifyingLimit.toIntegerCents() - totalEPFSoFar.toIntegerCents()));
  
  let K2 = dec(0);
  if (n > 0) {
    const projectedLimit = remainingEPFLimit.div(n);
    K2 = projectedLimit.toIntegerCents() < K1.toIntegerCents() ? projectedLimit : K1;
  }

  const hasChildren = (employeeChildren && employeeChildren.length > 0) || (employeeTaxProfile.dependantsCount || 0) > 0;
  const category = determineTaxCategory(
    employeeTaxProfile.maritalStatus || 'Single',
    employeeTaxProfile.spouseIsWorking || 'No',
    hasChildren
  );

  let childReliefTotal = 0;
  if (employeeChildren && employeeChildren.length > 0) {
    for (const child of employeeChildren) {
      let childBase = child.isDisabled ? 6000 : 2000;
      if (child.inTertiaryEducation) {
        childReliefTotal += childBase + 8000;
      } else {
        childReliefTotal += childBase;
      }
    }
  } else {
    childReliefTotal = (employeeTaxProfile.dependantsCount || 0) * 2000;
  }

  const tp1Limits: Record<string, number> = {
    tp1_parent_medical: 8000,
    tp1_disabled_equipment: 6000,
    tp1_serious_medical: 10000,
    tp1_medical_exam: 1000,
    tp1_study_fees: 7000,
    tp1_childcare: 3000,
    tp1_life_insurance: 3000,
    tp1_prs: 3000,
    tp1_medical_insurance: 3000,
    tp1_socso_relief: 1000,
    tp1_lifestyle: 2500,
    tp1_breastfeeding: 1000,
    tp1_child_takaful: 3000,
    tp1_child_rehab: 4000,
    tp1_tourism: 1000,
    tp1_sustainability: 2500
  };

  const claimsByCategory: Record<string, { prior: number; current: number }> = {};
  for (const key of Object.keys(tp1Limits)) {
    claimsByCategory[key] = { prior: 0, current: 0 };
  }

  if (tp1Declarations && tp1Declarations.length > 0) {
    for (const d of tp1Declarations) {
      if (d.taxYear === 2026 && (d.approvalStatus === 'APPROVED' || d.approvalStatus === 'Approved')) {
        const cat = d.claimCategory;
        if (claimsByCategory[cat]) {
          if (d.effectivePayrollMonth < payrollMonth) {
            claimsByCategory[cat].prior += d.claimedAmount;
          } else if (d.effectivePayrollMonth === payrollMonth) {
            claimsByCategory[cat].current += d.claimedAmount;
          }
        }
      }
    }
  }

  let accumulatedLP = dec(0);
  let currentLP1 = dec(0);

  for (const [cat, limitVal] of Object.entries(tp1Limits)) {
    const limit = dec(limitVal);
    const priorClaimed = dec(claimsByCategory[cat].prior);
    const currentClaimed = dec(claimsByCategory[cat].current);

    const cappedPrior = priorClaimed.toIntegerCents() > limit.toIntegerCents() ? limit : priorClaimed;
    const remainingLimit = Decimal.fromCents(Math.max(0, limit.toIntegerCents() - cappedPrior.toIntegerCents()));
    const cappedCurrent = currentClaimed.toIntegerCents() > remainingLimit.toIntegerCents() ? remainingLimit : currentClaimed;

    accumulatedLP = accumulatedLP.add(cappedPrior);
    currentLP1 = currentLP1.add(cappedCurrent);
  }

  if (tp3Declaration) {
    const tp3QualDeductions = (tp3Declaration as any).previousQualifyingDeductions || 0;
    accumulatedLP = accumulatedLP.add(tp3QualDeductions);
  }

  const reliefsTotal = dec(9000)
    .add(category === 'CATEGORY_2' ? 4000 : 0)
    .add(employeeTaxProfile.employeeDisabled ? 6000 : 0)
    .add((category === 'CATEGORY_2' && employeeTaxProfile.spouseDisabled) ? 5000 : 0)
    .add(childReliefTotal)
    .add(accumulatedLP)
    .add(currentLP1);

  const Y_minus_K_prior = Decimal.fromCents(Math.max(0, accumulatedNormal.toIntegerCents() - accumulatedEPF.toIntegerCents()));
  const Y1_minus_K1_current = Decimal.fromCents(Math.max(0, Y1.toIntegerCents() - K1.toIntegerCents()));
  const Y2_minus_K2_future = Decimal.fromCents(Math.max(0, Y2.toIntegerCents() - K2.toIntegerCents()));
  const projectedIncome = Y_minus_K_prior.add(Y1_minus_K1_current).add(Y2_minus_K2_future.mul(n));

  const PWithoutCurrentAdditional = Decimal.fromCents(Math.max(0, projectedIncome.toIntegerCents() - reliefsTotal.toIntegerCents()));

  let M = 0;
  let R = 0.0;
  let B = 0;
  let T = 0;
  let annualTaxWithoutCurrentAdditional = dec(0);

  const calcType = employeeTaxProfile.taxCalculationType || 'RESIDENT_PROGRESSIVE';

  if (employeeTaxProfile.taxResidenceStatus === 'NON_RESIDENT') {
    // Non-resident
  } else if (calcType === 'RETURNING_EXPERT_PROGRAMME' || calcType === 'KNOWLEDGE_WORKER_SPECIFIED_REGION') {
    R = 0.15;
    const pVal = PWithoutCurrentAdditional.toNumber();
    if (pVal <= 35000) {
      T = category === 'CATEGORY_2' ? 800 : 400;
    } else {
      T = 0;
    }
    const tax = PWithoutCurrentAdditional.mul(0.15).sub(T);
    annualTaxWithoutCurrentAdditional = Decimal.fromCents(Math.max(0, tax.toIntegerCents()));
  } else if (calcType === 'NON_CITIZEN_C_SUITE_APPROVED_COMPANY') {
    R = 0.15;
    const tax = PWithoutCurrentAdditional.mul(0.15);
    annualTaxWithoutCurrentAdditional = Decimal.fromCents(Math.max(0, tax.toIntegerCents()));
  } else {
    const prog = calculateAnnualTaxProgressive(PWithoutCurrentAdditional, category);
    annualTaxWithoutCurrentAdditional = prog.annualTax;
    M = prog.M;
    R = prog.R;
    B = prog.B;
  }

  const Z = accumulatedPaidZakat.add(accumulatedPaidLevy);
  const X = accumulatedPaidPCB;

  let normalPCBUntruncated = dec(0);
  if (employeeTaxProfile.taxResidenceStatus === 'NON_RESIDENT') {
    const nonResTaxable = Y1.add(taxableBenefitsInKind || 0).add(valueOfLivingAccommodation || 0).add(taxablePerquisites || 0);
    normalPCBUntruncated = nonResTaxable.mul(0.30);
  } else {
    const annualTaxNetOfXAndZ = Decimal.fromCents(Math.max(0, annualTaxWithoutCurrentAdditional.toIntegerCents() - (Z.toIntegerCents() + X.toIntegerCents())));
    if (n + 1 > 0) {
      normalPCBUntruncated = annualTaxNetOfXAndZ.div(n + 1);
    }
  }

  const normalPCBTruncated = Decimal.fromCents(Math.trunc(normalPCBUntruncated.toNumber() * 100));

  let normalPCBAfterMinimumRule = normalPCBTruncated;
  if (employeeTaxProfile.taxResidenceStatus !== 'NON_RESIDENT') {
    if (normalPCBTruncated.toIntegerCents() < 1000) {
      normalPCBAfterMinimumRule = dec(0);
    }
  }

  const currentMonthZakatVal = dec(currentZakat || 0);
  const currentMonthLevyVal = dec(currentDepartureLevy || 0);

  let netNormalPCBCents = normalPCBAfterMinimumRule.toIntegerCents() - (currentMonthZakatVal.toIntegerCents() + currentMonthLevyVal.toIntegerCents());
  if (netNormalPCBCents < 0) {
    netNormalPCBCents = 0;
  }
  const netNormalPCB = Decimal.fromCents(netNormalPCBCents);

  const totalPCBForYearWithoutCurrentAdditional = X.add(normalPCBAfterMinimumRule.mul(n + 1));

  const totalEPFWithBonus = accumulatedEPF.add(K1).add(Kt);
  const remainingEPFLimitWithBonus = Decimal.fromCents(Math.max(0, annualQualifyingLimit.toIntegerCents() - totalEPFWithBonus.toIntegerCents()));
  
  let K2WithBonus = dec(0);
  if (n > 0) {
    const projectedLimit = remainingEPFLimitWithBonus.div(n);
    K2WithBonus = projectedLimit.toIntegerCents() < K1.toIntegerCents() ? projectedLimit : K1;
  }

  const Y_minus_K_prior_with_bonus = Y_minus_K_prior;
  const Y1_minus_K1_current_with_bonus = Y1_minus_K1_current;
  const Yt_minus_Kt_additional = Decimal.fromCents(Math.max(0, Yt.toIntegerCents() - Kt.toIntegerCents()));
  const Y2_minus_K2_future_with_bonus = Decimal.fromCents(Math.max(0, Y2.toIntegerCents() - K2WithBonus.toIntegerCents()));

  const projectedIncomeWithBonus = Y_minus_K_prior_with_bonus
    .add(Y1_minus_K1_current_with_bonus)
    .add(Yt_minus_Kt_additional)
    .add(Y2_minus_K2_future_with_bonus.mul(n));

  const PWithCurrentAdditional = Decimal.fromCents(Math.max(0, projectedIncomeWithBonus.toIntegerCents() - reliefsTotal.toIntegerCents()));

  let annualTaxWithCurrentAdditional = dec(0);
  if (employeeTaxProfile.taxResidenceStatus === 'NON_RESIDENT') {
    // Non-resident
  } else if (calcType === 'RETURNING_EXPERT_PROGRAMME' || calcType === 'KNOWLEDGE_WORKER_SPECIFIED_REGION') {
    const tax = PWithCurrentAdditional.mul(0.15).sub(T);
    annualTaxWithCurrentAdditional = Decimal.fromCents(Math.max(0, tax.toIntegerCents()));
  } else if (calcType === 'NON_CITIZEN_C_SUITE_APPROVED_COMPANY') {
    const tax = PWithCurrentAdditional.mul(0.15);
    annualTaxWithCurrentAdditional = Decimal.fromCents(Math.max(0, tax.toIntegerCents()));
  } else {
    const prog = calculateAnnualTaxProgressive(PWithCurrentAdditional, category);
    annualTaxWithCurrentAdditional = prog.annualTax;
  }

  let additionalPCBUntruncated = dec(0);
  if (employeeTaxProfile.taxResidenceStatus === 'NON_RESIDENT') {
    additionalPCBUntruncated = Yt.mul(0.30);
  } else {
    const diff = annualTaxWithCurrentAdditional.toIntegerCents() - totalPCBForYearWithoutCurrentAdditional.toIntegerCents();
    additionalPCBUntruncated = Decimal.fromCents(Math.max(0, diff));
  }

  const additionalPCBTruncated = Decimal.fromCents(Math.trunc(additionalPCBUntruncated.toNumber() * 100));

  let additionalPCBAfterMinimumRule = additionalPCBTruncated;
  if (employeeTaxProfile.taxResidenceStatus !== 'NON_RESIDENT') {
    if (additionalPCBTruncated.toIntegerCents() < 1000) {
      additionalPCBAfterMinimumRule = dec(0);
    }
  }

  const finalPCBPreFiveSenRounding = netNormalPCB.add(additionalPCBAfterMinimumRule);
  const finalPCBCents = finalPCBPreFiveSenRounding.toIntegerCents();
  const roundedPCBCents = roundUpToFiveSen(finalPCBCents / 100) * 100;
  const finalPCB = Decimal.fromCents(roundedPCBCents);

  return {
    employeeId: employeeTaxProfile.nricPassport || '',
    assessmentYear: 2026,
    payrollMonth,
    taxResidenceStatus: employeeTaxProfile.taxResidenceStatus || 'RESIDENT',
    calculationType: calcType,
    employeeCategory: category,
    Y: accumulatedNormal.toNumber(),
    K: accumulatedEPF.toNumber(),
    Y1: Y1.toNumber(),
    K1: K1.toNumber(),
    Y2: Y2.toNumber(),
    K2: K2.toNumber(),
    Yt: Yt.toNumber(),
    Kt: Kt.toNumber(),
    n,
    D: 9000,
    S: category === 'CATEGORY_2' ? 4000 : 0,
    Du: employeeTaxProfile.employeeDisabled ? 6000 : 0,
    Su: (category === 'CATEGORY_2' && employeeTaxProfile.spouseDisabled) ? 5000 : 0,
    Q: childReliefTotal / 2000,
    C: employeeChildren ? employeeChildren.length : (employeeTaxProfile.dependantsCount || 0),
    accumulatedLP: accumulatedLP.toNumber(),
    currentLP1: currentLP1.toNumber(),
    PWithoutCurrentAdditional: PWithoutCurrentAdditional.toNumber(),
    PWithCurrentAdditional: PWithCurrentAdditional.toNumber(),
    M,
    R,
    B,
    T,
    annualTaxWithoutCurrentAdditional: annualTaxWithoutCurrentAdditional.toNumber(),
    normalPCBUntruncated: normalPCBUntruncated.toNumber(),
    normalPCBTruncated: normalPCBTruncated.toNumber(),
    normalPCBAfterMinimumRule: normalPCBAfterMinimumRule.toNumber(),
    currentMonthZakatOffset: currentMonthZakatVal.toNumber(),
    currentMonthDepartureLevyOffset: currentMonthLevyVal.toNumber(),
    netNormalPCB: netNormalPCB.toNumber(),
    totalPCBForYearWithoutCurrentAdditional: totalPCBForYearWithoutCurrentAdditional.toNumber(),
    annualTaxWithCurrentAdditional: annualTaxWithCurrentAdditional.toNumber(),
    additionalPCBUntruncated: additionalPCBUntruncated.toNumber(),
    additionalPCBTruncated: additionalPCBTruncated.toNumber(),
    additionalPCBAfterMinimumRule: additionalPCBAfterMinimumRule.toNumber(),
    finalPCBPreFiveSenRounding: finalPCBPreFiveSenRounding.toNumber(),
    finalPCB: finalPCB.toNumber(),
    cp38: cp38Instruction || 0,
    totalTaxPayrollDeduction: finalPCB.add(cp38Instruction || 0).toNumber(),
    configurationVersion: statutoryConfiguration?.configurationVersion || 'v1.0.0',
    formulaVersion: 'HASiL 2026 progressive v1',
    calculationTimestamp: new Date().toISOString(),
    warnings: [] as string[],
    errors: [] as string[],
    status: 'calculated'
  };
}

export function calculatePcb2026(
  salary: number,
  maritalStatus: string,
  spouseIsWorking: string,
  dependantsCount: number,
  epfMonthly: number
): number {
  const profile: EmployeeTaxProfile = {
    maritalStatus: maritalStatus as any,
    spouseIsWorking: spouseIsWorking as any,
    dependantsCount: dependantsCount,
    eligibleForStatutory: 'Yes',
    taxResidenceStatus: 'RESIDENT',
    taxCalculationType: 'RESIDENT_PROGRESSIVE'
  } as any;

  const result = calculatePCB2026({
    employeeTaxProfile: profile,
    payrollMonth: 10,
    currentNormalRemuneration: salary,
    currentQualifyingEPF: epfMonthly,
    currentAdditionalRemuneration: 0
  });

  return result.finalPCB;
}

export function getProratedBasicSalary(employee: Employee, month: number, year: number): number {
  if (!employee.dateOfJoined) return employee.basicSalary;
  
  const joinDate = new Date(employee.dateOfJoined);
  if (isNaN(joinDate.getTime())) return employee.basicSalary;
  
  const joinYear = joinDate.getFullYear();
  const joinMonth = joinDate.getMonth() + 1;
  const joinDay = joinDate.getDate();

  // If the pay period is before join year/month: salary is 0
  if (year < joinYear || (year === joinYear && month < joinMonth)) {
    return 0;
  }

  // If the pay period is the join year/month: proration occurs
  if (year === joinYear && month === joinMonth) {
    const calendarDays = new Date(year, month, 0).getDate(); // days in that month
    const activeDays = calendarDays - joinDay + 1;
    if (activeDays <= 0) return 0;
    return parseFloat(((employee.basicSalary / calendarDays) * activeDays).toFixed(2));
  }

  // If the pay period is after join year/month: full salary
  return employee.basicSalary;
}

export function getAdjustedBasicSalary(employee: Employee, month: number, year: number): number {
  const baseline = getProratedBasicSalary(employee, month, year);
  if (baseline === 0) return 0;
  
  if (!employee.salaryAdjustments || employee.salaryAdjustments.length === 0) {
    return baseline;
  }
  
  const activeAdjustments = employee.salaryAdjustments
    .filter(adj => {
      const effDate = new Date(adj.effectiveDate);
      const effYear = effDate.getFullYear();
      const effMonth = effDate.getMonth() + 1;
      return (effYear < year) || (effYear === year && effMonth <= month);
    })
    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    
  if (activeAdjustments.length > 0) {
    const joinDate = new Date(employee.dateOfJoined);
    if (!isNaN(joinDate.getTime())) {
      const joinYear = joinDate.getFullYear();
      const joinMonth = joinDate.getMonth() + 1;
      if (year === joinYear && month === joinMonth) {
        const joinDay = joinDate.getDate();
        const calendarDays = new Date(year, month, 0).getDate();
        const activeDays = calendarDays - joinDay + 1;
        if (activeDays <= 0) return 0;
        return parseFloat(((activeAdjustments[0].adjustedSalary / calendarDays) * activeDays).toFixed(2));
      }
    }
    return activeAdjustments[0].adjustedSalary;
  }
  
  return baseline;
}

export function getEmployeeForMonth(employee: Employee, month: number): Employee {
  const histRecord = (employee.historicalPayrollRecords || []).find(r => r.payrollMonth === month);
  if (!histRecord) {
    return employee;
  }
  
  return {
    ...employee,
    basicSalary: histRecord.basicSalary !== undefined ? histRecord.basicSalary : employee.basicSalary,
    allowanceGeneral: histRecord.allowanceGeneral !== undefined ? histRecord.allowanceGeneral : employee.allowanceGeneral,
    allowanceTransport: histRecord.allowanceTransport !== undefined ? histRecord.allowanceTransport : employee.allowanceTransport,
    allowanceParking: histRecord.allowanceParking !== undefined ? histRecord.allowanceParking : employee.allowanceParking,
    allowanceMeal: histRecord.allowanceMeal !== undefined ? histRecord.allowanceMeal : employee.allowanceMeal,
    allowanceAccommodation: histRecord.allowanceAccommodation !== undefined ? histRecord.allowanceAccommodation : employee.allowanceAccommodation,
    allowancePhone: histRecord.allowancePhone !== undefined ? histRecord.allowancePhone : employee.allowancePhone,
    overtime: histRecord.overtime !== undefined ? histRecord.overtime : employee.overtime,
    bonusAmount: histRecord.bonusAmount !== undefined ? histRecord.bonusAmount : (histRecord.performanceBonus !== undefined ? histRecord.performanceBonus : employee.bonusAmount),
    commissionAmount: histRecord.commissionAmount !== undefined ? histRecord.commissionAmount : employee.commissionAmount,
    backPayAmount: histRecord.backPayAmount !== undefined ? histRecord.backPayAmount : employee.backPayAmount,
    awsAmount: histRecord.awsAmount !== undefined ? histRecord.awsAmount : employee.awsAmount,
    compensationAmount: histRecord.compensationAmount !== undefined ? histRecord.compensationAmount : employee.compensationAmount,
    reimbursementAmount: histRecord.reimbursementAmount !== undefined ? histRecord.reimbursementAmount : employee.reimbursementAmount,
    unpaidLeave: histRecord.unpaidLeave !== undefined ? histRecord.unpaidLeave : employee.unpaidLeave,
    deductionInLieu: histRecord.deductionInLieu !== undefined ? histRecord.deductionInLieu : employee.deductionInLieu,
    deductionCp38: histRecord.deductionCp38 !== undefined ? histRecord.deductionCp38 : (histRecord.cp38 !== undefined ? histRecord.cp38 : employee.deductionCp38),
    deductionOthers: histRecord.deductionOthers !== undefined ? histRecord.deductionOthers : employee.deductionOthers,
    taxPcb: histRecord.actualPCBDeducted !== undefined ? histRecord.actualPCBDeducted : employee.taxPcb
  };
}

export function calculatePayslip(employee: Employee, month?: number, year?: number): PayslipBreakdown {
  const mergedEmployee = month !== undefined ? getEmployeeForMonth(employee, month) : employee;
  const basicSalary = (month !== undefined && year !== undefined)
    ? getAdjustedBasicSalary(mergedEmployee, month, year)
    : (mergedEmployee.basicSalary || 0);

  // Compute individual allowances, falling back to old ones for backwards compatibility
  const allowanceGen = mergedEmployee.allowanceGeneral || 0;
  const allowanceTrans = mergedEmployee.allowanceTransport !== undefined ? mergedEmployee.allowanceTransport : (mergedEmployee.transportAllowance || 0);
  const allowancePark = mergedEmployee.allowanceParking || 0;
  const allowanceMl = mergedEmployee.allowanceMeal || 0;
  const allowanceAccom = mergedEmployee.allowanceAccommodation !== undefined ? mergedEmployee.allowanceAccommodation : (mergedEmployee.housingAllowance || 0);
  const allowancePh = mergedEmployee.allowancePhone || 0;
  
  const allowancesSum = allowanceGen + allowanceTrans + allowancePark + allowanceMl + allowanceAccom + allowancePh;

  // Other dynamic earnings
  const overtimeVal = mergedEmployee.overtime || 0;
  const bonusVal = mergedEmployee.bonusAmount !== undefined ? mergedEmployee.bonusAmount : (mergedEmployee.performanceBonus || 0);
  const commissionVal = mergedEmployee.commissionAmount || 0;
  const backPayVal = mergedEmployee.backPayAmount || 0;
  const awsVal = mergedEmployee.awsAmount || 0;
  const compensationVal = mergedEmployee.compensationAmount || 0;
  
  // Reimbursements (usually non-taxable)
  const reimbursementsSum = mergedEmployee.reimbursementAmount || 0;

  // Gross Earnings subject to statutory deductions / standard gross
  const grossEarnings = 
    basicSalary + 
    allowancesSum + 
    overtimeVal + 
    bonusVal + 
    commissionVal + 
    backPayVal + 
    awsVal + 
    compensationVal;

  const isEligible = 
    mergedEmployee.employmentType === 'Probationary' || 
    mergedEmployee.employmentType === 'Confirmation' || 
    (mergedEmployee.employmentType === 'Independent Contractor / Freelance' && mergedEmployee.eligibleForStatutory === 'Yes');

  const epfRateEmp = mergedEmployee.epfRateEmployee || 11;
  const epfRateEmployerCalculated = basicSalary <= 5000 ? 13 : 12;
  const epfRateEmployer = mergedEmployee.epfRateEmployer || epfRateEmployerCalculated;

  const epfEmployeeValue = isEligible ? Math.round((basicSalary * epfRateEmp) / 100) : 0;
  const epfEmployerValue = isEligible ? Math.round((basicSalary * epfRateEmployer) / 100) : 0;

  // Custom Deductions
  const unpaidLeaveVal = mergedEmployee.unpaidLeave || 0;
  const deductionInLieuVal = mergedEmployee.deductionInLieu || 0;
  const deductionCp38Val = mergedEmployee.deductionCp38 || 0;
  const deductionOthersVal = mergedEmployee.deductionOthers || 0;

  // Calculate 2026 dynamic SOCSO and EIS
  const stat2026 = getStatutoryDeductions2026(basicSalary);
  
  const payrollItems = [
    { code: 'basic_salary', amount: basicSalary },
    { code: 'overtime', amount: overtimeVal },
    { code: 'commission', amount: commissionVal },
    { code: 'allowance_general', amount: allowanceGen },
    { code: 'allowance_transport', amount: allowanceTrans },
    { code: 'allowance_parking', amount: allowancePark },
    { code: 'allowance_meal', amount: allowanceMl },
    { code: 'allowance_accommodation', amount: allowanceAccom },
    { code: 'allowance_phone', amount: allowancePh },
    { code: 'backpay', amount: backPayVal }
  ];
  if (unpaidLeaveVal > 0) {
    payrollItems.push({ code: 'unpaid_leave', amount: unpaidLeaveVal });
  }

  const actMonth = month !== undefined ? month : (new Date().getMonth() + 1);
  const actYear = year !== undefined ? year : new Date().getFullYear();
  const periodStr = `${actYear}-${String(actMonth).padStart(2, '0')}`;

  const socsoRes = calculateSocsoContribution({
    employee: mergedEmployee,
    payrollPeriod: periodStr,
    payrollItems
  });

  const socsoEmployeeVal = isEligible ? socsoRes.employeeInvalidity : 0;
  const socsoEmployerVal = isEligible ? socsoRes.employerSocsoTotal : 0;
  const skbbkEmpVal = isEligible ? socsoRes.employeeLindung24 : 0;
  const skbbkEmplyrVal = 0; // LINDUNG 24 is employee-borne
  const eisEmployeeVal = isEligible ? stat2026.eisEmployee : 0;
  const eisEmployerVal = isEligible ? stat2026.eisEmployer : 0;

  // Dynamic 2026 PCB calculation if basicSalary changed from original or if taxPcb is missing
  const baseEmp = INITIAL_EMPLOYEES.find(e => e.id === mergedEmployee.id);
  const isSalaryChanged = baseEmp ? baseEmp.basicSalary !== basicSalary : false;
  const taxPcbVal = isEligible 
    ? (isSalaryChanged || mergedEmployee.taxPcb === undefined
       ? calculatePcb2026(basicSalary, mergedEmployee.maritalStatus || 'Single', mergedEmployee.spouseIsWorking || 'No', mergedEmployee.dependants?.length || 0, epfEmployeeValue)
       : mergedEmployee.taxPcb)
    : 0;

  // Total Deductions
  const totalDeductions =
    epfEmployeeValue +
    socsoEmployeeVal +
    eisEmployeeVal +
    skbbkEmpVal +
    taxPcbVal +
    unpaidLeaveVal +
    deductionInLieuVal +
    deductionCp38Val +
    deductionOthersVal;

  const totalEmployerContributions =
    epfEmployerValue +
    socsoEmployerVal +
    eisEmployerVal +
    skbbkEmplyrVal +
    (employee.hrdCorp || 0);

  // Net Pay = Gross Earnings + Reimbursements - Total Deductions
  const netPay = grossEarnings + reimbursementsSum - totalDeductions;

  return {
    grossEarnings,
    epfEmployeeValue,
    epfEmployerValue,
    socsoEmployeeVal,
    socsoEmployerVal,
    eisEmployeeVal,
    eisEmployerVal,
    taxPcbVal,
    skbbkEmpVal,
    skbbkEmplyrVal,
    totalDeductions,
    totalEmployerContributions,
    netPay,
    allowancesSum,
    reimbursementsSum
  };
}

export interface YtdBreakdown {
  months: number;
  basicSalary: number;
  allowances: number;
  bonus: number;
  commissions: number;
  backPay: number;
  aws: number;
  compensation: number;
  overtime: number;
  reimbursements: number;
  grossEarnings: number;
  epfEmployee: number;
  epfEmployer: number;
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  skbbkEmployee: number;
  skbbkEmployer: number;
  taxPcb: number;
  totalDeductions: number;
  netPay: number;
}

export function getMonthsMultiplier(period: string): number {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  for (let i = 0; i < months.length; i++) {
    if (period.includes(months[i])) {
      return i + 1;
    }
  }
  return 10; // Default to October (10th month)
}

export function calculateYtd(employee: Employee, period: string): YtdBreakdown {
  const targetMonths = getMonthsMultiplier(period);
  const match = period.match(/\d{4}/);
  const targetYear = match ? parseInt(match[0], 10) : 2026;
  
  // Calculate service months in the target year
  let serviceMonths = targetMonths;
  if (employee.dateOfJoined) {
    const joinDate = new Date(employee.dateOfJoined);
    if (joinDate.getFullYear() > targetYear) {
      serviceMonths = 0;
    } else {
      const endOfMonthInTargetYear = targetMonths - 1; // 0-indexed month of current year (e.g. 9 for Oct)
      const joinMonthInTargetYear = joinDate.getFullYear() === targetYear ? joinDate.getMonth() : 0;
      const monthsWorkedInTargetYear = Math.max(0, endOfMonthInTargetYear - joinMonthInTargetYear + 1);
      serviceMonths = Math.min(targetMonths, monthsWorkedInTargetYear);
    }
  }

  // Multiply individual monthly values
  const monthly = calculatePayslip(employee);

  const allowanceGen = employee.allowanceGeneral || 0;
  const allowanceTrans = employee.allowanceTransport !== undefined ? employee.allowanceTransport : (employee.transportAllowance || 0);
  const allowancePark = employee.allowanceParking || 0;
  const allowanceMl = employee.allowanceMeal || 0;
  const allowanceAccom = employee.allowanceAccommodation !== undefined ? employee.allowanceAccommodation : (employee.housingAllowance || 0);
  const allowancePh = employee.allowancePhone || 0;
  
  const monthlyAllowances = allowanceGen + allowanceTrans + allowancePark + allowanceMl + allowanceAccom + allowancePh;

  let ytdBasic = 0;
  let ytdEpfEmployee = 0;
  let ytdEpfEmployer = 0;
  let ytdSocsoEmployee = 0;
  let ytdSocsoEmployer = 0;
  let ytdEisEmployee = 0;
  let ytdEisEmployer = 0;
  let ytdTaxPcb = 0;
  
  const isEligible = 
    employee.employmentType === 'Probationary' || 
    employee.employmentType === 'Confirmation' || 
    (employee.employmentType === 'Independent Contractor / Freelance' && employee.eligibleForStatutory === 'Yes');

  let startMonth = 1;
  if (employee.dateOfJoined) {
    const joinDate = new Date(employee.dateOfJoined);
    if (joinDate.getFullYear() === targetYear) {
      startMonth = joinDate.getMonth() + 1;
    } else if (joinDate.getFullYear() > targetYear) {
      startMonth = 999;
    }
  }

  for (let m = 1; m <= targetMonths; m++) {
    if (m >= startMonth) {
      const basicSal = getAdjustedBasicSalary(employee, m, targetYear);
      ytdBasic += basicSal;
      
      if (isEligible) {
        const epfRateEmp = employee.epfRateEmployee || 11;
        const epfEmployeeValue = Math.round((basicSal * epfRateEmp) / 100);
        ytdEpfEmployee += epfEmployeeValue;

        const epfRateEmployerCalculated = basicSal <= 5000 ? 13 : 12;
        const epfRateEmployer = employee.epfRateEmployer || epfRateEmployerCalculated;
        const epfEmployerValue = Math.round((basicSal * epfRateEmployer) / 100);
        ytdEpfEmployer += epfEmployerValue;

        const stat2026 = getStatutoryDeductions2026(basicSal);
        ytdSocsoEmployee += stat2026.socsoEmployee;
        ytdSocsoEmployer += stat2026.socsoEmployer;
        ytdEisEmployee += stat2026.eisEmployee;
        ytdEisEmployer += stat2026.eisEmployer;

        const baseEmp = INITIAL_EMPLOYEES.find(e => e.id === employee.id);
        const isSalaryChanged = baseEmp ? baseEmp.basicSalary !== basicSal : true;
        const taxPcbVal = isSalaryChanged || employee.taxPcb === undefined
          ? calculatePcb2026(basicSal, employee.maritalStatus || 'Single', employee.spouseIsWorking || 'No', employee.dependants?.length || 0, epfEmployeeValue)
          : employee.taxPcb;
        ytdTaxPcb += taxPcbVal;
      }
    }
  }

  const ytdAllowances = monthlyAllowances * serviceMonths;
  const ytdOvertime = (employee.overtime || 0) * serviceMonths;
  
  const ytdBonus = employee.bonusAmount !== undefined ? employee.bonusAmount : (employee.performanceBonus || 0);
  const ytdCommissions = (employee.commissionAmount || 0) * Math.min(serviceMonths, 4);
  const ytdBackPay = employee.backPayAmount || 0;
  const ytdAws = employee.awsAmount || 0;
  const ytdCompensation = employee.compensationAmount || 0;
  const ytdReimbursements = (employee.reimbursementAmount || 0) * serviceMonths;

  const ytdGross = ytdBasic + ytdAllowances + ytdOvertime + ytdBonus + ytdCommissions + ytdBackPay + ytdAws + ytdCompensation;

  const ytdSkbbkEmployee = isEligible && serviceMonths > 0 ? parseFloat(((ytdSocsoEmployee / serviceMonths) * 0.25).toFixed(2)) * serviceMonths : 0;
  const ytdSkbbkEmployer = isEligible && serviceMonths > 0 ? parseFloat(((ytdSocsoEmployer / serviceMonths) * 0.25).toFixed(2)) * serviceMonths : 0;
  const ytdEisEmployeeVal = ytdEisEmployee;
  const ytdEisEmployerVal = ytdEisEmployer;

  const ytdUnpaidLeave = (employee.unpaidLeave || 0);
  const ytdDeductionInLieu = (employee.deductionInLieu || 0);
  const ytdDeductionCp38 = (employee.deductionCp38 || 0) * serviceMonths;
  const ytdDeductionOthers = (employee.deductionOthers || 0);

  const ytdDeductions = 
    ytdEpfEmployee + 
    ytdSocsoEmployee + 
    ytdEisEmployee + 
    ytdSkbbkEmployee + 
    ytdTaxPcb + 
    ytdUnpaidLeave + 
    ytdDeductionInLieu + 
    ytdDeductionCp38 + 
    ytdDeductionOthers;

  const ytdNetPay = ytdGross + ytdReimbursements - ytdDeductions;

  return {
    months: serviceMonths,
    basicSalary: ytdBasic,
    allowances: ytdAllowances,
    bonus: ytdBonus,
    commissions: ytdCommissions,
    backPay: ytdBackPay,
    aws: ytdAws,
    compensation: ytdCompensation,
    overtime: ytdOvertime,
    reimbursements: ytdReimbursements,
    grossEarnings: ytdGross,
    epfEmployee: ytdEpfEmployee,
    epfEmployer: ytdEpfEmployer,
    socsoEmployee: ytdSocsoEmployee,
    socsoEmployer: ytdSocsoEmployer,
    eisEmployee: ytdEisEmployee,
    eisEmployer: ytdEisEmployer,
    skbbkEmployee: ytdSkbbkEmployee,
    skbbkEmployer: ytdSkbbkEmployer,
    taxPcb: ytdTaxPcb,
    totalDeductions: ytdDeductions,
    netPay: ytdNetPay
  };
}

export interface UserAccount {
  email: string;
  password: string;
  name: string;
  role: string;
}

export const MOCK_USERS: UserAccount[] = [
  {
    email: 'jennylaw.hr',
    password: 'admin123#',
    name: 'Jenny Law',
    role: 'Global Administrator'
  }
];

export const INITIAL_CANDIDATES: Candidate[] = [];

export const SEED_ENTITIES: CorporateEntity[] = [
  {
    id: 'Red Point Sdn Bhd',
    name: 'Red Point Sdn Bhd',
    registrationNumber: '1534270P (202301040351) Updated Version',
    address: 'No.181, 1st Floor, Hui Sing Garden Commercial Centre, Taman Hui Sing, Kuching 93350, Sarawak, Malaysia.',
    taxReferenceNo: '',
    epfReferenceNo: '802282893',
    socsoReferenceNo: 'F8602107504M',
    currency: 'RM',
    isActive: true,
    logoUrl: '',
    theme: 'theme2',
  },
  {
    id: 'YSYD Sdn Bhd',
    name: 'YSYD Sdn Bhd',
    registrationNumber: '123456',
    address: 'No official registered office address registered.',
    taxReferenceNo: 'Pending Inland Revenue allocation',
    epfReferenceNo: 'Pending EPF registration',
    socsoReferenceNo: 'Pending SOCSO registration',
    currency: 'RM',
    isActive: true,
    logoUrl: '',
    theme: 'theme1',
  }
];

export const SEED_EMPLOYEES: Employee[] = [];
export const SEED_PERFORMANCES: EmployeePerformance[] = [];
export const SEED_CANDIDATES: Candidate[] = [];

export function getEffectiveProfileForMonth(employee: Employee, month: number, year: number): EmployeeTaxProfile {
  const targetDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  if (!employee.effectiveDatedProfiles || employee.effectiveDatedProfiles.length === 0) {
    // Fallback to active current profile
    return {
      effectiveDate: employee.dateOfJoined || '2026-01-01',
      basicSalary: employee.basicSalary,
      housingAllowance: employee.housingAllowance || 0,
      transportAllowance: employee.transportAllowance || 0,
      allowanceGeneral: employee.allowanceGeneral || 0,
      allowanceTransport: employee.allowanceTransport || 0,
      allowanceParking: employee.allowanceParking || 0,
      allowanceMeal: employee.allowanceMeal || 0,
      allowanceAccommodation: employee.allowanceAccommodation || 0,
      allowancePhone: employee.allowancePhone || 0,
      commissionAmount: employee.commissionAmount || 0,
      maritalStatus: employee.maritalStatus || 'Single',
      spouseIsWorking: employee.spouseIsWorking || 'No',
      spouseNric: employee.spouseNric || '',
      spouseName: employee.spouseName || '',
      hasDependants: employee.hasDependants || 'No',
      dependantsCount: employee.dependants?.length || 0,
      eligibleForStatutory: employee.eligibleForStatutory || 'Yes',
      epfRateEmployee: employee.epfRateEmployee || 11,
      epfRateEmployer: employee.epfRateEmployer || 13,
      taxNumber: employee.taxNumber || '',
      nricPassport: employee.nricPassport || '',
      dateOfJoined: employee.dateOfJoined || '',
    };
  }

  // Sort ascending and find the latest one that is <= targetDateStr
  const sorted = [...employee.effectiveDatedProfiles].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  let matched = sorted[0];
  for (const prof of sorted) {
    if (prof.effectiveDate <= targetDateStr) {
      matched = prof;
    }
  }
  return matched;
}

export function getPayrollRecordForMonth(employee: Employee, month: number): HistoricalPayrollRecord {
  const record = employee.historicalPayrollRecords?.find(r => r.payrollMonth === month);
  if (record) return record;
  
  // Build a default from the effective profile
  const profile = getEffectiveProfileForMonth(employee, month, 2026);
  const isEligible = profile.eligibleForStatutory !== 'No';
  const epfEmpRate = profile.epfRateEmployee || 11;
  const epfVal = isEligible ? Math.round((profile.basicSalary * epfEmpRate) / 100) : 0;

  return {
    payrollMonth: month,
    basicSalary: profile.basicSalary,
    allowanceGeneral: profile.allowanceGeneral || 0,
    allowanceTransport: profile.allowanceTransport || 0,
    allowanceParking: profile.allowanceParking || 0,
    allowanceMeal: profile.allowanceMeal || 0,
    allowanceAccommodation: profile.allowanceAccommodation || 0,
    allowancePhone: profile.allowancePhone || 0,
    commissionAmount: profile.commissionAmount || 0,
    epfEmployee: epfVal,
    zakat: 0,
    cp38: 0,
    actualPCBDeducted: 0
  };
}

export function buildPCBContext(params: {
  employee: Employee;
  taxYear: number;
  month: number;
  currentPayroll: HistoricalPayrollRecord;
  priorResults: HistoricalPCBResult[];
  calculationBasis: HistoricalCalculationBasis;
  profile: EmployeeTaxProfile;
}): HistoricalPCBMonthContext {
  const m = params.month;
  
  // Previous employer TP3 data
  const tp3Raw = params.employee.tp3Data || {};
  const tp3: TP3Data = {
    taxYear: tp3Raw.taxYear || params.taxYear,
    previousEmployerRemuneration: tp3Raw.previousEmployerRemuneration !== undefined ? tp3Raw.previousEmployerRemuneration : (tp3Raw.accumulatedPriorRemuneration || 0),
    previousEmployerAdditionalRemuneration: tp3Raw.previousEmployerAdditionalRemuneration || 0,
    previousEmployerEpf: tp3Raw.previousEmployerEpf !== undefined ? tp3Raw.previousEmployerEpf : (tp3Raw.accumulatedPriorEPF || 0),
    previousEmployerPcb: tp3Raw.previousEmployerPcb !== undefined ? tp3Raw.previousEmployerPcb : (tp3Raw.accumulatedPriorPCB || 0),
    previousEmployerZakat: tp3Raw.previousEmployerZakat || 0
  };

  // YTD accumulation from prior results (up to m-1)
  let accumulatedRemuneration = 0;
  let accumulatedAdditionalRemuneration = 0;
  let accumulatedEmployeeEPF = 0;
  let accumulatedPCB = 0;
  let accumulatedZakat = 0;

  for (const prior of params.priorResults) {
    if (prior.payrollMonth < m) {
      accumulatedRemuneration += prior.currentNormalRemuneration;
      accumulatedAdditionalRemuneration += prior.currentAdditionalRemuneration;
      accumulatedEmployeeEPF += prior.currentMonthEmployeeEPF;
      
      // Accumulation depends on Calculation Basis
      if (params.calculationBasis === 'actual_deduction_history') {
        accumulatedPCB += prior.actualPCBDeducted || 0;
      } else {
        accumulatedPCB += prior.calculatedPCB;
      }
      accumulatedZakat += prior.currentZakat;
    }
  }

  // Current month inputs
  const normalAllowanceSum = 
    (params.currentPayroll.allowanceGeneral || 0) +
    (params.currentPayroll.allowanceTransport || 0) +
    (params.currentPayroll.allowanceParking || 0) +
    (params.currentPayroll.allowanceMeal || 0) +
    (params.currentPayroll.allowanceAccommodation || 0) +
    (params.currentPayroll.allowancePhone || 0);

  const currentMonthNormalRemuneration = params.currentPayroll.basicSalary + normalAllowanceSum;
  
  const additionalRemuneration = 
    (params.currentPayroll.overtime || 0) +
    (params.currentPayroll.performanceBonus || 0) +
    (params.currentPayroll.bonusAmount || 0) +
    (params.currentPayroll.commissionAmount || 0) +
    (params.currentPayroll.backPayAmount || 0) +
    (params.currentPayroll.awsAmount || 0) +
    (params.currentPayroll.compensationAmount || 0);

  const currentMonthEmployeeEPF = params.currentPayroll.epfEmployee || 0;
  const currentMonthZakat = params.currentPayroll.zakat || 0;
  const currentMonthCP38 = params.currentPayroll.cp38 || 0;

  // Projection remaining months
  // If termination date is known, projection ends at the termination date
  const terminationDate = params.profile.dateOfTermination;
  let remainingMonths = 12 - m;
  if (terminationDate) {
    const termParts = terminationDate.split('-');
    const termYear = termParts[0] ? Number(termParts[0]) : 2026;
    if (termYear === params.taxYear && termParts[1]) {
      const termMonth = Number(termParts[1]);
      remainingMonths = Math.max(0, termMonth - m);
    }
  }

  const projectedRemainingNormalRemuneration = currentMonthNormalRemuneration;

  return {
    taxYear: params.taxYear,
    payrollMonth: m,
    employeeProfileEffectiveForMonth: params.profile,
    previousEmployerTP3: tp3,
    priorCurrentEmployerPayrolls: [], // conceptually stored in accumulated fields
    currentMonthPayroll: params.currentPayroll,
    accumulatedRemunerationBeforeCurrentMonth: accumulatedRemuneration,
    accumulatedAdditionalRemunerationBeforeCurrentMonth: accumulatedAdditionalRemuneration,
    accumulatedEmployeeEPFBeforeCurrentMonth: accumulatedEmployeeEPF,
    accumulatedPCBBeforeCurrentMonth: accumulatedPCB,
    accumulatedZakatBeforeCurrentMonth: accumulatedZakat,
    currentMonthNormalRemuneration,
    currentMonthAdditionalRemuneration: additionalRemuneration,
    currentMonthEmployeeEPF,
    currentMonthZakat,
    currentMonthCP38,
    projectedRemainingNormalRemuneration,
    remainingApplicableMonths: remainingMonths,
    calculationBasis: params.calculationBasis,
    employeeId: params.employee.id
  };
}

export function calculateAnnualTaxSpec(taxableIncome: number): number {
  let annualTax = 0;
  if (taxableIncome <= 5000) {
    annualTax = 0;
  } else if (taxableIncome <= 20000) {
    annualTax = (taxableIncome - 5000) * 0.01;
  } else if (taxableIncome <= 35000) {
    annualTax = 150 + (taxableIncome - 20000) * 0.03;
  } else if (taxableIncome <= 50000) {
    annualTax = 600 + (taxableIncome - 35000) * 0.06;
  } else if (taxableIncome <= 70000) {
    annualTax = 1500 + (taxableIncome - 50000) * 0.11;
  } else if (taxableIncome <= 100000) {
    annualTax = 3700 + (taxableIncome - 70000) * 0.19;
  } else if (taxableIncome <= 400000) {
    annualTax = 9400 + (taxableIncome - 100000) * 0.25;
  } else if (taxableIncome <= 600000) {
    annualTax = 84400 + (taxableIncome - 400000) * 0.26;
  } else if (taxableIncome <= 2000000) {
    annualTax = 136400 + (taxableIncome - 600000) * 0.28;
  } else {
    annualTax = 528400 + (taxableIncome - 2000000) * 0.30;
  }
  return annualTax;
}

export function calculateMonthlyPCB(context: HistoricalPCBMonthContext): HistoricalPCBResult {
  const profile = context.employeeProfileEffectiveForMonth;
  const tp3 = context.previousEmployerTP3;
  const m = context.payrollMonth;

  // Group TP1 claims from employee profile
  const tp1Declarations = context.employeeProfileEffectiveForMonth ? (context as any).employee?.tp1Declarations : [];

  const res2026 = calculatePCB2026({
    employeeTaxProfile: profile,
    employeeChildren: profile.dependantsCount ? Array(profile.dependantsCount).fill({ isDisabled: false }) : [],
    payrollMonth: m,
    currentNormalRemuneration: context.currentMonthNormalRemuneration,
    currentAdditionalRemuneration: context.currentMonthAdditionalRemuneration,
    currentQualifyingEPF: context.currentMonthEmployeeEPF,
    tp3Declaration: {
      previousEmployerRemuneration: tp3.previousEmployerRemuneration,
      previousEmployerAdditionalRemuneration: tp3.previousEmployerAdditionalRemuneration,
      previousEmployerEpf: tp3.previousEmployerEpf,
      previousEmployerPcb: tp3.previousEmployerPcb,
      previousEmployerZakat: tp3.previousEmployerZakat
    },
    accumulatedPCB: context.accumulatedPCBBeforeCurrentMonth,
    accumulatedZakat: context.accumulatedZakatBeforeCurrentMonth,
    currentZakat: context.currentMonthZakat,
    cp38Instruction: context.currentMonthCP38,
    payrollHistory: [],
    tp1Declarations: tp1Declarations
  });

  const steps: PCBCalculationStep[] = [
    { stepName: "Estimate Annual Normal Remuneration", output: res2026.Y + res2026.Y1 + res2026.Y2 * res2026.n },
    { stepName: "Estimate EPF Relief", output: Math.min(4000, res2026.K + res2026.K1 + res2026.K2 * res2026.n) },
    { stepName: "Compute Total Reliefs", output: res2026.D + (res2026.S || 0) + (res2026.Q || 0) * (res2026.C || 0) + Math.min(4000, res2026.K + res2026.K1 + res2026.K2 * res2026.n) },
    { stepName: "Compute Chargeable Income (Normal)", output: res2026.PWithoutCurrentAdditional },
    { stepName: "Calculate Annual Tax Liability (Normal)", output: res2026.annualTaxWithoutCurrentAdditional },
    { stepName: "Calculate Monthly PCB (Normal)", output: res2026.normalPCBAfterMinimumRule }
  ];

  if (context.currentMonthAdditionalRemuneration > 0) {
    steps.push(
      { stepName: "Estimate Annual Remuneration with Additional Remuneration", output: res2026.Y + res2026.Y1 + res2026.Yt + res2026.Y2 * res2026.n },
      { stepName: "Calculate Annual Tax Liability (with Additional Remuneration)", output: res2026.annualTaxWithCurrentAdditional },
      { stepName: "Calculate Monthly PCB (Additional)", output: res2026.additionalPCBAfterMinimumRule }
    );
  }

  const calculatedPCB = res2026.finalPCB;
  const actualPCBDeducted = context.currentMonthPayroll.actualPCBDeducted;
  const pcbVariance = parseFloat((actualPCBDeducted - calculatedPCB).toFixed(2));

  let status: HistoricalPCBStatus = "calculated";
  if (pcbVariance !== 0) {
    status = "variance_detected";
  }

  return {
    employeeId: context.employeeId,
    taxYear: context.taxYear,
    payrollMonth: m,
    processingMode: "historical_reconstruction",
    calculationBasis: context.calculationBasis,
    effectiveEmployeeProfileVersion: profile.effectiveDate,
    taxConfigurationVersion: "HASiL 2026 progressive v1",
    currentNormalRemuneration: context.currentMonthNormalRemuneration,
    currentAdditionalRemuneration: context.currentMonthAdditionalRemuneration,
    currentMonthEmployeeEPF: context.currentMonthEmployeeEPF,
    accumulatedPriorRemuneration: context.accumulatedRemunerationBeforeCurrentMonth,
    accumulatedPriorAdditionalRemuneration: context.accumulatedAdditionalRemunerationBeforeCurrentMonth,
    accumulatedPriorEPF: context.accumulatedEmployeeEPFBeforeCurrentMonth,
    accumulatedPriorPCB: context.accumulatedPCBBeforeCurrentMonth,
    accumulatedPriorZakat: context.accumulatedZakatBeforeCurrentMonth,
    previousEmployerRemuneration: tp3.previousEmployerRemuneration,
    previousEmployerEPF: tp3.previousEmployerEpf,
    previousEmployerPCB: tp3.previousEmployerPcb,
    previousEmployerZakat: tp3.previousEmployerZakat,
    projectedRemainingRemuneration: context.projectedRemainingNormalRemuneration,
    estimatedAnnualIncome: res2026.PWithCurrentAdditional,
    qualifyingDeductions: res2026.accumulatedLP + res2026.currentLP1,
    personalAndFamilyReliefs: res2026.D + (res2026.S || 0) + (res2026.Du || 0) + (res2026.Su || 0) + (res2026.Q || 0) * (res2026.C || 0),
    approvedTP1Reliefs: res2026.currentLP1,
    estimatedChargeableIncome: res2026.PWithCurrentAdditional,
    estimatedAnnualTax: res2026.annualTaxWithCurrentAdditional,
    normalRemunerationPCB: res2026.netNormalPCB,
    additionalRemunerationPCB: res2026.additionalPCBAfterMinimumRule,
    calculatedPCB,
    actualPCBDeducted,
    pcbVariance,
    currentZakat: context.currentMonthZakat,
    currentCP38: context.currentMonthCP38,
    totalActualTaxDeduction: actualPCBDeducted,
    totalCalculatedTaxDeduction: calculatedPCB,
    calculationTimestamp: new Date().toISOString(),
    calculationVersion: 1,
    status,
    warnings: [] as string[],
    errors: [] as string[],
    calculationBreakdown: steps
  };
}

export function reconstructPCBHistory(params: {
  employee: Employee;
  taxYear: number;
  startMonth: number;
  endMonth: number;
  calculationBasis: HistoricalCalculationBasis;
}): HistoricalPCBResult[] {
  const results: HistoricalPCBResult[] = [];
  const start = Math.max(1, params.startMonth);
  const end = Math.min(12, params.endMonth);

  const joinDate = params.employee.dateOfJoined || '2026-01-01';
  const joinParts = joinDate.split('-');
  const joinYear = joinParts[0] ? Number(joinParts[0]) : 2026;
  const joinMonth = (joinYear === params.taxYear && joinParts[1]) ? Number(joinParts[1]) : 1;

  for (let m = 1; m <= end; m++) {
    if (m < joinMonth) {
      continue;
    }

    const profile = getEffectiveProfileForMonth(params.employee, m, params.taxYear);
    const payroll = getPayrollRecordForMonth(params.employee, m);
    
    const context = buildPCBContext({
      employee: params.employee,
      taxYear: params.taxYear,
      month: m,
      currentPayroll: payroll,
      priorResults: results,
      calculationBasis: params.calculationBasis,
      profile
    });
    
    const result = calculateMonthlyPCB(context);
    results.push(result);
  }

  return results.filter(r => r.payrollMonth >= start && r.payrollMonth <= end);
}

export function recalculatePCBFromMonth(params: {
  employee: Employee;
  taxYear: number;
  changedMonth: number;
  calculationBasis: HistoricalCalculationBasis;
}): HistoricalPCBResult[] {
  const joinDate = params.employee.dateOfJoined || '2026-01-01';
  const joinParts = joinDate.split('-');
  const joinYear = joinParts[0] ? Number(joinParts[0]) : 2026;
  const joinMonth = (joinYear === params.taxYear && joinParts[1]) ? Number(joinParts[1]) : 1;

  const results: HistoricalPCBResult[] = [];
  
  for (let m = 1; m <= 12; m++) {
    if (m < joinMonth) continue;
    
    const profile = getEffectiveProfileForMonth(params.employee, m, params.taxYear);
    const payroll = getPayrollRecordForMonth(params.employee, m);
    
    const context = buildPCBContext({
      employee: params.employee,
      taxYear: params.taxYear,
      month: m,
      currentPayroll: payroll,
      priorResults: results,
      calculationBasis: params.calculationBasis,
      profile
    });
    
    const res = calculateMonthlyPCB(context);
    res.processingMode = m === params.changedMonth ? "historical_recalculation" : "historical_reconstruction";
    results.push(res);
  }
  
  return results;
}

export function getDirectLogoUrl(url: string | undefined): string {
  if (!url) return '';
  // Check if it's a Google Drive link
  if (url.includes('drive.google.com')) {
    // Extract file ID
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://docs.google.com/uc?export=download&id=${match[1]}`;
    }
  }
  return url;
}

