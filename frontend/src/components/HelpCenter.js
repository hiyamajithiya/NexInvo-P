import React, { useState } from 'react';
import './HelpCenter.css';
import { useOrganization } from '../contexts/OrganizationContext';

// Get version from environment variable (set in .env file)
const APP_VERSION = process.env.REACT_APP_VERSION || '1.0.0';

function HelpCenter() {
  const [activeSection, setActiveSection] = useState('quick-start');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Get current organization to determine user role
  const { currentOrganization } = useOrganization();
  const userRole = currentOrganization?.role || 'viewer';
  const isViewer = userRole === 'viewer';
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  // Define all sections with role-based visibility
  const allSections = [
    { id: 'quick-start', title: 'Quick Start', icon: '⚡', roles: ['owner', 'admin', 'user', 'viewer'] },
    { id: 'dashboard', title: 'Dashboard', icon: '🏠', roles: ['owner', 'admin', 'user', 'viewer'] },
    { id: 'invoices', title: 'Invoices', icon: '📄', roles: ['owner', 'admin', 'user', 'viewer'] },
    { id: 'clients', title: 'Clients', icon: '👥', roles: ['owner', 'admin', 'user', 'viewer'] },
    { id: 'services', title: 'Service Master', icon: '📋', roles: ['owner', 'admin', 'user'] },
    { id: 'receipts', title: 'Receipts', icon: '🧾', roles: ['owner', 'admin', 'user', 'viewer'] },
    { id: 'reports', title: 'Reports', icon: '📊', roles: ['owner', 'admin', 'user', 'viewer'] },
    { id: 'settings', title: 'Settings', icon: '⚙️', roles: ['owner', 'admin'] },
    { id: 'organization', title: 'Organization', icon: '🏢', roles: ['owner', 'admin'] },
    { id: 'subscription', title: 'Subscription', icon: '💼', roles: ['owner', 'admin', 'user', 'viewer'] },
    { id: 'profile', title: 'Profile', icon: '👤', roles: ['owner', 'admin', 'user', 'viewer'] },
    { id: 'faq', title: 'FAQ', icon: '❓', roles: ['owner', 'admin', 'user', 'viewer'] },
    { id: 'glossary', title: 'Glossary', icon: '📚', roles: ['owner', 'admin', 'user', 'viewer'] },
  ];

  // Filter sections based on user role
  const sections = allSections.filter(section => section.roles.includes(userRole));

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'quick-start':
        return <QuickStartSection isViewer={isViewer} userRole={userRole} />;
      case 'dashboard':
        return <DashboardSection isViewer={isViewer} />;
      case 'invoices':
        return <InvoicesSection isViewer={isViewer} />;
      case 'clients':
        return <ClientsSection isViewer={isViewer} />;
      case 'services':
        return <ServicesSection />;
      case 'receipts':
        return <ReceiptsSection isViewer={isViewer} />;
      case 'reports':
        return <ReportsSection />;
      case 'settings':
        return <SettingsSection />;
      case 'organization':
        return <OrganizationSection isOwnerOrAdmin={isOwnerOrAdmin} />;
      case 'subscription':
        return <SubscriptionSection isViewer={isViewer} />;
      case 'profile':
        return <ProfileSection />;
      case 'faq':
        return <FaqSection expandedFaq={expandedFaq} toggleFaq={toggleFaq} isViewer={isViewer} />;
      case 'glossary':
        return <GlossarySection />;
      default:
        return <QuickStartSection isViewer={isViewer} userRole={userRole} />;
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
            <span className="version-badge">Version {APP_VERSION}</span>
            <p>GST Compliant Invoice System</p>
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
function QuickStartSection({ isViewer, userRole }) {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">⚡</div>
        <div>
          <h2>Quick Start Guide</h2>
          <p className="section-subtitle">
            {isViewer
              ? 'Welcome to NexInvo - Your view-only access guide'
              : 'Get started with NexInvo in 5 simple steps'}
          </p>
        </div>
      </div>

      {isViewer ? (
        <>
          <div className="info-box note">
            <div className="info-box-icon">👁️</div>
            <div className="info-box-content">
              <h5>Viewer Access</h5>
              <p>You have view-only access to this organization. You can view invoices, clients, receipts, and download/email reports, but cannot create, edit, or delete records.</p>
            </div>
          </div>

          <h3>What You Can Do</h3>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-card-icon blue">📄</div>
              <h5>View Invoices</h5>
              <p>Browse all invoices and download PDFs</p>
            </div>
            <div className="feature-card">
              <div className="feature-card-icon green">👥</div>
              <h5>View Clients</h5>
              <p>Access client information and details</p>
            </div>
            <div className="feature-card">
              <div className="feature-card-icon orange">🧾</div>
              <h5>View Receipts</h5>
              <p>Browse payment receipts and records</p>
            </div>
            <div className="feature-card">
              <div className="feature-card-icon purple">📊</div>
              <h5>Reports</h5>
              <p>Generate, download, and email reports</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="process-diagram">
            <div className="process-step">
              <div className="process-icon">⚙️</div>
              <span className="process-label">Setup Company</span>
            </div>
            <div className="process-connector"></div>
            <div className="process-step">
              <div className="process-icon">👥</div>
              <span className="process-label">Add Clients</span>
            </div>
            <div className="process-connector"></div>
            <div className="process-step">
              <div className="process-icon">📋</div>
              <span className="process-label">Add Services</span>
            </div>
            <div className="process-connector"></div>
            <div className="process-step">
              <div className="process-icon">📄</div>
              <span className="process-label">Create Invoice</span>
            </div>
            <div className="process-connector"></div>
            <div className="process-step">
              <div className="process-icon">🧾</div>
              <span className="process-label">Record Receipt</span>
            </div>
          </div>

          <div className="info-box tip">
            <div className="info-box-icon">💡</div>
            <div className="info-box-content">
              <h5>First Time User?</h5>
              <p>When you first login, an onboarding wizard will guide you through the initial setup process. Make sure to complete your Company Settings before creating invoices.</p>
            </div>
          </div>
        </>
      )}

      <h3>Application Menu</h3>
      <p>The sidebar navigation includes:</p>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Menu Item</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td>🏠 Dashboard</td><td>Overview with statistics cards showing Total Invoices, Revenue, Pending Amount, and Clients count</td></tr>
            <tr><td>📄 Invoices</td><td>{isViewer ? 'View and download Proforma and Tax Invoices' : 'Create, view, edit, and manage Proforma and Tax Invoices'}</td></tr>
            <tr><td>👥 Clients</td><td>{isViewer ? 'View client database with GST details' : 'Manage your client database with GST details'}</td></tr>
            {!isViewer && <tr><td>📋 Service Master</td><td>Pre-define services with SAC codes and GST rates</td></tr>}
            <tr><td>🧾 Receipts</td><td>{isViewer ? 'View payment receipts' : 'Record payments and view auto-generated receipts'}</td></tr>
            <tr><td>📊 Reports</td><td>Generate, download, and email business reports</td></tr>
            {(userRole === 'owner' || userRole === 'admin') && (
              <>
                <tr><td>⚙️ Settings</td><td>Configure company, invoice, email settings and payment terms</td></tr>
                <tr><td>🏢 Organization</td><td>Manage team members and organization settings</td></tr>
              </>
            )}
            <tr><td>💼 My Subscription</td><td>View subscription details and upgrade plans</td></tr>
            <tr><td>❓ Help & Guide</td><td>This help documentation</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Dashboard Section
function DashboardSection({ isViewer }) {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">🏠</div>
        <div>
          <h2>Dashboard</h2>
          <p className="section-subtitle">Your business overview at a glance</p>
        </div>
      </div>

      {isViewer && (
        <div className="info-box note">
          <div className="info-box-icon">👁️</div>
          <div className="info-box-content">
            <h5>Viewer Access</h5>
            <p>As a viewer, you can see all dashboard statistics but cannot create or modify any data.</p>
          </div>
        </div>
      )}

      <h3>Statistics Cards</h3>
      <p>The dashboard displays four main statistics cards:</p>
      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-card-icon blue">📄</div>
          <h5>Total Invoices</h5>
          <p>Total number of invoices created (all time). Click to go to Invoices page.</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon green">💰</div>
          <h5>Revenue</h5>
          <p>Total amount collected from paid invoices. Click to go to Receipts page.</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon orange">⏳</div>
          <h5>Pending</h5>
          <p>Outstanding amount from unpaid invoices. Click to go to Invoices page.</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon purple">👥</div>
          <h5>Clients</h5>
          <p>Total number of clients in your database. Click to go to Clients page.</p>
        </div>
      </div>

      <h3>Subscription Plan Details</h3>
      <p>If you have an active subscription, the dashboard shows additional cards:</p>
      <ul className="steps">
        <li><strong>Plan Name & Days Remaining</strong> - Shows your current plan, days remaining, and subscription status</li>
        <li><strong>Users</strong> - Current users vs maximum allowed, with a progress bar</li>
        <li><strong>Invoices (This Month)</strong> - Monthly invoice usage vs limit</li>
        <li><strong>Storage</strong> - Available storage and next billing date</li>
      </ul>

      <div className="info-box note">
        <div className="info-box-icon">📝</div>
        <div className="info-box-content">
          <h5>No Active Subscription?</h5>
          <p>If you don't have an active subscription, a warning box will appear with a "View Subscription Plans" button to help you subscribe.</p>
        </div>
      </div>
    </section>
  );
}

// Invoices Section
function InvoicesSection({ isViewer }) {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">📄</div>
        <div>
          <h2>Invoices</h2>
          <p className="section-subtitle">{isViewer ? 'View and download GST-compliant invoices' : 'Create and manage GST-compliant invoices'}</p>
        </div>
      </div>

      {isViewer && (
        <div className="info-box note">
          <div className="info-box-icon">👁️</div>
          <div className="info-box-content">
            <h5>Viewer Access</h5>
            <p>You can view, search, and download invoice PDFs, but cannot create, edit, or delete invoices.</p>
          </div>
        </div>
      )}

      <h3>Invoice Types</h3>
      <p>NexInvo supports two types of invoices, displayed in separate tabs:</p>
      <div className="feature-grid two-col">
        <div className="feature-card">
          <div className="feature-card-icon orange">📋</div>
          <h5>Proforma Invoice</h5>
          <p>A preliminary invoice sent before the final billing. Used as a quotation or estimate.</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon blue">📄</div>
          <h5>Tax Invoice</h5>
          <p>The official GST-compliant invoice for payment and tax purposes.</p>
        </div>
      </div>

      {!isViewer && (
        <>
          <h3>Creating an Invoice</h3>
          <ol className="steps">
            <li>Click <strong>"Create Invoice"</strong> button</li>
            <li>Select Invoice Type (Proforma or Tax Invoice)</li>
            <li>Select a Client from the dropdown</li>
            <li>Add line items by selecting services or entering custom items</li>
            <li>Set quantity and rate for each item</li>
            <li>Review GST calculation (auto-calculated based on settings)</li>
            <li>Add any notes or terms</li>
            <li>Click <strong>"Save"</strong> to create the invoice</li>
          </ol>
        </>
      )}

      <h3>{isViewer ? 'Available Actions' : 'Invoice Actions'}</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Action</th><th>Icon</th><th>Description</th></tr>
          </thead>
          <tbody>
            {!isViewer && <tr><td>Edit</td><td>✏️</td><td>Modify invoice details</td></tr>}
            <tr><td>Download PDF</td><td>📄</td><td>Download invoice as PDF file</td></tr>
            <tr><td>Send Email</td><td>📧</td><td>Email invoice directly to client</td></tr>
            {!isViewer && <tr><td>Convert to Tax Invoice</td><td>🔄</td><td>Convert Proforma to Tax Invoice (for unpaid proforma only)</td></tr>}
            {!isViewer && <tr><td>Delete</td><td>🗑️</td><td>Delete the invoice</td></tr>}
          </tbody>
        </table>
      </div>

      {!isViewer && (
        <>
          <h3>Multi-Select & Bulk Actions</h3>
          <p>You can select multiple invoices using the checkboxes and perform bulk actions:</p>
          <ul className="steps">
            <li><strong>Select All</strong> - Use the checkbox in the header to select all invoices</li>
            <li><strong>Send Email</strong> - Send emails to all selected invoices</li>
            <li><strong>Download</strong> - Download PDFs for all selected invoices</li>
            <li><strong>Print</strong> - Open print dialog for selected invoices</li>
            <li><strong>Delete</strong> - Delete all selected invoices (with confirmation)</li>
          </ul>

          <h3>Import Invoices</h3>
          <p>You can import invoices from Excel files:</p>
          <ol className="steps">
            <li>Click <strong>"Import Invoices"</strong> button</li>
            <li>Download the Excel template</li>
            <li>Fill in your invoice data in the template</li>
            <li>Upload the filled template</li>
            <li>The system will auto-create clients and services if they don't exist</li>
          </ol>
        </>
      )}

      <h3>Search & Filter</h3>
      <ul className="steps">
        <li>Use the search box to find invoices by invoice number or client name</li>
        <li>Filter by Status: All Status, Draft, Sent, Paid</li>
        <li>Switch between Proforma and Tax Invoice tabs</li>
      </ul>
    </section>
  );
}

