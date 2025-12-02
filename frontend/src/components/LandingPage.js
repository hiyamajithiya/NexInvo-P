import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LandingPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function LandingPage({ onNavigateToLogin, onNavigateToSignup }) {
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Fetch subscription plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/subscription-plans/`);
        // Filter only active plans and sort by price
        const activePlans = response.data
          .filter(plan => plan.is_active)
          .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        setSubscriptionPlans(activePlans);
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
        // Fallback to default plans if API fails
        setSubscriptionPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  // Scroll to pricing section
  const scrollToPricing = (e) => {
    e.preventDefault();
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll to features section
  const scrollToFeatures = (e) => {
    e.preventDefault();
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Format price for display
  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) return '0';
    if (numPrice >= 1000) {
      return numPrice.toLocaleString('en-IN');
    }
    return numPrice.toString();
  };

  // Get billing period text
  const getBillingPeriod = (plan) => {
    if (plan.billing_period === 'monthly') return '/month';
    if (plan.billing_period === 'yearly') return '/year';
    if (plan.billing_period === 'lifetime') return ' one-time';
    return `/${plan.billing_period}`;
  };

  // Render Help Center page
  if (showHelpCenter) {
    return (
      <LandingHelpCenter onBack={() => setShowHelpCenter(false)} />
    );
  }

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

      {/* Pricing Section - Connected to API */}
      <section className="landing-pricing" id="pricing">
        <h2 className="section-title">Simple, Transparent Pricing</h2>
        <p className="section-subtitle">Start free, upgrade as you grow</p>
        <div className="pricing-cards">
          {loadingPlans ? (
            <div className="pricing-loading">Loading plans...</div>
          ) : subscriptionPlans.length > 0 ? (
            subscriptionPlans.map((plan, index) => (
              <div
                key={plan.id}
                className={`pricing-card ${plan.is_popular ? 'featured' : ''}`}
              >
                {plan.is_popular && <div className="pricing-badge">POPULAR</div>}
                <h3 className="pricing-name">{plan.name}</h3>
                <div className="pricing-price">
                  <span className="price-amount">₹{formatPrice(plan.price)}</span>
                  <span className="price-period">{getBillingPeriod(plan)}</span>
                </div>
                <ul className="pricing-features">
                  {plan.max_invoices === -1 ? (
                    <li>Unlimited Invoices</li>
                  ) : (
                    <li>Up to {plan.max_invoices} invoices/month</li>
                  )}
                  {plan.max_users === -1 ? (
                    <li>Unlimited Users</li>
                  ) : (
                    <li>Up to {plan.max_users} Users</li>
                  )}
                  {plan.max_clients === -1 ? (
                    <li>Unlimited Clients</li>
                  ) : (
                    <li>Up to {plan.max_clients} Clients</li>
                  )}
                  {plan.features && plan.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
                <button
                  className={`btn-pricing ${plan.is_popular ? 'featured' : ''}`}
                  onClick={onNavigateToSignup}
                >
                  {parseFloat(plan.price) === 0 ? 'Get Started' : 'Start Free Trial'}
                </button>
              </div>
            ))
          ) : (
            // Fallback to default plans if API fails
            <>
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
            </>
          )}
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
              <a href="#features" onClick={scrollToFeatures}>Features</a>
              <a href="#pricing" onClick={scrollToPricing}>Pricing</a>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#about">About Us</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="footer-column">
              <h4>Support</h4>
              <button
                className="footer-link-btn"
                onClick={() => setShowHelpCenter(true)}
              >
                Help Center
              </button>
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

// Landing Help Center Component
function LandingHelpCenter({ onBack }) {
  const [activeSection, setActiveSection] = useState('quick-start');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const sections = [
    { id: 'quick-start', title: 'Quick Start', icon: '⚡' },
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'features-overview', title: 'Features Overview', icon: '✨' },
    { id: 'invoices', title: 'Creating Invoices', icon: '📄' },
    { id: 'payments', title: 'Payment Tracking', icon: '💳' },
    { id: 'clients', title: 'Client Management', icon: '👥' },
    { id: 'reports', title: 'Reports', icon: '📈' },
    { id: 'pricing-plans', title: 'Pricing & Plans', icon: '💰' },
    { id: 'faq', title: 'FAQ', icon: '❓' },
  ];

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'quick-start':
        return <QuickStartSection />;
      case 'getting-started':
        return <GettingStartedSection />;
      case 'features-overview':
        return <FeaturesOverviewSection />;
      case 'invoices':
        return <InvoicesSection />;
      case 'payments':
        return <PaymentsSection />;
      case 'clients':
        return <ClientsSection />;
      case 'reports':
        return <ReportsSection />;
      case 'pricing-plans':
        return <PricingPlansSection />;
      case 'faq':
        return <FaqSection expandedFaq={expandedFaq} toggleFaq={toggleFaq} />;
      default:
        return <QuickStartSection />;
    }
  };

  return (
    <div className="landing-help-center">
      {/* Header */}
      <div className="help-header">
        <div className="help-header-content">
          <div className="help-logo-section">
            <button className="back-btn" onClick={onBack}>
              ← Back to Home
            </button>
            <div className="help-logo-icon">📖</div>
            <div>
              <h1>NexInvo Help Center</h1>
              <p className="help-subtitle">Complete Guide to Invoice Management</p>
            </div>
          </div>
          <div className="help-header-meta">
            <span className="version-badge">Version 1.0</span>
            <p>GST Compliant • India</p>
          </div>
        </div>
      </div>

      <div className="help-container">
        {/* Sidebar / TOC */}
        <aside className="help-sidebar">
          <div className="help-search">
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="help-search-input"
            />
            <span className="help-search-icon">🔍</span>
          </div>

          <nav className="help-toc">
            <h3 className="toc-title">Contents</h3>
            <ul className="toc-list">
              {filteredSections.map((section, index) => (
                <li key={section.id}>
                  <button
                    className={`toc-item ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span className="toc-number">{index + 1}</span>
                    <span className="toc-icon">{section.icon}</span>
                    <span className="toc-text">{section.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="help-content">
          {renderContent()}
        </main>
      </div>

      {/* Footer */}
      <footer className="help-footer">
        <div className="help-footer-content">
          <h3>Need More Help?</h3>
          <p>Email: <a href="mailto:chinmaytechsoft@gmail.com">chinmaytechsoft@gmail.com</a></p>
          <p>Response Time: Within 24-48 hours</p>
        </div>
      </footer>
    </div>
  );
}

