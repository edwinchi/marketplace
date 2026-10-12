// MarketitNow service worker -- deliberately minimal. Registered by
// components/pwa/service-worker-register.tsx (production only).
//
// What it does:
// - Page navigations: always network. Only when the network fails outright (offline) does it
//   answer with the precached /offline.html. Pages are never cached: they're per-user (signed-in
//   nav, messages, prices in the viewer's currency), so a cached page could show one account's
//   data to another session or a stale price.
// - /_next/static/*: cache-first. Those filenames are content-hashed and immutable, so a cached
//   copy can never be stale, and it makes repeat loads on slow mobile networks much faster.
// - Everything else (API routes, Supabase, Stripe, images, server actions): untouched, straight
//   to the network, exactly as without a service worker.
//
// Bump VERSION when offline.html or the precache list changes; activate() drops old caches.
const VERSION = "v1";
const PRECACHE = `precache-${VERSION}`;
const STATIC = `static-${VERSION}`;
const PRECACHE_URLS = ["/offline.html", "/icon-192.png", "/logo-sm.png?v=4"];
const MAX_STATIC_ENTRIES = 250;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PRECACHE && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
          // Every deploy mints new hashed chunk names, so without a cap this cache only ever
          // grows. keys() is in insertion order, so trimming from the front drops the oldest.
          const keys = await cache.keys();
          await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES)).map((k) => cache.delete(k)));
        }
        return response;
      }),
    );
    return;
  }

  if (PRECACHE_URLS.includes(url.pathname + url.search)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
