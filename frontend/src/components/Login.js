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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate consent for registration
    if (isRegisterMode && !acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy to create an account.');
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
    setAcceptedTerms(false);
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
          {isRegisterMode && (
            <button
              type="button"
              onClick={toggleMode}
              className="back-to-login-btn"
            >
              ← Back to Sign In
            </button>
          )}
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

            {isRegisterMode && (
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

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <div className="modal-overlay" onClick={() => setShowPrivacyPolicy(false)}>
          <div className="modal-content legal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Privacy Policy</h2>
              <button className="modal-close" onClick={() => setShowPrivacyPolicy(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="legal-updated">Last Updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

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
              <p className="legal-updated">Last Updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

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
  );
};

export default Login;
