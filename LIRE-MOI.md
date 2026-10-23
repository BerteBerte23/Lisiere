# Installer Lisière avec GitHub Pages

Application personnelle iPhone / Mac. Installation entièrement dans les interfaces web : aucun terminal, aucune compilation, aucun workflow personnalisé à écrire.

## Avant de commencer

- **GitHub** conserve les fichiers sources.
- **GitHub Pages** publie le site HTTPS.
- **Firebase** gère l’unique compte de la lectrice et la bibliothèque privée synchronisée.

Pour le parcours gratuit décrit ici, créer un dépôt **Public** : GitHub Pages sur GitHub Free nécessite un dépôt public. Cela rend le code accessible ; ce n’est pas le stockage des livres et des notes, qui doit rester protégé par les règles Firebase. Un dépôt privé nécessite une offre GitHub adaptée pour Pages et ne rend pas automatiquement le site Pages privé.

**Ne jamais déposer dans GitHub :** mot de passe, clé privée, compte de service, `.env`, export JSON de la bibliothèque, photos ou notes personnelles. Les champs Web Firebase de `config.js` sont publics par conception ; leur protection repose sur les règles Firestore. Ne saisir les données privées qu’après configuration et vérification de ces règles.

## 1. Créer le dépôt GitHub

1. Se connecter à son compte sur **github.com**, ou créer son compte si nécessaire.
2. En haut à droite, cliquer **+ → New repository**.
3. Choisir son compte personnel comme propriétaire.
4. Indiquer **`lisiere`** dans **Repository name**.
5. Choisir **Public** pour le parcours GitHub Free.
6. Cocher **Add a README file** pour créer immédiatement la branche `main`.
7. Cliquer **Create repository**.

Aucun compte, dépôt ou site GitHub n’a été créé automatiquement par cette livraison.

## 2. Déposer les fichiers du nouveau ZIP

1. Télécharger **Lisiere-GitHub-Pages.zip** et le décompresser dans le Finder.
2. Dans GitHub, ouvrir l’onglet **Code** du dépôt `lisiere`.
3. Cliquer **Add file → Upload files**.
4. Glisser **le contenu décompressé**, fichiers et sous-dossiers, dans la zone de dépôt. Ne pas envoyer le ZIP et ne pas ajouter un dossier enveloppe `lisiere-github/`.
5. Vérifier la présence de `index.html` à la racine, puis de `js/app.js`, `vendor/zxing.min.js` et `icons/icon-192.png` dans leurs sous-dossiers respectifs.
6. En bas, indiquer un message comme « Ajouter l’application Lisière », laisser le commit sur `main`, puis cliquer **Commit changes**.
7. Dans **Code**, vérifier que le fichier **`.nojekyll`** est présent. Ce fichier remplace le pipeline GitLab pour cette publication statique simple : il demande à Pages de servir les fichiers sans traitement Jekyll.

Sur Mac, **Cmd + Maj + .** affiche les fichiers cachés, dont `.nojekyll` et `.gitignore`. Si `.nojekyll` n’a pas été importé, le créer directement dans GitHub avec **Add file → Create new file** : nom `.nojekyll`, texte « Publication statique directe », puis **Commit changes**. Aucun fichier `.gitlab-ci.yml` n’est nécessaire dans cette livraison GitHub. L’ancien ZIP Forge est conservé en archive dans Notion.

## 3. Activer GitHub Pages

1. Dans le dépôt, ouvrir **Settings** (Réglages).
2. Dans le menu latéral, ouvrir **Pages**.
3. Dans **Build and deployment → Source**, choisir **Deploy from a branch**.
4. Choisir la branche **main**.
5. Choisir le dossier **/(root)**.
6. Cliquer **Save**.
7. Attendre la fin de la publication. L’onglet **Actions** affiche automatiquement un déploiement Pages ; aucun fichier de workflow n’est à écrire pour ce mode.
8. Revenir dans **Settings → Pages**, puis utiliser **Visit site** quand le bouton apparaît.

L’adresse ressemble à `https://VOTRE-PSEUDO.github.io/lisiere/`. Ne pas saisir cet exemple tel quel : utiliser l’adresse effectivement affichée par GitHub. La première publication peut prendre plusieurs minutes. Si une erreur 404 apparaît, vérifier `index.html` à la racine, la branche `main`, le dossier `/(root)` et le résultat dans **Actions**. Vérifier **Enforce HTTPS** si l’option est proposée.

À ce stade, le site peut être essayé avec **Réglages → Essayer sur cet appareil uniquement**. Ce mode local n’a pas de connexion privée ni de synchronisation. L’application connectée ne sera utilisable qu’après les étapes Firebase ci-dessous.

