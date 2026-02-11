import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, financialYearAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';
import './Accounting.css';

function TrialBalance() {
  const { showError } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [financialYear, setFinancialYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [showZeroBalance, setShowZeroBalance] = useState(false);

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
        setFinancialYear(fyRes.data);
      } catch (fyErr) {
        // Financial year not set up yet - that's okay
        // No financial year configured
        setFinancialYear(null);
      }
    } catch (err) {
      // Only show error if it's not a "no data" situation
      if (err.response?.status !== 404) {
        showError('Failed to load trial balance');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;

    filteredLedgers.forEach(ledger => {
      const balance = parseFloat(ledger.current_balance) || 0;
      if (ledger.current_balance_type === 'Dr' || balance > 0) {
        totalDebit += Math.abs(balance);
      } else {
        totalCredit += Math.abs(balance);
      }
    });

    return { totalDebit, totalCredit, difference: Math.abs(totalDebit - totalCredit) };
  };

  const filteredLedgers = ledgers.filter(ledger => {
    if (showZeroBalance) return true;
    const balance = parseFloat(ledger.current_balance) || 0;
    return balance !== 0;
  });

  // Group ledgers by their group
  const groupedLedgers = filteredLedgers.reduce((acc, ledger) => {
    const groupName = ledger.group_name || 'Uncategorized';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(ledger);
    return acc;
  }, {});

  const { totalDebit, totalCredit, difference } = calculateTotals();

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Simple CSV export
    let csv = 'Account Name,Group,Debit,Credit\n';
    filteredLedgers.forEach(ledger => {
      const balance = parseFloat(ledger.current_balance) || 0;
      const debit = ledger.current_balance_type === 'Dr' ? Math.abs(balance).toFixed(2) : '';
      const credit = ledger.current_balance_type === 'Cr' ? Math.abs(balance).toFixed(2) : '';
      csv += `"${ledger.name}","${ledger.group_name || ''}",${debit},${credit}\n`;
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
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Trial Balance</h1>
          <p className="page-description">View account balances as on a specific date</p>
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
          <label style={{ marginRight: '8px', fontWeight: '500' }}>As on Date:</label>
          <input
            type="date"
            className="filter-select"
            value={asOnDate}
            onChange={(e) => setAsOnDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showZeroBalance}
              onChange={(e) => setShowZeroBalance(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Show Zero Balance Accounts
          </label>
        </div>
      </div>

      {/* Trial Balance Report */}
      <div className="content-card" id="trial-balance-report">
        <div style={{
          textAlign: 'center',
          padding: '20px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
            Trial Balance
          </h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
            As on {new Date(asOnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
            <div>Loading trial balance...</div>
          </div>
        ) : filteredLedgers.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon-large">📊</div>
            <h3 className="empty-title">No Data Available</h3>
            <p className="empty-description">No ledger accounts with balances found for the selected date.</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Particulars</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '150px' }}>Debit (Dr)</th>
                  <th style={{ textAlign: 'right', padding: '12px', width: '150px' }}>Credit (Cr)</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedLedgers).sort().map(groupName => (
                  <React.Fragment key={groupName}>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <td colSpan="3" style={{ padding: '10px 12px', fontWeight: '600', color: '#475569' }}>
                        {groupName}
                      </td>
                    </tr>
                    {groupedLedgers[groupName].map(ledger => {
                      const balance = parseFloat(ledger.current_balance) || 0;
                      const isDebit = ledger.current_balance_type === 'Dr' || balance > 0;
                      return (
                        <tr key={ledger.id}>
                          <td style={{ padding: '10px 12px', paddingLeft: '32px' }}>
                            {ledger.name}
                          </td>
                          <td style={{ textAlign: 'right', padding: '10px 12px', color: '#059669' }}>
                            {isDebit ? Math.abs(balance).toFixed(2) : ''}
                          </td>
                          <td style={{ textAlign: 'right', padding: '10px 12px', color: '#dc2626' }}>
                            {!isDebit ? Math.abs(balance).toFixed(2) : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#1e293b', color: 'white', fontWeight: '700' }}>
                  <td style={{ padding: '14px 12px' }}>Total</td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>
                    {totalDebit.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '14px 12px' }}>
                    {totalCredit.toFixed(2)}
                  </td>
                </tr>
                {difference > 0.01 && (
                  <tr style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                    <td colSpan="3" style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>
                      ⚠️ Trial Balance does not match! Difference: {difference.toFixed(2)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default TrialBalance;
