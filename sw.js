/* v8: GitHub Actionsが生成するindex.jsonにより同梱CSVを動的にキャッシュします。 */
const CACHE = 'tantango-pwa-v8';
const CORE = [
  './', './index.html', './app.js?v=8', './styles.css?v=8',
  './manifest.webmanifest', './icons/icon-192.png',
  './icons/icon-512.png', './icons/apple-touch-icon.png',
  './VocabularySets/index.json'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // オフライン初回起動でも全セットを使えるよう、CSVを事前にキャッシュ。
    try {
      const index = await (await cache.match('./VocabularySets/index.json')).json();
      const names = (index.files || []).map(item => typeof item === 'string' ? item : item.name)
        .filter(name => typeof name === 'string' && /^[^/\\]+\.csv$/i.test(name));
      await Promise.allSettled(names.map(name => cache.add(`./VocabularySets/${encodeURIComponent(name)}`)));
    } catch (error) {
      console.warn('CSV pre-cache failed:', error);
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key =>
      (key.startsWith('tantango-pwa-') || key.startsWith('kotobadeck-pwa-')) && key !== CACHE
    ).map(key => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
