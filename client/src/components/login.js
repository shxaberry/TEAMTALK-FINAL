import React, { useState } from 'react';
import axios from 'axios';
import './login.css';

// ── Single source of truth for the backend URL ────────────────────────────────
const API = 'http://localhost:5000';
const Login = ({ setAuth, switchToSignup }) => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [loading, setLoading]           = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      return setError('Please fill in all fields.');
    }

    setLoading(true);

    try {
      // FIX: was /login — server listens on /api/login
      // FIX: field sent as `email`; server accepts username OR email, so this works fine.
     const res = await axios.post(`${API}/api/login`, { username: email, password });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userName', res.data.username);
      localStorage.setItem('userColor', res.data.color || '#6366f1');

      setSuccess('Login successful! Redirecting...');

      setTimeout(() => {
        setAuth();
      }, 1000);

    } catch (err) {
      // FIX: server returns { message }, not { error }
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card">
        {/* Logo */}
        <div className="logo">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path d="M8 9h8M8 13h5M3 7.5C3 6.1 4.1 5 5.5 5h13C19.9 5 21 6.1 21 7.5v9c0 1.4-1.1 2.5-2.5 2.5H14l-4 3v-3H5.5C4.1 19 3 17.9 3 16.5v-9z"
              stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1>Welcome back</h1>
        <p className="subtext">Log in to access your TeamTalk workspace.</p>

        <form onSubmit={handleLogin} noValidate>
          {error   && <div className="alert error">{error}</div>}
          {success && <div className="alert success">{success}</div>}

          <div className="field">
            <label htmlFor="login-email">Email or Username</label>
            <input
              id="login-email"
              type="text"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <div className="input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="has-eye"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  {showPassword ? (
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="footer-text">
          Don't have an account?{' '}
          <span className="link" onClick={switchToSignup}>Sign up</span>
        </p>
      </div>
    </div>
  );
};

export default Login;