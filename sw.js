const CACHE='tantango-pwa-v2';
const FILES=[
  './','./index.html','./app.js','./styles.css','./manifest.webmanifest',
  './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png',
  './VocabularySets/%E9%9F%93%E5%9B%BD%E8%AA%9E%E5%8D%98%E8%AA%9E41%E8%AA%9E_%E4%BE%8B%E6%96%87%E4%BB%98%E3%81%8D(1).csv'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('tantango-pwa-')&&key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    // network first: 更新があれば取り込む。オフライン時は既存キャッシュを使う。
    try {
      const response=await fetch(request);
      if (response.ok) cache.put(request,response.clone()).catch(()=>{});
      return response;
    } catch(_) {
      const hit=await cache.match(request);
      if(hit) return hit;
      if(request.mode==='navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
