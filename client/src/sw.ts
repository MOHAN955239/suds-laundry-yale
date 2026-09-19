const CACHE = 'suds-v1';

self.addEventListener('install', (e: any) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['/'])));
});

self.addEventListener('fetch', (e: any) => {
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) return;
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});

export {};
