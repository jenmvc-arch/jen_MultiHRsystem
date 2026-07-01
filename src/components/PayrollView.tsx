/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Plus, 
  Printer, 
  Download, 
  Image, 
  Mail, 
  Share2, 
  Eye, 
  CheckCircle, 
  TrendingUp,
  Sliders,
  DollarSign,
  Briefcase,
  FileText,
  Globe,
  Building2
} from 'lucide-react';
import { Employee, CorporateEntity } from '../types';
import { calculatePayslip, getPayslipLabel, calculateYtd } from '../data';
import PayslipDocumentView from './PayslipDocumentView';

interface PayrollViewProps {
  employees: Employee[];
  entities: CorporateEntity[];
  onUpdateEmployeeSalary: (id: string, updates: Partial<Employee>) => void;
  onNavigateToDocument: (employeeId: string) => void;
  onShowNotification: (title: string, message: string) => void;
  activeEntity?: CorporateEntity;
}

export default function PayrollView({
  employees,
  entities,
  onUpdateEmployeeSalary,
  onNavigateToDocument,
  onShowNotification,
  activeEntity
}: PayrollViewProps) {
  const [selectedPayPeriod, setSelectedPayPeriod] = useState('October 2026');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'processing' | 'document'>('processing');
  
  // Local state to track which employees have been fully "Generated" (vs Draft status)
  const [generatedMap, setGeneratedMap] = useState<Record<string, boolean>>({
    'EMP-001': true, // Jane Doe generated
    'EMP-84729': true // Sarah Jenkins generated
  });

  // Edit states for dynamic live testing!
  const [isEditing, setIsEditing] = useState(false);
  const [tempBasic, setTempBasic] = useState(0);
  const [tempTax, setTempTax] = useState(0);

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

  const payrollBreakdown = calculatePayslip(activeEmployee);

  const startEdit = () => {
    setTempBasic(activeEmployee.basicSalary || 0);
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
    onUpdateEmployeeSalary(activeEmployee.id, {
      basicSalary: tempBasic,
      allowanceGeneral: allowanceGen,
      allowanceTransport: allowanceTrans,
      allowanceParking: allowancePark,
      allowanceMeal: allowanceMl,
      allowanceAccommodation: allowanceAccom,
      allowancePhone: allowancePh,
      
      reimbursementAmount: reimbursementAmt,
      reimbursementDesc: reimbursementDesc,
      
      bonusAmount: bonusAmt,
      bonusDesc: bonusDesc,
      performanceBonus: bonusAmt, // sync with performanceBonus for legacy usage

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

      taxPcb: tempTax
    });
    setIsEditing(false);
    onShowNotification(
      'Payslip Updated',
      `Live updates saved and recalculated for ${activeEmployee.name}.`
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

      {activeSubTab === 'document' ? (
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
                <select 
                  value={selectedPayPeriod} 
                  onChange={(e) => setSelectedPayPeriod(e.target.value)}
                  className="w-full rounded border border-neutral-border bg-surface p-1.5 focus:border-primary outline-none"
                >
                  <option>October 2026</option>
                  <option>September 2026</option>
                  <option>August 2026</option>
                </select>
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
                <p className="text-xs text-on-surface-variant mt-0.5">Pay period: October 2023 · Employee status: <span className="font-semibold">{generatedMap[activeEmployee.id] ? 'Generated' : 'Draft'}</span></p>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                        {getPayslipLabel(activeEmployee.employmentType)} (RM)
                      </label>
                      <input 
                        type="number" 
                        value={tempBasic} 
                        onChange={(e) => setTempBasic(Number(e.target.value))} 
                        className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-xs"
                      />
                    </div>
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
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">Monthly Income Tax (PCB) (RM)</label>
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
                  <p className="font-bold text-sm">Acme Global Enterprise</p>
                  <p className="text-[10px] text-on-surface-variant">123 Corporate Tower, Business District</p>
                  <p className="text-[10px] text-on-surface-variant">Kuala Lumpur, Malaysia 50000</p>
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
                  <p className="text-on-surface-variant">Employee ID</p>
                  <p className="font-bold text-on-surface">{activeEmployee.id}</p>
                  <p className="text-on-surface-variant mt-2">Bank Account</p>
                  <p className="text-on-surface font-mono font-medium">{activeEmployee.bankName} · {activeEmployee.accountNo}</p>
                  <p className="text-on-surface-variant mt-2">Payment Date</p>
                  <p className="text-on-surface font-medium">{selectedPayPeriod.includes('October') ? '28 Oct 2026' : selectedPayPeriod.includes('September') ? '28 Sep 2026' : '28 Aug 2026'}</p>
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
                    <div className="flex justify-between"><span>{getPayslipLabel(activeEmployee.employmentType)}</span><span className="font-mono">RM {activeEmployee.basicSalary.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    
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
                      <span className="font-mono">RM {(payrollBreakdown.grossEarnings + payrollBreakdown.reimbursementsSum).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="space-y-2 text-left">
                  <h4 className="font-bold text-error border-b border-neutral-border/50 pb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-error" /> Deductions
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span>EPF (Employee {activeEmployee.epfRateEmployee}%)</span><span className="font-mono">RM {payrollBreakdown.epfEmployeeValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between"><span>SOCSO</span><span className="font-mono">RM {(activeEmployee.socsoEmployee || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    {(() => {
                      const isEligible = 
                        activeEmployee.employmentType === 'Probationary' || 
                        activeEmployee.employmentType === 'Confirmation' || 
                        (activeEmployee.employmentType === 'Independent Contractor / Freelance' && activeEmployee.eligibleForStatutory === 'Yes');
                      const skbbkEmployeeVal = activeEmployee.skbbkEmployee !== undefined ? activeEmployee.skbbkEmployee : (isEligible ? parseFloat(((activeEmployee.socsoEmployee || 0) * 0.25).toFixed(2)) : 0);
                      return skbbkEmployeeVal > 0 ? (
                        <div className="flex justify-between"><span>SOCSO (SKBBK)</span><span className="font-mono">RM {skbbkEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                      ) : null;
                    })()}
                    <div className="flex justify-between"><span>EIS</span><span className="font-mono">RM {(activeEmployee.eisEmployee || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between"><span>Income Tax (PCB)</span><span className="font-mono">RM {(activeEmployee.taxPcb || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                    
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
                      <span className="font-mono">RM {payrollBreakdown.totalDeductions.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Employer Contributions Box */}
              <div className="bg-surface-container-low p-3.5 rounded border border-neutral-border/50 text-xs space-y-2">
                <h4 className="font-bold text-on-surface-variant flex items-center gap-1">
                  Employer Contributions <span className="text-[10px] font-normal text-on-surface-variant">(Not paid to employee)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-on-surface-variant block">EPF ({activeEmployee.epfRateEmployer}%)</span>
                    <span className="font-bold font-mono text-on-surface">RM {Math.round(activeEmployee.basicSalary * activeEmployee.epfRateEmployer / 100).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">SOCSO</span>
                    <span className="font-bold font-mono text-on-surface">RM {activeEmployee.socsoEmployer.toLocaleString()}</span>
                  </div>
                  {(() => {
                    const isEligible = 
                      activeEmployee.employmentType === 'Probationary' || 
                      activeEmployee.employmentType === 'Confirmation' || 
                      (activeEmployee.employmentType === 'Independent Contractor / Freelance' && activeEmployee.eligibleForStatutory === 'Yes');
                    const skbbkEmployerVal = activeEmployee.skbbkEmployer !== undefined ? activeEmployee.skbbkEmployer : (isEligible ? parseFloat(((activeEmployee.socsoEmployer || 0) * 0.25).toFixed(2)) : 0);
                    return skbbkEmployerVal > 0 ? (
                      <div>
                        <span className="text-on-surface-variant block">SOCSO (SKBBK)</span>
                        <span className="font-bold font-mono text-on-surface">RM {skbbkEmployerVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                    ) : null;
                  })()}
                  <div>
                    <span className="text-on-surface-variant block">EIS</span>
                    <span className="font-bold font-mono text-on-surface">RM {activeEmployee.eisEmployer.toLocaleString()}</span>
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
