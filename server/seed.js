export const now = () => new Date().toISOString();

/**
 * Default tag "blocks" (categories) created on first run.
 * Users can add/edit/delete these and their tags from Settings.
 */
export const DEFAULT_BLOCKS = [
  {
    name: 'Priority',
    tags: [
      { name: 'Low', color: '#00f0ff' },
      { name: 'Medium', color: '#ffd700' },
      { name: 'High', color: '#ff9f1c' },
      { name: 'Critical', color: '#ff2a6d' },
    ],
  },
  {
    name: 'AI Tool',
    tags: [
      { name: 'Claude', color: '#d97757' },
      { name: 'ChatGPT', color: '#10a37f' },
      { name: 'Gemini', color: '#4285f4' },
      { name: 'Local LLM', color: '#a259ff' },
      { name: 'None', color: '#7d8590' },
    ],
  },
];

/**
 * Seeds the default tag blocks (categories) + tags, but only when the
 * tag_categories table is empty. Safe to call on every startup.
 */
export function seedDefaults(db) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM tag_categories').get().c;
  if (count > 0) return;

  const insertCategory = db.prepare(
    'INSERT INTO tag_categories (name, created_at) VALUES (?, ?)'
  );
  const insertTag = db.prepare(
    'INSERT INTO tags (category_id, name, color, created_at) VALUES (?, ?, ?, ?)'
  );
  const ts = now();

  const tx = db.transaction(() => {
    for (const block of DEFAULT_BLOCKS) {
      const info = insertCategory.run(block.name, ts);
      for (const tag of block.tags) {
        insertTag.run(info.lastInsertRowid, tag.name, tag.color, ts);
      }
    }
  });
  tx();
}
