/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle,
  ChevronRight,
  Clock,
  FileCheck2,
  Lock,
  RefreshCw,
  Search,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppraisalAccessGrant, AppraisalAccessStatus, Employee, EmployeePerformance, ReviewCycle } from '../types';
import EmployeeAvatar from './EmployeeAvatar';
import PerformanceAnalytics from './PerformanceAnalytics';
import PerformanceAppraisalForm from './PerformanceAppraisalForm';
import {
  createAppraisalAccessGrant,
  getAppraisalAccessGrant,
  getAppraisalAccessStatus,
  ResolvedAppraisalAccessStatus,
  upsertAppraisalAccessGrant,
} from '../lib/appraisalAccess';
import { createUndoableAction } from '../lib/undoableAction';
import { useFeedback } from './GlobalFeedbackSystem';
import {
  calculateAppraisalScores,
  loadAppraisalDraft,
  PerformanceAppraisalDraft,
} from '../lib/performanceAppraisalDraft';

interface PerformanceViewProps {
  employees: Employee[];
  performances: EmployeePerformance[];
  reviewCycles: ReviewCycle[];
  appraisalAccessGrants: AppraisalAccessGrant[];
  onUpdateAppraisalAccess: (grants: AppraisalAccessGrant[]) => Promise<void>;
  onSavePerformance: (perf: EmployeePerformance) => void;
  onShowNotification: (title: string, message: string) => void;
}

const FALLBACK_REVIEW_CYCLE: ReviewCycle = {
  id: 'cycle-2026-annual',
  name: 'Annual Review 2026',
  period: 'Jan 1 - Feb 28, 2026',
  status: 'In Progress',
};

const statusTone = (status: PerformanceAppraisalDraft['status']) => {
  if (status === 'Finalised') return 'bg-green-100 text-green-700';
  if (status === 'Agreed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Employee Submitted' || status === 'Pending Manager Review') return 'bg-blue-100 text-blue-700';
  if (status === 'Pending Employee Input') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
};

const matchesPerformanceEmployee = (performance: EmployeePerformance, employee: Employee) => {
  const perfEmployeeId = String(performance.employeeId || '').toLowerCase();
  return perfEmployeeId === String(employee.id || '').toLowerCase() ||
    perfEmployeeId === String(employee.email || '').toLowerCase();
};

const createEmptyPerformance = (employee: Employee, reviewCycleId: string): EmployeePerformance => ({
  employeeId: employee.id,
  reviewCycleId,
  managerName: 'Manager',
  reviewStatus: 'Not Started',
  rating: 0,
  teamworkScore: 1,
  communicationScore: 1,
  problemSolvingScore: 1,
  selfEvaluation: '',
  managerComments: '',
  goals: [],
});

