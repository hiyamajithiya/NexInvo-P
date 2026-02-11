import React, { useState, useEffect, useMemo } from 'react';
import { voucherAPI, ledgerAccountAPI, financialYearAPI } from '../services/api';
import { formatDate } from '../utils/dateFormat';
import { formatCurrency } from '../utils/formatCurrency';
import { statCardStyles } from '../styles/statCardStyles';
import { useToast } from './Toast';
import './Pages.css';

function ContraVoucher() {
  const { showSuccess, showError } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [currentFinancialYear, setCurrentFinancialYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState('');

  const [currentVoucher, setCurrentVoucher] = useState({
    voucher_date: new Date().toISOString().split('T')[0],
    from_account: '',
    to_account: '',
    amount: 0,
    narration: '',
    reference_number: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vouchersRes, accountsRes, fyRes] = await Promise.all([
        voucherAPI.getAll({ voucher_type: 'contra' }),
        ledgerAccountAPI.getCashOrBank(),
        financialYearAPI.getCurrent()
      ]);

      setVouchers(vouchersRes.data.results || vouchersRes.data || []);
      setCashBankAccounts(accountsRes.data.results || accountsRes.data || []);
      setCurrentFinancialYear(fyRes.data);
    } catch (err) {
      showError('Failed to load contra vouchers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVoucher = () => {
    setCurrentVoucher({
      voucher_date: new Date().toISOString().split('T')[0],
      from_account: '',
      to_account: '',
      amount: 0,
      narration: '',
      reference_number: ''
    });
    setShowForm(true);
    setError('');
  };

  const handleVoucherChange = (field, value) => {
    setCurrentVoucher(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveVoucher = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!currentVoucher.from_account) {
      setError('Please select source account (From Account)');
      setLoading(false);
      return;
    }

    if (!currentVoucher.to_account) {
      setError('Please select destination account (To Account)');
      setLoading(false);
      return;
    }

    if (currentVoucher.from_account === currentVoucher.to_account) {
      setError('From and To accounts cannot be the same');
      setLoading(false);
      return;
    }

    if (!currentVoucher.amount || currentVoucher.amount <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    try {
      // Create voucher with double-entry
      const voucherData = {
        voucher_type: 'contra',
        voucher_date: currentVoucher.voucher_date,
        narration: currentVoucher.narration || `Contra entry - Transfer from ${getAccountName(currentVoucher.from_account)} to ${getAccountName(currentVoucher.to_account)}`,
        reference_number: currentVoucher.reference_number,
        entries: [
          {
            ledger: currentVoucher.to_account,
            debit_amount: currentVoucher.amount,
            credit_amount: 0,
            narration: `Transfer from ${getAccountName(currentVoucher.from_account)}`
          },
          {
            ledger: currentVoucher.from_account,
            debit_amount: 0,
            credit_amount: currentVoucher.amount,
            narration: `Transfer to ${getAccountName(currentVoucher.to_account)}`
          }
        ]
      };

      if (currentVoucher.id) {
        await voucherAPI.update(currentVoucher.id, voucherData);
        showSuccess('Contra voucher updated successfully!');
      } else {
        await voucherAPI.create(voucherData);
        showSuccess('Contra voucher created successfully!');
      }

      setShowForm(false);
      loadData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save contra voucher';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const handleDeleteVoucher = async (id) => {
    if (window.confirm('Are you sure you want to delete this contra voucher?')) {
      try {
        await voucherAPI.delete(id);
        showSuccess('Contra voucher deleted successfully!');
        loadData();
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to delete voucher';
        showError(errorMsg);
      }
    }
  };

  const getAccountName = (accountId) => {
    const account = cashBankAccounts.find(acc => acc.id === parseInt(accountId));
    return account ? account.name : '';
  };

  const filteredVouchers = vouchers
    .filter(voucher => {
      const matchesSearch = voucher.voucher_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           voucher.narration?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = !dateFilter || voucher.voucher_date === dateFilter;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => new Date(b.voucher_date) - new Date(a.voucher_date));

  // Calculate totals
  const totalAmount = filteredVouchers.reduce((sum, v) => sum + parseFloat(v.total_amount || 0), 0);

  // Calculate stats
  const stats = useMemo(() => {
    const totalTransferred = vouchers.reduce((sum, v) => sum + (parseFloat(v.total_amount) || 0), 0);
    const cashAccounts = cashBankAccounts.filter(a => a.account_type === 'cash').length;
    const bankAccounts = cashBankAccounts.filter(a => a.account_type === 'bank').length;
    return { totalTransferred, cashAccounts, bankAccounts };
  }, [vouchers, cashBankAccounts]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Contra Voucher</h1>
          <p className="page-description">Transfer funds between Cash and Bank accounts</p>
          {currentFinancialYear && (
            <span className="badge badge-primary" style={{ marginTop: '8px' }}>
              FY: {currentFinancialYear.name}
            </span>
          )}
        </div>
        <div className="page-header-right">
          <button className="btn-create" onClick={handleAddVoucher}>
            <span className="btn-icon">➕</span>
            New Contra Voucher
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={statCardStyles.statsGrid}>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#6366f1'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>🔄</span>
            <span style={statCardStyles.statLabel}>Total Contra Entries</span>
          </div>
          <p style={statCardStyles.statValue}>{vouchers.length}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#10b981'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>💰</span>
            <span style={statCardStyles.statLabel}>Total Transferred</span>
          </div>
          <p style={{...statCardStyles.statValue, fontSize: '22px', color: '#10b981'}}>{formatCurrency(stats.totalTransferred)}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#f59e0b'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>💵</span>
            <span style={statCardStyles.statLabel}>Cash Accounts</span>
          </div>
          <p style={statCardStyles.statValue}>{stats.cashAccounts}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#3b82f6'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>🏦</span>
            <span style={statCardStyles.statLabel}>Bank Accounts</span>
          </div>
          <p style={statCardStyles.statValue}>{stats.bankAccounts}</p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Voucher Form */}
      {showForm && (
        <div className="content-card" style={{ marginBottom: '24px' }}>
          <div className="form-section">
            <h3 className="form-section-title">
              {currentVoucher.id ? 'Edit Contra Voucher' : 'New Contra Voucher'}
            </h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Voucher Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={currentVoucher.voucher_date}
                  onChange={(e) => handleVoucherChange('voucher_date', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Reference Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentVoucher.reference_number}
                  onChange={(e) => handleVoucherChange('reference_number', e.target.value)}
                  placeholder="Cheque No. / Transaction ID"
                />
              </div>
              <div className="form-field">
                <label>From Account (Source) *</label>
                <select
                  className="form-input"
                  value={currentVoucher.from_account}
                  onChange={(e) => handleVoucherChange('from_account', e.target.value)}
                >
                  <option value="">-- Select Source Account --</option>
                  {cashBankAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} {account.account_type === 'bank' ? '(Bank)' : '(Cash)'}
                    </option>
                  ))}
                </select>
                <small className="form-hint">Account from which money is transferred</small>
              </div>
              <div className="form-field">
                <label>To Account (Destination) *</label>
                <select
                  className="form-input"
                  value={currentVoucher.to_account}
                  onChange={(e) => handleVoucherChange('to_account', e.target.value)}
                >
                  <option value="">-- Select Destination Account --</option>
                  {cashBankAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} {account.account_type === 'bank' ? '(Bank)' : '(Cash)'}
                    </option>
                  ))}
                </select>
                <small className="form-hint">Account to which money is transferred</small>
              </div>
              <div className="form-field">
                <label>Amount *</label>
                <input
                  type="number"
                  className="form-input"
                  value={currentVoucher.amount}
                  onChange={(e) => handleVoucherChange('amount', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="form-field full-width">
                <label>Narration</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={currentVoucher.narration}
                  onChange={(e) => handleVoucherChange('narration', e.target.value)}
                  placeholder="Description of the transaction..."
                ></textarea>
              </div>
            </div>

            {/* Double Entry Preview */}
            {currentVoucher.from_account && currentVoucher.to_account && currentVoucher.amount > 0 && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                  Double Entry Preview
                </h4>
                <table style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e2e8f0' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Account</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Debit</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px' }}>{getAccountName(currentVoucher.to_account)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>
                        {parseFloat(currentVoucher.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px' }}>{getAccountName(currentVoucher.from_account)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>
                        {parseFloat(currentVoucher.amount).toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{ fontWeight: '600', borderTop: '2px solid #cbd5e1' }}>
                      <td style={{ padding: '8px' }}>Total</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {parseFloat(currentVoucher.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {parseFloat(currentVoucher.amount).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="form-actions">
              <button className="btn-create" onClick={handleSaveVoucher} disabled={loading}>
                <span className="btn-icon">💾</span>
                {loading ? 'Saving...' : 'Save Voucher'}
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
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: '12px',
              padding: '20px',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Vouchers</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{filteredVouchers.length}</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '12px',
              padding: '20px',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Amount</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{parseFloat(totalAmount).toFixed(2)}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search vouchers..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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

          {/* Vouchers Table */}
          <div className="content-card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
                <div>Loading vouchers...</div>
              </div>
            ) : filteredVouchers.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">🔄</div>
                <h3 className="empty-title">No Contra Vouchers</h3>
                <p className="empty-description">Create your first contra voucher to transfer funds between accounts</p>
                <button className="btn-create" onClick={handleAddVoucher}>
                  <span className="btn-icon">➕</span>
                  Create First Contra Voucher
                </button>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Voucher No</th>
                      <th>Date</th>
                      <th>From Account</th>
                      <th>To Account</th>
                      <th>Amount</th>
                      <th>Reference</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVouchers.map((voucher) => (
                      <tr key={voucher.id}>
                        <td><strong>{voucher.voucher_number}</strong></td>
                        <td>{formatDate(voucher.voucher_date)}</td>
                        <td>
                          {voucher.entries?.find(e => parseFloat(e.credit_amount) > 0)?.ledger_name || '-'}
                        </td>
                        <td>
                          {voucher.entries?.find(e => parseFloat(e.debit_amount) > 0)?.ledger_name || '-'}
                        </td>
                        <td style={{ fontWeight: '600' }}>
                          {parseFloat(voucher.total_amount || 0).toFixed(2)}
                        </td>
                        <td>{voucher.reference_number || '-'}</td>
                        <td>
                          <span className={`status-badge ${voucher.status === 'posted' ? 'status-paid' : 'status-draft'}`}>
                            {voucher.status?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {voucher.status !== 'posted' && (
                            <>
                              <button
                                className="btn-icon-small"
                                onClick={() => handleDeleteVoucher(voucher.id)}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </>
                          )}
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

export default ContraVoucher;
