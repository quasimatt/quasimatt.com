// Cache version and files to cache
const CACHE_NAME = 'pwa-cache-v1';
const urlsToCache = [
  '/style.css',
  '/manifest.json',
  '/',
];

// Install event - cache the specified resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
    // Take control of the page immediately after installation
    self.skipWaiting();
});

// Fetch event - use network-first strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
        .then(response => {
            // If the network request is successful, update the cache with the fresh response
            return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, response.clone()); // Cache the latest version
                return response; // Return the fresh response to the user
            });
        })
        .catch(() => {
            // If the network request fails, fall back to the cache
            return caches.match(event.request);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME]; // Only keep the latest cache
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName); // Delete outdated caches
                    }
                })
            );
        })
    );
    // Ensure the service worker takes control immediately
    return self.clients.claim();
});

// Push notification event listener
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'New Notification';
    const options = {
        body: data.body || 'You have a new message!',
        icon: data.icon || '/icon.png',
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click event listener
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(clientList => {
            const client = clientList.find(c => c.url === urlToOpen && 'focus' in c);
            if (client) {
                return client.focus();
            } else if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
