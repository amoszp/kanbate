import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { COLUMNS, type HistoryEntry, type ProjectWithTasks, type TagCategory, type TagRef, type Task, type TaskStatus } from '../types';
import { formatDateTime, relativeTime } from '../utils';
import { TaskModal } from './TaskModal';
import { ArchivedEntryModal } from './ArchivedEntryModal';
import type { Route } from '../hooks/useHashRoute';

type FindStatus = TaskStatus | 'archived';

interface FindFilters {
  q: string;
  statuses: FindStatus[];
  projectId: number | '';
  /** categoryId -> '' (any) | 'none' (untagged) | tagId */
  tags: Record<number, string>;
  /** 'newest' | 'oldest' | 'updated' | 'title' | `tag:<categoryId>` */
  sort: string;
}

const STATUS_CHIPS: { key: FindStatus; label: string; color: string }[] = [
  ...COLUMNS.map((c) => ({ key: c.key as FindStatus, label: c.label, color: c.color })),
  { key: 'archived', label: 'Archived', color: '#a259ff' },
];

const PENDING: FindStatus[] = ['backlog', 'todo', 'in_progress'];
const ALL_STATUSES: FindStatus[] = STATUS_CHIPS.map((s) => s.key);

const DEFAULT_FILTERS: FindFilters = { q: '', statuses: PENDING, projectId: '', tags: {}, sort: 'newest' };

/** A live task or an archived entry, normalised for filtering/sorting. */
interface Row {
  key: string;
  id: number;
  title: string;
  description: string;
  status: FindStatus;
  projectId: number;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  tags: TagRef[];
  commentCount: number;
  task?: Task;
  entry?: HistoryEntry;
}

type GroupState = 'all' | 'some' | 'none';

function StatusChip({
  chip,
  on,
  onClick,
}: {
  chip: { label: string; color: string };
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className="chip cursor-pointer transition-opacity"
      style={{
        color: chip.color,
        border: `1px solid ${on ? chip.color : `${chip.color}33`}`,
        background: on ? `${chip.color}1f` : 'transparent',
        opacity: on ? 1 : 0.5,
      }}
    >
      {on ? '■' : '□'} {chip.label}
    </button>
  );
}

function GroupToggle({ label, state, onClick }: { label: string; state: GroupState; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={state === 'all' ? true : state === 'some' ? 'mixed' : false}
      title={state === 'all' ? `Clear ${label.toLowerCase()}` : `Select ${label.toLowerCase()}`}
      className={`chip cursor-pointer border transition-colors ${
        state === 'all' ? 'border-ink-muted text-ink-primary' : 'border-edge text-ink-muted hover:text-ink-primary'
      }`}
    >
      {state === 'all' ? '■' : state === 'some' ? '◧' : '□'} {label}
    </button>
  );
}

/**
 * Find: search + cross-project backlog. Filters live tasks of every project
 * and (on demand) the History Archive of every project.
 */
