import React, { useState, useEffect } from 'react';
import { dashboardAPI, settingsAPI } from '../services/api';
import './Dashboard.css';
import Invoices from './Invoices';
import Clients from './Clients';
import ServiceMaster from './ServiceMaster';
import Payments from './Payments';
import Reports from './Reports';
import Settings from './Settings';
import Profile from './Profile';
import OrganizationSwitcher from './OrganizationSwitcher';
import OrganizationSettings from '../pages/OrganizationSettings';
import PricingPlans from './PricingPlans';
import MySubscription from './MySubscription';

function Dashboard({ user, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [stats, setStats] = useState({
    totalInvoices: 0,
    revenue: 0,
    pending: 0,
    clients: 0
  });
  const [companyLogo, setCompanyLogo] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    if (activeMenu === 'dashboard') {
      loadStats();
    }
    loadCompanyLogo();
  }, [activeMenu]);

  const loadStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadCompanyLogo = async () => {
    try {
      const response = await settingsAPI.getCompanySettings();
      if (response.data && response.data.logo) {
        setCompanyLogo(response.data.logo);
      }
    } catch (err) {
      console.error('Error loading company logo:', err);
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
      case 'payments':
        return <Payments />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'organization':
        return <OrganizationSettings />;
      case 'pricing':
        return <PricingPlans />;
      case 'subscription':
        return <MySubscription />;
      case 'profile':
        return <Profile onLogout={onLogout} />;
      default:
        return (
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

            <div className="stat-card green" onClick={() => setActiveMenu('payments')} style={{ cursor: 'pointer' }}>
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
        );
    }
  };

  const getPageTitle = () => {
    switch (activeMenu) {
      case 'invoices': return 'Invoices Management';
      case 'clients': return 'Client Management';
      case 'services': return 'Service Master';
      case 'payments': return 'Payment Records';
      case 'reports': return 'Reports & Analytics';
      case 'settings': return 'System Settings';
      case 'organization': return 'Organization Settings';
      case 'pricing': return 'Subscription Plans';
      case 'subscription': return 'My Subscription';
      case 'profile': return 'User Profile';
      default: return 'Dashboard Overview';
    }
  };

  return (
    <div className="dashboard-layout">
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
                <div className="logo-icon">📊</div>
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
            href="#payments"
            className={`nav-item ${activeMenu === 'payments' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('payments'); }}
          >
            <span className="nav-icon">💳</span>
            <span className="nav-text">Payments</span>
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
            className={`nav-item ${activeMenu === 'subscription' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('subscription'); }}
          >
            <span className="nav-icon">💼</span>
            <span className="nav-text">My Subscription</span>
          </a>
          <a
            href="#pricing"
            className={`nav-item ${activeMenu === 'pricing' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('pricing'); }}
          >
            <span className="nav-icon">💳</span>
            <span className="nav-text">Upgrade Plan</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-indicator"></div>
            <span>System Active</span>
          </div>
        </div>
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
            <div className="search-box">
              <input type="text" placeholder="Search..." />
              <span className="search-icon">🔍</span>
            </div>
            <div style={{ marginRight: '20px' }}>
              <OrganizationSwitcher />
            </div>
            <div className="user-menu">
              <div
                className="user-avatar"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{ cursor: 'pointer' }}
              >
                {(user?.username || 'A')[0].toUpperCase()}
              </div>
              {showUserDropdown && (
                <div className="user-dropdown">
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
          {renderContent()}
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
