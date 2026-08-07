/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Clock, CreditCard, FileText } from 'lucide-react';
import type { CorporateEntity, Employee, PayrollRecord2026 } from '../types';
import { calculateYtd, isEmployeeEligibleForPayrollPeriod } from '../data';
import PayslipDocumentView from './PayslipDocumentView';
import PayrollEditorMockupView from './PayrollEditorMockupView';

interface PayrollViewProps {
  employees: Employee[];
  payrollRecords2026?: PayrollRecord2026[];
  onShowNotification: (title: string, message: string) => void;
  activeEntity?: CorporateEntity;
}

type PayrollSubTab = 'processing' | 'document' | 'history';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const HISTORY_MONTHS = ['', ...MONTHS];

const formatMoney = (value: number) =>
  `RM ${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export default function PayrollView({
  employees,
  payrollRecords2026 = [],
  onShowNotification,
  activeEntity
}: PayrollViewProps) {
  const defaultPeriod = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const [selectedPayPeriod, setSelectedPayPeriod] = useState(defaultPeriod);
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [activeSubTab, setActiveSubTab] = useState<PayrollSubTab>('processing');

  const [monthName, selectedYearText] = selectedPayPeriod.split(' ');
  const payMonthIndex = Math.max(1, MONTHS.indexOf(monthName) + 1);
  const payYear = Number(selectedYearText) || new Date().getFullYear();

  const entityEmployees = useMemo(() => {
    if (!activeEntity?.id) return employees;

    const scopedEmployees = employees.filter(employee => employee.entityId === activeEntity.id);
    return scopedEmployees.length > 0 ? scopedEmployees : employees;
  }, [activeEntity, employees]);

  const eligibleEmployees = useMemo(() => entityEmployees.filter(employee => (
    (selectedDepartment === 'All Departments' || employee.department === selectedDepartment) &&
    isEmployeeEligibleForPayrollPeriod(employee, payMonthIndex, payYear)
  )), [entityEmployees, payMonthIndex, payYear, selectedDepartment]);

  useEffect(() => {
    const candidatePool = eligibleEmployees.length > 0 ? eligibleEmployees : entityEmployees;
    if (candidatePool.length > 0 && !candidatePool.some(employee => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(candidatePool[0].id);
    }
  }, [eligibleEmployees, entityEmployees, selectedEmployeeId]);

  const renderSubTabButton = (tab: PayrollSubTab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setActiveSubTab(tab)}
      className={`flex-1 py-2 px-4 rounded font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
        activeSubTab === tab
          ? 'bg-primary text-white shadow-xs'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-neutral-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const renderHistory = () => {
    const activeEmployee = entityEmployees.find(employee => employee.id === selectedEmployeeId) || entityEmployees[0];

    if (!activeEmployee) {
      return (
        <div className="py-8 text-center text-xs text-on-surface-variant">
          No active employee found. Please register employees first.
        </div>
      );
    }

    const records = payrollRecords2026
      .filter(record => (
        record?.employeeEmail &&
        activeEmployee.email &&
        record.employeeEmail.toLowerCase() === activeEmployee.email.toLowerCase()
      ))
      .sort((a, b) => a.payrollMonth - b.payrollMonth);

    const ytd = calculateYtd(activeEmployee, selectedPayPeriod);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-neutral-50 border border-neutral-border/60 rounded-lg">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase block">YTD Basic Salary</span>
            <span className="text-lg font-mono font-bold text-primary mt-1 block">{formatMoney(ytd.basicSalary)}</span>
          </div>
          <div className="p-4 bg-neutral-50 border border-neutral-border/60 rounded-lg">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase block">YTD Allowances</span>
            <span className="text-lg font-mono font-bold text-primary mt-1 block">{formatMoney(ytd.allowances)}</span>
          </div>
          <div className="p-4 bg-neutral-50 border border-neutral-border/60 rounded-lg">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase block">YTD PCB Deducted</span>
            <span className="text-lg font-mono font-bold text-primary mt-1 block">{formatMoney(ytd.taxPcb)}</span>
          </div>
          <div className="p-4 bg-neutral-50 border border-neutral-border/60 rounded-lg">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase block">YTD Net Payout</span>
            <span className="text-lg font-mono font-bold text-green-700 mt-1 block">{formatMoney(ytd.netPay)}</span>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="py-12 border border-dashed border-neutral-border/60 rounded-lg text-center text-xs text-on-surface-variant space-y-2">
            <p className="font-bold text-on-surface">No Historical Records Found</p>
            <p>There are no saved payroll records for this employee in the database sheet yet.</p>
          </div>
        ) : (
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
                {records.map(record => {
                  const recordAllowances = Number(record.allowanceGeneral || 0) +
                    Number(record.allowanceTransport || 0) +
                    Number(record.allowanceParking || 0) +
                    Number(record.allowanceMeal || 0) +
                    Number(record.allowanceAccommodation || 0) +
                    Number(record.allowancePhone || 0);
                  const recordVariable = Number(record.overtime || 0) +
                    Number(record.bonusAmount || 0) +
                    Number(record.commissionAmount || 0) +
                    Number(record.backPayAmount || 0) +
                    Number(record.awsAmount || 0) +
                    Number(record.compensationAmount || 0);

                  return (
                    <tr key={record.id} className="hover:bg-neutral-50/40">
                      <td className="p-3 font-semibold text-primary">
                        {HISTORY_MONTHS[record.payrollMonth]} {record.payrollYear}
                      </td>
                      <td className="p-3 text-right font-mono">{formatMoney(record.basicSalary)}</td>
                      <td className="p-3 text-right font-mono text-on-surface-variant">{formatMoney(recordAllowances)}</td>
                      <td className="p-3 text-right font-mono text-on-surface-variant">{formatMoney(recordVariable)}</td>
                      <td className="p-3 text-right font-mono text-on-surface-variant">{formatMoney(record.epfEmployee)}</td>
                      <td className="p-3 text-right font-mono text-red-600">{formatMoney(record.actualPCBDeducted)}</td>
                      <td className="p-3 text-right font-mono font-bold text-green-700">{formatMoney(record.netPay)}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPayPeriod(`${HISTORY_MONTHS[record.payrollMonth]} ${record.payrollYear}`);
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
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-200 space-y-6">
      <div className="bg-white border border-neutral-border p-1.5 rounded-lg flex gap-1.5 shadow-xs select-none text-left">
        {renderSubTabButton('processing', '1. Payroll Editor', <CreditCard className="w-4 h-4" />)}
        {renderSubTabButton('document', '2. Preview Only', <FileText className="w-4 h-4" />)}
        {renderSubTabButton('history', '3. YTD & Payroll History', <Clock className="w-4 h-4" />)}
      </div>

      <div className="bg-white border border-neutral-border p-4 rounded-lg flex justify-between items-center shadow-xs text-left select-none">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-primary" />
          <div>
            <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Active Corporate Entity</h4>
            <p className="text-sm font-semibold text-on-background mt-0.5">{activeEntity?.name || 'All Subsidiaries'}</p>
          </div>
        </div>
        <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary font-mono font-bold px-2 py-0.5 rounded-sm uppercase">
          SANDBOX ISOLATED
        </span>
      </div>

      {activeSubTab === 'processing' ? (
        <PayrollEditorMockupView
          mode="embedded"
          employees={entityEmployees}
          payrollRecords2026={payrollRecords2026}
          activeEntity={activeEntity}
          selectedEmployeeId={selectedEmployeeId}
          onSelectedEmployeeIdChange={setSelectedEmployeeId}
          selectedPayPeriod={selectedPayPeriod}
          onSelectedPayPeriodChange={setSelectedPayPeriod}
          selectedDepartment={selectedDepartment}
          onSelectedDepartmentChange={setSelectedDepartment}
          onShowNotification={onShowNotification}
        />
      ) : activeSubTab === 'document' ? (
        <div className="bg-white rounded-lg border border-neutral-border overflow-hidden shadow-xs">
          <PayslipDocumentView
            employees={eligibleEmployees.length > 0 ? eligibleEmployees : entityEmployees}
            selectedEmployeeId={selectedEmployeeId}
            onBack={() => setActiveSubTab('processing')}
            onShowNotification={onShowNotification}
            activeEntity={activeEntity}
            payMonth={payMonthIndex}
            payYear={payYear}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-neutral-border p-6 shadow-xs text-left space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-border/60 pb-4">
            <div>
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> YTD & Payroll History
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                View YTD salary accumulation, statutory contributions, and net payout history for the selected employee.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Select Employee</label>
              <select
                value={selectedEmployeeId}
                onChange={event => setSelectedEmployeeId(event.target.value)}
                className="rounded border border-neutral-border bg-surface p-1.5 focus:border-primary outline-none text-xs font-semibold text-primary cursor-pointer w-64"
              >
                {entityEmployees.map(employee => (
                  <option key={employee.id} value={employee.id}>{employee.name} ({employee.email})</option>
                ))}
              </select>
            </div>
          </div>

          {renderHistory()}
        </div>
      )}
    </div>
  );
}
