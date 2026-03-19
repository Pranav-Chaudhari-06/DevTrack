import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', form);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#07091a' }}
    >
      {/* Background orbs */}
      <div className="orb animate-orb w-[500px] h-[500px] -top-32 -left-32" style={{ background: '#6366f1' }} />
      <div className="orb animate-orb w-[400px] h-[400px] -bottom-24 -right-24 delay-400" style={{ background: '#8b5cf6', animationDelay: '4s' }} />
      <div className="orb w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: '#3b82f6', opacity: 0.07 }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px] animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 32px rgba(99,102,241,0.4)' }}
          >
            DT
          </div>
          <h1 className="text-2xl font-bold gradient-text">DevTrack</h1>
          <p className="text-slate-500 text-sm mt-1">Developer Task & Bug Tracker</p>
        </div>

        {/* Form card */}
        <div
          className="glass rounded-2xl p-8"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        >
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Sign in to your account</h2>

          {error && (
            <div
              className="rounded-xl px-4 py-3 mb-5 text-sm text-red-400 animate-fade-in"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="field w-full px-4 py-2.5 text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="field w-full px-4 py-2.5 text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-xl text-sm mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold"
              style={{ color: '#818cf8' }}
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
