import React, { useState, useEffect } from 'react';
import { productAPI, unitAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { useToast } from './Toast';

// Inline styles for Product Master (pm- prefix to avoid conflicts)
const styles = {
  pmMainContent: {
    padding: '24px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    boxSizing: 'border-box',
    width: '100%',
    overflow: 'visible'
  },
  pmPageHeader: {
    marginBottom: '24px'
  },
  pmPageTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0'
  },
  pmPageSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0'
  },
  pmStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  pmStatCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer'
  },
  pmStatIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px'
  },
  pmStatInfo: {
    flex: 1
  },
  pmStatValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0'
  },
  pmStatLabel: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0'
  },
  pmContentCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'visible'
  },
  pmToolbar: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'space-between'
  },
  pmToolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: '1'
  },
  pmToolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  pmSearchBox: {
    position: 'relative',
    flex: '1',
    maxWidth: '320px'
  },
  pmSearchInput: {
    width: '100%',
    padding: '10px 16px 10px 40px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box'
  },
  pmSearchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    fontSize: '14px'
  },
  pmFilterSelect: {
    padding: '10px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    minWidth: '150px'
  },
  pmViewToggle: {
    display: 'flex',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  pmViewBtn: {
    padding: '8px 12px',
    border: 'none',
    background: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#64748b',
    transition: 'all 0.2s'
  },
  pmViewBtnActive: {
    padding: '8px 12px',
    border: 'none',
    background: '#3b82f6',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  pmAddBtn: {
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
  pmTableWrapper: {
    overflowX: 'auto',
    overflowY: 'visible'
  },
  pmTable: {
    width: '100%',
    minWidth: '1000px',
    borderCollapse: 'collapse'
  },
  pmTableHeader: {
    backgroundColor: '#f8fafc',
    whiteSpace: 'nowrap'
  },
  pmTableHeaderCell: {
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
  pmTableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s'
  },
  pmTableCell: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#334155',
    verticalAlign: 'middle'
  },
  pmProductInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  pmProductIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#fef3c7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px'
  },
  pmProductDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  pmProductName: {
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '2px'
  },
  pmProductDesc: {
    fontSize: '12px',
    color: '#64748b',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  pmBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  },
  pmBadgeHsn: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1'
  },
  pmBadgeSku: {
    backgroundColor: '#f3e8ff',
    color: '#9333ea'
  },
  pmBadgeGst: {
    backgroundColor: '#f0fdf4',
    color: '#15803d'
  },
  pmStockOk: {
    backgroundColor: '#dcfce7',
    color: '#16a34a'
  },
  pmStockLow: {
    backgroundColor: '#fef3c7',
    color: '#d97706'
  },
  pmStockOut: {
    backgroundColor: '#fee2e2',
    color: '#dc2626'
  },
  pmActions: {
    display: 'flex',
    gap: '6px'
  },
  pmActionBtn: {
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  pmEditBtn: {
    backgroundColor: '#f0f9ff',
    color: '#3b82f6'
  },
  pmStockBtn: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a'
  },
  pmDeleteBtn: {
    backgroundColor: '#fef2f2',
    color: '#ef4444'
  },
  pmCardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
    padding: '20px'
  },
  pmProductCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer'
  },
  pmCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  pmCardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#fef3c7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px'
  },
  pmCardActions: {
    display: 'flex',
    gap: '4px'
  },
  pmCardName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px'
  },
  pmCardDesc: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '16px',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  pmCardPrices: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  pmCardPriceItem: {
    textAlign: 'center'
  },
  pmCardPriceLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: '4px'
  },
  pmCardPriceValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b'
  },
  pmCardFooter: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9'
  },
  pmEmptyState: {
    padding: '60px 20px',
    textAlign: 'center'
  },
  pmEmptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  pmEmptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px'
  },
  pmEmptyText: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '20px'
  },
  pmTableFooter: {
    padding: '16px 20px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  pmTableInfo: {
    fontSize: '14px',
    color: '#64748b'
  },
  // Modal styles
  pmModalOverlay: {
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
  pmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  pmModalSmall: {
    maxWidth: '480px'
  },
  pmModalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  pmModalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  pmModalClose: {
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
  pmModalBody: {
    padding: '24px'
  },
  pmFormGroup: {
    marginBottom: '20px'
  },
  pmFormLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },
  pmFormRequired: {
    color: '#ef4444'
  },
  pmFormInput: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box'
  },
  pmFormTextarea: {
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
  pmFormSelect: {
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
  pmFormRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  pmFormRow3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '16px'
  },
  pmInventorySection: {
    backgroundColor: '#f8fafc',
    padding: '16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0'
  },
  pmCheckboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  pmCheckbox: {
    width: '18px',
    height: '18px'
  },
  pmCheckboxLabel: {
    margin: 0,
    cursor: 'pointer'
  },
  pmCheckboxTitle: {
    fontWeight: '600'
  },
  pmCheckboxDesc: {
    display: 'block',
    fontSize: '13px',
    color: '#64748b'
  },
  pmModalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    backgroundColor: '#f8fafc'
  },
  pmBtnPrimary: {
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
  pmBtnSecondary: {
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
  pmErrorBanner: {
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
  },
  pmAdjustmentInfo: {
    marginBottom: '16px',
    padding: '12px 16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    color: '#0369a1',
    fontSize: '14px'
  }
};

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
  const [viewMode, setViewMode] = useState('table');

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
      // Error handled silently
    }
  };

  const loadUnits = async () => {
    try {
      const response = await unitAPI.getAll();
      setUnits(response.data.results || response.data || []);
    } catch (err) {
      // Error handled silently
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

  const getGstRateColor = (rate) => {
    const r = parseFloat(rate);
    if (r === 0) return { backgroundColor: '#f1f5f9', color: '#64748b' };
    if (r === 5) return { backgroundColor: '#fef3c7', color: '#92400e' };
    if (r === 12) return { backgroundColor: '#e0f2fe', color: '#0369a1' };
    if (r === 18) return { backgroundColor: '#f0fdf4', color: '#15803d' };
    if (r === 28) return { backgroundColor: '#fef2f2', color: '#dc2626' };
    return { backgroundColor: '#f0fdf4', color: '#15803d' };
  };

  // Calculate stats
  const totalProducts = products.length;
  const withHsnCode = products.filter(p => p.hsn_code).length;
  const withInventory = products.filter(p => p.track_inventory).length;
  const lowStockCount = products.filter(p => p.track_inventory && p.current_stock <= (p.low_stock_threshold || 0)).length;

  return (
    <div style={styles.pmMainContent}>
      {/* Page Header */}
      <div style={styles.pmPageHeader}>
        <h1 style={styles.pmPageTitle}>Product Master</h1>
        <p style={styles.pmPageSubtitle}>Manage your product catalog with HSN codes and inventory</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={styles.pmErrorBanner}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={styles.pmStatsGrid}>
        <div style={styles.pmStatCard}>
          <div style={{...styles.pmStatIcon, backgroundColor: '#dbeafe', color: '#2563eb'}}>
            📦
          </div>
          <div style={styles.pmStatInfo}>
            <p style={styles.pmStatValue}>{totalProducts}</p>
            <p style={styles.pmStatLabel}>Total Products</p>
          </div>
        </div>
        <div style={styles.pmStatCard}>
          <div style={{...styles.pmStatIcon, backgroundColor: '#f0fdf4', color: '#16a34a'}}>
            🏷️
          </div>
          <div style={styles.pmStatInfo}>
            <p style={styles.pmStatValue}>{withHsnCode}</p>
            <p style={styles.pmStatLabel}>With HSN Code</p>
          </div>
        </div>
        <div style={styles.pmStatCard}>
          <div style={{...styles.pmStatIcon, backgroundColor: '#fef3c7', color: '#d97706'}}>
            📊
          </div>
          <div style={styles.pmStatInfo}>
            <p style={styles.pmStatValue}>{withInventory}</p>
            <p style={styles.pmStatLabel}>Inventory Tracked</p>
          </div>
        </div>
        <div style={styles.pmStatCard}>
          <div style={{...styles.pmStatIcon, backgroundColor: lowStockCount > 0 ? '#fee2e2' : '#f3e8ff', color: lowStockCount > 0 ? '#dc2626' : '#9333ea'}}>
            {lowStockCount > 0 ? '⚠️' : '✅'}
          </div>
          <div style={styles.pmStatInfo}>
            <p style={styles.pmStatValue}>{lowStockCount}</p>
            <p style={styles.pmStatLabel}>Low Stock Alerts</p>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div style={styles.pmContentCard}>
        {/* Toolbar */}
        <div style={styles.pmToolbar}>
          <div style={styles.pmToolbarLeft}>
            <div style={styles.pmSearchBox}>
              <span style={styles.pmSearchIcon}>🔍</span>
              <input
                type="text"
                style={styles.pmSearchInput}
                placeholder="Search by name, HSN, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              style={styles.pmFilterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Products</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="low_stock">Low Stock</option>
            </select>
          </div>
          <div style={styles.pmToolbarRight}>
            <div style={styles.pmViewToggle}>
              <button
                style={viewMode === 'table' ? styles.pmViewBtnActive : styles.pmViewBtn}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                ☰
              </button>
              <button
                style={viewMode === 'card' ? styles.pmViewBtnActive : styles.pmViewBtn}
                onClick={() => setViewMode('card')}
                title="Card View"
              >
                ▦
              </button>
            </div>
            <button style={styles.pmAddBtn} onClick={handleAddProduct}>
              <span>+</span> Add Product
            </button>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <>
            <div style={styles.pmTableWrapper}>
              <table style={styles.pmTable}>
                <thead style={styles.pmTableHeader}>
                  <tr>
                    <th style={{...styles.pmTableHeaderCell, width: '25%'}}>Product</th>
                    <th style={{...styles.pmTableHeaderCell, width: '10%'}}>HSN Code</th>
                    <th style={{...styles.pmTableHeaderCell, width: '10%'}}>SKU</th>
                    <th style={{...styles.pmTableHeaderCell, width: '8%'}}>Unit</th>
                    <th style={{...styles.pmTableHeaderCell, width: '12%', textAlign: 'right'}}>Purchase</th>
                    <th style={{...styles.pmTableHeaderCell, width: '12%', textAlign: 'right'}}>Selling</th>
                    <th style={{...styles.pmTableHeaderCell, width: '8%', textAlign: 'center'}}>GST</th>
                    <th style={{...styles.pmTableHeaderCell, width: '8%', textAlign: 'center'}}>Stock</th>
                    <th style={{...styles.pmTableHeaderCell, width: '10%', textAlign: 'center'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="9">
                        <div style={styles.pmEmptyState}>
                          <div style={styles.pmEmptyIcon}>📦</div>
                          <h3 style={styles.pmEmptyTitle}>No Products Found</h3>
                          <p style={styles.pmEmptyText}>Add your first product to start creating invoices for goods</p>
                          <button style={styles.pmAddBtn} onClick={handleAddProduct}>
                            <span>+</span> Add Product
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      return (
                        <tr
                          key={product.id}
                          style={styles.pmTableRow}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={styles.pmTableCell}>
                            <div style={styles.pmProductInfo}>
                              <div style={styles.pmProductIcon}>📦</div>
                              <div style={styles.pmProductDetails}>
                                <div style={styles.pmProductName}>{product.name}</div>
                                {product.description && (
                                  <div style={styles.pmProductDesc}>{product.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={styles.pmTableCell}>
                            {product.hsn_code ? (
                              <span style={{...styles.pmBadge, ...styles.pmBadgeHsn}}>
                                {product.hsn_code}
                              </span>
                            ) : (
                              <span style={{color: '#94a3b8'}}>—</span>
                            )}
                          </td>
                          <td style={styles.pmTableCell}>
                            {product.sku ? (
                              <span style={{...styles.pmBadge, ...styles.pmBadgeSku}}>
                                {product.sku}
                              </span>
                            ) : (
                              <span style={{color: '#94a3b8'}}>—</span>
                            )}
                          </td>
                          <td style={styles.pmTableCell}>
                            {product.unit_name || 'pcs'}
                          </td>
                          <td style={{...styles.pmTableCell, textAlign: 'right', fontWeight: '500'}}>
                            {formatCurrency(product.purchase_price)}
                          </td>
                          <td style={{...styles.pmTableCell, textAlign: 'right', fontWeight: '500'}}>
                            {formatCurrency(product.selling_price)}
                          </td>
                          <td style={{...styles.pmTableCell, textAlign: 'center'}}>
                            <span style={{...styles.pmBadge, ...getGstRateColor(product.gst_rate)}}>
                              {product.gst_rate}%
                            </span>
                          </td>
                          <td style={{...styles.pmTableCell, textAlign: 'center'}}>
                            {product.track_inventory ? (
                              <span style={{
                                ...styles.pmBadge,
                                ...(stockStatus === 'out' ? styles.pmStockOut : stockStatus === 'low' ? styles.pmStockLow : styles.pmStockOk)
                              }}>
                                {parseFloat(product.current_stock).toFixed(0)}
                              </span>
                            ) : (
                              <span style={{color: '#94a3b8'}}>—</span>
                            )}
                          </td>
                          <td style={{...styles.pmTableCell, textAlign: 'center'}}>
                            <div style={{...styles.pmActions, justifyContent: 'center'}}>
                              <button
                                style={{...styles.pmActionBtn, ...styles.pmEditBtn}}
                                onClick={() => handleEditProduct(product)}
                                title="Edit"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                              >
                                ✏️
                              </button>
                              {product.track_inventory && (
                                <button
                                  style={{...styles.pmActionBtn, ...styles.pmStockBtn}}
                                  onClick={() => handleOpenStockAdjustment(product)}
                                  title="Adjust Stock"
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dcfce7'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                                >
                                  📊
                                </button>
                              )}
                              <button
                                style={{...styles.pmActionBtn, ...styles.pmDeleteBtn}}
                                onClick={() => handleDeleteProduct(product.id)}
                                title="Delete"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredProducts.length > 0 && (
              <div style={styles.pmTableFooter}>
                <span style={styles.pmTableInfo}>
                  Showing {filteredProducts.length} of {totalProducts} products
                </span>
              </div>
            )}
          </>
        )}

        {/* Card View */}
        {viewMode === 'card' && (
          <>
            {filteredProducts.length === 0 ? (
              <div style={styles.pmEmptyState}>
                <div style={styles.pmEmptyIcon}>📦</div>
                <h3 style={styles.pmEmptyTitle}>No Products Found</h3>
                <p style={styles.pmEmptyText}>Add your first product to start creating invoices for goods</p>
                <button style={styles.pmAddBtn} onClick={handleAddProduct}>
                  <span>+</span> Add Product
                </button>
              </div>
            ) : (
              <div style={styles.pmCardGrid}>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <div
                      key={product.id}
                      style={styles.pmProductCard}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={styles.pmCardHeader}>
                        <div style={styles.pmCardIcon}>📦</div>
                        <div style={styles.pmCardActions}>
                          <button
                            style={{...styles.pmActionBtn, ...styles.pmEditBtn}}
                            onClick={() => handleEditProduct(product)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          {product.track_inventory && (
                            <button
                              style={{...styles.pmActionBtn, ...styles.pmStockBtn}}
                              onClick={() => handleOpenStockAdjustment(product)}
                              title="Adjust Stock"
                            >
                              📊
                            </button>
                          )}
                          <button
                            style={{...styles.pmActionBtn, ...styles.pmDeleteBtn}}
                            onClick={() => handleDeleteProduct(product.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div style={styles.pmCardName}>{product.name}</div>
                      <div style={styles.pmCardDesc}>
                        {product.description || 'No description available'}
                      </div>
                      <div style={styles.pmCardPrices}>
                        <div style={styles.pmCardPriceItem}>
                          <div style={styles.pmCardPriceLabel}>Purchase</div>
                          <div style={styles.pmCardPriceValue}>{formatCurrency(product.purchase_price)}</div>
                        </div>
                        <div style={styles.pmCardPriceItem}>
                          <div style={styles.pmCardPriceLabel}>Selling</div>
                          <div style={styles.pmCardPriceValue}>{formatCurrency(product.selling_price)}</div>
                        </div>
                        {product.track_inventory && (
                          <div style={styles.pmCardPriceItem}>
                            <div style={styles.pmCardPriceLabel}>Stock</div>
                            <div style={{
                              ...styles.pmCardPriceValue,
                              color: stockStatus === 'out' ? '#dc2626' : stockStatus === 'low' ? '#d97706' : '#16a34a'
                            }}>
                              {parseFloat(product.current_stock).toFixed(0)}
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={styles.pmCardFooter}>
                        {product.hsn_code && (
                          <span style={{...styles.pmBadge, ...styles.pmBadgeHsn}}>
                            HSN: {product.hsn_code}
                          </span>
                        )}
                        {product.sku && (
                          <span style={{...styles.pmBadge, ...styles.pmBadgeSku}}>
                            SKU: {product.sku}
                          </span>
                        )}
                        <span style={{...styles.pmBadge, ...getGstRateColor(product.gst_rate)}}>
                          GST: {product.gst_rate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {showStockAdjustment && (
        <div style={styles.pmModalOverlay} onClick={() => setShowStockAdjustment(false)}>
          <div style={{...styles.pmModalContent, ...styles.pmModalSmall}} onClick={(e) => e.stopPropagation()}>
            <div style={styles.pmModalHeader}>
              <h2 style={styles.pmModalTitle}>Stock Adjustment</h2>
              <button style={styles.pmModalClose} onClick={() => setShowStockAdjustment(false)}>
                ✕
              </button>
            </div>
            <div style={styles.pmModalBody}>
              <div style={styles.pmAdjustmentInfo}>
                Adjusting stock for: <strong>{stockAdjustment.product_name}</strong>
              </div>

              <div style={styles.pmFormGroup}>
                <label style={styles.pmFormLabel}>Adjustment Type</label>
                <select
                  style={styles.pmFormSelect}
                  value={stockAdjustment.adjustment_type}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, adjustment_type: e.target.value })}
                >
                  <option value="adjustment_in">Stock In (Add)</option>
                  <option value="adjustment_out">Stock Out (Remove)</option>
                  <option value="opening">Opening Stock</option>
                </select>
              </div>

              <div style={styles.pmFormGroup}>
                <label style={styles.pmFormLabel}>
                  Quantity <span style={styles.pmFormRequired}>*</span>
                </label>
                <input
                  type="number"
                  style={styles.pmFormInput}
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: e.target.value })}
                  min="0"
                  step="0.01"
                  placeholder="Enter quantity"
                />
              </div>

              <div style={styles.pmFormGroup}>
                <label style={styles.pmFormLabel}>Notes</label>
                <textarea
                  style={styles.pmFormTextarea}
                  value={stockAdjustment.notes}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, notes: e.target.value })}
                  placeholder="Reason for adjustment (optional)"
                />
              </div>
            </div>
            <div style={styles.pmModalFooter}>
              <button style={styles.pmBtnSecondary} onClick={() => setShowStockAdjustment(false)}>
                Cancel
              </button>
              <button
                style={{...styles.pmBtnPrimary, opacity: loading ? 0.7 : 1}}
                onClick={handleSaveStockAdjustment}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div style={styles.pmModalOverlay} onClick={handleCancelForm}>
          <div style={styles.pmModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.pmModalHeader}>
              <h2 style={styles.pmModalTitle}>
                {currentProduct.id ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button style={styles.pmModalClose} onClick={handleCancelForm}>
                ✕
              </button>
            </div>
            <div style={styles.pmModalBody}>
              <div style={styles.pmFormGroup}>
                <label style={styles.pmFormLabel}>
                  Product Name <span style={styles.pmFormRequired}>*</span>
                </label>
                <input
                  type="text"
                  style={styles.pmFormInput}
                  value={currentProduct.name}
                  onChange={(e) => handleProductChange('name', e.target.value)}
                  placeholder="e.g., Steel Rods 10mm, Rice Basmati"
                />
              </div>

              <div style={styles.pmFormGroup}>
                <label style={styles.pmFormLabel}>Description</label>
                <textarea
                  style={styles.pmFormTextarea}
                  value={currentProduct.description}
                  onChange={(e) => handleProductChange('description', e.target.value)}
                  placeholder="Detailed description of the product"
                />
              </div>

              <div style={styles.pmFormRow}>
                <div style={styles.pmFormGroup}>
                  <label style={styles.pmFormLabel}>HSN Code</label>
                  <input
                    type="text"
                    style={styles.pmFormInput}
                    value={currentProduct.hsn_code}
                    onChange={(e) => handleProductChange('hsn_code', e.target.value)}
                    placeholder="e.g., 72142000"
                  />
                </div>
                <div style={styles.pmFormGroup}>
                  <label style={styles.pmFormLabel}>SKU / Product Code</label>
                  <input
                    type="text"
                    style={styles.pmFormInput}
                    value={currentProduct.sku}
                    onChange={(e) => handleProductChange('sku', e.target.value)}
                    placeholder="e.g., PRD001"
                  />
                </div>
              </div>

              <div style={styles.pmFormRow}>
                <div style={styles.pmFormGroup}>
                  <label style={styles.pmFormLabel}>Unit of Measurement</label>
                  <select
                    style={styles.pmFormSelect}
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
                <div style={styles.pmFormGroup}>
                  <label style={styles.pmFormLabel}>GST Rate (%)</label>
                  <select
                    style={styles.pmFormSelect}
                    value={currentProduct.gst_rate}
                    onChange={(e) => handleProductChange('gst_rate', parseFloat(e.target.value))}
                  >
                    <option value="0">0% - Exempt</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Standard)</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div style={styles.pmFormRow}>
                <div style={styles.pmFormGroup}>
                  <label style={styles.pmFormLabel}>Purchase Price</label>
                  <input
                    type="number"
                    style={styles.pmFormInput}
                    value={currentProduct.purchase_price}
                    onChange={(e) => handleProductChange('purchase_price', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Cost price"
                  />
                </div>
                <div style={styles.pmFormGroup}>
                  <label style={styles.pmFormLabel}>Selling Price</label>
                  <input
                    type="number"
                    style={styles.pmFormInput}
                    value={currentProduct.selling_price}
                    onChange={(e) => handleProductChange('selling_price', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Selling price / MRP"
                  />
                </div>
              </div>

              <div style={styles.pmInventorySection}>
                <div style={styles.pmCheckboxRow}>
                  <input
                    type="checkbox"
                    id="track_inventory"
                    checked={currentProduct.track_inventory}
                    onChange={(e) => handleProductChange('track_inventory', e.target.checked)}
                    style={styles.pmCheckbox}
                  />
                  <label htmlFor="track_inventory" style={styles.pmCheckboxLabel}>
                    <span style={styles.pmCheckboxTitle}>Enable Inventory Tracking</span>
                    <span style={styles.pmCheckboxDesc}>
                      Track stock levels and get low stock alerts
                    </span>
                  </label>
                </div>

                {currentProduct.track_inventory && (
                  <div style={styles.pmFormRow}>
                    <div style={styles.pmFormGroup}>
                      <label style={styles.pmFormLabel}>Opening Stock</label>
                      <input
                        type="number"
                        style={styles.pmFormInput}
                        value={currentProduct.current_stock}
                        onChange={(e) => handleProductChange('current_stock', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="Current stock quantity"
                        disabled={currentProduct.id}
                      />
                      {currentProduct.id && (
                        <small style={{ color: '#64748b', fontSize: '12px' }}>
                          Use Stock Adjustment to modify stock
                        </small>
                      )}
                    </div>
                    <div style={styles.pmFormGroup}>
                      <label style={styles.pmFormLabel}>Low Stock Alert Threshold</label>
                      <input
                        type="number"
                        style={styles.pmFormInput}
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
            <div style={styles.pmModalFooter}>
              <button style={styles.pmBtnSecondary} onClick={handleCancelForm}>
                Cancel
              </button>
              <button
                style={{...styles.pmBtnPrimary, opacity: loading ? 0.7 : 1}}
                onClick={handleSaveProduct}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductMaster;
