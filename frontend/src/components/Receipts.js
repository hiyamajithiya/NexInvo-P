import React, { useState, useEffect, useMemo } from 'react';
import { invoiceAPI, paymentAPI, receiptAPI, ledgerAccountAPI } from '../services/api';
import { formatDate } from '../utils/dateFormat';
import { formatCurrency } from '../utils/formatCurrency';
import { statCardStyles } from '../styles/statCardStyles';
import { useToast } from './Toast';
import './Pages.css';

function Receipts() {
  const { showSuccess, showError } = useToast();
  const [receipts, setReceipts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState('');
  const [accountingEnabled, setAccountingEnabled] = useState(false);

  // Multi-select states
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [currentReceipt, setCurrentReceipt] = useState({
    invoice: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    tds_amount: 0,
    gst_tds_amount: 0,
    amount_received: 0,
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
    cash_bank_account: '',
    post_to_ledger: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [receiptsResponse, invoicesResponse] = await Promise.all([
        paymentAPI.getAll(),
        invoiceAPI.getAll({ unpaid_only: 'true' })  // Only fetch unpaid invoices for dropdown
      ]);
      setReceipts(receiptsResponse.data.results || receiptsResponse.data || []);
      setInvoices(invoicesResponse.data.results || invoicesResponse.data || []);

      // Try to load accounting data (cash/bank accounts)
      try {
        const cashBankRes = await ledgerAccountAPI.getCashOrBank();
        const accounts = cashBankRes.data.results || cashBankRes.data || [];
        setCashBankAccounts(accounts);
        setAccountingEnabled(accounts.length > 0);
      } catch (accountErr) {
        // Accounting not set up yet
        setAccountingEnabled(false);
      }
    } catch (err) {
      // Error handled silently
    }
  };

  const handleRecordReceipt = () => {
    // Set default cash/bank account based on payment method
    const defaultAccount = cashBankAccounts.find(acc => acc.account_type === 'bank')?.id ||
                          cashBankAccounts.find(acc => acc.account_type === 'cash')?.id || '';
    setCurrentReceipt({
      invoice: '',
      payment_date: new Date().toISOString().split('T')[0],
      amount: 0,
      tds_amount: 0,
      gst_tds_amount: 0,
      amount_received: 0,
      payment_method: 'bank_transfer',
      reference_number: '',
      notes: '',
      cash_bank_account: defaultAccount,
      post_to_ledger: accountingEnabled
    });
    setShowForm(true);
    setError('');
  };

  const handleReceiptChange = (field, value) => {
    const updatedReceipt = { ...currentReceipt, [field]: value };

    // When invoice is selected, auto-fill amount
    if (field === 'invoice' && value) {
      const selectedInvoice = invoices.find(inv => inv.id === parseInt(value));
      if (selectedInvoice) {
        updatedReceipt.amount = parseFloat(selectedInvoice.total_amount) || 0;
        updatedReceipt.tds_amount = 0;
        updatedReceipt.gst_tds_amount = 0;
        updatedReceipt.amount_received = parseFloat(selectedInvoice.total_amount) || 0;
      }
    }

    // When Income Tax TDS is entered, recalculate amount_received
    if (field === 'tds_amount') {
      const tds = parseFloat(value) || 0;
      const gstTds = parseFloat(updatedReceipt.gst_tds_amount) || 0;
      updatedReceipt.amount_received = parseFloat(updatedReceipt.amount) - tds - gstTds;
    }

    // When GST TDS is entered, recalculate amount_received
    if (field === 'gst_tds_amount') {
      const gstTds = parseFloat(value) || 0;
      const tds = parseFloat(updatedReceipt.tds_amount) || 0;
      updatedReceipt.amount_received = parseFloat(updatedReceipt.amount) - tds - gstTds;
    }

    // When total amount changes, recalculate amount_received
    if (field === 'amount') {
      const total = parseFloat(value) || 0;
      const tds = parseFloat(updatedReceipt.tds_amount) || 0;
      const gstTds = parseFloat(updatedReceipt.gst_tds_amount) || 0;
      updatedReceipt.amount_received = total - tds - gstTds;
    }

    // When payment method changes, suggest appropriate account
    if (field === 'payment_method' && accountingEnabled) {
      if (value === 'cash') {
        const cashAccount = cashBankAccounts.find(acc => acc.account_type === 'cash');
        if (cashAccount) updatedReceipt.cash_bank_account = cashAccount.id;
      } else {
        const bankAccount = cashBankAccounts.find(acc => acc.account_type === 'bank');
        if (bankAccount) updatedReceipt.cash_bank_account = bankAccount.id;
      }
    }

    setCurrentReceipt(updatedReceipt);
  };

  const handleDownloadReceipt = async (receiptId) => {
    if (!receiptId) {
      setError('No receipt available');
      return;
    }

    setDownloadingReceipt(receiptId);
    try {
      const response = await receiptAPI.download(receiptId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${receiptId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download receipt');
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const handleViewReceipt = async (receiptId) => {
    if (!receiptId) {
      setError('No receipt available');
      return;
    }

    try {
      const response = await receiptAPI.download(receiptId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      setError('Failed to view receipt');
    }
  };

  const handleSaveReceipt = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!currentReceipt.invoice) {
      setError('Please select an invoice');
      setLoading(false);
      return;
    }

    if (!currentReceipt.amount || currentReceipt.amount <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    // Accounting validation
    if (accountingEnabled && currentReceipt.post_to_ledger && !currentReceipt.cash_bank_account) {
      setError('Please select a Cash/Bank account for ledger posting');
      setLoading(false);
      return;
    }

    try {
      // Send accounting fields along with payment data - backend handles voucher creation
      const paymentData = {
        ...currentReceipt,
        post_to_ledger: accountingEnabled && currentReceipt.post_to_ledger,
      };

      if (currentReceipt.id) {
        await paymentAPI.update(currentReceipt.id, paymentData);
      } else {
        await paymentAPI.create(paymentData);
      }

      showSuccess('Receipt recorded successfully!');
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const handleEditReceipt = (receipt) => {
    setCurrentReceipt({
      ...receipt,
      tds_amount: receipt.tds_amount || 0,
      gst_tds_amount: receipt.gst_tds_amount || 0,
      amount_received: receipt.amount_received || (receipt.amount - (receipt.tds_amount || 0) - (receipt.gst_tds_amount || 0))
    });
    setShowForm(true);
    setError('');
  };

  const handleDeleteReceipt = async (id) => {
    if (window.confirm('Are you sure you want to delete this receipt record?')) {
      try {
        await paymentAPI.delete(id);
        showSuccess('Receipt deleted successfully!');
        loadData();
      } catch (err) {
        setError('Failed to delete receipt');
      }
    }
  };

  // Multi-select handlers
  const handleSelectReceipt = (receiptId) => {
    setSelectedReceipts(prev => {
      if (prev.includes(receiptId)) {
        return prev.filter(id => id !== receiptId);
      } else {
        return [...prev, receiptId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedReceipts.length === filteredReceipts.length) {
      setSelectedReceipts([]);
    } else {
      setSelectedReceipts(filteredReceipts.map(r => r.id));
    }
  };

  const clearSelection = () => {
    setSelectedReceipts([]);
  };

  // Bulk action handlers
  const handleBulkEmail = async () => {
    if (selectedReceipts.length === 0) return;

    // Only receipts with receipt_id can be emailed
    const emailableReceipts = filteredReceipts.filter(
      r => selectedReceipts.includes(r.id) && r.receipt_id
    );

    if (emailableReceipts.length === 0) {
      alert('No receipts available to email. Only receipts with generated PDFs can be emailed.');
      return;
    }

    if (!window.confirm(`Send email for ${emailableReceipts.length} receipt(s)?`)) {
      return;
    }

    setBulkActionLoading(true);
    let successCount = 0;
    let failedCount = 0;

    for (const receipt of emailableReceipts) {
      try {
        await receiptAPI.resendEmail(receipt.receipt_id);
        successCount++;
      } catch (err) {
        failedCount++;
      }
    }

    setBulkActionLoading(false);
    alert(`Email sent: ${successCount} successful${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
    clearSelection();
  };

  const handleBulkDownload = async () => {
    if (selectedReceipts.length === 0) return;

    // Only receipts with receipt_id can be downloaded
    const downloadableReceipts = filteredReceipts.filter(
      r => selectedReceipts.includes(r.id) && r.receipt_id
    );

    if (downloadableReceipts.length === 0) {
      alert('No receipts available to download. Only receipts with generated PDFs can be downloaded.');
      return;
    }

    setBulkActionLoading(true);

    for (const receipt of downloadableReceipts) {
      try {
        const response = await receiptAPI.download(receipt.receipt_id);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `receipt-${receipt.receipt_id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        // Error handled silently
      }
    }

    setBulkActionLoading(false);
    alert(`Downloaded ${downloadableReceipts.length} receipt(s)`);
    clearSelection();
  };

  const handleBulkPrint = async () => {
    if (selectedReceipts.length === 0) return;

    // Only receipts with receipt_id can be printed
    const printableReceipts = filteredReceipts.filter(
      r => selectedReceipts.includes(r.id) && r.receipt_id
    );

    if (printableReceipts.length === 0) {
      alert('No receipts available to print. Only receipts with generated PDFs can be printed.');
      return;
    }

    setBulkActionLoading(true);

    for (const receipt of printableReceipts) {
      try {
        const response = await receiptAPI.download(receipt.receipt_id);
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
        // Error handled silently
      }
    }

    setBulkActionLoading(false);
    clearSelection();
  };

  const handleShareWhatsApp = (receipt) => {
    // Format currency
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(parseFloat(amount));
    };

    // Create WhatsApp message
    const message = `*Receipt: #${receipt.id}*

Dear ${receipt.client_name},

Payment received successfully!

🧾 Receipt ID: #${receipt.id}
📄 Invoice No: ${receipt.invoice_number}
📅 Date: ${formatDate(receipt.payment_date)}
💰 Amount: ${formatAmount(receipt.amount)}
💳 Payment Method: ${receipt.payment_method?.replace('_', ' ').toUpperCase()}
${receipt.reference_number ? `🔖 Reference: ${receipt.reference_number}` : ''}

Thank you for your payment!`;

    // Open WhatsApp with the message
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleBulkWhatsApp = () => {
    if (selectedReceipts.length === 0) return;

    // Format currency
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(parseFloat(amount));
    };

    // Get selected receipts details
    const selectedReceiptDetails = filteredReceipts.filter(r => selectedReceipts.includes(r.id));

    // Create summary message for multiple receipts
    let message = `*Receipt Summary*\n\n`;

    selectedReceiptDetails.forEach((receipt, index) => {
      message += `${index + 1}. Receipt #${receipt.id}\n`;
      message += `   Invoice: ${receipt.invoice_number}\n`;
      message += `   Client: ${receipt.client_name}\n`;
      message += `   Amount: ${formatAmount(receipt.amount)}\n`;
      message += `   Date: ${formatDate(receipt.payment_date)}\n\n`;
    });

    const totalAmount = selectedReceiptDetails.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    message += `*Total: ${formatAmount(totalAmount)}*\n\nThank you!`;

    // Open WhatsApp with the message
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    clearSelection();
  };

  const filteredReceipts = receipts
    .filter(receipt => {
      const matchesSearch = receipt.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           receipt.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMode = modeFilter === 'all' || receipt.payment_method === modeFilter;

      const matchesDate = !dateFilter || receipt.payment_date === dateFilter;

      return matchesSearch && matchesMode && matchesDate;
    })
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)); // Sort by date, recent first

  // Calculate stats
  const stats = useMemo(() => {
    const totalReceived = receipts.reduce((sum, r) => sum + (parseFloat(r.amount_received) || parseFloat(r.amount) || 0), 0);
    const cashReceipts = receipts.filter(r => r.payment_method === 'cash').length;
    const bankReceipts = receipts.filter(r => r.payment_method !== 'cash').length;
    return { totalReceived, cashReceipts, bankReceipts };
  }, [receipts]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Receipts</h1>
          <p className="page-description">Track and manage receipt records</p>
        </div>
        <div className="page-header-right">
          <button className="btn-create" onClick={handleRecordReceipt}>
            <span className="btn-icon">➕</span>
            Record Receipt
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={statCardStyles.statsGrid}>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#6366f1'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>📥</span>
            <span style={statCardStyles.statLabel}>Total Receipts</span>
          </div>
          <p style={statCardStyles.statValue}>{receipts.length}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#10b981'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>💵</span>
            <span style={statCardStyles.statLabel}>Total Received</span>
          </div>
          <p style={{...statCardStyles.statValue, fontSize: '22px', color: '#10b981'}}>{formatCurrency(stats.totalReceived)}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#f59e0b'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>💳</span>
            <span style={statCardStyles.statLabel}>Cash Receipts</span>
          </div>
          <p style={statCardStyles.statValue}>{stats.cashReceipts}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#3b82f6'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>🏦</span>
            <span style={statCardStyles.statLabel}>Bank Receipts</span>
          </div>
          <p style={statCardStyles.statValue}>{stats.bankReceipts}</p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Record Receipt Form */}
      {showForm && (
        <div className="content-card" style={{marginBottom: '24px'}}>
          <div className="form-section">
            <h3 className="form-section-title">Record Receipt</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Select Invoice *</label>
                <select
                  className="form-input"
                  value={currentReceipt.invoice}
                  onChange={(e) => handleReceiptChange('invoice', e.target.value)}
                >
                  <option value="">-- Select Invoice --</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {invoice.client_name} - ₹{parseFloat(invoice.total_amount || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Receipt Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={currentReceipt.payment_date}
                  onChange={(e) => handleReceiptChange('payment_date', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Payment Method *</label>
                <select
                  className="form-input"
                  value={currentReceipt.payment_method}
                  onChange={(e) => handleReceiptChange('payment_method', e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="card">Credit/Debit Card</option>
                </select>
              </div>
              <div className="form-field">
                <label>Invoice Amount (Total) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={currentReceipt.amount}
                  onChange={(e) => handleReceiptChange('amount', e.target.value)}
                  min="0"
                  step="0.01"
                />
                <small style={{color: '#666', fontSize: '11px'}}>Total amount including TDS</small>
              </div>
              <div className="form-field">
                <label>Income Tax TDS</label>
                <input
                  type="number"
                  className="form-input"
                  value={currentReceipt.tds_amount}
                  onChange={(e) => handleReceiptChange('tds_amount', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
                <small style={{color: '#666', fontSize: '11px'}}>Income Tax TDS deducted by client</small>
              </div>
              <div className="form-field">
                <label>GST TDS</label>
                <input
                  type="number"
                  className="form-input"
                  value={currentReceipt.gst_tds_amount}
                  onChange={(e) => handleReceiptChange('gst_tds_amount', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
                <small style={{color: '#666', fontSize: '11px'}}>GST TDS deducted (for Govt undertakings)</small>
              </div>
              <div className="form-field">
                <label>Amount Received in Bank</label>
                <input
                  type="number"
                  className="form-input"
                  value={currentReceipt.amount_received}
                  readOnly
                  style={{backgroundColor: '#f5f5f5'}}
                />
                <small style={{color: '#666', fontSize: '11px'}}>Auto-calculated: Total - TDS</small>
              </div>
              <div className="form-field">
                <label>Reference Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentReceipt.reference_number || ''}
                  onChange={(e) => handleReceiptChange('reference_number', e.target.value)}
                  placeholder="Transaction/Cheque No."
                />
              </div>
              {/* Accounting Fields - integrated into main form */}
              {accountingEnabled && (
                <div className="form-field">
                  <label>Cash/Bank Account {currentReceipt.post_to_ledger ? '*' : ''}</label>
                  <select
                    className="form-input"
                    value={currentReceipt.cash_bank_account}
                    onChange={(e) => handleReceiptChange('cash_bank_account', e.target.value)}
                  >
                    <option value="">-- Select Account --</option>
                    {cashBankAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} {account.account_type === 'bank' ? '(Bank)' : '(Cash)'}
                      </option>
                    ))}
                  </select>
                  <small style={{color: '#666', fontSize: '11px'}}>Account where money is received</small>
                </div>
              )}

              <div className="form-field full-width">
                <label>Notes</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={currentReceipt.notes}
                  onChange={(e) => handleReceiptChange('notes', e.target.value)}
                  placeholder="Any additional notes..."
                ></textarea>
              </div>

              {accountingEnabled && (
                <div className="form-field full-width">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentReceipt.post_to_ledger}
                      onChange={(e) => handleReceiptChange('post_to_ledger', e.target.checked)}
                      style={{ marginRight: '8px', width: '16px', height: '16px' }}
                    />
                    Post to Ledger (Create Receipt Voucher)
                  </label>
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="btn-create" onClick={handleSaveReceipt} disabled={loading}>
                <span className="btn-icon">💾</span>
                {loading ? 'Saving...' : 'Save Receipt'}
              </button>
              <button className="btn-secondary" onClick={handleCancelForm} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <>
          <div className="filters-section">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search receipts..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <select
                className="filter-select"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
              >
                <option value="all">All Payment Modes</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
                <option value="card">Credit/Debit Card</option>
              </select>
            </div>
            <div className="filter-group">
              <input
                type="date"
                className="filter-select"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedReceipts.length > 0 && (
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
                  {selectedReceipts.length} receipt{selectedReceipts.length > 1 ? 's' : ''} selected
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
                  onClick={handleBulkWhatsApp}
                  disabled={bulkActionLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#25D366',
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
                  <span>💬</span> WhatsApp
                </button>
              </div>
            </div>
          )}

          <div className="content-card">
            {filteredReceipts.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">🧾</div>
                <h3 className="empty-title">No Receipt Records</h3>
                <p className="empty-description">Record your first receipt to track transactions</p>
                <button className="btn-create" onClick={handleRecordReceipt}>
                  <span className="btn-icon">➕</span>
                  Record Your First Receipt
                </button>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedReceipts.length === filteredReceipts.length && filteredReceipts.length > 0}
                          onChange={handleSelectAll}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#6366f1',
                          }}
                          title={selectedReceipts.length === filteredReceipts.length ? 'Deselect All' : 'Select All'}
                        />
                      </th>
                      <th>ID</th>
                      <th>Invoice No</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Payment Method</th>
                      <th>Total Amount</th>
                      <th>IT TDS</th>
                      <th>GST TDS</th>
                      <th>Received</th>
                      <th>Reference</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceipts.map((receipt) => (
                      <tr
                        key={receipt.id}
                        style={{
                          backgroundColor: selectedReceipts.includes(receipt.id) ? '#f0f4ff' : 'transparent',
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedReceipts.includes(receipt.id)}
                            onChange={() => handleSelectReceipt(receipt.id)}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#6366f1',
                            }}
                          />
                        </td>
                        <td><strong>#{receipt.id}</strong></td>
                        <td>{receipt.invoice_number}</td>
                        <td>{receipt.client_name}</td>
                        <td>{formatDate(receipt.payment_date)}</td>
                        <td>
                          <span className="status-badge status-paid">
                            {receipt.payment_method?.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td><strong>₹{parseFloat(receipt.amount).toFixed(2)}</strong></td>
                        <td style={{color: parseFloat(receipt.tds_amount) > 0 ? '#b45309' : '#999'}}>
                          {parseFloat(receipt.tds_amount) > 0 ? `₹${parseFloat(receipt.tds_amount).toFixed(2)}` : '-'}
                        </td>
                        <td style={{color: parseFloat(receipt.gst_tds_amount) > 0 ? '#7c3aed' : '#999'}}>
                          {parseFloat(receipt.gst_tds_amount) > 0 ? `₹${parseFloat(receipt.gst_tds_amount).toFixed(2)}` : '-'}
                        </td>
                        <td style={{color: '#059669', fontWeight: '500'}}>
                          ₹{parseFloat(receipt.amount_received || (receipt.amount - (receipt.tds_amount || 0) - (receipt.gst_tds_amount || 0))).toFixed(2)}
                        </td>
                        <td>{receipt.reference_number || '-'}</td>
                        <td>
                          {receipt.receipt_id && (
                            <>
                              <button
                                className="btn-icon-small"
                                onClick={() => handleViewReceipt(receipt.receipt_id)}
                                title="View Receipt"
                              >
                                👁️
                              </button>
                              <button
                                className="btn-icon-small"
                                onClick={() => handleDownloadReceipt(receipt.receipt_id)}
                                title="Download Receipt"
                                disabled={downloadingReceipt === receipt.receipt_id}
                              >
                                {downloadingReceipt === receipt.receipt_id ? '⏳' : '📄'}
                              </button>
                            </>
                          )}
                          <button
                            className="btn-icon-small"
                            onClick={() => handleShareWhatsApp(receipt)}
                            title="Send via WhatsApp"
                            style={{ color: '#25D366' }}
                          >
                            💬
                          </button>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleEditReceipt(receipt)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleDeleteReceipt(receipt.id)}
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
        </>
      )}
    </div>
  );
}

export default Receipts;
