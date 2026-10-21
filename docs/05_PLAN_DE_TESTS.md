# Plan de tests et protocole de validation expérimentale

Ce document rassemble les fiches de tests reproductibles permettant de valider rigoureusement le comportement du jeu à chaque étape du développement.

> [!IMPORTANT]
> Pour chaque fiche de test :
> - Le **Résultat attendu** décrit le comportement théorique exact prévu par les spécifications.
> - Le **Résultat observé** doit rester vide ou marqué `[À renseigner après exécution]` tant que le test n'a pas été effectivement déroulé par l'étudiant. Ne jamais confondre un résultat attendu avec une observation réelle !

---

## 1. Tests d'initialisation et de démarrage

### TEST-01 : Démarrage de l'application et intégrité du chargement
- **Fichiers cibles** : [index.html](../index.html), [sketch.js](../sketch.js).
- **Préconditions** :
  - Un serveur HTTP local est actif sur le dossier du projet (ex: Live Server ou `python -m http.server 8000`).
  - Aucun fichier du projet n'est corrompu.
- **Actions à effectuer** :
  1. Ouvrir le navigateur à l'adresse locale du serveur (`http://localhost:8000` ou équivalent).
  2. Ouvrir la console développeur (touche F12 > onglet Console).
- **Résultat attendu** :
  - Le canvas de 1200x800 pixels apparaît avec le circuit généré (deux bordures fermées et des lignes de checkpoints bleues).
  - La population initiale de 100 voitures apparaît groupée sur la ligne de départ (`start`).
  - Aucune erreur rouge de type `404 Not Found` (scripts manquants) ou `ReferenceError` n'apparaît dans la console.
- **Résultat observé** :
  - Statut : `[ ] Non exécuté` / `[ ] Réussi` / `[ ] Échoué`
  - Date d'exécution : `...`
  - Notes et preuves constatées : `[À renseigner après exécution]`

---

## 2. Tests de déplacement, capteurs et collisions

