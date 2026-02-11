import React, { useState, useEffect, useCallback } from 'react';
import { setuAPI } from '../services/api';
import { useToast } from './Toast';
import { formatDate } from '../utils/dateFormat';
import './TallyReport.css';

const VOUCHER_TYPES = [
  'Sales', 'Purchase', 'Receipt', 'Payment', 'Contra', 'Journal', 'Debit Note', 'Credit Note'
];

const INTERVAL_OPTIONS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
];

function TallyRealtimeSync() {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Config state
  const [enabled, setEnabled] = useState(false);
  const [interval, setInterval_] = useState(60);
  const [voucherTypes, setVoucherTypes] = useState([...VOUCHER_TYPES]);

  // Status state
  const [status, setStatus] = useState(null);

  // Log state
  const [logs, setLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);

  // Pending changes
  const [pendingCount, setPendingCount] = useState(0);

  const loadConfig = useCallback(async () => {
    try {
      const res = await setuAPI.getRealtimeSyncConfig();
      setEnabled(res.data.realtime_sync_enabled);
      setInterval_(res.data.realtime_sync_interval || 60);
      setVoucherTypes(res.data.realtime_sync_voucher_types || [...VOUCHER_TYPES]);
    } catch (err) {
      // Config not found, use defaults
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await setuAPI.getRealtimeSyncStatus();
      setStatus(res.data);
    } catch (err) {
      // Ignore
    }
  }, []);

  const loadLogs = useCallback(async (page = 1) => {
    try {
      const res = await setuAPI.getRealtimeSyncLog(page, 20);
      setLogs(res.data.results || []);
      setLogTotal(res.data.total || 0);
      setLogPage(page);
    } catch (err) {
      // Ignore
    }
  }, []);

  const loadPendingCount = useCallback(async () => {
    try {
      const res = await setuAPI.getPendingChanges();
      setPendingCount((res.data.pending_changes || []).length);
    } catch (err) {
      // Ignore
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadConfig(), loadStatus(), loadLogs(), loadPendingCount()]);
      setLoading(false);
    };
    init();
  }, [loadConfig, loadStatus, loadLogs, loadPendingCount]);

  // Auto-refresh status every 15 seconds when enabled
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      loadStatus();
      loadLogs(1);
      loadPendingCount();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [enabled, loadStatus, loadLogs, loadPendingCount]);

  const toggleType = (type) => {
    setVoucherTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await setuAPI.updateRealtimeSyncConfig({
        enabled,
        interval: interval,
        voucher_types: voucherTypes,
      });
      showSuccess(enabled ? 'Real-time sync enabled' : 'Real-time sync disabled');
      setEnabled(res.data.realtime_sync_enabled);
      loadStatus();
      loadLogs(1);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to update sync config');
    } finally {
      setSaving(false);
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'tally_to_nexinvo': return '\u2B05\uFE0F';
      case 'nexinvo_to_tally': return '\u27A1\uFE0F';
      case 'sync_started': return '\u25B6\uFE0F';
      case 'sync_stopped': return '\u23F9\uFE0F';
      case 'error': return '\u274C';
      case 'conflict': return '\u26A0\uFE0F';
      default: return '\u2139\uFE0F';
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="tally-report">
          <div className="tally-loading">Loading sync configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="tally-report">
        <div className="tally-report-header">
          <p className="tally-report-title">Real-Time Two-Way Sync</p>
          <p className="tally-report-period">
            Bidirectional sync: Changes in Tally auto-reflect in NexInvo, and vice versa
          </p>
        </div>

        {/* Status Panel */}
        <div style={{ padding: '16px', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              background: enabled && status?.connector_online ? '#0a0' : enabled ? '#fa0' : '#ccc',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {enabled ? (status?.connector_online ? 'Active' : 'Enabled (Connector Offline)') : 'Disabled'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <span>NexInvo</span>
            <span style={{ fontSize: 16 }}>{'\u21C4'}</span>
            <span>Tally</span>
          </div>

          {status?.last_sync && (
            <span style={{ fontSize: 12, color: '#666' }}>
              Last sync: {formatDate(status.last_sync)}
            </span>
          )}

          {pendingCount > 0 && (
            <span style={{ fontSize: 12, color: '#1a73e8', fontWeight: 600 }}>
              {pendingCount} pending change(s)
            </span>
          )}
        </div>

        {/* Configuration */}
        <div style={{ padding: '16px', borderBottom: '1px solid #ddd' }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Configuration</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              Enable Real-Time Sync
            </label>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Sync Interval</label>
              <select
                value={interval}
                onChange={(e) => setInterval_(parseInt(e.target.value))}
                style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #ccc', borderRadius: 3 }}
              >
                {INTERVAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>Voucher Types</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {VOUCHER_TYPES.map(type => (
                <label key={type} className="tally-checkbox-label">
                  <input
                    type="checkbox"
                    checked={voucherTypes.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <button
            className="tally-btn"
            onClick={handleSave}
            disabled={saving}
            style={{ background: '#1a73e8', color: '#fff', border: 'none', padding: '8px 20px' }}
          >
            {saving ? 'Saving...' : 'Save & Apply'}
          </button>
        </div>

        {/* Activity Log */}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600 }}>Activity Log</p>
            <button className="tally-btn" onClick={() => loadLogs(1)} style={{ fontSize: 11, padding: '2px 8px' }}>
              Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="tally-empty-state" style={{ padding: 20 }}>
              <p>No sync activity yet.</p>
            </div>
          ) : (
            <>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {logs.map(log => (
                  <div key={log.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 12
                  }}>
                    <span style={{ fontSize: 14, minWidth: 20 }}>{getEventIcon(log.event_type)}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 500 }}>{log.description}</span>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <span style={{ color: '#888', marginLeft: 8, fontSize: 11 }}>
                          {JSON.stringify(log.details).substring(0, 80)}
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#999', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                ))}
              </div>

              {logTotal > 20 && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                  <button
                    className="tally-btn"
                    onClick={() => loadLogs(logPage - 1)}
                    disabled={logPage <= 1}
                    style={{ fontSize: 11, padding: '2px 8px' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 12, lineHeight: '24px' }}>
                    Page {logPage} of {Math.ceil(logTotal / 20)}
                  </span>
                  <button
                    className="tally-btn"
                    onClick={() => loadLogs(logPage + 1)}
                    disabled={logPage * 20 >= logTotal}
                    style={{ fontSize: 11, padding: '2px 8px' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TallyRealtimeSync;
