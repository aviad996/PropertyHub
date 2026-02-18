// Mobile Native App Module - iOS/Android PWA & Offline Support

const MobileApp = {
    /**
     * Initialize mobile app module
     */
    init: async () => {
        try {
            await MobileApp.setupPWA();
            await MobileApp.setupOfflineSupport();
            await MobileApp.setupNotifications();
            await MobileApp.detectPlatform();
        } catch (error) {
            console.error('Error initializing mobile app:', error);
        }
    },

    /**
     * Detect platform (iOS, Android, or web)
     */
    detectPlatform: () => {
        const ua = navigator.userAgent.toLowerCase();

        if (/iphone|ipad|ipod/.test(ua)) {
            MobileApp.platform = 'iOS';
            MobileApp.platformVersion = ua.match(/os (\d+)/)?.[1] || 'unknown';
        } else if (/android/.test(ua)) {
            MobileApp.platform = 'Android';
            MobileApp.platformVersion = ua.match(/android (\d+)/)?.[1] || 'unknown';
        } else {
            MobileApp.platform = 'Web';
            MobileApp.platformVersion = 'N/A';
        }

        MobileApp.isNative = /propertyHub/.test(ua); // Check for native app wrapper
        MobileApp.isStandalone = window.navigator.standalone === true;

        console.log(`PropertyHub Platform: ${MobileApp.platform} v${MobileApp.platformVersion} (Standalone: ${MobileApp.isStandalone})`);

        return {
            platform: MobileApp.platform,
            version: MobileApp.platformVersion,
            isNative: MobileApp.isNative,
            isStandalone
        };
    },

    /**
     * Setup Progressive Web App (PWA)
     */
    setupPWA: async () => {
        try {
            // Register service worker
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registered:', registration);
                MobileApp.swRegistration = registration;

                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            console.log('New service worker activated - app updated');
                            MobileApp.showUpdateNotification();
                        }
                    });
                });
            }

            // Request persistent storage
            if (navigator.storage && navigator.storage.persist) {
                const persistent = await navigator.storage.persist();
                console.log('Persistent storage:', persistent ? 'granted' : 'denied');
            }

            return true;
        } catch (error) {
            console.error('Error setting up PWA:', error);
            return false;
        }
    },

    /**
     * Setup offline support with service worker
     */
    setupOfflineSupport: async () => {
        try {
            // Initialize local database
            MobileApp.localDB = new MobileApp.LocalDatabase();
            await MobileApp.localDB.init();

            // Sync data periodically
            setInterval(() => {
                MobileApp.syncOfflineData();
            }, 5 * 60 * 1000); // Sync every 5 minutes

            // Listen for online/offline events
            window.addEventListener('online', () => {
                console.log('App online - syncing data');
                MobileApp.syncOfflineData();
                UI.showToast('Back online - syncing data', 'info');
            });

            window.addEventListener('offline', () => {
                console.log('App offline - using cached data');
                UI.showToast('You are offline - using cached data', 'warning');
            });

            return true;
        } catch (error) {
            console.error('Error setting up offline support:', error);
            return false;
        }
    },

    /**
     * Local database for offline support
     */
    LocalDatabase: class {
        async init() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('PropertyHubDB', 1);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    this.db = request.result;
                    resolve();
                };

                request.onupgradeneeded = (e) => {
                    const db = e.target.result;

                    // Create object stores
                    if (!db.objectStoreNames.contains('properties')) {
                        db.createObjectStore('properties', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('mortgages')) {
                        db.createObjectStore('mortgages', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('expenses')) {
                        db.createObjectStore('expenses', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('rentPayments')) {
                        db.createObjectStore('rentPayments', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('syncQueue')) {
                        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                    }
                };
            });
        }

        async save(storeName, data) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const request = store.put(data);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(data);
            });
        }

        async get(storeName, key) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const request = store.get(key);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });
        }

        async getAll(storeName) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const request = store.getAll();

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });
        }

        async addToQueue(operation) {
            const tx = this.db.transaction('syncQueue', 'readwrite');
            const store = tx.objectStore('syncQueue');
            store.add({
                operation,
                timestamp: Date.now(),
                status: 'pending'
            });
        }
    },

    /**
     * Sync offline data when back online
     */
    syncOfflineData: async () => {
        if (!navigator.onLine) return;

        try {
            const allData = await MobileApp.localDB.getAll('syncQueue');
            const pendingOps = allData.filter(op => op.status === 'pending');

            for (const op of pendingOps) {
                try {
                    // Send operation to server
                    await API.syncOfflineOperation(op.operation);

                    // Mark as synced
                    const tx = MobileApp.localDB.db.transaction('syncQueue', 'readwrite');
                    const store = tx.objectStore('syncQueue');
                    op.status = 'synced';
                    store.put(op);
                } catch (error) {
                    console.error('Error syncing operation:', error);
                }
            }

            console.log(`Synced ${pendingOps.length} offline operations`);
        } catch (error) {
            console.error('Error syncing offline data:', error);
        }
    },

    /**
     * Setup push notifications
     */
    setupNotifications: async () => {
        try {
            // Request notification permission
            if ('Notification' in window && Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
            }

            // Register push notifications
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;

                try {
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: MobileApp.vapidPublicKey
                    });

                    console.log('Push subscription:', subscription);
                    // Send subscription to server
                    await API.savePushSubscription(subscription);
                } catch (error) {
                    console.error('Error subscribing to push:', error);
                }
            }

            return true;
        } catch (error) {
            console.error('Error setting up notifications:', error);
            return false;
        }
    },

    /**
     * VAPID public key for push notifications (would be configured on server)
     */
    vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY_HERE',

    /**
     * Send local notification
     */
    sendLocalNotification: async (title, options = {}) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                icon: '/images/icon-192x192.png',
                badge: '/images/badge-72x72.png',
                ...options
            });

            notification.addEventListener('click', () => {
                window.focus();
                notification.close();
            });

            return notification;
        }
    },

    /**
     * Show update notification when new version available
     */
    showUpdateNotification: async () => {
        await MobileApp.sendLocalNotification('PropertyHub Updated', {
            body: 'A new version is available. Refresh to get the latest updates.',
            tag: 'update-notification',
            requireInteraction: true
        });
    },

    /**
     * Send property alert notification
     */
    sendPropertyAlert: async (property, alert) => {
        await MobileApp.sendLocalNotification(`Property Alert: ${property.address}`, {
            body: alert.message,
            tag: `alert-${property.id}`,
            badge: '/images/alert-badge.png'
        });
    },

    /**
     * Send metric alert notification
     */
    sendMetricAlert: async (metric, value, threshold) => {
        await MobileApp.sendLocalNotification(`⚠️ Metric Alert: ${metric}`, {
            body: `${metric} is ${value} (threshold: ${threshold})`,
            tag: `metric-alert-${metric}`
        });
    },

    /**
     * Request camera access for property photos (mobile)
     */
    requestCameraAccess: async () => {
        try {
            const constraints = { video: { facingMode: 'environment' } };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            return stream;
        } catch (error) {
            console.error('Camera access denied:', error);
            throw error;
        }
    },

    /**
     * Capture photo from camera
     */
    capturePhoto: async () => {
        try {
            const stream = await MobileApp.requestCameraAccess();
            const video = document.createElement('video');
            video.srcObject = stream;
            await new Promise(resolve => setTimeout(resolve, 1000));

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Stop stream
            stream.getTracks().forEach(track => track.stop());

            return canvas.toDataURL('image/jpeg', 0.8);
        } catch (error) {
            console.error('Error capturing photo:', error);
            throw error;
        }
    },

    /**
     * Request location access
     */
    requestLocationAccess: async () => {
        return new Promise((resolve, reject) => {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        });
                    },
                    (error) => reject(error),
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            } else {
                reject(new Error('Geolocation not supported'));
            }
        });
    },

    /**
     * Get device storage status
     */
    getStorageStatus: async () => {
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage,
                    quota: estimate.quota,
                    percentUsed: (estimate.usage / estimate.quota * 100).toFixed(1),
                    available: estimate.quota - estimate.usage
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting storage status:', error);
            return null;
        }
    },

    /**
     * Clear cache for offline data
     */
    clearCache: async () => {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('Cache cleared');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error clearing cache:', error);
            return false;
        }
    },

    /**
     * Enable vibration feedback
     */
    vibrate: (pattern = [200]) => {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    },

    /**
     * Handle app lifecycle events
     */
    handleAppLifecycle: () => {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('App hidden');
                MobileApp.appVisible = false;
            } else {
                console.log('App visible');
                MobileApp.appVisible = true;
                // Sync data when app comes to foreground
                MobileApp.syncOfflineData();
            }
        });

        // Handle app suspend/resume
        document.addEventListener('pause', () => {
            console.log('App paused');
        });

        document.addEventListener('resume', () => {
            console.log('App resumed');
            MobileApp.syncOfflineData();
        });
    },

    /**
     * Load mobile settings view
     */
    loadMobileSettings: async () => {
        try {
            const container = document.getElementById('financial-analytics-view');
            if (!container) return;

            container.innerHTML = '<div class="loading">Loading mobile settings...</div>';

            const platformInfo = MobileApp.detectPlatform();
            const storageStatus = await MobileApp.getStorageStatus();

            MobileApp.renderMobileSettings(container, platformInfo, storageStatus);
        } catch (error) {
            console.error('Error loading mobile settings:', error);
            UI.showToast('Error loading mobile settings', 'error');
        }
    },

    /**
     * Render mobile settings UI
     */
    renderMobileSettings: (container, platformInfo, storageStatus) => {
        container.innerHTML = `
            <div class="mobile-settings-container">
                <div class="settings-header">
                    <h2>Mobile App Settings</h2>
                    <p class="subheader">Configure your PropertyHub mobile experience</p>
                </div>

                <div class="platform-info-section">
                    <h3>📱 Device Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="label">Platform</span>
                            <span class="value">${platformInfo.platform}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Version</span>
                            <span class="value">${platformInfo.version}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">App Mode</span>
                            <span class="value">${platformInfo.isStandalone ? '🏠 Standalone' : '🌐 Browser'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Service Worker</span>
                            <span class="value">${MobileApp.swRegistration ? '✅ Active' : '❌ Inactive'}</span>
                        </div>
                    </div>
                </div>

                ${storageStatus ? `
                    <div class="storage-section">
                        <h3>💾 Storage Status</h3>
                        <div class="storage-info">
                            <div class="storage-stats">
                                <div class="stat">
                                    <span class="label">Used</span>
                                    <span class="value">${(storageStatus.used / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                                <div class="stat">
                                    <span class="label">Available</span>
                                    <span class="value">${(storageStatus.available / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                                <div class="stat">
                                    <span class="label">Total</span>
                                    <span class="value">${(storageStatus.quota / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                            </div>
                            <div class="storage-bar">
                                <div class="bar-fill" style="width: ${storageStatus.percentUsed}%"></div>
                                <span class="percentage">${storageStatus.percentUsed}%</span>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <div class="notifications-section">
                    <h3>🔔 Notifications</h3>
                    <div class="notification-controls">
                        <div class="control-item">
                            <label for="enable-notifications">Enable Push Notifications</label>
                            <button class="toggle-btn" id="enable-notifications" onclick="MobileApp.toggleNotifications()">
                                ${Notification.permission === 'granted' ? 'On' : 'Off'}
                            </button>
                        </div>
                        <div class="control-item">
                            <label for="property-alerts">Property Alerts</label>
                            <button class="toggle-btn" id="property-alerts" onclick="MobileApp.togglePropertyAlerts()">On</button>
                        </div>
                        <div class="control-item">
                            <label for="metric-alerts">Metric Alerts</label>
                            <button class="toggle-btn" id="metric-alerts" onclick="MobileApp.toggleMetricAlerts()">On</button>
                        </div>
                    </div>
                </div>

                <div class="offline-section">
                    <h3>📡 Offline Support</h3>
                    <div class="offline-controls">
                        <p class="description">Your data is automatically synced when you're back online.</p>
                        <button class="btn-secondary" onclick="MobileApp.syncOfflineData()">
                            🔄 Sync Now
                        </button>
                        <button class="btn-secondary" onclick="MobileApp.clearCache()">
                            🗑️ Clear Cache
                        </button>
                    </div>
                </div>

                <div class="install-section">
                    <h3>📥 Install App</h3>
                    <div class="install-instructions">
                        <div class="instruction">
                            <span class="os">iOS</span>
                            <span class="steps">
                                1. Tap Share<br>
                                2. Tap "Add to Home Screen"<br>
                                3. Name it "PropertyHub"
                            </span>
                        </div>
                        <div class="instruction">
                            <span class="os">Android</span>
                            <span class="steps">
                                1. Tap Menu (⋮)<br>
                                2. Tap "Install app"<br>
                                3. Confirm installation
                            </span>
                        </div>
                    </div>
                </div>

                <div class="app-actions">
                    <button class="btn-primary" onclick="FinancialAnalytics.loadFinancialAnalytics()">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Toggle notifications
     */
    toggleNotifications: async () => {
        if (Notification.permission === 'granted') {
            MobileApp.notificationsEnabled = !MobileApp.notificationsEnabled;
        } else {
            const permission = await Notification.requestPermission();
            MobileApp.notificationsEnabled = permission === 'granted';
        }
        location.reload(); // Reload to update UI
    },

    /**
     * Toggle property alerts
     */
    togglePropertyAlerts: () => {
        MobileApp.propertyAlertsEnabled = !MobileApp.propertyAlertsEnabled;
        localStorage.setItem('propertyAlertsEnabled', MobileApp.propertyAlertsEnabled);
        UI.showToast('Property alerts ' + (MobileApp.propertyAlertsEnabled ? 'enabled' : 'disabled'), 'info');
    },

    /**
     * Toggle metric alerts
     */
    toggleMetricAlerts: () => {
        MobileApp.metricAlertsEnabled = !MobileApp.metricAlertsEnabled;
        localStorage.setItem('metricAlertsEnabled', MobileApp.metricAlertsEnabled);
        UI.showToast('Metric alerts ' + (MobileApp.metricAlertsEnabled ? 'enabled' : 'disabled'), 'info');
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    MobileApp.init();
    MobileApp.handleAppLifecycle();
});
