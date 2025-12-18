import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { formatDate } from '../utils/dateFormat';
import './Login.css';

const Login = ({ onLogin, initialMode = 'login', onBackToLanding }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(initialMode === 'register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // OTP verification states
  const [registrationStep, setRegistrationStep] = useState(1); // 1: email, 2: OTP, 3: details
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [logoutMessage, setLogoutMessage] = useState('');
  const [showForceLoginDialog, setShowForceLoginDialog] = useState(false);
  const [existingSessionInfo, setExistingSessionInfo] = useState(null);

  // Check for logout reason on mount
  useEffect(() => {
    const logoutReason = localStorage.getItem('logout_reason');
    if (logoutReason === 'session_invalid') {
      setLogoutMessage('You have been logged out because your account was accessed from another device.');
      localStorage.removeItem('logout_reason');
    }
  }, []);

  // Timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Send OTP to email
  const handleSendOTP = async () => {
    if (!username) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await authAPI.sendOTP(username);
      setOtpSent(true);
      setRegistrationStep(2);
      setResendTimer(60); // 60 seconds before can resend
      setSuccessMessage('OTP sent to your email. Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await authAPI.verifyOTP(username, otp);
      setEmailVerified(true);
      setRegistrationStep(3);
      setSuccessMessage('Email verified successfully! Please complete your registration.');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await authAPI.resendOTP(username);
      setOtp('');
      setResendTimer(60);
      setSuccessMessage('New OTP sent to your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // For registration, handle step-by-step
    if (isRegisterMode) {
      if (registrationStep === 1) {
        // Step 1: Send OTP
        handleSendOTP();
        return;
      } else if (registrationStep === 2) {
        // Step 2: Verify OTP
        handleVerifyOTP();
        return;
      }
      // Step 3: Complete registration
    }

    // Validate consent for registration
    if (isRegisterMode && !acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    // Validate mobile number for registration
    if (isRegisterMode && !mobileNumber) {
      setError('Mobile number is required.');
      return;
    }

    setLoading(true);

    try {
      if (isRegisterMode) {
        // Register new user with company
        const registerData = {
          email: username,
          password: password,
          first_name: firstName,
          last_name: lastName,
          company_name: companyName || `${firstName}'s Company`,
          mobile_number: mobileNumber
        };

        await authAPI.register(registerData);

        // After successful registration, auto-login
        const response = await authAPI.login({ email: username, password });
        sessionStorage.setItem('access_token', response.data.access);
        sessionStorage.setItem('refresh_token', response.data.refresh);
        if (response.data.session_token) {
          sessionStorage.setItem('session_token', response.data.session_token);
        }
        onLogin(response.data);
      } else {
        // Login existing user
        const response = await authAPI.login({ email: username, password });
        sessionStorage.setItem('access_token', response.data.access);
        sessionStorage.setItem('refresh_token', response.data.refresh);
        if (response.data.session_token) {
          sessionStorage.setItem('session_token', response.data.session_token);
        }
        onLogin(response.data);
      }
    } catch (err) {
      console.log('Login error:', err);
      console.log('Error response:', err.response);
      console.log('Error data:', err.response?.data);

      // Check if user is already logged in on another device
      if (err.response?.status === 409 && err.response?.data?.error === 'already_logged_in') {
        setExistingSessionInfo({
          deviceInfo: err.response.data.device_info,
          lastActivity: err.response.data.last_activity
        });
        setShowForceLoginDialog(true);
        setError('');
      } else if (err.response?.status === 403 && err.response?.data?.error === 'subscription_expired') {
        // Subscription expired and grace period ended
        const expiredData = err.response.data;
        setError(`Your subscription expired on ${expiredData.expired_on} and the 15-day grace period has ended. Please contact your administrator to renew the subscription for "${expiredData.organization}".`);
      } else {
        const errorMessage = err.response?.data?.error || err.response?.data?.detail ||
          (isRegisterMode ? 'Registration failed' : 'Invalid username or password');
        console.log('Setting error message:', errorMessage);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle force login when user confirms
  const handleForceLogin = async () => {
    setLoading(true);
    setShowForceLoginDialog(false);
    setError('');

    try {
      const response = await authAPI.login({ email: username, password, force_login: true });
      sessionStorage.setItem('access_token', response.data.access);
      sessionStorage.setItem('refresh_token', response.data.refresh);
      if (response.data.session_token) {
        sessionStorage.setItem('session_token', response.data.session_token);
      }
      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel force login
  const handleCancelForceLogin = () => {
    setShowForceLoginDialog(false);
    setExistingSessionInfo(null);
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setSuccessMessage('');
    setUsername('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setMobileNumber('');
    setAcceptedTerms(false);
    // Reset OTP states
    setRegistrationStep(1);
    setOtp('');
    setOtpSent(false);
    setEmailVerified(false);
    setResendTimer(0);
    // Reset force login states
    setShowForceLoginDialog(false);
    setExistingSessionInfo(null);
  };

  // Go back to previous step in registration
  const handleBackStep = () => {
    if (registrationStep === 2) {
      setRegistrationStep(1);
      setOtp('');
      setOtpSent(false);
    } else if (registrationStep === 3) {
      setRegistrationStep(2);
      setEmailVerified(false);
    }
    setError('');
    setSuccessMessage('');
  };

  // Get step title
  const getStepTitle = () => {
    if (!isRegisterMode) return 'Welcome Back';
    switch (registrationStep) {
      case 1: return 'Create Account';
      case 2: return 'Verify Email';
      case 3: return 'Complete Registration';
      default: return 'Create Account';
    }
  };

  // Get step description
  const getStepDescription = () => {
    if (!isRegisterMode) return 'Sign in to your account';
    switch (registrationStep) {
      case 1: return 'Enter your email to get started';
      case 2: return `Enter the OTP sent to ${username}`;
      case 3: return 'Fill in your details to complete registration';
      default: return 'Start managing invoices today';
    }
  };

  return (
    <>
      {/* Force Login Confirmation Dialog */}
      {showForceLoginDialog && (
        <div className="force-login-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="force-login-dialog" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                backgroundColor: '#fef3c7', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <span style={{ fontSize: '28px' }}>⚠️</span>
              </div>
              <h3 style={{ margin: '0 0 8px', color: '#1f2937', fontSize: '18px' }}>
                Already Logged In
              </h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                You are currently logged in on another device.
              </p>
            </div>
            
            {existingSessionInfo && (
              <div style={{
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#6b7280' }}>Device:</span>
                  <span style={{ color: '#374151', fontWeight: '500' }}>
                    {existingSessionInfo.deviceInfo || 'Unknown'}
                  </span>
                </div>
                {existingSessionInfo.lastActivity && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Last Active:</span>
                    <span style={{ color: '#374151', fontWeight: '500' }}>
                      {existingSessionInfo.lastActivity}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            <p style={{ 
              color: '#6b7280', 
              fontSize: '14px', 
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              Do you want to logout from the other device and login here?
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCancelForceLogin}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleForceLogin}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Logging in...' : 'Login Here'}
              </button>
            </div>
          </div>
        </div>
      )}
      
    <div className="login-split-container">
      {/* Left Panel - Features */}
      <div className="login-features-panel">
        <div className="features-content">
          <div className="features-header">
            <div className="brand-logo">
              <img src="/assets/NEXINVO_logo.png" alt="NexInvo Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain', maxWidth: '300px' }} />
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
        {/* Top Navigation Bar */}
        <div className="form-panel-nav">
          {onBackToLanding && (
            <button type="button" onClick={onBackToLanding} className="nav-logo-link">
              <img src="/assets/NEXINVO_logo.png" alt="NexInvo" className="nav-logo-icon" style={{ height: '80px', width: 'auto', objectFit: 'contain' }} />
            </button>
          )}
          {isRegisterMode && registrationStep > 1 && (
            <button
              type="button"
              onClick={handleBackStep}
              className="back-step-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          )}
        </div>

        <div className="login-card">
          <div className="login-header">
            <h2 className="login-title">{getStepTitle()}</h2>
            <p className="login-subtitle">{getStepDescription()}</p>
            {isRegisterMode && (
              <div className="registration-steps">
                <div className={`step ${registrationStep >= 1 ? 'active' : ''} ${registrationStep > 1 ? 'completed' : ''}`}>
                  <span className="step-number">{registrationStep > 1 ? '✓' : '1'}</span>
                  <span className="step-label">Email</span>
                </div>
                <div className={`step ${registrationStep >= 2 ? 'active' : ''} ${registrationStep > 2 ? 'completed' : ''}`}>
                  <span className="step-number">{registrationStep > 2 ? '✓' : '2'}</span>
                  <span className="step-label">Verify</span>
                </div>
                <div className={`step ${registrationStep >= 3 ? 'active' : ''}`}>
                  <span className="step-number">3</span>
                  <span className="step-label">Details</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {logoutMessage && (
              <div className="info-message" style={{
                backgroundColor: '#fef3c7',
                color: '#92400e',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                {logoutMessage}
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="success-message">
                {successMessage}
              </div>
            )}

            {/* Step 1: Email input (for registration) */}
            {isRegisterMode && registrationStep === 1 && (
              <div className="form-group">
                <label htmlFor="username">Email Address *</label>
                <input
                  id="username"
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
                <small className="form-help">We'll send a verification OTP to this email</small>
              </div>
            )}

            {/* Step 2: OTP verification */}
            {isRegisterMode && registrationStep === 2 && (
              <>
                <div className="form-group">
                  <label htmlFor="otp">Enter OTP *</label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(value);
                    }}
                    placeholder="Enter 6-digit OTP"
                    required
                    maxLength={6}
                    style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '20px' }}
                  />
                  <small className="form-help">
                    OTP sent to {username}. Valid for 10 minutes.
                  </small>
                </div>
                <div className="resend-otp-container">
                  {resendTimer > 0 ? (
                    <span className="resend-timer">Resend OTP in {resendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      className="resend-otp-btn"
                      onClick={handleResendOTP}
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Step 3: Complete registration (personal details) */}
            {isRegisterMode && registrationStep === 3 && (
              <>
                <div className="verified-email-badge">
                  <span className="verified-icon">✓</span>
                  <span className="verified-text">{username}</span>
                  <span className="verified-label">Verified</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name *</label>
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
                    <label htmlFor="lastName">Last Name *</label>
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
                  <label htmlFor="mobileNumber">Mobile Number *</label>
                  <input
                    id="mobileNumber"
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                  />
                  <small className="form-help">Enter 10-digit Indian mobile number</small>
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

                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      required
                      autoComplete="new-password"
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
              </>
            )}

            {/* Login form fields */}
            {!isRegisterMode && (
              <>
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
              </>
            )}

            {/* Consent checkbox - only shown in step 3 of registration */}
            {isRegisterMode && registrationStep === 3 && (
              <div className="form-group consent-group">
                <label className="consent-label">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="consent-checkbox"
                  />
                  <span className="consent-text">
                    I agree to the{' '}
                    <button type="button" className="link-button" onClick={() => setShowTerms(true)}>
                      Terms of Service
                    </button>
                    {' '}and{' '}
                    <button type="button" className="link-button" onClick={() => setShowPrivacyPolicy(true)}>
                      Privacy Policy
                    </button>
                  </span>
                </label>
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                isRegisterMode ? (
                  registrationStep === 1 ? 'Sending OTP...' :
                  registrationStep === 2 ? 'Verifying...' :
                  'Creating Account...'
                ) : 'Signing in...'
              ) : (
                isRegisterMode ? (
                  registrationStep === 1 ? 'Send OTP' :
                  registrationStep === 2 ? 'Verify OTP' :
                  'Create Account'
                ) : 'Sign In'
              )}
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

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <div className="modal-overlay" onClick={() => setShowPrivacyPolicy(false)}>
          <div className="modal-content legal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Privacy Policy</h2>
              <button className="modal-close" onClick={() => setShowPrivacyPolicy(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="legal-updated">Last Updated: {formatDate(new Date())}</p>

              <h3>1. Introduction</h3>
              <p>Chinmay Technosoft Private Limited ("we", "us", "our") operates NexInvo, a cloud-based invoice management application. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal data in compliance with the Information Technology Act, 2000, Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection Act, 2023 (DPDP Act).</p>

              <h3>2. Data Fiduciary Information</h3>
              <p><strong>Name:</strong> Chinmay Technosoft Private Limited</p>
              <p><strong>Contact:</strong> chinmaytechsoft@gmail.com</p>
              <p><strong>Address:</strong> India</p>

              <h3>3. Personal Data We Collect</h3>
              <p>We collect the following categories of personal data:</p>
              <ul>
                <li><strong>Identity Data:</strong> Name, email address, phone number</li>
                <li><strong>Business Data:</strong> Company name, GSTIN, PAN, business address</li>
                <li><strong>Financial Data:</strong> Invoice details, payment information, bank account details (for payment receipts)</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information, usage logs</li>
                <li><strong>Client Data:</strong> Information about your clients that you store in the system</li>
              </ul>

              <h3>4. Purpose of Data Processing</h3>
              <p>We process your personal data for:</p>
              <ul>
                <li>Providing invoice management services</li>
                <li>User authentication and account management</li>
                <li>Sending invoices and payment reminders on your behalf</li>
                <li>Generating reports and analytics</li>
                <li>Customer support and communication</li>
                <li>Legal compliance (GST, tax records)</li>
                <li>Service improvement and security</li>
              </ul>

              <h3>5. Legal Basis for Processing</h3>
              <p>Under DPDP Act, we process your data based on:</p>
              <ul>
                <li><strong>Consent:</strong> Your explicit consent provided during registration</li>
                <li><strong>Contract:</strong> To fulfill our service agreement with you</li>
                <li><strong>Legal Obligation:</strong> Compliance with tax and business laws</li>
                <li><strong>Legitimate Interests:</strong> Service improvement and security</li>
              </ul>

              <h3>6. Data Retention</h3>
              <p>We retain your personal data for:</p>
              <ul>
                <li>Active account data: Until account deletion</li>
                <li>Financial records: 8 years (as per Indian tax laws)</li>
                <li>Backup data: 30 days after deletion request</li>
                <li>Anonymized analytics: Indefinitely</li>
              </ul>

              <h3>7. Your Rights Under DPDP Act</h3>
              <p>As a Data Principal, you have the right to:</p>
              <ul>
                <li><strong>Access:</strong> Request information about your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate data</li>
                <li><strong>Erasure:</strong> Request deletion of your data (subject to legal retention requirements)</li>
                <li><strong>Data Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Withdraw Consent:</strong> Withdraw your consent at any time</li>
                <li><strong>Grievance Redressal:</strong> File complaints about data handling</li>
              </ul>

              <h3>8. Data Security</h3>
              <p>We implement reasonable security practices including:</p>
              <ul>
                <li>Encryption of data in transit (TLS/SSL)</li>
                <li>Secure password hashing</li>
                <li>Access controls and authentication</li>
                <li>Regular security audits</li>
                <li>Multi-tenant data isolation</li>
              </ul>

              <h3>9. Data Sharing</h3>
              <p>We may share your data with:</p>
              <ul>
                <li>Cloud service providers (hosting, storage)</li>
                <li>Email service providers (for sending invoices)</li>
                <li>Government authorities (if legally required)</li>
              </ul>
              <p>We do not sell your personal data to third parties.</p>

              <h3>10. Cross-Border Data Transfer</h3>
              <p>Your data may be processed on servers located outside India. We ensure adequate protection measures are in place as required by DPDP Act.</p>

              <h3>11. Data Breach Notification</h3>
              <p>In case of a personal data breach, we will notify the Data Protection Board of India and affected users as required under DPDP Act.</p>

              <h3>12. Grievance Officer</h3>
              <p>For any privacy-related concerns or to exercise your rights, contact our Grievance Officer:</p>
              <p><strong>Email:</strong> chinmaytechsoft@gmail.com</p>
              <p><strong>Response Time:</strong> Within 30 days of receiving your request</p>

              <h3>13. Changes to This Policy</h3>
              <p>We may update this policy periodically. We will notify you of significant changes via email or in-app notification.</p>

              <h3>14. Contact Us</h3>
              <p>For questions about this Privacy Policy, contact us at chinmaytechsoft@gmail.com</p>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowPrivacyPolicy(false)}>I Understand</button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="modal-overlay" onClick={() => setShowTerms(false)}>
          <div className="modal-content legal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Terms of Service</h2>
              <button className="modal-close" onClick={() => setShowTerms(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="legal-updated">Last Updated: {formatDate(new Date())}</p>

              <h3>1. Acceptance of Terms</h3>
              <p>By accessing or using NexInvo ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.</p>

              <h3>2. Description of Service</h3>
              <p>NexInvo is a cloud-based invoice management platform that allows businesses to:</p>
              <ul>
                <li>Create and manage invoices (Proforma and Tax Invoices)</li>
                <li>Track payments and generate receipts</li>
                <li>Manage client information</li>
                <li>Generate business reports</li>
                <li>Send automated payment reminders</li>
              </ul>

              <h3>3. User Accounts</h3>
              <p>You must:</p>
              <ul>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
              </ul>

              <h3>4. Acceptable Use</h3>
              <p>You agree NOT to:</p>
              <ul>
                <li>Use the Service for any unlawful purpose</li>
                <li>Create fraudulent invoices or financial documents</li>
                <li>Attempt to gain unauthorized access to any systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Upload malicious code or content</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>

              <h3>5. Data Ownership</h3>
              <p>You retain ownership of all data you upload to the Service. By using our Service, you grant us a limited license to process your data solely for providing the Service.</p>

              <h3>6. Subscription and Payment</h3>
              <ul>
                <li>Subscription plans and pricing are as displayed on our platform</li>
                <li>Payments are non-refundable unless otherwise stated</li>
                <li>We reserve the right to modify pricing with 30 days notice</li>
                <li>Service may be suspended for non-payment</li>
              </ul>

              <h3>7. Service Availability</h3>
              <p>We strive for 99.9% uptime but do not guarantee uninterrupted access. We may perform scheduled maintenance with advance notice.</p>

              <h3>8. Data Backup</h3>
              <p>While we maintain regular backups, you are responsible for maintaining your own copies of important data. We recommend regular data exports.</p>

              <h3>9. Intellectual Property</h3>
              <p>The Service, including its design, features, and content (excluding user data), is owned by Chinmay Technosoft Private Limited and protected by intellectual property laws.</p>

              <h3>10. Limitation of Liability</h3>
              <p>To the maximum extent permitted by law:</p>
              <ul>
                <li>The Service is provided "as is" without warranties</li>
                <li>We are not liable for indirect, incidental, or consequential damages</li>
                <li>Our total liability is limited to fees paid in the last 12 months</li>
              </ul>

              <h3>11. Indemnification</h3>
              <p>You agree to indemnify and hold harmless Chinmay Technosoft Private Limited from any claims arising from your use of the Service or violation of these Terms.</p>

              <h3>12. Termination</h3>
              <p>Either party may terminate the agreement:</p>
              <ul>
                <li>You may cancel your account at any time</li>
                <li>We may suspend or terminate for Terms violations</li>
                <li>Upon termination, your data will be available for export for 30 days</li>
              </ul>

              <h3>13. Governing Law</h3>
              <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India.</p>

              <h3>14. Compliance with Indian Laws</h3>
              <p>This Service complies with:</p>
              <ul>
                <li>Information Technology Act, 2000</li>
                <li>Digital Personal Data Protection Act, 2023</li>
                <li>Goods and Services Tax Act (for invoice compliance)</li>
              </ul>

              <h3>15. Modifications to Terms</h3>
              <p>We reserve the right to modify these Terms. Continued use after changes constitutes acceptance. Material changes will be notified via email.</p>

              <h3>16. Severability</h3>
              <p>If any provision of these Terms is found unenforceable, the remaining provisions will continue in effect.</p>

              <h3>17. Contact</h3>
              <p>For questions about these Terms, contact us at chinmaytechsoft@gmail.com</p>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowTerms(false)}>I Understand</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Login;
