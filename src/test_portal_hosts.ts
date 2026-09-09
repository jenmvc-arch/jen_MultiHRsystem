import assert from 'node:assert/strict';
import {
  EMPLOYEE_HOSTNAME,
  EMPLOYER_HOSTNAME,
  getPortalSite,
  isPortalHostAllowed,
  normalizeHostname,
} from './lib/portalHosts';

assert.equal(normalizeHostname('ADMIN-REDPOINT.HRMSYSTEM.APP:443'), EMPLOYER_HOSTNAME);
assert.equal(normalizeHostname('[::1]:3000'), '::1');
assert.equal(getPortalSite(EMPLOYER_HOSTNAME), 'employer');
assert.equal(getPortalSite(EMPLOYEE_HOSTNAME), 'employee');
assert.equal(getPortalSite('localhost:3000'), 'local');
assert.equal(isPortalHostAllowed(EMPLOYER_HOSTNAME, 'employer'), true);
assert.equal(isPortalHostAllowed(EMPLOYEE_HOSTNAME, 'employer'), false);
assert.equal(isPortalHostAllowed('localhost:3000', 'employee'), true);

console.log('Portal host tests passed.');
