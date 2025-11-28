import React, { useState } from 'react';
import './HelpCenter.css';

function HelpCenter() {
  const [activeSection, setActiveSection] = useState('quick-start');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const sections = [
    { id: 'quick-start', title: 'Quick Start', icon: '⚡' },
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'initial-setup', title: 'Initial Setup', icon: '⚙️' },
    { id: 'dashboard', title: 'Dashboard', icon: '📊' },
    { id: 'clients', title: 'Managing Clients', icon: '👥' },
    { id: 'services', title: 'Service Master', icon: '🔧' },
    { id: 'invoices', title: 'Creating Invoices', icon: '📄' },
    { id: 'payments', title: 'Recording Payments', icon: '💰' },
    { id: 'receipts', title: 'Receipts', icon: '🧾' },
    { id: 'reports', title: 'Reports', icon: '📈' },
    { id: 'settings', title: 'Settings', icon: '🔧' },
    { id: 'tally', title: 'Export to Tally', icon: '📥' },
    { id: 'organization', title: 'Organization', icon: '🏢' },
    { id: 'subscription', title: 'Subscription', icon: '💳' },
    { id: 'faq', title: 'FAQ', icon: '❓' },
    { id: 'shortcuts', title: 'Shortcuts', icon: '⌨️' },
    { id: 'glossary', title: 'Glossary', icon: '📚' },
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
      case 'initial-setup':
        return <InitialSetupSection />;
      case 'dashboard':
        return <DashboardSection />;
      case 'clients':
        return <ClientsSection />;
      case 'services':
        return <ServicesSection />;
      case 'invoices':
        return <InvoicesSection />;
      case 'payments':
        return <PaymentsSection />;
      case 'receipts':
        return <ReceiptsSection />;
      case 'reports':
        return <ReportsSection />;
      case 'settings':
        return <SettingsSection />;
      case 'tally':
        return <TallySection />;
      case 'organization':
        return <OrganizationSection />;
      case 'subscription':
        return <SubscriptionSection />;
      case 'faq':
        return <FaqSection expandedFaq={expandedFaq} toggleFaq={toggleFaq} />;
      case 'shortcuts':
        return <ShortcutsSection />;
      case 'glossary':
        return <GlossarySection />;
      default:
        return <QuickStartSection />;
    }
  };

  return (
    <div className="help-center">
      {/* Header */}
      <div className="help-header">
        <div className="help-header-content">
          <div className="help-logo-section">
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
          <h2>Quick Start Workflow</h2>
          <p className="section-subtitle">Your invoice creation journey at a glance</p>
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
          <h2>1. Getting Started</h2>
          <p className="section-subtitle">Register, login, and begin your journey</p>
        </div>
      </div>

      <h3>Registration (New Users)</h3>
      <ol className="steps">
        <li>Open the NexInvo application in your browser</li>
        <li>On the login page, click <strong>"Don't have an account? Register"</strong></li>
        <li>Fill in the registration form with your Email, Password, Name, and Company Name</li>
        <li>Check the box to accept <strong>Terms of Service</strong> and <strong>Privacy Policy</strong></li>
        <li>Click <strong>"Create Account"</strong> - You'll be automatically logged in!</li>
      </ol>

      <h3>Login Flow</h3>
      <div className="flowchart">
        <div className="flowchart-title">Login Process Flow</div>
        <div className="flow-container">
          <div className="flow-box start">🌐 Open NexInvo</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-box process">Enter Email & Password</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-box process">Click "Sign In"</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-box end">✓ Dashboard</div>
        </div>
      </div>

      <h3>Forgot Password?</h3>
      <ol className="steps">
        <li>Click <strong>"Forgot Password?"</strong> on the login page</li>
        <li>Enter your registered email address</li>
        <li>Check your email for password reset instructions</li>
        <li>Follow the link to create a new password</li>
      </ol>
    </section>
  );
}

