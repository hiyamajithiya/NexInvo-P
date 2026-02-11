import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, voucherAPI, financialYearAPI, settingsAPI } from '../services/api';
import { useToast } from './Toast';
import { formatIndianNumber, formatTallyDate } from '../utils/formatIndianNumber';
import './TallyReport.css';

function CashBook() {
  const { showError } = useToast();
  const [cashAccounts, setCashAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
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
    if (fromDate && toDate) {
      loadTransactions();
    }
  }, [selectedAccount, fromDate, toDate]);

  const loadInitialData = async () => {
    try {
      try {
        const s = await settingsAPI.getCompanySettings();
        setCompanyName(s.data?.company_name || '');
      } catch (e) {}

      const ledgersRes = await ledgerAccountAPI.getAll({ cash_or_bank: true, page_size: 100 });
      const cashOnly = (ledgersRes.data.results || ledgersRes.data || []).filter(
        l => l.account_type === 'cash' || l.group_name?.toLowerCase().includes('cash')
      );
      setCashAccounts(cashOnly);

      if (cashOnly.length > 0) {
        setSelectedAccount(cashOnly[0].id.toString());
      }

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
      showError('Failed to load cash accounts');
    }
  };

  const loadTransactions = async () => {
    if (!selectedAccount) {
      setTransactions([]);
      return;
    }
    setLoading(true);
    try {
      const cashAccount = cashAccounts.find(a => a.id === parseInt(selectedAccount));
      const res = await voucherAPI.getAll({
        ledger: selectedAccount,
        from_date: fromDate,
        to_date: toDate,
        ordering: 'voucher_date',
        page_size: 500
      });

      const vouchers = res.data.results || res.data || [];
      const txns = [];
      let runningBalance = parseFloat(cashAccount?.opening_balance) || 0;

      txns.push({
        id: 'opening',
        date: fromDate,
        voucher_number: '',
        voucher_type: '',
        particulars: 'Opening Balance',
        debit: cashAccount?.opening_balance_type === 'Dr' ? Math.abs(runningBalance) : 0,
        credit: cashAccount?.opening_balance_type === 'Cr' ? Math.abs(runningBalance) : 0,
        balance: runningBalance,
        balance_type: cashAccount?.opening_balance_type || 'Dr'
      });

      vouchers.forEach(voucher => {
        const entries = voucher.entries || [];
        entries.forEach(entry => {
          if (entry.ledger_account === parseInt(selectedAccount)) {
            const debit = parseFloat(entry.debit_amount) || 0;
            const credit = parseFloat(entry.credit_amount) || 0;
            runningBalance = runningBalance + debit - credit;

            const contraEntry = entries.find(e => e.ledger_account !== parseInt(selectedAccount));
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
      showError('Failed to load cash book');
    } finally {
      setLoading(false);
    }
  };

  const getVoucherTypeLabel = (type) => {
    const labels = { receipt: 'Receipt', payment: 'Payment', contra: 'Contra', journal: 'Journal' };
    return labels[type] || type;
  };

  const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;
  const closingType = transactions.length > 0 ? transactions[transactions.length - 1].balance_type : 'Dr';

  const handleExport = () => {
    const account = cashAccounts.find(a => a.id === parseInt(selectedAccount));
    let csv = `Cash Book - ${account?.name || 'Cash Account'}\n`;
    csv += `Period: ${fromDate} to ${toDate}\n\n`;
    csv += 'Date,Particulars,Vch Type,Vch No.,Debit (Receipt),Credit (Payment),Balance\n';
    transactions.forEach(txn => {
      csv += `${txn.date},"${txn.particulars}","${getVoucherTypeLabel(txn.voucher_type)}",${txn.voucher_number},`;
      csv += `${txn.debit > 0 ? txn.debit.toFixed(2) : ''},`;
      csv += `${txn.credit > 0 ? txn.credit.toFixed(2) : ''},`;
      csv += `${txn.balance.toFixed(2)} ${txn.balance_type}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-book-${fromDate}-to-${toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content">
      <div className="tally-report" id="cash-book-report">
        <div className="tally-report-header">
          {companyName && <p className="tally-company-name">{companyName}</p>}
          <p className="tally-report-title">Cash Book</p>
          {cashAccounts.find(a => a.id === parseInt(selectedAccount)) && (
            <p className="tally-report-subtitle">
              {cashAccounts.find(a => a.id === parseInt(selectedAccount))?.name}
            </p>
          )}
          <p className="tally-report-period">
            {fromDate && toDate ? `${formatTallyDate(fromDate)} to ${formatTallyDate(toDate)}` : ''}
            {financialYear ? ` (FY: ${financialYear.name})` : ''}
          </p>
        </div>

        <div className="tally-filter-bar">
          {cashAccounts.length > 1 && (
            <>
              <label>Cash Account:</label>
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
                {cashAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </>
          )}
          <label>From:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <label>To:</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <div className="tally-actions">
            <button className="tally-btn" onClick={handleExport}>Export CSV</button>
            <button className="tally-btn" onClick={() => window.print()}>Print</button>
          </div>
        </div>

        {loading ? (
          <div className="tally-loading">Loading Cash Book...</div>
        ) : cashAccounts.length === 0 ? (
          <div className="tally-empty-state">
            <p>No cash accounts found. Create a cash account in Ledger Master.</p>
          </div>
        ) : transactions.length <= 1 ? (
          <div className="tally-empty-state">
            <p>No cash transactions found for the selected period</p>
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

export default CashBook;
