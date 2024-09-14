self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('pwa-cache').then(cache => {
            return cache.addAll([
                '/style.css',
                '/manifest.json'
            ]);
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
