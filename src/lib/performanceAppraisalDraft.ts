import { Employee, EmployeePerformance, ReviewCycle } from '../types';

export type AppraisalWorkflowStatus =
  | 'Draft'
  | 'Pending Employee Input'
  | 'Employee Submitted'
  | 'Pending Manager Review'
  | 'Agreed'
  | 'Finalised';

export type EvidenceStatus = 'Not Added' | 'Submitted' | 'Verified' | 'Revision Req.';

export interface AppraisalKpiEvidence {
  achievement: string;
  managerVerification: string;
  evidenceType: 'Analytics' | 'Document' | 'Approval' | 'Other';
  evidenceLink: string;
  completionPercent: number | '';
  status: EvidenceStatus;
}

export interface AppraisalKpiRow {
  id: string;
  kra: string;
  outcome: string;
  weight: number;
  appraiseeScore: number | '';
  agreedScore: number | '';
  evidence: AppraisalKpiEvidence;
}

export interface AppraisalKpiCategory {
  id: string;
  name: string;
  rows: AppraisalKpiRow[];
}

export interface AppraisalCompetencyRating {
  id: string;
  name: string;
  description: string;
  appraiseeRating: number | '';
  agreedRating: number | '';
  appraiseeComment: string;
  managerComment: string;
  supportingExample: string;
}

export interface AppraisalQualitativeNotes {
  employeeOverallComment: string;
  keyStrengths: string;
  improvementAreas: string;
  supportTraining: string;
  nextObjectives: string;
  managerOverallComment: string;
}

export interface AppraisalManagementDecision {
  decision: string;
  effectiveDate: string;
  newPosition: string;
  newProbationEndDate: string;
  reason: string;
  other: string;
}

export interface AppraisalSignatures {
  appraiseeName: string;
  appraiseeDate: string;
  appraiserName: string;
  appraiserDate: string;
  hrReviewerName: string;
  hrReviewerDate: string;
}

export interface AppraisalEmployeeInfo {
  employeeName: string;
  employeeIdOrIc: string;
  positionTitle: string;
  department: string;
}

export interface PerformanceAppraisalDraft {
  id: string;
  employeeId: string;
  reviewCycleId: string;
  title: string;
  subtitle: string;
  status: AppraisalWorkflowStatus;
  reviewType: string;
  reviewPurpose: string;
  reviewFrom: string;
  reviewTo: string;
  appraiserName: string;
  probationStage: string;
  probationEndDate: string;
  projectName: string;
  projectClient: string;
  employeeInfo: AppraisalEmployeeInfo;
  kpiCategories: AppraisalKpiCategory[];
  competencies: AppraisalCompetencyRating[];
  qualitative: AppraisalQualitativeNotes;
  management: AppraisalManagementDecision;
  signatures: AppraisalSignatures;
  createdAt: string;
  updatedAt: string;
}

export interface AppraisalScoreSummary {
  kpiWeightTotal: number;
  kpiAppraiseeAverage: number;
  kpiAgreedAverage: number;
  kpiRawPercent: number;
  kpiWeightedPoints: number;
  competencyAppraiseeAverage: number;
  competencyAgreedAverage: number;
  competencyRawPercent: number;
  competencyWeightedPoints: number;
  totalPoints: number;
  finalRating: number;
  tierLabel: string;
  isKpiWeightValid: boolean;
}

const STORAGE_PREFIX = 'performance_appraisal_draft_v1';

const REVIEW_STATUS_TO_APPRAISAL_STATUS: Record<EmployeePerformance['reviewStatus'], AppraisalWorkflowStatus> = {
  Completed: 'Finalised',
  'In Progress': 'Pending Manager Review',
  'Not Started': 'Draft',
};

const DEFAULT_COMPETENCIES: Array<Pick<AppraisalCompetencyRating, 'id' | 'name' | 'description'>> = [
  {
    id: 'role-proficiency',
    name: '1. Proficiency in Current Role',
    description: 'Demonstrates knowledge of position and understands how responsibilities fit within the organization.',
  },
  {
    id: 'quality-of-work',
    name: '2. Quality of Work',
    description: 'Maintains standards consistently, achieves accuracy, and remains attentive to details.',
  },
  {
    id: 'initiative',
    name: '3. Initiative',
    description: 'Works independently, takes additional responsibility, and suggests ways to enhance processes.',
  },
  {
    id: 'planning-organisation',
    name: '4. Planning and Organisation',
    description: 'Prioritises effectively, anticipates changes, and coordinates resources to meet deadlines.',
  },
  {
    id: 'interpersonal-relations',
    name: '5. Interpersonal Relations',
    description: 'Maintains positive working relationships and cooperates flexibly with others.',
  },
  {
    id: 'team-participation',
    name: '6. Team Participation',
    description: 'Builds partnerships, works cooperatively with team members, and understands team goals.',
  },
  {
    id: 'punctuality-attendance',
    name: '7. Punctuality and Attendance',
    description: 'Arrives ready to work at scheduled time and maintains an acceptable attendance record.',
  },
];

