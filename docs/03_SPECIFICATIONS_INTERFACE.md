# Spécifications de l'interface graphique et des contrôles

## 1. Inventaire des composants : Existant vs À développer

L'examen du code actuel ([sketch.js](../sketch.js) et [index.html](../index.html)) permet d'établir la matrice suivante :

| Composant | Statut actuel dans le code | Observation technique |
| :--- | :--- | :--- |
| **Zone de jeu avec circuit** | **Existant** | Canvas p5.js de 1200x800 px ([sketch.js](../sketch.js#L72)). Fond noir avec lignes blanches et bleues. |
| **Voitures et capteurs** | **Existant** | Rectangles 10x5 px ([vehicle.js](../vehicle.js#L224)) et 6 rayons verts affichés uniquement pour le leader ([vehicle.js](../vehicle.js#L241)). |
| **Affichage de la génération** | **Partiel** | Simple texte brut `generation X` affiché en haut à gauche du canvas ([sketch.js](../sketch.js#L165)). |
| **Tableau de bord (HUD complet)** | **À créer** | Aucun affichage du nombre de survivants, du score actuel, ni du record absolu. |
| **Bouton Pause / Reprendre** | **À créer** | Absent du code. La simulation tourne en continu dès l'ouverture. |
| **Bouton Recommencer simulation** | **À créer** | Absent du code. Nécessite actuellement de rafraîchir la page web F5. |
| **Contrôle de vitesse de simulation** | **Existant mais rudimentaire (À adapter)** | Un slider brut p5.js créé via `createSlider(1, 10, 1)` ([sketch.js](../sketch.js#L87)), sans label, sans indication de valeur chiffrée, placé par défaut sous le canvas. |
| **Curseur Taux de mutation** | **À créer** | Actuellement figé en constante globale `const MUTATION_RATE = 0.1` ([sketch.js](../sketch.js#L4)). |
| **Curseur Portée des capteurs** | **À créer** | Actuellement figé en constante globale `const SIGHT = 50` ([sketch.js](../sketch.js#L7)). |
| **Contrôle Population (voitures)** | **À créer** | Actuellement figé en constante globale `const TOTAL = 100` ([sketch.js](../sketch.js#L3)). |
| **Mode visualisation des capteurs** | **À créer** | Seule la voiture de tête affiche ses rayons. Aucun bouton pour basculer l'affichage (toutes les voitures, seulement le leader, ou masqués). |
| **Graphique des scores** | **À créer** | Aucun historique n'est enregistré ni affiché entre les générations. |

---

## 2. Agencement proposé de l'interface (Layout)

L'interface sera structurée en deux zones principales :
1. **La zone principale (Gauche / Centre)** :
   - Le Canvas de simulation (1200x800 ou redimensionné de manière responsive).
   - Superposition légère (Overlay HUD) en haut à gauche : badges semi-transparents avec numéro de génération, nombre de survivants, score courant et record absolu.
2. **Le panneau de commande latéral (Droite ou sous le canvas)** :
   - **Section Contrôle de flux** : Boutons *Pause / Reprendre*, *Nouveau Circuit*, *Réinitialiser*.
   - **Section Curseurs de simulation** : Vitesse, Taux de mutation, Portée des capteurs, Taille de population.
   - **Section Affichage** : Sélecteur de mode de rayons (Leader / Tous / Aucun).
   - **Section Télémétrie** : Mini-graphique de convergence des scores traçant le meilleur score historique et la moyenne par génération (tenant compte des fluctuations stochastiques naturelles).

---

## 3. Spécifications détaillées des curseurs interactifs

### Curseur 1 : Vitesse de simulation
1. **Nom affiché** : Vitesse de simulation (Cycles physiques par image)
2. **Statut** : **Existant à adapter** (remplacer le `createSlider` non étiqueté par un contrôle stylisé avec retour numérique).
3. **Plage (Min - Max)** : `1` à `20` (au lieu de 1 à 10 actuellement).
4. **Valeur initiale recommandée** : `1` (permet une vitesse temps réel à 60 FPS fluide et observable).
5. **Unité** : `x` (multiplicateur de cycles de calcul physique par frame d'affichage).
6. **Cible dans le code** : variable `speedSlider` / boucle `for (let n = 0; n < cycles; n++)` dans [sketch.js](../sketch.js#L99).
7. **Effet sur la simulation** : à 1x, le jeu s'exécute à vitesse réelle. À 10x ou 20x, le moteur calcule 20 fois les déplacements sans attendre, accélérant considérablement l'apprentissage génétique.
8. **Test de validation mesurable** :
   - Régler sur `1` et mesurer le temps nécessaire à l'extinction de 100 voitures novices sans franchissement (durée mesurée : environ 8 à 10 secondes).
   - Régler sur `10` : la même extinction complète de la génération doit s'exécuter en moins de 1,5 seconde chrono.

---

### Curseur 2 : Taux de mutation génétique
1. **Nom affiché** : Taux de mutation (`Mutation Rate`)
2. **Statut** : **À créer** (la constante `MUTATION_RATE = 0.1` doit devenir une variable dynamique).
3. **Plage (Min - Max)** : `0.00` (0%) à `0.50` (50%), avec un pas de `0.01` (plage débutant à 0.00 pour permettre le test de clonage pur).
4. **Valeur initiale recommandée** : `0.08` (8% est la valeur standard pour préserver les acquis tout en explorant).
5. **Unité** : `%` (probabilité de mutation par poids de synapse).
6. **Cible dans le code** : passée en argument à `child.mutate(taux)` dans [ga.js](../ga.js#L50) et exploitée dans [nn.js](../nn.js#L62).
7. **Effet sur la simulation** :
   - À `0.00` : clonage strict du champion sans aucune variation aléatoire.
   - Entre `0.05` et `0.12` : apprentissage optimal, équilibre entre exploitation des bonnes trajectoires et exploration.
   - À `0.50` : mutation agressive, comportement chaotique désapprenant les réflexes acquis.
8. **Test de validation mesurable** :
   - Régler à `0.00` : constater que toutes les voitures de la génération suivante reproduisent exactement la même trajectoire superposée que leur parent unique.
   - Régler à `0.50` : constater une dispersion totale des trajectoires dans toutes les directions dès la première seconde.

---

### Curseur 3 : Portée des capteurs laser
1. **Nom affiché** : Portée des capteurs (`Sensor Sight`)
2. **Statut** : **À créer** (la constante `SIGHT = 50` doit devenir une variable dynamique).
3. **Plage (Min - Max)** : `30 px` à `200 px`, avec un pas de `5 px`.
4. **Valeur initiale recommandée** : `100 px` (justification : la piste fait 60 px de large dans [sketch.js](../sketch.js#L40) ; avec 50 px, la voiture était aveugle au centre de la piste. 100 px permet d'anticiper le virage bien avant l'impact).
5. **Unité** : `pixels (px)`.
6. **Cible dans le code** : variable globale `SIGHT` affectant `this.sight` dans [vehicle.js](../vehicle.js#L18) et le tracé des rayons dans [ray.js](../ray.js#L29).
7. **Effet sur la simulation** : allonge la portée de vision des voitures. Les capteurs détectent les murs plus tôt, donnant au réseau de neurones une marge de manœuvre plus ample pour freiner ou braquer.
8. **Test de validation mesurable** :
   - Déplacer le curseur de 50 px à 150 px.
   - Observer visuellement que la longueur des rayons verts dessinés autour de la voiture de tête triple instantanément et que la détection d'impact s'active de plus loin.

---

### Curseur 4 : Taille de la population de voitures
1. **Nom affiché** : Taille de la population (`Total Cars`)
2. **Statut** : **À créer avec précaution** (actuellement `const TOTAL = 100`).
3. **Plage (Min - Max)** : `20` à `200` voitures, avec un pas de `10`.
4. **Valeur initiale recommandée** : `60` à `100` voitures.
5. **Unité** : `voitures / génération`.
6. **Cible dans le code** : variable globale `TOTAL` utilisée dans la boucle `setup()` et dans `nextGeneration()` ([ga.js](../ga.js#L11)).
7. **Effet sur la simulation** :
   - Plus de voitures = diversité génétique accrue et chances statistiques plus élevées de découvrir une bonne trajectoire, au prix d'une charge CPU accrue.
   - Moins de voitures = simulation ultra légère sur petits ordinateurs.
8. **Test de validation mesurable** :
   - Régler la valeur sur `30`.
   - Attendre la génération suivante : vérifier que le compteur de survivants démarre bien à 30 et non à 100.

---

## 4. Spécifications des boutons et commandes interactives

### Bouton A : Pause / Reprendre
- **Rôle** : Fige l'état de la simulation sans perdre la position des voitures ni les données acquises.
- **Mécanisme technique** : une variable booléenne `isPaused` dans [sketch.js](../sketch.js). Si `true`, la boucle `draw()` n'exécute pas la boucle de mise à jour physique mais continue d'afficher la scène.
- **Test de validation** : cliquer sur Pause $\rightarrow$ les voitures s'immobilisent net à l'écran. Cliquer à nouveau $\rightarrow$ elles reprennent leur course sans à-coup.

### Bouton B : Nouveau Circuit
- **Rôle** : Génère un nouveau tracé avec un nouveau germe aléatoire de Perlin noise tout en conservant ou en réinitialisant les cerveaux.
- **Mécanisme technique** : appelle explicitement `buildTrack()` et repositionne la flotte sur le nouveau point de départ.

### Bouton C : Réinitialiser la simulation
- **Rôle** : Remet le compteur de génération à 0 et instancie une toute nouvelle population avec des cerveaux vierges (poids aléatoires).
- **Mécanisme technique** : nettoie les mémoires TensorFlow via `dispose()`, remet `generationCount = 0` et génère de nouveaux véhicules.

### Sélecteur D : Mode d'affichage des capteurs (Rayons)
- **Options** :
  1. *Leader uniquement* (par défaut, pour préserver la clarté visuelle).
  2. *Toutes les voitures* (spectaculaire pour observer l'effet de nuée de capteurs).
  3. *Aucun* (vision épurée façon course automobile).

---

## 5. Prise en compte du caractère stochastique de l'IA

L'algorithme génétique étant fondamentalement probabiliste :
- **Ne pas attendre une progression strictement monotone à chaque génération** : la génération $N+1$ peut occasionnellement avoir une moyenne inférieure à la génération $N$ en raison de mutations défavorables.
- **Critères d'évaluation retenus** :
  1. **Le record absolu (*Best Fitness*)** : avec un mécanisme d'élitisme (le champion parent est conservé sans mutation), le score maximal historique ne peut jamais régresser.
  2. **La tendance de la moyenne mobile sur 5 générations** : l'apprentissage est considéré réussi si la moyenne mobile progresse sur une fenêtre de 10 à 15 générations.