// Quick Start Section
function QuickStartSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">⚡</div>
        <div>
          <h2>Quick Start Guide</h2>
          <p className="section-subtitle">Get up and running with NexInvo in minutes</p>
        </div>
      </div>

      <div className="process-diagram">
        <div className="process-step">
          <div className="process-icon">✓</div>
          <span className="process-label">Register</span>
        </div>
        <div className="process-connector"></div>
        <div className="process-step">
          <div className="process-icon">⚙️</div>
          <span className="process-label">Setup</span>
        </div>
        <div className="process-connector"></div>
        <div className="process-step">
          <div className="process-icon">👥</div>
          <span className="process-label">Add Clients</span>
        </div>
        <div className="process-connector"></div>
        <div className="process-step">
          <div className="process-icon">📄</div>
          <span className="process-label">Create Invoice</span>
        </div>
        <div className="process-connector"></div>
        <div className="process-step">
          <div className="process-icon">💰</div>
          <span className="process-label">Get Paid</span>
        </div>
      </div>

      <div className="info-box tip">
        <div className="info-box-icon">💡</div>
        <div className="info-box-content">
          <h5>Pro Tip</h5>
          <p>Complete your company settings before creating your first invoice. This ensures GST compliance and professional-looking invoices.</p>
        </div>
      </div>

      <h3>What You Can Do With NexInvo</h3>
      <ul className="feature-list">
        <li>Create professional GST-compliant invoices (Proforma & Tax)</li>
        <li>Manage your client database with complete details</li>
        <li>Track payments and generate receipts automatically</li>
        <li>Generate comprehensive business reports</li>
        <li>Send invoices directly via email</li>
        <li>Export data to Tally Prime</li>
        <li>Manage multiple organizations</li>
      </ul>
    </section>
  );
}

