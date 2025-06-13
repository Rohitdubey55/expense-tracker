// cache on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('v1').then(cache =>
      cache.addAll([
        '/',               // your root
        '/index.html',
        '/style.css',
        '/script.js',
        '/icon-192.png',
        '/icon-512.png'
      ])
    )
  );
});

// serve from cache, fallback to network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request)
    )
  );
});
