/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Printer, 
  User, 
  UploadCloud, 
  CheckCircle2, 
  FileSpreadsheet, 
  FileCode,
  Building2,
  AlertCircle,
  Check
} from 'lucide-react';
import { Employee, CorporateEntity } from '../types';

interface StatutoryForm {
  id: string;
  code: string;
  title: string;
  agency: 'EPF' | 'SOCSO' | 'LHDN' | 'HRD Corp';
  description: string;
  lastUpdated: string;
  fileFormat: string;
}

const STATUTORY_FORMS: StatutoryForm[] = [
  {
    id: 'F-001',
    code: 'Form EA (Borang EA)',
    title: 'Statement of Remuneration from Employment',
    agency: 'LHDN',
    description: 'Mandatory annual statement of employee earnings, EPF/SOCSO contributions, and PCB deductions filed for personal income tax declaration.',
    lastUpdated: 'Jan 2026',
    fileFormat: 'PDF'
  },
  {
    id: 'F-002',
    code: 'Borang CP22',
    title: 'Notification of Employment of Employee',
    agency: 'LHDN',
    description: 'Statutory notification submitted to LHDN within 30 days of onboarding a new eligible corporate employee.',
    lastUpdated: 'Oct 2025',
    fileFormat: 'PDF'
  },
  {
    id: 'F-003',
    code: 'Form CP21',
    title: 'Notification of Employee Cessation of Service',
    agency: 'LHDN',
    description: 'Official clearance application submitted at least 30 days prior to employee departure or retirement to audit tax compliance.',
    lastUpdated: 'May 2024',
    fileFormat: 'PDF'
  },
  {
    id: 'F-004',
    code: 'KWSP Borang A',
    title: 'Monthly EPF Contribution Submission Sheet',
    agency: 'EPF',
    description: 'Standard monthly schedules mapping individual worker retirement contributions submitted alongside bank transactions.',
    lastUpdated: 'Nov 2025',
    fileFormat: 'PDF'
  },
  {
    id: 'F-005',
    code: 'SOCSO Borang 1 & 2',
    title: 'Employer & Employee Social Security Registration',
    agency: 'SOCSO',
    description: 'Standard registration templates filed when setting up coverage or reporting first-time employees to PERKESO.',
    lastUpdated: 'Jul 2023',
    fileFormat: 'PDF'
  },
  {
    id: 'F-006',
    code: 'Borang CP38',
    title: 'Monthly Installment Tax Deduction Instruction',
    agency: 'LHDN',
    description: 'Mandated monthly additional deduction directives issued to employers on behalf of specific employees to clear historical tax arrears.',
    lastUpdated: 'Oct 2025',
    fileFormat: 'PDF'
  }
];

interface FormsDirectoryViewProps {
  employees: Employee[];
  onShowNotification: (title: string, message: string) => void;
  activeEntity?: CorporateEntity;
}

