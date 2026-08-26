import { AppraisalAccessGrant, AppraisalAccessStatus, Employee, EmployeePerformance, ReviewCycle } from '../types';

export type ResolvedAppraisalAccessStatus = AppraisalAccessStatus | 'historical';

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

export const getEmployeeIdentityKeys = (employee: Pick<Employee, 'id' | 'email'> | string) => {
  if (typeof employee === 'string') return [normalize(employee)].filter(Boolean);
  return Array.from(new Set([normalize(employee.id), normalize(employee.email)].filter(Boolean)));
};

export const isHistoricalAppraisal = (
  reviewCycle: ReviewCycle,
  performance?: EmployeePerformance | null,
  workflowStatus?: string,
) => (
  reviewCycle.status === 'Completed'
  || performance?.reviewStatus === 'Completed'
  || workflowStatus === 'Finalised'
);

export const getAppraisalAccessGrant = (
  grants: AppraisalAccessGrant[],
  employee: Pick<Employee, 'id' | 'email' | 'entityId'>,
  reviewCycleId: string,
) => {
  const employeeKeys = new Set(getEmployeeIdentityKeys(employee));
  return grants.find((grant) => (
    normalize(grant.reviewCycleId) === normalize(reviewCycleId)
    && employeeKeys.has(normalize(grant.employeeId))
    && normalize(grant.entityId) === normalize(employee.entityId)
  )) || null;
};

export const getAppraisalAccessStatus = (
  grants: AppraisalAccessGrant[],
  employee: Pick<Employee, 'id' | 'email' | 'entityId'>,
  reviewCycle: ReviewCycle,
  performance?: EmployeePerformance | null,
  workflowStatus?: string,
): ResolvedAppraisalAccessStatus => {
  if (isHistoricalAppraisal(reviewCycle, performance, workflowStatus)) return 'historical';
  return getAppraisalAccessGrant(grants, employee, reviewCycle.id)?.status || 'closed';
};

export const getAppraisalAccessKey = (
  entityId: string,
  employeeId: string,
  reviewCycleId: string,
) => `${normalize(entityId)}::${normalize(employeeId)}::${normalize(reviewCycleId)}`;

export const createAppraisalAccessGrant = ({
  entityId,
  employeeId,
  reviewCycleId,
  status = 'closed',
  actor,
  now = new Date().toISOString(),
}: {
  entityId: string;
  employeeId: string;
  reviewCycleId: string;
  status?: AppraisalAccessStatus;
  actor?: string;
  now?: string;
}): AppraisalAccessGrant => ({
  id: `AAG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  entityId,
  employeeId,
  reviewCycleId,
  status,
  ...(status !== 'closed' ? { openedAt: now, openedBy: actor } : {}),
  ...(status === 'sent' ? { sentAt: now, sentBy: actor } : {}),
  updatedAt: now,
});

export const upsertAppraisalAccessGrant = (
  grants: AppraisalAccessGrant[],
  nextGrant: AppraisalAccessGrant,
) => {
  const nextKey = getAppraisalAccessKey(
    nextGrant.entityId,
    nextGrant.employeeId,
    nextGrant.reviewCycleId,
  );
  const existingIndex = grants.findIndex((grant) => (
    getAppraisalAccessKey(grant.entityId, grant.employeeId, grant.reviewCycleId) === nextKey
  ));
  if (existingIndex < 0) return [nextGrant, ...grants];
  return grants.map((grant, index) => index === existingIndex ? nextGrant : grant);
};

export const normalizeAppraisalAccessGrant = (raw: any): AppraisalAccessGrant => ({
  id: String(raw?.id || `AAG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  entityId: String(raw?.entityId ?? raw?.entity_id ?? ''),
  employeeId: String(raw?.employeeId ?? raw?.employee_id ?? raw?.employeeEmail ?? raw?.employee_email ?? ''),
  reviewCycleId: String(raw?.reviewCycleId ?? raw?.review_cycle_id ?? ''),
  status: raw?.status === 'sent' || raw?.status === 'open' ? raw.status : 'closed',
  openedAt: raw?.openedAt ?? raw?.opened_at ?? undefined,
  openedBy: raw?.openedBy ?? raw?.opened_by ?? undefined,
  sentAt: raw?.sentAt ?? raw?.sent_at ?? undefined,
  sentBy: raw?.sentBy ?? raw?.sent_by ?? undefined,
  updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? new Date().toISOString()),
});
