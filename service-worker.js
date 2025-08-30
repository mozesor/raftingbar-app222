
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open('clockapp-v3').then(cache => cache.addAll([
    './',
    './index.html',
    './styles.css',
    './manifest.webmanifest',
    './icon-192.png',
    './icon-512.png',
    './maskable-512.png'
  ])));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)));
});
