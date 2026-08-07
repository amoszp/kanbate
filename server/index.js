import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import tagsRouter from './routes/tags.js';
import categoriesRouter from './routes/categories.js';
import historyRouter from './routes/history.js';
import automationRouter from './routes/automation.js';
import dashboardRouter from './routes/dashboard.js';
import { errorHandler } from './middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const app = express();

app.use(express.json({ limit: '1mb' }));

// --- API routes ----------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'kanbate', time: new Date().toISOString() }));
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/history', historyRouter);
app.use('/api/automation', automationRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route' }));

// Central error handler (must come after all routes)
app.use(errorHandler);

// --- Static SPA (built client) -------------------------------------------
const DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(DIST)) {
  app.use(
    express.static(DIST, {
      index: 'index.html',
      setHeaders(res, filePath) {
        // Hashed, content-addressed bundles (assets/*.js|css) can be cached
        // aggressively and safely — a new build always emits new filenames.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return;
        }
        // The app shell, service worker and manifest must always revalidate so
        // component changes (and the hashed assets they reference) show up
        // immediately instead of lingering in a 7-day HTTP cache.
        res.setHeader('Cache-Control', 'no-cache');
      },
    })
  );

  // SPA fallback: everything that isn't an /api call serves index.html,
  // so deep links (e.g. #/board/3) work when refreshed.
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) =>
    res
      .status(503)
      .type('text/plain')
      .send('Kanbate client has not been built yet. Run `npm run build` inside /client first.')
  );
}

app.listen(PORT, () => {
  console.log(`[kanbate] API + PWA listening on http://0.0.0.0:${PORT}`);
  console.log(`[kanbate] SQLite database: ${process.env.KANBATE_DATA_DIR || path.join(__dirname, '..', 'data', 'kanbate.db')}`);
});
