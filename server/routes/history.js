import { Router } from 'express';
import db from '../db.js';
import { wrap } from '../middleware.js';
import { attachHistoryTags } from '../tagHelpers.js';

const router = Router();

export const HISTORY_SELECT = `
  SELECT
    h.id, h.project_id, h.title, h.description, h.status,
    h.created_at, h.moved_to_resolved_at, h.archived_at,
    p.name AS project_name,
    (SELECT COUNT(*) FROM comments c WHERE c.history_id = h.id AND c.kind = 'comment') AS comment_count
  FROM history h
  LEFT JOIN projects p ON p.id = h.project_id
`;

const mapHistory = (r) => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  description: r.description,
  status: r.status,
  createdAt: r.created_at,
  movedToResolvedAt: r.moved_to_resolved_at,
  archivedAt: r.archived_at,
  projectName: r.project_name,
  commentCount: r.comment_count ?? 0,
  tags: [], // populated by attachHistoryTags()
});

// GET /api/history  — every archived task across all projects (powers Find)
router.get(
  '/',
  wrap((req, res) => {
    const rows = db.prepare(`${HISTORY_SELECT} ORDER BY h.archived_at DESC`).all();
    res.json(attachHistoryTags(db, rows.map(mapHistory)));
  })
);

// GET /api/projects/:projectId/history
router.get(
  '/project/:projectId',
  wrap((req, res) => {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const rows = db
      .prepare(`${HISTORY_SELECT} WHERE h.project_id = ? ORDER BY h.archived_at DESC`)
      .all(req.params.projectId);
    res.json(attachHistoryTags(db, rows.map(mapHistory)));
  })
);

// DELETE /api/history/:id
router.delete(
  '/:id',
  wrap((req, res) => {
    const info = db.prepare('DELETE FROM history WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'History entry not found' });
    res.json({ ok: true });
  })
);

export default router;
