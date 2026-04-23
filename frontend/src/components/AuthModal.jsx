import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFingerprint } from '../hooks/useFingerprint.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AuthModal({ tab: initialTab, onClose, toast }) {
  const [tab, setTab] = useState(initialTab || 'login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { getEventId, isConfigured } = useFingerprint();

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Capture Fingerprint event ID + sealed result before hitting the backend
      const { eventId: fingerprintEventId, sealedResult } = await getEventId();

      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const body =
        tab === 'login'
          ? { email: form.email, password: form.password, fingerprintEventId, sealedResult }
          : { email: form.email, password: form.password, name: form.name, fingerprintEventId, sealedResult };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || 'Something went wrong. Please try again.', 'error');
        return;
      }

      login(data.user, data.token, data.flags ?? {});
      const firstName = data.user.name?.split(' ')[0] || '';
      toast(
        tab === 'signup'
          ? `Welcome to LUXE, ${firstName}!`
          : `Welcome back, ${firstName}!`,
        'success'
      );

      if (tab === 'login' && data.flags?.incognito) {
        toast('Incognito mode detected. You won\'t be able to place orders this session.', 'warning');
      }
      onClose();
    } catch {
      toast('Network error. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-md shadow-2xl animate-slide-in">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-300 hover:text-stone-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-8 pt-8 pb-10">
          {/* Brand */}
          <p className="font-serif text-2xl font-semibold text-center mb-8">LUXE</p>

          {/* Tabs */}
          <div className="flex border-b border-stone-100 mb-8">
            {[
              { key: 'login', label: 'Sign In' },
              { key: 'signup', label: 'Create Account' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                  tab === key
                    ? 'text-stone-900 border-b-2 border-stone-900 -mb-px'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div>
                <label className="text-[10px] font-medium text-stone-500 block mb-1.5 tracking-widest uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Jane Doe"
                  required={tab === 'signup'}
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-medium text-stone-500 block mb-1.5 tracking-widest uppercase">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@example.com"
                required
                autoFocus={tab === 'login'}
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-stone-500 block mb-1.5 tracking-widest uppercase">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {tab === 'signup' && isConfigured && (
              <p className="text-[11px] text-stone-400 flex items-center gap-1.5">
                <span>🔒</span>
                Device fingerprinting active — prevents duplicate account creation.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading
                ? 'Please wait…'
                : tab === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-stone-400 mt-6">
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setTab(tab === 'login' ? 'signup' : 'login')}
              className="text-stone-900 font-medium hover:underline"
            >
              {tab === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
