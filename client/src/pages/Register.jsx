import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', form);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
      <div className="orb animate-orb w-[450px] h-[450px] -top-20 -right-32" style={{ background: '#8b5cf6' }} />
      <div className="orb animate-orb w-[350px] h-[350px] -bottom-16 -left-20" style={{ background: '#6366f1', animationDelay: '3s' }} />

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
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Create your account</h2>

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
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="field w-full px-4 py-2.5 text-sm"
                placeholder="John Doe"
              />
            </div>

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
                minLength={6}
                className="field w-full px-4 py-2.5 text-sm"
                placeholder="Min. 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-xl text-sm mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold"
              style={{ color: '#818cf8' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
