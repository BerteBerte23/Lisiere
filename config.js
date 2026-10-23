// Configuration PUBLIQUE Firebase (console Firebase > Paramètres du projet > Vos applications).
// Aucun mot de passe, clé privée ou clé de compte de service ne doit être placé ici.
export const CONFIG = Object.freeze({
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  },
  // UID de l'unique lectrice (Authentication > Users). Reporter aussi cet UID dans firestore.rules.
  ownerUid: '',
  // Facultatif : clé Google Books PUBLIQUE, limitée aux domaines et à la seule Books API.
  // Sans cette clé, Open Library est utilisé. Ne pas mettre de clé IA ici.
  googleBooksApiKey: ''
});
