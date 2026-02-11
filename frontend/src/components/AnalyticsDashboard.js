import React, { useState, useEffect } from 'react';
import { ledgerAccountAPI, invoiceAPI, voucherAPI, financialYearAPI } from '../services/api';
import { useToast } from './Toast';
import './Pages.css';

function AnalyticsDashboard() {
  const { showError } = useToast();
  const [financialYear, setFinancialYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  // Analytics data
  const [cashFlowData, setCashFlowData] = useState([]);
  const [incomeVsExpense, setIncomeVsExpense] = useState({ income: 0, expense: 0 });
  const [topDebtors, setTopDebtors] = useState([]);
  const [topCreditors, setTopCreditors] = useState([]);
  const [collectionTrend, setCollectionTrend] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);

  useEffect(() => {
    loadFinancialYear();
  }, []);

  useEffect(() => {
    if (fromDate && toDate) {
      loadAnalytics();
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
      // Financial year not configured, use defaults
    }

    // Default dates
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 3, 1);
    if (today < startOfYear) {
      startOfYear.setFullYear(startOfYear.getFullYear() - 1);
    }
    setFromDate(startOfYear.toISOString().split('T')[0]);
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCashFlow(),
        loadIncomeVsExpense(),
        loadTopDebtorsCreditors(),
        loadCollectionTrend(),
        loadMonthlyRevenue()
      ]);
    } catch (err) {
      showError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const loadCashFlow = async () => {
    try {
      // Get receipt and payment vouchers
      const [receiptsRes, paymentsRes] = await Promise.all([
        voucherAPI.getAll({ voucher_type: 'receipt', from_date: fromDate, to_date: toDate }),
        voucherAPI.getAll({ voucher_type: 'payment', from_date: fromDate, to_date: toDate })
      ]);

      const receipts = receiptsRes.data.results || receiptsRes.data || [];
      const payments = paymentsRes.data.results || paymentsRes.data || [];

      // Group by month
      const monthlyData = {};

      receipts.forEach(v => {
        const month = v.voucher_date.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { receipts: 0, payments: 0 };
        const amount = (v.entries || []).reduce((sum, e) => sum + parseFloat(e.debit_amount || 0), 0);
        monthlyData[month].receipts += amount;
      });

      payments.forEach(v => {
        const month = v.voucher_date.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { receipts: 0, payments: 0 };
        const amount = (v.entries || []).reduce((sum, e) => sum + parseFloat(e.credit_amount || 0), 0);
        monthlyData[month].payments += amount;
      });

      const cashFlowArray = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month: formatMonth(month),
          receipts: data.receipts,
          payments: data.payments,
          net: data.receipts - data.payments
        }));

      setCashFlowData(cashFlowArray);
    } catch (err) {
      // Error handled silently
    }
  };

  const loadIncomeVsExpense = async () => {
    try {
      const ledgersRes = await ledgerAccountAPI.getAll({ from_date: fromDate, to_date: toDate });
      const ledgers = ledgersRes.data.results || ledgersRes.data || [];

      let totalIncome = 0, totalExpense = 0;

      ledgers.forEach(ledger => {
        const balance = Math.abs(parseFloat(ledger.current_balance) || 0);
        if (ledger.account_type === 'income' || ledger.group_name?.toLowerCase().includes('income') || ledger.group_name?.toLowerCase().includes('sales')) {
          totalIncome += balance;
        } else if (ledger.account_type === 'expense' || ledger.group_name?.toLowerCase().includes('expense') || ledger.group_name?.toLowerCase().includes('purchase')) {
          totalExpense += balance;
        }
      });

      setIncomeVsExpense({ income: totalIncome, expense: totalExpense });
    } catch (err) {
      // Error handled silently
    }
  };

  const loadTopDebtorsCreditors = async () => {
    try {
      const ledgersRes = await ledgerAccountAPI.getAll({ as_on_date: toDate });
      const ledgers = ledgersRes.data.results || ledgersRes.data || [];

      const debtors = ledgers
        .filter(l => l.account_type === 'debtor' || l.group_name?.toLowerCase().includes('debtor'))
        .map(l => ({ name: l.name, balance: Math.abs(parseFloat(l.current_balance) || 0) }))
        .filter(l => l.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5);

      const creditors = ledgers
        .filter(l => l.account_type === 'creditor' || l.group_name?.toLowerCase().includes('creditor'))
        .map(l => ({ name: l.name, balance: Math.abs(parseFloat(l.current_balance) || 0) }))
        .filter(l => l.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5);

      setTopDebtors(debtors);
      setTopCreditors(creditors);
    } catch (err) {
      // Error handled silently
    }
  };

  const loadCollectionTrend = async () => {
    try {
      const receiptsRes = await voucherAPI.getAll({
        voucher_type: 'receipt',
        from_date: fromDate,
        to_date: toDate
      });
      const receipts = receiptsRes.data.results || receiptsRes.data || [];

      // Group by week
      const weeklyData = {};
      receipts.forEach(v => {
        const date = new Date(v.voucher_date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) weeklyData[weekKey] = 0;
        const amount = (v.entries || []).reduce((sum, e) => sum + parseFloat(e.debit_amount || 0), 0);
        weeklyData[weekKey] += amount;
      });

      const trendArray = Object.entries(weeklyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-8) // Last 8 weeks
        .map(([week, amount]) => ({
          week: formatWeek(week),
          amount
        }));

      setCollectionTrend(trendArray);
    } catch (err) {
      // Error handled silently
    }
  };

  const loadMonthlyRevenue = async () => {
    try {
      const invoicesRes = await invoiceAPI.getAll({
        from_date: fromDate,
        to_date: toDate
      });
      const invoices = invoicesRes.data.results || invoicesRes.data || [];

      // Group by month
      const monthlyData = {};
      invoices.forEach(inv => {
        const month = (inv.invoice_date || inv.date).substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { invoiced: 0, collected: 0 };
        monthlyData[month].invoiced += parseFloat(inv.total) || 0;
        monthlyData[month].collected += parseFloat(inv.amount_paid) || 0;
      });

      const revenueArray = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month: formatMonth(month),
          invoiced: data.invoiced,
          collected: data.collected,
          pending: data.invoiced - data.collected
        }));

      setMonthlyRevenue(revenueArray);
    } catch (err) {
      // Error handled silently
    }
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
  };

  const formatWeek = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const maxCashFlow = Math.max(...cashFlowData.map(d => Math.max(d.receipts, d.payments)), 1);
  const maxRevenue = Math.max(...monthlyRevenue.map(d => d.invoiced), 1);
  const maxCollection = Math.max(...collectionTrend.map(d => d.amount), 1);

  const netProfit = incomeVsExpense.income - incomeVsExpense.expense;
  const totalReceivables = topDebtors.reduce((sum, d) => sum + d.balance, 0);
  const totalPayables = topCreditors.reduce((sum, c) => sum + c.balance, 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Analytics Dashboard</h1>
          <p className="page-description">Financial insights and trends</p>
          {financialYear && (
            <span className="badge badge-primary" style={{ marginTop: '8px' }}>
              FY: {financialYear.name}
            </span>
          )}
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={loadAnalytics} disabled={loading}>
            <span className="btn-icon">🔄</span>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Date Filters */}
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>...</div>
          <div>Loading analytics...</div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', color: '#166534', marginBottom: '8px' }}>Total Income</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#059669' }}>
                {incomeVsExpense.income.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#fef2f2', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', color: '#991b1b', marginBottom: '8px' }}>Total Expense</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>
                {incomeVsExpense.expense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div style={{ padding: '20px', backgroundColor: netProfit >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', color: netProfit >= 0 ? '#166534' : '#991b1b', marginBottom: '8px' }}>
                Net {netProfit >= 0 ? 'Profit' : 'Loss'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: netProfit >= 0 ? '#059669' : '#dc2626' }}>
                {Math.abs(netProfit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#eff6ff', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', color: '#1e40af', marginBottom: '8px' }}>Working Capital</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#2563eb' }}>
                {(totalReceivables - totalPayables).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Cash Flow Chart */}
            <div className="content-card">
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>Cash Flow (Monthly)</h3>
              {cashFlowData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No data available</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cashFlowData.map((data, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '60px', fontSize: '12px', color: '#64748b' }}>{data.month}</div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: `${(data.receipts / maxCashFlow) * 100}%`, height: '16px', backgroundColor: '#059669', borderRadius: '2px', minWidth: data.receipts > 0 ? '4px' : '0' }} />
                          <span style={{ fontSize: '11px', color: '#059669' }}>{data.receipts.toFixed(0)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: `${(data.payments / maxCashFlow) * 100}%`, height: '16px', backgroundColor: '#dc2626', borderRadius: '2px', minWidth: data.payments > 0 ? '4px' : '0' }} />
                          <span style={{ fontSize: '11px', color: '#dc2626' }}>{data.payments.toFixed(0)}</span>
                        </div>
                      </div>
                      <div style={{ width: '80px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: data.net >= 0 ? '#059669' : '#dc2626' }}>
                        {data.net >= 0 ? '+' : ''}{data.net.toFixed(0)}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px' }}>
                    <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#059669', marginRight: '4px' }}></span>Receipts</span>
                    <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#dc2626', marginRight: '4px' }}></span>Payments</span>
                  </div>
                </div>
              )}
            </div>

            {/* Income vs Expense Donut */}
            <div className="content-card">
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>Income vs Expense</h3>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
                <div style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  background: `conic-gradient(
                    #059669 0deg ${(incomeVsExpense.income / (incomeVsExpense.income + incomeVsExpense.expense || 1)) * 360}deg,
                    #dc2626 ${(incomeVsExpense.income / (incomeVsExpense.income + incomeVsExpense.expense || 1)) * 360}deg 360deg
                  )`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Margin</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: netProfit >= 0 ? '#059669' : '#dc2626' }}>
                      {incomeVsExpense.income > 0 ? ((netProfit / incomeVsExpense.income) * 100).toFixed(0) : 0}%
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#059669' }}>Income</div>
                    <div style={{ fontWeight: '600' }}>{((incomeVsExpense.income / (incomeVsExpense.income + incomeVsExpense.expense || 1)) * 100).toFixed(0)}%</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#dc2626' }}>Expense</div>
                    <div style={{ fontWeight: '600' }}>{((incomeVsExpense.expense / (incomeVsExpense.income + incomeVsExpense.expense || 1)) * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Top Debtors */}
            <div className="content-card">
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#059669' }}>Top 5 Receivables</h3>
              {topDebtors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No outstanding receivables</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topDebtors.map((debtor, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: '#059669' }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{debtor.name}</div>
                        <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', marginTop: '4px' }}>
                          <div style={{ height: '100%', backgroundColor: '#059669', borderRadius: '2px', width: `${(debtor.balance / (topDebtors[0]?.balance || 1)) * 100}%` }} />
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                        {debtor.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#166534' }}>Total Receivables</span>
                    <span style={{ fontWeight: '600', color: '#059669' }}>{totalReceivables.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Top Creditors */}
            <div className="content-card">
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#dc2626' }}>Top 5 Payables</h3>
              {topCreditors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No outstanding payables</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topCreditors.map((creditor, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: '#dc2626' }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{creditor.name}</div>
                        <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', marginTop: '4px' }}>
                          <div style={{ height: '100%', backgroundColor: '#dc2626', borderRadius: '2px', width: `${(creditor.balance / (topCreditors[0]?.balance || 1)) * 100}%` }} />
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>
                        {creditor.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef2f2', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#991b1b' }}>Total Payables</span>
                    <span style={{ fontWeight: '600', color: '#dc2626' }}>{totalPayables.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Collection Trend */}
          <div className="content-card">
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>Weekly Collection Trend (Last 8 Weeks)</h3>
            {collectionTrend.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No collection data available</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '180px', padding: '0 20px' }}>
                {collectionTrend.map((data, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#059669', marginBottom: '4px' }}>
                      {data.amount > 0 ? data.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : ''}
                    </div>
                    <div style={{
                      width: '100%',
                      height: `${(data.amount / maxCollection) * 140}px`,
                      backgroundColor: '#059669',
                      borderRadius: '4px 4px 0 0',
                      minHeight: data.amount > 0 ? '4px' : '0'
                    }} />
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', transform: 'rotate(-45deg)', transformOrigin: 'center' }}>
                      {data.week}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
