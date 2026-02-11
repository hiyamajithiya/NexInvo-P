import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, voucherAPI, financialYearAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';
import './Accounting.css';

function LedgerReport() {
  const { showError } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [selectedLedger, setSelectedLedger] = useState('');
  const [ledgerDetails, setLedgerDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
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
      // Load ledgers
      const ledgersRes = await ledgerAccountAPI.getAll();
      setLedgers(ledgersRes.data.results || ledgersRes.data || []);

      // Load financial year
      try {
        const fyRes = await financialYearAPI.getCurrent();
        if (fyRes.data && !fyRes.data.error) {
          setFinancialYear(fyRes.data);
          setFromDate(fyRes.data.start_date);
          return;
        }
      } catch (fyErr) {
        // No financial year configured
      }

      // Set default dates (Indian FY: April-March)
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
      // Get ledger details
      const ledger = ledgers.find(l => l.id === parseInt(selectedLedger));
      setLedgerDetails(ledger);

      // Get vouchers that involve this ledger
      const res = await voucherAPI.getAll({
        ledger: selectedLedger,
        from_date: fromDate,
        to_date: toDate,
        ordering: 'voucher_date'
      });

      const vouchers = res.data.results || res.data || [];

      // Extract transactions for this ledger
      const txns = [];
      let runningBalance = parseFloat(ledger?.opening_balance) || 0;

      // Add opening balance
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
          if (entry.ledger === parseInt(selectedLedger)) {
            const debit = parseFloat(entry.debit_amount) || 0;
            const credit = parseFloat(entry.credit_amount) || 0;
            runningBalance = runningBalance + debit - credit;

            // Get contra account (opposite entry)
            const contraEntry = entries.find(e => e.ledger !== parseInt(selectedLedger));

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
      receipt: 'Rcpt',
      payment: 'Pymt',
      contra: 'Cntr',
      journal: 'Jrnl',
      sales: 'Sale',
      purchase: 'Prch',
      debit_note: 'DN',
      credit_note: 'CN'
    };
    return labels[type] || type;
  };

  // Calculate totals
  const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;
  const closingType = transactions.length > 0 ? transactions[transactions.length - 1].balance_type : 'Dr';

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!ledgerDetails) return;

    let csv = `Ledger Statement - ${ledgerDetails.name}\n`;
    csv += `Period: ${fromDate} to ${toDate}\n\n`;
    csv += 'Date,Voucher No,Type,Particulars,Debit,Credit,Balance\n';

    transactions.forEach(txn => {
      csv += `${txn.date},${txn.voucher_number},"${txn.voucher_type}","${txn.particulars}",`;
      csv += `${txn.debit > 0 ? txn.debit.toFixed(2) : ''},${txn.credit > 0 ? txn.credit.toFixed(2) : ''},`;
      csv += `${txn.balance.toFixed(2)} ${txn.balance_type}\n`;
    });

    csv += `\nTotal,,,${totalDebit.toFixed(2)},${totalCredit.toFixed(2)},${closingBalance.toFixed(2)} ${closingType}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledger-${ledgerDetails?.name || 'report'}-${fromDate}-to-${toDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Ledger Report</h1>
          <p className="page-description">View account-wise transaction statement</p>
          {financialYear && (
            <span className="badge badge-primary" style={{ marginTop: '8px' }}>
              FY: {financialYear.name}
            </span>
          )}
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={handleExport} disabled={!selectedLedger}>
            <span className="btn-icon">📥</span>
            Export CSV
          </button>
          <button className="btn-secondary" onClick={handlePrint} disabled={!selectedLedger}>
            <span className="btn-icon">🖨️</span>
            Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section" style={{ marginBottom: '24px' }}>
        <div className="filter-group" style={{ flex: 2 }}>
          <label style={{ marginRight: '8px', fontWeight: '500' }}>Ledger:</label>
          <select
            className="filter-select"
            value={selectedLedger}
            onChange={(e) => setSelectedLedger(e.target.value)}
            style={{ minWidth: '250px' }}
          >
            <option value="">-- Select Ledger Account --</option>
            {ledgers.map(ledger => (
              <option key={ledger.id} value={ledger.id}>
                {ledger.name} ({ledger.group_name || 'No Group'})
              </option>
            ))}
          </select>
        </div>
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
      </div>

      {/* Ledger Report */}
      <div className="content-card" id="ledger-report">
        {!selectedLedger ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📖</div>
            <h3 className="empty-title">Select a Ledger Account</h3>
            <p className="empty-description">Choose a ledger account from the dropdown above to view its statement.</p>
          </div>
        ) : (
          <>
            <div style={{
              textAlign: 'center',
              padding: '20px',
              borderBottom: '2px solid #e2e8f0',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
                {ledgerDetails?.name || 'Ledger Statement'}
              </h2>
              <p style={{ margin: '4px 0', color: '#475569', fontSize: '14px' }}>
                {ledgerDetails?.group_name || 'No Group'}
              </p>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
                {new Date(fromDate).toLocaleDateString('en-IN')} to {new Date(toDate).toLocaleDateString('en-IN')}
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
                <div>Loading ledger statement...</div>
              </div>
            ) : transactions.length <= 1 ? (
              <div className="empty-state-large">
                <div className="empty-icon-large">📊</div>
                <h3 className="empty-title">No Transactions</h3>
                <p className="empty-description">No transactions found for this ledger in the selected period.</p>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <th style={{ textAlign: 'left', padding: '12px', width: '100px' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '12px', width: '120px' }}>Voucher</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Particulars</th>
                      <th style={{ textAlign: 'right', padding: '12px', width: '120px' }}>Debit</th>
                      <th style={{ textAlign: 'right', padding: '12px', width: '120px' }}>Credit</th>
                      <th style={{ textAlign: 'right', padding: '12px', width: '140px' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(txn => (
                      <tr key={txn.id} style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: txn.id === 'opening' ? '#fef3c7' : 'transparent'
                      }}>
                        <td style={{ padding: '10px 12px' }}>
                          {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {txn.voucher_number && (
                            <>
                              <span style={{
                                fontSize: '10px',
                                color: '#64748b',
                                marginRight: '4px'
                              }}>
                                {getVoucherTypeLabel(txn.voucher_type)}
                              </span>
                              {txn.voucher_number}
                            </>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: txn.id === 'opening' ? '600' : '400' }}>
                          {txn.particulars}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', color: '#059669' }}>
                          {txn.debit > 0 ? txn.debit.toFixed(2) : ''}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', color: '#dc2626' }}>
                          {txn.credit > 0 ? txn.credit.toFixed(2) : ''}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '500' }}>
                          {txn.balance.toFixed(2)} {txn.balance_type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f1f5f9', fontWeight: '600' }}>
                      <td colSpan="3" style={{ padding: '12px' }}>Total</td>
                      <td style={{ textAlign: 'right', padding: '12px', color: '#059669' }}>{totalDebit.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '12px', color: '#dc2626' }}>{totalCredit.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '12px' }}></td>
                    </tr>
                    <tr style={{ backgroundColor: '#1e293b', color: 'white', fontWeight: '700' }}>
                      <td colSpan="5" style={{ padding: '14px 12px' }}>Closing Balance</td>
                      <td style={{ textAlign: 'right', padding: '14px 12px' }}>
                        {closingBalance.toFixed(2)} {closingType}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

export default LedgerReport;
