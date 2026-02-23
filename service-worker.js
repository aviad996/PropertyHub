// Service Worker for PropertyHub - Offline Support & Caching Strategy

const CACHE_NAME = 'propertyHub-v32';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/formatting.js',
  '/js/storage.js',
  '/js/api.js',
  '/js/app.js',
  '/js/utils/calculations.js',
  '/js/utils/reports.js',
  '/js/modules/dashboard.js',
  '/js/modules/financial_analytics.js',
  '/js/modules/kpi_monitoring.js',
  '/js/modules/scenario_analysis.js',
  '/js/modules/debt_paydown.js',
  '/js/modules/benchmarking.js',
  '/js/modules/investment_analysis.js',
  '/js/modules/financial_reports.js',
  '/js/modules/ml_analytics.js',
  '/js/modules/mobile_app.js',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/badge-72x72.png'
];

// Install event - cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell');
      return cache.addAll(urlsToCache).catch((error) => {
        console.log('Error caching some files:', error);
        // Don't fail installation if some files fail
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip cross-origin requests
  if (!request.url.includes(self.location.origin)) {
    return;
  }

  // API requests - network first, fallback to cache
  if (request.url.includes('/api/') || request.url.includes('script.google.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((response) => {
            return response || new Response('Offline - data unavailable', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
        })
    );
  } else {
    // Static assets - cache first, fallback to network
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(request).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        }).catch(() => {
          // Both cache and network failed
          return new Response('Offline - resource unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/images/icon-192x192.png',
    badge: '/images/badge-72x72.png',
    tag: data.tag || 'propertyHub-notification',
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if PropertyHub is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }

      // If not open, open it
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(
      fetch('/api/sync-offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: new Date().toISOString() })
      }).catch((error) => {
        console.log('Background sync failed:', error);
      })
    );
  }
});

// Periodic background sync (requires PWA support)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-metrics') {
    event.waitUntil(
      fetch('/api/update-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch((error) => {
        console.log('Periodic sync failed:', error);
      })
    );
  }
});
