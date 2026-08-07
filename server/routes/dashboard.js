import { Router } from 'express';
import db from '../db.js';
import { wrap } from '../middleware.js';
import { attachTaskTags } from '../tagHelpers.js';
import { TASK_SELECT, mapTask } from './tasks.js';

const router = Router();

// GET /api/dashboard
// Aggregates every project together with its tasks (with tags) so the client
// can render boards, compute unread badges and power the quick-add bar in a
// single round trip (ideal for a local PWA on constrained devices).
router.get(
  '/',
  wrap((req, res) => {
    const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    const countHistory = db.prepare('SELECT COUNT(*) AS c FROM history WHERE project_id = ?');

    const allRows = db.prepare(`${TASK_SELECT} ORDER BY t.created_at ASC`).all();
    const tasks = attachTaskTags(db, allRows.map(mapTask));

    const tasksByProject = new Map(projects.map((p) => [p.id, []]));
    for (const task of tasks) {
      const list = tasksByProject.get(task.projectId);
      if (list) list.push(task);
    }

    res.json(
      projects.map((p) => {
        const projectTasks = tasksByProject.get(p.id) ?? [];
        const counts = { backlog: 0, todo: 0, in_progress: 0, resolved: 0 };
        for (const t of projectTasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          taskCounts: counts,
          historyCount: countHistory.get(p.id).c,
          tasks: projectTasks,
        };
      })
    );
  })
);

export default router;
