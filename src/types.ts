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
  id: string; // ENT-XX
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
  id: string; // EMP-XXXX
  entityId: string; // ENT-XX (corporate subsidiary)
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