## 4. Créer le projet personnel Firebase

Dans la console web Firebase :

1. Créer un projet personnel, par exemple `lisiere-bibliotheque` (le nom disponible peut varier). Google Analytics n’est pas nécessaire.
2. Ouvrir **Authentication → Sign-in method**, activer **E-mail / Mot de passe**. Ne pas activer la connexion anonyme.
3. Dans **Authentication → Users**, ajouter le seul compte de la lectrice. Choisir un mot de passe robuste et unique. Ne jamais envoyer ce mot de passe dans Notion ou le code.
4. Copier son **UID**. L’UID est un identifiant public, pas son mot de passe.
5. Dans **Firestore Database**, créer la base **(default)** en mode production, dans une région européenne proposée par la console. Ne pas choisir des règles publiques en mode test.
6. Dans **Paramètres du projet → Vos applications**, ajouter une application **Web**. Copier les champs du bloc de configuration Firebase, sans utiliser de compte de service.

Le plan gratuit peut convenir à une petite bibliothèque, dans ses quotas en vigueur. Vérifier la tarification de Firebase dans la console ; aucune absence générale de coût n’est garantie.

## 5. Renseigner `config.js`

Dans le dépôt GitHub, ouvrir **`config.js` → bouton crayon (Edit this file)**.

- Recopier la configuration Web dans les champs `firebase` déjà présents.
- Renseigner `ownerUid` avec l’UID de la lectrice.
- Laisser `googleBooksApiKey` vide pour commencer : Open Library fonctionne sans clé.
- Conserver les guillemets et les noms des champs.
- Cliquer **Commit changes**, puis confirmer le commit sur `main`. GitHub Pages republie le site.

La configuration Web Firebase et son `apiKey` sont publiques par conception. Elles ne donnent pas accès à la bibliothèque : les règles Firestore ci-dessous constituent la protection réelle. Ne jamais y mettre une clé privée, un JSON de compte de service ou une clé IA.

## 6. Publier les règles privées

Dans **Firestore Database → Rules** :

1. Ouvrir le fichier fourni **`firestore.rules`**.
2. Copier son contenu complet dans l’éditeur de règles Firebase.
3. Remplacer **`REMPLACER_PAR_UID_LECTRICE`** par le même UID que dans `config.js`.
4. Publier les règles.
5. Dans le simulateur de règles, vérifier les cas indiqués dans `TESTS.md` : aucun accès anonyme, aucun accès d’un autre UID, accès uniquement au bon chemin par l’UID autorisé.

Le fichier fourni refuse tout accès tant que l’UID n’est pas remplacé. Publier le site seul **ne publie pas** les règles Firestore. Le navigateur refuse aussi un compte dont l’UID ne correspond pas ; la vérification côté navigateur ne remplace pas les règles.

**Pas de Firebase Storage à activer :** aucune photo personnelle n’est enregistrée sur un serveur. Les couvertures de catalogues restent des liens externes.

## 7. Autoriser l’adresse GitHub Pages

Dans **Firebase → Authentication → Settings → Authorized domains**, ajouter **le nom de domaine** de l’adresse Pages (pas son chemin, ni `https://`). Par exemple, si l’adresse du site est `https://VOTRE-PSEUDO.github.io/lisiere/`, renseigner seulement `VOTRE-PSEUDO.github.io`. Cet exemple doit être adapté au vrai pseudo GitHub.

Vérifier le modèle d’e-mail de réinitialisation du mot de passe et activer la protection contre l’énumération d’e-mails si la console la propose. Les limitations de connexion relèvent du fournisseur Firebase ; aucun formulaire d’inscription n’est exposé dans l’application. Les règles refusent de toute façon tout UID autre que celui de la lectrice.

## 8. Installer et se connecter sur iPhone

1. Ouvrir l’adresse HTTPS dans **Safari**.
2. Utiliser **Partager → Sur l’écran d’accueil**.
3. Ouvrir Lisière depuis son icône, puis **Réglages → Me connecter**.
4. Saisir l’adresse et le mot de passe du compte créé dans Firebase. La connexion reste ouverte sur cet appareil personnel ; se déconnecter sur tout appareil partagé.
5. Ajouter un premier livre avec **Scanner**. Autoriser la caméra quand Safari le demande.
6. Sur Mac, ouvrir la même adresse et se connecter au même compte.

Ne pas utiliser le mode local pour la vraie bibliothèque si l’on souhaite la synchronisation. Les livres locaux ne sont pas envoyés automatiquement : les exporter puis importer l’export après connexion au compte, si nécessaire.

