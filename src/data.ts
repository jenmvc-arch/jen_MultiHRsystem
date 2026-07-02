/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CorporateEntity, Employee, ReviewCycle, EmployeePerformance, Candidate } from './types';

export const INITIAL_ENTITIES: CorporateEntity[] = [];

export const INITIAL_EMPLOYEES: Employee[] = [];

export const INITIAL_REVIEW_CYCLES: ReviewCycle[] = [
  {
    id: 'cycle-2026-annual',
    name: 'Annual Review 2026',
    period: 'Jan 1 - Feb 28, 2026',
    status: 'In Progress'
  },
  {
    id: 'cycle-2026-q1-probation',
    name: 'Q1 Probation Review',
    period: 'Mar 1 - Mar 31, 2026',
    status: 'Upcoming'
  },
  {
    id: 'cycle-2026-mid-year',
    name: 'Mid-Year Review 2026',
    period: 'Jun 1 - Jul 15, 2026',
    status: 'Completed'
  }
];

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
  },
  {
    email: 'admin@acme.com',
    password: 'password123',
    name: 'Mei Jern Law',
    role: 'Global Administrator'
  },
  {
    email: 'hr.manager@acme.com',
    password: 'password456',
    name: 'Jane Manager',
    role: 'HR Manager'
  },
  {
    email: 'employee@acme.com',
    password: 'password789',
    name: 'Sarah Jenkins',
    role: 'Employee'
  }
];

export const INITIAL_CANDIDATES: Candidate[] = [];

export const SEED_ENTITIES: CorporateEntity[] = [
  {
    id: 'ENT-01',
    name: 'Acme Technologies Sdn Bhd',
    registrationNumber: '202101038472 (1438920-K)',
    address: 'Level 28, Menara Binjai, No. 2 Jalan Binjai, 50450 Kuala Lumpur, Malaysia',
    taxReferenceNo: 'C 29481729010',
    epfReferenceNo: 'EPF-MY-8817263',
    socsoReferenceNo: 'SOC-MY-1029485',
    currency: 'RM',
    isActive: true,
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80',
    theme: 'theme1',
  },
  {
    id: 'ENT-02',
    name: 'Acme Consulting Global Ltd',
    registrationNumber: 'LL18273',
    address: 'Suite 15-02, Level 15, GTower, 199 Jalan Tun Razak, 50400 Kuala Lumpur, Malaysia',
    taxReferenceNo: 'C 84729103847',
    epfReferenceNo: 'EPF-MY-3392812',
    socsoReferenceNo: 'SOC-MY-9982736',
    currency: 'RM',
    isActive: true,
    logoUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=120&h=120&q=80',
    theme: 'theme2',
  },
  {
    id: 'ENT-03',
    name: 'Acme Operations & Logistics Sdn Bhd',
    registrationNumber: '202302049182 (1503948-V)',
    address: 'Lot 4.22, Level 4, Plaza Sentral, Jalan Stesen Sentral 5, 50470 Kuala Lumpur, Malaysia',
    taxReferenceNo: 'C 94817263541',
    epfReferenceNo: 'EPF-MY-4481729',
    socsoReferenceNo: 'SOC-MY-2204918',
    currency: 'RM',
    isActive: true,
    logoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=120&h=120&q=80',
    theme: 'theme3',
  },
];

