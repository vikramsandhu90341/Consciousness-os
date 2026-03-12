const CACHE_NAME = "cos-static-v1000";

const STATIC_ASSETS = [
  "./",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// INSTALL
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", event => {

  const url = new URL(event.request.url);

  // NEVER cache API or dynamic content
  if (
    url.pathname.endsWith("index.html") ||
    url.pathname === "/" ||
    url.pathname.includes("api") ||
    url.pathname.includes("rss") ||
    url.pathname.includes("news")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );

});