// Initial Setup Section
function InitialSetupSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">⚙️</div>
        <div>
          <h2>2. Initial Setup</h2>
          <p className="section-subtitle">Configure your company before creating invoices</p>
        </div>
      </div>

      <div className="info-box important">
        <div className="info-box-icon">⚠️</div>
        <div className="info-box-content">
          <h5>Important</h5>
          <p>Complete these settings before creating your first invoice. This ensures GST compliance and proper invoice generation.</p>
        </div>
      </div>

      <div className="flowchart">
        <div className="flowchart-title">Initial Setup Process (4 Steps)</div>
        <div className="flow-container horizontal">
          <div className="flow-box action">Step 1<br/>Company Info</div>
          <div className="flow-arrow-right">→</div>
          <div className="flow-box action">Step 2<br/>Invoice Settings</div>
          <div className="flow-arrow-right">→</div>
          <div className="flow-box action">Step 3<br/>Email Settings</div>
          <div className="flow-arrow-right">→</div>
          <div className="flow-box action">Step 4<br/>Payment Terms</div>
        </div>
      </div>

      <h3>Step 1: Company Information</h3>
      <p>Navigate to <strong>Settings → Company Info</strong></p>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Description</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Company Name</strong> <span className="badge required">Required</span></td><td>Registered company name</td><td>ABC Technologies Pvt Ltd</td></tr>
            <tr><td>Trading Name</td><td>Business name (if different)</td><td>ABC Tech</td></tr>
            <tr><td>Address</td><td>Full business address</td><td>123, Business Park, MG Road</td></tr>
            <tr><td>City</td><td>City name</td><td>Mumbai</td></tr>
            <tr><td>State</td><td>Select from dropdown</td><td>Maharashtra</td></tr>
            <tr><td>PIN Code</td><td>Postal code</td><td>400001</td></tr>
            <tr><td>State Code</td><td>GST state code <span className="badge auto">Auto</span></td><td>27</td></tr>
            <tr><td><strong>GSTIN</strong> <span className="badge required">Required</span></td><td>15-digit GST number</td><td>27AABCU9603R1ZM</td></tr>
            <tr><td>GST Registration Date</td><td>When you registered for GST</td><td>01-07-2017</td></tr>
            <tr><td><strong>PAN</strong> <span className="badge required">Required</span></td><td>10-character PAN</td><td>AABCU9603R</td></tr>
            <tr><td>Phone</td><td>Contact number</td><td>+91 9876543210</td></tr>
            <tr><td>Email</td><td>Business email</td><td>info@abctech.com</td></tr>
          </tbody>
        </table>
      </div>

      <div className="info-box tip">
        <div className="info-box-icon">💡</div>
        <div className="info-box-content">
          <h5>Logo Upload</h5>
          <p>Upload your company logo (PNG/JPG, Max 2MB). Recommended size: 200x100 pixels for best display on invoices.</p>
        </div>
      </div>

      <h3>Step 2: Invoice Settings</h3>
      <p>Navigate to <strong>Settings → Invoice Settings</strong></p>

      <h4>Tax Invoice Settings</h4>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Field</th><th>Description</th><th>Recommended</th></tr>
          </thead>
          <tbody>
            <tr><td>Invoice Prefix</td><td>Prefix for invoice numbers</td><td><code>INV-</code></td></tr>
            <tr><td>Starting Number</td><td>First invoice number</td><td><code>1</code></td></tr>
          </tbody>
        </table>
      </div>

      <h4>General Settings</h4>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Field</th><th>Description</th><th>Recommended</th></tr>
          </thead>
          <tbody>
            <tr><td>Enable GST</td><td>Toggle ON if GST registered</td><td>✓ ON</td></tr>
            <tr><td>Default GST Rate</td><td>Standard GST rate</td><td>18%</td></tr>
            <tr><td>Payment Due Days</td><td>Default payment terms</td><td>30 days</td></tr>
            <tr><td>Terms & Conditions</td><td>Standard terms</td><td>(Enter your terms)</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Step 3: Email Settings (For Sending Invoices)</h3>
      <p>Navigate to <strong>Settings → Email Settings</strong></p>

      <h4>Gmail Configuration</h4>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Field</th><th>Value</th></tr>
          </thead>
          <tbody>
            <tr><td>SMTP Host</td><td><code>smtp.gmail.com</code></td></tr>
            <tr><td>SMTP Port</td><td><code>587</code></td></tr>
            <tr><td>SMTP Username</td><td>your-email@gmail.com</td></tr>
            <tr><td>SMTP Password</td><td>App Password (16-character)</td></tr>
            <tr><td>From Email</td><td>your-email@gmail.com</td></tr>
            <tr><td>Use TLS</td><td>✓ ON</td></tr>
          </tbody>
        </table>
      </div>

      <div className="info-box warning">
        <div className="info-box-icon">⚠️</div>
        <div className="info-box-content">
          <h5>Gmail App Password Required</h5>
          <p>Go to Google Account → Security → Enable 2-Step Verification → App Passwords → Create new password for "Mail". Use this 16-character password.</p>
        </div>
      </div>

      <h3>Step 4: Payment Terms</h3>
      <p>Navigate to <strong>Settings → Payment Terms</strong></p>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Term Name</th><th>Days</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td>Due on Receipt</td><td>0</td><td>Payment due immediately</td></tr>
            <tr><td>Net 15</td><td>15</td><td>Payment due in 15 days</td></tr>
            <tr><td>Net 30</td><td>30</td><td>Payment due in 30 days</td></tr>
            <tr><td>Net 45</td><td>45</td><td>Payment due in 45 days</td></tr>
            <tr><td>Net 60</td><td>60</td><td>Payment due in 60 days</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Dashboard Section
function DashboardSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">📊</div>
        <div>
          <h2>3. Dashboard Overview</h2>
          <p className="section-subtitle">Your business at a glance</p>
        </div>
      </div>

      <h3>Statistics Cards</h3>
      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-card-icon blue">📄</div>
          <h5>Total Invoices</h5>
          <p>Total number of invoices created</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon green">💰</div>
          <h5>Revenue</h5>
          <p>Total amount collected (Paid)</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon orange">⚠️</div>
          <h5>Pending</h5>
          <p>Outstanding amount (Unpaid)</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon purple">👥</div>
          <h5>Clients</h5>
          <p>Total number of clients</p>
        </div>
      </div>

      <h3>Navigation Menu</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Menu Item</th><th>Function</th></tr>
          </thead>
          <tbody>
            <tr><td>📊 Dashboard</td><td>Home/Overview</td></tr>
            <tr><td>📄 Invoices</td><td>Create and manage invoices</td></tr>
            <tr><td>👥 Clients</td><td>Manage client database</td></tr>
            <tr><td>🔧 Service Master</td><td>Create service items</td></tr>
            <tr><td>💳 Payments</td><td>Record payments</td></tr>
            <tr><td>📈 Reports</td><td>Generate various reports</td></tr>
            <tr><td>⚙️ Settings</td><td>Application configuration</td></tr>
            <tr><td>🏢 Organization</td><td>Manage team members</td></tr>
          </tbody>
        </table>
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
          <h2>4. Managing Clients</h2>
          <p className="section-subtitle">Build and maintain your client database</p>
        </div>
      </div>

      <h3>Adding a New Client</h3>
      <ol className="steps">
        <li>Navigate to <strong>Clients</strong> from the menu</li>
        <li>Click <strong>"Add Client"</strong> button</li>
        <li>Fill in Basic Information, Address, and Tax Information</li>
        <li>Click <strong>"Save Client"</strong></li>
      </ol>

      <h4>Client Details Form</h4>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Field</th><th>Required</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td>Client Name</td><td><span className="badge required">Yes</span></td><td>Full legal name</td></tr>
            <tr><td>Client Code</td><td><span className="badge optional">No</span></td><td>Unique identifier (auto-generated if blank)</td></tr>
            <tr><td>Email</td><td><span className="badge optional">No</span></td><td>For sending invoices</td></tr>
            <tr><td>Mobile</td><td><span className="badge optional">No</span></td><td>Contact number</td></tr>
            <tr><td>Address</td><td><span className="badge optional">No</span></td><td>Street address</td></tr>
            <tr><td>City</td><td><span className="badge optional">No</span></td><td>City name</td></tr>
            <tr><td>State</td><td><span className="badge optional">No</span></td><td>Select from dropdown</td></tr>
            <tr><td>GSTIN</td><td><span className="badge optional">No</span></td><td>15-character GST number</td></tr>
            <tr><td>PAN</td><td><span className="badge optional">No</span></td><td>10-character PAN</td></tr>
          </tbody>
        </table>
      </div>

      <div className="info-box note">
        <div className="info-box-icon">📝</div>
        <div className="info-box-content">
          <h5>Note</h5>
          <p>You cannot delete a client with existing invoices. This maintains data integrity for audit purposes.</p>
        </div>
      </div>
    </section>
  );
}

