import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, financialYearAPI, settingsAPI } from '../services/api';
import { useToast } from './Toast';
import { formatIndianNumber, formatTallyDate } from '../utils/formatIndianNumber';
import './TallyReport.css';

function BalanceSheet() {
  const { showError } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadData(); }, [asOnDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ledgersRes = await ledgerAccountAPI.getAll({ as_on_date: asOnDate, page_size: 1000 });
      setLedgers(ledgersRes.data.results || ledgersRes.data || []);
      try {
        const fyRes = await financialYearAPI.getCurrent();
        if (fyRes.data && !fyRes.data.error) setFinancialYear(fyRes.data);
        else setFinancialYear(null);
      } catch (e) { setFinancialYear(null); }
      try {
        const s = await settingsAPI.getCompanySettings();
        setCompanyName(s.data?.company_name || '');
      } catch (e) {}
    } catch (err) {
      if (err.response?.status !== 404) showError('Failed to load balance sheet');
    } finally {
      setLoading(false);
    }
  };

  // Tally Balance Sheet hierarchy
  // Left (Liabilities): Capital Account, Current Liabilities, Loans (Liability)
  // Right (Assets): Fixed Assets, Investments, Current Assets, Misc Expenses
  const liabilityPrimaryGroups = ['Capital Account', 'Current Liabilities', 'Loans (Liability)', 'Branch / Divisions'];
  const assetPrimaryGroups = ['Fixed Assets', 'Investments', 'Current Assets', 'Loans & Advances (Asset)', 'Miscellaneous Expenses (ASSET)', 'Suspense Account'];

  const incomeGroupNames = ['Sales Accounts', 'Direct Incomes', 'Indirect Incomes'];
  const expenseGroupNames = ['Purchase Accounts', 'Direct Expenses', 'Indirect Expenses'];

  const categorize = () => {
    const liabilitySide = {};  // primaryGroup -> { subGroups: { sgName -> [ledgers] }, directLedgers: [] }
    const assetSide = {};
    let totalLiabilities = 0, totalAssets = 0;
    let totalIncome = 0, totalExpenses = 0;

    ledgers.forEach(l => {
      const bal = Math.abs(parseFloat(l.current_balance) || 0);
      if (bal === 0) return;

      const gn = l.group_name || '';
      const path = l.group_full_path || gn;
      const parts = path.split(' > ');
      const primaryGroup = parts[0];
      const subGroup = parts.length > 1 ? parts.slice(1).join(' > ') : null;

      // Check if it's P&L account (income/expense)
      if (incomeGroupNames.some(ig => primaryGroup === ig || gn.toLowerCase().includes(ig.toLowerCase())) || l.account_type === 'income') {
        totalIncome += bal;
        return;
      }
      if (expenseGroupNames.some(eg => primaryGroup === eg || gn.toLowerCase().includes(eg.toLowerCase())) || l.account_type === 'expense') {
        totalExpenses += bal;
        return;
      }

      // Determine which side
      let isLiability = liabilityPrimaryGroups.some(lg => primaryGroup === lg || gn.toLowerCase().includes(lg.toLowerCase())) ||
        l.account_type === 'liability' || l.account_type === 'creditor' || l.account_type === 'capital';
      let isAsset = assetPrimaryGroups.some(ag => primaryGroup === ag || gn.toLowerCase().includes(ag.toLowerCase())) ||
        l.account_type === 'asset' || l.account_type === 'debtor' || l.account_type === 'bank' || l.account_type === 'cash';

      if (!isLiability && !isAsset) {
        // Default: debit nature -> asset, credit nature -> liability
        isAsset = true;
      }

      const side = isLiability ? liabilitySide : assetSide;
      const pg = primaryGroup || gn;

      if (!side[pg]) side[pg] = { subGroups: {}, directLedgers: [] };

      if (subGroup) {
        if (!side[pg].subGroups[subGroup]) side[pg].subGroups[subGroup] = [];
        side[pg].subGroups[subGroup].push(l);
      } else {
        side[pg].directLedgers.push(l);
      }

      if (isLiability) totalLiabilities += bal;
      else totalAssets += bal;
    });

    const netProfit = totalIncome - totalExpenses;
    return { liabilitySide, assetSide, totalLiabilities, totalAssets, netProfit, totalIncome, totalExpenses };
  };

  const { liabilitySide, assetSide, totalLiabilities, totalAssets, netProfit } = categorize();
  const liabTotal = totalLiabilities + netProfit;

  const handleExport = () => {
    let csv = 'Side,Group,Account Name,Amount\n';
    const exportSide = (side, label) => {
      Object.keys(side).sort().forEach(pg => {
        const g = side[pg];
        g.directLedgers.forEach(l => {
          csv += `${label},"${pg}","${l.name}",${Math.abs(parseFloat(l.current_balance) || 0).toFixed(2)}\n`;
        });
        Object.keys(g.subGroups).sort().forEach(sg => {
          g.subGroups[sg].forEach(l => {
            csv += `${label},"${pg} > ${sg}","${l.name}",${Math.abs(parseFloat(l.current_balance) || 0).toFixed(2)}\n`;
          });
        });
      });
    };
    exportSide(liabilitySide, 'Liabilities');
    csv += `Liabilities,Profit & Loss A/c,,${Math.abs(netProfit).toFixed(2)}\n`;
    exportSide(assetSide, 'Assets');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${asOnDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderSideTable = (sideData, orderedGroups, sideLabel) => {
    const orderedKeys = orderedGroups.filter(g => sideData[g]);
    const otherKeys = Object.keys(sideData).filter(g => !orderedGroups.includes(g)).sort();
    const allKeys = [...orderedKeys, ...otherKeys];

    return (
      <>
        {/* Body content - takes up available space */}
        <div className="tally-t-body">
          <table className="tally-table">
            <thead>
              <tr>
                <th>Particulars</th>
                <th className="col-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {allKeys.map(pg => {
                const group = sideData[pg];
                const sgNames = Object.keys(group.subGroups).sort();
                let pgTotal = 0;
                group.directLedgers.forEach(l => pgTotal += Math.abs(parseFloat(l.current_balance) || 0));
                sgNames.forEach(sg => group.subGroups[sg].forEach(l => pgTotal += Math.abs(parseFloat(l.current_balance) || 0)));

                return (
                  <React.Fragment key={pg}>
                    <tr className="tally-group-row">
                      <td className="tally-indent-0">{pg}</td>
                      <td className="col-amount">{formatIndianNumber(pgTotal)}</td>
                    </tr>
                    {sgNames.map(sg => {
                      const sgTotal = group.subGroups[sg].reduce((s, l) => s + Math.abs(parseFloat(l.current_balance) || 0), 0);
                      return (
                        <React.Fragment key={sg}>
                          <tr className="tally-subgroup-row">
                            <td className="tally-indent-1">{sg}</td>
                            <td className="col-amount">{formatIndianNumber(sgTotal)}</td>
                          </tr>
                          {group.subGroups[sg].map(l => (
                            <tr key={l.id} className="tally-ledger-row">
                              <td className="tally-indent-2">{l.name}</td>
                              <td className="col-amount">{formatIndianNumber(Math.abs(parseFloat(l.current_balance) || 0))}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                    {group.directLedgers.map(l => (
                      <tr key={l.id} className="tally-ledger-row">
                        <td className="tally-indent-1">{l.name}</td>
                        <td className="col-amount">{formatIndianNumber(Math.abs(parseFloat(l.current_balance) || 0))}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* P&L carry-forward on Liabilities side */}
              {sideLabel === 'Liabilities' && (
                <tr className="tally-group-row">
                  <td className="tally-indent-0">Profit & Loss A/c</td>
                  <td className="col-amount">{formatIndianNumber(Math.abs(netProfit))}</td>
                </tr>
              )}

              {allKeys.length === 0 && sideLabel === 'Assets' && (
                <tr><td colSpan="2" className="tally-empty" style={{ padding: '20px' }}>No accounts found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals - always at bottom, aligned across both sides */}
        <div className="tally-t-totals">
          <table className="tally-table">
            <tbody>
              <tr className="tally-grand-total">
                <td>Total</td>
                <td className="col-amount">
                  {sideLabel === 'Liabilities'
                    ? formatIndianNumber(liabTotal)
                    : formatIndianNumber(totalAssets)
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="page-content">
      <div className="tally-report" id="balance-sheet-report">
        <div className="tally-report-header">
          {companyName && <p className="tally-company-name">{companyName}</p>}
          <p className="tally-report-title">Balance Sheet</p>
          <p className="tally-report-period">
            As on {formatTallyDate(asOnDate)}
            {financialYear ? ` (FY: ${financialYear.name})` : ''}
          </p>
        </div>

        <div className="tally-filter-bar">
          <label>As on Date:</label>
          <input type="date" value={asOnDate} onChange={(e) => setAsOnDate(e.target.value)} />
          <div className="tally-actions">
            <button className="tally-btn" onClick={handleExport}>Export CSV</button>
            <button className="tally-btn" onClick={() => window.print()}>Print</button>
          </div>
        </div>

        {loading ? (
          <div className="tally-loading">Loading Balance Sheet...</div>
        ) : (
          <>
            <div className="tally-t-format">
              <div className="tally-t-left">
                <div className="tally-t-side-header">Liabilities</div>
                {renderSideTable(liabilitySide, liabilityPrimaryGroups, 'Liabilities')}
              </div>
              <div className="tally-t-right">
                <div className="tally-t-side-header">Assets</div>
                {renderSideTable(assetSide, assetPrimaryGroups, 'Assets')}
              </div>
            </div>

            {Math.abs(totalAssets - liabTotal) > 0.01 && (
              <div style={{ textAlign: 'center', color: '#c00', fontWeight: '600', padding: '12px', borderTop: '1px solid #ddd' }}>
                Difference in Opening Balances: {formatIndianNumber(Math.abs(totalAssets - liabTotal))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default BalanceSheet;
