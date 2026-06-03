import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPassword() {
  const [searchParams]           = useSearchParams();
  const navigate                 = useNavigate();
  const [password,  setPassword] = useState('');
  const [confirm,   setConfirm]  = useState('');
  const [error,     setError]    = useState('');
  const [loading,   setLoading]  = useState(false);

  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      return setError('Passwords do not match.');
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      navigate('/login', { state: { message: 'Password updated! You can now sign in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091a' }}>
        <div className="text-center text-slate-400">
          <p className="mb-4">Invalid reset link.</p>
          <Link to="/forgot-password" className="font-semibold" style={{ color: '#818cf8' }}>
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#07091a' }}
    >
      <div className="orb animate-orb w-[400px] h-[400px] -top-32 -right-32" style={{ background: '#8b5cf6' }} />
      <div className="orb animate-orb w-[300px] h-[300px] -bottom-24 -left-20" style={{ background: '#6366f1', animationDelay: '3s' }} />

      <div className="relative z-10 w-full max-w-[420px] animate-fade-in-up">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 32px rgba(99,102,241,0.4)' }}
          >
            DT
          </div>
          <h1 className="text-2xl font-bold gradient-text">DevTrack</h1>
        </div>

        <div className="glass rounded-2xl p-8" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Set a new password</h2>
          <p className="text-slate-500 text-sm mb-6">Must be 8+ characters with uppercase, lowercase, number, and special character.</p>

          {error && (
            <div
              className="rounded-xl px-4 py-3 mb-5 text-sm text-red-400"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="field w-full px-4 py-2.5 text-sm"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="field w-full px-4 py-2.5 text-sm"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-xl text-sm mt-2"
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
