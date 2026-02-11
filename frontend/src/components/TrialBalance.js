import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, financialYearAPI, settingsAPI } from '../services/api';
import { useToast } from './Toast';
import { formatIndianNumber, formatTallyDate } from '../utils/formatIndianNumber';
import './TallyReport.css';

function TrialBalance() {
  const { showError } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  useEffect(() => {
    loadData();
  }, [asOnDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ledgersRes = await ledgerAccountAPI.getAll({ as_on_date: asOnDate, page_size: 1000 });
      setLedgers(ledgersRes.data.results || ledgersRes.data || []);

      try {
        const fyRes = await financialYearAPI.getCurrent();
        setFinancialYear(fyRes.data);
      } catch (e) { setFinancialYear(null); }

      try {
        const settingsRes = await settingsAPI.getCompanySettings();
        setCompanyName(settingsRes.data?.company_name || '');
      } catch (e) {}
    } catch (err) {
      if (err.response?.status !== 404) showError('Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  const filteredLedgers = ledgers.filter(ledger => {
    if (showZeroBalance) return true;
    return (parseFloat(ledger.current_balance) || 0) !== 0;
  });

  // Build hierarchical tree: Primary Group > Sub-Group > Ledgers
  const buildHierarchy = () => {
    const tree = {};

    filteredLedgers.forEach(ledger => {
      const path = ledger.group_full_path || ledger.group_name || 'Uncategorized';
      const parts = path.split(' > ');
      const primaryGroup = parts[0];
      const subGroup = parts.length > 1 ? parts.slice(1).join(' > ') : null;

      if (!tree[primaryGroup]) {
        tree[primaryGroup] = { ledgers: [], subGroups: {}, totalDr: 0, totalCr: 0 };
      }

      const balance = Math.abs(parseFloat(ledger.current_balance) || 0);
      const isDr = ledger.current_balance_type === 'Dr';

      if (subGroup) {
        if (!tree[primaryGroup].subGroups[subGroup]) {
          tree[primaryGroup].subGroups[subGroup] = { ledgers: [], totalDr: 0, totalCr: 0 };
        }
        tree[primaryGroup].subGroups[subGroup].ledgers.push(ledger);
        if (isDr) {
          tree[primaryGroup].subGroups[subGroup].totalDr += balance;
          tree[primaryGroup].totalDr += balance;
        } else {
          tree[primaryGroup].subGroups[subGroup].totalCr += balance;
          tree[primaryGroup].totalCr += balance;
        }
      } else {
        tree[primaryGroup].ledgers.push(ledger);
        if (isDr) tree[primaryGroup].totalDr += balance;
        else tree[primaryGroup].totalCr += balance;
      }
    });

    return tree;
  };

  const tree = buildHierarchy();
  const sortedGroups = Object.keys(tree).sort();

  // Calculate totals
  let totalDebit = 0, totalCredit = 0;
  filteredLedgers.forEach(ledger => {
    const balance = Math.abs(parseFloat(ledger.current_balance) || 0);
    if (ledger.current_balance_type === 'Dr') totalDebit += balance;
    else totalCredit += balance;
  });
  const difference = Math.abs(totalDebit - totalCredit);

  // Expand all by default on first load
  useEffect(() => {
    if (sortedGroups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(sortedGroups));
    }
  }, [sortedGroups.length]);

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set(sortedGroups);
    sortedGroups.forEach(g => {
      Object.keys(tree[g].subGroups).forEach(sg => all.add(g + '>' + sg));
    });
    setExpandedGroups(all);
  };

  const collapseAll = () => setExpandedGroups(new Set());

  const handleExport = () => {
    let csv = 'Account Name,Group,Debit,Credit\n';
    filteredLedgers.forEach(ledger => {
      const balance = Math.abs(parseFloat(ledger.current_balance) || 0);
      const debit = ledger.current_balance_type === 'Dr' ? balance.toFixed(2) : '';
      const credit = ledger.current_balance_type === 'Cr' ? balance.toFixed(2) : '';
      csv += `"${ledger.name}","${ledger.group_full_path || ledger.group_name || ''}",${debit},${credit}\n`;
    });
    csv += `"Total",,${totalDebit.toFixed(2)},${totalCredit.toFixed(2)}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trial-balance-${asOnDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content">
      <div className="tally-report" id="trial-balance-report">
        {/* Tally-style Report Header */}
        <div className="tally-report-header">
          {companyName && <p className="tally-company-name">{companyName}</p>}
          <p className="tally-report-title">Trial Balance</p>
          <p className="tally-report-period">
            As on {formatTallyDate(asOnDate)}
            {financialYear ? ` (FY: ${financialYear.name})` : ''}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="tally-filter-bar">
          <label>As on Date:</label>
          <input type="date" value={asOnDate} onChange={(e) => setAsOnDate(e.target.value)} />
          <label className="tally-checkbox-label">
            <input type="checkbox" checked={showZeroBalance} onChange={(e) => setShowZeroBalance(e.target.checked)} />
            Show Zero Balance
          </label>
          <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
          <button className="tally-btn" onClick={expandAll}>Expand All</button>
          <button className="tally-btn" onClick={collapseAll}>Collapse All</button>
          <div className="tally-actions">
            <button className="tally-btn" onClick={handleExport}>Export CSV</button>
            <button className="tally-btn" onClick={() => window.print()}>Print</button>
          </div>
        </div>

        {loading ? (
          <div className="tally-loading">Loading trial balance...</div>
        ) : filteredLedgers.length === 0 ? (
          <div className="tally-empty">No ledger accounts with balances found for the selected date.</div>
        ) : (
          <table className="tally-table">
            <thead>
              <tr>
                <th>Particulars</th>
                <th className="col-amount">Debit</th>
                <th className="col-amount">Credit</th>
              </tr>
            </thead>
            <tbody>
              {sortedGroups.map(groupName => {
                const group = tree[groupName];
                const isExpanded = expandedGroups.has(groupName);
                const hasChildren = group.ledgers.length > 0 || Object.keys(group.subGroups).length > 0;
                const subGroupNames = Object.keys(group.subGroups).sort();

                return (
                  <React.Fragment key={groupName}>
                    {/* Primary Group Row */}
                    <tr className="tally-group-row" onClick={() => toggleGroup(groupName)} style={{ cursor: 'pointer' }}>
                      <td className="tally-indent-0">
                        <span className="tally-expand-btn">{hasChildren ? (isExpanded ? '\u25BC' : '\u25B6') : ' '}</span>
                        {groupName}
                      </td>
                      <td className="col-amount">
                        {!isExpanded && group.totalDr > 0 ? formatIndianNumber(group.totalDr) : ''}
                      </td>
                      <td className="col-amount">
                        {!isExpanded && group.totalCr > 0 ? formatIndianNumber(group.totalCr) : ''}
                      </td>
                    </tr>

                    {/* Expanded: Show sub-groups and direct ledgers */}
                    {isExpanded && (
                      <>
                        {/* Sub-groups */}
                        {subGroupNames.map(sgName => {
                          const sg = group.subGroups[sgName];
                          const sgKey = groupName + '>' + sgName;
                          const sgExpanded = expandedGroups.has(sgKey);

                          return (
                            <React.Fragment key={sgKey}>
                              <tr className="tally-subgroup-row" onClick={() => toggleGroup(sgKey)} style={{ cursor: 'pointer' }}>
                                <td className="tally-indent-1">
                                  <span className="tally-expand-btn">{sgExpanded ? '\u25BC' : '\u25B6'}</span>
                                  {sgName}
                                </td>
                                <td className="col-amount">
                                  {!sgExpanded && sg.totalDr > 0 ? formatIndianNumber(sg.totalDr) : ''}
                                </td>
                                <td className="col-amount">
                                  {!sgExpanded && sg.totalCr > 0 ? formatIndianNumber(sg.totalCr) : ''}
                                </td>
                              </tr>
                              {sgExpanded && sg.ledgers.map(ledger => {
                                const bal = Math.abs(parseFloat(ledger.current_balance) || 0);
                                const isDr = ledger.current_balance_type === 'Dr';
                                return (
                                  <tr key={ledger.id} className="tally-ledger-row">
                                    <td className="tally-indent-2">{ledger.name}</td>
                                    <td className="col-amount">{isDr ? formatIndianNumber(bal) : ''}</td>
                                    <td className="col-amount">{!isDr ? formatIndianNumber(bal) : ''}</td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}

                        {/* Direct ledgers (no sub-group) */}
                        {group.ledgers.map(ledger => {
                          const bal = Math.abs(parseFloat(ledger.current_balance) || 0);
                          const isDr = ledger.current_balance_type === 'Dr';
                          return (
                            <tr key={ledger.id} className="tally-ledger-row">
                              <td className="tally-indent-1">{ledger.name}</td>
                              <td className="col-amount">{isDr ? formatIndianNumber(bal) : ''}</td>
                              <td className="col-amount">{!isDr ? formatIndianNumber(bal) : ''}</td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="tally-grand-total">
                <td>Total</td>
                <td className="col-amount">{formatIndianNumber(totalDebit)}</td>
                <td className="col-amount">{formatIndianNumber(totalCredit)}</td>
              </tr>
              {difference > 0.01 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: '#c00', fontWeight: '600', padding: '10px' }}>
                    Difference in Trial Balance: {formatIndianNumber(difference)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

export default TrialBalance;
