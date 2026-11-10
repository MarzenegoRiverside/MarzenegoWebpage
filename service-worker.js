/* Marzenego Riverside - service worker leggero
   Sostituisce il vecchio "passa-tutto" (che faceva transitare OGNI richiesta - Firebase, immagini, font -
   dentro il service worker, rallentando l'app e su iPhone a volte bloccandola).
   Ora gestisce SOLO l'apertura della pagina: prima la rete, e se non c'e' connessione l'ultima copia salvata.
   Tutte le altre richieste vanno direttamente dal browser. (Su iPhone l'app non usa service worker.) */
const CACHE = 'mzr-shell-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode !== 'navigate' || req.method !== 'GET') return; // tutto il resto: nessun intervento
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./', copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      const cached = await caches.match('./');
      if (cached) return cached;
      throw err;
    }
  })());
});
