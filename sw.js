const CACHE_NAME = 'weather-app-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './favicon.ico',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // For navigation (page loads), try network first then cache fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        // update cache with latest index.html
        try {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
        } catch (e) { /* ignore */ }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // For other requests, try cache first then network
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      // try network, but handle failures gracefully
      return fetch(req).catch(() => {
        // if network fetch fails, try to return a cached default for images/icons
        if (req.destination === 'image') return caches.match('./icons/icon-192.png');
        return caches.match('./index.html');
      });
    })
  );
});
