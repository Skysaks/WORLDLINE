# Architecture

WORLDLINE est publié sous sa forme construite : `dist/worldline.html`, un fichier HTML unique de ≈ 710 Ko produit par Vite à partir d'une application React 19 + TypeScript (état géré par Zustand). Ce document décrit ce que contient le fichier, ce que le dépôt vérifie, et comment il est publié.

## Le fichier construit

```
<head>
  <script type="module">   application compilée : React, état, moteur de simulation, données des 176 pays, textes FR/EN
  <style>                  feuille de style compilée, thème sombre
<body>
  <div id="root">          monté par React (createRoot)
  <noscript>               message si JavaScript est désactivé
```

- **Aucune ressource externe** : polices système, carte et icônes en SVG, données incluses dans le script.
- **Sauvegarde locale** : parties, progression, défis du jour et réglages dans `localStorage`.
- **Bilingue** : chaque texte existe en français et en anglais ; la langue se change depuis l'accueil.

## Ce que le dépôt vérifie

Les sources n'étant pas publiées, le dépôt traite le fichier comme un livrable à contrôler :

| Contrôle | Où |
|---|---|
| document complet (langue, encodage, viewport, titre, description) et mention de droits | `tests/build.test.mjs` |
| aucune ressource chargée depuis le réseau (`src`, `href`, `url()`, `@import`, `import()`) | `scripts/lib.mjs`, `npm run verify` |
| aucune adresse, aucun jeton, aucun lien privé dans le dépôt | `scripts/lib.mjs`, `npm run verify` |
| ouverture hors ligne sans erreur ni requête, sur bureau et téléphone | `tests/e2e/app.spec.mjs` |
| partie rapide (tutoriel puis carte), rejouer l'histoire, progression | `tests/e2e/app.spec.mjs`, parcours décrits dans `build.config.json` |

## Publication

À chaque push sur `main`, le workflow `Pages` copie `dist/worldline.html` en `index.html` sur la branche `gh-pages`, servie par GitHub Pages. Le workflow `CI` rejoue l'audit de dépendances, les contrôles et les tests.
