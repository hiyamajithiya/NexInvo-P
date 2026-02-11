import React, { useState, useEffect, lazy, Suspense } from 'react';
import api from '../services/api';
import './Dashboard.css';
import { useOrganization } from '../contexts/OrganizationContext';
import useDashboardData from '../hooks/useDashboardData';

// Sub-components
import DashboardHome from './dashboard/DashboardHome';
import Sidebar from './dashboard/Sidebar';
import TopHeader from './dashboard/TopHeader';
import ReviewPromptPopup from './dashboard/ReviewPromptPopup';

// Lazy load components for code splitting - reduces initial bundle size
const Invoices = lazy(() => import('./Invoices'));
const Clients = lazy(() => import('./Clients'));
const ServiceMaster = lazy(() => import('./ServiceMaster'));
const Receipts = lazy(() => import('./Receipts'));
const Reports = lazy(() => import('./Reports'));
const Settings = lazy(() => import('./Settings'));
const Profile = lazy(() => import('./Profile'));
const OrganizationSettings = lazy(() => import('../pages/OrganizationSettings'));
const PricingPlans = lazy(() => import('./PricingPlans'));
const MySubscription = lazy(() => import('./MySubscription'));
const HelpCenter = lazy(() => import('./HelpCenter'));
const OnboardingWizard = lazy(() => import('./OnboardingWizard'));
const SetuDownload = lazy(() => import('./SetuDownload'));
const ReviewSubmitPage = lazy(() => import('./ReviewSubmitPage'));

// Goods Trader Components
const ProductMaster = lazy(() => import('./ProductMaster'));
const Suppliers = lazy(() => import('./Suppliers'));
const Purchases = lazy(() => import('./Purchases'));
const Inventory = lazy(() => import('./Inventory'));
const Payments = lazy(() => import('./Payments'));

// Accounting Module Components
const AccountGroups = lazy(() => import('./AccountGroups'));
const LedgerMaster = lazy(() => import('./LedgerMaster'));
const ContraVoucher = lazy(() => import('./ContraVoucher'));
const JournalEntry = lazy(() => import('./JournalEntry'));
const DebitNote = lazy(() => import('./DebitNote'));
const CreditNote = lazy(() => import('./CreditNote'));
const TrialBalance = lazy(() => import('./TrialBalance'));
const ProfitLoss = lazy(() => import('./ProfitLoss'));
const BalanceSheet = lazy(() => import('./BalanceSheet'));
const DayBook = lazy(() => import('./DayBook'));
const LedgerReport = lazy(() => import('./LedgerReport'));
const CashBook = lazy(() => import('./CashBook'));
const BankBook = lazy(() => import('./BankBook'));
const BankReconciliation = lazy(() => import('./BankReconciliation'));
const TallySyncAccounts = lazy(() => import('./TallySyncAccounts'));
const TallySyncVouchers = lazy(() => import('./TallySyncVouchers'));
const TallyImportCompanyInfo = lazy(() => import('./TallyImportCompanyInfo'));
const TallyImportBalances = lazy(() => import('./TallyImportBalances'));
const TallyImportVouchers = lazy(() => import('./TallyImportVouchers'));
const TallyRealtimeSync = lazy(() => import('./TallyRealtimeSync'));
const AgeingReport = lazy(() => import('./AgeingReport'));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));
const PaymentReminders = lazy(() => import('./PaymentReminders'));
const OpeningBalanceImport = lazy(() => import('./OpeningBalanceImport'));
const FinancialYearPage = lazy(() => import('./FinancialYear'));

// Component loading spinner
const ComponentLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
    color: '#6366f1'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#x231B;</div>
      <div>Loading...</div>
    </div>
  </div>
);

