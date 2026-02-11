import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ledgerAccountAPI, accountGroupAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { useToast } from './Toast';

// Inline styles for Opening Balance Import (ob- prefix to avoid conflicts)
const styles = {
  obMainContent: {
    padding: '24px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    boxSizing: 'border-box',
    width: '100%',
    overflow: 'visible'
  },
  obPageHeader: {
    marginBottom: '24px'
  },
  obPageTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0'
  },
  obPageSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0'
  },
  obStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  obStatCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderLeft: '4px solid #e2e8f0',
    transition: 'all 0.2s'
  },
  obStatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  obStatIcon: {
    fontSize: '20px'
  },
  obStatInfo: {
    flex: 1
  },
  obStatValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0'
  },
  obStatLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
    margin: '0'
  },
  obContentCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'visible',
    marginBottom: '24px'
  },
  obToolbar: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'space-between'
  },
  obToolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: '1'
  },
  obToolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  obSearchBox: {
    position: 'relative',
    flex: '1',
    maxWidth: '280px'
  },
  obSearchInput: {
    width: '100%',
    padding: '10px 16px 10px 40px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  obSearchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    fontSize: '14px'
  },
  obFilterSelect: {
    padding: '10px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    minWidth: '160px'
  },
  obViewToggle: {
    display: 'flex',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  obViewBtn: {
    padding: '8px 12px',
    border: 'none',
    background: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#64748b',
    transition: 'all 0.2s'
  },
  obViewBtnActive: {
    padding: '8px 12px',
    border: 'none',
    background: '#3b82f6',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  obAddBtn: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.2s'
  },
  obTableWrapper: {
    overflowX: 'auto',
    overflowY: 'visible'
  },
  obTable: {
    width: '100%',
    minWidth: '800px',
    borderCollapse: 'collapse'
  },
  obTableHeader: {
    backgroundColor: '#f8fafc'
  },
  obTableHeaderCell: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  obTableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s'
  },
  obTableCell: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#334155',
    verticalAlign: 'middle'
  },
  obTableFooter: {
    backgroundColor: '#f8fafc',
    fontWeight: '600'
  },
  obLedgerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  obLedgerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#f0f9ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px'
  },
  obLedgerDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  obLedgerName: {
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '2px'
  },
  obBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  },
  obBadgeGroup: {
    backgroundColor: '#f1f5f9',
    color: '#475569'
  },
  obAmountDebit: {
    color: '#16a34a',
    fontFamily: 'monospace',
    fontWeight: '500'
  },
  obAmountCredit: {
    color: '#dc2626',
    fontFamily: 'monospace',
    fontWeight: '500'
  },
  obActions: {
    display: 'flex',
    gap: '6px'
  },
  obActionBtn: {
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  obEditBtn: {
    backgroundColor: '#f0f9ff',
    color: '#3b82f6'
  },
  obDeleteBtn: {
    backgroundColor: '#fef2f2',
    color: '#ef4444'
  },
  obSaveBtn: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a'
  },
  obCancelBtn: {
    backgroundColor: '#f1f5f9',
    color: '#64748b'
  },
  obEmptyState: {
    padding: '60px 20px',
    textAlign: 'center'
  },
  obEmptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  obEmptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px'
  },
  obEmptyText: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '20px'
  },
  obTableInfo: {
    padding: '16px 20px',
    borderTop: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#64748b',
    backgroundColor: '#f8fafc'
  },
  obBalanceAlert: {
    padding: '16px 20px',
    borderRadius: '10px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    fontWeight: '500'
  },
  obAlertBalanced: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534'
  },
  obAlertUnbalanced: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    color: '#92400e'
  },
  obInlineInput: {
    width: '120px',
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    textAlign: 'right',
    outline: 'none'
  },
  // Modal styles
  obModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  obModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  obModalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  obModalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  obModalClose: {
    width: '32px',
    height: '32px',
    border: 'none',
    background: '#f1f5f9',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    transition: 'all 0.2s'
  },
  obModalBody: {
    padding: '24px'
  },
  obFormGroup: {
    marginBottom: '20px'
  },
  obFormLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },
  obFormRequired: {
    color: '#ef4444'
  },
  obFormInput: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  obFormSelect: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    boxSizing: 'border-box'
  },
  obFormRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  obModalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    backgroundColor: '#f8fafc'
  },
  obBtnPrimary: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  obBtnSecondary: {
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  obLoadingSpinner: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
    fontSize: '14px'
  }
};


