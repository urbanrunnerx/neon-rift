'use strict';
// Scoped cache name avoids touching other GitHub Pages apps on the same origin.
const PREFIX = 'neon-rift:' + new URL(self.registration.scope).pathname + ':';
const CACHE = PREFIX + 'web-0.2.0';
const FILES = ['./', './index.html', './install.html', './style.css', './app.js', './simulation.js', './pwa.js', './manifest.webmanifest', './shaders/fullscreen.vert', './shaders/rift.frag', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './renderer/preview-000.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    // Ignore only the install-source query; this app has no data/API requests.
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) { if (event.request.mode === 'navigate') return await cache.match('./index.html'); throw error; }
  }));
});
