import React, { useState, useEffect } from 'react';
import { paymentTermAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';

function PaymentTerms() {
  const { showSuccess } = useToast();
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const [currentTerm, setCurrentTerm] = useState({
    term_name: '',
    days: 30,
    description: ''
  });

  useEffect(() => {
    loadPaymentTerms();
  }, []);

  const loadPaymentTerms = async () => {
    try {
      const response = await paymentTermAPI.getAll();
      setPaymentTerms(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading payment terms:', err);
    }
  };

  const handleAddTerm = () => {
    setCurrentTerm({
      term_name: '',
      days: 30,
      description: ''
    });
    setShowForm(true);
    setError('');
  };

  const handleEditTerm = (term) => {
    setCurrentTerm(term);
    setShowForm(true);
    setError('');
  };

  const handleDeleteTerm = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment term?')) {
      try {
        await paymentTermAPI.delete(id);
        showSuccess('Payment term deleted successfully!');
        loadPaymentTerms();
      } catch (err) {
        setError('Failed to delete payment term');
      }
    }
  };

  const handleTermChange = (field, value) => {
    setCurrentTerm({ ...currentTerm, [field]: value });
  };

  const handleSaveTerm = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!currentTerm.term_name) {
      setError('Term name is required');
      setLoading(false);
      return;
    }

    if (!currentTerm.days || currentTerm.days <= 0) {
      setError('Days must be a positive number');
      setLoading(false);
      return;
    }

    if (!currentTerm.description) {
      setError('Description is required');
      setLoading(false);
      return;
    }

    try {
      if (currentTerm.id) {
        await paymentTermAPI.update(currentTerm.id, currentTerm);
      } else {
        await paymentTermAPI.create(currentTerm);
      }

      showSuccess('Payment term saved successfully!');
      setShowForm(false);
      loadPaymentTerms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save payment term');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const filteredTerms = paymentTerms.filter(term => {
    const matchesSearch = term.term_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         term.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Payment Terms</h1>
          <p className="page-description">Manage payment terms for invoices</p>
        </div>
        <div className="page-header-right">
          <button className="btn-create" onClick={handleAddTerm}>
            <span className="btn-icon">➕</span>
            Add Payment Term
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Payment Term Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{currentTerm.id ? 'Edit Payment Term' : 'Add New Payment Term'}</h2>
              <button className="btn-close" onClick={handleCancelForm}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label>Term Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={currentTerm.term_name}
                    onChange={(e) => handleTermChange('term_name', e.target.value)}
                    placeholder="e.g., Net 30"
                  />
                </div>

                <div className="form-field">
                  <label>Days *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={currentTerm.days}
                    onChange={(e) => handleTermChange('days', parseInt(e.target.value))}
                    placeholder="e.g., 30"
                    min="1"
                  />
                </div>

                <div className="form-field full-width">
                  <label>Description *</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={currentTerm.description}
                    onChange={(e) => handleTermChange('description', e.target.value)}
                    placeholder="e.g., Payment due within 30 days"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-create"
                onClick={handleSaveTerm}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Payment Term'}
              </button>
              <button className="btn-secondary" onClick={handleCancelForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="content-card">
        <div className="filter-section">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search payment terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Payment Terms Table */}
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width: '5%'}}>Sl</th>
                <th style={{width: '20%'}}>Term Name</th>
                <th style={{width: '15%'}}>Days</th>
                <th style={{width: '45%'}}>Description</th>
                <th style={{width: '15%'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTerms.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '40px'}}>
                    <div className="empty-state">
                      <span style={{fontSize: '48px'}}>📋</span>
                      <h3>No Payment Terms Found</h3>
                      <p>Add your first payment term to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTerms.map((term, index) => (
                  <tr key={term.id}>
                    <td className="text-center">{index + 1}</td>
                    <td>
                      <strong>{term.term_name}</strong>
                    </td>
                    <td className="text-center">{term.days} days</td>
                    <td>{term.description}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-edit"
                          onClick={() => handleEditTerm(term)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDeleteTerm(term.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <p className="table-summary">
            Total Payment Terms: {filteredTerms.length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaymentTerms;
