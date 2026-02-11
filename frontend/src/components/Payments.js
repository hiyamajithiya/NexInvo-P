import React, { useState, useEffect, useMemo } from 'react';
import { expensePaymentAPI, ledgerAccountAPI } from '../services/api';
import { formatDate } from '../utils/dateFormat';
import { formatCurrency } from '../utils/formatCurrency';
import { statCardStyles } from '../styles/statCardStyles';
import { useToast } from './Toast';
import './Pages.css';

function Payments() {
  const { showSuccess, showError } = useToast();
  const [payments, setPayments] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [expenseLedgers, setExpenseLedgers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState('');
  const [accountingEnabled, setAccountingEnabled] = useState(false);

  // Multi-select states
  const [selectedPayments, setSelectedPayments] = useState([]);

  const [currentPayment, setCurrentPayment] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'cash',
    category: 'general',
    payee_name: '',
    reference_number: '',
    description: '',
    notes: '',
    cash_bank_account: '',
    expense_ledger: '',
    post_to_ledger: true
  });

  // Payment categories
  const paymentCategories = [
    { value: 'general', label: 'General Expense' },
    { value: 'salary', label: 'Salary/Wages' },
    { value: 'rent', label: 'Rent' },
    { value: 'utilities', label: 'Utilities (Electricity, Water, etc.)' },
    { value: 'office', label: 'Office Supplies' },
    { value: 'travel', label: 'Travel & Conveyance' },
    { value: 'professional', label: 'Professional Fees' },
    { value: 'maintenance', label: 'Repair & Maintenance' },
    { value: 'communication', label: 'Communication (Phone, Internet)' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'taxes', label: 'Taxes & Duties' },
    { value: 'bank_charges', label: 'Bank Charges' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await expensePaymentAPI.getAll();
      setPayments(response.data.results || response.data || []);

      // Try to load accounting data
      try {
        const [cashBankRes, allLedgersRes] = await Promise.all([
          ledgerAccountAPI.getCashOrBank(),
          ledgerAccountAPI.getAll()
        ]);
        const accounts = cashBankRes.data.results || cashBankRes.data || [];
        setCashBankAccounts(accounts);

        // Filter expense/indirect expense ledgers for expense selection
        const allLedgers = allLedgersRes.data.results || allLedgersRes.data || [];
        const expenseAccounts = allLedgers.filter(l =>
          l.group_name?.toLowerCase().includes('expense') ||
          l.account_type === 'expense'
        );
        setExpenseLedgers(expenseAccounts.length > 0 ? expenseAccounts : allLedgers);
        setAccountingEnabled(accounts.length > 0);
      } catch (accountErr) {
        // Accounting not set up yet
        setAccountingEnabled(false);
      }
    } catch (err) {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = () => {
    const defaultCashAccount = cashBankAccounts.find(acc => acc.account_type === 'cash')?.id ||
                               cashBankAccounts.find(acc => acc.account_type === 'bank')?.id || '';
    setCurrentPayment({
      payment_date: new Date().toISOString().split('T')[0],
      amount: 0,
      payment_method: 'cash',
      category: 'general',
      payee_name: '',
      reference_number: '',
      description: '',
      notes: '',
      cash_bank_account: defaultCashAccount,
      expense_ledger: '',
      post_to_ledger: accountingEnabled
    });
    setShowForm(true);
    setError('');
  };

  const handlePaymentChange = (field, value) => {
    const updated = { ...currentPayment, [field]: value };

    // When payment method changes, suggest appropriate account
    if (field === 'payment_method' && accountingEnabled) {
      if (value === 'cash') {
        const cashAccount = cashBankAccounts.find(acc => acc.account_type === 'cash');
        if (cashAccount) updated.cash_bank_account = cashAccount.id;
      } else {
        const bankAccount = cashBankAccounts.find(acc => acc.account_type === 'bank');
        if (bankAccount) updated.cash_bank_account = bankAccount.id;
      }
    }

    setCurrentPayment(updated);
  };

  const handleSavePayment = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!currentPayment.amount || currentPayment.amount <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    if (!currentPayment.payee_name.trim()) {
      setError('Please enter payee name');
      setLoading(false);
      return;
    }

    if (!currentPayment.description.trim()) {
      setError('Please enter a description');
      setLoading(false);
      return;
    }

    // Accounting validation
    if (accountingEnabled && currentPayment.post_to_ledger) {
      if (!currentPayment.cash_bank_account) {
        setError('Please select a Cash/Bank account for ledger posting');
        setLoading(false);
        return;
      }
      if (!currentPayment.expense_ledger) {
        setError('Please select an expense ledger for ledger posting');
        setLoading(false);
        return;
      }
    }

    try {
      // Send accounting fields along with payment data - backend handles voucher creation
      const paymentData = {
        ...currentPayment,
        post_to_ledger: accountingEnabled && currentPayment.post_to_ledger,
      };

      if (currentPayment.id) {
        await expensePaymentAPI.update(currentPayment.id, paymentData);
      } else {
        await expensePaymentAPI.create(paymentData);
      }

      showSuccess('Payment recorded successfully!');
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const handleEditPayment = (payment) => {
    setCurrentPayment({
      ...payment
    });
    setShowForm(true);
    setError('');
  };

  const handleDeletePayment = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        await expensePaymentAPI.delete(id);
        showSuccess('Payment deleted successfully!');
        loadData();
      } catch (err) {
        setError('Failed to delete payment');
      }
    }
  };

  // Multi-select handlers
  const handleSelectPayment = (paymentId) => {
    setSelectedPayments(prev => {
      if (prev.includes(paymentId)) {
        return prev.filter(id => id !== paymentId);
      } else {
        return [...prev, paymentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPayments.length === filteredPayments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(filteredPayments.map(p => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedPayments([]);
  };

  const getCategoryLabel = (categoryValue) => {
    const category = paymentCategories.find(c => c.value === categoryValue);
    return category ? category.label : categoryValue;
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      'cash': 'Cash',
      'bank_transfer': 'Bank Transfer',
      'cheque': 'Cheque',
      'upi': 'UPI',
      'card': 'Credit/Debit Card'
    };
    return methods[method] || method;
  };

  const filteredPayments = payments
    .filter(payment => {
      const matchesSearch = payment.payee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMode = modeFilter === 'all' || payment.payment_method === modeFilter;

      const matchesCategory = categoryFilter === 'all' || payment.category === categoryFilter;

      const matchesDate = !dateFilter || payment.payment_date === dateFilter;

      return matchesSearch && matchesMode && matchesCategory && matchesDate;
    })
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)); // Sort by date, recent first

  // Calculate totals
  const totalAmount = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  // Calculate stats
  const stats = useMemo(() => {
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const cashPayments = payments.filter(p => p.payment_method === 'cash').length;
    const bankPayments = payments.filter(p => p.payment_method !== 'cash').length;
    return { totalPaid, cashPayments, bankPayments };
  }, [payments]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Payments</h1>
          <p className="page-description">Record and manage outgoing payments (cash, bank, etc.)</p>
        </div>
        <div className="page-header-right">
          <button className="btn-create" onClick={handleRecordPayment}>
            <span className="btn-icon">➕</span>
            Record Payment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={statCardStyles.statsGrid}>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#6366f1'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>📤</span>
            <span style={statCardStyles.statLabel}>Total Payments</span>
          </div>
          <p style={statCardStyles.statValue}>{payments.length}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#ef4444'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>💸</span>
            <span style={statCardStyles.statLabel}>Total Paid</span>
          </div>
          <p style={{...statCardStyles.statValue, fontSize: '22px', color: '#ef4444'}}>{formatCurrency(stats.totalPaid)}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#f59e0b'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>💵</span>
            <span style={statCardStyles.statLabel}>Cash Payments</span>
          </div>
          <p style={statCardStyles.statValue}>{stats.cashPayments}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#3b82f6'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>🏦</span>
            <span style={statCardStyles.statLabel}>Bank Payments</span>
          </div>
          <p style={statCardStyles.statValue}>{stats.bankPayments}</p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Record Payment Form */}
      {showForm && (
        <div className="content-card" style={{marginBottom: '24px'}}>
          <div className="form-section">
            <h3 className="form-section-title">{currentPayment.id ? 'Edit Payment' : 'Record Payment'}</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Payment Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={currentPayment.payment_date}
                  onChange={(e) => handlePaymentChange('payment_date', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Payee Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentPayment.payee_name}
                  onChange={(e) => handlePaymentChange('payee_name', e.target.value)}
                  placeholder="Who was this payment made to?"
                />
              </div>
              <div className="form-field">
                <label>Amount *</label>
                <input
                  type="number"
                  className="form-input"
                  value={currentPayment.amount}
                  onChange={(e) => handlePaymentChange('amount', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="form-field">
                <label>Payment Method *</label>
                <select
                  className="form-input"
                  value={currentPayment.payment_method}
                  onChange={(e) => handlePaymentChange('payment_method', e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="card">Credit/Debit Card</option>
                </select>
              </div>
              <div className="form-field">
                <label>Category *</label>
                <select
                  className="form-input"
                  value={currentPayment.category}
                  onChange={(e) => handlePaymentChange('category', e.target.value)}
                >
                  {paymentCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Reference Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentPayment.reference_number || ''}
                  onChange={(e) => handlePaymentChange('reference_number', e.target.value)}
                  placeholder="Transaction/Cheque/Receipt No."
                />
              </div>
              <div className="form-field full-width">
                <label>Description *</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentPayment.description}
                  onChange={(e) => handlePaymentChange('description', e.target.value)}
                  placeholder="Brief description of this payment"
                />
              </div>
              {/* Accounting Fields - integrated into main form */}
              {accountingEnabled && (
                <>
                  <div className="form-field">
                    <label>Cash/Bank Account {currentPayment.post_to_ledger ? '*' : ''}</label>
                    <select
                      className="form-input"
                      value={currentPayment.cash_bank_account}
                      onChange={(e) => handlePaymentChange('cash_bank_account', e.target.value)}
                    >
                      <option value="">-- Select Account --</option>
                      {cashBankAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} {account.account_type === 'bank' ? '(Bank)' : '(Cash)'}
                        </option>
                      ))}
                    </select>
                    <small style={{color: '#666', fontSize: '11px'}}>Account from which payment is made</small>
                  </div>
                  <div className="form-field">
                    <label>Expense Ledger {currentPayment.post_to_ledger ? '*' : ''}</label>
                    <select
                      className="form-input"
                      value={currentPayment.expense_ledger}
                      onChange={(e) => handlePaymentChange('expense_ledger', e.target.value)}
                    >
                      <option value="">-- Select Expense Ledger --</option>
                      {expenseLedgers.map(ledger => (
                        <option key={ledger.id} value={ledger.id}>
                          {ledger.name} ({ledger.group_name})
                        </option>
                      ))}
                    </select>
                    <small style={{color: '#666', fontSize: '11px'}}>Ledger to debit for this expense</small>
                  </div>
                </>
              )}

              <div className="form-field full-width">
                <label>Notes</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={currentPayment.notes || ''}
                  onChange={(e) => handlePaymentChange('notes', e.target.value)}
                  placeholder="Any additional notes..."
                ></textarea>
              </div>

              {accountingEnabled && (
                <div className="form-field full-width">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentPayment.post_to_ledger}
                      onChange={(e) => handlePaymentChange('post_to_ledger', e.target.checked)}
                      style={{ marginRight: '8px', width: '16px', height: '16px' }}
                    />
                    Post to Ledger (Create Payment Voucher)
                  </label>
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="btn-create" onClick={handleSavePayment} disabled={loading}>
                <span className="btn-icon">💾</span>
                {loading ? 'Saving...' : 'Save Payment'}
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
          {/* Summary Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '12px',
              padding: '20px',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Payments</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{filteredPayments.length}</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              borderRadius: '12px',
              padding: '20px',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Amount</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{parseFloat(totalAmount).toFixed(2)}</div>
            </div>
          </div>

          <div className="filters-section">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search payments..."
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
              <select
                className="filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {paymentCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
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
          {selectedPayments.length > 0 && (
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
                  {selectedPayments.length} payment{selectedPayments.length > 1 ? 's' : ''} selected
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
            </div>
          )}

          <div className="content-card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
                <div>Loading payments...</div>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">💳</div>
                <h3 className="empty-title">No Payment Records</h3>
                <p className="empty-description">Record your first payment to track expenses</p>
                <button className="btn-create" onClick={handleRecordPayment}>
                  <span className="btn-icon">➕</span>
                  Record Your First Payment
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
                          checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                          onChange={handleSelectAll}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#6366f1',
                          }}
                          title={selectedPayments.length === filteredPayments.length ? 'Deselect All' : 'Select All'}
                        />
                      </th>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Payee</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Reference</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        style={{
                          backgroundColor: selectedPayments.includes(payment.id) ? '#f0f4ff' : 'transparent',
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedPayments.includes(payment.id)}
                            onChange={() => handleSelectPayment(payment.id)}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#6366f1',
                            }}
                          />
                        </td>
                        <td><strong>#{payment.id}</strong></td>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td><strong>{payment.payee_name}</strong></td>
                        <td>{payment.description}</td>
                        <td>
                          <span className="status-badge status-draft" style={{ fontSize: '11px' }}>
                            {getCategoryLabel(payment.category)}
                          </span>
                        </td>
                        <td>
                          <span className="status-badge status-paid">
                            {getPaymentMethodLabel(payment.payment_method)}
                          </span>
                        </td>
                        <td style={{ color: '#dc2626', fontWeight: '600' }}>
                          {parseFloat(payment.amount).toFixed(2)}
                        </td>
                        <td>{payment.reference_number || '-'}</td>
                        <td>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleEditPayment(payment)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleDeletePayment(payment.id)}
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

export default Payments;
