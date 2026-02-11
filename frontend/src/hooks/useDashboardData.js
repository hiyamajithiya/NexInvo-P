import { useState, useEffect, useRef, useCallback } from 'react';
import { dashboardAPI, settingsAPI } from '../services/api';
import api from '../services/api';

/**
 * Custom hook that encapsulates all dashboard data fetching logic.
 * Manages stats, company logo, and financial summary data.
 *
 * @param {string} activeMenu - The currently active menu item
 * @returns {{ stats, companyLogo, dashboardFinancials, financialsLoading, loadStats, loadDashboardFinancials }}
 */
function useDashboardData(activeMenu) {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    revenue: 0,
    pending: 0,
    clients: 0,
    subscription: null
  });
  const [companyLogo, setCompanyLogo] = useState(null);

  const [dashboardFinancials, setDashboardFinancials] = useState({
    receivables: 0,
    payables: 0,
    overdueAmount: 0,
    overdueCount: 0,
    criticalOverdue: 0,
    netProfit: 0,
    cashFlowData: [],
    ageingSummary: { current: 0, days30: 0, days60: 0, days90: 0, above90: 0 },
    topDebtors: [],
    topCreditors: [],
    bankReconciliation: [],
    tallySyncStatus: null,
    trialBalanceStatus: { balanced: true, difference: 0 }
  });
  const [financialsLoading, setFinancialsLoading] = useState(true);

  const isMountedRef = useRef(true);

  // Track mounted state for async operations
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      if (isMountedRef.current) {
        setStats(response.data);
      }
    } catch (err) {
      // Error handled silently
    }
  };

  const loadCompanyLogo = async () => {
    try {
      const response = await settingsAPI.getCompanySettings();
      if (isMountedRef.current && response.data && response.data.logo) {
        setCompanyLogo(response.data.logo);
      }
    } catch (err) {
      // Error handled silently
    }
  };

  // Load dashboard financial data
  const loadDashboardFinancials = useCallback(async () => {
    setFinancialsLoading(true);
    try {
      // Fetch multiple API endpoints in parallel
      const [
        ageingResponse,
        analyticsResponse,
        bankReconciliationResponse,
        tallySyncResponse,
        trialBalanceResponse,
        paymentRemindersResponse
      ] = await Promise.allSettled([
        api.get('/dashboard/ageing-summary/'),
        api.get('/dashboard/analytics-summary/'),
        api.get('/dashboard/bank-reconciliation-status/'),
        api.get('/dashboard/tally-sync-status/'),
        api.get('/dashboard/opening-balance-status/'),
        api.get('/dashboard/payment-reminders/')
      ]);

      // Process ageing data
      let ageingSummary = { current: 0, days30: 0, days60: 0, days90: 0, above90: 0 };
      let topDebtors = [];
      let topCreditors = [];
      let receivables = 0;
      let payables = 0;
      let overdueAmount = 0;
      let overdueCount = 0;
      let criticalOverdue = 0;

      if (ageingResponse.status === 'fulfilled' && ageingResponse.value?.data) {
        const ageingData = ageingResponse.value.data;
        // Parse ageing buckets from receivables object
        if (ageingData.receivables) {
          ageingSummary = {
            current: parseFloat(ageingData.receivables.current || 0),
            days30: parseFloat(ageingData.receivables.days30 || 0),
            days60: parseFloat(ageingData.receivables.days60 || 0),
            days90: parseFloat(ageingData.receivables.days90 || 0),
            above90: parseFloat(ageingData.receivables.above90 || 0)
          };
          receivables = parseFloat(ageingData.receivables.total || 0);
        }
        if (ageingData.payables) {
          payables = parseFloat(ageingData.payables.total || 0);
        }
        topDebtors = ageingData.top_debtors || [];
        topCreditors = ageingData.top_creditors || [];
      }

      // Process payment reminders data (for overdue info)
      if (paymentRemindersResponse.status === 'fulfilled' && paymentRemindersResponse.value?.data) {
        const remindersData = paymentRemindersResponse.value.data;
        overdueAmount = parseFloat(remindersData.overdueAmount || 0);
        overdueCount = parseInt(remindersData.overdueCount || 0);
        criticalOverdue = parseInt(remindersData.criticalCount || 0);
      }

      // Process analytics data
      let netProfit = 0;
      let cashFlowData = [];
      if (analyticsResponse.status === 'fulfilled' && analyticsResponse.value?.data) {
        const analyticsData = analyticsResponse.value.data;
        netProfit = parseFloat(analyticsData.netProfit || 0);
        cashFlowData = analyticsData.cashFlowData || [];
      }

      // Process bank reconciliation data (array of bank accounts)
      let bankReconciliation = [];
      if (bankReconciliationResponse.status === 'fulfilled' && bankReconciliationResponse.value?.data) {
        bankReconciliation = Array.isArray(bankReconciliationResponse.value.data)
          ? bankReconciliationResponse.value.data
          : bankReconciliationResponse.value.data.accounts || [];
      }

      // Process Tally sync status
      let tallySyncStatus = null;
      if (tallySyncResponse.status === 'fulfilled' && tallySyncResponse.value?.data) {
        tallySyncStatus = tallySyncResponse.value.data;
      }

      // Process Trial Balance status
      let trialBalanceStatus = { balanced: true, difference: 0 };
      if (trialBalanceResponse.status === 'fulfilled' && trialBalanceResponse.value?.data) {
        const tbData = trialBalanceResponse.value.data;
        trialBalanceStatus = {
          balanced: tbData.balanced !== false,
          difference: parseFloat(tbData.difference || 0)
        };
      }

      if (isMountedRef.current) {
        setDashboardFinancials({
          receivables,
          payables,
          overdueAmount,
          overdueCount,
          criticalOverdue,
          netProfit,
          cashFlowData,
          ageingSummary,
          topDebtors,
          topCreditors,
          bankReconciliation,
          tallySyncStatus,
          trialBalanceStatus
        });
      }
    } catch (err) {
      // Error handled silently
    } finally {
      if (isMountedRef.current) {
        setFinancialsLoading(false);
      }
    }
  }, []);

  // Load stats and logo when activeMenu changes
  useEffect(() => {
    if (activeMenu === 'dashboard') {
      loadStats();
    }
    loadCompanyLogo();
  }, [activeMenu]);

  // Load financials when on dashboard
  useEffect(() => {
    if (activeMenu === 'dashboard') {
      loadDashboardFinancials();
    }
  }, [activeMenu, loadDashboardFinancials]);

  return {
    stats,
    companyLogo,
    dashboardFinancials,
    financialsLoading,
    loadStats,
    loadDashboardFinancials
  };
}

export default useDashboardData;
