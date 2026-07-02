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
  Building2
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { PayslipPDFDocument } from './PayslipPDFDocument';
import { Employee, CorporateEntity } from '../types';
import { calculatePayslip, getPayslipLabel } from '../data';

interface PayslipDocumentViewProps {
  employees: Employee[];
  selectedEmployeeId: string;
  onBack: () => void;
  onShowNotification: (title: string, message: string) => void;
  activeEntity?: CorporateEntity;
  isPrintView?: boolean;
}

export default function PayslipDocumentView({
  employees,
  selectedEmployeeId,
  onBack,
  onShowNotification,
  activeEntity,
  isPrintView = false
}: PayslipDocumentViewProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const activeEmployee = employees.find(e => e.id === selectedEmployeeId) || employees[0];

  if (!activeEmployee) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-neutral-border">
        No active employee found for document viewing.
      </div>
    );
  }

  const params = new URLSearchParams(window.location.search);
  const payMonth = params.get('month') ? parseInt(params.get('month')!, 10) : 10;
  const payYear = params.get('year') ? parseInt(params.get('year')!, 10) : 2026;

  const breakdown = calculatePayslip(activeEmployee, payMonth, payYear);

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
      prorationDetails = `Joined mid-month on ${joinDate.toLocaleDateString('en-MY', {day: 'numeric', month: 'short', year: 'numeric'})}. Deducted ${unpaidDays}/${calendarDays} unpaid days.`;
    } else {
      prorationDetails = `Deduction for incomplete month of service.`;
    }
  }

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
    const formattedPeriod = new Date(payYear, payMonth - 1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'}).replace(/\s+/g, '_');
    onShowNotification('Print Job Sent', `Sending ${formattedPeriod}_Payslip_${activeEmployee.name.replace(/\s+/g, '_')}.pdf to your configured system printer.`);
    window.print();
  };

  const handleDownload = async () => {
    const formattedPeriod = new Date(payYear, payMonth - 1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'}).replace(/\s+/g, '_');
    const fileName = `${formattedPeriod}_Payslip_${activeEmployee.name.replace(/\s+/g, '_')}.pdf`;
    onShowNotification('Download Started', `Generating and downloading ${fileName} in your browser...`);
    
    try {
      const doc = <PayslipPDFDocument employee={activeEmployee} entity={activeEntity} month={payMonth} year={payYear} />;
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
                {new Date(payYear, payMonth - 1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'}).replace(/\s+/g, '_')}_Payslip_{activeEmployee.name.replace(/\s+/g, '_')}.pdf
              </span>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">
                Acme Global Enterprise
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
            ACME-CONFIDENTIAL-STRICTLY-PRIVATE
          </div>

          {/* Payslip Branding Header */}
          <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-6">
            <div className="flex items-start gap-4">
              {/* Logo container */}
              <div className="w-14 h-14 rounded-lg bg-white border border-neutral-border/40 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
                {activeEntity?.logoUrl && !activeEntity.logoUrl.includes('placeholder') && !activeEntity.logoUrl.includes('example.com') ? (
                  <>
                    <img 
                      src={getDirectLogoUrl(activeEntity.logoUrl)} 
                      alt={activeEntity.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div style={{ display: 'none' }} className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm uppercase">
                      {activeEntity.name.substring(0, 2)}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm uppercase">
                    {activeEntity?.name ? activeEntity.name.substring(0, 2) : 'HR'}
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-xl font-bold text-primary tracking-tight font-sans">
                  {activeEntity?.name || 'Corporate Subsidiary'}
                </h1>
                {activeEntity?.registrationNumber && (
                  <p className="text-[10px] text-on-surface-variant font-mono font-semibold">
                    Co. Reg: {activeEntity.registrationNumber}
                  </p>
                )}
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-[400px]">
                  {activeEntity?.address || 'No registered corporate address'}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <h2 className="text-lg font-bold text-primary-container uppercase tracking-widest font-sans">Payslip</h2>
              <p className="text-sm text-on-surface mt-1 font-medium font-sans">
                {new Date(payYear, payMonth - 1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}
              </p>
            </div>
          </div>

          {/* Employee Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-surface-container-low p-4 border border-neutral-border rounded text-xs leading-relaxed">
            <div>
              <p className="text-on-surface-variant mb-1 font-medium">Employee Name</p>
              <p className="text-on-surface font-semibold text-sm">{activeEmployee.name}</p>
            </div>
            <div>
              <p className="text-on-surface-variant mb-1 font-medium">Email Address</p>
              <p className="text-on-surface font-semibold text-sm truncate" title={activeEmployee.email}>{activeEmployee.email}</p>
            </div>
            <div>
              <p className="text-on-surface-variant mb-1 font-medium">Department</p>
              <p className="text-on-surface font-semibold text-sm">{activeEmployee.department}</p>
            </div>
            <div>
              <p className="text-on-surface-variant mb-1 font-medium">Designation</p>
              <p className="text-on-surface font-semibold text-sm">{activeEmployee.designation}</p>
            </div>
            <div>
              <p className="text-on-surface-variant mb-1 font-medium">TIN / Tax Number</p>
              <p className="text-on-surface font-semibold text-sm font-mono">{activeEmployee.taxNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-on-surface-variant mb-1 font-medium">EPF Member Number</p>
              <p className="text-on-surface font-semibold text-sm font-mono">{activeEmployee.epfNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-on-surface-variant mb-1 font-medium">NRIC / Passport</p>
              <p className="text-on-surface font-semibold text-sm font-mono">{activeEmployee.nricPassport || 'N/A'}</p>
            </div>
            <div>
              <p className="text-on-surface-variant mb-1 font-medium">Bank Account</p>
              <p className="text-on-surface font-semibold text-sm font-mono">{activeEmployee.bankName} - {activeEmployee.accountNo}</p>
            </div>
            <div>
              <p className="text-on-surface-variant mb-1 font-medium">Date Joined</p>
              <p className="text-on-surface font-semibold text-sm font-mono">{activeEmployee.dateOfJoined || 'N/A'}</p>
            </div>
            <div>
              <p className="text-on-surface-variant mb-1 font-medium">Employment Status</p>
              <p className="text-on-surface font-semibold text-sm">{activeEmployee.employmentType || 'N/A'}</p>
            </div>
          </div>

          {/* Financial Data Table split */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Earnings Table */}
            <div>
              <h3 className="text-base text-primary font-bold mb-4 border-b border-neutral-border pb-2 flex items-center gap-1.5">
                Earnings & Additions
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-outline-variant/30">
                    <td className="py-2 text-on-surface text-left">{getPayslipLabel(activeEmployee.employmentType)}</td>
                    <td className="py-2 text-right text-on-surface font-mono">RM {baseSalaryBeforeProration.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>

                  {/* Allowances */}
                  {(activeEmployee.allowanceGeneral || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">General Allowance</td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {(activeEmployee.allowanceGeneral || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.allowanceTransport !== undefined ? activeEmployee.allowanceTransport : activeEmployee.transportAllowance) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">Transport Allowance</td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {Number(activeEmployee.allowanceTransport !== undefined ? activeEmployee.allowanceTransport : activeEmployee.transportAllowance).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.allowanceParking || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">Parking Allowance</td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {(activeEmployee.allowanceParking || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.allowanceMeal || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">Meal Allowance</td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {(activeEmployee.allowanceMeal || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.allowanceAccommodation !== undefined ? activeEmployee.allowanceAccommodation : activeEmployee.housingAllowance) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">Accommodation Allowance</td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {Number(activeEmployee.allowanceAccommodation !== undefined ? activeEmployee.allowanceAccommodation : activeEmployee.housingAllowance).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.allowancePhone || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">Phone Allowance</td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {(activeEmployee.allowancePhone || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {activeEmployee.overtime > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">Overtime</td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {activeEmployee.overtime.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Supplemental Payments */}
                  {((activeEmployee.bonusAmount !== undefined ? activeEmployee.bonusAmount : activeEmployee.performanceBonus) || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">
                        <div>
                          <span>Performance Bonus</span>
                          {activeEmployee.bonusDesc && <p className="text-[10px] text-on-surface-variant italic leading-tight">{activeEmployee.bonusDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {Number(activeEmployee.bonusAmount !== undefined ? activeEmployee.bonusAmount : activeEmployee.performanceBonus).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.commissionAmount || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">
                        <div>
                          <span>Commissions</span>
                          {activeEmployee.commissionDesc && <p className="text-[10px] text-on-surface-variant italic leading-tight">{activeEmployee.commissionDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {(activeEmployee.commissionAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.backPayAmount || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">
                        <div>
                          <span>BackPay / Arrears</span>
                          {activeEmployee.backPayDesc && <p className="text-[10px] text-on-surface-variant italic leading-tight">{activeEmployee.backPayDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {(activeEmployee.backPayAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.awsAmount || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">
                        <div>
                          <span>AWS (13th Month)</span>
                          {activeEmployee.awsDesc && <p className="text-[10px] text-on-surface-variant italic leading-tight">{activeEmployee.awsDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {(activeEmployee.awsAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(activeEmployee.compensationAmount || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">
                        <div>
                          <span>Compensation / Severance</span>
                          {activeEmployee.compensationDesc && <p className="text-[10px] text-on-surface-variant italic leading-tight">{activeEmployee.compensationDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right text-on-surface font-mono">RM {(activeEmployee.compensationAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Reimbursements */}
                  {(activeEmployee.reimbursementAmount || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30 bg-neutral-50">
                      <td className="py-2 text-on-surface text-left pl-1">
                        <div>
                          <span className="font-semibold text-secondary-container">Reimbursements (Tax-Free)</span>
                          {activeEmployee.reimbursementDesc && <p className="text-[10px] text-on-surface-variant italic leading-tight">{activeEmployee.reimbursementDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono font-semibold text-secondary-container pr-1">RM {(activeEmployee.reimbursementAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  <tr className="font-bold text-primary">
                    <td className="py-3 text-on-surface text-left font-bold">Total Earnings & Additions</td>
                    <td className="py-3 text-right font-mono">RM {(breakdown.grossEarnings + prorationDeduction + breakdown.reimbursementsSum).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions Table */}
            <div>
              <h3 className="text-base text-primary font-bold mb-4 border-b border-neutral-border pb-2 flex items-center gap-1.5">
                Deductions
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  {prorationDeduction > 0 && (
                    <tr className="border-b border-outline-variant/30 bg-red-50/40">
                      <td className="py-2 text-on-surface text-left pl-1">
                        <div>
                          <span className="font-semibold text-error">Prorated Basic Salary Deduction</span>
                          <p className="text-[10px] text-on-surface-variant font-medium mt-0.5 leading-tight">{prorationDetails}</p>
                        </div>
                      </td>
                      <td className="py-2 text-right text-error font-mono pr-1">RM {prorationDeduction.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  <tr className="border-b border-outline-variant/30">
                    <td className="py-2 text-on-surface text-left">EPF (Employee {activeEmployee.epfRateEmployee}%)</td>
                    <td className="py-2 text-right text-error font-mono">RM {breakdown.epfEmployeeValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>
                  <tr className="border-b border-outline-variant/30">
                    <td className="py-2 text-on-surface text-left">SOCSO</td>
                    <td className="py-2 text-right text-error font-mono">RM {breakdown.socsoEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>
                  {breakdown.skbbkEmpVal > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">SOCSO (SKBBK)</td>
                      <td className="py-2 text-right text-error font-mono">RM {breakdown.skbbkEmpVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  <tr className="border-b border-outline-variant/30">
                    <td className="py-2 text-on-surface text-left">EIS</td>
                    <td className="py-2 text-right text-error font-mono">RM {breakdown.eisEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>
                  <tr className="border-b border-outline-variant/30">
                    <td className="py-2 text-on-surface text-left">Income Tax (PCB)</td>
                    <td className="py-2 text-right text-error font-mono">RM {breakdown.taxPcbVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>
                  
                  {/* Unpaid Leave */}
                  {(activeEmployee.unpaidLeave || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">Unpaid Leave</td>
                      <td className="py-2 text-right text-error font-mono">RM {(activeEmployee.unpaidLeave || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Payment in Lieu */}
                  {(activeEmployee.deductionInLieu || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">Payment in Lieu</td>
                      <td className="py-2 text-right text-error font-mono">RM {(activeEmployee.deductionInLieu || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* CP38 */}
                  {(activeEmployee.deductionCp38 || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">CP38 Direct Tax</td>
                      <td className="py-2 text-right text-error font-mono">RM {(activeEmployee.deductionCp38 || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Other Deductions */}
                  {(activeEmployee.deductionOthers || 0) > 0 && (
                    <tr className="border-b border-outline-variant/30">
                      <td className="py-2 text-on-surface text-left">
                        <div>
                          <span>Other Deductions</span>
                          {activeEmployee.deductionOthersDesc && <p className="text-[10px] text-on-surface-variant italic leading-tight">{activeEmployee.deductionOthersDesc}</p>}
                        </div>
                      </td>
                      <td className="py-2 text-right text-error font-mono">RM {(activeEmployee.deductionOthers || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  <tr className="font-bold text-error">
                    <td className="py-3 text-on-surface text-left font-bold">Total Deductions</td>
                    <td className="py-3 text-right font-mono">RM {(breakdown.totalDeductions + prorationDeduction).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Employer Contributions Info Only */}
          <div className="mb-12 bg-surface-container-low p-4 border border-neutral-border rounded text-xs space-y-3">
            <h3 className="font-bold text-on-surface-variant uppercase tracking-wider">
              Employer Contributions (Not paid to employee)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono font-medium text-on-surface">
              <div>
                <span className="text-on-surface-variant text-[10px] uppercase block mb-1">EPF ({activeEmployee.epfRateEmployer}%)</span>
                <span>RM {breakdown.epfEmployerValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
              <div>
                <span className="text-on-surface-variant text-[10px] uppercase block mb-1">SOCSO</span>
                <span>RM {breakdown.socsoEmployerVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
              {breakdown.skbbkEmplyrVal > 0 && (
                <div>
                  <span className="text-on-surface-variant text-[10px] uppercase block mb-1">SOCSO (SKBBK)</span>
                  <span>RM {breakdown.skbbkEmplyrVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
              )}
              <div>
                <span className="text-on-surface-variant text-[10px] uppercase block mb-1">EIS</span>
                <span>RM {breakdown.eisEmployerVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          {/* Net Pay and computer signature footer */}
          <div className="border-t-2 border-primary-container pt-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div className="text-xs text-on-surface-variant space-y-1">
              <p className="font-medium">This is a computer generated document. No signature is required.</p>
              <p>Generated on: 28 Oct 2026, 09:41 AM</p>
              <p>Security hash: <span className="font-mono text-[10px]">SHA256:7a90b4cf22...</span></p>
            </div>
            <div className="text-right bg-primary-container/5 px-6 py-4 rounded border border-primary-container/20 min-w-[200px]">
              <p className="text-xs text-primary-container font-bold uppercase tracking-widest mb-1">Net Pay</p>
              <p className="text-2xl font-bold text-on-surface font-mono">
                RM {breakdown.netPay.toLocaleString('en-US', {minimumFractionDigits: 2})}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
