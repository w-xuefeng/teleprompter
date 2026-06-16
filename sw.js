const CACHE_NAME = 'teleprompter-v2';
const ASSETS = [
  './',
  './index.html',
  './remote-control.html',
  './ctrl.html',
  './lucide-loader.js',
  './icon.svg',
  './controller-icon.svg',
  './manifest.json',
  './remote-manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Dynamically cache external resources (like fonts or lucide CDN script)
        const url = new URL(e.request.url);
        if (
          url.origin.includes('unpkg.com') ||
          url.origin.includes('jsdelivr.net') ||
          url.origin.includes('npmmirror.com') ||
          url.origin.includes('googleapis.com') ||
          url.origin.includes('gstatic.com')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }

        return networkResponse;
      }).catch(() => {
        // Offline fallback
      });
    })
  );
});
