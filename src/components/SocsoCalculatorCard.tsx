/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Shield, 
  RefreshCw, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  Sliders, 
  FileText, 
  Info,
  DollarSign
} from 'lucide-react';
import { Employee, SocsoContributionResult } from '../types';
import { calculateSocsoContribution } from '../data';

interface SocsoCalculatorCardProps {
  employee: Employee;
  payrollPeriod: string; // YYYY-MM
  payrollItems?: { code: string; amount: number }[];
  onRecalculate?: () => void;
  onReviewCategory?: () => void;
}

export default function SocsoCalculatorCard({
  employee,
  payrollPeriod,
  payrollItems: propPayrollItems,
  onRecalculate,
  onReviewCategory
}: SocsoCalculatorCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Extract pay run items from employee current settings or props
  let payrollItems = propPayrollItems;
  if (!payrollItems) {
    const basicSalary = employee.basicSalary || 0;
    const allowanceGen = employee.allowanceGeneral || 0;
    const allowanceTrans = employee.allowanceTransport !== undefined ? employee.allowanceTransport : (employee.transportAllowance || 0);
    const allowancePark = employee.allowanceParking || 0;
    const allowanceMl = employee.allowanceMeal || 0;
    const allowanceAccom = employee.allowanceAccommodation !== undefined ? employee.allowanceAccommodation : (employee.housingAllowance || 0);
    const allowancePh = employee.allowancePhone || 0;
    const overtimeVal = employee.overtime || 0;
    const commissionVal = employee.commissionAmount || 0;
    const backPayVal = employee.backPayAmount || 0;
    const unpaidLeave = employee.unpaidLeave || 0;

    payrollItems = [
      { code: 'basic_salary', amount: basicSalary },
      { code: 'overtime', amount: overtimeVal },
      { code: 'commission', amount: commissionVal },
      { code: 'allowance_general', amount: allowanceGen },
      { code: 'allowance_transport', amount: allowanceTrans },
      { code: 'allowance_parking', amount: allowancePark },
      { code: 'allowance_meal', amount: allowanceMl },
      { code: 'allowance_accommodation', amount: allowanceAccom },
      { code: 'allowance_phone', amount: allowancePh },
      { code: 'backpay', amount: backPayVal }
    ];

    if (unpaidLeave > 0) {
      payrollItems.push({ code: 'unpaid_leave', amount: unpaidLeave });
    }
  }

  // Calculate contribution details using the engine
  const result: SocsoContributionResult = calculateSocsoContribution({
    employee,
    payrollPeriod,
    payrollItems
  });

  // Calculate age for displaying
  const dobStr = employee.socsoProfile?.dateOfBirth;
  let age = 0;
  if (dobStr) {
    const dob = new Date(dobStr);
    const payDate = new Date(payrollPeriod + '-01');
    age = payDate.getFullYear() - dob.getFullYear();
    const m = payDate.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && payDate.getDate() < dob.getDate())) {
      age--;
    }
  }

  const categoryLabels: Record<string, string> = {
    FIRST_CATEGORY: 'First Category (Employment Injury & Invalidity)',
    SECOND_CATEGORY: 'Second Category (Employment Injury & LINDUNG 24 Jam)',
    EXEMPT: 'Statutory Exempt / Out of Scope',
    REVIEW_REQUIRED: 'Review Required (Action Needed)'
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden mb-6 transition-all duration-300 hover:shadow-xl">
      <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">PERKESO / SOCSO Contribution</h3>
            <p className="text-xs text-slate-500">Malaysia Social Security Act 1969, Act 4</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result.calculationStatus === 'review_required' && (
            <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full flex items-center gap-1 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" /> Action Required
            </span>
          )}
          {result.calculationStatus === 'exempt' && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">
              Exempt
            </span>
          )}
          {result.calculationStatus === 'override_applied' && (
            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full flex items-center gap-1 border border-purple-200 animate-pulse">
              Override Applied
            </span>
          )}
          {result.calculationStatus === 'calculated' && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1 border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" /> Checked & Compliant
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Alerts & Errors */}
        {result.validationErrors.map((err, i) => (
          <div key={i} className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm rounded flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{err}</span>
          </div>
        ))}

        {result.warningMessages.map((warn, i) => (
          <div key={i} className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800 text-sm rounded flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{warn}</span>
          </div>
        ))}

        {/* Profile Attributes Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Status</span>
            <span className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              {employee.socsoProfile?.socsoCoverageStatus || 'Covered'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Category</span>
            <span className="font-semibold text-slate-800 text-sm block truncate" title={categoryLabels[result.contributionCategory]}>
              {result.contributionCategory === 'FIRST_CATEGORY' ? 'First Category (Age < 60)' : result.contributionCategory === 'SECOND_CATEGORY' ? 'Second Category (Age >= 60)' : result.contributionCategory}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Employee Age</span>
            <span className="font-semibold text-slate-800 text-sm">
              {age > 0 ? `${age} Years Old` : 'Not Configured'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Assigned Bracket</span>
            <span className="font-semibold text-slate-800 text-sm block truncate" title={result.wageBracketDescription}>
              {result.wageBracketNumber > 0 ? `#${result.wageBracketNumber}: ${result.wageBracketDescription}` : 'None'}
            </span>
          </div>
        </div>

        {/* Contribution Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Employee Share */}
          <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm">
            <h4 className="font-bold text-slate-800 border-b pb-2 mb-3 flex items-center justify-between">
              <span>Employee Contribution</span>
              <span className="text-rose-600 text-lg font-extrabold">RM {result.employeeSocsoTotal.toFixed(2)}</span>
            </h4>
            <div className="space-y-2.5 text-sm text-slate-600">
              <div className="flex justify-between items-center">
                <span>Invalidity Scheme (0.50%):</span>
                <span className="font-semibold text-slate-800">RM {result.employeeInvalidity.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-dashed pt-2">
                <span className="flex items-center gap-1">
                  LINDUNG 24 Jam (0.75%):
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" title="Mandatory employee-borne Non-Employment Injury Scheme" />
                </span>
                <span className="font-semibold text-slate-800">RM {result.employeeLindung24.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Employer Share */}
          <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm">
            <h4 className="font-bold text-slate-800 border-b pb-2 mb-3 flex items-center justify-between">
              <span>Employer Contribution</span>
              <span className="text-rose-600 text-lg font-extrabold">RM {result.employerSocsoTotal.toFixed(2)}</span>
            </h4>
            <div className="space-y-2.5 text-sm text-slate-600">
              <div className="flex justify-between items-center">
                <span>Employment Injury Scheme (1.25%):</span>
                <span className="font-semibold text-slate-800">RM {result.employerEmploymentInjury.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-dashed pt-2">
                <span>Invalidity Scheme (0.50%):</span>
                <span className="font-semibold text-slate-800">RM {result.employerInvalidity.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Combined Summary & Wages */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50 mb-6 text-sm">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-500 block text-xs">Contributable SOCSO Wages:</span>
              <span className="font-bold text-slate-800 text-base">RM {result.socsoWages.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Capped Calculation Wage:</span>
              <span className="font-bold text-slate-800 text-base">RM {result.contributionWage.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-xs">Combined Total Contribution:</span>
            <span className="font-extrabold text-slate-900 text-xl text-rose-600">
              RM {result.totalSocsoContribution.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <button
            onClick={() => onRecalculate?.()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-sm transition flex items-center gap-2 shadow-sm shadow-rose-200"
          >
            <RefreshCw className="w-4 h-4" /> Recalculate
          </button>
          
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-sm transition flex items-center gap-2"
          >
            <Sliders className="w-4 h-4" /> {showBreakdown ? 'Hide Breakdown' : 'View Breakdown'}
          </button>

          <button
            onClick={() => onReviewCategory?.()}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-sm transition flex items-center gap-2"
          >
            <Info className="w-4 h-4" /> Review Category
          </button>

          <button
            onClick={() => setShowComparison(!showComparison)}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-sm transition flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> Compare With PERKESO Table
          </button>
        </div>

        {/* Dynamic Breakdown Drawer */}
        {showBreakdown && (
          <div className="mt-5 p-5 border border-slate-100 rounded-xl bg-slate-50 text-sm text-slate-700 animate-fadeIn">
            <h5 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-600" /> Wages Component Breakdown & Exclusions
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-semibold text-slate-700 block mb-2">Subject to Contribution (Included):</span>
                <ul className="space-y-1.5 pl-4 list-disc text-xs text-slate-600">
                  <li>Basic Contractual Salary (Prorated): RM {basicSalary.toFixed(2)}</li>
                  {overtimeVal > 0 && <li>Overtime Pay: RM {overtimeVal.toFixed(2)}</li>}
                  {commissionVal > 0 && <li>Commission: RM {commissionVal.toFixed(2)}</li>}
                  {allowanceGen > 0 && <li>General Allowance: RM {allowanceGen.toFixed(2)}</li>}
                  {allowanceTrans > 0 && <li>Transport Allowance: RM {allowanceTrans.toFixed(2)}</li>}
                  {allowancePark > 0 && <li>Parking Allowance: RM {allowancePark.toFixed(2)}</li>}
                  {allowanceMl > 0 && <li>Meal Allowance: RM {allowanceMl.toFixed(2)}</li>}
                  {allowanceAccom > 0 && <li>Accommodation Allowance: RM {allowanceAccom.toFixed(2)}</li>}
                  {allowancePh > 0 && <li>Phone Allowance: RM {allowancePh.toFixed(2)}</li>}
                  {backPayVal > 0 && <li>Back Pay / Arrears: RM {backPayVal.toFixed(2)}</li>}
                  {unpaidLeave > 0 && <li className="text-rose-600 font-semibold">Unpaid Leave Deduction: -RM {unpaidLeave.toFixed(2)}</li>}
                </ul>
              </div>
              <div className="border-l md:pl-4 border-slate-200">
                <span className="font-semibold text-slate-700 block mb-2">Statutory Exclusions (Excluded):</span>
                <ul className="space-y-1.5 pl-4 list-disc text-xs text-slate-500">
                  <li>Employer EPF/SOCSO/EIS Contributions: Excluded by default</li>
                  <li>dismissal or retrenchment compensation: Excluded by default</li>
                  <li>Gratuity / Retirement benefits: Excluded by default</li>
                  {employee.performanceBonus !== undefined && <li>Annual / Performance Bonus: RM {((employee.performanceBonus || 0)).toFixed(2)} (Non-recurring)</li>}
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">
              <span>Timestamp: {result.calculationTimestamp} • Config ID: {result.configurationVersion}</span>
            </div>
          </div>
        )}

        {/* Dynamic Comparison Drawer */}
        {showComparison && (
          <div className="mt-5 p-5 border border-slate-100 rounded-xl bg-slate-50 text-sm text-slate-700 animate-fadeIn">
            <h5 className="font-bold text-slate-800 mb-3">Official Bracket Table Matcher (Verification)</h5>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-200 text-slate-700 uppercase font-bold">
                  <tr>
                    <th className="px-3 py-2">Bracket Range</th>
                    <th className="px-3 py-2">Assumed Wage</th>
                    <th className="px-3 py-2 text-right">Employer Share</th>
                    <th className="px-3 py-2 text-right">Employee Share</th>
                    <th className="px-3 py-2 text-right">Combined Total</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className={result.wageBracketNumber === result.wageBracketNumber ? "bg-rose-50 font-bold text-rose-900" : ""}>
                    <td className="px-3 py-2">{result.wageBracketDescription}</td>
                    <td className="px-3 py-2">RM {result.contributionWage.toFixed(2)} (Actual)</td>
                    <td className="px-3 py-2 text-right">RM {result.employerSocsoTotal.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">RM {result.employeeSocsoTotal.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">RM {result.totalSocsoContribution.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 bg-rose-200 text-rose-800 text-[10px] font-bold rounded">MATCHED</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
