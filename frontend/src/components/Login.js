import React, { useState } from 'react';
import { authAPI } from '../services/api';
import './Login.css';

const Login = ({ onLogin }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        // Register new user with company
        const registerData = {
          email: username,
          password: password,
          first_name: firstName,
          last_name: lastName,
          company_name: companyName || `${firstName}'s Company`
        };

        await authAPI.register(registerData);

        // After successful registration, auto-login
        const response = await authAPI.login({ email: username, password });
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        onLogin(response.data);
      } else {
        // Login existing user
        const response = await authAPI.login({ email: username, password });
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        onLogin(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail ||
        (isRegisterMode ? 'Registration failed' : 'Invalid username or password'));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setUsername('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setCompanyName('');
  };

  return (
    <div className="login-split-container">
      {/* Left Panel - Features */}
      <div className="login-features-panel">
        <div className="features-content">
          <div className="features-header">
            <div className="brand-logo">
              <div className="brand-icon">📊</div>
              <h1 className="brand-name">NexInvo</h1>
            </div>
            <p className="brand-tagline">Modern Invoice Management for Growing Businesses</p>
          </div>

          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon">✨</div>
              <div className="feature-content">
                <h3 className="feature-title">Smart Invoice Generation</h3>
                <p className="feature-description">Create professional invoices in seconds with customizable templates</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">🏢</div>
              <div className="feature-content">
                <h3 className="feature-title">Multi-Tenant SaaS</h3>
                <p className="feature-description">Manage multiple organizations with isolated data and permissions</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">📈</div>
              <div className="feature-content">
                <h3 className="feature-title">Real-Time Analytics</h3>
                <p className="feature-description">Track revenue, pending payments, and business insights instantly</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">🔒</div>
              <div className="feature-content">
                <h3 className="feature-title">Secure & Reliable</h3>
                <p className="feature-description">Enterprise-grade security with encrypted data and regular backups</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">💳</div>
              <div className="feature-content">
                <h3 className="feature-title">Payment Tracking</h3>
                <p className="feature-description">Monitor payments, send reminders, and manage cash flow effortlessly</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">🌐</div>
              <div className="feature-content">
                <h3 className="feature-title">Cloud-Based Access</h3>
                <p className="feature-description">Access your invoices anywhere, anytime from any device</p>
              </div>
            </div>
          </div>

          <div className="features-footer">
            <p className="company-credit">Powered by NexInvo</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-header">
            <h2 className="login-title">{isRegisterMode ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="login-subtitle">
              {isRegisterMode ? 'Start managing invoices today' : 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {isRegisterMode && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="companyName">Company Name</label>
                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company Ltd."
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="username">Email Address</label>
              <input
                id="username"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (isRegisterMode ? 'Creating Account...' : 'Signing in...') : (isRegisterMode ? 'Create Account' : 'Sign In')}
            </button>

            <div className="form-footer">
              <button
                type="button"
                onClick={toggleMode}
                className="toggle-mode-btn"
              >
                {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Register"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer with Branding */}
      <footer className="login-footer">
        <p>© {new Date().getFullYear()} Chinmay Technosoft Private Limited. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Login;
