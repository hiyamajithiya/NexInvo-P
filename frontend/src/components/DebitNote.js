import React, { useState, useEffect, useMemo } from 'react';
import { voucherAPI, ledgerAccountAPI, financialYearAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { statCardStyles } from '../styles/statCardStyles';
import { useToast } from './Toast';
import './Pages.css';

function DebitNote() {
  const { showSuccess, showError } = useToast();
  const [debitNotes, setDebitNotes] = useState([]);
  const [partyLedgers, setPartyLedgers] = useState([]);
  const [expenseLedgers, setExpenseLedgers] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialFormState = {
    voucher_date: new Date().toISOString().split('T')[0],
    party_ledger: '',
    expense_ledger: '',
    amount: '',
    narration: '',
    reference_number: ''
  };

  const [currentNote, setCurrentNote] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load debit note vouchers
      const vouchersRes = await voucherAPI.getAll({ voucher_type: 'debit_note' });
      setDebitNotes(vouchersRes.data.results || vouchersRes.data || []);

      // Load party ledgers (suppliers/creditors)
      const partiesRes = await ledgerAccountAPI.getParties();
      setPartyLedgers(partiesRes.data.results || partiesRes.data || []);

      // Load expense/income ledgers for debit reasons
      const ledgersRes = await ledgerAccountAPI.getAll();
      const allLedgers = ledgersRes.data.results || ledgersRes.data || [];
      const expenseOrIncome = allLedgers.filter(l =>
        l.account_type === 'expense' ||
        l.account_type === 'income' ||
        l.group_name?.toLowerCase().includes('expense') ||
        l.group_name?.toLowerCase().includes('income') ||
        l.group_name?.toLowerCase().includes('purchase')
      );
      setExpenseLedgers(expenseOrIncome);

      // Load financial year
      try {
        const fyRes = await financialYearAPI.getCurrent();
        if (fyRes.data && !fyRes.data.error) {
          setFinancialYear(fyRes.data);
        }
      } catch (fyErr) {
        // Financial year not configured
      }
    } catch (err) {
      showError('Failed to load debit notes');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentNote(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentNote.party_ledger || !currentNote.expense_ledger || !currentNote.amount) {
      showError('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(currentNote.amount);
    if (isNaN(amount) || amount <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      // Create debit note voucher
      // Debit Note: Debit the Party (reduce liability), Credit the Expense/Purchase Return
      const voucherData = {
        voucher_type: 'debit_note',
        voucher_date: currentNote.voucher_date,
        narration: currentNote.narration,
        reference_number: currentNote.reference_number,
        entries: [
          {
            ledger: parseInt(currentNote.party_ledger),
            debit_amount: amount,
            credit_amount: 0
          },
          {
            ledger: parseInt(currentNote.expense_ledger),
            debit_amount: 0,
            credit_amount: amount
          }
        ]
      };

      if (editingId) {
        await voucherAPI.update(editingId, voucherData);
        showSuccess('Debit Note updated successfully');
      } else {
        await voucherAPI.create(voucherData);
        showSuccess('Debit Note created successfully');
      }

      setShowForm(false);
      setCurrentNote(initialFormState);
      setEditingId(null);
      loadData();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to save debit note');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (note) => {
    const entries = note.entries || [];
    const debitEntry = entries.find(e => parseFloat(e.debit_amount) > 0);
    const creditEntry = entries.find(e => parseFloat(e.credit_amount) > 0);

    setCurrentNote({
      voucher_date: note.voucher_date,
      party_ledger: debitEntry?.ledger?.toString() || '',
      expense_ledger: creditEntry?.ledger?.toString() || '',
      amount: debitEntry?.debit_amount || creditEntry?.credit_amount || '',
      narration: note.narration || '',
      reference_number: note.reference_number || ''
    });
    setEditingId(note.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this debit note?')) return;

    try {
      await voucherAPI.delete(id);
      showSuccess('Debit Note deleted');
      loadData();
    } catch (err) {
      showError('Failed to delete debit note');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setCurrentNote(initialFormState);
    setEditingId(null);
  };

  const getPartyName = (entries) => {
    const debitEntry = entries?.find(e => parseFloat(e.debit_amount) > 0);
    return debitEntry?.ledger_name || '-';
  };

  const getAmount = (entries) => {
    const debitEntry = entries?.find(e => parseFloat(e.debit_amount) > 0);
    return parseFloat(debitEntry?.debit_amount || 0);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalDebitAmount = debitNotes.reduce((sum, dn) => {
      const amount = getAmount(dn.entries);
      return sum + amount;
    }, 0);
    const thisMonthNotes = debitNotes.filter(dn => {
      const date = new Date(dn.voucher_date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    return { totalDebitAmount, thisMonthNotes };
  }, [debitNotes]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Debit Notes</h1>
          <p className="page-description">Purchase returns and debit adjustments</p>
          {financialYear && (
            <span className="badge badge-primary" style={{ marginTop: '8px' }}>
              FY: {financialYear.name}
            </span>
          )}
        </div>
        <div className="page-header-right">
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <span className="btn-icon">+</span>
            New Debit Note
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={statCardStyles.statsGrid}>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#6366f1'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>📄</span>
            <span style={statCardStyles.statLabel}>Total Debit Notes</span>
          </div>
          <p style={statCardStyles.statValue}>{debitNotes.length}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#ef4444'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>💸</span>
            <span style={statCardStyles.statLabel}>Total Debit Amount</span>
          </div>
          <p style={{...statCardStyles.statValue, fontSize: '22px', color: '#ef4444'}}>{formatCurrency(stats.totalDebitAmount)}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#f59e0b'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>📅</span>
            <span style={statCardStyles.statLabel}>This Month</span>
          </div>
          <p style={statCardStyles.statValue}>{stats.thisMonthNotes}</p>
        </div>
        <div style={{...statCardStyles.statCard, borderLeftColor: '#3b82f6'}}>
          <div style={statCardStyles.statHeader}>
            <span style={statCardStyles.statIcon}>👥</span>
            <span style={statCardStyles.statLabel}>Party Ledgers</span>
          </div>
          <p style={statCardStyles.statValue}>{partyLedgers.length}</p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Debit Note' : 'New Debit Note'}</h2>
              <button className="modal-close" onClick={handleCancel}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Date <span className="required">*</span></label>
                  <input
                    type="date"
                    name="voucher_date"
                    value={currentNote.voucher_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Reference Number</label>
                  <input
                    type="text"
                    name="reference_number"
                    value={currentNote.reference_number}
                    onChange={handleInputChange}
                    placeholder="Original invoice/bill no."
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Party (Supplier/Creditor) <span className="required">*</span></label>
                  <select
                    name="party_ledger"
                    value={currentNote.party_ledger}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Select Party --</option>
                    {partyLedgers.map(ledger => (
                      <option key={ledger.id} value={ledger.id}>
                        {ledger.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Reason (Account to Credit) <span className="required">*</span></label>
                  <select
                    name="expense_ledger"
                    value={currentNote.expense_ledger}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Select Account --</option>
                    {expenseLedgers.map(ledger => (
                      <option key={ledger.id} value={ledger.id}>
                        {ledger.name} ({ledger.group_name})
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
                    For purchase returns, select Purchase Account. For price difference, select appropriate expense.
                  </small>
                </div>
                <div className="form-group">
                  <label>Amount <span className="required">*</span></label>
                  <input
                    type="number"
                    name="amount"
                    value={currentNote.amount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Narration</label>
                  <textarea
                    name="narration"
                    value={currentNote.narration}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="Reason for debit note..."
                  />
                </div>
              </div>

              {/* Double Entry Preview */}
              {currentNote.party_ledger && currentNote.expense_ledger && currentNote.amount && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#475569' }}>Accounting Entry Preview</h4>
                  <table style={{ width: '100%', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Account</th>
                        <th style={{ textAlign: 'right', padding: '8px' }}>Debit</th>
                        <th style={{ textAlign: 'right', padding: '8px' }}>Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px' }}>
                          {partyLedgers.find(l => l.id === parseInt(currentNote.party_ledger))?.name || 'Party'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', color: '#059669' }}>
                          {parseFloat(currentNote.amount || 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>-</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px' }}>
                          {expenseLedgers.find(l => l.id === parseInt(currentNote.expense_ledger))?.name || 'Expense'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>-</td>
                        <td style={{ textAlign: 'right', padding: '8px', color: '#dc2626' }}>
                          {parseFloat(currentNote.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingId ? 'Update' : 'Save')} Debit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="content-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
            <div>Loading debit notes...</div>
          </div>
        ) : debitNotes.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📋</div>
            <h3 className="empty-title">No Debit Notes</h3>
            <p className="empty-description">Create your first debit note for purchase returns or adjustments.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <span className="btn-icon">+</span>
              New Debit Note
            </button>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Voucher No</th>
                  <th>Party</th>
                  <th>Reference</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Narration</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {debitNotes.map(note => (
                  <tr key={note.id}>
                    <td>{new Date(note.voucher_date).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span style={{
                        backgroundColor: '#be123c',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginRight: '4px'
                      }}>
                        DN
                      </span>
                      {note.voucher_number}
                    </td>
                    <td>{getPartyName(note.entries)}</td>
                    <td>{note.reference_number || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: '#be123c' }}>
                      {getAmount(note.entries).toFixed(2)}
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {note.narration || '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-icon-small"
                          onClick={() => handleEdit(note)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon-small btn-danger"
                          onClick={() => handleDelete(note.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
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

export default DebitNote;
