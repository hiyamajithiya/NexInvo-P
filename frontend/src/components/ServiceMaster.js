import React, { useState, useEffect } from 'react';
import { serviceItemAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';

function ServiceMaster() {
  const { showSuccess } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const [currentService, setCurrentService] = useState({
    name: '',
    description: '',
    sac_code: '',
    gst_rate: 18.00
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await serviceItemAPI.getAll();
      setServices(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading services:', err);
    }
  };

  const handleAddService = () => {
    setCurrentService({
      name: '',
      description: '',
      sac_code: '',
      gst_rate: 18.00
    });
    setShowForm(true);
    setError('');
  };

  const handleEditService = (service) => {
    setCurrentService(service);
    setShowForm(true);
    setError('');
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await serviceItemAPI.delete(id);
        showSuccess('Service deleted successfully!');
        loadServices();
      } catch (err) {
        setError('Failed to delete service');
      }
    }
  };

  const handleServiceChange = (field, value) => {
    setCurrentService({ ...currentService, [field]: value });
  };

  const handleSaveService = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!currentService.name) {
      setError('Service name is required');
      setLoading(false);
      return;
    }

    try {
      if (currentService.id) {
        await serviceItemAPI.update(currentService.id, currentService);
      } else {
        await serviceItemAPI.create(currentService);
      }

      showSuccess('Service saved successfully!');
      setShowForm(false);
      loadServices();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.sac_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Service Master</h1>
          <p className="page-description">Manage your professional services catalog</p>
        </div>
        <div className="page-header-right">
          <button className="btn-create" onClick={handleAddService}>
            <span className="btn-icon">➕</span>
            Add Service
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Service Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{currentService.id ? 'Edit Service' : 'Add New Service'}</h2>
              <button className="btn-close" onClick={handleCancelForm}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Service Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={currentService.name}
                    onChange={(e) => handleServiceChange('name', e.target.value)}
                    placeholder="e.g., Tax Audit, GST Return Filing"
                  />
                </div>

                <div className="form-field full-width">
                  <label>Description</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={currentService.description}
                    onChange={(e) => handleServiceChange('description', e.target.value)}
                    placeholder="Detailed description of the service"
                  ></textarea>
                </div>

                <div className="form-field">
                  <label>SAC Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={currentService.sac_code}
                    onChange={(e) => handleServiceChange('sac_code', e.target.value)}
                    placeholder="e.g., 998311"
                  />
                </div>

                <div className="form-field">
                  <label>GST Rate (%)</label>
                  <select
                    className="form-input"
                    value={currentService.gst_rate}
                    onChange={(e) => handleServiceChange('gst_rate', parseFloat(e.target.value))}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-create"
                onClick={handleSaveService}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Service'}
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
            placeholder="🔍 Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Services Table */}
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width: '5%'}}>Sl</th>
                <th style={{width: '25%'}}>Service Name</th>
                <th style={{width: '30%'}}>Description</th>
                <th style={{width: '15%'}}>SAC Code</th>
                <th style={{width: '10%'}}>GST %</th>
                <th style={{width: '15%'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '40px'}}>
                    <div className="empty-state">
                      <span style={{fontSize: '48px'}}>📋</span>
                      <h3>No Services Found</h3>
                      <p>Add your first service to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service, index) => (
                  <tr key={service.id}>
                    <td className="text-center">{index + 1}</td>
                    <td>
                      <strong>{service.name}</strong>
                    </td>
                    <td>{service.description || '-'}</td>
                    <td>{service.sac_code || '-'}</td>
                    <td className="text-center">{service.gst_rate}%</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-edit"
                          onClick={() => handleEditService(service)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDeleteService(service.id)}
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
            Total Services: {filteredServices.length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ServiceMaster;
