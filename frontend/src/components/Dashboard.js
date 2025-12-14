import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { dashboardAPI, settingsAPI } from '../services/api';
import { formatDate } from '../utils/dateFormat';
import './Dashboard.css';
import OrganizationSwitcher from './OrganizationSwitcher';

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
const TallySyncCorner = lazy(() => import('./TallySyncCorner'));

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
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    revenue: 0,
    pending: 0,
    clients: 0,
    subscription: null
  });
  const [companyLogo, setCompanyLogo] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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

  const renderContent = () => {
    switch (activeMenu) {
      case 'invoices':
        return <Invoices />;
      case 'clients':
        return <Clients />;
      case 'services':
        return <ServiceMaster />;
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
        return <TallySyncCorner />;
      case 'profile':
        return <Profile onLogout={onLogout} />;
      default:
        return (
          <>
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

              <div className="stat-card orange" onClick={() => setActiveMenu('invoices')} style={{ cursor: 'pointer' }}>
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
                      <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                        {stats.subscription.next_billing_date && (
                          <>
                            <div>Next Billing: {formatDate(stats.subscription.next_billing_date)}</div>
                            <div style={{ marginTop: '5px', fontWeight: '500', color: stats.subscription.auto_renew ? '#10b981' : '#64748b' }}>
                              Auto-Renew: {stats.subscription.auto_renew ? 'ON' : 'OFF'}
                            </div>
                          </>
                        )}
                      </div>
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
      case 'receipts': return 'Receipt Records';
      case 'reports': return 'Reports & Analytics';
      case 'settings': return 'System Settings';
      case 'organization': return 'Organization Settings';
      case 'pricing': return 'Subscription Plans';
      case 'subscription': return 'My Subscription';
      case 'help': return 'Help Center';
      case 'tally-sync': return 'Tally Sync Corner';
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
          />
        </Suspense>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
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
              <>
                <div className="logo-icon">
                  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="48" rx="12" fill="rgba(255,255,255,0.2)"/>
                    <path d="M14 10h14l8 8v20a2 2 0 01-2 2H14a2 2 0 01-2-2V12a2 2 0 012-2z" fill="rgba(255,255,255,0.15)"/>
                    <path d="M28 10v8h8" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none"/>
                    <path d="M17 32V18h3l6 9V18h3v14h-3l-6-9v9h-3z" fill="white"/>
                    <rect x="17" y="34" width="14" height="2" rx="1" fill="rgba(255,255,255,0.5)"/>
                  </svg>
                </div>
                <h2 className="logo-text">NexInvo</h2>
              </>
            )}
          </div>
          <p className="company-subtitle">NexInvo - Invoice Management System</p>
        </div>

        <nav className="sidebar-nav">
          <a
            href="#dashboard"
            className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('dashboard'); }}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Dashboard</span>
          </a>
          <a
            href="#invoices"
            className={`nav-item ${activeMenu === 'invoices' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('invoices'); }}
          >
            <span className="nav-icon">📄</span>
            <span className="nav-text">Invoices</span>
          </a>
          <a
            href="#clients"
            className={`nav-item ${activeMenu === 'clients' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('clients'); }}
          >
            <span className="nav-icon">👥</span>
            <span className="nav-text">Clients</span>
          </a>
          <a
            href="#services"
            className={`nav-item ${activeMenu === 'services' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('services'); }}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-text">Service Master</span>
          </a>
          <a
            href="#receipts"
            className={`nav-item ${activeMenu === 'receipts' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('receipts'); }}
          >
            <span className="nav-icon">🧾</span>
            <span className="nav-text">Receipts</span>
          </a>
          <a
            href="#reports"
            className={`nav-item ${activeMenu === 'reports' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('reports'); }}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Reports</span>
          </a>
          <a
            href="#settings"
            className={`nav-item ${activeMenu === 'settings' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('settings'); }}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Settings</span>
          </a>
          <a
            href="#organization"
            className={`nav-item ${activeMenu === 'organization' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('organization'); }}
          >
            <span className="nav-icon">🏢</span>
            <span className="nav-text">Organization</span>
          </a>
          <a
            href="#subscription"
            className={`nav-item ${activeMenu === 'subscription' || activeMenu === 'pricing' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('subscription'); }}
          >
            <span className="nav-icon">💼</span>
            <span className="nav-text">My Subscription</span>
          </a>
          <a
            href="#tally-sync"
            className={`nav-item ${activeMenu === 'tally-sync' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('tally-sync'); }}
          >
            <span className="nav-icon">🔄</span>
            <span className="nav-text">Tally Sync Corner</span>
          </a>
          <a
            href="#help"
            className={`nav-item ${activeMenu === 'help' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('help'); }}
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
            <h1 className="page-title">{getPageTitle()}</h1>
            <p className="page-subtitle">Welcome back, {user?.username || 'Admin'}</p>
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
                    onClick={onLogout}
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
