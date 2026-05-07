import React, { useState } from 'react';
import axios from 'axios';
import './signup.css';

const Signup = ({ switchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { firstName, lastName, email, password, confirmPassword } = formData;

    // Validations
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return setError('Please fill in all fields.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setLoading(true);

    try {     
   await axios.post('http://localhost:5000/signup',
  { firstName, lastName, email, password });

      setSuccess('Account created! Redirecting to sign in...');
      
      setTimeout(() => {
        switchToLogin(); // Takes user back to the Login screen
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

const eyeOpen = (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  );
const eyeOff = (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
    </>
  );

  return (
    <div className="signup-container">
      <div className="card">
        <div className="logo">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path d="M8 9h8M8 13h5M3 7.5C3 6.1 4.1 5 5.5 5h13C19.9 5 21 6.1 21 7.5v9c0 1.4-1.1 2.5-2.5 2.5H14l-4 3v-3H5.5C4.1 19 3 17.9 3 16.5v-9z"
              stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1>Create your account</h1>
        <p className="subtext">Create your workspace — collaborate,<br/>share, and build together.</p>

        <form onSubmit={handleSignup} noValidate>
          {error && <div className="alert error show">{error}</div>}
          {success && <div className="alert success show">{success}</div>}

          <div className="row">
            <div className="field">
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" value={formData.firstName} onChange={handleChange} autoComplete="given-name" />
            </div>
            <div className="field">
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" value={formData.lastName} onChange={handleChange} autoComplete="family-name" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={formData.email} onChange={handleChange} placeholder="name@company.com" autoComplete="email" />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                value={formData.password}
                onChange={handleChange}
                className="has-eye" 
                autoComplete="new-password" 
              />
              <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  {showPassword ? eyeOff : eyeOpen}
                </svg>
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrap">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                id="confirmPassword" 
                value={formData.confirmPassword}
                onChange={handleChange}
                className="has-eye" 
                autoComplete="new-password" 
              />
              <button type="button" className="eye-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  {showConfirmPassword ? eyeOff : eyeOpen}
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="footer-text">
          Already have an account? <span className="link" onClick={switchToLogin}>Sign in</span>
        </p>
      </div>
    </div>
  );
};

export default Signup;