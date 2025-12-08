import React, { useState, useEffect, useRef } from 'react';
import { invoiceAPI } from '../services/api';
import './Pages.css';
import InvoiceForm from './InvoiceForm';
import ScheduledInvoices from './ScheduledInvoices';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showScheduledInvoices, setShowScheduledInvoices] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [activeTab, setActiveTab] = useState('proforma'); // Tab for invoice type
  const [proformaCount, setProformaCount] = useState(0);
  const [taxInvoiceCount, setTaxInvoiceCount] = useState(0);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadInvoices();
    loadInvoiceCounts();
    setSelectedInvoices([]); // Clear selection when tab changes
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    loadInvoiceCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      // Use active tab to filter invoice type
      params.invoice_type = activeTab;

      const response = await invoiceAPI.getAll(params);
      if (isMountedRef.current) {
        setInvoices(response.data.results || response.data || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error loading invoices:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const loadInvoiceCounts = async () => {
    try {
      const proformaResponse = await invoiceAPI.getAll({ invoice_type: 'proforma' });
      if (isMountedRef.current) {
        setProformaCount((proformaResponse.data.results || proformaResponse.data || []).length);
      }

      const taxResponse = await invoiceAPI.getAll({ invoice_type: 'tax' });
      if (isMountedRef.current) {
        setTaxInvoiceCount((taxResponse.data.results || taxResponse.data || []).length);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error loading invoice counts:', err);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoiceAPI.delete(id);
        loadInvoices();
      } catch (err) {
        console.error('Error deleting invoice:', err);
        alert('Failed to delete invoice');
      }
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      const response = await invoiceAPI.generatePDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF');
    }
  };

  const handleSendEmail = async (id) => {
    try {
      const response = await invoiceAPI.sendEmail(id);
      alert(response.data.message || 'Invoice sent successfully!');
      loadInvoices();
    } catch (err) {
      console.error('Error sending email:', err);
      alert(err.response?.data?.error || 'Failed to send invoice email');
    }
  };

  const handleConvertToTaxInvoice = async (id) => {
    if (window.confirm('Convert this proforma invoice to tax invoice? This action cannot be undone.')) {
      try {
        const response = await invoiceAPI.convertToTaxInvoice(id);
        alert(response.data.message || 'Proforma converted to tax invoice successfully!');
        loadInvoices();
      } catch (err) {
        console.error('Error converting invoice:', err);
        alert(err.response?.data?.error || 'Failed to convert invoice');
      }
    }
  };

  const handleEdit = async (id) => {
    try {
      const response = await invoiceAPI.getById(id);
      setEditingInvoice(response.data);
      setShowForm(true);
    } catch (err) {
      console.error('Error loading invoice:', err);
      alert('Failed to load invoice for editing');
    }
  };

  // Selection handlers
  const handleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id));
    }
  };

  const clearSelection = () => {
    setSelectedInvoices([]);
  };

  // Bulk action handlers
  const handleBulkEmail = async () => {
    if (selectedInvoices.length === 0) return;

    if (!window.confirm(`Send email for ${selectedInvoices.length} selected invoice(s)?`)) {
      return;
    }

    setBulkActionLoading(true);

    try {
      // Use optimized bulk email API for faster sending
      const response = await invoiceAPI.bulkSendEmail(selectedInvoices);
      const { success_count, failed_count, errors } = response.data;

      let message = `Email sent: ${success_count} successful`;
      if (failed_count > 0) {
        message += `, ${failed_count} failed`;
        if (errors && errors.length > 0) {
          console.warn('Bulk email errors:', errors);
        }
      }
      alert(message);
    } catch (err) {
      console.error('Error sending bulk emails:', err);
      alert(err.response?.data?.error || 'Failed to send emails');
    }

    setBulkActionLoading(false);
    clearSelection();
    loadInvoices();
  };

  const handleBulkDownload = async () => {
    if (selectedInvoices.length === 0) return;

    setBulkActionLoading(true);

    for (const id of selectedInvoices) {
      try {
        const response = await invoiceAPI.generatePDF(id);
        const invoice = invoices.find(inv => inv.id === id);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice_${invoice?.invoice_number || id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error downloading PDF for invoice ${id}:`, err);
      }
    }

    setBulkActionLoading(false);
    alert(`Downloaded ${selectedInvoices.length} invoice(s)`);
    clearSelection();
  };

  const handleBulkPrint = async () => {
    if (selectedInvoices.length === 0) return;

    setBulkActionLoading(true);

    // Download all PDFs and open them for printing
    for (const id of selectedInvoices) {
      try {
        const response = await invoiceAPI.generatePDF(id);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
        // Small delay between opening windows
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Error printing invoice ${id}:`, err);
      }
    }

    setBulkActionLoading(false);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedInvoices.length} selected invoice(s)? This action cannot be undone.`)) {
      return;
    }

    setBulkActionLoading(true);
    let successCount = 0;
    let failedCount = 0;

    for (const id of selectedInvoices) {
      try {
        await invoiceAPI.delete(id);
        successCount++;
      } catch (err) {
        console.error(`Error deleting invoice ${id}:`, err);
        failedCount++;
      }
    }

    setBulkActionLoading(false);
    alert(`Deleted: ${successCount} successful, ${failedCount} failed`);
    clearSelection();
    loadInvoices();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await invoiceAPI.downloadImportTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'invoice_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading template:', err);
      alert('Failed to download template');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImportInvoices = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    setLoading(true);
    setImportProgress('Uploading and processing file...');

    try {
      const response = await invoiceAPI.importInvoices(importFile);

      setImportProgress(null);
      setShowImportModal(false);
      setImportFile(null);

      const successCount = response.data.success_count || 0;
      const failedCount = response.data.failed_count || 0;
      const errors = response.data.errors || [];
      const createdClients = response.data.created_clients || [];
      const createdServices = response.data.created_services || [];

      let message = `Import completed!\n\nSuccessfully imported: ${successCount} invoices`;
      if (failedCount > 0) {
        message += `\nFailed: ${failedCount} invoices`;
        if (errors.length > 0) {
          message += `\n\nErrors:\n${errors.slice(0, 5).join('\n')}`;
          if (errors.length > 5) {
            message += `\n... and ${errors.length - 5} more errors`;
          }
        }
      }

      // Show created clients and services
      if (createdClients.length > 0) {
        message += `\n\nAuto-created ${createdClients.length} new clients:\n${createdClients.slice(0, 3).join('\n')}`;
        if (createdClients.length > 3) {
          message += `\n... and ${createdClients.length - 3} more`;
        }
      }

      if (createdServices.length > 0) {
        message += `\n\nAuto-created ${createdServices.length} new services:\n${createdServices.slice(0, 3).join('\n')}`;
        if (createdServices.length > 3) {
          message += `\n... and ${createdServices.length - 3} more`;
        }
      }

      alert(message);
      loadInvoices();
    } catch (err) {
      console.error('Error importing invoices:', err);
      setImportProgress(null);
      alert(err.response?.data?.error || 'Failed to import invoices');
    } finally {
      setLoading(false);
    }
  };

  // Show Scheduled Invoices page
  if (showScheduledInvoices) {
    return <ScheduledInvoices onBack={() => setShowScheduledInvoices(false)} />;
  }

  if (showForm) {
    return <InvoiceForm
      invoice={editingInvoice}
      onBack={() => {
        setShowForm(false);
        setEditingInvoice(null);
        loadInvoices();
      }}
    />;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Invoices</h1>
          <p className="page-description">Manage all your invoices</p>
        </div>
        <div className="page-header-right">
          <button className="btn-secondary" onClick={() => setShowScheduledInvoices(true)}>
            <span className="btn-icon">📅</span>
            Scheduled Invoices
          </button>
          <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
            <span className="btn-icon">📥</span>
            Import Invoices
          </button>
          <button className="btn-create" onClick={() => setShowForm(true)}>
            <span className="btn-icon">➕</span>
            Create Invoice
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h2>Import Invoices</h2>
              <button className="modal-close" onClick={() => !loading && setShowImportModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{marginBottom: '16px', color: '#6b7280'}}>
                Import your past invoices from Excel or JSON files. You can use our template or upload GST Portal exports.
              </p>

              <div style={{marginBottom: '24px', padding: '16px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd'}}>
                <h4 style={{margin: '0 0 8px 0', color: '#0369a1'}}>📋 Step 1: Download Template</h4>
                <p style={{margin: '0 0 12px 0', fontSize: '14px', color: '#0c4a6e'}}>
                  Download our Excel template, fill in your invoice data, and upload it back.
                </p>
                <button className="btn-secondary" onClick={handleDownloadTemplate} style={{width: '100%'}}>
                  <span className="btn-icon">📥</span>
                  Download Excel Template
                </button>
              </div>

              <div style={{marginBottom: '16px'}}>
                <h4 style={{margin: '0 0 8px 0', color: '#1e293b'}}>📤 Step 2: Upload File</h4>
                <p style={{margin: '0 0 12px 0', fontSize: '14px', color: '#64748b'}}>
                  Supported formats: Excel (.xlsx, .xls) or JSON (.json)
                </p>
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '8px',
                  padding: '32px',
                  textAlign: 'center',
                  background: '#f8f9fa'
                }}>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.json"
                    onChange={handleFileSelect}
                    style={{display: 'none'}}
                    id="invoice-import-file"
                    disabled={loading}
                  />
                  <label htmlFor="invoice-import-file" style={{cursor: loading ? 'not-allowed' : 'pointer'}}>
                    <div style={{fontSize: '48px', marginBottom: '8px'}}>📂</div>
                    <div style={{color: '#6366f1', fontWeight: '600', marginBottom: '4px'}}>
                      {importFile ? importFile.name : 'Click to select file'}
                    </div>
                    <div style={{color: '#6b7280', fontSize: '14px'}}>
                      Excel or JSON format
                    </div>
                  </label>
                </div>
              </div>

              {importProgress && (
                <div style={{
                  padding: '12px',
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: '8px',
                  color: '#92400e',
                  marginTop: '16px'
                }}>
                  ⏳ {importProgress}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowImportModal(false)} disabled={loading}>
                Cancel
              </button>
              <button className="btn-create" onClick={handleImportInvoices} disabled={loading || !importFile}>
                <span className="btn-icon">📤</span>
                {loading ? 'Importing...' : 'Import Invoices'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs for Invoice Types */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '0'
      }}>
        <button
          onClick={() => setActiveTab('proforma')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'proforma' ? '#6366f1' : 'transparent',
            color: activeTab === 'proforma' ? 'white' : '#6b7280',
            fontWeight: activeTab === 'proforma' ? '600' : '500',
            fontSize: '14px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s ease',
            position: 'relative',
            bottom: '-2px',
            borderBottom: activeTab === 'proforma' ? 'none' : '2px solid transparent'
          }}
        >
          Proforma Invoices ({proformaCount})
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'tax' ? '#6366f1' : 'transparent',
            color: activeTab === 'tax' ? 'white' : '#6b7280',
            fontWeight: activeTab === 'tax' ? '600' : '500',
            fontSize: '14px',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s ease',
            position: 'relative',
            bottom: '-2px',
            borderBottom: activeTab === 'tax' ? 'none' : '2px solid transparent'
          }}
        >
          Tax Invoices ({taxInvoiceCount})
        </button>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search invoices..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && loadInvoices()}
          />
        </div>
        <div className="filter-group">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); }}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div className="filter-group">
          <button className="btn-secondary" onClick={loadInvoices}>
            Search
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedInvoices.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: '600', fontSize: '15px' }}>
              {selectedInvoices.length} invoice{selectedInvoices.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Clear Selection
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleBulkEmail}
              disabled={bulkActionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.95)',
                border: 'none',
                color: '#6366f1',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                opacity: bulkActionLoading ? 0.7 : 1,
              }}
            >
              <span>📧</span> Send Email
            </button>
            <button
              onClick={handleBulkDownload}
              disabled={bulkActionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.95)',
                border: 'none',
                color: '#6366f1',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                opacity: bulkActionLoading ? 0.7 : 1,
              }}
            >
              <span>📥</span> Download
            </button>
            <button
              onClick={handleBulkPrint}
              disabled={bulkActionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.95)',
                border: 'none',
                color: '#6366f1',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                opacity: bulkActionLoading ? 0.7 : 1,
              }}
            >
              <span>🖨️</span> Print
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ef4444',
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                opacity: bulkActionLoading ? 0.7 : 1,
              }}
            >
              <span>🗑️</span> Delete
            </button>
          </div>
        </div>
      )}

      <div className="content-card">
        {loading ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">⏳</div>
            <h3 className="empty-title">Loading Invoices...</h3>
          </div>
        ) : invoices.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📄</div>
            <h3 className="empty-title">No {activeTab === 'proforma' ? 'Proforma' : 'Tax'} Invoices Yet</h3>
            <p className="empty-description">
              {activeTab === 'proforma'
                ? 'Click the "Create Invoice" button above to create a proforma invoice'
                : 'Tax invoices are automatically generated when payments are recorded against proforma invoices'}
            </p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                      onChange={handleSelectAll}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: '#6366f1',
                      }}
                      title={selectedInvoices.length === invoices.length ? 'Deselect All' : 'Select All'}
                    />
                  </th>
                  <th>Invoice No</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    style={{
                      backgroundColor: selectedInvoices.includes(invoice.id) ? '#f0f4ff' : 'transparent',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => handleSelectInvoice(invoice.id)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#6366f1',
                        }}
                      />
                    </td>
                    <td>{invoice.invoice_number}</td>
                    <td>{invoice.client_name}</td>
                    <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                    <td>{invoice.invoice_type === 'tax' ? 'Tax Invoice' : 'Proforma'}</td>
                    <td>₹{parseFloat(invoice.total_amount).toFixed(2)}</td>
                    <td><span className={`status-badge ${invoice.status}`}>{invoice.status}</span></td>
                    <td>
                      <button
                        className="btn-icon-small"
                        onClick={() => handleEdit(invoice.id)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon-small"
                        onClick={() => handleDownloadPDF(invoice.id)}
                        title="Download PDF"
                      >
                        📄
                      </button>
                      <button
                        className="btn-icon-small"
                        onClick={() => handleSendEmail(invoice.id)}
                        title="Send Email"
                      >
                        📧
                      </button>
                      {invoice.invoice_type === 'proforma' && invoice.status !== 'paid' && (
                        <button
                          className="btn-icon-small"
                          onClick={() => handleConvertToTaxInvoice(invoice.id)}
                          title="Convert to Tax Invoice"
                        >
                          🔄
                        </button>
                      )}
                      <button
                        className="btn-icon-small"
                        onClick={() => handleDelete(invoice.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Invoices;
