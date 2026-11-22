// 상세 스튜디오 Service Worker (v1)
const CACHE_NAME = 'ora-pwa-studio-v1';
const APP_KEY = 'studio';
const PRECACHE_URLS = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('ora-pwa-' + APP_KEY + '-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ora_assets/')) return;
  // For root Kimdaeri SW, never hijack sub-app scopes (/notes/, /erp/, /studio/, /sourcing/, /orawinch/, /strategy/, /apps/)
  if (APP_KEY === 'kimdaeri') {
    if (/^\/(erp|studio|sourcing|orawinch|strategy|notes|apps|workspace|market-radar)(\/|$)/.test(url.pathname)) return;
  }

  // Always network-first so new deployments appear right away; fallback to cache only when offline
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
