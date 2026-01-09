import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from './Toast';
import { tallySyncAPI } from '../services/api';
import api from '../services/api';
import './Pages.css';

function TallySyncCorner() {
  const { showSuccess, showError, showInfo } = useToast();
  const [activeTab, setActiveTab] = useState('connection');
  const [loading, setLoading] = useState(false);

  // Connection state - now for Setu connector
  const [setuStatus, setSetuStatus] = useState({
    connected: false,
    tallyConnected: false,
    companyName: '',
    message: 'Checking Setu connector status...'
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
    endDate: '',
    forceResync: false
  });
  const [syncProgress, setSyncProgress] = useState({
    inProgress: false,
    current: 0,
    total: 0,
    status: ''
  });
  const [syncHistory, setSyncHistory] = useState([]);

  // WebSocket for real-time Setu status
  const [ws, setWs] = useState(null);

  // Check Setu connector status
  const checkSetuStatus = useCallback(async () => {
    try {
      const response = await api.get('/setu/status/');
      const data = response.data;

      setSetuStatus({
        connected: data.setu_connected || false,
        tallyConnected: data.tally_connected || false,
        companyName: data.company_name || '',
        message: data.message || ''
      });

      if (data.tally_connected && data.company_name) {
        // If Tally is connected via Setu, fetch ledgers
        fetchTallyLedgersSilent();
      }
    } catch (err) {
      setSetuStatus({
        connected: false,
        tallyConnected: false,
        companyName: '',
        message: 'Cannot check Setu status. Please ensure Setu app is running.'
      });
    }
  }, []);

  // Load saved mappings and status on mount
  useEffect(() => {
    loadMappings();
    loadSyncHistory();
    checkSetuStatus();

    // Poll for Setu status every 10 seconds
    const interval = setInterval(checkSetuStatus, 10000);
    return () => clearInterval(interval);
  }, [checkSetuStatus]);

  const loadMappings = async () => {
    try {
      const response = await tallySyncAPI.getMappings();
      if (response.data && response.data.mappings) {
        setMappings(response.data.mappings);
        setMappingSaved(true);
        setLedgersFetched(true);
      }
    } catch (err) {
      // No saved mappings - expected on first load
    }
  };

  const loadSyncHistory = async () => {
    try {
      const response = await tallySyncAPI.getSyncHistory();
      setSyncHistory(response.data.history || []);
    } catch (err) {
      // No sync history - expected on first use
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
      // Silent ledger fetch failed
    }
  };

  const refreshSetuStatus = async () => {
    setLoading(true);
    try {
      await checkSetuStatus();
      if (setuStatus.connected && setuStatus.tallyConnected) {
        showSuccess('Setu connector is online and Tally is connected!');
      } else if (setuStatus.connected) {
        showInfo('Setu connector is online but Tally is not connected. Check Tally in Setu app.');
      } else {
        showError('Setu connector is offline. Please start the Setu desktop app.');
      }
    } catch (err) {
      showError('Failed to check Setu status');
    } finally {
      setLoading(false);
    }
  };

  // Auto-map ledgers based on common names
  const autoMapLedgers = (ledgers) => {
    const findLedger = (keywords, group = null) => {
      // First try exact match with group
      for (const keyword of keywords) {
        const found = ledgers.find(l =>
          l.name.toLowerCase() === keyword.toLowerCase() &&
          (!group || l.group.toLowerCase().includes(group.toLowerCase()))
        );
        if (found) return found.name;
      }
      // Then try partial match
      for (const keyword of keywords) {
        const found = ledgers.find(l =>
          l.name.toLowerCase().includes(keyword.toLowerCase()) &&
          (!group || l.group.toLowerCase().includes(group.toLowerCase()))
        );
        if (found) return found.name;
      }
      return '';
    };

    const autoMappings = {
      salesLedger: findLedger(['sales', 'sales account', 'sales a/c'], 'sales'),
      cgstLedger: findLedger(['cgst', 'cgst output', 'output cgst', 'cgst payable'], 'duties'),
      sgstLedger: findLedger(['sgst', 'sgst output', 'output sgst', 'sgst payable'], 'duties'),
      igstLedger: findLedger(['igst', 'igst output', 'output igst', 'igst payable'], 'duties'),
      roundOffLedger: findLedger(['round off', 'roundoff', 'rounding off']),
      discountLedger: findLedger(['discount', 'discount allowed', 'sales discount']),
      defaultPartyGroup: 'Sundry Debtors'
    };

    return autoMappings;
  };

  const fetchTallyLedgers = async () => {
    if (!setuStatus.tallyConnected) {
      showError('Tally is not connected. Please check Setu app.');
      return;
    }

    setLedgersLoading(true);
    try {
      const response = await tallySyncAPI.getTallyLedgers();
      const ledgers = response.data.ledgers || [];
      setTallyLedgers(ledgers);
      setLedgersFetched(true);
      if (ledgers.length > 0) {
        showSuccess(`Fetched ${ledgers.length} ledgers from Tally`);

        // Auto-map ledgers if no mappings are saved
        if (!mappingSaved) {
          const autoMappings = autoMapLedgers(ledgers);
          setMappings(prev => ({
            ...prev,
            salesLedger: prev.salesLedger || autoMappings.salesLedger,
            cgstLedger: prev.cgstLedger || autoMappings.cgstLedger,
            sgstLedger: prev.sgstLedger || autoMappings.sgstLedger,
            igstLedger: prev.igstLedger || autoMappings.igstLedger,
            roundOffLedger: prev.roundOffLedger || autoMappings.roundOffLedger,
            discountLedger: prev.discountLedger || autoMappings.discountLedger,
            defaultPartyGroup: prev.defaultPartyGroup || autoMappings.defaultPartyGroup
          }));
          if (autoMappings.salesLedger || autoMappings.cgstLedger) {
            showInfo('Ledgers auto-mapped based on Tally data. Please verify and save.');
          }
        }
      } else {
        showError('No ledgers found. Using default options.');
      }
    } catch (err) {
      console.error('Error fetching Tally ledgers:', err);
      showError('Failed to fetch ledgers from Tally. Using default options.');
      setLedgersFetched(true);
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

    if (!setuStatus.tallyConnected) {
      showError('Tally is not connected. Please check Setu app.');
      return;
    }

    setSyncProgress({ inProgress: true, current: 0, total: 0, status: 'Preparing...' });
    setLoading(true);

    try {
      const response = await tallySyncAPI.syncInvoices(syncParams.startDate, syncParams.endDate, syncParams.forceResync);
      const result = response.data;

      setSyncProgress({
        inProgress: false,
        current: result.synced_count || 0,
        total: result.total_count || 0,
        status: 'Completed'
      });

      if (result.success) {
        if (result.skipped_existing > 0) {
          showSuccess(`Synced ${result.synced_count} invoices. ${result.skipped_existing} already exist in Tally.`);
        } else {
          showSuccess(`Successfully synced ${result.synced_count} invoices to Tally!`);
        }
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
                <h2 className="section-title">Setu Connector Status</h2>

                {/* Setu Info Box */}
                <div style={{
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  border: '1px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ color: '#1e40af', marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
                    How Tally Sync Works
                  </h3>
                  <ol style={{ color: '#1e3a8a', fontSize: '14px', paddingLeft: '20px', lineHeight: '2' }}>
                    <li>Download and install the <strong>Setu Desktop Connector</strong> on your computer</li>
                    <li>Open <strong>Setu</strong> and log in with your NexInvo credentials</li>
                    <li>Open <strong>Tally Prime</strong> with your company and enable ODBC Server (port 9000)</li>
                    <li>Setu will automatically connect to Tally and sync status will appear below</li>
                  </ol>
                  <p style={{ color: '#1e40af', fontSize: '13px', marginTop: '12px', fontStyle: 'italic' }}>
                    Note: Tally runs on your local computer, so the Setu connector bridges your browser with Tally.
                  </p>
                </div>

                {/* Setu Connector Status Card */}
                <div style={{
                  background: setuStatus.connected && setuStatus.tallyConnected
                    ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                    : setuStatus.connected
                    ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                    : '#f8f9fa',
                  border: setuStatus.connected && setuStatus.tallyConnected
                    ? '1px solid #10b981'
                    : setuStatus.connected
                    ? '1px solid #f59e0b'
                    : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '24px'
                }}>
                  {/* Setu Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: setuStatus.connected ? '#3b82f6' : '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      color: 'white'
                    }}>
                      {setuStatus.connected ? '🔌' : '○'}
                    </div>
                    <div>
                      <h3 style={{
                        margin: 0,
                        color: setuStatus.connected ? '#1e40af' : '#374151',
                        fontSize: '18px'
                      }}>
                        Setu Connector: {setuStatus.connected ? 'Online' : 'Offline'}
                      </h3>
                      <p style={{
                        margin: '4px 0 0 0',
                        color: setuStatus.connected ? '#3b82f6' : '#6b7280',
                        fontSize: '14px'
                      }}>
                        {setuStatus.connected ? 'Desktop connector is running' : 'Please start Setu desktop app'}
                      </p>
                    </div>
                  </div>

                  {/* Tally Status (only show if Setu is connected) */}
                  {setuStatus.connected && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      background: 'rgba(255,255,255,0.5)',
                      borderRadius: '8px',
                      marginTop: '16px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: setuStatus.tallyConnected ? '#10b981' : '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                      }}>
                        {setuStatus.tallyConnected ? '✓' : '!'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          margin: 0,
                          color: setuStatus.tallyConnected ? '#065f46' : '#92400e',
                          fontSize: '16px'
                        }}>
                          Tally: {setuStatus.tallyConnected ? 'Connected' : 'Not Connected'}
                        </h4>
                        <p style={{
                          margin: '2px 0 0 0',
                          color: setuStatus.tallyConnected ? '#047857' : '#b45309',
                          fontSize: '14px'
                        }}>
                          {setuStatus.tallyConnected
                            ? setuStatus.companyName || 'Connected to Tally'
                            : 'Check Tally connection in Setu app'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="btn-create"
                  onClick={refreshSetuStatus}
                  disabled={loading}
                  style={{ minWidth: '200px' }}
                >
                  <span className="btn-icon">{loading ? '⏳' : '🔄'}</span>
                  {loading ? 'Checking...' : 'Refresh Status'}
                </button>

                {/* Download Setu link */}
                {!setuStatus.connected && (
                  <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    background: '#eff6ff',
                    border: '1px solid #3b82f6',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#1e40af', marginBottom: '12px' }}>
                      Don't have Setu installed?
                    </p>
                    <a
                      href="/downloads/setu-setup.exe"
                      className="btn-create"
                      style={{ textDecoration: 'none', display: 'inline-block' }}
                    >
                      <span className="btn-icon">📥</span>
                      Download Setu Connector
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Mapping Tab */}
            {activeTab === 'mapping' && (
              <div className="settings-section">
                <h2 className="section-title">Chart of Accounts Mapping</h2>

                {!setuStatus.tallyConnected ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: '#fef3c7',
                    borderRadius: '12px',
                    border: '1px solid #f59e0b'
                  }}>
                    <span style={{ fontSize: '48px' }}>⚠️</span>
                    <h3 style={{ color: '#92400e', marginTop: '16px' }}>Tally Connection Required</h3>
                    <p style={{ color: '#78350f' }}>
                      {!setuStatus.connected
                        ? 'Please start the Setu desktop app and connect to Tally.'
                        : 'Setu is online but Tally is not connected. Check Tally in Setu app.'}
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
                      Fetch your Chart of Accounts (ledgers) from Tally via Setu connector.
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
                      Map your NexInvo accounts to corresponding Tally ledgers.
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

                      {/* Tax Ledgers */}
                      <div className="form-field">
                        <label>CGST Ledger *</label>
                        {tallyLedgers.length > 0 ? (
                          <select className="form-input" value={mappings.cgstLedger} onChange={(e) => handleMappingChange('cgstLedger', e.target.value)}>
                            <option value="">Select CGST Ledger</option>
                            {tallyLedgers.map(ledger => (<option key={ledger.name} value={ledger.name}>{ledger.name}</option>))}
                          </select>
                        ) : (
                          <input type="text" className="form-input" value={mappings.cgstLedger} onChange={(e) => handleMappingChange('cgstLedger', e.target.value)} placeholder="Enter CGST ledger name" />
                        )}
                      </div>

                      <div className="form-field">
                        <label>SGST Ledger *</label>
                        {tallyLedgers.length > 0 ? (
                          <select className="form-input" value={mappings.sgstLedger} onChange={(e) => handleMappingChange('sgstLedger', e.target.value)}>
                            <option value="">Select SGST Ledger</option>
                            {tallyLedgers.map(ledger => (<option key={ledger.name} value={ledger.name}>{ledger.name}</option>))}
                          </select>
                        ) : (
                          <input type="text" className="form-input" value={mappings.sgstLedger} onChange={(e) => handleMappingChange('sgstLedger', e.target.value)} placeholder="Enter SGST ledger name" />
                        )}
                      </div>

                      <div className="form-field">
                        <label>IGST Ledger *</label>
                        {tallyLedgers.length > 0 ? (
                          <select className="form-input" value={mappings.igstLedger} onChange={(e) => handleMappingChange('igstLedger', e.target.value)}>
                            <option value="">Select IGST Ledger</option>
                            {tallyLedgers.map(ledger => (<option key={ledger.name} value={ledger.name}>{ledger.name}</option>))}
                          </select>
                        ) : (
                          <input type="text" className="form-input" value={mappings.igstLedger} onChange={(e) => handleMappingChange('igstLedger', e.target.value)} placeholder="Enter IGST ledger name" />
                        )}
                      </div>

                      <div className="form-field">
                        <label>Round Off Ledger</label>
                        {tallyLedgers.length > 0 ? (
                          <select className="form-input" value={mappings.roundOffLedger} onChange={(e) => handleMappingChange('roundOffLedger', e.target.value)}>
                            <option value="">Select Round Off Ledger (Optional)</option>
                            {tallyLedgers.map(ledger => (<option key={ledger.name} value={ledger.name}>{ledger.name}</option>))}
                          </select>
                        ) : (
                          <input type="text" className="form-input" value={mappings.roundOffLedger} onChange={(e) => handleMappingChange('roundOffLedger', e.target.value)} placeholder="Round Off ledger (optional)" />
                        )}
                      </div>

                      <div className="form-field">
                        <label>Discount Ledger</label>
                        {tallyLedgers.length > 0 ? (
                          <select className="form-input" value={mappings.discountLedger} onChange={(e) => handleMappingChange('discountLedger', e.target.value)}>
                            <option value="">Select Discount Ledger (Optional)</option>
                            {tallyLedgers.map(ledger => (<option key={ledger.name} value={ledger.name}>{ledger.name}</option>))}
                          </select>
                        ) : (
                          <input type="text" className="form-input" value={mappings.discountLedger} onChange={(e) => handleMappingChange('discountLedger', e.target.value)} placeholder="Discount ledger (optional)" />
                        )}
                      </div>

                      <div className="form-field full-width">
                        <label>Default Party Group *</label>
                        <select className="form-input" value={mappings.defaultPartyGroup} onChange={(e) => handleMappingChange('defaultPartyGroup', e.target.value)}>
                          <option value="Sundry Debtors">Sundry Debtors</option>
                          <option value="Trade Receivables">Trade Receivables</option>
                        </select>
                        <small style={{ color: '#6b7280' }}>Group for new client ledgers in Tally</small>
                      </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '24px' }}>
                      <button className="btn-create" onClick={saveMappings} disabled={loading}>
                        <span className="btn-icon">{loading ? '⏳' : '💾'}</span>
                        {loading ? 'Saving...' : 'Save Mappings'}
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

                {!setuStatus.tallyConnected ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: '#fef3c7',
                    borderRadius: '12px',
                    border: '1px solid #f59e0b'
                  }}>
                    <span style={{ fontSize: '48px' }}>⚠️</span>
                    <h3 style={{ color: '#92400e', marginTop: '16px' }}>Tally Connection Required</h3>
                    <p style={{ color: '#78350f' }}>
                      Please ensure Setu is running and Tally is connected.
                    </p>
                    <button className="btn-create" onClick={() => setActiveTab('connection')} style={{ marginTop: '16px' }}>
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
                    <p style={{ color: '#78350f' }}>Please complete the ledger mapping first.</p>
                    <button className="btn-create" onClick={() => setActiveTab('mapping')} style={{ marginTop: '16px' }}>
                      Go to Mapping
                    </button>
                  </div>
                ) : (
                  <>
                    <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                      Select the date range for invoices to sync. Only Tax Invoices with "Sent" or "Paid" status will be synced.
                    </p>

                    <div style={{
                      background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                      border: '1px solid #8b5cf6',
                      borderRadius: '12px',
                      padding: '24px',
                      marginBottom: '24px'
                    }}>
                      <div className="form-grid">
                        <div className="form-field">
                          <label style={{ color: '#5b21b6' }}>Start Date *</label>
                          <input type="date" className="form-input" value={syncParams.startDate} onChange={(e) => setSyncParams({ ...syncParams, startDate: e.target.value })} />
                        </div>
                        <div className="form-field">
                          <label style={{ color: '#5b21b6' }}>End Date *</label>
                          <input type="date" className="form-input" value={syncParams.endDate} onChange={(e) => setSyncParams({ ...syncParams, endDate: e.target.value })} />
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="checkbox" id="forceResync" checked={syncParams.forceResync} onChange={(e) => setSyncParams({ ...syncParams, forceResync: e.target.checked })} />
                        <label htmlFor="forceResync" style={{ color: '#5b21b6' }}>
                          <strong>Force Re-sync</strong> - Re-sync previously synced invoices
                        </label>
                      </div>
                    </div>

                    {syncProgress.inProgress && (
                      <div style={{ background: '#eff6ff', border: '1px solid #3b82f6', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                          <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                          <div>
                            <h4 style={{ margin: 0, color: '#1e40af' }}>Syncing Invoices...</h4>
                            <p style={{ margin: '4px 0 0 0', color: '#3b82f6', fontSize: '14px' }}>{syncProgress.status}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      className="btn-create"
                      onClick={syncInvoicesToTally}
                      disabled={loading || syncProgress.inProgress}
                      style={{ minWidth: '250px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', fontSize: '16px', padding: '14px 28px' }}
                    >
                      <span className="btn-icon">{loading || syncProgress.inProgress ? '⏳' : '🚀'}</span>
                      {loading || syncProgress.inProgress ? 'Syncing...' : 'Start Sync to Tally'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="settings-section">
                <h2 className="section-title">Sync History</h2>

                {syncHistory.length === 0 ? (
                  <div style={{ padding: '60px 40px', textAlign: 'center', background: '#f8f9fa', borderRadius: '12px' }}>
                    <span style={{ fontSize: '64px' }}>📜</span>
                    <h3 style={{ color: '#374151', marginTop: '16px' }}>No Sync History</h3>
                    <p style={{ color: '#6b7280' }}>Your sync history will appear here after your first sync.</p>
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

                <button className="btn-secondary" onClick={loadSyncHistory} style={{ marginTop: '16px' }}>
                  <span className="btn-icon">🔄</span>
                  Refresh History
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
