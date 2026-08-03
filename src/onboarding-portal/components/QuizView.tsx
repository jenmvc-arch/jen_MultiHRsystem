import React, { useState, useEffect, useMemo } from 'react';
import { QuizQuestion } from '../types';
import {
  Timer,
  Info,
  CheckCheck,
  Clock,
  Grid,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Download,
  BookOpen,
  FileText,
  Search,
  Award,
  Layers,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { exportFullSignedHandbookPdf } from '../utils/pdfExport';

interface QuizViewProps {
  questions: QuizQuestion[];
  onCompleteQuiz: (scorePercent: number, grade: string) => void;
  viewRole?: 'employee' | 'hr-admin';
  isTestMode?: boolean;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  position?: string;
}

const LOCAL_STORAGE_KEY = 'redpoint_quiz_progress_v1';

interface SavedQuizProgress {
  userAnswers: Record<number, number | number[]>;
  submittedQuestions: Record<number, boolean>;
  currentQuestionIndex: number;
  secondsRemaining: number;
  isSubmitted: boolean;
  finalScore: number;
  finalGrade: string;
}

const loadSavedProgress = (): SavedQuizProgress | null => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (err) {
    console.error('Failed to load quiz progress from localStorage:', err);
    return null;
  }
};

const CATEGORY_LIST = [
  'All',
  'Working Hours, Attendance and Overtime',
  'Leave Administration',
  'Payroll, Claims and Employee Records',
  'IT, Cybersecurity, AI, Confidentiality and PDPA',
  'Code of Conduct and Ethics',
  'Health, Safety and Emergency Procedures',
  'Performance, Complaints and Disciplinary Procedures',
  'Resignation and Exit Clearance',
  'General Employee Responsibilities',
] as const;