// Services Section
function ServicesSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">🔧</div>
        <div>
          <h2>5. Service Master</h2>
          <p className="section-subtitle">Pre-define services for quick invoicing</p>
        </div>
      </div>

      <h3>Adding a Service</h3>
      <ol className="steps">
        <li>Navigate to <strong>Service Master</strong></li>
        <li>Click <strong>"Add Service"</strong></li>
        <li>Enter Service Name, Description, SAC Code, and GST Rate</li>
        <li>Click <strong>"Save Service"</strong></li>
      </ol>

      <h3>Common SAC Codes (For CA/Professional Services)</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>SAC Code</th><th>Service Type</th></tr>
          </thead>
          <tbody>
            <tr><td><code>998311</code></td><td>Management consulting</td></tr>
            <tr><td><code>998312</code></td><td>Business consulting</td></tr>
            <tr><td><code>998313</code></td><td>IT consulting</td></tr>
            <tr><td><code>998221</code></td><td>Accounting, auditing & bookkeeping</td></tr>
            <tr><td><code>998231</code></td><td>Legal services</td></tr>
            <tr><td><code>998399</code></td><td>Other professional services</td></tr>
          </tbody>
        </table>
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
          <h2>6. Creating Invoices</h2>
          <p className="section-subtitle">Generate professional GST-compliant invoices</p>
        </div>
      </div>

      <div className="flowchart">
        <div className="flowchart-title">Invoice Creation Workflow</div>
        <div className="flow-container">
          <div className="flow-box start">📄 Create Invoice</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-box process">Select Type (Proforma / Tax)</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-box process">Select Client</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-box process">Add Line Items</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-box process">Review & Save</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-box end">✓ Send to Client</div>
        </div>
      </div>

      <h3>Invoice Types</h3>
      <div className="feature-grid two-col">
        <div className="feature-card">
          <div className="feature-card-icon orange">📋</div>
          <h5>Proforma Invoice</h5>
          <p>For quotations/estimates before confirming order</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon blue">📄</div>
          <h5>Tax Invoice</h5>
          <p>Official invoice for GST and payment purposes</p>
        </div>
      </div>

      <h3>Invoice Actions</h3>
      <div className="action-list">
        <div className="action-item">
          <div className="action-icon edit">✏️</div>
          <div>
            <span className="action-text">Edit</span>
            <p className="action-desc">Modify invoice details</p>
          </div>
        </div>
        <div className="action-item">
          <div className="action-icon download">📥</div>
          <div>
            <span className="action-text">Download PDF</span>
            <p className="action-desc">Download invoice as PDF</p>
          </div>
        </div>
        <div className="action-item">
          <div className="action-icon email">📧</div>
          <div>
            <span className="action-text">Send Email</span>
            <p className="action-desc">Email invoice to client</p>
          </div>
        </div>
        <div className="action-item">
          <div className="action-icon convert">🔄</div>
          <div>
            <span className="action-text">Convert</span>
            <p className="action-desc">Proforma → Tax Invoice</p>
          </div>
        </div>
        <div className="action-item">
          <div className="action-icon delete">🗑️</div>
          <div>
            <span className="action-text">Delete</span>
            <p className="action-desc">Delete invoice</p>
          </div>
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
        <div className="section-icon">💰</div>
        <div>
          <h2>7. Recording Payments</h2>
          <p className="section-subtitle">Track payments and TDS deductions</p>
        </div>
      </div>

      <h3>Recording a Payment</h3>
      <ol className="steps">
        <li>Navigate to <strong>Payments</strong></li>
        <li>Click <strong>"Record Payment"</strong></li>
        <li>Select the unpaid invoice from dropdown</li>
        <li>Enter payment details including TDS (if applicable)</li>
        <li>Click <strong>"Record Payment"</strong></li>
      </ol>

      <h3>Understanding TDS Calculation</h3>
      <div className="flowchart">
        <div className="flowchart-title">TDS Calculation Example</div>
        <div className="flow-container horizontal">
          <div className="flow-box process">Invoice Amount<br/><strong>₹10,000</strong></div>
          <div className="flow-arrow-right">→</div>
          <div className="flow-box action">TDS @10%<br/><strong>- ₹1,000</strong></div>
          <div className="flow-arrow-right">→</div>
          <div className="flow-box end">Amount Received<br/><strong>₹9,000</strong></div>
        </div>
      </div>

      <div className="info-box tip">
        <div className="info-box-icon">💡</div>
        <div className="info-box-content">
          <h5>Partial Payments</h5>
          <p>You can record multiple payments against a single invoice. Invoice status automatically changes to "Paid" when fully paid.</p>
        </div>
      </div>
    </section>
  );
}

