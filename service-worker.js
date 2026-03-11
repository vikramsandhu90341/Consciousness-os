const CACHE = "cos-v2";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("fetch", e => {

  if (e.request.url.includes("api")) {
    return;
  }

  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request)
    )
  );

});
