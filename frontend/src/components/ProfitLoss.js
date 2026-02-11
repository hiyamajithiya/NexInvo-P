import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, accountGroupAPI, financialYearAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';
import './Accounting.css';

function ProfitLoss() {
  const { showError } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadFinancialYear();
  }, []);

  useEffect(() => {
    if (fromDate && toDate) {
      loadData();
    }
  }, [fromDate, toDate]);

  const loadFinancialYear = async () => {
    try {
      const fyRes = await financialYearAPI.getCurrent();
      if (fyRes.data && !fyRes.data.error) {
        setFinancialYear(fyRes.data);
        setFromDate(fyRes.data.start_date);
        return;
      }
    } catch (err) {
      // Financial year not configured - that's okay
      // No financial year configured, using default dates
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
      const [ledgersRes, groupsRes] = await Promise.all([
        ledgerAccountAPI.getAll({ from_date: fromDate, to_date: toDate }),
        accountGroupAPI.getAll()
      ]);

      setLedgers(ledgersRes.data.results || ledgersRes.data || []);
      setGroups(groupsRes.data.results || groupsRes.data || []);
    } catch (err) {
      showError('Failed to load Profit & Loss report');
    } finally {
      setLoading(false);
    }
  };

  // Categorize accounts into income and expense groups
  const incomeGroups = ['Sales Accounts', 'Direct Incomes', 'Indirect Incomes', 'Income'];
  const expenseGroups = ['Purchase Accounts', 'Direct Expenses', 'Indirect Expenses', 'Expenses'];

  const getIncomeAccounts = () => {
    return ledgers.filter(l =>
      incomeGroups.some(g => l.group_name?.toLowerCase().includes(g.toLowerCase())) ||
      l.account_type === 'income'
    );
  };

  const getExpenseAccounts = () => {
    return ledgers.filter(l =>
      expenseGroups.some(g => l.group_name?.toLowerCase().includes(g.toLowerCase())) ||
      l.account_type === 'expense'
    );
  };

  const calculateTotal = (accounts) => {
    return accounts.reduce((sum, acc) => sum + Math.abs(parseFloat(acc.current_balance) || 0), 0);
  };

  const incomeAccounts = getIncomeAccounts();
  const expenseAccounts = getExpenseAccounts();
  const totalIncome = calculateTotal(incomeAccounts);
  const totalExpenses = calculateTotal(expenseAccounts);
  const netProfit = totalIncome - totalExpenses;

  // Group accounts by their group
  const groupAccounts = (accounts) => {
    return accounts.reduce((acc, ledger) => {
      const groupName = ledger.group_name || 'Other';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(ledger);
      return acc;
    }, {});
  };

  const groupedIncome = groupAccounts(incomeAccounts);
  const groupedExpenses = groupAccounts(expenseAccounts);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    let csv = 'Type,Account Name,Group,Amount\n';

    csv += 'INCOME\n';
    incomeAccounts.forEach(acc => {
      csv += `Income,"${acc.name}","${acc.group_name || ''}",${Math.abs(parseFloat(acc.current_balance) || 0).toFixed(2)}\n`;
    });
    csv += `Total Income,,,${totalIncome.toFixed(2)}\n\n`;

    csv += 'EXPENSES\n';
    expenseAccounts.forEach(acc => {
      csv += `Expense,"${acc.name}","${acc.group_name || ''}",${Math.abs(parseFloat(acc.current_balance) || 0).toFixed(2)}\n`;
    });
    csv += `Total Expenses,,,${totalExpenses.toFixed(2)}\n\n`;

    csv += `Net ${netProfit >= 0 ? 'Profit' : 'Loss'},,,${Math.abs(netProfit).toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profit-loss-${fromDate}-to-${toDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Profit & Loss Statement</h1>
          <p className="page-description">View income and expenses for the period</p>
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

      {/* Date Range Filter */}
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
      </div>

      {/* P&L Report */}
      <div className="content-card" id="pnl-report">
        <div style={{
          textAlign: 'center',
          padding: '20px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
            Profit & Loss Statement
          </h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
            For the period {new Date(fromDate).toLocaleDateString('en-IN')} to {new Date(toDate).toLocaleDateString('en-IN')}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
            <div>Loading report...</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Income Section */}
            <div>
              <h3 style={{
                backgroundColor: '#059669',
                color: 'white',
                padding: '12px 16px',
                margin: 0,
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Income
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.keys(groupedIncome).sort().map(groupName => (
                    <React.Fragment key={groupName}>
                      <tr style={{ backgroundColor: '#f0fdf4' }}>
                        <td colSpan="2" style={{ padding: '10px 12px', fontWeight: '600', color: '#166534' }}>
                          {groupName}
                        </td>
                      </tr>
                      {groupedIncome[groupName].map(acc => (
                        <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px', paddingLeft: '24px' }}>{acc.name}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {Math.abs(parseFloat(acc.current_balance) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {incomeAccounts.length === 0 && (
                    <tr>
                      <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        No income accounts found
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#dcfce7', fontWeight: '700' }}>
                    <td style={{ padding: '12px' }}>Total Income</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{totalIncome.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Expense Section */}
            <div>
              <h3 style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '12px 16px',
                margin: 0,
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Expenses
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.keys(groupedExpenses).sort().map(groupName => (
                    <React.Fragment key={groupName}>
                      <tr style={{ backgroundColor: '#fef2f2' }}>
                        <td colSpan="2" style={{ padding: '10px 12px', fontWeight: '600', color: '#991b1b' }}>
                          {groupName}
                        </td>
                      </tr>
                      {groupedExpenses[groupName].map(acc => (
                        <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px', paddingLeft: '24px' }}>{acc.name}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {Math.abs(parseFloat(acc.current_balance) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {expenseAccounts.length === 0 && (
                    <tr>
                      <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        No expense accounts found
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#fee2e2', fontWeight: '700' }}>
                    <td style={{ padding: '12px' }}>Total Expenses</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{totalExpenses.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Net Profit/Loss */}
        {!loading && (
          <div style={{
            marginTop: '24px',
            padding: '20px',
            backgroundColor: netProfit >= 0 ? '#dcfce7' : '#fee2e2',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '700',
              color: netProfit >= 0 ? '#166534' : '#991b1b'
            }}>
              Net {netProfit >= 0 ? 'Profit' : 'Loss'}: {Math.abs(netProfit).toFixed(2)}
            </h3>
          </div>
        )}
      </div>

    </div>
  );
}

export default ProfitLoss;
