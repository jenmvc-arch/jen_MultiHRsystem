/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CreditCard, Search, Plus, Printer, Download, Image, Mail, Share2, Eye, CheckCircle, TrendingUp, Sliders, DollarSign, Briefcase, FileText, Globe, Building2, Clock } from 'lucide-react';
import { Employee, CorporateEntity, HistoricalPayrollRecord, PayrollRecord2026 } from '../types';
import { calculatePayslip, getPayslipLabel, calculateYtd, calculatePcb2026, recalculatePCBFromMonth, getProratedBasicSalary, getAdjustedBasicSalary, getStatutoryDeductions2026, calculateSocsoContribution } from '../data';
import PayslipDocumentView from './PayslipDocumentView';
import SocsoCalculatorCard from './SocsoCalculatorCard';

interface PayrollViewProps {
  employees: Employee[];
  entities: CorporateEntity[];
  payrollRecords2026?: PayrollRecord2026[];
  onSavePayrollRecord2026?: (record: PayrollRecord2026) => void;
  onUpdateEmployeeSalary: (id: string, updates: Partial<Employee>) => void;
  onNavigateToDocument: (employeeId: string) => void;
  onShowNotification: (title: string, message: string) => void;
  activeEntity?: CorporateEntity;
}

export default function PayrollView({
  employees,
  entities,
  payrollRecords2026 = [],
  onSavePayrollRecord2026,
  onUpdateEmployeeSalary,
  onNavigateToDocument,
  onShowNotification,
  activeEntity
}: PayrollViewProps) {
  const defaultPeriod = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const [selectedPayPeriod, setSelectedPayPeriod] = useState(defaultPeriod);
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'processing' | 'document' | 'history'>('processing');
  
  // Local state to track which employees have been fully "Generated" (vs Draft status)
  const [generatedMap, setGeneratedMap] = useState<Record<string, boolean>>({});

  // Edit states for dynamic live testing!
  const [isEditing, setIsEditing] = useState(false);
  const [tempBasic, setTempBasic] = useState(0);
  const [tempTax, setTempTax] = useState(0);
  const [hasAllowances, setHasAllowances] = useState(false);

  // Extended state variables for dynamic editing
  const [allowanceGen, setAllowanceGen] = useState(0);
  const [allowanceTrans, setAllowanceTrans] = useState(0);
  const [allowancePark, setAllowancePark] = useState(0);
  const [allowanceMl, setAllowanceMl] = useState(0);
  const [allowanceAccom, setAllowanceAccom] = useState(0);
  const [allowancePh, setAllowancePh] = useState(0);

  const [reimbursementAmt, setReimbursementAmt] = useState(0);
  const [reimbursementDesc, setReimbursementDesc] = useState('');

  const [bonusAmt, setBonusAmt] = useState(0);
  const [bonusDesc, setBonusDesc] = useState('');

  const [commissionAmt, setCommissionAmt] = useState(0);
  const [commissionDesc, setCommissionDesc] = useState('');

  const [backPayAmt, setBackPayAmt] = useState(0);
  const [backPayDesc, setBackPayDesc] = useState('');

  const [awsAmt, setAwsAmt] = useState(0);
  const [awsDesc, setAwsDesc] = useState('');

  const [compensationAmt, setCompensationAmt] = useState(0);
  const [compensationDesc, setCompensationDesc] = useState('');

  const [unpaidLeave, setUnpaidLeave] = useState(0);
  const [deductionInLieu, setDeductionInLieu] = useState(0);
  const [deductionCp38, setDeductionCp38] = useState(0);
  const [deductionOthers, setDeductionOthers] = useState(0);
  const [deductionOthersDesc, setDeductionOthersDesc] = useState('');

  // Filter employees for the left list
  const filteredEmployees = employees.filter(e => {
    const matchesEntity = selectedEntityId === 'all' || e.entityId === selectedEntityId;
    const matchesDept = selectedDepartment === 'All Departments' || e.department === selectedDepartment;
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEntity && matchesDept && matchesSearch;
  });

  const activeEmployee = filteredEmployees.find(e => e.id === selectedEmployeeId) || filteredEmployees[0] || employees[0];

  if (!activeEmployee) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-neutral-border">
        No employees found. Please register an employee in the directory.
      </div>
    );
  }

  const MONTHS_LIST = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const parts = selectedPayPeriod.split(' ');
  const monthName = parts[0] || 'October';
  const payYear = Number(parts[1]) || 2026;
  const payMonthIndex = MONTHS_LIST.indexOf(monthName) + 1;

  const payrollBreakdown = calculatePayslip(activeEmployee, payMonthIndex, payYear);

  let baseSalaryBeforeProration = activeEmployee.basicSalary;
  if (activeEmployee.salaryAdjustments && activeEmployee.salaryAdjustments.length > 0) {
    const activeAdjustments = activeEmployee.salaryAdjustments
      .filter(adj => {
        const effDate = new Date(adj.effectiveDate);
        const effYear = effDate.getFullYear();
        const effMonth = effDate.getMonth() + 1;
        return (effYear < payYear) || (effYear === payYear && effMonth <= payMonthIndex);
      })
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    if (activeAdjustments.length > 0) {
      baseSalaryBeforeProration = activeAdjustments[0].adjustedSalary;
    }
  }

  const actualBasic = getAdjustedBasicSalary(activeEmployee, payMonthIndex, payYear);
  const prorationDeduction = parseFloat((baseSalaryBeforeProration - actualBasic).toFixed(2));

  let prorationDetails = '';
  if (prorationDeduction > 0 && activeEmployee.dateOfJoined) {
    const joinDate = new Date(activeEmployee.dateOfJoined);
    const joinYear = joinDate.getFullYear();
    const joinMonth = joinDate.getMonth() + 1;
    if (joinYear === payYear && joinMonth === payMonthIndex) {
      const joinDay = joinDate.getDate();
      const calendarDays = new Date(payYear, payMonthIndex, 0).getDate();
      const unpaidDays = joinDay - 1;
      prorationDetails = `Joined mid-month on ${joinDate.toLocaleDateString('en-MY', {day: 'numeric', month: 'short', year: 'numeric'})}. Deducted ${unpaidDays}/${calendarDays} unpaid days.`;
    } else {
      prorationDetails = `Deduction for incomplete month of service.`;
    }
  }

  const isEligible = 
    activeEmployee.employmentType === 'Probationary' || 
    activeEmployee.employmentType === 'Confirmation' || 
    (activeEmployee.employmentType === 'Independent Contractor / Freelance' && activeEmployee.eligibleForStatutory === 'Yes');

  const epfEmployee = isEligible ? Math.round((tempBasic * (activeEmployee.epfRateEmployee || 11)) / 100) : 0;
  const computedAutoPcb = isEligible 
    ? calculatePcb2026(
        tempBasic, 
        activeEmployee.maritalStatus || 'Single', 
        activeEmployee.spouseIsWorking || 'No', 
        activeEmployee.dependants?.length || 0,
        epfEmployee
      )
    : 0;

  const startEdit = () => {
    const proratedBasic = getAdjustedBasicSalary(activeEmployee, payMonthIndex, payYear);
    setTempBasic(proratedBasic);
    const hasAnyAllowance = (
      (activeEmployee.allowanceGeneral || 0) > 0 ||
      (activeEmployee.allowanceTransport !== undefined ? activeEmployee.allowanceTransport : activeEmployee.transportAllowance || 0) > 0 ||
      (activeEmployee.allowanceParking || 0) > 0 ||
      (activeEmployee.allowanceMeal || 0) > 0 ||
      (activeEmployee.allowanceAccommodation !== undefined ? activeEmployee.allowanceAccommodation : activeEmployee.housingAllowance || 0) > 0 ||
      (activeEmployee.allowancePhone || 0) > 0
    );
    setHasAllowances(hasAnyAllowance);

    setAllowanceGen(activeEmployee.allowanceGeneral || 0);
    setAllowanceTrans(activeEmployee.allowanceTransport !== undefined ? activeEmployee.allowanceTransport : (activeEmployee.transportAllowance || 0));
    setAllowancePark(activeEmployee.allowanceParking || 0);
    setAllowanceMl(activeEmployee.allowanceMeal || 0);
    setAllowanceAccom(activeEmployee.allowanceAccommodation !== undefined ? activeEmployee.allowanceAccommodation : (activeEmployee.housingAllowance || 0));
    setAllowancePh(activeEmployee.allowancePhone || 0);

    setReimbursementAmt(activeEmployee.reimbursementAmount || 0);
    setReimbursementDesc(activeEmployee.reimbursementDesc || '');

    setBonusAmt(activeEmployee.bonusAmount !== undefined ? activeEmployee.bonusAmount : (activeEmployee.performanceBonus || 0));
    setBonusDesc(activeEmployee.bonusDesc || '');

    setCommissionAmt(activeEmployee.commissionAmount || 0);
    setCommissionDesc(activeEmployee.commissionDesc || '');

    setBackPayAmt(activeEmployee.backPayAmount || 0);
    setBackPayDesc(activeEmployee.backPayDesc || '');

    setAwsAmt(activeEmployee.awsAmount || 0);
    setAwsDesc(activeEmployee.awsDesc || '');

    setCompensationAmt(activeEmployee.compensationAmount || 0);
    setCompensationDesc(activeEmployee.compensationDesc || '');

    setUnpaidLeave(activeEmployee.unpaidLeave || 0);
    setDeductionInLieu(activeEmployee.deductionInLieu || 0);
    setDeductionCp38(activeEmployee.deductionCp38 || 0);
    setDeductionOthers(activeEmployee.deductionOthers || 0);
    setDeductionOthersDesc(activeEmployee.deductionOthersDesc || '');

    setTempTax(activeEmployee.taxPcb || 0);
    setIsEditing(true);
  };

  const saveEdit = () => {
    const epfRateEmp = activeEmployee.epfRateEmployee || 11;
    const epfRateEmployerCalculated = tempBasic <= 5000 ? 13 : 12;
    const epfRateEmployer = activeEmployee.epfRateEmployer || epfRateEmployerCalculated;

    const epfEmployeeVal = isEligible ? Math.round((tempBasic * epfRateEmp) / 100) : 0;
    const epfEmployerVal = isEligible ? Math.round((tempBasic * epfRateEmployer) / 100) : 0;

    const payrollItemsForSocso = [
      { code: 'basic_salary', amount: tempBasic },
      { code: 'overtime', amount: activeEmployee.overtime || 0 },
      { code: 'commission', amount: commissionAmt },
      { code: 'allowance_general', amount: hasAllowances ? allowanceGen : 0 },
      { code: 'allowance_transport', amount: hasAllowances ? allowanceTrans : 0 },
      { code: 'allowance_parking', amount: hasAllowances ? allowancePark : 0 },
      { code: 'allowance_meal', amount: hasAllowances ? allowanceMl : 0 },
      { code: 'allowance_accommodation', amount: hasAllowances ? allowanceAccom : 0 },
      { code: 'allowance_phone', amount: hasAllowances ? allowancePh : 0 },
      { code: 'backpay', amount: backPayAmt }
    ];
    if (unpaidLeave > 0) {
      payrollItemsForSocso.push({ code: 'unpaid_leave', amount: unpaidLeave });
    }

    const socsoRes = calculateSocsoContribution({
      employee: activeEmployee,
      payrollPeriod: `${payYear}-${String(payMonthIndex).padStart(2, '0')}`,
      payrollItems: payrollItemsForSocso
    });

    const stat2026 = getStatutoryDeductions2026(tempBasic);
    const socsoEmployee = isEligible ? socsoRes.employeeSocsoTotal : 0;
    const socsoEmployer = isEligible ? socsoRes.employerSocsoTotal : 0;
    const eisEmployee = isEligible ? stat2026.eisEmployee : 0;
    const eisEmployer = isEligible ? stat2026.eisEmployer : 0;

    const totalAllowances = (hasAllowances ? allowanceGen : 0) + 
                            (hasAllowances ? allowanceTrans : 0) + 
                            (hasAllowances ? allowancePark : 0) + 
                            (hasAllowances ? allowanceMl : 0) + 
                            (hasAllowances ? allowanceAccom : 0) + 
                            (hasAllowances ? allowancePh : 0);
    const totalEarnings = tempBasic + totalAllowances + (activeEmployee.overtime || 0) + bonusAmt + commissionAmt + backPayAmt + awsAmt + compensationAmt + reimbursementAmt;
    const totalDeductions = epfEmployeeVal + socsoEmployee + eisEmployee + tempTax + unpaidLeave + deductionInLieu + deductionCp38 + deductionOthers;
    const netPay = parseFloat((totalEarnings - totalDeductions).toFixed(2));

    const record2026: PayrollRecord2026 = {
      id: `${activeEmployee.email}_${payMonthIndex}_${payYear}`,
      employeeEmail: activeEmployee.email,
      payrollMonth: payMonthIndex,
      payrollYear: payYear,
      basicSalary: tempBasic,
      allowanceGeneral: hasAllowances ? allowanceGen : 0,
      allowanceTransport: hasAllowances ? allowanceTrans : 0,
      allowanceParking: hasAllowances ? allowancePark : 0,
      allowanceMeal: hasAllowances ? allowanceMl : 0,
      allowanceAccommodation: hasAllowances ? allowanceAccom : 0,
      allowancePhone: hasAllowances ? allowancePh : 0,
      overtime: activeEmployee.overtime || 0,
      bonusAmount: bonusAmt,
      commissionAmount: commissionAmt,
      backPayAmount: backPayAmt,
      awsAmount: awsAmt,
      compensationAmount: compensationAmt,
      reimbursementAmount: reimbursementAmt,
      unpaidLeave: unpaidLeave,
      deductionInLieu: deductionInLieu,
      deductionCp38: deductionCp38,
      deductionOthers: deductionOthers,
      actualPCBDeducted: tempTax,
      epfEmployee: epfEmployeeVal,
      epfEmployer: epfEmployerVal,
      socsoEmployee,
      socsoEmployer,
      lindung24Employee: isEligible ? socsoRes.employeeLindung24 : 0,
      eisEmployee,
      eisEmployer,
      netPay,
      createdAt: new Date().toISOString()
    };

    if (onSavePayrollRecord2026) {
      onSavePayrollRecord2026(record2026);
    }

    const newRecord: HistoricalPayrollRecord = {
      payrollMonth: payMonthIndex,
      basicSalary: tempBasic,
      allowanceGeneral: hasAllowances ? allowanceGen : 0,
      overtime: activeEmployee.overtime || 0,
      bonusAmount: bonusAmt,
      commissionAmount: commissionAmt,
      actualPCBDeducted: tempTax,
      epfEmployee: epfEmployeeVal,
      zakat: 0,
      cp38: deductionCp38
    };

    const currentRecords = activeEmployee.historicalPayrollRecords || [];
    const filtered = currentRecords.filter(r => r.payrollMonth !== payMonthIndex);
    const updatedRecords = [...filtered, newRecord].sort((a, b) => a.payrollMonth - b.payrollMonth);

    const recalculated = recalculatePCBFromMonth({
      employee: { ...activeEmployee, historicalPayrollRecords: updatedRecords },
      taxYear: payYear,
      changedMonth: payMonthIndex,
      calculationBasis: 'actual_deduction_history'
    });

    onUpdateEmployeeSalary(activeEmployee.id, {
      allowanceGeneral: hasAllowances ? allowanceGen : 0,
      allowanceTransport: hasAllowances ? allowanceTrans : 0,
      allowanceParking: hasAllowances ? allowancePark : 0,
      allowanceMeal: hasAllowances ? allowanceMl : 0,
      allowanceAccommodation: hasAllowances ? allowanceAccom : 0,
      allowancePhone: hasAllowances ? allowancePh : 0,
      
      reimbursementAmount: reimbursementAmt,
      reimbursementDesc: reimbursementDesc,
      
      bonusAmount: bonusAmt,
      bonusDesc: bonusDesc,
      performanceBonus: bonusAmt,

      commissionAmount: commissionAmt,
      commissionDesc: commissionDesc,

      backPayAmount: backPayAmt,
      backPayDesc: backPayDesc,

      awsAmount: awsAmt,
      awsDesc: awsDesc,

      compensationAmount: compensationAmt,
      compensationDesc: compensationDesc,

      unpaidLeave: unpaidLeave,
      deductionInLieu: deductionInLieu,
      deductionCp38: deductionCp38,
      deductionOthers: deductionOthers,
      deductionOthersDesc: deductionOthersDesc,

      taxPcb: tempTax,
      historicalPayrollRecords: updatedRecords,
      historicalPcbResults: recalculated
    });
    setIsEditing(false);
    onShowNotification(
      'Payslip & Past Records Updated',
      `Live updates and historical records saved and recalculated for ${activeEmployee.name} in ${selectedPayPeriod}.`
    );
  };

  const handleBulkGenerate = () => {
    const newGeneratedMap = { ...generatedMap };
    filteredEmployees.forEach(e => {
      newGeneratedMap[e.id] = true;
    });
    setGeneratedMap(newGeneratedMap);
    onShowNotification(
      'Bulk Generation Successful',
      `Generated payslips for ${filteredEmployees.length} employees for ${selectedPayPeriod}.`
    );
  };

  const handleSingleGenerate = (id: string) => {
    setGeneratedMap(prev => ({ ...prev, [id]: true }));
    onShowNotification(
      'Payslip Generated',
      `Payslip for ${activeEmployee.name} has been set to Generated status.`
    );
  };

  const handleShareEmail = () => {
    onShowNotification(
      'Success',
      `Payslip shared successfully via email to ${activeEmployee.email}`
    );
  };

  const isTheme2 = activeEntity?.theme === 'theme2';
  const themeStyles = isTheme2 ? {
    '--color-primary': '#222222',
    '--color-primary-container': '#222222',
    '--color-secondary': '#222222',
    '--color-on-secondary-container': '#222222',
    '--color-on-surface': '#222222',
    '--color-on-surface-variant': '#222222',
    '--color-error': '#222222',
    color: '#222222'
  } as React.CSSProperties : {};

  return (
    <div 
      className="max-w-6xl mx-auto animate-in fade-in duration-200 space-y-6"
      style={themeStyles}
    >
      
      {/* Sub-navigation bar for moving Payslip Document under Payroll & Generator */}
      <div className="bg-white border border-neutral-border p-1.5 rounded-lg flex gap-1.5 shadow-xs select-none text-left">
        <button
          onClick={() => setActiveSubTab('processing')}
          className={`flex-1 py-2 px-4 rounded font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'processing'
              ? 'bg-primary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-neutral-100'
          }`}
        >
          <CreditCard className="w-4 h-4" /> 1. Payroll Processing & Calculator
        </button>
        <button
          onClick={() => setActiveSubTab('document')}
          className={`flex-1 py-2 px-4 rounded font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'document'
              ? 'bg-primary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-neutral-100'
          }`}
        >
          <FileText className="w-4 h-4" /> 2. Payslip Document Viewer (PDF)
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-2 px-4 rounded font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-primary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-neutral-100'
          }`}
        >
          <Clock className="w-4 h-4" /> 3. Historical Salary Viewer
        </button>
      </div>

      {/* Corporate Subsidiary Switcher Pills */}
      <div className="bg-white border border-neutral-border p-1.5 rounded-lg flex flex-wrap gap-1.5 shadow-xs text-left select-none">
        <button
          onClick={() => setSelectedEntityId('all')}
          className={`px-4 py-2 rounded font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
            selectedEntityId === 'all'
              ? 'bg-primary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-neutral-100'
          }`}
        >
          <Globe className="w-4 h-4" /> All Corporate Subsidiaries
        </button>
        {entities.map((ent) => {
          const isSelected = selectedEntityId === ent.id;
          return (
            <button
              key={ent.id}
              onClick={() => setSelectedEntityId(ent.id)}
              className={`px-4 py-2 rounded font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-neutral-100'
              }`}
            >
              <Building2 className="w-4 h-4" /> {ent.name}
            </button>
          );
        })}
      </div>

      {activeSubTab === 'history' ? (
        <div className="bg-white rounded-lg border border-neutral-border p-6 shadow-xs text-left space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-border/60 pb-4">
            <div>
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> 2026 Historical Salaries & Payroll Records
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                View YTD salary accumulation, statutory contributions, and net payout history for the selected employee.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Select Employee</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="rounded border border-neutral-border bg-surface p-1.5 focus:border-primary outline-none text-xs font-semibold text-primary cursor-pointer w-64"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const activeEmp = employees.find(e => e.id === selectedEmployeeId) || employees[0];
            if (!activeEmp) {
              return (
                <div className="py-8 text-center text-xs text-on-surface-variant">
                  No active employee found. Please register employees first.
                </div>
              );
            }

            const records = (payrollRecords2026 || []).filter(
              r => r && r.employeeEmail && activeEmp.email && r.employeeEmail.toLowerCase() === activeEmp.email.toLowerCase()
            ).sort((a, b) => a.payrollMonth - b.payrollMonth);

            if (records.length === 0) {
              return (
                <div className="py-12 border border-dashed border-neutral-border/60 rounded-lg text-center text-xs text-on-surface-variant space-y-2">
                  <p className="font-bold text-on-surface">No Historical Records Found</p>
                  <p>There are no saved payroll records for 2026 in the database sheet yet.</p>
                </div>
              );
            }

            // Calculations
            const totalBasic = records.reduce((sum, r) => sum + r.basicSalary, 0);
            const totalAllowances = records.reduce(
              (sum, r) => sum + r.allowanceGeneral + r.allowanceTransport + r.allowanceParking + r.allowanceMeal + r.allowanceAccommodation + r.allowancePhone, 
              0
            );
            const totalPcb = records.reduce((sum, r) => sum + r.actualPCBDeducted, 0);
            const totalNet = records.reduce((sum, r) => sum + r.netPay, 0);

            const monthsName = [
              '', 'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];

            return (
              <div className="space-y-6">
                {/* YTD Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-neutral-50 border border-neutral-border/60 rounded-lg">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase block">YTD Basic Salary</span>
                    <span className="text-lg font-mono font-bold text-primary mt-1 block">RM {totalBasic.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-neutral-border/60 rounded-lg">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase block">YTD Allowances</span>
                    <span className="text-lg font-mono font-bold text-primary mt-1 block">RM {totalAllowances.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-neutral-border/60 rounded-lg">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase block">YTD PCB Deducted</span>
                    <span className="text-lg font-mono font-bold text-primary mt-1 block">RM {totalPcb.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-neutral-border/60 rounded-lg">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase block">YTD Net Payout</span>
                    <span className="text-lg font-mono font-bold text-green-700 mt-1 block">RM {totalNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="border border-neutral-border rounded-lg overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-border font-bold text-on-surface-variant uppercase tracking-wider">
                        <th className="p-3">Month</th>
                        <th className="p-3 text-right">Basic Salary</th>
                        <th className="p-3 text-right">Allowances</th>
                        <th className="p-3 text-right">Overtime/Variable</th>
                        <th className="p-3 text-right">EPF (Employee)</th>
                        <th className="p-3 text-right">PCB Deducted</th>
                        <th className="p-3 text-right font-bold text-green-700">Net Pay</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-border/50">
                      {records.map(rec => {
                        const recAllowances = rec.allowanceGeneral + rec.allowanceTransport + rec.allowanceParking + rec.allowanceMeal + rec.allowanceAccommodation + rec.allowancePhone;
                        const recVariable = rec.overtime + rec.bonusAmount + rec.commissionAmount + rec.backPayAmount + rec.awsAmount + rec.compensationAmount;
                        return (
                          <tr key={rec.id} className="hover:bg-neutral-50/40">
                            <td className="p-3 font-semibold text-primary">{monthsName[rec.payrollMonth]} {rec.payrollYear}</td>
                            <td className="p-3 text-right font-mono">RM {rec.basicSalary.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono text-on-surface-variant">RM {recAllowances.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono text-on-surface-variant">RM {recVariable.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono text-on-surface-variant">RM {rec.epfEmployee.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono text-red-600">RM {rec.actualPCBDeducted.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono font-bold text-green-700">RM {rec.netPay.toFixed(2)}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedPayPeriod(`${monthsName[rec.payrollMonth]} ${rec.payrollYear}`);
                                  setActiveSubTab('document');
                                }}
                                className="px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded font-bold transition-colors cursor-pointer text-[10px]"
                              >
                                View Payslip
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      ) : activeSubTab === 'document' ? (
        <div className="bg-white rounded-lg border border-neutral-border overflow-hidden shadow-xs">
          <PayslipDocumentView
            employees={filteredEmployees}
            selectedEmployeeId={selectedEmployeeId}
            onBack={() => setActiveSubTab('processing')}
            onShowNotification={onShowNotification}
            activeEntity={activeEntity}
          />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Left Side: Generation Parameters and List */}
        <aside className="w-full lg:w-80 border border-neutral-border bg-surface-container-lowest flex flex-col shrink-0 rounded-lg shadow-sm">
          {/* Controls */}
          <div className="p-4 border-b border-neutral-border space-y-4">
            <h2 className="font-bold text-base text-on-background flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" /> Payroll Controls
            </h2>
            
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Pay Period</label>
                {(() => {
                  const parts = selectedPayPeriod.split(' ');
                  const selectedMonth = parts[0] || 'October';
                  const selectedYear = parts[1] || '2026';
                  const months = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ];
                  const years = [];
                  for (let y = 2050; y >= 2020; y--) {
                    years.push(y.toString());
                  }
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <select 
                          value={selectedMonth} 
                          onChange={(e) => setSelectedPayPeriod(`${e.target.value} ${selectedYear}`)}
                          className="w-full rounded border border-neutral-border bg-surface p-1.5 focus:border-primary outline-none text-xs cursor-pointer"
                        >
                          {months.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <select 
                          value={selectedYear} 
                          onChange={(e) => setSelectedPayPeriod(`${selectedMonth} ${e.target.value}`)}
                          className="w-full rounded border border-neutral-border bg-surface p-1.5 focus:border-primary outline-none text-xs cursor-pointer"
                        >
                          {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Department</label>
                <select 
                  value={selectedDepartment} 
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full rounded border border-neutral-border bg-surface p-1.5 focus:border-primary outline-none"
                >
                  <option>All Departments</option>
                  <option>Product & Engineering</option>
                  <option>Engineering</option>
                  <option>Product</option>
                  <option>Human Resources</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleBulkGenerate}
                className="flex-1 bg-primary text-white py-2 px-3 rounded font-medium text-xs hover:bg-primary-container transition-colors shadow-sm"
              >
                Bulk Generate
              </button>
              <button 
                onClick={() => {
                  onShowNotification('Preview Mode Activated', 'Ready to preview all employee draft cards.');
                }}
                className="flex-1 border border-primary text-primary py-2 px-3 rounded font-medium text-xs hover:bg-primary/5 transition-colors"
              >
                Preview All
              </button>
            </div>
          </div>

          {/* Search bar inside status list */}
          <div className="p-3 bg-surface-container-low border-b border-neutral-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-outline" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-border rounded text-xs focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Employee Status List */}
          <div className="flex-1 overflow-y-auto max-h-[450px]">
            <div className="p-3">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Employee Status</h3>
              <div className="space-y-1.5">
                {filteredEmployees.map((emp) => {
                  const isSelected = emp.id === selectedEmployeeId;
                  const isGenerated = generatedMap[emp.id] || false;
                  return (
                    <div
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmployeeId(emp.id);
                        setIsEditing(false);
                      }}
                      className={`p-2.5 rounded-md border text-left cursor-pointer transition-all flex justify-between items-center ${
                        isSelected 
                          ? 'bg-surface-container-high border-primary border-l-4' 
                          : 'border-transparent hover:bg-surface-container hover:border-neutral-border'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-sm text-on-surface">{emp.name}</p>
                        <span className={`text-[10px] font-semibold flex items-center gap-1 mt-0.5 ${
                          isGenerated ? 'text-green-600' : 'text-blue-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isGenerated ? 'bg-green-600' : 'bg-blue-500'}`} />
                          {isGenerated ? 'Generated' : 'Draft'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-on-surface-variant font-mono">{emp.id}</span>
                        {isGenerated ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Eye className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Side: Payslip Generator Live Preview */}
        <section className="flex-1 border border-neutral-border bg-white rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-border pb-4 mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-primary tracking-tight">Active Payslip Preview</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Pay period: October 2026 · Employee status: <span className="font-semibold">{generatedMap[activeEmployee.id] ? 'Generated' : 'Draft'}</span></p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={startEdit}
                  className="bg-surface border border-neutral-border hover:bg-surface-container text-primary-container text-xs font-semibold py-1.5 px-3 rounded flex items-center gap-1 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" /> Adjust Salary
                </button>
                <button 
                  onClick={() => setActiveSubTab('document')}
                  className="bg-primary text-white text-xs font-semibold py-1.5 px-3 rounded flex items-center gap-1 hover:bg-primary-container transition-colors shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview PDF View
                </button>
              </div>
            </div>

            {/* Live Interactive Adjuster Form */}
            {isEditing && (
              <div className="mb-6 p-5 bg-[#faf9f6] rounded-lg border border-neutral-border text-sm space-y-6 animate-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-border">
                  <span className="font-bold text-primary flex items-center gap-1.5 text-base">
                    <Sliders className="w-5 h-5" /> Detailed Compensation & Statutory Editor
                  </span>
                  <span className="text-xs text-[#f7f0e0] bg-primary px-2.5 py-1 rounded font-mono font-bold">EMP: {activeEmployee.id}</span>
                </div>
                
                {/* 1. Base Pay & Flexible Allowances */}
                <div className="bg-white p-4 rounded border border-neutral-border/60 space-y-3">
                  <h3 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> 1. Base Pay & Monthly Allowances
                  </h3>
                  <div className="pb-2 border-b border-neutral-border/40 text-left">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasAllowances}
                        onChange={(e) => setHasAllowances(e.target.checked)}
                        className="rounded border-neutral-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-on-surface">Enable Monthly Allowances for this pay cycle</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                        {getPayslipLabel(activeEmployee.employmentType)} (RM)
                      </label>
                      <input 
                        type="number" 
                        value={tempBasic} 
                        disabled
                        className="w-full bg-neutral-100 border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs text-on-surface-variant cursor-not-allowed font-bold"
                      />
                      <span className="text-[10px] text-on-surface-variant mt-1 block font-medium">
                        Salary is managed strictly through Employee Management & Adjustments.
                      </span>
                      {activeEmployee.dateOfJoined && (() => {
                        const joinDate = new Date(activeEmployee.dateOfJoined);
                        if (isNaN(joinDate.getTime())) return null;
                        const joinYear = joinDate.getFullYear();
                        const joinMonth = joinDate.getMonth() + 1;
                        const joinDay = joinDate.getDate();
                        if (joinYear === payYear && joinMonth === payMonthIndex) {
                          const calendarDays = new Date(payYear, payMonthIndex, 0).getDate();
                          const activeDays = calendarDays - joinDay + 1;
                          return (
                            <span className="text-[10px] text-primary font-bold mt-1 block">
                              Joined {joinDate.toLocaleDateString('en-MY', {day: 'numeric', month: 'short', year: 'numeric'})}. Prorated: {activeDays}/{calendarDays} days.
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {hasAllowances && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">General Allowance (RM)</label>
                          <input 
                            type="number" 
                            value={allowanceGen} 
                            onChange={(e) => setAllowanceGen(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">Transport Allowance (RM)</label>
                          <input 
                            type="number" 
                            value={allowanceTrans} 
                            onChange={(e) => setAllowanceTrans(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">Parking Allowance (RM)</label>
                          <input 
                            type="number" 
                            value={allowancePark} 
                            onChange={(e) => setAllowancePark(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">Meal Allowance (RM)</label>
                          <input 
                            type="number" 
                            value={allowanceMl} 
                            onChange={(e) => setAllowanceMl(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">Accommodation Allowance (RM)</label>
                          <input 
                            type="number" 
                            value={allowanceAccom} 
                            onChange={(e) => setAllowanceAccom(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">Phone Allowance (RM)</label>
                          <input 
                            type="number" 
                            value={allowancePh} 
                            onChange={(e) => setAllowancePh(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Supplemental & Variable Payments */}
                <div className="bg-white p-4 rounded border border-neutral-border/60 space-y-4">
                  <h3 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> 2. Supplemental Payments (with descriptions)
                  </h3>
                  <div className="space-y-4">
                    {/* Bonus & Commission */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-neutral-50 rounded border border-neutral-border/50 grid grid-cols-2 gap-2 text-left">
                        <div className="col-span-2"><span className="text-xs font-bold text-on-surface">Performance Bonus</span></div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Amount (RM)</label>
                          <input 
                            type="number" 
                            value={bonusAmt} 
                            onChange={(e) => setBonusAmt(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Description</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Q3 Merit Bonus" 
                            value={bonusDesc} 
                            onChange={(e) => setBonusDesc(e.target.value)} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 rounded border border-neutral-border/50 grid grid-cols-2 gap-2 text-left">
                        <div className="col-span-2"><span className="text-xs font-bold text-on-surface">Commission Payments</span></div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Amount (RM)</label>
                          <input 
                            type="number" 
                            value={commissionAmt} 
                            onChange={(e) => setCommissionAmt(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Description</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Sept Sales Commission" 
                            value={commissionDesc} 
                            onChange={(e) => setCommissionDesc(e.target.value)} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* BackPay & AWS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-neutral-50 rounded border border-neutral-border/50 grid grid-cols-2 gap-2 text-left">
                        <div className="col-span-2"><span className="text-xs font-bold text-on-surface">BackPay / Arrears</span></div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Amount (RM)</label>
                          <input 
                            type="number" 
                            value={backPayAmt} 
                            onChange={(e) => setBackPayAmt(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Description</label>
                          <input 
                            type="text" 
                            placeholder="e.g. June Increment Adjustment" 
                            value={backPayDesc} 
                            onChange={(e) => setBackPayDesc(e.target.value)} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 rounded border border-neutral-border/50 grid grid-cols-2 gap-2 text-left">
                        <div className="col-span-2"><span className="text-xs font-bold text-on-surface">AWS (13th Month / Retainer Bonus)</span></div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Amount (RM)</label>
                          <input 
                            type="number" 
                            value={awsAmt} 
                            onChange={(e) => setAwsAmt(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Description</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Year-End AWS" 
                            value={awsDesc} 
                            onChange={(e) => setAwsDesc(e.target.value)} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Compensation & Reimbursements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-neutral-50 rounded border border-neutral-border/50 grid grid-cols-2 gap-2 text-left">
                        <div className="col-span-2"><span className="text-xs font-bold text-on-surface">Severance / Compensation</span></div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Amount (RM)</label>
                          <input 
                            type="number" 
                            value={compensationAmt} 
                            onChange={(e) => setCompensationAmt(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Description</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Redundancy package" 
                            value={compensationDesc} 
                            onChange={(e) => setCompensationDesc(e.target.value)} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 rounded border border-neutral-border/50 grid grid-cols-2 gap-2 text-left">
                        <div className="col-span-2"><span className="text-xs font-bold text-on-surface">Reimbursements (AL Encashment, claims, etc.)</span></div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Amount (RM)</label>
                          <input 
                            type="number" 
                            value={reimbursementAmt} 
                            onChange={(e) => setReimbursementAmt(Number(e.target.value))} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">Description</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Dental claim, Medical claim" 
                            value={reimbursementDesc} 
                            onChange={(e) => setReimbursementDesc(e.target.value)} 
                            className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <SocsoCalculatorCard 
                  employee={activeEmployee}
                  payrollPeriod={`${payYear}-${String(payMonthIndex).padStart(2, '0')}`}
                  onRecalculate={() => {
                    alert('Recalculated current pay run SOCSO contributions based on active statutory brackets!');
                  }}
                  onReviewCategory={() => {
                    alert('Please go to the Employee Management tab to review the employee\'s statutory profile, date of birth, NRIC, and multiple employer selections.');
                  }}
                />

                {/* 3. Deductions Panel */}
                <div className="bg-white p-4 rounded border border-neutral-border/60 space-y-3">
                  <h3 className="font-bold text-xs text-error uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-error" /> 3. Deductions & Custom Taxes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">Unpaid Leave Deductions (RM)</label>
                      <input 
                        type="number" 
                        value={unpaidLeave} 
                        onChange={(e) => setUnpaidLeave(Number(e.target.value))} 
                        className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">Payment in Lieu Deductions (RM)</label>
                      <input 
                        type="number" 
                        value={deductionInLieu} 
                        onChange={(e) => setDeductionInLieu(Number(e.target.value))} 
                        className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">CP38 Direct Tax Deduction (RM)</label>
                      <input 
                        type="number" 
                        value={deductionCp38} 
                        onChange={(e) => setDeductionCp38(Number(e.target.value))} 
                        className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1 flex justify-between">
                        <span>Monthly Income Tax (PCB) (RM)</span>
                        <button
                          type="button"
                          onClick={() => setTempTax(computedAutoPcb)}
                          className="text-[10px] text-primary hover:underline font-bold"
                          title="Apply Auto Calculated PCB"
                        >
                          Use Auto: RM {computedAutoPcb.toFixed(2)}
                        </button>
                      </label>
                      <input 
                        type="number" 
                        value={tempTax} 
                        onChange={(e) => setTempTax(Number(e.target.value))} 
                        className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                      />
                    </div>
                    <div className="p-2.5 bg-neutral-50 rounded border border-neutral-border/40 grid grid-cols-2 gap-1.5 col-span-1 md:col-span-2 text-left">
                      <div className="col-span-2"><span className="text-[10px] font-bold text-on-surface uppercase">Other Deductions (e.g. Loans, Gym)</span></div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase">Amount (RM)</label>
                        <input 
                          type="number" 
                          value={deductionOthers} 
                          onChange={(e) => setDeductionOthers(Number(e.target.value))} 
                          className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase">Description</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Loan Repayment" 
                          value={deductionOthersDesc} 
                          onChange={(e) => setDeductionOthersDesc(e.target.value)} 
                          className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-border">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-white border border-neutral-border hover:bg-neutral-100 rounded text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={saveEdit}
                    className="px-4 py-2 bg-primary text-[#f7f0e0] rounded text-xs font-bold hover:bg-primary-dark transition-all cursor-pointer shadow-xs"
                  >
                    Recalculate & Save
                  </button>
                </div>
              </div>
            )}

            {/* Payslip Render Paper */}
            <div className="border border-neutral-border p-6 rounded bg-surface-container-lowest space-y-6 text-on-surface text-sm">
              
              {/* Document Header */}
              <div className="flex justify-between border-b border-neutral-border/50 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-primary tracking-tight leading-none uppercase">PAYSLIP</h3>
                  <p className="text-xs text-on-surface-variant mt-1">{selectedPayPeriod}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{activeEntity?.name || 'Mega HR'}</p>
                  <p className="text-[10px] text-on-surface-variant max-w-[220px] ml-auto whitespace-pre-wrap">
                    {activeEntity?.address || 'No registered corporate address'}
                  </p>
                </div>
              </div>

              {/* Employee Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-on-surface-variant">Employee Name</p>
                  <p className="font-bold text-sm text-on-surface">{activeEmployee.name}</p>
                  <p className="text-on-surface-variant mt-2">Designation</p>
                  <p className="text-on-surface font-medium">{activeEmployee.designation}</p>
                  <p className="text-on-surface-variant mt-2">Department</p>
                  <p className="text-on-surface font-medium">{activeEmployee.department}</p>
                  <p className="text-on-surface-variant mt-2">TIN / Tax Number</p>
                  <p className="text-on-surface font-medium font-mono">{activeEmployee.taxNumber || 'N/A'}</p>
                </div>
                <div className="text-right sm:text-left sm:pl-10">
                  <p className="text-on-surface-variant">Email Address</p>
                  <p className="font-bold text-on-surface truncate" title={activeEmployee.email}>{activeEmployee.email}</p>
                  <p className="text-on-surface-variant mt-2">Bank Account</p>
                  <p className="text-on-surface font-mono font-medium">{activeEmployee.bankName} · {activeEmployee.accountNo}</p>
                  <p className="text-on-surface-variant mt-2">Payment Date</p>
                  <p className="text-on-surface font-medium">
                    {(() => {
                      const parts = selectedPayPeriod.split(' ');
                      if (parts.length === 2) {
                        const month = parts[0];
                        const year = parts[1];
                        return `28 ${month.substring(0, 3)} ${year}`;
                      }
                      return '28 Oct 2026';
                    })()}
                  </p>
                  <p className="text-on-surface-variant mt-2">EPF Member Number</p>
                  <p className="text-on-surface font-medium font-mono">{activeEmployee.epfNumber || 'N/A'}</p>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-border/30">
                
                {/* Earnings Table */}
                <div className="space-y-2 text-left">
                  <h4 className="font-bold text-primary border-b border-neutral-border/50 pb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-600" /> Earnings & Additions
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span>{getPayslipLabel(activeEmployee.employmentType)}</span><span className="font-mono">RM {baseSalaryBeforeProration.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    
                    {/* Allowances breakdown */}
                    {(activeEmployee.allowanceGeneral || 0) > 0 && (
                      <div className="flex justify-between"><span>General Allowance</span><span className="font-mono">RM {(activeEmployee.allowanceGeneral || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}
                    {(activeEmployee.allowanceTransport !== undefined ? activeEmployee.allowanceTransport : activeEmployee.transportAllowance) > 0 && (
                      <div className="flex justify-between"><span>Transport Allowance</span><span className="font-mono">RM {Number(activeEmployee.allowanceTransport !== undefined ? activeEmployee.allowanceTransport : activeEmployee.transportAllowance).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}
                    {(activeEmployee.allowanceParking || 0) > 0 && (
                      <div className="flex justify-between"><span>Parking Allowance</span><span className="font-mono">RM {(activeEmployee.allowanceParking || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}
                    {(activeEmployee.allowanceMeal || 0) > 0 && (
                      <div className="flex justify-between"><span>Meal Allowance</span><span className="font-mono">RM {(activeEmployee.allowanceMeal || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}
                    {(activeEmployee.allowanceAccommodation !== undefined ? activeEmployee.allowanceAccommodation : activeEmployee.housingAllowance) > 0 && (
                      <div className="flex justify-between"><span>Accommodation Allowance</span><span className="font-mono">RM {Number(activeEmployee.allowanceAccommodation !== undefined ? activeEmployee.allowanceAccommodation : activeEmployee.housingAllowance).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}
                    {(activeEmployee.allowancePhone || 0) > 0 && (
                      <div className="flex justify-between"><span>Phone Allowance</span><span className="font-mono">RM {(activeEmployee.allowancePhone || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}
                    
                    {activeEmployee.overtime > 0 && (
                      <div className="flex justify-between"><span>Overtime</span><span className="font-mono">RM {activeEmployee.overtime.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}

                    {/* Supplemental Payments breakdown */}
                    {((activeEmployee.bonusAmount !== undefined ? activeEmployee.bonusAmount : activeEmployee.performanceBonus) || 0) > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <span>Performance Bonus</span>
                          {activeEmployee.bonusDesc && <p className="text-[10px] text-on-surface-variant italic leading-none">{activeEmployee.bonusDesc}</p>}
                        </div>
                        <span className="font-mono">RM {Number(activeEmployee.bonusAmount !== undefined ? activeEmployee.bonusAmount : activeEmployee.performanceBonus).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                    )}
                    {(activeEmployee.commissionAmount || 0) > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <span>Commissions</span>
                          {activeEmployee.commissionDesc && <p className="text-[10px] text-on-surface-variant italic leading-none">{activeEmployee.commissionDesc}</p>}
                        </div>
                        <span className="font-mono">RM {(activeEmployee.commissionAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                    )}
                    {(activeEmployee.backPayAmount || 0) > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <span>BackPay / Arrears</span>
                          {activeEmployee.backPayDesc && <p className="text-[10px] text-on-surface-variant italic leading-none">{activeEmployee.backPayDesc}</p>}
                        </div>
                        <span className="font-mono">RM {(activeEmployee.backPayAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                    )}
                    {(activeEmployee.awsAmount || 0) > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <span>AWS (13th Month)</span>
                          {activeEmployee.awsDesc && <p className="text-[10px] text-on-surface-variant italic leading-none">{activeEmployee.awsDesc}</p>}
                        </div>
                        <span className="font-mono">RM {(activeEmployee.awsAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                    )}
                    {(activeEmployee.compensationAmount || 0) > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <span>Compensation / Severance</span>
                          {activeEmployee.compensationDesc && <p className="text-[10px] text-on-surface-variant italic leading-none">{activeEmployee.compensationDesc}</p>}
                        </div>
                        <span className="font-mono">RM {(activeEmployee.compensationAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                    )}

                    {/* Reimbursements */}
                    {(activeEmployee.reimbursementAmount || 0) > 0 && (
                      <div className="flex justify-between items-start bg-neutral-100 p-1.5 rounded">
                        <div>
                          <span className="font-semibold text-secondary-container">Reimbursements (Tax-Free)</span>
                          {activeEmployee.reimbursementDesc && <p className="text-[10px] text-on-surface-variant italic leading-none">{activeEmployee.reimbursementDesc}</p>}
                        </div>
                        <span className="font-mono font-semibold text-secondary-container">RM {(activeEmployee.reimbursementAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-neutral-border/30 pt-1.5 font-bold text-primary">
                      <span>Total Earnings & Reimbursements</span>
                      <span className="font-mono">RM {(payrollBreakdown.grossEarnings + prorationDeduction + payrollBreakdown.reimbursementsSum).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="space-y-2 text-left">
                  <h4 className="font-bold text-error border-b border-neutral-border/50 pb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-error" /> Deductions
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {prorationDeduction > 0 && (
                      <div className="flex justify-between bg-red-50 p-1.5 rounded">
                        <div>
                          <span className="font-semibold text-error text-[11px]">Prorated Basic Salary Deduction</span>
                          {prorationDetails && <p className="text-[10px] text-on-surface-variant font-medium mt-0.5 leading-tight">{prorationDetails}</p>}
                        </div>
                        <span className="font-mono text-error font-semibold">RM {prorationDeduction.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                    )}
                    <div className="flex justify-between"><span>EPF (Employee {activeEmployee.epfRateEmployee}%)</span><span className="font-mono">RM {payrollBreakdown.epfEmployeeValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    {payrollBreakdown.socsoEmployeeVal > 0 && (
                      <div className="flex justify-between"><span>SOCSO (Invalidity)</span><span className="font-mono">RM {payrollBreakdown.socsoEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}
                    {payrollBreakdown.skbbkEmpVal > 0 && (
                      <div className="flex justify-between"><span>SOCSO (LINDUNG 24 Jam)</span><span className="font-mono">RM {payrollBreakdown.skbbkEmpVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}
                    <div className="flex justify-between"><span>EIS</span><span className="font-mono">RM {payrollBreakdown.eisEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between"><span>Income Tax (PCB)</span><span className="font-mono">RM {payrollBreakdown.taxPcbVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    
                    {/* Unpaid Leave */}
                    {(activeEmployee.unpaidLeave || 0) > 0 && (
                      <div className="flex justify-between"><span>Unpaid Leave</span><span className="font-mono">RM {(activeEmployee.unpaidLeave || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}

                    {/* Payment in Lieu */}
                    {(activeEmployee.deductionInLieu || 0) > 0 && (
                      <div className="flex justify-between"><span>Payment in Lieu (Notice Deduction)</span><span className="font-mono">RM {(activeEmployee.deductionInLieu || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}

                    {/* CP38 */}
                    {(activeEmployee.deductionCp38 || 0) > 0 && (
                      <div className="flex justify-between"><span>CP38 Additional Tax</span><span className="font-mono">RM {(activeEmployee.deductionCp38 || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    )}

                    {/* Custom Others */}
                    {(activeEmployee.deductionOthers || 0) > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <span>Other Deductions</span>
                          {activeEmployee.deductionOthersDesc && <p className="text-[10px] text-on-surface-variant italic leading-none">{activeEmployee.deductionOthersDesc}</p>}
                        </div>
                        <span className="font-mono">RM {(activeEmployee.deductionOthers || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-neutral-border/30 pt-1.5 font-bold text-error">
                      <span>Total Deductions</span>
                      <span className="font-mono">RM {(payrollBreakdown.totalDeductions + prorationDeduction).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Employer Contributions Box */}
              <div className="bg-surface-container-low p-3.5 rounded border border-neutral-border/50 text-xs space-y-2">
                <h4 className="font-bold text-on-surface-variant flex items-center gap-1">
                  Employer Contributions <span className="text-[10px] font-normal text-on-surface-variant">(Not paid to employee)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono font-medium">
                  <div>
                    <span className="text-on-surface-variant block font-sans font-semibold">EPF ({activeEmployee.epfRateEmployer || (activeEmployee.basicSalary <= 5000 ? 13 : 12)}%)</span>
                    <span className="font-bold text-on-surface">RM {payrollBreakdown.epfEmployerValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block font-sans font-semibold">SOCSO</span>
                    <span className="font-bold text-on-surface">RM {payrollBreakdown.socsoEmployerVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  {payrollBreakdown.skbbkEmplyrVal > 0 && (
                    <div>
                      <span className="text-on-surface-variant block font-sans font-semibold">SOCSO (SKBBK)</span>
                      <span className="font-bold text-on-surface">RM {payrollBreakdown.skbbkEmplyrVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-on-surface-variant block font-sans font-semibold">EIS</span>
                    <span className="font-bold text-on-surface">RM {payrollBreakdown.eisEmployerVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>

              {/* YTD Cumulative Balances Box */}
              <div className="bg-neutral-50 p-4 rounded border border-neutral-border/50 text-xs space-y-3">
                <div className="flex justify-between items-center border-b border-neutral-border/40 pb-1.5">
                  <h4 className="font-bold text-primary flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-primary" /> Year-to-Date (YTD) Balances
                  </h4>
                  <span className="text-[10px] font-mono text-on-surface-variant bg-neutral-200/60 px-2 py-0.5 rounded-full font-semibold">
                    Accrued up to {selectedPayPeriod} ({calculateYtd(activeEmployee, selectedPayPeriod).months} Months)
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-2 border border-neutral-border/30 rounded text-left">
                    <span className="text-[10px] text-on-surface-variant block font-semibold uppercase tracking-wider">YTD Gross Pay</span>
                    <span className="font-bold font-mono text-on-surface text-sm">RM {calculateYtd(activeEmployee, selectedPayPeriod).grossEarnings.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="bg-white p-2 border border-neutral-border/30 rounded text-left">
                    <span className="text-[10px] text-on-surface-variant block font-semibold uppercase tracking-wider">YTD EPF (Emp)</span>
                    <span className="font-bold font-mono text-on-surface text-sm">RM {calculateYtd(activeEmployee, selectedPayPeriod).epfEmployee.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="bg-white p-2 border border-neutral-border/30 rounded text-left">
                    <span className="text-[10px] text-on-surface-variant block font-semibold uppercase tracking-wider">YTD Tax (PCB)</span>
                    <span className="font-bold font-mono text-error text-sm">RM {calculateYtd(activeEmployee, selectedPayPeriod).taxPcb.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="bg-white p-2 border border-neutral-border/30 rounded text-left bg-primary/5 border-primary/20">
                    <span className="text-[10px] text-primary block font-semibold uppercase tracking-wider">YTD Net Pay</span>
                    <span className="font-bold font-mono text-primary text-sm">RM {calculateYtd(activeEmployee, selectedPayPeriod).netPay.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-on-surface-variant bg-white p-2 rounded border border-neutral-border/20 text-left">
                  <div>
                    <span>YTD Allowances:</span> <span className="font-semibold font-mono text-on-surface">RM {calculateYtd(activeEmployee, selectedPayPeriod).allowances.toLocaleString()}</span>
                  </div>
                  <div>
                    <span>YTD SOCSO (Emp):</span> <span className="font-semibold font-mono text-on-surface">RM {calculateYtd(activeEmployee, selectedPayPeriod).socsoEmployee.toLocaleString()}</span>
                  </div>
                  {calculateYtd(activeEmployee, selectedPayPeriod).skbbkEmployee > 0 && (
                    <div>
                      <span>YTD SKBBK (Emp):</span> <span className="font-semibold font-mono text-on-surface">RM {calculateYtd(activeEmployee, selectedPayPeriod).skbbkEmployee.toLocaleString()}</span>
                    </div>
                  )}
                  <div>
                    <span>YTD EIS (Emp):</span> <span className="font-semibold font-mono text-on-surface">RM {calculateYtd(activeEmployee, selectedPayPeriod).eisEmployee.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Calculations Math Breakdown Widget */}
              <div className="bg-primary-container/5 p-4 rounded border border-primary-container/20 space-y-2">
                <h4 className="font-bold text-xs text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">calculate</span> Calculations Breakdown
                </h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Gross Earnings (Basic + Allowances)</span>
                    <span className="font-medium font-mono">RM {payrollBreakdown.grossEarnings.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Total Deductions (Tax + Social/EPF)</span>
                    <span className="text-error font-medium font-mono">- RM {payrollBreakdown.totalDeductions.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-border/30 pt-1.5 font-bold text-primary">
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Formula: Gross - Deductions</span>
                    <span className="font-mono text-sm">RM {payrollBreakdown.netPay.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-neutral-border mt-6 gap-4">
            <div className="flex gap-2">
              <button 
                onClick={handleShareEmail}
                className="bg-surface border border-neutral-border hover:bg-surface-container text-primary-container text-xs font-semibold py-2 px-4 rounded flex items-center gap-1.5 transition-colors"
              >
                <Mail className="w-4 h-4" /> Share via Email
              </button>
              
              {!generatedMap[activeEmployee.id] && (
                <button 
                  onClick={() => handleSingleGenerate(activeEmployee.id)}
                  className="bg-green-600 text-white text-xs font-semibold py-2 px-4 rounded hover:bg-green-700 transition-colors"
                >
                  Generate Payslip
                </button>
              )}
            </div>
            
            <div className="text-right">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white bg-primary px-3 py-1 rounded">Net Pay: RM {payrollBreakdown.netPay.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </section>

      </div>
      )}
    </div>
  );
}
