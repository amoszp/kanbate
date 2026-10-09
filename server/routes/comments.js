import { Router } from 'express';
import db from '../db.js';
import { now } from '../seed.js';
import { wrap, httpError } from '../middleware.js';
import { mapComment } from '../commentHelpers.js';

const router = Router();

const MAX_BODY = 10_000;

// Comments can target a live task or an archived history entry.
const TARGETS = {
  task: { table: 'tasks', column: 'task_id', label: 'Task' },
  history: { table: 'history', column: 'history_id', label: 'History entry' },
};

function resolveTarget(type, id) {
  const target = TARGETS[type];
  if (!target) throw httpError(404, 'Unknown comment target');
  const row = db.prepare(`SELECT id FROM ${target.table} WHERE id = ?`).get(id);
  if (!row) throw httpError(404, `${target.label} not found`);
  return { ...target, id: row.id };
}

// GET /api/comments/:type/:id   (type = task | history) — oldest first
router.get(
  '/:type(task|history)/:id',
  wrap((req, res) => {
    const target = resolveTarget(req.params.type, req.params.id);
    const rows = db
      .prepare(`SELECT * FROM comments WHERE ${target.column} = ? ORDER BY created_at ASC, id ASC`)
      .all(target.id);
    res.json(rows.map(mapComment));
  })
);

// POST /api/comments/:type/:id  { body }
router.post(
  '/:type(task|history)/:id',
  wrap((req, res) => {
    const target = resolveTarget(req.params.type, req.params.id);
    const body = String(req.body?.body ?? '').trim();
    if (!body) throw httpError(400, 'Comment cannot be empty');
    if (body.length > MAX_BODY) throw httpError(400, `Comment is too long (max ${MAX_BODY} characters)`);

    const info = db
      .prepare(`INSERT INTO comments (${target.column}, kind, body, created_at) VALUES (?, 'comment', ?, ?)`)
      .run(target.id, body, now());
    const row = db.prepare('SELECT * FROM comments WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(mapComment(row));
  })
);

// DELETE /api/comments/:id  (system activity entries are permanent)
router.delete(
  '/:id',
  wrap((req, res) => {
    const row = db.prepare('SELECT kind FROM comments WHERE id = ?').get(req.params.id);
    if (!row) throw httpError(404, 'Comment not found');
    if (row.kind !== 'comment') throw httpError(400, 'Activity entries cannot be deleted');
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  })
);

export default router;
