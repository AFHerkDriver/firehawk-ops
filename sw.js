/* Firehawk Ops — service worker.
 * Purpose: let a deployed build announce itself so crews get a one-tap "Reload"
 * instead of removing + re-adding the home-screen PWA.
 *
 * SAFETY DESIGN (this is an airspace tool):
 *  - This worker ONLY touches same-origin page navigations (the HTML shell).
 *  - EVERY API / cross-origin / live-data request (FAA TFR/WFS, LAANC ArcGIS,
 *    NWS/weather, ADS-B, Firebase, Cloudflare, the React CDN) is left completely
 *    alone — it goes straight to the network and is NEVER cached. Live airspace
 *    and weather can therefore never be served stale.
 *  - Navigations are network-first with a cache-bust: an online reload always
 *    pulls the freshest deployed build. Offline falls back to the last shell.
 *
 * DEPLOY RULE: bump CACHE on EVERY deploy (any byte change is enough). If the
 * bytes of this file don't change, the browser won't see a new worker and the
 * Reload button will never appear. Keep this version in step with the app's
 * on-screen version number so you can confirm what's actually running.
 */
const CACHE = 'firehawk-sw-v13';   // <-- BUMP THIS EVERY DEPLOY

self.addEventListener('install', (e) => {
  // Precache the shell for an offline reopen. NO self.skipWaiting() here — the
  // new worker must park in 'waiting' so the USER decides when to swap (Reload).
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])).catch(() => {})
  );
});

// The Reload button posts 'skipWaiting' here to trigger the swap.
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();   // control open pages right after activating
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Leave EVERYTHING alone except same-origin GET navigations. Non-GET, APIs,
  // and every cross-origin request fall through to the network, uncached.
  if (req.method !== 'GET') return;
  let sameOrigin = false;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (_) { return; }
  if (!sameOrigin) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    // Network-first + cache-bust: always try the freshest build from the server;
    // fall back to the cached shell only when offline.
    e.respondWith(
      fetch(req, { cache: 'reload' }).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
  }
  // (all other same-origin GETs use default browser handling — not cached here)
});
