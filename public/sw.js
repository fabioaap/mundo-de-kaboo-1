/**
 * Kaboo Offline Service Worker
 *
 * Intercepts requests for cached media files (audio, video, PDF)
 * and serves them from kaboo-offline-v1 when offline.
 * Falls back to network for everything else.
 */

const CACHE_NAME = 'kaboo-offline-v1';

// Only intercept Supabase storage requests (where media is hosted)
const MEDIA_ORIGIN = 'supabase.co';

self.addEventListener('install', (event) => {
  // Take control immediately without waiting for old SW to be discarded
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests to Supabase storage (media files)
  if (request.method !== 'GET' || !url.hostname.includes(MEDIA_ORIGIN)) {
    return;
  }

  // Only intercept storage paths (not auth, realtime, etc.)
  if (!url.pathname.startsWith('/storage/')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Normalize URL: strip hash fragment (matches how offline.ts caches keys)
      const normalizedUrl = new URL(request.url);
      normalizedUrl.hash = '';
      const cacheKey = normalizedUrl.toString();

      // Check cache first
      const cached = await cache.match(cacheKey);
      if (cached) {
        return cached;
      }

      // Not in cache — try network
      try {
        const response = await fetch(request);
        return response;
      } catch {
        // Offline and not cached — return 503
        return new Response(
          JSON.stringify({ error: 'Conteúdo não disponível offline' }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    })
  );
});
