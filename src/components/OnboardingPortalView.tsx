import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import { Candidate, Employee } from '../types';
import {
  HANDBOOK_MODULES,
  INITIAL_USER,
  QUIZ_QUESTIONS,
} from '../onboarding-portal/data';
import { HandbookModule, UserProfile } from '../onboarding-portal/types';
import { LanguageProvider } from '../onboarding-portal/i18n/LanguageContext';
import { LanguageSelector } from '../onboarding-portal/components/LanguageSelector';
import { HandbookView } from '../onboarding-portal/components/HandbookView';
import { QuizView } from '../onboarding-portal/components/QuizView';
import {
  createOrResumeSigningSession,
  downloadFinalizedHandbook,
  finalizeSignedHandbook,
  removeSignatureMark,
  saveSignatureMark,
  saveSigningQuizResult,
} from '../onboarding-portal/signing/signingService';
import {
  FINAL_SIGNATURE_PART_NUMBER,
  HandbookSignatureMark,
  HandbookSigningSession,
  INITIAL_PART_NUMBERS,
} from '../onboarding-portal/signing/types';

type PortalPage = 'journey' | 'handbook' | 'quiz' | 'completion';

interface OnboardingPortalViewProps {
  employees: Employee[];
  candidates: Candidate[];
  currentUserName?: string | null;
  currentUserEmail?: string | null;
  currentUserRole?: string | null;
  onShowNotification: (title: string, message: string) => void;
}

const PORTAL_NAV_ITEMS: Array<{
  id: PortalPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'journey', label: 'My Onboarding', icon: LayoutDashboard },
  { id: 'handbook', label: 'Employee Handbook', icon: BookOpen },
  { id: 'quiz', label: 'Compliance Quiz', icon: GraduationCap },
  { id: 'completion', label: 'Completion Record', icon: ClipboardCheck },
];

function modulesFromSignatureMarks(
  marks: Record<number, HandbookSignatureMark>
): HandbookModule[] {
  const allInitialsComplete = INITIAL_PART_NUMBERS.every((partNumber) => marks[partNumber]);
  let firstIncompleteFound = false;

  return HANDBOOK_MODULES.map((module) => {
    const mark = marks[module.id];
    if (mark) {
      return {
        ...module,
        status: 'completed',
        completedSections: module.sectionsCount,
      };
    }

    const canStart =
      module.id === 1 ||
      (!firstIncompleteFound &&
        (module.id < FINAL_SIGNATURE_PART_NUMBER || allInitialsComplete));
    firstIncompleteFound = true;
    return {
      ...module,
      status: canStart ? 'in-progress' : 'locked',
      completedSections: 0,
    };
  });
}

