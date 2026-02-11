import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, financialYearAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';
import './Accounting.css';

function BalanceSheet() {
  const { showError } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [asOnDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load ledger accounts
      const ledgersRes = await ledgerAccountAPI.getAll({ as_on_date: asOnDate });
      setLedgers(ledgersRes.data.results || ledgersRes.data || []);

      // Try to load financial year (optional - may not exist yet)
      try {
        const fyRes = await financialYearAPI.getCurrent();
        if (fyRes.data && !fyRes.data.error) {
          setFinancialYear(fyRes.data);
        } else {
          setFinancialYear(null);
        }
      } catch (fyErr) {
        // Financial year not set up yet - that's okay
        setFinancialYear(null);
      }
    } catch (err) {
      // Only show error if it's not a "no data" situation
      if (err.response?.status !== 404) {
        showError('Failed to load balance sheet');
      }
    } finally {
      setLoading(false);
    }
  };

  // Categorize accounts
  const assetGroups = ['Current Assets', 'Fixed Assets', 'Investments', 'Bank Accounts', 'Cash-in-Hand', 'Stock-in-Hand', 'Sundry Debtors', 'Loans & Advances (Asset)'];
  const liabilityGroups = ['Current Liabilities', 'Loans (Liability)', 'Sundry Creditors', 'Duties & Taxes', 'Provisions'];
  const capitalGroups = ['Capital Account', 'Reserves & Surplus', 'Retained Earnings'];

  const matchesGroup = (groupName, patterns) => {
    if (!groupName) return false;
    const lowerName = groupName.toLowerCase();
    return patterns.some(p => lowerName.includes(p.toLowerCase()));
  };

  const getAssets = () => {
    return ledgers.filter(l =>
      matchesGroup(l.group_name, assetGroups) ||
      l.account_type === 'asset' ||
      l.account_type === 'debtor' ||
      l.account_type === 'bank' ||
      l.account_type === 'cash'
    );
  };

  const getLiabilities = () => {
    return ledgers.filter(l =>
      matchesGroup(l.group_name, liabilityGroups) ||
      l.account_type === 'liability' ||
      l.account_type === 'creditor'
    );
  };

  const getCapital = () => {
    return ledgers.filter(l =>
      matchesGroup(l.group_name, capitalGroups) ||
      l.account_type === 'capital'
    );
  };

  // Calculate P&L for the period (to show in Balance Sheet)
  const getIncome = () => {
    const incomeGroups = ['Sales Accounts', 'Direct Incomes', 'Indirect Incomes', 'Income'];
    return ledgers.filter(l =>
      incomeGroups.some(g => l.group_name?.toLowerCase().includes(g.toLowerCase())) ||
      l.account_type === 'income'
    );
  };

  const getExpenses = () => {
    const expenseGroups = ['Purchase Accounts', 'Direct Expenses', 'Indirect Expenses', 'Expenses'];
    return ledgers.filter(l =>
      expenseGroups.some(g => l.group_name?.toLowerCase().includes(g.toLowerCase())) ||
      l.account_type === 'expense'
    );
  };

  const calculateTotal = (accounts) => {
    return accounts.reduce((sum, acc) => sum + Math.abs(parseFloat(acc.current_balance) || 0), 0);
  };

  const assets = getAssets();
  const liabilities = getLiabilities();
  const capital = getCapital();
  const incomeAccounts = getIncome();
  const expenseAccounts = getExpenses();

  const totalAssets = calculateTotal(assets);
  const totalLiabilities = calculateTotal(liabilities);
  const totalCapital = calculateTotal(capital);
  const totalIncome = calculateTotal(incomeAccounts);
  const totalExpenses = calculateTotal(expenseAccounts);
  const netProfit = totalIncome - totalExpenses;

  // Liabilities side = Liabilities + Capital + Profit (or - Loss)
  const liabilitiesSide = totalLiabilities + totalCapital + netProfit;

  // Group accounts
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

  const groupedAssets = groupAccounts(assets);
  const groupedLiabilities = groupAccounts(liabilities);
  const groupedCapital = groupAccounts(capital);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    let csv = 'Side,Type,Account Name,Group,Amount\n';

    csv += '\nASSETS\n';
    assets.forEach(acc => {
      csv += `Assets,Asset,"${acc.name}","${acc.group_name || ''}",${Math.abs(parseFloat(acc.current_balance) || 0).toFixed(2)}\n`;
    });
    csv += `Assets,Total Assets,,,${totalAssets.toFixed(2)}\n`;

    csv += '\nLIABILITIES\n';
    liabilities.forEach(acc => {
      csv += `Liabilities,Liability,"${acc.name}","${acc.group_name || ''}",${Math.abs(parseFloat(acc.current_balance) || 0).toFixed(2)}\n`;
    });
    csv += `Liabilities,Total Liabilities,,,${totalLiabilities.toFixed(2)}\n`;

    csv += '\nCAPITAL\n';
    capital.forEach(acc => {
      csv += `Capital,Capital,"${acc.name}","${acc.group_name || ''}",${Math.abs(parseFloat(acc.current_balance) || 0).toFixed(2)}\n`;
    });
    csv += `Capital,Total Capital,,,${totalCapital.toFixed(2)}\n`;
    csv += `Capital,Net ${netProfit >= 0 ? 'Profit' : 'Loss'},,,${Math.abs(netProfit).toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `balance-sheet-${asOnDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Balance Sheet</h1>
          <p className="page-description">View assets, liabilities, and capital position</p>
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

      {/* Date Filter */}
      <div className="filters-section" style={{ marginBottom: '24px' }}>
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

      {/* Balance Sheet Report */}
      <div className="content-card" id="balance-sheet-report">
        <div style={{
          textAlign: 'center',
          padding: '20px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
            Balance Sheet
          </h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
            As on {new Date(asOnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
            <div>Loading balance sheet...</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Liabilities & Capital Side */}
            <div>
              <h3 style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '12px 16px',
                margin: 0,
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Liabilities & Capital
              </h3>

              {/* Capital Section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#fef3c7', padding: '10px 12px', fontWeight: '600', color: '#92400e' }}>
                  Capital Account
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.keys(groupedCapital).sort().map(groupName => (
                      <React.Fragment key={groupName}>
                        {groupedCapital[groupName].map(acc => (
                          <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '8px 12px', paddingLeft: '24px' }}>{acc.name}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              {Math.abs(parseFloat(acc.current_balance) || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {/* Current Period Profit/Loss */}
                    <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: netProfit >= 0 ? '#f0fdf4' : '#fef2f2' }}>
                      <td style={{ padding: '8px 12px', paddingLeft: '24px', fontStyle: 'italic' }}>
                        Current Period {netProfit >= 0 ? 'Profit' : 'Loss'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: netProfit >= 0 ? '#166534' : '#991b1b' }}>
                        {Math.abs(netProfit).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#fef3c7', fontWeight: '600' }}>
                      <td style={{ padding: '10px 12px' }}>Total Capital</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{(totalCapital + netProfit).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Liabilities Section */}
              <div>
                <div style={{ backgroundColor: '#fee2e2', padding: '10px 12px', fontWeight: '600', color: '#991b1b' }}>
                  Liabilities
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.keys(groupedLiabilities).sort().map(groupName => (
                      <React.Fragment key={groupName}>
                        <tr style={{ backgroundColor: '#fff5f5' }}>
                          <td colSpan="2" style={{ padding: '8px 12px', fontWeight: '500', color: '#be123c', fontSize: '13px' }}>
                            {groupName}
                          </td>
                        </tr>
                        {groupedLiabilities[groupName].map(acc => (
                          <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '8px 12px', paddingLeft: '24px' }}>{acc.name}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              {Math.abs(parseFloat(acc.current_balance) || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {liabilities.length === 0 && (
                      <tr>
                        <td colSpan="2" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                          No liabilities
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#fee2e2', fontWeight: '600' }}>
                      <td style={{ padding: '10px 12px' }}>Total Liabilities</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{totalLiabilities.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Grand Total */}
              <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '14px 12px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <span>Total</span>
                <span>{liabilitiesSide.toFixed(2)}</span>
              </div>
            </div>

            {/* Assets Side */}
            <div>
              <h3 style={{
                backgroundColor: '#059669',
                color: 'white',
                padding: '12px 16px',
                margin: 0,
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Assets
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.keys(groupedAssets).sort().map(groupName => (
                    <React.Fragment key={groupName}>
                      <tr style={{ backgroundColor: '#f0fdf4' }}>
                        <td colSpan="2" style={{ padding: '10px 12px', fontWeight: '600', color: '#166534' }}>
                          {groupName}
                        </td>
                      </tr>
                      {groupedAssets[groupName].map(acc => (
                        <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px', paddingLeft: '24px' }}>{acc.name}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {Math.abs(parseFloat(acc.current_balance) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {assets.length === 0 && (
                    <tr>
                      <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        No assets found
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#dcfce7', fontWeight: '700' }}>
                    <td style={{ padding: '12px' }}>Total Assets</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{totalAssets.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Balance check */}
              <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '14px 12px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <span>Total</span>
                <span>{totalAssets.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Balance Check */}
        {!loading && Math.abs(totalAssets - liabilitiesSide) > 0.01 && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#dc2626',
            fontWeight: '600'
          }}>
            ⚠️ Balance Sheet does not balance! Difference: {Math.abs(totalAssets - liabilitiesSide).toFixed(2)}
          </div>
        )}
      </div>

    </div>
  );
}

export default BalanceSheet;
