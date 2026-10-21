# Résultats des tests initiaux — État de référence (T02)

Ce document consigne les résultats des tests d'observation réels effectués sur la version originale non modifiée du projet `9-VoitureSuitCircuit genetic algo`.

**Date de réalisation des tests** : 15 octobre 2026  
**Environnement de test** : Serveur HTTP local Python (`http://localhost:8080`), navigateur web avec DevTools.  
**État du code** : Code source original 100% intact, aucune modification effectuée.

---

## 1. Tableau récapitulatif des tests initiaux

| Identifiant | Intitulé du test | Statut réel | Problème constaté | Tâche associée |
| :--- | :--- | :--- | :--- | :--- |
| **TEST-INIT-01** | Lancement de la page web et scripts | **Réussi** | Aucun bug de chargement | - |
| **TEST-INIT-02** | Rendu du canvas et du circuit | **Réussi** | Graphismes basiques | T07 |
| **TEST-INIT-03** | Déplacement initial des voitures | **Réussi** | Trajectoires courtes | T03 / T04 |
| **TEST-INIT-04** | Capteurs laser (Raycasting) | **Réussi** | Portée de 50 px trop faible | T04 |
| **TEST-INIT-05** | Collisions et élimination des véhicules | **Réussi** | Véhicules meurent très vite | T03 |
| **TEST-INIT-06** | Franchissement de checkpoint | **Réussi** | Détection fonctionnelle | T04 |
| **TEST-INIT-07** | Transition de génération et circuit | **Échoué** | Circuit recréé à chaque génération | T03 |
| **TEST-INIT-08** | Curseur de vitesse existant | **Réussi** | Slider brut sans label ni unité | T05 / T06 |
| **TEST-INIT-09** | Commandes et contrôles interactifs | **Échoué** | Pause, Mutation, Portée absents | T05 / T06 |
| **TEST-INIT-10** | Journal de la console et fluidité | **Échoué** | Saturation par `console.log(outputs)` | T02 |

---

## 2. Fiches détaillées des tests d'observation

### TEST-INIT-01 : Lancement de la page et chargement des dépendances
- **Identifiant** : TEST-INIT-01
- **Procédure suivie** :
  1. Démarrer le serveur HTTP local via `python -m http.server 8080`.
  2. Ouvrir l'URL `http://localhost:8080/index.html` dans le navigateur.
  3. Vérifier le titre de l'onglet et le chargement des scripts p5.js et TensorFlow.js.
- **Résultat attendu** : La page s'ouvre sans erreur 404, le titre "Voiture" s'affiche et les bibliothèques CDN sont prêtes.
- **Résultat réellement observé** : Titre "Voiture" bien présent dans le DOM. Tous les scripts (`tf.min.js`, `p5.min.js`, `p5.dom.min.js`, `nn.js`, `ga.js`, `ray.js`, `boundary.js`, `vehicle.js`, `sketch.js`) sont chargés avec succès avec code HTTP 200.
- **Statut** : **Réussi**
- **Preuves disponibles** : Présence des balises `<script>` dans le DOM et exécution effective de la boucle `setup()` de p5.js.
- **Problème éventuel** : Aucun pour le chargement.
- **Tâche future associée** : Aucune.

---

### TEST-INIT-02 : Rendu graphique du canvas et du circuit
- **Identifiant** : TEST-INIT-02
- **Procédure suivie** :
  1. Inspecter le DOM de la page chargée.
  2. Observer l'élément `<canvas>` généré par p5.js.
- **Résultat attendu** : Un canvas de dimension 1200x800 pixels avec fond noir, les deux bordures blanches du circuit fermé et les lignes bleues des balises de checkpoints.
- **Résultat réellement observé** : Élément `<canvas id="defaultCanvas0" width="1200" height="800">` présent. Circuit en boucle fermée généré par Perlin noise avec ses bordures blanches (`Boundary`) et ses 60 balises transversales bleues.
- **Statut** : **Réussi**
- **Preuves disponibles** : Dimensions validées dans l'arbre DOM, circuit dessiné par `buildTrack()`.
- **Problème éventuel** : L'esthétique est brute (lignes fines filaires sur fond noir monochrome, absence de textures ou de vibreurs).
- **Tâche future associée** : **T07 — Amélioration du design graphique**.

---

### TEST-INIT-03 : Déplacement et physique des voitures
- **Identifiant** : TEST-INIT-03
- **Procédure suivie** :
  1. Observer la ligne de départ dès le frame 0 de la génération 0.
  2. Suivre la dispersion des 100 rectangles blancs représentants les véhicules.
- **Résultat attendu** : Les 100 voitures démarrent au point `start` et se déplacent vers l'avant selon leur vitesse et les ordres de leur réseau de neurones.
- **Résultat réellement observé** : Les voitures se mettent en mouvement immédiatement. Leurs orientations divergent légèrement dès les premiers pas de calcul en raison des poids synaptiques initialisés de manière aléatoire.
- **Statut** : **Réussi**
- **Preuves disponibles** : Déplacement visible des coordonnées `pos` des véhicules à chaque frame.
- **Problème éventuel** : La durée de survie de la plupart des voitures est extrêmement courte (moins de 25 frames pour la majorité).
- **Tâche future associée** : **T03 — Stabilisation du circuit et réglage de la durée de vie**.

