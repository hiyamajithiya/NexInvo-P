import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import './Pages.css';

function InvoiceFormatEditor() {
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('header');

  // Common designation options
  const designationOptions = [
    'Professional Services',
    'Chartered Accountant',
    'Tax Consultant',
    'Company Secretary',
    'Cost Accountant',
    'Advocate',
    'Architect',
    'Interior Designer',
    'Consultant',
    'Software Services',
    'IT Services',
    'Marketing Services',
    'Custom'
  ];

  const [formatSettings, setFormatSettings] = useState({
    // Header
    show_logo: true,
    logo_position: 'left',
    show_company_designation: true,
    company_designation_text: 'Professional Services',
    header_color: '#1e3a8a',

    // Company Info
    show_company_name: true,
    show_trading_name: true,
    show_address: true,
    show_gstin: true,
    show_pan: true,
    show_phone: true,
    show_email: true,

    // Invoice Details
    show_invoice_number: true,
    show_invoice_date: true,
    show_due_date: false,

    // Client Info
    show_client_gstin: true,
    show_client_pan: false,
    show_client_phone: false,
    show_client_email: false,

    // Table
    table_header_bg_color: '#1e3a8a',
    table_header_text_color: '#ffffff',
    show_hsn_sac_column: false,
    show_serial_number: true,
    show_taxable_value: true,
    show_cgst_sgst_separate: true,
    show_igst: true,
    show_gst_percentage: false,

    // Totals
    show_subtotal: true,
    show_tax_breakup: true,
    show_grand_total_in_words: false,

    // Footer
    show_bank_details: true,
    bank_account_number: '',
    bank_name: '',
    bank_ifsc: '',
    bank_branch: '',
    show_signature: true,
    signature_label: 'Authorized Signatory',
    show_company_seal: false,

    // Terms
    show_payment_terms: true,
    show_notes: true,
    show_terms_conditions: true,

    // Additional
    show_computer_generated_note: true,
    show_page_numbers: true,
    font_size: 'medium'
  });

  useEffect(() => {
    loadFormatSettings();
  }, []);

  const loadFormatSettings = async () => {
    setLoading(true);
    try {
      const response = await settingsAPI.getInvoiceFormatSettings();
      if (response.data) {
        setFormatSettings(response.data);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Error loading format settings:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormatSettings({ ...formatSettings, [field]: value });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await settingsAPI.updateInvoiceFormatSettings(formatSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving format settings:', err);
      setError('Failed to save format settings');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = () => {
    if (window.confirm('Reset all format settings to default? This cannot be undone.')) {
      setFormatSettings({
        show_logo: true,
        logo_position: 'left',
        show_company_designation: true,
        company_designation_text: 'Professional Services',
        header_color: '#1e3a8a',
        show_company_name: true,
        show_trading_name: true,
        show_address: true,
        show_gstin: true,
        show_pan: true,
        show_phone: true,
        show_email: true,
        show_invoice_number: true,
        show_invoice_date: true,
        show_due_date: false,
        show_client_gstin: true,
        show_client_pan: false,
        show_client_phone: false,
        show_client_email: false,
        table_header_bg_color: '#1e3a8a',
        table_header_text_color: '#ffffff',
        show_hsn_sac_column: false,
        show_serial_number: true,
        show_taxable_value: true,
        show_cgst_sgst_separate: true,
        show_igst: true,
        show_gst_percentage: false,
        show_subtotal: true,
        show_tax_breakup: true,
        show_grand_total_in_words: false,
        show_bank_details: true,
        bank_account_number: '',
        bank_name: '',
        bank_ifsc: '',
        bank_branch: '',
        show_signature: true,
        signature_label: 'Authorized Signatory',
        show_company_seal: false,
        show_payment_terms: true,
        show_notes: true,
        show_terms_conditions: true,
        show_computer_generated_note: true,
        show_page_numbers: true,
        font_size: 'medium'
      });
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>📄 Invoice Format Editor</h1>
        <p>Customize your invoice layout and appearance</p>
      </div>

      {saveSuccess && (
        <div className="success-message">
          ✓ Format settings saved successfully!
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'header' ? 'active' : ''}`}
          onClick={() => setActiveTab('header')}
        >
          <span className="tab-icon">🎨</span>
          Header & Branding
        </button>
        <button
          className={`settings-tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <span className="tab-icon">📋</span>
          Company & Client Info
        </button>
        <button
          className={`settings-tab ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          <span className="tab-icon">📊</span>
          Table & Columns
        </button>
        <button
          className={`settings-tab ${activeTab === 'footer' ? 'active' : ''}`}
          onClick={() => setActiveTab('footer')}
        >
          <span className="tab-icon">🏦</span>
          Footer & Bank Details
        </button>
        <button
          className={`settings-tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <span className="tab-icon">👁️</span>
          Preview
        </button>
      </div>

      <div className="settings-content">
        {/* Header & Branding Tab */}
        {activeTab === 'header' && (
          <div className="settings-section">
            <h2 className="section-title">Header & Branding Settings</h2>

            <div className="form-grid">
              <div className="form-field full-width">
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_logo}
                    onChange={(e) => handleChange('show_logo', e.target.checked)}
                    style={{width: 'auto'}}
                  />
                  Show Company Logo
                </label>
              </div>

              {formatSettings.show_logo && (
                <div className="form-field">
                  <label>Logo Position</label>
                  <select
                    value={formatSettings.logo_position}
                    onChange={(e) => handleChange('logo_position', e.target.value)}
                    className="form-input"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              )}

              <div className="form-field full-width">
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_company_designation}
                    onChange={(e) => handleChange('show_company_designation', e.target.checked)}
                    style={{width: 'auto'}}
                  />
                  Show Company Designation
                </label>
              </div>

              {formatSettings.show_company_designation && (
                <div className="form-field">
                  <label>Designation / Business Type</label>
                  <select
                    value={designationOptions.includes(formatSettings.company_designation_text) ? formatSettings.company_designation_text : 'Custom'}
                    onChange={(e) => {
                      if (e.target.value === 'Custom') {
                        // Keep current custom value or set empty
                        if (designationOptions.includes(formatSettings.company_designation_text)) {
                          handleChange('company_designation_text', '');
                        }
                      } else {
                        handleChange('company_designation_text', e.target.value);
                      }
                    }}
                    className="form-input"
                  >
                    {designationOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {!designationOptions.includes(formatSettings.company_designation_text) && (
                    <input
                      type="text"
                      value={formatSettings.company_designation_text}
                      onChange={(e) => handleChange('company_designation_text', e.target.value)}
                      className="form-input"
                      placeholder="Enter your custom designation"
                      style={{ marginTop: '8px' }}
                    />
                  )}
                  <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                    This appears on the top-right of your invoice (e.g., "CHARTERED ACCOUNTANT")
                  </small>
                </div>
              )}

              <div className="form-field">
                <label>Header Color</label>
                <input
                  type="color"
                  value={formatSettings.header_color}
                  onChange={(e) => handleChange('header_color', e.target.value)}
                  className="form-input"
                />
                <small>{formatSettings.header_color}</small>
              </div>

              <div className="form-field">
                <label>Table Header Background</label>
                <input
                  type="color"
                  value={formatSettings.table_header_bg_color}
                  onChange={(e) => handleChange('table_header_bg_color', e.target.value)}
                  className="form-input"
                />
                <small>{formatSettings.table_header_bg_color}</small>
              </div>

              <div className="form-field">
                <label>Table Header Text Color</label>
                <input
                  type="color"
                  value={formatSettings.table_header_text_color}
                  onChange={(e) => handleChange('table_header_text_color', e.target.value)}
                  className="form-input"
                />
                <small>{formatSettings.table_header_text_color}</small>
              </div>

              <div className="form-field">
                <label>Font Size</label>
                <select
                  value={formatSettings.font_size}
                  onChange={(e) => handleChange('font_size', e.target.value)}
                  className="form-input"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Company & Client Info Tab */}
        {activeTab === 'info' && (
          <div className="settings-section">
            <h2 className="section-title">Company & Client Information Display</h2>

            <div style={{marginBottom: '24px'}}>
              <h3 style={{fontSize: '16px', marginBottom: '12px', color: '#1e3a8a'}}>Company Information</h3>
              <div className="checkbox-grid">
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_company_name}
                    onChange={(e) => handleChange('show_company_name', e.target.checked)}
                  />
                  Company Name
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_trading_name}
                    onChange={(e) => handleChange('show_trading_name', e.target.checked)}
                  />
                  Trading Name
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_address}
                    onChange={(e) => handleChange('show_address', e.target.checked)}
                  />
                  Address
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_gstin}
                    onChange={(e) => handleChange('show_gstin', e.target.checked)}
                  />
                  GSTIN
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_pan}
                    onChange={(e) => handleChange('show_pan', e.target.checked)}
                  />
                  PAN
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_phone}
                    onChange={(e) => handleChange('show_phone', e.target.checked)}
                  />
                  Phone
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_email}
                    onChange={(e) => handleChange('show_email', e.target.checked)}
                  />
                  Email
                </label>
              </div>
            </div>

            <div style={{marginBottom: '24px'}}>
              <h3 style={{fontSize: '16px', marginBottom: '12px', color: '#1e3a8a'}}>Invoice Details</h3>
              <div className="checkbox-grid">
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_invoice_number}
                    onChange={(e) => handleChange('show_invoice_number', e.target.checked)}
                  />
                  Invoice Number
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_invoice_date}
                    onChange={(e) => handleChange('show_invoice_date', e.target.checked)}
                  />
                  Invoice Date
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_due_date}
                    onChange={(e) => handleChange('show_due_date', e.target.checked)}
                  />
                  Due Date
                </label>
              </div>
            </div>

            <div>
              <h3 style={{fontSize: '16px', marginBottom: '12px', color: '#1e3a8a'}}>Client Information</h3>
              <div className="checkbox-grid">
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_client_gstin}
                    onChange={(e) => handleChange('show_client_gstin', e.target.checked)}
                  />
                  Client GSTIN
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_client_pan}
                    onChange={(e) => handleChange('show_client_pan', e.target.checked)}
                  />
                  Client PAN
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_client_phone}
                    onChange={(e) => handleChange('show_client_phone', e.target.checked)}
                  />
                  Client Phone
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_client_email}
                    onChange={(e) => handleChange('show_client_email', e.target.checked)}
                  />
                  Client Email
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Table & Columns Tab */}
        {activeTab === 'table' && (
          <div className="settings-section">
            <h2 className="section-title">Table & Columns Configuration</h2>

            <div style={{marginBottom: '24px'}}>
              <h3 style={{fontSize: '16px', marginBottom: '12px', color: '#1e3a8a'}}>Table Columns</h3>
              <div className="checkbox-grid">
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_serial_number}
                    onChange={(e) => handleChange('show_serial_number', e.target.checked)}
                  />
                  Serial Number (S.No)
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_hsn_sac_column}
                    onChange={(e) => handleChange('show_hsn_sac_column', e.target.checked)}
                  />
                  HSN/SAC Column
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_taxable_value}
                    onChange={(e) => handleChange('show_taxable_value', e.target.checked)}
                  />
                  Taxable Value
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_cgst_sgst_separate}
                    onChange={(e) => handleChange('show_cgst_sgst_separate', e.target.checked)}
                  />
                  CGST/SGST (Separate Columns)
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_igst}
                    onChange={(e) => handleChange('show_igst', e.target.checked)}
                  />
                  IGST Column
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_gst_percentage}
                    onChange={(e) => handleChange('show_gst_percentage', e.target.checked)}
                  />
                  Show GST Percentage
                </label>
              </div>
            </div>

            <div>
              <h3 style={{fontSize: '16px', marginBottom: '12px', color: '#1e3a8a'}}>Total Section</h3>
              <div className="checkbox-grid">
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_subtotal}
                    onChange={(e) => handleChange('show_subtotal', e.target.checked)}
                  />
                  Show Subtotal
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_tax_breakup}
                    onChange={(e) => handleChange('show_tax_breakup', e.target.checked)}
                  />
                  Show Tax Breakup
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_grand_total_in_words}
                    onChange={(e) => handleChange('show_grand_total_in_words', e.target.checked)}
                  />
                  Grand Total in Words
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer & Bank Details Tab */}
        {activeTab === 'footer' && (
          <div className="settings-section">
            <h2 className="section-title">Footer & Bank Details</h2>

            <div style={{marginBottom: '24px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                <input
                  type="checkbox"
                  checked={formatSettings.show_bank_details}
                  onChange={(e) => handleChange('show_bank_details', e.target.checked)}
                  style={{width: 'auto'}}
                />
                <strong>Show Bank Details</strong>
              </label>

              {formatSettings.show_bank_details && (
                <div className="form-grid">
                  <div className="form-field">
                    <label>Account Number</label>
                    <input
                      type="text"
                      value={formatSettings.bank_account_number}
                      onChange={(e) => handleChange('bank_account_number', e.target.value)}
                      className="form-input"
                      placeholder="Enter account number"
                    />
                  </div>
                  <div className="form-field">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      value={formatSettings.bank_name}
                      onChange={(e) => handleChange('bank_name', e.target.value)}
                      className="form-input"
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div className="form-field">
                    <label>IFSC Code</label>
                    <input
                      type="text"
                      value={formatSettings.bank_ifsc}
                      onChange={(e) => handleChange('bank_ifsc', e.target.value)}
                      className="form-input"
                      placeholder="Enter IFSC code"
                    />
                  </div>
                  <div className="form-field">
                    <label>Branch</label>
                    <input
                      type="text"
                      value={formatSettings.bank_branch}
                      onChange={(e) => handleChange('bank_branch', e.target.value)}
                      className="form-input"
                      placeholder="Enter branch name"
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{marginBottom: '24px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                <input
                  type="checkbox"
                  checked={formatSettings.show_signature}
                  onChange={(e) => handleChange('show_signature', e.target.checked)}
                  style={{width: 'auto'}}
                />
                <strong>Show Signature Section</strong>
              </label>

              {formatSettings.show_signature && (
                <div className="form-grid">
                  <div className="form-field">
                    <label>Signature Label</label>
                    <input
                      type="text"
                      value={formatSettings.signature_label}
                      onChange={(e) => handleChange('signature_label', e.target.value)}
                      className="form-input"
                      placeholder="e.g., Authorized Signatory"
                    />
                  </div>
                  <div className="form-field">
                    <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <input
                        type="checkbox"
                        checked={formatSettings.show_company_seal}
                        onChange={(e) => handleChange('show_company_seal', e.target.checked)}
                        style={{width: 'auto'}}
                      />
                      Show Company Seal
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 style={{fontSize: '16px', marginBottom: '12px', color: '#1e3a8a'}}>Additional Footer Options</h3>
              <div className="checkbox-grid">
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_payment_terms}
                    onChange={(e) => handleChange('show_payment_terms', e.target.checked)}
                  />
                  Show Payment Terms
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_notes}
                    onChange={(e) => handleChange('show_notes', e.target.checked)}
                  />
                  Show Notes
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_terms_conditions}
                    onChange={(e) => handleChange('show_terms_conditions', e.target.checked)}
                  />
                  Show Terms & Conditions
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_computer_generated_note}
                    onChange={(e) => handleChange('show_computer_generated_note', e.target.checked)}
                  />
                  Computer Generated Note
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    checked={formatSettings.show_page_numbers}
                    onChange={(e) => handleChange('show_page_numbers', e.target.checked)}
                  />
                  Show Page Numbers
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="settings-section">
            <h2 className="section-title">Invoice Preview</h2>
            <div style={{
              background: '#f9fafb',
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{fontSize: '48px', marginBottom: '16px'}}>📄</div>
              <h3 style={{marginBottom: '12px', color: '#374151'}}>Real-time Preview</h3>
              <p style={{color: '#6b7280', marginBottom: '24px', maxWidth: '500px'}}>
                Your invoice format settings are automatically applied to all generated PDFs.
                Create or download an invoice to see the preview with your customizations.
              </p>
              <div style={{display: 'flex', gap: '12px'}}>
                <button
                  className="btn-secondary"
                  onClick={() => window.location.hash = '#/invoices'}
                >
                  Go to Invoices
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="form-actions" style={{marginTop: '24px'}}>
        <button
          className="btn-create"
          onClick={handleSave}
          disabled={loading}
        >
          <span className="btn-icon">💾</span>
          {loading ? 'Saving...' : 'Save Format Settings'}
        </button>
        <button
          className="btn-secondary"
          onClick={resetToDefault}
          disabled={loading}
        >
          <span className="btn-icon">🔄</span>
          Reset to Default
        </button>
      </div>

      <style jsx>{`
        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .checkbox-grid label {
          padding: 8px 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .checkbox-grid label:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .checkbox-grid input[type="checkbox"] {
          width: auto !important;
        }
      `}</style>
    </div>
  );
}

export default InvoiceFormatEditor;
