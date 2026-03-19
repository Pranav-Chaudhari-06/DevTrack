import { useState } from 'react';
import api from '../api/axios';

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const SEVERITY_CONFIG = {
  critical: { bg: 'rgba(239,68,68,0.2)',   color: '#ef4444', label: 'CRITICAL' },
  high:     { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', label: 'HIGH'     },
  medium:   { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: 'MEDIUM'   },
  low:      { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8', label: 'LOW'      },
};

export default function CreateTaskModal({ projectId, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'task',
    priority: 'medium',
    status: 'open',
    assignedTo: '',
  });

  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'type' && value !== 'bug') setAnalysisResult(null);
  };

  // Client-side keyword preview (mirrors the Django service logic)
  const handleAnalyze = () => {
    if (!form.title && !form.description) {
      setError('Enter a title or description first');
      return;
    }
    setError('');
    setAnalyzing(true);

    const text = (form.title + ' ' + form.description).toLowerCase();
    const criticalKws = ['crash', 'null pointer', 'nullpointerexception', 'exception', 'data loss', 'fatal', 'outage', 'segfault'];
    const highKws     = ['error', 'fail', 'broken', 'not working', 'security', 'vulnerability', 'incorrect'];
    const mediumKws   = ['slow', 'timeout', 'delay', 'performance', 'lag'];

    let severity = 'low';
    if (criticalKws.some((k) => text.includes(k))) severity = 'critical';
    else if (highKws.some((k) => text.includes(k))) severity = 'high';
    else if (mediumKws.some((k) => text.includes(k))) severity = 'medium';

    const priorityMap = { critical: 'high', high: 'high', medium: 'medium', low: 'low' };
    const suggestedPriority = priorityMap[severity];

    setTimeout(() => {
      setAnalysisResult({ severity, suggestedPriority });
      setForm((prev) => ({ ...prev, priority: suggestedPriority }));
      setAnalyzing(false);
    }, 600); // slight delay for UX feel
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const { data } = await api.post(`/api/projects/${projectId}/tasks`, form);
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const isBug = form.type === 'bug';

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl animate-scale-in flex flex-col max-h-[90vh]"
        style={{
          background: '#0d1530',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h2 className="text-base font-semibold text-slate-100">Add Task / Bug</h2>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition rounded-lg p-1 hover:bg-white/5"
          >
            <IconX />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {error && (
            <div
              className="rounded-xl px-4 py-3 mb-4 text-sm text-red-400"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              {error}
            </div>
          )}

          <form id="task-form" onSubmit={handleSubmit} className="space-y-4">

            {/* Type toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Type</label>
              <div
                className="flex gap-0 rounded-xl overflow-hidden p-1"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {['task', 'bug'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleChange({ target: { name: 'type', value: t } })}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={
                      form.type === t
                        ? t === 'bug'
                          ? { background: 'linear-gradient(135deg, rgba(239,68,68,0.4), rgba(220,38,38,0.4))', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }
                          : { background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.4))', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }
                        : { color: '#64748b' }
                    }
                  >
                    {t === 'bug' ? '🐛  Bug' : '✓  Task'}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Title *</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="field w-full px-4 py-2.5 text-sm"
                placeholder="Brief, clear title..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="field w-full px-4 py-2.5 text-sm resize-none"
                placeholder="Steps to reproduce, expected vs actual behaviour..."
              />
            </div>

            {/* Analyze button — only for bugs */}
            {isBug && (
              <div>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background: analyzing ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    color: '#fbbf24',
                  }}
                  onMouseEnter={(e) => { if (!analyzing) e.currentTarget.style.background = 'rgba(245,158,11,0.18)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; }}
                >
                  {analyzing ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <IconSearch />
                      Analyze Severity
                    </>
                  )}
                </button>

                {/* Analysis result */}
                {analysisResult && (() => {
                  const sev = SEVERITY_CONFIG[analysisResult.severity];
                  return (
                    <div
                      className="mt-2.5 rounded-xl p-3.5 text-sm animate-fade-in"
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-xs font-medium">Analysis Result</span>
                        <span
                          className="badge"
                          style={{ background: sev.bg, color: sev.color }}
                        >
                          {sev.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">
                        Priority auto-set to{' '}
                        <span className="text-slate-300 font-semibold">{analysisResult.suggestedPriority}</span>
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Priority + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="field w-full px-3 py-2.5 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="field w-full px-3 py-2.5 text-sm"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assigned To</label>
              <input
                type="text"
                name="assignedTo"
                value={form.assignedTo}
                onChange={handleChange}
                className="field w-full px-4 py-2.5 text-sm"
                placeholder="Name or email (optional)"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex gap-3 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancel
          </button>
          <button
            form="task-form"
            type="submit"
            disabled={creating}
            className="btn-primary flex-1 py-2.5 rounded-xl text-sm"
          >
            {creating ? 'Creating...' : `Create ${isBug ? 'Bug' : 'Task'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
