const CACHE_NAME = 'splitsight-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Don't call self.skipWaiting() here — let the app control
  // when to activate via the update banner and 'skipWaiting' message
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache for app shell
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and API calls
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API proxy requests - always go to network
  if (url.pathname.startsWith('/splitwise-api')) {
    return;
  }

  // For navigation requests, use network-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the new version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // For static assets, use stale-while-revalidate
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            cache.put(request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// ─── Push Notification Handlers ─────────────────────────────────────────────

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || '',
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'expensesight-notification',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'ExpenseSight', options)
    );
  } catch (err) {
    console.error('Error handling push notification:', err);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Determine target URL based on notification type
  switch (data.type) {
    case 'daily-summary':
    case 'weekly-checkin':
      targetUrl = '/?app=expensesight&tab=insights';
      break;
    case 'budget-warning':
      targetUrl = '/?app=expensesight&tab=budget';
      break;
    case 'bill-reminder':
      targetUrl = '/?app=expensesight&tab=bills';
      break;
    case 'goal-progress':
      targetUrl = '/?app=expensesight&tab=goals';
      break;
    default:
      targetUrl = '/?app=expensesight';
  }

  // Handle action clicks
  if (event.action) {
    switch (event.action) {
      case 'view-details':
        // Already handled above
        break;
      case 'dismiss':
        return; // Just close the notification
      case 'mark-paid':
        // Could send message to app to mark bill as paid
        targetUrl = '/?app=expensesight&tab=bills&action=mark-paid&id=' + data.billId;
        break;
      default:
        break;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          return client.focus().then(() => {
            return client.navigate(targetUrl);
          });
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  // Could track dismissed notifications here
  console.log('Notification closed:', event.notification.tag);
});
