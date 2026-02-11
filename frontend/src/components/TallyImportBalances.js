import React, { useState } from 'react';
import { setuAPI } from '../services/api';
import { useToast } from './Toast';
import { formatIndianNumber } from '../utils/formatIndianNumber';
import './TallyReport.css';

function TallyImportBalances() {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [tallyLedgers, setTallyLedgers] = useState([]);
  const [preview, setPreview] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleFetch = async () => {
    setLoading(true);
    setTallyLedgers([]);
    setPreview(null);
    try {
      const res = await setuAPI.getLedgersWithBalances();
      const ledgers = res.data.ledgers || [];
      setTallyLedgers(ledgers);

      if (ledgers.length > 0) {
        // Auto-preview
        setPreviewing(true);
        const previewRes = await setuAPI.previewOpeningBalances(ledgers);
        setPreview(previewRes.data);
        // Pre-select all matched with differences
        const ids = new Set(
          (previewRes.data.matched || [])
            .filter(m => m.has_difference)
            .map(m => m.nexinvo_id)
        );
        setSelectedIds(ids);
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to fetch ledgers from Tally');
    } finally {
      setLoading(false);
      setPreviewing(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!preview) return;
    const diffItems = preview.matched.filter(m => m.has_difference);
    if (selectedIds.size === diffItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(diffItems.map(m => m.nexinvo_id)));
    }
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      showError('Please select at least one ledger to import');
      return;
    }

    const balances = preview.matched
      .filter(m => selectedIds.has(m.nexinvo_id))
      .map(m => ({
        nexinvo_id: m.nexinvo_id,
        tally_ob: m.tally_ob,
        tally_ob_type: m.tally_ob_type,
      }));

    setImporting(true);
    try {
      const res = await setuAPI.importOpeningBalances(balances);
      showSuccess(res.data.message || 'Opening balances imported');
      // Refresh preview
      handleFetch();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to import opening balances');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page-content">
      <div className="tally-report">
        <div className="tally-report-header">
          <p className="tally-report-title">Import Opening Balances from Tally</p>
          <p className="tally-report-period">
            Match Tally ledger balances with NexInvo and import differences
          </p>
        </div>

        <div className="tally-filter-bar">
          <div className="tally-actions">
            <button className="tally-btn" onClick={handleFetch} disabled={loading}>
              {loading ? 'Fetching...' : 'Fetch from Tally'}
            </button>
          </div>
        </div>

        {(loading || previewing) && (
          <div className="tally-loading">
            {loading ? 'Fetching ledger balances from Tally...' : 'Matching with NexInvo ledgers...'}
          </div>
        )}

        {preview && !loading && (
          <>
            <div style={{ padding: '10px 16px', background: '#f7f7f7', borderBottom: '1px solid #ddd', fontSize: 12, display: 'flex', gap: 20 }}>
              <span>Total from Tally: <strong>{preview.total_tally}</strong></span>
              <span>Matched: <strong>{preview.total_matched}</strong></span>
              <span>With Differences: <strong style={{ color: '#c00' }}>{preview.total_with_differences}</strong></span>
              <span>Unmatched: <strong>{preview.total_unmatched}</strong></span>
            </div>

            {preview.total_with_differences > 0 && (
              <>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === preview.matched.filter(m => m.has_difference).length}
                      onChange={toggleSelectAll}
                    />
                    Select All with Differences
                  </label>
                </div>

                <table className="tally-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Ledger Name</th>
                      <th>Group</th>
                      <th className="col-amount">Tally OB</th>
                      <th className="col-amount">NexInvo OB</th>
                      <th style={{ width: 80 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.matched
                      .filter(m => m.has_difference)
                      .map(m => (
                        <tr key={m.nexinvo_id} className="tally-ledger-row">
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(m.nexinvo_id)}
                              onChange={() => toggleSelect(m.nexinvo_id)}
                            />
                          </td>
                          <td className="tally-indent-0">{m.tally_name}</td>
                          <td>{m.nexinvo_group || '-'}</td>
                          <td className="col-amount">
                            {formatIndianNumber(m.tally_ob)} {m.tally_ob_type}
                          </td>
                          <td className="col-amount">
                            {formatIndianNumber(m.nexinvo_ob)} {m.nexinvo_ob_type}
                          </td>
                          <td style={{ color: '#c00', fontWeight: 600, fontSize: 11 }}>Different</td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                <div style={{ padding: '12px 16px', borderTop: '1px solid #ddd', display: 'flex', gap: 12 }}>
                  <button
                    className="tally-btn"
                    onClick={handleImport}
                    disabled={importing || selectedIds.size === 0}
                    style={{ background: '#1a73e8', color: '#fff', border: 'none', padding: '8px 20px' }}
                  >
                    {importing ? 'Importing...' : `Import ${selectedIds.size} Balance(s)`}
                  </button>
                </div>
              </>
            )}

            {preview.total_with_differences === 0 && preview.total_matched > 0 && (
              <div className="tally-empty-state">
                <p>All matched ledgers have identical opening balances.</p>
              </div>
            )}

            {preview.total_unmatched > 0 && (
              <div style={{ padding: '12px 16px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Unmatched Tally Ledgers ({preview.total_unmatched})
                </p>
                <p style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                  These Tally ledgers have no matching NexInvo account by name.
                </p>
                <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 12 }}>
                  {preview.unmatched.map((u, i) => (
                    <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid #f0f0f0' }}>
                      {u.tally_name} <span style={{ color: '#888' }}>({u.tally_parent})</span>
                      {' '} - {formatIndianNumber(u.tally_ob)} {u.tally_ob_type}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!preview && !loading && !previewing && (
          <div className="tally-empty-state">
            <p>Click "Fetch from Tally" to load ledger balances.</p>
            <p style={{ fontSize: 12, marginTop: 8, color: '#999' }}>
              Ledgers are matched by name (case-insensitive). Only differences will be shown.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TallyImportBalances;
