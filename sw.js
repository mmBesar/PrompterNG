// Cache version — bump this to force cache refresh on all clients
var cacheName = 'prompterng-v1.0.0';

// During install, cache all static assets
self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(cacheName).then(function(cache) {
            return cache.addAll([
                './',
                './index.html',
                './remote.html',
                './assets/css/style.css',
                './assets/css/remote.css',
                './assets/css/font-awesome.min.css',
                './assets/css/jquery-ui.min.css',
                './assets/js/plugins.js',
                './assets/js/script.js',
                './assets/js/remote.js',
                './assets/js/marked.min.js',
                './assets/js/marked-bidi.min.js',
                './assets/font/noto-sans-arabic-arabic-400-normal.woff2',
                './assets/font/noto-sans-arabic-latin-400-normal.woff2',
                './assets/font/noto-sans-arabic-arabic-700-normal.woff2',
                './assets/font/noto-sans-arabic-latin-700-normal.woff2',
                './assets/font/fontawesome-webfont.woff'
            ]).then(function() {
                self.skipWaiting();
            });
        })
    );
});

// When a cached version is activated, clean up old caches
self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(name) {
                    return name !== cacheName;
                }).map(function(name) {
                    return caches.delete(name);
                })
            );
        })
    );
});

// Serve from cache, fall back to network
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            if (response) {
                return response;
            }
            return fetch(event.request);
        })
    );
});