/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Clock3,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserCog,
} from 'lucide-react';
import { Employee } from '../types';
import { isCurrentActiveEmployee } from '../data';
import { formatToDDMMMYYYY, getGmt8DateString } from '../lib/dateUtils';
import {
  addHoursToTime,
  calculateShiftHours,
  calculateWorkShiftWeeklyHours,
  DEFAULT_WORK_SHIFT_GROUP_DAYS,
  DEFAULT_WORK_SHIFT_GROUPS,
  EmployeeWorkShiftAssignment,
  normalizeWorkShiftGroupDays,
  WorkShiftDayType,
  WorkShiftGroup,
  WorkShiftGroupDay,
} from '../lib/leaveDomain';
import { loadLeaveWorkspace, persistLeaveWorkspace } from '../lib/leaveService';
import { useFeedback } from './GlobalFeedbackSystem';

interface WorkShiftGroupsViewProps {
  employees: Employee[];
  activeEntityId: string;
  onShowNotification: (title: string, message: string) => void;
}

const inputClass = 'w-full rounded-md border border-neutral-border bg-white px-3 py-2 text-xs text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-neutral-100';
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant';
const cardClass = 'rounded-xl border border-neutral-border bg-white shadow-sm';
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];

export default function WorkShiftGroupsView({
  employees,
  activeEntityId,
  onShowNotification,
}: WorkShiftGroupsViewProps) {
  const { confirmAction } = useFeedback();
  const activeEmployees = useMemo(
    () => employees.filter((employee) => isCurrentActiveEmployee(employee)),
    [employees],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(DEFAULT_WORK_SHIFT_GROUPS[0].id);
  const [workShiftGroups, setWorkShiftGroups] = useState<WorkShiftGroup[]>(DEFAULT_WORK_SHIFT_GROUPS);
  const [workShiftGroupDays, setWorkShiftGroupDays] = useState<WorkShiftGroupDay[]>(DEFAULT_WORK_SHIFT_GROUP_DAYS);
  const [assignments, setAssignments] = useState<EmployeeWorkShiftAssignment[]>([]);
  const [workspace, setWorkspace] = useState<Awaited<ReturnType<typeof loadLeaveWorkspace>> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'bulk'>('single');
  const [assignmentEmployeeIds, setAssignmentEmployeeIds] = useState<string[]>([]);
  const [assignmentGroupId, setAssignmentGroupId] = useState(DEFAULT_WORK_SHIFT_GROUPS[0].id);
  const [assignmentEffectiveDate, setAssignmentEffectiveDate] = useState(getGmt8DateString());
  const [assignmentEndDate, setAssignmentEndDate] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void loadLeaveWorkspace(activeEntityId)
      .then((loadedWorkspace) => {
        if (cancelled) return;
        const groups = loadedWorkspace.workShiftGroups.length > 0
          ? loadedWorkspace.workShiftGroups
          : DEFAULT_WORK_SHIFT_GROUPS;
        const days = groups.flatMap((group) => normalizeWorkShiftGroupDays(
          loadedWorkspace.workShiftGroupDays,
          group.id,
        ));
        const normalizedGroups = groups.map((group) => {
          const weeklyHours = calculateWorkShiftWeeklyHours(days, group.id);
          return { ...group, weeklyHours, weeklyHoursWarning: weeklyHours > 45 };
        });
        setWorkspace(loadedWorkspace);
        setWorkShiftGroups(normalizedGroups);
        setWorkShiftGroupDays(days);
        setAssignments(loadedWorkspace.employeeWorkShiftAssignments);
        setSelectedGroupId((previous) => normalizedGroups.some((group) => group.id === previous)
          ? previous
          : normalizedGroups[0]?.id || '');
        setAssignmentGroupId((previous) => normalizedGroups.some((group) => group.enabled && group.id === previous)
          ? previous
          : normalizedGroups.find((group) => group.enabled)?.id || '');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeEntityId, refreshKey]);

  useEffect(() => {
    setAssignmentEmployeeIds((previous) => previous.filter((id) => activeEmployees.some((employee) => employee.id === id)));
  }, [activeEmployees]);

  const selectedGroup = workShiftGroups.find((group) => group.id === selectedGroupId);
  const selectedDays = selectedGroup
    ? normalizeWorkShiftGroupDays(workShiftGroupDays, selectedGroup.id)
    : [];

  const persist = (
    nextGroups = workShiftGroups,
    nextDays = workShiftGroupDays,
    nextAssignments = assignments,
  ) => {
    if (!activeEntityId || !workspace) return;
    const nextWorkspace = {
      ...workspace,
      workShiftGroups: nextGroups,
      workShiftGroupDays: nextDays,
      employeeWorkShiftAssignments: nextAssignments,
      source: 'local' as const,
    };
    setWorkspace(nextWorkspace);
    void persistLeaveWorkspace(activeEntityId, nextWorkspace).catch((error) => {
      console.warn('[Work & Shift Groups] Save failed; local fallback remains active:', error);
    });
  };

  const saveSchedule = (nextGroups: WorkShiftGroup[], nextDays: WorkShiftGroupDay[]) => {
    setWorkShiftGroups(nextGroups);
    setWorkShiftGroupDays(nextDays);
    persist(nextGroups, nextDays, assignments);
  };

  const getGroupDays = (groupId: string) => normalizeWorkShiftGroupDays(workShiftGroupDays, groupId);

  const updateDay = (
    groupId: string,
    weekday: number,
    field: 'startTime' | 'endTime' | 'dayType',
    value: string,
  ) => {
    const nextDaysForGroup = getGroupDays(groupId).map((day) => {
      if (day.weekday !== weekday) return day;
      const nextDay = { ...day, [field]: value } as WorkShiftGroupDay;
      const dayType = field === 'dayType' ? value as WorkShiftDayType : nextDay.dayType;
      const startTime = dayType === 'half_day'
        ? nextDay.startTime || day.startTime || '09:00'
        : nextDay.startTime;
      const endTime = dayType === 'half_day' && (field === 'dayType' || field === 'startTime')
        ? addHoursToTime(startTime, 4)
        : nextDay.endTime || (dayType === 'half_day' ? addHoursToTime(startTime, 4) : '');
      return {
        ...nextDay,
        dayType,
        isWorkDay: dayType !== 'rest',
        startTime,
        endTime,
        actualHours: calculateShiftHours(startTime, endTime, dayType),
      };
    });
    const nextDays = [
      ...workShiftGroupDays.filter((day) => day.groupId !== groupId),
      ...nextDaysForGroup,
    ];
    const weeklyHours = calculateWorkShiftWeeklyHours(nextDaysForGroup, groupId);
    const nextGroups = workShiftGroups.map((group) => group.id === groupId
      ? { ...group, weeklyHours, weeklyHoursWarning: weeklyHours > 45 }
      : group);
    saveSchedule(nextGroups, nextDays);
  };

  const updateGroup = (
    groupId: string,
    field: 'name' | 'description' | 'enabled',
    value: string | boolean,
  ) => {
    const nextGroups = workShiftGroups.map((group) => group.id === groupId
      ? { ...group, [field]: value }
      : group);
    saveSchedule(nextGroups, workShiftGroupDays);
  };

  const addGroup = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newGroupName.trim();
    if (!name) {
      onShowNotification('Validation Error', 'Please provide a Work & Shift Group name.');
      return;
    }
    if (workShiftGroups.some((group) => group.name.trim().toLowerCase() === name.toLowerCase())) {
      onShowNotification('Validation Error', 'A Work & Shift Group with this name already exists.');
      return;
    }
    const id = `work-shift-${Date.now()}`;
    const days = normalizeWorkShiftGroupDays([], id);
    const weeklyHours = calculateWorkShiftWeeklyHours(days, id);
    const group: WorkShiftGroup = {
      id,
      entityId: activeEntityId,
      name,
      description: newGroupDescription.trim() || 'Custom working schedule.',
      enabled: true,
      weeklyHours,
      weeklyHoursWarning: weeklyHours > 45,
    };
    saveSchedule([...workShiftGroups, group], [...workShiftGroupDays, ...days]);
    setSelectedGroupId(id);
    setAssignmentGroupId(id);
    setNewGroupName('');
    setNewGroupDescription('');
    onShowNotification('Work & Shift Group Added', `${name} is ready to configure.`);
  };

  const saveGroup = () => {
    if (!selectedGroup) return;
    const days = getGroupDays(selectedGroup.id);
    if (!days.some((day) => day.dayType !== 'rest')) {
      onShowNotification('Validation Error', 'A Work & Shift Group must contain at least one Work day.');
      return;
    }
    const invalidDay = days.find((day) => (
      day.dayType !== 'rest'
      && (!day.startTime || !day.endTime || day.startTime === day.endTime)
    ));
    if (invalidDay) {
      onShowNotification('Validation Error', `${weekdayNames[invalidDay.weekday]} needs different start and end times.`);
      return;
    }
    const weeklyHours = calculateWorkShiftWeeklyHours(days, selectedGroup.id);
    const nextGroups = workShiftGroups.map((group) => group.id === selectedGroup.id
      ? { ...group, weeklyHours, weeklyHoursWarning: weeklyHours > 45 }
      : group);
    const nextDays = [
      ...workShiftGroupDays.filter((day) => day.groupId !== selectedGroup.id),
      ...days,
    ];
    saveSchedule(nextGroups, nextDays);
    onShowNotification(
      'Work & Shift Group Saved',
      `${selectedGroup.name} totals ${weeklyHours.toFixed(2)} hours per week${weeklyHours > 45 ? ' and exceeds the 45-hour warning threshold.' : '.'}`,
    );
  };

  const deleteGroup = async () => {
    if (!selectedGroup || selectedGroup.id === DEFAULT_WORK_SHIFT_GROUPS[0].id) {
      onShowNotification('Work & Shift Group', 'The default Malaysia schedule cannot be deleted.');
      return;
    }
    const confirmed = await confirmAction({
      title: 'Delete Work & Shift Group',
      message: `Delete ${selectedGroup.name}? Existing historical assignments will remain in the record.`,
      type: 'danger',
      confirmLabel: 'Delete Group',
    });
    if (!confirmed) return;
    const nextGroups = workShiftGroups.filter((group) => group.id !== selectedGroup.id);
    const nextDays = workShiftGroupDays.filter((day) => day.groupId !== selectedGroup.id);
    const nextAssignments = assignments.filter((assignment) => assignment.groupId !== selectedGroup.id);
    setAssignments(nextAssignments);
    saveSchedule(nextGroups, nextDays);
    persist(nextGroups, nextDays, nextAssignments);
    setSelectedGroupId(nextGroups[0]?.id || '');
    setAssignmentGroupId(nextGroups.find((group) => group.enabled)?.id || '');
    onShowNotification('Work & Shift Group Deleted', `${selectedGroup.name} was removed.`);
  };

  const previousDay = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const assignGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    const employeeIds = assignmentMode === 'single'
      ? assignmentEmployeeIds.slice(0, 1)
      : [...new Set(assignmentEmployeeIds)];
    const group = workShiftGroups.find((item) => item.id === assignmentGroupId);
    if (!group || employeeIds.length === 0) {
      onShowNotification('Validation Error', 'Select at least one employee and an active Work & Shift Group.');
      return;
    }
    if (!assignmentEffectiveDate) {
      onShowNotification('Validation Error', 'Select an effective date.');
      return;
    }
    if (assignmentEndDate && assignmentEndDate < assignmentEffectiveDate) {
      onShowNotification('Validation Error', 'The end date cannot be earlier than the effective date.');
      return;
    }

    const conflicts = employeeIds.flatMap((employeeId) => assignments
      .filter((assignment) => (
        assignment.employeeId === employeeId
        && assignment.active
        && assignment.groupId !== group.id
        && (!assignment.endDate || assignment.endDate >= assignmentEffectiveDate)
      ))
      .map(() => activeEmployees.find((employee) => employee.id === employeeId)?.name || employeeId));
    if (conflicts.length > 0) {
      const confirmed = await confirmAction({
        title: 'Replace Work & Shift Assignment',
        message: `${[...new Set(conflicts)].join(', ')} already have an active schedule. End the existing assignment before applying ${group.name}?`,
        type: 'warning',
        confirmLabel: 'Replace Assignment',
      });
      if (!confirmed) return;
    }

    let nextAssignments = [...assignments];
    employeeIds.forEach((employeeId) => {
      nextAssignments = nextAssignments.map((assignment) => {
        if (
          assignment.employeeId !== employeeId
          || !assignment.active
          || (assignment.endDate && assignment.endDate < assignmentEffectiveDate)
        ) {
          return assignment;
        }
        if (assignment.effectiveDate < assignmentEffectiveDate) {
          return { ...assignment, endDate: previousDay(assignmentEffectiveDate) };
        }
        return { ...assignment, active: false };
      });
      nextAssignments.push({
        id: `work-shift-assignment-${Date.now()}-${employeeId}`,
        entityId: activeEntityId,
        employeeId,
        groupId: group.id,
        effectiveDate: assignmentEffectiveDate,
        endDate: assignmentEndDate || undefined,
        active: true,
        assignedAt: new Date().toISOString(),
      });
    });
    setAssignments(nextAssignments);
    persist(workShiftGroups, workShiftGroupDays, nextAssignments);
    setAssignmentEmployeeIds([]);
    setAssignmentEndDate('');
    onShowNotification(
      'Work & Shift Group Assigned',
      `${group.name} was assigned to ${employeeIds.length} employee${employeeIds.length === 1 ? '' : 's'} from ${formatToDDMMMYYYY(assignmentEffectiveDate)}.`,
    );
  };

  const currentDate = getGmt8DateString();
  const visibleAssignments = assignments.filter((assignment) => (
    activeEmployees.some((employee) => employee.id === assignment.employeeId)
  ));

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-8 text-left">
      <div className="flex flex-col justify-between gap-5 border-b border-neutral-border/70 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Core Operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-on-background">Work & Shift Groups</h1>
          <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
            Configure working days, shifts, rest days, weekly hours, and employee schedule assignments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-md border border-neutral-border bg-white px-3 py-2 text-xs font-bold text-on-surface transition hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Loading schedules...' : 'Refresh Schedule Data'}
        </button>
      </div>

      {isLoading ? (
        <div className={`${cardClass} flex min-h-64 flex-col items-center justify-center gap-3 p-8`}>
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-bold text-on-surface">Loading Work & Shift Groups...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={`${cardClass} p-4`}>
              <span className={labelClass}>Active Groups</span>
              <p className="mt-2 font-mono text-3xl font-bold text-on-surface">{workShiftGroups.filter((group) => group.enabled).length}</p>
            </div>
            <div className={`${cardClass} p-4`}>
              <span className={labelClass}>Assigned Employees</span>
              <p className="mt-2 font-mono text-3xl font-bold text-on-surface">{new Set(assignments.filter((assignment) => assignment.active).map((assignment) => assignment.employeeId)).size}</p>
            </div>
            <div className={`${cardClass} p-4`}>
              <span className={labelClass}>Over 45 Hours</span>
              <p className="mt-2 font-mono text-3xl font-bold text-amber-700">{workShiftGroups.filter((group) => group.weeklyHoursWarning).length}</p>
            </div>
          </div>

          <div className={`${cardClass} p-5`}>
            <form onSubmit={addGroup} className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-4"><label className={labelClass}>Group Name</label><input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="e.g. Retail 6-Day Shift" className={inputClass} /></div>
              <div className="md:col-span-6"><label className={labelClass}>Description</label><input value={newGroupDescription} onChange={(event) => setNewGroupDescription(event.target.value)} placeholder="Describe the schedule or employee population." className={inputClass} /></div>
              <div className="flex items-end md:col-span-2"><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-xs font-bold text-white hover:opacity-90"><Plus className="h-4 w-4" /> Add Group</button></div>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className={`${cardClass} h-fit p-3`}>
              <div className="border-b border-neutral-border/60 px-3 pb-3">
                <p className={labelClass}>Work & Shift Groups</p>
                <p className="text-xs text-on-surface-variant">Select a group to configure its weekly schedule.</p>
              </div>
              <div className="mt-3 space-y-1">
                {workShiftGroups.map((group) => (
                  <button key={group.id} type="button" onClick={() => setSelectedGroupId(group.id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedGroupId === group.id ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-transparent hover:bg-neutral-50'}`}>
                    <div className="flex items-start justify-between gap-2"><span className="text-xs font-bold text-on-surface">{group.name}</span><span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${group.enabled ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-on-surface-variant'}`}>{group.enabled ? 'Active' : 'Disabled'}</span></div>
                    <span className="mt-1 block font-mono text-[10px] text-on-surface-variant">{group.weeklyHours.toFixed(2)} hours/week</span>
                    {group.weeklyHoursWarning && <span className="mt-1 block text-[9px] font-bold text-amber-700">Over 45-hour warning</span>}
                  </button>
                ))}
              </div>
            </div>

            {!selectedGroup ? (
              <div className={`${cardClass} p-5`}><EmptyState title="No Work & Shift Group selected" description="Create or select a group to configure its schedule." /></div>
            ) : (
              <div className={`${cardClass} overflow-hidden`}>
                <div className="flex flex-col justify-between gap-4 border-b border-neutral-border bg-neutral-50 p-5 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <label className={labelClass}>Group Name</label>
                    <input value={selectedGroup.name} onChange={(event) => updateGroup(selectedGroup.id, 'name', event.target.value)} className="w-full border-0 bg-transparent p-0 text-lg font-bold text-on-surface outline-none focus:ring-0" />
                    <label className={`${labelClass} mt-3`}>Description</label>
                    <textarea rows={2} value={selectedGroup.description} onChange={(event) => updateGroup(selectedGroup.id, 'description', event.target.value)} className={`${inputClass} bg-white`} />
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase ${selectedGroup.weeklyHoursWarning ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>{selectedGroup.weeklyHours.toFixed(2)} hours/week</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => updateGroup(selectedGroup.id, 'enabled', !selectedGroup.enabled)} className="rounded-md border border-neutral-border px-3 py-1.5 text-[10px] font-bold text-on-surface-variant hover:bg-white">{selectedGroup.enabled ? 'Disable' : 'Enable'}</button>
                      <button type="button" onClick={() => void deleteGroup()} className="rounded-md border border-red-200 px-3 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-50"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete</button>
                    </div>
                  </div>
                </div>

                {selectedGroup.weeklyHoursWarning && <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />Weekly working hours exceed 45 hours. Saving is allowed, but HR should review the schedule.</div>}

                <div className="overflow-x-auto p-5">
                  <table className="min-w-[900px] w-full text-left text-xs">
                    <thead className="border-b border-neutral-border text-[10px] font-bold uppercase tracking-wider text-on-surface-variant"><tr><th className="p-3">Working Day</th><th className="p-3">Start</th><th className="p-3">End</th><th className="p-3">Day Setting</th><th className="p-3 text-center">Work</th><th className="p-3 text-center">Rest</th><th className="p-3 text-right">Actual Hours</th></tr></thead>
                    <tbody className="divide-y divide-neutral-border/60">
                      {weekdayOrder.map((weekday) => {
                        const day = selectedDays.find((item) => item.weekday === weekday) as WorkShiftGroupDay;
                        const isRest = day.dayType === 'rest';
                        return (
                          <tr key={day.id}>
                            <td className="p-3 font-bold text-on-surface">{weekdayNames[weekday]}</td>
                            <td className="p-3"><input type="time" value={day.startTime} onChange={(event) => updateDay(selectedGroup.id, weekday, 'startTime', event.target.value)} className={`${inputClass} font-mono`} /></td>
                            <td className="p-3"><input type="time" value={day.endTime} onChange={(event) => updateDay(selectedGroup.id, weekday, 'endTime', event.target.value)} className={`${inputClass} font-mono`} /></td>
                            <td className="p-3"><select value={day.dayType} onChange={(event) => updateDay(selectedGroup.id, weekday, 'dayType', event.target.value)} className={inputClass}><option value="full_day">Full Day</option><option value="half_day">Half-day</option><option value="rest">Rest</option></select></td>
                            <td className="p-3 text-center"><input type="checkbox" checked={!isRest} onChange={() => updateDay(selectedGroup.id, weekday, 'dayType', isRest ? 'full_day' : 'rest')} className="h-4 w-4 accent-[#b42318]" aria-label={`Work on ${weekdayNames[weekday]}`} /></td>
                            <td className="p-3 text-center"><input type="checkbox" checked={isRest} onChange={() => updateDay(selectedGroup.id, weekday, 'dayType', isRest ? 'full_day' : 'rest')} className="h-4 w-4 accent-[#b42318]" aria-label={`Rest on ${weekdayNames[weekday]}`} /></td>
                            <td className="p-3 text-right font-mono font-bold text-primary">{day.actualHours.toFixed(2)} h</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col justify-between gap-3 border-t border-neutral-border bg-white px-5 py-4 sm:flex-row sm:items-center">
                  <p className="text-xs text-on-surface-variant">Full Day deducts a one-hour break. Half-day defaults to an end time four hours after the start, and the end time remains editable.</p>
                  <button type="button" onClick={saveGroup} className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90"><Save className="h-4 w-4" /> Save Group</button>
                </div>
              </div>
            )}
          </div>

          <div className={`${cardClass} p-5 xl:col-span-2`}>
            <div className="mb-5 flex flex-col justify-between gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-start">
              <div><h2 className="text-base font-bold text-on-surface">Assign Work & Shift Group</h2><p className="mt-1 text-xs text-on-surface-variant">Each employee has one effective active schedule at a time. Future-dated assignments are supported.</p></div>
              <div className="flex rounded-md bg-neutral-100 p-1">{(['single', 'bulk'] as const).map((mode) => <button key={mode} type="button" onClick={() => { setAssignmentMode(mode); if (mode === 'single') setAssignmentEmployeeIds((ids) => ids.slice(0, 1)); }} className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase ${assignmentMode === mode ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}>{mode}</button>)}</div>
            </div>
            <form onSubmit={assignGroup} className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-4">
                <label className={labelClass}>{assignmentMode === 'single' ? 'Employee' : 'Employees'}</label>
                {assignmentMode === 'single' ? (
                  <select value={assignmentEmployeeIds[0] || ''} onChange={(event) => setAssignmentEmployeeIds(event.target.value ? [event.target.value] : [])} className={inputClass}><option value="">Select active employee</option>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.department}</option>)}</select>
                ) : (
                  <select multiple value={assignmentEmployeeIds} onChange={(event) => setAssignmentEmployeeIds([...event.currentTarget.selectedOptions].map((option: HTMLOptionElement) => option.value))} className={`${inputClass} min-h-[92px]`}>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.department}</option>)}</select>
                )}
              </div>
              <div className="md:col-span-3"><label className={labelClass}>Work & Shift Group</label><select value={assignmentGroupId} onChange={(event) => setAssignmentGroupId(event.target.value)} className={inputClass}>{workShiftGroups.filter((group) => group.enabled).map((group) => <option key={group.id} value={group.id}>{group.name} · {group.weeklyHours.toFixed(2)}h</option>)}</select></div>
              <div className="md:col-span-2"><label className={labelClass}>Effective Date</label><input type="date" value={assignmentEffectiveDate} onChange={(event) => setAssignmentEffectiveDate(event.target.value)} className={`${inputClass} font-mono`} /></div>
              <div className="md:col-span-2"><label className={labelClass}>End Date (Optional)</label><input type="date" value={assignmentEndDate} onChange={(event) => setAssignmentEndDate(event.target.value)} className={`${inputClass} font-mono`} /></div>
              <div className="flex items-end md:col-span-1"><button type="submit" className="flex w-full items-center justify-center rounded-md bg-primary px-3 py-2.5 text-white hover:opacity-90" title="Assign group"><Plus className="h-4 w-4" /></button></div>
            </form>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-xs">
                <thead className="border-b border-neutral-border text-[10px] font-bold uppercase tracking-wider text-on-surface-variant"><tr><th className="p-3">Employee</th><th className="p-3">Group</th><th className="p-3">Effective</th><th className="p-3">End</th><th className="p-3">Status</th></tr></thead>
                <tbody className="divide-y divide-neutral-border/60">
                  {visibleAssignments.length === 0 ? <tr><td colSpan={5} className="p-5"><EmptyState title="No schedule assignments" description="Employees without an assignment use the Malaysia standard schedule." /></td></tr> : visibleAssignments.map((assignment) => {
                    const employee = activeEmployees.find((item) => item.id === assignment.employeeId);
                    const group = workShiftGroups.find((item) => item.id === assignment.groupId);
                    if (!employee || !group) return null;
                    const isCurrent = assignment.active && assignment.effectiveDate <= currentDate && (!assignment.endDate || assignment.endDate >= currentDate);
                    return <tr key={assignment.id}><td className="p-3"><p className="font-bold text-on-surface">{employee.name}</p><p className="text-[10px] text-on-surface-variant">{employee.department} · {employee.designation}</p></td><td className="p-3"><p className="font-semibold text-on-surface">{group.name}</p><p className="font-mono text-[10px] text-on-surface-variant">{group.weeklyHours.toFixed(2)} hours/week</p></td><td className="p-3 font-mono">{formatToDDMMMYYYY(assignment.effectiveDate)}</td><td className="p-3 font-mono">{assignment.endDate ? formatToDDMMMYYYY(assignment.endDate) : 'Open ended'}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${isCurrent ? 'bg-green-100 text-green-700' : assignment.effectiveDate > currentDate ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-on-surface-variant'}`}>{isCurrent ? 'Current' : assignment.effectiveDate > currentDate ? 'Future' : 'History'}</span></td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-border p-8 text-center">
      <Clock3 className="mx-auto mb-2 h-8 w-8 text-on-surface-variant/30" />
      <p className="text-xs font-bold text-on-surface">{title}</p>
      <p className="mt-1 text-xs text-on-surface-variant">{description}</p>
    </div>
  );
}
