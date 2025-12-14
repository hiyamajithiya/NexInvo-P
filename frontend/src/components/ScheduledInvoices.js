import React, { useState, useEffect, useCallback } from 'react';
import { scheduledInvoiceAPI, clientAPI, paymentTermAPI, serviceItemAPI } from '../services/api';
import { formatDate } from '../utils/dateFormat';
import { useToast } from './Toast';
import './Pages.css';

function ScheduledInvoices({ onBack }) {
  const { showSuccess, showError } = useToast();
  const [scheduledInvoices, setScheduledInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Form state
  const [clients, setClients] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    invoice_type: 'proforma',
    frequency: 'monthly',
    day_of_month: 1,
    day_of_week: null,
    month_of_year: null,
    start_date: '',
    end_date: '',
    max_occurrences: '',
    payment_term: '',
    notes: '',
    auto_send_email: true,
    email_subject: '',
    email_body: '',
    items: [{ description: '', hsn_sac: '', gst_rate: 18, taxable_amount: 0, total_amount: 0 }]
  });

  const loadScheduledInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await scheduledInvoiceAPI.getAll(params);
      setScheduledInvoices(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading scheduled invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  const loadStats = async () => {
    try {
      const response = await scheduledInvoiceAPI.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadFormData = async () => {
    try {
      const [clientsRes, termsRes, servicesRes] = await Promise.all([
        clientAPI.getAll(),
        paymentTermAPI.getAll(),
        serviceItemAPI.getAll()
      ]);
      setClients(clientsRes.data.results || clientsRes.data || []);
      setPaymentTerms(termsRes.data.results || termsRes.data || []);
      setServiceItems(servicesRes.data.results || servicesRes.data || []);
    } catch (err) {
      console.error('Error loading form data:', err);
    }
  };

  useEffect(() => {
    loadScheduledInvoices();
    loadStats();
  }, [loadScheduledInvoices]);

  useEffect(() => {
    if (showForm) {
      loadFormData();
    }
  }, [showForm]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this scheduled invoice?')) {
      try {
        await scheduledInvoiceAPI.delete(id);
        showSuccess('Schedule deleted successfully');
        loadScheduledInvoices();
        loadStats();
      } catch (err) {
        showError('Failed to delete scheduled invoice');
      }
    }
  };

  const handlePause = async (id) => {
    try {
      await scheduledInvoiceAPI.pause(id);
      showSuccess('Schedule paused');
      loadScheduledInvoices();
      loadStats();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to pause scheduled invoice');
    }
  };

  const handleResume = async (id) => {
    try {
      await scheduledInvoiceAPI.resume(id);
      showSuccess('Schedule resumed');
      loadScheduledInvoices();
      loadStats();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to resume scheduled invoice');
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this scheduled invoice? This cannot be undone.')) {
      try {
        await scheduledInvoiceAPI.cancel(id);
        showSuccess('Schedule cancelled');
        loadScheduledInvoices();
        loadStats();
      } catch (err) {
        showError(err.response?.data?.error || 'Failed to cancel scheduled invoice');
      }
    }
  };

  const handleGenerateNow = async (id) => {
    if (window.confirm('Generate an invoice now from this schedule?')) {
      try {
        const response = await scheduledInvoiceAPI.generateNow(id);
        showSuccess(`Invoice ${response.data.invoice_number} generated!${response.data.email_sent ? ' Email sent.' : ''}`);
        loadScheduledInvoices();
        loadStats();
      } catch (err) {
        showError(err.response?.data?.error || 'Failed to generate invoice');
      }
    }
  };

  const handleViewLogs = async (schedule) => {
    setLogsLoading(true);
    setShowLogsModal(true);
    try {
      const response = await scheduledInvoiceAPI.getLogs(schedule.id);
      setSelectedLogs(response.data || []);
    } catch (err) {
      setSelectedLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleEdit = async (schedule) => {
    try {
      const response = await scheduledInvoiceAPI.getById(schedule.id);
      const data = response.data;
      setFormData({
        name: data.name || '',
        client: data.client || '',
        invoice_type: data.invoice_type || 'proforma',
        frequency: data.frequency || 'monthly',
        day_of_month: data.day_of_month || 1,
        day_of_week: data.day_of_week,
        month_of_year: data.month_of_year,
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        max_occurrences: data.max_occurrences || '',
        payment_term: data.payment_term || '',
        notes: data.notes || '',
        auto_send_email: data.auto_send_email !== false,
        email_subject: data.email_subject || '',
        email_body: data.email_body || '',
        items: data.items?.length > 0 ? data.items : [{ description: '', hsn_sac: '', gst_rate: 18, taxable_amount: 0, total_amount: 0 }]
      });
      setEditingSchedule(data);
      setShowForm(true);
    } catch (err) {
      showError('Failed to load schedule details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.client || !formData.start_date) {
      showError('Please fill in all required fields');
      return;
    }

    if (formData.items.length === 0 || !formData.items[0].description) {
      showError('Please add at least one line item');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        max_occurrences: formData.max_occurrences || null,
        end_date: formData.end_date || null,
        payment_term: formData.payment_term || null,
        day_of_week: formData.frequency === 'weekly' ? formData.day_of_week : null,
        month_of_year: formData.frequency === 'yearly' ? formData.month_of_year : null,
      };

      if (editingSchedule) {
        await scheduledInvoiceAPI.update(editingSchedule.id, submitData);
        showSuccess('Schedule updated successfully');
      } else {
        await scheduledInvoiceAPI.create(submitData);
        showSuccess('Schedule created successfully');
      }

      setShowForm(false);
      setEditingSchedule(null);
      resetForm();
      loadScheduledInvoices();
      loadStats();
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to save scheduled invoice');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      client: '',
      invoice_type: 'proforma',
      frequency: 'monthly',
      day_of_month: 1,
      day_of_week: null,
      month_of_year: null,
      start_date: '',
      end_date: '',
      max_occurrences: '',
      payment_term: '',
      notes: '',
      auto_send_email: true,
      email_subject: '',
      email_body: '',
      items: [{ description: '', hsn_sac: '', gst_rate: 18, taxable_amount: 0, total_amount: 0 }]
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', hsn_sac: '', gst_rate: 18, taxable_amount: 0, total_amount: 0 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (field === 'taxable_amount' || field === 'gst_rate') {
      const taxableAmount = parseFloat(newItems[index].taxable_amount) || 0;
      const gstRate = parseFloat(newItems[index].gst_rate) || 0;
      newItems[index].total_amount = taxableAmount + (taxableAmount * gstRate / 100);
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleServiceSelect = (index, serviceId) => {
    const service = serviceItems.find(s => s.id.toString() === serviceId);
    if (service) {
      const newItems = [...formData.items];
      newItems[index] = {
        ...newItems[index],
        description: service.name,
        hsn_sac: service.sac_code || '',
        gst_rate: service.gst_rate || 18
      };
      setFormData({ ...formData, items: newItems });
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getFrequencyLabel = (frequency, day_of_month, day_of_week) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    switch (frequency) {
      case 'daily': return 'Daily';
      case 'weekly': return `Weekly (${days[day_of_week] || 'Mon'})`;
      case 'monthly': return `Monthly (Day ${day_of_month})`;
      case 'quarterly': return `Quarterly (Day ${day_of_month})`;
      case 'yearly': return `Yearly (Day ${day_of_month})`;
      default: return frequency;
    }
  };

  // If form is shown, render the form page
  if (showForm) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-main-title">{editingSchedule ? 'Edit Scheduled Invoice' : 'Create Scheduled Invoice'}</h1>
            <p className="page-description">Configure recurring invoice settings</p>
          </div>
          <div className="page-header-right">
            <button className="btn-secondary" onClick={() => { setShowForm(false); setEditingSchedule(null); resetForm(); }}>
              <span className="btn-icon">←</span>
              Back to List
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="content-card">
            <div className="form-section">
              <h3 className="form-section-title">Basic Information</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Schedule Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Monthly Retainer - ABC Corp"
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Client *</label>
                  <select
                    className="form-input"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    required
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Invoice Type</label>
                  <select
                    className="form-input"
                    value={formData.invoice_type}
                    onChange={(e) => setFormData({ ...formData, invoice_type: e.target.value })}
                  >
                    <option value="proforma">Proforma Invoice</option>
                    <option value="tax">Tax Invoice</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Payment Term</label>
                  <select
                    className="form-input"
                    value={formData.payment_term}
                    onChange={(e) => setFormData({ ...formData, payment_term: e.target.value })}
                  >
                    <option value="">-- Select Payment Term --</option>
                    {paymentTerms.map((term) => (
                      <option key={term.id} value={term.id}>{term.term_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Recurrence Settings */}
          <div className="content-card">
            <div className="form-section">
              <h3 className="form-section-title">Recurrence Settings</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Frequency *</label>
                  <select
                    className="form-input"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                {formData.frequency === 'weekly' && (
                  <div className="form-field">
                    <label>Day of Week</label>
                    <select
                      className="form-input"
                      value={formData.day_of_week || 0}
                      onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                    >
                      <option value={0}>Monday</option>
                      <option value={1}>Tuesday</option>
                      <option value={2}>Wednesday</option>
                      <option value={3}>Thursday</option>
                      <option value={4}>Friday</option>
                      <option value={5}>Saturday</option>
                      <option value={6}>Sunday</option>
                    </select>
                  </div>
                )}

                {['monthly', 'quarterly', 'yearly'].includes(formData.frequency) && (
                  <div className="form-field">
                    <label>Day of Month (1-28)</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      max="28"
                      value={formData.day_of_month}
                      onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                )}

                {formData.frequency === 'yearly' && (
                  <div className="form-field">
                    <label>Month</label>
                    <select
                      className="form-input"
                      value={formData.month_of_year || 1}
                      onChange={(e) => setFormData({ ...formData, month_of_year: parseInt(e.target.value) })}
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'].map((month, i) => (
                        <option key={i} value={i + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-field">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>End Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Max Occurrences (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    value={formData.max_occurrences}
                    onChange={(e) => setFormData({ ...formData, max_occurrences: e.target.value })}
                    placeholder="Leave blank for unlimited"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="content-card">
            <div className="form-section">
              <h3 className="form-section-title">Line Items</h3>
              <div className="invoice-items-table">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white' }}>
                      <th style={{ padding: '12px', textAlign: 'left', width: '150px' }}>Service</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Description *</th>
                      <th style={{ padding: '12px', textAlign: 'left', width: '100px' }}>HSN/SAC</th>
                      <th style={{ padding: '12px', textAlign: 'right', width: '120px' }}>Taxable Amt</th>
                      <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>GST %</th>
                      <th style={{ padding: '12px', textAlign: 'right', width: '120px' }}>Total</th>
                      <th style={{ padding: '12px', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '8px' }}>
                          <select
                            className="form-input"
                            onChange={(e) => handleServiceSelect(index, e.target.value)}
                            style={{ fontSize: '13px' }}
                          >
                            <option value="">Select</option>
                            {serviceItems.map((service) => (
                              <option key={service.id} value={service.id}>{service.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            required
                            style={{ fontSize: '13px' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={item.hsn_sac}
                            onChange={(e) => updateItem(index, 'hsn_sac', e.target.value)}
                            style={{ fontSize: '13px' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="number"
                            className="form-input"
                            value={item.taxable_amount}
                            onChange={(e) => updateItem(index, 'taxable_amount', parseFloat(e.target.value) || 0)}
                            style={{ fontSize: '13px', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="number"
                            className="form-input"
                            value={item.gst_rate}
                            onChange={(e) => updateItem(index, 'gst_rate', parseFloat(e.target.value) || 0)}
                            style={{ fontSize: '13px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#6366f1' }}>
                          {formatCurrency(item.total_amount)}
                        </td>
                        <td style={{ padding: '8px' }}>
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f9fafb' }}>
                      <td colSpan="5" style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                        Grand Total:
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', fontSize: '16px', color: '#6366f1' }}>
                        {formatCurrency(calculateTotal())}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn-secondary"
                  style={{ marginTop: '12px' }}
                >
                  + Add Line Item
                </button>
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="content-card">
            <div className="form-section">
              <h3 className="form-section-title">Email Settings</h3>
              <div className="form-grid">
                <div className="form-field full-width">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.auto_send_email}
                      onChange={(e) => setFormData({ ...formData, auto_send_email: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>Automatically email invoice to client after generation</span>
                  </label>
                </div>
                {formData.auto_send_email && (
                  <>
                    <div className="form-field full-width">
                      <label>Custom Email Subject (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.email_subject}
                        onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
                        placeholder="Leave blank for default subject"
                      />
                    </div>
                    <div className="form-field full-width">
                      <label>Custom Email Body (Optional)</label>
                      <textarea
                        className="form-input"
                        value={formData.email_body}
                        onChange={(e) => setFormData({ ...formData, email_body: e.target.value })}
                        rows="4"
                        placeholder="Leave blank for default body. Use {invoice_number}, {client_name}, {total_amount}, {invoice_date}"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="content-card">
            <div className="form-section">
              <h3 className="form-section-title">Additional Notes</h3>
              <div className="form-field full-width">
                <label>Notes (included in invoice)</label>
                <textarea
                  className="form-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  placeholder="Any additional notes to include in the invoice..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setShowForm(false); setEditingSchedule(null); resetForm(); }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-create" disabled={loading}>
              <span className="btn-icon">{loading ? '⏳' : '💾'}</span>
              {loading ? 'Saving...' : (editingSchedule ? 'Update Schedule' : 'Create Schedule')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // List View
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Scheduled Invoices</h1>
          <p className="page-description">Manage recurring invoice schedules</p>
        </div>
        <div className="page-header-right">
          {onBack && (
            <button className="btn-secondary" onClick={onBack}>
              <span className="btn-icon">←</span>
              Back to Invoices
            </button>
          )}
          <button className="btn-create" onClick={() => { resetForm(); setEditingSchedule(null); setShowForm(true); }}>
            <span className="btn-icon">+</span>
            New Schedule
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-container" style={{ marginBottom: '24px' }}>
          <div className="stat-card purple">
            <div className="stat-header">
              <div className="stat-icon-wrapper purple-bg">
                <span className="stat-icon-lg">📅</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Total Schedules</h3>
              <p className="stat-value">{stats.total || 0}</p>
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-header">
              <div className="stat-icon-wrapper green-bg">
                <span className="stat-icon-lg">✓</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Active</h3>
              <p className="stat-value">{stats.active || 0}</p>
            </div>
          </div>
          <div className="stat-card orange">
            <div className="stat-header">
              <div className="stat-icon-wrapper orange-bg">
                <span className="stat-icon-lg">⏸</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Paused</h3>
              <p className="stat-value">{stats.paused || 0}</p>
            </div>
          </div>
          <div className="stat-card blue">
            <div className="stat-header">
              <div className="stat-icon-wrapper blue-bg">
                <span className="stat-icon-lg">📄</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Invoices Generated</h3>
              <p className="stat-value">{stats.total_generated || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="content-card">
        <div className="filters-section" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && loadScheduledInvoices()}
            />
          </div>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn-secondary" onClick={loadScheduledInvoices}>
            <span className="btn-icon">🔍</span>
            Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="content-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading...</p>
          </div>
        ) : scheduledInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <span style={{ fontSize: '64px' }}>📅</span>
            <h3 style={{ marginTop: '16px', color: '#6366f1' }}>No Scheduled Invoices</h3>
            <p style={{ color: '#6b7280' }}>Create your first scheduled invoice to automate recurring billing.</p>
            <button className="btn-create" style={{ marginTop: '16px' }} onClick={() => { resetForm(); setShowForm(true); }}>
              + Create Schedule
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Client</th>
                  <th>Frequency</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Generated</th>
                  <th>Next Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledInvoices.map((schedule) => (
                  <tr key={schedule.id}>
                    <td><strong>{schedule.name}</strong></td>
                    <td>{schedule.client_name}</td>
                    <td>{getFrequencyLabel(schedule.frequency, schedule.day_of_month, schedule.day_of_week)}</td>
                    <td>
                      <span className={`status-badge ${schedule.invoice_type === 'tax' ? 'status-paid' : 'status-sent'}`}>
                        {schedule.invoice_type === 'tax' ? 'Tax' : 'Proforma'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600' }}>{formatCurrency(schedule.total_amount)}</td>
                    <td>
                      <span className={`status-badge ${
                        schedule.status === 'active' ? 'status-paid' :
                        schedule.status === 'paused' ? 'status-pending' :
                        schedule.status === 'completed' ? 'status-sent' :
                        'status-cancelled'
                      }`}>
                        {schedule.status}
                      </span>
                    </td>
                    <td>{schedule.occurrences_generated || 0}</td>
                    <td>{formatDate(schedule.next_generation_date)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {schedule.status === 'active' && (
                          <>
                            <button
                              className="btn-action btn-warning"
                              onClick={() => handlePause(schedule.id)}
                              title="Pause"
                            >
                              ⏸
                            </button>
                            <button
                              className="btn-action btn-success"
                              onClick={() => handleGenerateNow(schedule.id)}
                              title="Generate Now"
                            >
                              ▶
                            </button>
                          </>
                        )}
                        {schedule.status === 'paused' && (
                          <button
                            className="btn-action btn-success"
                            onClick={() => handleResume(schedule.id)}
                            title="Resume"
                          >
                            ▶
                          </button>
                        )}
                        <button
                          className="btn-action btn-info"
                          onClick={() => handleViewLogs(schedule)}
                          title="View Logs"
                        >
                          📋
                        </button>
                        {['active', 'paused'].includes(schedule.status) && (
                          <>
                            <button
                              className="btn-action btn-secondary"
                              onClick={() => handleEdit(schedule)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-action btn-danger"
                              onClick={() => handleCancel(schedule.id)}
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </>
                        )}
                        {['completed', 'cancelled'].includes(schedule.status) && (
                          <button
                            className="btn-action btn-danger"
                            onClick={() => handleDelete(schedule.id)}
                            title="Delete"
                          >
                            🗑
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

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="modal-overlay" onClick={() => setShowLogsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Generation Logs</h2>
              <button className="modal-close" onClick={() => setShowLogsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {logsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
              ) : selectedLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <span style={{ fontSize: '48px' }}>📋</span>
                  <p style={{ marginTop: '16px' }}>No generation logs yet.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Invoice #</th>
                      <th>Email Sent</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLogs.map((log, index) => (
                      <tr key={index}>
                        <td>{formatDate(log.generation_date)}</td>
                        <td>
                          <span className={`status-badge ${
                            log.status === 'success' ? 'status-paid' :
                            log.status === 'email_failed' ? 'status-pending' :
                            'status-cancelled'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td>{log.invoice_number || '-'}</td>
                        <td>{log.email_sent ? '✓ Yes' : '✕ No'}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.error_message || log.email_error || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduledInvoices;
