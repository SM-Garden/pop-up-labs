// 앱을 홈 화면에서 빨리 열고, 인터넷이 끊겨도 총무 혼자 쓰는 화면은 열리게 해 주는 서비스 워커예요.
// - 이 앱 자신의 파일만 다뤄요. Firebase, AI, 짧은 링크 같은 다른 주소로 가는 요청은 건드리지 않아요.
// - 화면(HTML)은 항상 인터넷에서 새로 받아 오고, 실패할 때만 저장해 둔 것을 써요. 그래서 고친 내용이 바로 반영돼요.
const CACHE = 'cafe-order-v2';
const FILES = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cafe-order-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // 앱 첫 화면이 아닌 페이지(통계 페이지 등)는 건드리지 않아요
  const isApp = url.pathname === new URL('./', location).pathname || url.pathname.endsWith('/index.html');
  if (req.mode === 'navigate' && !isApp) return;
  if (req.mode === 'navigate') {
    // 화면: 인터넷 먼저, 안 되면 저장해 둔 화면 (주소 뒤 ?r=... 같은 값은 무시하고 찾아요)
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); }
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // 아이콘 같은 나머지 파일: 저장해 둔 것을 먼저 쓰고, 뒤에서 새로 받아 둬요
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