## 9. Vérifications indispensables

- Ajouter un livre, vérifier son titre, sa langue et l’édition retenue.
- Scanner un vrai code ISBN avec l’iPhone ; tester un refus de caméra puis la recherche manuelle.
- Photographier une couverture puis le dos. Relire et corriger le texte reconnu.
- Tester New Romance et Policier / Thriller, le tri par auteur et une série de plusieurs tomes.
- Passer un livre de « Non lu » à « En cours » puis « Terminé » ; vérifier les dates.
- Ouvrir le même compte sur Mac et vérifier la synchronisation d’un ajout et d’une modification.
- Exporter la bibliothèque et conserver une copie privée. Tester l’import avec une petite bibliothèque de test.
- Se déconnecter : aucune fiche privée ne doit rester affichée. Vérifier les règles avec un autre compte de test.

## Option : améliorer la couverture du catalogue français

Google Books est facultatif. Pour l’utiliser, créer une clé dédiée à **Books API**, limiter cette clé à la seule Books API et aux domaines HTTP autorisés du site dans Google Cloud, puis la renseigner dans `googleBooksApiKey` de `config.js`. Ne pas réutiliser une clé de service privé. Vérifier la restriction et les quotas dans la console.

Si Google Books échoue ou ne trouve pas de résultat, l’application tente Open Library. Avec la configuration vide livrée, elle utilise directement Open Library.

## Limites utiles

- Les catalogues peuvent être incomplets : auteurs, résumé, couverture, édition, genres ou nombre de pages peuvent manquer. Tous les champs restent modifiables.
- Une recherche par titre Open Library retourne d’abord une œuvre, pas nécessairement l’édition française possédée. Privilégier l’ISBN du dos pour l’édition ; la date d’une œuvre peut correspondre à sa première publication.
- La photo lit le texte de couverture ; ce n’est pas une reconnaissance visuelle universelle des livres. La confirmation humaine est prévue.
- L’OCR est plus lent au premier lancement et sensible à l’éclairage. Les modèles sont téléchargés depuis les CDN du projet Tesseract. Une photo de 12 Mo maximum est acceptée puis réduite à 1 800 pixels pour la reconnaissance. Pour une photo HEIC non décodée, utiliser JPEG ou une capture d’écran recadrée.
- La photo n’est ni envoyée à une IA distante ni conservée, mais les recherches, images et connexions sollicitent leurs fournisseurs respectifs.
- Internet est nécessaire pour les catalogues, les modèles OCR au premier chargement, la connexion et la synchronisation. Le service worker ne met pas la bibliothèque en cache ; ce n’est pas une application complète hors ligne.
- Le mode local utilise un stockage navigateur non chiffré. Ce stockage peut disparaître (effacement, désinstallation, politique Safari). Safari et l’application installée peuvent avoir des espaces de stockage distincts.
- Le mode connecté ne stocke pas les livres dans `localStorage`. Firebase conserve une session sur l’appareil pour éviter les reconnexions. L’accès à un appareil déverrouillé et connecté donne accès à la bibliothèque.
- Une modification simultanée du même livre sur deux appareils suit la dernière écriture ; éviter de modifier la même fiche en parallèle.
- L’export/import n’est pas une sauvegarde automatique : programmer ses propres exports réguliers.
- Les vrais réglages Firebase, les quotas, les règles déployées et les essais Safari/iPhone restent à vérifier après publication. Aucun hébergement ni compte n’a été créé par cette livraison.

## Arborescence à conserver

```
index.html
styles.css
config.js
manifest.webmanifest
sw.js
.nojekyll
.gitignore
package.json
firestore.rules
js/
  app.js
  model.js
  store.js
  catalog.js
vendor/
  zxing.min.js
  tesseract.min.js
  ZXING-LICENSE.txt
  TESSERACT-LICENSE.txt
icons/
  icon-192.png
  icon-512.png
  apple-touch-icon.png
LIRE-MOI.md
TESTS.md
AVIS-JARVIS.md
THIRD-PARTY-NOTICES.md
```

Dans ce parcours simple, les fichiers du dépôt et du site sont publics, y compris les guides et `firestore.rules`. Les règles ne contiennent pas de secret : elles doivent être publiées séparément dans la console Firebase pour protéger la base réelle. Aucun mot de passe, photo ou export personnel ne doit être ajouté au dépôt.

## Références GitHub

- Créer un site GitHub Pages : https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Choisir la branche et le dossier de publication : https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
