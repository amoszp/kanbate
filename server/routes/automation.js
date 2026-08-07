import { Router } from 'express';
import db from '../db.js';
import { now } from '../seed.js';
import { wrap } from '../middleware.js';

const router = Router();

const HOUR_MS = 60 * 60 * 1000;
// Tasks sitting in "Resolved" for more than 48h are auto-migrated to the History Archive.
export const ARCHIVE_AFTER_MS = 48 * HOUR_MS;
// Tasks sitting in "In Progress" for more than 24h trigger a work reminder.
export const REMIND_AFTER_MS = 24 * HOUR_MS;

/**
 * POST /api/automation/run
 * Executes the In-App Automation Engine:
 *  1. Migrates stale "resolved" tasks (>48h) into that project's History Archive.
 *  2. Returns any "in_progress" tasks (>24h) that need a work reminder toast.
 * The client calls this whenever the app loads or regains focus.
 */
router.post(
  '/run',
  wrap((req, res) => {
    const ts = now();

    // 1) Archive: resolved for > 48h
    const archiveCutoff = new Date(Date.now() - ARCHIVE_AFTER_MS).toISOString();
    const stale = db
      .prepare(
        `SELECT * FROM tasks
         WHERE status = 'resolved'
           AND moved_to_resolved_at IS NOT NULL
           AND moved_to_resolved_at <= ?`
      )
      .all(archiveCutoff);

    let archived = [];
    if (stale.length > 0) {
      const insertHistory = db.prepare(
        `INSERT INTO history
          (project_id, title, description, status,
           created_at, moved_to_resolved_at, archived_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      const insertLinks = db.prepare(
        'INSERT INTO history_tags (history_id, tag_id) SELECT ?, tag_id FROM task_tags WHERE task_id = ?'
      );
      const removeTaskLinks = db.prepare('DELETE FROM task_tags WHERE task_id = ?');
      const remove = db.prepare('DELETE FROM tasks WHERE id = ?');

      const tx = db.transaction(() => {
        for (const t of stale) {
          const info = insertHistory.run(
            t.project_id, t.title, t.description, t.status,
            t.created_at, t.moved_to_resolved_at, ts
          );
          insertLinks.run(info.lastInsertRowid, t.id);
          removeTaskLinks.run(t.id);
          remove.run(t.id);
        }
      });
      tx();

      archived = stale.map((t) => ({
        id: t.id,
        projectId: t.project_id,
        title: t.title,
        movedToResolvedAt: t.moved_to_resolved_at,
        archivedAt: ts,
      }));
    }

    // 2) Reminders: in_progress for > 24h
    const remindCutoff = new Date(Date.now() - REMIND_AFTER_MS).toISOString();
    const reminders = db
      .prepare(
        `SELECT t.id, t.title, t.project_id, t.moved_to_inprogress_at, p.name AS project_name
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id
         WHERE t.status = 'in_progress'
           AND t.moved_to_inprogress_at IS NOT NULL
           AND t.moved_to_inprogress_at <= ?
         ORDER BY t.moved_to_inprogress_at ASC`
      )
      .all(remindCutoff)
      .map((r) => ({
        id: r.id,
        projectId: r.project_id,
        projectName: r.project_name,
        title: r.title,
        movedToInProgressAt: r.moved_to_inprogress_at,
        hoursInProgress: Math.round((Date.now() - new Date(r.moved_to_inprogress_at).getTime()) / HOUR_MS),
      }));

    res.json({ archived, reminders, ranAt: ts });
  })
);

// GET /api/automation/config - lets the UI display the current rules.
router.get(
  '/config',
  wrap((req, res) => {
    res.json({
      archiveAfterHours: ARCHIVE_AFTER_MS / HOUR_MS,
      remindAfterHours: REMIND_AFTER_MS / HOUR_MS,
    });
  })
);

export default router;
