import React, { useState } from 'react';

function Sidebar({
  activeMenu,
  onNavigate,
  companyLogo,
  isGoodsTrader,
  isServiceProvider,
  mobileMenuOpen,
  onMobileMenuClose
}) {
  const [masterMenuOpen, setMasterMenuOpen] = useState(false);
  const [dataEntryMenuOpen, setDataEntryMenuOpen] = useState(false);
  const [accountingReportsMenuOpen, setAccountingReportsMenuOpen] = useState(false);
  const [tallySyncMenuOpen, setTallySyncMenuOpen] = useState(false);

  const handleMenuClick = (menuItem) => {
    onNavigate(menuItem);
    onMobileMenuClose();
  };

  return (
    <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <button
          className="mobile-close-btn"
          onClick={onMobileMenuClose}
          aria-label="Close menu"
        >
          {'\u2715'}
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
          <span className="nav-icon">{'\uD83C\uDFE0'}</span>
          <span className="nav-text">Dashboard</span>
        </a>
        {/* Master Menu with Submenu */}
        <div className="nav-item-group">
          <a
            href="#master"
            className={`nav-item has-submenu ${masterMenuOpen ? 'open' : ''} ${['clients', 'services', 'products', 'account-groups', 'ledgers', 'opening-balance', 'financial-year'].includes(activeMenu) ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setMasterMenuOpen(!masterMenuOpen); }}
          >
            <span className="nav-icon">{'\uD83D\uDCDA'}</span>
            <span className="nav-text">Master</span>
            <span className="submenu-arrow">{masterMenuOpen ? '\u25BC' : '\u25B6'}</span>
          </a>
          {masterMenuOpen && (
            <div className="submenu">
              <a
                href="#clients"
                className={`nav-item submenu-item ${activeMenu === 'clients' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('clients'); }}
              >
                <span className="nav-icon">{'\uD83D\uDC65'}</span>
                <span className="nav-text">Clients</span>
              </a>
              {isServiceProvider && (
                <a
                  href="#services"
                  className={`nav-item submenu-item ${activeMenu === 'services' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleMenuClick('services'); }}
                >
                  <span className="nav-icon">{'\uD83D\uDCCB'}</span>
                  <span className="nav-text">Service Master</span>
                </a>
              )}
              {isGoodsTrader && (
                <a
                  href="#products"
                  className={`nav-item submenu-item ${activeMenu === 'products' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleMenuClick('products'); }}
                >
                  <span className="nav-icon">{'\uD83D\uDCE6'}</span>
                  <span className="nav-text">Product Master</span>
                </a>
              )}
              <a
                href="#financial-year"
                className={`nav-item submenu-item ${activeMenu === 'financial-year' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('financial-year'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCC5'}</span>
                <span className="nav-text">Financial Year</span>
              </a>
              <a
                href="#account-groups"
                className={`nav-item submenu-item ${activeMenu === 'account-groups' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('account-groups'); }}
              >
                <span className="nav-icon">{'\uD83D\uDDC2\uFE0F'}</span>
                <span className="nav-text">Account Groups</span>
              </a>
              <a
                href="#ledgers"
                className={`nav-item submenu-item ${activeMenu === 'ledgers' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('ledgers'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCD2'}</span>
                <span className="nav-text">Ledger Master</span>
              </a>
              <a
                href="#opening-balance"
                className={`nav-item submenu-item ${activeMenu === 'opening-balance' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('opening-balance'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCB0'}</span>
                <span className="nav-text">Opening Balance</span>
              </a>
            </div>
          )}
        </div>

        {/* Data Entry Menu with Submenu */}
        <div className="nav-item-group">
          <a
            href="#data-entry"
            className={`nav-item has-submenu ${dataEntryMenuOpen ? 'open' : ''} ${['invoices', 'receipts', 'payments', 'purchases', 'contra', 'journal', 'debit-note', 'credit-note'].includes(activeMenu) ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setDataEntryMenuOpen(!dataEntryMenuOpen); }}
          >
            <span className="nav-icon">{'\uD83D\uDCDD'}</span>
            <span className="nav-text">Data Entry</span>
            <span className="submenu-arrow">{dataEntryMenuOpen ? '\u25BC' : '\u25B6'}</span>
          </a>
          {dataEntryMenuOpen && (
            <div className="submenu">
              <a
                href="#invoices"
                className={`nav-item submenu-item ${activeMenu === 'invoices' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('invoices'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCC4'}</span>
                <span className="nav-text">Invoices</span>
              </a>
              <a
                href="#receipts"
                className={`nav-item submenu-item ${activeMenu === 'receipts' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('receipts'); }}
              >
                <span className="nav-icon">{'\uD83E\uDDFE'}</span>
                <span className="nav-text">Receipts</span>
              </a>
              <a
                href="#payments"
                className={`nav-item submenu-item ${activeMenu === 'payments' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('payments'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCB3'}</span>
                <span className="nav-text">Payments</span>
              </a>
              {isGoodsTrader && (
                <a
                  href="#purchases"
                  className={`nav-item submenu-item ${activeMenu === 'purchases' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleMenuClick('purchases'); }}
                >
                  <span className="nav-icon">{'\uD83D\uDED2'}</span>
                  <span className="nav-text">Purchases</span>
                </a>
              )}
              <a
                href="#contra"
                className={`nav-item submenu-item ${activeMenu === 'contra' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('contra'); }}
              >
                <span className="nav-icon">{'\uD83D\uDD04'}</span>
                <span className="nav-text">Contra</span>
              </a>
              <a
                href="#journal"
                className={`nav-item submenu-item ${activeMenu === 'journal' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('journal'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCD3'}</span>
                <span className="nav-text">Journal Entry</span>
              </a>
              <a
                href="#debit-note"
                className={`nav-item submenu-item ${activeMenu === 'debit-note' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('debit-note'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCD5'}</span>
                <span className="nav-text">Debit Note</span>
              </a>
              <a
                href="#credit-note"
                className={`nav-item submenu-item ${activeMenu === 'credit-note' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('credit-note'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCD7'}</span>
                <span className="nav-text">Credit Note</span>
              </a>
            </div>
          )}
        </div>

        {/* Goods Trader Additional Menu Items */}
        {isGoodsTrader && (
          <>
            <a
              href="#suppliers"
              className={`nav-item ${activeMenu === 'suppliers' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); handleMenuClick('suppliers'); }}
            >
              <span className="nav-icon">{'\uD83C\uDFED'}</span>
              <span className="nav-text">Suppliers</span>
            </a>
            <a
              href="#inventory"
              className={`nav-item ${activeMenu === 'inventory' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); handleMenuClick('inventory'); }}
            >
              <span className="nav-icon">{'\uD83D\uDCCA'}</span>
              <span className="nav-text">Inventory</span>
            </a>
          </>
        )}
        {/* Accounting Reports Menu with Submenu */}
        <div className="nav-item-group">
          <a
            href="#accounting-reports"
            className={`nav-item has-submenu ${accountingReportsMenuOpen ? 'open' : ''} ${['trial-balance', 'profit-loss', 'balance-sheet', 'day-book', 'ledger-report', 'cash-book', 'bank-book', 'bank-reconciliation', 'ageing-report', 'analytics-dashboard', 'payment-reminders', 'reports'].includes(activeMenu) ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setAccountingReportsMenuOpen(!accountingReportsMenuOpen); }}
          >
            <span className="nav-icon">{'\uD83D\uDCCA'}</span>
            <span className="nav-text">Reports</span>
            <span className="submenu-arrow">{accountingReportsMenuOpen ? '\u25BC' : '\u25B6'}</span>
          </a>
          {accountingReportsMenuOpen && (
            <div className="submenu">
              <a
                href="#trial-balance"
                className={`nav-item submenu-item ${activeMenu === 'trial-balance' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('trial-balance'); }}
              >
                <span className="nav-icon">{'\u2696\uFE0F'}</span>
                <span className="nav-text">Trial Balance</span>
              </a>
              <a
                href="#profit-loss"
                className={`nav-item submenu-item ${activeMenu === 'profit-loss' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('profit-loss'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCC8'}</span>
                <span className="nav-text">Profit & Loss</span>
              </a>
              <a
                href="#balance-sheet"
                className={`nav-item submenu-item ${activeMenu === 'balance-sheet' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('balance-sheet'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCCB'}</span>
                <span className="nav-text">Balance Sheet</span>
              </a>
              <a
                href="#day-book"
                className={`nav-item submenu-item ${activeMenu === 'day-book' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('day-book'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCC5'}</span>
                <span className="nav-text">Day Book</span>
              </a>
              <a
                href="#ledger-report"
                className={`nav-item submenu-item ${activeMenu === 'ledger-report' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('ledger-report'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCD6'}</span>
                <span className="nav-text">Ledger Report</span>
              </a>
              <a
                href="#cash-book"
                className={`nav-item submenu-item ${activeMenu === 'cash-book' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('cash-book'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCB5'}</span>
                <span className="nav-text">Cash Book</span>
              </a>
              <a
                href="#bank-book"
                className={`nav-item submenu-item ${activeMenu === 'bank-book' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('bank-book'); }}
              >
                <span className="nav-icon">{'\uD83C\uDFE6'}</span>
                <span className="nav-text">Bank Book</span>
              </a>
              <a
                href="#bank-reconciliation"
                className={`nav-item submenu-item ${activeMenu === 'bank-reconciliation' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('bank-reconciliation'); }}
              >
                <span className="nav-icon">{'\u2705'}</span>
                <span className="nav-text">Bank Reconciliation</span>
              </a>
              <a
                href="#ageing-report"
                className={`nav-item submenu-item ${activeMenu === 'ageing-report' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('ageing-report'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCC6'}</span>
                <span className="nav-text">Ageing Report</span>
              </a>
              <a
                href="#analytics-dashboard"
                className={`nav-item submenu-item ${activeMenu === 'analytics-dashboard' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('analytics-dashboard'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCC8'}</span>
                <span className="nav-text">Analytics Dashboard</span>
              </a>
              <a
                href="#payment-reminders"
                className={`nav-item submenu-item ${activeMenu === 'payment-reminders' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('payment-reminders'); }}
              >
                <span className="nav-icon">{'\uD83D\uDD14'}</span>
                <span className="nav-text">Payment Reminders</span>
              </a>
              <a
                href="#reports"
                className={`nav-item submenu-item ${activeMenu === 'reports' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('reports'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCCA'}</span>
                <span className="nav-text">Other Reports</span>
              </a>
            </div>
          )}
        </div>
        <a
          href="#settings"
          className={`nav-item ${activeMenu === 'settings' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); handleMenuClick('settings'); }}
        >
          <span className="nav-icon">{'\u2699\uFE0F'}</span>
          <span className="nav-text">Settings</span>
        </a>
        <a
          href="#organization"
          className={`nav-item ${activeMenu === 'organization' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); handleMenuClick('organization'); }}
        >
          <span className="nav-icon">{'\uD83C\uDFE2'}</span>
          <span className="nav-text">Organization</span>
        </a>
        <a
          href="#subscription"
          className={`nav-item ${activeMenu === 'subscription' || activeMenu === 'pricing' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); handleMenuClick('subscription'); }}
        >
          <span className="nav-icon">{'\uD83D\uDCBC'}</span>
          <span className="nav-text">My Subscription</span>
        </a>
        <div className="nav-item-group">
          <a
            href="#tally-sync"
            className={`nav-item has-submenu ${tallySyncMenuOpen ? 'open' : ''} ${['tally-sync', 'tally-sync-accounts', 'tally-sync-vouchers', 'tally-import-company', 'tally-import-balances', 'tally-import-vouchers', 'tally-realtime-sync'].includes(activeMenu) ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setTallySyncMenuOpen(!tallySyncMenuOpen); }}
          >
            <span className="nav-icon">{'\uD83D\uDD17'}</span>
            <span className="nav-text">Tally Sync</span>
            <span className="submenu-arrow">{tallySyncMenuOpen ? '\u25BC' : '\u25B6'}</span>
          </a>
          {tallySyncMenuOpen && (
            <div className="submenu">
              <a
                href="#tally-sync"
                className={`nav-item submenu-item ${activeMenu === 'tally-sync' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('tally-sync'); }}
              >
                <span className="nav-icon">{'\u2B07\uFE0F'}</span>
                <span className="nav-text">Setu Download</span>
              </a>
              <a
                href="#tally-sync-accounts"
                className={`nav-item submenu-item ${activeMenu === 'tally-sync-accounts' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('tally-sync-accounts'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCDA'}</span>
                <span className="nav-text">Sync Accounts</span>
              </a>
              <a
                href="#tally-sync-vouchers"
                className={`nav-item submenu-item ${activeMenu === 'tally-sync-vouchers' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('tally-sync-vouchers'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCE4'}</span>
                <span className="nav-text">Export Vouchers</span>
              </a>
              <a
                href="#tally-import-company"
                className={`nav-item submenu-item ${activeMenu === 'tally-import-company' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('tally-import-company'); }}
              >
                <span className="nav-icon">{'\uD83C\uDFE2'}</span>
                <span className="nav-text">Import Company Info</span>
              </a>
              <a
                href="#tally-import-balances"
                className={`nav-item submenu-item ${activeMenu === 'tally-import-balances' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('tally-import-balances'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCCA'}</span>
                <span className="nav-text">Import Opening Balances</span>
              </a>
              <a
                href="#tally-import-vouchers"
                className={`nav-item submenu-item ${activeMenu === 'tally-import-vouchers' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('tally-import-vouchers'); }}
              >
                <span className="nav-icon">{'\uD83D\uDCE5'}</span>
                <span className="nav-text">Import Vouchers</span>
              </a>
              <a
                href="#tally-realtime-sync"
                className={`nav-item submenu-item ${activeMenu === 'tally-realtime-sync' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleMenuClick('tally-realtime-sync'); }}
              >
                <span className="nav-icon">{'\u26A1'}</span>
                <span className="nav-text">Real-Time Sync</span>
              </a>
            </div>
          )}
        </div>
        <a
          href="#help"
          className={`nav-item ${activeMenu === 'help' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); handleMenuClick('help'); }}
        >
          <span className="nav-icon">{'\u2753'}</span>
          <span className="nav-text">Help & Guide</span>
        </a>
      </nav>

    </aside>
  );
}

export default Sidebar;
