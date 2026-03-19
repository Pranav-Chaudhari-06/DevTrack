import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TaskCommentModal({ task, onClose }) {
  const { user } = useAuth();
  const [comments, setComments]   = useState(task.comments || []);
  const [text, setText]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const bottomRef = useRef(null);

  // Scroll to bottom when comments load or a new one arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post(`/api/tasks/${task._id}/comments`, { text });
      setComments((prev) => [...prev, data]);
      setText('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit on Ctrl/Cmd + Enter
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit(e);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col animate-scale-in"
        style={{
          background: '#0d1530',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Comments</p>
            <h3 className="text-sm font-semibold text-slate-200 truncate">{task.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition rounded-lg p-1 hover:bg-white/5 flex-shrink-0"
          >
            <IconX />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[160px]">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-slate-700">
              <span className="text-2xl mb-2">💬</span>
              <p className="text-sm">No comments yet — be the first!</p>
            </div>
          ) : (
            comments.map((c, i) => {
              const isMe = c.authorName === user?.name;
              return (
                <div key={c._id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    {c.authorName?.charAt(0).toUpperCase()}
                  </div>
                  {/* Bubble */}
                  <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-slate-600 mb-1">
                      {isMe ? 'You' : c.authorName} · {timeAgo(c.createdAt)}
                    </span>
                    <div
                      className="px-3 py-2 rounded-xl text-sm leading-relaxed"
                      style={
                        isMe
                          ? { background: 'rgba(99,102,241,0.25)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.3)' }
                          : { background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.08)' }
                      }
                    >
                      {c.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div
          className="px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          {error && (
            <p className="text-xs text-red-400 mb-2">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment… (Ctrl+Enter to send)"
              rows={2}
              className="field flex-1 px-3 py-2 text-sm resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="btn-primary px-3 py-2 rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ height: '40px', width: '40px' }}
              title="Send"
            >
              {submitting
                ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <IconSend />
              }
            </button>
          </form>
          <p className="text-xs text-slate-700 mt-1.5">Ctrl + Enter to send</p>
        </div>
      </div>
    </div>
  );
}
