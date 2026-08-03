import React, { useState, useEffect, useRef } from 'react';
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
  Download,
  ArrowRight,
  ArrowLeft,
  PenTool,
  CheckSquare,
  Square,
  RefreshCw,
  AlertCircle,
  PlayCircle,
  Layers
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
  const [testName, setTestName] = useState('Sarah Lin (Audit Simulation)');
  const [testDept, setTestDept] = useState('Marketing & Brand Communications');
  const [testPosition, setTestPosition] = useState('Digital Content Specialist');
  const [testEntity, setTestEntity] = useState('Red Point Sdn. Bhd.');

  // Stepper / Tab state: 1. Setup -> 2. Handbook -> 3. Quiz -> 4. Audit & Record
  const [activeStep, setActiveStep] = useState<'setup' | 'handbook' | 'quiz' | 'audit'>('setup');

  // Step 1: Session Initiation State
  const [sessionStarted, setSessionStarted] = useState(false);
  const [simulatedDay, setSimulatedDay] = useState(1);

  // Step 2: Handbook Sequential Progression State (Parts 1 to 15)
  const [activeHandbookPart, setActiveHandbookPart] = useState<number>(1);
  const [testInitials, setTestInitials] = useState<Record<number, string>>({});
  const [covenants, setCovenants] = useState<boolean[]>([true, true, true, true, true]);
  const [testFinalSignature, setTestFinalSignature] = useState<string | null>(null);

  // Canvas ref for drawing initial/signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasCanvasDrawn, setHasCanvasDrawn] = useState(false);

  // Step 3: Quiz Assessment Sequential Progression State (Questions 1 to 30)
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizGrade, setQuizGrade] = useState<string | null>(null);
  const [isAutomatingQuiz, setIsAutomatingQuiz] = useState<boolean>(false);

  // Step 4: Audit Logs & Clipboard
  const [copiedLog, setCopiedLog] = useState(false);
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

  // Handbook progress helpers
  const completedHandbookCount = Object.keys(testInitials).length;
  const isHandbook14Initialed = completedHandbookCount >= 14;
  const isHandbookFullyCompleted = isHandbook14Initialed && Boolean(testFinalSignature);

  // Initialize Canvas
  useEffect(() => {
    if (activeStep === 'handbook' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FAF6EF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#810912';
      }
    }
  }, [activeStep, activeHandbookPart]);

  const clearCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FAF6EF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      setHasCanvasDrawn(false);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasCanvasDrawn(true);
  };

  const handleCanvasPointerUp = () => {
    setIsDrawing(false);
  };

  // STEP 1 ACTIONS
  const handleStartSimulatedSession = () => {
    setSessionStarted(true);
    addLog(
      'Briefing Session Started',
      'Handbook',
      `7-Day Onboarding clock initiated for ${testName} (Entity: ${testEntity}).`,
      'success'
    );
    onShowNotification('Test Session Started', 'Simulated 7-day onboarding period is now active.');
    setActiveStep('handbook');
  };

  // STEP 2 ACTIONS: Sequential Initialing of Parts 1..14 & Part 15
  const handleInitialCurrentPart = () => {
    if (!hasCanvasDrawn || !canvasRef.current) {
      onShowNotification(
        'Handwritten Mark Required',
        activeHandbookPart === 15
          ? 'Draw the employee signature before completing Part 15.'
          : `Draw the employee initial before completing Part ${activeHandbookPart}.`
      );
      return;
    }
    const mark = canvasRef.current.toDataURL('image/png');

    if (activeHandbookPart <= 14) {
      setTestInitials((prev) => ({
        ...prev,
        [activeHandbookPart]: mark,
      }));
      addLog(
        `Part ${activeHandbookPart} Initial Recorded`,
        'Handbook',
        `Recorded mandatory employee initial for Part ${activeHandbookPart} (${HANDBOOK_MODULES[activeHandbookPart - 1]?.title || ''}).`,
        'success'
      );

      // Move to next part
      if (activeHandbookPart < 15) {
        setActiveHandbookPart(activeHandbookPart + 1);
        clearCanvas();
      }
    } else if (activeHandbookPart === 15) {
      // Part 15 Final Signature
      setTestFinalSignature(mark);
      addLog(
        'Part 15 Final Signature Executed',
        'Handbook',
        `Employee completed all 5 covenants and recorded official digital signature.`,
        'success'
      );
      onShowNotification('Handbook Completed', 'All 15 handbook parts initialed & signed!');
    }
  };

  // STEP 3 ACTIONS: Sequential Quiz Answering
  const handleSelectQuizAnswer = (optionIdx: number) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [currentQuizIndex]: optionIdx,
    }));
  };

  const handleNextQuizQuestion = () => {
    if (quizAnswers[currentQuizIndex] === undefined) {
      // default to correct answer for smooth testing if not selected
      const correctIdx = QUIZ_QUESTIONS[currentQuizIndex]?.correctOptionIndex ?? 0;
      setQuizAnswers((prev) => ({ ...prev, [currentQuizIndex]: correctIdx }));
    }

    if (currentQuizIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    } else {
      // Calculate final score
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = () => {
    let correctCount = 0;
    QUIZ_QUESTIONS.forEach((q, idx) => {
      const ans = quizAnswers[idx] !== undefined ? quizAnswers[idx] : q.correctOptionIndex;
      if (ans === q.correctOptionIndex) {
        correctCount++;
      }
    });

    const percent = Math.round((correctCount / QUIZ_QUESTIONS.length) * 100);
    let grade = 'Grade S (PASSED - EXEMPLARY)';
    if (percent >= 90) grade = 'Grade S (PASSED - EXEMPLARY)';
    else if (percent >= 75) grade = 'Grade A (PASSED - MERIT)';
    else if (percent >= 65) grade = 'Grade B (PASSED - STANDARD)';
    else grade = 'Failed (RETAKE REQUIRED)';

    setQuizScore(percent);
    setQuizGrade(grade);
    setIsQuizSubmitted(true);

    addLog(
      `Compliance Quiz Submitted (${percent}%)`,
      'Quiz',
      `Assessment completed with ${correctCount}/${QUIZ_QUESTIONS.length} correct answers (${percent}%). Result: ${grade}.`,
      percent >= 65 ? 'success' : 'warning'
    );
    onShowNotification('Quiz Completed', `Score: ${percent}% · ${grade}`);
  };

  // Automated step-through simulation for Quiz
  const handleRunSequentialQuizWalkthrough = () => {
    setIsAutomatingQuiz(true);
    addLog('Sequential Quiz Walkthrough Started', 'Quiz', 'Simulating step-by-step answering of 30 compliance questions from Q1 to Q30.', 'info');

    let qIdx = 0;
    const simulatedAnswers: Record<number, number> = {};

    const interval = setInterval(() => {
      if (qIdx < QUIZ_QUESTIONS.length) {
        const correct = QUIZ_QUESTIONS[qIdx].correctOptionIndex ?? 0;
        simulatedAnswers[qIdx] = correct;
        setQuizAnswers({ ...simulatedAnswers });
        setCurrentQuizIndex(qIdx);
        qIdx++;
      } else {
        clearInterval(interval);
        setIsAutomatingQuiz(false);
        setQuizScore(100);
        setQuizGrade('Grade S (PASSED - EXEMPLARY)');
        setIsQuizSubmitted(true);
        addLog('Quiz Walkthrough Completed (100%)', 'Quiz', 'All 30 questions answered and validated with 100% score.', 'success');
        onShowNotification('Quiz Simulation Complete', 'Score: 100% (Grade S PASSED)');
      }
    }, 120);
  };

  // STEP 4 ACTIONS: Export PDF & Audit Trail
  const handleDownloadSignedHandbookPdf = () => {
    exportFullSignedHandbookPdf({
      employeeName: testName,
      employeeId: 'TEST-AUDIT-001',
      department: testDept,
      position: testPosition,
      signedDate: new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }),
      signatureTextOrImage: testFinalSignature || '',
      quizScorePercent: quizScore ?? 100,
      quizGrade: quizGrade ?? 'Grade S (PASSED)',
      quizQuestions: QUIZ_QUESTIONS,
      userAnswers: quizAnswers,
      initialSignatures: testInitials,
    });

    addLog('Full Signed PDF Generated', 'Audit', 'Exported 15-part signed handbook PDF containing all 14 handwritten initials and Part 15 execution signature.', 'success');
    onShowNotification('Signed PDF Downloaded', 'Official Handbook with all 14 Part initials compiled!');
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
        initialSignaturesRecord: testInitials,
        finalSigned: Boolean(testFinalSignature),
      },
      quizStatus: {
        score: quizScore,
        grade: quizGrade,
        passed: (quizScore ?? 0) >= 65,
        userAnswers: quizAnswers,
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

  const handleResetSandbox = () => {
    setSessionStarted(false);
    setSimulatedDay(1);
    setActiveHandbookPart(1);
    setTestInitials({});
    setTestFinalSignature(null);
    setCurrentQuizIndex(0);
    setQuizAnswers({});
    setIsQuizSubmitted(false);
    setQuizScore(null);
    setQuizGrade(null);
    setActiveStep('setup');
    clearCanvas();
    addLog('Sandbox Reset', 'Session', 'All simulated marks, quiz records, and progression states purged.', 'warning');
    onShowNotification('Sandbox Reset', 'Test onboarding simulation has been reset to starting state.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[94vh] bg-white rounded-2xl shadow-2xl border border-[#F2E8D8] flex flex-col overflow-hidden text-left">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#810912] via-[#5a060d] to-[#1b1c1c] text-white p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Test Onboarding Sandbox</h3>
                <span className="bg-[#D4AF37] text-black text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  Complete Progression Flow Mode
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Simulate the entire end-to-end employee journey: 7-day briefing start, sequential 14-part initialing, linear quiz, and certified PDF export.
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

        {/* 4-Step Sequential Progression Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#F2E8D8] bg-[#FAF6EF] p-2 gap-1.5">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setActiveStep('setup')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeStep === 'setup'
                ? 'bg-[#810912] text-white shadow-xs'
                : sessionStarted
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'text-[#59413f] hover:bg-white/60'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <div className="text-left leading-tight">
              <div className="text-[10px] uppercase font-bold opacity-80">Step 1</div>
              <div className="font-extrabold truncate">Profile & Start</div>
            </div>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => {
              if (!sessionStarted) {
                onShowNotification('Step 1 Required', 'Please start the 7-day briefing session in Step 1 first.');
                return;
              }
              setActiveStep('handbook');
            }}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeStep === 'handbook'
                ? 'bg-[#810912] text-white shadow-xs'
                : isHandbookFullyCompleted
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'text-[#59413f] hover:bg-white/60'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <div className="text-left leading-tight">
              <div className="text-[10px] uppercase font-bold opacity-80">Step 2 ({completedHandbookCount}/14)</div>
              <div className="font-extrabold truncate">15-Part Handbook</div>
            </div>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => {
              if (!isHandbookFullyCompleted) {
                onShowNotification('Step 2 Required', 'Please complete all 14 handbook initials and Part 15 signature first.');
                return;
              }
              setActiveStep('quiz');
            }}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeStep === 'quiz'
                ? 'bg-[#810912] text-white shadow-xs'
                : isQuizSubmitted
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'text-[#59413f] hover:bg-white/60'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            <div className="text-left leading-tight">
              <div className="text-[10px] uppercase font-bold opacity-80">
                Step 3 {quizScore !== null ? `(${quizScore}%)` : ''}
              </div>
              <div className="font-extrabold truncate">30-Q Compliance Quiz</div>
            </div>
          </button>

          {/* Step 4 */}
          <button
            type="button"
            onClick={() => setActiveStep('audit')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeStep === 'audit'
                ? 'bg-[#810912] text-white shadow-xs'
                : 'text-[#59413f] hover:bg-white/60'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <div className="text-left leading-tight">
              <div className="text-[10px] uppercase font-bold opacity-80">Step 4</div>
              <div className="font-extrabold truncate">Audit & PDF Record</div>
            </div>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ========================================================================= */}
          {/* STEP 1: Candidate Profile & Start Briefing Session */}
          {/* ========================================================================= */}
          {activeStep === 'setup' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#FAF6EF] p-5 rounded-xl border border-[#e0bfbc]">
                <h4 className="text-xs font-black uppercase text-[#810912] tracking-wider mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Simulated Trainee Identity Particulars</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#59413f] uppercase block mb-1">
                      Candidate Name
                    </label>
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="w-full bg-white border border-[#e0bfbc] rounded-lg px-3 py-2 text-xs font-semibold text-[#1b1c1c] focus:border-[#810912] focus:outline-hidden"
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
                      className="w-full bg-white border border-[#e0bfbc] rounded-lg px-3 py-2 text-xs font-semibold text-[#1b1c1c] focus:border-[#810912] focus:outline-hidden"
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
                      className="w-full bg-white border border-[#e0bfbc] rounded-lg px-3 py-2 text-xs font-semibold text-[#1b1c1c] focus:border-[#810912] focus:outline-hidden"
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
                      className="w-full bg-white border border-[#e0bfbc] rounded-lg px-3 py-2 text-xs font-semibold text-[#1b1c1c] focus:border-[#810912] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Start Session Initiation Card */}
              <div className="bg-white p-6 rounded-xl border border-[#F2E8D8] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-[#810912] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                        7-Day Requirement
                      </span>
                      <h4 className="text-sm font-bold text-[#1b1c1c]">1. Start Official Briefing Session</h4>
                    </div>
                    <p className="text-xs text-[#59413f]">
                      Employees must press "Start" to initiate their 7-day orientation window. Without starting, all handbook parts remain locked.
                    </p>
                  </div>

                  {!sessionStarted ? (
                    <button
                      type="button"
                      onClick={handleStartSimulatedSession}
                      className="px-5 py-2.5 bg-[#810912] hover:bg-[#a32626] text-white text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md hover:-translate-y-0.5"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>START 7-DAY BRIEFING SESSION</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-lg text-xs font-bold">
                        <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
                        <span>Session Active: Day {simulatedDay} of 7</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveStep('handbook')}
                        className="px-4 py-2 bg-[#810912] text-white text-xs font-bold rounded-lg hover:bg-[#a32626] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Continue to Handbook</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {sessionStarted && (
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#F2E8D8]">
                    <span className="text-xs font-semibold text-[#59413f]">Simulate Elapsed Day:</span>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setSimulatedDay(day);
                          addLog(
                            `Time Advanced to Day ${day}`,
                            'Session',
                            `Simulated elapsed time set to Day ${day} of 7.`,
                            'info'
                          );
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
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
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: 15-Part Sequential Handbook Progression & Handwritten Initials */}
          {/* ========================================================================= */}
          {activeStep === 'handbook' && (
            <div className="space-y-6 animate-fade-in">
              {/* Progress Summary */}
              <div className="bg-[#FAF6EF] p-4 rounded-xl border border-[#e0bfbc] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#810912] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      Sequential Progression
                    </span>
                    <h4 className="text-xs font-black uppercase text-[#1b1c1c]">
                      Handbook Initial Progress: {completedHandbookCount} / 14 Parts ({Math.round((completedHandbookCount / 14) * 100)}%)
                    </h4>
                  </div>
                  <p className="text-xs text-[#59413f] mt-1">
                    Every part must be thoroughly reviewed and stamped with a handwritten initial before unlocking the next section.
                  </p>
                </div>
              </div>

              {/* 15-Part Stepper Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                {HANDBOOK_MODULES.map((mod) => {
                  const isInitialed = mod.id <= 14 ? Boolean(testInitials[mod.id]) : Boolean(testFinalSignature);
                  const isCurrent = activeHandbookPart === mod.id;
                  const isLocked = mod.id > 1 && !testInitials[mod.id - 1] && !isInitialed;

                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        if (!isLocked) setActiveHandbookPart(mod.id);
                      }}
                      disabled={isLocked}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#810912] text-white shadow-xs ring-2 ring-[#D4AF37]'
                          : isInitialed
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : isLocked
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                          : 'bg-white text-[#59413f] border border-[#F2E8D8] hover:bg-[#FAF6EF]'
                      }`}
                    >
                      <span>Part {mod.id}</span>
                      {isInitialed && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Active Part Content & Initialing Station */}
              {activeHandbookPart <= 14 ? (
                <div className="bg-white rounded-xl border border-[#F2E8D8] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F2E8D8] pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#810912] tracking-wider">
                        Part {activeHandbookPart} of 14 · Policy Review & Initial
                      </span>
                      <h3 className="text-base font-black text-[#1b1c1c]">
                        {HANDBOOK_MODULES[activeHandbookPart - 1]?.title}
                      </h3>
                      <p className="text-xs text-[#59413f] mt-0.5">
                        {HANDBOOK_MODULES[activeHandbookPart - 1]?.content.sectionTitle}
                      </p>
                    </div>

                    {testInitials[activeHandbookPart] ? (
                      <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Part {activeHandbookPart} Initialed</span>
                      </span>
                    ) : (
                      <span className="bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Initial Required</span>
                      </span>
                    )}
                  </div>

                  {/* Policy Summary Callout */}
                  <div className="bg-[#FAF6EF] p-4 rounded-lg border-l-4 border-[#810912] text-xs text-[#333]">
                    <span className="font-bold text-[#810912]">Key Compliance Requirement: </span>
                    <span>
                      {HANDBOOK_MODULES[activeHandbookPart - 1]?.content.keyTakeaway ||
                        HANDBOOK_MODULES[activeHandbookPart - 1]?.content.bodyParagraphs[0]}
                    </span>
                  </div>

                  {/* Initial Stamp Drawing Canvas / Quick Stamp Area */}
                  <div className="p-4 bg-[#FAF6EF] rounded-xl border border-[#e0bfbc] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-[#810912]" />
                        <span className="text-xs font-bold text-[#1b1c1c]">
                          Handwritten Initial Pad for Part {activeHandbookPart}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-[11px] font-bold text-[#810912] hover:underline cursor-pointer"
                      >
                        Clear Pad
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <canvas
                        ref={canvasRef}
                        width={240}
                        height={75}
                        onPointerDown={handleCanvasPointerDown}
                        onPointerMove={handleCanvasPointerMove}
                        onPointerUp={handleCanvasPointerUp}
                        onPointerCancel={handleCanvasPointerUp}
                        onPointerLeave={handleCanvasPointerUp}
                        className="w-[240px] h-[75px] touch-none bg-white border-2 border-dashed border-[#810912]/40 rounded-lg cursor-crosshair shadow-inner"
                        title="Draw your initial signature"
                      />

                      <div className="text-left space-y-2 flex-1">
                        <p className="text-xs text-[#59413f]">
                          Draw your initial with your mouse or touch input before recording the official timestamped initial for <strong>Part {activeHandbookPart}</strong>.
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleInitialCurrentPart}
                            disabled={!hasCanvasDrawn}
                            className="px-4 py-2 bg-[#810912] hover:bg-[#a32626] disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <PenTool className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>Stamp Initial & Advance to Part {activeHandbookPart + 1}</span>
                          </button>

                          {activeHandbookPart < 14 && testInitials[activeHandbookPart] && (
                            <button
                              type="button"
                              onClick={() => setActiveHandbookPart(activeHandbookPart + 1)}
                              className="px-3.5 py-2 bg-white border border-[#F2E8D8] text-[#59413f] hover:text-[#1b1c1c] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Next Part</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* PART 15: Final Execution & Covenants */
                <div className="bg-white rounded-xl border border-[#F2E8D8] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F2E8D8] pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#810912] tracking-wider">
                        Part 15 of 15 · Final Covenants & Digital Signature
                      </span>
                      <h3 className="text-base font-black text-[#1b1c1c]">
                        Final Acknowledgment & Digital Execution
                      </h3>
                    </div>

                    {testFinalSignature ? (
                      <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Part 15 Digitally Signed</span>
                      </span>
                    ) : (
                      <span className="bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Final Signature Pending</span>
                      </span>
                    )}
                  </div>

                  {/* 5 Covenants Checkbox List */}
                  <div className="space-y-2 text-xs text-[#333]">
                    <p className="font-bold text-[#810912]">Mandatory Compliance Covenants (5 of 5):</p>
                    {[
                      'I have received and reviewed the RedPoint Employee Handbook.',
                      'I understand and agree to comply with all policies, rules, and guidelines.',
                      'I acknowledge confidentiality, PDPA privacy, and IT security obligations.',
                      'I understand this handbook does not alter my formal contract of employment.',
                      'I will seek HR clarification for any questions regarding handbook contents.',
                    ].map((cov, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-[#FAF6EF] p-2.5 rounded-lg border border-[#e0bfbc]">
                        <CheckSquare className="w-4 h-4 text-[#810912] shrink-0" />
                        <span className="font-medium">{cov}</span>
                      </div>
                    ))}
                  </div>

                  {/* Final Signature Pad */}
                  <div className="p-4 bg-[#FAF6EF] rounded-xl border border-[#e0bfbc] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1b1c1c]">
                        Digital Signature of Employee ({testName})
                      </span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-[11px] font-bold text-[#810912] hover:underline cursor-pointer"
                      >
                        Clear Canvas
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <canvas
                        ref={canvasRef}
                        width={280}
                        height={80}
                        onPointerDown={handleCanvasPointerDown}
                        onPointerMove={handleCanvasPointerMove}
                        onPointerUp={handleCanvasPointerUp}
                        onPointerCancel={handleCanvasPointerUp}
                        onPointerLeave={handleCanvasPointerUp}
                        className="w-[280px] h-[80px] touch-none bg-white border-2 border-dashed border-[#810912]/40 rounded-lg cursor-crosshair shadow-inner"
                        title="Draw your full signature"
                      />

                      <div className="space-y-2 flex-1">
                        <button
                          type="button"
                          onClick={handleInitialCurrentPart}
                          disabled={!hasCanvasDrawn}
                          className="px-5 py-2.5 bg-[#810912] hover:bg-[#a32626] disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                          <span>SIGN & EXECUTE PART 15</span>
                        </button>

                        {isHandbookFullyCompleted && (
                          <button
                            type="button"
                            onClick={() => setActiveStep('quiz')}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <span>Proceed to Compliance Quiz (Step 3)</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: 30-Question Linear Compliance Quiz Walkthrough */}
          {/* ========================================================================= */}
          {activeStep === 'quiz' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#FAF6EF] p-4 rounded-xl border border-[#e0bfbc] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#810912] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      Linear Assessment Flow
                    </span>
                    <h4 className="text-xs font-black uppercase text-[#1b1c1c]">
                      Compliance Quiz (Question {currentQuizIndex + 1} of {QUIZ_QUESTIONS.length})
                    </h4>
                  </div>
                  <p className="text-xs text-[#59413f] mt-1">
                    Answer questions sequentially from Q1 to Q30 without skipping. Pass criteria: ≥ 65%.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunSequentialQuizWalkthrough}
                    disabled={isAutomatingQuiz}
                    className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                    title="Simulate answering all 30 questions sequentially"
                  >
                    <PlayCircle className="w-3.5 h-3.5 text-purple-200" />
                    <span>{isAutomatingQuiz ? 'Answering Questions...' : '▶ Step-Through Quiz (Q1–Q30)'}</span>
                  </button>
                </div>
              </div>

              {/* Active Quiz Question Card */}
              {!isQuizSubmitted ? (
                <div className="bg-white rounded-xl border border-[#F2E8D8] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F2E8D8] pb-3">
                    <span className="text-xs font-extrabold text-[#810912] uppercase">
                      Question {currentQuizIndex + 1} · {QUIZ_QUESTIONS[currentQuizIndex]?.category}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      Answered: {Object.keys(quizAnswers).length} / {QUIZ_QUESTIONS.length}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#1b1c1c]">
                    {QUIZ_QUESTIONS[currentQuizIndex]?.question}
                  </h3>

                  {/* Options List */}
                  <div className="space-y-2">
                    {QUIZ_QUESTIONS[currentQuizIndex]?.options.map((opt, optIdx) => {
                      const isSelected = quizAnswers[currentQuizIndex] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectQuizAnswer(optIdx)}
                          className={`w-full p-3 rounded-lg border text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#810912]/10 border-[#810912] text-[#810912] shadow-xs'
                              : 'bg-[#FAF6EF] border-[#e0bfbc] text-[#333] hover:bg-white'
                          }`}
                        >
                          <span>{opt}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#810912]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#F2E8D8]">
                    <button
                      type="button"
                      disabled={currentQuizIndex === 0}
                      onClick={() => setCurrentQuizIndex(currentQuizIndex - 1)}
                      className="px-3.5 py-1.5 text-xs font-bold text-[#59413f] hover:text-[#1b1c1c] disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextQuizQuestion}
                      className="px-5 py-2 bg-[#810912] hover:bg-[#a32626] text-white text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>
                        {currentQuizIndex < QUIZ_QUESTIONS.length - 1 ? 'Submit & Next Question' : 'Finish Quiz Assessment'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Quiz Result Card */
                <div className="bg-white rounded-xl border border-[#F2E8D8] p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Quiz Assessment Evaluated
                      </span>
                      <h3 className="text-xl font-black text-[#1b1c1c] mt-1">
                        Score: {quizScore}% — {quizGrade}
                      </h3>
                      <p className="text-xs text-[#59413f]">
                        Pass criteria: ≥ 65%. Linear question progression verified.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveStep('audit')}
                      className="px-5 py-2.5 bg-[#810912] hover:bg-[#a32626] text-white text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <span>Proceed to Audit & Export (Step 4)</span>
                      <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: Audit Verification, Certified PDF & JSON Report */}
          {/* ========================================================================= */}
          {activeStep === 'audit' && (
            <div className="space-y-6 animate-fade-in">
              {/* Comprehensive Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#F2E8D8] shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#59413f]">14 Part Initials</span>
                    <BookOpen className="w-4 h-4 text-[#810912]" />
                  </div>
                  <p className="text-lg font-black text-[#1b1c1c]">
                    {completedHandbookCount} / 14 Parts Initialed
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {isHandbook14Initialed ? '✅ All 14 Parts Initialed' : '⏳ Pending Initials'}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#F2E8D8] shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#59413f]">Part 15 Final Execution</span>
                    <ShieldCheck className="w-4 h-4 text-[#810912]" />
                  </div>
                  <p className="text-lg font-black text-[#1b1c1c]">
                    {testFinalSignature ? 'Digitally Signed' : 'Pending Signature'}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {testFinalSignature ? '✅ 5 Covenants Agreed' : '⏳ Pending Covenants'}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#F2E8D8] shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#59413f]">Compliance Quiz</span>
                    <GraduationCap className="w-4 h-4 text-[#810912]" />
                  </div>
                  <p className="text-lg font-black text-[#1b1c1c]">
                    {quizScore !== null ? `${quizScore}%` : 'Not Taken'}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {quizGrade || '⏳ Pending Assessment'}
                  </p>
                </div>
              </div>

              {/* Official Download Action Bar */}
              <div className="bg-[#FAF6EF] p-5 rounded-xl border border-[#e0bfbc] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="text-xs font-black uppercase text-[#810912] tracking-wider">
                    Official Signed PDF Export with All 14 Initials
                  </h4>
                  <p className="text-xs text-[#59413f] mt-0.5">
                    Compiles full verbatim 15-part handbook with each part's handwritten initial stamp, final digital signature, and quiz verification certificate.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSignedHandbookPdf}
                  disabled={!isHandbookFullyCompleted || !isQuizSubmitted}
                  className="px-5 py-2.5 bg-[#810912] hover:bg-[#a32626] disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md shrink-0 hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4 text-[#D4AF37]" />
                  <span>Download Signed PDF (With All Part Initials)</span>
                </button>
              </div>

              {/* Audit Ledger Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-[#1b1c1c] uppercase tracking-wider">
                      Chronological Audit Trail Ledger ({logs.length} events)
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLogs}
                      className="px-3 py-1.5 text-xs font-bold text-[#59413f] hover:text-[#1b1c1c] bg-[#FAF6EF] border border-[#e0bfbc] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLog ? 'Copied' : 'Copy Log'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportAuditJson}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#810912] hover:bg-[#a32626] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Export JSON Report</span>
                    </button>
                  </div>
                </div>

                {/* Log Terminal Display */}
                <div className="bg-[#1b1c1c] text-white rounded-xl p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-2 border border-black/40">
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
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#F2E8D8] bg-[#FAF6EF] px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetSandbox}
            className="px-3 py-1.5 text-xs font-bold text-[#810912] hover:bg-[#810912]/10 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Simulation</span>
          </button>

          <button
            type="button"
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