export function FindView({
  projects,
  categories,
  navigate,
  refresh,
}: {
  projects: ProjectWithTasks[];
  categories: TagCategory[];
  navigate: (route: Route | string) => void;
  refresh: () => Promise<void>;
}) {
  const { push } = useToast();
  const [stored, setFilters] = useLocalStorage<FindFilters>('kanbate.find', DEFAULT_FILTERS);
  const filters = { ...DEFAULT_FILTERS, ...stored };
  const [archived, setArchived] = useState<HistoryEntry[] | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [viewing, setViewing] = useState<HistoryEntry | null>(null);

  const update = (patch: Partial<FindFilters>) => setFilters((prev) => ({ ...DEFAULT_FILTERS, ...prev, ...patch }));

  const wantsArchive = filters.statuses.includes('archived');

  const loadArchive = useCallback(async () => {
    try {
      setArchived(await api.getAllHistory());
      setArchiveError(null);
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Failed to load the archive');
    }
  }, []);

  // Any dashboard refresh (e.g. automation archiving tasks) invalidates the cached archive.
  useEffect(() => {
    setArchived(null);
  }, [projects]);

  // The archive is only fetched once it's actually part of the search.
  useEffect(() => {
    if (wantsArchive && archived === null && !archiveError) void loadArchive();
  }, [wantsArchive, archived, archiveError, loadArchive]);

  const rows = useMemo<Row[]>(() => {
    const names = new Map(projects.map((p) => [p.id, p.name]));
    const out: Row[] = [];
    for (const p of projects) {
      for (const t of p.tasks) {
        out.push({
          key: `t${t.id}`,
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          projectId: p.id,
          projectName: p.name,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          tags: t.tags,
          commentCount: t.commentCount,
          task: t,
        });
      }
    }
    for (const e of archived ?? []) {
      out.push({
        key: `h${e.id}`,
        id: e.id,
        title: e.title,
        description: e.description,
        status: 'archived',
        projectId: e.projectId,
        projectName: e.projectName ?? names.get(e.projectId) ?? '?',
        createdAt: e.createdAt,
        updatedAt: e.archivedAt,
        tags: e.tags,
        commentCount: e.commentCount,
        entry: e,
      });
    }
    return out;
  }, [projects, archived]);

  const { q, statuses, projectId, tags, sort } = filters;
  const results = useMemo(() => {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const statusSet = new Set(statuses);
    const tagFilters = Object.entries(tags).filter(([, v]) => v !== '');

    const filtered = rows.filter((r) => {
      if (!statusSet.has(r.status)) return false;
      if (projectId !== '' && r.projectId !== projectId) return false;
      for (const [catId, value] of tagFilters) {
        const ref = r.tags.find((t) => t.categoryId === Number(catId));
        if (value === 'none' ? ref : ref?.tagId !== Number(value)) return false;
      }
      if (tokens.length > 0) {
        const haystack = [r.title, r.description, r.projectName, `#${r.id}`, ...r.tags.map((t) => t.tagName)]
          .join(' ')
          .toLowerCase();
        if (!tokens.every((tok) => haystack.includes(tok))) return false;
      }
      return true;
    });

    const byNewest = (a: Row, b: Row) => b.createdAt.localeCompare(a.createdAt);
    if (sort.startsWith('tag:')) {
      // Tags rank by creation order within their block, latest first — for the
      // default Priority block that's Critical → High → Medium → Low.
      const catId = Number(sort.slice(4));
      const rank = (r: Row) => r.tags.find((t) => t.categoryId === catId)?.tagId ?? -1;
      filtered.sort((a, b) => rank(b) - rank(a) || byNewest(a, b));
    } else if (sort === 'oldest') {
      filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else if (sort === 'updated') {
      filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } else if (sort === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    } else {
      filtered.sort(byNewest);
    }
    return filtered;
  }, [rows, q, statuses, projectId, tags, sort]);

  const toggleStatus = (key: FindStatus) => {
    const has = statuses.includes(key);
    update({ statuses: has ? statuses.filter((s) => s !== key) : [...statuses, key] });
  };

  const groupState = (keys: FindStatus[]): GroupState => {
    const on = keys.filter((k) => statuses.includes(k)).length;
    return on === 0 ? 'none' : on === keys.length ? 'all' : 'some';
  };

  /** Selects the whole group, or clears it if it's already fully selected. */
  const toggleGroup = (keys: FindStatus[]) => {
    const rest = statuses.filter((s) => !keys.includes(s));
    update({ statuses: groupState(keys) === 'all' ? rest : [...rest, ...keys] });
  };

  const sameStatuses = (a: FindStatus[], b: FindStatus[]) => a.length === b.length && a.every((s) => b.includes(s));
  const isDefault =
    !q && projectId === '' && Object.values(tags).every((v) => v === '') && sameStatuses(statuses, PENDING) && sort === 'newest';

  const saveTask = async (payload: {
    title: string;
    description: string;
    status: TaskStatus;
    tags: Record<number, number | null>;
  }) => {
    if (!editing) return;
    await api.updateTask(editing.id, payload);
    push({ kind: 'success', title: 'Task updated', message: payload.title });
    await refresh();
  };

  const deleteTask = async () => {
    if (!editing) return;
    await api.deleteTask(editing.id);
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="glitch-title text-2xl sm:text-3xl">FIND</h1>
        <p className="text-xs text-ink-muted mt-1 uppercase tracking-[0.2em]">
          search &amp; backlog across every project{wantsArchive ? ' + history archive' : ''}
        </p>
      </div>

      <div className="panel p-3 sm:p-4 space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neon-cyan/70" aria-hidden>
            ⌕
          </span>
          <input
            className="field pl-8"
            value={q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search title, description, project, tag or #id…"
            aria-label="Search tasks"
            autoFocus
          />
        </div>

        {/* One status row: chips toggle individually; the "Pending" label and
            "All" toggle whole groups at once (replaces separate presets). */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
          <span className="inline-flex flex-wrap items-center gap-1.5 rounded border border-edge px-1.5 py-1">
            <GroupToggle label="Pending" state={groupState(PENDING)} onClick={() => toggleGroup(PENDING)} />
            {STATUS_CHIPS.filter((s) => PENDING.includes(s.key)).map((s) => (
              <StatusChip key={s.key} chip={s} on={statuses.includes(s.key)} onClick={() => toggleStatus(s.key)} />
            ))}
          </span>
          {STATUS_CHIPS.filter((s) => !PENDING.includes(s.key)).map((s) => (
            <StatusChip key={s.key} chip={s} on={statuses.includes(s.key)} onClick={() => toggleStatus(s.key)} />
          ))}
          <GroupToggle label="All" state={groupState(ALL_STATUSES)} onClick={() => toggleGroup(ALL_STATUSES)} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="label" htmlFor="find-project">Project</label>
            <select
              id="find-project"
              className="field cursor-pointer"
              value={projectId === '' ? '' : String(projectId)}
              onChange={(e) => update({ projectId: e.target.value ? Number(e.target.value) : '' })}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {categories.map((c) => (
            <div key={c.id}>
              <label className="label" htmlFor={`find-tag-${c.id}`}>{c.name}</label>
              <select
                id={`find-tag-${c.id}`}
                className="field cursor-pointer"
                value={tags[c.id] ?? ''}
                onChange={(e) => update({ tags: { ...tags, [c.id]: e.target.value } })}
              >
                <option value="">Any</option>
                <option value="none">— none —</option>
                {c.tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div>
            <label className="label" htmlFor="find-sort">Sort by</label>
            <select id="find-sort" className="field cursor-pointer" value={sort} onChange={(e) => update({ sort: e.target.value })}>
              <option value="newest">Created · newest</option>
              <option value="oldest">Created · oldest</option>
              <option value="updated">Recently updated</option>
              <option value="title">Title A → Z</option>
              {categories.map((c) => (
                <option key={c.id} value={`tag:${c.id}`}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-ink-faint">
          <span>
            {results.length} result{results.length === 1 ? '' : 's'}
            {wantsArchive && archived === null && !archiveError ? ' · loading archive…' : ''}
          </span>
          {!isDefault && (
            <button className="text-neon-cyan hover:text-neon-cyan/70 uppercase tracking-wider" onClick={() => setFilters(DEFAULT_FILTERS)}>
              reset filters
            </button>
          )}
        </div>
        {archiveError && (
          <p className="text-xs text-neon-magenta">
            Archive unavailable: {archiveError}{' '}
            <button className="text-neon-cyan underline" onClick={() => void loadArchive()}>
              Retry
            </button>
          </p>
        )}
      </div>

      {results.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink-faint">
            {statuses.length === 0 ? 'select at least one status' : 'no matching tasks'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {results.map((r) => {
            const chip = STATUS_CHIPS.find((s) => s.key === r.status) ?? STATUS_CHIPS[0];
            return (
              <li key={r.key}>
                <button
                  className="panel w-full text-left p-3 hover:border-neon-cyan/50 transition-colors"
                  onClick={() => (r.task ? setEditing(r.task) : r.entry ? setViewing(r.entry) : undefined)}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="chip"
                      style={{ color: chip.color, border: `1px solid ${chip.color}55`, background: `${chip.color}14` }}
                    >
                      {chip.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-neon-cyan/80 truncate max-w-[50%]">
                      {r.projectName}
                    </span>
                    <span className="text-[9px] text-ink-faint">#{r.id}</span>
                    {r.commentCount > 0 && <span className="text-[9px] text-neon-cyan/80">💬 {r.commentCount}</span>}
                    <span className="ml-auto text-[9px] uppercase tracking-wider text-ink-faint" title={formatDateTime(r.createdAt)}>
                      created {relativeTime(r.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-primary break-words">{r.title}</p>
                  {r.description && <p className="mt-0.5 text-xs text-ink-muted line-clamp-2 break-words">{r.description}</p>}
                  {r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tags.map((ref) => (
                        <span
                          key={ref.tagId}
                          className="chip"
                          style={{ color: ref.color, border: `1px solid ${ref.color}55`, background: `${ref.color}14` }}
                          title={ref.categoryName}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ref.color }} />
                          {ref.tagName}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <TaskModal
          task={editing}
          categories={categories}
          projects={projects}
          onSave={saveTask}
          onDelete={deleteTask}
          onCancel={() => setEditing(null)}
          onTransferred={refresh}
          onCommentsChanged={() => void refresh()}
        />
      )}

      {viewing && (
        <ArchivedEntryModal
          entry={viewing}
          onClose={() => setViewing(null)}
          onOpenArchive={() => navigate(`/history/${viewing.projectId}`)}
          onCommentsChanged={() => void loadArchive()}
        />
      )}
    </div>
  );
}
