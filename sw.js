// Service worker : l'app fonctionne hors ligne (sous‑sol de la salle, réseau faible).
// Fichiers de l'app : réponse immédiate depuis le cache, mise à jour en arrière‑plan.
// Changer VERSION à chaque déploiement force le renouvellement du cache.
const VERSION = 'wl-v13';
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/app.js', './js/store.js', './js/seed.js', './js/pictos.js', './js/cloud.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' contourne le cache HTTP pour que tous les fichiers viennent de la même version.
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Polices et SDK Firebase : servis depuis le cache (fichiers versionnés), pour démarrer hors ligne
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
    || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'));
  if (url.origin !== location.origin && !isFont) return;

  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const key = req.mode === 'navigate' ? './index.html' : req;
      const cached = await cache.match(key);
      const network = (isFont ? fetch(req) : fetch(req.url, { cache: 'no-cache' }))
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(key, res.clone());
          return res;
        })
        .catch(() => cached);
      if (isFont) return cached || network;
      e.waitUntil(network.then(() => {}, () => {}));
      return cached || network;
    }),
  );
});
