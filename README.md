# Workout Log

Carnet de muscu en PWA, pensé pour une hernie L5‑S1 : chaque exercice porte un statut validé par la kiné, la douleur est suivie avant et après la séance, et le lendemain matin (bilan J+1).

Aucune dépendance et aucune étape de build : ce sont des fichiers statiques (HTML, CSS, JavaScript). Les données restent sur le téléphone (IndexedDB), sans compte.

## Ce que fait la V1

- **Accueil** : la prochaine séance selon tes jours (mardi A, jeudi B), la carte « Bilan du lendemain » quand il est dû, la courbe de douleur.
- **Séances** : modèles A et B, détail avec régularité et douleur moyenne, modification (nom, lettre, jour, ordre des exercices).
- **Séance en cours** :
  - point douleur avant de commencer, avec alerte au‑dessus du seuil ;
  - tous les exercices en accordéon ;
  - séries pré‑remplies avec la dernière charge, un bouton « Valider la série » ;
  - minuteur de repos qui vibre et bipe à la fin ;
  - « Ça tire » pour marquer une gêne sur une série ;
  - ressenti à chaud (facile, modéré, dur) après chaque exercice ;
  - écran maintenu allumé.
- **Bilan J+1** : le lendemain dès 5 h, douleur au réveil, raideur, jambe, et ce qui a pu jouer.
- **Carnet** : semaine en cours, graphique de la douleur au réveil avec ton seuil, piste à surveiller quand une séance donne des lendemains plus douloureux, et détail de chaque séance série par série comparée à la fois précédente.
- **Exercices** : bibliothèque, ajout et modification, pictogramme ou photo, statut kiné modifiable et daté.
- **Progression** : +2,5 kg proposé seulement après deux séances « faciles » avec des lendemains sous le seuil. Au‑dessus du seuil, l'app conseille de garder la charge.
- **Réglages** : seuil de douleur, temps de repos, export et import JSON, réinitialisation.

## Lancer en local

```bash
python3 -m http.server 4180 -d ~/workout-log
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

## Sauvegarde

Les données ne quittent pas le téléphone. Fais un export JSON de temps en temps (Réglages, puis Exporter), surtout avant de changer de téléphone ou de vider les données du navigateur.

## Structure

```
index.html            coquille de l'app
styles.css            DA (tokens clair et sombre)
manifest.webmanifest  installation PWA
sw.js                 cache hors ligne
js/app.js             écrans, séance en cours, bilan J+1
js/store.js           stockage IndexedDB
js/seed.js            programme de départ (A et B)
js/pictos.js          pictogrammes et logo
icons/                icônes de l'app
```
