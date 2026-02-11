import React, { useState, useEffect, useRef } from 'react';
import { bankReconciliationAPI, ledgerAccountAPI, voucherAPI, financialYearAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';

function BankReconciliation() {
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef(null);

  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [reconciliations, setReconciliations] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showReconcileView, setShowReconcileView] = useState(false);
  const [currentReconciliation, setCurrentReconciliation] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state for new reconciliation
  const initialFormState = {
    statement_date: new Date().toISOString().split('T')[0],
    statement_opening_balance: '',
    statement_closing_balance: '',
    notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Reconciliation items state
  const [bookEntries, setBookEntries] = useState([]);
  const [bankStatementEntries, setBankStatementEntries] = useState([]);
  const [unmatchedEntries, setUnmatchedEntries] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBank) {
      loadReconciliations();
    }
  }, [selectedBank]);

  const loadInitialData = async () => {
    try {
      // Load bank accounts
      const ledgersRes = await ledgerAccountAPI.getCashOrBank();
      const banks = (ledgersRes.data.results || ledgersRes.data || []).filter(
        l => l.account_type === 'bank' || l.group_name?.toLowerCase().includes('bank')
      );
      setBankAccounts(banks);

      if (banks.length > 0) {
        setSelectedBank(banks[0].id.toString());
      }

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
      showError('Failed to load bank accounts');
    }
  };

  const loadReconciliations = async () => {
    setLoading(true);
    try {
      const res = await bankReconciliationAPI.getAll({ bank_account: selectedBank });
      setReconciliations(res.data.results || res.data || []);
    } catch (err) {
      if (err.response?.status !== 404) {
        showError('Failed to load reconciliations');
      }
      setReconciliations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBookEntries = async (bankId, startDate, endDate) => {
    try {
      // Get all vouchers for this bank account in the period
      const res = await voucherAPI.getAll({
        ledger: bankId,
        from_date: startDate,
        to_date: endDate,
        ordering: 'voucher_date',
        page_size: 500
      });

      const vouchers = res.data.results || res.data || [];
      const entries = [];

      vouchers.forEach(voucher => {
        const bankEntries = (voucher.entries || []).filter(e => e.ledger_account === parseInt(bankId));
        bankEntries.forEach(entry => {
          entries.push({
            id: `book-${voucher.id}-${entry.id}`,
            voucher_id: voucher.id,
            entry_id: entry.id,
            date: voucher.voucher_date,
            description: voucher.narration || `${voucher.voucher_type} - ${voucher.voucher_number}`,
            reference: voucher.reference_number || voucher.voucher_number,
            debit: parseFloat(entry.debit_amount) || 0,
            credit: parseFloat(entry.credit_amount) || 0,
            voucher_number: voucher.voucher_number,
            voucher_type: voucher.voucher_type,
            is_reconciled: false,
            source: 'book'
          });
        });
      });

      setBookEntries(entries);
      return entries;
    } catch (err) {
      showError('Failed to load book entries');
      return [];
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStartReconciliation = async () => {
    if (!selectedBank || !formData.statement_date || !formData.statement_closing_balance) {
      showError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // Calculate book balance
      const bankAccount = bankAccounts.find(b => b.id === parseInt(selectedBank));
      const bookBalance = parseFloat(bankAccount?.current_balance) || 0;

      // Create reconciliation
      const reconciliationData = {
        bank_account: parseInt(selectedBank),
        reconciliation_date: new Date().toISOString().split('T')[0],
        statement_date: formData.statement_date,
        statement_opening_balance: parseFloat(formData.statement_opening_balance) || 0,
        statement_closing_balance: parseFloat(formData.statement_closing_balance),
        book_balance: bookBalance,
        notes: formData.notes,
        status: 'in_progress'
      };

      const res = await bankReconciliationAPI.create(reconciliationData);
      setCurrentReconciliation(res.data);

      // Load book entries for reconciliation
      const fyStart = financialYear?.start_date || new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0];
      await loadBookEntries(selectedBank, fyStart, formData.statement_date);

      setShowForm(false);
      setShowReconcileView(true);
      showSuccess('Reconciliation started');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to start reconciliation');
    } finally {
      setSaving(false);
    }
  };

  const handleContinueReconciliation = async (reconciliation) => {
    setCurrentReconciliation(reconciliation);

    // Load book entries
    const fyStart = financialYear?.start_date || new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0];
    await loadBookEntries(reconciliation.bank_account, fyStart, reconciliation.statement_date);

    // Load existing reconciliation items
    try {
      const res = await bankReconciliationAPI.getById(reconciliation.id);
      const items = res.data.items || [];

      // Mark reconciled items in book entries
      const reconciledIds = items.filter(i => i.is_reconciled).map(i => i.voucher_entry);
      setBookEntries(prev => prev.map(entry => ({
        ...entry,
        is_reconciled: reconciledIds.includes(entry.entry_id)
      })));

      // Get bank-only entries
      const bankOnlyItems = items.filter(i => i.is_bank_only);
      setBankStatementEntries(bankOnlyItems.map(item => ({
        id: `bank-${item.id}`,
        item_id: item.id,
        date: item.transaction_date,
        description: item.description,
        reference: item.bank_reference,
        debit: parseFloat(item.debit_amount) || 0,
        credit: parseFloat(item.credit_amount) || 0,
        is_reconciled: item.is_reconciled,
        source: 'bank'
      })));
    } catch (err) {
      // Error handled silently
    }

    setShowReconcileView(true);
  };

  const handleToggleReconciled = async (entry) => {
    if (!currentReconciliation) return;

    try {
      const newStatus = !entry.is_reconciled;

      if (entry.source === 'book' && entry.entry_id) {
        await bankReconciliationAPI.reconcileItem(
          currentReconciliation.id,
          entry.entry_id,
          newStatus
        );
      }

      // Update local state
      if (entry.source === 'book') {
        setBookEntries(prev => prev.map(e =>
          e.id === entry.id ? { ...e, is_reconciled: newStatus } : e
        ));
      } else {
        setBankStatementEntries(prev => prev.map(e =>
          e.id === entry.id ? { ...e, is_reconciled: newStatus } : e
        ));
      }
    } catch (err) {
      showError('Failed to update reconciliation status');
    }
  };

  const handleImportStatement = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Parse CSV file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const dateIdx = headers.findIndex(h => h.includes('date'));
        const descIdx = headers.findIndex(h => h.includes('description') || h.includes('narration') || h.includes('particulars'));
        const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('withdrawal') || h.includes('dr'));
        const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('deposit') || h.includes('cr'));
        const refIdx = headers.findIndex(h => h.includes('ref') || h.includes('cheque') || h.includes('chq'));

        const entries = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const cols = parseCSVLine(lines[i]);
          if (cols.length < 3) continue;

          const date = parseDate(cols[dateIdx] || '');
          if (!date) continue;

          entries.push({
            id: `bank-import-${i}`,
            date,
            description: cols[descIdx] || '',
            reference: refIdx >= 0 ? cols[refIdx] || '' : '',
            debit: parseFloat(cols[debitIdx]?.replace(/[^0-9.-]/g, '') || 0) || 0,
            credit: parseFloat(cols[creditIdx]?.replace(/[^0-9.-]/g, '') || 0) || 0,
            is_reconciled: false,
            source: 'bank'
          });
        }

        setBankStatementEntries(entries);
        showSuccess(`Imported ${entries.length} entries from statement`);
      } catch (err) {
        showError('Failed to parse CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;

    // Try different date formats
    const formats = [
      /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
      /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
      /(\d{2})-(\d{2})-(\d{4})/,  // DD-MM-YYYY
    ];

    for (let format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else {
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
      }
    }
    return null;
  };

  const handleAutoMatch = () => {
    // Simple auto-matching based on amount and approximate date
    const matched = new Set();
    const updatedBookEntries = [...bookEntries];
    const updatedBankEntries = [...bankStatementEntries];

    bankStatementEntries.forEach((bankEntry, bankIdx) => {
      if (bankEntry.is_reconciled) return;

      const bankAmount = bankEntry.debit || bankEntry.credit;
      const isDebit = bankEntry.debit > 0;

      // Find matching book entry
      for (let i = 0; i < bookEntries.length; i++) {
        if (matched.has(i) || bookEntries[i].is_reconciled) continue;

        const bookEntry = bookEntries[i];
        const bookAmount = isDebit ? bookEntry.credit : bookEntry.debit; // Bank debit = Book credit

        // Check amount match and date within 5 days
        if (Math.abs(bankAmount - bookAmount) < 0.01) {
          const bankDate = new Date(bankEntry.date);
          const bookDate = new Date(bookEntry.date);
          const daysDiff = Math.abs((bankDate - bookDate) / (1000 * 60 * 60 * 24));

          if (daysDiff <= 5) {
            matched.add(i);
            updatedBookEntries[i] = { ...updatedBookEntries[i], is_reconciled: true };
            updatedBankEntries[bankIdx] = { ...updatedBankEntries[bankIdx], is_reconciled: true };
            break;
          }
        }
      }
    });

    setBookEntries(updatedBookEntries);
    setBankStatementEntries(updatedBankEntries);

    const matchedCount = matched.size;
    if (matchedCount > 0) {
      showSuccess(`Auto-matched ${matchedCount} entries`);
    } else {
      showError('No matching entries found');
    }
  };

  const handleCompleteReconciliation = async () => {
    if (!currentReconciliation) return;

    try {
      // Calculate reconciliation summary
      const unreconciledBookDebits = bookEntries
        .filter(e => !e.is_reconciled && e.debit > 0)
        .reduce((sum, e) => sum + e.debit, 0);
      const unreconciledBookCredits = bookEntries
        .filter(e => !e.is_reconciled && e.credit > 0)
        .reduce((sum, e) => sum + e.credit, 0);
      const reconciledAmount = bookEntries
        .filter(e => e.is_reconciled)
        .reduce((sum, e) => sum + (e.debit || e.credit), 0);

      await bankReconciliationAPI.update(currentReconciliation.id, {
        status: 'completed',
        reconciled_amount: reconciledAmount,
        unreconciled_debits: unreconciledBookDebits,
        unreconciled_credits: unreconciledBookCredits
      });

      showSuccess('Reconciliation completed');
      setShowReconcileView(false);
      setCurrentReconciliation(null);
      loadReconciliations();
    } catch (err) {
      showError('Failed to complete reconciliation');
    }
  };

  const handleDeleteReconciliation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reconciliation?')) return;

    try {
      await bankReconciliationAPI.delete(id);
      showSuccess('Reconciliation deleted');
      loadReconciliations();
    } catch (err) {
      showError('Failed to delete reconciliation');
    }
  };

  const handleCloseReconcileView = () => {
    setShowReconcileView(false);
    setCurrentReconciliation(null);
    setBookEntries([]);
    setBankStatementEntries([]);
    loadReconciliations();
  };

  // Calculate summary
  const bankBalance = parseFloat(currentReconciliation?.statement_closing_balance) || 0;
  const reconciledBookCredits = bookEntries.filter(e => e.is_reconciled && e.credit > 0).reduce((sum, e) => sum + e.credit, 0);
  const reconciledBookDebits = bookEntries.filter(e => e.is_reconciled && e.debit > 0).reduce((sum, e) => sum + e.debit, 0);
  const unreconciledCredits = bookEntries.filter(e => !e.is_reconciled && e.credit > 0).reduce((sum, e) => sum + e.credit, 0);
  const unreconciledDebits = bookEntries.filter(e => !e.is_reconciled && e.debit > 0).reduce((sum, e) => sum + e.debit, 0);
  const adjustedBookBalance = bankBalance - unreconciledCredits + unreconciledDebits;

  const getVoucherTypeColor = (type) => {
    const colors = {
      receipt: '#059669',
      payment: '#dc2626',
      contra: '#7c3aed',
      journal: '#2563eb'
    };
    return colors[type] || '#64748b';
  };

  // Reconciliation View
  if (showReconcileView && currentReconciliation) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-main-title">Bank Reconciliation</h1>
            <p className="page-description">
              {bankAccounts.find(b => b.id === currentReconciliation.bank_account)?.name} -
              Statement Date: {new Date(currentReconciliation.statement_date).toLocaleDateString('en-IN')}
            </p>
          </div>
          <div className="page-header-right" style={{ display: 'flex', gap: '12px' }}>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImportStatement}
            />
            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
              <span className="btn-icon">📥</span>
              Import Statement
            </button>
            <button className="btn-secondary" onClick={handleAutoMatch}>
              <span className="btn-icon">🔗</span>
              Auto Match
            </button>
            <button className="btn-primary" onClick={handleCompleteReconciliation}>
              <span className="btn-icon">✓</span>
              Complete
            </button>
            <button className="btn-secondary" onClick={handleCloseReconcileView}>
              Close
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#1e40af', marginBottom: '4px' }}>Bank Statement Balance</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb' }}>{bankBalance.toFixed(2)}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>Reconciled (Credits)</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>{reconciledBookCredits.toFixed(2)}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>Unreconciled</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
              Dr: {unreconciledDebits.toFixed(2)} | Cr: {unreconciledCredits.toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px' }}>Adjusted Book Balance</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#d97706' }}>{adjustedBookBalance.toFixed(2)}</div>
          </div>
        </div>

        {/* Split View - Book Entries and Bank Statement */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Book Entries */}
          <div className="content-card">
            <h3 style={{ margin: '0 0 16px', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
              Book Entries ({bookEntries.length})
            </h3>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '8px', width: '30px' }}></th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Ref</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Dr</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Cr</th>
                  </tr>
                </thead>
                <tbody>
                  {bookEntries.map(entry => (
                    <tr
                      key={entry.id}
                      style={{
                        backgroundColor: entry.is_reconciled ? '#dcfce7' : 'transparent',
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleToggleReconciled(entry)}
                    >
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={entry.is_reconciled}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          fontSize: '10px',
                          backgroundColor: getVoucherTypeColor(entry.voucher_type),
                          color: 'white',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          marginRight: '4px'
                        }}>
                          {entry.voucher_type?.substring(0, 3).toUpperCase()}
                        </span>
                        {entry.voucher_number}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>
                        {entry.debit > 0 ? entry.debit.toFixed(2) : ''}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>
                        {entry.credit > 0 ? entry.credit.toFixed(2) : ''}
                      </td>
                    </tr>
                  ))}
                  {bookEntries.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        No book entries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank Statement Entries */}
          <div className="content-card">
            <h3 style={{ margin: '0 0 16px', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
              Bank Statement ({bankStatementEntries.length})
              <span style={{ fontSize: '12px', fontWeight: '400', marginLeft: '8px', color: '#64748b' }}>
                Import CSV to add entries
              </span>
            </h3>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '8px', width: '30px' }}></th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Dr</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Cr</th>
                  </tr>
                </thead>
                <tbody>
                  {bankStatementEntries.map(entry => (
                    <tr
                      key={entry.id}
                      style={{
                        backgroundColor: entry.is_reconciled ? '#dcfce7' : 'transparent',
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleToggleReconciled(entry)}
                    >
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={entry.is_reconciled}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td style={{ padding: '8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.description}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>
                        {entry.debit > 0 ? entry.debit.toFixed(2) : ''}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>
                        {entry.credit > 0 ? entry.credit.toFixed(2) : ''}
                      </td>
                    </tr>
                  ))}
                  {bankStatementEntries.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        Import a CSV bank statement to start matching
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Bank Reconciliation</h1>
          <p className="page-description">Match bank statement with book entries</p>
          {financialYear && (
            <span className="badge badge-primary" style={{ marginTop: '8px' }}>
              FY: {financialYear.name}
            </span>
          )}
        </div>
        <div className="page-header-right">
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <span className="btn-icon">+</span>
            New Reconciliation
          </button>
        </div>
      </div>

      {/* Bank Account Selector */}
      <div className="filters-section" style={{ marginBottom: '24px' }}>
        <div className="filter-group">
          <label style={{ marginRight: '8px', fontWeight: '500' }}>Bank Account:</label>
          <select
            className="filter-select"
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            style={{ minWidth: '250px' }}
          >
            <option value="">-- Select Bank Account --</option>
            {bankAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* New Reconciliation Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Start New Reconciliation</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Bank Account</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  disabled={!bankAccounts.length}
                >
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Statement Date <span className="required">*</span></label>
                <input
                  type="date"
                  name="statement_date"
                  value={formData.statement_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Statement Opening Balance</label>
                <input
                  type="number"
                  name="statement_opening_balance"
                  value={formData.statement_opening_balance}
                  onChange={handleInputChange}
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Statement Closing Balance <span className="required">*</span></label>
                <input
                  type="number"
                  name="statement_closing_balance"
                  value={formData.statement_closing_balance}
                  onChange={handleInputChange}
                  step="0.01"
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Optional notes..."
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleStartReconciliation} disabled={saving}>
                  {saving ? 'Starting...' : 'Start Reconciliation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation List */}
      <div className="content-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
            <div>Loading reconciliations...</div>
          </div>
        ) : !selectedBank ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">🏦</div>
            <h3 className="empty-title">Select a Bank Account</h3>
            <p className="empty-description">Choose a bank account to view its reconciliation history.</p>
          </div>
        ) : reconciliations.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📋</div>
            <h3 className="empty-title">No Reconciliations</h3>
            <p className="empty-description">Start your first bank reconciliation to match bank statement with book entries.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <span className="btn-icon">+</span>
              New Reconciliation
            </button>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Statement Date</th>
                  <th style={{ textAlign: 'right' }}>Statement Balance</th>
                  <th style={{ textAlign: 'right' }}>Book Balance</th>
                  <th style={{ textAlign: 'right' }}>Difference</th>
                  <th>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reconciliations.map(rec => {
                  const diff = parseFloat(rec.statement_closing_balance) - parseFloat(rec.book_balance);
                  return (
                    <tr key={rec.id}>
                      <td>{new Date(rec.statement_date).toLocaleDateString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>{parseFloat(rec.statement_closing_balance).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{parseFloat(rec.book_balance).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: Math.abs(diff) < 0.01 ? '#059669' : '#dc2626' }}>
                        {diff.toFixed(2)}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: rec.status === 'completed' ? '#dcfce7' : '#fef3c7',
                          color: rec.status === 'completed' ? '#166534' : '#92400e'
                        }}>
                          {rec.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {rec.status === 'in_progress' && (
                            <button
                              className="btn-icon-small"
                              onClick={() => handleContinueReconciliation(rec)}
                              title="Continue"
                            >
                              ▶️
                            </button>
                          )}
                          <button
                            className="btn-icon-small"
                            onClick={() => handleContinueReconciliation(rec)}
                            title="View"
                          >
                            👁️
                          </button>
                          <button
                            className="btn-icon-small btn-danger"
                            onClick={() => handleDeleteReconciliation(rec.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default BankReconciliation;
