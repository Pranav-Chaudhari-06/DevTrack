import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const IconGrid = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const IconChart = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
    <line x1="2"  y1="20" x2="22" y2="20"/>
  </svg>
);
const IconLogout = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isDashboard  = location.pathname === '/';
  const isAnalytics  = location.pathname === '/analytics';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside
      style={{ background: 'rgba(7, 9, 26, 0.95)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      className="w-[220px] flex-shrink-0 flex flex-col h-screen sticky top-0 backdrop-blur-xl"
    >
      {/* Logo + notification bell */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            DT
          </div>
          <span className="font-bold text-base gradient-text">DevTrack</span>
        </button>

        {/* Bell lives here — always visible at the top of the sidebar */}
        <NotificationBell />
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} className="mx-4 mb-4" />

      {/* Nav */}
      <nav className="px-3 flex-1 space-y-1">
        <button
          onClick={() => navigate('/')}
          className={`nav-item w-full ${isDashboard ? 'active' : ''}`}
        >
          <IconGrid />
          <span>Projects</span>
        </button>
        <button
          onClick={() => navigate('/analytics')}
          className={`nav-item w-full ${isAnalytics ? 'active' : ''}`}
        >
          <IconChart />
          <span>Analytics</span>
        </button>
      </nav>

      {/* User card */}
      <div className="p-3 mx-3 mb-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="nav-item w-full text-xs hover:text-red-400"
          style={{ padding: '6px 10px' }}
        >
          <IconLogout />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
