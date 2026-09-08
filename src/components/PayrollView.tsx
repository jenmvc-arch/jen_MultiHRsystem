/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CalendarDays, Check, Clock, CreditCard, FileText, PlusCircle, SlidersHorizontal, Users } from 'lucide-react';
import type { CorporateEntity, Employee, PayrollRecord2026, PayrollPayoutKind } from '../types';
import type { PayrollDocumentDisplaySettings } from '../types';
import { PAYROLL_FILE_EXPORT_COLUMNS } from '../lib/exportTypes';
import {
  calculateYtd,
  getDefaultPayrollDocumentDisplaySettings,
  getPayrollDocumentDisplaySettings,
  getPayrollDocumentFieldLabels,
  getPayrollDocumentProfile,
  getSeparatePayoutConfig,
  isEmployeeEligibleForPayrollPeriod
} from '../data';
import PayslipDocumentView from './PayslipDocumentView';
import PayrollEditorMockupView from './PayrollEditorMockupView';
import ExportButton from './ExportButton';
import type { PayrollActionResult } from '../lib/payrollClient';

interface PayrollViewProps {
  employees: Employee[];
  payrollRecords2026?: PayrollRecord2026[];
  onUpdateEmployee?: (id: string, updates: Partial<Employee>) => Promise<void>;
  onShowNotification: (title: string, message: string) => void;
  activeEntity?: CorporateEntity;
  onSavePayrollRecord?: (record: PayrollRecord2026) => Promise<void>;
  onUpdatePayrollStatus?: (recordIds: string[], action: 'process' | 'publish' | 'unpublish') => Promise<PayrollActionResult[]>;
  onSendPayslipEmails?: (recordIds: string[]) => Promise<PayrollActionResult[]>;
  currentUserRole?: string | null;
}

