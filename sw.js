// ===== PLANEJA CONCURSO - Service Worker (PWA) =====
// ALWAYS bump this version on deploy to trigger updates
const SW_VERSION = '1.2.1';
const CACHE_NAME = 'planeja-concurso-v3-' + SW_VERSION;
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './firebase-config.js',
    './app-core.js',
    './app-ciclos.js',
    './app-simulados.js',
    './app-bisus.js',
    './app-edital.js',
    './app-admin.js',
    './app-qg.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install: cache all local assets
self.addEventListener('install', (event) => {
    console.log('⚙️ SW: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 SW: Caching assets');
            return cache.addAll(ASSETS);
        }).then(() => {
            console.log('✅ SW: Install complete');
            return self.skipWaiting();
        })
    );
});

// Activate: clean old caches and claim clients
self.addEventListener('activate', (event) => {
    console.log('⚡ SW: Activating...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => {
                        console.log('🗑️ SW: Removing old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => {
            console.log('✅ SW: Activated, claiming clients');
            return self.clients.claim();
        })
    );
});

// Fetch: cache-first for local assets, network-first for CDN
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-http/https requests (chrome-extension, etc.)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return;
    }

    // Skip Firebase/Firestore/Storage API calls (don't cache)
    if (url.hostname.includes('firestore') ||
        url.hostname.includes('firebasestorage') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('identitytoolkit')) {
        return; // let browser handle normally
    }

    // CDN assets: network-first with cache fallback
    if (url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('gstatic.com')) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                }).catch(() => {
                    console.log('📴 SW: Offline, serving from cache:', url.pathname);
                    return cached;
                });
            })
        );
        return;
    }

    // Local assets: cache-first, fallback to network
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                // Return cached, but update in background
                const fetchPromise = fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, response.clone());
                        });
                    }
                    return response;
                }).catch(() => {});
                return cached;
            }
            return fetch(event.request).then((response) => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            });
        })
    );
});

// Listen for update message from page
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        console.log('🔄 SW: Skip waiting and activate');
        self.skipWaiting();
    }
});
