/* Service worker do Zênite: push (Onda 7) + cache/offline (PWA Fase 2). */
const VERSION = "v1";
const CACHE = `zenite-${VERSION}`;
const PRECACHE = ["/offline.html", "/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/logo.png" ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // cross-origin (Supabase/Google) vai direto pra rede
  if (url.pathname.startsWith("/api/") || url.pathname.includes("hot-update")) return; // nunca cachear

  // Navegações: rede primeiro; sem conexão, cai na página offline
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Assets estáticos (hasheados): stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

/* ── Push (mantido da Onda 7) ─────────────────────────── */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || "Zênite";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/logo.png",
      badge: "/logo.png",
      tag: data.tag,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const hit = wins.find((w) => w.url.endsWith(url));
      if (hit) return hit.focus();
      return self.clients.openWindow(url);
    })
  );
});