type PayrollSubTab = 'editor' | 'payroll-file' | 'payslip-preview' | 'history';

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
  onUpdateEmployee,
  onShowNotification,
  activeEntity,
  onSavePayrollRecord,
  onUpdatePayrollStatus,
  onSendPayslipEmails,
  currentUserRole
}: PayrollViewProps) {
  const defaultPeriod = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const [selectedPayPeriod, setSelectedPayPeriod] = useState(defaultPeriod);
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [activeSubTab, setActiveSubTab] = useState<PayrollSubTab>('editor');
  const [displaySettingsDraft, setDisplaySettingsDraft] = useState<PayrollDocumentDisplaySettings>({});
  const [isSavingDisplaySettings, setIsSavingDisplaySettings] = useState(false);
  const [selectedPayoutKind, setSelectedPayoutKind] = useState<Exclude<PayrollPayoutKind, 'regular'> | null>(null);
  const [selectedPayrollRecord, setSelectedPayrollRecord] = useState<PayrollRecord2026 | null>(null);
  const [selectedPayrollFileRecordIds, setSelectedPayrollFileRecordIds] = useState<string[]>([]);

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

  const employeeOptions = eligibleEmployees.length > 0 ? eligibleEmployees : entityEmployees;

  useEffect(() => {
    const candidatePool = eligibleEmployees.length > 0 ? eligibleEmployees : entityEmployees;
    if (candidatePool.length > 0 && !candidatePool.some(employee => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(candidatePool[0].id);
    }
  }, [eligibleEmployees, entityEmployees, selectedEmployeeId]);

  const activePayrollEmployee = entityEmployees.find(employee => employee.id === selectedEmployeeId) || entityEmployees[0];
  const activeDocumentProfile = activePayrollEmployee ? getPayrollDocumentProfile(activePayrollEmployee) : null;
  const activeDocumentFieldLabels = activeDocumentProfile
    ? getPayrollDocumentFieldLabels(activeDocumentProfile)
    : getPayrollDocumentFieldLabels({ isPaymentVoucher: false });

  useEffect(() => {
    if (activePayrollEmployee) {
      setDisplaySettingsDraft(getPayrollDocumentDisplaySettings(activePayrollEmployee));
    }
  }, [activePayrollEmployee?.id, activePayrollEmployee?.payrollDocumentDisplaySettings, activePayrollEmployee?.employmentType, activePayrollEmployee?.contractStatutoryTreatment]);

  const displaySettingFields: Array<{ key: keyof PayrollDocumentDisplaySettings; label: string; statutoryOnly?: boolean }> = [
    { key: 'showDesignation', label: activeDocumentFieldLabels.designation },
    { key: 'showDepartment', label: 'Department' },
    { key: 'showEmail', label: 'Email' },
    { key: 'showNricPassport', label: 'NRIC / Passport' },
    { key: 'showTin', label: 'TIN / Tax Number' },
    { key: 'showEpfNumber', label: 'EPF Number', statutoryOnly: true },
    { key: 'showDateJoined', label: activeDocumentFieldLabels.dateJoined },
    { key: 'showLastWorkingDay', label: 'Last Working Day' },
    { key: 'showBankAccount', label: 'Bank Account' },
    { key: 'showCompanyAddress', label: 'Company Address' },
    { key: 'showEarningsDetails', label: 'Earnings Details' },
    { key: 'showDeductionDetails', label: 'Deduction Details' },
    { key: 'showEmployerContributions', label: 'Employer Contributions', statutoryOnly: true },
    { key: 'showYtdSummary', label: 'YTD Summary' },
    { key: 'showNotesFooter', label: 'Notes / Footer' }
  ];

  const handleSaveDisplaySettings = async () => {
    if (!activePayrollEmployee || !onUpdateEmployee) {
      onShowNotification('Display Settings Not Saved', 'Employee update handler is not available for this payroll view.');
      return;
    }
    setIsSavingDisplaySettings(true);
    try {
      await onUpdateEmployee(activePayrollEmployee.id, {
        payrollDocumentDisplaySettings: displaySettingsDraft
      });
      if (selectedPayrollRecord && onSavePayrollRecord) {
        const nextRecord = {
          ...selectedPayrollRecord,
          displaySettingsSnapshot: { ...displaySettingsDraft },
        };
        await onSavePayrollRecord(nextRecord);
        setSelectedPayrollRecord(nextRecord);
      }
      onShowNotification('Display Settings Saved', `Payroll document display settings were saved for ${activePayrollEmployee.name}.`);
    } catch (error: any) {
      // The parent employee update handler reports remote sync failures. Avoid
      // showing a second toast for the same failed save attempt.
      console.error('[Payroll Display Settings Save] Failed:', error);
      if (!error?.notificationShown) {
        onShowNotification('Save Failed', error?.message || 'Payroll document display settings could not be saved.');
      }
    } finally {
      setIsSavingDisplaySettings(false);
    }
  };

  const handleResetDisplaySettings = () => {
    if (!activePayrollEmployee) return;
    setDisplaySettingsDraft(getDefaultPayrollDocumentDisplaySettings(activePayrollEmployee));
  };

  const launchSeparatePayout = (kind: Exclude<PayrollPayoutKind, 'regular'>) => {
    setSelectedPayoutKind(kind);
    setSelectedPayrollRecord(null);
    setActiveSubTab('editor');
  };

  const clearSeparatePayoutMode = () => setSelectedPayoutKind(null);

  const handleSelectedEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setSelectedPayrollRecord(null);
    setSelectedPayoutKind(null);
    if (activeSubTab === 'payslip-preview') {
      setActiveSubTab('editor');
    }
  };

  const handleSelectedPayPeriodChange = (payPeriod: string) => {
    setSelectedPayPeriod(payPeriod);
    setSelectedPayrollRecord(null);
    setSelectedPayrollFileRecordIds([]);
    setSelectedPayoutKind(null);
    if (activeSubTab === 'payslip-preview') {
      setActiveSubTab('editor');
    }
  };

  const handleSelectedDepartmentChange = (department: string) => {
    setSelectedDepartment(department);
    setSelectedPayrollRecord(null);
    setSelectedPayrollFileRecordIds([]);
    setSelectedPayoutKind(null);
    if (activeSubTab === 'payslip-preview') {
      setActiveSubTab('editor');
    }
  };

  const openPayrollPreview = (record: PayrollRecord2026, employeeId?: string) => {
    setSelectedPayrollRecord(record);
    if (employeeId) {
      setSelectedEmployeeId(employeeId);
    }
    setSelectedPayPeriod(`${HISTORY_MONTHS[record.payrollMonth]} ${record.payrollYear}`);
    setSelectedPayoutKind(record.payoutKind && record.payoutKind !== 'regular' ? record.payoutKind : null);
    setActiveSubTab('payslip-preview');
  };

  const payrollFileRecords = useMemo(() => {
    const employeeByEmail = new Map<string, Employee>(entityEmployees.map(employee => [employee.email.toLowerCase(), employee]));
    return payrollRecords2026
      .filter(record => {
        const employee = employeeByEmail.get(record.employeeEmail.toLowerCase());
        return ['Draft', 'Processed', 'Published'].includes(record.status || 'Draft')
          && employee
          && record.payrollMonth === payMonthIndex
          && record.payrollYear === payYear
          && (selectedDepartment === 'All Departments' || employee.department === selectedDepartment);
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }, [entityEmployees, payrollRecords2026, payMonthIndex, payYear, selectedDepartment]);

  const payrollFileRows = useMemo(() => {
    const employeeByEmail = new Map<string, Employee>(
      employeeOptions.map(employee => [employee.email.toLowerCase(), employee])
    );
    const recordEmployeeEmails = new Set(
      payrollFileRecords.map(record => record.employeeEmail.toLowerCase())
    );
    const processedRows = payrollFileRecords.map(record => ({
      employee: employeeByEmail.get(record.employeeEmail.toLowerCase()),
      record
    })).filter((row): row is { employee: Employee; record: PayrollRecord2026 } => Boolean(row.employee));
    const pendingRows = employeeOptions
      .filter(employee => !recordEmployeeEmails.has(employee.email.toLowerCase()))
      .map(employee => ({ employee, record: undefined }));

    return [...processedRows, ...pendingRows];
  }, [employeeOptions, payrollFileRecords]);

  const [isPayrollActionRunning, setIsPayrollActionRunning] = useState(false);
  const selectedActionableRecords = useMemo(
    () => payrollFileRecords.filter(record => selectedPayrollFileRecordIds.includes(record.id)),
    [payrollFileRecords, selectedPayrollFileRecordIds],
  );
  const selectedDraftIds = selectedActionableRecords
    .filter(record => (record.status || 'Draft') === 'Draft')
    .map(record => record.id);
  const selectedProcessedIds = selectedActionableRecords
    .filter(record => record.status === 'Processed')
    .map(record => record.id);
  const selectedPublishedIds = selectedActionableRecords
    .filter(record => record.status === 'Published')
    .map(record => record.id);

  const runPayrollAction = async (
    action: 'process' | 'publish' | 'unpublish' | 'email',
    recordIds: string[],
  ) => {
    if (!recordIds.length) {
      onShowNotification('Select Payroll First', 'Choose at least one eligible payroll record.');
      return;
    }
    setIsPayrollActionRunning(true);
    try {
      const results = action === 'email'
        ? await onSendPayslipEmails?.(recordIds)
        : await onUpdatePayrollStatus?.(recordIds, action);
      const resolved = results || [];
      const succeeded = resolved.filter(result => result.ok).length;
      const failed = resolved.length - succeeded;
      const label = action === 'email'
        ? 'Payslip emails'
        : action === 'process'
          ? 'Payroll processing'
          : action === 'publish' ? 'Payroll publishing' : 'Payroll unpublishing';
      onShowNotification(
        failed ? `${label} Needs Attention` : `${label} Complete`,
        `${succeeded} completed${failed ? `, ${failed} failed` : ''}.`,
      );
      setSelectedPayrollFileRecordIds(previous => previous.filter(id => !resolved.some(result => result.ok && result.recordId === id)));
    } catch (error: any) {
      onShowNotification('Payroll Action Failed', error?.message || 'The payroll action could not be completed.');
    } finally {
      setIsPayrollActionRunning(false);
    }
  };

  useEffect(() => {
    const availableIds = new Set(payrollFileRecords.map(record => record.id));
    setSelectedPayrollFileRecordIds(previous => previous.filter(id => availableIds.has(id)));
  }, [payrollFileRecords]);

  const renderSeparatePayoutPanel = () => {
    if (!activePayrollEmployee) return null;

    const payoutKinds: Exclude<PayrollPayoutKind, 'regular'>[] = ['bonus', 'incentive_commission', 'claim_reimbursement'];

    return (
      <div className="bg-white border border-neutral-border p-4 rounded-lg shadow-xs text-left space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Generate Separate Payout</h4>
            <p className="text-[11px] text-on-surface-variant mt-1">
              Create a separate payroll record for bonus, commission, or claim reimbursement payments.
            </p>
          </div>
          {selectedPayoutKind && (
            <button
              type="button"
              onClick={clearSeparatePayoutMode}
              className="rounded border border-neutral-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:bg-neutral-50"
            >
              Clear Selection
            </button>
          )}
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {payoutKinds.map(kind => {
            const config = getSeparatePayoutConfig(kind);
            return (
              <button
                key={kind}
                type="button"
                onClick={() => launchSeparatePayout(kind)}
                className={`rounded-lg border p-3 text-left transition-all hover:shadow-xs ${
                  selectedPayoutKind === kind
                    ? 'border-primary bg-primary/5'
                    : 'border-neutral-border bg-neutral-50 hover:bg-primary/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Separate Payout</span>
                  <PlusCircle className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 font-bold text-primary">{config.title}</p>
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  {kind === 'bonus' && 'Bonus payment document with optional statutory treatment.'}
                  {kind === 'incentive_commission' && 'Commission or incentive payment document with optional statutory treatment.'}
                  {kind === 'claim_reimbursement' && 'Claim or reimbursement voucher with optional statutory treatment.'}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDisplaySettingsPanel = () => {
    if (!activePayrollEmployee || !activeDocumentProfile) return null;

    return (
      <div className="bg-white border border-neutral-border p-4 rounded-lg shadow-xs text-left space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Document Display Settings</h4>
            <p className="text-[11px] text-on-surface-variant mt-1">
              Changes update the editor and payslip preview immediately. Save to persist them for this employee and future documents.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              activeDocumentProfile.isPaymentVoucher ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {activeDocumentProfile.documentType}
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              {activeDocumentProfile.compensationLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          {displaySettingFields.map(field => {
            const disabled = field.statutoryOnly && !activeDocumentProfile.statutoryEnabled;
            return (
              <label
                key={field.key}
                className={`flex items-center gap-2 rounded border px-2.5 py-2 text-xs font-semibold ${
                  disabled ? 'border-neutral-border bg-neutral-50 text-on-surface-variant opacity-60' : 'border-neutral-border bg-white text-on-surface hover:bg-primary/5'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!displaySettingsDraft[field.key] && !disabled}
                  disabled={disabled}
                  onChange={event => setDisplaySettingsDraft(previous => ({
                    ...previous,
                    [field.key]: event.target.checked
                  }))}
                  className="h-3.5 w-3.5 accent-primary"
                />
                {field.label}
              </label>
            );
          })}
        </div>

        {!activeDocumentProfile.statutoryEnabled && (
          <p className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] font-semibold text-amber-800">
            Statutory-only fields are disabled because this employee receives a Payment Voucher without statutory.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleResetDisplaySettings}
            className="rounded border border-neutral-border px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-neutral-50"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={handleSaveDisplaySettings}
            disabled={isSavingDisplaySettings}
            className="rounded bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-container disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isSavingDisplaySettings ? 'Saving...' : 'Save Display Settings'}
          </button>
          {selectedPayrollRecord && (
            <button
              type="button"
              onClick={() => openPayrollPreview(selectedPayrollRecord, selectedEmployeeId)}
              className="rounded border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
            >
              Preview Payslip
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSubTabButton = (tab: PayrollSubTab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => {
        if (tab === 'payslip-preview' && !selectedPayrollRecord) return;
        setActiveSubTab(tab);
      }}
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
        !/^pending-email-\d+@redpoint\.local$/i.test(activeEmployee.email) &&
        record.employeeEmail.toLowerCase() === activeEmployee.email.toLowerCase()
      ))
      .sort((a, b) => {
        const monthDiff = a.payrollMonth - b.payrollMonth;
        if (monthDiff !== 0) return monthDiff;
        return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      });

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
                        {record.isSeparatePayout && (
                          <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            {record.payoutTitle || 'Separate Payout'}
                          </span>
                        )}
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
                          onClick={() => openPayrollPreview(record, activeEmployee.id)}
                          className="px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded font-bold transition-colors cursor-pointer text-[10px]"
                        >
                          View {record.payoutTitle || record.documentType || getPayrollDocumentProfile(activeEmployee).documentType}
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
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8 animate-in fade-in duration-200">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Core Operations</p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-on-background sm:text-4xl">Payroll Center</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
              Prepare, process, review, and export payroll documents within the active corporate workspace.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-primary">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Workspace filters persist only for this payroll session.
          </div>
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl border border-neutral-border bg-white p-1.5 shadow-xs">
        <div className="flex min-w-[620px] gap-1.5">
          {renderSubTabButton('editor', '1. Payroll Editor', <CreditCard className="h-4 w-4" />)}
          {renderSubTabButton('payroll-file', '2. Payroll File', <FileText className="h-4 w-4" />)}
          {renderSubTabButton('payslip-preview', '3. Preview Payslip', <FileText className="h-4 w-4" />)}
          {renderSubTabButton('history', '4. YTD & History', <Clock className="h-4 w-4" />)}
        </div>
      </div>

      <section className="rounded-xl border border-neutral-border bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-4 border-b border-neutral-border/60 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-primary">Payroll Workspace</h2>
              <p className="mt-1 text-base font-bold text-on-background">{activeEntity?.name || 'All Subsidiaries'}</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Entity isolation and payroll filters apply to the current session.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Check className="h-3.5 w-3.5" /> Workspace isolated
          </span>
        </div>

        <div className="mb-4 flex items-center gap-2 pt-4">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-primary">Workspace Filters</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1.1fr]">
          <label className="block text-left">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Employee</span>
            <select
              value={selectedEmployeeId}
              onChange={event => handleSelectedEmployeeChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-border bg-surface px-3 text-xs font-semibold text-on-background outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {employeeOptions.map(employee => (
                <option key={employee.id} value={employee.id}>{employee.name} - {employee.email}</option>
              ))}
            </select>
          </label>
          <label className="block text-left">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Pay month</span>
            <select
              value={monthName}
              onChange={event => handleSelectedPayPeriodChange(`${event.target.value} ${payYear}`)}
              className="h-10 w-full rounded-lg border border-neutral-border bg-surface px-3 text-xs font-semibold text-on-background outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {MONTHS.map(month => <option key={month}>{month}</option>)}
            </select>
          </label>
          <label className="block text-left">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Pay year</span>
            <select
              value={String(payYear)}
              onChange={event => handleSelectedPayPeriodChange(`${monthName} ${event.target.value}`)}
              className="h-10 w-full rounded-lg border border-neutral-border bg-surface px-3 text-xs font-semibold text-on-background outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {Array.from({ length: 31 }, (_, index) => 2020 + index).reverse().map(year => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
          <label className="block text-left">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Department</span>
            <select
              value={selectedDepartment}
              onChange={event => handleSelectedDepartmentChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-border bg-surface px-3 text-xs font-semibold text-on-background outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option>All Departments</option>
              {Array.from(new Set(entityEmployees.map(employee => employee.department).filter(Boolean))).sort().map(department => (
                <option key={department}>{department}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[11px] text-on-surface-variant">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          Active period: <span className="font-bold text-on-background">{selectedPayPeriod}</span>
        </p>
      </section>

      {activeSubTab === 'editor' && renderSeparatePayoutPanel()}
      {activeSubTab === 'editor' && renderDisplaySettingsPanel()}

      {activeSubTab === 'editor' ? (
        <PayrollEditorMockupView
          mode="embedded"
          employees={entityEmployees}
          payrollRecords2026={payrollRecords2026}
          activeEntity={activeEntity}
          selectedEmployeeId={selectedEmployeeId}
          onSelectedEmployeeIdChange={handleSelectedEmployeeChange}
          selectedPayPeriod={selectedPayPeriod}
          onSelectedPayPeriodChange={handleSelectedPayPeriodChange}
          selectedDepartment={selectedDepartment}
          onSelectedDepartmentChange={handleSelectedDepartmentChange}
          displaySettingsOverride={displaySettingsDraft}
          separatePayoutKind={selectedPayoutKind}
          onSavePayrollRecord={onSavePayrollRecord}
          onGeneratedPayrollRecord={record => {
            setSelectedPayrollRecord(record);
            setSelectedPayoutKind(record.payoutKind && record.payoutKind !== 'regular' ? record.payoutKind : null);
            setSelectedPayrollFileRecordIds([record.id]);
            setActiveSubTab('payroll-file');
          }}
          onShowNotification={onShowNotification}
        />
      ) : activeSubTab === 'payroll-file' ? (
        <div className="space-y-4 rounded-xl border border-neutral-border bg-white p-4 shadow-xs sm:p-5">
          <div className="flex flex-col gap-3 border-b border-neutral-border/60 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">2. Payroll File</p>
              <h2 className="mt-1 text-2xl font-black text-on-background">Monthly Payroll File</h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                All employees in the active payroll population appear here. Save and process an employee to add them to the export file.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void runPayrollAction('process', selectedDraftIds)}
                disabled={isPayrollActionRunning || !selectedDraftIds.length}
                className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Process Selected
              </button>
              <button
                type="button"
                onClick={() => void runPayrollAction('publish', selectedProcessedIds)}
                disabled={isPayrollActionRunning || !selectedProcessedIds.length}
                className="rounded bg-primary px-3 py-2 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPayrollActionRunning ? 'Working...' : `Publish Selected${selectedProcessedIds.length ? ` (${selectedProcessedIds.length})` : ''}`}
              </button>
              <button
                type="button"
                onClick={() => void runPayrollAction('email', selectedProcessedIds)}
                disabled={isPayrollActionRunning || !selectedProcessedIds.length}
                className="rounded border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] font-bold text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send Payslip Email
              </button>
              <button
                type="button"
                onClick={() => void runPayrollAction('unpublish', selectedPublishedIds)}
                disabled={isPayrollActionRunning || !selectedPublishedIds.length}
                className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Unpublish
              </button>
              <ExportButton
                module="payroll"
                title="Monthly payroll file"
                currentUserRole={currentUserRole}
                onShowNotification={onShowNotification}
                selectedRecordIds={selectedPayrollFileRecordIds}
                filters={{
                  entityId: activeEntity?.id,
                  department: selectedDepartment,
                  payrollMonth: payMonthIndex,
                  payrollYear: payYear,
                  status: 'Processed',
                }}
                columns={PAYROLL_FILE_EXPORT_COLUMNS}
              />
            </div>
          </div>
          {payrollFileRows.length === 0 ? (
            <div className="rounded border border-dashed border-neutral-border p-12 text-center text-xs text-on-surface-variant">
              <p className="font-bold text-on-surface">No employees available for this payroll period</p>
              <p className="mt-1">Change the payroll filters or register employees in the active corporate entity.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-neutral-border">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th className="p-3">
                      <input
                        type="checkbox"
                        checked={payrollFileRecords.length > 0 && selectedPayrollFileRecordIds.length === payrollFileRecords.length}
                        onChange={event => setSelectedPayrollFileRecordIds(event.target.checked ? payrollFileRecords.map(record => record.id) : [])}
                        className="h-4 w-4 accent-primary"
                        aria-label="Select all payroll records"
                      />
                    </th>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Payroll Period</th>
                    <th className="p-3 text-right">Gross Pay</th>
                    <th className="p-3 text-right">Deductions</th>
                    <th className="p-3 text-right">Net Pay</th>
                    <th className="p-3">Processed At</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border/50">
                  {payrollFileRows.map(({ employee, record }) => {
                    if (!record) {
                      return (
                        <tr key={`pending-${employee.id}`} className="bg-surface-container-low/40">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              disabled
                              className="h-4 w-4 accent-primary opacity-40"
                              aria-label={`${employee.name} is not processed`}
                            />
                          </td>
                          <td className="p-3 font-semibold text-on-background">
                            {employee.name}
                            <span className="block text-[10px] font-normal text-on-surface-variant">{employee.email}</span>
                          </td>
                          <td className="p-3">
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                              Draft not saved
                            </span>
                          </td>
                          <td className="p-3">{employee.department || '—'}</td>
                          <td className="p-3">{HISTORY_MONTHS[payMonthIndex]} {payYear}</td>
                          <td className="p-3 text-right font-mono text-on-surface-variant">—</td>
                          <td className="p-3 text-right font-mono text-on-surface-variant">—</td>
                          <td className="p-3 text-right font-mono text-on-surface-variant">—</td>
                          <td className="p-3 text-on-surface-variant">—</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEmployeeId(employee.id);
                                setSelectedPayoutKind(null);
                                setActiveSubTab('editor');
                              }}
                              className="rounded bg-primary/10 px-2.5 py-1.5 font-bold text-primary hover:bg-primary/20"
                            >
                              Open Editor
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    const legacyGross = Number(record.basicSalary || 0)
                      + Number(record.allowanceGeneral || 0)
                      + Number(record.allowanceTransport || 0)
                      + Number(record.allowanceParking || 0)
                      + Number(record.allowanceMeal || 0)
                      + Number(record.allowanceAccommodation || 0)
                      + Number(record.allowancePhone || 0)
                      + Number(record.overtime || 0)
                      + Number(record.bonusAmount || 0)
                      + Number(record.commissionAmount || 0)
                      + Number(record.backPayAmount || 0)
                      + Number(record.awsAmount || 0)
                      + Number(record.compensationAmount || 0);
                    const grossPay = record.grossPay ?? (record as PayrollRecord2026 & { grossSalary?: number }).grossSalary ?? legacyGross;
                    const deductions = Math.max(
                      0,
                      grossPay + Number(record.reimbursementAmount || 0) - Number(record.netPay || (record as PayrollRecord2026 & { netSalary?: number }).netSalary || 0)
                    );
                    return (
                      <tr key={record.id} className="hover:bg-primary/5">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedPayrollFileRecordIds.includes(record.id)}
                            onChange={event => setSelectedPayrollFileRecordIds(previous => event.target.checked ? [...new Set([...previous, record.id])] : previous.filter(id => id !== record.id))}
                            className="h-4 w-4 accent-primary"
                            aria-label={`Select ${employee?.name || record.employeeEmail}`}
                          />
                        </td>
                        <td className="p-3 font-semibold text-primary">{employee?.name || record.employeeEmail}<span className="block text-[10px] font-normal text-on-surface-variant">{record.employeeEmail}</span></td>
                        <td className="p-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            record.status === 'Published'
                              ? 'bg-blue-100 text-blue-800'
                              : record.status === 'Processed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {record.status || 'Draft'}
                          </span>
                        </td>
                        <td className="p-3">{employee.department || '—'}</td>
                        <td className="p-3">{HISTORY_MONTHS[record.payrollMonth]} {record.payrollYear}</td>
                        <td className="p-3 text-right font-mono">{formatMoney(grossPay)}</td>
                        <td className="p-3 text-right font-mono text-red-700">{formatMoney(deductions)}</td>
                        <td className="p-3 text-right font-mono font-bold text-green-700">{formatMoney(record.netPay || (record as PayrollRecord2026 & { netSalary?: number }).netSalary || 0)}</td>
                        <td className="p-3">{record.createdAt || '—'}</td>
                        <td className="p-3 text-right">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button type="button" onClick={() => openPayrollPreview(record, employee?.id || selectedEmployeeId)} className="rounded bg-primary/10 px-2.5 py-1.5 font-bold text-primary hover:bg-primary/20">Preview</button>
                            {record.status === 'Draft' && (
                              <button
                                type="button"
                                onClick={() => void runPayrollAction('process', [record.id])}
                                disabled={isPayrollActionRunning}
                                className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1.5 font-bold text-amber-800 hover:bg-amber-100"
                              >
                                Process
                              </button>
                            )}
                            {record.status === 'Processed' && (
                              <>
                                <button type="button" onClick={() => void runPayrollAction('publish', [record.id])} disabled={isPayrollActionRunning} className="rounded border border-primary/30 bg-primary/5 px-2.5 py-1.5 font-bold text-primary hover:bg-primary/10 disabled:opacity-40">Publish</button>
                                <button type="button" onClick={() => void runPayrollAction('email', [record.id])} disabled={isPayrollActionRunning} className="rounded border border-neutral-border bg-white px-2.5 py-1.5 font-bold text-on-surface-variant hover:bg-neutral-50 disabled:opacity-40">Email PDF</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="flex items-center gap-2 text-[11px] text-on-surface-variant"><Check className="h-3.5 w-3.5 text-green-700" /> Drafts are saved for this month. Only Processed records can be published or emailed; Published records are visible in the employee site.</p>
        </div>
      ) : activeSubTab === 'payslip-preview' ? (
        <div className="overflow-hidden rounded-xl border border-neutral-border bg-white shadow-xs">
          {selectedPayrollRecord ? (
            <PayslipDocumentView
              employees={entityEmployees}
              selectedEmployeeId={selectedEmployeeId}
              onBack={() => setActiveSubTab('payroll-file')}
              onShowNotification={onShowNotification}
              activeEntity={activeEntity}
              payMonth={selectedPayrollRecord.payrollMonth}
              payYear={selectedPayrollRecord.payrollYear}
              displaySettingsOverride={displaySettingsDraft}
              payrollRecordOverride={selectedPayrollRecord}
            />
          ) : (
            <div className="p-12 text-center text-sm text-on-surface-variant">
              <ArrowLeft className="mx-auto mb-3 h-6 w-6 text-primary" />
              <p className="font-bold text-on-surface">No payslip selected</p>
              <p className="mt-1">Open Payroll File and choose Preview Payslip on a processed payroll record.</p>
              <button type="button" onClick={() => setActiveSubTab('payroll-file')} className="mt-4 rounded bg-primary px-4 py-2 text-xs font-bold text-white">Go to Payroll File</button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 rounded-xl border border-neutral-border bg-white p-4 text-left shadow-xs sm:p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-border/60 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">4. YTD & History</p>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-black text-on-background">
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
                onChange={event => handleSelectedEmployeeChange(event.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-border bg-surface px-3 text-xs font-semibold text-on-background outline-none focus:border-primary sm:w-72"
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
