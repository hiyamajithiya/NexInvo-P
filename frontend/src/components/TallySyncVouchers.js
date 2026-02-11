import React, { useState, useEffect } from 'react';
import { setuAPI, voucherAPI, financialYearAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';

function TallySyncVouchers() {
  const { showSuccess, showError, showWarning } = useToast();
  const [connectorStatus, setConnectorStatus] = useState(null);
  const [tallyStatus, setTallyStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [vouchers, setVouchers] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');
  const [exportedFilter, setExportedFilter] = useState('not_exported'); // 'all', 'exported', 'not_exported'

  const [selectedVouchers, setSelectedVouchers] = useState(new Set());
  const [exportLog, setExportLog] = useState([]);

  useEffect(() => {
    checkConnectorStatus();
    loadFinancialYear();
  }, []);

  useEffect(() => {
    if (fromDate && toDate) {
      loadVouchers();
    }
  }, [fromDate, toDate, voucherTypeFilter, exportedFilter]);

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

  const loadFinancialYear = async () => {
    try {
      const fyRes = await financialYearAPI.getCurrent();
      if (fyRes.data && !fyRes.data.error) {
        setFinancialYear(fyRes.data);
        setFromDate(fyRes.data.start_date);
        return;
      }
    } catch (err) {
      // No financial year configured
    }

    // Default dates
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 3, 1);
    if (today < startOfYear) {
      startOfYear.setFullYear(startOfYear.getFullYear() - 1);
    }
    setFromDate(startOfYear.toISOString().split('T')[0]);
  };

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const params = {
        from_date: fromDate,
        to_date: toDate,
        ordering: '-voucher_date'
      };
      if (voucherTypeFilter) {
        params.voucher_type = voucherTypeFilter;
      }

      const res = await voucherAPI.getAll(params);
      let data = res.data.results || res.data || [];

      // Filter by export status
      if (exportedFilter === 'exported') {
        data = data.filter(v => v.tally_synced);
      } else if (exportedFilter === 'not_exported') {
        data = data.filter(v => !v.tally_synced);
      }

      setVouchers(data);
    } catch (err) {
      if (err.response?.status !== 404) {
        showError('Failed to load vouchers');
      }
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelection = (voucherId) => {
    const newSelection = new Set(selectedVouchers);
    if (newSelection.has(voucherId)) {
      newSelection.delete(voucherId);
    } else {
      newSelection.add(voucherId);
    }
    setSelectedVouchers(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedVouchers.size === vouchers.filter(v => !v.tally_synced).length) {
      setSelectedVouchers(new Set());
    } else {
      setSelectedVouchers(new Set(vouchers.filter(v => !v.tally_synced).map(v => v.id)));
    }
  };

  const handleExportSelected = async () => {
    if (selectedVouchers.size === 0) {
      showWarning('Please select vouchers to export');
      return;
    }

    setExporting(true);
    const log = [];

    try {
      const vouchersToExport = vouchers.filter(v => selectedVouchers.has(v.id));

      // Generate Tally XML
      const tallyXML = generateTallyVoucherXML(vouchersToExport);

      // Download the XML file
      const blob = new Blob([tallyXML], { type: 'text/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tally_vouchers_${fromDate}_to_${toDate}.xml`;
      link.click();
      window.URL.revokeObjectURL(url);

      // Mark vouchers as exported (if API supports it)
      for (const voucher of vouchersToExport) {
        try {
          await voucherAPI.update(voucher.id, { tally_synced: true, tally_sync_date: new Date().toISOString() });
          log.push({ status: 'success', voucher: voucher.voucher_number, message: 'Marked as exported' });
        } catch (err) {
          log.push({ status: 'warning', voucher: voucher.voucher_number, message: 'Exported but not marked in system' });
        }
      }

      setExportLog(log);
      showSuccess(`Exported ${vouchersToExport.length} vouchers to Tally XML format`);
      setSelectedVouchers(new Set());
      loadVouchers(); // Reload to update export status
    } catch (err) {
      showError('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const generateTallyVoucherXML = (vouchersData) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>##SVCURRENTCOMPANY</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>`;

    vouchersData.forEach(voucher => {
      const tallyVoucherType = mapVoucherTypeToTally(voucher.voucher_type);
      const voucherDate = formatTallyDate(voucher.voucher_date);

      xml += `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${tallyVoucherType}" ACTION="Create">
            <DATE>${voucherDate}</DATE>
            <VOUCHERTYPENAME>${tallyVoucherType}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXML(voucher.voucher_number)}</VOUCHERNUMBER>
            <NARRATION>${escapeXML(voucher.narration || '')}</NARRATION>
            <REFERENCE>${escapeXML(voucher.reference_number || '')}</REFERENCE>`;

      // Add ledger entries
      const entries = voucher.entries || [];
      entries.forEach(entry => {
        const amount = parseFloat(entry.debit_amount) > 0 ? -parseFloat(entry.debit_amount) : parseFloat(entry.credit_amount);
        xml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXML(entry.ledger_name || 'Unknown')}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${amount > 0 ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>
              <AMOUNT>${amount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
      });

      xml += `
          </VOUCHER>
        </TALLYMESSAGE>`;
    });

    xml += `
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return xml;
  };

  const mapVoucherTypeToTally = (type) => {
    const mapping = {
      'receipt': 'Receipt',
      'payment': 'Payment',
      'contra': 'Contra',
      'journal': 'Journal',
      'sales': 'Sales',
      'purchase': 'Purchase',
      'debit_note': 'Debit Note',
      'credit_note': 'Credit Note'
    };
    return mapping[type] || 'Journal';
  };

  const formatTallyDate = (dateStr) => {
    // Convert YYYY-MM-DD to YYYYMMDD
    return dateStr.replace(/-/g, '');
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

  const getVoucherTypeLabel = (type) => {
    const labels = {
      receipt: 'Receipt',
      payment: 'Payment',
      contra: 'Contra',
      journal: 'Journal',
      sales: 'Sales',
      purchase: 'Purchase',
      debit_note: 'Debit Note',
      credit_note: 'Credit Note'
    };
    return labels[type] || type;
  };

  const getVoucherTypeColor = (type) => {
    const colors = {
      receipt: '#059669',
      payment: '#dc2626',
      contra: '#7c3aed',
      journal: '#2563eb',
      sales: '#16a34a',
      purchase: '#ea580c',
      debit_note: '#be123c',
      credit_note: '#0891b2'
    };
    return colors[type] || '#64748b';
  };

  const voucherTypes = [
    { value: '', label: 'All Types' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'payment', label: 'Payment' },
    { value: 'contra', label: 'Contra' },
    { value: 'journal', label: 'Journal' },
    { value: 'sales', label: 'Sales' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'debit_note', label: 'Debit Note' },
    { value: 'credit_note', label: 'Credit Note' }
  ];

  // Calculate totals
  const totalDebit = vouchers.reduce((sum, v) =>
    sum + (v.entries || []).reduce((s, e) => s + parseFloat(e.debit_amount || 0), 0), 0);
  const totalCredit = vouchers.reduce((sum, v) =>
    sum + (v.entries || []).reduce((s, e) => s + parseFloat(e.credit_amount || 0), 0), 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Tally Sync - Vouchers</h1>
          <p className="page-description">Export vouchers to Tally format</p>
          {financialYear && (
            <span className="badge badge-primary" style={{ marginTop: '8px' }}>
              FY: {financialYear.name}
            </span>
          )}
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={checkConnectorStatus}>
            <span className="btn-icon">🔄</span>
            Refresh Status
          </button>
          <button
            className="btn-primary"
            onClick={handleExportSelected}
            disabled={selectedVouchers.size === 0 || exporting}
          >
            <span className="btn-icon">📤</span>
            {exporting ? 'Exporting...' : `Export Selected (${selectedVouchers.size})`}
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
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
            {tallyStatus?.is_connected ? 'Connected' : 'Offline'}
          </div>
        </div>
        <div style={{
          padding: '16px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>Total Debit</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#059669' }}>{totalDebit.toFixed(2)}</div>
        </div>
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>Total Credit</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#dc2626' }}>{totalCredit.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section" style={{ marginBottom: '24px' }}>
        <div className="filter-group">
          <label style={{ marginRight: '8px', fontWeight: '500' }}>From:</label>
          <input
            type="date"
            className="filter-select"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label style={{ marginRight: '8px', fontWeight: '500' }}>To:</label>
          <input
            type="date"
            className="filter-select"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label style={{ marginRight: '8px', fontWeight: '500' }}>Type:</label>
          <select
            className="filter-select"
            value={voucherTypeFilter}
            onChange={(e) => setVoucherTypeFilter(e.target.value)}
          >
            {voucherTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label style={{ marginRight: '8px', fontWeight: '500' }}>Status:</label>
          <select
            className="filter-select"
            value={exportedFilter}
            onChange={(e) => setExportedFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="not_exported">Not Exported</option>
            <option value="exported">Exported</option>
          </select>
        </div>
      </div>

      {/* Vouchers List */}
      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Vouchers ({vouchers.length})</h3>
          <button className="btn-secondary" onClick={handleSelectAll}>
            {selectedVouchers.size === vouchers.filter(v => !v.tally_synced).length ? 'Deselect All' : 'Select All Unexported'}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
            <div>Loading vouchers...</div>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📋</div>
            <h3 className="empty-title">No Vouchers Found</h3>
            <p className="empty-description">No vouchers match the selected criteria.</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Date</th>
                  <th>Voucher No</th>
                  <th>Type</th>
                  <th>Narration</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map(voucher => {
                  const amount = (voucher.entries || []).reduce((sum, e) =>
                    sum + parseFloat(e.debit_amount || 0), 0);
                  const isExported = voucher.tally_synced;

                  return (
                    <tr
                      key={voucher.id}
                      style={{
                        backgroundColor: selectedVouchers.has(voucher.id) ? '#f0fdf4' : (isExported ? '#f8fafc' : 'transparent'),
                        opacity: isExported ? 0.7 : 1
                      }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedVouchers.has(voucher.id)}
                          onChange={() => handleToggleSelection(voucher.id)}
                          disabled={isExported}
                        />
                      </td>
                      <td>{new Date(voucher.voucher_date).toLocaleDateString('en-IN')}</td>
                      <td>{voucher.voucher_number}</td>
                      <td>
                        <span style={{
                          backgroundColor: getVoucherTypeColor(voucher.voucher_type),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {getVoucherTypeLabel(voucher.voucher_type)}
                        </span>
                      </td>
                      <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {voucher.narration || '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '500' }}>
                        {amount.toFixed(2)}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: isExported ? '#dcfce7' : '#fef3c7',
                          color: isExported ? '#166534' : '#92400e'
                        }}>
                          {isExported ? 'Exported' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Log */}
      {exportLog.length > 0 && (
        <div className="content-card" style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Export Log</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {exportLog.map((log, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: log.status === 'success' ? '#f0fdf4' : (log.status === 'warning' ? '#fef3c7' : '#fef2f2')
                }}
              >
                <span style={{
                  marginRight: '8px',
                  color: log.status === 'success' ? '#059669' : (log.status === 'warning' ? '#d97706' : '#dc2626')
                }}>
                  {log.status === 'success' ? '✓' : (log.status === 'warning' ? '⚠' : '✗')}
                </span>
                <strong>{log.voucher}</strong>: {log.message}
              </div>
            ))}
          </div>
          <button
            className="btn-secondary"
            onClick={() => setExportLog([])}
            style={{ marginTop: '12px' }}
          >
            Clear Log
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="content-card" style={{ marginTop: '24px', backgroundColor: '#eff6ff' }}>
        <h3 style={{ marginBottom: '12px', color: '#1e40af' }}>How to Import into Tally</h3>
        <ol style={{ marginLeft: '20px', color: '#1e3a8a', lineHeight: '1.8' }}>
          <li>Select the vouchers you want to export and click "Export Selected"</li>
          <li>A Tally XML file will be downloaded to your computer</li>
          <li>Open Tally ERP and go to Gateway of Tally > Import Data</li>
          <li>Select "Vouchers" and browse to the downloaded XML file</li>
          <li>Follow the on-screen instructions to complete the import</li>
        </ol>
        <p style={{ marginTop: '12px', color: '#64748b', fontSize: '14px' }}>
          Note: Ensure the ledger accounts in Tally match the names used in NexInvo for proper mapping.
        </p>
      </div>
    </div>
  );
}

export default TallySyncVouchers;
