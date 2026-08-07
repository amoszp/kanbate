import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { now, seedDefaults } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Data directory is configurable so Docker can map a named volume / host folder.
const DATA_DIR = process.env.KANBATE_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'kanbate.db');

function tableExists(db, name) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
}

function hasColumn(db, table, column) {
  return db.prepare(`SELECT COUNT(*) AS c FROM pragma_table_info('${table}') WHERE name = ?`).get(column).c > 0;
}

/**
 * Core tables (v2). `tasks`/`history` intentionally carry NO tag columns —
 * tags are attached via the `task_tags` / `history_tags` junction tables so
 * that any number of custom tag blocks can be applied to a task.
 */
function createCoreTables(db) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id             INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title                  TEXT NOT NULL,
    description            TEXT NOT NULL DEFAULT '',
    status                 TEXT NOT NULL DEFAULT 'backlog',
    created_at             TEXT NOT NULL,
    updated_at             TEXT NOT NULL,
    moved_to_resolved_at   TEXT,
    moved_to_inprogress_at TEXT
  );

  CREATE TABLE IF NOT EXISTS history (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id             INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title                  TEXT NOT NULL,
    description            TEXT NOT NULL DEFAULT '',
    status                 TEXT NOT NULL,
    created_at             TEXT NOT NULL,
    moved_to_resolved_at   TEXT,
    archived_at            TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_project    ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_history_project  ON history(project_id);
  `);
}

/**
 * Tag-related indexes. Kept separate from createCoreTables so they are only
 * created once the `tags` table is guaranteed to have a `category_id` column
 * (i.e. after a v1 -> v2 migration when applicable).
 */
function createTagIndexes(db) {
  db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tags_category    ON tags(category_id);
  CREATE INDEX IF NOT EXISTS idx_task_tags_tag    ON task_tags(tag_id);
  CREATE INDEX IF NOT EXISTS idx_history_tags_tag ON history_tags(tag_id);
  `);
}

/**
 * v2 tag schema: tag blocks (categories) + tags + many-to-many junctions.
 * Deleting a tag block cascades its tags and their task/history links.
 */
function createTagSchema(db) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS tag_categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tags (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES tag_categories(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    color       TEXT NOT NULL DEFAULT '#00f0ff',
    created_at  TEXT NOT NULL,
    UNIQUE (category_id, name)
  );

  CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS history_tags (
    history_id INTEGER NOT NULL REFERENCES history(id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (history_id, tag_id)
  );
  `);
}

/**
 * Migrates a v1 database into the v2 tag model:
 *  - tags.type ('priority' | 'ai_tool') -> tag_categories rows
 *  - tags rebuilt to reference category_id
 *  - tasks.priority_id / ai_tool_id -> task_tags junction rows
 *  - history.priority_id / ai_tool_id -> history_tags junction rows
 * Column ids are preserved so existing relationships stay intact.
 */
function migrateV1(db) {
  const ts = now();

  db.exec(`
    INSERT OR IGNORE INTO tag_categories (name, created_at) VALUES ('Priority', '${ts}');
    INSERT OR IGNORE INTO tag_categories (name, created_at) VALUES ('AI Tool', '${ts}');

    CREATE TABLE tags_v2 (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES tag_categories(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#00f0ff',
      created_at  TEXT NOT NULL,
      UNIQUE (category_id, name)
    );

    INSERT INTO tags_v2 (id, category_id, name, color, created_at)
      SELECT MIN(t.id), c.id, t.name, MAX(t.color), MAX(t.created_at)
      FROM tags t
      JOIN tag_categories c
        ON c.name = CASE WHEN t.type = 'ai_tool' THEN 'AI Tool' ELSE 'Priority' END
      GROUP BY c.id, t.name;

    DROP TABLE tags;
    ALTER TABLE tags_v2 RENAME TO tags;
  `);

  if (hasColumn(db, 'tasks', 'priority_id')) {
    db.exec(`
      INSERT INTO task_tags (task_id, tag_id)
        SELECT id, priority_id FROM tasks WHERE priority_id IS NOT NULL
        UNION
        SELECT id, ai_tool_id FROM tasks WHERE ai_tool_id IS NOT NULL;
    `);
  }

  if (hasColumn(db, 'history', 'priority_id')) {
    db.exec(`
      INSERT INTO history_tags (history_id, tag_id)
        SELECT id, priority_id FROM history WHERE priority_id IS NOT NULL
        UNION
        SELECT id, ai_tool_id FROM history WHERE ai_tool_id IS NOT NULL;
    `);
  }
}

function initSchema(db) {
  const version = db.pragma('user_version', { simple: true });

  if (version >= 2) {
    createCoreTables(db);
    createTagSchema(db);
    createTagIndexes(db);
    seedDefaults(db);
    return;
  }

  // Detect the v1 layout: a `tags` table that still has the old `type` column.
  const isV1 = tableExists(db, 'tags') && hasColumn(db, 'tags', 'type');

  db.pragma('foreign_keys = OFF');
  try {
    createCoreTables(db);
    createTagSchema(db);
    if (isV1) migrateV1(db);
  } finally {
    db.pragma('foreign_keys = ON');
  }
  createTagIndexes(db);
  db.pragma('user_version = 2');
  seedDefaults(db);
}

let db;
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  console.log(`[kanbate] database ready (${DB_FILE})`);
} catch (err) {
  // Clear, actionable startup error instead of a silent crash.
  console.error('[kanbate] FATAL: could not initialize database.');
  console.error(`[kanbate] path: ${DB_FILE}`);
  console.error(`[kanbate] ${err.message}`);
  process.exit(1);
}

export default db;