export const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-84729',
    entityId: 'ENT-01',
    name: 'Sarah Jenkins',
    email: 's.jenkins@acme-global.com',
    designation: 'Senior UX Designer',
    department: 'Product & Engineering',
    status: 'Active',
    bankName: 'Maybank Berhad',
    accountNo: '1642 9845 2210',
    basicSalary: 8500,
    housingAllowance: 1200,
    transportAllowance: 600,
    overtime: 0,
    performanceBonus: 0,
    epfRateEmployee: 11,
    epfRateEmployer: 12,
    socsoEmployee: 29.15,
    socsoEmployer: 101.50,
    eisEmployee: 11.90,
    eisEmployer: 11.90,
    taxPcb: 609.17,
    unpaidLeave: 0,
    hrdCorp: 103,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&h=256&fit=crop',
    nricPassport: '920815-14-5394',
    nationality: 'Malaysian',
    contactNumber: '+60 12-345 6789',
    taxNumber: 'SG 29481729010',
    epfNumber: 'EP-29481729010',
    employmentType: 'Confirmation',
    skbbkEmployee: 7.29,
    skbbkEmployer: 25.38,
    maritalStatus: 'Single',
    emergencyContactName: 'Robert Jenkins',
    emergencyContactRelation: 'Father',
    emergencyContactPhone: '+60 12-987 6543',
    dateOfJoined: '2021-03-15',
    careerHistory: [
      { id: 'h1', date: '2021-03-15', type: 'Hired', previousValue: '-', newValue: 'Senior UX Designer (Full-Time)', notes: 'Enrolled in Product & Engineering department.' },
      { id: 'h2', date: '2022-04-01', type: 'Salary Revision', previousValue: 'RM 7,500', newValue: 'RM 8,500', notes: 'Annual increment based on exceptional performance review.' }
    ]
  },
  {
    id: 'EMP-001',
    entityId: 'ENT-01',
    name: 'Jane Doe',
    email: 'jane.doe@enterprise.com',
    designation: 'Senior Developer',
    department: 'Engineering',
    status: 'Active',
    bankName: 'Maybank Berhad',
    accountNo: '1245 9876 5432',
    basicSalary: 9500,
    housingAllowance: 1000,
    transportAllowance: 400,
    overtime: 0,
    performanceBonus: 1200,
    epfRateEmployee: 11,
    epfRateEmployer: 12,
    socsoEmployee: 29.15,
    socsoEmployer: 101.50,
    eisEmployee: 11.90,
    eisEmployer: 11.90,
    skbbkEmployee: 7.29,
    skbbkEmployer: 25.38,
    taxPcb: 735.83,
    unpaidLeave: 0,
    hrdCorp: 103,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&h=256&fit=crop',
    nricPassport: '880124-10-5226',
    nationality: 'Malaysian',
    contactNumber: '+60 11-2345 6789',
    taxNumber: 'SG 10294857211',
    epfNumber: 'EP-10294857211',
    employmentType: 'Confirmation',
    maritalStatus: 'Married',
    emergencyContactName: 'John Doe',
    emergencyContactRelation: 'Spouse',
    emergencyContactPhone: '+60 11-9876 5432',
    dateOfJoined: '2019-06-01',
    spouseName: 'John Doe',
    spouseNric: '850320-14-1123',
    spouseIsWorking: 'Yes',
    spouseCompany: 'Tech Corp Sdn Bhd',
    spousePosition: 'Lead Architect',
    hasDependants: 'Yes',
    dependants: [
      { id: 'd1', name: 'Tommy Doe', gender: 'Male', dob: '2016-04-12' },
      { id: 'd2', name: 'Lily Doe', gender: 'Female', dob: '2019-10-25' }
    ],
    careerHistory: [
      { id: 'j1', date: '2019-06-01', type: 'Hired', previousValue: '-', newValue: 'Developer (Full-Time)', notes: 'Joined the core backend team.' },
      { id: 'j2', date: '2021-07-01', type: 'Promotion', previousValue: 'Developer', newValue: 'Senior Developer', notes: 'Promoted for successful delivery of the microservices system.' },
      { id: 'j3', date: '2023-01-15', type: 'Salary Revision', previousValue: 'RM 8,500', newValue: 'RM 9,500', notes: 'Adjustment for key staff retention.' }
    ]
  },
  {
    id: 'EMP-042',
    entityId: 'ENT-02',
    name: 'Alan Smith',
    email: 'alan.smith@enterprise.com',
    designation: 'Product Manager',
    department: 'Product',
    status: 'On Leave',
    bankName: 'Maybank Berhad',
    accountNo: '1642 9845 1123',
    basicSalary: 7800,
    housingAllowance: 800,
    transportAllowance: 300,
    overtime: 250,
    performanceBonus: 0,
    epfRateEmployee: 11,
    epfRateEmployer: 13,
    socsoEmployee: 0,
    socsoEmployer: 0,
    eisEmployee: 0,
    eisEmployer: 0,
    skbbkEmployee: 0,
    skbbkEmployer: 0,
    taxPcb: 620,
    unpaidLeave: 0,
    hrdCorp: 80,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&fit=crop',
    nricPassport: 'A59483721',
    nationality: 'British',
    contactNumber: '+60 14-876 5432',
    taxNumber: 'SG 84729103847',
    epfNumber: 'EP-84729103847',
    employmentType: 'Independent Contractor / Freelance',
    maritalStatus: 'Married',
    eligibleForStatutory: 'No',
    emergencyContactName: 'Emma Smith',
    emergencyContactRelation: 'Spouse',
    emergencyContactPhone: '+44 7911 123456',
    dateOfJoined: '2022-01-10',
    spouseName: 'Emma Smith',
    spouseNric: 'A1948375',
    spouseIsWorking: 'No',
    hasDependants: 'No',
    dependants: [],
    careerHistory: [
      { id: 'a1', date: '2022-01-10', type: 'Hired', previousValue: '-', newValue: 'Product Manager (Contract)', notes: 'Initial 2-year contract for Lumina project.' }
    ]
  },
  {
    id: 'EMP-089',
    entityId: 'ENT-03',
    name: 'Michael Johnson',
    email: 'mjohnson@enterprise.com',
    designation: 'HR Specialist',
    department: 'Human Resources',
    status: 'Active',
    bankName: 'CIMB Bank Berhad',
    accountNo: '1422 9875 1102',
    basicSalary: 6200,
    housingAllowance: 600,
    transportAllowance: 300,
    overtime: 0,
    performanceBonus: 0,
    epfRateEmployee: 11,
    epfRateEmployer: 12,
    socsoEmployee: 29.15,
    socsoEmployer: 101.50,
    eisEmployee: 11.90,
    eisEmployer: 11.90,
    skbbkEmployee: 7.29,
    skbbkEmployer: 25.38,
    taxPcb: 229.50,
    unpaidLeave: 0,
    hrdCorp: 65,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&h=256&fit=crop',
    nricPassport: '941203-08-6115',
    nationality: 'Malaysian',
    contactNumber: '+60 16-778 8991',
    taxNumber: 'SG 94817263541',
    epfNumber: 'EP-94817263541',
    employmentType: 'Confirmation',
    maritalStatus: 'Single',
    emergencyContactName: 'Mary Johnson',
    emergencyContactRelation: 'Mother',
    emergencyContactPhone: '+60 16-112 2334',
    dateOfJoined: '2023-02-01',
    careerHistory: [
      { id: 'm1', date: '2023-02-01', type: 'Hired', previousValue: '-', newValue: 'HR Specialist (Full-Time)', notes: 'Onboarded to manage talent acquisition operations.' }
    ]
  }
];

