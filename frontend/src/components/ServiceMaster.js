import React, { useState, useEffect } from 'react';
import { serviceItemAPI } from '../services/api';
import { useToast } from './Toast';

// Inline styles for Service Master (sm- prefix to avoid conflicts)
const styles = {
  smMainContent: {
    padding: '24px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    boxSizing: 'border-box',
    width: '100%',
    overflow: 'visible'
  },
  smPageHeader: {
    marginBottom: '24px'
  },
  smPageTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0'
  },
  smPageSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0'
  },
  smStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  smStatCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderLeft: '4px solid #e2e8f0',
    transition: 'all 0.2s'
  },
  smStatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  smStatIcon: {
    fontSize: '20px'
  },
  smStatInfo: {
    flex: 1
  },
  smStatValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0'
  },
  smStatLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
    margin: '0'
  },
  smContentCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'visible'
  },
  smToolbar: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'space-between'
  },
  smToolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: '1'
  },
  smToolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  smSearchBox: {
    position: 'relative',
    flex: '1',
    maxWidth: '320px'
  },
  smSearchInput: {
    width: '100%',
    padding: '10px 16px 10px 40px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box'
  },
  smSearchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    fontSize: '14px'
  },
  smViewToggle: {
    display: 'flex',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  smViewBtn: {
    padding: '8px 12px',
    border: 'none',
    background: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#64748b',
    transition: 'all 0.2s'
  },
  smViewBtnActive: {
    padding: '8px 12px',
    border: 'none',
    background: '#3b82f6',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  smAddBtn: {
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
  smTableWrapper: {
    overflowX: 'auto',
    overflowY: 'visible'
  },
  smTable: {
    width: '100%',
    minWidth: '700px',
    borderCollapse: 'collapse'
  },
  smTableHeader: {
    backgroundColor: '#f8fafc',
    whiteSpace: 'nowrap'
  },
  smTableHeaderCell: {
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
  smTableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s'
  },
  smTableCell: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#334155',
    verticalAlign: 'middle'
  },
  smServiceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  smServiceIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#f0f9ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px'
  },
  smServiceDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  smServiceName: {
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '2px'
  },
  smServiceDesc: {
    fontSize: '12px',
    color: '#64748b',
    maxWidth: '250px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  smBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  },
  smBadgeSac: {
    backgroundColor: '#f0f9ff',
    color: '#0369a1'
  },
  smBadgeGst: {
    backgroundColor: '#f0fdf4',
    color: '#15803d'
  },
  smActions: {
    display: 'flex',
    gap: '8px'
  },
  smActionBtn: {
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  smEditBtn: {
    backgroundColor: '#f0f9ff',
    color: '#3b82f6'
  },
  smDeleteBtn: {
    backgroundColor: '#fef2f2',
    color: '#ef4444'
  },
  smCardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    padding: '20px'
  },
  smServiceCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer'
  },
  smCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  smCardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#f0f9ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px'
  },
  smCardActions: {
    display: 'flex',
    gap: '4px'
  },
  smCardName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px'
  },
  smCardDesc: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '16px',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  smCardFooter: {
    display: 'flex',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9'
  },
  smEmptyState: {
    padding: '60px 20px',
    textAlign: 'center'
  },
  smEmptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  smEmptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px'
  },
  smEmptyText: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '20px'
  },
  smTableFooter: {
    padding: '16px 20px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  smTableInfo: {
    fontSize: '14px',
    color: '#64748b'
  },
  // Modal styles
  smModalOverlay: {
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
  smModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  smModalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  smModalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  smModalClose: {
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
  smModalBody: {
    padding: '24px'
  },
  smFormGroup: {
    marginBottom: '20px'
  },
  smFormLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },
  smFormRequired: {
    color: '#ef4444'
  },
  smFormInput: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box'
  },
  smFormTextarea: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  smFormSelect: {
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
  smFormRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  smModalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    backgroundColor: '#f8fafc'
  },
  smBtnPrimary: {
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
  smBtnSecondary: {
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
  smErrorBanner: {
    margin: '0 0 24px 0',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
};

function ServiceMaster() {
  const { showSuccess } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table');

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
      // Error handled silently
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

  // Calculate stats
  const totalServices = services.length;
  const withSacCode = services.filter(s => s.sac_code).length;
  const gst18Count = services.filter(s => parseFloat(s.gst_rate) === 18).length;
  const otherGstCount = services.filter(s => parseFloat(s.gst_rate) !== 18).length;

  const getGstRateColor = (rate) => {
    const r = parseFloat(rate);
    if (r === 0) return { backgroundColor: '#f1f5f9', color: '#64748b' };
    if (r === 5) return { backgroundColor: '#fef3c7', color: '#92400e' };
    if (r === 12) return { backgroundColor: '#e0f2fe', color: '#0369a1' };
    if (r === 18) return { backgroundColor: '#f0fdf4', color: '#15803d' };
    if (r === 28) return { backgroundColor: '#fef2f2', color: '#dc2626' };
    return { backgroundColor: '#f0fdf4', color: '#15803d' };
  };

  return (
    <div style={styles.smMainContent}>
      {/* Page Header */}
      <div style={styles.smPageHeader}>
        <h1 style={styles.smPageTitle}>Service Master</h1>
        <p style={styles.smPageSubtitle}>Manage your professional services catalog</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={styles.smErrorBanner}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={styles.smStatsGrid}>
        <div style={{...styles.smStatCard, borderLeftColor: '#6366f1'}}>
          <div style={styles.smStatHeader}>
            <span style={styles.smStatIcon}>📋</span>
            <span style={styles.smStatLabel}>Total Services</span>
          </div>
          <p style={styles.smStatValue}>{totalServices}</p>
        </div>
        <div style={{...styles.smStatCard, borderLeftColor: '#10b981'}}>
          <div style={styles.smStatHeader}>
            <span style={styles.smStatIcon}>📦</span>
            <span style={styles.smStatLabel}>With SAC Code</span>
          </div>
          <p style={styles.smStatValue}>{withSacCode}</p>
        </div>
        <div style={{...styles.smStatCard, borderLeftColor: '#f59e0b'}}>
          <div style={styles.smStatHeader}>
            <span style={styles.smStatIcon}>💰</span>
            <span style={styles.smStatLabel}>GST @ 18%</span>
          </div>
          <p style={styles.smStatValue}>{gst18Count}</p>
        </div>
        <div style={{...styles.smStatCard, borderLeftColor: '#9333ea'}}>
          <div style={styles.smStatHeader}>
            <span style={styles.smStatIcon}>📊</span>
            <span style={styles.smStatLabel}>Other GST Rates</span>
          </div>
          <p style={styles.smStatValue}>{otherGstCount}</p>
        </div>
      </div>

      {/* Content Card */}
      <div style={styles.smContentCard}>
        {/* Toolbar */}
        <div style={styles.smToolbar}>
          <div style={styles.smToolbarLeft}>
            <div style={styles.smSearchBox}>
              <span style={styles.smSearchIcon}>🔍</span>
              <input
                type="text"
                style={styles.smSearchInput}
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div style={styles.smToolbarRight}>
            <div style={styles.smViewToggle}>
              <button
                style={viewMode === 'table' ? styles.smViewBtnActive : styles.smViewBtn}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                ☰
              </button>
              <button
                style={viewMode === 'card' ? styles.smViewBtnActive : styles.smViewBtn}
                onClick={() => setViewMode('card')}
                title="Card View"
              >
                ▦
              </button>
            </div>
            <button style={styles.smAddBtn} onClick={handleAddService}>
              <span>+</span> Add Service
            </button>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <>
            <div style={styles.smTableWrapper}>
              <table style={styles.smTable}>
                <thead style={styles.smTableHeader}>
                  <tr>
                    <th style={{...styles.smTableHeaderCell, width: '5%'}}>#</th>
                    <th style={{...styles.smTableHeaderCell, width: '35%'}}>Service</th>
                    <th style={{...styles.smTableHeaderCell, width: '20%'}}>SAC Code</th>
                    <th style={{...styles.smTableHeaderCell, width: '15%'}}>GST Rate</th>
                    <th style={{...styles.smTableHeaderCell, width: '15%', textAlign: 'center'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        <div style={styles.smEmptyState}>
                          <div style={styles.smEmptyIcon}>📋</div>
                          <h3 style={styles.smEmptyTitle}>No Services Found</h3>
                          <p style={styles.smEmptyText}>Add your first service to get started</p>
                          <button style={styles.smAddBtn} onClick={handleAddService}>
                            <span>+</span> Add Service
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((service, index) => (
                      <tr
                        key={service.id}
                        style={styles.smTableRow}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{...styles.smTableCell, color: '#94a3b8'}}>{index + 1}</td>
                        <td style={styles.smTableCell}>
                          <div style={styles.smServiceInfo}>
                            <div style={styles.smServiceIcon}>🔧</div>
                            <div style={styles.smServiceDetails}>
                              <div style={styles.smServiceName}>{service.name}</div>
                              {service.description && (
                                <div style={styles.smServiceDesc}>{service.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={styles.smTableCell}>
                          {service.sac_code ? (
                            <span style={{...styles.smBadge, ...styles.smBadgeSac}}>
                              {service.sac_code}
                            </span>
                          ) : (
                            <span style={{color: '#94a3b8'}}>—</span>
                          )}
                        </td>
                        <td style={styles.smTableCell}>
                          <span style={{...styles.smBadge, ...getGstRateColor(service.gst_rate)}}>
                            {service.gst_rate}%
                          </span>
                        </td>
                        <td style={{...styles.smTableCell, textAlign: 'center'}}>
                          <div style={{...styles.smActions, justifyContent: 'center'}}>
                            <button
                              style={{...styles.smActionBtn, ...styles.smEditBtn}}
                              onClick={() => handleEditService(service)}
                              title="Edit"
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                            >
                              ✏️
                            </button>
                            <button
                              style={{...styles.smActionBtn, ...styles.smDeleteBtn}}
                              onClick={() => handleDeleteService(service.id)}
                              title="Delete"
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
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
            {filteredServices.length > 0 && (
              <div style={styles.smTableFooter}>
                <span style={styles.smTableInfo}>
                  Showing {filteredServices.length} of {totalServices} services
                </span>
              </div>
            )}
          </>
        )}

        {/* Card View */}
        {viewMode === 'card' && (
          <>
            {filteredServices.length === 0 ? (
              <div style={styles.smEmptyState}>
                <div style={styles.smEmptyIcon}>📋</div>
                <h3 style={styles.smEmptyTitle}>No Services Found</h3>
                <p style={styles.smEmptyText}>Add your first service to get started</p>
                <button style={styles.smAddBtn} onClick={handleAddService}>
                  <span>+</span> Add Service
                </button>
              </div>
            ) : (
              <div style={styles.smCardGrid}>
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    style={styles.smServiceCard}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={styles.smCardHeader}>
                      <div style={styles.smCardIcon}>🔧</div>
                      <div style={styles.smCardActions}>
                        <button
                          style={{...styles.smActionBtn, ...styles.smEditBtn}}
                          onClick={() => handleEditService(service)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          style={{...styles.smActionBtn, ...styles.smDeleteBtn}}
                          onClick={() => handleDeleteService(service.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div style={styles.smCardName}>{service.name}</div>
                    <div style={styles.smCardDesc}>
                      {service.description || 'No description available'}
                    </div>
                    <div style={styles.smCardFooter}>
                      {service.sac_code && (
                        <span style={{...styles.smBadge, ...styles.smBadgeSac}}>
                          SAC: {service.sac_code}
                        </span>
                      )}
                      <span style={{...styles.smBadge, ...getGstRateColor(service.gst_rate)}}>
                        GST: {service.gst_rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div style={styles.smModalOverlay} onClick={handleCancelForm}>
          <div style={styles.smModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.smModalHeader}>
              <h2 style={styles.smModalTitle}>
                {currentService.id ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button style={styles.smModalClose} onClick={handleCancelForm}>
                ✕
              </button>
            </div>
            <div style={styles.smModalBody}>
              <div style={styles.smFormGroup}>
                <label style={styles.smFormLabel}>
                  Service Name <span style={styles.smFormRequired}>*</span>
                </label>
                <input
                  type="text"
                  style={styles.smFormInput}
                  value={currentService.name}
                  onChange={(e) => handleServiceChange('name', e.target.value)}
                  placeholder="e.g., Tax Audit, GST Return Filing"
                />
              </div>

              <div style={styles.smFormGroup}>
                <label style={styles.smFormLabel}>Description</label>
                <textarea
                  style={styles.smFormTextarea}
                  value={currentService.description}
                  onChange={(e) => handleServiceChange('description', e.target.value)}
                  placeholder="Detailed description of the service"
                />
              </div>

              <div style={styles.smFormRow}>
                <div style={styles.smFormGroup}>
                  <label style={styles.smFormLabel}>SAC Code</label>
                  <input
                    type="text"
                    style={styles.smFormInput}
                    value={currentService.sac_code}
                    onChange={(e) => handleServiceChange('sac_code', e.target.value)}
                    placeholder="e.g., 998311"
                  />
                </div>

                <div style={styles.smFormGroup}>
                  <label style={styles.smFormLabel}>GST Rate (%)</label>
                  <select
                    style={styles.smFormSelect}
                    value={currentService.gst_rate}
                    onChange={(e) => handleServiceChange('gst_rate', parseFloat(e.target.value))}
                  >
                    <option value="0">0% - Exempt</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Standard)</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={styles.smModalFooter}>
              <button style={styles.smBtnSecondary} onClick={handleCancelForm}>
                Cancel
              </button>
              <button
                style={{...styles.smBtnPrimary, opacity: loading ? 0.7 : 1}}
                onClick={handleSaveService}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceMaster;