// Clients Section
function ClientsSection({ isViewer }) {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">👥</div>
        <div>
          <h2>Clients</h2>
          <p className="section-subtitle">{isViewer ? 'View client database' : 'Manage your client database'}</p>
        </div>
      </div>

      {isViewer && (
        <div className="info-box note">
          <div className="info-box-icon">👁️</div>
          <div className="info-box-content">
            <h5>Viewer Access</h5>
            <p>You can view and search client information but cannot add, edit, or delete clients.</p>
          </div>
        </div>
      )}

      {!isViewer && (
        <>
          <h3>Adding a New Client</h3>
          <ol className="steps">
            <li>Navigate to <strong>Clients</strong> from the sidebar</li>
            <li>Click <strong>"Add Client"</strong> button</li>
            <li>Fill in the client details</li>
            <li>Click <strong>"Save Client"</strong></li>
          </ol>
        </>
      )}

      <h3>Client Information Fields</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Field</th><th>Required</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td>Client Name</td><td><span className="badge required">Yes</span></td><td>Full legal name of the client</td></tr>
            <tr><td>Client Code</td><td><span className="badge optional">No</span></td><td>Unique identifier (auto-generated if blank)</td></tr>
            <tr><td>Email</td><td><span className="badge optional">No</span></td><td>Used for sending invoices via email</td></tr>
            <tr><td>Mobile</td><td><span className="badge optional">No</span></td><td>Contact phone number</td></tr>
            <tr><td>Address</td><td><span className="badge optional">No</span></td><td>Street address</td></tr>
            <tr><td>City</td><td><span className="badge optional">No</span></td><td>City name</td></tr>
            <tr><td>State</td><td><span className="badge optional">No</span></td><td>Select from dropdown (Indian states)</td></tr>
            <tr><td>PIN Code</td><td><span className="badge optional">No</span></td><td>Postal code</td></tr>
            <tr><td>GSTIN</td><td><span className="badge optional">No</span></td><td>15-character GST Identification Number</td></tr>
            <tr><td>PAN</td><td><span className="badge optional">No</span></td><td>10-character Permanent Account Number</td></tr>
          </tbody>
        </table>
      </div>

      {!isViewer && (
        <>
          <h3>Client Actions</h3>
          <ul className="steps">
            <li><strong>Edit</strong> - Modify client details</li>
            <li><strong>Delete</strong> - Remove client from database</li>
          </ul>

          <div className="info-box warning">
            <div className="info-box-icon">⚠️</div>
            <div className="info-box-content">
              <h5>Important</h5>
              <p>Clients with existing invoices cannot be deleted. This maintains data integrity for audit and compliance purposes.</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// Services Section
function ServicesSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">📋</div>
        <div>
          <h2>Service Master</h2>
          <p className="section-subtitle">Pre-define services for quick invoice creation</p>
        </div>
      </div>

      <h3>Why Use Service Master?</h3>
      <p>Pre-defining services saves time when creating invoices. You can quickly select from your service catalog instead of entering details each time.</p>

      <h3>Adding a Service</h3>
      <ol className="steps">
        <li>Navigate to <strong>Service Master</strong> from the sidebar</li>
        <li>Click <strong>"Add Service"</strong> button</li>
        <li>Enter service details including name, SAC code, and GST rate</li>
        <li>Click <strong>"Save Service"</strong></li>
      </ol>

      <h3>Service Fields</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Field</th><th>Description</th><th>Example</th></tr>
          </thead>
          <tbody>
            <tr><td>Service Name</td><td>Name of the service</td><td>Accounting Services</td></tr>
            <tr><td>Description</td><td>Detailed description</td><td>Monthly bookkeeping and accounting</td></tr>
            <tr><td>SAC Code</td><td>Services Accounting Code</td><td>998221</td></tr>
            <tr><td>GST Rate</td><td>Applicable GST percentage</td><td>18%</td></tr>
            <tr><td>Default Rate</td><td>Default price for the service</td><td>5000</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Common SAC Codes</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>SAC Code</th><th>Service Type</th></tr>
          </thead>
          <tbody>
            <tr><td><code>998221</code></td><td>Accounting, auditing & bookkeeping services</td></tr>
            <tr><td><code>998231</code></td><td>Legal services</td></tr>
            <tr><td><code>998311</code></td><td>Management consulting services</td></tr>
            <tr><td><code>998312</code></td><td>Business consulting services</td></tr>
            <tr><td><code>998313</code></td><td>IT consulting services</td></tr>
            <tr><td><code>998399</code></td><td>Other professional services</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Receipts Section
function ReceiptsSection({ isViewer }) {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">🧾</div>
        <div>
          <h2>Receipts</h2>
          <p className="section-subtitle">{isViewer ? 'View payment receipts' : 'Record payments and manage receipts'}</p>
        </div>
      </div>

      {isViewer && (
        <div className="info-box note">
          <div className="info-box-icon">👁️</div>
          <div className="info-box-content">
            <h5>Viewer Access</h5>
            <p>You can view and download receipts but cannot record new payments.</p>
          </div>
        </div>
      )}

      {!isViewer && (
        <>
          <h3>Recording a Payment</h3>
          <ol className="steps">
            <li>Navigate to <strong>Receipts</strong> from the sidebar</li>
            <li>Click <strong>"Record Payment"</strong> button</li>
            <li>Select the invoice from the dropdown (shows unpaid invoices)</li>
            <li>Enter the payment amount</li>
            <li>Select payment method (Cash, Bank Transfer, UPI, Cheque, etc.)</li>
            <li>Enter TDS details if applicable</li>
            <li>Click <strong>"Save Payment"</strong></li>
          </ol>

          <h3>Payment Fields</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Field</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>Invoice</td><td>Select the invoice for which payment is being recorded</td></tr>
                <tr><td>Amount</td><td>Payment amount received</td></tr>
                <tr><td>Payment Date</td><td>Date when payment was received</td></tr>
                <tr><td>Payment Method</td><td>Cash, Bank Transfer, UPI, Cheque, etc.</td></tr>
                <tr><td>Reference Number</td><td>Transaction/Cheque reference number</td></tr>
                <tr><td>TDS Percentage</td><td>TDS deducted by client (if applicable)</td></tr>
                <tr><td>Notes</td><td>Any additional notes about the payment</td></tr>
              </tbody>
            </table>
          </div>

          <h3>TDS Calculation</h3>
          <p>If your client deducts TDS (Tax Deducted at Source):</p>
          <div className="flowchart">
            <div className="flowchart-title">TDS Example</div>
            <div className="flow-container horizontal">
              <div className="flow-box process">Invoice: ₹10,000</div>
              <div className="flow-arrow-right">→</div>
              <div className="flow-box action">TDS @10%: ₹1,000</div>
              <div className="flow-arrow-right">→</div>
              <div className="flow-box end">Received: ₹9,000</div>
            </div>
          </div>

          <div className="info-box tip">
            <div className="info-box-icon">💡</div>
            <div className="info-box-content">
              <h5>Partial Payments</h5>
              <p>You can record multiple payments against a single invoice. The invoice status will automatically change to "Paid" when the full amount is received.</p>
            </div>
          </div>
        </>
      )}

      <h3>{isViewer ? 'Receipt Information' : 'Auto-Generated Receipts'}</h3>
      <p>{isViewer ? 'Each receipt includes:' : 'When you record a payment, a receipt is automatically generated with:'}</p>
      <ul className="steps">
        <li>Unique receipt number (e.g., RCPT-0001)</li>
        <li>Payment details and breakdown</li>
        <li>Client information</li>
        <li>TDS details (if applicable)</li>
      </ul>
    </section>
  );
}

// Reports Section
function ReportsSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">📊</div>
        <div>
          <h2>Reports</h2>
          <p className="section-subtitle">Generate business analytics reports</p>
        </div>
      </div>

      <h3>Available Reports</h3>
      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-card-icon green">📊</div>
          <h5>Revenue Report</h5>
          <p>Monthly and yearly revenue analysis with invoice details</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon orange">⏳</div>
          <h5>Outstanding Report</h5>
          <p>Pending invoices with days overdue calculation</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon red">🧾</div>
          <h5>GST Summary</h5>
          <p>Tax breakdown showing taxable amount and GST</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon blue">👥</div>
          <h5>Client-wise Report</h5>
          <p>Revenue grouped by client</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon purple">💰</div>
          <h5>Receipt Report</h5>
          <p>All payment receipts with collection history</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon indigo">📋</div>
          <h5>TDS Summary</h5>
          <p>Income Tax TDS deducted by clients</p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon teal">🏛️</div>
          <h5>GST TDS Summary</h5>
          <p>GST TDS deducted by Government undertakings</p>
        </div>
      </div>

      <h3>Date Filters</h3>
      <p>All reports can be filtered by:</p>
      <ul className="steps">
        <li><strong>This Month</strong> - Current month data</li>
        <li><strong>Last Month</strong> - Previous month data</li>
        <li><strong>This Quarter</strong> - Current quarter data</li>
        <li><strong>This Year</strong> - Current financial year data</li>
        <li><strong>All Time</strong> - All historical data</li>
      </ul>

      <h3>Export & Email Reports</h3>
      <p>Once you have generated a report, you can:</p>
      <ul className="steps">
        <li><strong>Export Report</strong> - Download the report as a CSV file for offline analysis or record keeping</li>
        <li><strong>Send Email</strong> - Send the report directly via email to any recipient:
          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
            <li>Click the "Send Email" button</li>
            <li>Enter the recipient's email address in the popup</li>
            <li>Click "Send Report" to email the report as a CSV attachment</li>
          </ul>
        </li>
      </ul>
      <div className="tip">
        <span className="tip-icon">💡</span>
        <div>
          <strong>Tip:</strong> Make sure your email settings are configured in Settings → Email before sending reports via email.
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
          <h2>Settings</h2>
          <p className="section-subtitle">Configure your NexInvo application</p>
        </div>
      </div>

      <p>Settings is organized into multiple tabs:</p>

      <h3>1. Company Info</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Field</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td>Company Name</td><td>Your registered company name</td></tr>
            <tr><td>Trading Name</td><td>Business name (if different)</td></tr>
            <tr><td>Address, City, State, PIN Code</td><td>Business address details</td></tr>
            <tr><td>State Code</td><td>GST state code (auto-filled based on state)</td></tr>
            <tr><td>GSTIN</td><td>15-digit GST Identification Number</td></tr>
            <tr><td>GST Registration Date</td><td>Date of GST registration</td></tr>
            <tr><td>PAN</td><td>10-character Permanent Account Number</td></tr>
            <tr><td>Phone, Email</td><td>Contact details</td></tr>
            <tr><td>Logo</td><td>Company logo (PNG/JPG, max 2MB)</td></tr>
          </tbody>
        </table>
      </div>

      <h3>2. Invoice Settings</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Setting</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td>Invoice Prefix</td><td>Prefix for tax invoice numbers (e.g., INV-)</td></tr>
            <tr><td>Starting Number</td><td>First tax invoice number</td></tr>
            <tr><td>Proforma Prefix</td><td>Prefix for proforma invoices (e.g., PI-)</td></tr>
            <tr><td>Proforma Starting Number</td><td>First proforma invoice number</td></tr>
            <tr><td>Enable GST</td><td>Toggle GST calculation on/off</td></tr>
            <tr><td>Default GST Rate</td><td>Standard GST rate (e.g., 18%)</td></tr>
            <tr><td>Payment Due Days</td><td>Default payment terms in days</td></tr>
            <tr><td>Terms & Conditions</td><td>Default terms shown on invoices</td></tr>
            <tr><td>Payment Reminders</td><td>Enable automatic payment reminder emails</td></tr>
          </tbody>
        </table>
      </div>

      <h3>3. Email Settings</h3>
      <p>Configure SMTP for sending invoices via email:</p>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Setting</th><th>Gmail Example</th></tr>
          </thead>
          <tbody>
            <tr><td>SMTP Host</td><td>smtp.gmail.com</td></tr>
            <tr><td>SMTP Port</td><td>587</td></tr>
            <tr><td>SMTP Username</td><td>your-email@gmail.com</td></tr>
            <tr><td>SMTP Password</td><td>App Password (16-character)</td></tr>
            <tr><td>From Email</td><td>your-email@gmail.com</td></tr>
            <tr><td>From Name</td><td>Your Company Name</td></tr>
            <tr><td>Use TLS</td><td>ON (recommended)</td></tr>
          </tbody>
        </table>
      </div>

      <div className="info-box warning">
        <div className="info-box-icon">⚠️</div>
        <div className="info-box-content">
          <h5>Gmail App Password</h5>
          <p>For Gmail, you need to use an App Password, not your regular password. Go to Google Account → Security → 2-Step Verification → App Passwords to generate one.</p>
        </div>
      </div>

      <h3>4. Payment Terms</h3>
      <p>Create custom payment terms that can be selected when creating invoices:</p>
      <ul className="steps">
        <li><strong>Due on Receipt</strong> - 0 days</li>
        <li><strong>Net 15</strong> - 15 days</li>
        <li><strong>Net 30</strong> - 30 days</li>
        <li><strong>Net 45</strong> - 45 days</li>
      </ul>

      <h3>5. Invoice Format</h3>
      <p>Customize the appearance of your invoices using the built-in Invoice Format Editor.</p>

      <h3>6. Export Data</h3>
      <p>Export your data in various formats including Excel and Tally-compatible XML format.</p>
    </section>
  );
}

