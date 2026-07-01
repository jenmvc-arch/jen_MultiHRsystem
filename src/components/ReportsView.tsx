/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  CheckCircle, 
  Sliders, 
  Layers,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { Employee, EmployeePerformance } from '../types';

interface ReportsViewProps {
  employees: Employee[];
  performances: EmployeePerformance[];
  onShowNotification: (title: string, message: string) => void;
}

export default function ReportsView({
  employees,
  performances,
  onShowNotification
}: ReportsViewProps) {
  // Config state
  const [reportType, setReportType] = useState('Departmental Metrics Breakdown');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  
  // Targeted audience checkboxes
  const [audience, setAudience] = useState<Record<string, boolean>>({
    'Engineering': true,
    'Product': true,
    'Human Resources': false,
    'Marketing': false
  });

  // Metrics checkboxes
  const [metrics, setMetrics] = useState<Record<string, boolean>>({
    'Teamwork': true,
    'Communication': true,
    'Problem Solving': true,
    'Goals Completion': false
  });

  // Export formats
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv' | 'ppt'>('pdf');

  // Loading animation simulation
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleAudienceChange = (dept: string) => {
    setAudience(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  const handleMetricChange = (metric: string) => {
    setMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  // Compute live preview metrics
  const activeDepts = Object.keys(audience).filter(k => audience[k]);
  const activeMetricsList = Object.keys(metrics).filter(k => metrics[k]);
  
  const impactedEmployees = employees.filter(e => activeDepts.includes(e.department));
  const averageRating = impactedEmployees.length > 0 
    ? (performances
        .filter(p => impactedEmployees.some(e => e.id === p.employeeId))
        .reduce((acc, curr) => acc + curr.rating, 0) / 
        performances.filter(p => impactedEmployees.some(e => e.id === p.employeeId)).length || 3.9)
    : 0;

  const handleGenerateReport = () => {
    if (activeDepts.length === 0) {
      onShowNotification('Configuration Empty', 'Please select at least one department under Target Audience.');
      return;
    }
    if (activeMetricsList.length === 0) {
      onShowNotification('Configuration Empty', 'Please select at least one core metric to export.');
      return;
    }

    setIsExporting(true);
    setExportProgress(10);
    
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsExporting(false);
            onShowNotification(
              'Report Export Complete',
              `Your ${reportType} report has been compiled and downloaded in ${format.toUpperCase()} format.`
            );
          }, 300);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Left Side: Report Export Configuration Form */}
        <section className="flex-1 border border-neutral-border bg-white rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-bold text-primary tracking-tight">Performance Report Export</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Configure, compile, and schedule executive HR performance review packages.</p>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Report Package Type</label>
                <select 
                  value={reportType} 
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded border border-neutral-border bg-surface p-1.5 focus:border-primary outline-none"
                >
                  <option>Departmental Metrics Breakdown</option>
                  <option>Performance & Merit Eligibility Summary</option>
                  <option>Annual Goal Attainment Audit</option>
                </select>
              </div>

              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Start Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded border border-neutral-border bg-surface p-1 text-xs outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">End Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded border border-neutral-border bg-surface p-1 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Target Audience Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-neutral-border/30">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Target Audience (FTE Cohorts)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.keys(audience).map(dept => (
                  <label key={dept} className="flex items-center gap-2 p-2.5 bg-surface-container-low rounded border border-neutral-border/40 hover:border-primary transition-colors cursor-pointer text-xs">
                    <input 
                      type="checkbox" 
                      checked={audience[dept]} 
                      onChange={() => handleAudienceChange(dept)}
                      className="accent-primary"
                    />
                    <span className="font-semibold text-on-surface">{dept}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Core Metrics Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-neutral-border/30">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Core Evaluation Metrics</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.keys(metrics).map(metric => (
                  <label key={metric} className="flex items-center gap-2 p-2.5 bg-surface-container-low rounded border border-neutral-border/40 hover:border-primary transition-colors cursor-pointer text-xs">
                    <input 
                      type="checkbox" 
                      checked={metrics[metric]} 
                      onChange={() => handleMetricChange(metric)}
                      className="accent-primary"
                    />
                    <span className="font-semibold text-on-surface">{metric}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Output Formats selection */}
            <div className="space-y-2 pt-2 border-t border-neutral-border/30">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">File Format Output</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'pdf', label: 'Adobe PDF Document (.pdf)', desc: 'Executive printable copy' },
                  { id: 'excel', label: 'Microsoft Excel (.xlsx)', desc: 'Dynamic data sheets' },
                  { id: 'csv', label: 'CSV Comma Delimited (.csv)', desc: 'System import format' },
                  { id: 'ppt', label: 'PowerPoint (.pptx)', desc: 'Slide presentation deck' }
                ].map(item => (
                  <label 
                    key={item.id} 
                    className={`flex flex-col p-3 rounded border text-left cursor-pointer transition-colors ${
                      format === item.id ? 'border-primary bg-primary/5' : 'border-neutral-border/40 hover:border-neutral-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="report-format"
                        checked={format === item.id} 
                        onChange={() => setFormat(item.id as any)}
                        className="accent-primary"
                      />
                      <span className="font-bold text-xs text-on-surface">{item.id.toUpperCase()}</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant mt-1">{item.desc}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Action trigger footer */}
          <div className="pt-6 border-t border-neutral-border mt-6">
            {isExporting ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-primary">
                  <span>Compiling and bundling document packages...</span>
                  <span>{exportProgress}%</span>
                </div>
                <div className="w-full bg-surface-container-low rounded-full h-2 overflow-hidden border border-neutral-border/30">
                  <div 
                    style={{ width: `${exportProgress}%` }} 
                    className="bg-primary h-full rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerateReport}
                className="w-full md:w-auto bg-primary text-white py-2 px-6 rounded font-semibold text-sm hover:opacity-95 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Generate & Export Report
              </button>
            )}
          </div>
        </section>

        {/* Right Side: Live Compiled Report Outline */}
        <aside className="w-full lg:w-80 border border-neutral-border bg-surface-container-lowest rounded-lg p-5 shrink-0 shadow-sm flex flex-col justify-between">
          <div className="space-y-5 text-left">
            <h3 className="font-bold text-base text-primary border-b border-surface-container pb-2 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Live Summary
            </h3>

            <div className="space-y-4 text-xs leading-relaxed">
              <div className="p-3 bg-parchment/30 rounded border border-neutral-border/50">
                <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">Configured Package</span>
                <p className="font-bold text-sm text-primary mt-1 leading-tight">{reportType}</p>
              </div>

              <div className="space-y-2">
                <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">Date Segment</span>
                <p className="font-semibold text-on-surface flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> {startDate} to {endDate}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">Targeted Departments</span>
                {activeDepts.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeDepts.map(dept => (
                      <span key={dept} className="px-2 py-0.5 bg-primary/10 text-primary rounded-[3px] font-semibold text-[10px]">
                        {dept}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="italic text-error">Select target departments</p>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">Included Core Metrics</span>
                {activeMetricsList.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeMetricsList.map(metric => (
                      <span key={metric} className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-[3px] font-semibold text-[10px]">
                        {metric}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="italic text-error">Select metrics</p>
                )}
              </div>

              <div className="pt-2 border-t border-neutral-border/30 grid grid-cols-2 gap-2 text-center">
                <div className="bg-surface-container p-2 rounded">
                  <span className="text-on-surface-variant text-[9px] uppercase font-bold block leading-none">Impacted FTEs</span>
                  <span className="text-lg font-bold text-on-surface font-mono">{impactedEmployees.length}</span>
                </div>
                <div className="bg-surface-container p-2 rounded">
                  <span className="text-on-surface-variant text-[9px] uppercase font-bold block leading-none">Cohort Rating</span>
                  <span className="text-lg font-bold text-primary font-mono">
                    {averageRating > 0 ? averageRating.toFixed(1) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-border/30 text-center">
            <span className="text-[10px] text-on-surface-variant italic font-semibold">
              Ready for executive presentation
            </span>
          </div>
        </aside>

      </div>
    </div>
  );
}
