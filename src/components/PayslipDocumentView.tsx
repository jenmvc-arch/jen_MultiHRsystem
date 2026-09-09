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
import { Employee, CorporateEntity, PayrollDocumentDisplaySettings, PayrollRecord2026, GROSS_PAY_CALCULATION_VERSION } from '../types';
import { calculatePayslip, getPayrollDocumentDisplaySettings, getPayrollDocumentFieldLabels, getPayrollDocumentProfile, getPayrollDocumentProfileForRecord, getPayrollBasicSalary, getSalaryProration, getDirectLogoUrl, calculateSocsoContribution, getEmployeeForMonth, getEffectiveTerminationDateForDate, getSeparatePayoutConfig, isSeparatePayrollRecord } from '../data';
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
  displaySettingsOverride?: PayrollDocumentDisplaySettings;
  payrollRecordOverride?: PayrollRecord2026;
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
  displaySettingsOverride,
  payrollRecordOverride,
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

  const activeEmployee = getEmployeeForMonth(rawActiveEmployee, payMonth, payYear);
  const activePayrollRecord = payrollRecordOverride || null;
  const documentProfile = activePayrollRecord
    ? getPayrollDocumentProfileForRecord(activeEmployee, activePayrollRecord)
    : getPayrollDocumentProfile(activeEmployee);
  const documentFieldLabels = getPayrollDocumentFieldLabels(documentProfile);
  const displaySettings = {
    ...(activePayrollRecord?.displaySettingsSnapshot || getPayrollDocumentDisplaySettings(activeEmployee)),
    ...(displaySettingsOverride || {})
  };
  if (String(userRole).toLowerCase() === 'employee') {
    Object.assign(displaySettings, {
      showDesignation: true,
      showDepartment: true,
      showEmail: true,
      showNricPassport: true,
      showTin: true,
      showEpfNumber: true,
      showDateJoined: true,
      showLastWorkingDay: true,
      showBankAccount: true,
      showCompanyAddress: true,
      showEarningsDetails: true,
      showDeductionDetails: true,
      showEmployerContributions: true,
      showYtdSummary: true,
      showNotesFooter: true,
    });
  }
  if (!documentProfile.statutoryEnabled) {
    displaySettings.showEpfNumber = false;
    displaySettings.showEmployerContributions = false;
  }
  const isSeparatePayoutDocument = !!activePayrollRecord && isSeparatePayrollRecord(activePayrollRecord);
  const payoutConfig = isSeparatePayoutDocument && activePayrollRecord?.payoutKind && activePayrollRecord.payoutKind !== 'regular'
    ? getSeparatePayoutConfig(activePayrollRecord.payoutKind)
    : null;
  const payrollDocumentEmployee = activePayrollRecord
    ? {
      ...activeEmployee,
      basicSalary: isSeparatePayoutDocument ? 0 : (activePayrollRecord.basicSalary ?? activeEmployee.basicSalary),
      allowanceGeneral: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowanceGeneral ?? activeEmployee.allowanceGeneral,
      allowanceTransport: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowanceTransport ?? activeEmployee.allowanceTransport,
      allowanceParking: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowanceParking ?? activeEmployee.allowanceParking,
      allowanceMeal: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowanceMeal ?? activeEmployee.allowanceMeal,
      allowanceAccommodation: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowanceAccommodation ?? activeEmployee.allowanceAccommodation,
      allowancePhone: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowancePhone ?? activeEmployee.allowancePhone,
      overtime: isSeparatePayoutDocument ? 0 : activePayrollRecord.overtime ?? activeEmployee.overtime,
      bonusAmount: isSeparatePayoutDocument ? Number(activePayrollRecord.bonusAmount || 0) : (activePayrollRecord.bonusAmount ?? activeEmployee.bonusAmount),
      bonusDesc: activePayrollRecord.bonusDesc ?? activeEmployee.bonusDesc,
      commissionAmount: isSeparatePayoutDocument ? Number(activePayrollRecord.commissionAmount || 0) : (activePayrollRecord.commissionAmount ?? activeEmployee.commissionAmount),
      commissionDesc: activePayrollRecord.commissionDesc ?? activeEmployee.commissionDesc,
      backPayAmount: isSeparatePayoutDocument ? 0 : activePayrollRecord.backPayAmount ?? activeEmployee.backPayAmount,
      backPayDesc: activePayrollRecord.backPayDesc ?? activeEmployee.backPayDesc,
      awsAmount: isSeparatePayoutDocument ? 0 : activePayrollRecord.awsAmount ?? activeEmployee.awsAmount,
      awsDesc: activePayrollRecord.awsDesc ?? activeEmployee.awsDesc,
      compensationAmount: isSeparatePayoutDocument ? Number(activePayrollRecord.compensationAmount || 0) : activePayrollRecord.compensationAmount ?? activeEmployee.compensationAmount,
      compensationDesc: activePayrollRecord.compensationDesc ?? activeEmployee.compensationDesc,
      reimbursementAmount: isSeparatePayoutDocument ? Number(activePayrollRecord.reimbursementAmount || 0) : (activePayrollRecord.reimbursementAmount ?? activeEmployee.reimbursementAmount),
      reimbursementDesc: activePayrollRecord.reimbursementDesc ?? activeEmployee.reimbursementDesc,
      unpaidLeave: activePayrollRecord.unpaidLeave ?? activeEmployee.unpaidLeave,
      incompleteMonthDeduction: activePayrollRecord.incompleteMonthDeduction ?? activeEmployee.incompleteMonthDeduction,
      deductionInLieu: activePayrollRecord.deductionInLieu ?? activeEmployee.deductionInLieu,
      deductionCp38: activePayrollRecord.deductionCp38 ?? activeEmployee.deductionCp38,
      deductionOthers: activePayrollRecord.deductionOthers ?? activeEmployee.deductionOthers,
      deductionOthersDesc: activePayrollRecord.deductionOthersDesc ?? activeEmployee.deductionOthersDesc,
      payslipDescriptions: activePayrollRecord.payslipDescriptions ?? activeEmployee.payslipDescriptions,
      contractStatutoryTreatment: activePayrollRecord.statutoryTreatment ?? activeEmployee.contractStatutoryTreatment,
      eligibleForStatutory: activePayrollRecord.statutoryTreatment === 'with_statutory' ? 'Yes' : activePayrollRecord.statutoryTreatment === 'without_statutory' ? 'No' : activeEmployee.eligibleForStatutory,
      paymentDate: activePayrollRecord.paymentDate || activeEmployee.paymentDate
    }
    : activeEmployee;
  const breakdown = activePayrollRecord
    ? calculatePayslip(payrollDocumentEmployee, payMonth, payYear, {
      basicSalaryOverride: isSeparatePayoutDocument ? 0 : payrollDocumentEmployee.basicSalary,
      calculationVersion: isSeparatePayoutDocument || activePayrollRecord.calculationVersion !== GROSS_PAY_CALCULATION_VERSION
        ? undefined
        : GROSS_PAY_CALCULATION_VERSION,
      grossPayOverride: isSeparatePayoutDocument || activePayrollRecord.calculationVersion !== GROSS_PAY_CALCULATION_VERSION
        ? undefined
        : activePayrollRecord.grossPay,
      statutorySalaryOverride: isSeparatePayoutDocument
        ? ((activePayrollRecord.payoutKind && activePayrollRecord.payoutKind !== 'regular')
          ? Number((activePayrollRecord.payoutKind === 'bonus'
            ? activePayrollRecord.bonusAmount
            : activePayrollRecord.payoutKind === 'incentive_commission'
              ? activePayrollRecord.commissionAmount
              : activePayrollRecord.reimbursementAmount) || 0)
          : payrollDocumentEmployee.basicSalary)
        : undefined,
      statutoryEligibilityOverride: isSeparatePayoutDocument ? documentProfile.statutoryEnabled : undefined,
      ignoreSavedStatutory: true,
      statutoryOverrides: {
        epfEmployee: activePayrollRecord.epfEmployee,
        epfEmployer: activePayrollRecord.epfEmployer,
        socsoEmployee: activePayrollRecord.socsoEmployee,
        socsoEmployer: activePayrollRecord.socsoEmployer,
        lindung24Employee: activePayrollRecord.lindung24Employee,
        eisEmployee: activePayrollRecord.eisEmployee,
        eisEmployer: activePayrollRecord.eisEmployer,
        taxPcb: activePayrollRecord.actualPCBDeducted,
        hrdCorp: activePayrollRecord.hrdCorp
      }
    })
    : calculatePayslip(rawActiveEmployee, payMonth, payYear);
  const employeeEntity = entities?.find(ent => ent.id === activeEmployee.entityId) || activeEntity;
  const lastWorkingDay = getEffectiveTerminationDateForDate(
    payrollDocumentEmployee,
    `${payYear}-${String(payMonth).padStart(2, '0')}-${new Date(payYear, payMonth, 0).getDate()}`
  );
  const getDescription = (key: keyof NonNullable<Employee['payslipDescriptions']>, fallback: string) =>
    payrollDocumentEmployee.payslipDescriptions?.[key] || fallback;
  const getLineNote = (field: string) => activePayrollRecord?.lineNotes?.[field] || '';
  const renderLineDescription = (label: React.ReactNode, field: string) => {
    const note = getLineNote(field);
    return (
      <div className="min-w-0 break-words [overflow-wrap:anywhere]">
        <span className="block">{label}</span>
        {note && (
          <span className="mt-0.5 block whitespace-pre-line text-[10px] font-normal leading-relaxed text-[#6B6B6B]">
            {note}
          </span>
        )}
      </div>
    );
  };

  const basicSalaryForSocso = isSeparatePayoutDocument ? 0 : getPayrollBasicSalary(rawActiveEmployee, payMonth, payYear);
  const overtimeForSocso = payrollDocumentEmployee.overtime || 0;
  const commissionForSocso = payrollDocumentEmployee.commissionAmount || 0;
  const allowanceGenForSocso = payrollDocumentEmployee.allowanceGeneral || 0;
  const allowanceTransForSocso = payrollDocumentEmployee.allowanceTransport !== undefined ? payrollDocumentEmployee.allowanceTransport : (payrollDocumentEmployee.transportAllowance || 0);
  const allowanceParkForSocso = payrollDocumentEmployee.allowanceParking || 0;
  const allowanceMlForSocso = payrollDocumentEmployee.allowanceMeal || 0;
  const allowanceAccomForSocso = payrollDocumentEmployee.allowanceAccommodation !== undefined ? payrollDocumentEmployee.allowanceAccommodation : (payrollDocumentEmployee.housingAllowance || 0);
  const allowancePhForSocso = payrollDocumentEmployee.allowancePhone || 0;
  const backPayForSocso = payrollDocumentEmployee.backPayAmount || 0;
  const unpaidLeaveForSocso = payrollDocumentEmployee.unpaidLeave || 0;

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
    employee: payrollDocumentEmployee,
    payrollPeriod: `${payYear}-${String(payMonth).padStart(2, '0')}`,
    payrollItems: payrollItemsForSocso
  });
  const socsoEmployerScale = socsoRes.employerSocsoTotal > 0
    ? breakdown.socsoEmployerVal / socsoRes.employerSocsoTotal
    : 0;
  const socsoEmployerInjury = socsoRes.employerEmploymentInjury * socsoEmployerScale;
  const socsoEmployerInvalidity = breakdown.socsoEmployerVal - socsoEmployerInjury;

  const salaryProration = getSalaryProration(payrollDocumentEmployee, payMonth, payYear);
  const actualBasic = isSeparatePayoutDocument ? 0 : payrollDocumentEmployee.basicSalary;

  const monthNameForPeriod = new Date(payYear, payMonth - 1).toLocaleDateString('en-US', { month: 'long' });
  const lastDayForPeriod = new Date(payYear, payMonth, 0).getDate();
  const payPeriodString = `01 ${monthNameForPeriod} ${payYear} – ${lastDayForPeriod} ${monthNameForPeriod} ${payYear}`;

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
    const documentFileLabel = documentProfile.documentType.replace(/\s+/g, '_');
    const fileName = `${cleanEmpName}_${formattedMonthYear}_${documentFileLabel}.pdf`;
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
    const documentFileLabel = documentProfile.documentType.replace(/\s+/g, '_');
    const fileName = `${cleanEmpName}_${formattedMonthYear}_${documentFileLabel}.pdf`;
    onShowNotification('Download Started', `Generating and downloading ${fileName} in your browser...`);
    
    try {
      const doc = (
        <PayslipPDFDocument
          employee={activeEmployee}
          entity={employeeEntity || activeEntity || (entities && entities[0])!}
          month={payMonth}
          year={payYear}
          payrollRecordOverride={activePayrollRecord || undefined}
          displaySettingsOverride={displaySettings}
        />
      );
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
                {documentProfile.documentType.replace(/\s+/g, '_')}_{activeEmployee.id}_{activeEmployee.name.replace(/\s+/g, '_').toUpperCase()}_{payYear}-{String(payMonth).padStart(2, '0')}.pdf
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
      <div className={isPrintView ? "w-full flex justify-center" : "min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 flex justify-center items-start"}>
        {/* Document (Payslip Page) */}
        <div 
          id="payslip-pdf-content"
          style={{ 
            transform: isPrintView ? 'none' : `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out',
            ...themeStyles
          }}
          className={isPrintView ? "bg-white w-full max-w-[800px] min-h-[960px] px-4 py-6 sm:p-8 md:p-12 text-left relative" : "bg-white w-full max-w-[800px] min-h-[960px] shadow-2xl my-3 sm:my-4 px-4 py-6 sm:p-8 md:p-12 border border-neutral-border/40 text-left select-text relative"}
        >
          {/* Subtle PDF watermark/grid header */}
          <div className="absolute top-2 right-4 text-[9px] text-on-surface-variant/30 font-mono select-none">
            CONFIDENTIAL - STRICTLY PRIVATE
          </div>

          {/* Option A Branding Header */}
          <div className="flex flex-col gap-4 justify-between items-stretch border-b-4 border-[#A32626] pb-4 mb-6 select-none bg-white relative sm:flex-row">
            <div className="flex min-w-0 items-start gap-3 py-2 sm:gap-4">
              {/* Logo container */}
              <div className="h-14 w-32 rounded bg-white flex items-center justify-center overflow-hidden shrink-0 relative sm:h-16 sm:w-44">
                <img 
                  src="/redpoint-logo.png" 
                  alt="RedPoint Logo" 
                  className="w-full h-full object-contain" 
                />
              </div>

              {/* Company Details */}
              <div className="min-w-0 text-left text-[#333333]">
                <h1 className="text-xl font-black text-[#A32626] tracking-tight font-sans mb-1 leading-tight break-words sm:text-2xl">
                  {employeeEntity?.name || 'Red Point Sdn Bhd'}
                </h1>
                {employeeEntity?.registrationNumber && (
                <p className="break-words text-[10px] text-[#333333] font-mono font-bold mt-0.5 [overflow-wrap:anywhere]">
                  Co. Reg: {employeeEntity.registrationNumber}
                </p>
                )}
                {displaySettings.showCompanyAddress && (
                  <div className="flex min-w-0 items-start gap-1 mt-1 text-[11px] text-[#333333] leading-normal max-w-[400px]">
                    <span className="text-[#A32626] mt-0.5 shrink-0 font-bold">📍</span>
                    <p className="min-w-0 font-medium break-words [overflow-wrap:anywhere]">{employeeEntity?.address || 'No registered corporate address'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right side banner block */}
            <div className="w-full bg-[#A32626] text-white px-4 py-3 flex flex-col justify-center items-center rounded-lg min-w-0 text-center self-stretch sm:w-auto sm:min-w-[140px] sm:rounded-l-lg sm:rounded-r-none sm:px-6 sm:py-4">
              <span className="text-xs uppercase tracking-widest font-black opacity-80 text-[#F2E8D8]">{documentProfile.documentType.toUpperCase()}</span>
              <span className="text-sm font-bold mt-1 font-mono">
                {new Date(payYear, payMonth - 1).toLocaleDateString('en-US', {month: 'short', year: 'numeric'})}
              </span>
              {activePayrollRecord?.payoutTitle && (
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#F2E8D8]">{activePayrollRecord.payoutTitle}</span>
              )}
            </div>
          </div>
          {activePayrollRecord?.payoutDescription && (
            <div className="mb-6 rounded border border-[#E5DED5] bg-white px-4 py-3 text-xs text-[#5a352b]">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#A32626]">Payout Description</span>
              <p className="mt-1 whitespace-pre-line leading-relaxed">{activePayrollRecord.payoutDescription}</p>
            </div>
          )}
          {/* Employee Details Card (Option A styled) */}
          <div className="bg-[#F2E8D8] border border-[#E5DED5] rounded-lg p-4 sm:p-5 mb-6 text-left select-none">
            {/* Title with Deep Red icon */}
            <div className="flex items-center gap-2 mb-3 border-b border-[#E5DED5] pb-2 text-[#A32626]">
              <User className="w-4 h-4 text-[#A32626]" />
              <span className="text-xs font-black uppercase tracking-wider">{documentFieldLabels.detailsTitle}</span>
            </div>

            {/* Employee Name */}
            <h2 className="text-lg font-black text-[#333333] uppercase mb-4 tracking-tight">
              {payrollDocumentEmployee.name}
            </h2>

            {/* 3-Column Layout */}
            <div className="grid min-w-0 grid-cols-1 gap-4 text-xs text-[#333333] md:grid-cols-3 md:gap-5">
              {/* Left Group */}
              <div className="min-w-0 space-y-2">
                {displaySettings.showTin && (
                  <div className="grid min-w-0 grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-2 py-0.5 text-left">
                    <span className="min-w-0 font-semibold text-[#6B6B6B] break-words">TIN / Tax Number</span>
                    <span className="min-w-0 font-mono font-bold text-[#333333] break-words [overflow-wrap:anywhere]">{activeEmployee.taxNumber || 'IG 29068110030'}</span>
                  </div>
                )}
                {displaySettings.showEpfNumber && (
                  <div className="grid min-w-0 grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-2 py-0.5 text-left">
                    <span className="min-w-0 font-semibold text-[#6B6B6B] break-words">EPF Member Number</span>
                    <span className="min-w-0 font-mono font-bold text-[#333333] break-words [overflow-wrap:anywhere]">{activeEmployee.epfNumber || '-'}</span>
                  </div>
                )}
                {displaySettings.showNricPassport && (
                  <div className="grid min-w-0 grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-2 py-0.5 text-left">
                    <span className="min-w-0 font-semibold text-[#6B6B6B] break-words">NRIC / Passport</span>
                    <span className="min-w-0 font-mono font-bold text-[#333333] break-words [overflow-wrap:anywhere]">{activeEmployee.nricPassport || '-'}</span>
                  </div>
                )}
                {displaySettings.showDateJoined && (
                  <div className="grid min-w-0 grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-2 py-0.5 text-left">
                    <span className="min-w-0 font-semibold text-[#6B6B6B] break-words">{documentFieldLabels.dateJoined}</span>
                    <span className="min-w-0 font-mono font-bold text-[#333333] break-words [overflow-wrap:anywhere]">{formatToDDMMMYYYY(activeEmployee.dateOfJoined)}</span>
                  </div>
                )}
                {lastWorkingDay && displaySettings.showLastWorkingDay && (
                  <div className="grid min-w-0 grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-2 py-0.5 text-left">
                    <span className="min-w-0 font-semibold text-[#6B6B6B] break-words">Last Working Day</span>
                    <span className="min-w-0 font-mono font-bold text-[#A32626] break-words [overflow-wrap:anywhere]">{formatToDDMMMYYYY(lastWorkingDay)}</span>
                  </div>
                )}
                <div className="grid min-w-0 grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-2 py-0.5 text-left">
                  <span className="min-w-0 font-semibold text-[#6B6B6B] break-words">{documentFieldLabels.employmentStatus}</span>
                  <span className="min-w-0 font-bold text-[#333333] break-words">{activeEmployee.employmentType || 'Confirmation'}</span>
                </div>
              </div>

              {/* Middle Group */}
              <div className="min-w-0 space-y-2">
                {displaySettings.showEmail && (
                  <div className="grid min-w-0 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-2 py-0.5 text-left">
                    <span className="min-w-0 font-semibold text-[#6B6B6B] break-words">Email Address</span>
                    <span className="min-w-0 font-bold text-[#333333] break-words [overflow-wrap:anywhere]" title={activeEmployee.email}>
                      {activeEmployee.email}
                    </span>
                  </div>
                )}
                {displaySettings.showDepartment && (
                  <div className="grid min-w-0 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-2 py-0.5 text-left">
                    <span className="min-w-0 font-semibold text-[#6B6B6B] break-words">Department</span>
                    <span className="min-w-0 font-bold text-[#333333] break-words">{activeEmployee.department}</span>
                  </div>
                )}
                {displaySettings.showDesignation && (
                  <div className="grid min-w-0 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-2 py-0.5 text-left">
                    <span className="min-w-0 font-semibold text-[#6B6B6B] break-words">{documentFieldLabels.designation}</span>
                    <span className="min-w-0 font-bold text-[#333333] break-words">{activeEmployee.designation}</span>
                  </div>
                )}
                <div className="grid min-w-0 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-2 py-0.5 text-left">
                  <span className="min-w-0 font-semibold text-[#6B6B6B] break-words">Payment Date</span>
                  <span className="min-w-0 font-mono font-bold text-[#333333] break-words [overflow-wrap:anywhere]">{formatToDDMMMYYYY(activeEmployee.paymentDate || `${payYear}-${String(payMonth).padStart(2, '0')}-28`)}</span>
                </div>
              </div>

              {/* Right Group with vertical divider */}
              {displaySettings.showBankAccount && (
              <div className="min-w-0 border-t md:border-t-0 md:border-l border-[#E5DED5] pt-4 md:pt-0 md:pl-5 text-left">
                <div className="flex items-center gap-2 mb-2 text-[#A32626]">
                  <Building2 className="w-4 h-4 text-[#A32626]" />
                  <span className="text-xs font-black uppercase tracking-wider">Bank Details</span>
                </div>
                <p className="text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider mb-1">Bank Account</p>
                
                <div className="flex items-center gap-2 bg-white/40 p-2 rounded border border-[#E5DED5]/60">
                  <p className="min-w-0 flex-1 font-mono font-bold text-xs break-words [overflow-wrap:anywhere] text-[#333333]">
                    {(() => {
                      const acc = String(activeEmployee.accountNo || '');
                      if (!acc) return 'Bank account not available.';
                      return `${activeEmployee.bankName || 'N/A'} - ${acc}`;
                    })()}
                  </p>
                </div>
              </div>
              )}
            </div>
          </div>

          {/* Financial Data Table split */}
          <div className="grid min-w-0 grid-cols-1 md:grid-cols-2 gap-5 lg:gap-8 mb-6">
            {/* Earnings Table */}
            <div className="min-w-0 bg-white border border-[#E5DED5] rounded-lg p-3 sm:p-4">
              <div className="bg-[#A32626] text-white px-3 py-2 rounded font-black text-xs uppercase tracking-wider mb-4">
                Earnings & Additions
              </div>
              <table className="w-full table-fixed text-xs text-[#333333]">
                <thead>
                  <tr className="border-b border-[#E5DED5] text-[10px] uppercase font-black text-[#6B6B6B]">
                    <th className="w-[62%] py-2 text-left">Description</th>
                    <th className="w-[38%] py-2 text-right whitespace-nowrap">Amount (RM)</th>
                  </tr>
                </thead>
	                <tbody className="divide-y divide-[#E5DED5]/40">
                  {!isSeparatePayoutDocument && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(
                        salaryProration.isProrated ? `Prorated ${getDescription('basicSalary', documentProfile.compensationLabel)}` : getDescription('basicSalary', documentProfile.compensationLabel),
                        'basicSalary'
                      )}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{actualBasic.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

	                  {displaySettings.showEarningsDetails && (
	                    <>
	                  {/* Allowances */}
                  {(payrollDocumentEmployee.allowanceGeneral || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('allowanceGeneral', 'General Allowance'), 'allowanceGeneral')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.allowanceGeneral || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(payrollDocumentEmployee.allowanceTransport !== undefined ? payrollDocumentEmployee.allowanceTransport : payrollDocumentEmployee.transportAllowance) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('allowanceTransport', 'Transport Allowance'), 'allowanceTransport')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{Number(payrollDocumentEmployee.allowanceTransport !== undefined ? payrollDocumentEmployee.allowanceTransport : payrollDocumentEmployee.transportAllowance).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(payrollDocumentEmployee.allowanceParking || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('allowanceParking', 'Parking Allowance'), 'allowanceParking')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.allowanceParking || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(payrollDocumentEmployee.allowanceMeal || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('allowanceMeal', 'Meal Allowance'), 'allowanceMeal')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.allowanceMeal || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(payrollDocumentEmployee.allowanceAccommodation !== undefined ? payrollDocumentEmployee.allowanceAccommodation : payrollDocumentEmployee.housingAllowance) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('allowanceAccommodation', 'Accommodation Allowance'), 'allowanceAccommodation')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{Number(payrollDocumentEmployee.allowanceAccommodation !== undefined ? payrollDocumentEmployee.allowanceAccommodation : payrollDocumentEmployee.housingAllowance).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(payrollDocumentEmployee.allowancePhone || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('allowancePhone', 'Phone Allowance'), 'allowancePhone')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.allowancePhone || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {(payrollDocumentEmployee.overtime || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('overtime', 'Overtime'), 'overtime')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.overtime || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Supplemental Payments */}
                  {((payrollDocumentEmployee.bonusAmount !== undefined ? payrollDocumentEmployee.bonusAmount : payrollDocumentEmployee.performanceBonus) || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(payrollDocumentEmployee.bonusDesc || 'Performance Bonus', 'bonusAmount')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{Number(payrollDocumentEmployee.bonusAmount !== undefined ? payrollDocumentEmployee.bonusAmount : payrollDocumentEmployee.performanceBonus).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(payrollDocumentEmployee.commissionAmount || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(payrollDocumentEmployee.commissionDesc || 'Commissions', 'commissionAmount')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.commissionAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(payrollDocumentEmployee.backPayAmount || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(payrollDocumentEmployee.backPayDesc || 'BackPay / Arrears', 'backPayAmount')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.backPayAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(payrollDocumentEmployee.awsAmount || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(payrollDocumentEmployee.awsDesc || 'AWS (13th Month)', 'awsAmount')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.awsAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}
                  {(payrollDocumentEmployee.compensationAmount || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(payrollDocumentEmployee.compensationDesc || 'Compensation / Severance', 'compensationAmount')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.compensationAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Reimbursements */}
		                  {(payrollDocumentEmployee.reimbursementAmount || 0) > 0 && (
		                    <tr className="bg-neutral-50 hover:bg-[#F2E8D8]/20">
		                      <td className="py-2 text-left pl-1 font-semibold text-secondary-container">{renderLineDescription(payrollDocumentEmployee.reimbursementDesc || 'Reimbursements (Tax-Free)', 'reimbursementAmount')}</td>
			                      <td className="py-2 text-right font-mono font-bold text-secondary-container pr-1 whitespace-nowrap">{(payrollDocumentEmployee.reimbursementAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
		                    </tr>
		                  )}
	                    </>
	                  )}
                </tbody>
              </table>

              {/* Total Row */}
              <div className="flex min-w-0 items-center justify-between gap-3 border-t border-b border-[#A32626] py-3 mt-4 text-[#A32626] font-black text-xs uppercase tracking-wider">
                <span className="min-w-0 break-words">{documentProfile.isPaymentVoucher ? 'Gross Amount' : 'Total Earnings & Additions'}</span>
                <span className="shrink-0 whitespace-nowrap font-mono">RM {(breakdown.grossPay + breakdown.reimbursementsSum).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
            </div>

            {/* Deductions Table */}
            <div className="min-w-0 bg-white border border-[#E5DED5] rounded-lg p-3 sm:p-4 text-left">
              <div className="bg-[#A32626] text-white px-3 py-2 rounded font-black text-xs uppercase tracking-wider mb-4 text-center">
                Deductions
              </div>
              <table className="w-full table-fixed text-xs text-[#333333]">
                <thead>
                  <tr className="border-b border-[#E5DED5] text-[10px] uppercase font-black text-[#6B6B6B]">
                    <th className="w-[62%] py-2 text-left">Description</th>
                    <th className="w-[38%] py-2 text-right whitespace-nowrap">Amount (RM)</th>
                  </tr>
                </thead>
	                <tbody className="divide-y divide-[#E5DED5]/40">
	                  {documentProfile.statutoryEnabled && (
	                    <>
	                  <tr className="hover:bg-[#F2E8D8]/20">
                    <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('epfEmployee', `EPF (Employee ${payrollDocumentEmployee.epfRateEmployee}%)`), 'epfEmployee')}</td>
                    <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{breakdown.epfEmployeeValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>

                  {breakdown.skbbkEmpVal > 0 ? (
                    <>
                      <tr className="hover:bg-[#F2E8D8]/20">
                        <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('socsoEmployee', 'SOCSO - Invalidity'), 'socsoEmployee')}</td>
                        <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{breakdown.socsoEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      </tr>
                      <tr className="hover:bg-[#F2E8D8]/20">
                        <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('lindung24Employee', 'SOCSO - LINDUNG 24 Jam'), 'lindung24Employee')}</td>
                        <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{breakdown.skbbkEmpVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      </tr>
                      <tr className="bg-[#F2E8D8] text-[#333333] font-bold text-[11px] hover:bg-[#F2E8D8]">
                        <td className="py-2 text-left pl-2 break-words">SOCSO Employee Total</td>
                        <td className="py-2 text-right font-mono font-black pr-2 whitespace-nowrap">{(breakdown.socsoEmployeeVal + breakdown.skbbkEmpVal).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('socsoEmployee', 'SOCSO'), 'socsoEmployee')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{breakdown.socsoEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  <tr className="hover:bg-[#F2E8D8]/20">
                    <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('eisEmployee', 'EIS'), 'eisEmployee')}</td>
                    <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{breakdown.eisEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                  </tr>

	                  <tr className="hover:bg-[#F2E8D8]/20">
		                    <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('taxPcb', 'Income Tax (PCB)'), 'taxPcb')}</td>
		                    <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{breakdown.taxPcbVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
	                  </tr>
	                    </>
	                  )}

	                  {displaySettings.showDeductionDetails && (
	                    <>
	                  {/* Unpaid Leave */}
                  {(payrollDocumentEmployee.unpaidLeave || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('unpaidLeave', 'Unpaid Leave'), 'unpaidLeave')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.unpaidLeave || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Payment in Lieu */}
                  {(payrollDocumentEmployee.deductionInLieu || 0) > 0 && (
                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('deductionInLieu', 'Payment in Lieu'), 'deductionInLieu')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.deductionInLieu || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* CP38 */}
		                  {documentProfile.statutoryEnabled && (payrollDocumentEmployee.deductionCp38 || 0) > 0 && (
		                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('deductionCp38', 'CP38 Direct Tax'), 'deductionCp38')}</td>
	                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.deductionCp38 || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  )}

                  {/* Other Deductions */}
		                  {(payrollDocumentEmployee.deductionOthers || 0) > 0 && (
		                    <tr className="hover:bg-[#F2E8D8]/20">
                      <td className="py-2 text-left font-medium">{renderLineDescription(getDescription('deductionOthers', payrollDocumentEmployee.deductionOthersDesc || 'Other Deductions'), 'deductionOthers')}</td>
                      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{(payrollDocumentEmployee.deductionOthers || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
	                    </tr>
	                  )}
	                    </>
	                  )}
                </tbody>
              </table>

              {/* Total Row */}
              <div className="flex min-w-0 items-center justify-between gap-3 border-t border-b border-[#A32626] py-3 mt-4 text-[#A32626] font-black text-xs uppercase tracking-wider">
                <span className="min-w-0 break-words">{documentProfile.isPaymentVoucher ? 'Other Deductions' : 'Total Deductions'}</span>
                <span className="shrink-0 whitespace-nowrap font-mono">RM {breakdown.totalDeductions.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          {/* Summary Strip (Option A) */}
          <div className="grid min-w-0 grid-cols-1 md:grid-cols-3 gap-4 mb-6 select-none">
            {/* Gross Pay */}
            <div className="flex min-w-0 items-center gap-3 bg-[#F2E8D8] border border-[#E5DED5] rounded-lg p-3 sm:gap-4 sm:p-4 text-left">
              <div className="h-10 w-10 shrink-0 rounded-full bg-white flex items-center justify-center text-[#A32626] font-bold text-lg shadow-xs">
                💵
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-[#6B6B6B] font-black uppercase tracking-wider">{documentProfile.isPaymentVoucher ? 'Gross Amount' : 'Gross Pay'}</p>
                <p className="break-words text-lg font-black text-[#333333] font-mono mt-0.5 [overflow-wrap:anywhere]">
                  RM {breakdown.grossPay.toLocaleString('en-US', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>

            {/* Total Deductions */}
            <div className="flex min-w-0 items-center gap-3 bg-[#F2E8D8] border border-[#E5DED5] rounded-lg p-3 sm:gap-4 sm:p-4 text-left">
              <div className="h-10 w-10 shrink-0 rounded-full bg-white flex items-center justify-center text-[#A32626] font-bold text-lg shadow-xs">
                📄
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-[#6B6B6B] font-black uppercase tracking-wider">{documentProfile.isPaymentVoucher ? 'Other Deductions' : 'Total Deductions'}</p>
                <p className="break-words text-lg font-black text-[#333333] font-mono mt-0.5 [overflow-wrap:anywhere]">
                  RM {breakdown.totalDeductions.toLocaleString('en-US', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>

            {/* Net Pay (Deep Red Block) */}
            <div className="flex min-w-0 items-center gap-3 bg-[#A32626] text-white rounded-lg p-3 sm:gap-4 sm:p-4 text-left shadow-md">
              <div className="h-10 w-10 shrink-0 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                💰
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-[#F2E8D8] font-black uppercase tracking-wider">{documentProfile.isPaymentVoucher ? 'Net Payable' : 'Net Pay'}</p>
                <p className="break-words text-xl font-black text-white font-mono mt-0.5 [overflow-wrap:anywhere]">
                  RM {breakdown.netPay.toLocaleString('en-US', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>
          </div>

          {/* Employer Contributions Card (Option A) */}
          {documentProfile.statutoryEnabled && displaySettings.showEmployerContributions && (
          <div className="min-w-0 bg-[#F2E8D8] border-2 border-[#D8CFC4] rounded-lg p-3 sm:p-4 mb-6 text-left select-none text-xs">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 text-[#A32626] font-black uppercase tracking-wider text-[10px]">
              <span>🏛️ Employer Contributions</span>
              <span className="opacity-80 font-medium">(Not Paid to Employee)</span>
            </div>

            <div className="grid min-w-0 grid-cols-2 md:flex md:flex-row md:items-stretch md:justify-between gap-4 text-[#333333]">
              {/* EPF */}
              <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
                <p className="break-words text-[9px] text-[#6B6B6B] uppercase font-bold mb-1">EPF ({payrollDocumentEmployee.epfRateEmployer || 13}%)</p>
                <p className="whitespace-nowrap font-mono font-bold">RM {breakdown.epfEmployerValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>

              <div className="hidden md:block w-[2px] h-7 bg-[#D8CFC4]" />

              {/* SOCSO Injury */}
              <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
                <p className="break-words text-[9px] text-[#6B6B6B] uppercase font-bold mb-1">SOCSO - Injury</p>
                <p className="whitespace-nowrap font-mono font-bold">RM {socsoEmployerInjury.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>

              <div className="hidden md:block w-[2px] h-7 bg-[#D8CFC4]" />

              {/* SOCSO Invalidity */}
              <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
                <p className="break-words text-[9px] text-[#6B6B6B] uppercase font-bold mb-1">SOCSO - Invalidity</p>
                <p className="whitespace-nowrap font-mono font-bold">RM {socsoEmployerInvalidity.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>

              <div className="hidden md:block w-[2px] h-7 bg-[#D8CFC4]" />

              {/* SOCSO Total */}
              <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded bg-white/20 px-2 py-1 text-center">
                <p className="break-words text-[9px] text-[#A32626] uppercase font-black mb-1">SOCSO Employer Total</p>
                <p className="whitespace-nowrap font-mono font-black text-[#A32626]">RM {breakdown.socsoEmployerVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>

              <div className="hidden md:block w-[2px] h-7 bg-[#D8CFC4]" />

              {/* EIS */}
              <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
                <p className="break-words text-[9px] text-[#6B6B6B] uppercase font-bold mb-1">EIS</p>
                <p className="whitespace-nowrap font-mono font-bold">RM {breakdown.eisEmployerVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>
            </div>
          </div>
          )}

          {/* Footer Section (Option A) */}
          {displaySettings.showNotesFooter && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E5DED5] text-xs text-[#333333] mb-8 select-none">
            {/* Left Note */}
            <div className="flex min-w-0 items-start gap-2.5 text-left">
              <span className="text-base text-[#A32626] font-bold mt-0.5">💬</span>
              <div className="min-w-0">
                <p className="text-[10px] text-[#A32626] font-black uppercase tracking-wider">Important Note</p>
                <p className="font-medium text-[#6B6B6B] leading-relaxed mt-0.5">
                  This is a computer generated document.<br />
                  No signature is required.
                </p>
              </div>
            </div>

            {/* Right Period */}
            <div className="flex min-w-0 items-start gap-2.5 text-left md:justify-end">
              <span className="text-base text-[#A32626] font-bold mt-0.5">📅</span>
              <div className="min-w-0">
                <p className="text-[10px] text-[#A32626] font-black uppercase tracking-wider">Pay Period</p>
                <p className="break-words font-mono font-bold text-[#333333] mt-0.5 [overflow-wrap:anywhere]">
                  {payPeriodString}
                </p>
              </div>
            </div>
          </div>
          )}

          {/* Bottom Confidential Red Bar */}
          {displaySettings.showNotesFooter && (
          <div className="bg-[#A32626] text-white px-4 py-2.5 rounded-b-lg flex flex-col md:flex-row md:justify-between items-center text-[10px] uppercase font-bold tracking-wider select-none gap-2">
            <span className="min-w-0 text-center break-words [overflow-wrap:anywhere]">{`Thank you for your continued contribution to ${employeeEntity?.name || 'Red Point Sdn Bhd'}.`}</span>
            <span className="shrink-0 opacity-95 text-[#F2E8D8] tracking-widest font-black">Confidential</span>
          </div>
          )}

        </div>
      </div>
    </div>
  );
}
