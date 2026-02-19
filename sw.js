const CACHE_NAME = 'arts-fest-v2'; // ← bump this on every deploy

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './schedule.html',
  './leaderboard.html',
  './result.html',
  './admin.html',
  './index.js',
  './admin.js',
  './schedule.json',
  './program_wise_participant_list.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined'
];

// Treat these as "always fresh" — network first
const NETWORK_FIRST = ['.html', '.js', '.json'];

// ── 1. INSTALL ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // activate immediately, don't wait for old SW to die
});

// ── 2. ACTIVATE ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME) // delete every old cache
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim(); // take control of all open tabs immediately
});

// ── 3. FETCH ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Add cache-busting for API calls
  self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // JSONBin + any external API → ALWAYS network only
    if (url.hostname.includes('jsonbin.io') ||
      url.hostname.includes('api.')) {
      event.respondWith(
        fetch(event.request, { cache: 'no-store' }) // ← force fresh
      );
      return;
    }

    // ── JSONBin API → Network only, never cache ──────────────────────────────
    if (url.hostname.includes('jsonbin.io')) {
      event.respondWith(fetch(event.request));
      return;
    }

    // ── External CDN (Bootstrap, Fonts) → Cache first (they never change) ────
    if (!url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
      event.respondWith(
        caches.match(event.request).then(
          (cached) => cached || fetch(event.request)
        )
      );
      return;
    }

    // ── Local HTML / JS / JSON → Network first, cache as fallback ────────────
    const isNetworkFirst = NETWORK_FIRST.some((ext) =>
      url.pathname.endsWith(ext) || url.pathname === '/' || url.pathname.endsWith('/')
    );

    if (isNetworkFirst) {
      event.respondWith(
        fetch(event.request)
          .then((networkResponse) => {
            // Update cache with the fresh version
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return networkResponse;
          })
          .catch(() => {
            console.log('[SW] Offline – serving from cache:', url.pathname);
            return caches.match(event.request);
          })
      );
      return;
    }

    // ── Everything else → Cache first, network fallback ──────────────────────
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached || fetch(event.request)
      )
    );
  });