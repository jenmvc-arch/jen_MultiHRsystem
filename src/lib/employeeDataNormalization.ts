import type { CorporateEntity } from '../types';

const normalizeValue = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const KNOWN_ENTITY_ALIASES: Record<string, string> = {
  'ent-01': 'ENT-92',
  'ent-92': 'ENT-92',
  'red point': 'ENT-92',
  'red point sdn bhd': 'ENT-92',
  'ent-02': 'ENT-86',
  'ent-86': 'ENT-86',
  'ysyd': 'ENT-86',
  'ysyd sdn bhd': 'ENT-86',
};

export const canonicalEntityId = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return KNOWN_ENTITY_ALIASES[normalizeValue(raw)] || raw;
};

export const resolveEntityId = (
  value: unknown,
  entities: Pick<CorporateEntity, 'id' | 'name'>[] = [],
): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const normalized = normalizeValue(raw);
  const matchingEntity = entities.find((entity) => (
    normalizeValue(entity.id) === normalized
    || normalizeValue(entity.name) === normalized
  ));

  return matchingEntity?.id || canonicalEntityId(raw);
};

export const getEmployeeDataKey = (
  employee: Record<string, unknown>,
  entityId = '',
): string => {
  const identity = normalizeValue(
    employee.email
    || employee.employeeEmail
    || employee.id
    || employee.employeeId
    || employee.name
  );
  return `${canonicalEntityId(entityId).toLowerCase()}::${identity}`;
};
