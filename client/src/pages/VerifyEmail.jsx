import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    api.get(`/api/auth/verify-email?token=${token}`)
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      });
  }, [searchParams]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#07091a' }}
    >
      <div className="relative z-10 w-full max-w-[420px] animate-fade-in-up text-center">
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white font-bold text-xl"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 32px rgba(99,102,241,0.4)' }}
        >
          DT
        </div>

        <div className="glass rounded-2xl p-8" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          {status === 'verifying' && (
            <>
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Verifying your email…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-4xl mb-4">✓</div>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">Email verified!</h2>
              <p className="text-slate-400 text-sm mb-6">{message}</p>
              <Link to="/login" className="btn-primary w-full py-2.5 rounded-xl text-sm inline-block">
                Sign In
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-4xl mb-4">✗</div>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">Verification failed</h2>
              <p className="text-slate-400 text-sm mb-6">{message}</p>
              <Link to="/register" className="btn-primary w-full py-2.5 rounded-xl text-sm inline-block">
                Register again
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
