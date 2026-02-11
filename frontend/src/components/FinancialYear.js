import React, { useState, useEffect } from 'react';
import { financialYearAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';
import './Accounting.css';

function FinancialYear() {
  const { showSuccess, showError } = useToast();
  const [financialYears, setFinancialYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [createMode, setCreateMode] = useState('indian'); // 'indian' or 'custom'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customForm, setCustomForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    books_beginning_date: ''
  });

  useEffect(() => {
    loadFinancialYears();
  }, []);

  const loadFinancialYears = async () => {
    setLoading(true);
    try {
      const res = await financialYearAPI.getAll({ page_size: 100 });
      setFinancialYears(res.data.results || res.data || []);
    } catch (err) {
      showError('Failed to load financial years');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIndianFY = async () => {
    setSaving(true);
    try {
      await financialYearAPI.createIndianFY(selectedYear);
      showSuccess(`Financial Year ${selectedYear}-${String(selectedYear + 1).slice(-2)} created successfully`);
      setShowCreateForm(false);
      loadFinancialYears();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to create financial year';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomFY = async () => {
    if (!customForm.name || !customForm.start_date || !customForm.end_date) {
      showError('Name, Start Date and End Date are required');
      return;
    }
    if (customForm.start_date >= customForm.end_date) {
      showError('End date must be after start date');
      return;
    }
    setSaving(true);
    try {
      await financialYearAPI.create({
        ...customForm,
        is_active: true,
        books_beginning_date: customForm.books_beginning_date || customForm.start_date
      });
      showSuccess(`Financial Year "${customForm.name}" created successfully`);
      setShowCreateForm(false);
      setCustomForm({ name: '', start_date: '', end_date: '', books_beginning_date: '' });
      loadFinancialYears();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.name?.[0] || 'Failed to create financial year';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (fy) => {
    try {
      // Deactivate all others first, then activate this one
      for (const other of financialYears) {
        if (other.id !== fy.id && other.is_active) {
          await financialYearAPI.update(other.id, { ...other, is_active: false });
        }
      }
      await financialYearAPI.update(fy.id, { ...fy, is_active: true, is_closed: false });
      showSuccess(`${fy.name} is now the active financial year`);
      loadFinancialYears();
    } catch (err) {
      showError('Failed to update financial year');
    }
  };

  const handleToggleClose = async (fy) => {
    try {
      await financialYearAPI.update(fy.id, {
        ...fy,
        is_closed: !fy.is_closed,
        is_active: fy.is_closed ? fy.is_active : false
      });
      showSuccess(fy.is_closed ? `${fy.name} reopened` : `${fy.name} closed`);
      loadFinancialYears();
    } catch (err) {
      showError('Failed to update financial year');
    }
  };

  const handleDelete = async (fy) => {
    if (!window.confirm(`Are you sure you want to delete Financial Year "${fy.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await financialYearAPI.delete(fy.id);
      showSuccess(`Financial Year "${fy.name}" deleted`);
      loadFinancialYears();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to delete financial year';
      showError(msg);
    }
  };

  // Generate year options (current year - 5 to current year + 1)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) {
    yearOptions.push(y);
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Financial Year</h1>
          <p className="page-description">Manage accounting financial years (April - March)</p>
        </div>
        <div className="page-header-right">
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <span className="btn-icon">+</span>
            {showCreateForm ? 'Cancel' : 'Create Financial Year'}
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="content-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>
            Create New Financial Year
          </h3>

          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '2px solid',
                borderColor: createMode === 'indian' ? '#6366f1' : '#e2e8f0',
                backgroundColor: createMode === 'indian' ? '#eef2ff' : 'white',
                color: createMode === 'indian' ? '#6366f1' : '#64748b',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onClick={() => setCreateMode('indian')}
            >
              Indian FY (Apr-Mar)
            </button>
            <button
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '2px solid',
                borderColor: createMode === 'custom' ? '#6366f1' : '#e2e8f0',
                backgroundColor: createMode === 'custom' ? '#eef2ff' : 'white',
                color: createMode === 'custom' ? '#6366f1' : '#64748b',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onClick={() => setCreateMode('custom')}
            >
              Custom Period
            </button>
          </div>

          {createMode === 'indian' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>
                    Select Starting Year
                  </label>
                  <select
                    className="filter-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{ minWidth: '150px' }}
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div style={{ paddingTop: '20px' }}>
                  <span style={{ fontSize: '16px', color: '#475569', fontWeight: '500' }}>
                    FY: {selectedYear}-{String(selectedYear + 1).slice(-2)}
                  </span>
                  <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '12px' }}>
                    (1st April {selectedYear} to 31st March {selectedYear + 1})
                  </span>
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={handleCreateIndianFY}
                disabled={saving}
              >
                {saving ? 'Creating...' : `Create FY ${selectedYear}-${String(selectedYear + 1).slice(-2)}`}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    className="filter-select"
                    placeholder="e.g. 2025-26"
                    value={customForm.name}
                    onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    className="filter-select"
                    value={customForm.start_date}
                    onChange={(e) => setCustomForm({ ...customForm, start_date: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    className="filter-select"
                    value={customForm.end_date}
                    onChange={(e) => setCustomForm({ ...customForm, end_date: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>
                    Books Beginning Date
                  </label>
                  <input
                    type="date"
                    className="filter-select"
                    value={customForm.books_beginning_date}
                    onChange={(e) => setCustomForm({ ...customForm, books_beginning_date: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={handleCreateCustomFY}
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Financial Year'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Financial Years List */}
      <div className="content-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
            <div>Loading financial years...</div>
          </div>
        ) : financialYears.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📅</div>
            <h3 className="empty-title">No Financial Year Configured</h3>
            <p className="empty-description">
              Create your first financial year to enable date-based accounting.
              In India, the financial year runs from April to March.
            </p>
            <button
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
              style={{ marginTop: '16px' }}
            >
              Create Financial Year
            </button>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '12px', width: '140px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px', width: '130px' }}>Start Date</th>
                  <th style={{ textAlign: 'left', padding: '12px', width: '130px' }}>End Date</th>
                  <th style={{ textAlign: 'left', padding: '12px', width: '130px' }}>Books Begin</th>
                  <th style={{ textAlign: 'center', padding: '12px', width: '100px' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '12px', width: '200px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {financialYears.map(fy => (
                  <tr key={fy.id} style={{
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: fy.is_active ? '#f0fdf4' : fy.is_closed ? '#f8fafc' : 'white'
                  }}>
                    <td style={{ padding: '12px', fontWeight: '600', fontSize: '15px' }}>
                      {fy.name}
                    </td>
                    <td style={{ padding: '12px' }}>{formatDate(fy.start_date)}</td>
                    <td style={{ padding: '12px' }}>{formatDate(fy.end_date)}</td>
                    <td style={{ padding: '12px' }}>{formatDate(fy.books_beginning_date)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {fy.is_active ? (
                        <span style={{
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>Active</span>
                      ) : fy.is_closed ? (
                        <span style={{
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>Closed</span>
                      ) : (
                        <span style={{
                          backgroundColor: '#f1f5f9',
                          color: '#64748b',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>Inactive</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {!fy.is_active && !fy.is_closed && (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 12px' }}
                            onClick={() => handleSetActive(fy)}
                            title="Set as active financial year"
                          >
                            Set Active
                          </button>
                        )}
                        {!fy.is_closed && !fy.is_active && (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 12px' }}
                            onClick={() => handleToggleClose(fy)}
                            title="Close this financial year"
                          >
                            Close
                          </button>
                        )}
                        {fy.is_closed && (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 12px' }}
                            onClick={() => handleToggleClose(fy)}
                            title="Reopen this financial year"
                          >
                            Reopen
                          </button>
                        )}
                        {!fy.is_active && (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 12px', color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => handleDelete(fy)}
                            title="Delete this financial year"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="content-card" style={{ marginTop: '24px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <h4 style={{ margin: '0 0 8px', color: '#1e40af', fontSize: '14px' }}>About Financial Year</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e3a5f', fontSize: '13px', lineHeight: '1.8' }}>
          <li>In India, the financial year runs from <strong>1st April to 31st March</strong> (e.g., FY 2025-26 = Apr 2025 to Mar 2026).</li>
          <li>Only <strong>one financial year</strong> can be active at a time. All reports default to the active FY dates.</li>
          <li>Closing a financial year prevents new entries from being posted to it.</li>
          <li>The <strong>Books Beginning Date</strong> is the date from which your accounting books start (usually same as FY start).</li>
        </ul>
      </div>
    </div>
  );
}

export default FinancialYear;
