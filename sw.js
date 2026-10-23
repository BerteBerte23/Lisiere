// Ne stocke ni données de lecture ni réponses d'authentification/catalogue.
// Sans cache applicatif : évite de servir une ancienne configuration privée.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
