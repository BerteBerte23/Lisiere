// Configuration Web publique : aucun mot de passe ni clé privée.
// ownerUid est conservé pour la compatibilité pendant la mise à jour.
// Les autorisations réelles sont aussi vérifiées dans firestore.rules.
export const CONFIG = Object.freeze({
  "firebase": {
    "apiKey": "AIzaSyBTQxThN5X5Tgm0v0_nYVsfsctgdpAA4lY",
    "authDomain": "lisiere-61fef.firebaseapp.com",
    "projectId": "lisiere-61fef",
    "storageBucket": "lisiere-61fef.firebasestorage.app",
    "messagingSenderId": "545240795459",
    "appId": "1:545240795459:web:1196522db303855adfc7f6"
  },
  "ownerUid": "Ip5pI839d4WwxI818ujNyH4a2xl1",
  "googleBooksApiKey": "",
  // Clé TMDB gratuite (https://www.themoviedb.org/settings/api, « Clé d'API » v3) pour les films et séries de l'onglet « Pour vous ».
  // Laisser vide pour désactiver ces suggestions. Cette clé est visible publiquement, comme le reste de ce fichier.
  "tmdbApiKey": "",
  "region": "FR",
  "profiles": [
    {
      "uid": "Ip5pI839d4WwxI818ujNyH4a2xl1",
      "label": "Lectrice",
      "gender": "feminin",
      "palette": "sage"
    },
    {
      "uid": "zv1huPM37lVmr9tbpsCCzl5Bfj72",
      "label": "Quentin",
      "gender": "masculin",
      "palette": "slate",
      "media": true
    },
    {
      // Remplacer REMPLACER_UID_FRERE par l'UID du compte créé dans Firebase (Authentication > Users), et le prénom.
      "uid": "REMPLACER_UID_FRERE",
      "label": "Mon frère",
      "gender": "masculin",
      "palette": "ember",
      "media": true
    },
    {
      // Remplacer REMPLACER_UID_COMPAGNE par l'UID du compte créé dans Firebase, et le prénom.
      "uid": "REMPLACER_UID_COMPAGNE",
      "label": "Sa compagne",
      "gender": "feminin",
      "palette": "plum",
      "media": true
    }
  ]
});
