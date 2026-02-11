import React, { useState, useEffect, useRef, useCallback } from 'react';
import OrganizationSwitcher from '../OrganizationSwitcher';

function TopHeader({
  user,
  activeMenu,
  onNavigate,
  onLogout,
  onMobileMenuToggle,
  getPageTitle
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  // Auto-hide dropdown after 5 seconds of inactivity
  const resetDropdownTimer = useCallback(() => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    dropdownTimeoutRef.current = setTimeout(() => {
      setShowUserDropdown(false);
    }, 5000);
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

  return (
    <header className="top-header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onMobileMenuToggle}
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
          onClick={() => onNavigate('help')}
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
                  onNavigate('profile');
                  setShowUserDropdown(false);
                }}
              >
                <span>{'\uD83D\uDC64'}</span> Profile
              </button>
              <button
                className="user-dropdown-item logout"
                onClick={onLogout}
              >
                <span>{'\uD83D\uDEAA'}</span> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopHeader;
