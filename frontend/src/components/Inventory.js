import React, { useState, useEffect } from 'react';
import { productAPI, inventoryAPI } from '../services/api';
import { useToast } from './Toast';
import { formatDate } from '../utils/dateFormat';
import './Pages.css';

function Inventory() {
  const { showSuccess } = useToast();
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stock');
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState('');

  const [adjustment, setAdjustment] = useState({
    product_id: null,
    product_name: '',
    adjustment_type: 'adjustment_in',
    quantity: 0,
    notes: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'movements') {
      loadMovements();
    }
  }, [activeTab]);

  const loadProducts = async () => {
    try {
      const response = await productAPI.getAll({ track_inventory: true });
      // Filter only products with inventory tracking enabled
      const allProducts = response.data.results || response.data || [];
      const inventoryProducts = allProducts.filter(p => p.track_inventory);
      setProducts(inventoryProducts);
    } catch (err) {
      // Error handled silently
    }
  };

  const loadMovements = async (productId = null) => {
    try {
      const params = productId ? { product: productId } : {};
      const response = await inventoryAPI.getAll(params);
      setMovements(response.data.results || response.data || []);
    } catch (err) {
      // Error handled silently
    }
  };

  const handleOpenAdjustment = (product) => {
    setAdjustment({
      product_id: product.id,
      product_name: product.name,
      adjustment_type: 'adjustment_in',
      quantity: 0,
      notes: ''
    });
    setShowAdjustmentForm(true);
    setError('');
  };

  const handleSaveAdjustment = async () => {
    setLoading(true);
    setError('');

    if (!adjustment.quantity || adjustment.quantity <= 0) {
      setError('Please enter a valid quantity');
      setLoading(false);
      return;
    }

    try {
      await productAPI.adjustStock(adjustment.product_id, {
        adjustment_type: adjustment.adjustment_type,
        quantity: parseFloat(adjustment.quantity),
        notes: adjustment.notes
      });

      showSuccess('Stock adjusted successfully!');
      setShowAdjustmentForm(false);
      loadProducts();
      if (activeTab === 'movements') {
        loadMovements();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMovements = (product) => {
    setSelectedProduct(product);
    setActiveTab('movements');
    loadMovements(product.id);
  };

  const clearProductFilter = () => {
    setSelectedProduct(null);
    loadMovements();
  };

  const getStockStatus = (product) => {
    if (product.current_stock <= 0) return { status: 'out', label: 'Out of Stock', color: '#dc2626', bg: '#fee2e2' };
    if (product.low_stock_threshold && product.current_stock <= product.low_stock_threshold) {
      return { status: 'low', label: 'Low Stock', color: '#d97706', bg: '#fef3c7' };
    }
    return { status: 'ok', label: 'In Stock', color: '#16a34a', bg: '#dcfce7' };
  };

  const getMovementTypeLabel = (type) => {
    const labels = {
      'purchase': { label: 'Purchase', icon: '📦', color: '#16a34a' },
      'sale': { label: 'Sale', icon: '🛒', color: '#dc2626' },
      'adjustment_in': { label: 'Stock In', icon: '➕', color: '#16a34a' },
      'adjustment_out': { label: 'Stock Out', icon: '➖', color: '#dc2626' },
      'return_in': { label: 'Sales Return', icon: '↩️', color: '#16a34a' },
      'return_out': { label: 'Purchase Return', icon: '↪️', color: '#dc2626' },
      'opening': { label: 'Opening Stock', icon: '📋', color: '#6366f1' }
    };
    return labels[type] || { label: type, icon: '📝', color: '#6b7280' };
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const stockStatus = getStockStatus(product);
    const matchesFilter = stockFilter === 'all' ||
                         (stockFilter === 'low' && stockStatus.status === 'low') ||
                         (stockFilter === 'out' && stockStatus.status === 'out') ||
                         (stockFilter === 'in' && stockStatus.status === 'ok');

    return matchesSearch && matchesFilter;
  });

  // Calculate summary statistics
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => {
    const status = getStockStatus(p);
    return status.status === 'low';
  }).length;
  const outOfStockCount = products.filter(p => {
    const status = getStockStatus(p);
    return status.status === 'out';
  }).length;
  const totalValue = products.reduce((sum, p) => {
    return sum + (parseFloat(p.current_stock) * parseFloat(p.purchase_price));
  }, 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Inventory Management</h1>
          <p className="page-description">Track stock levels and inventory movements</p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Products</div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{totalProducts}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Tracking inventory</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          cursor: 'pointer'
        }} onClick={() => setStockFilter('low')}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Low Stock</div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{lowStockCount}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Need reorder</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          cursor: 'pointer'
        }} onClick={() => setStockFilter('out')}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Out of Stock</div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{outOfStockCount}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Urgent attention</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Stock Value</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{totalValue.toFixed(2)}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>At purchase price</div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustmentForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Stock Adjustment</h2>
              <button className="btn-close" onClick={() => setShowAdjustmentForm(false)}>x</button>
            </div>

            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                Adjusting stock for: <strong>{adjustment.product_name}</strong>
              </p>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="form-field">
                  <label>Adjustment Type</label>
                  <select
                    className="form-input"
                    value={adjustment.adjustment_type}
                    onChange={(e) => setAdjustment({ ...adjustment, adjustment_type: e.target.value })}
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
                    value={adjustment.quantity}
                    onChange={(e) => setAdjustment({ ...adjustment, quantity: e.target.value })}
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
                    value={adjustment.notes}
                    onChange={(e) => setAdjustment({ ...adjustment, notes: e.target.value })}
                    placeholder="Reason for adjustment (optional)"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-create"
                onClick={handleSaveAdjustment}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Adjustment'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAdjustmentForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={`btn-secondary ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
          style={{
            background: activeTab === 'stock' ? 'var(--gradient-primary)' : '',
            color: activeTab === 'stock' ? 'white' : '',
            border: activeTab === 'stock' ? 'none' : ''
          }}
        >
          📦 Stock Levels
        </button>
        <button
          className={`btn-secondary ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => { setActiveTab('movements'); setSelectedProduct(null); loadMovements(); }}
          style={{
            background: activeTab === 'movements' ? 'var(--gradient-primary)' : '',
            color: activeTab === 'movements' ? 'white' : '',
            border: activeTab === 'movements' ? 'none' : ''
          }}
        >
          📋 Movement History
        </button>
      </div>

      {/* Stock Levels Tab */}
      {activeTab === 'stock' && (
        <>
          <div className="filters-section">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search products..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group" style={{ flex: '0 0 180px' }}>
              <select
                className="filter-select"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
              >
                <option value="all">All Products</option>
                <option value="in">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
          </div>

          <div className="content-card">
            {filteredProducts.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">📊</div>
                <h3 className="empty-title">No Inventory Products</h3>
                <p className="empty-description">
                  {products.length === 0
                    ? 'Enable inventory tracking on products to see them here'
                    : 'No products match your current filter'}
                </p>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th style={{ textAlign: 'right' }}>Current Stock</th>
                      <th style={{ textAlign: 'right' }}>Low Threshold</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'right' }}>Stock Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      const stockValue = parseFloat(product.current_stock) * parseFloat(product.purchase_price);
                      return (
                        <tr key={product.id}>
                          <td>
                            <strong>{product.name}</strong>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              Unit: {product.unit_name || 'pcs'}
                            </div>
                          </td>
                          <td>{product.sku || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>
                            {parseFloat(product.current_stock).toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {product.low_stock_threshold
                              ? parseFloat(product.low_stock_threshold).toFixed(2)
                              : '-'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: stockStatus.bg,
                              color: stockStatus.color,
                              textTransform: 'uppercase'
                            }}>
                              {stockStatus.label}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {stockValue.toFixed(2)}
                          </td>
                          <td>
                            <button
                              className="btn-icon-small"
                              onClick={() => handleOpenAdjustment(product)}
                              title="Adjust Stock"
                            >
                              📊
                            </button>
                            <button
                              className="btn-icon-small"
                              onClick={() => handleViewMovements(product)}
                              title="View History"
                            >
                              📋
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
        </>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <>
          {selectedProduct && (
            <div style={{
              background: '#eef2ff',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>
                Showing movements for: <strong>{selectedProduct.name}</strong>
              </span>
              <button
                className="btn-secondary"
                onClick={clearProductFilter}
                style={{ padding: '6px 12px' }}
              >
                Show All
              </button>
            </div>
          )}

          <div className="content-card">
            {movements.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">📜</div>
                <h3 className="empty-title">No Movements Yet</h3>
                <p className="empty-description">
                  Stock movements will appear here when you make purchases, sales, or adjustments
                </p>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Stock After</th>
                      <th>Reference</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => {
                      const typeInfo = getMovementTypeLabel(movement.movement_type);
                      const quantity = parseFloat(movement.quantity);
                      return (
                        <tr key={movement.id}>
                          <td>{formatDate(movement.created_at)}</td>
                          <td>
                            <strong>{movement.product_name || '-'}</strong>
                          </td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{typeInfo.icon}</span>
                              <span style={{ color: typeInfo.color, fontWeight: '500' }}>
                                {typeInfo.label}
                              </span>
                            </span>
                          </td>
                          <td style={{
                            textAlign: 'right',
                            fontWeight: '600',
                            color: quantity >= 0 ? '#16a34a' : '#dc2626'
                          }}>
                            {quantity >= 0 ? '+' : ''}{quantity.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {parseFloat(movement.stock_after).toFixed(2)}
                          </td>
                          <td>
                            {movement.reference ? (
                              <span style={{ fontSize: '12px', color: '#6366f1' }}>
                                {movement.reference}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748b', maxWidth: '200px' }}>
                            {movement.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
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

export default Inventory;
