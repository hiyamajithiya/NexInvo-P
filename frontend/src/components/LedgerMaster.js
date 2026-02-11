import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, accountGroupAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { useToast } from './Toast';
import './Accounting.css';

function LedgerMaster() {
  const { showSuccess, showError } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [formTab, setFormTab] = useState('basic');
  const [error, setError] = useState('');

  const [currentLedger, setCurrentLedger] = useState({
    name: '',
    group: '',
    account_type: 'expense',
    opening_balance: 0,
    opening_balance_type: 'Dr',
    is_bank_account: false,
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch: ''
  });

  const accountTypes = [
    { value: 'bank', label: 'Bank Account', icon: '🏦', color: '#3b82f6' },
    { value: 'cash', label: 'Cash Account', icon: '💵', color: '#10b981' },
    { value: 'debtor', label: 'Sundry Debtor', icon: '👤', color: '#f59e0b' },
    { value: 'creditor', label: 'Sundry Creditor', icon: '🏢', color: '#ef4444' },
    { value: 'income', label: 'Income', icon: '📈', color: '#22c55e' },
    { value: 'expense', label: 'Expense', icon: '📉', color: '#f97316' },
    { value: 'asset', label: 'Asset', icon: '🏠', color: '#8b5cf6' },
    { value: 'liability', label: 'Liability', icon: '📋', color: '#ec4899' },
    { value: 'equity', label: 'Capital/Equity', icon: '💰', color: '#14b8a6' },
    { value: 'tax', label: 'Tax Account', icon: '🧾', color: '#6366f1' },
    { value: 'stock', label: 'Stock/Inventory', icon: '📦', color: '#84cc16' }
  ];

  useEffect(() => {
    loadLedgers();
    loadGroups();
  }, []);

  const loadLedgers = async () => {
    setLoading(true);
    try {
      const response = await ledgerAccountAPI.getAll();
      setLedgers(response.data.results || response.data || []);
    } catch (err) {
      showError('Failed to load ledger accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await accountGroupAPI.getAll();
      setGroups(response.data.results || response.data || []);
    } catch (err) {
      // Error handled silently
    }
  };

  const handleAddLedger = () => {
    setCurrentLedger({
      name: '',
      group: '',
      account_type: 'expense',
      opening_balance: 0,
      opening_balance_type: 'Dr',
      is_bank_account: false,
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch: ''
    });
    setFormTab('basic');
    setShowForm(true);
    setError('');
  };

  const handleEditLedger = (ledger) => {
    setCurrentLedger({
      ...ledger,
      group: ledger.group || ''
    });
    setFormTab('basic');
    setShowForm(true);
    setError('');
  };

  const handleDeleteLedger = async (id) => {
    if (window.confirm('Are you sure you want to delete this ledger account?')) {
      try {
        await ledgerAccountAPI.delete(id);
        showSuccess('Ledger account deleted successfully!');
        loadLedgers();
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to delete ledger account';
        showError(errorMsg);
      }
    }
  };

  const handleLedgerChange = (field, value) => {
    setCurrentLedger(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'account_type' && value === 'bank') {
        updated.is_bank_account = true;
      } else if (field === 'account_type' && value !== 'bank') {
        updated.is_bank_account = false;
      }
      return updated;
    });
  };

  const handleSaveLedger = async () => {
    setLoading(true);
    setError('');

    if (!currentLedger.name) {
      setError('Ledger name is required');
      setLoading(false);
      return;
    }
    if (!currentLedger.group) {
      setError('Account group is required');
      setLoading(false);
      return;
    }

    try {
      const dataToSave = {
        ...currentLedger,
        opening_balance: parseFloat(currentLedger.opening_balance) || 0
      };

      if (currentLedger.id) {
        await ledgerAccountAPI.update(currentLedger.id, dataToSave);
        showSuccess('Ledger account updated successfully!');
      } else {
        await ledgerAccountAPI.create(dataToSave);
        showSuccess('Ledger account created successfully!');
      }

      setShowForm(false);
      loadLedgers();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save ledger account';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const filteredLedgers = ledgers.filter(ledger => {
    const matchesSearch = ledger.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ledger.group_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = !selectedGroup || ledger.group === parseInt(selectedGroup);
    const matchesType = !selectedType || ledger.account_type === selectedType;
    return matchesSearch && matchesGroup && matchesType;
  });

  const getTypeInfo = (type) => accountTypes.find(t => t.value === type) || { label: type, icon: '📄', color: '#64748b' };

  // Calculate stats
  const stats = {
    total: ledgers.length,
    bank: ledgers.filter(l => l.account_type === 'bank').length,
    debtor: ledgers.filter(l => l.account_type === 'debtor').length,
    creditor: ledgers.filter(l => l.account_type === 'creditor').length,
    totalDebit: ledgers.reduce((sum, l) => l.current_balance_type === 'Dr' ? sum + parseFloat(l.current_balance || 0) : sum, 0),
    totalCredit: ledgers.reduce((sum, l) => l.current_balance_type === 'Cr' ? sum + parseFloat(l.current_balance || 0) : sum, 0)
  };

  return (
    <div className="ledger-master-container">
      {/* Header */}
      <div className="lm-page-header">
        <div>
          <h1 className="lm-page-title">Ledger Master</h1>
          <p className="lm-page-subtitle">Manage your Chart of Accounts ledger entries</p>
        </div>
        <button className="btn-primary" onClick={handleAddLedger}>
          <span>➕</span> Add Ledger
        </button>
      </div>

      {/* Stats */}
      <div className="lm-stats-grid">
        <div className="lm-stat-card total">
          <div className="lm-stat-header">
            <span className="lm-stat-icon">📊</span>
            <span className="lm-stat-label">Total Ledgers</span>
          </div>
          <div className="lm-stat-value">{stats.total}</div>
        </div>
        <div className="lm-stat-card bank">
          <div className="lm-stat-header">
            <span className="lm-stat-icon">🏦</span>
            <span className="lm-stat-label">Bank Accounts</span>
          </div>
          <div className="lm-stat-value">{stats.bank}</div>
        </div>
        <div className="lm-stat-card debtor">
          <div className="lm-stat-header">
            <span className="lm-stat-icon">👤</span>
            <span className="lm-stat-label">Debtors</span>
          </div>
          <div className="lm-stat-value">{stats.debtor}</div>
        </div>
        <div className="lm-stat-card creditor">
          <div className="lm-stat-header">
            <span className="lm-stat-icon">🏢</span>
            <span className="lm-stat-label">Creditors</span>
          </div>
          <div className="lm-stat-value">{stats.creditor}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search ledgers by name or group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
        >
          <option value="">All Groups</option>
          {groups.map(group => (
            <option key={group.id} value={group.id}>{group.full_path || group.name}</option>
          ))}
        </select>
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            📋 Table
          </button>
          <button
            className={`view-btn ${viewMode === 'card' ? 'active' : ''}`}
            onClick={() => setViewMode('card')}
          >
            🃏 Cards
          </button>
        </div>
      </div>

      {/* Type Filter Chips */}
      <div className="type-filters">
        <div
          className={`type-chip ${selectedType === '' ? 'active' : ''}`}
          onClick={() => setSelectedType('')}
        >
          All Types
        </div>
        {accountTypes.slice(0, 6).map(type => (
          <div
            key={type.value}
            className={`type-chip ${selectedType === type.value ? 'active' : ''}`}
            onClick={() => setSelectedType(selectedType === type.value ? '' : type.value)}
          >
            <span>{type.icon}</span> {type.label}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="lm-main-content">
        <div className="content-header">
          <span className="content-title">Ledger Accounts</span>
          <span className="content-count">{filteredLedgers.length} ledgers</span>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading ledgers...</span>
          </div>
        ) : filteredLedgers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📒</div>
            <div className="empty-title">No Ledger Accounts</div>
            <div className="empty-text">Get started by creating your first ledger account</div>
            <button className="btn-primary" onClick={handleAddLedger}>
              <span>➕</span> Add Ledger
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="lm-table-wrapper">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Ledger</th>
                  <th>Group</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Opening Balance</th>
                  <th style={{ textAlign: 'right' }}>Current Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedgers.map(ledger => {
                  const typeInfo = getTypeInfo(ledger.account_type);
                  return (
                    <tr key={ledger.id}>
                      <td>
                        <div className="ledger-name-cell">
                          <div className="ledger-icon" style={{ background: `${typeInfo.color}15` }}>
                            {typeInfo.icon}
                          </div>
                          <div className="ledger-info">
                            <span className="ledger-name">
                              {ledger.name}
                              {ledger.is_bank_account && <span className="badge badge-bank">Bank</span>}
                              {ledger.is_system_account && <span className="badge badge-system">System</span>}
                            </span>
                            {ledger.account_code && (
                              <span className="ledger-code">{ledger.account_code}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#64748b' }}>{ledger.group_name}</td>
                      <td>
                        <span className="type-badge" style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className={`balance-cell ${ledger.opening_balance_type === 'Dr' ? 'balance-dr' : 'balance-cr'}`}>
                        {formatCurrency(ledger.opening_balance)} {ledger.opening_balance_type}
                      </td>
                      <td className={`balance-cell ${ledger.current_balance_type === 'Dr' ? 'balance-dr' : 'balance-cr'}`}>
                        {formatCurrency(ledger.current_balance)} {ledger.current_balance_type}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" onClick={() => handleEditLedger(ledger)} title="Edit">
                            ✏️
                          </button>
                          {!ledger.is_system_account && (
                            <button className="btn-icon danger" onClick={() => handleDeleteLedger(ledger.id)} title="Delete">
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-grid">
            {filteredLedgers.map(ledger => {
              const typeInfo = getTypeInfo(ledger.account_type);
              return (
                <div key={ledger.id} className="ledger-card" onClick={() => handleEditLedger(ledger)}>
                  <div className="card-header">
                    <div className="card-title">
                      <div className="ledger-icon" style={{ background: `${typeInfo.color}15` }}>
                        {typeInfo.icon}
                      </div>
                      <div>
                        <div className="card-name">{ledger.name}</div>
                        <div className="card-group">{ledger.group_name}</div>
                      </div>
                    </div>
                    <div className="card-balance">
                      <div className="card-balance-label">Balance</div>
                      <div className={`card-balance-value ${ledger.current_balance_type === 'Dr' ? 'balance-dr' : 'balance-cr'}`}>
                        {formatCurrency(ledger.current_balance)}
                        <span style={{ fontSize: '12px', marginLeft: '4px' }}>{ledger.current_balance_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="card-footer">
                    <span className="type-badge" style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                      {typeInfo.label}
                    </span>
                    <div className="action-btns">
                      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEditLedger(ledger); }} title="Edit">
                        ✏️
                      </button>
                      {!ledger.is_system_account && (
                        <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); handleDeleteLedger(ledger.id); }} title="Delete">
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancelForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {currentLedger.id ? 'Edit Ledger Account' : 'New Ledger Account'}
              </h2>
              <button className="btn-close" onClick={handleCancelForm}>✕</button>
            </div>

            <div className="form-tabs">
              <button
                className={`form-tab ${formTab === 'basic' ? 'active' : ''}`}
                onClick={() => setFormTab('basic')}
              >
                Basic Info
              </button>
              {(currentLedger.account_type === 'bank' || currentLedger.is_bank_account) && (
                <button
                  className={`form-tab ${formTab === 'bank' ? 'active' : ''}`}
                  onClick={() => setFormTab('bank')}
                >
                  Bank Details
                </button>
              )}
            </div>

            <div className="modal-body">
              {error && <div className="form-error">{error}</div>}

              {formTab === 'basic' && (
                <>
                  <div className="form-row full">
                    <div className="form-group">
                      <label className="form-label">Ledger Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={currentLedger.name}
                        onChange={(e) => handleLedgerChange('name', e.target.value)}
                        placeholder="e.g., Cash, State Bank of India, Sales Account"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Account Group *</label>
                      <select
                        className="form-input"
                        value={currentLedger.group}
                        onChange={(e) => handleLedgerChange('group', e.target.value)}
                      >
                        <option value="">Select Group</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.full_path || group.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Opening Balance</label>
                      <div className="balance-input-group">
                        <input
                          type="number"
                          className="form-input"
                          value={currentLedger.opening_balance}
                          onChange={(e) => handleLedgerChange('opening_balance', e.target.value)}
                          step="0.01"
                          placeholder="0.00"
                        />
                        <select
                          className="form-input"
                          value={currentLedger.opening_balance_type}
                          onChange={(e) => handleLedgerChange('opening_balance_type', e.target.value)}
                        >
                          <option value="Dr">Dr</option>
                          <option value="Cr">Cr</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Type</label>
                    <div className="type-grid">
                      {accountTypes.map(type => (
                        <div
                          key={type.value}
                          className={`type-option ${currentLedger.account_type === type.value ? 'selected' : ''}`}
                          onClick={() => handleLedgerChange('account_type', type.value)}
                        >
                          <div className="type-option-icon">{type.icon}</div>
                          <div className="type-option-label">{type.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {formTab === 'bank' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Bank Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={currentLedger.bank_name}
                        onChange={(e) => handleLedgerChange('bank_name', e.target.value)}
                        placeholder="e.g., State Bank of India"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={currentLedger.account_number}
                        onChange={(e) => handleLedgerChange('account_number', e.target.value)}
                        placeholder="Bank account number"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">IFSC Code</label>
                      <input
                        type="text"
                        className="form-input"
                        value={currentLedger.ifsc_code}
                        onChange={(e) => handleLedgerChange('ifsc_code', e.target.value.toUpperCase())}
                        placeholder="e.g., SBIN0001234"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Branch</label>
                      <input
                        type="text"
                        className="form-input"
                        value={currentLedger.branch}
                        onChange={(e) => handleLedgerChange('branch', e.target.value)}
                        placeholder="Branch name"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCancelForm}>
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleSaveLedger}
                disabled={loading}
              >
                {loading ? 'Saving...' : (currentLedger.id ? 'Update Ledger' : 'Create Ledger')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LedgerMaster;