### TEST-02 : Déplacement physique des véhicules
- **Fichiers cibles** : [vehicle.js](../vehicle.js#L75-L96).
- **Préconditions** : L'application vient d'être lancée (TEST-01 réussi).
- **Actions à effectuer** :
  1. Observer attentivement les voitures pendant les 2 premières secondes de la génération 0.
- **Résultat attendu** :
  - Les voitures se mettent en mouvement vers l'avant à partir du point de départ.
  - La vitesse de chaque véhicule est bornée par `maxspeed = 5`.
  - La trajectoire varie légèrement entre les individus en raison de l'initialisation aléatoire des poids de leurs réseaux de neurones.
- **Résultat observé** :
  - Statut : `[ ] Non exécuté` / `[ ] Réussi` / `[ ] Échoué`
  - Date d'exécution : `...`
  - Notes et preuves constatées : `[À renseigner après exécution]`

---

### TEST-03 : Raycasting et fonctionnement des capteurs
- **Fichiers cibles** : [ray.js](../ray.js#L35-L61), [vehicle.js](../vehicle.js#L142-L187).
- **Préconditions** : La simulation est en cours d'exécution.
- **Actions à effectuer** :
  1. Repérer la voiture leader mise en valeur en vert (`highlight()`).
  2. Suivre visuellement l'orientation de ses 6 rayons laser lorsqu'elle amorce un virage ou s'approche d'un mur.
- **Résultat attendu** :
  - Les 6 rayons tournent solidairement avec la voiture en suivant l'orientation de sa vitesse (`vel.heading()`).
  - Lorsqu'un rayon croise une bordure de circuit (`Boundary`), il s'arrête exactement à la surface du mur et ne le traverse pas.
  - La distance normalisée calculée pour l'entrée du réseau est comprise strictement entre `0.0` (obstacle hors de portée de vue) et `1.0` (obstacle au contact immédiat).
- **Résultat observé** :
  - Statut : `[ ] Non exécuté` / `[ ] Réussi` / `[ ] Échoué`
  - Date d'exécution : `...`
  - Notes et preuves constatées : `[À renseigner après exécution]`

---

### TEST-04 : Détection des collisions avec les barrières
- **Fichiers cibles** : [vehicle.js](../vehicle.js#L170-L173), [sketch.js](../sketch.js#L122-L128).
- **Préconditions** : La simulation tourne avec des voitures novices.
- **Actions à effectuer** :
  1. Suivre une voiture dont la trajectoire va heurter le mur extérieur ou intérieur.
- **Résultat attendu** :
  - Dès que la distance minimale mesurée avec un mur est inférieure à 5 pixels, la propriété `dead` de la voiture passe immédiatement à `true`.
  - La voiture s'arrête net et est retirée du tableau actif `population` pour être versée dans `savedVehicles`.
  - Le nombre de véhicules en piste diminue de façon visible.
- **Résultat observé** :
  - Statut : `[ ] Non exécuté` / `[ ] Réussi` / `[ ] Échoué`
  - Date d'exécution : `...`
  - Notes et preuves constatées : `[À renseigner après exécution]`

---

## 3. Tests des checkpoints et du système de score

### TEST-05 : Validation ordonnée des checkpoints
- **Fichiers cibles** : [vehicle.js](../vehicle.js#L100-L121).
- **Préconditions** : Au moins une voiture parvient à avancer vers le premier checkpoint bleu.
- **Actions à effectuer** :
  1. Observer le moment précis où le museau de la voiture leader franchit la ligne bleue de son checkpoint cible.
- **Résultat attendu** :
  - Dès que la distance point-ligne `pldistance` est inférieure à 5 pixels, `this.index` s'incrémente de 1.
  - Le score `this.fitness` de la voiture augmente exactement de 1 point.
  - Le compteur d'inactivité `this.counter` est remis à 0, accordant à la voiture un délai complet pour atteindre la balise suivante.
  - La ligne de checkpoint cible mise en valeur passe instantanément au checkpoint suivant.
- **Résultat observé** :
  - Statut : `[ ] Non exécuté` / `[ ] Réussi` / `[ ] Échoué`
  - Date d'exécution : `...`
  - Notes et preuves constatées : `[À renseigner après exécution]`

---

### TEST-06 : Calcul de la fitness et normalisation statistique
- **Fichiers cibles** : [vehicle.js](../vehicle.js#L124-L134), [ga.js](../ga.js#L55-L67).
- **Préconditions** : Une génération vient de s'éteindre complètement (`population.length == 0`).
- **Actions à effectuer** :
  1. Examiner l'exécution de `calculateFitnessForAllCars()`.
- **Résultat attendu** :
  - Chaque score de checkpoint est converti en valeur exponentielle `fitness = pow(2, fitness)`.
  - La somme de toutes les fitness normalisées vérifie mathématiquement : $\sum fitness_i = 1.0 \pm 0.0001$.
  - Une voiture ayant franchi 4 checkpoints reçoit une probabilité de sélection 4 fois supérieure à une voiture en ayant franchi 2 ($2^4 = 16$ contre $2^2 = 4$).
- **Résultat observé** :
  - Statut : `[ ] Non exécuté` / `[ ] Réussi` / `[ ] Échoué`
  - Date d'exécution : `...`
  - Notes et preuves constatées : `[À renseigner après exécution]`

---

## 4. Tests du réseau de neurones et de l'apprentissage génétique

### TEST-07 : Sélection, clonage et mutation synaptique
- **Fichiers cibles** : [ga.js](../ga.js#L28-L52), [nn.js](../nn.js#L39-L75).
- **Préconditions** : La fonction `nextGeneration()` est appelée.
- **Actions à effectuer** :
  1. Vérifier la création de la nouvelle flotte par tirage à la roulette et mutation.
- **Résultat attendu** :
  - Les cerveaux des nouvelles voitures conservent l'architecture exacte (6 entrées, 12 neurones cachés, 2 sorties).
  - Les poids synaptiques subissent de légères variations aléatoires gaussiennes conformes au taux de mutation.
  - Les anciens modèles TensorFlow sont correctement désalloués via `dispose()` sans fuite de tenseurs dans la mémoire du navigateur.
- **Résultat observé** :
  - Statut : `[ ] Non exécuté` / `[ ] Réussi` / `[ ] Échoué`
  - Date d'exécution : `...`
  - Notes et preuves constatées : `[À renseigner après exécution]`

---

### TEST-08 : Évaluation de l'apprentissage stochastique sur 15 générations
- **Fichiers cibles** : [sketch.js](../sketch.js), [ga.js](../ga.js).
- **Préconditions** : La stabilisation du circuit (T03) est en place (le circuit ne change pas entre les générations).
- **Actions à effectuer** :
  1. Lancer la simulation et accélérer la vitesse (vitesse = 10x).
  2. Noter le record de checkpoints franchis à la génération 0, à la génération 5, à la génération 10 et à la génération 15.
- **Résultat attendu** :
  - **Prise en compte du caractère stochastique** : des fluctuations mineures d'une génération isolée à l'autre sont normales.
  - **Critère de réussite mesurable** : Le record absolu de checkpoints franchis à la génération 15 est supérieur d'au moins 50% au record mesuré à la génération 0, démontrant une adaptation claire au tracé du circuit.
- **Résultat observé** :
  - Statut : `[ ] Non exécuté` / `[ ] Réussi` / `[ ] Échoué`
  - Date d'exécution : `...`
  - Record Gen 0 : `... checkpoints`
  - Record Gen 5 : `... checkpoints`
  - Record Gen 10 : `... checkpoints`
  - Record Gen 15 : `... checkpoints`
  - Notes et preuves constatées : `[À renseigner après exécution]`

---

## 5. Tests des commandes interactives et des curseurs

### TEST-09 : Réactivité des boutons et des curseurs
- **Fichiers cibles** : [index.html](../index.html), [sketch.js](../sketch.js).
- **Préconditions** : Les contrôles de l'interface utilisateur sont implémentés.
- **Actions à effectuer** :
  1. Cliquer sur le bouton **Pause** en pleine course, puis sur **Reprendre**.
  2. Déplacer le curseur de **Vitesse** de 1x à 10x.
  3. Déplacer le curseur de **Portée des capteurs** de 50 px à 150 px.
  4. Déplacer le curseur de **Taux de mutation** à 0.00, puis à 0.50.
- **Résultat attendu** :
  - *Pause* fige instantanément l'animation des voitures sans décalage ; *Reprendre* relance la course.
  - La vitesse 10x multiplie par 10 le rythme d'évolution sans saccade visuelle.
  - Les faisceaux verts du leader s'allongent instantanément de 50 à 150 px dès le déplacement du curseur.
  - À mutation 0.00, tous les enfants répliquent strictement la même trajectoire ; à 0.50, les trajectoires divergent fortement.
- **Résultat observé** :
  - Statut : `[ ] Non exécuté` / `[ ] Réussi` / `[ ] Échoué`
  - Date d'exécution : `...`
  - Notes et preuves constatées : `[À renseigner après exécution]`

---

## 6. Tests de performances et stabilité console

### TEST-10 : Endurance, fréquence d'images (FPS) et absence d'erreurs console
- **Fichiers cibles** : Ensemble de la solution logicielle.
- **Préconditions** : Le correctif T02 (suppression du `console.log`) est appliqué.
- **Actions à effectuer** :
  1. Laisser tourner la simulation pendant 20 générations consécutives en vitesse rapide (cycles = 10).
  2. Observer le compteur de FPS dans les outils développeurs et examiner le journal de la console.
- **Résultat attendu** :
  - Zéro message d'avertissement répétitif ou d'erreur non interceptée dans la console.
  - Cadence maintenue à 60 FPS en vitesse 1x.
  - La mémoire de l'onglet (Heap Memory) reste stable sans fuite continue de tenseurs TensorFlow.
- **Résultat observé** :
  - Statut : `[ ] Non exécuté` / `[ ] Réussi` / `[ ] Échoué`
  - Date d'exécution : `...`
  - FPS mesurés : `... FPS`
  - Nombre d'erreurs console : `...`
  - Notes et preuves constatées : `[À renseigner après exécution]`
