// PWA Service Worker - Cache static assets
const CACHE_NAME = 'levellines-v1';
const urlsToCache = [
  '/',
  '/styles.css',
  '/asset-manifest.js',
  '/brand.js',
  '/runtime.js',
  '/site.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