---

### TEST-INIT-04 : Capteurs optiques (Raycasting)
- **Identifiant** : TEST-INIT-04
- **Procédure suivie** :
  1. Observer la voiture championne temporaire surlignée en vert (`highlight()`).
  2. Vérifier l'orientation et la portée des 6 rayons laser.
- **Résultat attendu** : 6 rayons verts émis à partir de la position de la voiture, couvrant un arc de vision de -45° à +30°, coupant les murs à une distance maximale de 50 pixels.
- **Résultat réellement observé** : Les rayons sont projetés et pivotent en phase avec l'angle de braquage de la voiture. L'intersection `cast(wall)` fonctionne et détecte les bordures proches.
- **Statut** : **Réussi**
- **Preuves disponibles** : Rendu des segments de rayons verts tracés par `ray.show()` dans `vehicle.highlight()`.
- **Problème éventuel** : La portée de vision fixée à `SIGHT = 50` px est inférieure à la largeur de piste (60 px), empêchant la détection des virages à distance suffisante lorsque la voiture est au milieu de la voie.
- **Tâche future associée** : **T04 — Optimisation des capteurs et portée de vision**.

---

### TEST-INIT-05 : Détection des collisions et élimination
- **Identifiant** : TEST-INIT-05
- **Procédure suivie** :
  1. Observer le comportement d'une voiture arrivant au contact d'un mur blanc.
- **Résultat attendu** : La voiture est déclarée morte dès qu'elle approche à moins de 5 pixels d'un mur, puis est retirée du tableau de simulation.
- **Résultat réellement observé** : Dès que `record < 5`, `this.dead = true`. La voiture s'immobilise et est transférée de `population` vers `savedVehicles` par la boucle `splice`.
- **Statut** : **Réussi**
- **Preuves disponibles** : Décroissance visible du nombre de voitures visibles jusqu'à extinction totale.
- **Problème éventuel** : La mort brutale à moins de 5 px avec une durée de vie limite `LIFESPAN = 25` frames élimine les voitures de manière prématurée avant qu'elles n'aient pu corriger leur trajectoire.
- **Tâche future associée** : **T03 — Fiabilité fondamentale et durée de vie**.

---

### TEST-INIT-06 : Franchissement des checkpoints et score
- **Identifiant** : TEST-INIT-06
- **Procédure suivie** :
  1. Observer le passage de la voiture la plus avancée à travers la première balise bleue.
- **Résultat attendu** : L'indice de checkpoint augmente, le score `fitness` passe de 0 à 1, et la cible bleue se déplace sur la balise suivante.
- **Résultat réellement observé** : Le calcul de distance point-ligne `pldistance` détecte bien le passage sous la barre des 5 pixels. Le score s'incrémente et le compteur `counter` est réinitialisé.
- **Statut** : **Réussi**
- **Preuves disponibles** : Mise en surbrillance de la balise suivante via `this.goal.show()`.
- **Problème éventuel** : En cas de tracé avec virage en épingle serré dès le départ, la voiture de tête heurte parfois le mur avant de pouvoir toucher le premier checkpoint.
- **Tâche future associée** : **T04 — Optimisation des capteurs et checkpoints**.

---

### TEST-INIT-07 : Extinction de population, génération suivante et circuit
- **Identifiant** : TEST-INIT-07
- **Procédure suivie** :
  1. Attendre la mort des 100 voitures de la génération 0.
  2. Observer l'affichage du texte `generation` et la forme du circuit.
