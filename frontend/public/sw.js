/* Gym Workout Tracker service worker: lets the installed app open offline.
 * - Pages (index.html): network first, cached copy only when offline -> updates always arrive when online.
 * - Built app code under /_expo/static/ (file names change every build): cache first.
 * - Other same-origin files (icons, fonts, images): serve cached, refresh in background.
 * Workout data lives in the browser's localStorage, never in this cache.
 */
const CACHE = "gym-pwa-v5";
const SHELL = ["/", "/manifest.json", "/apple-touch-icon.png", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(SHELL);
      // Also cache the app bundle the current index.html points at
      try {
        const html = await (await cache.match("/")).text();
        const scripts = Array.from(html.matchAll(/src="(\/_expo\/static\/[^"]+)"/g)).map((m) => m[1]);
        await cache.addAll(scripts);
      } catch (e) {}
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "cache-urls" && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(CACHE).then((cache) =>
        Promise.all(
          data.urls
            .filter((u) => typeof u === "string" && u.startsWith(self.location.origin))
            .map((u) => cache.match(u).then((hit) => hit || cache.add(u).catch(() => {})))
        )
      )
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // App pages: always try the network so new versions arrive; fall back to the cached app shell offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/", copy));
          }
          return res;
        })
        .catch(() => caches.match("/").then((hit) => hit || Response.error()))
    );
    return;
  }

  // Hashed build files never change: cache first
  if (url.pathname.startsWith("/_expo/static/")) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
      )
    );
    return;
  }

  // Everything else on this site: cached copy right away, refreshed in the background
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || net;
    })
  );
});
