import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

const ROLE_CONFIG = {
  admin:     { label: 'Admin',     bg: 'rgba(99,102,241,0.2)',  color: '#a5b4fc' },
  developer: { label: 'Developer', bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7' },
  viewer:    { label: 'Viewer',    bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
};

const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconFolder = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconTask = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);

// Gradient colours per project index for variety
const PROJECT_GRADIENTS = [
  ['#6366f1', '#8b5cf6'],
  ['#3b82f6', '#6366f1'],
  ['#8b5cf6', '#ec4899'],
  ['#06b6d4', '#3b82f6'],
  ['#10b981', '#06b6d4'],
  ['#f59e0b', '#ef4444'],
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/api/projects');
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/api/projects', form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const closeModal = () => { setShowModal(false); setError(''); setForm({ name: '', description: '' }); };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation(); // prevent card click / navigation
    if (!window.confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    setDeletingId(projectId);
    try {
      await api.delete(`/api/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#07091a' }}>
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-10 animate-fade-in-up">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Overview</p>
              <h1 className="text-2xl font-bold text-slate-100">
                Good day, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {projects.length} project{projects.length !== 1 ? 's' : ''} · manage your work below
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
            >
              <IconPlus />
              New Project
            </button>
          </div>

          {/* Projects */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-44 rounded-2xl animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div
              className="rounded-2xl p-12 text-center animate-fade-in-up glass"
            >
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-indigo-400"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <IconFolder />
              </div>
              <h3 className="text-base font-semibold text-slate-300 mb-1">No projects yet</h3>
              <p className="text-slate-500 text-sm mb-6">Create your first project to get started tracking work</p>
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary px-5 py-2.5 rounded-xl text-sm"
              >
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project, i) => {
                const [c1, c2] = PROJECT_GRADIENTS[i % PROJECT_GRADIENTS.length];
                const delayClass = ['delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500', 'delay-600'][i % 6];
                const roleConf = ROLE_CONFIG[project.myRole] || ROLE_CONFIG.viewer;
                const isProjectAdmin = project.myRole === 'admin';

                return (
                  <div
                    key={project._id}
                    onClick={() => navigate(`/projects/${project._id}`)}
                    className={`glass glass-hover rounded-2xl p-5 cursor-pointer animate-fade-in-up ${delayClass} group relative`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, boxShadow: `0 4px 16px ${c1}40` }}
                      >
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Role badge */}
                        <span
                          className="badge"
                          style={{ background: roleConf.bg, color: roleConf.color }}
                        >
                          {roleConf.label}
                        </span>
                        {/* Delete — admin only */}
                        {isProjectAdmin && (
                          <button
                            onClick={(e) => handleDeleteProject(e, project._id)}
                            disabled={deletingId === project._id}
                            className="text-slate-700 hover:text-red-400 transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
                            title="Delete project"
                          >
                            {deletingId === project._id ? (
                              <div className="w-3 h-3 rounded-full border border-red-400 border-t-transparent animate-spin" />
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6"/><path d="M14 11v6"/>
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Name & description */}
                    <h3 className="font-semibold text-slate-200 mb-1 text-sm">{project.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                      {project.description || 'No description provided'}
                    </p>

                    {/* Footer */}
                    <div
                      className="flex items-center gap-2 pt-3"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span className="text-slate-600 flex items-center gap-1.5 text-xs">
                        <IconTask />
                        <span className="text-slate-400">{project.taskCount || 0} tasks</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 animate-scale-in"
            style={{
              background: '#0d1530',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-slate-100">New Project</h2>
              <button onClick={closeModal} className="text-slate-600 hover:text-slate-300 transition text-xl leading-none">×</button>
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 mb-4 text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="field w-full px-4 py-2.5 text-sm"
                  placeholder="My Awesome Project"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="field w-full px-4 py-2.5 text-sm resize-none"
                  placeholder="Brief description..."
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 py-2.5 rounded-xl text-sm"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