- **Résultat attendu théorique pour un apprentissage** : Le numéro de génération s'incrémente, une nouvelle population est créée par sélection/mutation et réapparaît sur **le même circuit** pour capitaliser sur les apprentissages.
- **Résultat réellement observé** :
  - `generationCount` passe bien de 0 à 1.
  - **Défaut critique constaté** : La fonction `buildTrack()` est appelée dans [sketch.js:132](../sketch.js#L132) dès que `population.length == 0`. Un **tout nouveau circuit différent** est immédiatement généré.
- **Statut** : **Échoué (Comportement inadapté à l'apprentissage)**
- **Preuves disponibles** : Forme géométrique du circuit modifiée à chaque passage de génération.
- **Problème éventuel** : Empêche toute convergence de l'algorithme génétique (les voitures apprennent un circuit puis sont évaluées sur un tracé différent).
- **Tâche future associée** : **T03 — Stabilisation du circuit**.

---

### TEST-INIT-08 : Curseur de vitesse existant
- **Identifiant** : TEST-INIT-08
- **Procédure suivie** :
  1. Localiser l'élément slider généré par `createSlider(1, 10, 1)` dans le DOM.
  2. Déplacer le curseur vers la valeur maximale (10).
- **Résultat attendu** : La simulation accélère en effectuant 10 cycles de calcul physique par frame au lieu de 1.
- **Résultat réellement observé** : L'élément `<input type="range" class="p5Slider" min="1" max="10" step="1">` est présent sous le canvas. L'accélération fonctionne effectivement (la population s'éteint beaucoup plus vite).
- **Statut** : **Réussi**
- **Preuves disponibles** : L'élément DOM réagit et la boucle `for (let n = 0; n < cycles; n++)` s'exécute avec la valeur du slider.
- **Problème éventuel** : Le slider est brut, sans étiquette textuelle, sans valeur numérique affichée, et rejeté en bas de page sans intégration visuelle.
- **Tâche future associée** : **T05 / T06 — Curseurs et interface de contrôle**.

---

### TEST-INIT-09 : Commandes de contrôle interactives (Pause, Paramètres IA)
- **Identifiant** : TEST-INIT-09
- **Procédure suivie** :
  1. Rechercher dans le DOM et le code les boutons Pause / Reprendre, Réinitialiser, ou les curseurs de réglage du taux de mutation et de portée des capteurs.
- **Résultat attendu selon les besoins cibles** : Présence d'un panneau de contrôle permettant d'interrompre la course et d'ajuster l'apprentissage.
- **Résultat réellement observé** :
  - **Bouton Pause / Reprendre** : **Totalement absent**.
  - **Bouton Réinitialiser / Nouveau circuit** : **Totalement absent**.
  - **Curseur Taux de mutation** : **Totalement absent** (figé dans le code à `MUTATION_RATE = 0.1`).
  - **Curseur Portée capteurs** : **Totalement absent** (figé dans le code à `SIGHT = 50`).
  - **Curseur Taille de population** : **Totalement absent** (figé dans le code à `TOTAL = 100`).
  - **Tableau de bord (HUD)** : **Absent** (seul un texte brut `generation X` est dessiné sur le canvas).
- **Statut** : **Échoué (Fonctionnalités absentes)**
- **Preuves disponibles** : Seul l'input du slider de vitesse existe dans le corps HTML `<body>`.
- **Problème éventuel** : Impossibilité pour l'utilisateur d'interagir avec la simulation ou de tester des scénarios d'IA en direct.
- **Tâche future associée** : **T05 — HUD et commandes de base** et **T06 — Curseurs interactifs**.

---

### TEST-INIT-10 : Performances et messages dans la console développeur
- **Identifiant** : TEST-INIT-10
- **Procédure suivie** :
  1. Ouvrir l'onglet Console des outils de développement (F12).
  2. Laisser tourner la simulation pendant 3 secondes.
- **Résultat attendu** : Une console propre, sans affichage massif en boucle pour préserver la fluidité CPU.
- **Résultat réellement observé** :
  - Aucune erreur fatale de syntaxe ou d'exécution JavaScript.
  - **Anomalie critique confirmée** : La console est inondée de milliers de messages `Float32Array(2) [ ... ]` émis en rafale continue par la ligne [nn.js:91](../nn.js#L91) (`console.log(outputs);`).
- **Statut** : **Échoué (Saturation de la console)**
- **Preuves disponibles** : Des centaines de lignes écrites chaque seconde par chaque voiture active dans la console DevTools.
- **Problème éventuel** : Ralentissement du moteur de rendu, consommation CPU inutile due aux écritures en console, difficulté à repérer de vraies erreurs.
- **Tâche future associée** : **T02 — Fiabilité fondamentale (suppression du log)**.

---

## 3. Synthèse des défauts confirmés vs problèmes possibles

| Constat d'audit | Statut après test T02 | Justification factuelle |
| :--- | :--- | :--- |
| **Circuit recréé à chaque génération** | **DÉFAUT CONFIRMÉ** | Constaté visuellement et vérifié dans [sketch.js:132](../sketch.js#L132) (`buildTrack()` exécuté à chaque `population.length == 0`). |
| **Console inondée par `console.log(outputs)`** | **DÉFAUT CONFIRMÉ** | Constaté en direct dans la console du navigateur avec l'objet `Float32Array(2)`. |
| **Commandes Pause/Mutation/Portée absentes** | **DÉFAUT CONFIRMÉ** | Aucun élément HTML ou écouteur d'événement n'existe pour ces fonctions. |
| **Durée de vie `LIFESPAN = 25` trop courte** | **DÉFAUT CONFIRMÉ** | Les voitures novices meurent souvent en moins d'une demi-seconde avant d'atteindre le 1er checkpoint. |
| **Portée capteurs `SIGHT = 50` insuffisante** | **DÉFAUT CONFIRMÉ** | Les rayons ne touchent pas les murs au milieu de la voie de 60 px de large. |
| **Crash potentiel sur `bestP.highlight()`** | **PROBLÈME POSSIBLE (Condition limite)** | Non déclenché lors du test normal mais condition de garde absente dans le code si `population` est vide. |
