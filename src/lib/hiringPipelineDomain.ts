import {
  Candidate,
  CandidatePipelineStatus,
  CandidateInterview,
  CandidateOfferStatus,
} from '../types';

export const INTERVIEW_LINK_TTL_DAYS = 7;
export const ONBOARDING_LINK_TTL_DAYS = 30;

export const nowIso = () => new Date().toISOString();

export const createHiringId = (prefix: string) => (
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
);

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const toDateTime = (date: string, time: string) => {
  if (!date) return null;
  const value = new Date(`${date}T${time || '00:00'}`);
  return Number.isNaN(value.getTime()) ? null : value;
};

export const getCandidatePipelineStatus = (candidate: Candidate): CandidatePipelineStatus => {
  if (candidate.pipelineStatus) return candidate.pipelineStatus;
  switch (candidate.stage) {
    case 'Interviewing':
      return 'interview_scheduled';
    case 'Offered':
      return 'offer_preparing';
    case 'Onboarding':
      return 'onboarding';
    default:
      return 'applied';
  }
};

export const getBroadCandidateStage = (status: CandidatePipelineStatus): Candidate['stage'] => {
  if (status === 'onboarding' || status === 'offer_accepted') return 'Onboarding';
  if (
    status === 'offer_preparing'
    || status === 'offer_sent'
    || status === 'offer_rejected'
  ) return 'Offered';
  if (
    status === 'interview_scheduled'
    || status === 'interview_cancelled'
    || status === 'interview_no_show'
    || status === 'interview_withdrew'
    || status === 'interview_passed'
  ) return 'Interviewing';
  return 'Applied';
};

export const getPipelineStatusLabel = (status: CandidatePipelineStatus) => {
  const labels: Record<CandidatePipelineStatus, string> = {
    applied: 'Applied',
    shortlisted: 'Shortlisted',
    kiv: 'KIV',
    interview_scheduled: 'Interview Scheduled',
    interview_cancelled: 'Interview Cancelled',
    interview_no_show: 'Candidate No-show',
    interview_withdrew: 'Candidate Withdrew',
    interview_passed: 'Interview Date Passed',
    offer_preparing: 'Offer Preparing',
    offer_sent: 'Offer Sent',
    offer_accepted: 'Offer Accepted',
    offer_rejected: 'Offer Rejected',
    onboarding: 'Onboarding',
    rejected: 'Rejected',
  };
  return labels[status];
};

export const getInterviewQueue = (interview?: CandidateInterview) => {
  if (!interview || interview.status !== 'scheduled') return 'passed' as const;
  const scheduledAt = toDateTime(interview.scheduledDate, interview.scheduledTime);
  return scheduledAt && scheduledAt.getTime() > Date.now() ? 'upcoming' as const : 'passed' as const;
};

export const getOfferStatusLabel = (status?: CandidateOfferStatus) => {
  const labels: Record<CandidateOfferStatus, string> = {
    offer_preparing: 'Offer Preparing',
    offer_sent: 'Offer Sent',
    offer_accepted: 'Offer Accepted',
    offer_rejected: 'Offer Rejected',
  };
  return status ? labels[status] : 'Offer Preparing';
};

export const buildCandidateShareUrl = (
  kind: 'interview' | 'onboarding',
  token: string,
  candidateId?: string,
) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const candidateQuery = candidateId ? `&candidateId=${encodeURIComponent(candidateId)}` : '';
  return `${origin}/?candidateShare=${encodeURIComponent(token)}&shareType=${kind}${candidateQuery}`;
};

export const isShareLinkActive = (expiresAt: string, invalidatedAt?: string) => (
  !invalidatedAt && new Date(expiresAt).getTime() > Date.now()
);
