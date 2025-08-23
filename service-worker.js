// Enhanced Service Worker for The Unconventional Life
// Version 1.0.0 - Modern PWA Implementation

const CACHE_NAME = 'unconventional-life-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache immediately
const ESSENTIAL_CACHE = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/main.js',
  '/manifest.json',
  '/img/hero-640.jpg',
  '/img/favicon.svg',
  OFFLINE_URL
];

// Resources to cache on first visit
const EXTENDED_CACHE = [
  '/img/feature-1.jpg',
  '/img/feature-2.jpg', 
  '/img/feature-3.jpg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Dynamic cache patterns
const CACHE_STRATEGIES = {
  images: {
    pattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
    strategy: 'cache-first',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxItems: 50
  },
  fonts: {
    pattern: /\.(?:woff|woff2|ttf|otf)$/i,
    strategy: 'cache-first', 
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxItems: 20
  },
  api: {
    pattern: /\/api\//,
    strategy: 'network-first',
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxItems: 100
  },
  pages: {
    pattern: /\.(?:html?)$/i,
    strategy: 'network-first',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    maxItems: 20
  }
};

// Install Event - Cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME),
      self.skipWaiting()
    ]).then(([cache]) => {
      console.log('[SW] Caching essential resources');
      return cache.addAll(ESSENTIAL_CACHE);
    }).then(() => {
      console.log('[SW] Essential resources cached successfully');
    }).catch(error => {
      console.error('[SW] Failed to cache essential resources:', error);
    })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('unconventional-life-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Cache extended resources in background
      cacheExtendedResources()
    ]).then(() => {
      console.log('[SW] Service worker activated successfully');
    })
  );
});

// Fetch Event - Handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (url.origin === location.origin) {
    // Same origin requests
    event.respondWith(handleSameOriginRequest(request));
  } else {
    // Cross-origin requests (fonts, images, etc.)
    event.respondWith(handleCrossOriginRequest(request));
  }
});

// Handle same-origin requests
async function handleSameOriginRequest(request) {
  const url = new URL(request.url);

  // Handle root and HTML pages
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    return handlePageRequest(request);
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request);
  }

  // Handle static assets
  return handleStaticAssetRequest(request);
}

// Handle cross-origin requests
async function handleCrossOriginRequest(request) {
  const strategy = getCacheStrategy(request.url);
  return executeStrategy(request, strategy);
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Final fallback to offline page
    if (request.destination === 'document') {
      return caches.match(OFFLINE_URL);
    }

    throw error;
  }
}

// Handle API requests
async function handleApiRequest(request) {
  const strategy = CACHE_STRATEGIES.api;
  return executeStrategy(request, strategy);
}

// Handle static assets
async function handleStaticAssetRequest(request) {
  const strategy = getCacheStrategy(request.url);
  return executeStrategy(request, strategy);
}

// Get cache strategy for URL
function getCacheStrategy(url) {
  for (const [type, config] of Object.entries(CACHE_STRATEGIES)) {
    if (config.pattern.test(url)) {
      return config;
    }
  }

  // Default strategy
  return { strategy: 'network-first', maxAge: 24 * 60 * 60 * 1000 };
}

// Execute caching strategy
async function executeStrategy(request, strategy) {
  switch (strategy.strategy) {
    case 'cache-first':
      return cacheFirst(request, strategy);
    case 'network-first':
      return networkFirst(request, strategy);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(request, strategy);
    default:
      return networkFirst(request, strategy);
  }
}

// Cache-first strategy
async function cacheFirst(request, strategy) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Check if cache is still valid
    const cacheTime = await getCacheTimestamp(request);
    if (cacheTime && (Date.now() - cacheTime < strategy.maxAge)) {
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cacheResponse(request, networkResponse.clone(), strategy);
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network failed in cache-first:', error);
  }

  return cachedResponse || new Response('Not found', { status: 404 });
}

// Network-first strategy  
async function networkFirst(request, strategy) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cacheResponse(request, networkResponse.clone(), strategy);
      return networkResponse;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed in network-first:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, strategy) {
  const cachedResponse = await caches.match(request);

  // Always attempt network request in background
  const networkPromise = fetch(request).then(response => {
    if (response.ok) {
      cacheResponse(request, response.clone(), strategy);
    }
    return response;
  }).catch(() => null);

  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Wait for network if no cache
  return networkPromise;
}

// Cache response with metadata
async function cacheResponse(request, response, strategy) {
  const cache = await caches.open(CACHE_NAME);

  // Store timestamp for cache validation
  const responseWithTimestamp = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      'sw-cache-timestamp': Date.now().toString()
    }
  });

  await cache.put(request, responseWithTimestamp);

  // Clean up old entries if needed
  if (strategy.maxItems) {
    await cleanupCache(cache, strategy.maxItems);
  }
}

// Get cache timestamp
async function getCacheTimestamp(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    const timestamp = cachedResponse.headers.get('sw-cache-timestamp');
    return timestamp ? parseInt(timestamp) : null;
  }
  return null;
}

// Clean up old cache entries
async function cleanupCache(cache, maxItems) {
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const keysToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

// Cache extended resources in background
async function cacheExtendedResources() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(EXTENDED_CACHE);
    console.log('[SW] Extended resources cached');
  } catch (error) {
    console.log('[SW] Failed to cache extended resources:', error);
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(syncFailedRequests());
  }
});

// Sync failed requests
async function syncFailedRequests() {
  // Implement background sync logic here
  console.log('[SW] Syncing failed requests...');
}

// Push notification support
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New content available!',
    icon: '/img/icons/icon-192x192.png',
    badge: '/img/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Content',
        icon: '/img/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/img/icons/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('The Unconventional Life', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    console.log('[SW] Periodic sync triggered');
    event.waitUntil(syncContent());
  }
});

// Sync content in background
async function syncContent() {
  try {
    // Implement content synchronization logic
    console.log('[SW] Syncing content...');
  } catch (error) {
    console.log('[SW] Content sync failed:', error);
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker loaded successfully');