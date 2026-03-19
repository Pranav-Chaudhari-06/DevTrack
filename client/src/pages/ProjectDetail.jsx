import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import KanbanBoard from '../components/KanbanBoard';
import CreateTaskModal from '../components/CreateTaskModal';
import MembersPanel from '../components/MembersPanel';

const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconUsers = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const ROLE_CONFIG = {
  admin:     { label: 'Admin',     bg: 'rgba(99,102,241,0.2)',  color: '#a5b4fc', border: 'rgba(99,102,241,0.35)' },
  developer: { label: 'Developer', bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'rgba(16,185,129,0.3)'  },
  viewer:    { label: 'Viewer',    bg: 'rgba(100,116,139,0.2)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [myRole, setMyRole] = useState(null);   // current user's role in this project
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/api/projects/${id}`),
        api.get(`/api/projects/${id}/tasks`),
      ]);
      setProject(projRes.data);
      setMyRole(projRes.data.myRole);     // comes from the server response
      setTasks(taskRes.data);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (newTask) => {
    setTasks((prev) => [newTask, ...prev]);
    setShowTaskModal(false);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { data } = await api.patch(`/api/tasks/${taskId}`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? data : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/api/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const canCreateTask = myRole === 'admin' || myRole === 'developer';
  const isAdmin       = myRole === 'admin';

  const openCount       = tasks.filter((t) => t.status === 'open').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in-progress').length;
  const resolvedCount   = tasks.filter((t) => t.status === 'resolved').length;

  const roleConf = ROLE_CONFIG[myRole] || {};

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#07091a' }}>
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : !project ? (
          <div className="flex items-center justify-center h-full text-slate-500">Project not found.</div>
        ) : (
          <div className="px-8 py-8">

            {/* Back */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition animate-fade-in"
            >
              <IconArrow /> Back to Projects
            </button>

            {/* Header */}
            <div className="flex items-start justify-between mb-6 animate-fade-in-up">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
                  {/* Current user's role badge */}
                  {myRole && (
                    <span
                      className="badge"
                      style={{ background: roleConf.bg, color: roleConf.color, border: `1px solid ${roleConf.border}` }}
                    >
                      {roleConf.label}
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-slate-500 text-sm">{project.description}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Members button — visible to all, but management only for admins */}
                <button
                  onClick={() => setShowMembers(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                  <IconUsers />
                  Members
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(99,102,241,0.25)', color: '#a5b4fc' }}
                  >
                    {project.members?.length || 0}
                  </span>
                </button>

                {/* Add Task button — hidden for Viewers */}
                {canCreateTask && (
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                  >
                    <IconPlus />
                    Add Task / Bug
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 mb-6 animate-fade-in-up delay-100">
              {[
                { label: 'Open',        count: openCount,       c: '#6366f1', bg: 'rgba(99,102,241,0.15)'  },
                { label: 'In Progress', count: inProgressCount, c: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
                { label: 'Resolved',    count: resolvedCount,   c: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
              ].map(({ label, count, c, bg }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: bg, border: `1px solid ${c}30`, color: c }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: c }}
                  >
                    {count}
                  </span>
                  {label}
                </div>
              ))}
              <div className="flex-1" />
              <span className="text-xs text-slate-600">{tasks.length} total</span>
            </div>

            {/* Kanban */}
            <div className="animate-fade-in-up delay-200">
              <KanbanBoard
                tasks={tasks}
                myRole={myRole}
                currentUser={user}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            </div>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <CreateTaskModal
          projectId={id}
          onClose={() => setShowTaskModal(false)}
          onCreated={handleTaskCreated}
        />
      )}

      {/* Members Panel */}
      {showMembers && (
        <MembersPanel
          projectId={id}
          myRole={myRole}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}
