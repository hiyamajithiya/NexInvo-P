import React from 'react';
import { formatDate } from '../../utils/dateFormat';

function DashboardHome({
  stats,
  dashboardFinancials,
  financialsLoading,
  subscriptionWarning,
  showSubscriptionWarning,
  onDismissWarning,
  onNavigate
}) {
  return (
    <>
      {/* Subscription Warning Modal */}
      {showSubscriptionWarning && subscriptionWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>&#x26A0;&#xFE0F;</div>
            <h2 style={{
              color: '#dc2626',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '16px'
            }}>
              Subscription Expired
            </h2>
            <p style={{
              color: '#374151',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              {subscriptionWarning.message}
            </p>
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <p style={{ color: '#991b1b', fontWeight: '600', margin: 0 }}>
                &#x23F0; {subscriptionWarning.days_remaining} days remaining before access is blocked
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  onNavigate('subscription');
                  onDismissWarning();
                }}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Renew Now
              </button>
              <button
                onClick={onDismissWarning}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Remind Me Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Key Financial Metrics */}
      <div className="dashboard-section">
        <h2 className="section-title">Financial Overview</h2>
        {financialsLoading ? (
          <div className="stats-container">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card" style={{ opacity: 0.6 }}>
                <div className="stat-header">
                  <div className="stat-icon-wrapper blue-bg" style={{ background: '#e5e7eb' }}>
                    <span className="stat-icon-lg">...</span>
                  </div>
                </div>
                <div className="stat-body">
                  <h3 className="stat-title">Loading...</h3>
                  <p className="stat-number">--</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="stats-container">
            {/* Total Receivables */}
            <div className="stat-card kpi-card green" onClick={() => onNavigate('ageing-report')} style={{ cursor: 'pointer' }}>
              <div className="stat-header">
                <div className="stat-icon-wrapper green-bg">
                  <span className="stat-icon-lg">&#x1F4B5;</span>
                </div>
              </div>
              <div className="stat-body">
                <h3 className="stat-title">Total Receivables</h3>
                <p className="stat-number" style={{ color: '#10b981' }}>{'\u20B9'}{dashboardFinancials.receivables.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <p className="stat-label">Amount to Collect</p>
              </div>
            </div>

            {/* Total Payables */}
            <div className="stat-card kpi-card orange" onClick={() => onNavigate('ageing-report')} style={{ cursor: 'pointer' }}>
              <div className="stat-header">
                <div className="stat-icon-wrapper orange-bg">
                  <span className="stat-icon-lg">&#x1F4B3;</span>
                </div>
              </div>
              <div className="stat-body">
                <h3 className="stat-title">Total Payables</h3>
                <p className="stat-number" style={{ color: '#f59e0b' }}>{'\u20B9'}{dashboardFinancials.payables.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <p className="stat-label">Amount to Pay</p>
              </div>
            </div>

            {/* Overdue Amount */}
            <div className="stat-card kpi-card red" onClick={() => onNavigate('payment-reminders')} style={{ cursor: 'pointer' }}>
              <div className="stat-header">
                <div className="stat-icon-wrapper red-bg">
                  <span className="stat-icon-lg">&#x26A0;&#xFE0F;</span>
                </div>
              </div>
              <div className="stat-body">
                <h3 className="stat-title">Overdue Amount</h3>
                <p className="stat-number" style={{ color: '#ef4444' }}>{'\u20B9'}{dashboardFinancials.overdueAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <p className="stat-label">{dashboardFinancials.overdueCount} Overdue Items</p>
              </div>
            </div>

            {/* Net Profit/Loss */}
            <div className="stat-card kpi-card" onClick={() => onNavigate('analytics-dashboard')} style={{ cursor: 'pointer' }}>
              <div className="stat-header">
                <div className="stat-icon-wrapper" style={{ background: dashboardFinancials.netProfit >= 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                  <span className="stat-icon-lg">{dashboardFinancials.netProfit >= 0 ? '\uD83D\uDCC8' : '\uD83D\uDCC9'}</span>
                </div>
              </div>
              <div className="stat-body">
                <h3 className="stat-title">Net {dashboardFinancials.netProfit >= 0 ? 'Profit' : 'Loss'}</h3>
                <p className="stat-number" style={{ color: dashboardFinancials.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                  {'\u20B9'}{Math.abs(dashboardFinancials.netProfit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className="stat-label">This Financial Year</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Quick Actions Bar */}
      <div className="dashboard-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-bar">
          <button className="quick-action-btn primary" onClick={() => onNavigate('invoices')}>
            <span className="quick-action-icon">&#x1F4C4;</span>
            <span>Create Invoice</span>
          </button>
          <button className="quick-action-btn success" onClick={() => onNavigate('receipts')}>
            <span className="quick-action-icon">&#x1F9FE;</span>
            <span>Record Receipt</span>
          </button>
          <button className="quick-action-btn warning" onClick={() => onNavigate('payments')}>
            <span className="quick-action-icon">&#x1F4B3;</span>
            <span>Record Payment</span>
          </button>
          <button className="quick-action-btn info" onClick={() => onNavigate('__open_reports_menu__')}>
            <span className="quick-action-icon">&#x1F4CA;</span>
            <span>View Reports</span>
          </button>
        </div>
      </div>

      {/* Section 3: Mini Charts Row */}
      <div className="dashboard-section">
        <div className="charts-row">
          {/* Cash Flow Mini Chart */}
          <div className="mini-chart-card">
            <div className="mini-chart-header">
              <h3>Cash Flow (Last 6 Months)</h3>
              <button className="view-more-link" onClick={() => onNavigate('analytics-dashboard')}>
                View More {'\u2192'}
              </button>
            </div>
            <div className="mini-chart-body">
              {financialsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
              ) : dashboardFinancials.cashFlowData.length > 0 ? (
                <div className="mini-bar-chart">
                  {dashboardFinancials.cashFlowData.slice(-6).map((item, index) => {
                    const maxValue = Math.max(...dashboardFinancials.cashFlowData.slice(-6).map(d => Math.max(d.receipts || 0, d.payments || 0))) || 1;
                    return (
                      <div key={index} className="mini-bar-group">
                        <div className="mini-bar-container">
                          <div className="mini-bar receipts" style={{ height: `${((item.receipts || 0) / maxValue) * 100}%` }} title={`Receipts: \u20B9${(item.receipts || 0).toLocaleString()}`}></div>
                          <div className="mini-bar payments" style={{ height: `${((item.payments || 0) / maxValue) * 100}%` }} title={`Payments: \u20B9${(item.payments || 0).toLocaleString()}`}></div>
                        </div>
                        <span className="mini-bar-label">{item.month?.substring(0, 3) || `M${index + 1}`}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  <span style={{ fontSize: '32px' }}>&#x1F4CA;</span>
                  <p style={{ marginTop: '8px' }}>No cash flow data available</p>
                </div>
              )}
              <div className="mini-chart-legend">
                <span className="legend-item"><span className="legend-color receipts"></span> Receipts</span>
                <span className="legend-item"><span className="legend-color payments"></span> Payments</span>
              </div>
            </div>
          </div>

          {/* Ageing Summary Mini Chart */}
          <div className="mini-chart-card">
            <div className="mini-chart-header">
              <h3>Receivables Ageing</h3>
              <button className="view-more-link" onClick={() => onNavigate('ageing-report')}>
                View More {'\u2192'}
              </button>
            </div>
            <div className="mini-chart-body">
              {financialsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
              ) : (
                <div className="ageing-bars">
                  {(() => {
                    const { current, days30, days60, days90, above90 } = dashboardFinancials.ageingSummary;
                    const total = current + days30 + days60 + days90 + above90 || 1;
                    const buckets = [
                      { label: 'Current', value: current, color: '#10b981' },
                      { label: '1-30 Days', value: days30, color: '#3b82f6' },
                      { label: '31-60 Days', value: days60, color: '#f59e0b' },
                      { label: '61-90 Days', value: days90, color: '#f97316' },
                      { label: '90+ Days', value: above90, color: '#ef4444' }
                    ];
                    return buckets.map((bucket, idx) => (
                      <div key={idx} className="ageing-bar-row">
                        <span className="ageing-label">{bucket.label}</span>
                        <div className="ageing-bar-track">
                          <div
                            className="ageing-bar-fill"
                            style={{
                              width: `${(bucket.value / total) * 100}%`,
                              backgroundColor: bucket.color
                            }}
                          ></div>
                        </div>
                        <span className="ageing-value">{'\u20B9'}{bucket.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Alert Widgets Row */}
      <div className="dashboard-section">
        <h2 className="section-title">Status & Alerts</h2>
        <div className="alert-widgets-row">
          {/* Payment Alerts */}
          <div className="alert-widget" onClick={() => onNavigate('payment-reminders')} style={{ cursor: 'pointer' }}>
            <div className="alert-widget-icon" style={{ backgroundColor: dashboardFinancials.criticalOverdue > 0 ? '#fef2f2' : '#f0fdf4' }}>
              <span style={{ fontSize: '28px' }}>{dashboardFinancials.criticalOverdue > 0 ? '\uD83D\uDD14' : '\u2705'}</span>
            </div>
            <div className="alert-widget-content">
              <h4>Payment Alerts</h4>
              {dashboardFinancials.overdueCount > 0 ? (
                <>
                  <p className="alert-count" style={{ color: '#ef4444' }}>{dashboardFinancials.overdueCount} Overdue</p>
                  {dashboardFinancials.criticalOverdue > 0 && (
                    <p className="alert-critical">&#x26A0;&#xFE0F; {dashboardFinancials.criticalOverdue} Critical (90+ days)</p>
                  )}
                </>
              ) : (
                <p className="alert-ok">All payments on track</p>
              )}
            </div>
          </div>

          {/* Bank Reconciliation Status */}
          <div className="alert-widget" onClick={() => onNavigate('bank-reconciliation')} style={{ cursor: 'pointer' }}>
            <div className="alert-widget-icon" style={{ backgroundColor: '#eff6ff' }}>
              <span style={{ fontSize: '28px' }}>{'\uD83C\uDFE6'}</span>
            </div>
            <div className="alert-widget-content">
              <h4>Bank Reconciliation</h4>
              {dashboardFinancials.bankReconciliation.length > 0 ? (
                <p className="alert-info">{dashboardFinancials.bankReconciliation.length} account(s) to reconcile</p>
              ) : (
                <p className="alert-ok">All accounts reconciled</p>
              )}
            </div>
          </div>

          {/* Tally Sync Status */}
          <div className="alert-widget" onClick={() => onNavigate('tally-sync')} style={{ cursor: 'pointer' }}>
            <div className="alert-widget-icon" style={{ backgroundColor: '#f5f3ff' }}>
              <span style={{ fontSize: '28px' }}>{'\uD83D\uDD17'}</span>
            </div>
            <div className="alert-widget-content">
              <h4>Tally Sync</h4>
              {dashboardFinancials.tallySyncStatus ? (
                <>
                  <p className="alert-info">
                    {dashboardFinancials.tallySyncStatus.is_connected ? '\uD83D\uDFE2 Connected' : '\uD83D\uDD34 Disconnected'}
                  </p>
                  {dashboardFinancials.tallySyncStatus.last_sync && (
                    <p className="alert-time">Last: {formatDate(dashboardFinancials.tallySyncStatus.last_sync)}</p>
                  )}
                </>
              ) : (
                <p className="alert-info">Not configured</p>
              )}
            </div>
          </div>

          {/* Trial Balance Status */}
          <div className="alert-widget" onClick={() => onNavigate('opening-balance')} style={{ cursor: 'pointer' }}>
            <div className="alert-widget-icon" style={{ backgroundColor: dashboardFinancials.trialBalanceStatus.balanced ? '#f0fdf4' : '#fef2f2' }}>
              <span style={{ fontSize: '28px' }}>{dashboardFinancials.trialBalanceStatus.balanced ? '\u2696\uFE0F' : '\u26A0\uFE0F'}</span>
            </div>
            <div className="alert-widget-content">
              <h4>Trial Balance</h4>
              {dashboardFinancials.trialBalanceStatus.balanced ? (
                <p className="alert-ok">Balanced</p>
              ) : (
                <>
                  <p className="alert-count" style={{ color: '#ef4444' }}>Unbalanced</p>
                  <p className="alert-critical">
                    Difference: {'\u20B9'}{Math.abs(dashboardFinancials.trialBalanceStatus.difference).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Top Outstanding Lists */}
      <div className="dashboard-section">
        <div className="outstanding-lists-row">
          {/* Top Debtors */}
          <div className="outstanding-list-card">
            <div className="list-card-header">
              <h3>Top 5 Outstanding Debtors</h3>
              <button className="view-more-link" onClick={() => onNavigate('ageing-report')}>View All {'\u2192'}</button>
            </div>
            <div className="list-card-body">
              {financialsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>Loading...</div>
              ) : dashboardFinancials.topDebtors.length > 0 ? (
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Party Name</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardFinancials.topDebtors.slice(0, 5).map((debtor, idx) => (
                      <tr key={idx}>
                        <td>{debtor.party_name || debtor.name || 'Unknown'}</td>
                        <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                          {'\u20B9'}{parseFloat(debtor.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ textAlign: 'right', color: (debtor.days || 0) > 90 ? '#ef4444' : '#6b7280' }}>
                          {debtor.days || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                  <span style={{ fontSize: '24px' }}>{'\uD83D\uDCCB'}</span>
                  <p style={{ marginTop: '8px' }}>No outstanding debtors</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Creditors */}
          <div className="outstanding-list-card">
            <div className="list-card-header">
              <h3>Top 5 Outstanding Creditors</h3>
              <button className="view-more-link" onClick={() => onNavigate('ageing-report')}>View All {'\u2192'}</button>
            </div>
            <div className="list-card-body">
              {financialsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>Loading...</div>
              ) : dashboardFinancials.topCreditors.length > 0 ? (
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Party Name</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardFinancials.topCreditors.slice(0, 5).map((creditor, idx) => (
                      <tr key={idx}>
                        <td>{creditor.party_name || creditor.name || 'Unknown'}</td>
                        <td style={{ textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>
                          {'\u20B9'}{parseFloat(creditor.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ textAlign: 'right', color: (creditor.days || 0) > 90 ? '#ef4444' : '#6b7280' }}>
                          {creditor.days || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                  <span style={{ fontSize: '24px' }}>{'\uD83D\uDCCB'}</span>
                  <p style={{ marginTop: '8px' }}>No outstanding creditors</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 6: Original Stats Row (kept for reference) */}
      <div className="dashboard-section">
        <h2 className="section-title">Quick Stats</h2>
        <div className="stats-container">
          <div className="stat-card blue" onClick={() => onNavigate('invoices')} style={{ cursor: 'pointer' }}>
            <div className="stat-header">
              <div className="stat-icon-wrapper blue-bg">
                <span className="stat-icon-lg">&#x1F4C4;</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Total Invoices</h3>
              <p className="stat-number">{stats.totalInvoices || 0}</p>
              <p className="stat-label">All Time</p>
            </div>
          </div>

          <div className="stat-card green" onClick={() => onNavigate('receipts')} style={{ cursor: 'pointer' }}>
            <div className="stat-header">
              <div className="stat-icon-wrapper green-bg">
                <span className="stat-icon-lg">&#x1F4B0;</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Revenue</h3>
              <p className="stat-number">{'\u20B9'}{parseFloat(stats.revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              <p className="stat-label">Total Collected</p>
            </div>
          </div>

          <div className="stat-card orange" onClick={() => onNavigate('invoices', 'pending')} style={{ cursor: 'pointer' }}>
            <div className="stat-header">
              <div className="stat-icon-wrapper orange-bg">
                <span className="stat-icon-lg">&#x231B;</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Pending</h3>
              <p className="stat-number">{'\u20B9'}{parseFloat(stats.pending || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              <p className="stat-label">Outstanding Amount</p>
            </div>
          </div>

          <div className="stat-card purple" onClick={() => onNavigate('clients')} style={{ cursor: 'pointer' }}>
            <div className="stat-header">
              <div className="stat-icon-wrapper purple-bg">
                <span className="stat-icon-lg">&#x1F465;</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Clients</h3>
              <p className="stat-number">{stats.clients || 0}</p>
              <p className="stat-label">Total Clients</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 7: Subscription Plan Details (kept at bottom as requested) */}
      {stats.subscription && (
        <div className="dashboard-section">
          <h2 className="section-title">Subscription Plan Details</h2>
          <div className="stats-container">
            {/* Subscription Days Card */}
            <div className="stat-card blue" onClick={() => onNavigate('subscription')} style={{ cursor: 'pointer' }}>
              <div className="stat-header">
                <div className="stat-icon-wrapper blue-bg">
                  <span className="stat-icon-lg">&#x1F4C5;</span>
                </div>
              </div>
              <div className="stat-body">
                <h3 className="stat-title">{stats.subscription.plan_name} Plan</h3>
                <p className="stat-number">{stats.subscription.days_remaining}</p>
                <p className="stat-label">Days Remaining</p>
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                  <div>Total Days: {stats.subscription.total_days}</div>
                  <div>Used: {stats.subscription.days_elapsed} days</div>
                  <div style={{ marginTop: '5px', fontWeight: '500', color: stats.subscription.is_active ? '#10b981' : '#ef4444' }}>
                    Status: {stats.subscription.status.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Users Card */}
            <div className="stat-card green" onClick={() => onNavigate('organization')} style={{ cursor: 'pointer' }}>
              <div className="stat-header">
                <div className="stat-icon-wrapper green-bg">
                  <span className="stat-icon-lg">&#x1F464;</span>
                </div>
              </div>
              <div className="stat-body">
                <h3 className="stat-title">Users</h3>
                <p className="stat-number">{stats.subscription.current_users}/{stats.subscription.max_users}</p>
                <p className="stat-label">Current / Maximum</p>
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                  <div>Available: {stats.subscription.users_remaining} more users</div>
                  <div style={{ marginTop: '8px', width: '100%', backgroundColor: '#e5e7eb', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(stats.subscription.current_users / stats.subscription.max_users) * 100}%`,
                      backgroundColor: stats.subscription.current_users >= stats.subscription.max_users ? '#ef4444' : '#10b981',
                      height: '100%',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoices Card */}
            <div className="stat-card orange" onClick={() => onNavigate('invoices')} style={{ cursor: 'pointer' }}>
              <div className="stat-header">
                <div className="stat-icon-wrapper orange-bg">
                  <span className="stat-icon-lg">&#x1F4CB;</span>
                </div>
              </div>
              <div className="stat-body">
                <h3 className="stat-title">Invoices (This Month)</h3>
                <p className="stat-number">{stats.subscription.invoices_this_month}/{stats.subscription.max_invoices_per_month}</p>
                <p className="stat-label">Used / Allowed</p>
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                  <div>Remaining: {stats.subscription.invoices_remaining}</div>
                  <div style={{ marginTop: '8px', width: '100%', backgroundColor: '#e5e7eb', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(stats.subscription.invoices_this_month / stats.subscription.max_invoices_per_month) * 100}%`,
                      backgroundColor: stats.subscription.invoices_this_month >= stats.subscription.max_invoices_per_month ? '#ef4444' : '#f59e0b',
                      height: '100%',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Card */}
            <div className="stat-card purple" onClick={() => onNavigate('subscription')} style={{ cursor: 'pointer' }}>
              <div className="stat-header">
                <div className="stat-icon-wrapper purple-bg">
                  <span className="stat-icon-lg">&#x1F4BE;</span>
                </div>
              </div>
              <div className="stat-body">
                <h3 className="stat-title">Storage</h3>
                <p className="stat-number">{stats.subscription.max_storage_gb} GB</p>
                <p className="stat-label">Available Storage</p>
                {stats.subscription.next_billing_date && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                    Next Billing: {formatDate(stats.subscription.next_billing_date)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Subscription Warning */}
      {!stats.subscription && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #fbbf24'
        }}>
          <h3 style={{ marginBottom: '10px', color: '#92400e' }}>No Active Subscription</h3>
          <p style={{ color: '#78350f', marginBottom: '15px' }}>
            You don't have an active subscription plan. Subscribe to a plan to unlock full features.
          </p>
          <button
            onClick={() => onNavigate('pricing')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            View Subscription Plans
          </button>
        </div>
      )}
    </>
  );
}

export default DashboardHome;
