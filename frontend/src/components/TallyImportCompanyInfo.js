import React, { useState } from 'react';
import { setuAPI } from '../services/api';
import { useToast } from './Toast';
import './TallyReport.css';

function TallyImportCompanyInfo() {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);

  const FIELD_LABELS = {
    name: 'Company Name',
    address: 'Address',
    state: 'State',
    pincode: 'PIN Code',
    gstin: 'GSTIN / PAN',
    phone: 'Phone',
    email: 'Email',
  };

  const handleFetch = async () => {
    setLoading(true);
    setCompanyInfo(null);
    try {
      const res = await setuAPI.getCompanyInfo();
      const info = res.data.company_info || {};
      setCompanyInfo(info);
      // Pre-select all fields that have values
      const fields = Object.keys(FIELD_LABELS).filter(f => info[f]);
      setSelectedFields(fields);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to fetch company info from Tally');
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (field) => {
    setSelectedFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const handleImport = async () => {
    if (selectedFields.length === 0) {
      showError('Please select at least one field to import');
      return;
    }
    setImporting(true);
    try {
      const res = await setuAPI.importCompanyInfo({
        company_info: companyInfo,
        fields: selectedFields,
      });
      showSuccess(res.data.message || 'Company info imported successfully');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to import company info');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page-content">
      <div className="tally-report">
        <div className="tally-report-header">
          <p className="tally-report-title">Import Company Info from Tally</p>
          <p className="tally-report-period">
            Fetch company details from Tally and update your NexInvo organization settings
          </p>
        </div>

        <div className="tally-filter-bar">
          <div className="tally-actions">
            <button className="tally-btn" onClick={handleFetch} disabled={loading}>
              {loading ? 'Fetching...' : 'Fetch from Tally'}
            </button>
          </div>
        </div>

        {loading && <div className="tally-loading">Connecting to Tally via Setu...</div>}

        {companyInfo && !loading && (
          <>
            <table className="tally-table" style={{ margin: '16px 0' }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Select</th>
                  <th>Field</th>
                  <th>Tally Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(FIELD_LABELS).map(([field, label]) => {
                  const value = companyInfo[field] || '';
                  return (
                    <tr key={field} className="tally-ledger-row">
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field)}
                          onChange={() => toggleField(field)}
                          disabled={!value}
                        />
                      </td>
                      <td className="tally-indent-0" style={{ fontWeight: 600 }}>{label}</td>
                      <td>{value || <span style={{ color: '#999', fontStyle: 'italic' }}>Not available</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #ddd', display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                className="tally-btn"
                onClick={handleImport}
                disabled={importing || selectedFields.length === 0}
                style={{ background: '#1a73e8', color: '#fff', border: 'none', padding: '8px 20px' }}
              >
                {importing ? 'Importing...' : `Import ${selectedFields.length} Field(s)`}
              </button>
              <span style={{ fontSize: 12, color: '#666' }}>
                Selected fields will update your Organization and Company Settings
              </span>
            </div>
          </>
        )}

        {!companyInfo && !loading && (
          <div className="tally-empty-state">
            <p>Click "Fetch from Tally" to retrieve company information.</p>
            <p style={{ fontSize: 12, marginTop: 8, color: '#999' }}>
              Make sure Setu Desktop Connector is running and connected to Tally.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TallyImportCompanyInfo;