function OnboardingPortalContent({
  employees,
  candidates,
  currentUserName,
  currentUserEmail,
  currentUserRole,
  onShowNotification,
}: OnboardingPortalViewProps) {
  const [activePage, setActivePage] = useState<PortalPage>('journey');
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidates[0]?.id || '');
  const [signatureMarks, setSignatureMarks] = useState<
    Record<number, HandbookSignatureMark>
  >({});
  const [modules, setModules] = useState<HandbookModule[]>(() =>
    modulesFromSignatureMarks({})
  );
  const [quizResult, setQuizResult] = useState<{ score: number; grade: string } | null>(
    null
  );
  const [signingSession, setSigningSession] = useState<HandbookSigningSession | null>(
    null
  );
  const [isSigningSaving, setIsSigningSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [signingError, setSigningError] = useState<string | null>(null);

  useEffect(() => {
    if (
      candidates.length > 0 &&
      !candidates.some((candidate) => candidate.id === selectedCandidateId)
    ) {
      setSelectedCandidateId(candidates[0].id);
    }
  }, [candidates, selectedCandidateId]);

  const user = useMemo<UserProfile>(() => {
    const matchedEmployee = employees.find(
      (employee) =>
        employee.email.toLowerCase() === String(currentUserEmail || '').toLowerCase()
    );

    return {
      ...INITIAL_USER,
      id: matchedEmployee?.id || currentUserEmail || 'HR-ADMIN',
      name: matchedEmployee?.name || currentUserName || 'HR Administrator',
      email: matchedEmployee?.email || currentUserEmail || 'hr@redpoint.com.my',
      role: currentUserRole?.toLowerCase().includes('admin') ? 'hr-admin' : 'employee',
      avatarUrl: matchedEmployee?.avatarUrl || '/redpoint-logo.png',
      department: matchedEmployee?.department || 'Human Resources',
      joinDate: matchedEmployee?.dateOfJoined || INITIAL_USER.joinDate,
    };
  }, [currentUserEmail, currentUserName, currentUserRole, employees]);

  const selectedCandidate =
    candidates.find((candidate) => candidate.id === selectedCandidateId) || candidates[0];
  const linkedEmployee = employees.find(
    (employee) =>
      employee.email.toLowerCase() === selectedCandidate?.email.toLowerCase()
  );
  const journeyName = selectedCandidate?.name || linkedEmployee?.name || user.name;
  const journeyDepartment =
    selectedCandidate?.department || linkedEmployee?.department || user.department;
  const journeyPosition =
    selectedCandidate?.designation || linkedEmployee?.designation || 'Employee';
  const signingSubjectType: 'employee' | 'candidate' = linkedEmployee
    ? 'employee'
    : selectedCandidate
      ? 'candidate'
      : 'employee';
  const signingSubjectId = linkedEmployee?.id || selectedCandidate?.id || user.id;
  const signingSubjectEmail =
    linkedEmployee?.email || selectedCandidate?.email || user.email;
  const signingEntityId =
    linkedEmployee?.entityId || selectedCandidate?.entityId || null;

  useEffect(() => {
    let cancelled = false;
    setSignatureMarks({});
    setModules(modulesFromSignatureMarks({}));
    setQuizResult(null);
    setSigningSession(null);
    setSigningError(null);

    void createOrResumeSigningSession({
      subjectType: signingSubjectType,
      subjectId: signingSubjectId,
      subjectEmail: signingSubjectEmail,
      entityId: signingEntityId,
    })
      .then(({ session, marks }) => {
        if (cancelled) return;
        setSigningSession(session);
        setSignatureMarks(marks);
        setModules(modulesFromSignatureMarks(marks));
        if (
          session.quizScorePercent !== null &&
          session.quizScorePercent !== undefined &&
          session.quizGrade
        ) {
          setQuizResult({
            score: session.quizScorePercent,
            grade: session.quizGrade,
          });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSigningError(
          error instanceof Error ? error.message : 'Secure handbook signing is unavailable.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [signingEntityId, signingSubjectEmail, signingSubjectId, signingSubjectType]);

  const profileComplete = Boolean(selectedCandidate || linkedEmployee);
  const onboardingFormProgress = selectedCandidate?.progress ?? (linkedEmployee ? 100 : 0);
  const completedModules = modules.filter((module) => module.status === 'completed').length;
  const handbookPercent =
    modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0;
  const overallProgress = Math.round(
    (profileComplete ? 25 : 0) +
      onboardingFormProgress * 0.25 +
      handbookPercent * 0.25 +
      (quizResult ? 25 : 0)
  );
  const partInitialDataUrls = Object.fromEntries(
    INITIAL_PART_NUMBERS.flatMap((partNumber) => {
      const imageDataUrl = signatureMarks[partNumber]?.imageDataUrl;
      return imageDataUrl ? [[partNumber, imageDataUrl]] : [];
    })
  ) as Record<number, string>;
  const finalSignatureDataUrl =
    signatureMarks[FINAL_SIGNATURE_PART_NUMBER]?.imageDataUrl || null;
  const completionReady =
    INITIAL_PART_NUMBERS.every((partNumber) => signatureMarks[partNumber]) &&
    Boolean(finalSignatureDataUrl) &&
    Boolean(quizResult) &&
    Boolean(signingSession?.quizPassed);

  const handleAcknowledgeModule = (moduleId: number) => {
    setModules((currentModules) =>
      currentModules.map((module) => {
        if (module.id === moduleId) {
          return {
            ...module,
            status: 'completed',
            completedSections: module.sectionsCount,
          };
        }
        if (module.id === moduleId + 1 && module.status === 'locked') {
          return { ...module, status: 'in-progress' };
        }
        return module;
      })
    );
  };

  const saveMark = async (
    partNumber: number,
    kind: 'initial' | 'final_signature',
    imageDataUrl: string
  ) => {
    if (!signingSession) {
      throw new Error(
        signingError || 'Please open this onboarding record through the secure employee link.'
      );
    }
    setIsSigningSaving(true);
    try {
      const savedMark = await saveSignatureMark({
        session: signingSession,
        partNumber,
        kind,
        imageDataUrl,
      });
      setSignatureMarks((currentMarks) => {
        const nextMarks = { ...currentMarks, [partNumber]: savedMark };
        setModules(modulesFromSignatureMarks(nextMarks));
        return nextMarks;
      });
      setSigningError(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'The handwritten mark could not be saved.';
      setSigningError(message);
      onShowNotification('Signature Not Saved', message);
      throw error;
    } finally {
      setIsSigningSaving(false);
    }
  };

  const clearMark = async (partNumber: number) => {
    const mark = signatureMarks[partNumber];
    if (!mark || !signingSession) return;
    setIsSigningSaving(true);
    try {
      await removeSignatureMark(signingSession, mark);
      setSignatureMarks((currentMarks) => {
        const nextMarks = { ...currentMarks };
        delete nextMarks[partNumber];
        setModules(modulesFromSignatureMarks(nextMarks));
        return nextMarks;
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'The handwritten mark could not be cleared.';
      onShowNotification('Signature Not Cleared', message);
      throw error;
    } finally {
      setIsSigningSaving(false);
    }
  };

  const handleCompleteQuiz = (score: number, grade: string) => {
    setQuizResult({ score, grade });
    if (!signingSession) {
      setSigningError(
        signingError || 'Please open this onboarding record through the secure employee link.'
      );
      return;
    }
    setIsSigningSaving(true);
    void saveSigningQuizResult(signingSession, score, grade)
      .then((updatedSession) => {
        setSigningSession(updatedSession);
        setSigningError(null);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'The quiz result could not be saved.';
        setSigningError(message);
        onShowNotification('Quiz Sync Failed', message);
      })
      .finally(() => setIsSigningSaving(false));
  };

  const handleDownloadCompletionRecord = async () => {
    if (!completionReady || !quizResult) {
      onShowNotification(
        'Record Not Ready',
        signingError ||
          'Complete all handbook acknowledgements and the compliance quiz first.'
      );
      return;
    }
    if (!signingSession) {
      onShowNotification(
        'Secure Session Required',
        signingError || 'Please sign in through the secure employee onboarding link.'
      );
      return;
    }

    setIsFinalizing(true);
    try {
      const result = await finalizeSignedHandbook(signingSession);
      downloadFinalizedHandbook(result.downloadUrl, journeyName, result.revision);
      setSigningSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              status: 'finalized',
              finalPdfSha256: result.sha256,
            }
          : currentSession
      );
      onShowNotification(
        'Completion Record Generated',
        `The signed onboarding record for ${journeyName} has been archived and downloaded.`
      );
    } catch (error: unknown) {
      onShowNotification(
        'Finalization Failed',
        error instanceof Error ? error.message : 'The signed handbook could not be finalized.'
      );
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="min-w-0 space-y-6 text-left">
      <div className="flex flex-col gap-4 border-b border-neutral-border pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase text-primary">Employee Journey</p>
          <h2 className="mt-1 text-2xl font-bold text-on-background">Onboarding Portal</h2>
          <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
            Complete handbook acknowledgements, the compliance assessment, and the final
            signed onboarding record.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {candidates.length > 0 && (
            <label className="flex items-center gap-2 text-xs font-bold text-on-surface">
              <span className="sr-only">Employee journey</span>
              <select
                value={selectedCandidate?.id || ''}
                onChange={(event) => setSelectedCandidateId(event.target.value)}
                className="h-9 max-w-52 rounded-md border border-neutral-border bg-white px-2 text-xs font-semibold outline-none focus:border-primary"
                aria-label="Employee journey"
              >
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <LanguageSelector variant="compact" />
        </div>
      </div>

      <div
        className="grid gap-1 rounded-lg border border-neutral-border bg-white p-1 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Onboarding Portal sections"
      >
        {PORTAL_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-colors ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:bg-neutral-50 hover:text-on-surface'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0">
        {activePage === 'journey' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-5 border-b border-neutral-border pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold text-primary">{journeyDepartment}</p>
                <h3 className="mt-1 text-2xl font-bold text-on-background">
                  {journeyName}
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {selectedCandidate
                    ? `${selectedCandidate.stage} stage`
                    : 'Employee onboarding record'}
                </p>
              </div>
              <div className="w-full max-w-sm">
                <div className="mb-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-on-surface-variant">Overall completion</span>
                  <span className="text-primary">{overallProgress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <JourneyStep
                icon={UserRoundCheck}
                title="Employee profile"
                detail={
                  profileComplete
                    ? 'Identity and employment profile registered.'
                    : 'Employee profile has not been registered.'
                }
                complete={profileComplete}
              />
              <JourneyStep
                icon={FileCheck2}
                title="Onboarding form"
                detail={`${onboardingFormProgress}% of statutory and employment details completed.`}
                complete={onboardingFormProgress >= 100}
              />
              <JourneyStep
                icon={BookOpen}
                title="Employee handbook"
                detail={`${completedModules} of ${modules.length} handbook parts acknowledged.`}
                complete={completedModules === modules.length}
                actionLabel="Continue handbook"
                onAction={() => setActivePage('handbook')}
              />
              <JourneyStep
                icon={GraduationCap}
                title="Compliance quiz"
                detail={
                  quizResult
                    ? `${quizResult.score}% (${quizResult.grade})`
                    : 'Assessment has not been completed.'
                }
                complete={Boolean(quizResult)}
                actionLabel={quizResult ? 'Review quiz' : 'Take quiz'}
                onAction={() => setActivePage('quiz')}
              />
            </div>
          </div>
        )}

        {activePage === 'handbook' && (
          <HandbookView
            modules={modules}
            onAcknowledgeModule={handleAcknowledgeModule}
            onOpenAiAssistant={() => undefined}
            partInitials={partInitialDataUrls}
            finalSignatureDataUrl={finalSignatureDataUrl}
            isSigningLocked={
              !signingSession ||
              signingSession.status === 'finalized' ||
              isSigningSaving ||
              isFinalizing
            }
            onSavePartInitial={(moduleId, signature) =>
              saveMark(moduleId, 'initial', signature)
            }
            onClearPartInitial={clearMark}
            onSaveFinalSignature={(signature) =>
              saveMark(FINAL_SIGNATURE_PART_NUMBER, 'final_signature', signature)
            }
            onClearFinalSignature={() => clearMark(FINAL_SIGNATURE_PART_NUMBER)}
            onDownloadFullHandbook={() => {
              void handleDownloadCompletionRecord();
            }}
          />
        )}

        {activePage === 'quiz' && (
          <QuizView questions={QUIZ_QUESTIONS} onCompleteQuiz={handleCompleteQuiz} />
        )}

        {activePage === 'completion' && (
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="border-b border-neutral-border pb-5">
              <p className="text-xs font-bold text-primary">Final Record</p>
              <h3 className="mt-1 text-2xl font-bold text-on-background">
                Completion Record
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Generate the official signed handbook and quiz record after all
                prerequisites are complete.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <RequirementStatus
                label="Handbook"
                value={`${completedModules}/${modules.length}`}
                complete={completedModules === modules.length}
              />
              <RequirementStatus
                label="Compliance Quiz"
                value={quizResult ? `${quizResult.score}%` : 'Pending'}
                complete={Boolean(quizResult)}
              />
              <RequirementStatus
                label="Digital Signature"
                value={finalSignatureDataUrl ? 'Captured' : 'Pending'}
                complete={Boolean(finalSignatureDataUrl)}
              />
            </div>

            <div className="flex flex-col gap-4 border-y border-neutral-border py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                    completionReady
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-neutral-100 text-on-surface-variant'
                  }`}
                >
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">
                    {completionReady ? 'Record ready for download' : 'Requirements pending'}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {completionReady
                      ? `All onboarding requirements for ${journeyName} are complete.`
                      : 'Finish the handbook acknowledgements and compliance quiz to unlock the record.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleDownloadCompletionRecord();
                }}
                disabled={!completionReady || isSigningSaving || isFinalizing}
                className="flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-on-surface-variant"
              >
                <Download className="h-4 w-4" />
                Download signed record
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface JourneyStepProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  complete: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

function JourneyStep({
  icon: Icon,
  title,
  detail,
  complete,
  actionLabel,
  onAction,
}: JourneyStepProps) {
  return (
    <div className="flex min-h-28 items-start gap-4 rounded-lg border border-neutral-border bg-white p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
          complete
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-primary-container/20 text-primary'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-on-surface">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{detail}</p>
          </div>
          {complete ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <Clock3 className="h-4 w-4 shrink-0 text-amber-600" />
          )}
        </div>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-3 flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function RequirementStatus({
  label,
  value,
  complete,
}: {
  label: string;
  value: string;
  complete: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-on-surface-variant">{label}</p>
        {complete ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <Clock3 className="h-4 w-4 text-amber-600" />
        )}
      </div>
      <p className="mt-3 text-lg font-bold text-on-surface">{value}</p>
    </div>
  );
}

export default function OnboardingPortalView(props: OnboardingPortalViewProps) {
  return (
    <LanguageProvider>
      <OnboardingPortalContent {...props} />
    </LanguageProvider>
  );
}
