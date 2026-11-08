// Ne stocke ni données de lecture ni réponses d'authentification/catalogue.
// Sans cache applicatif : évite de servir une ancienne configuration privée.
// Rôles : installation de l'application, notifications locales, vérification périodique des nouveautés (Android).
try { importScripts('./js/news-core.js'); } catch (e) { /* Les nouveautés en arrière-plan sont alors désactivées. */ }
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Gestionnaire volontairement vide : requis par certains navigateurs Android pour proposer l'installation. Aucun cache.
self.addEventListener('fetch', () => {});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { await c.focus(); c.postMessage({ type: 'lisiere-open', tab: 'reco' }); return; }
    }
    await self.clients.openWindow('./#reco');
  })());
});
self.addEventListener('periodicsync', event => {
  if (event.tag === 'lisiere-news' && self.LisiereNews) event.waitUntil(self.LisiereNews.backgroundCheck(self.registration).catch(() => {}));
});
