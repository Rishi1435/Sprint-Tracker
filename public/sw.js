// Sprint Room service worker
//
// Only ever registered in production (see `ServiceWorkerRegister`): the
// cache-first branch below is safe exclusively for `next build` output, whose
// filenames are content-hashed. Dev chunk URLs are stable while their contents
// change, so caching them pins the browser to old JavaScript and any later
// source change explodes with "X is not a function".
const CACHE_NAME = "sprint-room-v3";
const APP_SHELL = [
  "/",
  "/dashboard",
  "/squad",
  "/insights",
  "/offline",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/badge-72.png",
];

/** Hot-reload and dev-overlay traffic must always go straight to the network. */
function isDevTraffic(url) {
  return (
    url.pathname.startsWith("/__nextjs") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/_next/turbopack-hmr") ||
    url.pathname.includes("hot-update")
  );
}

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for HTML, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isDevTraffic(url)) return;

  // HTML navigations: try network, fall back to cache, then offline page
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/offline")))
    );
    return;
  }

  // Static assets: cache-first, and only for content-hashed or truly static
  // files. A query string means the URL isn't a stable identity, so skip it.
  const cacheable =
    !url.search &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".webmanifest"));

  if (!cacheable) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = { title: "Sprint Room", body: "Time to study!", url: "/dashboard" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
