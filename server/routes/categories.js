import { Router } from 'express';
import db from '../db.js';
import { now } from '../seed.js';
import { wrap } from '../middleware.js';

const router = Router();

const mapCategory = (r) => ({ id: r.id, name: r.name, createdAt: r.created_at });

// GET /api/categories — all tag blocks, each with its tags
router.get(
  '/',
  wrap((req, res) => {
    const cats = db
      .prepare('SELECT * FROM tag_categories ORDER BY created_at ASC, id ASC')
      .all();
    const result = cats.map((c) => {
      const tags = db
        .prepare(
          'SELECT id, name, color, created_at FROM tags WHERE category_id = ? ORDER BY name COLLATE NOCASE'
        )
        .all(c.id)
        .map((t) => ({
          id: t.id,
          categoryId: c.id,
          name: t.name,
          color: t.color,
          createdAt: t.created_at,
        }));
      return { id: c.id, name: c.name, createdAt: c.created_at, tags };
    });
    res.json(result);
  })
);

// POST /api/categories  { name }
router.post(
  '/',
  wrap((req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Block name is required' });
    const dup = db.prepare('SELECT id FROM tag_categories WHERE name = ?').get(name);
    if (dup) return res.status(409).json({ error: `A block named "${name}" already exists` });
    const info = db
      .prepare('INSERT INTO tag_categories (name, created_at) VALUES (?, ?)')
      .run(name, now());
    res
      .status(201)
      .json(mapCategory(db.prepare('SELECT * FROM tag_categories WHERE id = ?').get(info.lastInsertRowid)));
  })
);

// PUT /api/categories/:id  { name }
router.put(
  '/:id',
  wrap((req, res) => {
    const existing = db.prepare('SELECT * FROM tag_categories WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Block not found' });

    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Block name cannot be empty' });
    const dup = db
      .prepare('SELECT id FROM tag_categories WHERE name = ? AND id != ?')
      .get(name, existing.id);
    if (dup) return res.status(409).json({ error: `A block named "${name}" already exists` });

    db.prepare('UPDATE tag_categories SET name = ? WHERE id = ?').run(name, existing.id);
    res.json(mapCategory(db.prepare('SELECT * FROM tag_categories WHERE id = ?').get(existing.id)));
  })
);

// DELETE /api/categories/:id — cascades its tags and their task/history links
router.delete(
  '/:id',
  wrap((req, res) => {
    const existing = db.prepare('SELECT id FROM tag_categories WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Block not found' });
    db.prepare('DELETE FROM tag_categories WHERE id = ?').run(existing.id);
    res.json({ ok: true });
  })
);

export default router;
