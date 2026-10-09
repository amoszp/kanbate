/**
 * Helpers for the task comment / activity stream (`comments` table).
 */
import { now } from './seed.js';

export const STATUS_LABELS = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export const mapComment = (r) => ({
  id: r.id,
  taskId: r.task_id,
  historyId: r.history_id,
  kind: r.kind,
  body: r.body,
  createdAt: r.created_at,
});

/** Appends an auto-generated activity entry (status change, move, copy…). */
export function addSystemNote(db, taskId, body, ts = now()) {
  db.prepare(
    "INSERT INTO comments (task_id, kind, body, created_at) VALUES (?, 'system', ?, ?)"
  ).run(taskId, body, ts);
}
