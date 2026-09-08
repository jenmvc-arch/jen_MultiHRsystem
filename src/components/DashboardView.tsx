/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Copy,
  CreditCard,
  FileText,
  MapPin,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users
} from 'lucide-react';
import {
  CorporateEntity,
  Employee,
  EmployeePerformance,
  PayrollRecord2026,
  ReviewCycle
} from '../types';
import EmployeeAvatar from './EmployeeAvatar';
import { getEffectiveEmploymentStatusForDate, isCurrentEmploymentStatus } from '../data';
import { getGmt8DateString } from '../lib/dateUtils';

interface DashboardViewProps {
  employees: Employee[];
  entities: CorporateEntity[];
  reviewCycles: ReviewCycle[];
  performances: EmployeePerformance[];
  payrollRecords2026?: PayrollRecord2026[];
  onNavigate: (tab: any) => void;
  onOpenPayslip?: (employeeId: string) => void;
  onOpenNewEmployeeModal: () => void;
  activeEntityId?: string;
  onChangeActiveEntity?: (id: string) => void;
}

const monthLabels = [
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

const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DashboardView({
  employees,
  entities,
  reviewCycles,
  performances,
  payrollRecords2026,
  onNavigate,
  onOpenPayslip,
  onOpenNewEmployeeModal,
  activeEntityId
}: DashboardViewProps) {
  const [addressCopied, setAddressCopied] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const filteredEmployees = activeEntityId === 'all'
    ? employees
    : employees.filter((employee) => employee.entityId === activeEntityId);
  const activeEntity = entities.find((entity) => entity.id === activeEntityId);
  const todayIsoDate = getGmt8DateString();
  const activeEmployees = filteredEmployees.filter((employee) => (
    isCurrentEmploymentStatus(getEffectiveEmploymentStatusForDate(employee, todayIsoDate))
  )).length;
  const activeEmployeeProfiles = filteredEmployees.filter((employee) => (
    isCurrentEmploymentStatus(getEffectiveEmploymentStatusForDate(employee, todayIsoDate))
  ));
  const onLeaveEmployees = filteredEmployees.filter((employee) => (
    getEffectiveEmploymentStatusForDate(employee, todayIsoDate) === 'On Leave'
  )).length;

  const calculateRecordGross = (record: PayrollRecord2026) => (
    record.basicSalary
      + (record.allowanceGeneral || 0)
      + (record.allowanceTransport || 0)
      + (record.allowanceParking || 0)
      + (record.allowanceMeal || 0)
      + (record.allowanceAccommodation || 0)
      + (record.allowancePhone || 0)
      + (record.overtime || 0)
      + (record.bonusAmount || 0)
      + (record.commissionAmount || 0)
      + (record.backPayAmount || 0)
      + (record.awsAmount || 0)
      + (record.compensationAmount || 0)
  );

  const payrollRecords = payrollRecords2026 || [];
  const matchingRecords = payrollRecords.filter((record) => (
    record.payrollYear === selectedYear
    && record.payrollMonth === selectedMonth + 1
    && record.status !== 'Draft'
  ));
  const hasPayrollRecord = matchingRecords.length > 0;
  const totalPayroll = hasPayrollRecord
    ? Math.round(matchingRecords.reduce((total, record) => total + calculateRecordGross(record), 0))
    : 0;
  const estimatedPayroll = Math.round(activeEmployeeProfiles.reduce(
    (total, employee) => total + employee.basicSalary + (employee.housingAllowance || 0) + (employee.transportAllowance || 0),
    0
  ));
  const displayedPayroll = hasPayrollRecord ? totalPayroll : estimatedPayroll;
  const averageSalary = hasPayrollRecord
    ? Math.round(matchingRecords.reduce((total, record) => total + record.basicSalary, 0) / matchingRecords.length)
    : activeEmployees > 0
      ? Math.round(activeEmployeeProfiles.reduce((total, employee) => total + employee.basicSalary, 0) / activeEmployees)
      : 0;

  const currentCycle = reviewCycles[0];
  const currentCycleId = currentCycle?.id || 'cycle-2026-annual';
  const entityPerformances = performances.filter((performance) => (
    performance.reviewCycleId === currentCycleId
    && filteredEmployees.some((employee) => employee.id === performance.employeeId)
  ));
  const reviewsCompletedCount = entityPerformances.filter((performance) => (
    performance.reviewStatus === 'Completed'
  )).length;
  const reviewsPendingCount = currentCycle ? Math.max(0, activeEmployees - reviewsCompletedCount) : 0;

  const chartRows = monthAbbreviations.slice(0, selectedMonth + 1).map((label, index) => {
    const monthlyRecords = payrollRecords.filter((record) => (
      record.payrollYear === selectedYear
      && record.payrollMonth === index + 1
      && record.status !== 'Draft'
    ));
    return {
      label,
      value: monthlyRecords.length > 0
        ? Math.round(monthlyRecords.reduce((total, record) => total + calculateRecordGross(record), 0))
        : null
    };
  });
  const chartValues = chartRows.flatMap((row) => row.value === null ? [] : [row.value]);
  const chartMaxValue = Math.max(Math.ceil(Math.max(...chartValues, 1000) / 5000) * 5000, 5000);
  const chartHasData = chartValues.length > 0;
  const chartPlotWidth = 620;
  const chartLeft = 56;
  const chartBottom = 216;
  const chartTop = 28;
  const chartPoints = chartRows.map((row, index) => {
    const x = chartRows.length > 1
      ? chartLeft + index * (chartPlotWidth / (chartRows.length - 1))
      : chartLeft + chartPlotWidth / 2;
    const y = row.value === null
      ? null
      : chartBottom - (row.value / chartMaxValue) * (chartBottom - chartTop);
    return { ...row, x, y };
  });
  const chartSegments: Array<Array<{ x: number; y: number; value: number }>> = [];
  chartPoints.forEach((point, index) => {
    if (point.value === null || point.y === null) return;
    const previousPoint = chartPoints[index - 1];
    if (!previousPoint || previousPoint.value === null) chartSegments.push([]);
    chartSegments[chartSegments.length - 1].push({
      x: point.x,
      y: point.y,
      value: point.value
    });
  });

  const missingRegistrationFields = activeEntity
    ? [
      ['SSM registration', activeEntity.registrationNumber],
      ['Tax reference', activeEntity.taxReferenceNo],
      ['EPF reference', activeEntity.epfReferenceNo],
      ['SOCSO reference', activeEntity.socsoReferenceNo]
    ].filter(([, value]) => !value).map(([label]) => label)
    : [];

  const attentionItems = [
    ...(reviewsPendingCount > 0 ? [{
      title: 'Performance reviews pending',
      detail: `${reviewsPendingCount} employee${reviewsPendingCount === 1 ? '' : 's'} still need attention${currentCycle ? ` in ${currentCycle.name}` : ''}.`,
      action: 'Open reviews',
      onClick: () => onNavigate('performance'),
      tone: 'red'
    }] : []),
    ...(!currentCycle ? [{
      title: 'Review cycle not configured',
      detail: 'Create a performance cycle before assigning employee reviews.',
      action: 'Open performance setup',
      onClick: () => onNavigate('performance'),
      tone: 'slate'
    }] : []),
    ...(!hasPayrollRecord ? [{
      title: 'Payroll record not available',
      detail: `There is no processed payroll record for ${monthLabels[selectedMonth]} ${selectedYear}.`,
      action: 'Open payroll',
      onClick: () => onNavigate('payroll'),
      tone: 'amber'
    }] : []),
    ...(onLeaveEmployees > 0 ? [{
      title: 'Leave activity to review',
      detail: `${onLeaveEmployees} active employee${onLeaveEmployees === 1 ? '' : 's'} currently marked on leave.`,
      action: 'Review leave',
      onClick: () => onNavigate('leave-management'),
      tone: 'amber'
    }] : []),
    ...(missingRegistrationFields.length > 0 ? [{
      title: 'Complete company profile',
      detail: `Missing: ${missingRegistrationFields.join(', ')}.`,
      action: 'Open settings',
      onClick: () => onNavigate('entities'),
      tone: 'slate'
    }] : [])
  ];

  const handleCopyAddress = async (address: string) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(address);
    setAddressCopied(true);
    window.setTimeout(() => setAddressCopied(false), 2000);
  };

  const formatMoney = (value: number) => `RM ${value.toLocaleString()}`;

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 animate-in fade-in duration-200">
      <header className="flex flex-col gap-4 border-b border-neutral-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Employer dashboard
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-on-background md:text-4xl">Employer overview</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-on-surface-variant">
            A focused view of payroll, people and the next actions for {activeEntity?.name || 'your workspace'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-border bg-white p-2 shadow-sm">
          <span className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">View period</span>
          <label className="sr-only" htmlFor="dashboard-month">Month</label>
          <select
            id="dashboard-month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
            className="rounded-lg border border-neutral-border bg-neutral-50 px-2.5 py-1.5 text-xs font-bold text-on-surface outline-none transition-colors hover:bg-neutral-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {monthLabels.map((month, index) => <option key={month} value={index}>{month}</option>)}
          </select>
          <label className="sr-only" htmlFor="dashboard-year">Year</label>
          <select
            id="dashboard-year"
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="rounded-lg border border-neutral-border bg-neutral-50 px-2.5 py-1.5 text-xs font-bold text-on-surface outline-none transition-colors hover:bg-neutral-100 focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {[2024, 2025, 2026, 2027].map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <Calendar className="mr-1 h-4 w-4 text-primary" aria-hidden="true" />
        </div>
      </header>

      {activeEntity && (
        <section className="rounded-2xl border border-neutral-border bg-white p-4 shadow-sm md:p-5" aria-labelledby="workspace-context-title">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span id="workspace-context-title" className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Active workspace</span>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-on-surface-variant">{activeEntity.id}</span>
                </div>
                <h2 className="mt-1 text-xl font-bold text-on-background">{activeEntity.name}</h2>
                <div className="mt-1 flex items-start gap-1.5 text-xs text-on-surface-variant">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="max-w-2xl">{activeEntity.address}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyAddress(activeEntity.address)}
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-neutral-border px-3 py-2 text-[11px] font-bold text-primary transition-colors hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30 lg:self-center"
            >
              {addressCopied ? <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              <span className={addressCopied ? 'text-green-600' : undefined}>{addressCopied ? 'Address copied' : 'Copy address'}</span>
            </button>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-border/70 pt-4 sm:grid-cols-4">
            {[
              ['SSM registration', activeEntity.registrationNumber],
              ['Tax reference', activeEntity.taxReferenceNo],
              ['EPF reference', activeEntity.epfReferenceNo],
              ['SOCSO reference', activeEntity.socsoReferenceNo]
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{label}</dt>
                <dd className="mt-1 truncate font-mono text-[11px] font-semibold text-on-surface">{value || 'Not set'}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <article className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-sm md:p-7">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full border-[24px] border-white/10" aria-hidden="true" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Payroll snapshot
                </div>
                <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
                  {formatMoney(displayedPayroll)}
                </h2>
                <p className="mt-1 text-sm text-white/75">
                  {monthLabels[selectedMonth]} {selectedYear} · {hasPayrollRecord ? `${matchingRecords.length} payroll record${matchingRecords.length === 1 ? '' : 's'}` : 'Estimated from employee profiles'}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${hasPayrollRecord ? 'bg-white/15 text-white' : 'bg-black/10 text-white/85'}`}>
                {hasPayrollRecord ? 'Records available' : 'Estimate only'}
              </span>
            </div>
            <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-white/20 pt-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">Average basic salary</div>
                <div className="mt-1 text-lg font-bold">{averageSalary > 0 ? formatMoney(averageSalary) : '—'}</div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('payroll')}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-primary transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/70 active:translate-y-px"
              >
                Open payroll center
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-neutral-border bg-white p-5 shadow-sm" aria-labelledby="attention-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Action queue</div>
              <h2 id="attention-title" className="mt-1 text-xl font-bold text-on-background">What needs attention</h2>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">{attentionItems.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {attentionItems.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-700" aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold text-green-900">All clear for this view</div>
                  <p className="mt-0.5 text-xs text-green-800">No outstanding payroll, leave or performance actions were found.</p>
                </div>
              </div>
            ) : (
              attentionItems.slice(0, 3).map((item) => (
                <div key={item.title} className={`rounded-xl border-l-4 p-3 ${item.tone === 'red' ? 'border-primary bg-primary/5' : item.tone === 'amber' ? 'border-amber-500 bg-amber-50' : 'border-slate-400 bg-slate-50'}`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${item.tone === 'red' ? 'text-primary' : item.tone === 'amber' ? 'text-amber-700' : 'text-slate-600'}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-on-background">{item.title}</div>
                      <p className="mt-0.5 text-xs text-on-surface-variant">{item.detail}</p>
                      <button
                        type="button"
                        onClick={item.onClick}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {item.action}
                        <ChevronRight className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onNavigate('directory')}
          className="group rounded-2xl border border-neutral-border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-on-surface-variant">Active employees</span>
            <span className="rounded-xl bg-primary/10 p-2 text-primary"><Users className="h-4 w-4" aria-hidden="true" /></span>
          </div>
          <div className="mt-4 text-3xl font-bold text-on-background">{activeEmployees}</div>
          <div className="mt-1 text-xs text-on-surface-variant">{onLeaveEmployees > 0 ? `${onLeaveEmployees} currently on leave` : 'No one currently on leave'}</div>
          <div className="mt-4 flex items-center text-xs font-bold text-primary">Open directory <ChevronRight className="ml-1 h-3 w-3" aria-hidden="true" /></div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('leave-management')}
          className="group rounded-2xl border border-neutral-border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-on-surface-variant">Leave activity</span>
            <span className="rounded-xl bg-amber-100 p-2 text-amber-700"><Calendar className="h-4 w-4" aria-hidden="true" /></span>
          </div>
          <div className="mt-4 text-3xl font-bold text-on-background">{onLeaveEmployees}</div>
          <div className="mt-1 text-xs text-on-surface-variant">{onLeaveEmployees === 0 ? 'No active leave today' : 'Currently on leave'}</div>
          <div className="mt-4 flex items-center text-xs font-bold text-primary">Review leave <ChevronRight className="ml-1 h-3 w-3" aria-hidden="true" /></div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('performance')}
          className="group rounded-2xl border border-neutral-border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-on-surface-variant">Performance progress</span>
            <span className="rounded-xl bg-green-100 p-2 text-green-700"><CheckCircle className="h-4 w-4" aria-hidden="true" /></span>
          </div>
          <div className="mt-4 text-3xl font-bold text-on-background">
            {currentCycle ? <>{reviewsCompletedCount}<span className="text-lg text-on-surface-variant">/{activeEmployees}</span></> : '—'}
          </div>
          <div className="mt-1 text-xs text-on-surface-variant">
            {currentCycle ? (reviewsPendingCount === 0 ? 'Current cycle complete' : `${reviewsPendingCount} still pending`) : 'No cycle configured'}
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-primary">Open appraisals <ChevronRight className="ml-1 h-3 w-3" aria-hidden="true" /></div>
        </button>
      </section>

      <section className="grid grid-cols-1 gap-5 text-left lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <article className="rounded-2xl border border-neutral-border bg-white p-5 shadow-sm md:p-6" aria-labelledby="payroll-trend-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                Payroll trend
              </div>
              <h2 id="payroll-trend-title" className="mt-1 text-xl font-bold text-on-background">Processed payroll, year to date</h2>
              <p className="mt-1 text-xs text-on-surface-variant">Only months with an available payroll record are plotted.</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{selectedYear} YTD</span>
          </div>

          {!chartHasData ? (
            <div className="mt-6 flex min-h-56 items-center justify-center rounded-xl border border-dashed border-neutral-border bg-neutral-50 px-6 text-center">
              <div>
                <TrendingUp className="mx-auto h-6 w-6 text-on-surface-variant/60" aria-hidden="true" />
                <p className="mt-2 text-sm font-bold text-on-surface">No payroll history for {selectedYear}</p>
                <p className="mt-1 text-xs text-on-surface-variant">Generate or import a payroll record to start the trend.</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 h-64 w-full">
              <svg viewBox="0 0 700 250" className="h-full w-full" role="img" aria-label={`Processed payroll trend for ${selectedYear}`}>
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = chartBottom - ratio * (chartBottom - chartTop);
                  return (
                    <g key={ratio}>
                      <line x1={chartLeft} y1={y} x2="680" y2={y} stroke="#e4e4e7" strokeDasharray="4 4" />
                      <text x="46" y={y + 3} fontSize="9" textAnchor="end" fill="#71717a" className="font-mono">
                        {formatMoney(Math.round((chartMaxValue * ratio) / 1000))}k
                      </text>
                    </g>
                  );
                })}
                {chartSegments.map((segment, index) => (
                  <path
                    key={index}
                    d={`M ${segment.map((point) => `${point.x} ${point.y}`).join(' L ')}`}
                    fill="none"
                    stroke="#b3261e"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {chartPoints.map((point) => (
                  <g key={point.label}>
                    {point.value !== null && point.y !== null ? (
                      <>
                        <circle cx={point.x} cy={point.y} r="4" fill="#ffffff" stroke="#b3261e" strokeWidth="2.5" />
                        <title>{`${point.label}: ${formatMoney(point.value)}`}</title>
                      </>
                    ) : (
                      <line x1={point.x} y1={chartBottom - 4} x2={point.x} y2={chartBottom + 4} stroke="#a1a1aa" strokeDasharray="2 2" />
                    )}
                    <text x={point.x} y="242" fontSize="10" textAnchor="middle" fill="#71717a" className="font-medium">{point.label}</text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-neutral-border bg-white p-5 shadow-sm" aria-labelledby="quick-workflows-title">
          <div className="flex items-center justify-between border-b border-neutral-border/70 pb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Shortcuts</div>
              <h2 id="quick-workflows-title" className="mt-1 text-xl font-bold text-on-background">Quick workflows</h2>
            </div>
            <ArrowRight className="h-5 w-5 text-primary/50" aria-hidden="true" />
          </div>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => onNavigate('payroll')}
              className="flex w-full items-center justify-between rounded-xl bg-primary px-3.5 py-3 text-left text-sm font-bold text-white transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30 active:translate-y-px"
            >
              <span className="flex items-center gap-2.5"><CreditCard className="h-4 w-4" aria-hidden="true" />Generate payroll</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenNewEmployeeModal}
              className="flex w-full items-center justify-between rounded-xl border border-neutral-border bg-neutral-50 px-3.5 py-3 text-left text-sm font-bold text-primary transition-colors hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <span className="flex items-center gap-2.5"><UserPlus className="h-4 w-4" aria-hidden="true" />Add employee</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="flex w-full items-center justify-between rounded-xl border border-neutral-border bg-neutral-50 px-3.5 py-3 text-left text-sm font-bold text-primary transition-colors hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <span className="flex items-center gap-2.5"><FileText className="h-4 w-4" aria-hidden="true" />Open reports</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-5 text-left lg:grid-cols-2">
        <article className="rounded-2xl border border-neutral-border bg-white p-5 shadow-sm" aria-labelledby="review-cycles-title">
          <div className="flex items-center justify-between border-b border-neutral-border/70 pb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Performance</div>
              <h2 id="review-cycles-title" className="mt-1 text-xl font-bold text-on-background">Review cycles</h2>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary/50" aria-hidden="true" />
          </div>
          {reviewCycles.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-neutral-border bg-neutral-50 p-4">
              <p className="text-sm font-bold text-on-surface">No review cycles set up</p>
              <p className="mt-1 text-xs text-on-surface-variant">Create a cycle in Performance Appraisal before assigning reviews.</p>
              <button type="button" onClick={() => onNavigate('performance')} className="mt-3 text-xs font-bold text-primary hover:underline">Open performance setup</button>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-neutral-border/60">
              {reviewCycles.slice(0, 4).map((cycle) => (
                <div key={cycle.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-on-surface">{cycle.name}</div>
                    <div className="mt-0.5 text-xs text-on-surface-variant">{cycle.period}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${cycle.status === 'In Progress' ? 'bg-primary/10 text-primary' : cycle.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {cycle.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-neutral-border bg-white p-5 shadow-sm" aria-labelledby="quick-payslip-title">
          <div className="flex items-center justify-between border-b border-neutral-border/70 pb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Payroll documents</div>
              <h2 id="quick-payslip-title" className="mt-1 text-xl font-bold text-on-background">Quick payslips</h2>
            </div>
            <CreditCard className="h-5 w-5 text-primary/50" aria-hidden="true" />
          </div>
          <p className="mt-3 text-xs text-on-surface-variant">Open an employee document without leaving the dashboard.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {filteredEmployees.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-border bg-neutral-50 p-4 text-xs text-on-surface-variant sm:col-span-2">No employees in this workspace.</div>
            ) : (
              filteredEmployees.slice(0, 4).map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => onOpenPayslip ? onOpenPayslip(employee.id) : onNavigate('payroll')}
                  className="group flex min-w-0 items-center justify-between gap-2 rounded-xl border border-neutral-border/80 bg-neutral-50 p-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <EmployeeAvatar employee={employee} className="h-8 w-8 shrink-0 rounded-full" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-on-surface group-hover:text-primary">{employee.name}</span>
                      <span className="block truncate text-[10px] text-on-surface-variant">{employee.designation}</span>
                    </span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-on-surface-variant group-hover:text-primary" aria-hidden="true" />
                </button>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