export default function PerformanceView({
  employees,
  performances,
  reviewCycles,
  appraisalAccessGrants,
  onUpdateAppraisalAccess,
  onSavePerformance,
  onShowNotification,
}: PerformanceViewProps) {
  const { confirmAction, showUndoToast } = useFeedback();
  const availableReviewCycles = reviewCycles.length > 0 ? reviewCycles : [FALLBACK_REVIEW_CYCLE];
  const [activeSubTab, setActiveSubTab] = useState<'appraisals' | 'cycles' | 'analytics'>('appraisals');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [selectedCycleId, setSelectedCycleId] = useState(availableReviewCycles[0]?.id || FALLBACK_REVIEW_CYCLE.id);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [draftRefreshKey, setDraftRefreshKey] = useState(0);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isAccessUpdating, setIsAccessUpdating] = useState(false);

  const selectedCycle = availableReviewCycles.find((cycle) => cycle.id === selectedCycleId) || availableReviewCycles[0] || FALLBACK_REVIEW_CYCLE;
  const departments = useMemo(() => (
    ['All Departments', ...Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean))).sort()]
  ), [employees]);

  const evaluationList = useMemo(() => employees.map((employee) => {
    const performance = performances.find((item) =>
      item.reviewCycleId === selectedCycle.id && matchesPerformanceEmployee(item, employee)
    ) || createEmptyPerformance(employee, selectedCycle.id);
    const draft = loadAppraisalDraft(employee, selectedCycle, performance);
    const scores = calculateAppraisalScores(draft);
    const accessStatus = getAppraisalAccessStatus(
      appraisalAccessGrants,
      employee,
      selectedCycle,
      performance,
      draft.status,
    );
    return { employee, performance, draft, scores, accessStatus };
  }), [employees, performances, appraisalAccessGrants, selectedCycle, draftRefreshKey]);

  const filteredList = evaluationList.filter(({ employee }) => {
    const normalizedSearch = searchQuery.toLowerCase();
    const matchesDept = deptFilter === 'All Departments' || employee.department === deptFilter;
    const matchesSearch =
      employee.name.toLowerCase().includes(normalizedSearch) ||
      employee.id.toLowerCase().includes(normalizedSearch) ||
      employee.email.toLowerCase().includes(normalizedSearch);
    return matchesDept && matchesSearch;
  });

  const filteredEmployeeIds = filteredList.map(({ employee }) => employee.id);
  const allVisibleSelected = filteredEmployeeIds.length > 0
    && filteredEmployeeIds.every((employeeId) => selectedEmployeeIds.includes(employeeId));
  const selectedVisibleRecords = filteredList.filter(({ employee }) => selectedEmployeeIds.includes(employee.id));

  const accessLabel = (status: ResolvedAppraisalAccessStatus, draftStatus: PerformanceAppraisalDraft['status']) => {
    if (status === 'historical' || draftStatus === 'Finalised') return 'Finalised';
    if (draftStatus === 'Employee Submitted' || draftStatus === 'Pending Manager Review' || draftStatus === 'Agreed') return 'Submitted';
    if (status === 'sent') return 'Sent';
    if (status === 'open') return 'Open';
    return 'Closed';
  };

  const accessTone = (status: string) => {
    if (status === 'Sent') return 'bg-blue-100 text-blue-700';
    if (status === 'Open') return 'bg-amber-100 text-amber-700';
    if (status === 'Submitted') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Finalised') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  const updateAccess = async (
    records: typeof evaluationList,
    nextStatus: AppraisalAccessStatus,
    bulk: boolean,
  ) => {
    const actionableRecords = records.filter(({ accessStatus }) => (
      accessStatus !== 'historical'
      && (nextStatus === 'open' ? accessStatus === 'closed' : accessStatus !== 'closed')
    ));
    if (actionableRecords.length === 0) {
      onShowNotification('No Access Change', 'Completed appraisals remain available as historical read-only records.');
      return;
    }
    const actionName = nextStatus === 'open' ? 'Open Appraisal' : 'Close Access';
    const confirmed = await confirmAction({
      title: `${actionName}${bulk ? ' for Selected Employees' : ''}`,
      message: `${actionName} for ${selectedCycle.name} and ${actionableRecords.length} employee${actionableRecords.length === 1 ? '' : 's'}? ${
        nextStatus === 'open'
          ? 'Employees can view the prepared appraisal. They cannot edit or submit until you choose Send to Employee.'
          : 'Employees will immediately lose access to the current appraisal form. Drafts and historical records will not be deleted.'
      }`,
      type: nextStatus === 'open' ? 'warning' : 'danger',
      confirmLabel: actionName,
    });
    if (!confirmed || isAccessUpdating) return;

    const previousGrants = appraisalAccessGrants.map((grant) => ({ ...grant }));
    const now = new Date().toISOString();
    const actor = 'Admin Console';
    let nextGrants = [...appraisalAccessGrants];
    actionableRecords.forEach(({ employee }) => {
      const existing = getAppraisalAccessGrant(nextGrants, employee, selectedCycle.id);
      const nextGrant: AppraisalAccessGrant = {
        ...(existing || createAppraisalAccessGrant({
          entityId: employee.entityId,
          employeeId: employee.id,
          reviewCycleId: selectedCycle.id,
          actor,
          now,
        })),
        status: nextStatus,
        ...(nextStatus === 'open' && !existing?.openedAt
          ? { openedAt: now, openedBy: actor }
          : {}),
        updatedAt: now,
      };
      nextGrants = upsertAppraisalAccessGrant(nextGrants, nextGrant);
    });

    setIsAccessUpdating(true);
    try {
      await onUpdateAppraisalAccess(nextGrants);
      showUndoToast({
        title: `${actionName} Complete`,
        message: `${actionableRecords.length} access record${actionableRecords.length === 1 ? '' : 's'} updated. Undo is available for 8 seconds.`,
        type: 'success',
        action: createUndoableAction('Undo', async () => {
          await onUpdateAppraisalAccess(previousGrants);
        }),
      });
      setSelectedEmployeeIds([]);
    } catch (error: any) {
      onShowNotification('Remote Sync Failed', error?.message || 'The access change was kept locally but could not be synchronized remotely.');
    } finally {
      setIsAccessUpdating(false);
    }
  };

  const selectedRecord = selectedEmployeeId
    ? evaluationList.find(({ employee }) => employee.id === selectedEmployeeId || employee.email === selectedEmployeeId) || null
    : null;

  const totalReviews = evaluationList.length;
  const finalisedReviews = evaluationList.filter(({ draft }) => draft.status === 'Finalised').length;
  const pendingEmployeeInput = evaluationList.filter(({ draft }) => draft.status === 'Pending Employee Input').length;
  const managerReviewQueue = evaluationList.filter(({ draft }) => draft.status === 'Employee Submitted' || draft.status === 'Pending Manager Review').length;
  const completionRate = totalReviews > 0 ? Math.round((finalisedReviews / totalReviews) * 100) : 0;
  const finalisedScores = evaluationList
    .filter(({ draft, scores }) => draft.status === 'Finalised' && scores.finalRating > 0)
    .map(({ scores }) => scores.finalRating);
  const averageRating = finalisedScores.length > 0
    ? finalisedScores.reduce((sum, rating) => sum + rating, 0) / finalisedScores.length
    : 0;

  if (selectedRecord) {
    return (
      <div className="mx-auto w-full max-w-[1440px] animate-in fade-in duration-200">
        <PerformanceAppraisalForm
          employee={selectedRecord.employee}
          reviewCycle={selectedCycle}
          performance={selectedRecord.performance}
          mode="manager"
          employeeAccessStatus={selectedRecord.accessStatus === 'historical' ? 'historical' : selectedRecord.accessStatus}
          onAppraisalAccessChange={async (status) => {
            const existing = getAppraisalAccessGrant(appraisalAccessGrants, selectedRecord.employee, selectedCycle.id);
            const now = new Date().toISOString();
            const nextGrant: AppraisalAccessGrant = {
              ...(existing || createAppraisalAccessGrant({
                entityId: selectedRecord.employee.entityId,
                employeeId: selectedRecord.employee.id,
                reviewCycleId: selectedCycle.id,
                actor: 'Admin Console',
                now,
              })),
              status,
              ...(status === 'sent' ? { sentAt: now, sentBy: 'Admin Console' } : {}),
              updatedAt: now,
            };
            await onUpdateAppraisalAccess(upsertAppraisalAccessGrant(appraisalAccessGrants, nextGrant));
          }}
          onBack={() => setSelectedEmployeeId(null)}
          onDraftSaved={() => setDraftRefreshKey((key) => key + 1)}
          onSavePerformance={onSavePerformance}
          onShowNotification={onShowNotification}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8 animate-in fade-in duration-200">
      <header className="overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-sm">
        <div className="border-b border-neutral-border/70 bg-surface-container-low/55 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Performance operations</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-on-background sm:text-4xl">Performance Appraisal</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                Run review cycles, route self-appraisals, and close the loop with evidence-backed ratings.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
              <label className="min-w-0 sm:min-w-64">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Review cycle</span>
                <select
                  value={selectedCycleId}
                  onChange={(event) => setSelectedCycleId(event.target.value)}
                  className="w-full rounded-xl border border-neutral-border bg-white px-3 py-2.5 text-sm font-bold text-on-background outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {availableReviewCycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setDraftRefreshKey((key) => key + 1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-border bg-white px-3 py-2.5 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <RefreshCw className="h-4 w-4 text-primary" aria-hidden="true" />
                Refresh view
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-neutral-border bg-neutral-border sm:grid-cols-4">
            {[
              { label: 'Total appraisals', value: totalReviews, detail: 'Active employees', icon: Users, tone: 'text-primary' },
              { label: 'Finalised', value: finalisedReviews, detail: `${completionRate}% complete`, icon: CheckCircle, tone: 'text-green-700' },
              { label: 'Employee input', value: pendingEmployeeInput, detail: 'Awaiting self-appraisal', icon: Clock, tone: 'text-amber-700' },
              { label: 'Manager queue', value: managerReviewQueue, detail: averageRating > 0 ? `${averageRating.toFixed(1)} average rating` : 'Ready for review', icon: Target, tone: 'text-blue-700' },
            ].map(({ label, value, detail, icon: Icon, tone }) => (
              <div key={label} className="bg-white px-3 py-3 sm:px-4">
                <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                  <Icon className={`h-3.5 w-3.5 ${tone}`} aria-hidden="true" /> {label}
                </span>
                <span className="mt-1 block font-mono text-xl font-bold text-on-surface">{value}</span>
                <span className="mt-0.5 block text-[10px] text-on-surface-variant">{detail}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 text-xs sm:px-6">
          <span className="font-bold text-on-background">{selectedCycle.name}</span>
          <span className="text-on-surface-variant">{selectedCycle.period}</span>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">{selectedCycle.status}</span>
          <span className="ml-auto text-on-surface-variant">{totalReviews} employee records in this cycle</span>
        </div>
      </header>

      <nav aria-label="Performance workspace navigation" className="rounded-2xl border border-neutral-border bg-white p-1.5 shadow-sm">
        <div className="flex gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('appraisals')}
          className={`flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 ${activeSubTab === 'appraisals' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <FileCheck2 className="h-4 w-4" aria-hidden="true" /> Appraisal queue
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('cycles')}
          className={`flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 ${activeSubTab === 'cycles' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <Award className="h-4 w-4" aria-hidden="true" /> Review cycles ({availableReviewCycles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('analytics')}
          className={`flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 ${activeSubTab === 'analytics' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <TrendingUp className="h-4 w-4" aria-hidden="true" /> Performance analytics
        </button>
        </div>
      </nav>

      {activeSubTab === 'appraisals' && (
        <div className="overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-sm">
          <div className="border-b border-neutral-border bg-surface-container-low/70 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-on-background">Appraisal queue</h2>
                <p className="mt-1 text-xs text-on-surface-variant">Open a record to update goals, evidence, scores, and finalisation.</p>
              </div>
              <span className="text-xs font-semibold text-on-surface-variant">{filteredList.length} of {employees.length} records shown</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative block">
                <span className="sr-only">Search employee by name, ID, or email</span>
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-outline" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search employee by name, ID, or email"
                  className="w-full rounded-xl border border-neutral-border bg-white py-2.5 pl-10 pr-4 text-xs outline-none transition-colors placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
              <label>
                <span className="sr-only">Filter by department</span>
                <select
                  value={deptFilter}
                  onChange={(event) => setDeptFilter(event.target.value)}
                  className="w-full rounded-xl border border-neutral-border bg-white px-3 py-2.5 text-xs font-semibold outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {departments.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-neutral-border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 font-semibold text-on-surface">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => setSelectedEmployeeIds(event.target.checked ? filteredEmployeeIds : [])}
                  aria-label="Select all visible employees"
                  className="h-4 w-4 accent-primary"
                />
                Select visible
              </label>
              <span className="text-on-surface-variant">{selectedVisibleRecords.length} selected</span>
            </div>
            {selectedVisibleRecords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isAccessUpdating}
                  onClick={() => void updateAccess(selectedVisibleRecords, 'open', true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-wait disabled:opacity-50"
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Open selected
                </button>
                <button
                  type="button"
                  disabled={isAccessUpdating}
                  onClick={() => void updateAccess(selectedVisibleRecords, 'closed', true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
                >
                  Close selected
                </button>
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-border bg-surface-container-low/45 text-on-surface-variant">
                  <th className="w-10 p-4">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="p-4 font-bold uppercase tracking-wider">Employee</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Department</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Access</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Draft</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Score</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Rating</th>
                  <th className="p-4 text-right font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border/50">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <Search className="mx-auto h-7 w-7 text-outline" aria-hidden="true" />
                      <h3 className="mt-3 text-sm font-bold text-on-background">No appraisals match these filters</h3>
                      <p className="mt-1 text-xs text-on-surface-variant">Try a different name, employee ID, email, or department.</p>
                    </td>
                  </tr>
                ) : filteredList.map(({ employee, draft, scores, accessStatus }) => {
                  const resolvedAccessLabel = accessLabel(accessStatus, draft.status);
                  const isHistorical = resolvedAccessLabel === 'Finalised';
                  const hasRecordedScore = draft.status !== 'Draft' && scores.finalRating > 0;
                  return (
                    <tr key={employee.id} className="transition-colors hover:bg-surface-container-low/45">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(employee.id)}
                          onChange={(event) => setSelectedEmployeeIds((current) => (
                            event.target.checked
                              ? Array.from(new Set([...current, employee.id]))
                              : current.filter((id) => id !== employee.id)
                          ))}
                          aria-label={`Select ${employee.name}`}
                          className="h-4 w-4 accent-primary"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar employee={employee} className="h-9 w-9 rounded-xl" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-on-surface">{employee.name}</div>
                            <div className="mt-0.5 truncate text-xs text-on-surface-variant">
                              {employee.designation} <span className="font-mono text-[10px] font-medium">({employee.id})</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-on-surface">{employee.department}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${accessTone(resolvedAccessLabel)}`}>
                          {resolvedAccessLabel}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(draft.status)}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {draft.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-on-surface">
                        {draft.status === 'Draft' ? <span className="font-sans text-[11px] font-medium text-on-surface-variant">Not scored</span> : scores.totalPoints.toFixed(2)}
                      </td>
                      <td className="p-4">
                        {hasRecordedScore ? (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                className={`h-3.5 w-3.5 ${
                                  index < scores.finalRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                                }`}
                                aria-hidden="true"
                              />
                            ))}
                            <span className="ml-1 font-mono font-semibold text-on-surface">{scores.finalRating}.0</span>
                          </div>
                        ) : (
                          <span className="text-[11px] italic text-on-surface-variant">Unrated</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {!isHistorical && (
                            <button
                              type="button"
                              disabled={isAccessUpdating || accessStatus === 'open' || accessStatus === 'sent'}
                              onClick={() => void updateAccess([{ employee, performance: {} as EmployeePerformance, draft, scores, accessStatus }], 'open', false)}
                              className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              Open
                            </button>
                          )}
                          {!isHistorical && accessStatus !== 'closed' && (
                            <button
                              type="button"
                              disabled={isAccessUpdating}
                              onClick={() => void updateAccess([{ employee, performance: {} as EmployeePerformance, draft, scores, accessStatus }], 'closed', false)}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
                            >
                              Close
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedEmployeeId(employee.id)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <FileCheck2 className="h-3 w-3" aria-hidden="true" />
                            Open appraisal
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 lg:hidden">
            {filteredList.map(({ employee, draft, scores, accessStatus }) => {
              const resolvedAccessLabel = accessLabel(accessStatus, draft.status);
              const isHistorical = resolvedAccessLabel === 'Finalised';
              return (
                <article key={employee.id} className="rounded-2xl border border-neutral-border bg-surface-container-low/35 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(employee.id)}
                      onChange={(event) => setSelectedEmployeeIds((current) => (
                        event.target.checked
                          ? Array.from(new Set([...current, employee.id]))
                          : current.filter((id) => id !== employee.id)
                      ))}
                      aria-label={`Select ${employee.name}`}
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <EmployeeAvatar employee={employee} className="h-10 w-10 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-on-surface">{employee.name}</div>
                      <div className="mt-0.5 truncate text-xs text-on-surface-variant">{employee.designation}</div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${accessTone(resolvedAccessLabel)}`}>
                      {resolvedAccessLabel}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-neutral-border/70 py-3 text-xs">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant">Department</span>
                      <span className="mt-1 block truncate font-semibold text-on-surface">{employee.department}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant">Draft</span>
                      <span className="mt-1 block truncate font-semibold text-on-surface">{draft.status}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant">Score</span>
                      <span className="mt-1 block font-semibold text-on-surface">{draft.status === 'Draft' ? 'Not scored' : scores.totalPoints.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {!isHistorical && accessStatus !== 'open' && accessStatus !== 'sent' && (
                      <button
                        type="button"
                        disabled={isAccessUpdating}
                        onClick={() => void updateAccess([{ employee, performance: {} as EmployeePerformance, draft, scores, accessStatus }], 'open', false)}
                        className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                      >
                        <Lock className="h-3 w-3" aria-hidden="true" /> Open
                      </button>
                    )}
                    {!isHistorical && accessStatus !== 'closed' && (
                      <button
                        type="button"
                        disabled={isAccessUpdating}
                        onClick={() => void updateAccess([{ employee, performance: {} as EmployeePerformance, draft, scores, accessStatus }], 'closed', false)}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                      >
                        Close
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedEmployeeId(employee.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <FileCheck2 className="h-3 w-3" aria-hidden="true" /> Open appraisal
                    </button>
                  </div>
                </article>
              );
            })}
            {filteredList.length === 0 && (
              <div className="rounded-2xl border border-dashed border-neutral-border bg-surface-container-low/30 px-5 py-12 text-center">
                <Search className="mx-auto h-7 w-7 text-outline" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-bold text-on-background">No appraisals match these filters</h3>
                <p className="mt-1 text-xs text-on-surface-variant">Try a different name, employee ID, email, or department.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'cycles' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {availableReviewCycles.map((cycle) => (
            <div key={cycle.id} className="flex flex-col justify-between rounded-2xl border border-neutral-border bg-white p-5 shadow-sm transition-colors hover:border-primary/40">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    cycle.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-primary'
                  }`}>
                    {cycle.status}
                  </span>
                  <Award className="h-5 w-5 text-primary-container" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-on-surface">{cycle.name}</h3>
                <p className="text-xs leading-relaxed text-on-surface-variant">
                  Review period: <span className="font-semibold">{cycle.period}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCycleId(cycle.id);
                  setActiveSubTab('appraisals');
                }}
                className="mt-6 flex items-center justify-between rounded-xl border border-neutral-border px-3 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
              >
                Open queue <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'analytics' && (
        <PerformanceAnalytics
          employees={employees}
          performances={performances}
          reviewCycles={availableReviewCycles}
          selectedCycleId={selectedCycleId}
        />
      )}
    </div>
  );
}