const OpeningBalanceImport = () => {
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef(null);
  const [ledgers, setLedgers] = useState([]);
  const [accountGroups, setAccountGroups] = useState([]);
  const [openingBalances, setOpeningBalances] = useState([]);
  const [importedData, setImportedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [editingRow, setEditingRow] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [manualEntry, setManualEntry] = useState({
    ledger_id: '',
    debit_balance: '',
    credit_balance: ''
  });

  const fetchLedgers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ledgerAccountAPI.getAll();
      const ledgerData = response.data?.results || response.data || [];
      setLedgers(ledgerData);

      // Extract opening balances from ledger data
      const balances = ledgerData
        .filter(l => l.opening_balance && parseFloat(l.opening_balance) !== 0)
        .map(l => ({
          id: l.id,
          ledger_id: l.id,
          ledger_name: l.name,
          group: l.account_group_name || l.group || 'Uncategorized',
          debit_balance: l.opening_balance_type === 'Dr' ? parseFloat(l.opening_balance) : 0,
          credit_balance: l.opening_balance_type === 'Cr' ? parseFloat(l.opening_balance) : 0
        }));
      setOpeningBalances(balances);
    } catch (error) {
      showError('Failed to load ledgers');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchLedgers();
    loadAccountGroups();
  }, [fetchLedgers]);

  const loadAccountGroups = async () => {
    try {
      const response = await accountGroupAPI.getAll();
      const data = response.data?.results || response.data || [];
      data.sort((a, b) => {
        const pathA = (a.full_path || a.name || '').toLowerCase();
        const pathB = (b.full_path || b.name || '').toLowerCase();
        return pathA.localeCompare(pathB);
      });
      setAccountGroups(data);
    } catch (err) {
      // Fallback silently
    }
  };

  const getIndentedGroupName = (group) => {
    const path = group.full_path || group.name;
    const depth = (path.match(/>/g) || []).length;
    const prefix = depth > 0 ? '\u00A0\u00A0\u00A0\u00A0'.repeat(depth) + '— ' : '';
    return prefix + group.name;
  };

  const getLedgersSortedByGroup = () => {
    return [...ledgers].sort((a, b) => {
      const groupA = (a.group_full_path || a.group_name || '').toLowerCase();
      const groupB = (b.group_full_path || b.group_name || '').toLowerCase();
      if (groupA !== groupB) return groupA.localeCompare(groupB);
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
    });
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      showError('Please upload a CSV or Excel file');
      return;
    }

    setLoading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        showError('File appears to be empty or has only headers');
        setLoading(false);
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      const ledgerIdx = headers.findIndex(h => h.includes('ledger') || h.includes('name') || h.includes('account'));
      const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('dr'));
      const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('cr'));

      if (ledgerIdx === -1 || debitIdx === -1 || creditIdx === -1) {
        showError('CSV must have columns: Ledger Name, Debit Balance, Credit Balance');
        setLoading(false);
        return;
      }

      const imported = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const ledgerName = values[ledgerIdx]?.trim() || '';
        const debitStr = values[debitIdx]?.trim().replace(/[₹,]/g, '') || '0';
        const creditStr = values[creditIdx]?.trim().replace(/[₹,]/g, '') || '0';

        if (!ledgerName) continue;

        const debit = parseFloat(debitStr) || 0;
        const credit = parseFloat(creditStr) || 0;

        const matchedLedger = ledgers.find(l =>
          l.name?.toLowerCase() === ledgerName.toLowerCase()
        );

        if (!matchedLedger) {
          errors.push({ row: i + 1, ledgerName, error: 'Ledger not found' });
        } else if (debit > 0 && credit > 0) {
          errors.push({ row: i + 1, ledgerName, error: 'Cannot have both debit and credit' });
        } else {
          imported.push({
            row: i + 1,
            ledger_id: matchedLedger.id,
            ledger_name: matchedLedger.name,
            group: matchedLedger.account_group_name || 'Uncategorized',
            debit_balance: debit,
            credit_balance: credit
          });
        }
      }

      setImportedData(imported);

      if (imported.length > 0) {
        showSuccess(`Parsed ${imported.length} records. ${errors.length} errors.`);
      } else {
        showError('No valid records found');
      }
    } catch (error) {
      showError('Error parsing file');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = `Ledger Name,Debit Balance,Credit Balance
Cash in Hand,50000,0
State Bank of India,125000,0
ABC Traders,75000,0
XYZ Suppliers,0,45000`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opening_balance_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const saveImportedBalances = async () => {
    if (importedData.length === 0) {
      showError('No data to save');
      return;
    }

    setSaving(true);
    try {
      for (const item of importedData) {
        const openingBalance = item.debit_balance > 0 ? item.debit_balance : item.credit_balance;
        const balanceType = item.debit_balance > 0 ? 'Dr' : 'Cr';

        await ledgerAccountAPI.patch(item.ledger_id, {
          opening_balance: openingBalance,
          opening_balance_type: balanceType
        });
      }

      showSuccess('Opening balances saved successfully!');
      setImportedData([]);
      fetchLedgers();
    } catch (error) {
      showError('Failed to save balances');
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!manualEntry.ledger_id) {
      showError('Please select a ledger');
      return;
    }

    const debit = parseFloat(manualEntry.debit_balance) || 0;
    const credit = parseFloat(manualEntry.credit_balance) || 0;

    if (debit > 0 && credit > 0) {
      showError('Cannot have both debit and credit balance');
      return;
    }

    if (debit === 0 && credit === 0) {
      showError('Please enter either debit or credit balance');
      return;
    }

    setSaving(true);
    try {
      const openingBalance = debit > 0 ? debit : credit;
      const balanceType = debit > 0 ? 'Dr' : 'Cr';

      await ledgerAccountAPI.patch(manualEntry.ledger_id, {
        opening_balance: openingBalance,
        opening_balance_type: balanceType
      });

      showSuccess('Opening balance saved successfully!');
      setManualEntry({ ledger_id: '', debit_balance: '', credit_balance: '' });
      setShowAddModal(false);
      fetchLedgers();
    } catch (error) {
      showError('Failed to save balance');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBalance = async (balance) => {
    setSaving(true);
    try {
      const openingBalance = balance.debit_balance > 0 ? balance.debit_balance : balance.credit_balance;
      const balanceType = balance.debit_balance > 0 ? 'Dr' : 'Cr';

      await ledgerAccountAPI.patch(balance.id, {
        opening_balance: openingBalance,
        opening_balance_type: balanceType
      });

      setEditingRow(null);
      showSuccess('Balance updated');
      fetchLedgers();
    } catch (error) {
      showError('Failed to update balance');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBalance = async (balanceId) => {
    if (!window.confirm('Are you sure you want to clear this opening balance?')) {
      return;
    }

    try {
      await ledgerAccountAPI.patch(balanceId, {
        opening_balance: 0,
        opening_balance_type: 'Dr'
      });
      showSuccess('Balance cleared');
      fetchLedgers();
    } catch (error) {
      showError('Failed to clear balance');
    }
  };

  // Calculate totals
  const totals = openingBalances.reduce((acc, item) => ({
    debit: acc.debit + (parseFloat(item.debit_balance) || 0),
    credit: acc.credit + (parseFloat(item.credit_balance) || 0)
  }), { debit: 0, credit: 0 });

  const difference = totals.debit - totals.credit;

  // Filter balances
  const filteredBalances = openingBalances.filter(balance => {
    const matchesSearch = balance.ledger_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || balance.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div style={styles.obMainContent}>
      {/* Page Header */}
      <div style={styles.obPageHeader}>
        <h1 style={styles.obPageTitle}>Opening Balance</h1>
        <p style={styles.obPageSubtitle}>Manage opening balances for ledger accounts</p>
      </div>

      {/* Stats Cards */}
      <div style={styles.obStatsGrid}>
        <div style={{...styles.obStatCard, borderLeftColor: '#10b981'}}>
          <div style={styles.obStatHeader}>
            <span style={styles.obStatIcon}>📥</span>
            <span style={styles.obStatLabel}>Total Debit</span>
          </div>
          <p style={{...styles.obStatValue, color: '#16a34a'}}>{formatCurrency(totals.debit)}</p>
        </div>
        <div style={{...styles.obStatCard, borderLeftColor: '#ef4444'}}>
          <div style={styles.obStatHeader}>
            <span style={styles.obStatIcon}>📤</span>
            <span style={styles.obStatLabel}>Total Credit</span>
          </div>
          <p style={{...styles.obStatValue, color: '#dc2626'}}>{formatCurrency(totals.credit)}</p>
        </div>
        <div style={{...styles.obStatCard, borderLeftColor: Math.abs(difference) < 1 ? '#10b981' : '#f59e0b'}}>
          <div style={styles.obStatHeader}>
            <span style={styles.obStatIcon}>{Math.abs(difference) < 1 ? '✅' : '⚖️'}</span>
            <span style={styles.obStatLabel}>{Math.abs(difference) < 1 ? 'Balanced' : 'Difference'}</span>
          </div>
          <p style={{...styles.obStatValue, color: Math.abs(difference) < 1 ? '#16a34a' : '#d97706'}}>{formatCurrency(Math.abs(difference))}</p>
        </div>
        <div style={{...styles.obStatCard, borderLeftColor: '#6366f1'}}>
          <div style={styles.obStatHeader}>
            <span style={styles.obStatIcon}>📊</span>
            <span style={styles.obStatLabel}>Ledgers with Balance</span>
          </div>
          <p style={{...styles.obStatValue, color: '#2563eb'}}>{openingBalances.length}</p>
        </div>
      </div>

      {/* Balance Alert */}
      {openingBalances.length > 0 && (
        <div style={{...styles.obBalanceAlert, ...(Math.abs(difference) < 1 ? styles.obAlertBalanced : styles.obAlertUnbalanced)}}>
          {Math.abs(difference) < 1 ? (
            <>
              <span>✅</span>
              <span>Trial Balance is matched! Total Debit equals Total Credit.</span>
            </>
          ) : (
            <>
              <span>⚠️</span>
              <span>
                Trial Balance is NOT matching! Difference of {formatCurrency(Math.abs(difference))} ({difference > 0 ? 'Excess Debit' : 'Excess Credit'})
              </span>
            </>
          )}
        </div>
      )}

      {/* Import Section */}
      {importedData.length === 0 && (
        <div style={styles.obContentCard}>
          <div style={styles.obToolbar}>
            <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>Import from File</h3>
            <button
              style={{...styles.obBtnSecondary, padding: '8px 16px'}}
              onClick={downloadTemplate}
            >
              Download Template
            </button>
          </div>
          <div style={{padding: '40px', textAlign: 'center'}}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <div
              style={{
                border: '2px dashed #e2e8f0',
                borderRadius: '12px',
                padding: '40px',
                cursor: 'pointer',
                backgroundColor: '#fafbfc'
              }}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.backgroundColor = '#f0f9ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.backgroundColor = '#fafbfc';
              }}
            >
              <div style={{fontSize: '48px', marginBottom: '16px'}}>📁</div>
              <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px'}}>
                Click to Upload or Drag & Drop
              </h3>
              <p style={{fontSize: '14px', color: '#64748b'}}>
                Supported formats: CSV, Excel (.xlsx, .xls)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Imported Data Preview */}
      {importedData.length > 0 && (
        <div style={styles.obContentCard}>
          <div style={styles.obToolbar}>
            <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>
              Preview ({importedData.length} records)
            </h3>
            <div style={{display: 'flex', gap: '10px'}}>
              <button
                style={styles.obBtnSecondary}
                onClick={() => setImportedData([])}
              >
                Clear
              </button>
              <button
                style={{...styles.obBtnPrimary, backgroundColor: '#16a34a', opacity: saving ? 0.7 : 1}}
                onClick={saveImportedBalances}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>
          <div style={styles.obTableWrapper}>
            <table style={styles.obTable}>
              <thead style={styles.obTableHeader}>
                <tr>
                  <th style={styles.obTableHeaderCell}>#</th>
                  <th style={styles.obTableHeaderCell}>Ledger</th>
                  <th style={styles.obTableHeaderCell}>Group</th>
                  <th style={{...styles.obTableHeaderCell, textAlign: 'right'}}>Debit</th>
                  <th style={{...styles.obTableHeaderCell, textAlign: 'right'}}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {importedData.map((item, idx) => (
                  <tr key={idx} style={styles.obTableRow}>
                    <td style={styles.obTableCell}>{item.row}</td>
                    <td style={{...styles.obTableCell, fontWeight: '500'}}>{item.ledger_name}</td>
                    <td style={styles.obTableCell}>
                      <span style={{...styles.obBadge, ...styles.obBadgeGroup}}>{item.group}</span>
                    </td>
                    <td style={{...styles.obTableCell, textAlign: 'right'}}>
                      <span style={styles.obAmountDebit}>
                        {item.debit_balance > 0 ? formatCurrency(item.debit_balance) : '-'}
                      </span>
                    </td>
                    <td style={{...styles.obTableCell, textAlign: 'right'}}>
                      <span style={styles.obAmountCredit}>
                        {item.credit_balance > 0 ? formatCurrency(item.credit_balance) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Current Balances */}
      <div style={styles.obContentCard}>
        <div style={styles.obToolbar}>
          <div style={styles.obToolbarLeft}>
            <div style={styles.obSearchBox}>
              <span style={styles.obSearchIcon}>🔍</span>
              <input
                type="text"
                style={styles.obSearchInput}
                placeholder="Search ledger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              style={styles.obFilterSelect}
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="all">All Groups</option>
              {accountGroups.map(group => (
                <option key={group.id} value={group.name}>{getIndentedGroupName(group)}</option>
              ))}
            </select>
          </div>
          <div style={styles.obToolbarRight}>
            <div style={styles.obViewToggle}>
              <button
                style={viewMode === 'table' ? styles.obViewBtnActive : styles.obViewBtn}
                onClick={() => setViewMode('table')}
              >
                ☰
              </button>
              <button
                style={viewMode === 'card' ? styles.obViewBtnActive : styles.obViewBtn}
                onClick={() => setViewMode('card')}
              >
                ▦
              </button>
            </div>
            <button style={styles.obAddBtn} onClick={() => setShowAddModal(true)}>
              <span>+</span> Add Balance
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.obLoadingSpinner}>Loading...</div>
        ) : filteredBalances.length === 0 ? (
          <div style={styles.obEmptyState}>
            <div style={styles.obEmptyIcon}>💰</div>
            <h3 style={styles.obEmptyTitle}>No Opening Balances</h3>
            <p style={styles.obEmptyText}>Add opening balances using the button above or import from a file</p>
            <button style={styles.obAddBtn} onClick={() => setShowAddModal(true)}>
              <span>+</span> Add Balance
            </button>
          </div>
        ) : (
          <>
            <div style={styles.obTableWrapper}>
              <table style={styles.obTable}>
                <thead style={styles.obTableHeader}>
                  <tr>
                    <th style={{...styles.obTableHeaderCell, width: '5%'}}>#</th>
                    <th style={{...styles.obTableHeaderCell, width: '35%'}}>Ledger</th>
                    <th style={{...styles.obTableHeaderCell, width: '20%'}}>Group</th>
                    <th style={{...styles.obTableHeaderCell, width: '15%', textAlign: 'right'}}>Debit</th>
                    <th style={{...styles.obTableHeaderCell, width: '15%', textAlign: 'right'}}>Credit</th>
                    <th style={{...styles.obTableHeaderCell, width: '10%', textAlign: 'center'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((balance, idx) => (
                    <tr
                      key={balance.id}
                      style={styles.obTableRow}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{...styles.obTableCell, color: '#94a3b8'}}>{idx + 1}</td>
                      <td style={styles.obTableCell}>
                        <div style={styles.obLedgerInfo}>
                          <div style={styles.obLedgerIcon}>📒</div>
                          <div style={styles.obLedgerDetails}>
                            <div style={styles.obLedgerName}>{balance.ledger_name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.obTableCell}>
                        <span style={{...styles.obBadge, ...styles.obBadgeGroup}}>{balance.group}</span>
                      </td>
                      <td style={{...styles.obTableCell, textAlign: 'right'}}>
                        {editingRow === balance.id ? (
                          <input
                            type="number"
                            style={styles.obInlineInput}
                            value={balance.debit_balance || ''}
                            onChange={(e) => {
                              const newBalances = openingBalances.map(b =>
                                b.id === balance.id
                                  ? { ...b, debit_balance: parseFloat(e.target.value) || 0, credit_balance: 0 }
                                  : b
                              );
                              setOpeningBalances(newBalances);
                            }}
                          />
                        ) : (
                          <span style={styles.obAmountDebit}>
                            {balance.debit_balance > 0 ? formatCurrency(balance.debit_balance) : '-'}
                          </span>
                        )}
                      </td>
                      <td style={{...styles.obTableCell, textAlign: 'right'}}>
                        {editingRow === balance.id ? (
                          <input
                            type="number"
                            style={styles.obInlineInput}
                            value={balance.credit_balance || ''}
                            onChange={(e) => {
                              const newBalances = openingBalances.map(b =>
                                b.id === balance.id
                                  ? { ...b, credit_balance: parseFloat(e.target.value) || 0, debit_balance: 0 }
                                  : b
                              );
                              setOpeningBalances(newBalances);
                            }}
                          />
                        ) : (
                          <span style={styles.obAmountCredit}>
                            {balance.credit_balance > 0 ? formatCurrency(balance.credit_balance) : '-'}
                          </span>
                        )}
                      </td>
                      <td style={{...styles.obTableCell, textAlign: 'center'}}>
                        <div style={{...styles.obActions, justifyContent: 'center'}}>
                          {editingRow === balance.id ? (
                            <>
                              <button
                                style={{...styles.obActionBtn, ...styles.obSaveBtn}}
                                onClick={() => handleUpdateBalance(balance)}
                                disabled={saving}
                              >
                                ✅
                              </button>
                              <button
                                style={{...styles.obActionBtn, ...styles.obCancelBtn}}
                                onClick={() => { setEditingRow(null); fetchLedgers(); }}
                              >
                                ❌
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                style={{...styles.obActionBtn, ...styles.obEditBtn}}
                                onClick={() => setEditingRow(balance.id)}
                              >
                                ✏️
                              </button>
                              <button
                                style={{...styles.obActionBtn, ...styles.obDeleteBtn}}
                                onClick={() => handleDeleteBalance(balance.id)}
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={styles.obTableFooter}>
                  <tr>
                    <td colSpan="3" style={{...styles.obTableCell, fontWeight: '600'}}>Total</td>
                    <td style={{...styles.obTableCell, textAlign: 'right'}}>
                      <span style={styles.obAmountDebit}>{formatCurrency(totals.debit)}</span>
                    </td>
                    <td style={{...styles.obTableCell, textAlign: 'right'}}>
                      <span style={styles.obAmountCredit}>{formatCurrency(totals.credit)}</span>
                    </td>
                    <td style={styles.obTableCell}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style={styles.obTableInfo}>
              Showing {filteredBalances.length} of {openingBalances.length} ledgers
            </div>
          </>
        )}
      </div>

      {/* Add Balance Modal */}
      {showAddModal && (
        <div style={styles.obModalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.obModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.obModalHeader}>
              <h2 style={styles.obModalTitle}>Add Opening Balance</h2>
              <button style={styles.obModalClose} onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>
            <div style={styles.obModalBody}>
              <div style={styles.obFormGroup}>
                <label style={styles.obFormLabel}>
                  Select Ledger <span style={styles.obFormRequired}>*</span>
                </label>
                <select
                  style={styles.obFormSelect}
                  value={manualEntry.ledger_id}
                  onChange={(e) => setManualEntry({ ...manualEntry, ledger_id: e.target.value })}
                >
                  <option value="">-- Select Ledger --</option>
                  {getLedgersSortedByGroup().map(ledger => (
                    <option key={ledger.id} value={ledger.id}>
                      {ledger.group_name || 'Uncategorized'} → {ledger.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.obFormRow}>
                <div style={styles.obFormGroup}>
                  <label style={styles.obFormLabel}>Debit Balance</label>
                  <input
                    type="number"
                    style={styles.obFormInput}
                    step="0.01"
                    placeholder="0.00"
                    value={manualEntry.debit_balance}
                    onChange={(e) => setManualEntry({
                      ...manualEntry,
                      debit_balance: e.target.value,
                      credit_balance: e.target.value ? '' : manualEntry.credit_balance
                    })}
                  />
                </div>
                <div style={styles.obFormGroup}>
                  <label style={styles.obFormLabel}>Credit Balance</label>
                  <input
                    type="number"
                    style={styles.obFormInput}
                    step="0.01"
                    placeholder="0.00"
                    value={manualEntry.credit_balance}
                    onChange={(e) => setManualEntry({
                      ...manualEntry,
                      credit_balance: e.target.value,
                      debit_balance: e.target.value ? '' : manualEntry.debit_balance
                    })}
                  />
                </div>
              </div>
            </div>
            <div style={styles.obModalFooter}>
              <button style={styles.obBtnSecondary} onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button
                style={{...styles.obBtnPrimary, opacity: saving || !manualEntry.ledger_id ? 0.7 : 1}}
                onClick={handleManualSave}
                disabled={saving || !manualEntry.ledger_id}
              >
                {saving ? 'Saving...' : 'Save Balance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpeningBalanceImport;
