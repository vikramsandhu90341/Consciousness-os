const CACHE_NAME = "cos-static-v1001";

const STATIC_ASSETS = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {

  const req = event.request;
  const url = new URL(req.url);

  // NEVER touch HTML
  if (req.destination === "document") {
    event.respondWith(fetch(req));
    return;
  }

  // NEVER touch APIs
  if (url.pathname.includes("api") || url.pathname.includes("rss")) {
    event.respondWith(fetch(req));
    return;
  }

  // Cache static assets only
  if (req.destination === "image" || req.destination === "style" || req.destination === "script") {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
  }

});
