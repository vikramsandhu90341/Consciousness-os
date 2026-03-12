const CACHE_NAME = "cos-v1001";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Install
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate + clear old caches
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

// Fetch strategy
self.addEventListener("fetch", event => {

  const url = new URL(event.request.url);

  // Never cache API requests
  if (
    url.pathname.includes("/api") ||
    url.hostname.includes("workers.dev") ||
    url.hostname.includes("newsapi") ||
    url.hostname.includes("firebase")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for static files
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
      );
    })
  );
});
