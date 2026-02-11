import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, voucherAPI, financialYearAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';
import './Accounting.css';

function BankBook() {
  const { showError } = useToast();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
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
      // Load bank accounts only
      const ledgersRes = await ledgerAccountAPI.getCashOrBank();
      const bankOnly = (ledgersRes.data.results || ledgersRes.data || []).filter(
        l => l.account_type === 'bank' || l.group_name?.toLowerCase().includes('bank')
      );
      setBankAccounts(bankOnly);

      // Auto-select first bank account
      if (bankOnly.length > 0) {
        setSelectedAccount(bankOnly[0].id.toString());
      }

      // Load financial year
      try {
        const fyRes = await financialYearAPI.getCurrent();
        if (fyRes.data && !fyRes.data.error) {
          setFinancialYear(fyRes.data);
          setFromDate(fyRes.data.start_date);
          return;
        }
      } catch (fyErr) {
        // Financial year not configured, use defaults
      }

      // Set default dates (Indian FY: April-March)
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 3, 1);
      if (today < startOfYear) {
        startOfYear.setFullYear(startOfYear.getFullYear() - 1);
      }
      setFromDate(startOfYear.toISOString().split('T')[0]);
    } catch (err) {
      showError('Failed to load bank accounts');
    }
  };

  const loadTransactions = async () => {
    if (!selectedAccount) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    try {
      const bankAccount = bankAccounts.find(a => a.id === parseInt(selectedAccount));

      // Get vouchers involving this bank account
      const res = await voucherAPI.getAll({
        ledger: selectedAccount,
        from_date: fromDate,
        to_date: toDate,
        ordering: 'voucher_date'
      });

      const vouchers = res.data.results || res.data || [];
      const txns = [];
      let runningBalance = parseFloat(bankAccount?.opening_balance) || 0;

      // Add opening balance
      txns.push({
        id: 'opening',
        date: fromDate,
        voucher_number: '',
        voucher_type: '',
        particulars: 'Opening Balance',
        cheque_number: '',
        deposit: bankAccount?.opening_balance_type === 'Dr' ? Math.abs(runningBalance) : 0,
        withdrawal: bankAccount?.opening_balance_type === 'Cr' ? Math.abs(runningBalance) : 0,
        balance: Math.abs(runningBalance)
      });

      vouchers.forEach(voucher => {
        const entries = voucher.entries || [];
        entries.forEach(entry => {
          if (entry.ledger === parseInt(selectedAccount)) {
            const deposit = parseFloat(entry.debit_amount) || 0;
            const withdrawal = parseFloat(entry.credit_amount) || 0;
            runningBalance = runningBalance + deposit - withdrawal;

            // Get contra account
            const contraEntry = entries.find(e => e.ledger !== parseInt(selectedAccount));

            txns.push({
              id: `${voucher.id}-${entry.id}`,
              date: voucher.voucher_date,
              voucher_number: voucher.voucher_number,
              voucher_type: voucher.voucher_type,
              particulars: contraEntry?.ledger_name || voucher.narration || 'Multiple Accounts',
              cheque_number: voucher.reference_number || '',
              deposit,
              withdrawal,
              balance: Math.abs(runningBalance)
            });
          }
        });
      });

      setTransactions(txns);
    } catch (err) {
      showError('Failed to load bank book');
    } finally {
      setLoading(false);
    }
  };

  const getVoucherTypeLabel = (type) => {
    const labels = {
      receipt: 'Rcpt',
      payment: 'Pymt',
      contra: 'Cntr',
      journal: 'Jrnl'
    };
    return labels[type] || type;
  };

  // Calculate totals
  const totalDeposits = transactions.reduce((sum, t) => sum + (t.deposit || 0), 0);
  const totalWithdrawals = transactions.reduce((sum, t) => sum + (t.withdrawal || 0), 0);
  const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const account = bankAccounts.find(a => a.id === parseInt(selectedAccount));

    let csv = `Bank Book - ${account?.name || 'All Bank Accounts'}\n`;
    csv += `Period: ${fromDate} to ${toDate}\n\n`;
    csv += 'Date,Voucher No,Particulars,Cheque/Ref,Deposit (Dr),Withdrawal (Cr),Balance\n';

    transactions.forEach(txn => {
      csv += `${txn.date},${txn.voucher_number},"${txn.particulars}",${txn.cheque_number},`;
      csv += `${txn.deposit > 0 ? txn.deposit.toFixed(2) : ''},`;
      csv += `${txn.withdrawal > 0 ? txn.withdrawal.toFixed(2) : ''},`;
      csv += `${txn.balance.toFixed(2)}\n`;
    });

    csv += `\nTotal,,,${totalDeposits.toFixed(2)},${totalWithdrawals.toFixed(2)},${closingBalance.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bank-book-${account?.name || 'all'}-${fromDate}-to-${toDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Bank Book</h1>
          <p className="page-description">View bank transactions and balance</p>
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
          <label style={{ marginRight: '8px', fontWeight: '500' }}>Bank Account:</label>
          <select
            className="filter-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            <option value="">-- Select Bank --</option>
            {bankAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
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

      {/* Bank Book Report */}
      <div className="content-card" id="bank-book-report">
        <div style={{
          textAlign: 'center',
          padding: '20px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
            Bank Book
          </h2>
          <p style={{ margin: '4px 0', color: '#475569', fontSize: '14px' }}>
            {bankAccounts.find(a => a.id === parseInt(selectedAccount))?.name || 'Select a Bank Account'}
          </p>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
            {new Date(fromDate).toLocaleDateString('en-IN')} to {new Date(toDate).toLocaleDateString('en-IN')}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
            <div>Loading bank book...</div>
          </div>
        ) : bankAccounts.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">🏦</div>
            <h3 className="empty-title">No Bank Accounts</h3>
            <p className="empty-description">Create a bank account in Ledger Master to view bank book.</p>
          </div>
        ) : !selectedAccount ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">🏦</div>
            <h3 className="empty-title">Select a Bank Account</h3>
            <p className="empty-description">Choose a bank account from the dropdown above to view its transactions.</p>
          </div>
        ) : transactions.length <= 1 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📊</div>
            <h3 className="empty-title">No Transactions</h3>
            <p className="empty-description">No bank transactions found for the selected period.</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '12px', width: '90px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px', width: '100px' }}>Voucher</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Particulars</th>
                  <th style={{ textAlign: 'left', padding: '12px', width: '100px' }}>Chq/Ref</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '120px', backgroundColor: '#dcfce7' }}>Deposit</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '120px', backgroundColor: '#fee2e2' }}>Withdrawal</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '120px' }}>Balance</th>
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
                          <span style={{ fontSize: '10px', color: '#64748b', marginRight: '4px' }}>
                            {getVoucherTypeLabel(txn.voucher_type)}
                          </span>
                          {txn.voucher_number}
                        </>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: txn.id === 'opening' ? '600' : '400' }}>
                      {txn.particulars}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                      {txn.cheque_number}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', color: '#059669', backgroundColor: '#f0fdf4' }}>
                      {txn.deposit > 0 ? txn.deposit.toFixed(2) : ''}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', color: '#dc2626', backgroundColor: '#fef2f2' }}>
                      {txn.withdrawal > 0 ? txn.withdrawal.toFixed(2) : ''}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '500' }}>
                      {txn.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#1e293b', color: 'white', fontWeight: '700' }}>
                  <td colSpan="4" style={{ padding: '14px 12px' }}>Total</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>{totalDeposits.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>{totalWithdrawals.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>{closingBalance.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Summary Card */}
        {!loading && transactions.length > 1 && (
          <div style={{
            marginTop: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#166534', fontSize: '14px', marginBottom: '4px' }}>Total Deposits</div>
              <div style={{ color: '#059669', fontSize: '24px', fontWeight: '700' }}>{totalDeposits.toFixed(2)}</div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#991b1b', fontSize: '14px', marginBottom: '4px' }}>Total Withdrawals</div>
              <div style={{ color: '#dc2626', fontSize: '24px', fontWeight: '700' }}>{totalWithdrawals.toFixed(2)}</div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#1e40af', fontSize: '14px', marginBottom: '4px' }}>Closing Balance</div>
              <div style={{ color: '#2563eb', fontSize: '24px', fontWeight: '700' }}>{closingBalance.toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default BankBook;