// Receipts Section
function ReceiptsSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">🧾</div>
        <div>
          <h2>8. Receipts</h2>
          <p className="section-subtitle">Auto-generated payment receipts</p>
        </div>
      </div>

      <div className="info-box tip">
        <div className="info-box-icon">🎉</div>
        <div className="info-box-content">
          <h5>Automatic Generation</h5>
          <p>When you record a payment, a receipt is automatically generated with number sequence (RCPT-0001, RCPT-0002...)</p>
        </div>
      </div>

      <h3>Receipt Contents</h3>
      <div className="feature-grid three-col">
        <div className="feature-card">
          <div className="feature-card-icon blue">📄</div>
          <h5>Receipt Info</h5>
          <p>Number & Date</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon purple">👤</div>
          <h5>Client Details</h5>
          <p>Name & Address</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon green">💰</div>
          <h5>Payment Details</h5>
          <p>Amount, TDS, Method</p>
        </div>
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
          <h2>9. Reports</h2>
          <p className="section-subtitle">Comprehensive business analytics</p>
        </div>
      </div>

      <h3>Available Reports</h3>
      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-card-icon green">💰</div>
          <h5>Revenue Report</h5>
          <p>All invoices with amounts & status</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon orange">⚠️</div>
          <h5>Outstanding Report</h5>
          <p>Unpaid invoices with days overdue</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon red">📋</div>
          <h5>GST Summary</h5>
          <p>Tax breakdown: CGST, SGST, IGST</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon blue">👤</div>
          <h5>Client-wise Report</h5>
          <p>Revenue grouped by client</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon purple">💳</div>
          <h5>Payment Report</h5>
          <p>All payment transactions</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon indigo">📊</div>
          <h5>TDS Summary</h5>
          <p>TDS deducted by clients</p>
        </div>
      </div>
    </section>
  );
}

// Settings Section
function SettingsSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">⚙️</div>
        <div>
          <h2>10. Settings Configuration</h2>
          <p className="section-subtitle">Customize NexInvo to your needs</p>
        </div>
      </div>

      <h3>Users & Roles</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Role</th><th>Permissions</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Admin</strong></td><td>Full access to all features</td></tr>
            <tr><td><strong>User</strong></td><td>Create/edit invoices, clients, payments</td></tr>
            <tr><td><strong>Viewer</strong></td><td>View only - no editing</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Tally Section
function TallySection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">📥</div>
        <div>
          <h2>11. Exporting to Tally Prime</h2>
          <p className="section-subtitle">Seamless integration with your accounting software</p>
        </div>
      </div>

      <div className="flowchart">
        <div className="flowchart-title">Tally Prime Export Process</div>
        <div className="flow-container">
          <div className="flow-box start">📊 NexInvo Data</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-box process">Select Date Range</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-box action">Download XML/Excel</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-box end">✓ Import in Tally</div>
        </div>
      </div>

      <h3>Export Steps</h3>
      <ol className="steps">
        <li>Go to <strong>Settings → Export Data</strong></li>
        <li>Scroll down to <strong>"Export to Tally Prime"</strong> section</li>
        <li>Select date range (optional) and invoice type</li>
        <li>Click <strong>"Download XML"</strong> or <strong>"Download Excel"</strong></li>
        <li>Import the file in Tally Prime</li>
      </ol>

      <div className="info-box warning">
        <div className="info-box-icon">⚠️</div>
        <div className="info-box-content">
          <h5>Pre-Requirements</h5>
          <p>Before importing in Tally, ensure you have created the required ledgers: Sales, CGST, SGST, IGST, and all client party ledgers under Sundry Debtors.</p>
        </div>
      </div>
    </section>
  );
}

// Organization Section
function OrganizationSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">🏢</div>
        <div>
          <h2>12. Organization Management</h2>
          <p className="section-subtitle">Manage your team and multi-org access</p>
        </div>
      </div>

      <h3>Inviting Team Members</h3>
      <ol className="steps">
        <li>Navigate to <strong>Organization</strong></li>
        <li>Click <strong>"Invite Member"</strong></li>
        <li>Enter email address and select role</li>
        <li>Click <strong>"Send Invite"</strong></li>
      </ol>

      <div className="info-box note">
        <div className="info-box-icon">📝</div>
        <div className="info-box-content">
          <h5>Multi-Organization Support</h5>
          <p>Users can belong to multiple organizations and switch between them using the organization switcher in the header.</p>
        </div>
      </div>
    </section>
  );
}

