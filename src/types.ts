/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppTab =
  | 'dashboard'
  | 'payroll'
  | 'payslip-viewer'
  | 'performance'
  | 'directory'
  | 'reports'
  | 'settings'
  | 'help'
  | 'entities'
  | 'tax-settings'
  | 'leave-management'
  | 'forms-directory'
  | 'hire-onboarding';

export interface CorporateEntity {
  id: string; // Mapped to name (company name) - ENT ID removed from DB
  name: string;
  registrationNumber: string; // e.g. SSM / Co ROC No
  address: string;
  taxReferenceNo: string;
  epfReferenceNo: string;
  socsoReferenceNo: string;
  currency: string; // e.g. RM, USD
  isActive: boolean;
  logoUrl?: string;
  theme?: 'theme1' | 'theme2' | 'theme3';
}

export interface Dependant {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  dob: string; // YYYY-MM-DD
}

export interface CareerHistoryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'Status Change' | 'Promotion' | 'Department Transfer' | 'Salary Revision' | 'Hired' | 'Employment Type Change' | 'Subsidiary Transfer';
  previousValue: string;
  newValue: string;
  notes: string;
}

export interface Employee {
  id: string; // Mapped to email - EMP ID removed from DB
  entityId: string; // Mapped to entityName (company name) - ENT ID removed from DB
  name: string;
  email: string;
  designation: string;
  department: string;
  status: 'Active' | 'On Leave' | 'Terminated' | 'Suspended';
  bankName: string;
  accountNo: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  overtime: number;
  performanceBonus: number;
  
  // Extended Payroll Fields (Earnings)
  allowanceGeneral?: number;
  allowanceTransport?: number;
  allowanceParking?: number;
  allowanceMeal?: number;
  allowanceAccommodation?: number;
  allowancePhone?: number;
  
  reimbursementAmount?: number;
  reimbursementDesc?: string;
  
  bonusAmount?: number;
  bonusDesc?: string;
  
  commissionAmount?: number;
  commissionDesc?: string;
  
  backPayAmount?: number;
  backPayDesc?: string;
  
  awsAmount?: number;
  awsDesc?: string;
  
  compensationAmount?: number;
  compensationDesc?: string;

  // Extended Payroll Fields (Deductions)
  deductionInLieu?: number;
  deductionCp38?: number;
  deductionOthers?: number;
  deductionOthersDesc?: string;

  epfRateEmployee: number; // e.g. 11
  epfRateEmployer: number; // e.g. 13
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  skbbkEmployee?: number;
  skbbkEmployer?: number;
  taxPcb: number;
  unpaidLeave: number;
  hrdCorp: number;
  avatarUrl?: string;
  
  // New employee specific compliance fields
  nricPassport: string;
  nationality: string;
  contactNumber: string;
  taxNumber: string;
  epfNumber?: string;
  employmentType:
    | 'Probationary'
    | 'Confirmation'
    | 'Part Time'
    | 'Internship'
    | 'Independent Contractor / Freelance';
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  eligibleForStatutory?: 'Yes' | 'No';
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  dateOfJoined: string;
  
  // Spouse Details
  spouseName?: string;
  spouseNric?: string;
  spouseIsWorking?: 'Yes' | 'No';
  spouseCompany?: string;
  spousePosition?: string;

  // Dependants details
  hasDependants?: 'Yes' | 'No';
  dependants?: Dependant[];
  
  // Progression history tracker
  careerHistory?: CareerHistoryEntry[];

  // Uploaded Compliance Documents
  icFrontUrl?: string;
  icBackUrl?: string;
  educationCertUrl?: string;
  
  // Historical PCB Reconstruction Fields
  historicalPayrollRecords?: HistoricalPayrollRecord[];
  effectiveDatedProfiles?: EmployeeTaxProfile[];
  historicalPcbResults?: HistoricalPCBResult[];
  historicalVariances?: PCBHistoricalVariance[];
  tp1Declarations?: TP1Declaration[];
  tp3Data?: TP3Data;
}

export interface ReviewCycle {
  id: string;
  name: string;
  period: string;
  status: 'In Progress' | 'Upcoming' | 'Completed';
}

export interface EmployeePerformance {
  employeeId: string;
  reviewCycleId: string;
  managerName: string;
  reviewStatus: 'Completed' | 'In Progress' | 'Not Started';
  rating: number; // 0 to 5
  teamworkScore: number; // 1 to 5
  communicationScore: number; // 1 to 5
  problemSolvingScore: number; // 1 to 5
  selfEvaluation: string;
  managerComments: string;
  goals: string[];
}

export interface ReportConfig {
  reportType: string;
  startDate: string;
  endDate: string;
  targetAudience: string[];
  metrics: string[];
  format: 'pdf' | 'excel' | 'csv' | 'ppt';
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  entityId: string;
  stage: 'Applied' | 'Interviewing' | 'Offered' | 'Onboarding';
  progress: number;
  dateJoined: string;
}

export type PCBProcessingMode =
  | "live_payroll"
  | "historical_reconstruction"
  | "historical_recalculation";

export type HistoricalCalculationBasis =
  | "actual_deduction_history"
  | "corrected_recalculated_history";

export type HistoricalPCBStatus =
  | "not_calculated"
  | "calculated"
  | "actual_amount_missing"
  | "requires_review"
  | "variance_detected"
  | "correction_required"
  | "approved"
  | "locked";

