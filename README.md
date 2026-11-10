# Workout Log

Carnet de muscu en PWA, pensé pour une hernie L5‑S1 : chaque exercice porte un statut validé par la kiné, la douleur est suivie avant et après la séance, et le lendemain matin (bilan J+1).

Aucune dépendance installée et aucune étape de build : ce sont des fichiers statiques (HTML, CSS, JavaScript). Les données sont d'abord sur le téléphone (IndexedDB) et, une fois connecté avec Google, sauvegardées automatiquement dans Firebase (Firestore).

## Ce que fait l'app

- **Premier lancement** : une présentation en 5 écrans (tes jours, les statuts kiné, ton seuil de douleur, les signaux d'alerte), à revoir depuis les réglages.
- **Accueil** : la prochaine séance selon tes jours (mardi A, jeudi B), la carte « Bilan du lendemain » quand il est dû, un rappel de sauvegarde toutes les 4 semaines, la courbe de douleur.
- **Séances** :
  - modèles A et B, avec régularité et douleur moyenne ;
  - appui long sur une carte pour la modifier, la dupliquer, la renommer ou la supprimer ;
  - glisser vers la gauche pour supprimer, avec Annuler ;
  - séance libre, sans modèle.
- **Séance en cours** :
  - point douleur avant de commencer, avec alerte au‑dessus du seuil ;
  - chrono collé en haut de l'écran, tous les exercices en accordéon, et la possibilité d'en ajouter en cours de séance ;
  - récup affichée entre chaque série et chaque exercice, séries supprimables en les glissant vers la gauche (avec Annuler) ;
  - « Dernière fois » sous chaque exercice, charges arrondies à une décimale ;
  - séries pré‑remplies avec la dernière charge, un bouton « Valider la série » protégé contre le double tap ;
  - minuteur de tenue pour les exercices en durée (planche, gainage), côté par côté ;
  - repos réglable par exercice, avec un minuteur qui vibre et bipe à la fin ;
  - « Ça tire » pour marquer une gêne sur une série ;
  - ressenti à chaud après chaque exercice ;
  - écran maintenu allumé.
- **Douleur à tout moment** : bouton « Noter » sur l'accueil et dans le Bilan (douleur, zone, moment, ce qui a pu jouer, date modifiable). Courbe sur 14 et 30 jours avec ton seuil, relevés mêlés à l'historique.
- **Bilan J+1** : le lendemain dès 5 h, douleur au réveil, raideur, jambe, et ce qui a pu jouer.
- **Carnet**, en deux onglets :
  - **Bilan** : alerte sur les séances avec gêne (« ça tire », douleur au‑dessus du seuil juste après ou le lendemain, fourmillements), totaux, séances par semaine avec l'objectif, semaine en cours, douleur au réveil et pistes à surveiller, poids, dernière séance ;
  - **Historique** : chaque séance série par série, comparée à la fois précédente.
- **Plus** :
  - **bibliothèque d'exercices** : groupes musculaires (tags et filtre), pictogramme ou photo, statut kiné modifiable et daté ;
  - **réglages** : seuil de douleur, temps de repos, export et import JSON, réinitialisation.
- **Progression** : +2,5 kg proposé seulement après deux séances « faciles » avec des lendemains sous le seuil.

## Lancer en local

```bash
python3 -m http.server 4180 -d ~/Documents/Chris/workout-log
```

Puis ouvrir http://localhost:4180.

## Installer sur ton téléphone

Une PWA doit être servie en HTTPS pour s'installer. Le plus simple :

1. **Netlify Drop** : va sur https://app.netlify.com/drop et glisse le dossier `workout-log`. Tu obtiens une adresse en `https://…netlify.app`.
2. **Ou GitHub Pages** : pousse le dossier dans un dépôt, puis active Pages dans les réglages du dépôt.

Ensuite, sur le téléphone :

- **Android (Chrome)** : ouvre l'adresse, menu ⋮, puis « Installer l'application ».
- **iPhone (Safari)** : bouton Partager, puis « Sur l'écran d'accueil ».

## Mettre à jour l'app

Après une modification, change `VERSION` dans `sw.js` (par exemple `wl-v2`) puis redéploie. Les téléphones récupèrent la nouvelle version au lancement suivant.

## Sauvegarde en ligne (Firebase)

- Connexion avec Google depuis l'accueil, l'onboarding ou Plus › Réglages.
- Chaque modification part dans Firestore 1,5 s après, ou dès que l'app passe en arrière‑plan. Hors ligne, les envois attendent le retour du réseau.
- À la connexion, le téléphone et le cloud sont fusionnés : un téléphone vidé récupère tout, et une séance supprimée ne revient pas.
- Structure : `users/{uid}` (réglages, exercices, séances modèles, poids), puis `sessions`, `painLogs` et `photos` en sous‑collections.
- Règles Firestore : seul l'utilisateur connecté lit et écrit sous `users/{son uid}`.
- Le domaine `christoru-svg.github.io` doit être dans Authentication › Paramètres › Domaines autorisés.

## Copie de secours

Les données ne quittent pas le téléphone. Fais un export JSON de temps en temps (Réglages, puis Exporter), surtout avant de changer de téléphone ou de vider les données du navigateur.

## Structure

```
index.html            coquille de l'app
styles.css            DA (tokens clair et sombre)
manifest.webmanifest  installation PWA
sw.js                 cache hors ligne
js/app.js             écrans, séance en cours, bilan J+1
js/store.js           stockage IndexedDB (état et photos séparés)
js/cloud.js           connexion Google et synchronisation Firestore
js/seed.js            programme de départ (A et B)
js/pictos.js          pictogrammes et logo
icons/                icônes de l'app
```
