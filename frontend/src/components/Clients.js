import React, { useState, useEffect } from 'react';
import { clientAPI } from '../services/api';
import './Pages.css';

// Indian States with GST State Codes
const INDIAN_STATES = [
  { name: 'Andaman and Nicobar Islands', code: '35' },
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Assam', code: '18' },
  { name: 'Bihar', code: '10' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
  { name: 'Delhi', code: '07' },
  { name: 'Goa', code: '30' },
  { name: 'Gujarat', code: '24' },
  { name: 'Haryana', code: '06' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Jammu and Kashmir', code: '01' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Karnataka', code: '29' },
  { name: 'Kerala', code: '32' },
  { name: 'Ladakh', code: '38' },
  { name: 'Lakshadweep', code: '31' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Manipur', code: '14' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Mizoram', code: '15' },
  { name: 'Nagaland', code: '13' },
  { name: 'Odisha', code: '21' },
  { name: 'Puducherry', code: '34' },
  { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Sikkim', code: '11' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Tripura', code: '16' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'West Bengal', code: '19' }
];

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saveSuccess, setSaveSuccess] = useState(false);
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
    try {
      const response = await clientAPI.getAll();
      setClients(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading clients:', err);
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
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        loadClients();
      } catch (err) {
        setError('Failed to delete client');
      }
    }
  };

  const handleClientChange = (field, value) => {
    let updatedClient = { ...currentClient, [field]: value };

    // Auto-fill state code when state is selected
    if (field === 'state') {
      const selectedState = INDIAN_STATES.find(s => s.name === value);
      if (selectedState) {
        updatedClient.stateCode = selectedState.code;
      }
      // Clear error if state is selected
      setError('');
    }

    // Validate GSTIN against state code
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

    // Validation
    if (!currentClient.name || !currentClient.email) {
      setError('Client name and email are required');
      setLoading(false);
      return;
    }

    // Validate state is required
    if (!currentClient.state) {
      setError('State is required');
      setLoading(false);
      return;
    }

    // Validate GSTIN if provided
    if (currentClient.gstin) {
      const gstinStateCode = currentClient.gstin.substring(0, 2);
      if (gstinStateCode !== currentClient.stateCode) {
        setError(`GSTIN state code (${gstinStateCode}) does not match selected state code (${currentClient.stateCode}). Please correct the GSTIN or select the correct state.`);
        setLoading(false);
        return;
      }

      // Basic GSTIN format validation (15 characters)
      if (currentClient.gstin.length !== 15) {
        setError('GSTIN must be 15 characters long');
        setLoading(false);
        return;
      }
    }

    try {
      if (currentClient.id) {
        await clientAPI.update(currentClient.id, currentClient);
      } else {
        await clientAPI.create(currentClient);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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
    // Create Excel template data with updated fields
    // Note: Client Code is optional - if left blank, it will be auto-generated
    const templateData = [
      ['Client Name*', 'Client Code (auto-generated if blank)', 'Email*', 'Phone', 'Mobile', 'Address', 'City', 'State', 'PIN Code', 'State Code', 'GSTIN', 'PAN', 'Date of Birth (YYYY-MM-DD)', 'Date of Incorporation (YYYY-MM-DD)'],
      ['ABC Corporation', '', 'abc@example.com', '022-12345678', '9876543210', '123 Main St', 'Mumbai', 'Maharashtra', '400001', '27', '27XXXXX0000X1Z5', 'XXXXX0000X', '', '2020-01-15'],
      ['John Doe', 'CUSTOM01', 'john@example.com', '', '9876543211', '456 Park Ave', 'Delhi', 'Delhi', '110001', '07', '', '', '1985-05-20', '']
    ];

    // Convert to CSV
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

  const handleBulkUpload = () => {
    setShowBulkUpload(true);
    setError('');
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
        message += `\n\nErrors:\n${errors.slice(0, 5).join('\n')}`;
        if (errors.length > 5) {
          message += `\n... and ${errors.length - 5} more errors`;
        }
      }

      alert(message);
      setShowBulkUpload(false);
      loadClients();

    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to upload file. Please check the format and try again.';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.code?.toLowerCase().includes(searchTerm.toLowerCase());

    // Add status filter when status field is available
    const matchesStatus = statusFilter === 'all' || true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Clients</h1>
          <p className="page-description">Manage your client database</p>
        </div>
        <div className="page-header-right">
          <button className="btn-secondary" onClick={handleDownloadTemplate}>
            <span className="btn-icon">📥</span>
            Download Template
          </button>
          <button className="btn-secondary" onClick={handleBulkUpload}>
            <span className="btn-icon">📤</span>
            Bulk Upload
          </button>
          <button className="btn-create" onClick={handleAddClient}>
            <span className="btn-icon">➕</span>
            Add Client
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="success-message">
          ✅ Client saved successfully!
        </div>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="modal-overlay" onClick={() => setShowBulkUpload(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h2>Bulk Upload Clients</h2>
              <button className="modal-close" onClick={() => setShowBulkUpload(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{marginBottom: '16px', color: '#6b7280'}}>
                Upload a CSV or Excel file with client data. Make sure to use the template format.
              </p>
              <div style={{marginBottom: '16px'}}>
                <button className="btn-secondary" onClick={handleDownloadTemplate} style={{width: '100%'}}>
                  <span className="btn-icon">📥</span>
                  Download Template First
                </button>
              </div>
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '32px',
                textAlign: 'center',
                background: '#f8f9fa'
              }}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{display: 'none'}}
                  id="file-upload"
                />
                <label htmlFor="file-upload" style={{cursor: 'pointer'}}>
                  <div style={{fontSize: '48px', marginBottom: '8px'}}>📂</div>
                  <div style={{color: '#6366f1', fontWeight: '600', marginBottom: '4px'}}>
                    Click to upload file
                  </div>
                  <div style={{color: '#6b7280', fontSize: '14px'}}>
                    CSV or Excel format
                  </div>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowBulkUpload(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Client Form */}
      {showForm && (
        <div className="content-card" style={{marginBottom: '24px'}}>
          <div className="form-section">
            <h3 className="form-section-title">
              {currentClient.id ? 'Edit Client' : 'Add New Client'}
            </h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Client Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentClient.name}
                  onChange={(e) => handleClientChange('name', e.target.value)}
                  placeholder="Enter client name"
                />
              </div>
              <div className="form-field">
                <label>Client Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentClient.code}
                  onChange={(e) => handleClientChange('code', e.target.value)}
                  placeholder="e.g., CLI001"
                />
              </div>
              <div className="form-field">
                <label>Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={currentClient.email}
                  onChange={(e) => handleClientChange('email', e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <div className="form-field">
                <label>Mobile</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentClient.mobile}
                  onChange={(e) => handleClientChange('mobile', e.target.value)}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>
              <div className="form-field full-width">
                <label>Address</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={currentClient.address}
                  onChange={(e) => handleClientChange('address', e.target.value)}
                  placeholder="Enter full address"
                ></textarea>
              </div>
              <div className="form-field">
                <label>City</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentClient.city}
                  onChange={(e) => handleClientChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="form-field">
                <label>State *</label>
                <select
                  className="form-input"
                  value={currentClient.state}
                  onChange={(e) => handleClientChange('state', e.target.value)}
                  required
                >
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map(state => (
                    <option key={state.code} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>State Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentClient.stateCode}
                  readOnly
                  placeholder="Auto-filled"
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-field">
                <label>PIN Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentClient.pinCode}
                  onChange={(e) => handleClientChange('pinCode', e.target.value)}
                  placeholder="PIN Code"
                />
              </div>
              <div className="form-field">
                <label>GSTIN</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentClient.gstin}
                  onChange={(e) => handleClientChange('gstin', e.target.value)}
                  placeholder="27XXXXX0000X1Z5"
                  maxLength="15"
                />
                {currentClient.gstin && currentClient.gstin.length === 15 && currentClient.stateCode && (
                  currentClient.gstin.substring(0, 2) === currentClient.stateCode ? (
                    <small style={{ color: '#10b981', display: 'block', marginTop: '4px' }}>
                      ✓ GSTIN matches selected state
                    </small>
                  ) : (
                    <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                      ✗ GSTIN state code does not match selected state
                    </small>
                  )
                )}
              </div>
              <div className="form-field">
                <label>PAN</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentClient.pan}
                  onChange={(e) => handleClientChange('pan', e.target.value)}
                  placeholder="XXXXX0000X"
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-create" onClick={handleSaveClient} disabled={loading}>
                <span className="btn-icon">💾</span>
                {loading ? 'Saving...' : 'Save Client'}
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
                placeholder="Search clients..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Clients</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="content-card">
            {filteredClients.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">👥</div>
                <h3 className="empty-title">No Clients Yet</h3>
                <p className="empty-description">Add your first client to start creating invoices</p>
                <button className="btn-create" onClick={handleAddClient}>
                  <span className="btn-icon">➕</span>
                  Add Your First Client
                </button>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Client Code</th>
                      <th>Client Name</th>
                      <th>City</th>
                      <th>GSTIN</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client.id}>
                        <td>{client.code || '-'}</td>
                        <td><strong>{client.name}</strong></td>
                        <td>{client.city || '-'}</td>
                        <td>{client.gstin || '-'}</td>
                        <td>{client.mobile || '-'}</td>
                        <td>{client.email}</td>
                        <td>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleEditClient(client)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleDeleteClient(client.id)}
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

export default Clients;
