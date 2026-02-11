import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, invoiceAPI, financialYearAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';
import './Accounting.css';

function AgeingReport() {
  const { showError } = useToast();
  const [reportType, setReportType] = useState('receivables'); // 'receivables' or 'payables'
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [financialYear, setFinancialYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    above90: 0,
    total: 0
  });

  useEffect(() => {
    loadFinancialYear();
  }, []);

  useEffect(() => {
    if (asOnDate) {
      loadData();
    }
  }, [asOnDate, reportType]);

  const loadFinancialYear = async () => {
    try {
      const fyRes = await financialYearAPI.getCurrent();
      if (fyRes.data && !fyRes.data.error) {
        setFinancialYear(fyRes.data);
      }
    } catch (err) {
      // Financial year not configured
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // For receivables, get customer ledgers with outstanding
      // For payables, get supplier ledgers with outstanding
      const accountType = reportType === 'receivables' ? 'debtor' : 'creditor';

      const ledgersRes = await ledgerAccountAPI.getAll({
        account_type: accountType,
        as_on_date: asOnDate
      });

      const ledgers = ledgersRes.data.results || ledgersRes.data || [];

      // Also get invoices for detailed ageing
      let invoices = [];
      try {
        const invoicesRes = await invoiceAPI.getAll({
          status: reportType === 'receivables' ? 'pending,partial' : undefined,
          as_on_date: asOnDate
        });
        invoices = invoicesRes.data.results || invoicesRes.data || [];
      } catch (err) {
        // Could not load invoices
      }

      // Calculate ageing for each party
      const ageingData = [];
      let totalCurrent = 0, totalDays30 = 0, totalDays60 = 0, totalDays90 = 0, totalAbove90 = 0;

      ledgers.forEach(ledger => {
        const balance = Math.abs(parseFloat(ledger.current_balance) || 0);
        if (balance < 0.01) return; // Skip zero balances

        // Get invoices for this client
        const partyInvoices = invoices.filter(inv =>
          inv.client === ledger.linked_client ||
          inv.client_name?.toLowerCase() === ledger.name?.toLowerCase()
        );

        // Calculate ageing buckets
        let current = 0, days30 = 0, days60 = 0, days90 = 0, above90 = 0;
        const today = new Date(asOnDate);

        if (partyInvoices.length > 0) {
          partyInvoices.forEach(inv => {
            const invDate = new Date(inv.invoice_date || inv.date);
            const daysDiff = Math.floor((today - invDate) / (1000 * 60 * 60 * 24));
            const outstanding = parseFloat(inv.balance_due) || parseFloat(inv.total) - parseFloat(inv.amount_paid || 0);

            if (daysDiff <= 0) {
              current += outstanding;
            } else if (daysDiff <= 30) {
              days30 += outstanding;
            } else if (daysDiff <= 60) {
              days60 += outstanding;
            } else if (daysDiff <= 90) {
              days90 += outstanding;
            } else {
              above90 += outstanding;
            }
          });
        } else {
          // If no invoice details, put entire balance in current
          current = balance;
        }

        const total = current + days30 + days60 + days90 + above90;
        if (total < 0.01) return;

        ageingData.push({
          id: ledger.id,
          name: ledger.name,
          contact: ledger.contact_person || ledger.phone || '',
          current,
          days30,
          days60,
          days90,
          above90,
          total
        });

        totalCurrent += current;
        totalDays30 += days30;
        totalDays60 += days60;
        totalDays90 += days90;
        totalAbove90 += above90;
      });

      // Sort by total outstanding (descending)
      ageingData.sort((a, b) => b.total - a.total);

      setData(ageingData);
      setSummary({
        current: totalCurrent,
        days30: totalDays30,
        days60: totalDays60,
        days90: totalDays90,
        above90: totalAbove90,
        total: totalCurrent + totalDays30 + totalDays60 + totalDays90 + totalAbove90
      });
    } catch (err) {
      showError('Failed to load ageing report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    let csv = `${reportType === 'receivables' ? 'Receivables' : 'Payables'} Ageing Report\n`;
    csv += `As on: ${asOnDate}\n\n`;
    csv += 'Party Name,Contact,Current,1-30 Days,31-60 Days,61-90 Days,90+ Days,Total\n';

    data.forEach(row => {
      csv += `"${row.name}","${row.contact}",${row.current.toFixed(2)},${row.days30.toFixed(2)},`;
      csv += `${row.days60.toFixed(2)},${row.days90.toFixed(2)},${row.above90.toFixed(2)},${row.total.toFixed(2)}\n`;
    });

    csv += `\nTotal,,${summary.current.toFixed(2)},${summary.days30.toFixed(2)},`;
    csv += `${summary.days60.toFixed(2)},${summary.days90.toFixed(2)},${summary.above90.toFixed(2)},${summary.total.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}-ageing-${asOnDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getPercentage = (value) => {
    if (summary.total === 0) return 0;
    return ((value / summary.total) * 100).toFixed(1);
  };

  const getBucketColor = (bucket) => {
    const colors = {
      current: '#059669',
      days30: '#0891b2',
      days60: '#d97706',
      days90: '#ea580c',
      above90: '#dc2626'
    };
    return colors[bucket] || '#64748b';
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Ageing Report</h1>
          <p className="page-description">
            {reportType === 'receivables' ? 'Outstanding receivables by age' : 'Outstanding payables by age'}
          </p>
          {financialYear && (
            <span className="badge badge-primary" style={{ marginTop: '8px' }}>
              FY: {financialYear.name}
            </span>
          )}
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={handleExport}>
            <span className="btn-icon">📥</span>
            Export CSV
          </button>
          <button className="btn-secondary" onClick={handlePrint}>
            <span className="btn-icon">🖨️</span>
            Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section" style={{ marginBottom: '24px' }}>
        <div className="filter-group">
          <label style={{ marginRight: '8px', fontWeight: '500' }}>Report Type:</label>
          <select
            className="filter-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="receivables">Receivables (Debtors)</option>
            <option value="payables">Payables (Creditors)</option>
          </select>
        </div>
        <div className="filter-group">
          <label style={{ marginRight: '8px', fontWeight: '500' }}>As on Date:</label>
          <input
            type="date"
            className="filter-select"
            value={asOnDate}
            onChange={(e) => setAsOnDate(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>Current</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>{summary.current.toFixed(0)}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{getPercentage(summary.current)}%</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#ecfeff', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#0e7490', marginBottom: '4px' }}>1-30 Days</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#0891b2' }}>{summary.days30.toFixed(0)}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{getPercentage(summary.days30)}%</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#b45309', marginBottom: '4px' }}>31-60 Days</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#d97706' }}>{summary.days60.toFixed(0)}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{getPercentage(summary.days60)}%</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#fff7ed', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#c2410c', marginBottom: '4px' }}>61-90 Days</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#ea580c' }}>{summary.days90.toFixed(0)}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{getPercentage(summary.days90)}%</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>90+ Days</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>{summary.above90.toFixed(0)}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{getPercentage(summary.above90)}%</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Total</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>{summary.total.toFixed(0)}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{data.length} parties</div>
        </div>
      </div>

      {/* Visual Bar */}
      {summary.total > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
            {summary.current > 0 && (
              <div style={{ width: `${getPercentage(summary.current)}%`, backgroundColor: getBucketColor('current') }} title={`Current: ${getPercentage(summary.current)}%`} />
            )}
            {summary.days30 > 0 && (
              <div style={{ width: `${getPercentage(summary.days30)}%`, backgroundColor: getBucketColor('days30') }} title={`1-30 Days: ${getPercentage(summary.days30)}%`} />
            )}
            {summary.days60 > 0 && (
              <div style={{ width: `${getPercentage(summary.days60)}%`, backgroundColor: getBucketColor('days60') }} title={`31-60 Days: ${getPercentage(summary.days60)}%`} />
            )}
            {summary.days90 > 0 && (
              <div style={{ width: `${getPercentage(summary.days90)}%`, backgroundColor: getBucketColor('days90') }} title={`61-90 Days: ${getPercentage(summary.days90)}%`} />
            )}
            {summary.above90 > 0 && (
              <div style={{ width: `${getPercentage(summary.above90)}%`, backgroundColor: getBucketColor('above90') }} title={`90+ Days: ${getPercentage(summary.above90)}%`} />
            )}
          </div>
        </div>
      )}

      {/* Report Table */}
      <div className="content-card" id="ageing-report">
        <div style={{
          textAlign: 'center',
          padding: '20px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
            {reportType === 'receivables' ? 'Receivables' : 'Payables'} Ageing Report
          </h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
            As on {new Date(asOnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
            <div>Loading ageing report...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📊</div>
            <h3 className="empty-title">No Outstanding</h3>
            <p className="empty-description">
              No outstanding {reportType === 'receivables' ? 'receivables' : 'payables'} found.
            </p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Party Name</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '100px', backgroundColor: '#f0fdf4' }}>Current</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '100px', backgroundColor: '#ecfeff' }}>1-30</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '100px', backgroundColor: '#fffbeb' }}>31-60</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '100px', backgroundColor: '#fff7ed' }}>61-90</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '100px', backgroundColor: '#fef2f2' }}>90+</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '120px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: '500' }}>{row.name}</div>
                      {row.contact && (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{row.contact}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', backgroundColor: '#f0fdf4', color: '#059669' }}>
                      {row.current > 0 ? row.current.toFixed(2) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', backgroundColor: '#ecfeff', color: '#0891b2' }}>
                      {row.days30 > 0 ? row.days30.toFixed(2) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', backgroundColor: '#fffbeb', color: '#d97706' }}>
                      {row.days60 > 0 ? row.days60.toFixed(2) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', backgroundColor: '#fff7ed', color: '#ea580c' }}>
                      {row.days90 > 0 ? row.days90.toFixed(2) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', backgroundColor: '#fef2f2', color: '#dc2626' }}>
                      {row.above90 > 0 ? row.above90.toFixed(2) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '600' }}>
                      {row.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#1e293b', color: 'white', fontWeight: '700' }}>
                  <td style={{ padding: '14px 12px' }}>Total ({data.length} parties)</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>{summary.current.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>{summary.days30.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>{summary.days60.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>{summary.days90.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>{summary.above90.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>{summary.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default AgeingReport;
