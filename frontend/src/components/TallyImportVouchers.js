import React, { useState } from 'react';
import { setuAPI } from '../services/api';
import { useToast } from './Toast';
import { formatIndianNumber } from '../utils/formatIndianNumber';
import './TallyReport.css';

const VOUCHER_TYPES = [
  'Sales', 'Purchase', 'Receipt', 'Payment', 'Contra', 'Journal', 'Debit Note', 'Credit Note'
];

function TallyImportVouchers() {
  const { showSuccess, showError } = useToast();
  const [step, setStep] = useState('configure'); // configure | fetch | preview | import
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Config
  const today = new Date().toISOString().split('T')[0];
  const fyStart = (() => {
    const d = new Date();
    const yr = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
    return `${yr}-04-01`;
  })();
  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(today);
  const [selectedTypes, setSelectedTypes] = useState([...VOUCHER_TYPES]);

  // Data
  const [fetchResult, setFetchResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [autoCreateLedgers, setAutoCreateLedgers] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleFetch = async () => {
    if (!startDate || !endDate) {
      showError('Please select a date range');
      return;
    }
    if (selectedTypes.length === 0) {
      showError('Please select at least one voucher type');
      return;
    }

    setStep('fetch');
    setLoading(true);
    setFetchResult(null);
    setPreview(null);
    try {
      const res = await setuAPI.getAllVouchers(startDate, endDate);
      setFetchResult(res.data);

      // Auto-preview
      const previewRes = await setuAPI.previewImportVouchers(
        res.data.vouchers || [],
        selectedTypes
      );
      setPreview(previewRes.data);
      setStep('preview');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to fetch vouchers from Tally');
      setStep('configure');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.total_to_create === 0) {
      showError('No vouchers to import');
      return;
    }

    setImporting(true);
    setStep('import');
    try {
      const res = await setuAPI.importVouchers(preview.to_create, autoCreateLedgers);
      setImportResult(res.data);
      showSuccess(res.data.message || 'Vouchers imported successfully');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to import vouchers');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page-content">
      <div className="tally-report">
        <div className="tally-report-header">
          <p className="tally-report-title">Import All Vouchers from Tally</p>
          <p className="tally-report-period">
            Import Sales, Purchase, Receipt, Payment, Contra, Journal, Debit & Credit Notes
          </p>
        </div>

        {/* Step 1: Configure */}
        {step === 'configure' && (
          <>
            <div className="tally-filter-bar">
              <label>From:</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <label>To:</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Voucher Types to Import:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {VOUCHER_TYPES.map(type => (
                  <label key={type} className="tally-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                <button
                  className="tally-btn"
                  onClick={handleFetch}
                  disabled={selectedTypes.length === 0}
                  style={{ background: '#1a73e8', color: '#fff', border: 'none', padding: '8px 20px' }}
                >
                  Fetch from Tally
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Fetching */}
        {step === 'fetch' && loading && (
          <div className="tally-loading">Fetching vouchers from Tally...</div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && preview && (
          <>
            <div style={{ padding: '10px 16px', background: '#f7f7f7', borderBottom: '1px solid #ddd', fontSize: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span>Total Fetched: <strong>{fetchResult?.total || 0}</strong></span>
              <span style={{ color: '#060' }}>To Import: <strong>{preview.total_to_create}</strong></span>
              <span style={{ color: '#666' }}>Duplicates: <strong>{preview.total_duplicates}</strong></span>
              <span style={{ color: '#c00' }}>Missing Ledgers: <strong>{preview.total_missing_ledgers}</strong></span>
            </div>

            {/* Counts by type */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #eee' }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>By Type:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
                {Object.entries(preview.counts_by_type || {}).map(([type, count]) => (
                  <span key={type} style={{ padding: '2px 8px', background: '#f0f0f0', borderRadius: 3 }}>
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Ledgers Warning */}
            {preview.total_missing_ledgers > 0 && (
              <div style={{ padding: '10px 16px', background: '#fff8e1', borderBottom: '1px solid #ffe082' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#c00', marginBottom: 6 }}>
                  Missing Ledgers ({preview.total_missing_ledgers}):
                </p>
                <div style={{ fontSize: 11, maxHeight: 100, overflowY: 'auto' }}>
                  {(preview.missing_ledgers || []).map((name, i) => (
                    <span key={i} style={{ display: 'inline-block', padding: '1px 6px', margin: '2px', background: '#ffe0e0', borderRadius: 2 }}>
                      {name}
                    </span>
                  ))}
                </div>
                <label className="tally-checkbox-label" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={autoCreateLedgers}
                    onChange={(e) => setAutoCreateLedgers(e.target.checked)}
                  />
                  Auto-create missing ledgers (under "Suspense Account" group)
                </label>
              </div>
            )}

            {/* Vouchers to import */}
            {preview.total_to_create > 0 && (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="tally-table">
                  <thead>
                    <tr>
                      <th>Voucher #</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th className="col-amount">Amount</th>
                      <th>Narration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.to_create.slice(0, 100).map((v, i) => (
                      <tr key={i} className="tally-ledger-row">
                        <td className="tally-indent-0">{v.voucher_number}</td>
                        <td>{v.voucher_type}</td>
                        <td>{v.date}</td>
                        <td className="col-amount">{formatIndianNumber(Math.abs(v.amount))}</td>
                        <td style={{ fontSize: 11, color: '#666' }}>{(v.narration || '').substring(0, 60)}</td>
                      </tr>
                    ))}
                    {preview.total_to_create > 100 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 10, color: '#888', fontSize: 12 }}>
                          ... and {preview.total_to_create - 100} more vouchers
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ padding: '12px 16px', borderTop: '1px solid #ddd', display: 'flex', gap: 12 }}>
              <button
                className="tally-btn"
                onClick={() => { setStep('configure'); setPreview(null); }}
              >
                Back
              </button>
              <button
                className="tally-btn"
                onClick={handleImport}
                disabled={importing || preview.total_to_create === 0}
                style={{ background: '#1a73e8', color: '#fff', border: 'none', padding: '8px 20px' }}
              >
                {importing ? 'Importing...' : `Import ${preview.total_to_create} Voucher(s)`}
              </button>
            </div>
          </>
        )}

        {/* Step 4: Import Result */}
        {step === 'import' && !importing && importResult && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#060', marginBottom: 12 }}>
              Import Complete
            </p>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              {importResult.created_count} voucher(s) imported successfully
            </p>
            {importResult.ledgers_created?.length > 0 && (
              <p style={{ fontSize: 12, color: '#666' }}>
                {importResult.ledgers_created.length} new ledger(s) auto-created
              </p>
            )}
            {importResult.errors?.length > 0 && (
              <div style={{ marginTop: 12, textAlign: 'left', maxWidth: 500, margin: '12px auto' }}>
                <p style={{ fontSize: 12, color: '#c00', fontWeight: 600 }}>Errors:</p>
                {importResult.errors.map((e, i) => (
                  <p key={i} style={{ fontSize: 11, color: '#c00' }}>{e}</p>
                ))}
              </div>
            )}
            <button
              className="tally-btn"
              onClick={() => { setStep('configure'); setPreview(null); setImportResult(null); }}
              style={{ marginTop: 16 }}
            >
              Import More
            </button>
          </div>
        )}

        {step === 'import' && importing && (
          <div className="tally-loading">Importing vouchers into NexInvo...</div>
        )}
      </div>
    </div>
  );
}

export default TallyImportVouchers;
