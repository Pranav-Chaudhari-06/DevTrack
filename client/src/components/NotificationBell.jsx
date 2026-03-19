import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const IconBell = ({ hasUnread }) => (
  <svg
    width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ color: hasUnread ? '#a5b4fc' : '#64748b' }}
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    {hasUnread && (
      <circle cx="18" cy="5" r="4" fill="#6366f1" stroke="#07091a" strokeWidth="2"/>
    )}
  </svg>
);

const TYPE_ICONS = {
  task_assigned:  '👤',
  status_changed: '🔄',
  comment_added:  '💬',
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead } = useSocket();
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const btnRef  = useRef(null);
  const dropRef = useRef(null);
  const navigate = useNavigate();

  // Close when clicking outside both the button and the portal dropdown
  useEffect(() => {
    const handler = (e) => {
      if (
        btnRef.current  && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleOpen = useCallback(() => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 8, left: 228 });
    }
    setOpen((o) => !o);
  }, [open]);

  const handleClick = async (notif) => {
    if (!notif.read) await markAsRead(notif._id);
    setOpen(false);
    if (notif.projectId) navigate(`/projects/${notif.projectId}`);
  };

  const dropdown = open && (
    <div
      ref={dropRef}
      className="w-80 rounded-2xl animate-scale-in overflow-hidden"
      style={{
        position: 'fixed',
        top: `${dropPos.top}px`,
        left: `${dropPos.left}px`,
        zIndex: 9999,
        background: '#0d1530',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <span className="text-sm font-semibold text-slate-200">Notifications</span>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-medium transition-colors whitespace-nowrap"
            style={{ color: '#818cf8' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#a5b4fc'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#818cf8'}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-600">
            No notifications yet
          </div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif._id}
              onClick={() => handleClick(notif)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 transition-all duration-150 whitespace-normal"
              style={{
                background: notif.read ? 'transparent' : 'rgba(99,102,241,0.07)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(99,102,241,0.07)'}
            >
              {/* Type icon */}
              <span className="text-base flex-shrink-0 mt-0.5">
                {TYPE_ICONS[notif.type] || '🔔'}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm leading-snug"
                  style={{ color: notif.read ? '#64748b' : '#cbd5e1' }}
                >
                  {notif.message}
                </p>
                <p className="text-xs mt-1" style={{ color: '#475569' }}>
                  {timeAgo(notif.createdAt)}
                </p>
              </div>

              {/* Unread dot */}
              {!notif.read && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: '#6366f1' }}
                />
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          className="px-4 py-2.5 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-xs text-slate-700">
            Showing last {notifications.length} notifications
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
        style={{
          background: open ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
        }}
        title="Notifications"
      >
        <IconBell hasUnread={unreadCount > 0} />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
            style={{ background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Portal — renders outside sidebar's stacking context */}
      {createPortal(dropdown, document.body)}
    </div>
  );
}
