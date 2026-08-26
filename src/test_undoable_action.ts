import assert from 'node:assert/strict';
import {
  UNDO_DURATION_MS,
  createUndoableAction,
  getUndoDuration,
} from './lib/undoableAction';

const action = createUndoableAction('Undo', async () => {}, 1_000);

assert.equal(action.expiresAt, 1_000 + UNDO_DURATION_MS);
assert.equal(getUndoDuration(action, 1_000), UNDO_DURATION_MS);
assert.equal(getUndoDuration(action, action.expiresAt), 0);
assert.equal(getUndoDuration(action, action.expiresAt + 1), 0);

console.log('Undoable action tests passed.');
