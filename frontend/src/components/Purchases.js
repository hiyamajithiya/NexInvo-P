import React, { useState, useEffect, useCallback } from 'react';
import { purchaseAPI, supplierAPI, productAPI, supplierPaymentAPI } from '../services/api';
import { useToast } from './Toast';
import { formatDate } from '../utils/dateFormat';
import './Pages.css';

function Purchases() {
  const { showSuccess } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [error, setError] = useState('');

  const [currentPurchase, setCurrentPurchase] = useState({
    supplier: '',
    purchase_number: '',
    supplier_invoice_number: '',
    supplier_invoice_date: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
    is_interstate: false,
    other_charges: 0,
    discount_amount: 0,
    items: []
  });

  const [currentPayment, setCurrentPayment] = useState({
    purchase: null,
    supplier: null,
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  const emptyItem = {
    product: '',
    description: '',
    hsn_code: '',
    quantity: 1,
    unit_name: 'pcs',
    rate: 0,
    gst_rate: 18
  };

  useEffect(() => {
    loadPurchases();
    loadSuppliers();
    loadProducts();
  }, []);

  const loadPurchases = async () => {
    try {
      const response = await purchaseAPI.getAll();
      setPurchases(response.data.results || response.data || []);
    } catch (err) {
      // Error handled silently
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await supplierAPI.getAll();
      setSuppliers(response.data.results || response.data || []);
    } catch (err) {
      // Error handled silently
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productAPI.getAll();
      setProducts(response.data.results || response.data || []);
    } catch (err) {
      // Error handled silently
    }
  };

  const generatePurchaseNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PUR${year}${month}${random}`;
  };

  const handleAddPurchase = () => {
    setCurrentPurchase({
      supplier: '',
      purchase_number: generatePurchaseNumber(),
      supplier_invoice_number: '',
      supplier_invoice_date: '',
      purchase_date: new Date().toISOString().split('T')[0],
      notes: '',
      is_interstate: false,
      other_charges: 0,
      discount_amount: 0,
      items: [{ ...emptyItem }]
    });
    setShowForm(true);
    setError('');
  };

  const handleEditPurchase = async (purchase) => {
    try {
      const response = await purchaseAPI.getById(purchase.id);
      const purchaseData = response.data;
      setCurrentPurchase({
        ...purchaseData,
        supplier: purchaseData.supplier?.id || purchaseData.supplier,
        purchase_date: purchaseData.purchase_date || '',
        supplier_invoice_date: purchaseData.supplier_invoice_date || '',
        items: purchaseData.items?.map(item => ({
          ...item,
          product: item.product?.id || item.product || ''
        })) || [{ ...emptyItem }]
      });
      setShowForm(true);
      setError('');
    } catch (err) {
      setError('Failed to load purchase details');
    }
  };

  const handleDeletePurchase = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      try {
        await purchaseAPI.delete(id);
        showSuccess('Purchase deleted successfully!');
        loadPurchases();
      } catch (err) {
        setError('Failed to delete purchase');
      }
    }
  };

  const handlePurchaseChange = (field, value) => {
    setCurrentPurchase({ ...currentPurchase, [field]: value });
  };

  const handleItemChange = useCallback((index, field, value) => {
    setCurrentPurchase(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // If product is selected, fill in details
      if (field === 'product' && value) {
        const selectedProduct = products.find(p => p.id === parseInt(value));
        if (selectedProduct) {
          newItems[index] = {
            ...newItems[index],
            description: selectedProduct.name,
            hsn_code: selectedProduct.hsn_code || '',
            unit_name: selectedProduct.unit_name || 'pcs',
            rate: selectedProduct.purchase_price || 0,
            gst_rate: selectedProduct.gst_rate || 18
          };
        }
      }

      return { ...prev, items: newItems };
    });
  }, [products]);

  const handleAddItem = () => {
    setCurrentPurchase(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }]
    }));
  };

  const handleRemoveItem = (index) => {
    if (currentPurchase.items.length > 1) {
      setCurrentPurchase(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateItemTotals = (item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const gstRate = parseFloat(item.gst_rate) || 0;

    const taxableAmount = quantity * rate;
    const gstAmount = (taxableAmount * gstRate) / 100;
    const totalAmount = taxableAmount + gstAmount;

    return { taxableAmount, gstAmount, totalAmount };
  };

  const calculateTotals = useCallback(() => {
    let subtotal = 0;
    let totalGst = 0;

    currentPurchase.items.forEach(item => {
      const { taxableAmount, gstAmount } = calculateItemTotals(item);
      subtotal += taxableAmount;
      totalGst += gstAmount;
    });

    const otherCharges = parseFloat(currentPurchase.other_charges) || 0;
    const discount = parseFloat(currentPurchase.discount_amount) || 0;
    const total = subtotal + totalGst + otherCharges - discount;

    return {
      subtotal: subtotal.toFixed(2),
      totalGst: totalGst.toFixed(2),
      cgst: currentPurchase.is_interstate ? '0.00' : (totalGst / 2).toFixed(2),
      sgst: currentPurchase.is_interstate ? '0.00' : (totalGst / 2).toFixed(2),
      igst: currentPurchase.is_interstate ? totalGst.toFixed(2) : '0.00',
      otherCharges: otherCharges.toFixed(2),
      discount: discount.toFixed(2),
      total: total.toFixed(2)
    };
  }, [currentPurchase]);

  const handleSavePurchase = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!currentPurchase.supplier) {
      setError('Please select a supplier');
      setLoading(false);
      return;
    }

    if (!currentPurchase.purchase_date) {
      setError('Please select a purchase date');
      setLoading(false);
      return;
    }

    if (currentPurchase.items.length === 0 || !currentPurchase.items[0].description) {
      setError('Please add at least one item');
      setLoading(false);
      return;
    }

    try {
      const totals = calculateTotals();

      const purchaseData = {
        supplier: parseInt(currentPurchase.supplier),
        purchase_number: currentPurchase.purchase_number,
        supplier_invoice_number: currentPurchase.supplier_invoice_number,
        supplier_invoice_date: currentPurchase.supplier_invoice_date || null,
        purchase_date: currentPurchase.purchase_date,
        notes: currentPurchase.notes,
        is_interstate: currentPurchase.is_interstate,
        other_charges: parseFloat(currentPurchase.other_charges) || 0,
        discount_amount: parseFloat(currentPurchase.discount_amount) || 0,
        subtotal: parseFloat(totals.subtotal),
        tax_amount: parseFloat(totals.totalGst),
        cgst_amount: parseFloat(totals.cgst),
        sgst_amount: parseFloat(totals.sgst),
        igst_amount: parseFloat(totals.igst),
        total_amount: parseFloat(totals.total),
        items: currentPurchase.items.map(item => {
          const itemTotals = calculateItemTotals(item);
          return {
            product: item.product ? parseInt(item.product) : null,
            description: item.description,
            hsn_code: item.hsn_code || '',
            quantity: parseFloat(item.quantity) || 1,
            unit_name: item.unit_name || 'pcs',
            rate: parseFloat(item.rate) || 0,
            gst_rate: parseFloat(item.gst_rate) || 18,
            taxable_amount: itemTotals.taxableAmount,
            cgst_amount: currentPurchase.is_interstate ? 0 : itemTotals.gstAmount / 2,
            sgst_amount: currentPurchase.is_interstate ? 0 : itemTotals.gstAmount / 2,
            igst_amount: currentPurchase.is_interstate ? itemTotals.gstAmount : 0,
            total_amount: itemTotals.totalAmount
          };
        })
      };

      if (currentPurchase.id) {
        await purchaseAPI.update(currentPurchase.id, purchaseData);
      } else {
        await purchaseAPI.create(purchaseData);
      }

      showSuccess('Purchase saved successfully!');
      setShowForm(false);
      loadPurchases();
    } catch (err) {
      const errorMsg = err.response?.data?.error ||
                      err.response?.data?.detail ||
                      Object.values(err.response?.data || {}).flat().join(', ') ||
                      'Failed to save purchase';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const handleRecordPayment = (purchase) => {
    setCurrentPayment({
      purchase: purchase.id,
      supplier: purchase.supplier?.id || purchase.supplier,
      amount: parseFloat(purchase.total_amount) - parseFloat(purchase.amount_paid || 0),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      reference_number: '',
      notes: ''
    });
    setShowPaymentForm(true);
    setError('');
  };

  const handleSavePayment = async () => {
    setLoading(true);
    setError('');

    if (!currentPayment.amount || currentPayment.amount <= 0) {
      setError('Please enter a valid payment amount');
      setLoading(false);
      return;
    }

    try {
      await supplierPaymentAPI.create({
        purchase: currentPayment.purchase,
        supplier: currentPayment.supplier,
        amount: parseFloat(currentPayment.amount),
        payment_date: currentPayment.payment_date,
        payment_method: currentPayment.payment_method,
        reference_number: currentPayment.reference_number,
        notes: currentPayment.notes
      });

      showSuccess('Payment recorded successfully!');
      setShowPaymentForm(false);
      loadPurchases();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.purchase_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.supplier_invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
                         purchase.status === statusFilter;

    const matchesPayment = paymentFilter === 'all' ||
                          purchase.payment_status === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      paid: { bg: '#dcfce7', color: '#16a34a', label: 'Paid' },
      partial: { bg: '#fef3c7', color: '#d97706', label: 'Partial' },
      unpaid: { bg: '#fee2e2', color: '#dc2626', label: 'Unpaid' }
    };
    const config = statusConfig[status] || statusConfig.unpaid;
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        background: config.bg,
        color: config.color,
        textTransform: 'uppercase'
      }}>
        {config.label}
      </span>
    );
  };

  const totals = calculateTotals();

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Purchases</h1>
          <p className="page-description">Record and manage supplier purchases</p>
        </div>
        <div className="page-header-right">
          <button className="btn-create" onClick={handleAddPurchase}>
            <span className="btn-icon">➕</span>
            New Purchase
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Record Payment</h2>
              <button className="btn-close" onClick={() => setShowPaymentForm(false)}>x</button>
            </div>

            <div className="modal-body">
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="form-field">
                  <label>Amount *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={currentPayment.amount}
                    onChange={(e) => setCurrentPayment({ ...currentPayment, amount: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-field">
                  <label>Payment Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={currentPayment.payment_date}
                    onChange={(e) => setCurrentPayment({ ...currentPayment, payment_date: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Payment Method</label>
                  <select
                    className="form-input"
                    value={currentPayment.payment_method}
                    onChange={(e) => setCurrentPayment({ ...currentPayment, payment_method: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Reference Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={currentPayment.reference_number}
                    onChange={(e) => setCurrentPayment({ ...currentPayment, reference_number: e.target.value })}
                    placeholder="Cheque no, UTR, etc."
                  />
                </div>

                <div className="form-field">
                  <label>Notes</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={currentPayment.notes}
                    onChange={(e) => setCurrentPayment({ ...currentPayment, notes: e.target.value })}
                    placeholder="Payment notes"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-create"
                onClick={handleSavePayment}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Payment'}
              </button>
              <button className="btn-secondary" onClick={() => setShowPaymentForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Form */}
      {showForm && (
        <div className="content-card" style={{ marginBottom: '24px' }}>
          <div className="invoice-form-container">
            <div className="form-section">
              <h3 className="form-section-title">
                {currentPurchase.id ? 'Edit Purchase' : 'New Purchase Entry'}
              </h3>

              <div className="form-grid">
                <div className="form-field">
                  <label>Supplier *</label>
                  <select
                    className="form-input"
                    value={currentPurchase.supplier}
                    onChange={(e) => handlePurchaseChange('supplier', e.target.value)}
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} {supplier.gstin ? `(${supplier.gstin})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Purchase Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={currentPurchase.purchase_number}
                    onChange={(e) => handlePurchaseChange('purchase_number', e.target.value)}
                    placeholder="Auto-generated"
                  />
                </div>

                <div className="form-field">
                  <label>Purchase Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={currentPurchase.purchase_date}
                    onChange={(e) => handlePurchaseChange('purchase_date', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Supplier Invoice Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={currentPurchase.supplier_invoice_number}
                    onChange={(e) => handlePurchaseChange('supplier_invoice_number', e.target.value)}
                    placeholder="Supplier's bill/invoice number"
                  />
                </div>

                <div className="form-field">
                  <label>Supplier Invoice Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={currentPurchase.supplier_invoice_date}
                    onChange={(e) => handlePurchaseChange('supplier_invoice_date', e.target.value)}
                  />
                </div>

                <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '24px' }}>
                  <input
                    type="checkbox"
                    id="is_interstate"
                    checked={currentPurchase.is_interstate}
                    onChange={(e) => handlePurchaseChange('is_interstate', e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="is_interstate" style={{ margin: 0, cursor: 'pointer' }}>
                    Interstate Purchase (IGST)
                  </label>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="form-section">
              <div className="form-section-header">
                <h3 className="form-section-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                  Purchase Items
                </h3>
                <button className="btn-add-item" onClick={handleAddItem}>
                  <span className="btn-icon">➕</span>
                  Add Row
                </button>
              </div>

              <div className="invoice-items-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>#</th>
                      <th style={{ width: '15%' }}>Product</th>
                      <th style={{ width: '20%' }}>Description</th>
                      <th style={{ width: '10%' }}>HSN</th>
                      <th style={{ width: '8%' }}>Qty</th>
                      <th style={{ width: '6%' }}>Unit</th>
                      <th style={{ width: '10%' }}>Rate</th>
                      <th style={{ width: '8%' }}>GST %</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>Amount</th>
                      <th style={{ width: '6%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPurchase.items.map((item, index) => {
                      const itemTotals = calculateItemTotals(item);
                      return (
                        <tr key={index}>
                          <td className="text-center">{index + 1}</td>
                          <td>
                            <select
                              className="table-input"
                              value={item.product}
                              onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                            >
                              <option value="">-- Select --</option>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="table-input"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              placeholder="Item description"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="table-input"
                              value={item.hsn_code}
                              onChange={(e) => handleItemChange(index, 'hsn_code', e.target.value)}
                              placeholder="HSN"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="table-input"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="table-input"
                              value={item.unit_name}
                              onChange={(e) => handleItemChange(index, 'unit_name', e.target.value)}
                              placeholder="pcs"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="table-input"
                              value={item.rate}
                              onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td>
                            <select
                              className="table-input"
                              value={item.gst_rate}
                              onChange={(e) => handleItemChange(index, 'gst_rate', e.target.value)}
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="text-right">
                            {itemTotals.totalAmount.toFixed(2)}
                          </td>
                          <td className="text-center">
                            <button
                              className="btn-delete-item"
                              onClick={() => handleRemoveItem(index)}
                              disabled={currentPurchase.items.length === 1}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="invoice-totals">
                <div className="totals-row">
                  <span className="totals-label">Subtotal</span>
                  <span className="totals-value">{totals.subtotal}</span>
                </div>
                {!currentPurchase.is_interstate && (
                  <>
                    <div className="totals-row">
                      <span className="totals-label">CGST</span>
                      <span className="totals-value">{totals.cgst}</span>
                    </div>
                    <div className="totals-row">
                      <span className="totals-label">SGST</span>
                      <span className="totals-value">{totals.sgst}</span>
                    </div>
                  </>
                )}
                {currentPurchase.is_interstate && (
                  <div className="totals-row">
                    <span className="totals-label">IGST</span>
                    <span className="totals-value">{totals.igst}</span>
                  </div>
                )}
                <div className="totals-row">
                  <span className="totals-label">Other Charges</span>
                  <input
                    type="number"
                    className="table-input"
                    style={{ width: '100px', textAlign: 'right' }}
                    value={currentPurchase.other_charges}
                    onChange={(e) => handlePurchaseChange('other_charges', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="totals-row">
                  <span className="totals-label">Discount</span>
                  <input
                    type="number"
                    className="table-input"
                    style={{ width: '100px', textAlign: 'right' }}
                    value={currentPurchase.discount_amount}
                    onChange={(e) => handlePurchaseChange('discount_amount', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="totals-row total">
                  <span className="totals-label">Total</span>
                  <span className="totals-value">{totals.total}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="form-section">
              <div className="form-field full-width">
                <label>Notes</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={currentPurchase.notes}
                  onChange={(e) => handlePurchaseChange('notes', e.target.value)}
                  placeholder="Additional notes for this purchase"
                ></textarea>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-create" onClick={handleSavePurchase} disabled={loading}>
                <span className="btn-icon">💾</span>
                {loading ? 'Saving...' : 'Save Purchase'}
              </button>
              <button className="btn-secondary" onClick={handleCancelForm} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchases List */}
      {!showForm && (
        <>
          <div className="filters-section">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search purchases..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group" style={{ flex: '0 0 150px' }}>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="filter-group" style={{ flex: '0 0 150px' }}>
              <select
                className="filter-select"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="all">All Payments</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div className="content-card">
            {filteredPurchases.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">📦</div>
                <h3 className="empty-title">No Purchases Yet</h3>
                <p className="empty-description">Record your first purchase to start tracking expenses</p>
                <button className="btn-create" onClick={handleAddPurchase}>
                  <span className="btn-icon">➕</span>
                  Record First Purchase
                </button>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Purchase No.</th>
                      <th>Date</th>
                      <th>Supplier</th>
                      <th>Supplier Invoice</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'center' }}>Payment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td>
                          <strong>{purchase.purchase_number}</strong>
                        </td>
                        <td>{formatDate(purchase.purchase_date)}</td>
                        <td>{purchase.supplier_name || '-'}</td>
                        <td>
                          {purchase.supplier_invoice_number || '-'}
                          {purchase.supplier_invoice_date && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {formatDate(purchase.supplier_invoice_date)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong>{parseFloat(purchase.total_amount).toFixed(2)}</strong>
                          {parseFloat(purchase.amount_paid) > 0 && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              Paid: {parseFloat(purchase.amount_paid).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {getPaymentStatusBadge(purchase.payment_status)}
                        </td>
                        <td>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleEditPurchase(purchase)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          {purchase.payment_status !== 'paid' && (
                            <button
                              className="btn-icon-small"
                              onClick={() => handleRecordPayment(purchase)}
                              title="Record Payment"
                              style={{ background: '#dcfce7' }}
                            >
                              💰
                            </button>
                          )}
                          <button
                            className="btn-icon-small"
                            onClick={() => handleDeletePurchase(purchase.id)}
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

export default Purchases;