// Getting Started Section
function GettingStartedSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">🚀</div>
        <div>
          <h2>Getting Started</h2>
          <p className="section-subtitle">Create your account and begin invoicing</p>
        </div>
      </div>

      <h3>Registration Steps</h3>
      <ol className="steps">
        <li>Click on <strong>"Sign Up Free"</strong> button</li>
        <li>Enter your email address and verify with OTP</li>
        <li>Fill in your personal details (Name, Mobile, Company)</li>
        <li>Create a strong password</li>
        <li>Accept the Terms of Service and Privacy Policy</li>
        <li>Click <strong>"Create Account"</strong> - You're ready to go!</li>
      </ol>

      <h3>After Registration</h3>
      <ol className="steps">
        <li>Complete your company information in Settings</li>
        <li>Add your company logo</li>
        <li>Configure invoice numbering</li>
        <li>Set up email settings for sending invoices</li>
        <li>Add your first client</li>
        <li>Create your first invoice</li>
      </ol>

      <div className="info-box note">
        <div className="info-box-icon">📝</div>
        <div className="info-box-content">
          <h5>Free Plan Includes</h5>
          <p>Start with our free plan which includes essential features. Upgrade anytime as your business grows.</p>
        </div>
      </div>
    </section>
  );
}

// Features Overview Section
function FeaturesOverviewSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">✨</div>
        <div>
          <h2>Features Overview</h2>
          <p className="section-subtitle">Discover what NexInvo can do for your business</p>
        </div>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-card-icon blue">📄</div>
          <h5>Invoice Management</h5>
          <p>Create Proforma and Tax Invoices with GST compliance</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon green">💰</div>
          <h5>Payment Tracking</h5>
          <p>Track receipts, TDS deductions, and pending payments</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon purple">👥</div>
          <h5>Client Database</h5>
          <p>Manage client details, GST info, and history</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon orange">📊</div>
          <h5>Business Reports</h5>
          <p>Revenue, GST, TDS, and outstanding reports</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon indigo">🏢</div>
          <h5>Multi-Organization</h5>
          <p>Manage multiple businesses from one account</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon pink">📧</div>
          <h5>Email Integration</h5>
          <p>Send invoices and receipts directly to clients</p>
        </div>
      </div>
    </section>
  );
}

// Invoices Section
function InvoicesSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">📄</div>
        <div>
          <h2>Creating Invoices</h2>
          <p className="section-subtitle">Generate professional GST-compliant invoices</p>
        </div>
      </div>

      <h3>Invoice Types</h3>
      <div className="feature-grid two-col">
        <div className="feature-card">
          <div className="feature-card-icon orange">📋</div>
          <h5>Proforma Invoice</h5>
          <p>For quotations and estimates before confirming orders. Can be converted to Tax Invoice.</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon blue">📄</div>
          <h5>Tax Invoice</h5>
          <p>Official GST-compliant invoice for payment and accounting purposes.</p>
        </div>
      </div>

      <h3>Creating an Invoice</h3>
      <ol className="steps">
        <li>Navigate to <strong>Invoices</strong> section</li>
        <li>Click <strong>"Create Invoice"</strong></li>
        <li>Select invoice type (Proforma or Tax)</li>
        <li>Choose the client from your database</li>
        <li>Add line items with quantities and rates</li>
        <li>GST is calculated automatically based on settings</li>
        <li>Review and save the invoice</li>
        <li>Download PDF or send via email</li>
      </ol>

      <div className="info-box tip">
        <div className="info-box-icon">💡</div>
        <div className="info-box-content">
          <h5>Auto-Calculations</h5>
          <p>NexInvo automatically calculates subtotals, GST (CGST, SGST, IGST), and grand totals based on your settings and client location.</p>
        </div>
      </div>
    </section>
  );
}

