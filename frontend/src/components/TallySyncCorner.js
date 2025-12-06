import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { tallySyncAPI } from '../services/api';
import './Pages.css';

function TallySyncCorner() {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('connection');
  const [loading, setLoading] = useState(false);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    message: '',
    tallyVersion: '',
    companyName: ''
  });

  // Mapping state
  const [tallyLedgers, setTallyLedgers] = useState([]);
  const [ledgersLoading, setLedgersLoading] = useState(false);
  const [ledgersFetched, setLedgersFetched] = useState(false);
  const [mappings, setMappings] = useState({
    salesLedger: '',
    cgstLedger: '',
    sgstLedger: '',
    igstLedger: '',
    roundOffLedger: '',
    discountLedger: '',
    defaultPartyGroup: 'Sundry Debtors'
  });
  const [mappingSaved, setMappingSaved] = useState(false);

  // Sync state
  const [syncParams, setSyncParams] = useState({
    startDate: '',
    endDate: ''
  });
  const [syncProgress, setSyncProgress] = useState({
    inProgress: false,
    current: 0,
    total: 0,
    status: ''
  });
  const [syncHistory, setSyncHistory] = useState([]);

  // Load saved mappings and auto-check connection on mount
  useEffect(() => {
    loadMappings();
    loadSyncHistory();
    // Auto-check Tally connection silently on page load
    checkTallyConnectionSilent();
  }, []);

  const loadMappings = async () => {
    try {
      const response = await tallySyncAPI.getMappings();
      if (response.data && response.data.mappings) {
        setMappings(response.data.mappings);
        setMappingSaved(true);
        // If we have saved mappings, mark ledgers as fetched to show the mapping form
        setLedgersFetched(true);
      }
    } catch (err) {
      console.log('No saved mappings found');
    }
  };

  const loadSyncHistory = async () => {
    try {
      const response = await tallySyncAPI.getSyncHistory();
      setSyncHistory(response.data.history || []);
    } catch (err) {
      console.log('No sync history found');
    }
  };

  // Silent connection check (no error toasts, just updates status)
  const checkTallyConnectionSilent = async () => {
    try {
      const response = await tallySyncAPI.checkConnection();
      const result = response.data;
      setConnectionStatus({
        connected: result.connected,
        message: result.message,
        tallyVersion: result.tally_version || '',
        companyName: result.company_name || ''
      });

      // If connected, also fetch ledgers silently
      if (result.connected) {
        fetchTallyLedgersSilent();
      }
    } catch (err) {
      // Silent fail - just update status without showing error
      setConnectionStatus({
        connected: false,
        message: 'Tally not detected. Click "Test Connection" when Tally is running.',
        tallyVersion: '',
        companyName: ''
      });
    }
  };

  // Silent ledger fetch (no toasts)
  const fetchTallyLedgersSilent = async () => {
    try {
      const response = await tallySyncAPI.getTallyLedgers();
      const ledgers = response.data.ledgers || [];
      setTallyLedgers(ledgers);
      if (ledgers.length > 0) {
        setLedgersFetched(true);
      }
    } catch (err) {
      console.log('Silent ledger fetch failed');
    }
  };

  const checkTallyConnection = async () => {
    setLoading(true);
    try {
      const response = await tallySyncAPI.checkConnection();
      const result = response.data;
      setConnectionStatus({
        connected: result.connected,
        message: result.message,
        tallyVersion: result.tally_version || '',
        companyName: result.company_name || ''
      });

      if (result.connected) {
        showSuccess('Successfully connected to Tally!');
        // Fetch ledgers if connected
        fetchTallyLedgers();
      } else {
        showError(result.message || 'Failed to connect to Tally');
      }
    } catch (err) {
      setConnectionStatus({
        connected: false,
        message: 'Connection failed. Please ensure Tally is running with ODBC enabled on port 9000.',
        tallyVersion: '',
        companyName: ''
      });
      showError('Failed to connect to Tally. Check if ODBC is enabled.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTallyLedgers = async () => {
    setLedgersLoading(true);
    try {
      const response = await tallySyncAPI.getTallyLedgers();
      const ledgers = response.data.ledgers || [];
      setTallyLedgers(ledgers);
      setLedgersFetched(true);
      if (ledgers.length > 0) {
        showSuccess(`Fetched ${ledgers.length} ledgers from Tally`);
      } else {
        showError('No ledgers found. Using default options.');
      }
    } catch (err) {
      console.error('Error fetching Tally ledgers:', err);
      showError('Failed to fetch ledgers from Tally. Using default options.');
      setLedgersFetched(true); // Allow mapping with defaults
    } finally {
      setLedgersLoading(false);
    }
  };

  const handleMappingChange = (field, value) => {
    setMappings(prev => ({ ...prev, [field]: value }));
    setMappingSaved(false);
  };

  const saveMappings = async () => {
    setLoading(true);
    try {
      await tallySyncAPI.saveMappings(mappings);
      setMappingSaved(true);
      showSuccess('Mappings saved successfully!');
    } catch (err) {
      showError('Failed to save mappings');
    } finally {
      setLoading(false);
    }
  };

  const syncInvoicesToTally = async () => {
    if (!syncParams.startDate || !syncParams.endDate) {
      showError('Please select both start and end dates');
      return;
    }

    if (!mappingSaved) {
      showError('Please save your ledger mappings first');
      return;
    }

    setSyncProgress({ inProgress: true, current: 0, total: 0, status: 'Preparing...' });
    setLoading(true);

    try {
      const response = await tallySyncAPI.syncInvoices(syncParams.startDate, syncParams.endDate);
      const result = response.data;

      setSyncProgress({
        inProgress: false,
        current: result.synced_count || 0,
        total: result.total_count || 0,
        status: 'Completed'
      });

      if (result.success) {
        showSuccess(`Successfully synced ${result.synced_count} invoices to Tally!`);
        loadSyncHistory();
      } else {
        showError(result.message || 'Sync completed with errors');
      }
    } catch (err) {
      setSyncProgress({ inProgress: false, current: 0, total: 0, status: 'Failed' });
      showError('Failed to sync invoices to Tally');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="settings-layout">
        {/* Sidebar Tabs */}
        <div className="settings-sidebar">
          <button
            className={`settings-tab ${activeTab === 'connection' ? 'active' : ''}`}
            onClick={() => setActiveTab('connection')}
          >
            <span className="tab-icon">🔗</span>
            Connection
          </button>
          <button
            className={`settings-tab ${activeTab === 'mapping' ? 'active' : ''}`}
            onClick={() => setActiveTab('mapping')}
          >
            <span className="tab-icon">🗺️</span>
            Ledger Mapping
          </button>
          <button
            className={`settings-tab ${activeTab === 'sync' ? 'active' : ''}`}
            onClick={() => setActiveTab('sync')}
          >
            <span className="tab-icon">🔄</span>
            Sync Invoices
          </button>
          <button
            className={`settings-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span className="tab-icon">📜</span>
            Sync History
          </button>
        </div>

        {/* Content Area */}
        <div className="settings-content">
          <div className="content-card">
            {/* Connection Tab */}
            {activeTab === 'connection' && (
              <div className="settings-section">
                <h2 className="section-title">Tally Connection</h2>

                {/* Requirements Box */}
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '1px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ color: '#92400e', marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
                    Pre-Requirements for Tally Sync
                  </h3>
                  <ol style={{ color: '#78350f', fontSize: '14px', paddingLeft: '20px', lineHeight: '2' }}>
                    <li>Open <strong>Tally Prime</strong> or <strong>Tally ERP 9</strong> on your computer</li>
                    <li>Open the <strong>company</strong> you want to sync invoices with</li>
                    <li>Enable ODBC Server:
                      <ul style={{ marginTop: '8px', marginLeft: '16px' }}>
                        <li>In Tally Prime: Go to <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '3px' }}>Help → Settings → Connectivity</code></li>
                        <li>Enable <strong>Tally.NET Server</strong> and <strong>ODBC Server</strong></li>
                        <li>Set ODBC Port to <strong>9000</strong></li>
                      </ul>
                    </li>
                    <li>Ensure your firewall allows connections on port <strong>9000</strong></li>
                    <li>The Tally application must remain open during sync</li>
                  </ol>
                </div>

                {/* Connection Status Card */}
                <div style={{
                  background: connectionStatus.connected
                    ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                    : '#f8f9fa',
                  border: connectionStatus.connected ? '1px solid #10b981' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: connectionStatus.connected ? '#10b981' : '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px'
                    }}>
                      {connectionStatus.connected ? '✓' : '○'}
                    </div>
                    <div>
                      <h3 style={{
                        margin: 0,
                        color: connectionStatus.connected ? '#065f46' : '#374151',
                        fontSize: '18px'
                      }}>
                        {connectionStatus.connected ? 'Connected to Tally' : 'Not Connected'}
                      </h3>
                      <p style={{
                        margin: '4px 0 0 0',
                        color: connectionStatus.connected ? '#047857' : '#6b7280',
                        fontSize: '14px'
                      }}>
                        {connectionStatus.message || 'Click "Test Connection" to check Tally connectivity'}
                      </p>
                    </div>
                  </div>

                  {connectionStatus.connected && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      marginTop: '16px',
                      padding: '16px',
                      background: 'rgba(255,255,255,0.5)',
                      borderRadius: '8px'
                    }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#065f46', fontWeight: '500' }}>Tally Version</label>
                        <p style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#047857', fontWeight: '600' }}>
                          {connectionStatus.tallyVersion || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#065f46', fontWeight: '500' }}>Company Name</label>
                        <p style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#047857', fontWeight: '600' }}>
                          {connectionStatus.companyName || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="btn-create"
                  onClick={checkTallyConnection}
                  disabled={loading}
                  style={{ minWidth: '200px' }}
                >
                  <span className="btn-icon">{loading ? '⏳' : '🔌'}</span>
                  {loading ? 'Checking...' : 'Test Connection'}
                </button>
              </div>
            )}

            {/* Mapping Tab */}
            {activeTab === 'mapping' && (
              <div className="settings-section">
                <h2 className="section-title">Chart of Accounts Mapping</h2>

                {!connectionStatus.connected ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: '#fef3c7',
                    borderRadius: '12px',
                    border: '1px solid #f59e0b'
                  }}>
                    <span style={{ fontSize: '48px' }}>⚠️</span>
                    <h3 style={{ color: '#92400e', marginTop: '16px' }}>Connection Required</h3>
                    <p style={{ color: '#78350f' }}>
                      Please connect to Tally first to fetch available ledgers for mapping.
                    </p>
                    <button
                      className="btn-create"
                      onClick={() => setActiveTab('connection')}
                      style={{ marginTop: '16px' }}
                    >
                      Go to Connection
                    </button>
                  </div>
                ) : !ledgersFetched ? (
                  // Step 1: Fetch Ledgers from Tally
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                    borderRadius: '12px',
                    border: '1px solid #8b5cf6'
                  }}>
                    <span style={{ fontSize: '64px' }}>📚</span>
                    <h3 style={{ color: '#5b21b6', marginTop: '16px', fontSize: '20px' }}>
                      Import Chart of Accounts from Tally
                    </h3>
                    <p style={{ color: '#6d28d9', marginTop: '8px', maxWidth: '500px', margin: '8px auto 24px' }}>
                      First, we need to fetch your Chart of Accounts (ledgers) from Tally.
                      This allows you to map NexInvo accounts to your actual Tally ledgers.
                    </p>

                    {ledgersLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          border: '3px solid #e5e7eb',
                          borderTop: '3px solid #8b5cf6',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        <span style={{ color: '#5b21b6', fontWeight: '500' }}>Fetching ledgers from Tally...</span>
                      </div>
                    ) : (
                      <button
                        className="btn-create"
                        onClick={fetchTallyLedgers}
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                          padding: '14px 32px',
                          fontSize: '16px'
                        }}
                      >
                        <span className="btn-icon">📥</span>
                        Fetch Ledgers from Tally
                      </button>
                    )}

                    <div style={{
                      marginTop: '24px',
                      padding: '16px',
                      background: 'rgba(255,255,255,0.6)',
                      borderRadius: '8px',
                      textAlign: 'left'
                    }}>
                      <p style={{ color: '#5b21b6', fontSize: '13px', margin: 0 }}>
                        <strong>Note:</strong> Make sure your Tally company is open with ledgers already created for:
                      </p>
                      <ul style={{ color: '#6d28d9', fontSize: '13px', margin: '8px 0 0 0', paddingLeft: '20px' }}>
                        <li>Sales Accounts (e.g., Sales, Service Income)</li>
                        <li>Tax Ledgers (CGST, SGST, IGST)</li>
                        <li>Round Off and Discount ledgers (optional)</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Ledger Summary */}
                    <div style={{
                      padding: '12px 16px',
                      background: '#ede9fe',
                      border: '1px solid #8b5cf6',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ color: '#5b21b6', fontWeight: '500' }}>
                        📚 {tallyLedgers.length > 0 ? `${tallyLedgers.length} ledgers loaded from Tally` : 'Using default ledger options'}
                      </span>
                      <button
                        onClick={fetchTallyLedgers}
                        disabled={ledgersLoading}
                        style={{
                          background: 'none',
                          border: '1px solid #8b5cf6',
                          color: '#5b21b6',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        {ledgersLoading ? '⏳ Refreshing...' : '🔄 Refresh'}
                      </button>
                    </div>

                    {mappingSaved && (
                      <div style={{
                        padding: '12px 16px',
                        background: '#d1fae5',
                        border: '1px solid #10b981',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '20px' }}>✓</span>
                        <span style={{ color: '#065f46', fontWeight: '500' }}>
                          Mappings are saved. You can proceed to sync invoices.
                        </span>
                      </div>
                    )}

                    <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                      Map your NexInvo accounts to corresponding Tally ledgers. This mapping will be saved and used for all future syncs.
                    </p>

                    <div className="form-grid">
                      {/* Sales Ledger */}
                      <div className="form-field">
                        <label>Sales Ledger *</label>
                        {tallyLedgers.length > 0 ? (
                          <select
                            className="form-input"
                            value={mappings.salesLedger}
                            onChange={(e) => handleMappingChange('salesLedger', e.target.value)}
                          >
                            <option value="">Select Sales Ledger</option>
                            <optgroup label="Sales Accounts">
                              {tallyLedgers.filter(l => l.group === 'Sales Accounts' || l.group === 'Revenue (Indirect Incomes)').map(ledger => (
                                <option key={ledger.name} value={ledger.name}>{ledger.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="All Ledgers">
                              {tallyLedgers.map(ledger => (
                                <option key={`all-${ledger.name}`} value={ledger.name}>{ledger.name} ({ledger.group})</option>
                              ))}
                            </optgroup>
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={mappings.salesLedger}
                            onChange={(e) => handleMappingChange('salesLedger', e.target.value)}
                            placeholder="Enter Sales ledger name (e.g., Sales)"
                          />
                        )}
                        <small style={{ color: '#6b7280' }}>Ledger for invoice sales amount</small>
                      </div>

                      {/* CGST Ledger */}
                      <div className="form-field">
                        <label>CGST Ledger *</label>
                        {tallyLedgers.length > 0 ? (
                          <select
                            className="form-input"
                            value={mappings.cgstLedger}
                            onChange={(e) => handleMappingChange('cgstLedger', e.target.value)}
                          >
                            <option value="">Select CGST Ledger</option>
                            <optgroup label="Duties & Taxes">
                              {tallyLedgers.filter(l => l.group === 'Duties & Taxes' || l.group?.toLowerCase().includes('tax')).map(ledger => (
                                <option key={ledger.name} value={ledger.name}>{ledger.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="All Ledgers">
                              {tallyLedgers.map(ledger => (
                                <option key={`all-${ledger.name}`} value={ledger.name}>{ledger.name} ({ledger.group})</option>
                              ))}
                            </optgroup>
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={mappings.cgstLedger}
                            onChange={(e) => handleMappingChange('cgstLedger', e.target.value)}
                            placeholder="Enter CGST ledger name"
                          />
                        )}
                        <small style={{ color: '#6b7280' }}>Central GST for intra-state sales</small>
                      </div>

                      {/* SGST Ledger */}
                      <div className="form-field">
                        <label>SGST Ledger *</label>
                        {tallyLedgers.length > 0 ? (
                          <select
                            className="form-input"
                            value={mappings.sgstLedger}
                            onChange={(e) => handleMappingChange('sgstLedger', e.target.value)}
                          >
                            <option value="">Select SGST Ledger</option>
                            <optgroup label="Duties & Taxes">
                              {tallyLedgers.filter(l => l.group === 'Duties & Taxes' || l.group?.toLowerCase().includes('tax')).map(ledger => (
                                <option key={ledger.name} value={ledger.name}>{ledger.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="All Ledgers">
                              {tallyLedgers.map(ledger => (
                                <option key={`all-${ledger.name}`} value={ledger.name}>{ledger.name} ({ledger.group})</option>
                              ))}
                            </optgroup>
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={mappings.sgstLedger}
                            onChange={(e) => handleMappingChange('sgstLedger', e.target.value)}
                            placeholder="Enter SGST ledger name"
                          />
                        )}
                        <small style={{ color: '#6b7280' }}>State GST for intra-state sales</small>
                      </div>

                      {/* IGST Ledger */}
                      <div className="form-field">
                        <label>IGST Ledger *</label>
                        {tallyLedgers.length > 0 ? (
                          <select
                            className="form-input"
                            value={mappings.igstLedger}
                            onChange={(e) => handleMappingChange('igstLedger', e.target.value)}
                          >
                            <option value="">Select IGST Ledger</option>
                            <optgroup label="Duties & Taxes">
                              {tallyLedgers.filter(l => l.group === 'Duties & Taxes' || l.group?.toLowerCase().includes('tax')).map(ledger => (
                                <option key={ledger.name} value={ledger.name}>{ledger.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="All Ledgers">
                              {tallyLedgers.map(ledger => (
                                <option key={`all-${ledger.name}`} value={ledger.name}>{ledger.name} ({ledger.group})</option>
                              ))}
                            </optgroup>
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={mappings.igstLedger}
                            onChange={(e) => handleMappingChange('igstLedger', e.target.value)}
                            placeholder="Enter IGST ledger name"
                          />
                        )}
                        <small style={{ color: '#6b7280' }}>Integrated GST for inter-state sales</small>
                      </div>

                      {/* Round Off Ledger */}
                      <div className="form-field">
                        <label>Round Off Ledger</label>
                        {tallyLedgers.length > 0 ? (
                          <select
                            className="form-input"
                            value={mappings.roundOffLedger}
                            onChange={(e) => handleMappingChange('roundOffLedger', e.target.value)}
                          >
                            <option value="">Select Round Off Ledger (Optional)</option>
                            <optgroup label="Indirect Expenses/Incomes">
                              {tallyLedgers.filter(l => l.group === 'Indirect Expenses' || l.group === 'Indirect Incomes').map(ledger => (
                                <option key={ledger.name} value={ledger.name}>{ledger.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="All Ledgers">
                              {tallyLedgers.map(ledger => (
                                <option key={`all-${ledger.name}`} value={ledger.name}>{ledger.name} ({ledger.group})</option>
                              ))}
                            </optgroup>
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={mappings.roundOffLedger}
                            onChange={(e) => handleMappingChange('roundOffLedger', e.target.value)}
                            placeholder="Enter Round Off ledger name (optional)"
                          />
                        )}
                        <small style={{ color: '#6b7280' }}>For rounding adjustments</small>
                      </div>

                      {/* Discount Ledger */}
                      <div className="form-field">
                        <label>Discount Ledger</label>
                        {tallyLedgers.length > 0 ? (
                          <select
                            className="form-input"
                            value={mappings.discountLedger}
                            onChange={(e) => handleMappingChange('discountLedger', e.target.value)}
                          >
                            <option value="">Select Discount Ledger (Optional)</option>
                            <optgroup label="Indirect Expenses">
                              {tallyLedgers.filter(l => l.group === 'Indirect Expenses').map(ledger => (
                                <option key={ledger.name} value={ledger.name}>{ledger.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="All Ledgers">
                              {tallyLedgers.map(ledger => (
                                <option key={`all-${ledger.name}`} value={ledger.name}>{ledger.name} ({ledger.group})</option>
                              ))}
                            </optgroup>
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={mappings.discountLedger}
                            onChange={(e) => handleMappingChange('discountLedger', e.target.value)}
                            placeholder="Enter Discount ledger name (optional)"
                          />
                        )}
                        <small style={{ color: '#6b7280' }}>For invoice discounts</small>
                      </div>

                      {/* Default Party Group */}
                      <div className="form-field full-width">
                        <label>Default Party Group *</label>
                        <select
                          className="form-input"
                          value={mappings.defaultPartyGroup}
                          onChange={(e) => handleMappingChange('defaultPartyGroup', e.target.value)}
                        >
                          <option value="Sundry Debtors">Sundry Debtors</option>
                          <option value="Trade Receivables">Trade Receivables</option>
                          <option value="Sundry Creditors">Sundry Creditors</option>
                        </select>
                        <small style={{ color: '#6b7280' }}>
                          Group under which new client ledgers will be created in Tally
                        </small>
                      </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '24px' }}>
                      <button
                        className="btn-create"
                        onClick={saveMappings}
                        disabled={loading}
                      >
                        <span className="btn-icon">{loading ? '⏳' : '💾'}</span>
                        {loading ? 'Saving...' : 'Save Mappings'}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={fetchTallyLedgers}
                        disabled={loading}
                      >
                        <span className="btn-icon">🔄</span>
                        Refresh Ledgers
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sync Tab */}
            {activeTab === 'sync' && (
              <div className="settings-section">
                <h2 className="section-title">Sync Invoices to Tally</h2>

                {!connectionStatus.connected ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: '#fef3c7',
                    borderRadius: '12px',
                    border: '1px solid #f59e0b'
                  }}>
                    <span style={{ fontSize: '48px' }}>⚠️</span>
                    <h3 style={{ color: '#92400e', marginTop: '16px' }}>Connection Required</h3>
                    <p style={{ color: '#78350f' }}>
                      Please connect to Tally first before syncing invoices.
                    </p>
                    <button
                      className="btn-create"
                      onClick={() => setActiveTab('connection')}
                      style={{ marginTop: '16px' }}
                    >
                      Go to Connection
                    </button>
                  </div>
                ) : !mappingSaved ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: '#fef3c7',
                    borderRadius: '12px',
                    border: '1px solid #f59e0b'
                  }}>
                    <span style={{ fontSize: '48px' }}>🗺️</span>
                    <h3 style={{ color: '#92400e', marginTop: '16px' }}>Mapping Required</h3>
                    <p style={{ color: '#78350f' }}>
                      Please complete the ledger mapping before syncing invoices.
                    </p>
                    <button
                      className="btn-create"
                      onClick={() => setActiveTab('mapping')}
                      style={{ marginTop: '16px' }}
                    >
                      Go to Mapping
                    </button>
                  </div>
                ) : (
                  <>
                    <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                      Select the date range for invoices you want to export to Tally. Only Tax Invoices with "Sent" or "Paid" status will be synced.
                    </p>

                    {/* Date Range Selection */}
                    <div style={{
                      background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                      border: '1px solid #8b5cf6',
                      borderRadius: '12px',
                      padding: '24px',
                      marginBottom: '24px'
                    }}>
                      <h3 style={{ color: '#5b21b6', marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
                        Select Invoice Period
                      </h3>
                      <div className="form-grid">
                        <div className="form-field">
                          <label style={{ color: '#5b21b6', fontWeight: '500' }}>Start Date *</label>
                          <input
                            type="date"
                            className="form-input"
                            value={syncParams.startDate}
                            onChange={(e) => setSyncParams({ ...syncParams, startDate: e.target.value })}
                            style={{ background: 'white' }}
                          />
                        </div>
                        <div className="form-field">
                          <label style={{ color: '#5b21b6', fontWeight: '500' }}>End Date *</label>
                          <input
                            type="date"
                            className="form-input"
                            value={syncParams.endDate}
                            onChange={(e) => setSyncParams({ ...syncParams, endDate: e.target.value })}
                            style={{ background: 'white' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sync Progress */}
                    {syncProgress.inProgress && (
                      <div style={{
                        background: '#eff6ff',
                        border: '1px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '24px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                          <div className="spinner" style={{
                            width: '32px',
                            height: '32px',
                            border: '3px solid #e5e7eb',
                            borderTop: '3px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          <div>
                            <h4 style={{ margin: 0, color: '#1e40af' }}>Syncing Invoices...</h4>
                            <p style={{ margin: '4px 0 0 0', color: '#3b82f6', fontSize: '14px' }}>
                              {syncProgress.status}
                            </p>
                          </div>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: syncProgress.total > 0 ? `${(syncProgress.current / syncProgress.total) * 100}%` : '50%',
                            height: '100%',
                            background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                        <p style={{ textAlign: 'center', marginTop: '8px', color: '#6b7280', fontSize: '14px' }}>
                          {syncProgress.current} / {syncProgress.total} invoices processed
                        </p>
                      </div>
                    )}

                    {/* Sync Button */}
                    <button
                      className="btn-create"
                      onClick={syncInvoicesToTally}
                      disabled={loading || syncProgress.inProgress}
                      style={{
                        minWidth: '250px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        fontSize: '16px',
                        padding: '14px 28px'
                      }}
                    >
                      <span className="btn-icon">{loading || syncProgress.inProgress ? '⏳' : '🚀'}</span>
                      {loading || syncProgress.inProgress ? 'Syncing...' : 'Start Sync to Tally'}
                    </button>

                    {/* Info Box */}
                    <div style={{
                      marginTop: '24px',
                      padding: '16px',
                      background: '#f0f9ff',
                      border: '1px solid #0ea5e9',
                      borderRadius: '8px'
                    }}>
                      <h4 style={{ color: '#0369a1', marginBottom: '8px', fontSize: '14px' }}>What happens during sync?</h4>
                      <ul style={{ color: '#0c4a6e', fontSize: '13px', paddingLeft: '20px', lineHeight: '1.8', margin: 0 }}>
                        <li>Sales vouchers are created in Tally for each invoice</li>
                        <li>Client ledgers are automatically created if they don't exist</li>
                        <li>GST entries (CGST/SGST or IGST) are added based on state</li>
                        <li>Invoices are marked as "Synced" to prevent duplicate posting</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="settings-section">
                <h2 className="section-title">Sync History</h2>

                {syncHistory.length === 0 ? (
                  <div style={{
                    padding: '60px 40px',
                    textAlign: 'center',
                    background: '#f8f9fa',
                    borderRadius: '12px'
                  }}>
                    <span style={{ fontSize: '64px' }}>📜</span>
                    <h3 style={{ color: '#374151', marginTop: '16px' }}>No Sync History</h3>
                    <p style={{ color: '#6b7280' }}>
                      Your invoice sync history will appear here after you complete your first sync.
                    </p>
                  </div>
                ) : (
                  <div className="data-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date & Time</th>
                          <th>Period</th>
                          <th>Invoices Synced</th>
                          <th>Status</th>
                          <th>User</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncHistory.map((record, index) => (
                          <tr key={index}>
                            <td>{new Date(record.sync_date).toLocaleString()}</td>
                            <td>{record.start_date} to {record.end_date}</td>
                            <td style={{ fontWeight: '600' }}>{record.invoices_synced}</td>
                            <td>
                              <span className={`status-badge status-${record.status === 'success' ? 'active' : 'inactive'}`}>
                                {record.status === 'success' ? '✓ Success' : '✗ Failed'}
                              </span>
                            </td>
                            <td>{record.user}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button
                  className="btn-secondary"
                  onClick={loadSyncHistory}
                  style={{ marginTop: '16px' }}
                >
                  <span className="btn-icon">🔄</span>
                  Refresh History
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default TallySyncCorner;