// Organization Section
function OrganizationSection({ isOwnerOrAdmin }) {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">🏢</div>
        <div>
          <h2>Organization</h2>
          <p className="section-subtitle">Manage team members and organization settings</p>
        </div>
      </div>

      <h3>Organization Switcher</h3>
      <p>If you have access to multiple organizations, you can switch between them using the Organization Switcher in the header.</p>

      <h3>Team Members</h3>
      <p>View and manage users who have access to your organization:</p>
      <ul className="steps">
        <li>View list of team members</li>
        <li>See their roles and permissions</li>
        <li>Invite new members (if you have admin access)</li>
        <li>Remove members from the organization</li>
      </ul>

      <h3>User Roles</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Role</th><th>Permissions</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Owner</strong></td><td>Full access including organization deletion and subscription management</td></tr>
            <tr><td><strong>Admin</strong></td><td>Full access to all features including settings and user management</td></tr>
            <tr><td><strong>User</strong></td><td>Can create invoices, clients, payments but limited settings access</td></tr>
            <tr><td><strong>Viewer</strong></td><td>View-only access - can view data, download and email reports, but cannot create or edit</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Subscription Section
function SubscriptionSection({ isViewer }) {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">💼</div>
        <div>
          <h2>My Subscription</h2>
          <p className="section-subtitle">{isViewer ? 'View subscription information' : 'Manage your subscription plan'}</p>
        </div>
      </div>

      {isViewer && (
        <div className="info-box note">
          <div className="info-box-icon">👁️</div>
          <div className="info-box-content">
            <h5>Viewer Access</h5>
            <p>You can view the current subscription status but cannot modify or upgrade the subscription plan.</p>
          </div>
        </div>
      )}

      <h3>Subscription Details</h3>
      <p>View your current subscription information:</p>
      <ul className="steps">
        <li><strong>Plan Name</strong> - Your current subscription plan</li>
        <li><strong>Status</strong> - Active, Expired, or Trial</li>
        <li><strong>Days Remaining</strong> - Number of days until expiration</li>
        <li><strong>Start Date & End Date</strong> - Subscription period</li>
      </ul>

      <h3>Usage Limits</h3>
      <p>Track your usage against plan limits:</p>
      <ul className="steps">
        <li><strong>Users</strong> - Current users vs maximum allowed</li>
        <li><strong>Invoices per Month</strong> - Monthly invoice count vs limit</li>
        <li><strong>Storage</strong> - Available storage space</li>
      </ul>

      {!isViewer && (
        <>
          <h3>Upgrade Plan</h3>
          <p>To upgrade your subscription:</p>
          <ol className="steps">
            <li>Click <strong>"Upgrade Plan"</strong> button</li>
            <li>View available plans and features comparison</li>
            <li>Select a plan that suits your needs</li>
            <li>Apply coupon code if you have one</li>
            <li>Complete the payment process</li>
          </ol>

          <h3>Coupon Codes</h3>
          <p>Apply coupon codes to get discounts on subscription plans. Coupons can offer:</p>
          <ul className="steps">
            <li>Percentage discount</li>
            <li>Fixed amount discount</li>
            <li>Extended subscription period (bonus days)</li>
          </ul>
        </>
      )}
    </section>
  );
}

