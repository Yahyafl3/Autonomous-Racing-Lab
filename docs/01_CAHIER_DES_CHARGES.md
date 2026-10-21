# Cahier des charges — Simulateur de Voitures Autonomes (IA Évolutive)

## 1. Présentation générale et contexte

Le projet **"9-VoitureSuitCircuit genetic algo"** est une application web interactive combinant :
- Un moteur physique 2D simplifié basé sur les comportements de pilotage (*Steering Behaviors* de Craig Reynolds).
- Un système de vision artificielle par lancer de rayons (*Raycasting* 2D).
- Un réseau de neurones artificiels (*Perceptron multicouche* via TensorFlow.js).
- Un algorithme d'apprentissage génétique inspiré de la sélection naturelle darwinienne.

L'objectif est d'entraîner une flotte de véhicules autonomes à naviguer le long d'un circuit sans heurter les barrières et en franchissant un maximum de points de passage (*checkpoints*).

Ce projet s'inscrit dans un cadre pédagogique (cours d'Intelligence Artificielle) où un étudiant débutant doit s'approprier le code, l'améliorer, l'optimiser graphiquement et être capable d'en expliquer chaque mécanisme lors d'une soutenance devant son professeur.

---

## 2. Utilisateurs cibles et cas d'usage

### Utilisateurs cibles
- **L'étudiant / développeur (auteur)** : comprend l'architecture, teste les hypothèses et valide les performances de l'algorithme.
- **Le professeur / évaluateur** : observe une démonstration fluide, claire et pédagogique, évalue la rigueur scientifique, la maîtrise des concepts et la clarté de l'interface.
- **Un observateur curieux / joueur** : explore les paramètres de l'IA (vitesse, mutation, capteurs), comprend visuellement ce que l'IA perçoit et peut même tester ses propres réflexes contre l'IA.

### Scénario d'usage attendu
1. **Lancement instantané** : l'utilisateur ouvre l'application dans un navigateur moderne sans configuration complexe.
2. **Observation de l'apprentissage** :
   - Génération 0 : les voitures se déplacent de façon erratique ; la plupart heurtent rapidement un mur.
   - Les meilleures voitures (celles qui ont franchi le plus de checkpoints) transmettent leurs caractéristiques synaptiques à la génération suivante avec de légères mutations.
   - En quelques générations, les voitures apprennent à négocier les virages et à boucler des tours complets.
3. **Interaction et expérimentation** :
   - L'utilisateur peut accélérer la simulation pour franchir 20 générations en quelques secondes.
   - Il peut mettre en pause pour analyser la trajectoire de la meilleure voiture et inspecter son réseau de neurones.
   - Il peut ajuster les paramètres (taux de mutation, portée des capteurs) et observer l'impact direct sur la survie.

---

## 3. État des lieux : Fonctionnalités déjà présentes dans le code

Une analyse rigoureuse du code source existant montre les fonctionnalités actives suivantes :

