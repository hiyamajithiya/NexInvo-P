import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, accountGroupAPI, financialYearAPI, settingsAPI } from '../services/api';
import { useToast } from './Toast';
import { formatIndianNumber, formatTallyDate } from '../utils/formatIndianNumber';
import './TallyReport.css';

function ProfitLoss() {
  const { showError } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadFinancialYear(); }, []);
  useEffect(() => { if (fromDate && toDate) loadData(); }, [fromDate, toDate]);

  const loadFinancialYear = async () => {
    try {
      const fyRes = await financialYearAPI.getCurrent();
      if (fyRes.data && !fyRes.data.error) {
        setFinancialYear(fyRes.data);
        setFromDate(fyRes.data.start_date);
        return;
      }
    } catch (e) {}
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 3, 1);
    if (today < startOfYear) startOfYear.setFullYear(startOfYear.getFullYear() - 1);
    setFromDate(startOfYear.toISOString().split('T')[0]);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [ledgersRes] = await Promise.all([
        ledgerAccountAPI.getAll({ from_date: fromDate, to_date: toDate, page_size: 1000 })
      ]);
      setLedgers(ledgersRes.data.results || ledgersRes.data || []);
      try {
        const s = await settingsAPI.getCompanySettings();
        setCompanyName(s.data?.company_name || '');
      } catch (e) {}
    } catch (err) {
      showError('Failed to load Profit & Loss report');
    } finally {
      setLoading(false);
    }
  };

  // Tally P&L categorization
  // Left side (Expenses): Purchase Accounts, Direct Expenses, Indirect Expenses
  // Right side (Incomes): Sales Accounts, Direct Incomes, Indirect Incomes
  const expenseGroupOrder = ['Purchase Accounts', 'Direct Expenses', 'Indirect Expenses'];
  const incomeGroupOrder = ['Sales Accounts', 'Direct Incomes', 'Indirect Incomes'];

  const categorize = () => {
    const expenses = {};  // groupName -> [ledgers]
    const incomes = {};
    let totalExpense = 0, totalIncome = 0;

    ledgers.forEach(l => {
      const bal = Math.abs(parseFloat(l.current_balance) || 0);
      if (bal === 0) return;

      const gn = l.group_name || '';
      const gnLower = gn.toLowerCase();
      const path = l.group_full_path || gn;
      const primaryGroup = path.split(' > ')[0];

      let isExpense = false, isIncome = false;

      if (expenseGroupOrder.some(eg => primaryGroup === eg || gnLower.includes(eg.toLowerCase())) || l.account_type === 'expense') {
        isExpense = true;
      } else if (incomeGroupOrder.some(ig => primaryGroup === ig || gnLower.includes(ig.toLowerCase())) || l.account_type === 'income') {
        isIncome = true;
      }

      if (isExpense) {
        const key = primaryGroup || gn;
        if (!expenses[key]) expenses[key] = [];
        expenses[key].push(l);
        totalExpense += bal;
      } else if (isIncome) {
        const key = primaryGroup || gn;
        if (!incomes[key]) incomes[key] = [];
        incomes[key].push(l);
        totalIncome += bal;
      }
    });

    return { expenses, incomes, totalExpense, totalIncome };
  };

  const { expenses, incomes, totalExpense, totalIncome } = categorize();
  const netProfit = totalIncome - totalExpense;
  const isProfit = netProfit >= 0;

  // Both sides should balance
  const grandTotal = isProfit ? totalIncome : totalExpense;

  const handleExport = () => {
    let csv = 'Side,Group,Account Name,Amount\n';
    Object.keys(expenses).forEach(g => {
      expenses[g].forEach(a => {
        csv += `Expenses,"${g}","${a.name}",${Math.abs(parseFloat(a.current_balance) || 0).toFixed(2)}\n`;
      });
    });
    csv += `Expenses,Total Expenses,,${totalExpense.toFixed(2)}\n`;
    Object.keys(incomes).forEach(g => {
      incomes[g].forEach(a => {
        csv += `Income,"${g}","${a.name}",${Math.abs(parseFloat(a.current_balance) || 0).toFixed(2)}\n`;
      });
    });
    csv += `Income,Total Income,,${totalIncome.toFixed(2)}\n`;
    csv += `${isProfit ? 'Net Profit' : 'Net Loss'},,,${Math.abs(netProfit).toFixed(2)}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${fromDate}-to-${toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderSide = (grouped, groupOrder, totalLabel, total) => {
    const orderedKeys = groupOrder.filter(g => grouped[g]);
    const otherKeys = Object.keys(grouped).filter(g => !groupOrder.includes(g)).sort();
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
              {allKeys.map(groupName => {
                const accs = grouped[groupName];
                const groupTotal = accs.reduce((s, a) => s + Math.abs(parseFloat(a.current_balance) || 0), 0);
                return (
                  <React.Fragment key={groupName}>
                    <tr className="tally-group-row">
                      <td className="tally-indent-0">{groupName}</td>
                      <td className="col-amount">{formatIndianNumber(groupTotal)}</td>
                    </tr>
                    {accs.map(acc => (
                      <tr key={acc.id} className="tally-ledger-row">
                        <td className="tally-indent-1">{acc.name}</td>
                        <td className="col-amount">{formatIndianNumber(Math.abs(parseFloat(acc.current_balance) || 0))}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {allKeys.length === 0 && (
                <tr><td colSpan="2" className="tally-empty" style={{ padding: '20px' }}>No accounts found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals - always at bottom, aligned across both sides */}
        <div className="tally-t-totals">
          <table className="tally-table">
            <tbody>
              <tr className="tally-subtotal-row">
                <td>{totalLabel}</td>
                <td className="col-amount">{formatIndianNumber(total)}</td>
              </tr>
              {/* Balancing entry: Net Profit on Expense side, Net Loss on Income side */}
              {totalLabel === 'Total Expenses' && isProfit && (
                <tr className="tally-group-row">
                  <td className="tally-indent-0">Net Profit</td>
                  <td className="col-amount">{formatIndianNumber(Math.abs(netProfit))}</td>
                </tr>
              )}
              {totalLabel === 'Total Income' && !isProfit && (
                <tr className="tally-group-row">
                  <td className="tally-indent-0">Net Loss</td>
                  <td className="col-amount">{formatIndianNumber(Math.abs(netProfit))}</td>
                </tr>
              )}
              <tr className="tally-grand-total">
                <td>Total</td>
                <td className="col-amount">{formatIndianNumber(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="page-content">
      <div className="tally-report" id="pnl-report">
        {/* Report Header */}
        <div className="tally-report-header">
          {companyName && <p className="tally-company-name">{companyName}</p>}
          <p className="tally-report-title">Profit & Loss Account</p>
          <p className="tally-report-period">
            {formatTallyDate(fromDate)} to {formatTallyDate(toDate)}
            {financialYear ? ` (FY: ${financialYear.name})` : ''}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="tally-filter-bar">
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
          <div className="tally-loading">Loading Profit & Loss...</div>
        ) : (
          <>
            {/* T-Format: Expenses Left | Income Right */}
            <div className="tally-t-format">
              <div className="tally-t-left">
                <div className="tally-t-side-header">Expenses (Debit)</div>
                {renderSide(expenses, expenseGroupOrder, 'Total Expenses', totalExpense)}
              </div>
              <div className="tally-t-right">
                <div className="tally-t-side-header">Income (Credit)</div>
                {renderSide(incomes, incomeGroupOrder, 'Total Income', totalIncome)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProfitLoss;
