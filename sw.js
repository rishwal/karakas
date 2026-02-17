const CACHE_NAME = 'arts-fest-v1';

// 1. Install - Skip waiting so new SW activates immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activate - Clear ALL old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          return caches.delete(cache); // Delete everything
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// 3. Fetch - Always go to network, never serve from cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // If network fails, return a simple offline message
      return new Response('Network error - please check your connection.', {
        status: 503,
        statusText: 'Service Unavailable',
      });
    })
  );
});