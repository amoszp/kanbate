import { COLUMNS, type Task, type TaskStatus } from '../types';
import { hoursSince } from '../utils';

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
      className={`panel p-3 cursor-grab active:cursor-grabbing transition-colors group hover:border-neon-cyan/50 ${
        overdueInProgress ? 'border-neon-magenta/70 shadow-neon-magenta' : ''
      }`}
    >
      {overdueInProgress && (
        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-neon-magenta mb-1.5 animate-pulse-glow">
          <span aria-hidden>⚠</span> in progress {Math.floor(inProgressHours)}h
        </div>
      )}

      <button onClick={onOpen} className="text-left w-full">
        <p className="text-sm leading-snug text-ink-primary break-words">{task.title}</p>
        {task.description && (
          <p className="mt-1 text-xs text-ink-muted line-clamp-2 break-words">{task.description}</p>
        )}
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {task.tags.map((ref) => (
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

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-edge pt-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] uppercase tracking-wider text-ink-faint select-none" title="Drag to move">
            ⋮⋮
          </span>
          <span className="text-[9px] text-ink-faint truncate">#{task.id}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wider text-ink-faint">Move to</span>
          <select
            className="bg-backdrop border border-edge rounded px-1 py-0.5 text-[10px] text-ink-primary cursor-pointer hover:border-neon-cyan/50"
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
