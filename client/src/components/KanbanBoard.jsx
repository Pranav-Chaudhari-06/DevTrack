import TaskCard from './TaskCard';

const COLUMNS = [
  {
    id: 'open',
    label: 'Open',
    accent: '#6366f1',
    headerBg: 'rgba(99,102,241,0.1)',
    dotColor: '#6366f1',
    emptyText: 'No open items',
  },
  {
    id: 'in-progress',
    label: 'In Progress',
    accent: '#f59e0b',
    headerBg: 'rgba(245,158,11,0.1)',
    dotColor: '#f59e0b',
    emptyText: 'Nothing in progress',
  },
  {
    id: 'resolved',
    label: 'Resolved',
    accent: '#10b981',
    headerBg: 'rgba(16,185,129,0.1)',
    dotColor: '#10b981',
    emptyText: 'Nothing resolved yet',
  },
];

export default function KanbanBoard({ tasks, myRole, currentUser, onStatusChange, onDelete }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map(({ id, label, accent, headerBg, dotColor, emptyText }) => {
        const columnTasks = tasks.filter((t) => t.status === id);
        return (
          <div
            key={id}
            className="kanban-col"
            style={{ borderTop: `3px solid ${accent}` }}
          >
            {/* Column header */}
            <div
              className="px-4 py-3 flex items-center justify-between rounded-t-[13px]"
              style={{ background: headerBg }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
                />
                <span className="text-sm font-semibold" style={{ color: accent }}>
                  {label}
                </span>
              </div>
              <span
                className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: `${accent}33`, color: accent }}
              >
                {columnTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="p-3 flex flex-col gap-2.5 flex-1 min-h-[220px]">
              {columnTasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-slate-700 italic">{emptyText}</p>
                </div>
              ) : (
                columnTasks.map((task, i) => (
                  <div
                    key={task._id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <TaskCard
                      task={task}
                      myRole={myRole}
                      currentUser={currentUser}
                      onStatusChange={onStatusChange}
                      onDelete={onDelete}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
