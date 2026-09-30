const CACHE_NAME = 'malharias-seap-v2';

// Retiramos o '/' daqui. Vamos guardar apenas os ficheiros estáticos que nunca mudam.
const urlsToCache = [
  '/css/main.css',
  '/img/logo.png',
  '/img/icone.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  // Força o novo service worker a assumir o controlo imediatamente
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  // Limpa caches antigos (v1) quando o v2 assume
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Ignora requisições que não sejam GET (como POST de formulários, logins, etc)
  if (event.request.method !== 'GET') return;

  // Estratégia "Network First" (Tenta a internet primeiro, se falhar, tenta o cache)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se a resposta for válida, também podemos guardá-la no cache para uso offline futuro
        return response;
      })
      .catch(() => {
        // Se a internet falhar (offline), tenta procurar no cache
        return caches.match(event.request);
      })
  );
});