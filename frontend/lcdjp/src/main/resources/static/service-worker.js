










const CACHE_VERSION = 'justicelink-v10';

const APP_SHELL = [
  '/index.html',
  '/theme.css',
  '/dashboard.css',
  '/mobile.css',
  '/theme.js',
  '/config.js',
  '/utils.js',
  '/caseBrowser.js',
  '/app.js',
  '/images/justicelink-icon-192.png',
  '/images/justicelink-icon-512.png',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[sw] failed to precache', url, err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  
  if (url.origin !== self.location.origin) return;

  
  if (url.pathname.startsWith('/api/')) return;

  
  
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then(
          (cached) => cached || Response.error()
        )
      )
    );
    return;
  }

  
  
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => Response.error());
    })
  );
});
