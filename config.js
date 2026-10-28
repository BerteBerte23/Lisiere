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
      "palette": "slate"
    }
  ]
});
