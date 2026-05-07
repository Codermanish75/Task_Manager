import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', password: '', password2: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) return toast.error('Please fill required fields');
    if (form.password !== form.password2) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to TaskFlow 🚀');
      navigate('/dashboard');
    } catch (err) {
      const errs = err.response?.data;
      if (errs) {
        const msg = Object.values(errs).flat()[0];
        toast.error(typeof msg === 'string' ? msg : 'Registration failed');
      } else {
        toast.error('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <h1>Task<span>Manager</span></h1>
          <p className="auth-subtitle">Create your workspace account</p>
        </div>

        <div style={{ height: 2, background: 'linear-gradient(90deg, var(--accent), var(--accent-2), transparent)', borderRadius: 2, marginBottom: 32 }} />

        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input name="first_name" value={form.first_name} onChange={handle} className="form-input" placeholder="John" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input name="last_name" value={form.last_name} onChange={handle} className="form-input" placeholder="Doe" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input name="username" value={form.username} onChange={handle} className="form-input" placeholder="johndoe" required />
          </div>

          <div className="form-group">
            <label className="form-label">Email <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input name="email" type="email" value={form.email} onChange={handle} className="form-input" placeholder="john@company.com" required />
          </div>

          <div className="form-group">
            <label className="form-label">Password <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input name="password" type="password" value={form.password} onChange={handle} className="form-input" placeholder="Min 6 characters" required />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input name="password2" type="password" value={form.password2} onChange={handle} className="form-input" placeholder="Repeat password" required />
          </div>

          {/* Password strength indicator */}
          {form.password && (
            <div style={{ marginBottom: 16, marginTop: -12 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: form.password.length < 6 ? '25%' : form.password.length < 10 ? '60%' : '100%',
                  background: form.password.length < 6 ? 'var(--danger)' : form.password.length < 10 ? 'var(--warning)' : 'var(--success)'
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {form.password.length < 6 ? 'Weak' : form.password.length < 10 ? 'Moderate' : 'Strong'} password
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={loading}>
            {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : null}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
