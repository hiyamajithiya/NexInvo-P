import React, { useState, useEffect } from 'react';
import { setuAPI, ledgerAccountAPI, accountGroupAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';

function TallySyncAccounts() {
  const { showSuccess, showError, showWarning } = useToast();
  const [connectorStatus, setConnectorStatus] = useState(null);
  const [tallyStatus, setTallyStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Local and Tally ledgers
  const [localLedgers, setLocalLedgers] = useState([]);
  const [tallyLedgers, setTallyLedgers] = useState([]);
  const [localGroups, setLocalGroups] = useState([]);
  const [tallyGroups, setTallyGroups] = useState([]);

  // Sync state
  const [selectedForImport, setSelectedForImport] = useState(new Set());
  const [selectedForExport, setSelectedForExport] = useState(new Set());
  const [syncMode, setSyncMode] = useState('import'); // 'import' or 'export'
  const [syncLog, setSyncLog] = useState([]);

  useEffect(() => {
    checkConnectorStatus();
    loadLocalData();
  }, []);

  const checkConnectorStatus = async () => {
    try {
      const res = await setuAPI.checkConnector();
      setConnectorStatus(res.data);

      if (res.data.is_online) {
        checkTallyConnection();
      }
    } catch (err) {
      // Setu connector not available
      setConnectorStatus({ is_online: false });
    }
  };

  const checkTallyConnection = async () => {
    try {
      const res = await setuAPI.checkTallyConnection();
      setTallyStatus(res.data);
    } catch (err) {
      // Tally not connected
      setTallyStatus({ is_connected: false });
    }
  };

  const loadLocalData = async () => {
    try {
      const [ledgersRes, groupsRes] = await Promise.all([
        ledgerAccountAPI.getAll(),
        accountGroupAPI.getAll()
      ]);
      setLocalLedgers(ledgersRes.data.results || ledgersRes.data || []);
      setLocalGroups(groupsRes.data.results || groupsRes.data || []);
    } catch (err) {
      // Error handled silently
    }
  };

  const loadTallyLedgers = async () => {
    if (!connectorStatus?.is_online || !tallyStatus?.is_connected) {
      showWarning('Please ensure Setu connector and Tally are connected');
      return;
    }

    setLoading(true);
    try {
      const res = await setuAPI.getLedgers();
      const data = res.data;

      if (data.ledgers) {
        setTallyLedgers(data.ledgers);
      }
      if (data.groups) {
        setTallyGroups(data.groups);
      }

      showSuccess(`Loaded ${data.ledgers?.length || 0} ledgers from Tally`);
    } catch (err) {
      showError('Failed to load ledgers from Tally');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleImportSelection = (ledgerId) => {
    const newSelection = new Set(selectedForImport);
    if (newSelection.has(ledgerId)) {
      newSelection.delete(ledgerId);
    } else {
      newSelection.add(ledgerId);
    }
    setSelectedForImport(newSelection);
  };

  const handleToggleExportSelection = (ledgerId) => {
    const newSelection = new Set(selectedForExport);
    if (newSelection.has(ledgerId)) {
      newSelection.delete(ledgerId);
    } else {
      newSelection.add(ledgerId);
    }
    setSelectedForExport(newSelection);
  };

  const handleSelectAllForImport = () => {
    if (selectedForImport.size === unmatchedTallyLedgers.length) {
      setSelectedForImport(new Set());
    } else {
      setSelectedForImport(new Set(unmatchedTallyLedgers.map(l => l.guid || l.name)));
    }
  };

  const handleSelectAllForExport = () => {
    if (selectedForExport.size === unmatchedLocalLedgers.length) {
      setSelectedForExport(new Set());
    } else {
      setSelectedForExport(new Set(unmatchedLocalLedgers.map(l => l.id)));
    }
  };

  const handleImportSelected = async () => {
    if (selectedForImport.size === 0) {
      showWarning('Please select ledgers to import');
      return;
    }

    setSyncing(true);
    const log = [];

    try {
      for (const ledgerId of selectedForImport) {
        const tallyLedger = tallyLedgers.find(l => (l.guid || l.name) === ledgerId);
        if (!tallyLedger) continue;

        try {
          // Map Tally account type to local account type
          const accountType = mapTallyAccountType(tallyLedger.parent || tallyLedger.group);

          // Find or create matching group
          let groupId = null;
          const matchingGroup = localGroups.find(g =>
            g.name.toLowerCase() === (tallyLedger.parent || tallyLedger.group || '').toLowerCase()
          );
          if (matchingGroup) {
            groupId = matchingGroup.id;
          }

          await ledgerAccountAPI.create({
            name: tallyLedger.name,
            account_group: groupId,
            account_type: accountType,
            opening_balance: parseFloat(tallyLedger.opening_balance) || 0,
            opening_balance_type: tallyLedger.opening_balance_type || 'Dr',
            tally_guid: tallyLedger.guid,
            tally_name: tallyLedger.name
          });

          log.push({ status: 'success', name: tallyLedger.name, message: 'Imported successfully' });
        } catch (err) {
          log.push({ status: 'error', name: tallyLedger.name, message: err.response?.data?.error || 'Failed to import' });
        }
      }

      setSyncLog(log);
      const successCount = log.filter(l => l.status === 'success').length;
      showSuccess(`Imported ${successCount} of ${selectedForImport.size} ledgers`);

      // Reload local data
      loadLocalData();
      setSelectedForImport(new Set());
    } catch (err) {
      showError('Import failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportSelected = async () => {
    if (selectedForExport.size === 0) {
      showWarning('Please select ledgers to export');
      return;
    }

    setSyncing(true);
    const log = [];

    try {
      // Build XML for Tally import
      const ledgersToExport = localLedgers.filter(l => selectedForExport.has(l.id));

      // For now, we'll generate Tally XML and show it
      // In production, this would be sent via Setu connector
      const tallyXML = generateTallyLedgerXML(ledgersToExport);

      // Copy to clipboard or download
      const blob = new Blob([tallyXML], { type: 'text/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tally_ledgers_import.xml';
      link.click();
      window.URL.revokeObjectURL(url);

      log.push({ status: 'success', name: 'Export', message: `Generated XML for ${ledgersToExport.length} ledgers` });
      setSyncLog(log);
      showSuccess(`Exported ${ledgersToExport.length} ledgers to Tally XML format`);
      setSelectedForExport(new Set());
    } catch (err) {
      showError('Export failed');
    } finally {
      setSyncing(false);
    }
  };

  const mapTallyAccountType = (parentGroup) => {
    if (!parentGroup) return 'asset';

    const lowerGroup = parentGroup.toLowerCase();

    if (lowerGroup.includes('bank')) return 'bank';
    if (lowerGroup.includes('cash')) return 'cash';
    if (lowerGroup.includes('debtor') || lowerGroup.includes('receivable')) return 'debtor';
    if (lowerGroup.includes('creditor') || lowerGroup.includes('payable')) return 'creditor';
    if (lowerGroup.includes('capital') || lowerGroup.includes('reserve')) return 'capital';
    if (lowerGroup.includes('income') || lowerGroup.includes('sales')) return 'income';
    if (lowerGroup.includes('expense') || lowerGroup.includes('purchase')) return 'expense';
    if (lowerGroup.includes('asset')) return 'asset';
    if (lowerGroup.includes('liabilit')) return 'liability';

    return 'asset';
  };

  const generateTallyLedgerXML = (ledgers) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>`;

    ledgers.forEach(ledger => {
      xml += `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${escapeXML(ledger.name)}" ACTION="Create">
            <NAME>${escapeXML(ledger.name)}</NAME>
            <PARENT>${escapeXML(ledger.group_name || 'Sundry Debtors')}</PARENT>
            <OPENINGBALANCE>${ledger.opening_balance || 0}</OPENINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>`;
    });

    xml += `
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return xml;
  };

  const escapeXML = (str) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Find unmatched ledgers
  const localLedgerNames = new Set(localLedgers.map(l => l.name.toLowerCase()));
  const tallyLedgerNames = new Set(tallyLedgers.map(l => l.name.toLowerCase()));

  const unmatchedTallyLedgers = tallyLedgers.filter(l => !localLedgerNames.has(l.name.toLowerCase()));
  const unmatchedLocalLedgers = localLedgers.filter(l => !tallyLedgerNames.has(l.name.toLowerCase()));
  const matchedLedgers = localLedgers.filter(l => tallyLedgerNames.has(l.name.toLowerCase()));

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Tally Sync - Accounts</h1>
          <p className="page-description">Sync ledger accounts between NexInvo and Tally</p>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={checkConnectorStatus}>
            <span className="btn-icon">🔄</span>
            Refresh Status
          </button>
          <button
            className="btn-primary"
            onClick={loadTallyLedgers}
            disabled={!connectorStatus?.is_online || !tallyStatus?.is_connected || loading}
          >
            <span className="btn-icon">📥</span>
            {loading ? 'Loading...' : 'Fetch from Tally'}
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          padding: '16px',
          backgroundColor: connectorStatus?.is_online ? '#dcfce7' : '#fee2e2',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: connectorStatus?.is_online ? '#166534' : '#991b1b', marginBottom: '4px' }}>
            Setu Connector
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: connectorStatus?.is_online ? '#059669' : '#dc2626' }}>
            {connectorStatus?.is_online ? 'Online' : 'Offline'}
          </div>
        </div>
        <div style={{
          padding: '16px',
          backgroundColor: tallyStatus?.is_connected ? '#dcfce7' : '#fee2e2',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: tallyStatus?.is_connected ? '#166534' : '#991b1b', marginBottom: '4px' }}>
            Tally Connection
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: tallyStatus?.is_connected ? '#059669' : '#dc2626' }}>
            {tallyStatus?.is_connected ? 'Connected' : 'Not Connected'}
          </div>
        </div>
        <div style={{
          padding: '16px',
          backgroundColor: '#eff6ff',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#1e40af', marginBottom: '4px' }}>
            Sync Summary
          </div>
          <div style={{ fontSize: '14px', color: '#2563eb' }}>
            Matched: {matchedLedgers.length} | To Import: {unmatchedTallyLedgers.length} | To Export: {unmatchedLocalLedgers.length}
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={syncMode === 'import' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setSyncMode('import')}
        >
          Import from Tally ({unmatchedTallyLedgers.length})
        </button>
        <button
          className={syncMode === 'export' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setSyncMode('export')}
        >
          Export to Tally ({unmatchedLocalLedgers.length})
        </button>
        <button
          className={syncMode === 'matched' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setSyncMode('matched')}
        >
          Matched ({matchedLedgers.length})
        </button>
      </div>

      {/* Content based on mode */}
      <div className="content-card">
        {syncMode === 'import' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Ledgers in Tally (Not in NexInvo)</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" onClick={handleSelectAllForImport}>
                  {selectedForImport.size === unmatchedTallyLedgers.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  className="btn-primary"
                  onClick={handleImportSelected}
                  disabled={selectedForImport.size === 0 || syncing}
                >
                  {syncing ? 'Importing...' : `Import Selected (${selectedForImport.size})`}
                </button>
              </div>
            </div>

            {unmatchedTallyLedgers.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">✅</div>
                <h3 className="empty-title">All Synced</h3>
                <p className="empty-description">
                  {tallyLedgers.length === 0 ? 'Fetch ledgers from Tally to see import options.' : 'All Tally ledgers are already in NexInvo.'}
                </p>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Ledger Name</th>
                      <th>Parent Group</th>
                      <th style={{ textAlign: 'right' }}>Opening Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmatchedTallyLedgers.map(ledger => (
                      <tr key={ledger.guid || ledger.name} style={{
                        backgroundColor: selectedForImport.has(ledger.guid || ledger.name) ? '#f0fdf4' : 'transparent'
                      }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedForImport.has(ledger.guid || ledger.name)}
                            onChange={() => handleToggleImportSelection(ledger.guid || ledger.name)}
                          />
                        </td>
                        <td>{ledger.name}</td>
                        <td>{ledger.parent || ledger.group || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          {parseFloat(ledger.opening_balance || 0).toFixed(2)} {ledger.opening_balance_type || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {syncMode === 'export' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Ledgers in NexInvo (Not in Tally)</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" onClick={handleSelectAllForExport}>
                  {selectedForExport.size === unmatchedLocalLedgers.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  className="btn-primary"
                  onClick={handleExportSelected}
                  disabled={selectedForExport.size === 0 || syncing}
                >
                  {syncing ? 'Exporting...' : `Export Selected (${selectedForExport.size})`}
                </button>
              </div>
            </div>

            {unmatchedLocalLedgers.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">✅</div>
                <h3 className="empty-title">All Synced</h3>
                <p className="empty-description">
                  {tallyLedgers.length === 0 ? 'Fetch ledgers from Tally to compare.' : 'All local ledgers exist in Tally.'}
                </p>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Ledger Name</th>
                      <th>Group</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Current Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmatchedLocalLedgers.map(ledger => (
                      <tr key={ledger.id} style={{
                        backgroundColor: selectedForExport.has(ledger.id) ? '#f0fdf4' : 'transparent'
                      }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedForExport.has(ledger.id)}
                            onChange={() => handleToggleExportSelection(ledger.id)}
                          />
                        </td>
                        <td>{ledger.name}</td>
                        <td>{ledger.group_name || '-'}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            backgroundColor: '#f1f5f9',
                            textTransform: 'capitalize'
                          }}>
                            {ledger.account_type}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {parseFloat(ledger.current_balance || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {syncMode === 'matched' && (
          <>
            <h3 style={{ marginBottom: '16px' }}>Matched Ledgers</h3>
            {matchedLedgers.length === 0 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">🔗</div>
                <h3 className="empty-title">No Matches Yet</h3>
                <p className="empty-description">Fetch ledgers from Tally to find matches.</p>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Ledger Name</th>
                      <th>Local Group</th>
                      <th style={{ textAlign: 'right' }}>Local Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedLedgers.map(ledger => {
                      const tallyMatch = tallyLedgers.find(t => t.name.toLowerCase() === ledger.name.toLowerCase());
                      const tallyBalance = parseFloat(tallyMatch?.opening_balance || 0);
                      const localBalance = parseFloat(ledger.current_balance || 0);
                      const isBalanceMatch = Math.abs(tallyBalance - localBalance) < 0.01;

                      return (
                        <tr key={ledger.id}>
                          <td>{ledger.name}</td>
                          <td>{ledger.group_name || '-'}</td>
                          <td style={{ textAlign: 'right' }}>{localBalance.toFixed(2)}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: isBalanceMatch ? '#dcfce7' : '#fef3c7',
                              color: isBalanceMatch ? '#166534' : '#92400e'
                            }}>
                              {isBalanceMatch ? 'Matched' : 'Balance Differs'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sync Log */}
      {syncLog.length > 0 && (
        <div className="content-card" style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Sync Log</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {syncLog.map((log, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: log.status === 'success' ? '#f0fdf4' : '#fef2f2'
                }}
              >
                <span style={{
                  marginRight: '8px',
                  color: log.status === 'success' ? '#059669' : '#dc2626'
                }}>
                  {log.status === 'success' ? '✓' : '✗'}
                </span>
                <strong>{log.name}</strong>: {log.message}
              </div>
            ))}
          </div>
          <button
            className="btn-secondary"
            onClick={() => setSyncLog([])}
            style={{ marginTop: '12px' }}
          >
            Clear Log
          </button>
        </div>
      )}
    </div>
  );
}

export default TallySyncAccounts;
