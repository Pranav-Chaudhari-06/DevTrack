import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ROLE_CONFIG = {
  admin:     { label: 'Admin',     bg: 'rgba(99,102,241,0.2)',  color: '#a5b4fc', border: 'rgba(99,102,241,0.35)' },
  developer: { label: 'Developer', bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'rgba(16,185,129,0.3)'  },
  viewer:    { label: 'Viewer',    bg: 'rgba(100,116,139,0.2)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
};

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

export default function MembersPanel({ projectId, myRole, onClose }) {
  const { user: currentUser } = useAuth();
  const isAdmin = myRole === 'admin';

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('developer');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  useEffect(() => { fetchMembers(); }, [projectId]);

  const fetchMembers = async () => {
    try {
      const { data } = await api.get(`/api/projects/${projectId}/members`);
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviting(true);
    try {
      const { data } = await api.post(`/api/projects/${projectId}/members`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setMembers((prev) => [...prev, data]);
      setInviteEmail('');
      setInviteSuccess(`${data.user.name} added as ${data.role}`);
      setTimeout(() => setInviteSuccess(''), 3000);
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/api/projects/${projectId}/members/${userId}`, { role: newRole });
      setMembers((prev) =>
        prev.map((m) => (m.user._id === userId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleRemove = async (userId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this project?`)) return;
    try {
      await api.delete(`/api/projects/${projectId}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.user._id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-start justify-end z-50 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Slide-in panel from right */}
      <div
        className="h-full w-full max-w-sm flex flex-col animate-slide-in-right overflow-hidden"
        style={{
          background: '#0d1530',
          borderLeft: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '-24px 0 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <h2 className="text-base font-semibold text-slate-100">Project Members</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin ? 'Manage access and roles' : 'View team members'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition rounded-lg p-1.5 hover:bg-white/5"
          >
            <IconX />
          </button>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-slate-600 text-sm">Loading...</div>
          ) : (
            members.map((m) => {
              const roleConf = ROLE_CONFIG[m.role] || ROLE_CONFIG.viewer;
              const isCurrentUser = m.user._id === currentUser?.id || m.user.email === currentUser?.email;

              return (
                <div
                  key={m.user._id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    {m.user.name?.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {m.user.name}
                      {isCurrentUser && (
                        <span className="ml-1.5 text-xs text-slate-600">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
                  </div>

                  {/* Role — dropdown for admin, badge for others */}
                  {isAdmin && !isCurrentUser ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.user._id, e.target.value)}
                      className="field text-xs px-2 py-1 rounded-lg"
                      style={{ minWidth: 0 }}
                    >
                      <option value="admin">Admin</option>
                      <option value="developer">Developer</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span
                      className="badge flex-shrink-0"
                      style={{ background: roleConf.bg, color: roleConf.color, border: `1px solid ${roleConf.border}` }}
                    >
                      {roleConf.label}
                    </span>
                  )}

                  {/* Remove button — admin only, not self */}
                  {isAdmin && !isCurrentUser && (
                    <button
                      onClick={() => handleRemove(m.user._id, m.user.name)}
                      className="text-slate-700 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                      title="Remove member"
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Invite form — admin only */}
        {isAdmin && (
          <div
            className="px-4 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Invite by Email
            </p>

            {inviteError && (
              <div
                className="rounded-lg px-3 py-2 mb-3 text-xs text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div
                className="rounded-lg px-3 py-2 mb-3 text-xs text-emerald-400"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="colleague@company.com"
                className="field w-full px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="field px-3 py-2 text-sm flex-1"
                >
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm flex-shrink-0"
                >
                  {inviting ? '...' : <><IconPlus /> Invite</>}
                </button>
              </div>
            </form>

            {/* Role legend */}
            <div
              className="mt-4 rounded-xl p-3 space-y-1.5"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {[
                { role: 'admin',     desc: 'Full access — create, edit, delete, manage members' },
                { role: 'developer', desc: 'Create tasks & update tasks assigned to them' },
                { role: 'viewer',    desc: 'Read-only — cannot create or modify anything' },
              ].map(({ role, desc }) => {
                const c = ROLE_CONFIG[role];
                return (
                  <div key={role} className="flex items-start gap-2">
                    <span
                      className="badge mt-0.5 flex-shrink-0"
                      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
                    >
                      {c.label}
                    </span>
                    <span className="text-xs text-slate-600 leading-relaxed">{desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
