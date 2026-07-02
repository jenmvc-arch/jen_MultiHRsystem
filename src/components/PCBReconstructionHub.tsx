import React, { useState } from 'react';
import { 
  AlertCircle, 
  Calendar, 
  Play, 
  CheckCircle, 
  Download, 
  TrendingUp, 
  XCircle, 
  Plus, 
  FileText, 
  Sliders,
  DollarSign,
  User,
  Info
} from 'lucide-react';
import { 
  Employee, 
  HistoricalPayrollRecord, 
  EmployeeTaxProfile, 
  HistoricalCalculationBasis, 
  HistoricalPCBResult, 
  PCBProcessingMode 
} from '../types';
import { 
  reconstructPCBHistory, 
  recalculatePCBFromMonth,
  getEffectiveProfileForMonth,
  getPayrollRecordForMonth 
} from '../data';

interface PCBReconstructionHubProps {
  employees: Employee[];
  onUpdateEmployee: (id: string, updates: Partial<Employee>) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function PCBReconstructionHub({
  employees,
  onUpdateEmployee,
  onShowNotification
}: PCBReconstructionHubProps) {
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(12);
  const [calcBasis, setCalcBasis] = useState<HistoricalCalculationBasis>('actual_deduction_history');
  
  // UI Tab state
  const [activeSubTab, setActiveSubTab] = useState<'input_payroll' | 'input_profiles' | 'reconstruction'>('reconstruction');

  // Preview / Computed results state
  const [previewResults, setPreviewResults] = useState<HistoricalPCBResult[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [lastUsedBasis, setLastUsedBasis] = useState<HistoricalCalculationBasis>('actual_deduction_history');

  // Form states for adding historical payroll record
  const [payMonth, setPayMonth] = useState(1);
  const [payBasic, setPayBasic] = useState(5000);
  const [payAllowanceGen, setPayAllowanceGen] = useState(0);
  const [payOvertime, setPayOvertime] = useState(0);
  const [payBonus, setPayBonus] = useState(0);
  const [payCommission, setPayCommission] = useState(0);
  const [payActualPcb, setPayActualPcb] = useState(0);

  // Form states for adding effective profile snap
  const [profEffectiveDate, setProfEffectiveDate] = useState('2026-01-01');
  const [profBasic, setProfBasic] = useState(5000);
  const [profMarital, setProfMarital] = useState<'Single' | 'Married' | 'Divorced' | 'Widowed'>('Single');
  const [profSpouseWorking, setProfSpouseWorking] = useState<'Yes' | 'No'>('No');
  const [profDependants, setProfDependants] = useState(0);

  const activeEmployee = employees.find(e => e.id === selectedEmpId) || employees[0];

  if (!activeEmployee) {
    return (
      <div className="p-6 bg-white border border-neutral-border rounded-lg text-center text-xs">
        No active employees found to reconstruct PCB records.
      </div>
    );
  }

  // Monthly Labels
  const MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const handleAddPayrollRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: HistoricalPayrollRecord = {
      payrollMonth: Number(payMonth),
      basicSalary: Number(payBasic),
      allowanceGeneral: Number(payAllowanceGen),
      overtime: Number(payOvertime),
      bonusAmount: Number(payBonus),
      commissionAmount: Number(payCommission),
      actualPCBDeducted: Number(payActualPcb),
      epfEmployee: Math.round(Number(payBasic) * 0.11),
      zakat: 0,
      cp38: 0
    };

    const currentRecords = activeEmployee.historicalPayrollRecords || [];
    const filtered = currentRecords.filter(r => r.payrollMonth !== Number(payMonth));
    const updated = [...filtered, newRecord].sort((a, b) => a.payrollMonth - b.payrollMonth);

    onUpdateEmployee(activeEmployee.id, {
      historicalPayrollRecords: updated
    });
    
    // Automatically trigger forward recalculation if needed
    const recalculated = recalculatePCBFromMonth({
      employee: { ...activeEmployee, historicalPayrollRecords: updated },
      taxYear: 2026,
      changedMonth: Number(payMonth),
      calculationBasis: calcBasis
    });
    
    onUpdateEmployee(activeEmployee.id, {
      historicalPayrollRecords: updated,
      historicalPcbResults: recalculated
    });

    onShowNotification(
      'Payroll Record Saved', 
      `Successfully registered payroll for ${MONTH_NAMES[payMonth]} 2026. Recalculated PCB forwarding effects.`,
      'success'
    );
  };

  const handleAddEffectiveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const newProfile: EmployeeTaxProfile = {
      effectiveDate: profEffectiveDate,
      basicSalary: Number(profBasic),
      housingAllowance: 0,
      transportAllowance: 0,
      maritalStatus: profMarital,
      spouseIsWorking: profSpouseWorking,
      dependantsCount: Number(profDependants),
      eligibleForStatutory: 'Yes'
    };

    const currentProfiles = activeEmployee.effectiveDatedProfiles || [];
    const filtered = currentProfiles.filter(p => p.effectiveDate !== profEffectiveDate);
    const updated = [...filtered, newProfile].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

    onUpdateEmployee(activeEmployee.id, {
      effectiveDatedProfiles: updated
    });

    onShowNotification(
      'Tax Profile Registered',
      `Effective profile registered for ${profEffectiveDate}. Run reconstruction to apply updates.`,
      'success'
    );
  };

