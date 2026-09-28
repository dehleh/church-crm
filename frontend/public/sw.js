// ChurchOS Service Worker for Web Push & Mobile PWA Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle incoming Web Push notification from ChurchOS
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'ChurchOS Notification', body: event.data.text() };
    }
  }

  const title = data.title || 'ChurchOS Notification';
  const options = {
    body: data.body || 'You have a new church update.',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/favicon.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'churchos-alert',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open & View' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle click on the push notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already an open tab matching origin
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no tab is open, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
