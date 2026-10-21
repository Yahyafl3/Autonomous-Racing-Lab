# Plan de développement progressif des tâches (T01 à T09)

Ce document détaille chaque étape du projet, organisée dans l'ordre strict des dépendances techniques. Chaque tâche est conçue pour être réalisée et validée de manière autonome avant d'aborder la suivante.

---

### T01-ORIG — Lancement et comportement du jeu original avant toute modification
- **Objectif** : Vérifier le comportement réel du jeu dans son état d'origine, consigner les métriques de base (*baseline*) et constater les anomalies identifiées sans modifier une seule ligne de code.
- **Fichiers concernés** : [index.html](../index.html), [sketch.js](../sketch.js), [vehicle.js](../vehicle.js), [nn.js](../nn.js), [ga.js](../ga.js).
- **Ce que je dois apprendre** : Comment lancer un serveur HTTP local (Live Server ou Python), comment ouvrir et interpréter les DevTools du navigateur (onglets Console, Réseau et Performances), et comment observer le comportement initial des 100 voitures.
- **Modifications prévues** : **Aucune**. Le code original doit être exécuté tel quel.
- **Étapes de réalisation** :
  1. Démarrer un serveur local et ouvrir `index.html` dans le navigateur.
  2. Ouvrir la console développeur (F12) et observer les messages générés en continu.
  3. Mesurer le nombre de FPS initiaux et chronométrer la durée de vie d'une génération.
  4. Constater visuellement la régénération complète du circuit lors du passage à la génération 1.
- **Comment tester la modification** : Laisser tourner 3 générations et enregistrer les observations factuelles dans le journal de test.
- **Critères précis de réussite** : Les métriques de départ sont notées avec précision (taux de FPS, saturation de la console par `outputs`, temps moyen avant extinction).
- **Dépendances** : Aucune (point de départ absolu).

---

