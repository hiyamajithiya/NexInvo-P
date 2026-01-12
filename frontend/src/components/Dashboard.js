import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { dashboardAPI, settingsAPI } from '../services/api';
import api from '../services/api';
import { formatDate } from '../utils/dateFormat';
import './Dashboard.css';
import OrganizationSwitcher from './OrganizationSwitcher';
import { useOrganization } from '../contexts/OrganizationContext';

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
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
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
  const [stats, setStats] = useState({
    totalInvoices: 0,
    revenue: 0,
    pending: 0,
    clients: 0,
    subscription: null
  });
  const [companyLogo, setCompanyLogo] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [subscriptionWarning, setSubscriptionWarning] = useState(null);
  const [showSubscriptionWarning, setShowSubscriptionWarning] = useState(false);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ref for dropdown auto-hide timeout
  const dropdownTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const isMountedRef = useRef(true);

  // Auto-hide dropdown after 5 seconds of inactivity
  const resetDropdownTimer = useCallback(() => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    dropdownTimeoutRef.current = setTimeout(() => {
      setShowUserDropdown(false);
    }, 5000); // 5 seconds
  }, []);

  // Handle dropdown visibility and timer
  useEffect(() => {
    if (showUserDropdown) {
      resetDropdownTimer();
    }
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, [showUserDropdown, resetDropdownTimer]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  useEffect(() => {
    if (activeMenu === 'dashboard') {
      loadStats();
    }
    loadCompanyLogo();
  }, [activeMenu]);

  // Track mounted state for async operations
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
        console.error('Error parsing subscription warning:', e);
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
        console.error('Error checking review eligibility:', error);
      }
    };
    checkReviewEligibility();
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      if (isMountedRef.current) {
        setStats(response.data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error loading stats:', err);
      }
    }
  };

  const loadCompanyLogo = async () => {
    try {
      const response = await settingsAPI.getCompanySettings();
      if (isMountedRef.current && response.data && response.data.logo) {
        setCompanyLogo(response.data.logo);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error loading company logo:', err);
      }
    }
  };

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
      console.error('Error dismissing review prompt:', error);
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
      case 'submit-review':
        return <ReviewSubmitPage onNavigate={setActiveMenu} onReviewSubmitted={handleReviewSubmitted} />;
      case 'profile':
        return <Profile onLogout={handleLogoutWithReviewPrompt} />;
      default:
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
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
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
                      ⏰ {subscriptionWarning.days_remaining} days remaining before access is blocked
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        setActiveMenu('subscription');
                        setShowSubscriptionWarning(false);
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
                      onClick={() => setShowSubscriptionWarning(false)}
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

            <div className="stats-container">
              <div className="stat-card blue" onClick={() => setActiveMenu('invoices')} style={{ cursor: 'pointer' }}>
                <div className="stat-header">
                  <div className="stat-icon-wrapper blue-bg">
                    <span className="stat-icon-lg">📄</span>
                  </div>
                </div>
                <div className="stat-body">
                  <h3 className="stat-title">Total Invoices</h3>
                  <p className="stat-number">{stats.totalInvoices || 0}</p>
                  <p className="stat-label">All Time</p>
                </div>
              </div>

              <div className="stat-card green" onClick={() => setActiveMenu('receipts')} style={{ cursor: 'pointer' }}>
                <div className="stat-header">
                  <div className="stat-icon-wrapper green-bg">
                    <span className="stat-icon-lg">💰</span>
                  </div>
                </div>
                <div className="stat-body">
                  <h3 className="stat-title">Revenue</h3>
                  <p className="stat-number">₹{parseFloat(stats.revenue || 0).toFixed(2)}</p>
                  <p className="stat-label">Total Collected</p>
                </div>
              </div>

              <div className="stat-card orange" onClick={() => handleMenuClick('invoices', 'pending')} style={{ cursor: 'pointer' }}>
                <div className="stat-header">
                  <div className="stat-icon-wrapper orange-bg">
                    <span className="stat-icon-lg">⏳</span>
                  </div>
                </div>
                <div className="stat-body">
                  <h3 className="stat-title">Pending</h3>
                  <p className="stat-number">₹{parseFloat(stats.pending || 0).toFixed(2)}</p>
                  <p className="stat-label">Outstanding Amount</p>
                </div>
              </div>

              <div className="stat-card purple" onClick={() => setActiveMenu('clients')} style={{ cursor: 'pointer' }}>
                <div className="stat-header">
                  <div className="stat-icon-wrapper purple-bg">
                    <span className="stat-icon-lg">👥</span>
                  </div>
                </div>
                <div className="stat-body">
                  <h3 className="stat-title">Clients</h3>
                  <p className="stat-number">{stats.clients || 0}</p>
                  <p className="stat-label">Total Clients</p>
                </div>
              </div>
            </div>

            {/* Subscription Plan Details Section */}
            {stats.subscription && (
              <div style={{ marginTop: '30px' }}>
                <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>
                  Subscription Plan Details
                </h2>
                <div className="stats-container">
                  {/* Subscription Days Card */}
                  <div className="stat-card blue" onClick={() => setActiveMenu('subscription')} style={{ cursor: 'pointer' }}>
                    <div className="stat-header">
                      <div className="stat-icon-wrapper blue-bg">
                        <span className="stat-icon-lg">📅</span>
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
                  <div className="stat-card green" onClick={() => setActiveMenu('organization')} style={{ cursor: 'pointer' }}>
                    <div className="stat-header">
                      <div className="stat-icon-wrapper green-bg">
                        <span className="stat-icon-lg">👤</span>
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
                  <div className="stat-card orange" onClick={() => setActiveMenu('invoices')} style={{ cursor: 'pointer' }}>
                    <div className="stat-header">
                      <div className="stat-icon-wrapper orange-bg">
                        <span className="stat-icon-lg">📋</span>
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
                  <div className="stat-card purple" onClick={() => setActiveMenu('subscription')} style={{ cursor: 'pointer' }}>
                    <div className="stat-header">
                      <div className="stat-icon-wrapper purple-bg">
                        <span className="stat-icon-lg">💾</span>
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
                  onClick={() => setActiveMenu('pricing')}
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
      case 'reports': return 'Reports & Analytics';
      case 'settings': return 'System Settings';
      case 'organization': return 'Organization Settings';
      case 'pricing': return 'Subscription Plans';
      case 'subscription': return 'My Subscription';
      case 'help': return 'Help Center';
      case 'tally-sync': return 'Setu - Tally Connector';
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
      {showReviewPopup && (
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
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '36px'
            }}>
              ⭐
            </div>
            <h2 style={{
              color: '#111827',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '12px'
            }}>
              Share Your Experience!
            </h2>
            <p style={{
              color: '#6b7280',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              We'd love to hear your feedback! Your review helps us improve and helps others discover our service.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleGoToReview}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>✍️</span> Write a Review
              </button>
              <button
                onClick={handleDismissReviewPopup}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Maybe Later
              </button>
            </div>
            <p style={{
              color: '#9ca3af',
              fontSize: '12px',
              marginTop: '16px'
            }}>
              {3 - (reviewEligibility?.dismissal_count || 0)} reminder{(3 - (reviewEligibility?.dismissal_count || 0)) !== 1 ? 's' : ''} left
            </p>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <button
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
          <div className="logo">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Company Logo"
                style={{
                  maxWidth: '150px',
                  maxHeight: '60px',
                  objectFit: 'contain',
                  marginBottom: '8px'
                }}
              />
            ) : (
              <img
                src="/assets/NEXINVO_logo.png"
                alt="NexInvo Logo"
                style={{
                  height: '60px',
                  width: 'auto',
                  objectFit: 'contain',
                  marginBottom: '8px',
                  maxWidth: '220px'
                }}
              />
            )}
          </div>
          <p className="company-subtitle">NexInvo - Invoice Management System</p>
        </div>

        <nav className="sidebar-nav">
          <a
            href="#dashboard"
            className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleMenuClick('dashboard'); }}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Dashboard</span>
          </a>
          <a
            href="#invoices"
            className={`nav-item ${activeMenu === 'invoices' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleMenuClick('invoices'); }}
          >
            <span className="nav-icon">📄</span>
            <span className="nav-text">Invoices</span>
          </a>
          <a
            href="#clients"
            className={`nav-item ${activeMenu === 'clients' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleMenuClick('clients'); }}
          >
            <span className="nav-icon">👥</span>
            <span className="nav-text">Clients</span>
          </a>

          {/* Service Provider Menu Items */}
          {isServiceProvider && (
            <a
              href="#services"
              className={`nav-item ${activeMenu === 'services' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); handleMenuClick('services'); }}
            >
              <span className="nav-icon">📋</span>
              <span className="nav-text">Service Master</span>
            </a>
          )}

          {/* Goods Trader Menu Items */}
          {isGoodsTrader && (
            <>
              <a
                href="#products"
                className={`nav-item ${activeMenu === 'products' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('products'); }}
              >
                <span className="nav-icon">📦</span>
                <span className="nav-text">Product Master</span>
              </a>
              <a
                href="#suppliers"
                className={`nav-item ${activeMenu === 'suppliers' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('suppliers'); }}
              >
                <span className="nav-icon">🏭</span>
                <span className="nav-text">Suppliers</span>
              </a>
              <a
                href="#purchases"
                className={`nav-item ${activeMenu === 'purchases' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('purchases'); }}
              >
                <span className="nav-icon">🛒</span>
                <span className="nav-text">Purchases</span>
              </a>
              <a
                href="#inventory"
                className={`nav-item ${activeMenu === 'inventory' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('inventory'); }}
              >
                <span className="nav-icon">📊</span>
                <span className="nav-text">Inventory</span>
              </a>
            </>
          )}

          <a
            href="#receipts"
            className={`nav-item ${activeMenu === 'receipts' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleMenuClick('receipts'); }}
          >
            <span className="nav-icon">🧾</span>
            <span className="nav-text">Receipts</span>
          </a>
          <a
            href="#reports"
            className={`nav-item ${activeMenu === 'reports' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleMenuClick('reports'); }}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Reports</span>
          </a>
          <a
            href="#settings"
            className={`nav-item ${activeMenu === 'settings' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleMenuClick('settings'); }}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Settings</span>
          </a>
          <a
            href="#organization"
            className={`nav-item ${activeMenu === 'organization' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleMenuClick('organization'); }}
          >
            <span className="nav-icon">🏢</span>
            <span className="nav-text">Organization</span>
          </a>
          <a
            href="#subscription"
            className={`nav-item ${activeMenu === 'subscription' || activeMenu === 'pricing' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleMenuClick('subscription'); }}
          >
            <span className="nav-icon">💼</span>
            <span className="nav-text">My Subscription</span>
          </a>
          <a
            href="#tally-sync"
            className={`nav-item ${activeMenu === 'tally-sync' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleMenuClick('tally-sync'); }}
          >
            <span className="nav-icon">⬇️</span>
            <span className="nav-text">Setu Download</span>
          </a>
          <a
            href="#help"
            className={`nav-item ${activeMenu === 'help' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleMenuClick('help'); }}
          >
            <span className="nav-icon">❓</span>
            <span className="nav-text">Help & Guide</span>
          </a>
        </nav>

      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div>
              <h1 className="page-title">{getPageTitle()}</h1>
              <p className="page-subtitle">Welcome back, {user?.username || 'Admin'}</p>
            </div>
          </div>
          <div className="header-right">
            <button
              className="help-icon-btn"
              onClick={() => setActiveMenu('help')}
              title="Help & Guide"
            >
              <span>?</span>
            </button>
            <div style={{ marginRight: '20px' }}>
              <OrganizationSwitcher />
            </div>
            <div className="user-menu" ref={dropdownRef}>
              <div
                className="user-avatar"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{ cursor: 'pointer' }}
              >
                {(user?.username || 'A')[0].toUpperCase()}
              </div>
              {showUserDropdown && (
                <div
                  className="user-dropdown"
                  onMouseEnter={resetDropdownTimer}
                  onMouseMove={resetDropdownTimer}
                >
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-name">{user?.username || 'User'}</div>
                  </div>
                  <button
                    className="user-dropdown-item"
                    onClick={() => {
                      setActiveMenu('profile');
                      setShowUserDropdown(false);
                    }}
                  >
                    <span>👤</span> Profile
                  </button>
                  <button
                    className="user-dropdown-item logout"
                    onClick={handleLogoutWithReviewPrompt}
                  >
                    <span>🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          <Suspense fallback={<ComponentLoader />}>
            {renderContent()}
          </Suspense>
        </div>

        {/* Footer with Branding */}
        <footer className="app-footer">
          <p>© {new Date().getFullYear()} Chinmay Technosoft Private Limited. All rights reserved.</p>
        </footer>
      </div>

    </div>
  );
}

export default Dashboard;