// Subscription Section
function SubscriptionSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">💳</div>
        <div>
          <h2>13. Subscription & Plans</h2>
          <p className="section-subtitle">Manage your subscription</p>
        </div>
      </div>

      <h3>Viewing Current Subscription</h3>
      <div className="feature-grid three-col">
        <div className="feature-card">
          <div className="feature-card-icon blue">📄</div>
          <h5>Plan Details</h5>
          <p>Name, Status, Days Remaining</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon orange">📊</div>
          <h5>Usage Meters</h5>
          <p>Users, Invoices, Storage</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon green">🏷️</div>
          <h5>Coupon Codes</h5>
          <p>Apply for discounts</p>
        </div>
      </div>

      <h3>Upgrade Plan</h3>
      <ol className="steps">
        <li>Click on <strong>"Upgrade Plan"</strong> in the sidebar</li>
        <li>Compare available plans and features</li>
        <li>Select the plan that suits your needs</li>
        <li>Complete the payment process</li>
      </ol>
    </section>
  );
}

// FAQ Section
function FaqSection({ expandedFaq, toggleFaq }) {
  const faqs = [
    {
      question: "How do I change my invoice number format?",
      answer: "Go to Settings → Invoice Settings and change the Invoice Prefix (e.g., from \"INV-\" to \"ABC/INV/\")."
    },
    {
      question: "Can I edit a sent invoice?",
      answer: "No, sent invoices cannot be edited to maintain audit trail. Create a new corrected invoice if needed."
    },
    {
      question: "Why can't I delete a client?",
      answer: "Clients with existing invoices cannot be deleted. You can deactivate them instead."
    },
    {
      question: "How do I track partial payments?",
      answer: "Record each payment separately against the same invoice. The system tracks the balance automatically."
    },
    {
      question: "What is the difference between Proforma and Tax Invoice?",
      answer: "Proforma: A quotation/estimate before confirming the order. Tax Invoice: The official invoice for GST and payment purposes."
    },
    {
      question: "How do I export data for Tally?",
      answer: "Go to Settings → Export Data → Export to Tally Prime section. Download XML or Excel file and import in Tally."
    },
    {
      question: "Can multiple users access the same organization?",
      answer: "Yes, you can invite team members from Organization settings. Each user can have different roles (Admin, User, Viewer)."
    },
    {
      question: "How does TDS deduction work?",
      answer: "When recording a payment, enter the TDS percentage. The system calculates TDS amount and records the net amount received."
    }
  ];

  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">❓</div>
        <div>
          <h2>14. Frequently Asked Questions</h2>
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

// Shortcuts Section
function ShortcutsSection() {
  const shortcuts = [
    { action: 'New Invoice', keys: 'Ctrl + N' },
    { action: 'Save', keys: 'Ctrl + S' },
    { action: 'Print/Download PDF', keys: 'Ctrl + P' },
    { action: 'Cancel/Close', keys: 'Esc' },
    { action: 'Search', keys: 'Ctrl + K' },
    { action: 'Quick Navigation', keys: 'Ctrl + /' },
  ];

  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">⌨️</div>
        <div>
          <h2>Keyboard Shortcuts</h2>
          <p className="section-subtitle">Work faster with shortcuts</p>
        </div>
      </div>

      <div className="shortcuts-grid">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="shortcut-item">
            <span className="shortcut-action">{shortcut.action}</span>
            <span className="shortcut-keys">
              {shortcut.keys.split(' + ').map((key, i) => (
                <span key={i}>
                  <kbd className="kbd">{key}</kbd>
                  {i < shortcut.keys.split(' + ').length - 1 && ' + '}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Glossary Section
function GlossarySection() {
  const terms = [
    { term: 'GSTIN', definition: '15-digit GST Identification Number' },
    { term: 'PAN', definition: '10-digit Permanent Account Number' },
    { term: 'HSN', definition: 'Harmonized System of Nomenclature (for goods)' },
    { term: 'SAC', definition: 'Services Accounting Code (for services)' },
    { term: 'CGST', definition: 'Central Goods and Services Tax' },
    { term: 'SGST', definition: 'State Goods and Services Tax' },
    { term: 'IGST', definition: 'Integrated Goods and Services Tax' },
    { term: 'TDS', definition: 'Tax Deducted at Source' },
    { term: 'Proforma Invoice', definition: 'A quotation or estimate before final billing' },
    { term: 'Tax Invoice', definition: 'Official GST-compliant invoice for payment' },
  ];

  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">📚</div>
        <div>
          <h2>Glossary</h2>
          <p className="section-subtitle">Key terms and definitions</p>
        </div>
      </div>

      <div className="glossary-grid">
        {terms.map((item, index) => (
          <div key={index} className="glossary-item">
            <div className="glossary-term">{item.term}</div>
            <p className="glossary-def">{item.definition}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HelpCenter;
