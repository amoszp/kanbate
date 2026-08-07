/**
 * Helpers to read/write tag associations via the junction tables.
 */

export function attachTaskTags(db, tasks) {
  const list = tasks ?? [];
  if (list.length === 0) return list;

  const ids = list.map((t) => t.id);
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT tt.task_id AS task_id,
              c.id AS category_id, c.name AS category_name,
              g.id AS tag_id, g.name AS tag_name, g.color AS tag_color
       FROM task_tags tt
       JOIN tags g ON g.id = tt.tag_id
       JOIN tag_categories c ON c.id = g.category_id
       WHERE tt.task_id IN (${placeholders})
       ORDER BY c.id ASC, g.name COLLATE NOCASE`
    )
    .all(...ids);

  const byTask = new Map();
  for (const r of rows) {
    if (!byTask.has(r.task_id)) byTask.set(r.task_id, []);
    byTask.get(r.task_id).push({
      categoryId: r.category_id,
      categoryName: r.category_name,
      tagId: r.tag_id,
      tagName: r.tag_name,
      color: r.tag_color,
    });
  }

  for (const t of list) t.tags = byTask.get(t.id) ?? [];
  return list;
}

export function attachHistoryTags(db, entries) {
  const list = entries ?? [];
  if (list.length === 0) return list;

  const ids = list.map((e) => e.id);
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT ht.history_id AS history_id,
              c.id AS category_id, c.name AS category_name,
              g.id AS tag_id, g.name AS tag_name, g.color AS tag_color
       FROM history_tags ht
       JOIN tags g ON g.id = ht.tag_id
       JOIN tag_categories c ON c.id = g.category_id
       WHERE ht.history_id IN (${placeholders})
       ORDER BY c.id ASC, g.name COLLATE NOCASE`
    )
    .all(...ids);

  const byEntry = new Map();
  for (const r of rows) {
    if (!byEntry.has(r.history_id)) byEntry.set(r.history_id, []);
    byEntry.get(r.history_id).push({
      categoryId: r.category_id,
      categoryName: r.category_name,
      tagId: r.tag_id,
      tagName: r.tag_name,
      color: r.tag_color,
    });
  }

  for (const e of list) e.tags = byEntry.get(e.id) ?? [];
  return list;
}

/**
 * Replaces a task's tag set. `tagValues` is a map of
 * { categoryId: tagId | null } (one optional tag per block).
 */
export function replaceTaskTags(db, taskId, tagValues) {
  const remove = db.prepare('DELETE FROM task_tags WHERE task_id = ?');
  const insert = db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)');

  const tx = db.transaction(() => {
    remove.run(taskId);
    if (tagValues) {
      for (const [categoryId, tagId] of Object.entries(tagValues)) {
        if (tagId == null) continue;
        insert.run(taskId, Number(tagId));
      }
    }
  });
  tx();
}
