import React from 'react';
import './LandingPage.css';

function LandingPage({ onNavigateToLogin, onNavigateToSignup }) {
  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-content">
          <div className="landing-logo">
            <span className="landing-logo-icon">📊</span>
            <span className="landing-logo-text">NexInvo</span>
          </div>
          <div className="landing-nav-buttons">
            <button className="btn-nav-login" onClick={onNavigateToLogin}>
              Login
            </button>
            <button className="btn-nav-signup" onClick={onNavigateToSignup}>
              Sign Up Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Smart Invoice Management for
            <span className="hero-highlight"> Growing Businesses</span>
          </h1>
          <p className="hero-subtitle">
            Create professional invoices, track payments, manage clients, and grow your business
            with NexInvo - the complete invoicing solution trusted by thousands of businesses.
          </p>
          <div className="hero-buttons">
            <button className="btn-hero-primary" onClick={onNavigateToSignup}>
              Get Started Free
            </button>
            <button className="btn-hero-secondary" onClick={onNavigateToLogin}>
              Login to Dashboard
            </button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-number">10,000+</span>
              <span className="stat-label">Invoices Created</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">500+</span>
              <span className="stat-label">Happy Businesses</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-dashboard-preview">
            <div className="preview-header">
              <div className="preview-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="preview-title">Dashboard</span>
            </div>
            <div className="preview-content">
              <div className="preview-card blue">
                <span className="preview-card-icon">📄</span>
                <span className="preview-card-value">156</span>
                <span className="preview-card-label">Invoices</span>
              </div>
              <div className="preview-card green">
                <span className="preview-card-icon">💰</span>
                <span className="preview-card-value">₹2.5L</span>
                <span className="preview-card-label">Revenue</span>
              </div>
              <div className="preview-card purple">
                <span className="preview-card-icon">👥</span>
                <span className="preview-card-value">48</span>
                <span className="preview-card-label">Clients</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features" id="features">
        <div className="features-header">
          <h2 className="features-title">Everything You Need to Manage Invoices</h2>
          <p className="features-subtitle">
            Powerful features designed to save time and help you get paid faster
          </p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon blue">📄</div>
            <h3 className="feature-title">Professional Invoices</h3>
            <p className="feature-description">
              Create stunning GST-compliant invoices in seconds with customizable templates,
              automatic calculations, and professional formatting.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon green">💳</div>
            <h3 className="feature-title">Payment Tracking</h3>
            <p className="feature-description">
              Track payments, send reminders, and manage TDS deductions. Know exactly
              who owes you and when payments are due.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon purple">👥</div>
            <h3 className="feature-title">Client Management</h3>
            <p className="feature-description">
              Maintain a complete client database with contact details, GST information,
              and transaction history all in one place.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon orange">📊</div>
            <h3 className="feature-title">Real-Time Reports</h3>
            <p className="feature-description">
              Get insights with detailed reports - revenue analysis, GST summary,
              TDS reports, and client-wise breakdowns.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon indigo">🏢</div>
            <h3 className="feature-title">Multi-Tenant SaaS</h3>
            <p className="feature-description">
              Perfect for agencies managing multiple businesses. Each organization
              gets isolated data with role-based access control.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon pink">📧</div>
            <h3 className="feature-title">Email Integration</h3>
            <p className="feature-description">
              Send invoices and receipts directly to clients via email.
              Configure your own SMTP for branded communications.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-how-it-works">
        <div className="how-it-works-content">
          <h2 className="section-title">Get Started in 3 Simple Steps</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h3 className="step-title">Sign Up</h3>
              <p className="step-description">
                Create your free account in under a minute. No credit card required.
              </p>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">2</div>
              <h3 className="step-title">Setup Your Business</h3>
              <p className="step-description">
                Add your company details, logo, and configure invoice settings.
              </p>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">3</div>
              <h3 className="step-title">Start Invoicing</h3>
              <p className="step-description">
                Create your first invoice and send it to clients instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="landing-pricing">
        <h2 className="section-title">Simple, Transparent Pricing</h2>
        <p className="section-subtitle">Start free, upgrade as you grow</p>
        <div className="pricing-cards">
          <div className="pricing-card">
            <h3 className="pricing-name">Free</h3>
            <div className="pricing-price">
              <span className="price-amount">₹0</span>
              <span className="price-period">/month</span>
            </div>
            <ul className="pricing-features">
              <li>Up to 10 invoices/month</li>
              <li>1 User</li>
              <li>Basic Reports</li>
              <li>Email Support</li>
            </ul>
            <button className="btn-pricing" onClick={onNavigateToSignup}>
              Get Started
            </button>
          </div>
          <div className="pricing-card featured">
            <div className="pricing-badge">POPULAR</div>
            <h3 className="pricing-name">Professional</h3>
            <div className="pricing-price">
              <span className="price-amount">₹499</span>
              <span className="price-period">/month</span>
            </div>
            <ul className="pricing-features">
              <li>Unlimited Invoices</li>
              <li>Up to 5 Users</li>
              <li>Advanced Reports</li>
              <li>Priority Support</li>
              <li>Custom Branding</li>
            </ul>
            <button className="btn-pricing featured" onClick={onNavigateToSignup}>
              Start Free Trial
            </button>
          </div>
          <div className="pricing-card">
            <h3 className="pricing-name">Enterprise</h3>
            <div className="pricing-price">
              <span className="price-amount">₹999</span>
              <span className="price-period">/month</span>
            </div>
            <ul className="pricing-features">
              <li>Everything in Pro</li>
              <li>Unlimited Users</li>
              <li>API Access</li>
              <li>Dedicated Support</li>
              <li>Custom Integrations</li>
            </ul>
            <button className="btn-pricing" onClick={onNavigateToSignup}>
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Streamline Your Invoicing?</h2>
          <p className="cta-subtitle">
            Join thousands of businesses already using NexInvo to manage their finances.
          </p>
          <button className="btn-cta" onClick={onNavigateToSignup}>
            Start Your Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="landing-logo">
              <span className="landing-logo-icon">📊</span>
              <span className="landing-logo-text">NexInvo</span>
            </div>
            <p className="footer-tagline">
              Modern invoice management for growing businesses.
            </p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#demo">Demo</a>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#about">About Us</a>
              <a href="#contact">Contact</a>
              <a href="#careers">Careers</a>
            </div>
            <div className="footer-column">
              <h4>Support</h4>
              <a href="#help">Help Center</a>
              <a href="#docs">Documentation</a>
              <a href="#api">API</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Chinmay Technosoft Private Limited. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