export default function FormsDirectoryView({
  employees,
  onShowNotification,
  activeEntity
}: FormsDirectoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [agencyFilter, setAgencyFilter] = useState<'All' | 'EPF' | 'SOCSO' | 'LHDN' | 'HRD Corp'>('All');
  
  // Interactive PDF Form Auto-Generator State
  const [selectedFormId, setSelectedFormId] = useState('F-001'); // Default Form EA
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [generatedPdfMock, setGeneratedPdfMock] = useState<any>(null);

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, date: string, size: string}[]>([]);

  const filteredForms = STATUTORY_FORMS.filter(form => {
    const matchesSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          form.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          form.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgency = agencyFilter === 'All' || form.agency === agencyFilter;
    return matchesSearch && matchesAgency;
  });

  const handleGenerateForm = () => {
    const emp = employees.find(e => e.id === selectedEmployeeId);
    const form = STATUTORY_FORMS.find(f => f.id === selectedFormId);
    
    if (!emp || !form) return;

    // Simulate pre-populating fields
    const mockPdfData = {
      formCode: form.code,
      formTitle: form.title,
      agency: form.agency,
      employeeName: emp.name,
      nricPassport: emp.nricPassport || '920412-14-5511',
      taxNumber: emp.taxNumber || 'SG-2938491039',
      epfNo: emp.epfNumber || 'EPF-19283749',
      basicSalary: emp.basicSalary,
      housingAllowance: emp.housingAllowance,
      transportAllowance: emp.transportAllowance,
      epfContribution: emp.basicSalary * 0.11,
      socsoContribution: 19.85,
      taxPcb: emp.taxPcb,
      dateGenerated: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    };

    setGeneratedPdfMock(mockPdfData);
    onShowNotification(
      'Statutory PDF Form Generated',
      `Form ${form.code} has been dynamically auto-compiled with credentials from ${emp.name}.`
    );
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const newFile = {
        name: file.name,
        date: new Date().toISOString().split('T')[0],
        size: (file.size / 1024).toFixed(1) + ' KB'
      };
      setUploadedFiles([newFile, ...uploadedFiles]);
      onShowNotification('Statutory Form Uploaded', `Successfully uploaded signed ${file.name} to HR registry.`);
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFile = {
        name: file.name,
        date: new Date().toISOString().split('T')[0],
        size: (file.size / 1024).toFixed(1) + ' KB'
      };
      setUploadedFiles([newFile, ...uploadedFiles]);
      onShowNotification('Statutory Form Uploaded', `Successfully uploaded signed ${file.name} to HR registry.`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200 text-left">
      <div className="border-b border-neutral-border pb-4">
        <h1 className="text-3xl font-bold text-on-background tracking-tight">Statutory Forms</h1>
        <p className="text-on-surface-variant text-xs mt-1">
          Access, pre-populate official statutory templates or view compliance registries.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left column: Searchable forms list & Drag/Drop Upload */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-start">
          
          <div className="bg-white border border-neutral-border rounded-lg p-5 shadow-sm space-y-4">
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  placeholder="Search form code, title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-neutral-border hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary rounded pl-9 pr-4 py-2 text-xs transition-all outline-hidden text-on-surface"
                />
              </div>

              {/* Agency filter row */}
              <div className="flex items-center gap-1">
                {(['All', 'EPF', 'SOCSO', 'LHDN', 'HRD Corp'] as const).map(agency => (
                  <button
                    key={agency}
                    onClick={() => setAgencyFilter(agency)}
                    className={`px-2.5 py-1.5 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                      agencyFilter === agency
                        ? 'bg-primary border-primary text-white shadow-xs'
                        : 'bg-white border-neutral-border/80 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {agency}
                  </button>
                ))}
              </div>
            </div>

            {/* Forms list */}
            <div className="divide-y divide-neutral-100 max-h-[360px] overflow-y-auto pr-1">
              {filteredForms.length === 0 ? (
                <div className="text-center py-12 text-xs text-on-surface-variant/80">
                  No statutory templates match your filter settings.
                </div>
              ) : (
                filteredForms.map(form => (
                  <div key={form.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary-container/10 px-2 py-0.5 rounded">
                          {form.code}
                        </span>
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-neutral-100 text-on-surface-variant rounded">
                          {form.agency}
                        </span>
                      </div>
                      <h3 className="font-bold text-xs text-on-surface leading-snug">{form.title}</h3>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">{form.description}</p>
                      <div className="text-[10px] text-on-surface-variant/70 font-mono">
                        Last Updated: {form.lastUpdated} · Format: {form.fileFormat}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedFormId(form.id);
                          onShowNotification('Form Selected', `Template ${form.code} selected for dynamic auto-population.`);
                        }}
                        className="px-2.5 py-1.5 bg-primary-container/5 hover:bg-primary-container/10 text-primary border border-primary/20 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Auto-fill
                      </button>
                      
                      <button
                        onClick={() => {
                          onShowNotification('Template Downloaded', `PDF template for ${form.code} downloaded successfully.`);
                        }}
                        className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-on-surface rounded transition-colors cursor-pointer"
                        title="Download blank template"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Drag & Drop Submission Box */}
          <div className="bg-white border border-neutral-border rounded-lg p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-sm text-on-background">Upload Completed Statutory Submissions</h3>
              <p className="text-xs text-on-surface-variant">Upload signed and chopped statutory documents for employee personnel archives.</p>
            </div>

            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all flex flex-col items-center justify-center gap-2 ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-neutral-border hover:border-primary/50 bg-neutral-50/50'
              }`}
            >
              <UploadCloud className="w-8 h-8 text-on-surface-variant/60" />
              <div className="text-xs text-on-surface-variant">
                Drag and drop your filled PDF files here, or{' '}
                <label className="text-primary font-bold hover:underline cursor-pointer">
                  browse files
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.xlsx,.csv"
                    onChange={handleManualUpload}
                  />
                </label>
              </div>
              <span className="text-[10px] text-on-surface-variant/60 font-mono">Supports PDF, XLSX up to 10MB</span>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2 border-t border-neutral-100 pt-3">
                <span className="text-[10px] text-on-surface-variant block uppercase font-bold tracking-wide">Uploaded Submissions Log</span>
                <div className="space-y-1.5">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-neutral-50 p-2 rounded border border-neutral-border/40 text-[11px] font-mono">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        <span className="text-on-surface font-semibold truncate">{file.name}</span>
                      </div>
                      <span className="text-on-surface-variant/70 shrink-0">{file.date} ({file.size})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right column: Dynamic Form Preview & Compliant compiler */}
        <div className="lg:col-span-5 bg-white border border-neutral-border rounded-lg p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-on-background">Live Pre-fill Generator</h2>
              <p className="text-xs text-on-surface-variant">Select an employee and click "Auto-compile" to dynamically inject current payroll and identity parameters into the active statutory document.</p>
            </div>

            <div className="space-y-4">
              {/* Form Selection parameter */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Target Template</label>
                <select 
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="w-full bg-white border border-neutral-border hover:border-primary/50 focus:border-primary rounded px-3 py-2 text-xs transition-colors outline-hidden text-on-surface cursor-pointer"
                >
                  {STATUTORY_FORMS.map(f => (
                    <option key={f.id} value={f.id}>{f.code} · {f.agency}</option>
                  ))}
                </select>
              </div>

              {/* Employee Selection parameter */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Target Employee Record</label>
                <select 
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-white border border-neutral-border hover:border-primary/50 focus:border-primary rounded px-3 py-2 text-xs transition-colors outline-hidden text-on-surface cursor-pointer"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleGenerateForm}
                className="w-full bg-primary hover:opacity-95 text-white font-semibold py-2 rounded transition-opacity shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Auto-compile Compliant Form
              </button>
            </div>

            {/* Simulated Live Form Rendering Canvas */}
            {generatedPdfMock ? (
              <div className="border border-neutral-300 rounded-lg overflow-hidden bg-neutral-100 shadow-inner p-4 text-center select-none font-sans space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center text-[9px] text-on-surface-variant font-mono border-b pb-2">
                  <span>MALAYSIA STATUTORY DOCK</span>
                  <span className="font-bold text-primary">{generatedPdfMock.agency} DEPT</span>
                </div>
                
                {/* Simulated Statutory EA Sheet */}
                <div className="bg-white p-4 text-left border rounded shadow-md text-[10px] space-y-3 font-mono leading-relaxed text-[#1a1a1a]">
                  <div className="text-center border-b pb-2 space-y-1">
                    <h3 className="font-bold text-xs uppercase text-primary leading-tight">{generatedPdfMock.formCode}</h3>
                    <p className="text-[8px] text-on-surface-variant leading-normal uppercase">{generatedPdfMock.formTitle}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                    <div>Name: <strong className="font-bold font-sans">{generatedPdfMock.employeeName}</strong></div>
                    <div>MyID/NRIC: <strong>{generatedPdfMock.nricPassport}</strong></div>
                    <div>LHDN TIN: <strong>{generatedPdfMock.taxNumber}</strong></div>
                    <div>KWSP No: <strong>{generatedPdfMock.epfNo}</strong></div>
                  </div>

                  <div className="border-t border-b py-2 space-y-1.5 text-[9px]">
                    <div className="flex justify-between">
                      <span>A. GROSS SALARY:</span>
                      <strong className="font-sans">RM {generatedPdfMock.basicSalary.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>B. TAXABLE ALLOWANCES:</span>
                      <strong className="font-sans">RM {(generatedPdfMock.housingAllowance + generatedPdfMock.transportAllowance).toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-primary">
                      <span>C. MONTHLY TAX DEDUCTION (PCB):</span>
                      <strong className="font-sans">RM {generatedPdfMock.taxPcb.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>D. EMPLOYEE KWSP RETIREMENT:</span>
                      <strong className="font-sans">RM {generatedPdfMock.epfContribution.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[8px] text-on-surface-variant">
                    <span>Generated on {generatedPdfMock.dateGenerated}</span>
                    <span className="text-green-600 font-bold uppercase tracking-wider flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3 text-green-600" /> Digital Signature Ready
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => onShowNotification('Statutory PDF Downloaded', 'Pre-filled statutory form saved to Downloads directory.')}
                    className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    Download Pre-filled PDF
                  </button>
                  <button 
                    onClick={() => {
                      setGeneratedPdfMock(null);
                      onShowNotification('Form Cleared', 'Live form compiler view refreshed.');
                    }}
                    className="py-1.5 px-3 bg-neutral-200 hover:bg-neutral-300 text-on-surface rounded font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-neutral-200 rounded-lg p-12 text-center text-xs text-on-surface-variant/70 flex flex-col items-center justify-center gap-2">
                <FileCode className="w-12 h-12 text-on-surface-variant/30" />
                <span>No compiled draft form active. Select parameters and click "Auto-compile" above to see the interactive statutory output.</span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 border-t border-neutral-100 p-2 bg-primary/5 rounded border border-primary/20 text-[10px] text-primary leading-normal flex items-start gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-primary mt-0.5" />
            <span>Form definitions compliant with Inland Revenue Board (LHDN), KWSP and SOCSO 2026 guidelines.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
