import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, voucherAPI, financialYearAPI, settingsAPI } from '../services/api';
import { useToast } from './Toast';
import { formatIndianNumber, formatTallyDate } from '../utils/formatIndianNumber';
import './TallyReport.css';

function LedgerReport() {
  const { showError } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [selectedLedger, setSelectedLedger] = useState('');
  const [ledgerDetails, setLedgerDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedLedger && fromDate && toDate) {
      loadLedgerTransactions();
    }
  }, [selectedLedger, fromDate, toDate]);

  const loadInitialData = async () => {
    try {
      const ledgersRes = await ledgerAccountAPI.getAll({ page_size: 1000 });
      setLedgers(ledgersRes.data.results || ledgersRes.data || []);

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
      } catch (fyErr) {}

      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 3, 1);
      if (today < startOfYear) {
        startOfYear.setFullYear(startOfYear.getFullYear() - 1);
      }
      setFromDate(startOfYear.toISOString().split('T')[0]);
    } catch (err) {
      showError('Failed to load ledger accounts');
    }
  };

  const loadLedgerTransactions = async () => {
    setLoading(true);
    try {
      const ledger = ledgers.find(l => l.id === parseInt(selectedLedger));
      setLedgerDetails(ledger);

      const res = await voucherAPI.getAll({
        ledger: selectedLedger,
        from_date: fromDate,
        to_date: toDate,
        ordering: 'voucher_date',
        page_size: 500
      });

      const vouchers = res.data.results || res.data || [];
      const txns = [];
      let runningBalance = parseFloat(ledger?.opening_balance) || 0;

      txns.push({
        id: 'opening',
        date: fromDate,
        voucher_number: '',
        voucher_type: '',
        particulars: 'Opening Balance',
        debit: ledger?.opening_balance_type === 'Dr' ? Math.abs(runningBalance) : 0,
        credit: ledger?.opening_balance_type === 'Cr' ? Math.abs(runningBalance) : 0,
        balance: runningBalance,
        balance_type: ledger?.opening_balance_type || 'Dr'
      });

      vouchers.forEach(voucher => {
        const entries = voucher.entries || [];
        entries.forEach(entry => {
          if (entry.ledger_account === parseInt(selectedLedger)) {
            const debit = parseFloat(entry.debit_amount) || 0;
            const credit = parseFloat(entry.credit_amount) || 0;
            runningBalance = runningBalance + debit - credit;

            const contraEntry = entries.find(e => e.ledger_account !== parseInt(selectedLedger));

            txns.push({
              id: `${voucher.id}-${entry.id}`,
              date: voucher.voucher_date,
              voucher_number: voucher.voucher_number,
              voucher_type: voucher.voucher_type,
              particulars: contraEntry?.ledger_name || voucher.narration || 'Multiple Accounts',
              debit,
              credit,
              balance: Math.abs(runningBalance),
              balance_type: runningBalance >= 0 ? 'Dr' : 'Cr'
            });
          }
        });
      });

      setTransactions(txns);
    } catch (err) {
      showError('Failed to load ledger report');
    } finally {
      setLoading(false);
    }
  };

  const getVoucherTypeLabel = (type) => {
    const labels = {
      receipt: 'Receipt', payment: 'Payment', contra: 'Contra',
      journal: 'Journal', sales: 'Sales', purchase: 'Purchase',
      debit_note: 'Debit Note', credit_note: 'Credit Note'
    };
    return labels[type] || type;
  };

  const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;
  const closingType = transactions.length > 0 ? transactions[transactions.length - 1].balance_type : 'Dr';

  const handleExport = () => {
    if (!ledgerDetails) return;
    let csv = `Ledger Statement - ${ledgerDetails.name}\n`;
    csv += `Period: ${fromDate} to ${toDate}\n\n`;
    csv += 'Date,Particulars,Vch Type,Vch No.,Debit,Credit,Balance\n';
    transactions.forEach(txn => {
      csv += `${txn.date},"${txn.particulars}","${getVoucherTypeLabel(txn.voucher_type)}",${txn.voucher_number},`;
      csv += `${txn.debit > 0 ? txn.debit.toFixed(2) : ''},${txn.credit > 0 ? txn.credit.toFixed(2) : ''},`;
      csv += `${txn.balance.toFixed(2)} ${txn.balance_type}\n`;
    });
    csv += `\nTotal,,,,${totalDebit.toFixed(2)},${totalCredit.toFixed(2)},${closingBalance.toFixed(2)} ${closingType}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${ledgerDetails?.name || 'report'}-${fromDate}-to-${toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content">
      <div className="tally-report" id="ledger-report">
        <div className="tally-report-header">
          {companyName && <p className="tally-company-name">{companyName}</p>}
          <p className="tally-report-title">Ledger</p>
          {ledgerDetails && (
            <p className="tally-report-subtitle">{ledgerDetails.name}</p>
          )}
          <p className="tally-report-period">
            {fromDate && toDate ? `${formatTallyDate(fromDate)} to ${formatTallyDate(toDate)}` : ''}
            {financialYear ? ` (FY: ${financialYear.name})` : ''}
          </p>
        </div>

        <div className="tally-filter-bar">
          <label>Ledger:</label>
          <select
            value={selectedLedger}
            onChange={(e) => setSelectedLedger(e.target.value)}
            style={{ minWidth: '220px' }}
          >
            <option value="">-- Select Ledger --</option>
            {ledgers.map(ledger => (
              <option key={ledger.id} value={ledger.id}>
                {ledger.name} ({ledger.group_name || 'No Group'})
              </option>
            ))}
          </select>
          <label>From:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <label>To:</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <div className="tally-actions">
            <button className="tally-btn" onClick={handleExport} disabled={!selectedLedger}>Export CSV</button>
            <button className="tally-btn" onClick={() => window.print()} disabled={!selectedLedger}>Print</button>
          </div>
        </div>

        {!selectedLedger ? (
          <div className="tally-empty-state">
            <p>Select a Ledger Account to view its statement</p>
          </div>
        ) : loading ? (
          <div className="tally-loading">Loading Ledger...</div>
        ) : transactions.length <= 1 ? (
          <div className="tally-empty-state">
            <p>No transactions found for this ledger in the selected period</p>
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
              {transactions.map(txn => (
                <tr key={txn.id} className={txn.id === 'opening' ? 'tally-opening-row' : 'tally-ledger-row'}>
                  <td>{formatTallyDate(txn.date)}</td>
                  <td style={{ fontWeight: txn.id === 'opening' ? '600' : '400' }}>
                    {txn.particulars}
                  </td>
                  <td>{txn.voucher_type ? getVoucherTypeLabel(txn.voucher_type) : ''}</td>
                  <td>{txn.voucher_number}</td>
                  <td className="col-amount">{txn.debit > 0 ? formatIndianNumber(txn.debit) : ''}</td>
                  <td className="col-amount">{txn.credit > 0 ? formatIndianNumber(txn.credit) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="tally-total-row">
                <td colSpan="4">Current Total</td>
                <td className="col-amount">{formatIndianNumber(totalDebit)}</td>
                <td className="col-amount">{formatIndianNumber(totalCredit)}</td>
              </tr>
              <tr className="tally-grand-total">
                <td colSpan="4">Closing Balance</td>
                <td className="col-amount" colSpan="2" style={{ textAlign: 'right' }}>
                  {formatIndianNumber(closingBalance)} {closingType}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

export default LedgerReport;