function Dashboard({ user, onLogout }) {
  const { currentOrganization } = useOrganization();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [invoiceFilter, setInvoiceFilter] = useState(null); // Filter to pass to Invoices component
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Determine business type from organization
  const businessType = currentOrganization?.business_type || 'services';
  const isGoodsTrader = businessType === 'goods' || businessType === 'both';
  const isServiceProvider = businessType === 'services' || businessType === 'both';

  // Dashboard data fetching (stats, company logo, financials)
  const { stats, companyLogo, dashboardFinancials, financialsLoading } = useDashboardData(activeMenu);

  const [subscriptionWarning, setSubscriptionWarning] = useState(null);
  const [showSubscriptionWarning, setShowSubscriptionWarning] = useState(false);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if onboarding should be shown (first-time users)
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, []);

  // Check for subscription warning (grace period)
  useEffect(() => {
    const warningData = sessionStorage.getItem('subscription_warning');
    if (warningData) {
      try {
        const warning = JSON.parse(warningData);
        setSubscriptionWarning(warning);
        setShowSubscriptionWarning(true);
      } catch (e) {
        // Error handled silently
      }
    }
  }, []);

  // Check review eligibility on mount
  useEffect(() => {
    const checkReviewEligibility = async () => {
      try {
        const response = await api.get('/reviews/eligibility/');
        setReviewEligibility(response.data);
      } catch (error) {
        // Error handled silently
      }
    };
    checkReviewEligibility();
  }, []);

  // Handle logout with review prompt (show popup for first 3 logouts if eligible)
  const handleLogoutWithReviewPrompt = async () => {
    // Check if user is eligible to submit review and hasn't been prompted 3 times
    if (reviewEligibility?.eligible &&
        !reviewEligibility?.has_submitted &&
        reviewEligibility?.dismissal_count < 3) {
      setShowReviewPopup(true);
    } else {
      onLogout();
    }
  };

  // Handle dismissing review popup and logout
  const handleDismissReviewPopup = async () => {
    try {
      await api.post('/reviews/dismiss-prompt/');
      // Update local state
      setReviewEligibility(prev => prev ? {
        ...prev,
        dismissal_count: prev.dismissal_count + 1
      } : null);
    } catch (error) {
      // Error handled silently
    }
    setShowReviewPopup(false);
    onLogout();
  };

  // Handle navigating to review page from popup
  const handleGoToReview = () => {
    setShowReviewPopup(false);
    setActiveMenu('submit-review');
  };

  // Handle review submitted - update eligibility state
  const handleReviewSubmitted = () => {
    setReviewEligibility(prev => prev ? {
      ...prev,
      has_submitted: true
    } : null);
  };

  // Handle menu item click (also closes mobile menu)
  const handleMenuClick = (menuItem, filter = null) => {
    setActiveMenu(menuItem);
    setInvoiceFilter(filter);
    setMobileMenuOpen(false);
  };

  // Handle navigation from DashboardHome (supports special __open_reports_menu__ action)
  const handleDashboardNavigate = (menuItem, filter = null) => {
    if (menuItem === '__open_reports_menu__') {
      // Open the reports submenu in the sidebar by navigating to a reports page
      // This effectively opens the sidebar reports section
      setActiveMenu('reports');
      setMobileMenuOpen(false);
    } else {
      handleMenuClick(menuItem, filter);
    }
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'invoices':
        return <Invoices initialFilter={invoiceFilter} />;
      case 'clients':
        return <Clients />;
      case 'services':
        return <ServiceMaster />;
      case 'products':
        return <ProductMaster />;
      case 'suppliers':
        return <Suppliers />;
      case 'purchases':
        return <Purchases />;
      case 'inventory':
        return <Inventory />;
      case 'receipts':
        return <Receipts />;
      case 'payments':
        return <Payments />;
      case 'account-groups':
        return <AccountGroups />;
      case 'ledgers':
        return <LedgerMaster />;
      case 'contra':
        return <ContraVoucher />;
      case 'journal':
        return <JournalEntry />;
      case 'trial-balance':
        return <TrialBalance />;
      case 'profit-loss':
        return <ProfitLoss />;
      case 'balance-sheet':
        return <BalanceSheet />;
      case 'day-book':
        return <DayBook />;
      case 'ledger-report':
        return <LedgerReport />;
      case 'cash-book':
        return <CashBook />;
      case 'bank-book':
        return <BankBook />;
      case 'debit-note':
        return <DebitNote />;
      case 'credit-note':
        return <CreditNote />;
      case 'bank-reconciliation':
        return <BankReconciliation />;
      case 'ageing-report':
        return <AgeingReport />;
      case 'analytics-dashboard':
        return <AnalyticsDashboard />;
      case 'payment-reminders':
        return <PaymentReminders />;
      case 'opening-balance':
        return <OpeningBalanceImport />;
      case 'financial-year':
        return <FinancialYearPage />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'organization':
        return <OrganizationSettings />;
      case 'pricing':
        return <PricingPlans onNavigate={setActiveMenu} />;
      case 'subscription':
        return <MySubscription onNavigate={setActiveMenu} />;
      case 'help':
        return <HelpCenter />;
      case 'tally-sync':
        return <SetuDownload />;
      case 'tally-sync-accounts':
        return <TallySyncAccounts />;
      case 'tally-sync-vouchers':
        return <TallySyncVouchers />;
      case 'tally-import-company':
        return <TallyImportCompanyInfo />;
      case 'tally-import-balances':
        return <TallyImportBalances />;
      case 'tally-import-vouchers':
        return <TallyImportVouchers />;
      case 'tally-realtime-sync':
        return <TallyRealtimeSync />;
      case 'submit-review':
        return <ReviewSubmitPage onNavigate={setActiveMenu} onReviewSubmitted={handleReviewSubmitted} />;
      case 'profile':
        return <Profile onLogout={handleLogoutWithReviewPrompt} />;
      default:
        return (
          <DashboardHome
            stats={stats}
            dashboardFinancials={dashboardFinancials}
            financialsLoading={financialsLoading}
            subscriptionWarning={subscriptionWarning}
            showSubscriptionWarning={showSubscriptionWarning}
            onDismissWarning={() => setShowSubscriptionWarning(false)}
            onNavigate={handleDashboardNavigate}
          />
        );
    }
  };

  const getPageTitle = () => {
    switch (activeMenu) {
      case 'invoices': return 'Invoices Management';
      case 'clients': return 'Client Management';
      case 'services': return 'Service Master';
      case 'products': return 'Product Master';
      case 'suppliers': return 'Supplier Management';
      case 'purchases': return 'Purchase Entry';
      case 'inventory': return 'Inventory Management';
      case 'receipts': return 'Receipt Records';
      case 'payments': return 'Payment Records';
      case 'contra': return 'Contra Voucher';
      case 'journal': return 'Journal Entry';
      case 'trial-balance': return 'Trial Balance';
      case 'profit-loss': return 'Profit & Loss Statement';
      case 'balance-sheet': return 'Balance Sheet';
      case 'day-book': return 'Day Book';
      case 'ledger-report': return 'Ledger Report';
      case 'cash-book': return 'Cash Book';
      case 'bank-book': return 'Bank Book';
      case 'debit-note': return 'Debit Notes';
      case 'credit-note': return 'Credit Notes';
      case 'bank-reconciliation': return 'Bank Reconciliation';
      case 'ageing-report': return 'Ageing Report';
      case 'analytics-dashboard': return 'Analytics Dashboard';
      case 'payment-reminders': return 'Payment Reminders';
      case 'opening-balance': return 'Opening Balance Import';
      case 'financial-year': return 'Financial Year';
      case 'reports': return 'Reports & Analytics';
      case 'settings': return 'System Settings';
      case 'organization': return 'Organization Settings';
      case 'pricing': return 'Subscription Plans';
      case 'subscription': return 'My Subscription';
      case 'help': return 'Help Center';
      case 'tally-sync': return 'Setu - Tally Connector';
      case 'tally-sync-accounts': return 'Tally Sync - Accounts';
      case 'tally-sync-vouchers': return 'Tally Sync - Vouchers';
      case 'tally-import-company': return 'Import Company Info from Tally';
      case 'tally-import-balances': return 'Import Opening Balances from Tally';
      case 'tally-import-vouchers': return 'Import Vouchers from Tally';
      case 'tally-realtime-sync': return 'Real-Time Tally Sync';
      case 'submit-review': return 'Submit Review';
      case 'profile': return 'User Profile';
      default: return 'Dashboard Overview';
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Onboarding Wizard for first-time users */}
      {showOnboarding && (
        <Suspense fallback={<ComponentLoader />}>
          <OnboardingWizard
            onComplete={() => setShowOnboarding(false)}
            onNavigate={setActiveMenu}
            onMinimize={() => {}}
          />
        </Suspense>
      )}

      {/* Review Prompt Popup */}
      <ReviewPromptPopup
        isOpen={showReviewPopup}
        dismissalCount={reviewEligibility?.dismissal_count || 0}
        onReview={handleGoToReview}
        onDismiss={handleDismissReviewPopup}
      />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeMenu={activeMenu}
        onNavigate={handleMenuClick}
        companyLogo={companyLogo}
        isGoodsTrader={isGoodsTrader}
        isServiceProvider={isServiceProvider}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <TopHeader
          user={user}
          activeMenu={activeMenu}
          onNavigate={setActiveMenu}
          onLogout={handleLogoutWithReviewPrompt}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
          getPageTitle={getPageTitle}
        />

        {/* Content Area */}
        <div className="content-area">
          <Suspense fallback={<ComponentLoader />}>
            {renderContent()}
          </Suspense>
        </div>

        {/* Footer with Branding */}
        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} Chinmay Technosoft Private Limited. All rights reserved.</p>
        </footer>
      </div>

    </div>
  );
}

export default Dashboard;
