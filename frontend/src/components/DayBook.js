import React, { useState, useEffect } from 'react';
import { voucherAPI, financialYearAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';
import './Accounting.css';

function DayBook() {
  const { showError } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');

  useEffect(() => {
    loadFinancialYear();
  }, []);

  useEffect(() => {
    if (fromDate && toDate) {
      loadData();
    }
  }, [fromDate, toDate, voucherTypeFilter]);

  const loadFinancialYear = async () => {
    try {
      const fyRes = await financialYearAPI.getCurrent();
      if (fyRes.data && !fyRes.data.error) {
        setFinancialYear(fyRes.data);
        setFromDate(fyRes.data.start_date);
        return;
      }
    } catch (err) {
      // Financial year not configured, use defaults
    }

    // Set default dates if no financial year (Indian FY: April-March)
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 3, 1); // April 1st
    if (today < startOfYear) {
      startOfYear.setFullYear(startOfYear.getFullYear() - 1);
    }
    setFromDate(startOfYear.toISOString().split('T')[0]);
    setFinancialYear(null);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        from_date: fromDate,
        to_date: toDate,
        ordering: 'voucher_date'
      };
      if (voucherTypeFilter) {
        params.voucher_type = voucherTypeFilter;
      }
      const res = await voucherAPI.getAll(params);
      setVouchers(res.data.results || res.data || []);
    } catch (err) {
      if (err.response?.status !== 404) {
        showError('Failed to load day book');
      }
    } finally {
      setLoading(false);
    }
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

  const getVoucherTypeLabel = (type) => {
    const found = voucherTypes.find(v => v.value === type);
    return found ? found.label : type;
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

  // Group vouchers by date
  const groupedByDate = vouchers.reduce((acc, voucher) => {
    const date = voucher.voucher_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(voucher);
    return acc;
  }, {});

  // Calculate totals
  const totalDebit = vouchers.reduce((sum, v) => {
    return sum + (v.entries || []).reduce((s, e) => s + parseFloat(e.debit_amount || 0), 0);
  }, 0);

  const totalCredit = vouchers.reduce((sum, v) => {
    return sum + (v.entries || []).reduce((s, e) => s + parseFloat(e.credit_amount || 0), 0);
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    let csv = 'Date,Voucher No,Type,Particulars,Debit,Credit\n';

    vouchers.forEach(voucher => {
      const entries = voucher.entries || [];
      entries.forEach((entry, idx) => {
        csv += `${idx === 0 ? voucher.voucher_date : ''},`;
        csv += `${idx === 0 ? voucher.voucher_number : ''},`;
        csv += `${idx === 0 ? getVoucherTypeLabel(voucher.voucher_type) : ''},`;
        csv += `"${entry.ledger_name || ''}",`;
        csv += `${parseFloat(entry.debit_amount || 0).toFixed(2)},`;
        csv += `${parseFloat(entry.credit_amount || 0).toFixed(2)}\n`;
      });
    });

    csv += `\nTotal,,,,${totalDebit.toFixed(2)},${totalCredit.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `day-book-${fromDate}-to-${toDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Day Book</h1>
          <p className="page-description">View all transactions by date</p>
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
      </div>

      {/* Day Book Report */}
      <div className="content-card" id="day-book-report">
        <div style={{
          textAlign: 'center',
          padding: '20px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
            Day Book
          </h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
            {new Date(fromDate).toLocaleDateString('en-IN')} to {new Date(toDate).toLocaleDateString('en-IN')}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
            <div>Loading day book...</div>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📅</div>
            <h3 className="empty-title">No Transactions Found</h3>
            <p className="empty-description">No vouchers found for the selected period.</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '12px', width: '100px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px', width: '120px' }}>Voucher No</th>
                  <th style={{ textAlign: 'left', padding: '12px', width: '100px' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Particulars</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '120px' }}>Debit</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '120px' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedByDate).sort().map(date => (
                  <React.Fragment key={date}>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <td colSpan="6" style={{ padding: '10px 12px', fontWeight: '600', color: '#475569' }}>
                        {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                    {groupedByDate[date].map(voucher => {
                      const entries = voucher.entries || [];
                      return entries.map((entry, idx) => (
                        <tr key={`${voucher.id}-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px' }}>
                            {idx === 0 ? '' : ''}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {idx === 0 ? voucher.voucher_number : ''}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {idx === 0 && (
                              <span style={{
                                backgroundColor: getVoucherTypeColor(voucher.voucher_type),
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                {getVoucherTypeLabel(voucher.voucher_type)}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {entry.ledger_name}
                            {idx === 0 && voucher.narration && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                {voucher.narration}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', padding: '8px 12px', color: '#059669' }}>
                            {parseFloat(entry.debit_amount) > 0 ? parseFloat(entry.debit_amount).toFixed(2) : ''}
                          </td>
                          <td style={{ textAlign: 'right', padding: '8px 12px', color: '#dc2626' }}>
                            {parseFloat(entry.credit_amount) > 0 ? parseFloat(entry.credit_amount).toFixed(2) : ''}
                          </td>
                        </tr>
                      ));
                    })}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#1e293b', color: 'white', fontWeight: '700' }}>
                  <td colSpan="4" style={{ padding: '14px 12px' }}>Total ({vouchers.length} vouchers)</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>{totalDebit.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>{totalCredit.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default DayBook;
