import React, { useState, useEffect } from 'react';
import { supplierAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';

// Indian States with GST State Codes (same as Clients.js)
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

function Suppliers() {
  const { showSuccess } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');

  const [currentSupplier, setCurrentSupplier] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    stateCode: '',
    gstin: '',
    pan: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    contact_person: '',
    payment_terms: '',
    notes: ''
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const response = await supplierAPI.getAll();
      setSuppliers(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  };

  const handleAddSupplier = () => {
    setCurrentSupplier({
      name: '',
      code: '',
      email: '',
      phone: '',
      mobile: '',
      address: '',
      city: '',
      state: '',
      pinCode: '',
      stateCode: '',
      gstin: '',
      pan: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      contact_person: '',
      payment_terms: '',
      notes: ''
    });
    setShowForm(true);
    setError('');
  };

  const handleEditSupplier = (supplier) => {
    setCurrentSupplier(supplier);
    setShowForm(true);
    setError('');
  };

  const handleDeleteSupplier = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await supplierAPI.delete(id);
        showSuccess('Supplier deleted successfully!');
        loadSuppliers();
      } catch (err) {
        setError('Failed to delete supplier. It may have associated purchases.');
      }
    }
  };

  const handleSupplierChange = (field, value) => {
    let updatedSupplier = { ...currentSupplier, [field]: value };

    // Auto-fill state code when state is selected
    if (field === 'state') {
      const selectedState = INDIAN_STATES.find(s => s.name === value);
      if (selectedState) {
        updatedSupplier.stateCode = selectedState.code;
      }
      setError('');
    }

    // Validate GSTIN against state code
    if (field === 'gstin') {
      const gstin = value.toUpperCase();
      updatedSupplier.gstin = gstin;

      if (gstin.length >= 2 && updatedSupplier.stateCode) {
        const gstinStateCode = gstin.substring(0, 2);
        if (gstinStateCode !== updatedSupplier.stateCode) {
          setError(`GSTIN state code (${gstinStateCode}) does not match selected state code (${updatedSupplier.stateCode})`);
        } else {
          setError('');
        }
      }
    }

    setCurrentSupplier(updatedSupplier);
  };

  const handleSaveSupplier = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!currentSupplier.name) {
      setError('Supplier name is required');
      setLoading(false);
      return;
    }

    // Validate GSTIN if provided
    if (currentSupplier.gstin) {
      const gstinStateCode = currentSupplier.gstin.substring(0, 2);
      if (currentSupplier.stateCode && gstinStateCode !== currentSupplier.stateCode) {
        setError(`GSTIN state code (${gstinStateCode}) does not match selected state code (${currentSupplier.stateCode})`);
        setLoading(false);
        return;
      }

      if (currentSupplier.gstin.length !== 15) {
        setError('GSTIN must be 15 characters long');
        setLoading(false);
        return;
      }
    }

    try {
      if (currentSupplier.id) {
        await supplierAPI.update(currentSupplier.id, currentSupplier);
      } else {
        await supplierAPI.create(currentSupplier);
      }

      showSuccess('Supplier saved successfully!');
      setShowForm(false);
      loadSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.gstin?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && supplier.is_active) ||
                         (statusFilter === 'inactive' && !supplier.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Suppliers</h1>
          <p className="page-description">Manage your supplier database for purchases</p>
        </div>
        <div className="page-header-right">
          <button className="btn-create" onClick={handleAddSupplier}>
            <span className="btn-icon">➕</span>
            Add Supplier
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Supplier Form */}
      {showForm && (
        <div className="content-card" style={{ marginBottom: '24px' }}>
          <div className="form-section">
            <h3 className="form-section-title">
              {currentSupplier.id ? 'Edit Supplier' : 'Add New Supplier'}
            </h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Supplier Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.name}
                  onChange={(e) => handleSupplierChange('name', e.target.value)}
                  placeholder="Enter supplier name"
                />
              </div>
              <div className="form-field">
                <label>Supplier Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.code}
                  onChange={(e) => handleSupplierChange('code', e.target.value)}
                  placeholder="e.g., SUP001"
                />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={currentSupplier.email}
                  onChange={(e) => handleSupplierChange('email', e.target.value)}
                  placeholder="supplier@example.com"
                />
              </div>
              <div className="form-field">
                <label>Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.phone}
                  onChange={(e) => handleSupplierChange('phone', e.target.value)}
                  placeholder="Landline number"
                />
              </div>
              <div className="form-field">
                <label>Mobile</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.mobile}
                  onChange={(e) => handleSupplierChange('mobile', e.target.value)}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>
              <div className="form-field">
                <label>Contact Person</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.contact_person}
                  onChange={(e) => handleSupplierChange('contact_person', e.target.value)}
                  placeholder="Contact person name"
                />
              </div>
              <div className="form-field full-width">
                <label>Address</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={currentSupplier.address}
                  onChange={(e) => handleSupplierChange('address', e.target.value)}
                  placeholder="Enter full address"
                ></textarea>
              </div>
              <div className="form-field">
                <label>City</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.city}
                  onChange={(e) => handleSupplierChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="form-field">
                <label>State</label>
                <select
                  className="form-input"
                  value={currentSupplier.state}
                  onChange={(e) => handleSupplierChange('state', e.target.value)}
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
                  value={currentSupplier.stateCode}
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
                  value={currentSupplier.pinCode}
                  onChange={(e) => handleSupplierChange('pinCode', e.target.value)}
                  placeholder="PIN Code"
                />
              </div>
              <div className="form-field">
                <label>GSTIN</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.gstin}
                  onChange={(e) => handleSupplierChange('gstin', e.target.value)}
                  placeholder="27XXXXX0000X1Z5"
                  maxLength="15"
                />
                {currentSupplier.gstin && currentSupplier.gstin.length === 15 && currentSupplier.stateCode && (
                  currentSupplier.gstin.substring(0, 2) === currentSupplier.stateCode ? (
                    <small style={{ color: '#10b981', display: 'block', marginTop: '4px' }}>
                      GSTIN matches selected state
                    </small>
                  ) : (
                    <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                      GSTIN state code does not match selected state
                    </small>
                  )
                )}
              </div>
              <div className="form-field">
                <label>PAN</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.pan}
                  onChange={(e) => handleSupplierChange('pan', e.target.value)}
                  placeholder="XXXXX0000X"
                />
              </div>

              {/* Bank Details Section */}
              <div className="form-field full-width" style={{
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginTop: '8px'
              }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Bank Details</h4>
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-field">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentSupplier.bank_name}
                      onChange={(e) => handleSupplierChange('bank_name', e.target.value)}
                      placeholder="Bank name"
                    />
                  </div>
                  <div className="form-field">
                    <label>Account Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentSupplier.account_number}
                      onChange={(e) => handleSupplierChange('account_number', e.target.value)}
                      placeholder="Account number"
                    />
                  </div>
                  <div className="form-field">
                    <label>IFSC Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentSupplier.ifsc_code}
                      onChange={(e) => handleSupplierChange('ifsc_code', e.target.value)}
                      placeholder="IFSC code"
                    />
                  </div>
                  <div className="form-field">
                    <label>Payment Terms</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentSupplier.payment_terms}
                      onChange={(e) => handleSupplierChange('payment_terms', e.target.value)}
                      placeholder="e.g., Net 30, Advance"
                    />
                  </div>
                </div>
              </div>

              <div className="form-field full-width">
                <label>Notes</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={currentSupplier.notes}
                  onChange={(e) => handleSupplierChange('notes', e.target.value)}
                  placeholder="Additional notes about the supplier"
                ></textarea>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-create" onClick={handleSaveSupplier} disabled={loading}>
                <span className="btn-icon">💾</span>
                {loading ? 'Saving...' : 'Save Supplier'}
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
                placeholder="Search suppliers..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group" style={{ flex: '0 0 200px' }}>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Suppliers</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="content-card">
            {filteredSuppliers.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">🏭</div>
                <h3 className="empty-title">No Suppliers Yet</h3>
                <p className="empty-description">Add your first supplier to start recording purchases</p>
                <button className="btn-create" onClick={handleAddSupplier}>
                  <span className="btn-icon">➕</span>
                  Add Your First Supplier
                </button>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Supplier Code</th>
                      <th>Supplier Name</th>
                      <th>City</th>
                      <th>GSTIN</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Payment Terms</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id}>
                        <td>{supplier.code || '-'}</td>
                        <td>
                          <strong>{supplier.name}</strong>
                          {supplier.contact_person && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              Contact: {supplier.contact_person}
                            </div>
                          )}
                        </td>
                        <td>{supplier.city || '-'}</td>
                        <td>{supplier.gstin || '-'}</td>
                        <td>{supplier.mobile || supplier.phone || '-'}</td>
                        <td>{supplier.email || '-'}</td>
                        <td>{supplier.payment_terms || '-'}</td>
                        <td>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleEditSupplier(supplier)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleDeleteSupplier(supplier.id)}
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

export default Suppliers;