export interface EmployeeTaxProfile {
  effectiveDate: string; // YYYY-MM-DD
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  allowanceGeneral?: number;
  allowanceTransport?: number;
  allowanceParking?: number;
  allowanceMeal?: number;
  allowanceAccommodation?: number;
  allowancePhone?: number;
  commissionAmount?: number;
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  spouseIsWorking?: 'Yes' | 'No';
  spouseNric?: string;
  spouseName?: string;
  hasDependants?: 'Yes' | 'No';
  dependantsCount?: number;
  eligibleForStatutory?: 'Yes' | 'No';
  epfRateEmployee?: number;
  epfRateEmployer?: number;
  taxNumber?: string;
  nricPassport?: string;
  dateOfJoined?: string;
  dateOfTermination?: string;
}

export interface HistoricalPayrollRecord {
  payrollMonth: number; // 1 to 12
  basicSalary: number;
  allowanceGeneral?: number;
  allowanceTransport?: number;
  allowanceParking?: number;
  allowanceMeal?: number;
  allowanceAccommodation?: number;
  allowancePhone?: number;
  overtime?: number;
  performanceBonus?: number;
  bonusAmount?: number;
  commissionAmount?: number;
  backPayAmount?: number;
  awsAmount?: number;
  compensationAmount?: number;
  reimbursementAmount?: number;
  unpaidLeave?: number;
  deductionInLieu?: number;
  deductionCp38?: number;
  deductionOthers?: number;
  epfEmployee?: number;
  zakat?: number;
  cp38?: number;
  actualPCBDeducted: number;
}

export interface TP1Declaration {
  taxYear: number;
  declarationDate: string;
  effectivePayrollMonth: number;
  claimCategory: string;
  claimedAmount: number;
  qualifyingAmount: number;
  approvalStatus: string;
}

export interface TP3Data {
  taxYear: number;
  previousEmployerRemuneration: number;
  previousEmployerAdditionalRemuneration?: number;
  previousEmployerEpf: number;
  previousEmployerPcb: number;
  previousEmployerZakat: number;
}

export interface PCBCalculationStep {
  stepName: string;
  formula?: string;
  inputs?: Record<string, any>;
  output: number;
  notes?: string;
}

export interface HistoricalPCBResult {
  employeeId: string;
  taxYear: 2026;
  payrollMonth: number;

  processingMode: PCBProcessingMode;
  calculationBasis: HistoricalCalculationBasis;

  effectiveEmployeeProfileVersion: string; // e.g. YYYY-MM-DD or index
  taxConfigurationVersion: string;

  currentNormalRemuneration: number;
  currentAdditionalRemuneration: number;
  currentMonthEmployeeEPF: number;

  accumulatedPriorRemuneration: number;
  accumulatedPriorAdditionalRemuneration: number;
  accumulatedPriorEPF: number;
  accumulatedPriorPCB: number;
  accumulatedPriorZakat: number;

  previousEmployerRemuneration: number;
  previousEmployerEPF: number;
  previousEmployerPCB: number;
  previousEmployerZakat: number;

  projectedRemainingRemuneration: number;
  estimatedAnnualIncome: number;
  qualifyingDeductions: number;
  personalAndFamilyReliefs: number;
  approvedTP1Reliefs: number;
  estimatedChargeableIncome: number;
  estimatedAnnualTax: number;

  normalRemunerationPCB: number;
  additionalRemunerationPCB: number;
  calculatedPCB: number;

  actualPCBDeducted: number | null;
  pcbVariance: number | null;

  currentZakat: number;
  currentCP38: number;
  totalActualTaxDeduction: number | null;
  totalCalculatedTaxDeduction: number;

  calculationTimestamp: string;
  calculationVersion: number;
  status: HistoricalPCBStatus;

  warnings: string[];
  errors: string[];
  calculationBreakdown: PCBCalculationStep[];
}

export interface PCBHistoricalVariance {
  payrollPeriod: string; // e.g. "2026-03"
  originalCalculatedPCB: number;
  originalActualPCBDeducted: number;
  revisedCalculatedPCB: number;
  variance: number;
  reason: string;
  calculationBasis: HistoricalCalculationBasis;
  approvalStatus: "pending" | "approved" | "rejected";
}

export interface HistoricalPCBMonthContext {
  taxYear: 2026;
  payrollMonth: number;

  employeeProfileEffectiveForMonth: EmployeeTaxProfile;

  previousEmployerTP3: TP3Data;

  priorCurrentEmployerPayrolls: HistoricalPayrollRecord[];

  currentMonthPayroll: HistoricalPayrollRecord;

  accumulatedRemunerationBeforeCurrentMonth: number;
  accumulatedAdditionalRemunerationBeforeCurrentMonth: number;
  accumulatedEmployeeEPFBeforeCurrentMonth: number;
  accumulatedPCBBeforeCurrentMonth: number;
  accumulatedZakatBeforeCurrentMonth: number;

  currentMonthNormalRemuneration: number;
  currentMonthAdditionalRemuneration: number;
  currentMonthEmployeeEPF: number;
  currentMonthZakat: number;
  currentMonthCP38: number;

  projectedRemainingNormalRemuneration: number;
  remainingApplicableMonths: number;
}