// Payments Section
function PaymentsSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">💳</div>
        <div>
          <h2>Payment Tracking</h2>
          <p className="section-subtitle">Track receipts and manage outstanding payments</p>
        </div>
      </div>

      <h3>Recording a Receipt</h3>
      <ol className="steps">
        <li>Navigate to <strong>Receipts</strong> section</li>
        <li>Click <strong>"Record Receipt"</strong></li>
        <li>Select the unpaid invoice</li>
        <li>Enter receipt amount and payment method</li>
        <li>Add TDS details if applicable</li>
        <li>Save the receipt - it's automatically generated!</li>
      </ol>

      <h3>TDS Deduction</h3>
      <p>When your client deducts TDS (Tax Deducted at Source), you can record it:</p>
      <ul className="feature-list">
        <li>Enter the TDS percentage or amount</li>
        <li>System calculates net amount received</li>
        <li>Both Income Tax TDS and GST TDS supported</li>
        <li>TDS Summary report available for reconciliation</li>
      </ul>

      <div className="info-box note">
        <div className="info-box-icon">📝</div>
        <div className="info-box-content">
          <h5>Partial Payments</h5>
          <p>You can record multiple partial receipts against a single invoice. The invoice status automatically updates to "Paid" when fully settled.</p>
        </div>
      </div>
    </section>
  );
}

// Clients Section
function ClientsSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">👥</div>
        <div>
          <h2>Client Management</h2>
          <p className="section-subtitle">Maintain your client database</p>
        </div>
      </div>

      <h3>Adding a New Client</h3>
      <ol className="steps">
        <li>Go to <strong>Clients</strong> section</li>
        <li>Click <strong>"Add Client"</strong></li>
        <li>Enter basic details: Name, Email, Mobile</li>
        <li>Add address: Street, City, State, PIN Code</li>
        <li>Add tax details: GSTIN, PAN</li>
        <li>Save the client</li>
      </ol>

      <h3>Client Information</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Field</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td>Client Name</td><td>Full legal name of the client/company</td></tr>
            <tr><td>Client Code</td><td>Unique identifier (auto-generated if blank)</td></tr>
            <tr><td>Email</td><td>For sending invoices and receipts</td></tr>
            <tr><td>GSTIN</td><td>15-digit GST number for B2B invoices</td></tr>
            <tr><td>PAN</td><td>10-character PAN for TDS purposes</td></tr>
            <tr><td>State</td><td>Determines CGST/SGST vs IGST</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Reports Section
function ReportsSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">📈</div>
        <div>
          <h2>Reports</h2>
          <p className="section-subtitle">Comprehensive business analytics</p>
        </div>
      </div>

      <h3>Available Reports</h3>
      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-card-icon green">💰</div>
          <h5>Revenue Report</h5>
          <p>Total revenue with date-wise breakdown</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon orange">⚠️</div>
          <h5>Outstanding Report</h5>
          <p>Pending payments with aging analysis</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon red">📋</div>
          <h5>GST Summary</h5>
          <p>CGST, SGST, IGST breakdown</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon blue">👤</div>
          <h5>Client-wise Report</h5>
          <p>Revenue grouped by client</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon purple">💳</div>
          <h5>Receipt Report</h5>
          <p>All payment transactions</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon indigo">📊</div>
          <h5>TDS Summary</h5>
          <p>Income Tax and GST TDS deducted</p>
        </div>
      </div>

      <div className="info-box tip">
        <div className="info-box-icon">💡</div>
        <div className="info-box-content">
          <h5>Export Options</h5>
          <p>All reports can be exported to PDF or Excel. You can also export data to Tally Prime for seamless accounting integration.</p>
        </div>
      </div>
    </section>
  );
}

