/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  ArrowLeftRight, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Upload, 
  Info,
  Calendar,
  Lock
} from 'lucide-react';
import { SOCSOConfiguration, SOCSOBracket, SOCSOPhase } from '../types';
import { generateOfficialSocsoBrackets } from '../data';

export default function SocsoConfigAdminView() {
  const [configs, setConfigs] = useState<SOCSOConfiguration[]>([]);
  const [brackets, setBrackets] = useState<SOCSOBracket[]>([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState<'configs' | 'brackets' | 'compare'>('configs');
  const [compareSourceId, setCompareSourceId] = useState<string>('');
  const [compareTargetId, setCompareTargetId] = useState<string>('');
  
  // New config form states
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);
  const [newConfig, setNewConfig] = useState<Partial<SOCSOConfiguration>>({
    id: '',
    schemeCode: 'LINDUNG_24_JAM',
    legislation: 'Employees Social Security Act 1969, Act 4',
    contributionCategory: 'FIRST_CATEGORY',
    phase: 'LINDUNG24_PHASE_1',
    effectiveFrom: '',
    effectiveTo: '',
    wageCeiling: 6000,
    sourceDocument: '',
    sourceDocumentDate: '',
    sourceVersion: '',
    status: 'draft'
  });

  // CSV Import states
  const [csvText, setCsvText] = useState('');
  const [selectedConfigIdForImport, setSelectedConfigIdForImport] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Load from localStorage on mount
  useEffect(() => {
    const savedConfigs = localStorage.getItem('socso_configurations');
    const savedBrackets = localStorage.getItem('socso_contribution_brackets');
    if (savedConfigs) setConfigs(JSON.parse(savedConfigs));
    if (savedBrackets) setBrackets(JSON.parse(savedBrackets));
  }, []);

  const saveToStorage = (newConfigs: SOCSOConfiguration[], newBrackets: SOCSOBracket[]) => {
    localStorage.setItem('socso_configurations', JSON.stringify(newConfigs));
    localStorage.setItem('socso_contribution_brackets', JSON.stringify(newBrackets));
    setConfigs(newConfigs);
    setBrackets(newBrackets);
  };

  // Helper validation
  const validateBracketsContinuity = (configId: string): string[] => {
    const list = brackets.filter(b => b.configurationId === configId).sort((a, b) => a.wageBracketNumber - b.wageBracketNumber);
    const errors: string[] = [];
    if (list.length === 0) return ['No brackets exist for this configuration.'];

    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const curr = list[i];
      if (prev.upperWageLimit !== curr.lowerWageLimit) {
        errors.push(`Discontinuity detected between Bracket #${prev.wageBracketNumber} (upper: RM ${prev.upperWageLimit}) and Bracket #${curr.wageBracketNumber} (lower: RM ${curr.lowerWageLimit}).`);
      }
    }

    // Verify ceiling exists (RM 6,000)
    const hasCeiling = list.some(b => b.lowerWageLimit === 6000 || b.upperWageLimit >= 6000);
    if (!hasCeiling) {
      errors.push('No RM6,000 ceiling bracket exists in this configuration.');
    }

    return errors;
  };

  const handleCreateConfig = () => {
    if (!newConfig.id || !newConfig.effectiveFrom || !newConfig.effectiveTo) {
      alert('Please fill out Config ID and date range fields.');
      return;
    }

    // Overlap check
    const isOverlap = configs.some(c => {
      return c.contributionCategory === newConfig.contributionCategory &&
        ((newConfig.effectiveFrom! >= c.effectiveFrom && newConfig.effectiveFrom! <= c.effectiveTo) ||
         (newConfig.effectiveTo! >= c.effectiveFrom && newConfig.effectiveTo! <= c.effectiveTo));
    });

    if (isOverlap) {
      alert('Error: The effective date range overlaps with an existing configuration of the same category.');
      return;
    }

    const created: SOCSOConfiguration = {
      id: newConfig.id,
      schemeCode: newConfig.schemeCode || 'LINDUNG_24_JAM',
      legislation: newConfig.legislation || 'Employees Social Security Act 1969, Act 4',
      contributionCategory: newConfig.contributionCategory as any || 'FIRST_CATEGORY',
      phase: newConfig.phase as SOCSOPhase || 'LINDUNG24_PHASE_1',
      effectiveFrom: newConfig.effectiveFrom,
      effectiveTo: newConfig.effectiveTo,
      wageCeiling: newConfig.wageCeiling || 6000,
      sourceDocument: newConfig.sourceDocument || 'Admin Input',
      sourceDocumentDate: newConfig.sourceDocumentDate || '',
      sourceVersion: newConfig.sourceVersion || 'v1.0',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Auto-populate brackets programmatically for quick draft creation
    const autoBrackets = generateOfficialSocsoBrackets(created.id, created.contributionCategory, created.phase);

    saveToStorage([...configs, created], [...brackets, ...autoBrackets]);
    setIsCreatingConfig(false);
    alert('Statutory configuration draft created successfully with auto-populated PERKESO brackets!');
  };

  const handleApprove = (id: string) => {
    const continuityErrors = validateBracketsContinuity(id);
    if (continuityErrors.length > 0) {
      alert('Cannot approve configuration due to continuity errors:\n' + continuityErrors.join('\n'));
      return;
    }

    const updated = configs.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: 'approved' as const,
          approvedBy: 'statutory-approver@nexus.com',
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    saveToStorage(updated, brackets);
    alert('Configuration status updated to Approved.');
  };

  const handleDeactivate = (id: string) => {
    const updated = configs.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: 'deactivated' as const,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    saveToStorage(updated, brackets);
    alert('Configuration deactivated.');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration and all its associated brackets?')) return;
    const updatedConfigs = configs.filter(c => c.id !== id);
    const updatedBrackets = brackets.filter(b => b.configurationId !== id);
    saveToStorage(updatedConfigs, updatedBrackets);
  };

  const handleImportCsv = () => {
    if (!selectedConfigIdForImport) {
      setImportStatus({ type: 'error', message: 'Please select a target configuration.' });
      return;
    }
    if (!csvText.trim()) {
      setImportStatus({ type: 'error', message: 'CSV input is empty.' });
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      const header = lines[0].split(',');
      const tempBrackets: SOCSOBracket[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 10) continue;

        tempBrackets.push({
          id: `${selectedConfigIdForImport}-imported-${i}`,
          configurationId: selectedConfigIdForImport,
          contributionCategory: 'FIRST_CATEGORY', // fallback/default
          lowerWageLimit: parseFloat(parts[0]),
          upperWageLimit: parseFloat(parts[1]),
          lowerLimitInclusive: parts[2] === 'true',
          upperLimitInclusive: parts[3] === 'true',
          wageBracketNumber: parseInt(parts[4]),
          assumedMonthlyWage: parseFloat(parts[5]),
          employerEmploymentInjury: parseFloat(parts[6]),
          employerInvalidity: parseFloat(parts[7]),
          employerTotal: parseFloat(parts[6]) + parseFloat(parts[7]),
          employeeInvalidity: parseFloat(parts[8]),
          employeeNonEmploymentInjury: parseFloat(parts[9]),
          employeeTotal: parseFloat(parts[8]) + parseFloat(parts[9]),
          combinedTotal: parseFloat(parts[6]) + parseFloat(parts[7]) + parseFloat(parts[8]) + parseFloat(parts[9]),
          effectiveFrom: '2026-06-01',
          effectiveTo: '9999-12-31'
        });
      }

      // Check imported continuity
      const config = configs.find(c => c.id === selectedConfigIdForImport);
      if (!config) throw new Error('Target configuration not found.');

      // Overwrite brackets for this configuration
      const filteredBrackets = brackets.filter(b => b.configurationId !== selectedConfigIdForImport);
      const newBracketsList = [...filteredBrackets, ...tempBrackets.map(b => ({ ...b, contributionCategory: config.contributionCategory }))];

      saveToStorage(configs, newBracketsList);
      setImportStatus({ type: 'success', message: `Imported ${tempBrackets.length} brackets successfully!` });
      setCsvText('');
    } catch (err: any) {
      setImportStatus({ type: 'error', message: 'Failed to parse CSV: ' + err.message });
    }
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        
        if (!data.schedule_code || !data.rows || !Array.isArray(data.rows)) {
          alert('Invalid JSON file format. Must contain schedule_code and rows array.');
          return;
        }

        // Create/Update FIRST_CATEGORY and SECOND_CATEGORY configs
        const c1Id = `cfg-${data.schedule_code.toLowerCase()}-c1`;
        const c2Id = `cfg-${data.schedule_code.toLowerCase()}-c2`;

        const newC1Config: SOCSOConfiguration = {
          id: c1Id,
          schemeCode: 'SOCSO_ACT4',
          legislation: data.schedule_name || 'PERKESO Act 4',
          contributionCategory: 'FIRST_CATEGORY',
          phase: 'LINDUNG24_PHASE_1',
          effectiveFrom: data.effective_from ? data.effective_from.substring(0, 7) : '2026-06',
          effectiveTo: data.effective_to ? data.effective_to.substring(0, 7) : '9999-12',
          wageCeiling: (data.wage_ceiling_sen || 600000) / 100,
          sourceDocument: data.official_source || 'JSON Import',
          sourceDocumentDate: new Date().toISOString().substring(0, 10),
          sourceVersion: '1.0',
          status: 'draft',
          approvedBy: '',
          approvedAt: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const newC2Config: SOCSOConfiguration = {
          ...newC1Config,
          id: c2Id,
          contributionCategory: 'SECOND_CATEGORY',
          schemeCode: 'LINDUNG_24_JAM'
        };

        // Create brackets
        const newBrackets: SOCSOBracket[] = [];
        data.rows.forEach((r: any) => {
          // Category 1 Bracket
          newBrackets.push({
            id: `${c1Id}-imported-${r.bracket_number}`,
            configurationId: c1Id,
            contributionCategory: 'FIRST_CATEGORY',
            lowerWageLimit: (r.lower_bound_sen || 0) / 100,
            upperWageLimit: (r.upper_bound_sen || 0) / 100,
            lowerLimitInclusive: r.lower_bound_inclusive ?? false,
            upperLimitInclusive: r.upper_bound_inclusive ?? true,
            wageBracketNumber: r.bracket_number,
            assumedMonthlyWage: ((r.lower_bound_sen + r.upper_bound_sen) / 2) / 100,
            employerEmploymentInjury: (r.category1_employer_employment_injury_sen || 0) / 100,
            employerInvalidity: (r.category1_employer_invalidity_sen || 0) / 100,
            employerTotal: (r.category1_employer_total_sen || 0) / 100,
            employeeInvalidity: (r.category1_employee_invalidity_sen || 0) / 100,
            employeeNonEmploymentInjury: (r.category1_employee_lindung24_sen || 0) / 100,
            employeeTotal: (r.category1_employee_total_sen || 0) / 100,
            combinedTotal: (r.category1_grand_total_sen || 0) / 100,
            effectiveFrom: '2026-06-01',
            effectiveTo: '9999-12-31'
          });

          // Category 2 Bracket
          newBrackets.push({
            id: `${c2Id}-imported-${r.bracket_number}`,
            configurationId: c2Id,
            contributionCategory: 'SECOND_CATEGORY',
            lowerWageLimit: (r.lower_bound_sen || 0) / 100,
            upperWageLimit: (r.upper_bound_sen || 0) / 100,
            lowerLimitInclusive: r.lower_bound_inclusive ?? false,
            upperLimitInclusive: r.upper_bound_inclusive ?? true,
            wageBracketNumber: r.bracket_number,
            assumedMonthlyWage: ((r.lower_bound_sen + r.upper_bound_sen) / 2) / 100,
            employerEmploymentInjury: (r.category2_employer_employment_injury_sen || 0) / 100,
            employerInvalidity: 0,
            employerTotal: (r.category2_employer_total_sen || 0) / 100,
            employeeInvalidity: 0,
            employeeNonEmploymentInjury: (r.category2_employee_lindung24_sen || 0) / 100,
            employeeTotal: (r.category2_employee_total_sen || 0) / 100,
            combinedTotal: (r.category2_grand_total_sen || 0) / 100,
            effectiveFrom: '2026-06-01',
            effectiveTo: '9999-12-31'
          });
        });

        // Filter out existing configs and add new ones
        const filteredConfigs = configs.filter(c => c.id !== c1Id && c.id !== c2Id);
        const filteredBrackets = brackets.filter(b => b.configurationId !== c1Id && b.configurationId !== c2Id);

        saveToStorage([...filteredConfigs, newC1Config, newC2Config], [...filteredBrackets, ...newBrackets]);
        setImportStatus({ type: 'success', message: `Successfully imported JSON config! Added ${data.rows.length * 2} brackets across FIRST & SECOND categories under drafts ${c1Id} & ${c2Id}.` });
      } catch (err: any) {
        setImportStatus({ type: 'error', message: 'Failed to parse JSON: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  const getComparison = () => {
    const srcList = brackets.filter(b => b.configurationId === compareSourceId).sort((a, b) => a.wageBracketNumber - b.wageBracketNumber);
    const tgtList = brackets.filter(b => b.configurationId === compareTargetId).sort((a, b) => a.wageBracketNumber - b.wageBracketNumber);

    return srcList.map((src, i) => {
      const tgt = tgtList[i];
      return {
        bracketNum: src.wageBracketNumber,
        wages: src.assumedMonthlyWage,
        srcEmpTotal: src.employerTotal,
        tgtEmpTotal: tgt ? tgt.employerTotal : null,
        srcEmployeeTotal: src.employeeTotal,
        tgtEmployeeTotal: tgt ? tgt.employeeTotal : null,
        diffEmployer: tgt ? tgt.employerTotal - src.employerTotal : null,
        diffEmployee: tgt ? tgt.employeeTotal - src.employeeTotal : null
      };
    });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-rose-600" /> PERKESO / SOCSO Configurations
          </h2>
          <p className="text-sm text-slate-500">Manage statutory versioned rates, active wage ceiling rules, and import official bracket schedules.</p>
        </div>
        <button
          onClick={() => setIsCreatingConfig(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition shadow-sm shadow-rose-100"
        >
          <Plus className="w-4 h-4" /> Create Version Configuration
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('configs')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition ${activeTab === 'configs' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Configurations List
        </button>
        <button
          onClick={() => setActiveTab('brackets')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition ${activeTab === 'brackets' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Statutory CSV Importer
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition ${activeTab === 'compare' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Rate Table Comparison
        </button>
      </div>

      {/* Draft Creator Form Modal */}
      {isCreatingConfig && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-100 overflow-hidden">
            <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">Create Contribution Table Version</h3>
              <button onClick={() => setIsCreatingConfig(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Configuration ID (Unique)</label>
                  <input
                    type="text"
                    value={newConfig.id}
                    onChange={e => setNewConfig({ ...newConfig, id: e.target.value })}
                    placeholder="cfg-lindung24-phase-1"
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Statutory Scheme Code</label>
                  <select
                    value={newConfig.schemeCode}
                    onChange={e => setNewConfig({ ...newConfig, schemeCode: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="SOCSO_ACT4">SOCSO Act 4</option>
                    <option value="LINDUNG_24_JAM">LINDUNG 24 Jam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Contribution Category</label>
                  <select
                    value={newConfig.contributionCategory}
                    onChange={e => setNewConfig({ ...newConfig, contributionCategory: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="FIRST_CATEGORY">First Category (Injury & Invalidity)</option>
                    <option value="SECOND_CATEGORY">Second Category (Injury & LINDUNG 24)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Legislative Phase</label>
                  <select
                    value={newConfig.phase}
                    onChange={e => setNewConfig({ ...newConfig, phase: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="PRE_JUNE_2026">Pre-June 2026 Table</option>
                    <option value="LINDUNG24_PHASE_1">LINDUNG 24 Jam - Phase 1 (0.75%)</option>
                    <option value="LINDUNG24_PHASE_2">LINDUNG 24 Jam - Phase 2 (1.00%)</option>
                    <option value="LINDUNG24_PHASE_3">LINDUNG 24 Jam - Phase 3 (1.25%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Effective From (YYYY-MM)</label>
                  <input
                    type="text"
                    value={newConfig.effectiveFrom}
                    onChange={e => setNewConfig({ ...newConfig, effectiveFrom: e.target.value })}
                    placeholder="2026-06"
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Effective To (YYYY-MM)</label>
                  <input
                    type="text"
                    value={newConfig.effectiveTo}
                    onChange={e => setNewConfig({ ...newConfig, effectiveTo: e.target.value })}
                    placeholder="9999-12"
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Source Document Title</label>
                  <input
                    type="text"
                    value={newConfig.sourceDocument}
                    onChange={e => setNewConfig({ ...newConfig, sourceDocument: e.target.value })}
                    placeholder="PERKESO Gazette June 2026"
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Source Version Reference</label>
                  <input
                    type="text"
                    value={newConfig.sourceVersion}
                    onChange={e => setNewConfig({ ...newConfig, sourceVersion: e.target.value })}
                    placeholder="v2.0"
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsCreatingConfig(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg font-semibold text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConfig}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-sm transition"
              >
                Create Version Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Config list */}
      {activeTab === 'configs' && (
        <div className="grid grid-cols-1 gap-6">
          {configs.map(cfg => {
            const continuityErrors = validateBracketsContinuity(cfg.id);
            return (
              <div key={cfg.id} className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-rose-50 text-rose-600 rounded-lg font-bold text-xs uppercase">
                      {cfg.phase}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-base">{cfg.id}</h4>
                      <p className="text-xs text-slate-500">{cfg.legislation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {cfg.status === 'draft' && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
                        Draft Component
                      </span>
                    )}
                    {cfg.status === 'approved' && (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                    {cfg.status === 'deactivated' && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                        Deactivated
                      </span>
                    )}
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full border border-rose-100">
                      {cfg.contributionCategory === 'FIRST_CATEGORY' ? 'First Category' : 'Second Category'}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Continuity warnings */}
                  {continuityErrors.length > 0 ? (
                    <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-800 rounded text-sm space-y-1">
                      <h5 className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-600" /> Continuity Warnings Detected</h5>
                      {continuityErrors.map((err, i) => (
                        <p key={i} className="text-xs">{err}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All bracket continuity and wage ceiling criteria are fully validated.
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-xs">Validity Period</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1"><Calendar className="w-4 h-4" /> {cfg.effectiveFrom} to {cfg.effectiveTo}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">Wage Ceiling Cap</span>
                      <span className="font-semibold text-slate-800">RM {cfg.wageCeiling.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">Source Reference Document</span>
                      <span className="font-semibold text-slate-800">{cfg.sourceDocument} (v{cfg.sourceVersion})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">Brackets Count</span>
                      <span className="font-semibold text-slate-800">
                        {brackets.filter(b => b.configurationId === cfg.id).length} official ranges
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t pt-4">
                    {cfg.status === 'draft' && (
                      <button
                        onClick={() => handleApprove(cfg.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve & Activate
                      </button>
                    )}
                    {cfg.status === 'approved' && (
                      <button
                        onClick={() => handleDeactivate(cfg.id)}
                        className="px-3.5 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold text-xs transition flex items-center gap-1 shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" /> Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(cfg.id)}
                      className="px-3.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg font-semibold text-xs transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Version
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Bracket Importer */}
      {activeTab === 'brackets' && (
        <div className="space-y-6">
          {/* JSON Importer */}
          <div className="bg-white rounded-xl shadow border border-slate-200 p-6 text-sm text-slate-700">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1">
              <Upload className="w-5 h-5 text-rose-600" /> Statutory JSON Importer
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Import a complete statutory configuration and bracket list directly from a standard JSON table file (like the official <code>PERKESO_ACT4_LINDUNG24</code> schema).
            </p>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <input
                type="file"
                accept=".json"
                onChange={handleJsonUpload}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
              />
            </div>
            {importStatus.type && importStatus.message.includes('JSON') && (
              <div className={`mt-4 p-3 rounded text-xs font-semibold flex items-center gap-2 ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                {importStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{importStatus.message}</span>
              </div>
            )}
          </div>

          {/* CSV Importer */}
          <div className="bg-white rounded-xl shadow border border-slate-200 p-6 text-sm text-slate-700">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1">
              <Upload className="w-5 h-5 text-rose-600" /> Bulk Import Brackets via CSV
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Overwrite bracket details for any draft configuration. Paste your CSV raw contents matching this schema: <br/>
              <code>LowerWageLimit,UpperWageLimit,LowerLimitInclusive,UpperLimitInclusive,WageBracketNumber,AssumedMonthlyWage,EmployerEmploymentInjury,EmployerInvalidity,EmployeeInvalidity,EmployeeNonEmploymentInjury</code>
            </p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Configuration</label>
                <select
                  value={selectedConfigIdForImport}
                  onChange={e => setSelectedConfigIdForImport(e.target.value)}
                  className="w-full md:w-1/3 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="">-- Select Target Draft Configuration --</option>
                  {configs.filter(c => c.status === 'draft').map(cfg => (
                    <option key={cfg.id} value={cfg.id}>{cfg.id} ({cfg.contributionCategory})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Paste CSV content:</label>
                <textarea
                  rows={8}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder="0.00,30.00,false,true,1,30.00,0.40,0.15,0.15,0.25"
                  className="w-full p-3 font-mono text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            {importStatus.type && !importStatus.message.includes('JSON') && (
              <div className={`p-3 rounded mb-4 text-xs font-semibold flex items-center gap-2 ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                {importStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{importStatus.message}</span>
              </div>
            )}

            <button
              onClick={handleImportCsv}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-4 h-4" /> Import CSV Brackets
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Comparison tool */}
      {activeTab === 'compare' && (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6 text-sm text-slate-700">
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-1">
            <ArrowLeftRight className="w-5 h-5 text-rose-600" /> Rate Table Comparison
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Source Table (Base)</label>
              <select
                value={compareSourceId}
                onChange={e => setCompareSourceId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              >
                <option value="">-- Select Source Config --</option>
                {configs.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Comparison Table</label>
              <select
                value={compareTargetId}
                onChange={e => setCompareTargetId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              >
                <option value="">-- Select Comparison Config --</option>
                {configs.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select>
            </div>
          </div>

          {compareSourceId && compareTargetId ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold">
                  <tr>
                    <th className="px-3 py-2">Assumed Wage</th>
                    <th className="px-3 py-2 text-right">Base Employer</th>
                    <th className="px-3 py-2 text-right">Compare Employer</th>
                    <th className="px-3 py-2 text-right">Employer Delta</th>
                    <th className="px-3 py-2 text-right">Base Employee</th>
                    <th className="px-3 py-2 text-right">Compare Employee</th>
                    <th className="px-3 py-2 text-right">Employee Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {getComparison().map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2">RM {row.wages.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">RM {row.srcEmpTotal.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{row.tgtEmpTotal !== null ? `RM ${row.tgtEmpTotal.toFixed(2)}` : '-'}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${row.diffEmployer && row.diffEmployer > 0 ? 'text-rose-600' : row.diffEmployer && row.diffEmployer < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {row.diffEmployer !== null ? (row.diffEmployer > 0 ? `+RM ${row.diffEmployer.toFixed(2)}` : `RM ${row.diffEmployer.toFixed(2)}`) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right">RM {row.srcEmployeeTotal.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{row.tgtEmployeeTotal !== null ? `RM ${row.tgtEmployeeTotal.toFixed(2)}` : '-'}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${row.diffEmployee && row.diffEmployee > 0 ? 'text-rose-600' : row.diffEmployee && row.diffEmployee < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {row.diffEmployee !== null ? (row.diffEmployee > 0 ? `+RM ${row.diffEmployee.toFixed(2)}` : `RM ${row.diffEmployee.toFixed(2)}`) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">Select both statutory configurations above to compare rates side-by-side.</p>
          )}
        </div>
      )}
    </div>
  );
}