| Composant | État actuel | Référence code |
| :--- | :--- | :--- |
| **Génération de circuit** | Circuit procédural fermé généré via le bruit de Perlin (`p5.noise`), avec bordures intérieures et extérieures. | [sketch.js](../sketch.js#L33-L69) |
| **Système de checkpoints** | 60 segments transversaux le long du circuit pour détecter le franchissement et calculer la distance parcourue. | [sketch.js](../sketch.js#L43-L53) |
| **Capteurs laser (Raycasting)** | 6 rayons orientés entre -45° et +30° détectant la distance d'intersection avec les murs. | [vehicle.js](../vehicle.js#L26-L28), [ray.js](../ray.js#L35-L61) |
| **Réseau de neurones** | Architecture TensorFlow.js séquentielle : 6 entrées, 12 neurones cachés (activation sigmoïde), 2 sorties (angle et vitesse). | [nn.js](../nn.js#L96-L117) |
| **Algorithme génétique** | Sélection par la roulette pondérée par la fitness au carré, clonage et mutation gaussienne. | [ga.js](../ga.js#L4-L52) |
| **Contrôle de vitesse basique** | Un curseur HTML natif p5.js permettant de faire de 1 à 10 cycles de calcul par image. | [sketch.js](../sketch.js#L87) |
| **Mise en valeur du leader** | La meilleure voiture vivante de la génération courante est surlignée en vert avec ses rayons et son checkpoint cible affichés. | [sketch.js](../sketch.js#L159), [vehicle.js](../vehicle.js#L229-L247) |

---

## 4. Améliorations cibles souhaitées

### A. Fiabilité et stabilité algorithmique
- **Maintien du circuit pendant l'apprentissage** : ne plus réinitialiser le circuit à chaque extinction de génération afin de permettre une véritable convergence darwinienne.
- **Élimination des goulots d'étranglement** : supprimer les affichages continus en console (`console.log`) qui dégradent les performances.
- **Réglage du temps de vie (`LIFESPAN`) et de la portée de vision (`SIGHT`)** pour donner aux voitures le temps et l'anticipation nécessaires à la négociation des virages.

### B. Interface utilisateur (HUD) et ergonomie
- Tableau de bord moderne intégrant :
  - Compteur de génération.
  - Voitures restantes en vie / Population totale.
  - Score actuel et Record absolu de checkpoints.
  - Graphique léger traçant l'évolution du meilleur score au fil des générations (tenant compte du caractère probabiliste de l'évolution).
- Commandes interactives ergonomiques (Pause/Reprise, Réinitialisation, Changement volontaire de circuit).
- Curseurs interactifs avec retour visuel (taux de mutation, vitesse, portée des capteurs).

### C. Qualité visuelle et immersion (Design)
- Circuit travaillé : asphalte texturé, vibreurs bicolores en bordure, ligne de départ à damier.
- Voitures reconnaissables : remplacement du simple rectangle blanc par un tracé de bolide stylisé avec cockpit et roues, et teinte distinctive pour le champion.
- Rendu dynamique des capteurs : faisceaux semi-transparents dont la couleur change en fonction de l'imminence du danger (vert = voie libre, orange/rouge = mur proche).

### D. Fonctionnalités avancées (Perspectives)
- Sauvegarde locale (fichier JSON ou localStorage) du meilleur réseau de neurones pour recharger un modèle entraîné sans réapprendre de zéro.
- Mode interactif "Joueur contre IA" permettant de piloter une voiture au clavier aux côtés de la meilleure voiture autonome.

---

## 5. Contraintes techniques

1. **Environnement d'exécution** :
   - Application 100% exécutable côté client dans un navigateur moderne (Google Chrome, Firefox, Edge).
   - Dépendances actuelles déclarées dans [index.html](../index.html) :
     - `p5.js` v0.8.0 + `p5.dom.js`.
     - `TensorFlow.js` v1.1.0 (mode backend CPU configuré : `tf.setBackend('cpu')`).
2. **Contrainte d'intégrité du code existant** :
   - Travailler exclusivement dans l'arborescence du projet original.
   - Ne pas introduire de frameworks lourds ou de dépendances superflues (conserver du JavaScript Vanilla propre et lisible).
3. **Pédagogie et portabilité** :
   - Le code doit rester abondamment commenté en français.
   - Tous les liens et chemins de fichiers doivent être relatifs et portables sur n'importe quel ordinateur.
   - Chaque formule ou concept doit pouvoir être justifié lors d'une soutenance orale (calcul de distance point-ligne, calcul matriciel de réseau de neurones, roulette génétique).

---

## 6. Objectifs de la première version améliorée (V1)

La première étape de concrétisation visera :
1. **Un apprentissage fonctionnel avéré** : sur un circuit figé, constater que la tendance des checkpoints franchis augmente visiblement entre la génération 0 et la génération 10 (avec un record croissant).
2. **Zéro erreur console** et cadence fluide (60 images par seconde).
3. **Un tableau de bord lisible** avec statut de la simulation et contrôles essentiels (Play/Pause, Vitesse, Taux de mutation).
4. **Un visuel soigné** pour le circuit et les véhicules afin de rendre la démonstration attrayante et professionnelle.
