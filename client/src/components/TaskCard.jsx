import { useState } from 'react';
import TaskCommentModal from './TaskCommentModal';

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    bg: 'rgba(100,116,139,0.2)',  color: '#94a3b8', dot: '#64748b' },
  medium: { label: 'Medium', bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', dot: '#f59e0b' },
  high:   { label: 'High',   bg: 'rgba(239,68,68,0.15)',  color: '#f87171', dot: '#ef4444' },
};

const SEVERITY_CONFIG = {
  low:      { label: 'LOW',      bg: 'rgba(100,116,139,0.2)',  color: '#94a3b8' },
  medium:   { label: 'MEDIUM',   bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  high:     { label: 'HIGH',     bg: 'rgba(239,68,68,0.15)',  color: '#f87171' },
  critical: { label: 'CRITICAL', bg: 'rgba(239,68,68,0.25)',  color: '#ef4444' },
};

const IconComment = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

/**
 * Determines whether the current user may act on this task.
 *
 * Admin     → can act on any task
 * Developer → can only act on tasks assigned to them (by email or name)
 * Viewer    → cannot act at all
 */
function canActOnTask(task, myRole, currentUser) {
  if (!myRole || myRole === 'viewer') return false;
  if (myRole === 'admin') return true;
  if (myRole === 'developer') {
    if (!task.assignedTo) return false;
    const assigned = task.assignedTo.toLowerCase().trim();
    return (
      assigned === currentUser?.email?.toLowerCase() ||
      assigned === currentUser?.name?.toLowerCase()
    );
  }
  return false;
}

export default function TaskCard({ task, myRole, currentUser, onStatusChange, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const priority   = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isResolved = task.status === 'resolved';
  const canAct     = canActOnTask(task, myRole, currentUser);
  const isAdmin    = myRole === 'admin';
  const commentCount = task.comments?.length || 0;

  return (
    <div
      className="rounded-xl p-4 transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        opacity: isResolved ? 0.65 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.065)';
        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Type + Priority badges */}
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <span
          className="badge"
          style={
            task.type === 'bug'
              ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
              : { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }
          }
        >
          {task.type === 'bug' ? '🐛 Bug' : '✓ Task'}
        </span>
        <span className="badge" style={{ background: priority.bg, color: priority.color }}>
          <span className="w-1.5 h-1.5 rounded-full mr-1 inline-block" style={{ background: priority.dot }} />
          {priority.label}
        </span>
      </div>

      {/* Title */}
      <p
        className="text-sm font-semibold mb-1 leading-snug"
        style={{
          color: isResolved ? '#475569' : '#e2e8f0',
          textDecoration: isResolved ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {/* Analysis */}
      {task.type === 'bug' && task.analysis?.severity && (() => {
        const sev = SEVERITY_CONFIG[task.analysis.severity] || SEVERITY_CONFIG.low;
        return (
          <div
            className="rounded-lg p-3 mb-3 text-xs space-y-1.5"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-500">AI Severity</span>
              <span className="badge" style={{ background: sev.bg, color: sev.color }}>
                {sev.label}
              </span>
            </div>
            {task.analysis.suggested_tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.analysis.suggested_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Assignee */}
      {task.assignedTo && (
        <p className="text-xs text-slate-600 mb-3">
          → <span className="text-slate-400">{task.assignedTo}</span>
        </p>
      )}

      {/* Actions — only shown when the user has permission to act */}
      {(canAct || isAdmin) && (
        <div
          className="flex items-center gap-1.5 pt-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {/* Status transition buttons — shown to admins and assigned developers */}
          {canAct && task.status === 'open' && (
            <ActionBtn
              onClick={() => onStatusChange(task._id, 'in-progress')}
              bg="rgba(245,158,11,0.12)" color="#fbbf24" border="rgba(245,158,11,0.2)"
              hoverBg="rgba(245,158,11,0.22)"
            >
              Start
            </ActionBtn>
          )}
          {canAct && task.status !== 'resolved' && (
            <ActionBtn
              onClick={() => onStatusChange(task._id, 'resolved')}
              bg="rgba(16,185,129,0.12)" color="#34d399" border="rgba(16,185,129,0.2)"
              hoverBg="rgba(16,185,129,0.22)"
            >
              Resolve
            </ActionBtn>
          )}
          {canAct && task.status === 'resolved' && (
            <ActionBtn
              onClick={() => onStatusChange(task._id, 'open')}
              bg="rgba(99,102,241,0.12)" color="#a5b4fc" border="rgba(99,102,241,0.2)"
              hoverBg="rgba(99,102,241,0.22)"
            >
              Reopen
            </ActionBtn>
          )}

          <div className="flex-1" />

          {/* Delete — admin only */}
          {isAdmin && (
            <button
              onClick={() => onDelete(task._id)}
              className="text-slate-700 hover:text-red-400 transition-colors duration-150 p-1 rounded"
              title="Delete task (Admin only)"
            >
              <IconTrash />
            </button>
          )}
        </div>
      )}

      {/* Bottom bar: comment button + optional viewer tag */}
      <div
        className="mt-2.5 pt-2.5 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={() => setShowComments(true)}
          className="flex items-center gap-1.5 text-xs transition-colors duration-150"
          style={{ color: commentCount > 0 ? '#818cf8' : '#475569' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#a5b4fc'}
          onMouseLeave={(e) => e.currentTarget.style.color = commentCount > 0 ? '#818cf8' : '#475569'}
        >
          <IconComment />
          {commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}` : 'Comment'}
        </button>
        {myRole === 'viewer' && (
          <span className="text-xs text-slate-700 italic">View only</span>
        )}
      </div>

      {/* Comment modal */}
      {showComments && (
        <TaskCommentModal task={task} onClose={() => setShowComments(false)} />
      )}
    </div>
  );
}

/* Small reusable action button to reduce repetition */
function ActionBtn({ children, onClick, bg, color, border, hoverBg }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2.5 py-1 rounded-lg transition-all duration-150 font-medium"
      style={{ background: bg, color, border: `1px solid ${border}` }}
      onMouseEnter={(e) => e.currentTarget.style.background = hoverBg}
      onMouseLeave={(e) => e.currentTarget.style.background = bg}
    >
      {children}
    </button>
  );
}
