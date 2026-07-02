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

const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];

export default function LeaveManagementView({
  employees,
  onShowNotification
}: LeaveManagementViewProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [startDate, setStartDate] = useState('2026-07-05');
  const [endDate, setEndDate] = useState('2026-07-07');
  const [reason, setReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  // Compute stats for selected employee
  const currentEmployee = employees.find(e => e.id === selectedEmployeeId) || employees[0];
  
  // Simulated leave balances per employee (in a real system, would be model fields)
  const totalAnnualEntitled = 18;
  const takenAnnual = requests.filter(r => r.employeeId === selectedEmployeeId && r.leaveType === 'Annual Leave' && r.status === 'Approved').reduce((acc, r) => acc + r.totalDays, 0) + 4; // base Taken value
  const remainingAnnual = Math.max(0, totalAnnualEntitled - takenAnnual);

  const totalSickEntitled = 14;
  const takenSick = requests.filter(r => r.employeeId === selectedEmployeeId && r.leaveType === 'Sick Leave' && r.status === 'Approved').reduce((acc, r) => acc + r.totalDays, 0) + 2;
  const remainingSick = Math.max(0, totalSickEntitled - takenSick);

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

    setRequests([newRequest, ...requests]);
    setReason('');
    onShowNotification(
      'Leave Request Submitted', 
      `Successfully filed ${totalDays} day(s) of ${leaveType} for ${employee.name}.`
    );
  };

  const handleUpdateStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setRequests(prev => prev.map(req => {
      if (req.id === id) {
        return { ...req, status: newStatus };
      }
      return req;
    }));
    onShowNotification(
      `Request ${newStatus}`, 
      `Leave request ${id} has been marked as ${newStatus.toLowerCase()}.`
    );
  };

  const filteredRequests = statusFilter === 'All' 
    ? requests 
    : requests.filter(r => r.status === statusFilter);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200 text-left">
      <div>
        <h1 className="text-3xl font-bold text-on-background tracking-tight">Leave Management</h1>
        <p className="text-on-surface-variant mt-1">
          Apply, review, and track statutory and corporate leave requests across all subsidiaries.
        </p>
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
                    <option>Annual Leave</option>
                    <option>Sick Leave</option>
                    <option>Hospitalisation Leave</option>
                    <option>Maternity Leave</option>
                    <option>Paternity Leave</option>
                    <option>Compassionate Leave</option>
                    <option>Unpaid Leave</option>
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
              <div className="bg-neutral-50 p-3 rounded border border-neutral-border/40">
                <span className="text-[10px] text-on-surface-variant block font-sans font-bold uppercase tracking-wider mb-1.5">Annual Leave</span>
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-lg font-bold text-primary">{remainingAnnual}</span>
                    <span className="text-[10px] text-on-surface-variant"> / {totalAnnualEntitled} days</span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Available</span>
                </div>
              </div>

              <div className="bg-neutral-50 p-3 rounded border border-neutral-border/40">
                <span className="text-[10px] text-on-surface-variant block font-sans font-bold uppercase tracking-wider mb-1.5">Medical / Sick Leave</span>
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-lg font-bold text-primary">{remainingSick}</span>
                    <span className="text-[10px] text-on-surface-variant"> / {totalSickEntitled} days</span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Available</span>
                </div>
              </div>
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
    </div>
  );
}
