import React from 'react';
import './Pages.css';

function SetuDownload() {
  const downloadUrl = '/downloads/Setu-v1.0.0-win64-portable.zip';
  const setuVersion = '1.0.0';

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Setu - Tally Connector</h1>
        <p className="page-subtitle">
          Connect NexInvo with Tally Prime for seamless two-way invoice synchronization
        </p>
      </div>

      {/* Download Section */}
      <div className="settings-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Setu
          </h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--gray-800)' }}>Setu v{setuVersion} for Windows</h4>
              <p style={{ margin: '0 0 16px 0', color: 'var(--gray-600)', fontSize: '14px' }}>
                Portable version - No installation required. Just extract and run.
              </p>
              <a
                href={downloadUrl}
                download
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Setu (Windows 64-bit)
              </a>
            </div>
            <div style={{
              padding: '16px 24px',
              background: 'var(--primary-light)',
              borderRadius: '12px',
              border: '1px solid var(--primary)',
              minWidth: '200px'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600', marginBottom: '4px' }}>
                SYSTEM REQUIREMENTS
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--gray-700)', fontSize: '14px' }}>
                <li>Windows 10/11 (64-bit)</li>
                <li>Tally Prime installed</li>
                <li>Internet connection</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="settings-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Quick Start Guide
          </h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Step 1 */}
            <div style={{
              padding: '20px',
              background: 'var(--gray-50)',
              borderRadius: '12px',
              border: '1px solid var(--gray-200)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                marginBottom: '12px'
              }}>1</div>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--gray-800)' }}>Download & Extract</h4>
              <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '14px' }}>
                Download the Setu zip file and extract it to any folder on your computer.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{
              padding: '20px',
              background: 'var(--gray-50)',
              borderRadius: '12px',
              border: '1px solid var(--gray-200)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                marginBottom: '12px'
              }}>2</div>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--gray-800)' }}>Start Tally Prime</h4>
              <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '14px' }}>
                Open Tally Prime and load your company. Make sure Tally is running before starting Setu.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{
              padding: '20px',
              background: 'var(--gray-50)',
              borderRadius: '12px',
              border: '1px solid var(--gray-200)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                marginBottom: '12px'
              }}>3</div>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--gray-800)' }}>Run Setu</h4>
              <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '14px' }}>
                Double-click <strong>Setu.exe</strong> to launch. Log in with your NexInvo credentials.
              </p>
            </div>

            {/* Step 4 */}
            <div style={{
              padding: '20px',
              background: 'var(--gray-50)',
              borderRadius: '12px',
              border: '1px solid var(--gray-200)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                marginBottom: '12px'
              }}>4</div>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--gray-800)' }}>Configure & Sync</h4>
              <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '14px' }}>
                Set up ledger mappings and start syncing invoices between NexInvo and Tally.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="settings-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Features
          </h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M17 1l4 4-4 4"></path>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                  <path d="M7 23l-4-4 4-4"></path>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                </svg>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--gray-800)', fontSize: '15px' }}>Two-Way Sync</h4>
                <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '13px' }}>
                  Sync invoices from NexInvo to Tally and vice versa. Keep both systems in perfect sync.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--gray-800)', fontSize: '15px' }}>Auto Sync</h4>
                <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '13px' }}>
                  Configure automatic sync at regular intervals. Set it and forget it.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--gray-800)', fontSize: '15px' }}>Manual Sync with Preview</h4>
                <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '13px' }}>
                  Select date range, preview differences, and choose which invoices to sync.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--gray-800)', fontSize: '15px' }}>Import Clients & Products</h4>
                <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '13px' }}>
                  Import parties, stock items, and services from Tally to NexInvo.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--gray-800)', fontSize: '15px' }}>Smart Duplicate Detection</h4>
                <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '13px' }}>
                  Automatically detects and prevents duplicate invoices using smart matching.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--gray-800)', fontSize: '15px' }}>Ledger Mapping</h4>
                <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '13px' }}>
                  Map NexInvo accounts to Tally ledgers for accurate accounting entries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Guidelines */}
      <div className="settings-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Sync Guidelines
          </h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{
              padding: '16px',
              background: '#fef3c7',
              borderRadius: '8px',
              border: '1px solid #fcd34d',
              display: 'flex',
              gap: '12px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#92400e', fontSize: '14px' }}>Important</h4>
                <p style={{ margin: 0, color: '#a16207', fontSize: '13px' }}>
                  Only <strong>Tax Invoices</strong> with status <strong>Sent</strong> or <strong>Paid</strong> are synced. Draft, cancelled, and proforma invoices are not included in sync.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 12px 0', color: 'var(--gray-800)', fontSize: '15px' }}>
                  <span style={{ color: 'var(--primary)' }}>NexInvo → Tally</span>
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--gray-600)', fontSize: '14px', lineHeight: '1.8' }}>
                  <li>Creates Sales Vouchers in Tally</li>
                  <li>Auto-creates party ledgers if not found</li>
                  <li>Maps GST taxes (CGST, SGST, IGST) correctly</li>
                  <li>Preserves invoice numbers and dates</li>
                </ul>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px 0', color: 'var(--gray-800)', fontSize: '15px' }}>
                  <span style={{ color: 'var(--success-color)' }}>Tally → NexInvo</span>
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--gray-600)', fontSize: '14px', lineHeight: '1.8' }}>
                  <li>Imports Sales Vouchers as Tax Invoices</li>
                  <li>Auto-creates clients if not found</li>
                  <li>Smart matching prevents duplicates</li>
                  <li>Manual sync allows force import</li>
                </ul>
              </div>
            </div>

            <div style={{
              padding: '16px',
              background: 'var(--gray-50)',
              borderRadius: '8px',
              border: '1px solid var(--gray-200)'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--gray-800)', fontSize: '14px' }}>Best Practices</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--gray-600)', fontSize: '13px', lineHeight: '1.8' }}>
                <li>Configure ledger mappings before first sync</li>
                <li>Use Manual Sync with preview for first-time sync to verify data</li>
                <li>Enable Auto Sync after verifying manual sync works correctly</li>
                <li>Keep Setu running in system tray for continuous auto-sync</li>
                <li>Check sync history regularly to ensure all invoices are synced</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="settings-card">
        <div className="card-header">
          <h3>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Troubleshooting
          </h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gap: '12px' }}>
            <details style={{
              padding: '12px 16px',
              background: 'var(--gray-50)',
              borderRadius: '8px',
              border: '1px solid var(--gray-200)',
              cursor: 'pointer'
            }}>
              <summary style={{ fontWeight: '600', color: 'var(--gray-800)', fontSize: '14px' }}>
                Setu can't connect to Tally
              </summary>
              <p style={{ margin: '12px 0 0 0', color: 'var(--gray-600)', fontSize: '13px', lineHeight: '1.6' }}>
                1. Make sure Tally Prime is running and a company is loaded<br/>
                2. Check if Tally is configured to allow external connections (default port 9000)<br/>
                3. Disable any firewall temporarily to test connection<br/>
                4. Restart both Tally and Setu
              </p>
            </details>

            <details style={{
              padding: '12px 16px',
              background: 'var(--gray-50)',
              borderRadius: '8px',
              border: '1px solid var(--gray-200)',
              cursor: 'pointer'
            }}>
              <summary style={{ fontWeight: '600', color: 'var(--gray-800)', fontSize: '14px' }}>
                Invoices not syncing
              </summary>
              <p style={{ margin: '12px 0 0 0', color: 'var(--gray-600)', fontSize: '13px', lineHeight: '1.6' }}>
                1. Verify the invoice is a Tax Invoice with status Sent or Paid<br/>
                2. Check if ledger mappings are configured correctly<br/>
                3. Use Manual Sync with preview to see which invoices are pending<br/>
                4. Check the sync history for any error messages
              </p>
            </details>

            <details style={{
              padding: '12px 16px',
              background: 'var(--gray-50)',
              borderRadius: '8px',
              border: '1px solid var(--gray-200)',
              cursor: 'pointer'
            }}>
              <summary style={{ fontWeight: '600', color: 'var(--gray-800)', fontSize: '14px' }}>
                Duplicate invoices appearing
              </summary>
              <p style={{ margin: '12px 0 0 0', color: 'var(--gray-600)', fontSize: '13px', lineHeight: '1.6' }}>
                Smart matching should prevent duplicates. If you see duplicates:<br/>
                1. Check if invoice numbers match between systems<br/>
                2. Verify the date, amount, and client name match exactly<br/>
                3. Cancel duplicate invoices in one system and re-sync
              </p>
            </details>

            <details style={{
              padding: '12px 16px',
              background: 'var(--gray-50)',
              borderRadius: '8px',
              border: '1px solid var(--gray-200)',
              cursor: 'pointer'
            }}>
              <summary style={{ fontWeight: '600', color: 'var(--gray-800)', fontSize: '14px' }}>
                Login failed in Setu
              </summary>
              <p style={{ margin: '12px 0 0 0', color: 'var(--gray-600)', fontSize: '13px', lineHeight: '1.6' }}>
                1. Check your internet connection<br/>
                2. Verify you're using the correct email and password<br/>
                3. Make sure your NexInvo account is active<br/>
                4. Try logging into the NexInvo web app first to confirm credentials
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SetuDownload;
