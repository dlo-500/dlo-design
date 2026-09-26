// DLO Kupwara — Service Worker v2.1 (improved offline + broader precache)
const STATIC_CACHE = 'dlo-kupwara-static-v8';
const DATA_CACHE   = 'dlo-kupwara-data-v6';

const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './404.html',
  './manifest.json',
  './config.js',
  './common.js',
  './styles.css',
  './menu.css',
  './styles-performance.css',
  './search-filter-cases.html',
  './analytics.html',
  './statistics.html',
  './court-wise-distribution.html',
  './areas-of-practice.html',
  './our-officials.html',
  './about-office.html',
  './contact.html',
  './public-enquiries.html',
  './latest-updates.html',
  './hearings.html',
  './causelist.html',
  './history.html',
  './performance.html',
  './operator.html',
  './logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      cache.addAll(STATIC_ASSETS.map(u => new Request(u, { cache: 'reload' }))).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function sheetCacheKey(url) {
  const sheet = url.searchParams.get('sheet') || 'default';
  return new Request(self.location.origin + '/__sheet-cache__/' + encodeURIComponent(sheet));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.hostname.includes('cloudflareinsights.com')) {
    event.respondWith(fetch(req).catch(() => new Response('', { status: 204 })));
    return;
  }

  if (url.hostname === 'docs.google.com' && url.pathname.includes('/gviz/tq')) {
    const cacheKey = sheetCacheKey(url);
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(DATA_CACHE).then(c => c.put(cacheKey, clone));
          }
          return res;
        })
        .catch(() =>
          caches.open(DATA_CACHE).then(c =>
            c.match(cacheKey).then(cached =>
              cached || new Response(JSON.stringify({ error: 'offline' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              })
            )
          )
        )
    );
    return;
  }

  if (url.hostname.endsWith('supabase.co')) {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then(c => c || new Response('{"error":"offline"}', {
          status: 503, headers: { 'Content-Type': 'application/json' }
        }))
      )
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 404) {
            return caches.match('./404.html').then(c => c || res);
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(c =>
            c || caches.match('./offline.html').then(o => o || caches.match('./index.html'))
          )
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.ok && req.method === 'GET') {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
