import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up">
        <div className="auth-logo">
          <h1>Task<span>Manager</span></h1>
          <p className="auth-subtitle">Sign in to your workspace</p>
        </div>

        {/* Decorative line */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, var(--accent), var(--accent-2), transparent)', borderRadius: 2, marginBottom: 32 }} />

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input
              name="username"
              value={form.username}
              onChange={handle}
              className="form-input"
              placeholder="Enter your username"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                name="password"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={handle}
                className="form-input"
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-body)',
                  padding: '4px 6px'
                }}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create one</Link>
        </div>

        {/* Demo hint */}
        <div style={{
          marginTop: 24, padding: '12px 16px',
          background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)',
          borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center'
        }}>
          💡 Create an account to get started with your workspace
        </div>
      </div>
    </div>
  );
}
