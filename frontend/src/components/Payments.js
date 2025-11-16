import React, { useState, useEffect } from 'react';
import { invoiceAPI, clientAPI, paymentAPI } from '../services/api';
import './Pages.css';

function Payments() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  const [currentPayment, setCurrentPayment] = useState({
    invoice: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [paymentsResponse, invoicesResponse, clientsResponse] = await Promise.all([
        paymentAPI.getAll(),
        invoiceAPI.getAll(),
        clientAPI.getAll()
      ]);
      setPayments(paymentsResponse.data.results || paymentsResponse.data || []);
      setInvoices(invoicesResponse.data.results || invoicesResponse.data || []);
      setClients(clientsResponse.data.results || clientsResponse.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleRecordPayment = () => {
    setCurrentPayment({
      invoice: '',
      payment_date: new Date().toISOString().split('T')[0],
      amount: 0,
      payment_method: 'bank_transfer',
      reference_number: '',
      notes: ''
    });
    setShowForm(true);
    setError('');
  };

  const handlePaymentChange = (field, value) => {
    const updatedPayment = { ...currentPayment, [field]: value };

    // When invoice is selected, auto-fill amount
    if (field === 'invoice' && value) {
      const selectedInvoice = invoices.find(inv => inv.id === parseInt(value));
      if (selectedInvoice) {
        updatedPayment.amount = parseFloat(selectedInvoice.total_amount) || 0;
      }
    }

    setCurrentPayment(updatedPayment);
  };

  const handleSavePayment = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!currentPayment.invoice) {
      setError('Please select an invoice');
      setLoading(false);
      return;
    }

    if (!currentPayment.amount || currentPayment.amount <= 0) {
      setError('Please enter a valid payment amount');
      setLoading(false);
      return;
    }

    try {
      if (currentPayment.id) {
        await paymentAPI.update(currentPayment.id, currentPayment);
      } else {
        await paymentAPI.create(currentPayment);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const handleEditPayment = (payment) => {
    setCurrentPayment(payment);
    setShowForm(true);
    setError('');
  };

  const handleDeletePayment = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        await paymentAPI.delete(id);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        loadData();
      } catch (err) {
        setError('Failed to delete payment');
      }
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMode = modeFilter === 'all' || payment.payment_method === modeFilter;

    const matchesDate = !dateFilter || payment.payment_date === dateFilter;

    return matchesSearch && matchesMode && matchesDate;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Payments</h1>
          <p className="page-description">Track and manage payment records</p>
        </div>
        <div className="page-header-right">
          <button className="btn-create" onClick={handleRecordPayment}>
            <span className="btn-icon">➕</span>
            Record Payment
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="success-message">
          ✅ Payment recorded successfully!
        </div>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Record Payment Form */}
      {showForm && (
        <div className="content-card" style={{marginBottom: '24px'}}>
          <div className="form-section">
            <h3 className="form-section-title">Record Payment</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Select Invoice *</label>
                <select
                  className="form-input"
                  value={currentPayment.invoice}
                  onChange={(e) => handlePaymentChange('invoice', e.target.value)}
                >
                  <option value="">-- Select Invoice --</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - ₹{parseFloat(invoice.total_amount || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Payment Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={currentPayment.payment_date}
                  onChange={(e) => handlePaymentChange('payment_date', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Payment Method *</label>
                <select
                  className="form-input"
                  value={currentPayment.payment_method}
                  onChange={(e) => handlePaymentChange('payment_method', e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="card">Credit/Debit Card</option>
                </select>
              </div>
              <div className="form-field">
                <label>Amount *</label>
                <input
                  type="number"
                  className="form-input"
                  value={currentPayment.amount}
                  onChange={(e) => handlePaymentChange('amount', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-field">
                <label>Reference Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentPayment.reference_number || ''}
                  onChange={(e) => handlePaymentChange('reference_number', e.target.value)}
                  placeholder="Transaction/Cheque No."
                />
              </div>
              <div className="form-field full-width">
                <label>Notes</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={currentPayment.notes}
                  onChange={(e) => handlePaymentChange('notes', e.target.value)}
                  placeholder="Any additional notes..."
                ></textarea>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-create" onClick={handleSavePayment} disabled={loading}>
                <span className="btn-icon">💾</span>
                {loading ? 'Saving...' : 'Save Payment'}
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
                placeholder="Search payments..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <select
                className="filter-select"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
              >
                <option value="all">All Payment Modes</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
                <option value="card">Credit/Debit Card</option>
              </select>
            </div>
            <div className="filter-group">
              <input
                type="date"
                className="filter-select"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="content-card">
            {filteredPayments.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">💳</div>
                <h3 className="empty-title">No Payment Records</h3>
                <p className="empty-description">Record your first payment to track transactions</p>
                <button className="btn-create" onClick={handleRecordPayment}>
                  <span className="btn-icon">➕</span>
                  Record Your First Payment
                </button>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Invoice No</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Payment Method</th>
                      <th>Amount</th>
                      <th>Reference</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td><strong>#{payment.id}</strong></td>
                        <td>{payment.invoice_number}</td>
                        <td>{payment.client_name}</td>
                        <td>{new Date(payment.payment_date).toLocaleDateString('en-IN')}</td>
                        <td>
                          <span className="status-badge status-paid">
                            {payment.payment_method?.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td><strong>₹{parseFloat(payment.amount).toFixed(2)}</strong></td>
                        <td>{payment.reference_number || '-'}</td>
                        <td>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleEditPayment(payment)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleDeletePayment(payment.id)}
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

export default Payments;
