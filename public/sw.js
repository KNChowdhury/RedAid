// Roktobondhu service worker: makes the site installable and shows a
// friendly page when there's no connection.
//
// It deliberately does NOT cache the app shell or any data. Donor and
// request data must always come fresh from Supabase, and caching hashed
// bundles in a service worker is a classic source of "stuck on an old
// version" bugs. Push alerts will be added here later.
const OFFLINE_CACHE = 'rb-offline-v1';
const OFFLINE_URL = '/offline.html';
const OFFLINE_ASSETS = [OFFLINE_URL, '/logo-mark.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then(cache =>
      cache.addAll(OFFLINE_ASSETS.map(url => new Request(url, { cache: 'reload' })))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== OFFLINE_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  // The offline page's own logo, served from the cache when offline.
  if (request.method === 'GET' && new URL(request.url).pathname === '/logo-mark.svg') {
    event.respondWith(fetch(request).catch(() => caches.match('/logo-mark.svg')));
    return;
  }
  // Only page navigations otherwise: try the network, fall back to the
  // offline page. JS, CSS and Supabase calls pass through untouched.
  if (request.mode !== 'navigate') return;
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch {
      return (await caches.match(OFFLINE_URL)) || Response.error();
    }
  })());
});
