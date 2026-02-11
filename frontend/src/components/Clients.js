import React, { useState, useEffect, useRef } from 'react';
import { clientAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { INDIAN_STATES } from '../constants/indianStates';
import { useToast } from './Toast';
import './Clients.css';

function Clients() {
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [error, setError] = useState('');

  const [currentClient, setCurrentClient] = useState({
    name: '',
    code: '',
    email: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    stateCode: '',
    gstin: '',
    pan: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const response = await clientAPI.getAll();
      setClients(response.data.results || response.data || []);
    } catch (err) {
      showError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = () => {
    setCurrentClient({
      name: '',
      code: '',
      email: '',
      mobile: '',
      address: '',
      city: '',
      state: '',
      pinCode: '',
      stateCode: '',
      gstin: '',
      pan: ''
    });
    setShowForm(true);
    setError('');
  };

  const handleEditClient = (client) => {
    setCurrentClient(client);
    setShowForm(true);
    setError('');
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientAPI.delete(id);
        showSuccess('Client deleted successfully!');
        loadClients();
      } catch (err) {
        showError('Failed to delete client');
      }
    }
  };

  const handleClientChange = (field, value) => {
    let updatedClient = { ...currentClient, [field]: value };

    if (field === 'state') {
      const selectedState = INDIAN_STATES.find(s => s.name === value);
      if (selectedState) {
        updatedClient.stateCode = selectedState.code;
      }
      setError('');
    }

    if (field === 'gstin') {
      const gstin = value.toUpperCase();
      updatedClient.gstin = gstin;

      if (gstin.length >= 2 && updatedClient.stateCode) {
        const gstinStateCode = gstin.substring(0, 2);
        if (gstinStateCode !== updatedClient.stateCode) {
          setError(`GSTIN state code (${gstinStateCode}) does not match selected state code (${updatedClient.stateCode})`);
        } else {
          setError('');
        }
      }
    }

    setCurrentClient(updatedClient);
  };

  const handleSaveClient = async () => {
    setLoading(true);
    setError('');

    if (!currentClient.name || !currentClient.email) {
      setError('Client name and email are required');
      setLoading(false);
      return;
    }

    if (!currentClient.state) {
      setError('State is required');
      setLoading(false);
      return;
    }

    if (currentClient.gstin) {
      const gstinStateCode = currentClient.gstin.substring(0, 2);
      if (gstinStateCode !== currentClient.stateCode) {
        setError(`GSTIN state code (${gstinStateCode}) does not match selected state code (${currentClient.stateCode})`);
        setLoading(false);
        return;
      }

      if (currentClient.gstin.length !== 15) {
        setError('GSTIN must be 15 characters long');
        setLoading(false);
        return;
      }
    }

    try {
      if (currentClient.id) {
        await clientAPI.update(currentClient.id, currentClient);
        showSuccess('Client updated successfully!');
      } else {
        await clientAPI.create(currentClient);
        showSuccess('Client created successfully!');
      }

      setShowForm(false);
      loadClients();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      ['Client Name*', 'Client Code', 'Email*', 'Phone', 'Mobile', 'Address', 'City', 'State', 'PIN Code', 'State Code', 'GSTIN', 'PAN', 'Date of Birth', 'Date of Incorporation'],
      ['ABC Corporation', '', 'abc@example.com', '022-12345678', '9876543210', '123 Main St', 'Mumbai', 'Maharashtra', '400001', '27', '27XXXXX0000X1Z5', 'XXXXX0000X', '', '2020-01-15'],
      ['John Doe', 'CUSTOM01', 'john@example.com', '', '9876543211', '456 Park Ave', 'Delhi', 'Delhi', '110001', '07', '', '', '1985-05-20', '']
    ];

    const csvContent = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'client_upload_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const response = await clientAPI.bulkUpload(file);
      const { created_count, errors } = response.data;

      let message = `Successfully uploaded ${created_count} client(s).`;
      if (errors && errors.length > 0) {
        message += ` ${errors.length} error(s) occurred.`;
      }

      showSuccess(message);
      setShowBulkUpload(false);
      loadClients();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to upload file';
      showError(errorMsg);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: clients.length,
    withGST: clients.filter(c => c.gstin).length,
    withBalance: clients.filter(c => c.ledger_balance > 0).length,
    totalReceivable: clients.reduce((sum, c) => c.ledger_balance_type === 'Dr' ? sum + parseFloat(c.ledger_balance || 0) : sum, 0)
  };

  return (
    <div className="clients-container">
      {/* Header */}
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Clients</h1>
          <p className="cl-page-subtitle">Manage your client database and contacts</p>
        </div>
        <div className="cl-header-actions">
          <button className="btn-secondary" onClick={handleDownloadTemplate}>
            <span>📥</span> Template
          </button>
          <button className="btn-secondary" onClick={() => setShowBulkUpload(true)}>
            <span>📤</span> Bulk Upload
          </button>
          <button className="btn-primary" onClick={handleAddClient}>
            <span>➕</span> Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cl-stats-grid">
        <div className="cl-stat-card total">
          <div className="cl-stat-header">
            <span className="cl-stat-icon">👥</span>
            <span className="cl-stat-label">Total Clients</span>
          </div>
          <div className="cl-stat-value">{stats.total}</div>
        </div>
        <div className="cl-stat-card gst">
          <div className="cl-stat-header">
            <span className="cl-stat-icon">📋</span>
            <span className="cl-stat-label">With GSTIN</span>
          </div>
          <div className="cl-stat-value">{stats.withGST}</div>
        </div>
        <div className="cl-stat-card balance">
          <div className="cl-stat-header">
            <span className="cl-stat-icon">💰</span>
            <span className="cl-stat-label">With Balance</span>
          </div>
          <div className="cl-stat-value">{stats.withBalance}</div>
        </div>
        <div className="cl-stat-card receivable">
          <div className="cl-stat-header">
            <span className="cl-stat-icon">📊</span>
            <span className="cl-stat-label">Total Receivable</span>
          </div>
          <div className="cl-stat-value currency">{formatCurrency(stats.totalReceivable)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="cl-filter-bar">
        <div className="cl-search-box">
          <input
            type="text"
            placeholder="Search by name, email, code or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="cl-view-toggle">
          <button
            className={`cl-view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            📋 Table
          </button>
          <button
            className={`cl-view-btn ${viewMode === 'card' ? 'active' : ''}`}
            onClick={() => setViewMode('card')}
          >
            🃏 Cards
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="cl-main-content">
        <div className="cl-content-header">
          <span className="cl-content-title">Client Directory</span>
          <span className="cl-content-count">{filteredClients.length} clients</span>
        </div>

        {loading ? (
          <div className="cl-loading-state">
            <div className="cl-loading-spinner"></div>
            <span>Loading clients...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="cl-empty-state">
            <div className="cl-empty-icon">👥</div>
            <div className="cl-empty-title">No Clients Found</div>
            <div className="cl-empty-text">
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first client'}
            </div>
            {!searchTerm && (
              <button className="btn-primary" onClick={handleAddClient}>
                <span>➕</span> Add Your First Client
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="cl-table-wrapper">
            <table className="cl-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>City</th>
                  <th>GSTIN</th>
                  <th>Contact</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr key={client.id}>
                    <td>
                      <div className="cl-client-cell">
                        <div className="cl-client-avatar">
                          {client.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="cl-client-info">
                          <span className="cl-client-name">{client.name}</span>
                          <span className="cl-client-code">{client.code || client.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{client.city || '-'}</td>
                    <td>
                      {client.gstin ? (
                        <span className="cl-badge gst">{client.gstin}</span>
                      ) : '-'}
                    </td>
                    <td>{client.mobile || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {client.ledger_balance > 0 ? (
                        <span className={client.ledger_balance_type === 'Dr' ? 'cl-balance-dr' : 'cl-balance-cr'}>
                          {formatCurrency(client.ledger_balance)} {client.ledger_balance_type}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <div className="cl-action-btns">
                        <button className="cl-btn-icon" onClick={() => handleEditClient(client)} title="Edit">
                          ✏️
                        </button>
                        <button className="cl-btn-icon danger" onClick={() => handleDeleteClient(client.id)} title="Delete">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cl-card-grid">
            {filteredClients.map(client => (
              <div key={client.id} className="cl-client-card">
                <div className="cl-card-header">
                  <div className="cl-card-title">
                    <div className="cl-client-avatar">
                      {client.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="cl-card-name">{client.name}</div>
                      <div className="cl-card-email">{client.email}</div>
                    </div>
                  </div>
                </div>
                <div className="cl-card-details">
                  <div className="cl-card-detail">
                    <span className="cl-card-detail-label">Code</span>
                    <span className="cl-card-detail-value">{client.code || '-'}</span>
                  </div>
                  <div className="cl-card-detail">
                    <span className="cl-card-detail-label">City</span>
                    <span className="cl-card-detail-value">{client.city || '-'}</span>
                  </div>
                  <div className="cl-card-detail">
                    <span className="cl-card-detail-label">Mobile</span>
                    <span className="cl-card-detail-value">{client.mobile || '-'}</span>
                  </div>
                  {client.gstin && (
                    <div className="cl-card-detail">
                      <span className="cl-card-detail-label">GSTIN</span>
                      <span className="cl-badge gst">{client.gstin}</span>
                    </div>
                  )}
                  {client.ledger_balance > 0 && (
                    <div className="cl-card-detail">
                      <span className="cl-card-detail-label">Balance</span>
                      <span className={client.ledger_balance_type === 'Dr' ? 'cl-balance-dr' : 'cl-balance-cr'}>
                        {formatCurrency(client.ledger_balance)} {client.ledger_balance_type}
                      </span>
                    </div>
                  )}
                </div>
                <div className="cl-card-footer">
                  <button className="cl-btn-icon" onClick={() => handleEditClient(client)} title="Edit">
                    ✏️
                  </button>
                  <button className="cl-btn-icon danger" onClick={() => handleDeleteClient(client.id)} title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="cl-modal-overlay" onClick={() => setShowBulkUpload(false)}>
          <div className="cl-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="cl-modal-header">
              <h2 className="cl-modal-title">Bulk Upload Clients</h2>
              <button className="cl-btn-close" onClick={() => setShowBulkUpload(false)}>✕</button>
            </div>
            <div className="cl-modal-body">
              <p style={{ marginBottom: '16px', color: '#64748b' }}>
                Upload a CSV or Excel file with client data. Download the template first.
              </p>
              <button className="btn-secondary" onClick={handleDownloadTemplate} style={{ width: '100%', marginBottom: '16px', justifyContent: 'center' }}>
                <span>📥</span> Download Template
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '40px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📂</div>
                <div style={{ color: '#6366f1', fontWeight: '600', marginBottom: '4px' }}>
                  Click to upload file
                </div>
                <div style={{ color: '#64748b', fontSize: '14px' }}>
                  CSV or Excel format
                </div>
              </div>
            </div>
            <div className="cl-modal-footer">
              <button className="btn-cancel" onClick={() => setShowBulkUpload(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Client Modal */}
      {showForm && (
        <div className="cl-modal-overlay" onClick={handleCancelForm}>
          <div className="cl-modal-content" onClick={e => e.stopPropagation()}>
            <div className="cl-modal-header">
              <h2 className="cl-modal-title">
                {currentClient.id ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button className="cl-btn-close" onClick={handleCancelForm}>✕</button>
            </div>
            <div className="cl-modal-body">
              {error && <div className="cl-form-error">{error}</div>}

              <div className="cl-form-row">
                <div className="cl-form-group">
                  <label className="cl-form-label">Client Name *</label>
                  <input
                    type="text"
                    className="cl-form-input"
                    value={currentClient.name}
                    onChange={(e) => handleClientChange('name', e.target.value)}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="cl-form-group">
                  <label className="cl-form-label">Client Code</label>
                  <input
                    type="text"
                    className="cl-form-input"
                    value={currentClient.code}
                    onChange={(e) => handleClientChange('code', e.target.value)}
                    placeholder="Auto-generated if blank"
                  />
                </div>
              </div>

              <div className="cl-form-row">
                <div className="cl-form-group">
                  <label className="cl-form-label">Email *</label>
                  <input
                    type="email"
                    className="cl-form-input"
                    value={currentClient.email}
                    onChange={(e) => handleClientChange('email', e.target.value)}
                    placeholder="client@example.com"
                  />
                </div>
                <div className="cl-form-group">
                  <label className="cl-form-label">Mobile</label>
                  <input
                    type="text"
                    className="cl-form-input"
                    value={currentClient.mobile}
                    onChange={(e) => handleClientChange('mobile', e.target.value)}
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
              </div>

              <div className="cl-form-row full">
                <div className="cl-form-group">
                  <label className="cl-form-label">Address</label>
                  <textarea
                    className="cl-form-input"
                    rows="2"
                    value={currentClient.address}
                    onChange={(e) => handleClientChange('address', e.target.value)}
                    placeholder="Enter full address"
                  />
                </div>
              </div>

              <div className="cl-form-row">
                <div className="cl-form-group">
                  <label className="cl-form-label">City</label>
                  <input
                    type="text"
                    className="cl-form-input"
                    value={currentClient.city}
                    onChange={(e) => handleClientChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="cl-form-group">
                  <label className="cl-form-label">PIN Code</label>
                  <input
                    type="text"
                    className="cl-form-input"
                    value={currentClient.pinCode}
                    onChange={(e) => handleClientChange('pinCode', e.target.value)}
                    placeholder="PIN Code"
                  />
                </div>
              </div>

              <div className="cl-form-row">
                <div className="cl-form-group">
                  <label className="cl-form-label">State *</label>
                  <select
                    className="cl-form-input"
                    value={currentClient.state}
                    onChange={(e) => handleClientChange('state', e.target.value)}
                  >
                    <option value="">-- Select State --</option>
                    {INDIAN_STATES.map(state => (
                      <option key={state.code} value={state.name}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cl-form-group">
                  <label className="cl-form-label">State Code</label>
                  <input
                    type="text"
                    className="cl-form-input"
                    value={currentClient.stateCode}
                    readOnly
                    placeholder="Auto-filled"
                  />
                </div>
              </div>

              <div className="cl-form-row">
                <div className="cl-form-group">
                  <label className="cl-form-label">GSTIN</label>
                  <input
                    type="text"
                    className="cl-form-input"
                    value={currentClient.gstin}
                    onChange={(e) => handleClientChange('gstin', e.target.value)}
                    placeholder="27XXXXX0000X1Z5"
                    maxLength="15"
                  />
                  {currentClient.gstin && currentClient.gstin.length === 15 && currentClient.stateCode && (
                    currentClient.gstin.substring(0, 2) === currentClient.stateCode ? (
                      <span className="cl-form-hint success">✓ GSTIN matches selected state</span>
                    ) : (
                      <span className="cl-form-hint error">✗ GSTIN state code mismatch</span>
                    )
                  )}
                </div>
                <div className="cl-form-group">
                  <label className="cl-form-label">PAN</label>
                  <input
                    type="text"
                    className="cl-form-input"
                    value={currentClient.pan}
                    onChange={(e) => handleClientChange('pan', e.target.value)}
                    placeholder="XXXXX0000X"
                    maxLength="10"
                  />
                </div>
              </div>
            </div>
            <div className="cl-modal-footer">
              <button className="btn-cancel" onClick={handleCancelForm}>Cancel</button>
              <button className="btn-save" onClick={handleSaveClient} disabled={loading}>
                {loading ? 'Saving...' : (currentClient.id ? 'Update Client' : 'Create Client')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clients;
