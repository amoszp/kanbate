import { COLUMNS, type Task, type TaskStatus } from '../types';
import { hoursSince } from '../utils';
import { TagChip } from './ui';

export function TaskCard({
  task,
  onOpen,
  onMove,
}: {
  task: Task;
  onOpen: () => void;
  onMove: (status: TaskStatus) => void;
}) {
  const inProgressHours = hoursSince(task.movedToInProgressAt);
  const overdueInProgress = task.status === 'in_progress' && inProgressHours != null && inProgressHours > 24;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/kanbate-task', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
        (e.currentTarget as HTMLElement).classList.add('opacity-40');
      }}
      onDragEnd={(e) => (e.currentTarget as HTMLElement).classList.remove('opacity-40')}
      className={`panel panel-link p-3 cursor-grab active:cursor-grabbing ${
        overdueInProgress ? 'border-neon-magenta/70 shadow-glow-magenta' : ''
      }`}
    >
      {overdueInProgress && (
        <div className="meta flex items-center gap-1.5 text-neon-magenta mb-1.5 animate-pulse-glow">
          <span aria-hidden>⚠</span> in progress {Math.floor(inProgressHours)}h
        </div>
      )}

      <button onClick={onOpen} className="tap text-left w-full rounded-control">
        <p className="text-sm leading-snug text-ink-primary break-words">{task.title}</p>
        {task.description && (
          <p className="mt-1 text-xs text-ink-muted line-clamp-2 break-words">{task.description}</p>
        )}
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {task.tags.map((ref) => (
          <TagChip key={ref.tagId} tag={ref} />
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-edge pt-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="meta select-none" title="Drag to move">
            ⋮⋮
          </span>
          <span className="meta truncate">#{task.id}</span>
          {task.commentCount > 0 && (
            <span className="meta text-neon-cyan/80" title={`${task.commentCount} comment${task.commentCount === 1 ? '' : 's'}`}>
              💬 {task.commentCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="meta">Move to</span>
          <select
            className="field field-sm hover:border-neon-cyan/50"
            value={task.status}
            onChange={(e) => onMove(e.target.value as TaskStatus)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Move task to column"
          >
            {COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
