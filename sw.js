
// SW cache-bust
const SW_VERSION = '1755059588';
self.addEventListener('install', e=>self.skipWaiting());
self.addEventListener('activate', e=>self.clients.claim());
