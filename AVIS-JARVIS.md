# Avis Jarvis

## Audit sécurité avant déploiement — 2026-10-22

**Verdict : Audit incomplet.** Fichiers livrables ; protection de la bibliothèque connectée à confirmer après création du projet Firebase et publication des règles. Aucun défaut critique confirmé ne justifie d’interdire la préparation des fichiers. Ne pas enregistrer la bibliothèque privée dans une base aux règles publiques.

**Synthèse :** 8 contrôles conformes sur le code livré, 0 à corriger, 8 non vérifiables sur l’environnement réel, 3 non applicables. Les statuts « Conforme » ne constituent pas une garantie générale de sécurité ou de conformité réglementaire.

| N° | Contrôle | Statut | Criticité | Preuve ou constat | Action |
| --- | --- | --- | --- | --- | --- |
| 01 | Sécuriser les clés API | Non vérifiable | Important | `config.js` vide ; seules des clés publiques de client sont prévues. Restrictions de futures clés inconnues. | Vérifier les clés publiques et limiter une éventuelle clé Books à l’API et aux domaines utiles. |
| 02 | Masquer les fichiers .env | Conforme | Important | Aucun .env livré ; `.gitignore` les exclut. Le dépôt GitHub et la source Pages sont publics : ne jamais y ajouter de fichier privé. | Conserver les exclusions et vérifier chaque fichier avant de le déposer. |
| 03 | Ne pas coder les secrets en dur | Conforme | Important | Aucun secret, mot de passe ou compte de service trouvé dans le code applicatif livré. | Ne jamais ajouter une clé privée à `config.js`. |
| 04 | Ajouter l’authentification | Non vérifiable | Bloquant | Firebase Auth e-mail/mot de passe implémenté ; projet, compte et configuration réels absents. Mode local explicitement non authentifié. | Créer l’unique compte et vérifier connexion/déconnexion. |
| 05 | Vérifier les permissions côté serveur | Non vérifiable | Bloquant | Règles livrées avec contrôle UID fixe ; refus par défaut avant remplacement. Aucune publication ni simulation serveur vérifiée. | Publier et tester les règles avant les données réelles. |
| 06 | Ne pas croire les identifiants frontend | Conforme | Bloquant | `firestore.rules` contrôle `request.auth.uid` émis par Firebase et le compare à l’UID autorisé et au chemin. Le contrôle frontend seul n’est pas présenté comme une protection. | Conserver les contrôles serveur lors de la configuration. |
| 07 | Isoler les données utilisateurs | Non vérifiable | Bloquant | Architecture `/users/{uid}/books/{id}` et contrôle propriétaire présents ; environnement final absent. | Tester un autre UID et un autre chemin dans le simulateur. |
| 08 | Verrouiller la base | Non vérifiable | Bloquant | Refus global et validation du schéma écrits ; publication réelle non accessible. | Refuser tout mode de règles publiques et exécuter les tests de refus. |
| 09 | Sécuriser Firebase et le stockage | Non vérifiable | Bloquant | Aucun Firebase Storage utilisé ; paramètres du projet Firestore/Auth à créer. | Vérifier les fournisseurs Auth, le domaine autorisé et la base (default). |
| 10 | Protéger les routes d’administration | Non applicable | — | Aucune route d’administration ni gestion des comptes exposée ; compte créé dans la console Firebase. | Conserver ce périmètre à un compte. |
| 11 | Désactiver le débogage en production | Conforme | Amélioration | Aucun mode debug Firebase activé, aucune journalisation des identifiants, mots de passe, photos ou fiches dans le code applicatif. | Ne pas ajouter de logs contenant des données personnelles. |
| 12 | Masquer les erreurs détaillées | Conforme | Important | Erreurs d’authentification génériques ; absence d’affichage de stack Firebase ; test d’erreur métier lisible. | Vérifier ces messages sur l’installation réelle. |
| 13 | Valider les entrées côté serveur | Non vérifiable | Important | Règles validant clés, tailles, types, listes, UID, couvertures et bornes présentes ; simulateur serveur non exécuté. | Tester fiches valides et malformées dans Firestore. |
| 14 | Nettoyer les contenus utilisateur | Conforme | Important | Rendu échappé ; descriptions de catalogue converties en texte ; domaines HTTPS limités. Charge HTML de test affichée sans exécution. | Conserver l’échappement de tous les champs affichés. |
| 15 | Sécuriser les téléversements | Conforme | Important | Aucun upload serveur de photo ; type et taille 12 Mo contrôlés, image décodée/redimensionnée avant OCR. Import JSON limité en taille et en nombre, normalisé avant écriture. | Tester les formats réels Safari, notamment HEIC. |
| 16 | Prévenir SQL / NoSQL injection | Non applicable | — | Pas de SQL ni de requête construite depuis une chaîne utilisateur. Firestore utilise des chemins et identifiants validés. | Réévaluer si une API ou une recherche serveur est ajoutée. |
| 17 | Limiter les requêtes de connexion/inscription | Non vérifiable | Important | Pas d’inscription dans l’interface ; connexions gérées par Firebase. Quotas et protection contre l’énumération non vérifiés. | Vérifier les mesures Firebase, les quotas et la protection e-mail. |
| 18 | Restreindre les règles CORS | Non applicable | — | Aucune API serveur applicative à configurer ; SDK Firebase et API publiques tierces gèrent leur CORS. CORS n’est pas présenté comme une autorisation d’accès aux fiches. | Ne pas ajouter de proxy CORS public ; conserver les règles d’accès réelles. |
| 19 | Réaliser une revue IA finale | Conforme | Amélioration | Revue de l’application, contrôles statiques et tests fonctionnels/de rendu effectués par Jarvis. | Compléter par les essais Safari et la vérification humaine des réglages. |

### Actions prioritaires

- Renseigner `config.js` avec le projet et l’UID de la lectrice.
- Publier `firestore.rules` après remplacement de l’UID et tester les refus/permissions.
- Vérifier les domaines Auth et les protections fournisseur avant l’usage de données réelles.
- Tester la caméra Safari et la synchronisation entre les deux appareils.

### Limites

Pas d’accès au futur projet Firebase, pas d’authentification réelle testée et pas d’iPhone physique. Le code minifié tiers n’a pas été audité intégralement. Les versions livrées sont identifiées dans les notices ; leur maintenance reste nécessaire. L’OCR et la lecture d’un code-barres ont été testés sur images de contrôle, pas sur les conditions lumineuses d’une caméra réelle. Le catalogue Open Library a répondu à une requête réelle ; cela ne garantit pas la disponibilité future ou l’exhaustivité des livres français.

Le mode local n’est ni chiffré ni authentifié : il sert à l’essai et ne répond pas au besoin de bibliothèque privée synchronisée. Le mode connecté reste ouvert sur un appareil personnel ; fermer une fenêtre ne déconnecte pas le compte.

Cet audit exclut l’historique Git et les en-têtes de sécurité servis par l’hébergement, conformément au périmètre demandé. Il ne vaut pas homologation, certification, garantie RGPD ou garantie d’absence de risque.

### Adaptation GitHub Pages

Le code d’exécution n’a pas été modifié : le pipeline GitLab est remplacé par la publication Pages depuis `main` / `/(root)`, avec `.nojekyll`. Les guides et cette analyse sont publics si déposés dans ce dépôt. Aucun test de déploiement GitHub réel n’a encore été réalisé. L’ancien paquet Forge est conservé en archive dans Notion.