  const handlePreviewReconstruction = () => {
    const computed = reconstructPCBHistory({
      employee: activeEmployee,
      taxYear: 2026,
      startMonth: Number(startMonth),
      endMonth: Number(endMonth),
      calculationBasis: calcBasis
    });
    setPreviewResults(computed);
    setHasCalculated(true);
    setLastUsedBasis(calcBasis);
    onShowNotification('Reconstruction Previewed', 'Reconstructed chronological PCB calculations generated.', 'info');
  };

  const handleRunReconstruction = () => {
    const computed = reconstructPCBHistory({
      employee: activeEmployee,
      taxYear: 2026,
      startMonth: 1,
      endMonth: 12,
      calculationBasis: calcBasis
    });

    onUpdateEmployee(activeEmployee.id, {
      historicalPcbResults: computed
    });

    setPreviewResults(computed.filter(r => r.payrollMonth >= Number(startMonth) && r.payrollMonth <= Number(endMonth)));
    setHasCalculated(true);
    setLastUsedBasis(calcBasis);
    onShowNotification(
      'Reconstruction Finalized', 
      `Committed chronological calculation results for months 1-12 to the employee's registry.`, 
      'success'
    );
  };

  // Summarize Reconciliation Totals
  const activeResults = (activeEmployee.historicalPcbResults && activeEmployee.historicalPcbResults.length > 0)
    ? activeEmployee.historicalPcbResults.filter(r => r.payrollMonth >= Number(startMonth) && r.payrollMonth <= Number(endMonth))
    : previewResults;
    
  const annualCalculated = activeResults.reduce((acc, curr) => acc + curr.calculatedPCB, 0);
  const annualActual = activeResults.reduce((acc, curr) => acc + (curr.actualPCBDeducted || 0), 0);
  const annualVariance = annualActual - annualCalculated;

