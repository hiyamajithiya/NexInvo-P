import React, { useState, useEffect } from 'react';
import { invoiceAPI, clientAPI, settingsAPI, serviceItemAPI, paymentTermAPI, productAPI } from '../services/api';
import { useToast } from './Toast';
import { useOrganization } from '../contexts/OrganizationContext';
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

function InvoiceForm({ onBack, invoice }) {
  const { showSuccess } = useToast();
  const { currentOrganization } = useOrganization();

  // Determine business type
  const businessType = currentOrganization?.business_type || 'services';
  const isGoodsTrader = businessType === 'goods' || businessType === 'both';
  const isServiceProvider = businessType === 'services' || businessType === 'both';

  const [invoiceSettings, setInvoiceSettings] = useState({
    defaultGstRate: 18,
    paymentDueDays: 30,
    termsAndConditions: '',
    notes: ''
  });

  const [formatSettings, setFormatSettings] = useState({
    show_quantity_column: false,
    show_rate_column: false
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
        quantity: null,
        rate: null,
        gstRate: 18,
        taxableAmount: 0,
        totalAmount: 0
      }
    ]
  });

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create Client Modal State
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState('');
  const [newClient, setNewClient] = useState({
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

  // Create Service Modal State
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    sac_code: '',
    gst_rate: 18.00
  });

  // Create Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    hsn_code: '',
    unit_name: 'Nos',
    gst_rate: 18.00,
    purchase_price: '',
    selling_price: ''
  });

  // Load clients, services, products, payment terms and settings on component mount
  useEffect(() => {
    loadClients();
    if (isServiceProvider) {
      loadServices();
    }
    if (isGoodsTrader) {
      loadProducts();
    }
    loadPaymentTerms();
    loadInvoiceSettings();
    loadFormatSettings();
  }, [isServiceProvider, isGoodsTrader]);

  // Load invoice data if editing - wait for services to be loaded first
  useEffect(() => {
    if (invoice && services.length > 0) {
      setInvoiceData({
        id: invoice.id,
        invoiceType: invoice.invoice_type,
        invoiceDate: invoice.invoice_date,
        client: invoice.client,
        paymentTerms: invoice.payment_terms || '',
        notes: invoice.notes || '',
        items: invoice.items.map((item, index) => {
          // Try to find matching service by description or SAC code
          const matchingService = services.find(
            s => s.name === item.description ||
                 (s.sac_code && s.sac_code === item.hsn_sac)
          );
          return {
            slNo: index + 1,
            description: item.description,
            hsnSac: item.hsn_sac,
            quantity: item.quantity ? parseFloat(item.quantity) : null,
            rate: item.rate ? parseFloat(item.rate) : null,
            gstRate: parseFloat(item.gst_rate),
            taxableAmount: parseFloat(item.taxable_amount),
            totalAmount: parseFloat(item.total_amount),
            serviceId: matchingService ? matchingService.id : ''
          };
        })
      });
    }
  }, [invoice, services]);

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

  const loadProducts = async () => {
    try {
      const response = await productAPI.getAll();
      setProducts(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading products:', err);
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

  const loadFormatSettings = async () => {
    try {
      const response = await settingsAPI.getInvoiceFormatSettings();
      if (response.data) {
        setFormatSettings({
          show_quantity_column: response.data.show_quantity_column || false,
          show_rate_column: response.data.show_rate_column || false
        });
      }
    } catch (err) {
      console.error('Error loading format settings:', err);
    }
  };

  const addItem = () => {
    const newItem = {
      slNo: invoiceData.items.length + 1,
      description: '',
      hsnSac: '',
      quantity: null,
      rate: null,
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
        newItems[index].serviceId = value;
        newItems[index].productId = ''; // Clear product selection
      }
    }
    // If product is selected, populate its details
    else if (field === 'productId') {
      const selectedProduct = products.find(p => p.id === parseInt(value));
      if (selectedProduct) {
        newItems[index].description = selectedProduct.name;
        newItems[index].hsnSac = selectedProduct.hsn_code;
        newItems[index].gstRate = selectedProduct.gst_rate;
        newItems[index].rate = selectedProduct.selling_price;
        newItems[index].quantity = newItems[index].quantity || 1;
        newItems[index].productId = value;
        newItems[index].serviceId = ''; // Clear service selection
        // Calculate taxable amount
        newItems[index].taxableAmount = newItems[index].quantity * selectedProduct.selling_price;
      }
    } else {
      newItems[index][field] = value;
    }

    // Auto-calculate taxable amount when quantity and rate are both provided
    if (field === 'quantity' || field === 'rate') {
      const item = newItems[index];
      if (item.quantity && item.rate) {
        item.taxableAmount = item.quantity * item.rate;
      }
    }

    // Calculate total amount if taxableAmount or gstRate changes
    if (field === 'taxableAmount' || field === 'gstRate' || field === 'serviceId' || field === 'productId' || field === 'quantity' || field === 'rate') {
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

    // Calculate round off (round to nearest rupee)
    const roundedTotal = Math.round(total);
    const roundOff = roundedTotal - total;

    return { subtotal, taxAmount, total, roundOff, roundedTotal };
  };

  // Client Modal Handlers
  const handleOpenClientModal = () => {
    setNewClient({
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
    setClientError('');
    setShowClientModal(true);
  };

  const handleClientChange = (field, value) => {
    let updatedClient = { ...newClient, [field]: value };

    // Auto-fill state code when state is selected
    if (field === 'state') {
      const selectedState = INDIAN_STATES.find(s => s.name === value);
      if (selectedState) {
        updatedClient.stateCode = selectedState.code;
      }
      setClientError('');
    }

    // Validate GSTIN against state code
    if (field === 'gstin') {
      const gstin = value.toUpperCase();
      updatedClient.gstin = gstin;

      if (gstin.length >= 2 && updatedClient.stateCode) {
        const gstinStateCode = gstin.substring(0, 2);
        if (gstinStateCode !== updatedClient.stateCode) {
          setClientError(`GSTIN state code (${gstinStateCode}) does not match selected state code (${updatedClient.stateCode})`);
        } else {
          setClientError('');
        }
      }
    }

    setNewClient(updatedClient);
  };

  const handleSaveClient = async () => {
    setClientLoading(true);
    setClientError('');

    // Validation
    if (!newClient.name || !newClient.email) {
      setClientError('Client name and email are required');
      setClientLoading(false);
      return;
    }

    if (!newClient.state) {
      setClientError('State is required');
      setClientLoading(false);
      return;
    }

    // Validate GSTIN if provided
    if (newClient.gstin) {
      const gstinStateCode = newClient.gstin.substring(0, 2);
      if (gstinStateCode !== newClient.stateCode) {
        setClientError(`GSTIN state code (${gstinStateCode}) does not match selected state code (${newClient.stateCode})`);
        setClientLoading(false);
        return;
      }
      if (newClient.gstin.length !== 15) {
        setClientError('GSTIN must be 15 characters long');
        setClientLoading(false);
        return;
      }
    }

    try {
      const response = await clientAPI.create(newClient);
      const createdClient = response.data;

      // Add new client to the list and select it
      setClients([...clients, createdClient]);
      setInvoiceData({ ...invoiceData, client: createdClient.id });

      showSuccess('Client created successfully!');
      setShowClientModal(false);
    } catch (err) {
      setClientError(err.response?.data?.message || 'Failed to create client');
    } finally {
      setClientLoading(false);
    }
  };

  // Service Modal Handlers
  const handleOpenServiceModal = () => {
    setNewService({
      name: '',
      description: '',
      sac_code: '',
      gst_rate: 18.00
    });
    setServiceError('');
    setShowServiceModal(true);
  };

  const handleServiceChange = (field, value) => {
    setNewService({ ...newService, [field]: value });
  };

  const handleSaveService = async () => {
    setServiceLoading(true);
    setServiceError('');

    if (!newService.name) {
      setServiceError('Service name is required');
      setServiceLoading(false);
      return;
    }

    try {
      const response = await serviceItemAPI.create(newService);
      const createdService = response.data;

      // Add new service to the list
      setServices([...services, createdService]);

      showSuccess('Service created successfully!');
      setShowServiceModal(false);
    } catch (err) {
      setServiceError(err.response?.data?.message || 'Failed to create service');
    } finally {
      setServiceLoading(false);
    }
  };

  // Product Modal Handlers
  const handleOpenProductModal = () => {
    setNewProduct({
      name: '',
      description: '',
      hsn_code: '',
      unit_name: 'Nos',
      gst_rate: 18.00,
      purchase_price: '',
      selling_price: ''
    });
    setProductError('');
    setShowProductModal(true);
  };

  const handleProductChange = (field, value) => {
    setNewProduct({ ...newProduct, [field]: value });
  };

  const handleSaveProduct = async () => {
    setProductLoading(true);
    setProductError('');

    if (!newProduct.name) {
      setProductError('Product name is required');
      setProductLoading(false);
      return;
    }

    if (!newProduct.selling_price) {
      setProductError('Selling price is required');
      setProductLoading(false);
      return;
    }

    try {
      const response = await productAPI.create({
        ...newProduct,
        purchase_price: newProduct.purchase_price || 0,
        selling_price: parseFloat(newProduct.selling_price)
      });
      const createdProduct = response.data;

      // Add new product to the list
      setProducts([...products, createdProduct]);

      showSuccess('Product created successfully!');
      setShowProductModal(false);
    } catch (err) {
      setProductError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setProductLoading(false);
    }
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
        round_off: totals.roundOff,
        total_amount: totals.roundedTotal,
        items: invoiceData.items.map(item => ({
          description: item.description,
          hsn_sac: item.hsnSac,
          quantity: item.quantity,
          rate: item.rate,
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

      showSuccess('Invoice saved successfully!');
      setTimeout(() => {
        onBack();
      }, 1000);
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
        round_off: totals.roundOff,
        total_amount: totals.roundedTotal,
        items: invoiceData.items.map(item => ({
          description: item.description,
          hsn_sac: item.hsnSac,
          quantity: item.quantity,
          rate: item.rate,
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

      showSuccess('Invoice saved and PDF generated successfully!');
      setTimeout(() => {
        onBack();
      }, 1000);
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    className="form-input"
                    value={invoiceData.client}
                    onChange={(e) => setInvoiceData({...invoiceData, client: e.target.value})}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleOpenClientModal}
                    title="Create New Client"
                    style={{
                      padding: '10px 16px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + New Client
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="form-section">
            <div className="form-section-header">
              <h3 className="form-section-title">Line Items</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isGoodsTrader && (
                  <button
                    type="button"
                    onClick={handleOpenProductModal}
                    style={{
                      padding: '8px 14px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    + New Product
                  </button>
                )}
                {isServiceProvider && (
                  <button
                    type="button"
                    onClick={handleOpenServiceModal}
                    style={{
                      padding: '8px 14px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    + New Service
                  </button>
                )}
                <button className="btn-add-item" onClick={addItem}>
                  <span className="btn-icon">➕</span>
                  Add Row
                </button>
              </div>
            </div>

            <div className="invoice-items-table">
              <table>
                <thead>
                  <tr>
                    <th style={{width: '50px'}}>Sl No</th>
                    <th style={{width: isGoodsTrader ? '20%' : (formatSettings.show_quantity_column || formatSettings.show_rate_column ? '25%' : '35%')}}>
                      {isGoodsTrader ? 'Product / Service' : 'Service'}
                    </th>
                    <th style={{width: '100px'}}>{isGoodsTrader ? 'HSN/SAC' : 'SAC Code'}</th>
                    {(formatSettings.show_quantity_column || isGoodsTrader) && (
                      <th style={{width: '80px'}}>Qty</th>
                    )}
                    {(formatSettings.show_rate_column || isGoodsTrader) && (
                      <th style={{width: '100px'}}>Rate (₹)</th>
                    )}
                    <th style={{width: '80px'}}>GST %</th>
                    <th style={{width: '120px'}}>Amount (₹)</th>
                    <th style={{width: '120px', textAlign: 'center'}}>Total (₹)</th>
                    <th style={{width: '50px', textAlign: 'center'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="text-center">{item.slNo}</td>
                      <td>
                        {/* Product Selector for Goods Traders */}
                        {isGoodsTrader && (
                          <select
                            className="table-input"
                            value={item.productId || ''}
                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                            style={{ marginBottom: isServiceProvider ? '4px' : '0' }}
                          >
                            <option value="">-- Select Product --</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>
                                {product.name} ({product.unit_name})
                              </option>
                            ))}
                          </select>
                        )}
                        {/* Service Selector for Service Providers */}
                        {isServiceProvider && (
                          <select
                            className="table-input"
                            value={item.serviceId || ''}
                            onChange={(e) => updateItem(index, 'serviceId', e.target.value)}
                          >
                            <option value="">-- Select Service --</option>
                            {services.map(service => (
                              <option key={service.id} value={service.id}>
                                {service.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {item.description && !item.serviceId && !item.productId && (
                          <small style={{display: 'block', marginTop: '4px', color: '#666'}}>
                            Current: {item.description}
                          </small>
                        )}
                      </td>
                      <td className="text-center">
                        {item.hsnSac || '-'}
                      </td>
                      {(formatSettings.show_quantity_column || isGoodsTrader) && (
                        <td>
                          <input
                            type="number"
                            className="table-input"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || null)}
                            min="0"
                            step="0.01"
                            placeholder="0"
                            style={{width: '100%'}}
                          />
                        </td>
                      )}
                      {(formatSettings.show_rate_column || isGoodsTrader) && (
                        <td>
                          <input
                            type="number"
                            className="table-input"
                            value={item.rate || ''}
                            onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || null)}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{width: '100%'}}
                          />
                        </td>
                      )}
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
                      <td className="text-center">
                        {invoiceData.items.length > 1 && (
                          <button
                            type="button"
                            className="btn-icon-small btn-delete-item"
                            onClick={() => removeItem(index)}
                            title="Remove Item"
                            style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </td>
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
              <div className="totals-row">
                <span className="totals-label">Round Off:</span>
                <span className="totals-value" style={{ color: totals.roundOff >= 0 ? '#059669' : '#dc2626' }}>
                  {totals.roundOff >= 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}
                </span>
              </div>
              <div className="totals-row total">
                <span className="totals-label">Total Amount:</span>
                <span className="totals-value">₹{totals.roundedTotal.toFixed(2)}</span>
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

      {/* Create Client Modal */}
      {showClientModal && (
        <div className="modal-overlay" onClick={() => !clientLoading && setShowClientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>Create New Client</h2>
              <button className="modal-close" onClick={() => !clientLoading && setShowClientModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {clientError && (
                <div style={{
                  padding: '12px',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  color: '#dc2626',
                  marginBottom: '16px'
                }}>
                  {clientError}
                </div>
              )}
              <div className="form-grid">
                <div className="form-field">
                  <label>Client Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClient.name}
                    onChange={(e) => handleClientChange('name', e.target.value)}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="form-field">
                  <label>Client Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClient.code}
                    onChange={(e) => handleClientChange('code', e.target.value)}
                    placeholder="Auto-generated if blank"
                  />
                </div>
                <div className="form-field">
                  <label>Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={newClient.email}
                    onChange={(e) => handleClientChange('email', e.target.value)}
                    placeholder="client@example.com"
                  />
                </div>
                <div className="form-field">
                  <label>Mobile</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClient.mobile}
                    onChange={(e) => handleClientChange('mobile', e.target.value)}
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
                <div className="form-field full-width">
                  <label>Address</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={newClient.address}
                    onChange={(e) => handleClientChange('address', e.target.value)}
                    placeholder="Enter full address"
                  ></textarea>
                </div>
                <div className="form-field">
                  <label>City</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClient.city}
                    onChange={(e) => handleClientChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="form-field">
                  <label>State *</label>
                  <select
                    className="form-input"
                    value={newClient.state}
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
                <div className="form-field">
                  <label>State Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClient.stateCode}
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
                    value={newClient.pinCode}
                    onChange={(e) => handleClientChange('pinCode', e.target.value)}
                    placeholder="PIN Code"
                  />
                </div>
                <div className="form-field">
                  <label>GSTIN</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newClient.gstin}
                    onChange={(e) => handleClientChange('gstin', e.target.value)}
                    placeholder="27XXXXX0000X1Z5"
                    maxLength="15"
                  />
                  {newClient.gstin && newClient.gstin.length === 15 && newClient.stateCode && (
                    newClient.gstin.substring(0, 2) === newClient.stateCode ? (
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
                    value={newClient.pan}
                    onChange={(e) => handleClientChange('pan', e.target.value)}
                    placeholder="XXXXX0000X"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowClientModal(false)} disabled={clientLoading}>
                Cancel
              </button>
              <button className="btn-create" onClick={handleSaveClient} disabled={clientLoading}>
                {clientLoading ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Service Modal - Only for Service Providers */}
      {showServiceModal && isServiceProvider && (
        <div className="modal-overlay" onClick={() => !serviceLoading && setShowServiceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Create New Service</h2>
              <button className="modal-close" onClick={() => !serviceLoading && setShowServiceModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {serviceError && (
                <div style={{
                  padding: '12px',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  color: '#dc2626',
                  marginBottom: '16px'
                }}>
                  {serviceError}
                </div>
              )}
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Service Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newService.name}
                    onChange={(e) => handleServiceChange('name', e.target.value)}
                    placeholder="e.g., Tax Audit, GST Return Filing"
                  />
                </div>
                <div className="form-field full-width">
                  <label>Description</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={newService.description}
                    onChange={(e) => handleServiceChange('description', e.target.value)}
                    placeholder="Detailed description of the service"
                  ></textarea>
                </div>
                <div className="form-field">
                  <label>SAC Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newService.sac_code}
                    onChange={(e) => handleServiceChange('sac_code', e.target.value)}
                    placeholder="e.g., 998311"
                  />
                </div>
                <div className="form-field">
                  <label>GST Rate (%)</label>
                  <select
                    className="form-input"
                    value={newService.gst_rate}
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
              <button className="btn-secondary" onClick={() => setShowServiceModal(false)} disabled={serviceLoading}>
                Cancel
              </button>
              <button className="btn-create" onClick={handleSaveService} disabled={serviceLoading}>
                {serviceLoading ? 'Creating...' : 'Create Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Product Modal - Only for Goods Traders */}
      {showProductModal && isGoodsTrader && (
        <div className="modal-overlay" onClick={() => !productLoading && setShowProductModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2>Create New Product</h2>
              <button className="modal-close" onClick={() => !productLoading && setShowProductModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {productError && (
                <div style={{
                  padding: '12px',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  color: '#dc2626',
                  marginBottom: '16px'
                }}>
                  {productError}
                </div>
              )}
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newProduct.name}
                    onChange={(e) => handleProductChange('name', e.target.value)}
                    placeholder="e.g., Laptop, Mobile Phone, Office Chair"
                  />
                </div>
                <div className="form-field full-width">
                  <label>Description</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={newProduct.description}
                    onChange={(e) => handleProductChange('description', e.target.value)}
                    placeholder="Product description (optional)"
                  ></textarea>
                </div>
                <div className="form-field">
                  <label>HSN Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newProduct.hsn_code}
                    onChange={(e) => handleProductChange('hsn_code', e.target.value)}
                    placeholder="e.g., 84713010"
                  />
                </div>
                <div className="form-field">
                  <label>Unit</label>
                  <select
                    className="form-input"
                    value={newProduct.unit_name}
                    onChange={(e) => handleProductChange('unit_name', e.target.value)}
                  >
                    <option value="Nos">Nos (Numbers)</option>
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Kg">Kg (Kilograms)</option>
                    <option value="Gm">Gm (Grams)</option>
                    <option value="Ltr">Ltr (Liters)</option>
                    <option value="Mtr">Mtr (Meters)</option>
                    <option value="Box">Box</option>
                    <option value="Set">Set</option>
                    <option value="Pair">Pair</option>
                    <option value="Dozen">Dozen</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>GST Rate (%)</label>
                  <select
                    className="form-input"
                    value={newProduct.gst_rate}
                    onChange={(e) => handleProductChange('gst_rate', parseFloat(e.target.value))}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Purchase Price (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newProduct.purchase_price}
                    onChange={(e) => handleProductChange('purchase_price', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-field">
                  <label>Selling Price (₹) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newProduct.selling_price}
                    onChange={(e) => handleProductChange('selling_price', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowProductModal(false)} disabled={productLoading}>
                Cancel
              </button>
              <button className="btn-create" onClick={handleSaveProduct} disabled={productLoading}>
                {productLoading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceForm;
