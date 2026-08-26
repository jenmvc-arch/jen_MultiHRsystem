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
  Search,
  Star,
  TrendingUp,
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
      <div className="mx-auto max-w-7xl animate-in fade-in duration-200">
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
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-background">Performance & Appraisal</h1>
          <p className="mt-1 text-on-surface-variant">
            Admin/manager view for active entity employees, self-appraisal routing, scoring, and finalisation.
          </p>
        </div>
        <label className="min-w-64">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant">Review Cycle</span>
          <select
            value={selectedCycleId}
            onChange={(event) => setSelectedCycleId(event.target.value)}
            className="w-full rounded border border-neutral-border bg-white px-3 py-2 text-sm font-semibold text-on-background outline-none focus:border-primary"
          >
            {availableReviewCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg border border-neutral-border bg-surface-container-lowest p-5 shadow-sm">
          <span className="text-sm font-medium text-on-surface-variant">Total Appraisals</span>
          <div className="mt-2 text-3xl font-bold text-on-background">{totalReviews}</div>
          <div className="mt-1.5 text-xs font-semibold text-on-surface-variant">Active entity employees</div>
        </div>

        <div className="rounded-lg border border-neutral-border bg-surface-container-lowest p-5 shadow-sm">
          <span className="text-sm font-medium text-on-surface-variant">Finalised</span>
          <div className="mt-2 text-3xl font-bold text-green-600">{finalisedReviews}</div>
          <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-green-600">
            <CheckCircle className="h-3 w-3" /> {completionRate}% completed
          </div>
        </div>

        <div className="rounded-lg border border-neutral-border bg-surface-container-lowest p-5 shadow-sm">
          <span className="text-sm font-medium text-on-surface-variant">Employee Input</span>
          <div className="mt-2 text-3xl font-bold text-amber-600">{pendingEmployeeInput}</div>
          <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-amber-700">
            <Clock className="h-3.5 w-3.5" /> Awaiting self appraisal
          </div>
        </div>

        <div className="rounded-lg border border-neutral-border bg-surface-container-lowest p-5 shadow-sm">
          <span className="text-sm font-medium text-on-surface-variant">Avg Final Rating</span>
          <div className="mt-2 text-3xl font-bold text-primary">{averageRating.toFixed(1)} / 5.0</div>
          <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> {managerReviewQueue} in manager queue
          </div>
        </div>
      </div>

      <div className="flex gap-6 border-b border-neutral-border">
        <button
          onClick={() => setActiveSubTab('appraisals')}
          className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
            activeSubTab === 'appraisals' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Appraisal Queue
        </button>
        <button
          onClick={() => setActiveSubTab('cycles')}
          className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
            activeSubTab === 'cycles' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Review Cycles ({availableReviewCycles.length})
        </button>
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
            activeSubTab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Performance Analytics
        </button>
      </div>

      {activeSubTab === 'appraisals' && (
        <div className="overflow-hidden rounded-lg border border-neutral-border bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-neutral-border bg-surface-container-low p-4 text-sm md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-1 gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-outline" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search employee by name, ID, or email..."
                  className="w-full rounded border border-neutral-border bg-white py-1.5 pl-9 pr-4 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <select
                value={deptFilter}
                onChange={(event) => setDeptFilter(event.target.value)}
                className="rounded border border-neutral-border bg-white p-1.5 text-xs outline-none"
              >
                {departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>

            <div className="text-xs font-semibold text-on-surface-variant">
              Showing {filteredList.length} of {employees.length} employee records
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-neutral-border bg-white px-4 py-3 text-xs md:flex-row md:items-center md:justify-between">
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
                  className="inline-flex items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-3 py-1.5 font-bold text-amber-700 disabled:cursor-wait disabled:opacity-50"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Open Selected
                </button>
                <button
                  type="button"
                  disabled={isAccessUpdating}
                  onClick={() => void updateAccess(selectedVisibleRecords, 'closed', true)}
                  className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-1.5 font-bold text-red-700 disabled:cursor-wait disabled:opacity-50"
                >
                  Close Selected
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-border bg-surface text-on-surface-variant">
                  <th className="w-10 p-4">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="p-4 font-bold uppercase tracking-wider">Employee Details</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Department</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Employee Access</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Draft Status</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Total Score</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Final Rating</th>
                  <th className="p-4 text-right font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border/50">
                {filteredList.map(({ employee, draft, scores, accessStatus }) => {
                  const resolvedAccessLabel = accessLabel(accessStatus, draft.status);
                  const isHistorical = resolvedAccessLabel === 'Finalised';
                  return (
                  <tr key={employee.id} className="transition-colors hover:bg-surface-container-low/50">
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
                    <td className="flex items-center gap-3 p-4">
                      <EmployeeAvatar employee={employee} className="h-8 w-8 rounded-full" />
                      <div>
                        <div className="text-sm font-bold text-on-surface">{employee.name}</div>
                        <div className="mt-0.5 text-xs text-on-surface-variant">
                          {employee.designation} - <span className="font-mono text-[10px] font-medium">{employee.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-on-surface">{employee.department}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${accessTone(resolvedAccessLabel)}`}>
                        {resolvedAccessLabel}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusTone(draft.status)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {draft.status}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-on-surface">{scores.totalPoints.toFixed(2)}</td>
                    <td className="p-4">
                      {scores.finalRating > 0 ? (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              className={`h-3.5 w-3.5 ${
                                index < scores.finalRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="ml-1 font-semibold text-on-surface">{scores.finalRating}.0</span>
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
                            className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Lock className="h-3 w-3" />
                            Open Appraisal
                          </button>
                        )}
                        {!isHistorical && accessStatus !== 'closed' && (
                          <button
                            type="button"
                            disabled={isAccessUpdating}
                            onClick={() => void updateAccess([{ employee, performance: {} as EmployeePerformance, draft, scores, accessStatus }], 'closed', false)}
                            className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 disabled:cursor-wait disabled:opacity-50"
                          >
                            Close
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeId(employee.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-container"
                        >
                          <FileCheck2 className="h-3 w-3" />
                          Edit Appraisal
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'cycles' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {availableReviewCycles.map((cycle) => (
            <div key={cycle.id} className="flex flex-col justify-between rounded-lg border border-neutral-border bg-white p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    cycle.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-primary'
                  }`}>
                    {cycle.status}
                  </span>
                  <Award className="h-5 w-5 text-primary-container" />
                </div>
                <h3 className="text-lg font-bold text-on-surface">{cycle.name}</h3>
                <p className="text-xs leading-relaxed text-on-surface-variant">
                  Evaluation active period: <span className="font-semibold">{cycle.period}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCycleId(cycle.id);
                  setActiveSubTab('appraisals');
                }}
                className="mt-6 flex items-center justify-between border-t border-neutral-border/50 pt-4 text-xs font-bold text-primary hover:underline"
              >
                Open queue for this cycle <ChevronRight className="h-3.5 w-3.5" />
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
