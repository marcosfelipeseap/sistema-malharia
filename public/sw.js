const CACHE_NAME = 'malharias-seap-v1';
const urlsToCache = [
  '/',
  '/css/main.css',
  '/img/logo.png',
  '/img/icone.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});