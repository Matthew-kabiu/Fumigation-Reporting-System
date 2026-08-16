const STATIC_CACHE = "fumivanta-static-v2";
const ACCOUNT_CACHE_PREFIX = "fumivanta-field-account-";
const STATIC_ASSETS = ["/manifest.webmanifest", "/icon.svg"];
const clientAccounts = new Map();

function accountCache(userId) {
  return `${ACCOUNT_CACHE_PREFIX}${encodeURIComponent(userId)}`;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const stale = [];
      for (const key of keys) {
        if (key.startsWith("fumivanta-") && key !== STATIC_CACHE && !key.startsWith(ACCOUNT_CACHE_PREFIX)) {
          stale.push(caches.delete(key));
        }
      }
      return Promise.all(stale);
    }),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || typeof message.userId !== "string") return;
  if (message.type === "SET_ACCOUNT") {
    if (event.source?.id) clientAccounts.set(event.source.id, message.userId);
    event.waitUntil(
      fetch("/field")
        .then((response) => response.ok ? caches.open(accountCache(message.userId)).then((cache) => cache.put("/field", response)) : undefined)
        .catch(() => undefined),
    );
  }
  if (message.type === "PURGE_ACCOUNT") {
    for (const [clientId, userId] of clientAccounts) {
      if (userId === message.userId) clientAccounts.delete(clientId);
    }
    event.waitUntil(caches.delete(accountCache(message.userId)));
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
    return;
  }

  const isFieldNavigation = event.request.mode === "navigate" && url.pathname.startsWith("/field");
  if (!isFieldNavigation) return;
  const userId = clientAccounts.get(event.clientId);
  if (!userId) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(accountCache(userId)).then((cache) => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(accountCache(userId));
        return (await cache.match(event.request)) ?? (await cache.match("/field")) ?? Response.error();
      }),
  );
});
