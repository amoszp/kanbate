import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { AutomationConfig, TagCategory } from '../types';
import { TagManager } from './TagManager';
import { BlockModal } from './BlockModal';
import { ConfirmDialog } from './ConfirmDialog';

export function SettingsView({
  categories,
  refresh,
}: {
  categories: TagCategory[];
  refresh: () => Promise<void>;
}) {
  const { push } = useToast();
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [addingBlock, setAddingBlock] = useState(false);
  const [renaming, setRenaming] = useState<TagCategory | null>(null);
  const [deleting, setDeleting] = useState<TagCategory | null>(null);

  useEffect(() => {
    api
      .getAutomationConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  const createBlock = async (name: string) => {
    await api.createCategory(name);
    push({ kind: 'success', title: 'Block created', message: name });
    await refresh();
  };

  const renameBlock = async (name: string) => {
    if (!renaming) return;
    await api.updateCategory(renaming.id, name);
    push({ kind: 'success', title: 'Block renamed', message: name });
    await refresh();
  };

  const deleteBlock = async () => {
    if (!deleting) return;
    await api.deleteCategory(deleting.id);
    setDeleting(null);
    push({ kind: 'info', title: 'Block deleted', message: deleting.name });
    await refresh();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="glitch-title text-2xl sm:text-3xl">SETTINGS</h1>
        <p className="text-xs text-ink-muted mt-1 uppercase tracking-[0.2em]">
          tag blocks · automation rules · local data
        </p>
      </div>

      <section className="panel p-4">
        <header className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm uppercase tracking-[0.25em] text-neon-cyan font-bold">Tag blocks</h2>
            <p className="text-[10px] uppercase tracking-wider text-ink-faint mt-0.5">
              Each block is a group of tags; a task picks one tag per block.
            </p>
          </div>
          <button className="btn btn-solid" onClick={() => setAddingBlock(true)}>
            + New block
          </button>
        </header>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {categories.map((category) => (
            <TagManager
              key={category.id}
              category={category}
              onDeleteBlock={() => setDeleting(category)}
              onRenameBlock={() => setRenaming(category)}
              refresh={refresh}
            />
          ))}
          {categories.length === 0 && (
            <p className="text-xs text-ink-faint uppercase tracking-widest py-6 text-center lg:col-span-2">
              No tag blocks yet — add one to start tagging tasks.
            </p>
          )}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm uppercase tracking-[0.25em] text-neon-cyan font-bold">
          In-App Automation Engine
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          <li className="flex items-start gap-2">
            <span className="text-neon-cyan shrink-0">▶</span>
            <span>
              Tasks left in <b className="text-neon-green">Resolved</b> for more than{' '}
              <b className="text-ink-primary">{config?.archiveAfterHours ?? 48}h</b> are auto-migrated to that
              project's <b className="text-neon-cyan">History Archive</b>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neon-cyan shrink-0">▶</span>
            <span>
              Tasks left in <b className="text-neon-magenta">In Progress</b> for more than{' '}
              <b className="text-ink-primary">{config?.remindAfterHours ?? 24}h</b> trigger a high-visibility work
              reminder. Dismiss it, or move the task to Resolved.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neon-cyan shrink-0">▶</span>
            <span>
              Checks run automatically whenever the app loads or returns to the foreground (iOS PWA friendly).
            </span>
          </li>
        </ul>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm uppercase tracking-[0.25em] text-neon-cyan font-bold">Data</h2>
        <p className="mt-3 text-sm text-ink-muted">
          All data is stored locally in SQLite at <code className="text-neon-cyan">./data/kanbate.db</code> on the
          host. Projects, tasks and history live in the mounted volume and survive container updates. Deleting a
          block removes its tags from every task.
        </p>
      </section>

      {addingBlock && (
        <BlockModal
          title="New tag block"
          initial=""
          submitLabel="Create block"
          onSave={createBlock}
          onCancel={() => setAddingBlock(false)}
        />
      )}

      {renaming && (
        <BlockModal
          title="Rename block"
          initial={renaming.name}
          submitLabel="Save"
          onSave={renameBlock}
          onCancel={() => setRenaming(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete block «${deleting.name}»?`}
          message={`This removes the block and every tag inside it. Tasks using any of those tags will lose them. This cannot be undone.`}
          onConfirm={() => void deleteBlock()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
