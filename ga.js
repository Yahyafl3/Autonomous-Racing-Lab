
// ==========================================================================
// ALGORITHME GÉNÉTIQUE : ÉLITISME, CROISEMENT & MUTATION GAUSSIENNE
// ==========================================================================

function nextGeneration() {
  if (savedVehicles.length === 0) return;
  if (typeof vehicleVisualSequence !== 'undefined') vehicleVisualSequence = 0;

  // 1. Calcul de la fitness continue de chaque véhicule
  calculateFitnessForAllCars();

  // 2. Classement de la génération par fitness décroissante (du meilleur au moins bon)
  savedVehicles.sort((a, b) => b.fitness - a.fitness);

  const targetTotal = (typeof TOTAL !== 'undefined') ? TOTAL : 100;
  population = [];

  // 3. ÉLITISME STRICT : Conserver les 3 meilleurs individus intacts sans mutation
  const eliteCount = Math.min(3, savedVehicles.length);
  for (let i = 0; i < eliteCount; i++) {
    if (savedVehicles[i] && savedVehicles[i].brain) {
      population.push(new Vehicle(savedVehicles[i].brain));
    }
  }

  // 4. Bassin de reproduction (Mating Pool) constitué des 40% meilleurs individus
  const poolSize = Math.max(3, Math.floor(savedVehicles.length * 0.4));
  const matingPool = savedVehicles.slice(0, poolSize);

  // 5. CROISEMENT ET MUTATION pour renouveler le reste de la population
  const currentMutation = (typeof MUTATION_RATE !== 'undefined') ? MUTATION_RATE : 0.08;

  while (population.length < targetTotal) {
    const parentA = tournamentSelect(matingPool, 3);
    const parentB = tournamentSelect(matingPool, 3);

    let childBrain;
    // 75% de chance de croisement génétique si deux parents distincts
    if (parentA !== parentB && parentA.brain && parentB.brain && Math.random() < 0.75) {
      childBrain = parentA.brain.crossover(parentB.brain);
    } else if (parentA && parentA.brain) {
      childBrain = parentA.brain.copy();
    }

    const child = new Vehicle(childBrain);
    if (childBrain && typeof childBrain.dispose === 'function') {
      try {
        childBrain.dispose();
      } catch (e) {
        // Ignorer l'erreur d'optimizer non-compilé de tfjs 1.1.0
      }
    }
    child.mutate(currentMutation);
    population.push(child);
  }

  generationPopulationSize = targetTotal;

  // 6. Nettoyage mémoire de tous les anciens modèles TensorFlow.js
  for (let v of savedVehicles) {
    try {
      v.dispose();
    } catch (e) {
      // Ignorer l'erreur d'optimizer non-compilé de tfjs 1.1.0
    }
  }
  savedVehicles = [];
}

// Sélection par tournoi dans le pool d'élite
function tournamentSelect(pool, k = 3) {
  if (pool.length === 0) return new Vehicle();
  let best = pool[Math.floor(Math.random() * pool.length)];
  for (let i = 1; i < k; i++) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  return best;
}

// Sélection stochastique par roulette pour compatibilité
function pickOne() {
  if (savedVehicles.length === 0) return new Vehicle();
  const topPool = savedVehicles.slice(0, Math.max(2, Math.floor(savedVehicles.length * 0.4)));
  return tournamentSelect(topPool, 3);
}

// Normalisation des poids de sélection
function calculateFitnessForAllCars() {
  let sum = 0;
  for (let vehicle of savedVehicles) {
    vehicle.selectionWeight = vehicle.calculateFitness ? vehicle.calculateFitness() : vehicle.checkpointsCount;
    sum += vehicle.selectionWeight;
  }

  if (sum <= 0 || isNaN(sum)) {
    const defaultProb = 1 / savedVehicles.length;
    for (let vehicle of savedVehicles) {
      vehicle.normalizedFitness = defaultProb;
    }
  } else {
    for (let vehicle of savedVehicles) {
      vehicle.normalizedFitness = vehicle.selectionWeight / sum;
    }
  }
}