export const QuizView: React.FC<QuizViewProps> = ({
  questions: fallbackQuestions,
  onCompleteQuiz,
  viewRole = 'employee',
  isTestMode = false,
  employeeName = 'Employee',
  employeeId = 'EMP-ONBOARDING',
  department = 'Operations',
  position = 'Staff Member',
}) => {
  const { t } = useLanguage();
  const questions = fallbackQuestions;
  const isEmployeeView = viewRole === 'employee' && !isTestMode;

  const savedProgress = useMemo(() => loadSavedProgress(), []);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(
    savedProgress?.currentQuestionIndex ?? 0
  );
  const [activeTab, setActiveTab] = useState<'quiz' | 'answer-key'>('quiz');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchKeyQuery, setSearchKeyQuery] = useState<string>('');

  // User answers map: index -> number or number[]
  const [userAnswers, setUserAnswers] = useState<Record<number, number | number[]>>(
    savedProgress?.userAnswers ?? {}
  );
  // Submitted status per question map: index -> boolean
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<number, boolean>>(
    savedProgress?.submittedQuestions ?? {}
  );

  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    savedProgress?.secondsRemaining ?? 25 * 60
  );
  const [isSubmitted, setIsSubmitted] = useState<boolean>(
    savedProgress?.isSubmitted ?? false
  );
  const [finalScore, setFinalScore] = useState<number>(
    savedProgress?.finalScore ?? 0
  );
  const [finalGrade, setFinalGrade] = useState<string>(
    savedProgress?.finalGrade ?? ''
  );

  // Furthest question index unlocked for linear progression in employee view
  const maxUnlockedIndex = useMemo(() => {
    if (!isEmployeeView || isSubmitted) return questions.length - 1;
    // An employee can navigate to any question up to (highest answered question index + 1)
    const answeredIndices = Object.keys(userAnswers).map(Number);
    if (answeredIndices.length === 0) return 0;
    const maxAnswered = Math.max(...answeredIndices, 0);
    return Math.min(questions.length - 1, maxAnswered + 1);
  }, [isEmployeeView, isSubmitted, userAnswers, questions.length]);

  // Ensure current question is valid
  useEffect(() => {
    if (isEmployeeView && !isSubmitted && currentQuestionIndex > maxUnlockedIndex) {
      setCurrentQuestionIndex(maxUnlockedIndex);
    }
  }, [isEmployeeView, isSubmitted, currentQuestionIndex, maxUnlockedIndex]);

  // Auto-save progress to localStorage on any state change
  useEffect(() => {
    try {
      const dataToSave: SavedQuizProgress = {
        userAnswers,
        submittedQuestions,
        currentQuestionIndex,
        secondsRemaining,
        isSubmitted,
        finalScore,
        finalGrade,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      console.error('Failed to save quiz progress to localStorage:', err);
    }
  }, [userAnswers, submittedQuestions, currentQuestionIndex, secondsRemaining, isSubmitted, finalScore, finalGrade]);

  // Timer countdown
  useEffect(() => {
    if (isSubmitted) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const activeQuestion = questions[currentQuestionIndex] || questions[0];

  // Helper to check if a question is answered correctly
  const isQuestionCorrect = (qIdx: number): boolean => {
    const q = questions[qIdx];
    const ans = userAnswers[qIdx];
    if (ans === undefined) return false;

    if (q.questionType === 'multiple' || q.correctOptionIndices) {
      const expected = (q.correctOptionIndices || []).slice().sort((a, b) => a - b);
      const actual = Array.isArray(ans) ? ans.slice().sort((a, b) => a - b) : [];
      if (expected.length !== actual.length) return false;
      return expected.every((val, idx) => val === actual[idx]);
    }

    return ans === q.correctOptionIndex;
  };

  // Option select handler
  const handleSelectOption = (qIdx: number, optionIdx: number) => {
    if (isSubmitted || submittedQuestions[qIdx]) return;
    const q = questions[qIdx];

    if (q.questionType === 'multiple' || q.correctOptionIndices) {
      setUserAnswers((prev) => {
        const current = Array.isArray(prev[qIdx]) ? (prev[qIdx] as number[]) : [];
        const updated = current.includes(optionIdx)
          ? current.filter((i) => i !== optionIdx)
          : [...current, optionIdx];
        return { ...prev, [qIdx]: updated };
      });
    } else {
      setUserAnswers((prev) => ({
        ...prev,
        [qIdx]: optionIdx,
      }));
    }
  };

  const handleSubmitQuestion = (qIdx: number) => {
    const ans = userAnswers[qIdx];
    const hasAns = ans !== undefined && (Array.isArray(ans) ? ans.length > 0 : true);
    if (!hasAns) return;
    setSubmittedQuestions((prev) => ({ ...prev, [qIdx]: true }));
  };

  const calculateScore = () => {
    let correctCount = 0;
    const allSubmittedMap: Record<number, boolean> = {};
    questions.forEach((_, idx) => {
      allSubmittedMap[idx] = true;
      if (isQuestionCorrect(idx)) {
        correctCount++;
      }
    });

    setSubmittedQuestions(allSubmittedMap);
    const percent = Math.round((correctCount / questions.length) * 100);
    let grade = 'Failed';
    if (percent >= 80) grade = 'Grade S';
    else if (percent >= 65) grade = 'Grade A';
    else if (percent >= 50) grade = 'Grade B';

    setFinalScore(percent);
    setFinalGrade(grade);
    setIsSubmitted(true);
    onCompleteQuiz(percent, grade);
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
    setSubmittedQuestions({});
    setIsSubmitted(false);
    setFinalScore(0);
    setFinalGrade('');
    setSecondsRemaining(25 * 60);
    setCurrentQuestionIndex(0);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to remove quiz progress from localStorage:', err);
    }
  };

  // Format correct answer text for display
  const getCorrectAnswerDisplay = (q: QuizQuestion) => {
    if (q.questionType === 'boolean') {
      return q.correctOptionIndex === 0 ? 'True' : 'False';
    }
    if (q.questionType === 'multiple' || q.correctOptionIndices) {
      const letters = (q.correctOptionIndices || []).map((idx) => String.fromCharCode(65 + idx));
      if (letters.length === 0) return 'None';
      if (letters.length === 1) return letters[0];
      if (letters.length === 2) return `${letters[0]} and ${letters[1]}`;
      return `${letters.slice(0, -1).join(', ')} and ${letters[letters.length - 1]}`;
    }
    const idx = q.correctOptionIndex ?? 0;
    return String.fromCharCode(65 + idx);
  };

  // Format question type badge
  const getFormatBadge = (q: QuizQuestion) => {
    switch (q.questionType) {
      case 'multiple':
        return { label: 'Multiple select', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'sequencing':
        return { label: 'Procedure sequencing', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'boolean':
        return { label: 'True / False', bg: 'bg-blue-100 text-blue-900 border-blue-300' };
      default:
        return { label: 'Single answer', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    }
  };

  // Search filtered answer key rows
  const answerKeyRows = useMemo(() => {
    if (!searchKeyQuery.trim()) return questions;
    const q = searchKeyQuery.toLowerCase();
    return questions.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.explanation && item.explanation.toLowerCase().includes(q)) ||
        (item.handbookSource && item.handbookSource.toLowerCase().includes(q))
    );
  }, [questions, searchKeyQuery]);

  return (
    <div className="w-full max-w-[1280px] mx-auto flex flex-col gap-6 pb-16 text-left">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white rounded-xl p-6 shadow-[0_4px_6px_-1px_rgba(51,51,51,0.05),0_10px_15px_-3px_rgba(51,51,51,0.1)] border border-[#F2E8D8] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-6 h-6 text-[#810912]" />
            <h2 className="text-2xl font-black text-[#1b1c1c] tracking-tight">
              {t.quizTitle || 'Employee Handbook Compliance Quiz'}
            </h2>
            {isEmployeeView ? (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#FAF6EF] text-[#810912] border border-[#e0bfbc]">
                Employee Assessment
              </span>
            ) : (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#810912] text-white">
                HR Admin Audit
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#59413f]">
            {isEmployeeView
              ? '30 questions covering SOPs, approvals, conduct, safety, AI & PDPA compliance. Complete sequentially from Question 1.'
              : '30 handbook-based questions with full HR citations, grading validation, and answer keys.'}
          </p>
        </div>

        {/* View Mode Tabs (Hidden for Employee View to prevent leaking answer key) */}
        {!isEmployeeView ? (
          <div className="flex items-center gap-2 bg-[#FAF6EF] p-1.5 rounded-lg border border-[#e0bfbc] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'quiz'
                  ? 'bg-[#810912] text-white shadow-xs'
                  : 'text-[#59413f] hover:text-[#810912]'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Interactive Quiz</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('answer-key')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'answer-key'
                  ? 'bg-[#810912] text-white shadow-xs'
                  : 'text-[#59413f] hover:text-[#810912]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>HR Answer Key & Sources</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-lg text-xs font-bold shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Secure Compliance Mode</span>
          </div>
        )}
      </div>

      {activeTab === 'answer-key' && !isEmployeeView ? (
        /* HR Answer Key & Handbook Source View (Only accessible for HR Admin) */
        <div className="bg-white rounded-xl p-6 shadow-[0_4px_6px_-1px_rgba(51,51,51,0.05),0_10px_15px_-3px_rgba(51,51,51,0.1)] border border-[#F2E8D8] space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#F2E8D8] pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#1b1c1c] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#810912]" />
                <span>HR Official Answer Key & Handbook Source Basis</span>
              </h3>
              <p className="text-xs text-[#59413f] mt-0.5">
                Every question is directly mapped to specific handbook sections and PDF page citations.
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#59413f] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchKeyQuery}
                onChange={(e) => setSearchKeyQuery(e.target.value)}
                placeholder="Search policy, keyword or page..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF6EF] border border-[#e0bfbc] rounded-lg text-[#1b1c1c] focus:outline-hidden focus:border-[#810912]"
              />
            </div>
          </div>

          {/* Answer Key Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#810912] text-white font-bold uppercase tracking-wider">
                  <th className="p-3 rounded-tl-lg w-12 text-center">Q#</th>
                  <th className="p-3 w-40">Policy Area</th>
                  <th className="p-3">Question Prompt</th>
                  <th className="p-3 w-28 text-center">Answer</th>
                  <th className="p-3 w-72">Rationale & Handbook Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2E8D8]">
                {answerKeyRows.map((q) => {
                  const correctDisp = getCorrectAnswerDisplay(q);
                  const fmt = getFormatBadge(q);

                  return (
                    <tr key={q.id} className="hover:bg-[#FAF6EF]/60 transition-colors">
                      <td className="p-3 font-bold text-[#810912] text-center">{q.id}</td>
                      <td className="p-3 font-medium text-[#59413f]">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#FAF6EF] border border-[#e0bfbc] text-[11px]">
                          {q.category}
                        </span>
                      </td>
                      <td className="p-3 text-[#1b1c1c] font-medium leading-relaxed">
                        <div>{q.question}</div>
                        <div className="mt-1">
                          <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded border font-semibold ${fmt.bg}`}>
                            [{fmt.label}]
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-black text-[#810912]">
                        <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-[#810912]/10 border border-[#810912]/30">
                          {correctDisp}
                        </span>
                      </td>
                      <td className="p-3 space-y-1.5">
                        <p className="text-[#1b1c1c] text-[11px] leading-snug">{q.explanation}</p>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#810912]/5 text-[#810912] border border-[#810912]/20 text-[10px] font-semibold">
                          <BookOpen className="w-3 h-3 text-[#810912]" />
                          <span>{q.handbookSource}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Quiz Mode */
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Main Question & Navigation Area */}
          <div className="flex-1 w-full flex flex-col gap-6">
            {/* Category Status & Info */}
            <div className="bg-white rounded-xl p-4 shadow-[0_4px_6px_-1px_rgba(51,51,51,0.05),0_10px_15px_-3px_rgba(51,51,51,0.1)] border border-[#F2E8D8] overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                <span className="text-xs font-bold text-[#59413f] flex items-center gap-1 mr-1 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-[#810912]" />
                  <span>{isEmployeeView ? 'Module Topics:' : 'Category Filter:'}</span>
                </span>
                {CATEGORY_LIST.map((cat) => {
                  const isCurrentCategory = activeQuestion.category === cat || (cat === 'All' && !isEmployeeView);
                  const isCatSelected = selectedCategory === cat;
                  const count =
                    cat === 'All'
                      ? questions.length
                      : questions.filter((q) => q.category === cat).length;

                  if (isEmployeeView) {
                    // In Employee View: category pills are indicators only, cannot skip questions
                    return (
                      <span
                        key={cat}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeQuestion.category === cat
                            ? 'bg-[#810912] text-white font-bold shadow-2xs'
                            : 'bg-[#FAF6EF] text-[#59413f]/80 border border-[#e0bfbc]/40'
                        }`}
                        title={cat === 'All' ? 'All 30 questions' : `${cat} (${count} questions)`}
                      >
                        {cat === 'All' ? 'All Modules (30)' : `${cat.split(',')[0]} (${count})`}
                      </span>
                    );
                  }

                  // HR Admin View allows filtering & jumping
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        if (cat !== 'All') {
                          const firstIdx = questions.findIndex((q) => q.category === cat);
                          if (firstIdx !== -1) setCurrentQuestionIndex(firstIdx);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isCatSelected
                          ? 'bg-[#810912] text-white font-bold shadow-2xs'
                          : 'bg-[#FAF6EF] text-[#59413f] hover:bg-[#e0bfbc]/30 border border-[#e0bfbc]/50'
                      }`}
                    >
                      {cat === 'All' ? 'All (30)' : `${cat.split(',')[0]} (${count})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timer & Question Progress Bar */}
            <div className="bg-white rounded-xl p-6 shadow-[0_4px_6px_-1px_rgba(51,51,51,0.05),0_10px_15px_-3px_rgba(51,51,51,0.1)] border border-[#F2E8D8]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#810912] uppercase tracking-wider px-2.5 py-1 rounded bg-[#810912]/10 border border-[#810912]/20">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span className="text-xs font-semibold text-[#59413f]">
                    {activeQuestion.category}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Auto-saved</span>
                  </span>
                  <div className="flex items-center gap-2 bg-[#ffdad6] text-[#93000a] px-3.5 py-1.5 rounded-full border border-[#e0bfbc] text-xs font-bold">
                    <Timer className="w-3.5 h-3.5 text-[#ba1a1a]" />
                    <span>{formatTimer(secondsRemaining)} remaining</span>
                  </div>
                </div>
              </div>

              {/* Progress Line */}
              <div className="h-2 w-full bg-[#ebe1d1] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#810912] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Main Question Card */}
            {(() => {
              const activeAns = userAnswers[currentQuestionIndex];
              const hasActiveSelection =
                activeAns !== undefined && (Array.isArray(activeAns) ? activeAns.length > 0 : true);
              const isCurrentQuestionSubmitted = isSubmitted || !!submittedQuestions[currentQuestionIndex];
              const showCorrectAnswerAndRationale = (!isEmployeeView || isSubmitted) && isCurrentQuestionSubmitted && hasActiveSelection;

              return (
                <div className="bg-white rounded-xl p-6 sm:p-8 shadow-[0_4px_6px_-1px_rgba(51,51,51,0.05),0_10px_15px_-3px_rgba(51,51,51,0.1)] border border-[#F2E8D8]">
                  {/* Question Format Badge */}
                  <div className="mb-4 flex items-center justify-between gap-2">
                    {(() => {
                      const fmt = getFormatBadge(activeQuestion);
                      return (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-md border ${fmt.bg}`}>
                          <Info className="w-3.5 h-3.5" />
                          <span>[{fmt.label}]</span>
                        </span>
                      );
                    })()}

                    {/* Status Badge (Only shown after full quiz submission for employees or in HR Admin mode) */}
                    {isCurrentQuestionSubmitted && (!isEmployeeView || isSubmitted) && (
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-md border flex items-center gap-1.5 ${
                          isQuestionCorrect(currentQuestionIndex)
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }`}
                      >
                        {isQuestionCorrect(currentQuestionIndex) ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-700" />
                        )}
                        <span>{isQuestionCorrect(currentQuestionIndex) ? 'Answer Correct' : 'Answer Incorrect'}</span>
                      </span>
                    )}

                    {isCurrentQuestionSubmitted && isEmployeeView && !isSubmitted && (
                      <span className="text-xs font-bold px-3 py-1 rounded-md border bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Answer Saved</span>
                      </span>
                    )}
                  </div>

                  {/* Question Text */}
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#1b1c1c] mb-6 leading-snug">
                    {activeQuestion.question}
                  </h3>

                  {/* Options List */}
                  <div className="flex flex-col gap-3">
                    {activeQuestion.options.map((option, optionIdx) => {
                      const isMultiple = activeQuestion.questionType === 'multiple' || !!activeQuestion.correctOptionIndices;
                      const isSelected = isMultiple
                        ? Array.isArray(activeAns) && activeAns.includes(optionIdx)
                        : activeAns === optionIdx;

                      // Show correct / incorrect styling ONLY after submission AND selection (or in HR Admin mode)
                      let borderStyle = 'border-[#e0bfbc] hover:bg-[#FAF6EF]';
                      let iconBg = 'border-[#8c706e]';

                      if ((!isEmployeeView || isSubmitted) && isCurrentQuestionSubmitted && hasActiveSelection) {
                        const isCorrectOpt = isMultiple
                          ? (activeQuestion.correctOptionIndices || []).includes(optionIdx)
                          : activeQuestion.correctOptionIndex === optionIdx;

                        if (isCorrectOpt) {
                          borderStyle = 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold';
                          iconBg = 'border-emerald-600 bg-emerald-600 text-white';
                        } else if (isSelected && !isCorrectOpt) {
                          borderStyle = 'border-red-500 bg-red-50 text-red-950';
                          iconBg = 'border-red-500 bg-red-500 text-white';
                        }
                      } else if (isSelected) {
                        borderStyle = 'border-[#810912] bg-[#810912]/5 shadow-2xs font-semibold';
                        iconBg = 'border-[#810912] bg-[#810912] text-white';
                      }

                      return (
                        <button
                          key={optionIdx}
                          type="button"
                          disabled={isSubmitted || (isEmployeeView && isCurrentQuestionSubmitted)}
                          onClick={() => handleSelectOption(currentQuestionIndex, optionIdx)}
                          className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all ${
                            isSubmitted || (isEmployeeView && isCurrentQuestionSubmitted) ? 'cursor-default' : 'cursor-pointer'
                          } ${borderStyle}`}
                        >
                          <div
                            className={`w-5 h-5 rounded-${isMultiple ? 'md' : 'full'} border-2 shrink-0 flex items-center justify-center mt-0.5 transition-colors ${iconBg}`}
                          >
                            {isSelected && (
                              <div
                                className={
                                  isMultiple
                                    ? 'w-2.5 h-2.5 bg-white rounded-xs'
                                    : 'w-2 h-2 rounded-full bg-white'
                                }
                              ></div>
                            )}
                          </div>
                          <span className="text-sm text-[#1b1c1c] leading-relaxed flex-1">
                            {option}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Submit Answer Button or Status Bar */}
                  {!isCurrentQuestionSubmitted ? (
                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSubmitQuestion(currentQuestionIndex)}
                        disabled={!hasActiveSelection}
                        className={`px-6 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                          hasActiveSelection
                            ? 'bg-[#810912] text-white hover:bg-[#a32626] shadow-xs hover:-translate-y-0.5'
                            : 'bg-[#ebe1d1] text-[#8c706e] opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submit Answer</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`mt-5 p-3 rounded-lg border text-xs font-bold flex items-center justify-between ${
                        isEmployeeView && !isSubmitted
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : isQuestionCorrect(currentQuestionIndex)
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-red-50 text-red-900 border-red-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isEmployeeView && !isSubmitted ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Answer recorded. Click 'Next Question' to proceed.</span>
                          </>
                        ) : isQuestionCorrect(currentQuestionIndex) ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Correct! Handbook rationale and source unlocked below.</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>Incorrect selection. Official answer and rationale unlocked below.</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rationale & Source Box (Only shown for HR Admin or post-submission for Employees) */}
                  {showCorrectAnswerAndRationale && (
                    <div className="mt-6 p-4 rounded-xl bg-[#FAF6EF] border border-[#e0bfbc] space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#810912] flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#810912]" />
                          <span>Handbook Reference & Answer Rationale</span>
                        </span>
                        <span className="text-xs font-extrabold text-[#1b1c1c]">
                          Correct Answer: <span className="text-[#810912]">{getCorrectAnswerDisplay(activeQuestion)}</span>
                        </span>
                      </div>

                      <p className="text-xs text-[#1b1c1c] leading-relaxed">
                        {activeQuestion.explanation}
                      </p>

                      <div className="pt-2 flex items-center gap-2 text-[11px] font-semibold text-[#810912]">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Supporting Source: {activeQuestion.handbookSource}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Question Card Bottom Navigation Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className={`w-full sm:w-auto px-6 py-3 rounded-lg border-2 border-[#8c706e] text-[#59413f] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  currentQuestionIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#FAF6EF]'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.previousBtn || 'Previous Question'}</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = Math.min(questions.length - 1, currentQuestionIndex + 1);
                      if (isEmployeeView && !isSubmitted && nextIdx > maxUnlockedIndex) {
                        return;
                      }
                      setCurrentQuestionIndex(nextIdx);
                    }}
                    disabled={isEmployeeView && !isSubmitted && currentQuestionIndex + 1 > maxUnlockedIndex}
                    className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                      isEmployeeView && !isSubmitted && currentQuestionIndex + 1 > maxUnlockedIndex
                        ? 'bg-[#ebe1d1] text-[#8c706e] opacity-60 cursor-not-allowed'
                        : 'bg-[#810912] text-white hover:bg-[#a32626] hover:-translate-y-0.5'
                    }`}
                  >
                    <span>{t.saveNextBtn || 'Next Question'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={calculateScore}
                    className="w-full sm:w-auto px-8 py-3 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t.submitAssessment || 'Submit Compliance Assessment'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Results Banner if Submitted */}
            {isSubmitted && (
              <div className="bg-[#FAF6EF] border-2 border-[#810912] rounded-xl p-6 shadow-md mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                    <h4 className="text-lg font-black text-[#1b1c1c]">
                      Compliance Assessment Completed!
                    </h4>
                  </div>
                  <p className="text-sm text-[#59413f]">
                    Official Score: <strong className="text-[#810912] text-base">{finalScore}%</strong> — Grade:{' '}
                    <strong className="text-[#810912] text-base">{finalGrade}</strong>
                  </p>
                  <p className="text-xs text-[#59413f] mt-1">
                    Your answers and handbook page sources have been recorded to your official employee profile.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleResetQuiz}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-[#810912] text-[#810912] font-bold text-xs hover:bg-[#810912]/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake Assessment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      exportFullSignedHandbookPdf({
                        employeeName,
                        employeeId,
                        department,
                        position,
                        signedDate: new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }),
                        signatureTextOrImage: employeeName,
                        quizScorePercent: finalScore,
                        quizGrade: finalGrade,
                        quizQuestions: questions,
                        userAnswers,
                      });
                    }}
                    className="w-full sm:w-auto py-2.5 px-5 rounded-lg bg-[#810912] text-white font-extrabold text-xs hover:bg-[#a32626] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                  >
                    <Download className="w-4 h-4 text-[#D4AF37]" />
                    <span>Download Signed PDF & Quiz Record</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column Sidebar: Question Navigator & Grading Rules */}
          <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
            {/* Rules & Grading Legend */}
            <div className="bg-white rounded-xl p-6 shadow-[0_4px_6px_-1px_rgba(51,51,51,0.05),0_10px_15px_-3px_rgba(51,51,51,0.1)] border border-[#F2E8D8]">
              <h4 className="text-sm font-bold text-[#1b1c1c] mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#810912]" />
                <span>Assessment Rules & Grading</span>
              </h4>

              <div className="flex flex-col gap-2.5 mb-5 text-xs text-[#59413f]">
                <p className="flex items-start gap-2">
                  <CheckCheck className="w-4 h-4 text-[#8c706e] shrink-0 mt-0.5" />
                  <span>
                    <strong>Pass mark: 65% (Grade A)</strong> required for onboarding sign-off.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#8c706e] shrink-0 mt-0.5" />
                  <span>
                    <strong>Scoring rule:</strong> Multiple-select questions receive the point only when every correct option and no incorrect option is selected.
                  </span>
                </p>
              </div>

              <h5 className="text-[11px] font-bold text-[#1b1c1c] uppercase tracking-wider mb-2">
                Grading Tiers
              </h5>
              <ul className="flex flex-col gap-1.5 text-xs">
                <li className="flex justify-between p-2 rounded-md bg-[#FAF6EF] border border-[#e0bfbc]">
                  <span className="font-bold text-[#810912]">Grade S</span>
                  <span className="text-[#59413f]">80 - 100%</span>
                </li>
                <li className="flex justify-between p-2 rounded-md bg-[#FAF6EF]">
                  <span className="font-bold text-[#1b1c1c]">Grade A (Pass)</span>
                  <span className="text-[#59413f]">65 - 79%</span>
                </li>
                <li className="flex justify-between p-2 rounded-md bg-[#FAF6EF]">
                  <span className="font-bold text-[#1b1c1c]">Grade B</span>
                  <span className="text-[#59413f]">50 - 64%</span>
                </li>
                <li className="flex justify-between p-2 rounded-md bg-[#ffdad6] text-[#93000a]">
                  <span className="font-bold">Failed</span>
                  <span>0 - 49%</span>
                </li>
              </ul>
            </div>

            {/* Question Navigator Grid (30 Items) */}
            <div className="bg-white rounded-xl p-6 shadow-[0_4px_6px_-1px_rgba(51,51,51,0.05),0_10px_15px_-3px_rgba(51,51,51,0.1)] border border-[#F2E8D8]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-[#1b1c1c] flex items-center gap-2">
                  <Grid className="w-4 h-4 text-[#59413f]" />
                  <span>Question Map (30)</span>
                </h4>
                <span className="text-[11px] font-bold text-[#810912]">
                  {Object.keys(userAnswers).length} / 30 Answered
                </span>
              </div>

              {/* Grid 5x6 */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, qIdx) => {
                  const ans = userAnswers[qIdx];
                  const isAnswered =
                    ans !== undefined &&
                    (Array.isArray(ans) ? ans.length > 0 : true);
                  const isCurrent = qIdx === currentQuestionIndex;
                  const isQSubmitted = isSubmitted || !!submittedQuestions[qIdx];
                  const isCorrect = isQSubmitted && isQuestionCorrect(qIdx);
                  const isIncorrect = isQSubmitted && !isQuestionCorrect(qIdx);
                  const isLocked = isEmployeeView && !isSubmitted && qIdx > maxUnlockedIndex;

                  let btnBg = 'border border-[#e0bfbc] text-[#8c706e] hover:bg-[#FAF6EF]';

                  if (isLocked) {
                    btnBg = 'bg-[#FAF6EF]/60 border border-gray-200 text-gray-400 opacity-50 cursor-not-allowed';
                  } else if ((!isEmployeeView || isSubmitted) && isQSubmitted) {
                    if (isCorrect) {
                      btnBg = 'bg-emerald-600 text-white font-bold border-emerald-700';
                    } else if (isIncorrect) {
                      btnBg = 'bg-red-600 text-white font-bold border-red-700';
                    }
                  } else if (isCurrent) {
                    btnBg = 'bg-[#810912]/10 border-2 border-[#810912] text-[#810912] font-black ring-2 ring-[#810912]/20';
                  } else if (isAnswered) {
                    btnBg = 'bg-[#FAF6EF] border border-[#810912]/40 text-[#1b1c1c] font-bold';
                  }

                  return (
                    <button
                      key={qIdx}
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        if (!isLocked) setCurrentQuestionIndex(qIdx);
                      }}
                      className={`w-9 h-9 rounded-md text-xs flex items-center justify-center transition-all ${
                        isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${btnBg}`}
                      title={
                        isLocked
                          ? `Question ${qIdx + 1} locked: Please answer earlier questions first.`
                          : `Question ${qIdx + 1}: ${questions[qIdx].category}`
                      }
                    >
                      {isLocked ? <Lock className="w-3 h-3 text-gray-400" /> : qIdx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] pt-3 border-t border-[#e0bfbc]">
                <div className="flex items-center gap-1.5 text-[#59413f]">
                  <div className="w-3 h-3 rounded-xs bg-[#FAF6EF] border border-[#810912]/40"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#810912] font-bold">
                  <div className="w-3 h-3 rounded-xs border-2 border-[#810912] bg-[#810912]/10"></div>
                  <span>Current</span>
                </div>
                {(!isEmployeeView || isSubmitted) ? (
                  <>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Correct</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-red-700 font-semibold">
                      <XCircle className="w-3 h-3 text-red-600" />
                      <span>Incorrect</span>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 flex items-center gap-1.5 text-gray-500">
                    <Lock className="w-3 h-3 text-gray-400" />
                    <span>Locked (Linear flow)</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={calculateScore}
                className="w-full mt-5 bg-[#810912] text-white font-bold text-xs py-2.5 rounded-lg hover:bg-[#a32626] transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.submitAssessment || 'Submit Compliance Quiz'}</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