  return (
    <div className="space-y-6 text-left">
      <div className="bg-surface-container-low p-5 rounded-lg border border-neutral-border">
        <h3 className="font-bold text-sm text-primary uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-primary" /> Chronological PCB Processing Console
        </h3>
        <p className="text-[11px] text-on-surface-variant leading-relaxed">
          Reconstruct, audits, or recalculates monthly tax deduction histories chronologically based on actual historical monthly payroll records and effective-dated employee profiles.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Select Employee</label>
            <select
              value={selectedEmpId}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                setHasCalculated(false);
                setPreviewResults([]);
              }}
              className="w-full bg-white border border-neutral-border rounded p-2 focus:ring-1 focus:ring-primary outline-none"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Start Month</label>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(Number(e.target.value))}
              className="w-full bg-white border border-neutral-border rounded p-2 focus:ring-1 focus:ring-primary outline-none font-mono"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>{MONTH_NAMES[m]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">End Month</label>
            <select
              value={endMonth}
              onChange={(e) => setEndMonth(Number(e.target.value))}
              className="w-full bg-white border border-neutral-border rounded p-2 focus:ring-1 focus:ring-primary outline-none font-mono"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>{MONTH_NAMES[m]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Calculation Basis</label>
            <select
              value={calcBasis}
              onChange={(e) => setCalcBasis(e.target.value as HistoricalCalculationBasis)}
              className="w-full bg-white border border-neutral-border rounded p-2 focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="actual_deduction_history">Actual Deduction History (Audit)</option>
              <option value="corrected_recalculated_history">Corrected Recalculated History (Revised)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 text-amber-900 rounded text-[10px] leading-relaxed flex gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 font-bold" />
          <div>
            <strong>Reconstruction Rule Notice:</strong> This process calculates PCB chronologically. Rebuilding or changing records in an earlier month affects accumulated variables and tax brackets, modifying calculated PCB for all subsequent months.
          </div>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={handlePreviewReconstruction}
            className="bg-zinc-100 text-zinc-800 border border-neutral-border text-xs font-semibold py-2 px-4 rounded hover:bg-zinc-200 cursor-pointer flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Preview Reconstruction
          </button>
          <button
            onClick={handleRunReconstruction}
            className="bg-primary text-[#f7f0e0] text-xs font-semibold py-2 px-5 rounded hover:opacity-95 cursor-pointer flex items-center gap-1.5"
          >
            <Play className="w-4 h-4 text-[#f7f0e0]" /> Run & Save Reconstruction
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-neutral-border text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('reconstruction')}
          className={`py-2.5 px-4 cursor-pointer transition-colors border-b-2 ${
            activeSubTab === 'reconstruction' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          1. Reconciliation Report
        </button>
        <button
          onClick={() => setActiveSubTab('input_payroll')}
          className={`py-2.5 px-4 cursor-pointer transition-colors border-b-2 ${
            activeSubTab === 'input_payroll' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          2. Enter Historical Payroll Records
        </button>
        <button
          onClick={() => setActiveSubTab('input_profiles')}
          className={`py-2.5 px-4 cursor-pointer transition-colors border-b-2 ${
            activeSubTab === 'input_profiles' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          3. Manage Effective-Dated Profiles
        </button>
      </div>

      {/* Reconciliation tab */}
      {activeSubTab === 'reconstruction' && (
        <div className="space-y-6">
          {/* Report Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-neutral-50 rounded border border-neutral-border">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">YTD Calculated PCB</span>
              <span className="text-sm font-mono font-bold text-primary">RM {annualCalculated.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
            </div>
            <div className="p-3 bg-neutral-50 rounded border border-neutral-border">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block font-bold">YTD Actual Deducted</span>
              <span className="text-sm font-mono font-bold text-on-surface">RM {annualActual.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
            </div>
            <div className="p-3 bg-neutral-50 rounded border border-neutral-border">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block font-bold">PCB Variance</span>
              <span className={`text-sm font-mono font-bold ${annualVariance < 0 ? 'text-error' : annualVariance > 0 ? 'text-green-700' : 'text-zinc-600'}`}>
                RM {annualVariance.toLocaleString('en-US', {minimumFractionDigits:2})}
              </span>
            </div>
            <div className="p-3 bg-neutral-50 rounded border border-neutral-border">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Audit Status</span>
              <span className={`text-[10px] font-bold inline-block px-2 py-0.5 rounded-full uppercase ${annualVariance !== 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                {annualVariance !== 0 ? 'Variance Detected' : 'Fully Matched'}
              </span>
            </div>
          </div>

          <div className="bg-white border border-neutral-border rounded-lg overflow-hidden shadow-xs">
            <div className="p-4 border-b border-neutral-border flex justify-between items-center bg-neutral-50">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary">
                Chronological PCB Reconciliation Report (2026)
              </h4>
              <span className="text-[10px] font-semibold text-on-surface-variant font-bold">
                Basis: <span className="font-bold text-primary uppercase font-mono">{lastUsedBasis}</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/50 text-on-surface-variant font-bold border-b border-neutral-border uppercase tracking-wider text-[9px]">
                    <th className="p-3">Month</th>
                    <th className="p-3">Profile Applied</th>
                    <th className="p-3 text-right">Normal Income</th>
                    <th className="p-3 text-right">Additional Income</th>
                    <th className="p-3 text-right font-bold text-primary">Calculated PCB</th>
                    <th className="p-3 text-right font-bold">Actual PCB Deducted</th>
                    <th className="p-3 text-right">PCB Variance</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border/60">
                  {activeResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-on-surface-variant italic">
                        No calculations have been run. Click "Run & Save Reconstruction" to analyze history.
                      </td>
                    </tr>
                  ) : (
                    activeResults.map(res => (
                      <tr key={res.payrollMonth} className="hover:bg-neutral-50/30">
                        <td className="p-3 font-semibold font-mono">{MONTH_NAMES[res.payrollMonth]}</td>
                        <td className="p-3 font-mono text-[10px] text-zinc-400">{res.effectiveEmployeeProfileVersion}</td>
                        <td className="p-3 text-right font-mono font-bold">RM {res.currentNormalRemuneration.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td className="p-3 text-right font-mono">RM {res.currentAdditionalRemuneration.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td className="p-3 text-right font-mono text-primary font-bold">RM {res.calculatedPCB.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-700">RM {(res.actualPCBDeducted || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td className={`p-3 text-right font-mono font-bold ${res.pcbVariance && res.pcbVariance < 0 ? 'text-error' : res.pcbVariance && res.pcbVariance > 0 ? 'text-green-700' : 'text-zinc-500'}`}>
                          RM {(res.pcbVariance || 0).toLocaleString('en-US', {minimumFractionDigits:2})}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            res.status === 'variance_detected' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {res.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Input payroll tab */}
      {activeSubTab === 'input_payroll' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-white border border-neutral-border rounded-lg p-5 shadow-sm">
            <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 mb-4">
              Register Payroll Record
            </h4>
            <form onSubmit={handleAddPayrollRecord} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Payroll Month</label>
                <select
                  value={payMonth}
                  onChange={(e) => setPayMonth(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>{MONTH_NAMES[m]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Basic Salary (RM)</label>
                <input
                  type="number" required
                  value={payBasic}
                  onChange={(e) => setPayBasic(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Fixed General Allowance (RM)</label>
                <input
                  type="number"
                  value={payAllowanceGen}
                  onChange={(e) => setPayAllowanceGen(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Overtime Paid (RM)</label>
                <input
                  type="number"
                  value={payOvertime}
                  onChange={(e) => setPayOvertime(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Contractual / Performance Bonus (RM)</label>
                <input
                  type="number"
                  value={payBonus}
                  onChange={(e) => setPayBonus(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Commission Earned (RM)</label>
                <input
                  type="number"
                  value={payCommission}
                  onChange={(e) => setPayCommission(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono"
                />
              </div>
              <div className="bg-primary/5 p-3 rounded border border-primary/20">
                <label className="block text-[10px] font-bold text-primary uppercase mb-1">Actual PCB Deducted (RM)</label>
                <input
                  type="number" required
                  value={payActualPcb}
                  onChange={(e) => setPayActualPcb(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono text-primary font-semibold"
                />
                <span className="text-[9px] text-on-surface-variant block mt-1">Specify actual amount deducted on employee's payslip for comparison.</span>
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-[#f7f0e0] font-semibold py-2 rounded hover:opacity-95 cursor-pointer"
              >
                Save Record & Trigger Recalculation
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white border border-neutral-border rounded-lg p-5 shadow-sm text-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant border-b border-neutral-100 pb-2 mb-4">
              Registered Payroll Records (January–December 2026)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-on-surface-variant font-bold border-b border-neutral-border uppercase tracking-wider text-[9px]">
                    <th className="p-2">Month</th>
                    <th className="p-2 text-right">Basic Salary</th>
                    <th className="p-2 text-right">General Allowance</th>
                    <th className="p-2 text-right">Overtime</th>
                    <th className="p-2 text-right">Bonus</th>
                    <th className="p-2 text-right">Commission</th>
                    <th className="p-2 text-right font-bold text-primary">Actual PCB Deducted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border/60">
                  {!activeEmployee.historicalPayrollRecords || activeEmployee.historicalPayrollRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-on-surface-variant italic">
                        No historical payroll records registered yet. Fill out the form on the left to get started.
                      </td>
                    </tr>
                  ) : (
                    activeEmployee.historicalPayrollRecords.map(rec => (
                      <tr key={rec.payrollMonth} className="hover:bg-neutral-50/40">
                        <td className="p-2 font-semibold font-mono">{MONTH_NAMES[rec.payrollMonth]}</td>
                        <td className="p-2 text-right font-mono">RM {rec.basicSalary.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td className="p-2 text-right font-mono">RM {(rec.allowanceGeneral || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td className="p-2 text-right font-mono">RM {(rec.overtime || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td className="p-2 text-right font-mono">RM {(rec.bonusAmount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td className="p-2 text-right font-mono">RM {(rec.commissionAmount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td className="p-2 text-right font-mono font-bold text-primary">RM {rec.actualPCBDeducted.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Input profiles tab */}
      {activeSubTab === 'input_profiles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-white border border-neutral-border rounded-lg p-5 shadow-sm">
            <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 mb-4">
              Add Effective Profile Snapshot
            </h4>
            <form onSubmit={handleAddEffectiveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Effective Date (YYYY-MM-DD)</label>
                <input
                  type="date" required
                  value={profEffectiveDate}
                  onChange={(e) => setProfEffectiveDate(e.target.value)}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Basic Salary (RM)</label>
                <input
                  type="number" required
                  value={profBasic}
                  onChange={(e) => setProfBasic(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Marital Status</label>
                <select
                  value={profMarital}
                  onChange={(e) => setProfMarital(e.target.value as any)}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Spouse Working Status</label>
                <select
                  value={profSpouseWorking}
                  onChange={(e) => setProfSpouseWorking(e.target.value as any)}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="No">No (Spouse Relief Applicable)</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Number of Dependants (Children)</label>
                <input
                  type="number" required min={0}
                  value={profDependants}
                  onChange={(e) => setProfDependants(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-[#f7f0e0] font-semibold py-2 rounded hover:opacity-95 cursor-pointer"
              >
                Register Snapshot Profile
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white border border-neutral-border rounded-lg p-5 shadow-sm text-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant border-b border-neutral-100 pb-2 mb-4">
              Effective-Dated Snapshots Timeline
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-on-surface-variant font-bold border-b border-neutral-border uppercase tracking-wider text-[9px]">
                    <th className="p-2">Effective Date</th>
                    <th className="p-2 text-right">Basic Salary</th>
                    <th className="p-2">Marital Status</th>
                    <th className="p-2">Spouse Working</th>
                    <th className="p-2 text-center">Children Count</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border/60 font-mono text-[11px]">
                  {!activeEmployee.effectiveDatedProfiles || activeEmployee.effectiveDatedProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-on-surface-variant italic font-sans text-xs">
                        No custom effective snapshots registered yet. Running default current active profile variables.
                      </td>
                    </tr>
                  ) : (
                    activeEmployee.effectiveDatedProfiles.map((prof, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/40">
                        <td className="p-2 font-bold text-primary">{prof.effectiveDate}</td>
                        <td className="p-2 text-right">RM {prof.basicSalary.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td className="p-2 uppercase font-sans text-[10px]">{prof.maritalStatus}</td>
                        <td className="p-2 uppercase font-sans text-[10px]">{prof.spouseIsWorking || 'No'}</td>
                        <td className="p-2 text-center">{prof.dependantsCount || 0}</td>
                        <td className="p-2 text-center">
                          <span className="bg-green-100 text-green-800 text-[9px] font-sans font-bold px-1.5 py-0.5 rounded">Active</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