const sanitizeKeyPart = (value: string) => value.replace(/[^a-z0-9_-]/gi, '_');

const nowIso = () => new Date().toISOString();

const isBrowserStorageAvailable = () => (
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
);

export const getAppraisalDraftStorageKey = (employeeId: string, reviewCycleId: string) => (
  `${STORAGE_PREFIX}_${sanitizeKeyPart(employeeId)}_${sanitizeKeyPart(reviewCycleId)}`
);

export const createBlankEvidence = (): AppraisalKpiEvidence => ({
  achievement: '',
  managerVerification: '',
  evidenceType: 'Analytics',
  evidenceLink: '',
  completionPercent: '',
  status: 'Not Added',
});

export const createBlankKpiRow = (): AppraisalKpiRow => ({
  id: `kpi-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  kra: '',
  outcome: '',
  weight: 0,
  appraiseeScore: '',
  agreedScore: '',
  evidence: createBlankEvidence(),
});

const createDefaultCompetencies = (performance?: EmployeePerformance | null): AppraisalCompetencyRating[] => {
  const seededScores: Record<string, number | undefined> = {
    'team-participation': performance?.teamworkScore || undefined,
    'interpersonal-relations': performance?.communicationScore || undefined,
    'planning-organisation': performance?.problemSolvingScore || undefined,
  };

  return DEFAULT_COMPETENCIES.map((competency) => ({
    ...competency,
    appraiseeRating: seededScores[competency.id] || '',
    agreedRating: performance?.reviewStatus === 'Completed' ? seededScores[competency.id] || '' : '',
    appraiseeComment: '',
    managerComment: '',
    supportingExample: '',
  }));
};

export const createDefaultAppraisalDraft = (
  employee: Employee,
  reviewCycle: ReviewCycle,
  performance?: EmployeePerformance | null,
  currentUserName = ''
): PerformanceAppraisalDraft => {
  const timestamp = nowIso();
  const goals = performance?.goals || [];

  return {
    id: `${employee.id}_${reviewCycle.id}`,
    employeeId: employee.id,
    reviewCycleId: reviewCycle.id,
    title: 'Performance Appraisal',
    subtitle: reviewCycle.name || 'Annual Review Form',
    status: performance ? REVIEW_STATUS_TO_APPRAISAL_STATUS[performance.reviewStatus] : 'Draft',
    reviewType: 'Annual Performance Review',
    reviewPurpose: 'Review objectives, KPI achievement, behavioural competencies, development needs, and next-cycle goals.',
    reviewFrom: '',
    reviewTo: '',
    appraiserName: performance?.managerName || currentUserName || 'Manager',
    probationStage: '',
    probationEndDate: '',
    projectName: '',
    projectClient: '',
    employeeInfo: {
      employeeName: employee.name,
      employeeIdOrIc: employee.nricPassport || employee.id,
      positionTitle: employee.designation,
      department: employee.department,
    },
    kpiCategories: [
      {
        id: 'core-role-deliverables',
        name: 'Core Role Deliverables',
        rows: [
          {
            id: 'system-uptime-maintenance',
            kra: 'System Uptime Maintenance',
            outcome: 'Maintain 99.9% uptime for core enterprise services.',
            weight: 40,
            appraiseeScore: '',
            agreedScore: '',
            evidence: createBlankEvidence(),
          },
          {
            id: 'legacy-migration-project',
            kra: 'Legacy Migration Project',
            outcome: 'Complete Phase 1 migration of user database by the agreed deadline.',
            weight: 60,
            appraiseeScore: '',
            agreedScore: '',
            evidence: createBlankEvidence(),
          },
        ],
      },
    ],
    competencies: createDefaultCompetencies(performance),
    qualitative: {
      employeeOverallComment: performance?.selfEvaluation || '',
      keyStrengths: '',
      improvementAreas: '',
      supportTraining: '',
      nextObjectives: goals.join('\n'),
      managerOverallComment: performance?.managerComments || '',
    },
    management: {
      decision: '',
      effectiveDate: '',
      newPosition: '',
      newProbationEndDate: '',
      reason: '',
      other: '',
    },
    signatures: {
      appraiseeName: '',
      appraiseeDate: '',
      appraiserName: '',
      appraiserDate: '',
      hrReviewerName: '',
      hrReviewerDate: '',
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const mergeDraftWithDefaults = (
  storedDraft: Partial<PerformanceAppraisalDraft>,
  fallbackDraft: PerformanceAppraisalDraft
): PerformanceAppraisalDraft => ({
  ...fallbackDraft,
  ...storedDraft,
  qualitative: {
    ...fallbackDraft.qualitative,
    ...(storedDraft.qualitative || {}),
  },
  management: {
    ...fallbackDraft.management,
    ...(storedDraft.management || {}),
  },
  employeeInfo: {
    ...fallbackDraft.employeeInfo,
    ...(storedDraft.employeeInfo || {}),
  },
  signatures: {
    ...fallbackDraft.signatures,
    ...(storedDraft.signatures || {}),
  },
  kpiCategories: Array.isArray(storedDraft.kpiCategories) && storedDraft.kpiCategories.length > 0
    ? storedDraft.kpiCategories.map((category) => ({
      ...category,
      rows: (category.rows || []).map((row) => ({
        ...row,
        evidence: {
          ...createBlankEvidence(),
          ...(row.evidence || {}),
        },
      })),
    }))
    : fallbackDraft.kpiCategories,
  competencies: Array.isArray(storedDraft.competencies) && storedDraft.competencies.length > 0
    ? storedDraft.competencies.map((competency) => ({
      ...createDefaultCompetencies()[0],
      ...competency,
    }))
    : fallbackDraft.competencies,
});

export const loadAppraisalDraft = (
  employee: Employee,
  reviewCycle: ReviewCycle,
  performance?: EmployeePerformance | null,
  currentUserName = ''
): PerformanceAppraisalDraft => {
  const fallbackDraft = createDefaultAppraisalDraft(employee, reviewCycle, performance, currentUserName);
  if (!isBrowserStorageAvailable()) return fallbackDraft;

  try {
    const raw = window.localStorage.getItem(getAppraisalDraftStorageKey(employee.id, reviewCycle.id));
    if (!raw) return fallbackDraft;
    return mergeDraftWithDefaults(JSON.parse(raw) as Partial<PerformanceAppraisalDraft>, fallbackDraft);
  } catch (_error) {
    return fallbackDraft;
  }
};

export const saveAppraisalDraft = (draft: PerformanceAppraisalDraft) => {
  const nextDraft = {
    ...draft,
    updatedAt: nowIso(),
  };

  if (isBrowserStorageAvailable()) {
    window.localStorage.setItem(
      getAppraisalDraftStorageKey(nextDraft.employeeId, nextDraft.reviewCycleId),
      JSON.stringify(nextDraft)
    );
  }

  return nextDraft;
};

const parseScore = (value: number | '') => (
  value === '' || Number.isNaN(Number(value)) ? null : Number(value)
);

export const calculateAppraisalScores = (draft: PerformanceAppraisalDraft): AppraisalScoreSummary => {
  let kpiWeightTotal = 0;
  let kpiWeightedRaw = 0;
  let kpiAppraiseeWeighted = 0;
  let kpiAgreedWeighted = 0;

  draft.kpiCategories.forEach((category) => {
    category.rows.forEach((row) => {
      const weight = Number(row.weight || 0);
      const appraiseeScore = parseScore(row.appraiseeScore);
      const agreedScore = parseScore(row.agreedScore);
      const activeScore = agreedScore ?? appraiseeScore ?? 0;

      kpiWeightTotal += weight;
      kpiWeightedRaw += (activeScore / 5) * weight;
      kpiAppraiseeWeighted += (appraiseeScore ?? 0) * weight;
      kpiAgreedWeighted += (agreedScore ?? appraiseeScore ?? 0) * weight;
    });
  });

  const kpiRawPercent = kpiWeightTotal > 0 ? (kpiWeightedRaw / kpiWeightTotal) * 100 : 0;
  const kpiAppraiseeAverage = kpiWeightTotal > 0 ? kpiAppraiseeWeighted / kpiWeightTotal : 0;
  const kpiAgreedAverage = kpiWeightTotal > 0 ? kpiAgreedWeighted / kpiWeightTotal : 0;

  let competencyAppraiseeTotal = 0;
  let competencyAppraiseeCount = 0;
  let competencyAgreedTotal = 0;
  let competencyAgreedCount = 0;

  draft.competencies.forEach((competency) => {
    const appraiseeRating = parseScore(competency.appraiseeRating);
    const agreedRating = parseScore(competency.agreedRating);
    const activeRating = agreedRating ?? appraiseeRating;

    if (appraiseeRating !== null) {
      competencyAppraiseeTotal += appraiseeRating;
      competencyAppraiseeCount += 1;
    }
    if (activeRating !== null) {
      competencyAgreedTotal += activeRating;
      competencyAgreedCount += 1;
    }
  });

  const competencyAppraiseeAverage = competencyAppraiseeCount > 0 ? competencyAppraiseeTotal / competencyAppraiseeCount : 0;
  const competencyAgreedAverage = competencyAgreedCount > 0 ? competencyAgreedTotal / competencyAgreedCount : 0;
  const competencyRawPercent = (competencyAgreedAverage / 5) * 100;
  const kpiWeightedPoints = kpiRawPercent * 0.6;
  const competencyWeightedPoints = competencyRawPercent * 0.4;
  const totalPoints = kpiWeightedPoints + competencyWeightedPoints;

  let finalRating = 0;
  let tierLabel = 'Not rated';
  if (totalPoints > 0) {
    if (totalPoints >= 90) {
      finalRating = 5;
      tierLabel = '5 - Outstanding';
    } else if (totalPoints >= 71) {
      finalRating = 4;
      tierLabel = '4 - Exceeds Expectations';
    } else if (totalPoints >= 56) {
      finalRating = 3;
      tierLabel = '3 - Meets Expectations';
    } else if (totalPoints >= 36) {
      finalRating = 2;
      tierLabel = '2 - Below Expectations';
    } else {
      finalRating = 1;
      tierLabel = '1 - Needs Improvement';
    }
  }

  return {
    kpiWeightTotal,
    kpiAppraiseeAverage,
    kpiAgreedAverage,
    kpiRawPercent,
    kpiWeightedPoints,
    competencyAppraiseeAverage,
    competencyAgreedAverage,
    competencyRawPercent,
    competencyWeightedPoints,
    totalPoints,
    finalRating,
    tierLabel,
    isKpiWeightValid: Math.abs(kpiWeightTotal - 100) < 0.001,
  };
};

const getCompetencyScore = (
  draft: PerformanceAppraisalDraft,
  id: string,
  fallback: number
) => {
  const competency = draft.competencies.find((item) => item.id === id);
  return Number(competency?.agreedRating || competency?.appraiseeRating || fallback || 1);
};

export const mapAppraisalStatusToPerformanceStatus = (
  status: AppraisalWorkflowStatus
): EmployeePerformance['reviewStatus'] => {
  if (status === 'Finalised') return 'Completed';
  if (status === 'Draft') return 'Not Started';
  return 'In Progress';
};

export const buildPerformanceFromAppraisalDraft = (
  draft: PerformanceAppraisalDraft,
  existingPerformance?: EmployeePerformance | null
): EmployeePerformance => {
  const scoreSummary = calculateAppraisalScores(draft);
  const nextGoals = draft.qualitative.nextObjectives
    .split('\n')
    .map((goal) => goal.trim())
    .filter(Boolean);

  return {
    employeeId: draft.employeeId,
    reviewCycleId: draft.reviewCycleId,
    managerName: draft.appraiserName || existingPerformance?.managerName || 'Manager',
    reviewStatus: mapAppraisalStatusToPerformanceStatus(draft.status),
    rating: scoreSummary.finalRating,
    teamworkScore: getCompetencyScore(draft, 'team-participation', existingPerformance?.teamworkScore || 1),
    communicationScore: getCompetencyScore(draft, 'interpersonal-relations', existingPerformance?.communicationScore || 1),
    problemSolvingScore: getCompetencyScore(draft, 'planning-organisation', existingPerformance?.problemSolvingScore || 1),
    selfEvaluation: draft.qualitative.employeeOverallComment,
    managerComments: draft.qualitative.managerOverallComment || draft.qualitative.keyStrengths,
    goals: nextGoals,
  };
};
