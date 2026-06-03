import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard      from './pages/Dashboard';
import ProjectDetail  from './pages/ProjectDetail';
import Analytics      from './pages/Analytics';
import VerifyEmail    from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  return user ? children : <Navigate to="/login" replace />;
}

function AppLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091a' }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          DT
        </div>
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/verify-email"    element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />

            {/* Protected */}
            <Route path="/"
              element={<PrivateRoute><Dashboard /></PrivateRoute>}
            />
            <Route path="/projects/:id"
              element={<PrivateRoute><ProjectDetail /></PrivateRoute>}
            />
            <Route path="/analytics"
              element={<PrivateRoute><Analytics /></PrivateRoute>}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
