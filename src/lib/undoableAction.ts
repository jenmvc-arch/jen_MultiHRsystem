export interface UndoableAction {
  label: string;
  undo: () => void | Promise<void>;
  expiresAt: number;
}

export const UNDO_DURATION_MS = 8_000;

export const createUndoableAction = (
  label: string,
  undo: () => void | Promise<void>,
  now = Date.now(),
): UndoableAction => ({
  label,
  undo,
  expiresAt: now + UNDO_DURATION_MS,
});

export const getUndoDuration = (action: UndoableAction, now = Date.now()) => (
  Math.max(0, action.expiresAt - now)
);
