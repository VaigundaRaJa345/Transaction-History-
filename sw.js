const CACHE = 'pocket-ledger-v2';
const assets = ['./', './index.html', './styles.css', './cloud-sync.js', './app.js'];
const optionalAssets = ['./cloud-config.js'];

self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(async c => {
    await c.addAll(assets);
    for (const asset of optionalAssets) {
      try {
        const response = await fetch(asset);
        if (response.ok) {
          await c.put(asset, response);
        }
      } catch (err) {
        // Ignore fetch errors for optional files
      }
    }
  })
));

self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE).map(k => caches.delete(k))
  ))
));

self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
));
