import assert from 'node:assert/strict';
import {
  canonicalEntityId,
  getEmployeeDataKey,
  resolveEntityId,
} from './lib/employeeDataNormalization';

const entities = [
  { id: 'ENT-92', name: 'Red Point Sdn Bhd' },
  { id: 'ENT-86', name: 'YSYD Sdn Bhd' },
];

assert.equal(canonicalEntityId('Red Point Sdn Bhd'), 'ENT-92');
assert.equal(canonicalEntityId('ENT-02'), 'ENT-86');
assert.equal(resolveEntityId('YSYD Sdn Bhd', entities), 'ENT-86');
assert.equal(resolveEntityId('ENT-92', entities), 'ENT-92');
assert.equal(
  getEmployeeDataKey({ email: 'person@example.com' }, 'ENT-92'),
  'ent-92::person@example.com',
);
assert.notEqual(
  getEmployeeDataKey({ email: 'person@example.com' }, 'ENT-92'),
  getEmployeeDataKey({ email: 'person@example.com' }, 'ENT-86'),
);

console.log('employee data normalization tests passed');
