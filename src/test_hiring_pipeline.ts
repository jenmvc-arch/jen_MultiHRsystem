import {
  getBroadCandidateStage,
  getCandidatePipelineStatus,
  getInterviewQueue,
  isShareLinkActive,
  toDateTime,
} from './lib/hiringPipelineDomain';
import { Candidate } from './types';

const baseCandidate: Candidate = {
  id: 'CAN-TEST',
  name: 'Pipeline Test Candidate',
  email: 'pipeline@example.com',
  phone: '+60123456789',
  designation: 'Tester',
  department: 'Engineering',
  entityId: 'ENT-92',
  stage: 'Applied',
  progress: 0,
  dateJoined: '2026-08-18',
};

if (getCandidatePipelineStatus(baseCandidate) !== 'applied') {
  throw new Error('Legacy Applied candidates should resolve to the Applied pipeline status.');
}

if (getCandidatePipelineStatus({ ...baseCandidate, stage: 'Interviewing' }) !== 'interview_scheduled') {
  throw new Error('Legacy Interviewing candidates should resolve to Interview Scheduled.');
}

if (getBroadCandidateStage('shortlisted') !== 'Applied') {
  throw new Error('Shortlisted candidates should remain in the Applied broad stage until interview scheduling.');
}

if (getBroadCandidateStage('offer_accepted') !== 'Onboarding') {
  throw new Error('Accepted offers should map to the Onboarding broad stage.');
}

const futureInterview = {
  id: 'INT-FUTURE',
  candidateId: baseCandidate.id,
  scheduledDate: '2099-01-01',
  scheduledTime: '10:00',
  meetingLink: '',
  notes: '',
  status: 'scheduled' as const,
  createdAt: '2026-08-18T00:00:00.000Z',
  updatedAt: '2026-08-18T00:00:00.000Z',
};

const passedInterview = {
  ...futureInterview,
  id: 'INT-PAST',
  scheduledDate: '2000-01-01',
};

if (getInterviewQueue(futureInterview) !== 'upcoming') {
  throw new Error('Future scheduled interviews should be in the Upcoming queue.');
}

if (getInterviewQueue(passedInterview) !== 'passed') {
  throw new Error('Elapsed scheduled interviews should be in the Passed queue.');
}

if (!toDateTime('2026-08-18', '10:00') || toDateTime('', '10:00') !== null) {
  throw new Error('Interview date/time parsing should reject incomplete dates.');
}

if (!isShareLinkActive('2099-01-01T00:00:00.000Z') || isShareLinkActive('2099-01-01T00:00:00.000Z', '2026-08-18T00:00:00.000Z')) {
  throw new Error('Share links should respect expiry and explicit invalidation.');
}

console.log('Hiring pipeline domain tests passed.');
