/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Award, 
  Search, 
  Star, 
  ChevronRight, 
  TrendingUp, 
  Edit3, 
  CheckCircle, 
  AlertCircle,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { Employee, EmployeePerformance, ReviewCycle } from '../types';
import EmployeeAvatar from './EmployeeAvatar';
import PerformanceAnalytics from './PerformanceAnalytics';

interface PerformanceViewProps {
  employees: Employee[];
  performances: EmployeePerformance[];
  reviewCycles: ReviewCycle[];
  onSavePerformance: (perf: EmployeePerformance) => void;
  onShowNotification: (title: string, message: string) => void;
}

export default function PerformanceView({
  employees,
  performances,
  reviewCycles,
  onSavePerformance,
  onShowNotification
}: PerformanceViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'cycles' | 'analytics'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  
  // Selected cycle state
  const [selectedCycleId, setSelectedCycleId] = useState('cycle-2026-annual');

  // Modal evaluation state
  const [editingPerformance, setEditingPerformance] = useState<EmployeePerformance | null>(null);

  // Form states for the modal
  const [formRating, setFormRating] = useState(0);
  const [formTeamwork, setFormTeamwork] = useState(1);
  const [formCommunication, setFormCommunication] = useState(1);
  const [formProblemSolving, setFormProblemSolving] = useState(1);
  const [formSelfEval, setFormSelfEval] = useState('');
  const [formComments, setFormComments] = useState('');
  const [formGoals, setFormGoals] = useState<string[]>([]);
  const [newGoalInput, setNewGoalInput] = useState('');

  // Calculations
  const targetPerformances = performances.filter(p => p.reviewCycleId === selectedCycleId);
  const totalReviews = employees.length;
  const completedReviewsCount = targetPerformances.filter(p => p.reviewStatus === 'Completed' && employees.some(e => e.id === p.employeeId)).length;
  const pendingReviewsCount = Math.max(0, totalReviews - completedReviewsCount);
  const completionRate = totalReviews > 0 ? Math.round((completedReviewsCount / totalReviews) * 100) : 0;

  // Build rows: Join employees with performance
  const evaluationList = employees.map(emp => {
    const perf = performances.find(p => p.employeeId === emp.id && p.reviewCycleId === selectedCycleId) || {
      employeeId: emp.id,
      reviewCycleId: selectedCycleId,
      managerName: 'David Brent',
      reviewStatus: 'Not Started' as const,
      rating: 0,
      teamworkScore: 1,
      communicationScore: 1,
      problemSolvingScore: 1,
      selfEvaluation: '',
      managerComments: '',
      goals: []
    };
    return { emp, perf };
  });

  // Filter rows
  const filteredList = evaluationList.filter(({ emp, perf }) => {
    const matchesDept = deptFilter === 'All Departments' || emp.department === deptFilter;
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  // Open modal for evaluation
  const handleOpenEvaluate = (perf: EmployeePerformance) => {
    setEditingPerformance(perf);
    setFormRating(perf.rating);
    setFormTeamwork(perf.teamworkScore);
    setFormCommunication(perf.communicationScore);
    setFormProblemSolving(perf.problemSolvingScore);
    setFormSelfEval(perf.selfEvaluation || '');
    setFormComments(perf.managerComments || '');
    setFormGoals([...perf.goals]);
    setNewGoalInput('');
  };

  const handleAddGoal = () => {
    if (newGoalInput.trim()) {
      setFormGoals(prev => [...prev, newGoalInput.trim()]);
      setNewGoalInput('');
    }
  };

  const handleRemoveGoal = (idx: number) => {
    setFormGoals(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveEvaluation = () => {
    if (!editingPerformance) return;

    const saved: EmployeePerformance = {
      ...editingPerformance,
      reviewStatus: 'Completed',
      rating: formRating,
      teamworkScore: formTeamwork,
      communicationScore: formCommunication,
      problemSolvingScore: formProblemSolving,
      selfEvaluation: formSelfEval,
      managerComments: formComments,
      goals: formGoals
    };

    onSavePerformance(saved);
    setEditingPerformance(null);
    onShowNotification(
      'Evaluation Saved',
      `Successfully completed performance evaluation for employee: ${employees.find(e => e.id === saved.employeeId)?.name}.`
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-200">
      
      {/* Title & Banner */}
      <div>
        <h1 className="text-3xl font-bold text-on-background tracking-tight">HR Portal - Performance Management</h1>
        <p className="text-on-surface-variant mt-1">Pending Evaluation Metrics · {pendingReviewsCount} Reviews remaining this quarter</p>
      </div>

      {/* Metrics board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-neutral-border shadow-sm">
          <span className="text-on-surface-variant text-sm font-medium">Total Evaluations</span>
          <div className="text-3xl font-bold text-on-background mt-2">{totalReviews}</div>
          <div className="text-xs text-on-surface-variant mt-1.5 flex items-center gap-1 font-semibold">
            All registered FTE personnel
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-lg border border-neutral-border shadow-sm">
          <span className="text-on-surface-variant text-sm font-medium">Completed Evaluations</span>
          <div className="text-3xl font-bold text-green-600 mt-2">{completedReviewsCount}</div>
          <div className="text-xs text-green-600 mt-1.5 flex items-center gap-1 font-semibold">
            <CheckCircle className="w-3 h-3" /> {completionRate}% Completed ({pendingReviewsCount} remaining)
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-lg border border-neutral-border shadow-sm">
          <span className="text-on-surface-variant text-sm font-medium">Global Average Rating</span>
          <div className="text-3xl font-bold text-primary mt-2">
            {(() => {
              const ratedPerfs = targetPerformances.filter(p => p.reviewStatus === 'Completed' && p.rating > 0);
              if (ratedPerfs.length === 0) return '0.0';
              const avg = ratedPerfs.reduce((acc, p) => acc + p.rating, 0) / ratedPerfs.length;
              return avg.toFixed(1);
            })()} / 5.0
          </div>
          <div className="text-xs text-on-surface-variant mt-1.5 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5 text-primary" /> Steady professional alignment
          </div>
        </div>
      </div>

      {/* Inner Sub-navigation Tabs */}
      <div className="border-b border-neutral-border flex gap-6">
        <button 
          onClick={() => setActiveSubTab('pending')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeSubTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Pending Actions & List
        </button>
        <button 
          onClick={() => setActiveSubTab('cycles')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeSubTab === 'cycles' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Review Cycles ({reviewCycles.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('analytics')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeSubTab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Performance Analytics
        </button>
      </div>

      {activeSubTab === 'pending' && (
        <div className="bg-white border border-neutral-border rounded-lg shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 bg-surface-container-low border-b border-neutral-border flex flex-col md:flex-row gap-4 justify-between items-center text-sm">
            <div className="flex flex-1 gap-3 w-full">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-outline" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Employee by Name or ID..."
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-neutral-border rounded text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded border border-neutral-border bg-white p-1.5 text-xs outline-none"
              >
                <option>All Departments</option>
                <option>Product & Engineering</option>
                <option>Engineering</option>
                <option>Product</option>
                <option>Human Resources</option>
              </select>
            </div>
            
            <div className="text-xs font-semibold text-on-surface-variant">
              Showing {filteredList.length} of {employees.length} employee records
            </div>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface border-b border-neutral-border text-on-surface-variant font-bold uppercase tracking-wider">
                  <th className="p-4">Employee Details</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Review Status</th>
                  <th className="p-4">Current Score</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border/50">
                {filteredList.map(({ emp, perf }) => {
                  const isCompleted = perf.reviewStatus === 'Completed';
                  const isInProgress = perf.reviewStatus === 'In Progress';
                  
                  return (
                    <tr key={emp.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <EmployeeAvatar employee={emp} className="w-8 h-8 rounded-full" />
                        <div>
                          <div className="font-bold text-sm text-on-surface">{emp.name}</div>
                          <div className="text-xs text-on-surface-variant mt-0.5">{emp.designation} · <span className="font-mono font-medium text-[10px]">{emp.id}</span></div>
                        </div>
                      </td>
                      <td className="p-4 text-on-surface font-medium">{emp.department}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                          isCompleted 
                            ? 'bg-green-100 text-green-700' 
                            : isInProgress 
                            ? 'bg-blue-100 text-primary' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isCompleted ? 'bg-green-600' : isInProgress ? 'bg-blue-500' : 'bg-gray-400'
                          }`} />
                          {perf.reviewStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        {perf.rating > 0 ? (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3.5 h-3.5 ${
                                  i < Math.floor(perf.rating) 
                                    ? 'fill-amber-400 text-amber-400' 
                                    : 'text-gray-300'
                                }`} 
                              />
                            ))}
                            <span className="font-semibold text-on-surface ml-1">{perf.rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant italic text-[11px]">Unrated</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenEvaluate(perf)}
                          className={`text-xs font-semibold py-1.5 px-3 rounded inline-flex items-center gap-1 cursor-pointer transition-colors ${
                            isCompleted
                              ? 'bg-surface border border-neutral-border text-on-surface hover:bg-surface-container'
                              : 'bg-primary text-white hover:bg-primary-container'
                          }`}
                        >
                          <Edit3 className="w-3 h-3" />
                          {isCompleted ? 'View Review' : 'Evaluate'}
                        </button>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviewCycles.map(cycle => (
            <div key={cycle.id} className="bg-white p-6 border border-neutral-border rounded-lg shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold ${
                    cycle.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-primary'
                  }`}>
                    {cycle.status}
                  </span>
                  <Award className="w-5 h-5 text-primary-container" />
                </div>
                <h3 className="font-bold text-lg text-on-surface">{cycle.name}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">Evaluation active period: <span className="font-semibold">{cycle.period}</span></p>
              </div>
              <div className="mt-6 pt-4 border-t border-neutral-border/50 flex justify-between items-center text-xs">
                <span className="text-on-surface-variant">Self-Evaluations active</span>
                <span className="font-bold text-primary cursor-pointer hover:underline flex items-center gap-1">Details <ChevronRight className="w-3.5 h-3.5" /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'analytics' && (
        <PerformanceAnalytics
          employees={employees}
          performances={performances}
          reviewCycles={reviewCycles}
          selectedCycleId={selectedCycleId}
        />
      )}

      {/* Interactive Modal: Evaluation & Review Form */}
      {editingPerformance && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white border border-neutral-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-border flex justify-between items-center bg-surface-container-low">
              <div>
                <h3 className="font-bold text-base text-primary">Performance Evaluation Form</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Employee Name: <span className="font-bold text-on-surface">{employees.find(e => e.id === editingPerformance.employeeId)?.name}</span> (ID: {editingPerformance.employeeId})</p>
              </div>
              <button 
                onClick={() => setEditingPerformance(null)}
                className="p-1.5 rounded-full hover:bg-neutral-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-left">
              {/* Rating Section */}
              <div className="space-y-2">
                <label className="block font-bold text-on-surface">Overall Rating Rating</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFormRating(star)}
                      className="text-amber-400 hover:scale-115 transition-transform"
                    >
                      <Star className={`w-7 h-7 ${star <= formRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                  <span className="font-bold text-on-surface-variant ml-2 font-mono text-base">{formRating}.0 / 5.0</span>
                </div>
              </div>

              {/* Slider Core Skills Scores */}
              <div className="space-y-4 pt-2 border-t border-neutral-border/30">
                <h4 className="font-bold text-primary">Performance Criteria Grades</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Teamwork */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase">Teamwork ({formTeamwork}/5)</label>
                    <input 
                      type="range" min="1" max="5" 
                      value={formTeamwork} 
                      onChange={(e) => setFormTeamwork(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  {/* Communication */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase">Communication ({formCommunication}/5)</label>
                    <input 
                      type="range" min="1" max="5" 
                      value={formCommunication} 
                      onChange={(e) => setFormCommunication(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  {/* Problem Solving */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase">Problem Solving ({formProblemSolving}/5)</label>
                    <input 
                      type="range" min="1" max="5" 
                      value={formProblemSolving} 
                      onChange={(e) => setFormProblemSolving(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Text Area Inputs */}
              <div className="space-y-4 pt-2 border-t border-neutral-border/30">
                <div>
                  <label className="block font-bold text-on-surface mb-1">Self-Evaluation Statement</label>
                  <textarea
                    rows={3}
                    value={formSelfEval}
                    onChange={(e) => setFormSelfEval(e.target.value)}
                    placeholder="Describe achievements, skills shown, and areas of improvements from employee perspective..."
                    className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Manager Feedback Comments</label>
                  <textarea
                    rows={3}
                    value={formComments}
                    onChange={(e) => setFormComments(e.target.value)}
                    placeholder="Provide authoritative developmental reviews, highlighting strengths and concrete growth vectors..."
                    className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Goals list */}
              <div className="space-y-3 pt-2 border-t border-neutral-border/30">
                <label className="block font-bold text-on-surface">Target Professional Goals (Nov 2026 - Oct 2027)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGoalInput}
                    onChange={(e) => setNewGoalInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                    placeholder="E.g. Transition React frontend to TS strict-mode, lead product design..."
                    className="flex-1 bg-white border border-neutral-border rounded px-2.5 py-1.5 text-xs outline-none"
                  />
                  <button 
                    onClick={handleAddGoal}
                    className="bg-primary text-white p-1.5 rounded hover:bg-primary-container shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {formGoals.length > 0 ? (
                  <ul className="space-y-1.5">
                    {formGoals.map((goal, index) => (
                      <li key={index} className="flex justify-between items-center p-2 bg-surface-container-low rounded border border-neutral-border/50 text-xs">
                        <span className="font-medium text-on-surface">{goal}</span>
                        <button 
                          onClick={() => handleRemoveGoal(index)}
                          className="text-error hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-on-surface-variant italic">No target goals specified. Add some above.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-border flex justify-end gap-2 bg-surface-container-low">
              <button
                onClick={() => setEditingPerformance(null)}
                className="px-4 py-2 bg-white border border-neutral-border hover:bg-surface-container rounded text-xs font-semibold"
              >
                Close Without Saving
              </button>
              <button
                onClick={handleSaveEvaluation}
                className="px-4 py-2 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-container"
              >
                Save Evaluation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
