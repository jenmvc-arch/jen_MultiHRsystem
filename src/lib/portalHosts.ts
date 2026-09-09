export const EMPLOYER_HOSTNAME = 'admin-redpoint.hrmsystem.app';
export const EMPLOYEE_HOSTNAME = 'user-redpoint.hrmsystem.app';
export const EMPLOYEE_PORTAL_ORIGIN = `https://${EMPLOYEE_HOSTNAME}`;

// Keep the previous production alias working as the Employer site during DNS
// migration. It can be removed after all users move to the admin subdomain.
export const LEGACY_EMPLOYER_HOSTNAME = 'redpoint.hrmsystem.app';

export type PortalSite = 'employer' | 'employee' | 'local' | 'unknown';

export const normalizeHostname = (value: unknown) => {
  const firstValue = String(value || '').split(',')[0].trim().toLowerCase();
  if (!firstValue) return '';
  if (firstValue.startsWith('[')) {
    const closingBracket = firstValue.indexOf(']');
    return closingBracket >= 0 ? firstValue.slice(1, closingBracket) : firstValue;
  }
  return firstValue.replace(/:\d+$/, '');
};

export const getPortalSite = (hostname: unknown): PortalSite => {
  const normalized = normalizeHostname(hostname);
  if (normalized === EMPLOYER_HOSTNAME || normalized === LEGACY_EMPLOYER_HOSTNAME) {
    return 'employer';
  }
  if (normalized === EMPLOYEE_HOSTNAME) return 'employee';
  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') {
    return 'local';
  }
  return 'unknown';
};

export const isPortalHostAllowed = (
  hostname: unknown,
  expected: Exclude<PortalSite, 'local' | 'unknown'>
) => {
  const site = getPortalSite(hostname);
  return site === expected || site === 'local';
};
