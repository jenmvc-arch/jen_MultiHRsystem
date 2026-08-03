import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Award,
  BookOpen,
  RotateCcw,
  Sparkles,
  UserCheck,
  GraduationCap,
  ClipboardCheck,
  FileCode,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { HANDBOOK_MODULES, QUIZ_QUESTIONS } from '../data';
import { exportFullSignedHandbookPdf } from '../utils/pdfExport';

interface TestAuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  category: 'Session' | 'Handbook' | 'Quiz' | 'Audit';
  detail: string;
  status: 'info' | 'success' | 'warning';
}

interface TestOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowNotification: (title: string, message: string) => void;
}

export const TestOnboardingModal: React.FC<TestOnboardingModalProps> = ({
  isOpen,
  onClose,
  onShowNotification,
}) => {
  // Test Candidate Profile
  const [testName, setTestName] = useState('Audit Test Trainee (Simulated)');
  const [testDept, setTestDept] = useState('Quality Assurance & Compliance');
  const [testPosition, setTestPosition] = useState('Operations Specialist');
  const [testEntity, setTestEntity] = useState('Red Point Sdn. Bhd.');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'flow' | 'handbook' | 'quiz' | 'audit'>('flow');

  // Simulation State
  const [sessionStarted, setSessionStarted] = useState(false);
  const [simulatedDay, setSimulatedDay] = useState(1);
  const [testInitials, setTestInitials] = useState<Record<number, string>>({});
  const [testFinalSignature, setTestFinalSignature] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizGrade, setQuizGrade] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);

  // Audit Event Logs
  const [logs, setLogs] = useState<TestAuditLogEntry[]>([
    {
      id: 'LOG-001',
      timestamp: new Date().toLocaleTimeString(),
      action: 'Test Sandbox Initialized',
      category: 'Session',
      detail: 'Isolated simulated runtime environment created for audit & tutorial verification.',
      status: 'info',
    },
  ]);

  const addLog = (
    action: string,
    category: 'Session' | 'Handbook' | 'Quiz' | 'Audit',
    detail: string,
    status: 'info' | 'success' | 'warning' = 'info'
  ) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `LOG-${String(prev.length + 1).padStart(3, '0')}`,
        timestamp: new Date().toLocaleTimeString(),
        action,
        category,
        detail,
        status,
      },
    ]);
  };

  // Handbook Simulation Helpers
  const completedHandbookCount = Object.keys(testInitials).length;
  const isHandbookFullyInitialed = completedHandbookCount >= 14;
  const isHandbookFullySigned = isHandbookFullyInitialed && Boolean(testFinalSignature);

  const handleStartSimulatedSession = () => {
    setSessionStarted(true);
    addLog(
      'Briefing Session Started',
      'Handbook',
      `7-Day Onboarding clock initiated for ${testName} (Entity: ${testEntity}).`,
      'success'
    );
    onShowNotification('Test Session Started', 'Simulated 7-day onboarding period is now running.');
  };

  const handleAutoInitialAll = () => {
    if (!sessionStarted) setSessionStarted(true);
    const mockInitial = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><text x="10" y="40" font-family="cursive" font-size="28" fill="%23810912">AuditInitial</text></svg>';
    const allInitials: Record<number, string> = {};
    for (let i = 1; i <= 14; i++) {
      allInitials[i] = mockInitial;
    }
    setTestInitials(allInitials);
    setTestFinalSignature(mockInitial);
    addLog(
      'All 15 Parts Auto-Signed',
      'Handbook',
      'Parts 1–14 handwritten initials and Part 15 final digital signature recorded.',
      'success'
    );
    onShowNotification('Handbook Completed', 'All 15 sections simulated and signed.');
  };

  const handleTogglePartInitial = (partId: number) => {
    if (!sessionStarted) setSessionStarted(true);
    const mockInitial = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><text x="10" y="40" font-family="cursive" font-size="28" fill="%23810912">Initial</text></svg>';
    setTestInitials((prev) => {
      const next = { ...prev };
      if (next[partId]) {
        delete next[partId];
        addLog(`Part ${partId} Cleared`, 'Handbook', `Cleared signature mark for Part ${partId}.`, 'warning');
      } else {
        next[partId] = mockInitial;
        addLog(`Part ${partId} Initialed`, 'Handbook', `Recorded handwritten initial mark for Part ${partId}.`, 'success');
      }
      return next;
    });
  };

  const handleApplyQuizPreset = (score: number, grade: string) => {
    setQuizScore(score);
    setQuizGrade(grade);
    addLog(
      `Quiz Completed (${grade})`,
      'Quiz',
      `Assessment score evaluated at ${score}% (${grade}). Pass status: ${score >= 65 ? 'PASSED' : 'FAILED'}.`,
      score >= 65 ? 'success' : 'warning'
    );
    onShowNotification('Quiz Preset Applied', `Score: ${score}% (${grade})`);
  };

  const handleResetSandbox = () => {
    setSessionStarted(false);
    setSimulatedDay(1);
    setTestInitials({});
    setTestFinalSignature(null);
    setQuizScore(null);
    setQuizGrade(null);
    addLog('Sandbox Reset', 'Session', 'All simulated marks and quiz records purged.', 'warning');
    onShowNotification('Sandbox Reset', 'Test onboarding records have been cleared.');
  };

  const handleExportAuditJson = () => {
    const payload = {
      auditTimestamp: new Date().toISOString(),
      testCandidate: {
        name: testName,
        department: testDept,
        position: testPosition,
        entity: testEntity,
      },
      handbookStatus: {
        sessionStarted,
        partsInitialed: Object.keys(testInitials).length,
        finalSigned: Boolean(testFinalSignature),
      },
      quizStatus: {
        score: quizScore,
        grade: quizGrade,
        passed: (quizScore ?? 0) >= 65,
      },
      logs,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_Test_Onboarding_Log_${testName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowNotification('Audit Log Exported', 'Audit trail JSON successfully downloaded.');
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.category}] ${l.action}: ${l.detail}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
    onShowNotification('Copied', 'Audit trail log copied to clipboard.');
  };

  const handleDownloadTestPdf = () => {
    const mockUserAnswers: Record<number, number> = {};
    QUIZ_QUESTIONS.forEach((q, idx) => {
      mockUserAnswers[idx] = q.correctOptionIndex ?? 0;
    });

    exportFullSignedHandbookPdf({
      employeeName: testName,
      employeeId: 'TEST-AUDIT-001',
      department: testDept,
      position: testPosition,
      signedDate: new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }),
      signatureTextOrImage: testName,
      quizScorePercent: quizScore ?? 100,
      quizGrade: quizGrade ?? 'Grade S (PASSED)',
      quizQuestions: QUIZ_QUESTIONS,
      userAnswers: mockUserAnswers,
    });
    addLog('PDF Certificate Generated', 'Audit', 'Signed handbook & quiz record PDF compiled and exported.', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-[#F2E8D8] flex flex-col overflow-hidden text-left">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#810912] via-[#5a060d] to-[#1b1c1c] text-white p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Test Onboarding Sandbox</h3>
                <span className="bg-[#D4AF37] text-black text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Audit & Tutorial Mode
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Simulate end-to-end onboarding lifecycle, verify audit trail timestamps, and test PDF generation safely.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close test modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[#F2E8D8] bg-[#FAF6EF] px-5 py-2.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'flow'
                  ? 'bg-[#810912] text-white shadow-xs'
                  : 'text-[#59413f] hover:bg-white/60 hover:text-[#1b1c1c]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>1. Profile & Flow</span>
            </button>
            <button
              onClick={() => setActiveTab('handbook')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'handbook'
                  ? 'bg-[#810912] text-white shadow-xs'
                  : 'text-[#59413f] hover:bg-white/60 hover:text-[#1b1c1c]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>2. Handbook Simulation</span>
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'quiz'
                  ? 'bg-[#810912] text-white shadow-xs'
                  : 'text-[#59413f] hover:bg-white/60 hover:text-[#1b1c1c]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>3. Quiz Assessment</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-[#810912] text-white shadow-xs'
                  : 'text-[#59413f] hover:bg-white/60 hover:text-[#1b1c1c]'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>4. Audit Trail & Log ({logs.length})</span>
            </button>
          </div>

          <button
            onClick={handleResetSandbox}
            className="px-2.5 py-1 text-xs font-bold text-[#810912] hover:bg-[#810912]/10 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            title="Reset sandbox state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sandbox</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Profile & Flow Overview */}
          {activeTab === 'flow' && (
            <div className="space-y-6">
              {/* Test Profile Configurator */}
              <div className="bg-[#FAF6EF] p-5 rounded-xl border border-[#e0bfbc]">
                <h4 className="text-xs font-black uppercase text-[#810912] tracking-wider mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Simulated Trainee Identity</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#59413f] uppercase block mb-1">
                      Trainee Name
                    </label>
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="w-full bg-white border border-[#e0bfbc] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1b1c1c] focus:border-[#810912] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#59413f] uppercase block mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={testDept}
                      onChange={(e) => setTestDept(e.target.value)}
                      className="w-full bg-white border border-[#e0bfbc] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1b1c1c] focus:border-[#810912] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#59413f] uppercase block mb-1">
                      Position / Role
                    </label>
                    <input
                      type="text"
                      value={testPosition}
                      onChange={(e) => setTestPosition(e.target.value)}
                      className="w-full bg-white border border-[#e0bfbc] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1b1c1c] focus:border-[#810912] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#59413f] uppercase block mb-1">
                      Legal Entity
                    </label>
                    <input
                      type="text"
                      value={testEntity}
                      onChange={(e) => setTestEntity(e.target.value)}
                      className="w-full bg-white border border-[#e0bfbc] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1b1c1c] focus:border-[#810912] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 7-Day Journey Simulation Bar */}
              <div className="bg-white p-5 rounded-xl border border-[#F2E8D8] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#1b1c1c]">7-Day Completion Window Simulation</h4>
                    <p className="text-xs text-[#59413f]">
                      Test employee onboarding session start, timeline expiration, and progression tracking.
                    </p>
                  </div>

                  {!sessionStarted ? (
                    <button
                      onClick={handleStartSimulatedSession}
                      className="px-4 py-2 bg-[#810912] text-white text-xs font-bold rounded-lg hover:bg-[#a32626] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Briefing Session</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>Session Active: Day {simulatedDay} of 7 ({7 - simulatedDay} days remaining)</span>
                    </div>
                  )}
                </div>

                {sessionStarted && (
                  <div className="flex items-center gap-2 pt-2 border-t border-[#F2E8D8]">
                    <span className="text-xs font-semibold text-[#59413f]">Simulate Time Elapsed:</span>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <button
                        key={day}
                        onClick={() => {
                          setSimulatedDay(day);
                          addLog(
                            `Time Advanced to Day ${day}`,
                            'Session',
                            `Simulated elapsed time set to Day ${day} of 7.`,
                            'info'
                          );
                        }}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                          simulatedDay === day
                            ? 'bg-[#810912] text-white'
                            : 'bg-[#FAF6EF] text-[#59413f] hover:bg-[#e0bfbc]'
                        }`}
                      >
                        Day {day}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#F2E8D8] shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#59413f]">Handbook Sign-off</span>
                    <BookOpen className="w-4 h-4 text-[#810912]" />
                  </div>
                  <p className="text-xl font-extrabold text-[#1b1c1c]">
                    {completedHandbookCount} / 14 Parts
                  </p>
                  <p className="text-[11px] text-[#59413f] mt-1">
                    Final Sign-off (Part 15): {testFinalSignature ? '✅ Signed' : '⏳ Pending'}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#F2E8D8] shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#59413f]">Compliance Quiz</span>
                    <GraduationCap className="w-4 h-4 text-[#810912]" />
                  </div>
                  <p className="text-xl font-extrabold text-[#1b1c1c]">
                    {quizScore !== null ? `${quizScore}%` : 'Not Taken'}
                  </p>
                  <p className="text-[11px] text-[#59413f] mt-1">
                    Grade: {quizGrade || 'Pending Assessment'}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#F2E8D8] shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#59413f]">Onboarding Record</span>
                    <ShieldCheck className="w-4 h-4 text-[#810912]" />
                  </div>
                  <p className="text-xl font-extrabold text-[#1b1c1c]">
                    {isHandbookFullySigned && (quizScore ?? 0) >= 65 ? 'Ready' : 'Incomplete'}
                  </p>
                  <p className="text-[11px] text-[#59413f] mt-1">
                    Audit Status: Isolated Sandbox
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Handbook Briefing Simulation */}
          {activeTab === 'handbook' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FAF6EF] p-4 rounded-xl border border-[#e0bfbc]">
                <div>
                  <h4 className="text-xs font-bold text-[#1b1c1c] uppercase tracking-wider">
                    Handbook Sections Initial & Signature Simulator
                  </h4>
                  <p className="text-xs text-[#59413f]">
                    Toggle individual section initials or click auto-initial to complete all 15 parts instantly.
                  </p>
                </div>
                <button
                  onClick={handleAutoInitialAll}
                  className="px-4 py-2 bg-[#810912] text-white text-xs font-bold rounded-lg hover:bg-[#a32626] transition-all flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Auto-Initial All 15 Parts</span>
                </button>
              </div>

              {/* Grid of 15 Modules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {HANDBOOK_MODULES.map((mod) => {
                  const isInitialed = Boolean(testInitials[mod.id]);
                  return (
                    <div
                      key={mod.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isInitialed
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                          : 'bg-white border-[#F2E8D8] text-[#1b1c1c]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-extrabold uppercase text-[#810912]">
                          Part {mod.id}
                        </span>
                        {isInitialed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Initialed</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-400">
                            Pending Initial
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold line-clamp-1 mb-2">{mod.title}</p>
                      <button
                        onClick={() => handleTogglePartInitial(mod.id)}
                        className={`w-full py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                          isInitialed
                            ? 'bg-emerald-200/60 hover:bg-emerald-200 text-emerald-900'
                            : 'bg-[#FAF6EF] hover:bg-[#e0bfbc] text-[#810912] border border-[#e0bfbc]'
                        }`}
                      >
                        {isInitialed ? 'Remove Initial' : 'Simulate Initial'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Quiz Assessment Simulation */}
          {activeTab === 'quiz' && (
            <div className="space-y-6">
              <div className="bg-[#FAF6EF] p-4 rounded-xl border border-[#e0bfbc]">
                <h4 className="text-xs font-bold text-[#1b1c1c] uppercase tracking-wider mb-1">
                  Compliance Assessment Simulation Presets
                </h4>
                <p className="text-xs text-[#59413f] mb-4">
                  Quickly test different quiz score tiers to verify passing rules, certificate issuance, and failure locks.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleApplyQuizPreset(100, 'Grade S (PASSED)')}
                    className="p-4 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-xl text-left transition-all cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-emerald-700 uppercase">Preset 1: Perfect</span>
                      <Award className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-lg font-black text-emerald-900">100% · Grade S</p>
                    <p className="text-[11px] text-emerald-700 mt-1">30 of 30 questions answered correctly.</p>
                  </button>

                  <button
                    onClick={() => handleApplyQuizPreset(75, 'Grade A (PASSED)')}
                    className="p-4 bg-white hover:bg-blue-50 border border-blue-300 rounded-xl text-left transition-all cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-blue-700 uppercase">Preset 2: Standard Pass</span>
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-lg font-black text-blue-900">75% · Grade A</p>
                    <p className="text-[11px] text-blue-700 mt-1">Pass mark threshold met (≥ 65%).</p>
                  </button>

                  <button
                    onClick={() => handleApplyQuizPreset(40, 'Failed (RETAKE REQUIRED)')}
                    className="p-4 bg-white hover:bg-red-50 border border-red-300 rounded-xl text-left transition-all cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-red-700 uppercase">Preset 3: Below Threshold</span>
                      <RotateCcw className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-lg font-black text-red-900">40% · Failed</p>
                    <p className="text-[11px] text-red-700 mt-1">Below 65% pass criteria. Retake enforced.</p>
                  </button>
                </div>
              </div>

              {quizScore !== null && (
                <div className="bg-white p-5 rounded-xl border border-[#F2E8D8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h5 className="text-xs font-extrabold uppercase text-[#810912]">Assessment Test Result</h5>
                    <p className="text-base font-black text-[#1b1c1c] mt-0.5">
                      Score: {quizScore}% — {quizGrade}
                    </p>
                    <p className="text-xs text-[#59413f] mt-1">
                      Linear Question Progression & Answer Key masking verified for test candidate.
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadTestPdf}
                    className="px-4 py-2 bg-[#810912] text-white text-xs font-bold rounded-lg hover:bg-[#a32626] transition-all flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Download Test Certificate PDF</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Audit Trail & Logs */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-sm font-bold text-[#1b1c1c]">Simulation Audit Trail Ledger</h4>
                  <p className="text-xs text-[#59413f]">
                    Detailed chronological ledger of all actions for audit review and tutorial records.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLogs}
                    className="px-3 py-1.5 text-xs font-bold text-[#59413f] hover:text-[#1b1c1c] bg-[#FAF6EF] border border-[#e0bfbc] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLog ? 'Copied' : 'Copy Log'}</span>
                  </button>
                  <button
                    onClick={handleExportAuditJson}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-[#810912] hover:bg-[#a32626] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Export JSON Report</span>
                  </button>
                </div>
              </div>

              {/* Log Table */}
              <div className="bg-[#1b1c1c] text-white rounded-xl p-4 font-mono text-xs max-h-80 overflow-y-auto space-y-2 border border-black/40">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 py-1 border-b border-white/10 last:border-0">
                    <span className="text-[#D4AF37] shrink-0">[{log.timestamp}]</span>
                    <span className="text-[#ffbbb5] font-bold shrink-0">[{log.category}]</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-white font-bold">{log.action}: </span>
                      <span className="text-white/80">{log.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#F2E8D8] bg-[#FAF6EF] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#59413f]">
            <Sparkles className="w-4 h-4 text-[#810912]" />
            <span>RedPoint Onboarding Portal · Audit & Training Verification Engine</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1b1c1c] hover:bg-black text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close Sandbox
          </button>
        </div>
      </div>
    </div>
  );
};
