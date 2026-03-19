// ─── Consciousness OS Service Worker ───────────────────────────────────────
// v8.0.1 — Network-first HTML, cache-first static assets, never touch API/RSS
// IMPORTANT: Bump CACHE_NAME on every deploy to invalidate stale cache

const CACHE_NAME = "cos-static-v8-0-1";

const STATIC_ASSETS = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// ── INSTALL: cache only static icons/manifest (NOT index.html) ─────────────
self.addEventListener("install", event => {
  self.skipWaiting(); // activate immediately without waiting for old SW to die
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[COS SW] Static asset cache failed (non-fatal):', err.message);
      });
    })
  );
});

// ── ACTIVATE: delete ALL old caches ────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[COS SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim()) // take control of all open tabs immediately
  );
});

// ── FETCH: routing strategy ─────────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // ── 1. ALWAYS network-first for HTML (navigation requests) ──────────────
  // This is the PRIMARY fix: never serve stale index.html from cache
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .catch(() => {
          // Offline fallback: serve cached version only if network totally fails
          return caches.match("./index.html") || new Response(
            "<h2>Consciousness OS — Offline</h2><p>Reconnect to load the app.</p>",
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // ── 2. NEVER cache API, Firebase, RSS, Groq, Worker calls ───────────────
  const noCacheDomains = [
    "firebaseapp.com",
    "googleapis.com",
    "gstatic.com",
    "rss2json.com",
    "allorigins.win",
    "tg.i-c-a.su",
    "workers.dev",
    "anthropic.com",
    "groq.com",
    "openai.com",
    "generativelanguage.googleapis.com"
  ];
  if (noCacheDomains.some(d => url.hostname.includes(d))) {
    event.respondWith(fetch(req));
    return;
  }

  // ── 3. NEVER cache API paths ─────────────────────────────────────────────
  if (
    url.pathname.includes("/api") ||
    url.pathname.includes("/rss") ||
    url.pathname.includes("/auth") ||
    url.pathname.includes("/firestore") ||
    req.method !== "GET"
  ) {
    event.respondWith(fetch(req));
    return;
  }

  // ── 4. Cache-first for static assets (icons, images, fonts) ─────────────
  if (
    req.destination === "image" ||
    req.destination === "style" ||
    req.destination === "font" ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".json") && url.pathname.includes("manifest")
  ) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return response;
        }).catch(() => cached); // return stale if network fails
      })
    );
    return;
  }

  // ── 5. Scripts: network-first with cache fallback ────────────────────────
  // JS files from same origin: try network first, fall back to cache
  if (req.destination === "script" && url.origin === self.location.origin) {
    event.respondWith(
      fetch(req, { cache: "no-store" }).catch(() => caches.match(req))
    );
    return;
  }

  // ── 6. Everything else: just fetch ──────────────────────────────────────
  event.respondWith(fetch(req));
});
