import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleChange = (e) => {
    setFormData(f => ({
      ...f,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.first_name ||
      !formData.last_name ||
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      return toast.error('Please fill all fields');
    }

    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setLoading(true);

    try {
      await register({
        first_name: formData.first_name,
        last_name: formData.last_name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      toast.success('Account created successfully 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up">

        <div className="auth-logo">
          <h1>Task<span>Manager</span></h1>
          <p className="auth-subtitle">
            Create your workspace account
          </p>
        </div>

        <div
          style={{
            height: 2,
            background:
              'linear-gradient(90deg, var(--accent), var(--accent-2), transparent)',
            borderRadius: 2,
            marginBottom: 32,
          }}
        />

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label className="form-label">First Name</label>
            <input
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter first name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter last name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Choose a username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>

            <div style={{ position: 'relative' }}>
              <input
                name="password"
                type={showPass ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Create a password"
                style={{ paddingRight: 48 }}
              />

              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  fontFamily: 'var(--font-body)',
                  padding: '4px 6px',
                }}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>

            <div style={{ position: 'relative' }}>
              <input
                name="confirmPassword"
                type={showConfirmPass ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                placeholder="Confirm password"
                style={{ paddingRight: 48 }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPass(!showConfirmPass)
                }
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  fontFamily: 'var(--font-body)',
                  padding: '4px 6px',
                }}
              >
                {showConfirmPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{
              justifyContent: 'center',
              marginTop: 8,
            }}
            disabled={loading}
          >
            {loading ? (
              <span
                className="spinner"
                style={{ borderTopColor: 'white' }}
              />
            ) : null}

            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: 14,
            color: 'var(--text-muted)',
          }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: 'var(--accent)',
              fontWeight: 600,
            }}
          >
            Sign in
          </Link>
        </div>

        <div
          style={{
            marginTop: 24,
            padding: '12px 16px',
            background: 'rgba(108,99,255,0.06)',
            border: '1px solid rgba(108,99,255,0.15)',
            borderRadius: 10,
            fontSize: 12,
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          🚀 Organize your tasks and boost productivity
        </div>
      </div>
    </div>
  );
}