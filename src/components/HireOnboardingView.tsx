import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  LayoutGrid,
  Link2,
  LoaderCircle,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Share2,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { CorporateEntity, Candidate, CandidateEvaluation, CandidateInterview, CandidateOffer, CandidatePipelineStatus, Employee } from '../types';
import JobApplicationForm from './JobApplicationForm';
import OnboardingForm from './OnboardingForm';
import CandidateEvaluationPanel from './CandidateEvaluationPanel';
import { getGmt8DateString } from '../lib/dateUtils';
import { getCandidateNameFromApplication } from '../lib/employeeInput';
import { useFeedback } from './GlobalFeedbackSystem';
import {
  getHireOnboardingSectionFromPath,
  getPathForHireOnboardingSection,
  HireOnboardingSection,
} from '../lib/appRoutes';
import {
  addDays,
  createHiringId,
  getBroadCandidateStage,
  getCandidatePipelineStatus,
  getInterviewQueue,
  getOfferStatusLabel,
  getPipelineStatusLabel,
  isShareLinkActive,
  nowIso,
  toDateTime,
} from '../lib/hiringPipelineDomain';
import {
  createCandidateShareLink,
  deleteCandidatePipelineData,
  ensureCandidateIntake,
  getCandidateEvaluation,
  getCandidateInterview,
  getCandidateOffer,
  HiringPipelineData,
  loadHiringPipelineData,
  recordPipelineEvent,
  recordShareDelivery,
  saveEvaluation,
  saveInterview,
  saveOffer,
} from '../lib/hiringPipelineService';

const OnboardingPortalView = React.lazy(() => import('./OnboardingPortalView'));

interface OnboardingTask {
  id: string;
  title: string;
  completed: boolean;
  category: 'Compliance' | 'IT Setup' | 'Training' | 'Admin';
}

interface HireOnboardingViewProps {
  entities: CorporateEntity[];
  onShowNotification: (title: string, message: string) => void;
  onAddEmployee?: (newEmployee: Employee) => Promise<void>;
  employees: Employee[];
  candidates: Candidate[];
  onAddCandidate: (newCandidate: Candidate) => Promise<void>;
  onDeleteCandidate: (id: string) => Promise<void>;
  onRestoreCandidate: (candidate: Candidate) => Promise<void>;
  onUpdateCandidate: (id: string, updates: Partial<Candidate>) => Promise<void>;
  onUpdateEmployee?: (id: string, updates: Partial<Employee>) => Promise<void>;
  currentUserName?: string | null;
  currentUserEmail?: string | null;
  currentUserRole?: string | null;
}

type PipelineQueue = 'applied' | 'kiv' | 'interviewing' | 'offered' | 'onboarding';
type InterviewQueue = 'upcoming' | 'passed';
type OfferFilter = 'all' | CandidateOffer['status'];
type StatusModalKind = 'kiv' | 'reject' | 'cancel' | 'other';

const INITIAL_ONBOARDING_TASKS: OnboardingTask[] = [
  { id: 'T-01', title: 'Submit signed Letter of Offer', completed: true, category: 'Compliance' },
  { id: 'T-02', title: 'Upload LHDN Tax & KWSP EPF Credentials', completed: true, category: 'Compliance' },
  { id: 'T-03', title: 'Configure corporate GSuite email address', completed: true, category: 'IT Setup' },
  { id: 'T-04', title: 'Ship company Macbook & accessories', completed: false, category: 'IT Setup' },
  { id: 'T-05', title: 'Complete first-week security training module', completed: false, category: 'Training' },
  { id: 'T-06', title: 'Conduct HR statutory compliance walkthrough', completed: false, category: 'Admin' },
];

const blankEvaluation = (candidateId: string): CandidateEvaluation => ({
  id: createHiringId('EVAL'),
  candidateId,
  evaluators: [{
    id: createHiringId('EVALUATOR'),
    name: '',
    designation: '',
    date: getGmt8DateString(),
  }],
  technicalScore: 0,
  communicationScore: 0,
  culturalFitScore: 0,
  leadershipScore: 0,
  overallRecommendation: 'Hold',
  additionalComments: '',
  updatedAt: nowIso(),
});

const dateInDays = (days: number) => addDays(new Date(), days).toISOString().slice(0, 10);

const statusBadgeClass = (status: CandidatePipelineStatus) => {
  if (status === 'rejected' || status === 'offer_rejected' || status === 'interview_cancelled') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (status === 'kiv' || status === 'interview_no_show' || status === 'interview_withdrew') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (status === 'offer_accepted' || status === 'onboarding') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (status === 'interview_scheduled' || status === 'interview_passed') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return 'bg-neutral-100 text-on-surface-variant border-neutral-border';
};

