/**
 * Version Check Service
 * Automatically checks for new app versions and prompts user to refresh
 *
 * This solves the cache issue where users don't see deployed updates
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const CURRENT_VERSION_KEY = 'nexinvo_app_version';

class VersionCheckService {
  constructor() {
    this.intervalId = null;
    this.currentVersion = localStorage.getItem(CURRENT_VERSION_KEY);
  }

  /**
   * Start version checking
   */
  start() {
    // Initial check after a short delay (let the app load first)
    setTimeout(() => this.checkVersion(), 10000);

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkVersion();
    }, VERSION_CHECK_INTERVAL);
  }

  /**
   * Stop version checking
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for new version
   */
  async checkVersion() {
    try {
      // Add timestamp to prevent caching
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        console.log('Version check: Could not fetch version info');
        return;
      }

      const data = await response.json();
      const serverVersion = data.version;

      // First time - just store the version
      if (!this.currentVersion) {
        this.currentVersion = serverVersion;
        localStorage.setItem(CURRENT_VERSION_KEY, serverVersion);
        console.log('Version check: Initial version stored:', serverVersion);
        return;
      }

      // Check if version has changed
      if (serverVersion !== this.currentVersion) {
        console.log('Version check: New version available!', {
          current: this.currentVersion,
          new: serverVersion
        });
        this.showUpdateNotification(serverVersion);
      }
    } catch (error) {
      console.log('Version check: Error checking version', error.message);
    }
  }

  /**
   * Show update notification to user
   */
  showUpdateNotification(newVersion) {
    // Check if notification already shown
    if (document.getElementById('version-update-notification')) {
      return;
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'version-update-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideUp 0.3s ease;
      ">
        <div style="font-size: 24px;">🔄</div>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">New Update Available!</div>
          <div style="font-size: 13px; opacity: 0.9;">Version ${newVersion} is ready. Refresh to get the latest features.</div>
        </div>
        <button onclick="window.location.reload(true)" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
          Refresh Now
        </button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: white;
          opacity: 0.7;
          cursor: pointer;
          font-size: 20px;
          padding: 0 8px;
        " title="Dismiss">×</button>
      </div>
      <style>
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      </style>
    `;

    document.body.appendChild(notification);
  }

  /**
   * Force update the stored version (call after refresh)
   */
  updateStoredVersion(version) {
    this.currentVersion = version;
    localStorage.setItem(CURRENT_VERSION_KEY, version);
  }

  /**
   * Clear stored version (for testing)
   */
  clearStoredVersion() {
    localStorage.removeItem(CURRENT_VERSION_KEY);
    this.currentVersion = null;
  }
}

// Create singleton instance
const versionCheckService = new VersionCheckService();

export default versionCheckService;
