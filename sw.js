// 更新後に古いキャッシュが残るときは VERSION の数字を上げて再公開してください。
const VERSION = 'kotobadeck-pwa-v1';
const CORE = [
  './', './index.html', './app.js', './styles.css', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './VocabularySets/%E9%9F%93%E5%9B%BD%E8%AA%9E%E5%8D%98%E8%AA%9E41%E8%AA%9E_%E4%BE%8B%E6%96%87%E4%BB%98%E3%81%8D(1).csv'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('kotobadeck-pwa-') && key !== VERSION).map(key => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      // 公開後の更新を取り込み、オフライン時には保存済みデータを使用する。
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (_) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
