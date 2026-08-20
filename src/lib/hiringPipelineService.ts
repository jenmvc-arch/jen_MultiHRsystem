import {
  Candidate,
  CandidateEvaluation,
  CandidateInterview,
  CandidateOffer,
  CandidatePipelineHistoryEvent,
  CandidateShareDelivery,
  CandidateShareLink,
} from '../types';
import { isSupabaseConfigured, supabase, supabaseClient } from './supabaseClient';
import {
  addDays,
  buildCandidateShareUrl,
  createHiringId,
  INTERVIEW_LINK_TTL_DAYS,
  nowIso,
  ONBOARDING_LINK_TTL_DAYS,
} from './hiringPipelineDomain';

export interface HiringPipelineData {
  history: CandidatePipelineHistoryEvent[];
  interviews: CandidateInterview[];
  evaluations: CandidateEvaluation[];
  offers: CandidateOffer[];
  shareLinks: CandidateShareLink[];
  deliveries: CandidateShareDelivery[];
}

const STORAGE_KEY = 'offline_hiring_pipeline';
const emptyData = (): HiringPipelineData => ({
  history: [],
  interviews: [],
  evaluations: [],
  offers: [],
  shareLinks: [],
  deliveries: [],
});

const readLocalData = (): HiringPipelineData => {
  if (typeof window === 'undefined') return emptyData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyData(), ...JSON.parse(raw) } : emptyData();
  } catch {
    return emptyData();
  }
};

const writeLocalData = (data: HiringPipelineData) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

const toCamel = (value: any): any => {
  if (Array.isArray(value)) return value.map(toCamel);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      toCamel(item),
    ])
  );
};

const REMOTE_TABLES: Record<keyof HiringPipelineData, string> = {
  history: 'candidate_pipeline_history',
  interviews: 'candidate_interviews',
  evaluations: 'candidate_evaluations',
  offers: 'candidate_offers',
  shareLinks: 'candidate_share_links',
  deliveries: 'candidate_share_deliveries',
};

const remoteTableFor = (key: keyof HiringPipelineData) => REMOTE_TABLES[key];

const remoteOrderColumnFor = (key: keyof HiringPipelineData) => {
  if (key === 'interviews') return 'updated_at';
  if (key === 'evaluations') return 'updated_at';
  if (key === 'offers') return 'status_updated_at';
  return 'created_at';
};

const isMissingHiringSchema = (error: unknown) => (
  /candidate_pipeline_history|candidate_interviews|candidate_evaluations|candidate_offers|candidate_share_links|candidate_share_deliveries|schema cache|could not find the table|invalid relation name/i
    .test(error instanceof Error ? error.message : String(error || ''))
);

export const loadHiringPipelineData = async (): Promise<HiringPipelineData> => {
  const local = readLocalData();
  if (!isSupabaseConfigured || !supabase) return local;

  try {
    const keys = Object.keys(REMOTE_TABLES) as Array<keyof HiringPipelineData>;
    const responses = await Promise.all(keys.map(async (key) => {
      const { data, error } = await supabase
        .from(remoteTableFor(key))
        .select('*')
        .order(remoteOrderColumnFor(key), { ascending: false });
      if (error) throw error;
      return [key, (data || []).map(toCamel)] as const;
    }));
    const remote = responses.reduce((result, [key, rows]) => {
      result[key] = rows as never;
      return result;
    }, emptyData());
    const merged = {
      history: remote.history.length ? remote.history : local.history,
      interviews: remote.interviews.length ? remote.interviews : local.interviews,
      evaluations: remote.evaluations.length ? remote.evaluations : local.evaluations,
      offers: remote.offers.length ? remote.offers : local.offers,
      shareLinks: remote.shareLinks.length ? remote.shareLinks : local.shareLinks,
      deliveries: remote.deliveries.length ? remote.deliveries : local.deliveries,
    };
    writeLocalData(merged);
    return merged;
  } catch (error) {
    if (!isMissingHiringSchema(error)) {
      console.warn('[Hiring Pipeline] Remote data unavailable; using local fallback.', error);
    }
    return local;
  }
};

const persist = async <K extends keyof HiringPipelineData>(
  key: K,
  record: HiringPipelineData[K][number],
  data: HiringPipelineData
) => {
  const next = {
    ...data,
    [key]: [
      ...data[key].filter((item: any) => item.id !== (record as any).id),
      record,
    ],
  } as HiringPipelineData;
  writeLocalData(next);
  if (isSupabaseConfigured) {
    try {
      await supabaseClient.upsert(remoteTableFor(key), record);
    } catch (error) {
      if (!isMissingHiringSchema(error)) {
        console.warn(`[Hiring Pipeline] Could not mirror ${key} record to Supabase.`, error);
      }
    }
  }
  return next;
};

