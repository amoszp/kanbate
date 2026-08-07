import { Router } from 'express';
import db from '../db.js';
import { now } from '../seed.js';
import { wrap } from '../middleware.js';
import { attachTaskTags, replaceTaskTags } from '../tagHelpers.js';

const router = Router();

export const TASK_SELECT = `
  SELECT t.id, t.project_id, t.title, t.description, t.status,
         t.created_at, t.updated_at, t.moved_to_resolved_at, t.moved_to_inprogress_at
  FROM tasks t
`;

export const mapTask = (r) => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  description: r.description,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  movedToResolvedAt: r.moved_to_resolved_at,
  movedToInProgressAt: r.moved_to_inprogress_at,
  tags: [], // populated by attachTaskTags()
});

const VALID_STATUS = new Set(['backlog', 'todo', 'in_progress', 'resolved']);

/**
 * Status bookkeeping: tracks when a task enters "resolved" and "in_progress"
 * columns — the timestamps that drive the automation engine.
 */
function applyStatusTimestamps(params, { status, oldStatus, updatedAt }) {
  const prevStatus = oldStatus ?? params.status;
  if (status === prevStatus) {
    if (status === 'resolved' && !params.movedToResolvedAt) params.movedToResolvedAt = updatedAt;
    if (status === 'in_progress' && !params.movedToInProgressAt) params.movedToInProgressAt = updatedAt;
    return params;
  }
  if (status === 'resolved') {
    params.movedToResolvedAt = updatedAt;
    params.movedToInProgressAt = null;
  } else if (status === 'in_progress') {
    params.movedToInProgressAt = updatedAt;
    params.movedToResolvedAt = null;
  } else {
    params.movedToResolvedAt = null;
    params.movedToInProgressAt = null;
  }
  return params;
}

/**
 * Validates a `tags` payload ({ categoryId: tagId | null }) and persists it.
 * Throws an httpError (caught by the wrap/error-handler chain) on bad input.
 */
function validateAndReplaceTaskTags(taskId, tagValues) {
  if (tagValues == null) return;

  const check = db.prepare('SELECT category_id FROM tags WHERE id = ?');
  const entries = Object.entries(tagValues).filter(([, tagId]) => tagId != null);

  for (const [categoryId, tagId] of entries) {
    const cat = Number(categoryId);
    const tag = Number(tagId);
    if (!Number.isInteger(cat) || !Number.isInteger(tag)) {
      const err = new Error('Invalid tag reference in payload');
      err.status = 400;
      throw err;
    }
    const row = check.get(tag);
    if (!row) {
      const err = new Error(`Tag #${tag} does not exist`);
      err.status = 400;
      throw err;
    }
    if (row.category_id !== cat) {
      const err = new Error(`Tag #${tag} does not belong to block #${cat}`);
      err.status = 400;
      throw err;
    }
  }

  replaceTaskTags(db, taskId, tagValues);
}

// GET /api/tasks/project/:projectId  (?status=backlog)
router.get(
  '/project/:projectId',
  wrap((req, res) => {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    let sql = `${TASK_SELECT} WHERE t.project_id = ?`;
    const params = [req.params.projectId];
    if (req.query.status) {
      if (!VALID_STATUS.has(req.query.status)) return res.status(400).json({ error: 'Invalid status' });
      sql += ' AND t.status = ?';
      params.push(req.query.status);
    }
    sql += ' ORDER BY t.created_at ASC';
    const rows = db.prepare(sql).all(...params);
    res.json(attachTaskTags(db, rows.map(mapTask)));
  })
);

// POST /api/tasks/project/:projectId  (quick-add dispatches to Backlog)
// Body: { title, description?, status?, tags?: { categoryId: tagId|null } }
router.post(
  '/project/:projectId',
  wrap((req, res) => {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Task title is required' });

    const status = VALID_STATUS.has(req.body?.status) ? req.body.status : 'backlog';
    const description = String(req.body?.description ?? '').trim();
    const ts = now();

    const params = applyStatusTimestamps({ status }, { status, updatedAt: ts });

    const info = db
      .prepare(
        `INSERT INTO tasks
          (project_id, title, description, status, created_at, updated_at,
           moved_to_resolved_at, moved_to_inprogress_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        project.id, title, description, params.status, ts, ts,
        params.movedToResolvedAt, params.movedToInProgressAt
      );

    if (req.body?.tags !== undefined) validateAndReplaceTaskTags(info.lastInsertRowid, req.body.tags);

    const row = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(info.lastInsertRowid);
    res.status(201).json(attachTaskTags(db, [mapTask(row)])[0]);
  })
);

// PUT /api/tasks/:id  { title?, description?, status?, tags? }
router.put(
  '/:id',
  wrap((req, res) => {
    const existing = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const body = req.body ?? {};
    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    if (!title) return res.status(400).json({ error: 'Task title cannot be empty' });
    const description = body.description !== undefined ? String(body.description).trim() : existing.description;
    const status = body.status !== undefined ? body.status : existing.status;
    if (!VALID_STATUS.has(status)) return res.status(400).json({ error: 'Invalid status' });
    const ts = now();

    const params = applyStatusTimestamps(
      { status },
      { status, oldStatus: existing.status, updatedAt: ts }
    );

    db.prepare(
      `UPDATE tasks
         SET title = ?, description = ?, status = ?, updated_at = ?,
             moved_to_resolved_at = ?, moved_to_inprogress_at = ?
       WHERE id = ?`
    ).run(
      title, description, params.status, ts,
      params.movedToResolvedAt, params.movedToInProgressAt, existing.id
    );

    if (body.tags !== undefined) validateAndReplaceTaskTags(existing.id, body.tags);

    const row = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(existing.id);
    res.json(attachTaskTags(db, [mapTask(row)])[0]);
  })
);

// DELETE /api/tasks/:id
router.delete(
  '/:id',
  wrap((req, res) => {
    const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true });
  })
);

export default router;
