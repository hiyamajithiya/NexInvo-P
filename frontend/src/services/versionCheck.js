/**
 * Version Check Service
 * Automatically checks for new app versions and prompts user to refresh
 *
 * This solves the cache issue where users don't see deployed updates
 */

const VERSION_CHECK_INTERVAL = 60 * 1000; // Check every 1 minute (reduced from 5 minutes)
const CURRENT_VERSION_KEY = 'nexinvo_app_version';
const LAST_CHECK_KEY = 'nexinvo_last_version_check';

class VersionCheckService {
  constructor() {
    this.intervalId = null;
    this.currentVersion = localStorage.getItem(CURRENT_VERSION_KEY);
    this.notificationShown = false;
  }

  /**
   * Start version checking
   */
  start() {
    // Immediately check version on start (with cache bust)
    this.checkVersion(true);

    // Also check when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkVersion(true);
      }
    });

    // Check on window focus
    window.addEventListener('focus', () => {
      this.checkVersion(true);
    });

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
   * @param {boolean} force - Force check even if recently checked
   */
  async checkVersion(force = false) {
    try {
      // Add multiple cache-busting techniques
      const cacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const response = await fetch(`/version.json?_=${cacheBuster}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        console.log('Version check: Could not fetch version info');
        return;
      }

      const data = await response.json();
      const serverVersion = data.version;
      const serverBuildDate = data.buildDate;

      // First time - just store the version
      if (!this.currentVersion) {
        this.currentVersion = serverVersion;
        localStorage.setItem(CURRENT_VERSION_KEY, serverVersion);
        localStorage.setItem(LAST_CHECK_KEY, serverBuildDate);
        console.log('Version check: Initial version stored:', serverVersion);
        return;
      }

      // Check if version has changed
      if (serverVersion !== this.currentVersion) {
        console.log('Version check: New version available!', {
          current: this.currentVersion,
          new: serverVersion,
          buildDate: serverBuildDate
        });

        // Update stored version BEFORE showing notification
        // so subsequent checks don't keep showing the notification
        const oldVersion = this.currentVersion;
        this.currentVersion = serverVersion;
        localStorage.setItem(CURRENT_VERSION_KEY, serverVersion);
        localStorage.setItem(LAST_CHECK_KEY, serverBuildDate);

        this.showUpdateNotification(serverVersion, oldVersion);
      }
    } catch (error) {
      console.log('Version check: Error checking version', error.message);
    }
  }

  /**
   * Show update notification to user
   */
  showUpdateNotification(newVersion, oldVersion = '') {
    // Check if notification already shown
    if (this.notificationShown || document.getElementById('version-update-notification')) {
      return;
    }

    this.notificationShown = true;

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
        max-width: 90vw;
      ">
        <div style="font-size: 24px;">🚀</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">New Update Available!</div>
          <div style="font-size: 13px; opacity: 0.9;">Version ${newVersion} is ready${oldVersion ? ` (was ${oldVersion})` : ''}. Click refresh to get the latest features.</div>
        </div>
        <button id="version-refresh-btn" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
          white-space: nowrap;
        ">
          Refresh Now
        </button>
        <button id="version-dismiss-btn" style="
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
        #version-refresh-btn:hover {
          background: rgba(255,255,255,0.3) !important;
        }
      </style>
    `;

    document.body.appendChild(notification);

    // Add event listeners
    document.getElementById('version-refresh-btn').addEventListener('click', () => {
      // Clear all caches and reload
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      // Force hard reload
      window.location.reload(true);
    });

    document.getElementById('version-dismiss-btn').addEventListener('click', () => {
      notification.remove();
      this.notificationShown = false;
    });
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
    localStorage.removeItem(LAST_CHECK_KEY);
    this.currentVersion = null;
    this.notificationShown = false;
  }

  /**
   * Get current stored version info
   */
  getVersionInfo() {
    return {
      currentVersion: this.currentVersion,
      lastCheck: localStorage.getItem(LAST_CHECK_KEY)
    };
  }
}

// Create singleton instance
const versionCheckService = new VersionCheckService();

export default versionCheckService;
