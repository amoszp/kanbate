import { Router } from 'express';
import db from '../db.js';
import { now } from '../seed.js';
import { wrap, httpError } from '../middleware.js';

const router = Router();

const PROJECT_COLUMNS = `
  p.id, p.name, p.description, p.created_at, p.updated_at,
  (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'backlog')     AS cnt_backlog,
  (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'todo')        AS cnt_todo,
  (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'in_progress') AS cnt_in_progress,
  (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'resolved')    AS cnt_resolved,
  (SELECT COUNT(*) FROM history h WHERE h.project_id = p.id)                            AS cnt_history
`;

const mapProject = (r) => ({
  id: r.id,
  name: r.name,
  description: r.description,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  taskCounts: {
    backlog: r.cnt_backlog,
    todo: r.cnt_todo,
    in_progress: r.cnt_in_progress,
    resolved: r.cnt_resolved,
  },
  historyCount: r.cnt_history,
});

const getProject = (id) =>
  db.prepare(`SELECT ${PROJECT_COLUMNS} FROM projects p WHERE p.id = ?`).get(id);

// GET /api/projects
router.get(
  '/',
  wrap((req, res) => {
    const rows = db
      .prepare(`SELECT ${PROJECT_COLUMNS} FROM projects p ORDER BY p.created_at DESC`)
      .all();
    res.json(rows.map(mapProject));
  })
);

// GET /api/projects/:id
router.get(
  '/:id',
  wrap((req, res) => {
    const row = getProject(req.params.id);
    if (!row) throw httpError(404, 'Project not found');
    res.json(mapProject(row));
  })
);

// POST /api/projects  { name, description }
router.post(
  '/',
  wrap((req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) throw httpError(400, 'Project name is required');
    const description = String(req.body?.description ?? '').trim();
    const ts = now();
    const info = db
      .prepare('INSERT INTO projects (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run(name, description, ts, ts);
    const created = getProject(info.lastInsertRowid);
    if (!created) throw httpError(500, 'Failed to read back the created project');
    res.status(201).json(mapProject(created));
  })
);

// PUT /api/projects/:id  { name?, description? }
router.put(
  '/:id',
  wrap((req, res) => {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) throw httpError(404, 'Project not found');

    const name = req.body?.name !== undefined ? String(req.body.name).trim() : existing.name;
    if (!name) throw httpError(400, 'Project name cannot be empty');
    const description = req.body?.description !== undefined ? String(req.body.description).trim() : existing.description;

    db.prepare('UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?').run(
      name, description, now(), existing.id
    );
    res.json(mapProject(getProject(existing.id)));
  })
);

// DELETE /api/projects/:id  (cascades tasks + history)
router.delete(
  '/:id',
  wrap((req, res) => {
    const info = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    if (info.changes === 0) throw httpError(404, 'Project not found');
    res.json({ ok: true });
  })
);

export default router;
