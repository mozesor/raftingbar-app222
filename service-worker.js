
const CACHE = "rb-cache-v1";
const ASSETS = [
  "./", "./index.html", "./app.js", "./app.css", "./config.js",
  "./icons/icon-192.png", "./icons/icon-512.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener("fetch", (e) => {
  const url = e.request.url;
  if (url.includes("script.google.com/macros")) return; // don't cache API
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
    }).catch(()=>hit))
  );
});
