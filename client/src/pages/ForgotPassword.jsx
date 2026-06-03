import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function ForgotPassword() {
  const [email,     setEmail]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#07091a' }}
    >
      <div className="orb animate-orb w-[400px] h-[400px] -top-32 -left-32" style={{ background: '#6366f1' }} />
      <div className="orb animate-orb w-[300px] h-[300px] -bottom-24 -right-24" style={{ background: '#8b5cf6', animationDelay: '4s' }} />

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
          {submitted ? (
            <div className="text-center">
              <div className="text-3xl mb-4">📬</div>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">Check your inbox</h2>
              <p className="text-slate-400 text-sm mb-6">
                If an account with that email exists, we've sent a reset link. It expires in 1 hour.
              </p>
              <Link to="/login" className="text-sm font-semibold" style={{ color: '#818cf8' }}>
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">Forgot your password?</h2>
              <p className="text-slate-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>

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
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="field w-full px-4 py-2.5 text-sm"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 rounded-xl text-sm mt-2"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                <Link to="/login" className="font-semibold" style={{ color: '#818cf8' }}>
                  ← Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
