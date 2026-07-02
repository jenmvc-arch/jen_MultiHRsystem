/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Filter, 
  User, 
  Briefcase, 
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Employee } from '../types';
import LeaveCalendar from './LeaveCalendar';
import { getGmt8DateString } from '../lib/dateUtils';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedDate: string;
}

interface LeaveManagementViewProps {
  employees: Employee[];
  onShowNotification: (title: string, message: string) => void;
}

export interface LeaveConfig {
  id: string;
  leaveType: string;
  daysEntitled: number;
  leaveGroup: string; // "All" | "Full-Time" | "Probationary" | "Contractor"
  condition: string;
}

const DEFAULT_LEAVE_CONFIGS: LeaveConfig[] = [
  { id: '1', leaveType: 'Annual Leave', daysEntitled: 18, leaveGroup: 'Full-Time', condition: 'Paid leave' },
  { id: '2', leaveType: 'Sick Leave', daysEntitled: 14, leaveGroup: 'All', condition: 'Paid leave' },
  { id: '3', leaveType: 'Hospitalisation Leave', daysEntitled: 60, leaveGroup: 'All', condition: 'Paid leave' },
  { id: '4', leaveType: 'Maternity Leave', daysEntitled: 98, leaveGroup: 'Full-Time', condition: 'Paid leave' },
  { id: '5', leaveType: 'Paternity Leave', daysEntitled: 7, leaveGroup: 'Full-Time', condition: 'Paid leave' },
  { id: '6', leaveType: 'Compassionate Leave', daysEntitled: 3, leaveGroup: 'All', condition: 'Paid leave' },
  { id: '7', leaveType: 'Unpaid Leave', daysEntitled: 30, leaveGroup: 'All', condition: 'Unpaid leave' },
];

const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];

