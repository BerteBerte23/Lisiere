# Composants et services

## Composants distribués dans ce ZIP

- **ZXing JavaScript library 0.21.3** : scan EAN-13. Distribution UMD depuis le paquet `@zxing/library`. Licence Apache-2.0 : `vendor/ZXING-LICENSE.txt`. https://github.com/zxing-js/library
- **Tesseract.js 5.1.1** : reconnaissance optique locale de texte. Distribution depuis le paquet `tesseract.js`. Licence Apache-2.0 : `vendor/TESSERACT-LICENSE.txt`. https://github.com/naptha/tesseract.js

Ces composants sont identifiés par version ; leurs licences originales sont jointes. Le code tiers minifié n’a pas fait l’objet d’une revue exhaustive.

## Composants et données chargés à l’exécution

- **Firebase JavaScript SDK 11.10.0** : modules officiels depuis `www.gstatic.com`. Authentification et base Firestore, après configuration. Projet sous licence Apache-2.0 ; conditions de service Google/Firebase applicables. https://github.com/firebase/firebase-js-sdk
- **Worker Tesseract.js 5.1.1**, cœur WASM et modèles français/anglais : téléchargés lors de l’OCR. Le navigateur traite la photo, sans téléversement vers ces CDN. Le worker peut utiliser les chemins CDN par défaut de sa version pour le cœur et les données linguistiques. Les CDN voient les requêtes de téléchargement et l’adresse réseau de l’appareil.
- **Open Library / Internet Archive** : catalogue et couvertures ; pas de clé requise pour cette intégration. Les recherches sont espacées d’au moins 1,1 seconde. Documentation : https://openlibrary.org/developers/api
- **Google Books API**, facultative : métadonnées et couvertures. https://developers.google.com/books/docs/v1/using

Les notices de source sont conservées sur les fiches de livres. Une description de catalogue n’est pas nécessairement la quatrième de couverture exacte. Les couvertures et textes restent soumis aux droits de leurs ayants droit ; aucune licence de réutilisation générale n’est présumée et aucun catalogue entier n’est aspiré. Le ZIP n’inclut aucun livre, couverture ou texte éditorial d’un tiers.