export const recordPipelineEvent = async (
  data: HiringPipelineData,
  event: Omit<CandidatePipelineHistoryEvent, 'id' | 'createdAt'>
) => persist('history', {
  ...event,
  id: createHiringId('HIST'),
  createdAt: nowIso(),
}, data);

export const saveInterview = async (data: HiringPipelineData, interview: CandidateInterview) => (
  persist('interviews', interview, data)
);

export const saveEvaluation = async (data: HiringPipelineData, evaluation: CandidateEvaluation) => (
  persist('evaluations', evaluation, data)
);

export const saveOffer = async (data: HiringPipelineData, offer: CandidateOffer) => (
  persist('offers', offer, data)
);

export const createCandidateShareLink = async (
  data: HiringPipelineData,
  candidateId: string,
  kind: 'interview' | 'onboarding'
) => {
  const createdAt = nowIso();
  const expiresAt = addDays(
    new Date(createdAt),
    kind === 'interview' ? INTERVIEW_LINK_TTL_DAYS : ONBOARDING_LINK_TTL_DAYS
  ).toISOString();
  const nextData = {
    ...data,
    shareLinks: data.shareLinks.map((link) => (
      link.candidateId === candidateId && link.kind === kind && !link.invalidatedAt
        ? { ...link, invalidatedAt: createdAt }
        : link
    )),
  };
  const link: CandidateShareLink = {
    id: createHiringId('SHARE'),
    candidateId,
    kind,
    token: `${cryptoRandomToken()}-${Date.now().toString(36)}`,
    url: '',
    expiresAt,
    createdAt,
  };
  link.url = buildCandidateShareUrl(kind, link.token, candidateId);
  writeLocalData({ ...nextData, shareLinks: [...nextData.shareLinks, link] });
  if (isSupabaseConfigured) {
    try {
      await Promise.all([
        ...nextData.shareLinks
          .filter((item) => item.candidateId === candidateId && item.kind === kind && item.id !== link.id && item.invalidatedAt)
          .map((item) => supabaseClient.update('candidate_share_links', item.id, { invalidatedAt: item.invalidatedAt })),
        supabaseClient.insert('candidate_share_links', link),
      ]);
    } catch (error) {
      if (!isMissingHiringSchema(error)) {
        console.warn('[Hiring Pipeline] Could not mirror share link to Supabase.', error);
      }
    }
  }
  return { data: { ...nextData, shareLinks: [...nextData.shareLinks, link] }, link };
};

const cryptoRandomToken = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Math.random().toString(36).slice(2, 18);
};

export const recordShareDelivery = async (
  data: HiringPipelineData,
  delivery: Omit<CandidateShareDelivery, 'id' | 'createdAt'>
) => persist('deliveries', {
  ...delivery,
  id: createHiringId('DELIVERY'),
  createdAt: nowIso(),
}, data);

export const deleteCandidatePipelineData = (
  data: HiringPipelineData,
  candidateId: string,
) => {
  const nextData: HiringPipelineData = {
    history: data.history.filter((event) => event.candidateId !== candidateId),
    interviews: data.interviews.filter((interview) => interview.candidateId !== candidateId),
    evaluations: data.evaluations.filter((evaluation) => evaluation.candidateId !== candidateId),
    offers: data.offers.filter((offer) => offer.candidateId !== candidateId),
    shareLinks: data.shareLinks.filter((link) => link.candidateId !== candidateId),
    deliveries: data.deliveries.filter((delivery) => delivery.candidateId !== candidateId),
  };
  writeLocalData(nextData);
  return nextData;
};

export const ensureCandidateIntake = async (
  data: HiringPipelineData,
  candidate: Candidate,
  actorName?: string | null
) => {
  if (data.history.some((event) => event.candidateId === candidate.id && event.eventType === 'received_submission')) {
    return data;
  }
  return recordPipelineEvent(data, {
    candidateId: candidate.id,
    toStatus: candidate.pipelineStatus || 'applied',
    eventType: 'received_submission',
    notes: 'Candidate received through the application intake.',
    actorName: actorName || undefined,
  });
};

export const getCandidateInterview = (data: HiringPipelineData, candidateId: string) => (
  data.interviews
    .filter((interview) => interview.candidateId === candidateId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
);

export const getCandidateEvaluation = (data: HiringPipelineData, candidateId: string) => (
  data.evaluations
    .filter((evaluation) => evaluation.candidateId === candidateId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
);

export const getCandidateOffer = (data: HiringPipelineData, candidateId: string) => (
  data.offers
    .filter((offer) => offer.candidateId === candidateId)
    .sort((a, b) => b.statusUpdatedAt.localeCompare(a.statusUpdatedAt))[0]
);
