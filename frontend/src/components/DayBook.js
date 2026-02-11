import React, { useState, useEffect } from 'react';
import { voucherAPI, financialYearAPI, settingsAPI } from '../services/api';
import { useToast } from './Toast';
import { formatIndianNumber, formatTallyDate } from '../utils/formatIndianNumber';
import './TallyReport.css';

function DayBook() {
  const { showError } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [companyName, setCompanyName] = useState('');
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
      const s = await settingsAPI.getCompanySettings();
      setCompanyName(s.data?.company_name || '');
    } catch (e) {}

    try {
      const fyRes = await financialYearAPI.getCurrent();
      if (fyRes.data && !fyRes.data.error) {
        setFinancialYear(fyRes.data);
        setFromDate(fyRes.data.start_date);
        return;
      }
    } catch (err) {}

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 3, 1);
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
        ordering: 'voucher_date',
        page_size: 500
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

  // Group vouchers by date
  const groupedByDate = vouchers.reduce((acc, voucher) => {
    const date = voucher.voucher_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(voucher);
    return acc;
  }, {});

  const totalDebit = vouchers.reduce((sum, v) => {
    return sum + (v.entries || []).reduce((s, e) => s + parseFloat(e.debit_amount || 0), 0);
  }, 0);

  const totalCredit = vouchers.reduce((sum, v) => {
    return sum + (v.entries || []).reduce((s, e) => s + parseFloat(e.credit_amount || 0), 0);
  }, 0);

  const handleExport = () => {
    let csv = 'Date,Particulars,Vch Type,Vch No.,Debit,Credit\n';
    vouchers.forEach(voucher => {
      const entries = voucher.entries || [];
      entries.forEach((entry, idx) => {
        csv += `${idx === 0 ? voucher.voucher_date : ''},`;
        csv += `"${entry.ledger_name || ''}",`;
        csv += `${idx === 0 ? getVoucherTypeLabel(voucher.voucher_type) : ''},`;
        csv += `${idx === 0 ? voucher.voucher_number : ''},`;
        csv += `${parseFloat(entry.debit_amount || 0).toFixed(2)},`;
        csv += `${parseFloat(entry.credit_amount || 0).toFixed(2)}\n`;
      });
    });
    csv += `\nTotal,,,,${totalDebit.toFixed(2)},${totalCredit.toFixed(2)}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `day-book-${fromDate}-to-${toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content">
      <div className="tally-report" id="day-book-report">
        <div className="tally-report-header">
          {companyName && <p className="tally-company-name">{companyName}</p>}
          <p className="tally-report-title">Day Book</p>
          <p className="tally-report-period">
            {fromDate && toDate ? `${formatTallyDate(fromDate)} to ${formatTallyDate(toDate)}` : ''}
            {financialYear ? ` (FY: ${financialYear.name})` : ''}
          </p>
        </div>

        <div className="tally-filter-bar">
          <label>From:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <label>To:</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <label>Type:</label>
          <select value={voucherTypeFilter} onChange={(e) => setVoucherTypeFilter(e.target.value)}>
            {voucherTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <div className="tally-actions">
            <button className="tally-btn" onClick={handleExport}>Export CSV</button>
            <button className="tally-btn" onClick={() => window.print()}>Print</button>
          </div>
        </div>

        {loading ? (
          <div className="tally-loading">Loading Day Book...</div>
        ) : vouchers.length === 0 ? (
          <div className="tally-empty-state">
            <p>No transactions found for the selected period</p>
          </div>
        ) : (
          <table className="tally-table tally-ledger-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Date</th>
                <th>Particulars</th>
                <th style={{ width: '90px' }}>Vch Type</th>
                <th style={{ width: '90px' }}>Vch No.</th>
                <th className="col-amount">Debit</th>
                <th className="col-amount">Credit</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedByDate).sort().map(date => (
                <React.Fragment key={date}>
                  <tr className="tally-date-separator">
                    <td colSpan="6">{formatTallyDate(date)}</td>
                  </tr>
                  {groupedByDate[date].map(voucher => {
                    const entries = voucher.entries || [];
                    return entries.map((entry, idx) => (
                      <tr key={`${voucher.id}-${idx}`} className="tally-ledger-row">
                        <td></td>
                        <td>
                          {entry.ledger_name}
                          {idx === 0 && voucher.narration && (
                            <span className="tally-narration"> ({voucher.narration})</span>
                          )}
                        </td>
                        <td>{idx === 0 ? getVoucherTypeLabel(voucher.voucher_type) : ''}</td>
                        <td>{idx === 0 ? voucher.voucher_number : ''}</td>
                        <td className="col-amount">
                          {parseFloat(entry.debit_amount) > 0 ? formatIndianNumber(parseFloat(entry.debit_amount)) : ''}
                        </td>
                        <td className="col-amount">
                          {parseFloat(entry.credit_amount) > 0 ? formatIndianNumber(parseFloat(entry.credit_amount)) : ''}
                        </td>
                      </tr>
                    ));
                  })}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="tally-grand-total">
                <td colSpan="4">Total ({vouchers.length} vouchers)</td>
                <td className="col-amount">{formatIndianNumber(totalDebit)}</td>
                <td className="col-amount">{formatIndianNumber(totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

export default DayBook;