export const SEED_PERFORMANCES: EmployeePerformance[] = [
  {
    employeeId: 'EMP-001',
    reviewCycleId: 'cycle-2026-annual',
    managerName: 'Sarah Connor',
    reviewStatus: 'Completed',
    rating: 4.0,
    teamworkScore: 4,
    communicationScore: 3,
    problemSolvingScore: 5,
    selfEvaluation: 'This year I successfully led the migration of our legacy systems to the new cloud infrastructure ahead of schedule. I also mentored two junior developers and improved our CI/CD pipeline efficiency by 30%. I struggled slightly with cross-department communication during Q2 but have since implemented regular syncs to improve transparency.',
    managerComments: 'Jane has had an outstanding year. Her technical contributions are exemplary, particularly the cloud migration project. We will focus on enhancing her cross-team communication in the coming year to prepare her for a staff-level role.',
    goals: [
      'Lead frontend architecture for Project Nova.',
      'Complete Advanced AWS Certification by Q3.',
      'Improve presentation skills for stakeholder meetings.'
    ]
  },
  {
    employeeId: 'EMP-042',
    reviewCycleId: 'cycle-2026-annual',
    managerName: 'John Connor',
    reviewStatus: 'In Progress',
    rating: 0,
    teamworkScore: 3,
    communicationScore: 4,
    problemSolvingScore: 3,
    selfEvaluation: 'I managed the launch of the new product line and successfully coordinated the product design phase. I feel I can improve on feature prioritization and roadmap estimates to prevent delay.',
    managerComments: 'Alan shows strong ownership of products but needs to align more closely with engineering regarding scope creep. We will work together on technical estimation frameworks.',
    goals: [
      'Deliver the phase 2 product roadmap on schedule.',
      'Enroll in Agile Product Management certification course.',
      'Organize monthly customer feedback synthesis sessions.'
    ]
  },
  {
    employeeId: 'EMP-089',
    reviewCycleId: 'cycle-2026-annual',
    managerName: 'David Brent',
    reviewStatus: 'Not Started',
    rating: 0,
    teamworkScore: 4,
    communicationScore: 4,
    problemSolvingScore: 4,
    selfEvaluation: 'I streamlined the onboarding process this year, cutting onboarding time by 4 days. I also led 3 critical hiring waves for engineering.',
    managerComments: 'Evaluation pending. Michael is reliable and has great interpersonal skills.',
    goals: [
      'Reduce recruiter response time to under 48 hours.',
      'Implement structured HR feedback loops via automated surveys.',
      'Coordinate the 2026 internal training schedule.'
    ]
  }
];

export const SEED_CANDIDATES: Candidate[] = [
  {
    id: 'CAN-01',
    name: 'Muhammad Harith bin Roslan',
    email: 'harith.roslan@outlook.com',
    phone: '+60 12-384 1928',
    designation: 'Senior DevOps Engineer',
    department: 'Engineering',
    entityId: 'ENT-01',
    stage: 'Onboarding',
    progress: 75,
    dateJoined: '2023-11-01'
  },
  {
    id: 'CAN-02',
    name: 'Ching Wei Xiang',
    email: 'wx.ching@gmail.com',
    phone: '+60 19-283 7461',
    designation: 'Full Stack Engineer',
    department: 'Engineering',
    entityId: 'ENT-01',
    stage: 'Onboarding',
    progress: 40,
    dateJoined: '2023-11-15'
  },
  {
    id: 'CAN-03',
    name: 'Prisha d/o Ravindran',
    email: 'prisha.r@gmail.com',
    phone: '+60 17-384 1229',
    designation: 'HR Specialist',
    department: 'Human Resources',
    entityId: 'ENT-02',
    stage: 'Offered',
    progress: 0,
    dateJoined: '2023-12-01'
  },
  {
    id: 'CAN-04',
    name: 'Emily Rose Thompson',
    email: 'emily.rose@gmail.com',
    phone: '+60 11-283 4910',
    designation: 'Strategy Consultant',
    department: 'Strategy',
    entityId: 'ENT-02',
    stage: 'Interviewing',
    progress: 0,
    dateJoined: '2023-12-15'
  }
];
