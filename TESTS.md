# Vérifications — 22 octobre 2026

## Vérifié dans Chromium local

14 groupes de tests automatisés ont réussi :

1. Vérification des sommes de contrôle ISBN-10 et ISBN-13 et du préfixe ISBN.
2. Rejet des protocoles dangereux et des domaines de couverture non autorisés.
3. Validation du titre, ordre des dates et bornes numériques.
4. Filtres, recherche insensible aux accents, tris auteur/titre/série/tome, doublons.
5. Structure et version des exports/imports JSON.
6. Persistance du mode local après rechargement (réactivation explicite du mode local).
7. Édition d’une fiche et affichage d’une charge HTML hostile comme texte, sans exécution.
8. Ajout manuel d’un livre avec genre et possession.
9. Transitions non lu → en cours → terminé et dates.
10. Suppression seulement après confirmation.
11. Téléchargement réel d’un export JSON contenant les livres attendus.
12. Recherche catalogue et enrichissement du résumé avec réponses contrôlées simulées.
13. Absence de débordement horizontal à 390 pixels.
14. Affichage ordinateur, thème sombre et absence d’erreur JavaScript pendant les parcours.

Trois essais supplémentaires ont réussi avec les composants réels :

- OCR d’une image de contrôle : titre et auteur correctement extraits (« La Femme de ménage », « Freida McFadden »). Images de contrôle non incluses dans le site.
- Décodage d’une image EAN-13 produite pour le test : ISBN `9782070360024` reconnu. La réponse catalogue de ce parcours était simulée pour isoler le décodeur.
- Requête réelle au catalogue Open Library pour cet ISBN, depuis le navigateur local : livre retrouvé (« L’étranger »).

Les aperçus ont été contrôlés à 390 et 1280 pixels, ainsi que pour les écrans d’ajout, fiche, édition, réglages, scan et photo. Les livres affichés dans les aperçus sont uniquement des données de test ; le ZIP démarre avec une bibliothèque vide.

## À tester sur l’installation réelle

### Accès et règles Firebase

Dans le simulateur de règles Firestore, adapter les chemins à l’UID réel :

- Non authentifié, lecture de `/users/UID_LECTRICE/books/test` : refusée.
- Authentifié avec un autre UID, même chemin : refusée.
- Lectrice authentifiée, lecture de son propre chemin : autorisée.
- Lectrice authentifiée, lecture d’un autre chemin utilisateur : refusée.
- Lectrice authentifiée, création d’une fiche complète valide dans son chemin : autorisée.
- Même contexte, titre absent, type incorrect, champ supplémentaire ou couverture sur un domaine tiers : refusé.
- Mise à jour changeant `createdAt` : refusée.
- Toute lecture/écriture hors `/users/UID_LECTRICE/books/*` : refusée.

Puis vérifier avec l’application connectée : ajout, modification, suppression, déconnexion et resynchronisation iPhone/Mac. Un compte secondaire éventuellement créé par l’API Firebase doit toujours être refusé par les règles et par l’interface.

### iPhone 17 / Safari

- Installation depuis Safari, icône et ouverture autonome.
- Connexion persistante ; déconnexion volontaire.
- Scan caméra arrière d’un vrai livre ; arrêt de la caméra à la fermeture ou au passage en arrière-plan ; reprise après retour.
- Refus initial de caméra et utilisation d’une photo ou de la saisie manuelle.
- Photo de couverture puis correction de la recherche et confirmation du livre.
- Photo du dos puis correction du texte avant sauvegarde.
- Photo HEIC réelle ; si Safari ne la décode pas, vérifier le message et le recours JPEG/capture d’écran.
- Formulaire long, clavier iOS, défilement dans la fenêtre, rotation et VoiceOver.
- Export dans les téléchargements puis import d’une petite sauvegarde de test.

### Synchronisation et fiabilité

- Même compte sur Mac : retrouver un livre ajouté sur iPhone, puis l’inverse.
- Couper le réseau : vérifier le message et ne pas supposer qu’un enregistrement en attente est confirmé. Firestore peut conserver une écriture en mémoire en attendant le retour du réseau.
- Tester la perte de session, les règles non publiées et une erreur catalogue.
- Vérifier le fournisseur Google Books si une clé est activée, ses restrictions et ses quotas.
- Vérifier les limitations/mesures anti-abus et e-mails de réinitialisation dans la console Firebase.

Aucun test sur un iPhone physique ni sur un vrai projet Firebase de la lectrice n’a été réalisé. La présence du fichier de règles dans le ZIP ne prouve pas leur publication ni leur efficacité sur l’environnement final.

## Publication GitHub Pages

L’adaptation GitHub conserve exactement les fichiers d’exécution précédemment testés. Seuls le mécanisme de publication et la documentation changent. Les 14 groupes de tests précédents ne constituent pas une vérification du déploiement GitHub, qui reste à effectuer. Vérifier les chemins relatifs sous `/lisiere/`, le HTTPS et le domaine Firebase autorisé après publication.
