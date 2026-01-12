import React, { useState, useEffect } from 'react';
import { productAPI, unitAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';

function ProductMaster() {
  const { showSuccess } = useToast();
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');

  const [currentProduct, setCurrentProduct] = useState({
    name: '',
    description: '',
    hsn_code: '',
    sku: '',
    unit_name: 'pcs',
    unit: null,
    purchase_price: 0,
    selling_price: 0,
    gst_rate: 18.00,
    track_inventory: false,
    current_stock: 0,
    low_stock_threshold: null
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    product_id: null,
    product_name: '',
    adjustment_type: 'adjustment_in',
    quantity: 0,
    notes: ''
  });

  useEffect(() => {
    loadProducts();
    loadUnits();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productAPI.getAll();
      setProducts(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const loadUnits = async () => {
    try {
      const response = await unitAPI.getAll();
      setUnits(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading units:', err);
    }
  };

  const handleAddProduct = () => {
    setCurrentProduct({
      name: '',
      description: '',
      hsn_code: '',
      sku: '',
      unit_name: 'pcs',
      unit: null,
      purchase_price: 0,
      selling_price: 0,
      gst_rate: 18.00,
      track_inventory: false,
      current_stock: 0,
      low_stock_threshold: null
    });
    setShowForm(true);
    setError('');
  };

  const handleEditProduct = (product) => {
    setCurrentProduct({
      ...product,
      unit: product.unit?.id || null
    });
    setShowForm(true);
    setError('');
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productAPI.delete(id);
        showSuccess('Product deleted successfully!');
        loadProducts();
      } catch (err) {
        setError('Failed to delete product. It may be used in invoices or purchases.');
      }
    }
  };

  const handleProductChange = (field, value) => {
    let updatedProduct = { ...currentProduct, [field]: value };

    // Update unit_name when unit is selected
    if (field === 'unit' && value) {
      const selectedUnit = units.find(u => u.id === parseInt(value));
      if (selectedUnit) {
        updatedProduct.unit_name = selectedUnit.symbol;
      }
    }

    setCurrentProduct(updatedProduct);
  };

  const handleSaveProduct = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!currentProduct.name) {
      setError('Product name is required');
      setLoading(false);
      return;
    }

    try {
      const productData = {
        ...currentProduct,
        purchase_price: parseFloat(currentProduct.purchase_price) || 0,
        selling_price: parseFloat(currentProduct.selling_price) || 0,
        gst_rate: parseFloat(currentProduct.gst_rate) || 0,
        current_stock: parseFloat(currentProduct.current_stock) || 0,
        low_stock_threshold: currentProduct.low_stock_threshold ? parseFloat(currentProduct.low_stock_threshold) : null,
        unit: currentProduct.unit || null
      };

      if (currentProduct.id) {
        await productAPI.update(currentProduct.id, productData);
      } else {
        await productAPI.create(productData);
      }

      showSuccess('Product saved successfully!');
      setShowForm(false);
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.name?.[0] || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const handleOpenStockAdjustment = (product) => {
    setStockAdjustment({
      product_id: product.id,
      product_name: product.name,
      adjustment_type: 'adjustment_in',
      quantity: 0,
      notes: ''
    });
    setShowStockAdjustment(true);
    setError('');
  };

  const handleSaveStockAdjustment = async () => {
    setLoading(true);
    setError('');

    if (!stockAdjustment.quantity || stockAdjustment.quantity <= 0) {
      setError('Please enter a valid quantity');
      setLoading(false);
      return;
    }

    try {
      await productAPI.adjustStock(stockAdjustment.product_id, {
        adjustment_type: stockAdjustment.adjustment_type,
        quantity: parseFloat(stockAdjustment.quantity),
        notes: stockAdjustment.notes
      });

      showSuccess('Stock adjusted successfully!');
      setShowStockAdjustment(false);
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.hsn_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && product.is_active) ||
                         (statusFilter === 'inactive' && !product.is_active) ||
                         (statusFilter === 'low_stock' && product.track_inventory &&
                          product.current_stock <= (product.low_stock_threshold || 0));

    return matchesSearch && matchesStatus;
  });

  const getStockStatus = (product) => {
    if (!product.track_inventory) return null;
    if (product.current_stock <= 0) return 'out';
    if (product.low_stock_threshold && product.current_stock <= product.low_stock_threshold) return 'low';
    return 'ok';
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Product Master</h1>
          <p className="page-description">Manage your product catalog with HSN codes and inventory</p>
        </div>
        <div className="page-header-right">
          <button className="btn-create" onClick={handleAddProduct}>
            <span className="btn-icon">➕</span>
            Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockAdjustment && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Stock Adjustment</h2>
              <button className="btn-close" onClick={() => setShowStockAdjustment(false)}>x</button>
            </div>

            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                Adjusting stock for: <strong>{stockAdjustment.product_name}</strong>
              </p>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="form-field">
                  <label>Adjustment Type</label>
                  <select
                    className="form-input"
                    value={stockAdjustment.adjustment_type}
                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, adjustment_type: e.target.value })}
                  >
                    <option value="adjustment_in">Stock In (Add)</option>
                    <option value="adjustment_out">Stock Out (Remove)</option>
                    <option value="opening">Opening Stock</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={stockAdjustment.quantity}
                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="Enter quantity"
                  />
                </div>

                <div className="form-field">
                  <label>Notes</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={stockAdjustment.notes}
                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, notes: e.target.value })}
                    placeholder="Reason for adjustment (optional)"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-create"
                onClick={handleSaveStockAdjustment}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Adjustment'}
              </button>
              <button className="btn-secondary" onClick={() => setShowStockAdjustment(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>{currentProduct.id ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="btn-close" onClick={handleCancelForm}>x</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={currentProduct.name}
                    onChange={(e) => handleProductChange('name', e.target.value)}
                    placeholder="e.g., Steel Rods 10mm, Rice Basmati"
                  />
                </div>

                <div className="form-field full-width">
                  <label>Description</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={currentProduct.description}
                    onChange={(e) => handleProductChange('description', e.target.value)}
                    placeholder="Detailed description of the product"
                  ></textarea>
                </div>

                <div className="form-field">
                  <label>HSN Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={currentProduct.hsn_code}
                    onChange={(e) => handleProductChange('hsn_code', e.target.value)}
                    placeholder="e.g., 72142000"
                  />
                </div>

                <div className="form-field">
                  <label>SKU / Product Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={currentProduct.sku}
                    onChange={(e) => handleProductChange('sku', e.target.value)}
                    placeholder="e.g., PRD001"
                  />
                </div>

                <div className="form-field">
                  <label>Unit of Measurement</label>
                  <select
                    className="form-input"
                    value={currentProduct.unit || ''}
                    onChange={(e) => handleProductChange('unit', e.target.value)}
                  >
                    <option value="">-- Select Unit --</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>GST Rate (%)</label>
                  <select
                    className="form-input"
                    value={currentProduct.gst_rate}
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
                  <label>Purchase Price</label>
                  <input
                    type="number"
                    className="form-input"
                    value={currentProduct.purchase_price}
                    onChange={(e) => handleProductChange('purchase_price', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Cost price"
                  />
                </div>

                <div className="form-field">
                  <label>Selling Price</label>
                  <input
                    type="number"
                    className="form-input"
                    value={currentProduct.selling_price}
                    onChange={(e) => handleProductChange('selling_price', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Selling price / MRP"
                  />
                </div>

                <div className="form-field full-width" style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <input
                      type="checkbox"
                      id="track_inventory"
                      checked={currentProduct.track_inventory}
                      onChange={(e) => handleProductChange('track_inventory', e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <label htmlFor="track_inventory" style={{ margin: 0, cursor: 'pointer' }}>
                      <strong>Enable Inventory Tracking</strong>
                      <span style={{ display: 'block', fontSize: '13px', color: '#64748b' }}>
                        Track stock levels and get low stock alerts
                      </span>
                    </label>
                  </div>

                  {currentProduct.track_inventory && (
                    <div className="form-grid" style={{ marginBottom: 0 }}>
                      <div className="form-field">
                        <label>Opening Stock</label>
                        <input
                          type="number"
                          className="form-input"
                          value={currentProduct.current_stock}
                          onChange={(e) => handleProductChange('current_stock', e.target.value)}
                          min="0"
                          step="0.01"
                          placeholder="Current stock quantity"
                          disabled={currentProduct.id}
                        />
                        {currentProduct.id && (
                          <small style={{ color: '#64748b' }}>
                            Use Stock Adjustment to modify stock
                          </small>
                        )}
                      </div>

                      <div className="form-field">
                        <label>Low Stock Alert Threshold</label>
                        <input
                          type="number"
                          className="form-input"
                          value={currentProduct.low_stock_threshold || ''}
                          onChange={(e) => handleProductChange('low_stock_threshold', e.target.value)}
                          min="0"
                          step="0.01"
                          placeholder="Alert when stock falls below"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-create"
                onClick={handleSaveProduct}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Product'}
              </button>
              <button className="btn-secondary" onClick={handleCancelForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            className="search-input"
            placeholder="Search products by name, HSN, or SKU..."
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
            <option value="all">All Products</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="low_stock">Low Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="content-card">
        {filteredProducts.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📦</div>
            <h3 className="empty-title">No Products Found</h3>
            <p className="empty-description">Add your first product to start creating invoices for goods</p>
            <button className="btn-create" onClick={handleAddProduct}>
              <span className="btn-icon">➕</span>
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>HSN Code</th>
                  <th>SKU</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Purchase Price</th>
                  <th style={{ textAlign: 'right' }}>Selling Price</th>
                  <th style={{ textAlign: 'center' }}>GST %</th>
                  <th style={{ textAlign: 'center' }}>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        {product.description && (
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {product.description.substring(0, 50)}
                            {product.description.length > 50 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td>{product.hsn_code || '-'}</td>
                      <td>{product.sku || '-'}</td>
                      <td>{product.unit_name || 'pcs'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {parseFloat(product.purchase_price).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {parseFloat(product.selling_price).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{product.gst_rate}%</td>
                      <td style={{ textAlign: 'center' }}>
                        {product.track_inventory ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: stockStatus === 'out' ? '#fee2e2' :
                                       stockStatus === 'low' ? '#fef3c7' : '#dcfce7',
                            color: stockStatus === 'out' ? '#dc2626' :
                                  stockStatus === 'low' ? '#d97706' : '#16a34a'
                          }}>
                            {parseFloat(product.current_stock).toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-icon-small"
                          onClick={() => handleEditProduct(product)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        {product.track_inventory && (
                          <button
                            className="btn-icon-small"
                            onClick={() => handleOpenStockAdjustment(product)}
                            title="Adjust Stock"
                          >
                            📊
                          </button>
                        )}
                        <button
                          className="btn-icon-small"
                          onClick={() => handleDeleteProduct(product.id)}
                          title="Delete"
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
        )}
      </div>
    </div>
  );
}

export default ProductMaster;