### T02 — Fiabilité fondamentale et élimination du goulot d'étranglement console
- **Objectif** : Stabiliser le moteur physique, éliminer le ralentissement massif causé par l'écriture continue en console et sécuriser l'affichage de la voiture championne.
- **Fichiers concernés** : [nn.js](../nn.js), [sketch.js](../sketch.js), [vehicle.js](../vehicle.js).
- **Ce que je dois apprendre** : Le coût prohibitif des opérations d'entrée/sortie (`I/O`) en boucle de rendu 60 FPS, la gestion des exceptions et la vérification des références nulles/indéfinies en JavaScript.
- **Modifications prévues** :
  - Supprimer le `console.log(outputs)` dans [nn.js](../nn.js#L91).
  - Sécuriser l'appel `bestP.highlight()` dans [sketch.js](../sketch.js#L159) avec une condition de garde `if (bestP) { ... }` pour éviter tout crash si la population est vide.
  - Ajuster `LIFESPAN` dans [sketch.js](../sketch.js#L5) pour passer de 25 frames (trop punitif, ~0,4 s) à une valeur plus réaliste (60 à 80 frames, soit ~1 à 1,3 s).
- **Étapes de réalisation** :
  1. Éditer `nn.js` pour retirer la ligne d'affichage console.
  2. Éditer `sketch.js` pour ajouter la protection sur `bestP`.
  3. Mettre à jour `LIFESPAN` et tester la fluidité.
- **Comment tester la modification** : Ouvrir la console F12 et laisser tourner 5 générations complètes.
- **Critères précis de réussite** : Zéro message `outputs` dans la console, aucune erreur `Cannot read property of undefined`, 60 FPS maintenus de façon constante.
- **Dépendances** : T01-ORIG.

---

### T03 — Stabilisation du circuit et élitisme génétique
- **Objectif** : Permettre un véritable apprentissage évolutif en maintenant le circuit fixe et en garantissant que les acquis des meilleurs pilotes ne soient jamais perdus.
- **Fichiers concernés** : [sketch.js](../sketch.js), [ga.js](../ga.js).
- **Ce que je dois apprendre** : Le principe de convergence darwinienne en environnement stable, la notion d'optimum local, et le mécanisme d'élitisme (conserver le champion d'une génération sans mutation).
- **Modifications prévues** :
  - Déplacer ou conditionner l'appel à `buildTrack()` dans [sketch.js](../sketch.js#L132) pour que le circuit ne soit PAS recréé à chaque génération.
  - Dans [ga.js](../ga.js), implémenter l'élitisme : l'individu ayant la fitness maximale est cloné en position 0 de la nouvelle population sans lui appliquer de mutation.
- **Étapes de réalisation** :
  1. Supprimer `buildTrack()` de la condition d'extinction de population dans `sketch.js`.
  2. Adapter `nextGeneration()` dans `ga.js` pour préserver le champion historique.
- **Comment tester la modification** : Lancer la simulation sur 10 générations d'affilée sans toucher à la page.
- **Critères précis de réussite** : Le circuit reste identique entre les générations 0 et 10, et le score record franchi progresse ou reste constant (aucune régression du record absolu grâce à l'élitisme).
- **Dépendances** : T02.

---

### T04 — Optimisation des capteurs et franchissement des checkpoints
- **Objectif** : Élargir le champ de vision des voitures pour leur permettre d'anticiper les virages et fiabiliser la détection de passage de chaque checkpoint.
- **Fichiers concernés** : [vehicle.js](../vehicle.js), [ray.js](../ray.js), [sketch.js](../sketch.js).
- **Ce que je dois apprendre** : Comment fonctionne la projection vectorielle pour calculer la distance point-ligne (`pldistance`), comment normaliser une distance continue entre 0 et 1, et l'impact de la portée de vision sur la réactivité d'un réseau de neurones.
- **Modifications prévues** :
  - Ajuster la constante de vision `SIGHT` (la passer de 50 px à 100 px pour dépasser la largeur de piste de 60 px).
  - Harmoniser la formule de normalisation d'entrée du réseau `map(record, 0, this.sight, 1, 0)`.
  - Vérifier que la rotation des rayons suit parfaitement l'angle de braquage de la voiture.
- **Étapes de réalisation** :
  1. Modifier `SIGHT` dans `sketch.js`.
  2. Ajuster l'instanciation de `this.sight` dans `vehicle.js`.
  3. Vérifier le comportement des capteurs en virage serré.
- **Comment tester la modification** : Observer les rayons verts de la voiture leader : vérifier qu'ils touchent les murs opposés dès l'entrée dans le virage.
- **Critères précis de réussite** : Les capteurs détectent les obstacles à au moins 80-100 px, et les checkpoints s'incrémentent sans saut anormal ni blocage.
- **Dépendances** : T03.

---

### T05 — Tableau de bord (HUD) et commandes interactives de base
- **Objectif** : Fournir une interface utilisateur claire avec les métriques essentielles (génération, survivants, score, record) et les contrôles de flux indispensables (Pause, Nouveau Circuit, Reset).
- **Fichiers concernés** : [index.html](../index.html), [sketch.js](../sketch.js).
- **Ce que je dois apprendre** : L'intégration d'éléments d'interface HTML/CSS par-dessus un canvas p5.js, la gestion des états de simulation (Variable d'état `isPaused`), et la liaison d'événements JavaScript (`addEventListener`).
- **Modifications prévues** :
  - Ajouter un conteneur HUD en overlay affichant : Génération, Voitures vivantes / Total, Score actuel du leader, Meilleur score absolu.
  - Ajouter les boutons : *Pause / Reprendre*, *Nouveau Circuit*, *Réinitialiser*.
  - Gérer l'état de pause dans la boucle `draw()` de `sketch.js`.
- **Étapes de réalisation** :
  1. Créer la structure HTML du bandeau HUD et des boutons dans `index.html`.
  2. Styliser le panneau avec une esthétique soignée (fond sombre semi-transparent).
  3. Câbler les fonctions de callback dans `sketch.js`.
- **Comment tester la modification** :
  - Cliquer sur *Pause* : constater l'arrêt immédiat des voitures à l'écran.
  - Cliquer sur *Nouveau Circuit* : constater le renouvellement du tracé.
  - Vérifier que le compteur de survivants diminue à chaque crash en temps réel.
- **Critères précis de réussite** : Tous les boutons répondent instantanément, les chiffres du HUD sont rigoureusement exacts et synchronisés à 60 FPS.
- **Dépendances** : T04.

---

### T06 — Curseurs interactifs configurables en temps réel
- **Objectif** : Rendre la simulation totalement paramétrable via 4 curseurs fonctionnels (Vitesse, Mutation, Portée capteurs, Population).
- **Fichiers concernés** : [index.html](../index.html), [sketch.js](../sketch.js), [ga.js](../ga.js), [vehicle.js](../vehicle.js).
- **Ce que je dois apprendre** : La synchronisation bidirectionnelle entre champs de formulaire (`<input type="range">`) et variables de calcul d'une boucle physique.
- **Modifications prévues** :
  - Intégrer les 4 curseurs avec leurs valeurs min/max, étiquettes et affichage dynamique de la valeur courante.
  - Relier la vitesse physique (1x à 20x).
  - Relier le taux de mutation dynamique (0% à 50%).
  - Relier la portée dynamique des capteurs (30 à 200 px).
  - Relier la taille de population pour la génération suivante (20 à 200).
- **Étapes de réalisation** :
  1. Ajouter les curseurs HTML et leurs balises `<span id="valeur">`.
  2. Écouter les événements `'input'` pour mettre à jour les variables globales.
  3. Mettre à jour dynamiquement `this.sight` sur les voitures actives lors du déplacement du curseur de vision.
- **Comment tester la modification** : Appliquer les tests unitaires mesurables spécifiés dans [03_SPECIFICATIONS_INTERFACE.md](03_SPECIFICATIONS_INTERFACE.md).
- **Critères précis de réussite** : Chaque curseur produit l'effet mécanique attendu sans rechargement de page.
- **Dépendances** : T05.

---

### T07 — Amélioration du design graphique et rendu visuel du jeu
- **Objectif** : Transformer l'aspect visuel brut (lignes blanches sur fond noir, rectangles blancs) en un jeu de course élégant et captivant.
- **Fichiers concernés** : [sketch.js](../sketch.js), [vehicle.js](../vehicle.js), [ray.js](../ray.js), fichier de style CSS.
- **Ce que je dois apprendre** : Le dessin vectoriel stylisé en p5.js (`beginShape`, `curveVertex`, transparence alpha `rgba`, modes de fusion), les palettes de couleurs harmonieuses et l'ergonomie visuelle.
- **Modifications prévues** :
  - Tracé du circuit : texture asphalte gris anthracite, vibreurs bicolores rouge/blanc sur les bordures, ligne de départ à damier noir et blanc.
  - Tracé des voitures : silhouette aérodynamique de bolide avec roues et cockpit, distinction visuelle forte du champion (teinte néon vive).
  - Rendu des capteurs : faisceaux semi-transparents avec dégradé d'alerte (vert = libre, orange = approche, rouge = danger imminent).
- **Étapes de réalisation** :
  1. Réécrire la méthode de rendu du circuit dans `sketch.js`.
  2. Enrichir la méthode `show()` et `highlight()` de `Vehicle`.
  3. Ajouter des effets de lueur sur les capteurs du leader.
- **Comment tester la modification** : Lancer la simulation et vérifier visuellement le rendu sous différents angles et vitesses.
- **Critères précis de réussite** : Le rendu visuel fait l'effet d'un jeu fini et soigné, sans aucune baisse de framerate sous 60 FPS en vitesse 1x.
- **Dépendances** : T06.

---

### T08 — Mini-graphique de progression et sauvegarde du cerveau champion
- **Objectif** : Visualiser l'historique d'apprentissage sur un graphique d'évolution et permettre la sauvegarde/recharge du meilleur modèle d'IA.
- **Fichiers concernés** : [index.html](../index.html), [sketch.js](../sketch.js), [nn.js](../nn.js).
- **Ce que je dois apprendre** : La sérialisation d'objets JSON en JavaScript, l'API `localStorage` ou le téléchargement de fichier Blob, et le tracé d'un graphique dynamique simple avec p5.js ou canvas 2D.
- **Modifications prévues** :
  - Dessiner un mini-graphique dans le panneau latéral traçant le score max et la moyenne sur les 30 dernières générations.
  - Ajouter un bouton *Télécharger le champion* (export des poids synaptiques au format JSON).
  - Ajouter un bouton *Charger un champion* (import d'un fichier JSON pour réinjecter le cerveau dans la population).
- **Étapes de réalisation** :
  1. Enregistrer dans un tableau d'historique `history = []` le meilleur score de chaque génération.
  2. Implémenter la fonction de tracé du graphique.
  3. Implémenter l'extraction et la réinjection des poids synaptiques.
- **Comment tester la modification** : Entraîner une génération jusqu'à un bon score, exporter le fichier JSON, réinitialiser la simulation à zéro, importer le fichier et vérifier que les voitures adoptent immédiatement le comportement expert.
- **Critères précis de réussite** : Export et réimport fonctionnels sans erreur TensorFlow.js, graphique de suivi lisible et cohérent.
- **Dépendances** : T07.

---

### T09 — Validation globale du plan de tests et préparation de la soutenance
- **Objectif** : Exécuter l'intégralité des tests de validation du plan [05_PLAN_DE_TESTS.md](05_PLAN_DE_TESTS.md), consigner les résultats finaux et s'entraîner à présenter le projet devant le professeur.
- **Fichiers concernés** : Ensemble des fichiers du projet et dossier `docs/`.
- **Ce que je dois apprendre** : Savoir expliquer avec des mots simples chaque notion clé (Steering Behaviors, Raycasting, Tenseurs, Poids synaptiques, Fonction d'activation Sigmoïde, Roulette stochastique, Bruit gaussien).
- **Modifications prévues** : Renseignement des cases de résultats observés dans le plan de tests, derniers nettoyages de commentaires dans le code.
- **Étapes de réalisation** :
  1. Dérouler méthodiquement les 10 tests de `05_PLAN_DE_TESTS.md`.
  2. Renseigner les fiches de tests avec les preuves recueillies.
  3. Répéter la démonstration orale type en 5 minutes : Lancement $\rightarrow$ Explication du principe $\rightarrow$ Démonstration de l'apprentissage $\rightarrow$ Manipulation des curseurs $\rightarrow$ Démonstration du champion sauvegardé.
- **Comment tester la modification** : Répétition générale chronométrée de la présentation.
- **Critères précis de réussite** : Tous les tests sont validés [OK], zéro régression, l'étudiant est capable de répondre avec aisance à toutes les questions techniques sur son code.
- **Dépendances** : T08.
