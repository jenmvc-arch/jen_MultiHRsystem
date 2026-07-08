/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Minus, 
  Plus, 
  RotateCw, 
  Printer, 
  Download,
  AlertCircle,
  Building2,
  User,
  Mail,
  Briefcase,
  Award
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { PayslipPDFDocument } from './PayslipPDFDocument';
import { Employee, CorporateEntity } from '../types';
import { calculatePayslip, getPayslipLabel, getAdjustedBasicSalary, getDirectLogoUrl, calculateSocsoContribution, getEmployeeForMonth } from '../data';
import { formatToDDMMMYYYY } from '../lib/dateUtils';

interface PayslipDocumentViewProps {
  employees: Employee[];
  selectedEmployeeId: string;
  onBack: () => void;
  onShowNotification: (title: string, message: string) => void;
  activeEntity?: CorporateEntity;
  isPrintView?: boolean;
  payMonth?: number;
  payYear?: number;
  userRole?: string;
  entities?: CorporateEntity[];
}

export default function PayslipDocumentView({
  employees,
  selectedEmployeeId,
  onBack,
  onShowNotification,
  activeEntity,
  isPrintView = false,
  payMonth: propPayMonth,
  payYear: propPayYear,
  userRole = 'Global Administrator',
  entities
}: PayslipDocumentViewProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const rawActiveEmployee = employees.find(e => e.id === selectedEmployeeId) || employees[0];

  if (!rawActiveEmployee) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-neutral-border">
        No active employee found for document viewing.
      </div>
    );
  }

  const params = new URLSearchParams(window.location.search);
  const payMonth = propPayMonth !== undefined ? propPayMonth : (params.get('month') ? parseInt(params.get('month')!, 10) : 10);
  const payYear = propPayYear !== undefined ? propPayYear : (params.get('year') ? parseInt(params.get('year')!, 10) : 2026);

  const activeEmployee = getEmployeeForMonth(rawActiveEmployee, payMonth);
  const breakdown = calculatePayslip(activeEmployee, payMonth, payYear);
  const employeeEntity = entities?.find(ent => ent.id === activeEmployee.entityId) || activeEntity;

  const basicSalaryForSocso = getAdjustedBasicSalary(activeEmployee, payMonth, payYear);
  const overtimeForSocso = activeEmployee.overtime || 0;
  const commissionForSocso = activeEmployee.commissionAmount || 0;
  const allowanceGenForSocso = activeEmployee.allowanceGeneral || 0;
  const allowanceTransForSocso = activeEmployee.allowanceTransport !== undefined ? activeEmployee.allowanceTransport : (activeEmployee.transportAllowance || 0);
  const allowanceParkForSocso = activeEmployee.allowanceParking || 0;
  const allowanceMlForSocso = activeEmployee.allowanceMeal || 0;
  const allowanceAccomForSocso = activeEmployee.allowanceAccommodation !== undefined ? activeEmployee.allowanceAccommodation : (activeEmployee.housingAllowance || 0);
  const allowancePhForSocso = activeEmployee.allowancePhone || 0;
  const backPayForSocso = activeEmployee.backPayAmount || 0;
  const unpaidLeaveForSocso = activeEmployee.unpaidLeave || 0;

  const payrollItemsForSocso = [
    { code: 'basic_salary', amount: basicSalaryForSocso },
    { code: 'overtime', amount: overtimeForSocso },
    { code: 'commission', amount: commissionForSocso },
    { code: 'allowance_general', amount: allowanceGenForSocso },
    { code: 'allowance_transport', amount: allowanceTransForSocso },
    { code: 'allowance_parking', amount: allowanceParkForSocso },
    { code: 'allowance_meal', amount: allowanceMlForSocso },
    { code: 'allowance_accommodation', amount: allowanceAccomForSocso },
    { code: 'allowance_phone', amount: allowancePhForSocso },
    { code: 'backpay', amount: backPayForSocso }
  ];
  if (unpaidLeaveForSocso > 0) {
    payrollItemsForSocso.push({ code: 'unpaid_leave', amount: unpaidLeaveForSocso });
  }

  const socsoRes = calculateSocsoContribution({
    employee: activeEmployee,
    payrollPeriod: `${payYear}-${String(payMonth).padStart(2, '0')}`,
    payrollItems: payrollItemsForSocso
  });

  let baseSalaryBeforeProration = activeEmployee.basicSalary;
  if (activeEmployee.salaryAdjustments && activeEmployee.salaryAdjustments.length > 0) {
    const activeAdjustments = activeEmployee.salaryAdjustments
      .filter(adj => {
        const effDate = new Date(adj.effectiveDate);
        const effYear = effDate.getFullYear();
        const effMonth = effDate.getMonth() + 1;
        return (effYear < payYear) || (effYear === payYear && effMonth <= payMonth);
      })
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    if (activeAdjustments.length > 0) {
      baseSalaryBeforeProration = activeAdjustments[0].adjustedSalary;
    }
  }

  const actualBasic = getAdjustedBasicSalary(activeEmployee, payMonth, payYear);
  const prorationDeduction = parseFloat((baseSalaryBeforeProration - actualBasic).toFixed(2));

  let prorationDetails = '';
  if (prorationDeduction > 0 && activeEmployee.dateOfJoined) {
    const joinDate = new Date(activeEmployee.dateOfJoined);
    const joinYear = joinDate.getFullYear();
    const joinMonth = joinDate.getMonth() + 1;
    if (joinYear === payYear && joinMonth === payMonth) {
      const joinDay = joinDate.getDate();
      const calendarDays = new Date(payYear, payMonth, 0).getDate();
      const unpaidDays = joinDay - 1;
      prorationDetails = `Joined mid-month on ${formatToDDMMMYYYY(activeEmployee.dateOfJoined)}. Deducted ${unpaidDays}/${calendarDays} unpaid days.`;
    } else {
      prorationDetails = `Deduction for incomplete month of service.`;
    }
  }

  const monthNameForPeriod = new Date(payYear, payMonth - 1).toLocaleDateString('en-US', { month: 'long' });
  const lastDayForPeriod = new Date(payYear, payMonth, 0).getDate();
  const payPeriodString = `01 ${monthNameForPeriod} ${payYear} – ${lastDayForPeriod} ${monthNameForPeriod} ${payYear}`;

  const isEligible = 
    activeEmployee.employmentType === 'Probationary' || 
    activeEmployee.employmentType === 'Confirmation' || 
    (activeEmployee.employmentType === 'Independent Contractor / Freelance' && activeEmployee.eligibleForStatutory === 'Yes');

  const skbbkEmployeeVal = activeEmployee.skbbkEmployee !== undefined ? activeEmployee.skbbkEmployee : (isEligible ? parseFloat(((activeEmployee.socsoEmployee || 0) * 0.25).toFixed(2)) : 0);
  const skbbkEmployerVal = activeEmployee.skbbkEmployer !== undefined ? activeEmployee.skbbkEmployer : (isEligible ? parseFloat(((activeEmployee.socsoEmployer || 0) * 0.25).toFixed(2)) : 0);

  const handleZoomIn = () => {
    if (zoom < 150) setZoom(prev => prev + 10);
  };

  const handleZoomOut = () => {
    if (zoom > 70) setZoom(prev => prev - 10);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handlePrint = () => {
    const monthsList = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const formattedMonthYear = `${monthsList[payMonth - 1]}${payYear}`;
    const cleanEmpName = activeEmployee.name.replace(/\s+/g, '_');
    const fileName = `${cleanEmpName}_${formattedMonthYear}_Payslip.pdf`;
    onShowNotification('Print Job Sent', `Sending ${fileName} to your configured system printer.`);
    window.print();
  };

  const handleDownload = async () => {
    const monthsList = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const formattedMonthYear = `${monthsList[payMonth - 1]}${payYear}`;
    const cleanEmpName = activeEmployee.name.replace(/\s+/g, '_');
    const fileName = `${cleanEmpName}_${formattedMonthYear}_Payslip.pdf`;
    onShowNotification('Download Started', `Generating and downloading ${fileName} in your browser...`);
    
    try {
      const doc = <PayslipPDFDocument employee={activeEmployee} entity={employeeEntity || activeEntity || (entities && entities[0])!} month={payMonth} year={payYear} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[PDF Download] Failed client-side generation:', err);
      onShowNotification('Download Failed', `Could not generate PDF. Please try print to PDF option.`);
    }
  };

  const isTheme2 = employeeEntity?.theme === 'theme2';
  const themeStyles = isTheme2 ? {
    '--color-primary': '#A32626',
    '--color-primary-container': '#A32626',
    '--color-secondary': '#F2E8D8',
    '--color-on-secondary-container': '#333333',
    '--color-on-surface': '#333333',
    '--color-on-surface-variant': '#333333',
    '--color-error': '#A32626',
    '--color-neutral-border': '#E6D8C1',
    '--color-surface-container-low': '#F2E8D8',
    '--color-surface-container': '#F2E8D8',
    color: '#333333'
  } as React.CSSProperties : {};

  return (
    <div 
      className={isPrintView ? "bg-white w-full select-text text-left flex justify-center" : "flex flex-col h-screen w-full bg-surface-container-highest overflow-hidden animate-in fade-in duration-200"}
      style={themeStyles}
    >
      
      {/* Viewer Toolbar */}
      {!isPrintView && (
        <div className="h-14 bg-zinc-900 flex items-center justify-between px-4 shadow-md z-10 shrink-0 select-none">
          {/* Left Controls */}
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="text-white hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col text-left">
              <span className="text-white text-xs font-semibold truncate max-w-[200px] md:max-w-[400px]">
                Payslip_{activeEmployee.id}_{activeEmployee.name.replace(/\s+/g, '_').toUpperCase()}_{payYear}-{String(payMonth).padStart(2, '0')}.pdf
              </span>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">
                {employeeEntity?.name || 'Corporate Subsidiary'}
              </span>
            </div>
          </div>

          {/* Center Controls (Zoom & Page) - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-3 bg-black/20 rounded px-2.5 py-1">
            <button 
              onClick={handleZoomOut}
              className="text-white hover:bg-white/10 p-1 rounded transition-colors flex items-center justify-center cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-white text-xs font-bold px-2 w-[45px] text-center">{zoom}%</span>
            <button 
              onClick={handleZoomIn}
              className="text-white hover:bg-white/10 p-1 rounded transition-colors flex items-center justify-center cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <span className="text-white text-xs font-semibold px-2">1 / 1</span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRotate}
              className="text-white hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer" 
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button 
              onClick={handlePrint}
              className="text-white hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer" 
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              onClick={handleDownload}
              className="text-white hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer" 
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Viewer Canvas (Scrollable) */}
      <div className={isPrintView ? "w-full flex justify-center" : "flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start"}>
        {/* Document (Payslip Page) */}
        <div 
          id="payslip-pdf-content"
          style={{ 
            transform: isPrintView ? 'none' : `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out',
            ...themeStyles
          }}
          className={isPrintView ? "bg-white w-full max-w-[800px] min-h-[960px] p-8 md:p-12 text-left relative" : "bg-white w-full max-w-[800px] min-h-[960px] shadow-2xl my-4 p-8 md:p-12 border border-neutral-border/40 text-left select-text relative"}
        >
          {/* Subtle PDF watermark/grid header */}
          <div className="absolute top-2 right-4 text-[9px] text-on-surface-variant/30 font-mono select-none">
            CONFIDENTIAL - STRICTLY PRIVATE
          </div>

          {/* Option A Branding Header */}
          <div className="flex justify-between items-stretch border-b-4 border-[#A32626] pb-4 mb-6 select-none bg-white relative">
            <div className="flex items-start gap-4 py-2">
              {/* Logo container */}
              <div className="w-44 h-16 rounded bg-white flex items-center justify-center overflow-hidden shrink-0 relative">
                {employeeEntity?.logoUrl && !employeeEntity.logoUrl.includes('placeholder') && !employeeEntity.logoUrl.includes('example.com') ? (
                  <>
                    <img 
                      src={getDirectLogoUrl(employeeEntity.logoUrl)} 
                      alt={employeeEntity.name} 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div style={{ display: 'none' }} className="w-full h-full flex items-center justify-center bg-[#F2E8D8] text-[#A32626] font-bold text-2xl uppercase">
                      {employeeEntity.name.substring(0, 2)}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#F2E8D8] text-[#A32626] font-bold text-2xl uppercase">
                    {employeeEntity?.name ? employeeEntity.name.substring(0, 2) : 'RP'}
                  </div>
                )}
              </div>

              {/* Company Details */}
              <div className="text-left text-[#333333]">
                <h1 className="text-xl font-black text-[#A32626] tracking-tight font-sans">
                  {employeeEntity?.name || 'Red Point Sdn Bhd'}
                </h1>
                {employeeEntity?.registrationNumber && (
                  <p className="text-[10px] text-[#333333] font-mono font-bold mt-0.5">
                    Co. Reg: {employeeEntity.registrationNumber}
                  </p>
                )}
                <div className="flex items-start gap-1 mt-1 text-[11px] text-[#333333] leading-normal max-w-[400px]">
                  <span className="text-[#A32626] mt-0.5 shrink-0 font-bold">📍</span>
                  <p className="font-medium">{employeeEntity?.address || 'No registered corporate address'}</p>
                </div>
              </div>
            </div>

            {/* Right side banner block */}
            <div className="bg-[#A32626] text-white px-6 py-4 flex flex-col justify-center items-center rounded-l-lg min-w-[140px] text-center self-stretch">
              <span className="text-xs uppercase tracking-widest font-black opacity-80 text-[#F2E8D8]">PAYSLIP</span>
              <span className="text-sm font-bold mt-1 font-mono">
                {new Date(payYear, payMonth - 1).toLocaleDateString('en-US', {month: 'short', year: 'numeric'})}
              </span>
            </div>
          </div>

          {/* Employee Details Card (Option A styled) */}
          <div className="bg-[#F2E8D8] border border-[#E5DED5] rounded-lg p-5 mb-6 text-left select-none">
            {/* Title with Deep Red icon */}
            <div className="flex items-center gap-2 mb-3 border-b border-[#E5DED5] pb-2 text-[#A32626]">
              <User className="w-4 h-4 text-[#A32626]" />
              <span className="text-xs font-black uppercase tracking-wider">Employee Details</span>
            </div>

            {/* Employee Name */}
            <h2 className="text-lg font-black text-[#333333] uppercase mb-4 tracking-tight">
              {activeEmployee.name}
            </h2>

            {/* 3-Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[#333333]">
              {/* Left Group */}
              <div className="space-y-2">
                <div className="grid grid-cols-[145px_1fr] gap-2 py-0.5 text-left">
                  <span className="font-semibold text-[#6B6B6B]">TIN / Tax Number</span>
                  <span className="font-mono font-bold text-[#333333]">{activeEmployee.taxNumber || 'IG 29068110030'}</span>
                </div>
                <div className="grid grid-cols-[145px_1fr] gap-2 py-0.5 text-left">
                  <span className="font-semibold text-[#6B6B6B]">EPF Member Number</span>
                  <span className="font-mono font-bold text-[#333333]">{activeEmployee.epfNumber || '-'}</span>
                </div>
                <div className="grid grid-cols-[145px_1fr] gap-2 py-0.5 text-left">
                  <span className="font-semibold text-[#6B6B6B]">NRIC / Passport</span>
                  <span className="font-mono font-bold text-[#333333]">{activeEmployee.nricPassport || '-'}</span>
                </div>
                <div className="grid grid-cols-[145px_1fr] gap-2 py-0.5 text-left">
                  <span className="font-semibold text-[#6B6B6B]">Date Joined</span>
                  <span className="font-mono font-bold text-[#333333]">{formatToDDMMMYYYY(activeEmployee.dateOfJoined)}</span>
                </div>
                <div className="grid grid-cols-[145px_1fr] gap-2 py-0.5 text-left">
                  <span className="font-semibold text-[#6B6B6B]">Employment Status</span>
                  <span className="font-bold text-[#333333]">{activeEmployee.employmentType || 'Confirmation'}</span>
                </div>
              </div>

              {/* Middle Group */}
              <div className="space-y-2">
                <div className="grid grid-cols-[115px_1fr] gap-2 py-0.5 text-left">
                  <span className="font-semibold text-[#6B6B6B]">Email Address</span>
                  <span className="font-bold text-[#333333] truncate" title={activeEmployee.email}>
                    {activeEmployee.email}
                  </span>
                </div>
                <div className="grid grid-cols-[115px_1fr] gap-2 py-0.5 text-left">
                  <span className="font-semibold text-[#6B6B6B]">Department</span>
                  <span className="font-bold text-[#333333]">{activeEmployee.department}</span>
                </div>
                <div className="grid grid-cols-[115px_1fr] gap-2 py-0.5 text-left">
                  <span className="font-semibold text-[#6B6B6B]">Designation</span>
                  <span className="font-bold text-[#333333]">{activeEmployee.designation}</span>
                </div>
              </div>

              {/* Right Group with vertical divider */}
              <div className="border-t md:border-t-0 md:border-l border-[#E5DED5] pt-4 md:pt-0 md:pl-6 text-left">
                <div className="flex items-center gap-2 mb-2 text-[#A32626]">
                  <Building2 className="w-4 h-4 text-[#A32626]" />
                  <span className="text-xs font-black uppercase tracking-wider">Bank Details</span>
                </div>
                <p className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider mb-1">Bank Account</p>
                
                <div className="flex items-center gap-2 bg-white/40 p-2 rounded border border-[#E5DED5]/60">
                  <p className="font-mono font-bold text-xs flex-1 break-all text-[#333333]">
                    {(() => {
                      const acc = String(activeEmployee.accountNo || '');
                      if (!acc) return 'Bank account not available.';
                      return `${activeEmployee.bankName || 'N/A'} - ${acc}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Data Table split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            {/* Earnings Table */}
            <div className="bg-white border border-[#E5DED5] rounded-lg p-4">
              <div className="bg-[#A32626] text-white px-3 py-2 rounded font-black text-xs uppercase tracking-wider mb-4">
                Earnings & Additions
              </div>
              <table className="w-full text-xs text-[#333333]">
                <thead>
                  <tr className="border-b border-[#E5DED5] text-[10px] uppercase font-black text-[#6B6B6B]">
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-right">Amount (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DED5]/40">
                  <tr className="hover:bg-[#F2E8D8]/20">
                    <td className="py-2 text-left font-medium">{getPayslipLabel(activeEmployee.employmentType)}</td>
                    <td className="py-2 text-right font-mono font-bold">{baseSalaryBeforeProration.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>

                  {/* Allowances */}
                  {(activeEmployee.allowanceGeneral || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">General Allowance</td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.allowanceGeneral || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.allowanceTransport !== undefined ? activeEmployee.allowanceTransport : activeEmployee.transportAllowance) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">Transport Allowance</td>
                      <td className="py-2 text-right font-mono font-bold">{Number(activeEmployee.allowanceTransport !== undefined ? activeEmployee.allowanceTransport : activeEmployee.transportAllowance).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.allowanceParking || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">Parking Allowance</td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.allowanceParking || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.allowanceMeal || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">Meal Allowance</td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.allowanceMeal || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.allowanceAccommodation !== undefined ? activeEmployee.allowanceAccommodation : activeEmployee.housingAllowance) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">Accommodation Allowance</td>
                      <td className="py-2 text-right font-mono font-bold">{Number(activeEmployee.allowanceAccommodation !== undefined ? activeEmployee.allowanceAccommodation : activeEmployee.housingAllowance).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.allowancePhone || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">Phone Allowance</td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.allowancePhone || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {activeEmployee.overtime > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">Overtime</td>
                      <td className="py-2 text-right font-mono font-bold">{activeEmployee.overtime.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Supplemental Payments */}
                  {((activeEmployee.bonusAmount !== undefined ? activeEmployee.bonusAmount : activeEmployee.performanceBonus) || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left">
                        <div className="text-left">
                          <span className="font-medium">Performance Bonus</span>
                          {activeEmployee.bonusDesc && <p className="text-[10px] text-[#6B6B6B] italic leading-tight">{activeEmployee.bonusDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono font-bold">{Number(activeEmployee.bonusAmount !== undefined ? activeEmployee.bonusAmount : activeEmployee.performanceBonus).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.commissionAmount || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left">
                        <div className="text-left">
                          <span className="font-medium">Commissions</span>
                          {activeEmployee.commissionDesc && <p className="text-[10px] text-[#6B6B6B] italic leading-tight">{activeEmployee.commissionDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.commissionAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.backPayAmount || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left">
                        <div className="text-left">
                          <span className="font-medium">BackPay / Arrears</span>
                          {activeEmployee.backPayDesc && <p className="text-[10px] text-[#6B6B6B] italic leading-tight">{activeEmployee.backPayDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.backPayAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.awsAmount || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left">
                        <div className="text-left">
                          <span className="font-medium">AWS (13th Month)</span>
                          {activeEmployee.awsDesc && <p className="text-[10px] text-[#6B6B6B] italic leading-tight">{activeEmployee.awsDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.awsAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.compensationAmount || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left">
                        <div className="text-left">
                          <span className="font-medium">Compensation / Severance</span>
                          {activeEmployee.compensationDesc && <p className="text-[10px] text-[#6B6B6B] italic leading-tight">{activeEmployee.compensationDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.compensationAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Reimbursements */}
                  {(activeEmployee.reimbursementAmount || 0) > 0 && (
                    <tr className="bg-neutral-50 hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left pl-1">
                        <div className="text-left">
                          <span className="font-semibold text-secondary-container">Reimbursements (Tax-Free)</span>
                          {activeEmployee.reimbursementDesc && <p className="text-[10px] text-[#6B6B6B] italic leading-tight">{activeEmployee.reimbursementDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-secondary-container pr-1">{(activeEmployee.reimbursementAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total Row */}
              <div className="flex justify-between items-center border-t border-b border-[#A32626] py-3 mt-4 text-[#A32626] font-black text-xs uppercase tracking-wider">
                <span>Total Earnings & Additions</span>
                <span className="font-mono">RM {(breakdown.grossEarnings + prorationDeduction + breakdown.reimbursementsSum).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
            </div>

            {/* Deductions Table */}
            <div className="bg-white border border-[#E5DED5] rounded-lg p-4 text-left">
              <div className="bg-[#A32626] text-white px-3 py-2 rounded font-black text-xs uppercase tracking-wider mb-4 text-center">
                Deductions
              </div>
              <table className="w-full text-xs text-[#333333]">
                <thead>
                  <tr className="border-b border-[#E5DED5] text-[10px] uppercase font-black text-[#6B6B6B]">
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-right">Amount (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DED5]/40">
                  {prorationDeduction > 0 && (
                    <tr className="bg-red-50/40 hover:bg-[#F2E8D8]/20 text-[#A32626]">
                      <td className="py-2 text-left pl-1">
                        <div className="text-left">
                          <span className="font-semibold">Prorated Basic Salary Deduction</span>
                          <p className="text-[10px] opacity-80 font-medium mt-0.5 leading-tight">{prorationDetails}</p>
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono font-bold pr-1">{prorationDeduction.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  
                  <tr className="hover:bg-[#F2E8D8]/20">
                    <td className="py-2 text-left font-medium">EPF (Employee {activeEmployee.epfRateEmployee}%)</td>
                    <td className="py-2 text-right font-mono font-bold">{breakdown.epfEmployeeValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>

                  {breakdown.skbbkEmpVal > 0 ? (
                    <>
                      <tr className="hover:bg-[#F2E8D8]/20">
                        <td className="py-2 text-left font-medium">SOCSO - Invalidity</td>
                        <td className="py-2 text-right font-mono font-bold">{breakdown.socsoEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      </tr>
                      <tr className="hover:bg-[#F2E8D8]/20">
                        <td className="py-2 text-left font-medium">SOCSO - LINDUNG 24 Jam</td>
                        <td className="py-2 text-right font-mono font-bold">{breakdown.skbbkEmpVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      </tr>
                      <tr className="bg-[#F2E8D8] text-[#333333] font-bold text-[11px] hover:bg-[#F2E8D8]">
                        <td className="py-2 text-left pl-2">SOCSO Employee Total</td>
                        <td className="py-2 text-right font-mono font-black pr-2">{(breakdown.socsoEmployeeVal + breakdown.skbbkEmpVal).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">SOCSO</td>
                      <td className="py-2 text-right font-mono font-bold">{breakdown.socsoEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  <tr className="hover:bg-[#F2E8D8]/20">
                    <td className="py-2 text-left font-medium">EIS</td>
                    <td className="py-2 text-right font-mono font-bold">{breakdown.eisEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>

                  <tr className="hover:bg-[#F2E8D8]/20">
                    <td className="py-2 text-left font-medium">Income Tax (PCB)</td>
                    <td className="py-2 text-right font-mono font-bold">{breakdown.taxPcbVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>

                  {/* Unpaid Leave */}
                  {(activeEmployee.unpaidLeave || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">Unpaid Leave</td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.unpaidLeave || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Payment in Lieu */}
                  {(activeEmployee.deductionInLieu || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">Payment in Lieu</td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.deductionInLieu || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* CP38 */}
                  {(activeEmployee.deductionCp38 || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">CP38 Direct Tax</td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.deductionCp38 || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Other Deductions */}
                  {(activeEmployee.deductionOthers || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left">
                        <div className="text-left">
                          <span className="font-medium">Other Deductions</span>
                          {activeEmployee.deductionOthersDesc && <p className="text-[10px] text-[#6B6B6B] italic leading-tight">{activeEmployee.deductionOthersDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono font-bold">{(activeEmployee.deductionOthers || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total Row */}
              <div className="flex justify-between items-center border-t border-b border-[#A32626] py-3 mt-4 text-[#A32626] font-black text-xs uppercase tracking-wider">
                <span>Total Deductions</span>
                <span className="font-mono">RM {(breakdown.totalDeductions + prorationDeduction).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          {/* Summary Strip (Option A) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 select-none">
            {/* Gross Pay */}
            <div className="flex items-center gap-4 bg-[#F2E8D8] border border-[#E5DED5] rounded-lg p-4 text-left">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#A32626] font-bold text-lg shadow-xs">
                💵
              </div>
              <div>
                <p className="text-[10px] text-[#6B6B6B] font-black uppercase tracking-wider">Gross Pay</p>
                <p className="text-lg font-black text-[#333333] font-mono mt-0.5">
                  RM {(breakdown.grossEarnings + prorationDeduction + breakdown.reimbursementsSum).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>

            {/* Total Deductions */}
            <div className="flex items-center gap-4 bg-[#F2E8D8] border border-[#E5DED5] rounded-lg p-4 text-left">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#A32626] font-bold text-lg shadow-xs">
                📄
              </div>
              <div>
                <p className="text-[10px] text-[#6B6B6B] font-black uppercase tracking-wider">Total Deductions</p>
                <p className="text-lg font-black text-[#333333] font-mono mt-0.5">
                  RM {(breakdown.totalDeductions + prorationDeduction).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>

            {/* Net Pay (Deep Red Block) */}
            <div className="flex items-center gap-4 bg-[#A32626] text-white rounded-lg p-4 text-left shadow-md">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                💰
              </div>
              <div>
                <p className="text-[10px] text-[#F2E8D8] font-black uppercase tracking-wider">Net Pay</p>
                <p className="text-xl font-black text-white font-mono mt-0.5">
                  RM {breakdown.netPay.toLocaleString('en-US', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>
          </div>

          {/* Employer Contributions Card (Option A) */}
          <div className="bg-[#F2E8D8] border-2 border-[#D8CFC4] rounded-lg p-4 mb-6 text-left select-none text-xs">
            <div className="flex items-center gap-2 mb-3 text-[#A32626] font-black uppercase tracking-wider text-[10px]">
              🏛️ Employer Contributions <span className="opacity-80 font-medium">(Not Paid to Employee)</span>
            </div>

            <div className="grid grid-cols-2 md:flex md:flex-row md:items-center md:justify-between gap-4 text-[#333333]">
              {/* EPF */}
              <div className="flex-1 min-w-[80px] text-center flex flex-col justify-center items-center">
                <p className="text-[9px] text-[#6B6B6B] uppercase font-bold mb-1">EPF ({activeEmployee.epfRateEmployer || 13}%)</p>
                <p className="font-mono font-bold">RM {breakdown.epfEmployerValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>

              <div className="hidden md:block w-[2px] h-7 bg-[#D8CFC4]" />

              {/* SOCSO Injury */}
              <div className="flex-1 min-w-[80px] text-center flex flex-col justify-center items-center">
                <p className="text-[9px] text-[#6B6B6B] uppercase font-bold mb-1">SOCSO - Injury</p>
                <p className="font-mono font-bold">RM {socsoRes.employerEmploymentInjury.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>

              <div className="hidden md:block w-[2px] h-7 bg-[#D8CFC4]" />

              {/* SOCSO Invalidity */}
              <div className="flex-1 min-w-[80px] text-center flex flex-col justify-center items-center">
                <p className="text-[9px] text-[#6B6B6B] uppercase font-bold mb-1">SOCSO - Invalidity</p>
                <p className="font-mono font-bold">RM {socsoRes.employerInvalidity.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>

              <div className="hidden md:block w-[2px] h-7 bg-[#D8CFC4]" />

              {/* SOCSO Total */}
              <div className="flex-1 min-w-[80px] bg-white/20 py-1 px-2 rounded text-center flex flex-col justify-center items-center">
                <p className="text-[9px] text-[#A32626] uppercase font-black mb-1">SOCSO Employer Total</p>
                <p className="font-mono font-black text-[#A32626]">RM {socsoRes.employerSocsoTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>

              <div className="hidden md:block w-[2px] h-7 bg-[#D8CFC4]" />

              {/* EIS */}
              <div className="flex-1 min-w-[80px] text-center flex flex-col justify-center items-center">
                <p className="text-[9px] text-[#6B6B6B] uppercase font-bold mb-1">EIS</p>
                <p className="font-mono font-bold">RM {breakdown.eisEmployerVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>
            </div>
          </div>

          {/* Footer Section (Option A) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E5DED5] text-xs text-[#333333] mb-8 select-none">
            {/* Left Note */}
            <div className="flex items-start gap-2.5 text-left">
              <span className="text-base text-[#A32626] font-bold mt-0.5">💬</span>
              <div>
                <p className="text-[10px] text-[#A32626] font-black uppercase tracking-wider">Important Note</p>
                <p className="font-medium text-[#6B6B6B] leading-relaxed mt-0.5">
                  This is a computer generated document.<br />
                  No signature is required.
                </p>
              </div>
            </div>

            {/* Right Period */}
            <div className="flex items-start gap-2.5 text-left md:justify-end">
              <span className="text-base text-[#A32626] font-bold mt-0.5">📅</span>
              <div>
                <p className="text-[10px] text-[#A32626] font-black uppercase tracking-wider">Pay Period</p>
                <p className="font-mono font-bold text-[#333333] mt-0.5">
                  {payPeriodString}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Confidential Red Bar */}
          <div className="bg-[#A32626] text-white px-4 py-2.5 rounded-b-lg flex flex-col md:flex-row justify-between items-center text-[10px] uppercase font-bold tracking-wider select-none gap-2">
            <span>Thank you for your continued contribution to {employeeEntity?.name || 'Red Point Sdn Bhd'}.</span>
            <span className="opacity-95 text-[#F2E8D8] tracking-widest font-black">Confidential</span>
          </div>

        </div>
      </div>
    </div>
  );
}
