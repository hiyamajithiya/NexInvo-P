import React, { useState, useEffect } from 'react';
import { invoiceAPI, clientAPI, settingsAPI, serviceItemAPI, paymentTermAPI } from '../services/api';
import './Pages.css';

function InvoiceForm({ onBack, invoice }) {
  const [invoiceSettings, setInvoiceSettings] = useState({
    defaultGstRate: 18,
    paymentDueDays: 30,
    termsAndConditions: '',
    notes: ''
  });

  const [invoiceData, setInvoiceData] = useState({
    invoiceType: 'tax',
    invoiceDate: new Date().toISOString().split('T')[0],
    client: '',
    paymentTerms: '',
    notes: '',
    items: [
      {
        slNo: 1,
        description: '',
        hsnSac: '',
        gstRate: 18,
        taxableAmount: 0,
        totalAmount: 0
      }
    ]
  });

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Load clients, services, payment terms and settings on component mount
  useEffect(() => {
    loadClients();
    loadServices();
    loadPaymentTerms();
    loadInvoiceSettings();
  }, []);

  // Load invoice data if editing
  useEffect(() => {
    if (invoice) {
      setInvoiceData({
        id: invoice.id,
        invoiceType: invoice.invoice_type,
        invoiceDate: invoice.invoice_date,
        client: invoice.client,
        paymentTerms: invoice.payment_terms || '',
        notes: invoice.notes || '',
        items: invoice.items.map((item, index) => ({
          slNo: index + 1,
          description: item.description,
          hsnSac: item.hsn_sac,
          gstRate: parseFloat(item.gst_rate),
          taxableAmount: parseFloat(item.taxable_amount),
          totalAmount: parseFloat(item.total_amount)
        }))
      });
    }
  }, [invoice]);

  const loadClients = async () => {
    try {
      const response = await clientAPI.getAll();
      setClients(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const loadServices = async () => {
    try {
      const response = await serviceItemAPI.getAll();
      setServices(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading services:', err);
    }
  };

  const loadPaymentTerms = async () => {
    try {
      const response = await paymentTermAPI.getAll();
      setPaymentTerms(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading payment terms:', err);
    }
  };

  const loadInvoiceSettings = async () => {
    try {
      const response = await settingsAPI.getInvoiceSettings();
      if (response.data) {
        setInvoiceSettings(response.data);

        // Apply settings to initial invoice data
        setInvoiceData(prevData => ({
          ...prevData,
          notes: response.data.notes || '',
          items: prevData.items.map(item => ({
            ...item,
            gstRate: response.data.defaultGstRate || 18
          }))
        }));
      }
    } catch (err) {
      console.error('Error loading invoice settings:', err);
    }
  };

  const addItem = () => {
    const newItem = {
      slNo: invoiceData.items.length + 1,
      description: '',
      hsnSac: '',
      gstRate: invoiceSettings.defaultGstRate || 18,
      taxableAmount: 0,
      totalAmount: 0
    };
    setInvoiceData({
      ...invoiceData,
      items: [...invoiceData.items, newItem]
    });
  };

  const removeItem = (index) => {
    const newItems = invoiceData.items.filter((_, i) => i !== index);
    // Renumber items
    newItems.forEach((item, i) => {
      item.slNo = i + 1;
    });
    setInvoiceData({
      ...invoiceData,
      items: newItems
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...invoiceData.items];

    // If service is selected, populate its details
    if (field === 'serviceId') {
      const selectedService = services.find(s => s.id === parseInt(value));
      if (selectedService) {
        newItems[index].description = selectedService.name;
        newItems[index].hsnSac = selectedService.sac_code;
        newItems[index].gstRate = selectedService.gst_rate;
      }
    } else {
      newItems[index][field] = value;
    }

    // Calculate total amount if taxableAmount or gstRate changes
    if (field === 'taxableAmount' || field === 'gstRate' || field === 'serviceId') {
      const item = newItems[index];
      item.totalAmount = item.taxableAmount + (item.taxableAmount * item.gstRate / 100);
    }

    setInvoiceData({
      ...invoiceData,
      items: newItems
    });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;
    let total = 0;

    invoiceData.items.forEach(item => {
      subtotal += item.taxableAmount;
      taxAmount += (item.taxableAmount * item.gstRate / 100);
      total += item.totalAmount;
    });

    return { subtotal, taxAmount, total };
  };

  const handleSaveInvoice = async () => {
    setLoading(true);
    setError('');

    // Validate required fields
    if (!invoiceData.client) {
      setError('Please select a client');
      setLoading(false);
      return;
    }

    const totals = calculateTotals();

    try {
      const payload = {
        invoice_type: invoiceData.invoiceType,
        invoice_date: invoiceData.invoiceDate,
        client: invoiceData.client,
        payment_term: invoiceData.paymentTerms || null,
        notes: invoiceData.notes,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.total,
        items: invoiceData.items.map(item => ({
          description: item.description,
          hsn_sac: item.hsnSac,
          gst_rate: item.gstRate,
          taxable_amount: item.taxableAmount,
          total_amount: item.totalAmount
        }))
      };

      if (invoiceData.id) {
        // Update existing invoice
        await invoiceAPI.update(invoiceData.id, payload);
      } else {
        // Create new invoice
        await invoiceAPI.create(payload);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError(err.response?.data?.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndGeneratePDF = async () => {
    setLoading(true);
    setError('');

    // Validate required fields
    if (!invoiceData.client) {
      setError('Please select a client');
      setLoading(false);
      return;
    }

    const totals = calculateTotals();

    try {
      const payload = {
        invoice_type: invoiceData.invoiceType,
        invoice_date: invoiceData.invoiceDate,
        client: invoiceData.client,
        payment_term: invoiceData.paymentTerms || null,
        notes: invoiceData.notes,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.total,
        items: invoiceData.items.map(item => ({
          description: item.description,
          hsn_sac: item.hsnSac,
          gst_rate: item.gstRate,
          taxable_amount: item.taxableAmount,
          total_amount: item.totalAmount
        }))
      };

      const response = await invoiceAPI.create(payload);
      const invoiceId = response.data.id;

      // Generate PDF
      const pdfResponse = await invoiceAPI.generatePDF(invoiceId);

      // Download PDF
      const url = window.URL.createObjectURL(new Blob([pdfResponse.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSaveSuccess(true);
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError(err.response?.data?.message || 'Failed to save invoice and generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">{invoiceData.id ? 'Edit Invoice' : 'Create New Invoice'}</h1>
          <p className="page-description">Fill in the invoice details</p>
        </div>
        <div className="page-header-right">
          <button className="btn-secondary" onClick={onBack}>
            <span className="btn-icon">←</span>
            Back to Invoices
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="success-message">
          ✅ Invoice saved successfully!
        </div>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="content-card">
        <div className="invoice-form-container">
          {/* Basic Info Section */}
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Invoice Type *</label>
                <select
                  className="form-input"
                  value={invoiceData.invoiceType}
                  onChange={(e) => setInvoiceData({...invoiceData, invoiceType: e.target.value})}
                >
                  <option value="proforma">Proforma Invoice</option>
                  <option value="tax">Tax Invoice</option>
                </select>
              </div>
              <div className="form-field">
                <label>Invoice Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
                />
              </div>
              <div className="form-field full-width">
                <label>Select Client *</label>
                <select
                  className="form-input"
                  value={invoiceData.client}
                  onChange={(e) => setInvoiceData({...invoiceData, client: e.target.value})}
                >
                  <option value="">-- Select Client --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="form-section">
            <div className="form-section-header">
              <h3 className="form-section-title">Line Items</h3>
              <button className="btn-add-item" onClick={addItem}>
                <span className="btn-icon">➕</span>
                Add Item
              </button>
            </div>

            <div className="invoice-items-table">
              <table>
                <thead>
                  <tr>
                    <th style={{width: '50px'}}>Sl No</th>
                    <th style={{width: '35%'}}>Service</th>
                    <th style={{width: '120px'}}>SAC Code</th>
                    <th style={{width: '100px'}}>GST %</th>
                    <th style={{width: '150px'}}>Amount (₹)</th>
                    <th style={{width: '150px', textAlign: 'center'}}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="text-center">{item.slNo}</td>
                      <td>
                        <select
                          className="table-input"
                          onChange={(e) => updateItem(index, 'serviceId', e.target.value)}
                        >
                          <option value="">-- Select Service --</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                        {item.description && (
                          <small style={{display: 'block', marginTop: '4px', color: '#666'}}>
                            {item.description}
                          </small>
                        )}
                      </td>
                      <td className="text-center">
                        {item.hsnSac || '-'}
                      </td>
                      <td className="text-center">
                        {item.gstRate}%
                      </td>
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          value={item.taxableAmount}
                          onChange={(e) => updateItem(index, 'taxableAmount', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="text-right">₹{item.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="form-section">
            <div className="invoice-totals">
              <div className="totals-row">
                <span className="totals-label">Subtotal:</span>
                <span className="totals-value">₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="totals-row">
                <span className="totals-label">GST Amount:</span>
                <span className="totals-value">₹{totals.taxAmount.toFixed(2)}</span>
              </div>
              <div className="totals-row total">
                <span className="totals-label">Total Amount:</span>
                <span className="totals-value">₹{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="form-section">
            <h3 className="form-section-title">Additional Details</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Payment Terms</label>
                <select
                  className="form-input"
                  value={invoiceData.paymentTerms}
                  onChange={(e) => setInvoiceData({...invoiceData, paymentTerms: e.target.value})}
                >
                  <option value="">-- Select Payment Term --</option>
                  {paymentTerms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.term_name} ({term.days} days)
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field full-width">
                <label>Notes</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                  placeholder="Any additional notes..."
                ></textarea>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button className="btn-create" onClick={handleSaveInvoice} disabled={loading}>
              <span className="btn-icon">💾</span>
              {loading ? 'Saving...' : 'Save Invoice'}
            </button>
            <button
              className="btn-create"
              style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}
              onClick={handleSaveAndGeneratePDF}
              disabled={loading}
            >
              <span className="btn-icon">📄</span>
              {loading ? 'Processing...' : 'Save & Generate PDF'}
            </button>
            <button className="btn-secondary" onClick={onBack} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceForm;
