import React from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { resolveBrandSlugFromSearch, resolveBrandSlugFromPathname } from './hooks/brandSlug';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

// Add error boundary for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Resolve the active brand for the Service Worker's offline cache name. The SW file is
// static, so it can't read VITE_BRAND_SLUG or the app's runtime brand state — we pass the
// slug as a query param on the registration URL, and the SW reads it from its own
// location.search to build a brand-scoped cache name (matching getOfflineCacheName() in
// lib/offline.ts). Precedence mirrors resolveBrandSlug() in useBrandConfig.ts for the
// pieces that are deterministic at load time (search > env > pathname > 'kaboo').
//
// KNOWN LIMITATION (dev/test only): the white-label PREVIEW override (localStorage) and a
// mid-session brand switch WITHOUT a reload are not reflected here — the SW keeps the cache
// name it registered with until the next reload. In production each brand is a separate
// domain, so same-origin isolation makes this moot; on the shared GitHub Pages dev deploy a
// reload re-registers with the correct brand. Not worth SW-side postMessage state tracking.
const resolveSwBrandSlug = (): string =>
  resolveBrandSlugFromSearch(window.location.search)
  ?? (import.meta.env.VITE_BRAND_SLUG as string | undefined)
  ?? resolveBrandSlugFromPathname(window.location.pathname)
  ?? 'kaboo';

// Register Service Worker for offline media interception
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `/sw.js?brand=${encodeURIComponent(resolveSwBrandSlug())}`;
    navigator.serviceWorker.register(swUrl, { scope: '/' }).catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  });
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
