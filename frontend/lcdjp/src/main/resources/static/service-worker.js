// JusticeLink service worker.
//
// Strategy
//   * Static files (CSS, JS, images)   -> cache-first. Script/style URLs carry ?v=<hash>, so an exact match is always safe.
//   * Page navigations                 -> network-first (8 s timeout), then the cached page / app shell, else /offline.html.
//   * Public API reads (legal orgs...) -> network-first, last good answer kept for offline use.
//   * Every other /api/ call           -> never touched (cases, messages, profiles and tokens are private data
//                                         and must not be stored on a phone that may be shared or confiscated).
//   * APK downloads, /.well-known      -> never touched.
//
// Versioning: change CACHE_VERSION on every deploy (your hash-bump step does this). Old caches are deleted on activate.

const CACHE_VERSION = 'justicelink-geopick01';
const API_CACHE = 'justicelink-api-v1';
const CACHE_PREFIX = 'justicelink-';
const OFFLINE_URL = '/offline.html';
const NAVIGATION_TIMEOUT_MS = 8000;
const API_TIMEOUT_MS = 8000;

// Plain paths. They are the offline fallback for versioned URLs such as /app.js?v=d800147469
const APP_SHELL = [
  '/index.html', OFFLINE_URL,
  '/marketing.css', '/who-we-are.html', '/careers.html', '/contact.html', '/solutions.html',
  '/privacy.html', '/terms.html', '/cookies.html',
  '/theme.css', '/dashboard-part1.css', '/dashboard-part2.css', '/dashboard-part3.css', '/dashboard-part4.css', '/forms.css', '/datePicker.css', '/supportHelp.css', '/maps.css', '/mobile-part1.css', '/mobile-part2.css', '/mobile-part3.css', '/mobile-part4.css', '/tables.css',
  '/theme.js', '/config.js', '/utils.js', '/datePicker.js', '/supportHelp.js', '/notifications.js', '/uganda-geo.js', '/locationPicker.js', '/auth-part1.js', '/auth-part2.js', '/auth-part3.js', '/registration.js',
  '/verification.js', '/citizen.js', '/lawyer.js', '/caseMatching.js', '/messaging-part1.js', '/messaging-part2.js', '/messaging-part3.js', '/lc.js',
  '/dashboard-core.js', '/dashboard-citizen-home.js', '/dashboard-admin-search.js', '/dashboard-mobile-shell.js', '/dashboard-mobile-overrides.js', '/dashboard-mobile-case-tracking.js', '/dashboard-ai-assistant.js', '/dashboard-citizen-desktop.js', '/dashboard-citizen-alerts.js', '/dashboard-verification-and-voice.js', '/accountVerification.js', '/debugPanel.js', '/caseBrowser.js', '/pendingCases.js', '/districtAdmin.js',
  '/systemAdmin.js', '/analytics.js', '/reports.js', '/maps.js', '/app.js', '/machineTranslate.js',
  '/offlineDrafts.js', '/quickExit.js', '/pwa.js',
  '/images/justicelink-icon-192.png',
  '/images/justicelink-icon-512.png',
  '/images/justicelink-icon-maskable-192.png',
  '/images/justicelink-icon-maskable-512.png',
  '/images/justicelink-apple-touch-180.png',
  '/favicon.ico'
];

// Public, non-personal GET endpoints that are safe to keep for offline use.
const PUBLIC_API_PATTERNS = [
  /^\/api\/legal-orgs(\/|$)/,
  /^\/api\/legal-alerts(\/|$)/
];

// Paths the service worker must never intercept.
const BYPASS_PREFIXES = ['/downloads/', '/.well-known/', '/actuator/', '/swagger-ui', '/api-docs'];

function isPublicApi(pathname) {
  return PUBLIC_API_PATTERNS.some((re) => re.test(pathname));
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

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
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_VERSION && name !== API_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  // Range requests (video/audio/large downloads) and partial responses can't be cached safely.
  if (request.headers.has('range')) return;

  const url = new URL(request.url);

  // Only same-origin requests.
  if (url.origin !== self.location.origin) return;
  if (BYPASS_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  // ---- API ---------------------------------------------------------------
  if (url.pathname.startsWith('/api/')) {
    // Only public reads without credentials are ever cached; everything else goes straight to the network.
    if (isPublicApi(url.pathname) && !request.headers.has('authorization')) {
      event.respondWith(networkFirstApi(request));
    }
    return;
  }

  // ---- Page navigations ----------------------------------------------------
  if (request.mode === 'navigate') {
    event.respondWith(
      withTimeout(fetch(request), NAVIGATION_TIMEOUT_MS).catch(() =>
        // Offline or too slow: 1) the exact page if it was precached (About, Careers, ...),
        // 2) the app shell for "/" and extension-less app routes, 3) /offline.html for anything else
        // (for example /download.html, which needs the network to be useful).
        caches.match(request, { ignoreSearch: true }).then((page) => {
          if (page) return page;
          const isShellRoute = url.pathname === '/' || !/\.[a-z0-9]+$/i.test(url.pathname);
          const wanted = isShellRoute ? '/index.html' : OFFLINE_URL;
          return caches.match(wanted).then(
            (hit) => hit || caches.match(OFFLINE_URL).then((offline) => offline || Response.error())
          );
        })
      )
    );
    return;
  }

  // ---- Static files: cache-first --------------------------------------------
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Only keep complete, same-origin, successful answers.
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          // Offline after a version bump: any cached copy of the same file beats an error.
          caches.match(request, { ignoreSearch: true }).then(
            (fallback) => fallback || Response.error()
          )
        );
    })
  );
});

function networkFirstApi(request) {
  return withTimeout(fetch(request), API_TIMEOUT_MS)
    .then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(API_CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() =>
      caches.open(API_CACHE).then((cache) => cache.match(request)).then(
        (cached) => cached || new Response(
          JSON.stringify({ error: 'You are offline and this data has not been saved on your device yet.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
}