// Pricing Plans Section
function PricingPlansSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">💰</div>
        <div>
          <h2>Pricing & Plans</h2>
          <p className="section-subtitle">Choose the plan that fits your needs</p>
        </div>
      </div>

      <h3>Plan Comparison</h3>
      <p>NexInvo offers flexible pricing plans to suit businesses of all sizes:</p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Feature</th><th>Free</th><th>Professional</th><th>Enterprise</th></tr>
          </thead>
          <tbody>
            <tr><td>Invoices/Month</td><td>10</td><td>Unlimited</td><td>Unlimited</td></tr>
            <tr><td>Users</td><td>1</td><td>5</td><td>Unlimited</td></tr>
            <tr><td>Clients</td><td>10</td><td>Unlimited</td><td>Unlimited</td></tr>
            <tr><td>Reports</td><td>Basic</td><td>Advanced</td><td>Advanced</td></tr>
            <tr><td>Email Support</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr><td>Priority Support</td><td>-</td><td>✓</td><td>✓</td></tr>
            <tr><td>Custom Branding</td><td>-</td><td>✓</td><td>✓</td></tr>
            <tr><td>API Access</td><td>-</td><td>-</td><td>✓</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Upgrading Your Plan</h3>
      <ol className="steps">
        <li>Login to your NexInvo account</li>
        <li>Go to <strong>My Subscription</strong> or <strong>Upgrade Plan</strong></li>
        <li>Compare available plans</li>
        <li>Select the plan you want</li>
        <li>Complete the payment process</li>
        <li>Your new features are available immediately!</li>
      </ol>

      <div className="info-box note">
        <div className="info-box-icon">📝</div>
        <div className="info-box-content">
          <h5>Coupon Codes</h5>
          <p>Have a coupon code? You can apply it during checkout to get discounts on your subscription.</p>
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FaqSection({ expandedFaq, toggleFaq }) {
  const faqs = [
    {
      question: "Is NexInvo GST compliant?",
      answer: "Yes, NexInvo is fully GST compliant. It automatically calculates CGST, SGST, and IGST based on your business and client locations."
    },
    {
      question: "Can I try NexInvo for free?",
      answer: "Yes! We offer a free plan with essential features. You can create up to 10 invoices per month, manage clients, and generate basic reports."
    },
    {
      question: "How do I send invoices to my clients?",
      answer: "You can download invoices as PDF and share manually, or configure email settings to send invoices directly from NexInvo."
    },
    {
      question: "Can I track TDS deductions?",
      answer: "Yes, NexInvo supports both Income Tax TDS and GST TDS tracking. When recording receipts, you can enter TDS details and the system calculates net amounts automatically."
    },
    {
      question: "Can multiple users access the same account?",
      answer: "Yes, depending on your plan. Professional plan allows up to 5 users, and Enterprise offers unlimited users with role-based access control."
    },
    {
      question: "Can I manage multiple businesses?",
      answer: "Yes, NexInvo supports multi-organization management. You can create and switch between different organizations from a single account."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we use industry-standard encryption and security practices. Your data is stored securely and backed up regularly."
    },
    {
      question: "Can I export data to Tally?",
      answer: "Yes, NexInvo provides export functionality for Tally Prime. You can export invoices and receipts in XML or Excel format."
    }
  ];

  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">❓</div>
        <div>
          <h2>Frequently Asked Questions</h2>
          <p className="section-subtitle">Quick answers to common questions</p>
        </div>
      </div>

      <div className="faq-list">
        {faqs.map((faq, index) => (
          <div key={index} className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`}>
            <button className="faq-question" onClick={() => toggleFaq(index)}>
              <span className="faq-q-icon">Q</span>
              <span className="faq-q-text">{faq.question}</span>
              <span className="faq-toggle">{expandedFaq === index ? '−' : '+'}</span>
            </button>
            {expandedFaq === index && (
              <div className="faq-answer">
                <span className="faq-a-icon">A</span>
                <span>{faq.answer}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default LandingPage;
