import React, { useState, useEffect, useMemo } from 'react';
import { voucherAPI, ledgerAccountAPI, financialYearAPI } from '../services/api';
import { formatDate } from '../utils/dateFormat';
import { formatCurrency } from '../utils/formatCurrency';
import { statCardStyles } from '../styles/statCardStyles';
import { useToast } from './Toast';
import './Pages.css';

function JournalEntry() {
  const { showSuccess, showError } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [ledgerAccounts, setLedgerAccounts] = useState([]);
  const [currentFinancialYear, setCurrentFinancialYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState('');

  const [currentVoucher, setCurrentVoucher] = useState({
    voucher_date: new Date().toISOString().split('T')[0],
    narration: '',
    reference_number: '',
    entries: [
      { ledger: '', debit_amount: 0, credit_amount: 0, narration: '' },
      { ledger: '', debit_amount: 0, credit_amount: 0, narration: '' }
    ]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vouchersRes, accountsRes, fyRes] = await Promise.all([
        voucherAPI.getAll({ voucher_type: 'journal' }),
        ledgerAccountAPI.getAll(),
        financialYearAPI.getCurrent()
      ]);

      setVouchers(vouchersRes.data.results || vouchersRes.data || []);
      setLedgerAccounts(accountsRes.data.results || accountsRes.data || []);
      setCurrentFinancialYear(fyRes.data);
    } catch (err) {
      showError('Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVoucher = () => {
    setCurrentVoucher({
      voucher_date: new Date().toISOString().split('T')[0],
      narration: '',
      reference_number: '',
      entries: [
        { ledger: '', debit_amount: 0, credit_amount: 0, narration: '' },
        { ledger: '', debit_amount: 0, credit_amount: 0, narration: '' }
      ]
    });
    setShowForm(true);
    setError('');
  };

  const handleVoucherChange = (field, value) => {
    setCurrentVoucher(prev => ({ ...prev, [field]: value }));
  };

  const handleEntryChange = (index, field, value) => {
    setCurrentVoucher(prev => {
      const newEntries = [...prev.entries];
      newEntries[index] = { ...newEntries[index], [field]: value };

      // If debit is entered, clear credit and vice versa
      if (field === 'debit_amount' && parseFloat(value) > 0) {
        newEntries[index].credit_amount = 0;
      } else if (field === 'credit_amount' && parseFloat(value) > 0) {
        newEntries[index].debit_amount = 0;
      }

      return { ...prev, entries: newEntries };
    });
  };

  const addEntry = () => {
    setCurrentVoucher(prev => ({
      ...prev,
      entries: [...prev.entries, { ledger: '', debit_amount: 0, credit_amount: 0, narration: '' }]
    }));
  };

  const removeEntry = (index) => {
    if (currentVoucher.entries.length <= 2) {
      setError('Journal entry must have at least 2 lines');
      return;
    }
    setCurrentVoucher(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const totalDebit = currentVoucher.entries.reduce((sum, e) => sum + (parseFloat(e.debit_amount) || 0), 0);
    const totalCredit = currentVoucher.entries.reduce((sum, e) => sum + (parseFloat(e.credit_amount) || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.01; // Allow small floating point differences
    return { totalDebit, totalCredit, difference, isBalanced };
  };

  const handleSaveVoucher = async () => {
    setLoading(true);
    setError('');

    // Validation
    const { totalDebit, totalCredit, isBalanced } = calculateTotals();

    if (!isBalanced) {
      setError(`Debit and Credit must be equal. Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`);
      setLoading(false);
      return;
    }

    if (totalDebit === 0) {
      setError('Total amount cannot be zero');
      setLoading(false);
      return;
    }

    // Check all entries have ledger selected
    const invalidEntries = currentVoucher.entries.filter(e => !e.ledger || (parseFloat(e.debit_amount) === 0 && parseFloat(e.credit_amount) === 0));
    if (invalidEntries.length > 0) {
      setError('All entries must have a ledger and either debit or credit amount');
      setLoading(false);
      return;
    }

    try {
      const voucherData = {
        voucher_type: 'journal',
        voucher_date: currentVoucher.voucher_date,
        narration: currentVoucher.narration || 'Journal Entry',
        reference_number: currentVoucher.reference_number,
        entries: currentVoucher.entries.map(e => ({
          ledger: e.ledger,
          debit_amount: parseFloat(e.debit_amount) || 0,
          credit_amount: parseFloat(e.credit_amount) || 0,
          narration: e.narration
        }))
      };

      if (currentVoucher.id) {
        await voucherAPI.update(currentVoucher.id, voucherData);
        showSuccess('Journal entry updated successfully!');
      } else {
        await voucherAPI.create(voucherData);
        showSuccess('Journal entry created successfully!');
      }

      setShowForm(false);
      loadData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save journal entry';
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
    if (window.confirm('Are you sure you want to delete this journal entry?')) {
      try {
        await voucherAPI.delete(id);
        showSuccess('Journal entry deleted successfully!');
        loadData();
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to delete journal entry';
        showError(errorMsg);
      }
    }
  };

  const getAccountName = (accountId) => {
    const account = ledgerAccounts.find(acc => acc.id === parseInt(accountId));
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

  const { totalDebit, totalCredit, difference, isBalanced } = calculateTotals();

  // Calculate stats
  const stats = useMemo(() => {
    const totalJournalAmount = vouchers.reduce((sum, v) => sum + (parseFloat(v.total_amount) || 0), 0);
    const thisMonthVouchers = vouchers.filter(v => {
      const vDate = new Date(v.voucher_date);
      const now = new Date();
      return vDate.getMonth() === now.getMonth() && vDate.getFullYear() === now.getFullYear();
    }).length;
    return { totalJournalAmount, thisMonthVouchers };
  }, [vouchers]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Journal Entry</h1>
          <p className="page-description">Manual debit/credit entries for adjustments and corrections</p>
          {currentFinancialYear && (
            <span className="badge badge-primary" style={{ marginTop: '8px' }}>
              FY: {currentFinancialYear.name}
            </span>
          )}
        </div>
        <div className="page-header-right">
          <button className="btn-create" onClick={handleAddVoucher}>
            <span className="btn-icon">➕</span>
            New Journal Entry
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={statCardStyles.statsGrid}>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#6366f1'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>📝</span>
            <span style={statCardStyles.statLabel}>Total Journal Entries</span>
          </div>
          <p style={statCardStyles.statValue}>{vouchers.length}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#10b981'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>💰</span>
            <span style={statCardStyles.statLabel}>Total Amount</span>
          </div>
          <p style={{...statCardStyles.statValue, fontSize: '22px', color: '#10b981'}}>{formatCurrency(stats.totalJournalAmount)}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#f59e0b'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>📅</span>
            <span style={statCardStyles.statLabel}>This Month</span>
          </div>
          <p style={statCardStyles.statValue}>{stats.thisMonthVouchers}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#3b82f6'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>📚</span>
            <span style={statCardStyles.statLabel}>Total Ledgers</span>
          </div>
          <p style={statCardStyles.statValue}>{ledgerAccounts.length}</p>
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
              {currentVoucher.id ? 'Edit Journal Entry' : 'New Journal Entry'}
            </h3>

            {/* Header Fields */}
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
                  placeholder="Reference / Document No."
                />
              </div>
              <div className="form-field full-width">
                <label>Narration</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={currentVoucher.narration}
                  onChange={(e) => handleVoucherChange('narration', e.target.value)}
                  placeholder="Description of the journal entry..."
                ></textarea>
              </div>
            </div>

            {/* Entry Lines */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>
                  Entry Lines
                </h4>
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={addEntry}
                >
                  + Add Line
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Account</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', fontSize: '13px', width: '150px' }}>Debit</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', fontSize: '13px', width: '150px' }}>Credit</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Narration</th>
                    <th style={{ padding: '10px', width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {currentVoucher.entries.map((entry, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px' }}>
                        <select
                          className="form-input"
                          value={entry.ledger}
                          onChange={(e) => handleEntryChange(index, 'ledger', e.target.value)}
                          style={{ marginBottom: 0 }}
                        >
                          <option value="">-- Select Account --</option>
                          {ledgerAccounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.name} ({account.group_name})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={entry.debit_amount || ''}
                          onChange={(e) => handleEntryChange(index, 'debit_amount', e.target.value)}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          style={{ marginBottom: 0, textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={entry.credit_amount || ''}
                          onChange={(e) => handleEntryChange(index, 'credit_amount', e.target.value)}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          style={{ marginBottom: 0, textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={entry.narration || ''}
                          onChange={(e) => handleEntryChange(index, 'narration', e.target.value)}
                          placeholder="Line narration"
                          style={{ marginBottom: 0 }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-icon-small"
                          onClick={() => removeEntry(index)}
                          title="Remove line"
                          style={{ color: '#dc2626' }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: '600' }}>
                    <td style={{ padding: '12px', textAlign: 'right' }}>Total:</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#059669' }}>
                      {totalDebit.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>
                      {totalCredit.toFixed(2)}
                    </td>
                    <td colSpan="2" style={{ padding: '12px' }}>
                      {isBalanced ? (
                        <span style={{ color: '#059669', fontSize: '13px' }}>
                          ✓ Balanced
                        </span>
                      ) : (
                        <span style={{ color: '#dc2626', fontSize: '13px' }}>
                          ✗ Difference: {difference.toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button
                className="btn-create"
                onClick={handleSaveVoucher}
                disabled={loading || !isBalanced}
              >
                <span className="btn-icon">💾</span>
                {loading ? 'Saving...' : 'Save Journal Entry'}
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
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '12px',
              padding: '20px',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Journal Entries</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{filteredVouchers.length}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search journal entries..."
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
                <div>Loading journal entries...</div>
              </div>
            ) : filteredVouchers.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">📝</div>
                <h3 className="empty-title">No Journal Entries</h3>
                <p className="empty-description">Create your first journal entry for manual adjustments</p>
                <button className="btn-create" onClick={handleAddVoucher}>
                  <span className="btn-icon">➕</span>
                  Create First Journal Entry
                </button>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Voucher No</th>
                      <th>Date</th>
                      <th>Narration</th>
                      <th>Debit Total</th>
                      <th>Credit Total</th>
                      <th>Reference</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVouchers.map((voucher) => {
                      const debitTotal = voucher.entries?.reduce((sum, e) => sum + parseFloat(e.debit_amount || 0), 0) || 0;
                      const creditTotal = voucher.entries?.reduce((sum, e) => sum + parseFloat(e.credit_amount || 0), 0) || 0;
                      return (
                        <tr key={voucher.id}>
                          <td><strong>{voucher.voucher_number}</strong></td>
                          <td>{formatDate(voucher.voucher_date)}</td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {voucher.narration || '-'}
                          </td>
                          <td style={{ color: '#059669', fontWeight: '500' }}>
                            {debitTotal.toFixed(2)}
                          </td>
                          <td style={{ color: '#dc2626', fontWeight: '500' }}>
                            {creditTotal.toFixed(2)}
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
                      );
                    })}
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

export default JournalEntry;
