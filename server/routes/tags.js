import { Router } from 'express';
import db from '../db.js';
import { now } from '../seed.js';
import { wrap } from '../middleware.js';

const router = Router();

const TAG_SELECT = `
  SELECT t.id, t.category_id, t.name, t.color, t.created_at, c.name AS category_name
  FROM tags t
  JOIN tag_categories c ON c.id = t.category_id
`;

const mapTag = (r) => ({
  id: r.id,
  categoryId: r.category_id,
  categoryName: r.category_name ?? null,
  name: r.name,
  color: r.color,
  createdAt: r.created_at,
});

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// GET /api/tags?categoryId=<id>
router.get(
  '/',
  wrap((req, res) => {
    let sql = TAG_SELECT;
    const params = [];
    if (req.query.categoryId !== undefined) {
      const categoryId = Number(req.query.categoryId);
      if (!Number.isInteger(categoryId)) return res.status(400).json({ error: 'Invalid categoryId' });
      sql += ' WHERE t.category_id = ?';
      params.push(categoryId);
    }
    sql += ' ORDER BY c.name COLLATE NOCASE, t.name COLLATE NOCASE';
    res.json(db.prepare(sql).all(...params).map(mapTag));
  })
);

// POST /api/tags  { categoryId, name, color }
router.post(
  '/',
  wrap((req, res) => {
    const categoryId = Number(req.body?.categoryId);
    const name = String(req.body?.name ?? '').trim();
    const color = String(req.body?.color ?? '#00f0ff').trim();

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({ error: 'A valid categoryId is required' });
    }
    if (!name) return res.status(400).json({ error: 'Tag name is required' });
    if (!COLOR_RE.test(color)) return res.status(400).json({ error: 'Color must be a hex value like #00f0ff' });

    const category = db.prepare('SELECT id FROM tag_categories WHERE id = ?').get(categoryId);
    if (!category) return res.status(404).json({ error: 'Tag block not found' });

    const dup = db.prepare('SELECT id FROM tags WHERE category_id = ? AND name = ?').get(categoryId, name);
    if (dup) return res.status(409).json({ error: `A tag named "${name}" already exists in this block` });

    const info = db
      .prepare('INSERT INTO tags (category_id, name, color, created_at) VALUES (?, ?, ?, ?)')
      .run(categoryId, name, color, now());
    res
      .status(201)
      .json(mapTag(db.prepare(`${TAG_SELECT} WHERE t.id = ?`).get(info.lastInsertRowid)));
  })
);

// PUT /api/tags/:id  { name?, color? }
router.put(
  '/:id',
  wrap((req, res) => {
    const existing = db.prepare(`${TAG_SELECT} WHERE t.id = ?`).get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tag not found' });

    const name = req.body?.name !== undefined ? String(req.body.name).trim() : existing.name;
    if (!name) return res.status(400).json({ error: 'Tag name cannot be empty' });
    const color = req.body?.color !== undefined ? String(req.body.color).trim() : existing.color;
    if (!COLOR_RE.test(color)) return res.status(400).json({ error: 'Color must be a hex value like #00f0ff' });

    const dup = db
      .prepare('SELECT id FROM tags WHERE category_id = ? AND name = ? AND id != ?')
      .get(existing.category_id, name, existing.id);
    if (dup) return res.status(409).json({ error: `A tag named "${name}" already exists in this block` });

    db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, existing.id);
    res.json(mapTag(db.prepare(`${TAG_SELECT} WHERE t.id = ?`).get(existing.id)));
  })
);

// DELETE /api/tags/:id  (removes the tag from all tasks)
router.delete(
  '/:id',
  wrap((req, res) => {
    const existing = db.prepare('SELECT id FROM tags WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tag not found' });
    db.prepare('DELETE FROM tags WHERE id = ?').run(existing.id);
    res.json({ ok: true });
  })
);

export default router;