export default function HireOnboardingView({
  entities,
  onShowNotification,
  onAddEmployee,
  employees,
  candidates,
  onAddCandidate,
  onDeleteCandidate,
  onRestoreCandidate,
  onUpdateCandidate,
  onUpdateEmployee,
  currentUserName,
  currentUserEmail,
  currentUserRole,
}: HireOnboardingViewProps) {
  const { confirmAction, showUndoToast } = useFeedback();
  const [tasks, setTasks] = useState<OnboardingTask[]>(INITIAL_ONBOARDING_TASKS);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [activeTab, setActiveTab] = useState<HireOnboardingSection>(() => (
    getHireOnboardingSectionFromPath(window.location.pathname)
  ));
  const [activeQueue, setActiveQueue] = useState<PipelineQueue>('applied');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [interviewQueue, setInterviewQueue] = useState<InterviewQueue>('upcoming');
  const [offerFilter, setOfferFilter] = useState<OfferFilter>('all');
  const [pipelineData, setPipelineData] = useState<HiringPipelineData>({
    history: [],
    interviews: [],
    evaluations: [],
    offers: [],
    shareLinks: [],
    deliveries: [],
  });
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [scheduleCandidateId, setScheduleCandidateId] = useState('');
  const [scheduleDate, setScheduleDate] = useState(dateInDays(1));
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [scheduleMeetingLink, setScheduleMeetingLink] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');

  const [statusModal, setStatusModal] = useState<{
    kind: StatusModalKind;
    candidateId: string;
    notes: string;
    followUpDate: string;
    interviewAction?: 'no_show' | 'withdrew' | 'kiv';
  } | null>(null);
  const [evaluationCandidateId, setEvaluationCandidateId] = useState('');
  const [evaluationDraft, setEvaluationDraft] = useState<CandidateEvaluation | null>(null);
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);

  const navigateToSection = (section: HireOnboardingSection, replace = false) => {
    setActiveTab(section);
    const nextPath = getPathForHireOnboardingSection(section);
    if (window.location.pathname !== nextPath || window.location.search) {
      window.history[replace ? 'replaceState' : 'pushState']({ section }, '', nextPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => setActiveTab(getHireOnboardingSectionFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const availableDepartments = useMemo(() => {
    try {
      const saved = localStorage.getItem('company_departments');
      return saved
        ? JSON.parse(saved) as string[]
        : ['Product & Engineering', 'Finance', 'Human Resources', 'Sales & Marketing', 'Strategy', 'Operations'];
    } catch {
      return ['Product & Engineering', 'Finance', 'Human Resources', 'Sales & Marketing', 'Strategy', 'Operations'];
    }
  }, []);

  const candidateIds = candidates.map((candidate) => candidate.id).join('|');
  useEffect(() => {
    let cancelled = false;
    setIsLoadingPipeline(true);
    void loadHiringPipelineData()
      .then(async (loaded) => {
        let next = loaded;
        for (const candidate of candidates) {
          next = await ensureCandidateIntake(next, candidate, currentUserName);
        }
        if (!cancelled) setPipelineData(next);
      })
      .catch((error) => {
        if (!cancelled) {
          onShowNotification('Hiring Pipeline', `Pipeline history could not be loaded: ${error.message || error}`);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPipeline(false);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateIds, currentUserName, onShowNotification]);

  useEffect(() => {
    if (!selectedCandidateId || !candidates.some((candidate) => candidate.id === selectedCandidateId)) {
      setSelectedCandidateId(candidates[0]?.id || '');
    }
  }, [candidates, selectedCandidateId]);

  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId);
  const selectedInterview = selectedCandidate
    ? getCandidateInterview(pipelineData, selectedCandidate.id)
    : undefined;
  const selectedEvaluation = selectedCandidate
    ? getCandidateEvaluation(pipelineData, selectedCandidate.id)
    : undefined;

  const getStatus = (candidate: Candidate): CandidatePipelineStatus => {
    const latestEvent = pipelineData.history
      .filter((event) => event.candidateId === candidate.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return latestEvent?.toStatus || getCandidatePipelineStatus(candidate);
  };
  const getOffer = (candidateId: string) => {
    const persisted = getCandidateOffer(pipelineData, candidateId);
    if (persisted) return persisted;
    const candidate = candidates.find((item) => item.id === candidateId);
    const status = candidate ? getStatus(candidate) : undefined;
    if (!status || !['offer_preparing', 'offer_sent', 'offer_accepted', 'offer_rejected'].includes(status)) {
      return undefined;
    }
    return {
      id: `legacy-offer-${candidateId}`,
      candidateId,
      status,
      statusUpdatedAt: candidate?.pipelineUpdatedAt || nowIso(),
      responseNotes: '',
    } as CandidateOffer;
  };
  const selectedOffer = selectedCandidate ? getOffer(selectedCandidate.id) : undefined;
  const actorName = currentUserName || currentUserEmail || 'HR Admin';

  const appliedCandidates = candidates.filter((candidate) => (
    ['applied', 'shortlisted'].includes(getStatus(candidate))
  ));
  const kivCandidates = candidates.filter((candidate) => getStatus(candidate) === 'kiv');
  const interviewingCandidates = candidates.filter((candidate) => (
    ['interview_scheduled', 'interview_cancelled', 'interview_no_show', 'interview_withdrew', 'interview_passed'].includes(getStatus(candidate))
  ));
  const offeredCandidates = candidates.filter((candidate) => (
    ['offer_preparing', 'offer_sent', 'offer_rejected', 'offer_accepted'].includes(getStatus(candidate))
  ));
  const onboardingCandidates = candidates.filter((candidate) => getStatus(candidate) === 'onboarding');

  const upcomingInterviewCandidates = interviewingCandidates.filter((candidate) => (
    getInterviewQueue(getCandidateInterview(pipelineData, candidate.id)) === 'upcoming'
  ));
  const passedInterviewCandidates = interviewingCandidates.filter((candidate) => (
    getInterviewQueue(getCandidateInterview(pipelineData, candidate.id)) === 'passed'
  ));

  const getQueueCandidates = () => {
    if (activeQueue === 'applied') return appliedCandidates;
    if (activeQueue === 'kiv') return kivCandidates;
    if (activeQueue === 'interviewing') {
      return interviewQueue === 'upcoming' ? upcomingInterviewCandidates : passedInterviewCandidates;
    }
    if (activeQueue === 'offered') {
      return offerFilter === 'all'
        ? offeredCandidates
        : offeredCandidates.filter((candidate) => getOffer(candidate.id)?.status === offerFilter);
    }
    return onboardingCandidates;
  };

  const visibleCandidates = getQueueCandidates();
  const filteredVisibleCandidates = visibleCandidates.filter((candidate) => {
    const query = candidateQuery.trim().toLowerCase();
    if (!query) return true;
    return [candidate.name, candidate.email, candidate.phone, candidate.designation, candidate.department]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });

  const transitionCandidate = async (
    candidate: Candidate,
    toStatus: CandidatePipelineStatus,
    fields: Partial<Candidate> = {},
    eventType = 'status_changed',
    notes?: string,
    dataOverride?: HiringPipelineData,
  ) => {
    const fromStatus = getStatus(candidate);
    const timestamp = nowIso();
    await onUpdateCandidate(candidate.id, {
      ...fields,
      stage: getBroadCandidateStage(toStatus),
      pipelineStatus: toStatus,
      pipelineUpdatedAt: timestamp,
    });
    const nextData = await recordPipelineEvent(dataOverride || pipelineData, {
      candidateId: candidate.id,
      fromStatus,
      toStatus,
      eventType,
      notes,
      actorName,
    });
    setPipelineData(nextData);
    return nextData;
  };

  const restoreCandidateTransition = async (
    candidate: Candidate,
    previousCandidate: Candidate,
    previousPipelineData: HiringPipelineData,
    currentStatus: CandidatePipelineStatus,
    previousStatus: CandidatePipelineStatus,
    notes: string,
  ) => {
    await onUpdateCandidate(candidate.id, {
      stage: previousCandidate.stage,
      pipelineStatus: previousCandidate.pipelineStatus,
      pipelineUpdatedAt: previousCandidate.pipelineUpdatedAt,
      kivNotes: previousCandidate.kivNotes,
      kivFollowUpDate: previousCandidate.kivFollowUpDate,
      rejectionReason: previousCandidate.rejectionReason,
    });
    const restoredData = await recordPipelineEvent(previousPipelineData, {
      candidateId: candidate.id,
      fromStatus: currentStatus,
      toStatus: previousStatus,
      eventType: 'status_reverted',
      notes,
      actorName,
    });
    setPipelineData(restoredData);
  };

  const handleApplicationSubmit = async (formData: any) => {
    const timestamp = nowIso();
    const newCandidate: Candidate = {
      id: formData.id || `CAN-${Date.now()}`,
      name: getCandidateNameFromApplication(formData),
      email: formData.email,
      phone: formData.phone,
      designation: formData.designation,
      department: formData.department || availableDepartments[0] || 'Human Resources',
      entityId: formData.entityId || entities[0]?.id || 'ENT-92',
      stage: 'Applied',
      progress: 0,
      dateJoined: formData.dateJoined || getGmt8DateString(),
      pipelineStatus: 'applied',
      receivedAt: timestamp,
      appliedAt: timestamp,
    };
    await onAddCandidate(newCandidate);
    setSelectedCandidateId(newCandidate.id);
    navigateToSection('pipeline');
    onShowNotification('Applicant Registered', `${newCandidate.name} was added to Applied. Internal evaluation remains administrator-only.`);
  };

  const handleOnboardingComplete = async (newEmployee: Employee) => {
    if (!onAddEmployee) throw new Error('Employee enrollment is unavailable.');
    await onAddEmployee(newEmployee);
    navigateToSection('pipeline');
  };

  const handleOnboardingStageAdvance = async (candidateId: string) => {
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) return;
    await transitionCandidate(candidate, 'onboarding', {}, 'onboarding_started');
  };

  const handleShortlist = async (candidate: Candidate) => {
    try {
      await transitionCandidate(candidate, 'shortlisted', {}, 'shortlisted');
      onShowNotification('Candidate Shortlisted', `${candidate.name} can now be scheduled for an interview.`);
    } catch (error: any) {
      onShowNotification('Shortlist Failed', error.message || 'The candidate could not be shortlisted.');
    }
  };

  const handleReject = async (candidate: Candidate, reason = '') => {
    const previousPipelineData = pipelineData;
    const previousStatus = getStatus(candidate);
    const confirmed = await confirmAction({
      title: 'Reject Candidate',
      message: `Are you sure you want to reject ${candidate.name}? The decision will be recorded in the hiring history.`,
      type: 'danger',
      confirmLabel: 'Reject Candidate',
      onConfirm: async () => {
        await transitionCandidate(
          candidate,
          'rejected',
          { rejectionReason: reason || 'Rejected by HR review.' },
          'rejected',
          reason || undefined,
        );
      },
    });
    if (confirmed) {
      showUndoToast({
        title: 'Candidate Rejected',
        message: `${candidate.name} was moved to the final rejected state.`,
        type: 'success',
        action: {
          label: 'Undo',
          expiresAt: Date.now() + 8_000,
          undo: async () => {
            await onUpdateCandidate(candidate.id, {
              stage: candidate.stage,
              pipelineStatus: candidate.pipelineStatus,
              pipelineUpdatedAt: candidate.pipelineUpdatedAt,
              rejectionReason: candidate.rejectionReason,
            });
            const nextData = await recordPipelineEvent(previousPipelineData, {
              candidateId: candidate.id,
              fromStatus: 'rejected',
              toStatus: previousStatus,
              eventType: 'status_reverted',
              notes: 'Rejected decision was reverted from the undo action.',
              actorName,
            });
            setPipelineData(nextData);
            onShowNotification('Candidate Rejection Reverted', `${candidate.name} returned to ${getPipelineStatusLabel(previousStatus)}.`);
          },
        },
      });
    }
  };

  const handleKiv = async (candidate: Candidate, notes: string, followUpDate: string) => {
    const previousCandidate = { ...candidate };
    const previousPipelineData = pipelineData;
    const previousStatus = getStatus(candidate);
    const confirmed = await confirmAction({
      title: 'Move Candidate to KIV',
      message: `Move ${candidate.name} to KIV? The candidate will leave the active interview queue until follow-up.`,
      type: 'warning',
      confirmLabel: 'Move to KIV',
      onConfirm: async () => {
        await transitionCandidate(
          candidate,
          'kiv',
          { kivNotes: notes, kivFollowUpDate: followUpDate || undefined },
          'kiv',
          notes || undefined,
        );
      },
    });
    if (!confirmed) return;
    try {
      showUndoToast({
        title: 'Candidate Moved to KIV',
        message: `${candidate.name} is now in the KIV queue.`,
        type: 'success',
        action: {
          label: 'Undo',
          expiresAt: Date.now() + 8_000,
          undo: async () => {
            await restoreCandidateTransition(
              candidate,
              previousCandidate,
              previousPipelineData,
              'kiv',
              previousStatus,
              'KIV decision was reverted from the undo action.',
            );
            onShowNotification('KIV Decision Reverted', `${candidate.name} returned to ${getPipelineStatusLabel(previousStatus)}.`);
          },
        },
      });
      onShowNotification('Candidate Moved to KIV', `${candidate.name} is now in the KIV queue.`);
      setStatusModal(null);
    } catch (error: any) {
      onShowNotification('KIV Update Failed', error.message || 'The candidate could not be moved to KIV.');
    }
  };

  const handleDeleteSelectedCandidate = async () => {
    if (!selectedCandidate || activeQueue !== 'applied') return;
    const deletedCandidate = selectedCandidate;
    const previousPipelineData = pipelineData;
    const confirmed = await confirmAction({
      title: 'Delete Candidate',
      message: `Are you sure you want to delete ${selectedCandidate.name}? This will remove the candidate and related pipeline history.`,
      type: 'danger',
      confirmLabel: 'Delete Candidate',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          await onDeleteCandidate(selectedCandidate.id);
          setPipelineData(deleteCandidatePipelineData(pipelineData, selectedCandidate.id));
          setSelectedCandidateId('');
          showUndoToast({
            title: 'Candidate Deleted',
            message: `${deletedCandidate.name} was removed from the hiring pipeline.`,
            type: 'success',
            action: {
              label: 'Undo',
              expiresAt: Date.now() + 8_000,
              undo: async () => {
                await onRestoreCandidate(deletedCandidate);
                setPipelineData(previousPipelineData);
                setSelectedCandidateId(deletedCandidate.id);
                onShowNotification('Candidate Restored', `${deletedCandidate.name} is back in the hiring pipeline.`);
              },
            },
          });
        } finally {
          setIsSaving(false);
        }
      },
    });
    if (!confirmed) setIsSaving(false);
  };

  const handleScheduleInterview = async (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = candidates.find((item) => item.id === scheduleCandidateId);
    if (!candidate || !scheduleDate || !scheduleTime) {
      onShowNotification('Interview Schedule', 'Candidate, date, and time are required.');
      return;
    }
    if (!toDateTime(scheduleDate, scheduleTime)) {
      onShowNotification('Interview Schedule', 'Please enter a valid interview date and time.');
      return;
    }
    setIsSaving(true);
    try {
      const previousInterview = getCandidateInterview(pipelineData, candidate.id);
      const interview: CandidateInterview = {
        id: previousInterview?.id || createHiringId('INT'),
        candidateId: candidate.id,
        scheduledDate: scheduleDate,
        scheduledTime: scheduleTime,
        meetingLink: scheduleMeetingLink.trim(),
        notes: scheduleNotes.trim(),
        status: 'scheduled',
        createdAt: previousInterview?.createdAt || nowIso(),
        updatedAt: nowIso(),
      };
      const nextData = await saveInterview(pipelineData, interview);
      await transitionCandidate(
        candidate,
        'interview_scheduled',
        {},
        previousInterview ? 'interview_rescheduled' : 'interview_scheduled',
        scheduleNotes.trim() || undefined,
        nextData,
      );
      setScheduleCandidateId('');
      onShowNotification(
        previousInterview ? 'Interview Rescheduled' : 'Interview Scheduled',
        `${candidate.name}'s interview is set for ${scheduleDate} at ${scheduleTime}.`,
      );
    } catch (error: any) {
      onShowNotification('Interview Schedule Failed', error.message || 'The interview could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInterviewStatus = async (
    candidate: Candidate,
    action: 'no_show' | 'withdrew' | 'kiv',
    notes: string,
  ) => {
    const interview = getCandidateInterview(pipelineData, candidate.id);
    if (!interview) return;
    const previousCandidate = { ...candidate };
    const previousPipelineData = pipelineData;
    const previousStatus = getStatus(candidate);
    const interviewStatus = action === 'no_show' ? 'no_show' : action === 'withdrew' ? 'withdrew' : 'kiv';
    const nextInterview = { ...interview, status: interviewStatus as CandidateInterview['status'], updatedAt: nowIso() };
    const nextStatus = action === 'kiv' ? 'kiv' : action === 'no_show' ? 'interview_no_show' : 'interview_withdrew';
    const confirmed = await confirmAction({
      title: 'Update Interview Status',
      message: `Mark ${candidate.name}'s interview as ${getPipelineStatusLabel(nextStatus)}? This updates the candidate pipeline and interview history.`,
      type: action === 'kiv' ? 'warning' : 'danger',
      confirmLabel: 'Update Interview',
      onConfirm: async () => {
        const nextData = await saveInterview(pipelineData, nextInterview);
        await transitionCandidate(candidate, nextStatus, action === 'kiv' ? { kivNotes: notes } : {}, `interview_${action}`, notes, nextData);
      },
    });
    if (!confirmed) return;
    try {
      showUndoToast({
        title: 'Interview Status Updated',
        message: `${candidate.name} was marked as ${getPipelineStatusLabel(nextStatus)}.`,
        type: 'success',
        action: {
          label: 'Undo',
          expiresAt: Date.now() + 8_000,
          undo: async () => {
            await saveInterview(previousPipelineData, interview);
            await restoreCandidateTransition(
              candidate,
              previousCandidate,
              previousPipelineData,
              nextStatus,
              previousStatus,
              'Interview status was reverted from the undo action.',
            );
            onShowNotification('Interview Status Reverted', `${candidate.name} returned to ${getPipelineStatusLabel(previousStatus)}.`);
          },
        },
      });
      setStatusModal(null);
      onShowNotification('Interview Status Updated', `${candidate.name} was marked as ${getPipelineStatusLabel(nextStatus)}.`);
    } catch (error: any) {
      onShowNotification('Interview Status Failed', error.message || 'The interview status could not be saved.');
    }
  };

  const handleCancelInterview = async (candidate: Candidate, notes: string) => {
    const interview = getCandidateInterview(pipelineData, candidate.id);
    if (!interview) return;
    const previousCandidate = { ...candidate };
    const previousPipelineData = pipelineData;
    const previousStatus = getStatus(candidate);
    const confirmed = await confirmAction({
      title: 'Cancel Interview',
      message: `Cancel ${candidate.name}'s interview on ${interview.scheduledDate} at ${interview.scheduledTime}? Any notification already sent cannot be recalled.`,
      type: 'danger',
      confirmLabel: 'Cancel Interview',
      onConfirm: async () => {
        const nextData = await saveInterview(pipelineData, {
          ...interview,
          status: 'cancelled',
          cancellationReason: notes || undefined,
          updatedAt: nowIso(),
        });
        await transitionCandidate(candidate, 'interview_cancelled', {}, 'interview_cancelled', notes || undefined, nextData);
      },
    });
    if (!confirmed) return;
    try {
      showUndoToast({
        title: 'Interview Cancelled',
        message: `${candidate.name}'s interview was cancelled. External notifications cannot be recalled.`,
        type: 'success',
        action: {
          label: 'Undo',
          expiresAt: Date.now() + 8_000,
          undo: async () => {
            await saveInterview(previousPipelineData, interview);
            await restoreCandidateTransition(
              candidate,
              previousCandidate,
              previousPipelineData,
              'interview_cancelled',
              previousStatus,
              'Interview cancellation was reverted from the undo action.',
            );
            onShowNotification('Interview Cancellation Reverted', `${candidate.name}'s interview is active again.`);
          },
        },
      });
      setStatusModal(null);
      onShowNotification('Interview Cancelled', `${candidate.name}'s interview was cancelled.`);
    } catch (error: any) {
      onShowNotification('Cancellation Failed', error.message || 'The interview could not be cancelled.');
    }
  };

  const openEvaluation = (candidate: Candidate) => {
    setSelectedCandidateId(candidate.id);
    setEvaluationCandidateId(candidate.id);
    setEvaluationDraft(getCandidateEvaluation(pipelineData, candidate.id) || blankEvaluation(candidate.id));
  };

  const handleSaveEvaluation = async () => {
    if (!evaluationDraft) return;
    setIsSavingEvaluation(true);
    try {
      const nextData = await saveEvaluation(pipelineData, {
        ...evaluationDraft,
        updatedAt: nowIso(),
      });
      setPipelineData(nextData);
      setEvaluationDraft({ ...evaluationDraft, updatedAt: nowIso() });
      onShowNotification('Evaluation Saved', 'The internal interview evaluation was saved securely.');
    } catch (error: any) {
      onShowNotification('Evaluation Save Failed', error.message || 'The evaluation could not be saved.');
    } finally {
      setIsSavingEvaluation(false);
    }
  };

  const finalizeEvaluation = async (candidate: Candidate, outcome: 'offer' | 'reject' | 'kiv') => {
    if (!evaluationDraft) return;
    const nextData = await saveEvaluation(pipelineData, { ...evaluationDraft, updatedAt: nowIso() });
    setPipelineData(nextData);
    if (outcome === 'offer') {
      const offer: CandidateOffer = {
        id: getCandidateOffer(nextData, candidate.id)?.id || createHiringId('OFFER'),
        candidateId: candidate.id,
        status: 'offer_preparing',
        statusUpdatedAt: nowIso(),
        responseNotes: '',
      };
      const offerData = await saveOffer(nextData, offer);
      await transitionCandidate(candidate, 'offer_preparing', {}, 'offer_created', undefined, offerData);
      setEvaluationCandidateId('');
      setEvaluationDraft(null);
      setActiveQueue('offered');
      onShowNotification('Offer Started', `${candidate.name} was moved to Offer Preparing.`);
      return;
    }
    if (outcome === 'reject') {
      await handleReject(candidate, evaluationDraft.additionalComments || 'Interview evaluation resulted in rejection.');
      setEvaluationCandidateId('');
      setEvaluationDraft(null);
      return;
    }
    await handleKiv(candidate, evaluationDraft.additionalComments || 'Interview evaluation requires follow-up.', '');
    setEvaluationCandidateId('');
    setEvaluationDraft(null);
  };

  const updateOfferStatus = async (candidate: Candidate, nextStatus: CandidateOffer['status']) => {
    const offer = getOffer(candidate.id);
    if (!offer) return;
    if (nextStatus === 'offer_accepted' && offer.status !== 'offer_sent') {
      onShowNotification('Offer Action Blocked', 'The offer must be marked Offer Sent before it can be accepted.');
      return;
    }
    const previousCandidate = { ...candidate };
    const previousPipelineData = pipelineData;
    const previousStatus = getStatus(candidate);
    const confirmed = await confirmAction({
      title: nextStatus === 'offer_rejected' ? 'Reject Offer' : 'Update Offer Status',
      message: nextStatus === 'offer_rejected'
        ? `Are you sure you want to reject the offer for ${candidate.name}?`
        : `Move ${candidate.name} to ${getOfferStatusLabel(nextStatus)}?`,
      type: nextStatus === 'offer_rejected' ? 'danger' : 'info',
      confirmLabel: nextStatus === 'offer_rejected' ? 'Reject Offer' : 'Confirm',
      onConfirm: async () => {
        const updatedOffer: CandidateOffer = {
          ...offer,
          status: nextStatus,
          statusUpdatedAt: nowIso(),
          rejectionReason: nextStatus === 'offer_rejected' ? offer.rejectionReason || 'Offer rejected by candidate.' : offer.rejectionReason,
        };
        const nextData = await saveOffer(pipelineData, updatedOffer);
        const candidateStatus: CandidatePipelineStatus = nextStatus === 'offer_accepted' ? 'onboarding' : nextStatus;
        const transitionedData = await transitionCandidate(candidate, candidateStatus, {}, `offer_${nextStatus.replace('offer_', '')}`, undefined, nextData);
        if (nextStatus === 'offer_accepted') {
          const generated = await createCandidateShareLink(transitionedData, candidate.id, 'onboarding');
          setPipelineData(generated.data);
        }
      },
    });
    if (confirmed) {
      showUndoToast({
        title: nextStatus === 'offer_accepted' ? 'Offer Accepted' : 'Offer Status Updated',
        message: nextStatus === 'offer_accepted'
          ? `${candidate.name} moved to Onboarding. Undo restores the internal status; any shared handoff link remains subject to its existing access rules.`
          : `${candidate.name} is now ${getOfferStatusLabel(nextStatus)}.`,
        type: 'success',
        action: {
          label: 'Undo',
          expiresAt: Date.now() + 8_000,
          undo: async () => {
            await saveOffer(previousPipelineData, offer);
            await restoreCandidateTransition(
              candidate,
              previousCandidate,
              previousPipelineData,
              nextStatus === 'offer_accepted' ? 'onboarding' : nextStatus,
              previousStatus,
              'Offer status was reverted from the undo action.',
            );
            onShowNotification('Offer Status Reverted', `${candidate.name} returned to ${getPipelineStatusLabel(previousStatus)}.`);
          },
        },
      });
      onShowNotification(
        nextStatus === 'offer_accepted' ? 'Offer Accepted' : 'Offer Status Updated',
        nextStatus === 'offer_accepted'
          ? `${candidate.name} moved to Onboarding and received a secure onboarding handoff link.`
          : `${candidate.name} is now ${getOfferStatusLabel(nextStatus)}.`,
      );
    }
  };

  const getActiveShareLink = (candidateId: string, kind: 'interview' | 'onboarding') => (
    pipelineData.shareLinks
      .filter((link) => link.candidateId === candidateId && link.kind === kind)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .find((link) => isShareLinkActive(link.expiresAt, link.invalidatedAt))
  );

  const shareCandidate = async (
    candidate: Candidate,
    kind: 'interview' | 'onboarding',
    channel: 'copy' | 'share' | 'email' | 'whatsapp',
    forceRegenerate = false,
  ) => {
    try {
      const currentLink = forceRegenerate ? undefined : getActiveShareLink(candidate.id, kind);
      let nextData = pipelineData;
      let link = currentLink;
      if (!link) {
        const generated = await createCandidateShareLink(pipelineData, candidate.id, kind);
        nextData = generated.data;
        link = generated.link;
      }
      const interview = getCandidateInterview(nextData, candidate.id);
      const message = kind === 'interview'
        ? `Interview details for ${candidate.name}: ${interview?.scheduledDate || ''} at ${interview?.scheduledTime || ''}. ${interview?.meetingLink || ''}\n${link.url}`
        : `Onboarding details for ${candidate.name}. Please complete the secure onboarding form:\n${link.url}`;

      if (channel === 'copy') {
        await navigator.clipboard?.writeText(link.url);
      } else if (channel === 'share' && navigator.share) {
        await navigator.share({ title: kind === 'interview' ? 'Interview details' : 'Onboarding details', text: message, url: link.url });
      } else if (channel === 'email') {
        window.location.href = `mailto:${encodeURIComponent(candidate.email)}?subject=${encodeURIComponent(kind === 'interview' ? 'Interview details' : 'Onboarding details')}&body=${encodeURIComponent(message)}`;
      } else if (channel === 'whatsapp') {
        const phone = candidate.phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
        if (!phone) throw new Error('Candidate phone number is missing.');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      }
      nextData = await recordShareDelivery(nextData, {
        shareLinkId: link.id,
        candidateId: candidate.id,
        channel,
        status: 'handoff',
      });
      setPipelineData(nextData);
      onShowNotification('Share Link Ready', `${kind === 'interview' ? 'Interview' : 'Onboarding'} details are ready for ${candidate.name}. Link expires ${new Date(link.expiresAt).toLocaleDateString()}.`);
    } catch (error: any) {
      onShowNotification('Share Failed', error.message || 'The candidate share handoff could not be created.');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!selectedCandidate) return;
    const updatedTasks = tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task);
    const percentage = Math.round((updatedTasks.filter((task) => task.completed).length / updatedTasks.length) * 100);
    try {
      await onUpdateCandidate(selectedCandidate.id, { progress: percentage });
      setTasks(updatedTasks);
    } catch (error: any) {
      onShowNotification('Task Update Failed', error.message || 'The onboarding progress could not be saved.');
    }
  };

  const activeEntityName = entities.find((entity) => entity.id === selectedCandidate?.entityId)?.name || 'Red Point Sdn Bhd';
  const evaluationCandidate = candidates.find((candidate) => candidate.id === evaluationCandidateId);
  const selectedShare = selectedCandidate
    ? getActiveShareLink(selectedCandidate.id, getStatus(selectedCandidate) === 'onboarding' ? 'onboarding' : 'interview')
    : undefined;

  const renderCandidateCard = (candidate: Candidate) => {
    const status = getStatus(candidate);
    const interview = getCandidateInterview(pipelineData, candidate.id);
    const offer = getOffer(candidate.id);
    const isSelected = candidate.id === selectedCandidateId;
    return (
      <button
        type="button"
        key={candidate.id}
        onClick={() => setSelectedCandidateId(candidate.id)}
        className={`w-full rounded-2xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${isSelected ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' : 'border-neutral-border bg-white hover:border-primary/40'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-on-background">{candidate.name}</p>
            <p className="mt-1 truncate text-[11px] text-on-surface-variant">{candidate.department} · {candidate.designation}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusBadgeClass(status)}`}>
            {getPipelineStatusLabel(status)}
          </span>
        </div>
        {interview && status.startsWith('interview') && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-on-surface-variant">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            {interview.scheduledDate} · {interview.scheduledTime}
          </div>
        )}
        {offer && status.startsWith('offer') && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-on-surface-variant">
            <BriefcaseBusiness className="h-3.5 w-3.5 text-primary" />
            {getOfferStatusLabel(offer.status)}
          </div>
        )}
      </button>
    );
  };

  const renderPipeline = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-border bg-neutral-border lg:grid-cols-4">
        {[
          ['Applied', appliedCandidates.length, FileText, 'text-blue-600 bg-blue-50'],
          ['KIV', kivCandidates.length, CircleHelp, 'text-amber-600 bg-amber-50'],
          ['Pending Interviews', upcomingInterviewCandidates.length, CalendarClock, 'text-indigo-600 bg-indigo-50'],
          ['Pending Offers', offeredCandidates.filter((candidate) => ['offer_preparing', 'offer_sent'].includes(getStatus(candidate))).length, BriefcaseBusiness, 'text-emerald-600 bg-emerald-50'],
        ].map(([label, value, Icon, classes]) => (
          <div key={String(label)} className="bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</span>
              <span className={`rounded-lg p-2 ${classes}`}><Icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-3 text-2xl font-black text-on-background">{value}</p>
          </div>
        ))}
      </div>

      <nav aria-label="Candidate pipeline queues" className="flex gap-1 overflow-x-auto rounded-2xl border border-neutral-border bg-white p-1.5 shadow-sm">
        {([
          ['applied', 'Applied', appliedCandidates.length],
          ['kiv', 'KIV', kivCandidates.length],
          ['interviewing', 'Interviewing', interviewingCandidates.length],
          ['offered', 'Offered', offeredCandidates.length],
          ['onboarding', 'Onboarding', onboardingCandidates.length],
        ] as Array<[PipelineQueue, string, number]>).map(([queue, label, count]) => (
          <button
            type="button"
            key={queue}
            onClick={() => setActiveQueue(queue)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 ${activeQueue === queue ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
          >
            {label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeQueue === queue ? 'bg-white/20' : 'bg-neutral-100'}`}>{count}</span>
          </button>
        ))}
      </nav>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <p>
          Applied submissions are reviewed before interview scheduling. Interviewing is split automatically by the scheduled date and time. KIV and rejected decisions remain auditable in the candidate history.
        </p>
      </div>

      {activeQueue === 'interviewing' && (
        <div className="flex flex-wrap gap-2">
          {([
            ['upcoming', `Upcoming Interview (${upcomingInterviewCandidates.length})`],
            ['passed', `Passed Interview (${passedInterviewCandidates.length})`],
          ] as Array<[InterviewQueue, string]>).map(([queue, label]) => (
            <button
              type="button"
              key={queue}
              onClick={() => setInterviewQueue(queue)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${interviewQueue === queue ? 'border-primary bg-primary/5 text-primary' : 'border-neutral-border text-on-surface-variant hover:bg-surface-container-low'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {activeQueue === 'offered' && (
          <div className="flex gap-2 overflow-x-auto">
          {([
            ['all', 'All Offers'],
            ['offer_preparing', 'Offer Preparing'],
            ['offer_sent', 'Offer Sent'],
            ['offer_rejected', 'Offer Rejected'],
          ] as Array<[OfferFilter, string]>).map(([filter, label]) => (
            <button
              type="button"
              key={filter}
              onClick={() => setOfferFilter(filter)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${offerFilter === filter ? 'border-primary bg-primary/5 text-primary' : 'border-neutral-border text-on-surface-variant hover:bg-surface-container-low'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(18rem,25rem)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-neutral-border bg-surface-container-low/55 p-3">
          <div className="mb-3 space-y-3 px-1">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-on-background">
                {activeQueue === 'interviewing' ? (interviewQueue === 'upcoming' ? 'Upcoming Interviews' : 'Passed Interviews') : activeQueue[0].toUpperCase() + activeQueue.slice(1)}
                </h2>
                <span className="font-mono text-[10px] font-bold text-on-surface-variant">{filteredVisibleCandidates.length}/{visibleCandidates.length}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">Select a candidate to review the full record.</p>
            </div>
            <label className="relative block">
              <span className="sr-only">Search candidates in this queue</span>
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-outline" aria-hidden="true" />
              <input
                type="search"
                value={candidateQuery}
                onChange={(event) => setCandidateQuery(event.target.value)}
                placeholder="Search this queue"
                className="w-full rounded-xl border border-neutral-border bg-white py-2.5 pl-10 pr-3 text-xs outline-none transition-colors placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <div className="flex items-center justify-end gap-1">
              {activeQueue === 'applied' && selectedCandidate && visibleCandidates.some((candidate) => candidate.id === selectedCandidate.id) && (
                <button
                  type="button"
                  onClick={() => void handleDeleteSelectedCandidate()}
                  disabled={isSaving}
                  className="rounded-xl p-2 text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Delete selected candidate"
                  title="Delete selected candidate"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={() => {
                setIsLoadingPipeline(true);
                void loadHiringPipelineData()
                  .then(setPipelineData)
                  .catch((error) => onShowNotification('Hiring Pipeline', error.message || 'Pipeline could not be refreshed.'))
                  .finally(() => setIsLoadingPipeline(false));
              }} className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-white hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" aria-label="Refresh pipeline">
                <RefreshCw className={`h-4 w-4 ${isLoadingPipeline ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="max-h-[32rem] space-y-2 overflow-y-auto">
            {visibleCandidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-border bg-white px-4 py-10 text-center text-xs text-on-surface-variant">
                <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-neutral-300" aria-hidden="true" />
                <p className="font-semibold">No candidates in this queue.</p>
                <p className="mt-1 text-[11px]">Candidates will appear here as the hiring stage changes.</p>
              </div>
            ) : filteredVisibleCandidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-border bg-white px-4 py-10 text-center text-xs text-on-surface-variant">
                <Search className="mx-auto mb-2 h-7 w-7 text-neutral-300" aria-hidden="true" />
                No candidates match this search.
              </div>
            ) : filteredVisibleCandidates.map(renderCandidateCard)}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-border bg-white p-5 shadow-sm">
          {!selectedCandidate ? (
            <div className="flex min-h-[28rem] items-center justify-center text-center text-sm text-on-surface-variant">
              Select a candidate to open the detail workspace.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col justify-between gap-4 border-b border-neutral-100 pb-4 md:flex-row md:items-start">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-on-background">{selectedCandidate.name}</h2>
                      <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusBadgeClass(getStatus(selectedCandidate))}`}>
                        {getPipelineStatusLabel(getStatus(selectedCandidate))}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                      <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selectedCandidate.email}</span>
                      <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selectedCandidate.phone}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selectedCandidate.department} · {selectedCandidate.designation}</span>
                    </div>
                  </div>
                </div>
                  <div className="rounded-xl bg-surface-container-low px-3 py-2 text-right text-[10px] text-on-surface-variant">
                  <p className="font-bold uppercase tracking-wider">Entity</p>
                  <p className="mt-1 font-black text-primary">{activeEntityName}</p>
                </div>
              </div>

              {activeQueue === 'applied' && (
                <div className="flex flex-wrap gap-2">
                  {getStatus(selectedCandidate) === 'applied' && (
                      <button type="button" onClick={() => void handleShortlist(selectedCandidate)} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <CheckCircle2 className="h-4 w-4" /> Shortlist
                    </button>
                  )}
                  {getStatus(selectedCandidate) === 'shortlisted' && (
                    <button type="button" onClick={() => { setScheduleCandidateId(selectedCandidate.id); setScheduleDate(dateInDays(1)); setScheduleTime('10:00'); setScheduleMeetingLink(''); setScheduleNotes(''); }} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <CalendarClock className="h-4 w-4" /> Schedule Interview
                    </button>
                  )}
                  <button type="button" onClick={() => setStatusModal({ kind: 'kiv', candidateId: selectedCandidate.id, notes: '', followUpDate: '' })} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 px-3 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200">
                    <CircleHelp className="h-4 w-4" /> KIV
                  </button>
                  <button type="button" onClick={() => setStatusModal({ kind: 'reject', candidateId: selectedCandidate.id, notes: '', followUpDate: '' })} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200">
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}

              {activeQueue === 'kiv' && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void transitionCandidate(selectedCandidate, 'applied', { kivNotes: undefined, kivFollowUpDate: undefined }, 'kiv_resumed').then(() => onShowNotification('KIV Resumed', `${selectedCandidate.name} returned to Applied.`))} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <RotateCcw className="h-4 w-4" /> Resume Applied
                  </button>
                </div>
              )}

              {activeQueue === 'interviewing' && selectedInterview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:grid-cols-3">
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Date</p><p className="mt-1 text-sm font-black text-on-background">{selectedInterview.scheduledDate}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Time</p><p className="mt-1 text-sm font-black text-on-background">{selectedInterview.scheduledTime}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Meeting Link</p><p className="mt-1 truncate text-sm font-black text-on-background">{selectedInterview.meetingLink || 'Not provided'}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getInterviewQueue(selectedInterview) === 'upcoming' && selectedInterview.status === 'scheduled' && (
                      <>
                        <button type="button" onClick={() => { setScheduleCandidateId(selectedCandidate.id); setScheduleDate(selectedInterview.scheduledDate); setScheduleTime(selectedInterview.scheduledTime); setScheduleMeetingLink(selectedInterview.meetingLink); setScheduleNotes(selectedInterview.notes); }} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5">
                          <Clock3 className="h-4 w-4" /> Change Date & Time
                        </button>
                        <button type="button" onClick={() => setStatusModal({ kind: 'cancel', candidateId: selectedCandidate.id, notes: '', followUpDate: '' })} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">
                          <Ban className="h-4 w-4" /> Cancel
                        </button>
                        <div className="relative">
                          <details>
                            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-neutral-border px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-neutral-50"><MoreHorizontal className="h-4 w-4" /> Other</summary>
                            <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-neutral-border bg-white p-1 shadow-xl">
                              <button type="button" onClick={() => setStatusModal({ kind: 'other', candidateId: selectedCandidate.id, notes: '', followUpDate: '', interviewAction: 'no_show' })} className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold hover:bg-neutral-50">Candidate no-show</button>
                              <button type="button" onClick={() => setStatusModal({ kind: 'other', candidateId: selectedCandidate.id, notes: '', followUpDate: '', interviewAction: 'withdrew' })} className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold hover:bg-neutral-50">Candidate withdrew</button>
                              <button type="button" onClick={() => setStatusModal({ kind: 'other', candidateId: selectedCandidate.id, notes: '', followUpDate: '', interviewAction: 'kiv' })} className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold hover:bg-neutral-50">Move to KIV</button>
                            </div>
                          </details>
                        </div>
                      </>
                    )}
                    <button type="button" onClick={() => void shareCandidate(selectedCandidate, 'interview', 'copy')} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90"><Link2 className="h-4 w-4" /> Copy Share Link</button>
                    <button type="button" onClick={() => void shareCandidate(selectedCandidate, 'interview', 'email')} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-border px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-neutral-50"><Mail className="h-4 w-4" /> Email</button>
                    <button type="button" onClick={() => void shareCandidate(selectedCandidate, 'interview', 'whatsapp')} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-border px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-neutral-50"><Send className="h-4 w-4" /> WhatsApp</button>
                  </div>
                  {getInterviewQueue(selectedInterview) === 'passed' && (
                    <button type="button" onClick={() => openEvaluation(selectedCandidate)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700">
                      <ClipboardCheck className="h-4 w-4" /> Open Interview Evaluation
                    </button>
                  )}
                </div>
              )}

              {activeQueue === 'offered' && selectedOffer && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Offer Status</p>
                    <p className="mt-1 text-lg font-black text-on-background">{getOfferStatusLabel(selectedOffer.status)}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">Last updated {new Date(selectedOffer.statusUpdatedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedOffer.status === 'offer_preparing' && (
                      <button type="button" onClick={() => void updateOfferStatus(selectedCandidate, 'offer_sent')} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white"><Send className="h-4 w-4" /> Mark Offer Sent</button>
                    )}
                    {selectedOffer.status === 'offer_sent' && (
                      <>
                        <button type="button" onClick={() => void updateOfferStatus(selectedCandidate, 'offer_accepted')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4" /> Offer Accepted</button>
                        <button type="button" onClick={() => void updateOfferStatus(selectedCandidate, 'offer_rejected')} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"><XCircle className="h-4 w-4" /> Offer Rejected</button>
                      </>
                    )}
                    {selectedOffer.status === 'offer_rejected' && <span className="text-xs font-semibold text-red-700">This offer is closed. Create a new offer only after a new approved evaluation.</span>}
                  </div>
                </div>
              )}

              {activeQueue === 'onboarding' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Onboarding handoff</p>
                      <p className="mt-1 text-sm font-bold text-on-background">Generate a secure 30-day candidate link with no internal notes.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void shareCandidate(selectedCandidate, 'onboarding', 'copy', Boolean(selectedShare))} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white"><Link2 className="h-4 w-4" /> {selectedShare ? 'Regenerate & Copy' : 'Generate & Copy'}</button>
                      <button type="button" onClick={() => void shareCandidate(selectedCandidate, 'onboarding', 'email')} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-border bg-white px-3 py-2 text-xs font-bold text-on-surface-variant"><Mail className="h-4 w-4" /> Email</button>
                      <button type="button" onClick={() => void shareCandidate(selectedCandidate, 'onboarding', 'whatsapp')} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-border bg-white px-3 py-2 text-xs font-bold text-on-surface-variant"><Send className="h-4 w-4" /> WhatsApp</button>
                    </div>
                  </div>
                  {selectedShare && <p className="break-all rounded-lg bg-neutral-50 p-3 font-mono text-[10px] text-on-surface-variant">Active link: {selectedShare.url}<br />Expires: {new Date(selectedShare.expiresAt).toLocaleString()}</p>}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-wide text-on-surface-variant">Onboarding checklist</p>
                      <span className="text-xs font-black text-primary">{selectedCandidate.progress}% complete</span>
                    </div>
                    {tasks.map((task) => (
                      <button type="button" key={task.id} onClick={() => void handleToggleTask(task.id)} className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-xs ${task.completed ? 'border-emerald-200 bg-emerald-50/30' : 'border-neutral-border bg-white hover:border-primary/40'}`}>
                        <span className={task.completed ? 'font-semibold text-on-surface-variant line-through' : 'font-bold text-on-background'}>{task.title}</span>
                        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${task.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-on-surface-variant'}`}>{task.completed ? 'Done' : task.category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-neutral-100 pt-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Audit trail</p>
                <div className="max-h-36 space-y-2 overflow-y-auto">
                  {pipelineData.history.filter((event) => event.candidateId === selectedCandidate.id).slice(0, 8).map((event) => (
                    <div key={event.id} className="flex items-start justify-between gap-3 text-[11px]">
                      <div><span className="font-bold text-on-background">{getPipelineStatusLabel(event.toStatus)}</span><span className="ml-2 text-on-surface-variant">{event.notes || event.eventType}</span></div>
                      <time className="shrink-0 text-on-surface-variant">{new Date(event.createdAt).toLocaleDateString()}</time>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="rounded-xl border border-neutral-border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 border-b border-neutral-100 pb-3 text-sm font-black text-primary"><ExternalLink className="h-4 w-4" /> Candidate-facing links</h2>
        <p className="mt-4 text-xs leading-relaxed text-on-surface-variant">Interview links expire after 7 days. Onboarding links expire after 30 days. Regenerating a link invalidates the previous link. Internal evaluations, notes, and offer history are never included.</p>
        {selectedCandidate && selectedInterview && (
          <button type="button" onClick={() => void shareCandidate(selectedCandidate, 'interview', 'share')} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-neutral-border px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-neutral-50"><Share2 className="h-4 w-4" /> Share selected interview</button>
        )}
      </div>
    </div>
  );

  const renderHeader = () => (
    <header className="overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-sm">
      <div className="border-b border-neutral-border/70 bg-surface-container-low/55 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Hiring operations</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-on-background sm:text-4xl">Hire & Onboarding</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
              Move candidates from application to onboarding with a clear, auditable workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(`${window.location.origin}/?form=job-apply`);
              onShowNotification('Application Link Copied', 'Public job application form URL copied to your clipboard.');
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-border bg-white px-3 py-2.5 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Share2 className="h-4 w-4 text-primary" aria-hidden="true" /> Share apply link
          </button>
        </div>
      </div>
      <nav aria-label="Hiring workspace navigation" className="flex gap-1 overflow-x-auto p-1.5">
        <button
          type="button"
          onClick={() => navigateToSection('pipeline')}
          className={`flex min-w-max items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 ${activeTab === 'pipeline' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden="true" /> Pipeline
        </button>
        <button
          type="button"
          onClick={() => navigateToSection('application-form')}
          className={`flex min-w-max items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 ${activeTab === 'application-form' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <FileText className="h-4 w-4" aria-hidden="true" /> Application form
        </button>
        <button
          type="button"
          onClick={() => navigateToSection('onboarding-form')}
          className={`flex min-w-max items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 ${activeTab === 'onboarding-form' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <UserCheck className="h-4 w-4" aria-hidden="true" /> Employee enrollment
        </button>
        <button
          type="button"
          onClick={() => navigateToSection('onboarding-portal')}
          className={`flex min-w-max items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 ${activeTab === 'onboarding-portal' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" /> Onboarding portal
        </button>
      </nav>
    </header>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8 animate-in fade-in duration-200">
      {renderHeader()}

      {activeTab === 'onboarding-portal' ? (
        <div>
          <React.Suspense fallback={<div className="flex min-h-64 items-center justify-center text-sm font-semibold text-on-surface-variant">Loading Onboarding Portal...</div>}>
            <OnboardingPortalView
              employees={employees}
              candidates={candidates}
              currentUserName={currentUserName}
              currentUserEmail={currentUserEmail}
              currentUserRole={currentUserRole}
              onShowNotification={onShowNotification}
              onUpdateCandidate={onUpdateCandidate}
              onUpdateEmployee={onUpdateEmployee}
            />
          </React.Suspense>
        </div>
      ) : activeTab === 'application-form' ? (
        <div>
          <JobApplicationForm onApplicationSubmit={handleApplicationSubmit} onShowNotification={onShowNotification} />
        </div>
      ) : activeTab === 'onboarding-form' ? (
        <div>
          <OnboardingForm
            candidates={candidates}
            entities={entities}
            onOnboardingComplete={handleOnboardingComplete}
            onShowNotification={onShowNotification}
            onAdvanceCandidateStage={handleOnboardingStageAdvance}
          />
        </div>
      ) : (
        <div>{renderPipeline()}</div>
      )}

      {scheduleCandidateId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <form onSubmit={handleScheduleInterview} className="w-full max-w-lg space-y-4 rounded-2xl border border-neutral-border bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3">
              <div><h2 className="text-base font-black text-on-background">Schedule Interview</h2><p className="mt-1 text-xs text-on-surface-variant">Shortlisted candidates move to Interviewing once a date and time are saved.</p></div>
              <button type="button" onClick={() => setScheduleCandidateId('')} className="rounded-md p-1.5 text-on-surface-variant hover:bg-neutral-50"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-on-surface-variant">Date<input required type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} className="mt-1 w-full rounded-md border border-neutral-border p-2 font-normal text-on-background outline-none focus:ring-2 focus:ring-primary/20" /></label>
              <label className="text-xs font-bold text-on-surface-variant">Time<input required type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} className="mt-1 w-full rounded-md border border-neutral-border p-2 font-normal text-on-background outline-none focus:ring-2 focus:ring-primary/20" /></label>
            </div>
            <label className="text-xs font-bold text-on-surface-variant">Interview link<input value={scheduleMeetingLink} onChange={(event) => setScheduleMeetingLink(event.target.value)} placeholder="https://meet.google.com/..." className="mt-1 w-full rounded-md border border-neutral-border p-2 font-normal text-on-background outline-none focus:ring-2 focus:ring-primary/20" /></label>
            <label className="text-xs font-bold text-on-surface-variant">Notes<textarea rows={3} value={scheduleNotes} onChange={(event) => setScheduleNotes(event.target.value)} placeholder="Panel, preparation notes, or location details" className="mt-1 w-full rounded-md border border-neutral-border p-2 font-normal text-on-background outline-none focus:ring-2 focus:ring-primary/20" /></label>
            <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
              <button type="button" onClick={() => setScheduleCandidateId('')} className="rounded-lg border border-neutral-border px-3 py-2 text-xs font-bold text-on-surface-variant">Cancel</button>
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />} {isSaving ? 'Saving...' : 'Save Interview'}</button>
            </div>
          </form>
        </div>
      )}

      {statusModal && (() => {
        const modalCandidate = candidates.find((candidate) => candidate.id === statusModal.candidateId);
        if (!modalCandidate) return null;
        const title = statusModal.kind === 'kiv' ? 'Move Candidate to KIV' : statusModal.kind === 'cancel' ? 'Cancel Interview' : statusModal.kind === 'other' ? 'Update Interview Status' : 'Reject Candidate';
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md space-y-4 rounded-2xl border border-neutral-border bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3"><div><h2 className="text-base font-black text-on-background">{title}</h2><p className="mt-1 text-xs text-on-surface-variant">{modalCandidate.name}</p></div><button type="button" onClick={() => setStatusModal(null)} className="rounded-md p-1.5 text-on-surface-variant hover:bg-neutral-50"><X className="h-4 w-4" /></button></div>
              {statusModal.kind === 'other' && <p className="rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-900">This action is recorded in the interview history and can move the candidate to KIV.</p>}
              <label className="block text-xs font-bold text-on-surface-variant">Reason / notes<textarea rows={4} value={statusModal.notes} onChange={(event) => setStatusModal({ ...statusModal, notes: event.target.value })} className="mt-1 w-full rounded-md border border-neutral-border p-2 text-xs font-normal text-on-background outline-none focus:ring-2 focus:ring-primary/20" placeholder="Optional notes for the audit trail" /></label>
              {statusModal.kind === 'kiv' && <label className="block text-xs font-bold text-on-surface-variant">Follow-up date<input type="date" value={statusModal.followUpDate} onChange={(event) => setStatusModal({ ...statusModal, followUpDate: event.target.value })} className="mt-1 w-full rounded-md border border-neutral-border p-2 text-xs font-normal text-on-background outline-none focus:ring-2 focus:ring-primary/20" /></label>}
              <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
                <button type="button" onClick={() => setStatusModal(null)} className="rounded-lg border border-neutral-border px-3 py-2 text-xs font-bold text-on-surface-variant">Cancel</button>
                <button type="button" onClick={() => {
                  if (statusModal.kind === 'kiv') void handleKiv(modalCandidate, statusModal.notes, statusModal.followUpDate);
                  else if (statusModal.kind === 'cancel') void handleCancelInterview(modalCandidate, statusModal.notes);
                  else if (statusModal.kind === 'other' && statusModal.interviewAction) void handleInterviewStatus(modalCandidate, statusModal.interviewAction, statusModal.notes);
                  else {
                    void handleReject(modalCandidate, statusModal.notes).then(() => setStatusModal(null));
                  }
                }} className={`rounded-lg px-3 py-2 text-xs font-bold text-white ${statusModal.kind === 'reject' || statusModal.kind === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:opacity-90'}`}>{statusModal.kind === 'reject' ? 'Reject Candidate' : statusModal.kind === 'cancel' ? 'Cancel Interview' : 'Save Decision'}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {evaluationCandidate && evaluationDraft && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-[2px]">
          <div className="my-6 w-full max-w-3xl rounded-2xl border border-neutral-border bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-neutral-100 pb-3"><div><h2 className="text-base font-black text-on-background">Interview Evaluation · {evaluationCandidate.name}</h2><p className="mt-1 text-xs text-on-surface-variant">Save the internal assessment before making the final Offer, Reject, or KIV decision.</p></div><button type="button" onClick={() => { setEvaluationCandidateId(''); setEvaluationDraft(null); }} className="rounded-md p-1.5 text-on-surface-variant hover:bg-neutral-50"><X className="h-4 w-4" /></button></div>
            <CandidateEvaluationPanel value={evaluationDraft} onChange={setEvaluationDraft} onSave={() => void handleSaveEvaluation()} saving={isSavingEvaluation} />
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4">
              <button type="button" onClick={() => { setEvaluationCandidateId(''); setEvaluationDraft(null); }} className="rounded-lg border border-neutral-border px-3 py-2 text-xs font-bold text-on-surface-variant">Cancel</button>
              <button type="button" onClick={() => void finalizeEvaluation(evaluationCandidate, 'kiv')} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800">KIV</button>
              <button type="button" onClick={() => void finalizeEvaluation(evaluationCandidate, 'reject')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Reject</button>
              <button type="button" onClick={() => void finalizeEvaluation(evaluationCandidate, 'offer')} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Offer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
