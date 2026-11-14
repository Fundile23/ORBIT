/* ORBIT service worker: caches ONLY static app assets and the public exercise list.
   Personal API routes and authentication requests are never cached. */
const CACHE = 'orbit-static-v1';
const EXERCISES = '/api/v1/exercises';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;

  if (path === EXERCISES) {
    // network-first, fall back to cache when offline
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then((r) => r || Response.error())),
    );
    return;
  }

  // Never touch any other API or auth traffic.
  if (path.startsWith('/api') || path.includes('__clerk') || path.includes('/sign-in') || path.includes('/sign-up')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/__app_shell', copy)); }
        return res;
      }).catch(() => caches.match('/__app_shell').then((r) => r || Response.error())),
    );
    return;
  }

  if (/\.(js|css|svg|png|jpg|jpeg|webp|woff2?|ico)$/.test(path)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
  }
});
