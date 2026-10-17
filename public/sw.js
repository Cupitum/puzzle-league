/* Puzzle League service worker v2: static shell cache + private one-time Share Target intake.
   Do not cache API/Auth traffic, raw share text, credentials or private rankings. */
const STATIC_CACHE = 'puzzle-league-static-v2';
const DB_NAME = 'puzzle-league-share-intake';
const STORE_NAME = 'inbound';
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE && key.startsWith('puzzle-league-static-')).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
function openInbox() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Share inbox storage unavailable'));
  });
}
async function saveIncoming(text) {
  const db = await openInbox();
  try {
    await new Promise((resolve, reject) => {
      const txn = db.transaction(STORE_NAME, 'readwrite');
      const store = txn.objectStore(STORE_NAME);
      store.put({ id: crypto.randomUUID(), receivedAt: Date.now(), text });
      txn.oncomplete = resolve;
      txn.onerror = () => reject(new Error('Share intake failed'));
    });
  } finally { db.close(); }
}
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/share-target' && request.method === 'POST') {
    event.respondWith((async () => {
      try {
        const form = await request.formData();
        const sharedText = form.get('text');
        // Preserve the original puzzle share exactly when Android supplied text.
        // Do not append title/URL trailers that may invalidate a real game parser.
        const fallback = [form.get('title'), form.get('url')].filter(v => typeof v === 'string' && v.trim()).join('\n');
        const text = (typeof sharedText === 'string' && sharedText.trim() ? sharedText : fallback).slice(0, 16000);
        if (text.trim()) {
          await saveIncoming(text);
          // An already-open installed PWA may not remount after Android sharing.
          // Notify every same-origin window only AFTER IndexedDB commits the share.
          // Never include raw text in the message, redirect URL, or caches.
          try {
            const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of windows) client.postMessage({ type: 'puzzle-league-share-received' });
          } catch { /* redirect/startup intake still works without notifications */ }
        }
        return Response.redirect(new URL(text.trim() ? '/?incoming=1' : '/?incoming=empty', self.location.origin).href, 303);
      } catch { return Response.redirect(new URL('/?incoming=error', self.location.origin).href, 303); }
    })());
    return;
  }
  if (request.method !== 'GET') return;
  // Auth, Edge, and REST calls are cross-origin and are deliberately network-only.
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/rest/') || url.pathname.startsWith('/functions/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.open(STATIC_CACHE)).match('/index.html')));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(caches.open(STATIC_CACHE).then(async cache => {
      const match = await cache.match(request);
      if (match) return match;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    }));
  }
});