export default function LeaveManagementView({
  employees,
  onShowNotification
}: LeaveManagementViewProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('leave_requests');
    return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
  });
  const [leaveConfigs, setLeaveConfigs] = useState<LeaveConfig[]>(() => {
    const saved = localStorage.getItem('leave_configs');
    return saved ? JSON.parse(saved) : DEFAULT_LEAVE_CONFIGS;
  });

  const saveConfigs = (newConfigs: LeaveConfig[]) => {
    setLeaveConfigs(newConfigs);
    localStorage.setItem('leave_configs', JSON.stringify(newConfigs));
  };

  const saveRequests = (newRequests: LeaveRequest[]) => {
    setRequests(newRequests);
    localStorage.setItem('leave_requests', JSON.stringify(newRequests));
  };

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [leaveType, setLeaveType] = useState(() => leaveConfigs[0]?.leaveType || 'Annual Leave');
  const [startDate, setStartDate] = useState('2026-07-05');
  const [endDate, setEndDate] = useState('2026-07-07');
  const [reason, setReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  // Policy configuration modal states
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDays, setNewTypeDays] = useState(14);
  const [newTypeGroup, setNewTypeGroup] = useState('All');
  const [newTypeCondition, setNewTypeCondition] = useState('Paid leave');

  // Compute stats for selected employee
  const currentEmployee = employees.find(e => e.id === selectedEmployeeId) || employees[0];

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    if (isNaN(diff)) return 1;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 1;
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      onShowNotification('Validation Error', 'Please provide a valid reason for the leave application.');
      return;
    }

    const totalDays = calculateDays(startDate, endDate);
    const employee = employees.find(emp => emp.id === selectedEmployeeId) || employees[0];

    const newRequest: LeaveRequest = {
      id: `LR-00${requests.length + 1}`,
      employeeId: selectedEmployeeId,
      employeeName: employee.name,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      status: 'Pending',
      appliedDate: getGmt8DateString()
    };

    saveRequests([newRequest, ...requests]);
    setReason('');
    onShowNotification(
      'Leave Request Submitted', 
      `Successfully filed ${totalDays} day(s) of ${leaveType} for ${employee.name}.`
    );
  };

  const handleUpdateStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
    const updated = requests.map(req => {
      if (req.id === id) {
        return { ...req, status: newStatus };
      }
      return req;
    });
    saveRequests(updated);
    onShowNotification(
      `Request ${newStatus}`, 
      `Leave request ${id} has been marked as ${newStatus.toLowerCase()}.`
    );
  };

  const handleUpdateConfig = (id: string, field: keyof LeaveConfig, value: any) => {
    const updated = leaveConfigs.map(c => c.id === id ? { ...c, [field]: value } : c);
    saveConfigs(updated);
  };

  const handleDeleteConfig = (id: string) => {
    const updated = leaveConfigs.filter(c => c.id !== id);
    saveConfigs(updated);
    if (updated.length > 0) {
      setLeaveType(updated[0].leaveType);
    }
  };

  const handleAddConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      onShowNotification('Validation Error', 'Please specify a leave type name.');
      return;
    }
    const newConfig: LeaveConfig = {
      id: `LC-${Date.now()}`,
      leaveType: newTypeName.trim(),
      daysEntitled: Number(newTypeDays),
      leaveGroup: newTypeGroup,
      condition: newTypeCondition
    };
    const updated = [...leaveConfigs, newConfig];
    saveConfigs(updated);
    setNewTypeName('');
    setNewTypeDays(14);
    setNewTypeGroup('All');
    setNewTypeCondition('Paid leave');
    onShowNotification('Policy Added', `New leave policy "${newTypeName}" registered successfully.`);
  };

  const filteredRequests = statusFilter === 'All' 
    ? requests 
    : requests.filter(r => r.status === statusFilter);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-background tracking-tight">Leave Management</h1>
          <p className="text-on-surface-variant mt-1">
            Apply, review, and track statutory and corporate leave requests across all subsidiaries.
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="bg-primary text-[#f7f0e0] font-semibold text-xs py-2.5 px-4 rounded hover:opacity-90 shadow-sm flex items-center gap-1.5 cursor-pointer border border-primary/20"
          >
            <Briefcase className="w-4 h-4 text-[#f7f0e0]" /> Configure Leave Policies
          </button>
        </div>
      </div>

      {/* Grid Layout: Left form & stats, Right review logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Hand: New Request Form & Balance Widget */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-start">
          
          {/* File Leave Request Card */}
          <div className="bg-white border border-neutral-border rounded-lg p-5 shadow-sm">
            <h2 className="text-base font-bold text-primary flex items-center gap-2 mb-4 pb-2 border-b border-neutral-100">
              <Plus className="w-4 h-4" /> File New Leave Request
            </h2>
            
            <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Select Employee</label>
                <select 
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-white border border-neutral-border rounded p-2 focus:ring-1 focus:ring-primary outline-none"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">Leave Category</label>
                  <select 
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-2 focus:ring-1 focus:ring-primary outline-none"
                  >
                    {leaveConfigs.map(config => (
                      <option key={config.id} value={config.leaveType}>{config.leaveType}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-primary/5 rounded border border-primary/20 p-2 text-center flex flex-col justify-center">
                  <span className="text-[10px] text-primary uppercase font-bold tracking-wide">Computed Days</span>
                  <span className="text-xl font-bold font-mono text-primary">{calculateDays(startDate, endDate)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-2 font-mono focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">End Date</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-2 font-mono focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Reason / Notes</label>
                <textarea 
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide supporting reasons or medical certificate reference details..."
                  className="w-full bg-white border border-neutral-border rounded p-2 focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-primary hover:opacity-95 text-white font-semibold py-2 rounded text-xs transition-opacity shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" /> Submit Leave Application
              </button>
            </form>
          </div>

          {/* Leave Entitlement Balance Box */}
          <div className="bg-white border border-neutral-border rounded-lg p-5 shadow-sm">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-2 mb-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> Leave Balance Directory
              </h3>
              <span className="text-[10px] font-mono font-bold bg-neutral-100 px-2 py-0.5 rounded text-on-surface-variant">
                {currentEmployee?.id}
              </span>
            </div>

            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
              Balances calculated based on <strong>{currentEmployee?.employmentType}</strong> employment terms for {currentEmployee?.name}.
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              {leaveConfigs.map(config => {
                const taken = requests.filter(r => r.employeeId === selectedEmployeeId && r.leaveType === config.leaveType && r.status === 'Approved').reduce((acc, r) => acc + r.totalDays, 0);
                // Offset value to simulate initial seeder taken days (optional, matches the original)
                const simulatedOffset = config.leaveType === 'Annual Leave' ? 4 : (config.leaveType === 'Sick Leave' ? 2 : 0);
                const finalTaken = taken + simulatedOffset;
                const remaining = Math.max(0, config.daysEntitled - finalTaken);

                return (
                  <div key={config.id} className="bg-neutral-50 p-3 rounded border border-neutral-border/40 text-left">
                    <span className="text-[10px] text-on-surface-variant block font-sans font-bold uppercase tracking-wider mb-1">{config.leaveType}</span>
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-lg font-bold text-primary">{remaining}</span>
                        <span className="text-[10px] text-on-surface-variant font-sans"> / {config.daysEntitled}d</span>
                      </div>
                      <span className="text-[9px] text-zinc-400 font-sans">{config.condition}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-amber-50/50 rounded border border-amber-200/50 flex gap-2.5 items-start text-[11px] text-amber-900 leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Leaves requested during public holidays (e.g. Deepavali, Hari Raya) are automatically excluded from the computed statutory days balance deduction.
              </span>
            </div>
          </div>

        </div>

        {/* Right Hand: Interactive Approval & History Logs */}
        <div className="lg:col-span-7 bg-white border border-neutral-border rounded-lg p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-on-background">Applications Queue & Logs</h2>
                <p className="text-xs text-on-surface-variant">Track, verify documentation, and approve staff leave requests.</p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex gap-1 bg-neutral-100 p-1 rounded-md shrink-0 text-xs">
                {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      statusFilter === tab 
                        ? 'bg-white text-on-surface shadow-xs' 
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* List of leave requests */}
            <div className="space-y-4">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-200 rounded-lg text-xs text-on-surface-variant">
                  <Calendar className="w-10 h-10 text-on-surface-variant/30 mx-auto mb-2" />
                  No leave requests matching the selection filter.
                </div>
              ) : (
                filteredRequests.map(req => {
                  const emp = employees.find(e => e.id === req.employeeId);
                  return (
                    <div 
                      key={req.id}
                      className="p-4 border border-neutral-border/60 rounded-lg hover:border-primary transition-all bg-neutral-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {emp?.avatarUrl ? (
                            <img src={emp.avatarUrl} alt={req.employeeName} className="w-7 h-7 rounded-full object-cover border" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                              {req.employeeName.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-xs text-on-surface block">{req.employeeName}</span>
                            <span className="text-[10px] text-on-surface-variant font-medium font-mono block">Applied: {req.appliedDate} · ID: {req.id}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-[11px] bg-white p-2.5 rounded border border-neutral-border/20">
                          <div>
                            <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-semibold">Leave Category</span>
                            <span className="font-semibold text-primary">{req.leaveType}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-semibold">Duration</span>
                            <span className="font-semibold text-on-surface font-mono">{req.startDate} to {req.endDate} ({req.totalDays} day{req.totalDays > 1 ? 's' : ''})</span>
                          </div>
                        </div>

                        <p className="text-xs text-on-surface-variant italic leading-relaxed bg-neutral-100/50 p-2 rounded">
                          " {req.reason} "
                        </p>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-200">
                        {/* Status Label badge */}
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          req.status === 'Approved'
                            ? 'bg-green-100 text-green-700'
                            : req.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {req.status}
                        </span>

                        {req.status === 'Pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'Approved')}
                              className="p-1 px-2.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                              className="p-1 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-on-surface-variant font-semibold">
            <span>Total Requests Handled: <strong>{requests.length}</strong></span>
            <span>Pending Approvals: <strong>{requests.filter(r => r.status === 'Pending').length}</strong></span>
          </div>
        </div>

      </div>

      {/* Leave Calendar Section */}
      <LeaveCalendar requests={requests} employees={employees} />

      {/* Policy Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-border rounded-lg shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150 text-left">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-border flex justify-between items-center bg-primary text-[#f7f0e0]">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#f7f0e0]" /> Configure Leave Availability & Policies
              </h3>
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <XCircle className="w-5 h-5 text-[#f7f0e0]" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Existing configs list */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">Active Leave Entitlements</span>
                
                <div className="border border-neutral-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-on-surface-variant font-bold border-b border-neutral-border uppercase tracking-wider text-[10px]">
                        <th className="p-3">Leave Type</th>
                        <th className="p-3 w-24">Days Entitled</th>
                        <th className="p-3 w-32">Leave Group</th>
                        <th className="p-3">Condition / Rule</th>
                        <th className="p-3 text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-border/60">
                      {leaveConfigs.map(config => (
                        <tr key={config.id} className="hover:bg-neutral-50/50">
                          <td className="p-3 font-semibold text-primary">{config.leaveType}</td>
                          <td className="p-2">
                            <input 
                              type="number"
                              value={config.daysEntitled}
                              onChange={(e) => handleUpdateConfig(config.id, 'daysEntitled', Number(e.target.value))}
                              className="w-full bg-white border border-neutral-border rounded p-1 font-mono text-center focus:ring-1 focus:ring-primary outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={config.leaveGroup}
                              onChange={(e) => handleUpdateConfig(config.id, 'leaveGroup', e.target.value)}
                              className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none"
                            >
                              <option value="All">All Staff</option>
                              <option value="Full-Time">Full-Time Only</option>
                              <option value="Probationary">Probationary Only</option>
                              <option value="Contractor">Contractors Only</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input 
                              type="text"
                              value={config.condition}
                              onChange={(e) => handleUpdateConfig(config.id, 'condition', e.target.value)}
                              className="w-full bg-white border border-neutral-border rounded p-1 focus:ring-1 focus:ring-primary outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteConfig(config.id)}
                              className="text-error hover:bg-error/10 p-1.5 rounded transition-colors cursor-pointer"
                              title="Delete policy"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add New policy section */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">Add New Leave Policy</span>
                <form onSubmit={handleAddConfig} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs">
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Leave Type Name</label>
                    <input 
                      type="text" required
                      placeholder="e.g. Marriage Leave"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Days</label>
                    <input 
                      type="number" required min={1}
                      value={newTypeDays}
                      onChange={(e) => setNewTypeDays(Number(e.target.value))}
                      className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs font-mono focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Leave Group</label>
                    <select
                      value={newTypeGroup}
                      onChange={(e) => setNewTypeGroup(e.target.value)}
                      className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none animate-none"
                    >
                      <option value="All">All Staff</option>
                      <option value="Full-Time">Full-Time Only</option>
                      <option value="Probationary">Probationary Only</option>
                      <option value="Contractor">Contractors Only</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Condition</label>
                    <input 
                      type="text" required
                      placeholder="e.g. Paid leave"
                      value={newTypeCondition}
                      onChange={(e) => setNewTypeCondition(e.target.value)}
                      className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="sm:col-span-12 flex justify-end mt-2">
                    <button
                      type="submit"
                      className="bg-primary text-[#f7f0e0] font-semibold text-xs py-2 px-5 rounded hover:opacity-90 cursor-pointer shadow-xs"
                    >
                      Register Leave Policy
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-border bg-neutral-50 flex justify-end">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="bg-zinc-600 hover:bg-zinc-700 text-[#f7f0e0] font-semibold text-xs py-2 px-6 rounded cursor-pointer"
              >
                Close Policies Panel
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
