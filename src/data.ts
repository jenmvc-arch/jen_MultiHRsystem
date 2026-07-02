/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

export const INITIAL_ENTITIES: CorporateEntity[] = [];

export const INITIAL_EMPLOYEES: Employee[] = [];

export const INITIAL_REVIEW_CYCLES: ReviewCycle[] = [];

export const INITIAL_PERFORMANCES: EmployeePerformance[] = [];

export interface PayslipBreakdown {
  grossEarnings: number;
  epfEmployeeValue: number;
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

export function calculatePcb2026(
  salary: number,
  maritalStatus: string,
  spouseIsWorking: string,
  dependantsCount: number,
  epfMonthly: number
): number {
  const annualGross = salary * 12;
  const annualEpfRelief = Math.min(4000, epfMonthly * 12);
  const personalRelief = 9000;
  const spouseRelief = (maritalStatus === 'Married' && spouseIsWorking === 'No') ? 4000 : 0;
  const childRelief = dependantsCount * 2000;
  
  const totalRelief = personalRelief + spouseRelief + childRelief + annualEpfRelief;
  const taxableIncome = Math.max(0, annualGross - totalRelief);
  
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
  
  return parseFloat((annualTax / 12).toFixed(2));
}

export function calculatePayslip(employee: Employee): PayslipBreakdown {
  // Compute individual allowances, falling back to old ones for backwards compatibility
  const allowanceGen = employee.allowanceGeneral || 0;
  const allowanceTrans = employee.allowanceTransport !== undefined ? employee.allowanceTransport : (employee.transportAllowance || 0);
  const allowancePark = employee.allowanceParking || 0;
  const allowanceMl = employee.allowanceMeal || 0;
  const allowanceAccom = employee.allowanceAccommodation !== undefined ? employee.allowanceAccommodation : (employee.housingAllowance || 0);
  const allowancePh = employee.allowancePhone || 0;
  
  const allowancesSum = allowanceGen + allowanceTrans + allowancePark + allowanceMl + allowanceAccom + allowancePh;

  // Other dynamic earnings
  const overtimeVal = employee.overtime || 0;
  const bonusVal = employee.bonusAmount !== undefined ? employee.bonusAmount : (employee.performanceBonus || 0);
  const commissionVal = employee.commissionAmount || 0;
  const backPayVal = employee.backPayAmount || 0;
  const awsVal = employee.awsAmount || 0;
  const compensationVal = employee.compensationAmount || 0;
  
  // Reimbursements (usually non-taxable)
  const reimbursementsSum = employee.reimbursementAmount || 0;

  // Gross Earnings subject to statutory deductions / standard gross
  const grossEarnings = 
    employee.basicSalary + 
    allowancesSum + 
    overtimeVal + 
    bonusVal + 
    commissionVal + 
    backPayVal + 
    awsVal + 
    compensationVal;

  const isEligible = 
    employee.employmentType === 'Probationary' || 
    employee.employmentType === 'Confirmation' || 
    (employee.employmentType === 'Independent Contractor / Freelance' && employee.eligibleForStatutory === 'Yes');

  const epfRateEmp = employee.epfRateEmployee || 11;
  const epfRateEmployerCalculated = employee.basicSalary <= 5000 ? 13 : 12;
  const epfRateEmployer = employee.epfRateEmployer || epfRateEmployerCalculated;

  const epfEmployeeValue = isEligible ? Math.round((employee.basicSalary * epfRateEmp) / 100) : 0;
  const epfEmployerValue = isEligible ? Math.round((employee.basicSalary * epfRateEmployer) / 100) : 0;

  // Calculate 2026 dynamic SOCSO and EIS
  const stat2026 = getStatutoryDeductions2026(employee.basicSalary);
  
  const socsoEmployeeVal = isEligible ? stat2026.socsoEmployee : 0;
  const socsoEmployerVal = isEligible ? stat2026.socsoEmployer : 0;
  const eisEmployeeVal = isEligible ? stat2026.eisEmployee : 0;
  const eisEmployerVal = isEligible ? stat2026.eisEmployer : 0;

  // Custom Deductions
  const unpaidLeaveVal = employee.unpaidLeave || 0;
  const deductionInLieuVal = employee.deductionInLieu || 0;
  const deductionCp38Val = employee.deductionCp38 || 0;
  const deductionOthersVal = employee.deductionOthers || 0;

  // Dynamic 2026 PCB calculation if basicSalary changed from original or if taxPcb is missing
  const baseEmp = INITIAL_EMPLOYEES.find(e => e.id === employee.id);
  const isSalaryChanged = baseEmp ? baseEmp.basicSalary !== employee.basicSalary : true;
  const taxPcbVal = isEligible 
    ? (isSalaryChanged || employee.taxPcb === undefined
       ? calculatePcb2026(employee.basicSalary, employee.maritalStatus || 'Single', employee.spouseIsWorking || 'No', employee.dependants?.length || 0, epfEmployeeValue)
       : employee.taxPcb)
    : 0;

  // Total Deductions
  const skbbkEmpVal = isEligible ? parseFloat((socsoEmployeeVal * 0.25).toFixed(2)) : 0;
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

  const skbbkEmplyrVal = isEligible ? parseFloat((socsoEmployerVal * 0.25).toFixed(2)) : 0;
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

  const ytdBasic = employee.basicSalary * serviceMonths;
  const ytdAllowances = monthlyAllowances * serviceMonths;
  const ytdOvertime = (employee.overtime || 0) * serviceMonths;
  
  const ytdBonus = employee.bonusAmount !== undefined ? employee.bonusAmount : (employee.performanceBonus || 0);
  const ytdCommissions = (employee.commissionAmount || 0) * Math.min(serviceMonths, 4);
  const ytdBackPay = employee.backPayAmount || 0;
  const ytdAws = employee.awsAmount || 0;
  const ytdCompensation = employee.compensationAmount || 0;
  const ytdReimbursements = (employee.reimbursementAmount || 0) * serviceMonths;

  const ytdGross = ytdBasic + ytdAllowances + ytdOvertime + ytdBonus + ytdCommissions + ytdBackPay + ytdAws + ytdCompensation;

  const ytdEpfEmployee = monthly.epfEmployeeValue * serviceMonths;
  const isEligible = 
    employee.employmentType === 'Probationary' || 
    employee.employmentType === 'Confirmation' || 
    (employee.employmentType === 'Independent Contractor / Freelance' && employee.eligibleForStatutory === 'Yes');

  const epfRateEmp = employee.epfRateEmployee || 11;
  const epfRateEmployerCalculated = employee.basicSalary <= 5000 ? 13 : 12;
  const epfRateEmployer = employee.epfRateEmployer || epfRateEmployerCalculated;
  const epfEmployerValue = isEligible ? Math.round((employee.basicSalary * epfRateEmployer) / 100) : 0;
  const ytdEpfEmployer = epfEmployerValue * serviceMonths;

  // 2026 Dynamic Calculations for YTD
  const stat2026 = getStatutoryDeductions2026(employee.basicSalary);
  const socsoEmployeeVal = isEligible ? stat2026.socsoEmployee : 0;
  const socsoEmployerVal = isEligible ? stat2026.socsoEmployer : 0;
  const eisEmployeeVal = isEligible ? stat2026.eisEmployee : 0;
  const eisEmployerVal = isEligible ? stat2026.eisEmployer : 0;

  const ytdSocsoEmployee = socsoEmployeeVal * serviceMonths;
  const ytdSocsoEmployer = socsoEmployerVal * serviceMonths;
  
  const skbbkEmployeeValYtd = isEligible ? parseFloat((socsoEmployeeVal * 0.25).toFixed(2)) : 0;
  const skbbkEmployerValYtd = isEligible ? parseFloat((socsoEmployerVal * 0.25).toFixed(2)) : 0;
  const ytdSkbbkEmployee = skbbkEmployeeValYtd * serviceMonths;
  const ytdSkbbkEmployer = skbbkEmployerValYtd * serviceMonths;
  const ytdEisEmployee = eisEmployeeVal * serviceMonths;
  const ytdEisEmployer = eisEmployerVal * serviceMonths;

  // Dynamic 2026 PCB calculation
  const baseEmp = INITIAL_EMPLOYEES.find(e => e.id === employee.id);
  const isSalaryChanged = baseEmp ? baseEmp.basicSalary !== employee.basicSalary : true;
  const taxPcbVal = isEligible 
    ? (isSalaryChanged || employee.taxPcb === undefined
       ? calculatePcb2026(employee.basicSalary, employee.maritalStatus || 'Single', employee.spouseIsWorking || 'No', employee.dependants?.length || 0, monthly.epfEmployeeValue)
       : employee.taxPcb)
    : 0;
  const ytdTaxPcb = taxPcbVal * serviceMonths;

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
  const tp3: TP3Data = params.employee.tp3Data || {
    taxYear: params.taxYear,
    previousEmployerRemuneration: 0,
    previousEmployerAdditionalRemuneration: 0,
    previousEmployerEpf: 0,
    previousEmployerPcb: 0,
    previousEmployerZakat: 0
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
    remainingApplicableMonths: remainingMonths
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
  const steps: PCBCalculationStep[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const profile = context.employeeProfileEffectiveForMonth;
  const tp3 = context.previousEmployerTP3;
  const m = context.payrollMonth;
  const n = context.remainingApplicableMonths;

  // Step 1: Calculate Normal Annual Income without additional remuneration
  const normalAnnualGross = 
    context.accumulatedRemunerationBeforeCurrentMonth +
    tp3.previousEmployerRemuneration +
    context.currentMonthNormalRemuneration +
    (context.projectedRemainingNormalRemuneration * n);

  steps.push({
    stepName: "Estimate Annual Normal Remuneration",
    inputs: {
      accumulatedPrior: context.accumulatedRemunerationBeforeCurrentMonth,
      previousEmployer: tp3.previousEmployerRemuneration,
      currentMonth: context.currentMonthNormalRemuneration,
      projectedFuture: context.projectedRemainingNormalRemuneration,
      remainingMonths: n
    },
    output: normalAnnualGross
  });

  // Step 2: Calculate Annual EPF relief (capped at 4000)
  const annualEpf = 
    context.accumulatedEmployeeEPFBeforeCurrentMonth +
    tp3.previousEmployerEpf +
    context.currentMonthEmployeeEPF +
    (context.currentMonthEmployeeEPF * n);

  const epfRelief = Math.min(4000, annualEpf);

  steps.push({
    stepName: "Estimate EPF Relief",
    inputs: { annualEpf, limit: 4000 },
    output: epfRelief
  });

  // Step 3: Compute reliefs
  const personalRelief = 9000;
  const spouseRelief = (profile.maritalStatus === 'Married' && profile.spouseIsWorking === 'No') ? 4000 : 0;
  const childRelief = (profile.dependantsCount || 0) * 2000;
  
  const totalReliefs = personalRelief + spouseRelief + childRelief + epfRelief;

  steps.push({
    stepName: "Compute Total Reliefs",
    inputs: { personalRelief, spouseRelief, childRelief, epfRelief },
    output: totalReliefs
  });

  // Step 4: Taxable Income (Chargeable Income) for Normal Remuneration
  const chargeableIncomeNormal = Math.max(0, normalAnnualGross - totalReliefs);

  steps.push({
    stepName: "Compute Chargeable Income (Normal)",
    output: chargeableIncomeNormal
  });

  // Step 5: Annual Tax Liability for Normal Remuneration
  const annualTaxNormal = calculateAnnualTaxSpec(chargeableIncomeNormal);

  steps.push({
    stepName: "Calculate Annual Tax Liability (Normal)",
    output: annualTaxNormal
  });

  // Step 6: Normal PCB Deduction
  const accumulatedPCBPaid = context.accumulatedPCBBeforeCurrentMonth + tp3.previousEmployerPcb;
  
  const netAnnualTaxNormal = Math.max(0, annualTaxNormal);
  const normalPCB = parseFloat(Math.max(0, (netAnnualTaxNormal - accumulatedPCBPaid) / (n + 1)).toFixed(2));

  steps.push({
    stepName: "Calculate Monthly PCB (Normal)",
    inputs: {
      netAnnualTaxNormal,
      accumulatedPCBPaid,
      remainingMonthsPlusOne: n + 1
    },
    output: normalPCB
  });

  // Step 7: Additional Remuneration PCB (if any)
  let additionalPCB = 0;
  let estimatedAnnualIncomeWithBonus = normalAnnualGross;
  let estimatedAnnualTaxWithBonus = annualTaxNormal;

  if (context.currentMonthAdditionalRemuneration > 0) {
    estimatedAnnualIncomeWithBonus = normalAnnualGross + context.currentMonthAdditionalRemuneration + context.accumulatedAdditionalRemunerationBeforeCurrentMonth + (tp3.previousEmployerAdditionalRemuneration || 0);
    
    steps.push({
      stepName: "Estimate Annual Remuneration with Additional Remuneration",
      output: estimatedAnnualIncomeWithBonus
    });

    const chargeableIncomeAdditional = Math.max(0, estimatedAnnualIncomeWithBonus - totalReliefs);
    estimatedAnnualTaxWithBonus = calculateAnnualTaxSpec(chargeableIncomeAdditional);

    steps.push({
      stepName: "Calculate Annual Tax Liability (with Additional Remuneration)",
      output: estimatedAnnualTaxWithBonus
    });

    additionalPCB = parseFloat(Math.max(0, estimatedAnnualTaxWithBonus - annualTaxNormal).toFixed(2));
    
    steps.push({
      stepName: "Calculate Monthly PCB (Additional)",
      inputs: {
        estimatedAnnualTaxWithBonus,
        annualTaxNormal
      },
      output: additionalPCB
    });
  }

  const calculatedPCB = parseFloat((normalPCB + additionalPCB).toFixed(2));
  const actualPCBDeducted = context.currentMonthPayroll.actualPCBDeducted;
  const pcbVariance = parseFloat((actualPCBDeducted - calculatedPCB).toFixed(2));

  // Determine status
  let status: HistoricalPCBStatus = "calculated";
  if (pcbVariance !== 0) {
    status = "variance_detected";
  }

  return {
    employeeId: context.currentMonthPayroll.employeeId || '',
    taxYear: 2026,
    payrollMonth: m,
    processingMode: "historical_reconstruction",
    calculationBasis: context.calculationBasis,
    effectiveEmployeeProfileVersion: profile.effectiveDate,
    taxConfigurationVersion: "HASiL 2026 spec v1",
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
    estimatedAnnualIncome: estimatedAnnualIncomeWithBonus,
    qualifyingDeductions: totalReliefs - personalRelief - spouseRelief - childRelief,
    personalAndFamilyReliefs: personalRelief + spouseRelief + childRelief,
    approvedTP1Reliefs: 0,
    estimatedChargeableIncome: Math.max(0, estimatedAnnualIncomeWithBonus - totalReliefs),
    estimatedAnnualTax: estimatedAnnualTaxWithBonus,
    normalRemunerationPCB: normalPCB,
    additionalRemunerationPCB: additionalPCB,
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
    warnings,
    errors,
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