// Profile Section
function ProfileSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">👤</div>
        <div>
          <h2>Profile</h2>
          <p className="section-subtitle">Manage your account settings</p>
        </div>
      </div>

      <h3>Accessing Profile</h3>
      <p>Click on your avatar in the top-right corner and select "Profile" from the dropdown.</p>

      <h3>Profile Options</h3>
      <ul className="steps">
        <li><strong>View Profile</strong> - See your account details</li>
        <li><strong>Change Password</strong> - Update your login password</li>
        <li><strong>Export Personal Data</strong> - Download your data (DPDP Act compliance)</li>
        <li><strong>Delete Account</strong> - Permanently delete your account</li>
      </ul>

      <h3>User Dropdown</h3>
      <p>The user dropdown in the header provides quick access to:</p>
      <ul className="steps">
        <li><strong>Profile</strong> - Go to profile settings</li>
        <li><strong>Logout</strong> - Sign out of your account</li>
      </ul>

      <div className="info-box note">
        <div className="info-box-icon">📝</div>
        <div className="info-box-content">
          <h5>Auto-Hide Dropdown</h5>
          <p>The user dropdown automatically hides after 5 seconds of inactivity for better security.</p>
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FaqSection({ expandedFaq, toggleFaq, isViewer }) {
  // All FAQs with role information
  const allFaqs = [
    {
      question: "How do I change my invoice number format?",
      answer: "Go to Settings → Invoice Settings and change the Invoice Prefix (e.g., from 'INV-' to 'ABC/INV/').",
      viewerRelevant: false
    },
    {
      question: "What is the difference between Proforma and Tax Invoice?",
      answer: "Proforma Invoice is a preliminary bill or estimate sent before confirming the order. Tax Invoice is the official GST-compliant invoice for payment and tax filing purposes.",
      viewerRelevant: true
    },
    {
      question: "Can I record partial payments?",
      answer: "Yes, you can record multiple payments against a single invoice. The system automatically tracks the balance and changes status to 'Paid' when fully paid.",
      viewerRelevant: false
    },
    {
      question: "How does TDS work in NexInvo?",
      answer: "When recording a payment, you can enter the TDS percentage. The system calculates the TDS amount automatically. For example, if the invoice is ₹10,000 and TDS is 10%, the system records TDS of ₹1,000 and net payment of ₹9,000.",
      viewerRelevant: true
    },
    {
      question: "Why can't I delete a client?",
      answer: "Clients with existing invoices cannot be deleted to maintain data integrity for audit and compliance purposes. You can still edit the client details.",
      viewerRelevant: false
    },
    {
      question: "How do I convert a Proforma to Tax Invoice?",
      answer: "In the Invoices list, find the Proforma invoice and click the Convert (🔄) button. This option is only available for unpaid proforma invoices.",
      viewerRelevant: false
    },
    {
      question: "Can multiple users access the same organization?",
      answer: "Yes, you can invite team members from the Organization settings. Each user can have different roles (Owner, Admin, User, or Viewer) with different permission levels.",
      viewerRelevant: true
    },
    {
      question: "How do I send invoices via email?",
      answer: "First, configure your email settings in Settings → Email Settings with your SMTP details. Then you can click the email icon (📧) on any invoice to send it to the client.",
      viewerRelevant: true
    },
    {
      question: "What reports are available?",
      answer: "NexInvo offers 7 reports: Revenue Report, Outstanding Report, GST Summary, Client-wise Report, Receipt Report, TDS Summary, and GST TDS Summary. You can view, download, and email these reports.",
      viewerRelevant: true
    },
    {
      question: "How do I select multiple invoices for bulk actions?",
      answer: "Use the checkboxes in the invoice list to select multiple invoices. A bulk action bar will appear allowing you to Send Email, Download, Print, or Delete selected invoices.",
      viewerRelevant: false
    },
    {
      question: "What can viewers access?",
      answer: "Viewers have read-only access to the organization. They can view dashboards, invoices, clients, receipts, and generate reports. They can also download PDFs and email reports. However, they cannot create, edit, or delete any data.",
      viewerRelevant: true
    },
    {
      question: "How do I download or email a report?",
      answer: "Go to the Reports section, select a report type and date range, then use the 'Export Report' button to download as CSV or 'Send Email' to email the report to any recipient.",
      viewerRelevant: true
    }
  ];

  // Filter FAQs for viewers
  const faqs = isViewer ? allFaqs.filter(faq => faq.viewerRelevant) : allFaqs;

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

// Glossary Section
function GlossarySection() {
  const terms = [
    { term: 'GSTIN', definition: '15-digit GST Identification Number issued to registered taxpayers in India' },
    { term: 'PAN', definition: '10-character Permanent Account Number issued by Income Tax Department' },
    { term: 'HSN', definition: 'Harmonized System of Nomenclature - codes for goods classification under GST' },
    { term: 'SAC', definition: 'Services Accounting Code - codes for services classification under GST' },
    { term: 'CGST', definition: 'Central Goods and Services Tax - collected by Central Government on intra-state sales' },
    { term: 'SGST', definition: 'State Goods and Services Tax - collected by State Government on intra-state sales' },
    { term: 'IGST', definition: 'Integrated Goods and Services Tax - collected on inter-state sales' },
    { term: 'TDS', definition: 'Tax Deducted at Source - income tax deducted by payer and deposited with government' },
    { term: 'Proforma Invoice', definition: 'A preliminary invoice sent as a quotation or estimate before final billing' },
    { term: 'Tax Invoice', definition: 'Official GST-compliant invoice issued for supply of goods or services' },
    { term: 'Receipt', definition: 'Document acknowledging payment received against an invoice' },
    { term: 'SMTP', definition: 'Simple Mail Transfer Protocol - used for sending emails from the application' },
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
