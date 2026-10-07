const CACHE = "winterpost-v5";
const FILES = [
  "./",
  "./index.html",
  "./src/style.css",
  "./src/app.js",
  "./src/core.js",
  "./src/admin-auth.js",
  "./example-calendar.json",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("winterpost-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  if (
    e.request.method !== "GET" ||
    new URL(e.request.url).origin !== self.location.origin
  )
    return;
  e.respondWith(
    caches
      .match(e.request)
      .then(
        (cached) =>
          cached ||
          fetch(e.request).catch(() =>
            e.request.mode === "navigate"
              ? caches.match("./index.html")
              : Response.error(),
          ),
      ),
  );
});
