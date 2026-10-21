// ==========================================================================
// AUTONOMOUS RACING LAB — SIMULATION ET MOTEUR GRAPHIQUE
// Intelligence Artificielle Évolutive & Pilotage Autonome (p5.js + tf.js)
// ==========================================================================

// Variables de configuration et d'apprentissage
let TOTAL = 100;
let generationPopulationSize = TOTAL;
let MUTATION_RATE = 0.08;
let LIFESPAN = 750;
let SIGHT = 100;
let simulationSpeed = 1;
let isPaused = false;

// Mode de gestion des circuits ('training' : circuit fixe | 'randomChallenge' : circuit changeant)
let trackMode = 'training';
let currentTrackIndex = 1;

// Mode d'affichage des capteurs laser ('leader' | 'all' | 'none')
let sensorDisplayMode = 'leader';

// Mode de caméra et zoom dynamique fluide (Req 4 : Vue 3ème personne principale en course, Vue libre globale au démarrage)
let cameraMode = 'free';
let camX = 0;
let camY = 0;
let camZoom = 1.0;
let targetCamZoom = 1.0;
let targetCamX = 0;
let targetCamY = 0;
let camRotation = 0;
let targetCamRotation = 0;
let selectedVehicle = null;
let currentLeaderCar = null;

// Trois modes de fonctionnement (Mode IA / Mode Manuel / Mode Débogage)
let currentDrivingMode = 'ai'; // 'ai' | 'manual'
let manualVehicle = null;
let manualInputState = { up: false, down: false, left: false, right: false, handbrake: false };
let debugMode = false;
let isDebugMode = false;

// Visualiseur du Réseau de Neurones en Direct (IA Synaptique)
let neuralModalOpen = false;
let neuralTargetMode = 'champion'; // 'champion' | 'selected' | 'manual'
let neuralAnimPhase = 0;
let neuralSignalParticles = [];

// Télémétrie et métriques
let generationCount = 1;
let currentBestFitness = 0;
let allTimeBestFitness = 0;
let generationHistory = []; // { gen: number, best: number, avg: number, min: number, record: number }
let currentGenLiveSamples = []; // Échantillons temps réel de la génération active [{ time: number, best: number, avg: number, min: number }]
let liveSampleFrameCounter = 0;

// Configuration des Steering Behaviors combinés (Craig Reynolds)
let STEERING_CONFIG = {
  seekEnabled: true,
  sepEnabled: true,
  avoidEnabled: true,
  alignEnabled: true,
  cohesionEnabled: true,
  maxspeed: 6.0,
  maxforce: 0.28,
  weightSeek: 1.0,
  weightSep: 1.5,
  weightAvoid: 1.6,
  weightAlign: 0.6,
  weightCohesion: 0.2,
  separationRadius: 40
};

// Éléments géométriques du circuit
let walls = [];
let inside = [];
let outside = [];
let checkpoints = [];
let start, end, startHeading = 0;
let trackScenery = [];
let terrainLayer;
let terrainMargin = 850;
let totalSessionElapsed = 0;
let stageAttemptElapsed = 0;

// Flotte de véhicules
let population = [];
let savedVehicles = [];

// Chargement des fonds d'environnement des circuits
function loadPhotoAssets() {
  if (typeof CircuitRegistry !== 'undefined' && typeof CircuitRegistry.preloadBackgrounds === 'function') {
    CircuitRegistry.preloadBackgrounds();
  }
}

// ==========================================================================
// CONFIGURATION DU CHAMPIONNAT : 5 STAGES & CIRCUITS DISTINCTS
// ==========================================================================
// CONFIGURATION DES 5 STAGES DU CHAMPIONNAT (CIRCUITS RÉALISTES PROFESSIONNELS)
// ==========================================================================
const STAGES = [
  {
    id: 'stage-1',
    circuitId: 'coastal',
    name: 'Circuit Pro Grand Prix',
    stageNumber: 1,
    targetLaps: 3,
    pathWidth: 92,
    baseWidth: 92,
    wideWidth: 128,
    seed: 101,
    stars: '★☆☆☆☆',
    theme: {
      name: 'Circuit Pro Grand Prix',
      primaryColor: '#00D084',
      asphaltColor: '#171e28',
      wallColor: '#00D084',
      curbPrimary: '#dc2626',
      curbSecondary: '#f8fafc',
      gravelColor: '#c8a35e'
    },
    description: 'Complexe automobile professionnel moderne : immense ligne droite des stands multivoies, courbe parabolique fluide et chicanes rapides.'
  },
  {
    id: 'stage-2',
    circuitId: 'desert',
    name: 'Mojave Canyon Raceway',
    stageNumber: 2,
    targetLaps: 5,
    pathWidth: 90,
    baseWidth: 90,
    wideWidth: 130,
    seed: 202,
    stars: '★★☆☆☆',
    theme: {
      name: 'Mojave Canyon Raceway',
      primaryColor: '#ff8800',
      asphaltColor: '#1c1512',
      wallColor: '#ff8800',
      curbPrimary: '#f59e0b',
      curbSecondary: '#fef3c7',
      gravelColor: '#b45309'
    },
    description: 'Immense gorge désertique avec longue ligne droite de pointe à 3 voies, virages relevés et épingle de dépassement.'
  },
  {
    id: 'stage-3',
    circuitId: 'forest',
    name: 'Schwarzwald GP',
    stageNumber: 3,
    targetLaps: 7,
    pathWidth: 88,
    baseWidth: 88,
    wideWidth: 124,
    seed: 303,
    stars: '★★★☆☆',
    theme: {
      name: 'Schwarzwald GP',
      primaryColor: '#10b981',
      asphaltColor: '#131916',
      wallColor: '#10b981',
      curbPrimary: '#16a34a',
      curbSecondary: '#f8fafc',
      gravelColor: '#78716c'
    },
    description: 'Grand circuit alpin à travers la forêt noire, carrousel ondulant, enchaînement d’esses et chicane de descente.'
  },
  {
    id: 'stage-4',
    circuitId: 'urban',
    name: 'Marina Bay Urban Circuit',
    stageNumber: 4,
    targetLaps: 10,
    pathWidth: 88,
    baseWidth: 88,
    wideWidth: 126,
    seed: 404,
    stars: '★★★★☆',
    theme: {
      name: 'Marina Bay Urban Circuit',
      primaryColor: '#06b6d4',
      asphaltColor: '#0e1726',
      wallColor: '#06b6d4',
      curbPrimary: '#0284c7',
      curbSecondary: '#f8fafc',
      gravelColor: '#475569'
    },
    description: 'Tracé urbain grandiose : grands boulevards multivoies, virages à 90°, pont architectural et chicane du port.'
  },
  {
    id: 'stage-5',
    circuitId: 'competition',
    name: 'Silverstone Grand Prix',
    stageNumber: 5,
    targetLaps: 15,
    pathWidth: 95,
    baseWidth: 95,
    wideWidth: 132,
    seed: 505,
    stars: '★★★★★',
    theme: {
      name: 'Silverstone Grand Prix',
      primaryColor: '#f59e0b',
      asphaltColor: '#171b26',
      wallColor: '#f59e0b',
      curbPrimary: '#dc2626',
      curbSecondary: '#ffffff',
      gravelColor: '#d97706'
    },
    description: 'Le temple FIA de la vitesse : immense ligne droite des stands à 3 voies, Esses rapides de Maggots et courbe Parabolique.'
  }
];

// État de course centralisé : 'ready' | 'racing' | 'finished'
let raceState = 'racing';
let currentStageIndex = 0;
let currentStage = STAGES[0];
let currentWinner = null;
let unlockedStages = ['stage-1'];
let stageRecords = {};
const PROGRESSION_STORAGE_KEY = 'autonomous_racing_lab_progression';

// ==========================================================================
// GRILLE DE DÉPART DE COURSE AUTOMOBILE (FORMULA STARTING GRID)
// Calcul géométrique précis, placement échelonné en quinconce (2 colonnes),
// orientation selon le tracé réel, immobilisation au départ et marquages au sol.
// ==========================================================================

const StartingGrid = {
  config: {
    baseDist: 28.0,     // Distance de P1 derrière la ligne d'arrivée / départ
    laneT0: 0.28,       // Colonne 1 (Intérieur / Pôle) : 28% de la largeur de piste
    laneT1: 0.72,       // Colonne 2 (Extérieur) : 72% de la largeur de piste
    minRowDist: 28.0,   // Espacement minimum garanti entre rangées
    maxRowDist: 50.0    // Espacement standard optimal (voiture 36px => large marge de sécurité)
  },

  // Détermination mathématique de la portion rectiligne optimale du circuit pour la grille de départ
  getStartLineIndex(cps) {
    return 0;
  },

  // Calcul rigoureux des coordonnées d'un emplacement de départ sur le tracé réel
  getSlot(idx, cps, totalCars = 20) {
    if (!cps || cps.length === 0) {
      return { x: 0, y: 0, heading: 0, targetIndex: 0, slot: idx + 1, row: 0, col: 0, laneT: 0.5 };
    }

    const N = cps.length;
    const col = idx % 2; // 0 = Pôle / Intérieur, 1 = Extérieur
    const row = Math.floor(idx / 2);
    const count = Math.max(1, totalCars || (typeof population !== 'undefined' ? population.length : 20));
    const totalRows = Math.ceil(count / 2);

    // Calcul du périmètre total du circuit le long de la ligne médiane
    let circuitLen = 0;
    for (let i = 0; i < N; i++) {
      const m1 = cps[i].midpoint ? cps[i].midpoint() : { x: (cps[i].a.x + cps[i].b.x) / 2, y: (cps[i].a.y + cps[i].b.y) / 2 };
      const m2 = cps[(i + 1) % N].midpoint ? cps[(i + 1) % N].midpoint() : { x: (cps[(i + 1) % N].a.x + cps[(i + 1) % N].b.x) / 2, y: (cps[(i + 1) % N].a.y + cps[(i + 1) % N].b.y) / 2 };
      circuitLen += Math.hypot(m2.x - m1.x, m2.y - m1.y);
    }
    circuitLen = Math.max(1000, circuitLen);

    // Espacement adaptatif pour garantir l'absence de chevauchement quelle que soit la taille de la flotte
    const maxGridSpan = circuitLen * 0.40;
    const rowDist = Math.max(this.config.minRowDist, Math.min(this.config.maxRowDist, maxGridSpan / totalRows));
    const staggerDist = rowDist * 0.50; // Décalage en quinconce F1 réaliste

    // Distance cumulée en arrière de la ligne de départ (située sur la ligne droite du circuit)
    const targetDist = this.config.baseDist + row * rowDist + (col === 1 ? staggerDist : 0);

    const startLineIdx = this.getStartLineIndex(cps);
    let accumulated = 0;
    let currIdx = startLineIdx;
    let slotData = null;

    // Remonter le circuit le long des segments pour positionner le bolide sur la géométrie exacte de la piste
    for (let step = 0; step < N * 2; step++) {
      const prevIdx = (currIdx - 1 + N) % N;
      const cpCurr = cps[currIdx];
      const cpPrev = cps[prevIdx];
      const mCurr = cpCurr.midpoint ? cpCurr.midpoint() : { x: (cpCurr.a.x + cpCurr.b.x) / 2, y: (cpCurr.a.y + cpCurr.b.y) / 2 };
      const mPrev = cpPrev.midpoint ? cpPrev.midpoint() : { x: (cpPrev.a.x + cpPrev.b.x) / 2, y: (cpPrev.a.y + cpPrev.b.y) / 2 };
      const segLen = Math.hypot(mCurr.x - mPrev.x, mCurr.y - mPrev.y) || 1;

      if (accumulated + segLen >= targetDist) {
        const frac = (targetDist - accumulated) / segLen;
        const inX = cpCurr.a.x * (1 - frac) + cpPrev.a.x * frac;
        const inY = cpCurr.a.y * (1 - frac) + cpPrev.a.y * frac;
        const outX = cpCurr.b.x * (1 - frac) + cpPrev.b.x * frac;
        const outY = cpCurr.b.y * (1 - frac) + cpPrev.b.y * frac;

        const laneT = (col === 0) ? this.config.laneT0 : this.config.laneT1;
        const posX = inX + (outX - inX) * laneT;
        const posY = inY + (outY - inY) * laneT;
        const heading = Math.atan2(mCurr.y - mPrev.y, mCurr.x - mPrev.x);

        slotData = {
          x: posX,
          y: posY,
          heading: heading,
          targetIndex: currIdx,
          slot: idx + 1,
          row: row,
          col: col,
          laneT: laneT,
          rowDist: rowDist,
          inPt: { x: inX, y: inY },
          outPt: { x: outX, y: outY },
          trackWidth: Math.hypot(outX - inX, outY - inY)
        };
        break;
      }

      accumulated += segLen;
      currIdx = prevIdx;
    }

    if (!slotData) {
      const cp0 = cps[0];
      const laneT = (col === 0) ? this.config.laneT0 : this.config.laneT1;
      const pA = cp0.a;
      const pB = cp0.b;
      slotData = {
        x: pA.x + (pB.x - pA.x) * laneT,
        y: pA.y + (pB.y - pA.y) * laneT,
        heading: (typeof startHeading !== 'undefined') ? startHeading : 0,
        targetIndex: 1,
        slot: idx + 1,
        row: row,
        col: col,
        laneT: laneT,
        rowDist: this.config.maxRowDist,
        inPt: pA,
        outPt: pB,
        trackWidth: Math.hypot(pB.x - pA.x, pB.y - pA.y)
      };
    }

    return slotData;
  },

  // Alignement physique et réinitialisation de toutes les voitures de la flotte sur la grille
  positionCars(vehicles, cps) {
    if (!vehicles || vehicles.length === 0 || !cps || cps.length === 0) return;
    const totalCount = vehicles.length;

    for (let i = 0; i < totalCount; i++) {
      const v = vehicles[i];
      if (!v) continue;

      const slot = this.getSlot(i, cps, totalCount);
      if (v.pos && typeof v.pos.set === 'function') {
        v.pos.set(slot.x, slot.y);
      } else {
        v.pos = createVector(slot.x, slot.y);
      }
      if (v.prevPos && typeof v.prevPos.set === 'function') {
        v.prevPos.set(slot.x, slot.y);
      } else {
        v.prevPos = createVector(slot.x, slot.y);
      }
      v.heading = slot.heading;
      v.index = slot.targetIndex;
      v.speed = 0;
      if (v.vel && typeof v.vel.set === 'function') {
        v.vel.set(0, 0);
      } else {
        v.vel = createVector(0, 0);
      }
      v.dead = false;
      v.finished = false;
      v.health = 100;
      v.eliminationReason = null;
      v.counter = -slot.row * 20;
      v.trail = [];
      v.distanceTravelled = 0;
      v.checkpointsCount = 0;
      v.lapsCompleted = 0;
      v.lapCheckpointsCount = 0;
      v.gridSlot = i;

      // Orientation exacte de tous les faisceaux laser selon le cap de départ
      if (v.rays && Array.isArray(v.rays)) {
        for (let r = 0; r < v.rays.length; r++) {
          if (v.rays[r] && typeof v.rays[r].rotate === 'function') {
            v.rays[r].rotate(v.heading);
          }
          if (v.sensorHits) v.sensorHits[r] = null;
          if (v.sensorDists) v.sensorDists[r] = (typeof v.sight === 'number') ? v.sight : 120;
        }
      }
      if (typeof v.goal !== 'undefined') {
        v.goal = (cps.length > v.index) ? cps[v.index] : null;
      }
    }
  },

  // Rendu visuel d'exception de la grille de départ sur la piste (Damier, Ligne d'arrêt, Emplacements, Numéros P1..PN)
  draw(cps, totalCars = 20) {
    if (!cps || cps.length === 0 || !cps[0].a || !cps[0].b) return;
    const cp0 = cps[0];
    const p1 = cp0.a;
    const p2 = cp0.b;
    const count = Math.max(1, totalCars || (typeof population !== 'undefined' ? population.length : 20));

    push();

    // 1. Vecteur directeur longitudinal à la ligne de départ
    let offX = 0, offY = 0;
    if (cps.length > 1) {
      const m0 = cps[0].midpoint ? cps[0].midpoint() : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const m1 = cps[1].midpoint ? cps[1].midpoint() : { x: (cps[1].a.x + cps[1].b.x) / 2, y: (cps[1].a.y + cps[1].b.y) / 2 };
      const len = Math.hypot(m1.x - m0.x, m1.y - m0.y) || 1;
      offX = ((m1.x - m0.x) / len) * 3.2;
      offY = ((m1.y - m0.y) / len) * 3.2;
    }

    // 2. LIGNE D'ARRIVÉE À DOUBLE DAMIER NOIR ET BLANC FIA (À CHECKPOINT 0)
    const segments = 16;
    for (let row = 0; row < 2; row++) {
      const rOffX = (row === 0) ? -offX * 0.9 : offX * 0.9;
      const rOffY = (row === 0) ? -offY * 0.9 : offY * 0.9;

      for (let i = 0; i < segments; i++) {
        const t1 = i / segments;
        const t2 = (i + 1) / segments;
        const x1 = lerp(p1.x, p2.x, t1) + rOffX;
        const y1 = lerp(p1.y, p2.y, t1) + rOffY;
        const x2 = lerp(p1.x, p2.x, t2) + rOffX;
        const y2 = lerp(p1.y, p2.y, t2) + rOffY;

        const isWhite = (i + row) % 2 === 0;
        stroke(isWhite ? color(255, 255, 255, 245) : color(12, 18, 28, 245));
        strokeWeight(6.5);
        strokeCap(SQUARE);
        line(x1, y1, x2, y2);
      }
    }

    // Balises dorées de la ligne d'arrivée
    noStroke();
    fill(255, 215, 0, 70);
    ellipse(p1.x, p1.y, 20, 20);
    ellipse(p2.x, p2.y, 20, 20);
    fill(255, 215, 0, 240);
    ellipse(p1.x, p1.y, 8, 8);
    ellipse(p2.x, p2.y, 8, 8);

    // 3. SECTEUR DE DÉPART SUR LA PORTION RECTILIGNE DU CIRCUIT (START SECTOR)
    const startLineIdx = this.getStartLineIndex(cps);
    const cpStart = cps[startLineIdx];
    const s1 = cpStart.a;
    const s2 = cpStart.b;
    const nextStartIdx = (startLineIdx + 1) % cps.length;
    const sm0 = cpStart.midpoint ? cpStart.midpoint() : { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 };
    const sm1 = cps[nextStartIdx].midpoint ? cps[nextStartIdx].midpoint() : { x: (cps[nextStartIdx].a.x + cps[nextStartIdx].b.x) / 2, y: (cps[nextStartIdx].a.y + cps[nextStartIdx].b.y) / 2 };
    const sLen = Math.hypot(sm1.x - sm0.x, sm1.y - sm0.y) || 1;
    const sOffX = ((sm1.x - sm0.x) / sLen) * 3.2;
    const sOffY = ((sm1.y - sm0.y) / sLen) * 3.2;

    // 4. LIGNE BLANCHE D'ARRÊT PRINCIPALE DE DÉPART (START STOP LINE)
    stroke(255, 255, 255, 250);
    strokeWeight(4.0);
    strokeCap(SQUARE);
    line(s1.x - sOffX * 1.5, s1.y - sOffY * 1.5, s2.x - sOffX * 1.5, s2.y - sOffY * 1.5);

    // 5. BALISES LUMINEUSES VERTES FIA AUX EXTRÉMITÉS DE LA LIGNE DE DÉPART
    noStroke();
    fill(0, 255, 160, 60);
    ellipse(s1.x, s1.y, 22, 22);
    ellipse(s2.x, s2.y, 22, 22);
    fill(0, 255, 160, 240);
    ellipse(s1.x, s1.y, 10, 10);
    ellipse(s2.x, s2.y, 10, 10);
    fill(255, 255, 255, 255);
    ellipse(s1.x, s1.y, 4, 4);
    ellipse(s2.x, s2.y, 4, 4);

    // 6. EMPLACEMENTS DE DÉPART FORMULE 1 CONFORMES À L'IMAGE DE RÉFÉRENCE (Crochets ']' en quinconce)
    // Chaque emplacement reproduit fidèlement la grille de référence :
    // - Ligne avant transversale blanche
    // - Crochets latéraux ']' orientés vers l'arrière
    // - Encoche centrale d'alignement
    // - Numéro officiel de position blanc peint sur l'asphalte à côté du crochet (1, 2, 3...)
    const boxLength = 36;
    const boxWidth = 22;
    const halfL = boxLength / 2;
    const halfW = boxWidth / 2;

    for (let slotIdx = 0; slotIdx < count; slotIdx++) {
      const slot = this.getSlot(slotIdx, cps, count);
      if (!slot) continue;

      push();
      translate(slot.x, slot.y);
      rotate(slot.heading);

      // A. Surface d'asphalte texturée de l'emplacement (empreinte au sol F1)
      noStroke();
      fill(255, 255, 255, 12);
      rectMode(CENTER);
      rect(0, 0, boxLength + 2, boxWidth + 2, 2);

      // B. Crochet F1 avant ']' blanc éclatant ouvert vers l'arrière
      stroke(255, 255, 255, 245);
      strokeWeight(2.8);
      strokeCap(SQUARE);
      // Barre transversale avant d'arrêt
      line(halfL, -halfW, halfL, halfW);
      // Bras latéraux gauche et droit pointant vers l'arrière (forme ']')
      line(halfL, -halfW, halfL - 14, -halfW);
      line(halfL, halfW, halfL - 14, halfW);

      // C. Encoche centrale d'alignement (Center Tick F1)
      stroke(255, 255, 255, 240);
      strokeWeight(2.2);
      line(halfL, 0, halfL - 5, 0);

      // D. NUMÉRO DE POSITION PEINT SUR L'ASPHALTE À CÔTÉ DU CROCHET (comme sur l'image de référence)
      push();
      translate(halfL - 4, -halfW - 8);
      noStroke();
      fill(255, 255, 255, 240);
      if (typeof textFont === 'function') textFont('Orbitron');
      if (typeof textSize === 'function') textSize(7.5);
      if (typeof textStyle === 'function' && typeof BOLD !== 'undefined') textStyle(BOLD);
      if (typeof textAlign === 'function' && typeof CENTER !== 'undefined') textAlign(CENTER, CENTER);
      if (typeof text === 'function') text(slot.slot, 0, 0);
      pop();

      pop();
    }

    // 7. LIGNE ET ZONE DRS PEINTE DERRIÈRE LA DERNIÈRE LIGNE DE LA GRILLE
    const lastSlot = this.getSlot(count - 1, cps, count);
    if (lastSlot) {
      push();
      translate(lastSlot.x, lastSlot.y);
      rotate(lastSlot.heading);
      translate(-32, 0);

      // Ligne blanche pointillée transversale DRS
      stroke(255, 255, 255, 190);
      strokeWeight(2.4);
      strokeCap(ROUND);
      const drsSpan = 65;
      for (let d = -drsSpan; d <= drsSpan; d += 14) {
        line(0, d, 0, d + 8);
      }

      // Marquage stencil 'DRS' peint sur l'asphalte
      noStroke();
      fill(255, 255, 255, 175);
      if (typeof textFont === 'function') textFont('Orbitron');
      if (typeof textSize === 'function') textSize(11);
      if (typeof textStyle === 'function' && typeof BOLD !== 'undefined') textStyle(BOLD);
      if (typeof textAlign === 'function' && typeof CENTER !== 'undefined') textAlign(CENTER, CENTER);
      if (typeof text === 'function') {
        text('DRS', -12, 0);
      }
      pop();
    }

    // 8. SIGNALISATION DE DÉPART FORMULE 1 SUR MURET LATÉRAL (HORS-PISTE)
    // Feux de départ positionnés en toute sécurité à l'extérieur de la piste, sans aucun portique ni obstacle traversant la chaussée.
    const isCountdownActive = (typeof RaceManager !== 'undefined' && RaceManager.countdown && RaceManager.countdown.active);
    if (isCountdownActive && RaceManager.countdown) {
      const activeStep = RaceManager.countdown.step || 0;
      const wallNormal = Math.atan2(s2.y - s1.y, s2.x - s1.x);
      // Positionné à 20px à l'extérieur de la bordure extérieure s2 (hors-piste total)
      const towerX = s2.x + Math.cos(wallNormal) * 22;
      const towerY = s2.y + Math.sin(wallNormal) * 22;

      push();
      translate(towerX, towerY);
      rotate(wallNormal);
      rectMode(CENTER);

      // Support FIA sur muret de bord de piste
      fill(15, 23, 42, 230);
      stroke(71, 85, 105);
      strokeWeight(1.2);
      rect(0, 0, 48, 12, 3);

      for (let k = 0; k < 5; k++) {
        const podX = -18 + k * 9;
        const isLit = k < activeStep;
        noStroke();
        if (isLit) {
          fill(255, 0, 40, 255);
          ellipse(podX, 0, 6, 6);
          fill(255, 50, 50, 100);
          ellipse(podX, 0, 10, 10);
        } else {
          fill(30, 41, 59, 230);
          ellipse(podX, 0, 5, 5);
        }
      }
      pop();
    }

    pop();
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.StartingGrid = StartingGrid;
}

// ==========================================================================
// FORMULA RACING SYSTEM — GESTIONNAIRE DE COURSE (RACE MANAGER)
// Gestion de la procédure de départ à feux rouges F1, du chronométrage officiel,
// du suivi rigoureux des tours, du classement réel et des résultats de course.
// ==========================================================================

const RaceManager = {
  // Configuration active de la course
  config: {
    carCount: 20,
    targetLaps: 3,
    countdownDuration: 5, // 3, 5 ou 10 secondes
    trackChoice: 'current', // 'current' | 'random'
    gameMode: 'race', // 'race' | 'training' | 'time_trial'
    soundEnabled: true,
    soundVolume: 0.75,
    simSpeed: 1,
    gaPopulation: 100,
    gaMutation: 8
  },

  // État de la procédure de départ Starting Lights
  countdown: {
    active: false,
    timerIds: [],
    step: 0,
    isPaused: false,
    remainingTime: 0
  },

  // Chronométrage et télémétrie de la session active
  telemetry: {
    sessionBestLap: null,
    sessionBestLapCar: null,
    leaderCar: null,
    results: []
  },

  init() {
    this.bindEvents();
    this.syncUIWithConfig();
    // Affichage automatique du panneau de préparation de course dès le lancement
    this.openSetupModal();
  },

  // Synchronisation des contrôles du panneau Race Setup avec la configuration active
  syncUIWithConfig() {
    if (typeof document === 'undefined') return;

    // Nombre de voitures
    const carSlider = document.getElementById('setup-car-count');
    const carVal = document.getElementById('setup-car-count-val');
    if (carSlider) carSlider.value = this.config.carCount;
    if (carVal) carVal.textContent = this.config.carCount;

    // Nombre de tours
    const lapsSlider = document.getElementById('setup-laps');
    const lapsVal = document.getElementById('setup-laps-val');
    if (lapsSlider) lapsSlider.value = this.config.targetLaps;
    if (lapsVal) lapsVal.textContent = `${this.config.targetLaps} tour${this.config.targetLaps > 1 ? 's' : ''}`;

    // Durée feux
    const durationVal = document.getElementById('setup-countdown-val');
    if (durationVal) durationVal.textContent = `${this.config.countdownDuration} secondes`;
    const durBtns = document.querySelectorAll('#group-countdown-duration .segmented-btn');
    durBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.duration, 10) === this.config.countdownDuration);
    });

    // Circuit
    const trackVal = document.getElementById('setup-track-val');
    if (trackVal) trackVal.textContent = this.config.trackChoice === 'random' ? 'Nouveau circuit aléatoire' : 'Circuit actuel';
    const trackBtns = document.querySelectorAll('#group-track-choice .segmented-btn');
    trackBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.track === this.config.trackChoice);
    });

    // Son & Volume
    const soundToggle = document.getElementById('setup-sound-toggle');
    const soundVolSlider = document.getElementById('setup-sound-volume');
    const soundVolVal = document.getElementById('setup-sound-volume-val');
    if (soundToggle) soundToggle.checked = this.config.soundEnabled;
    if (soundVolSlider) soundVolSlider.value = Math.round(this.config.soundVolume * 100);
    if (soundVolVal) soundVolVal.textContent = `${Math.round(this.config.soundVolume * 100)}%`;

    // Vitesse simulation
    const simSpeedSlider = document.getElementById('setup-sim-speed');
    const simSpeedVal = document.getElementById('setup-sim-speed-val');
    if (simSpeedSlider) simSpeedSlider.value = this.config.simSpeed;
    if (simSpeedVal) simSpeedVal.textContent = `${this.config.simSpeed}× (${this.config.simSpeed === 1 ? 'Temps réel' : 'Accéléré'})`;

    // Mode de jeu
    const modeCards = document.querySelectorAll('.setup-mode-card');
    modeCards.forEach(card => {
      card.classList.toggle('active', card.dataset.mode === this.config.gameMode);
    });

    // Algorithme génétique
    const gaBox = document.getElementById('setup-ga-box');
    const gaBadge = document.getElementById('setup-ga-badge');
    const gaPopSlider = document.getElementById('setup-ga-pop');
    const gaPopVal = document.getElementById('setup-ga-pop-val');
    const gaMutSlider = document.getElementById('setup-ga-mutation');
    const gaMutVal = document.getElementById('setup-ga-mutation-val');

    if (gaPopSlider) gaPopSlider.value = this.config.gaPopulation;
    if (gaPopVal) gaPopVal.textContent = this.config.gaPopulation;
    if (gaMutSlider) gaMutSlider.value = this.config.gaMutation;
    if (gaMutVal) gaMutVal.textContent = `${this.config.gaMutation}%`;

    const isTraining = (this.config.gameMode === 'training');
    if (gaBox) gaBox.classList.toggle('disabled', !isTraining);
    if (gaBadge) {
      gaBadge.className = isTraining ? 'ga-status-badge' : 'ga-status-badge disabled-mode';
      gaBadge.textContent = isTraining ? 'ACTIF EN ENTRAÎNEMENT' : 'DÉSACTIVÉ HORS ENTRAÎNEMENT';
    }
    if (gaPopSlider) gaPopSlider.disabled = !isTraining;
    if (gaMutSlider) gaMutSlider.disabled = !isTraining;

    // Mise à jour badge mode dans le header
    const badgeMode = document.getElementById('badge-mode');
    if (badgeMode) {
      if (this.config.gameMode === 'race') badgeMode.textContent = 'COURSE';
      else if (this.config.gameMode === 'training') badgeMode.textContent = 'ENTRAÎNEMENT';
      else if (this.config.gameMode === 'time_trial') badgeMode.textContent = 'CONTRE-LA-MONTRE';
    }
  },

  // Application des réglages dans le moteur de jeu réel
  applyConfigToEngine(startRaceNow = false) {
    if (this.config.gameMode === 'training') {
      TOTAL = this.config.gaPopulation || this.config.carCount;
    } else {
      TOTAL = this.config.carCount;
    }
    simulationSpeed = this.config.simSpeed;

    if (typeof currentStage !== 'undefined' && currentStage) {
      currentStage.targetLaps = this.config.targetLaps;
    }

    if (typeof SoundSystem !== 'undefined') {
      SoundSystem.setMuted(!this.config.soundEnabled);
      SoundSystem.setVolume(this.config.soundVolume);
    }

    if (this.config.gameMode === 'training') {
      MUTATION_RATE = this.config.gaMutation / 100;
    }

    // Régénération du circuit si circuit aléatoire sélectionné
    if (this.config.trackChoice === 'random') {
      currentTrackIndex++;
      buildTrack();
    }

    // Réinitialisation de la population sur la grille
    initPopulation();

    // Actualisation du HUD
    updateStageHUD();
    updateTelemetryUI(0);

    if (startRaceNow) {
      this.closeSetupModal();
      this.startCountdown();
    }
  },

  // Procédure officielle de départ Formula 1 Starting Lights
  startCountdown() {
    this.cancelCountdown();

    raceState = 'countdown';
    currentWinner = null;
    stageAttemptElapsed = 0;
    this.countdown.active = true;
    this.countdown.step = 0;
    this.countdown.isPaused = false;

    // Repositionnement officiel rigoureux et immobilisation stricte sur la grille
    if (typeof StartingGrid !== 'undefined' && typeof StartingGrid.positionCars === 'function') {
      StartingGrid.positionCars(population, checkpoints);
    }
    for (let v of population) {
      if (typeof v.freezeOnGrid === 'function') v.freezeOnGrid();
      else {
        v.speed = 0;
        if (v.vel) v.vel.set(0, 0);
      }
    }

    if (typeof document === 'undefined') return;

    // Affichage du portique
    const gantry = document.getElementById('f1-starting-lights-gantry');
    const badge = document.getElementById('gantry-status-badge');
    const subtext = document.getElementById('gantry-subtext');
    const banner = document.getElementById('race-started-banner');

    if (banner) {
      banner.classList.add('hidden');
      banner.classList.remove('fading-out');
    }

    if (gantry) {
      gantry.classList.remove('hidden');
      gantry.classList.remove('fading-out');
    }

    // Éteindre tous les 5 feux au départ
    for (let i = 0; i < 5; i++) {
      const pod = document.getElementById(`gantry-pod-${i}`);
      if (pod) pod.classList.remove('on');
    }

    if (badge) {
      badge.textContent = 'READY TO RACE';
      badge.classList.remove('lights-out');
    }
    if (subtext) subtext.textContent = 'IMMOBILISATION SUR LA GRILLE · DÉPART DANS UN INSTANT';

    // Mise à jour statut topbar
    const badgeStatus = document.getElementById('badge-status');
    const statusText = document.getElementById('status-text');
    if (badgeStatus) badgeStatus.className = 'status-chip paused';
    if (statusText) statusText.textContent = 'START PROCEDURE';

    if (typeof setTimeout !== 'function') {
      this.triggerLightsOut();
      return;
    }

    const stepDurationMs = (this.config.countdownDuration * 1000) / 5;

    // 1. Allumage progressif des cinq feux rouges avec son court
    for (let i = 0; i < 5; i++) {
      const tid = setTimeout(() => {
        if (!this.countdown.active) return;
        this.countdown.step = i + 1;
        const pod = document.getElementById(`gantry-pod-${i}`);
        if (pod) pod.classList.add('on');
        if (badge) badge.textContent = `RED LIGHT ${i + 1} / 5`;
        if (subtext) subtext.textContent = `PRÉPARATION : ALLUMAGE DES FEUX (${i + 1}/5)`;

        // Signal sonore à chaque feu (bip propre, chaud et discret sans sifflement)
        if (typeof SoundSystem !== 'undefined') {
          SoundSystem.playBeep(i + 1);
        }
      }, i * stepDurationMs);
      this.countdown.timerIds.push(tid);
    }

    // 2. Délai aléatoire après allumage complet des 5 feux (0.8s à 2.2s)
    const randomHoldMs = 800 + Math.random() * 1400;
    const lightsOutTimeMs = 5 * stepDurationMs + randomHoldMs;

    const tidLightsOut = setTimeout(() => {
      if (!this.countdown.active) return;
      this.triggerLightsOut();
    }, lightsOutTimeMs);

    this.countdown.timerIds.push(tidLightsOut);
  },

  // Extinction simultanée de tous les feux : DÉPART OFFICIEL ("Lights Out")
  triggerLightsOut() {
    this.countdown.active = false;
    this.countdown.timerIds = [];

    // Extinction simultanée de tous les 5 feux
    for (let i = 0; i < 5; i++) {
      const pod = document.getElementById(`gantry-pod-${i}`);
      if (pod) pod.classList.remove('on');
    }

    const badge = document.getElementById('gantry-status-badge');
    const subtext = document.getElementById('gantry-subtext');
    const gantry = document.getElementById('f1-starting-lights-gantry');
    const banner = document.getElementById('race-started-banner');

    if (badge) {
      badge.textContent = 'LIGHTS OUT!';
      badge.classList.add('lights-out');
    }
    if (subtext) subtext.textContent = 'DRAPEAU VERT · DÉPART DE COURSE !';

    // Affichage bannière "LIGHTS OUT AND AWAY WE GO!"
    if (banner) {
      banner.classList.remove('hidden');
      banner.classList.remove('fading-out');
    }

    // Signal sonore officiel de départ & accélération moteur rugissante
    if (typeof SoundSystem !== 'undefined') {
      SoundSystem.playLightsOut();
      if (typeof SoundSystem.playRaceStartEngine === 'function') {
        SoundSystem.playRaceStartEngine();
      }
    }

    // Libération immédiate des bolides et démarrage officiel du chrono
    raceState = 'racing';
    stageAttemptElapsed = 0;

    for (let v of population) {
      if (typeof v.launchRace === 'function') v.launchRace();
      else {
        v.speed = 2.0;
        if (typeof p5 !== 'undefined' && p5.Vector && typeof p5.Vector.fromAngle === 'function') {
          v.vel = p5.Vector.fromAngle(v.heading).mult(v.speed);
        } else if (typeof createVector === 'function') {
          v.vel = createVector(Math.cos(v.heading) * v.speed, Math.sin(v.heading) * v.speed);
        } else if (v.vel) {
          v.vel.x = Math.cos(v.heading) * v.speed;
          v.vel.y = Math.sin(v.heading) * v.speed;
        }
      }
    }

    // Mise à jour statut topbar
    const badgeStatus = document.getElementById('badge-status');
    const statusText = document.getElementById('status-text');
    if (badgeStatus) badgeStatus.className = 'status-chip';
    if (statusText) statusText.textContent = 'RACING';

    // Disparition progressive du portique et de la bannière après 2.5s
    if (typeof setTimeout === 'function') {
      const fadeTid = setTimeout(() => {
        if (gantry) gantry.classList.add('fading-out');
        if (banner) banner.classList.add('fading-out');
        setTimeout(() => {
          if (gantry) gantry.classList.add('hidden');
          if (banner) banner.classList.add('hidden');
        }, 400);
      }, 2400);
      this.countdown.timerIds.push(fadeTid);
    } else {
      if (gantry) gantry.classList.add('hidden');
      if (banner) banner.classList.add('hidden');
    }
  },

  // Annulation propre de la procédure de départ (arrêt des timers et masquage)
  cancelCountdown() {
    this.countdown.active = false;
    for (let id of this.countdown.timerIds) {
      clearTimeout(id);
    }
    this.countdown.timerIds = [];

    if (typeof document !== 'undefined') {
      const gantry = document.getElementById('f1-starting-lights-gantry');
      const banner = document.getElementById('race-started-banner');
      if (gantry) gantry.classList.add('hidden');
      if (banner) banner.classList.add('hidden');
    }
  },

  pauseCountdown() {
    if (this.countdown.active) {
      this.cancelCountdown();
      const badgeStatus = document.getElementById('badge-status');
      const statusText = document.getElementById('status-text');
      if (badgeStatus) badgeStatus.className = 'status-chip paused';
      if (statusText) statusText.textContent = 'PAUSED';
    }
  },

  resumeCountdown() {
    if (raceState === 'countdown') {
      this.startCountdown();
    }
  },

  // Fin de course lorsqu'une voiture a bouclé tous les tours configurés
  finishRace(winner) {
    if (raceState === 'finished') return;
    raceState = 'finished';
    currentWinner = winner;

    if (typeof SoundSystem !== 'undefined') {
      SoundSystem.playVictory();
    }

    // Mise à jour visuelle du topbar
    const badgeStatus = document.getElementById('badge-status');
    const statusText = document.getElementById('status-text');
    if (badgeStatus) {
      badgeStatus.classList.remove('paused');
      badgeStatus.classList.add('finished');
    }
    if (statusText) statusText.textContent = 'TERMINÉ 🏁';

    // Génération du classement complet officiel
    this.generateResultsModal(winner);
  },

  // Rendu de l'écran des résultats officiels de course (Podium P1, P2, P3 et tableau complet)
  generateResultsModal(winner) {
    if (typeof document === 'undefined') return;

    const modal = document.getElementById('race-results-modal');
    if (!modal) return;

    // Regrouper tous les véhicules (survivants + éliminés)
    const allCars = population.concat(savedVehicles);

    // Tri de course : 1. Terminé / nombre de tours (desc), 2. Checkpoints franchis (desc), 3. Distance parcourue
    allCars.sort((a, b) => {
      if (a === winner) return -1;
      if (b === winner) return 1;
      if (b.lapsCompleted !== a.lapsCompleted) return b.lapsCompleted - a.lapsCompleted;
      if (b.checkpointsCount !== a.checkpointsCount) return b.checkpointsCount - a.checkpointsCount;
      return b.distanceTravelled - a.distanceTravelled;
    });

    const p1 = winner || allCars[0];
    const p2 = allCars.length > 1 ? allCars[1] : null;
    const p3 = allCars.length > 2 ? allCars[2] : null;

    // Podium P1
    const p1Car = document.getElementById('podium-p1-car');
    const p1Time = document.getElementById('podium-p1-time');
    const totalSec = Math.floor(stageAttemptElapsed / 1000);
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    const ms = String(Math.floor(stageAttemptElapsed % 1000)).padStart(3, '0');
    const formattedWinnerTime = `${mins}:${secs}.${ms}`;

    if (p1Car && p1) p1Car.textContent = `#${p1.carNumber}`;
    if (p1Time) p1Time.textContent = formattedWinnerTime;

    // Podium P2
    const p2Car = document.getElementById('podium-p2-car');
    const p2Time = document.getElementById('podium-p2-time');
    if (p2Car && p2) p2Car.textContent = `#${p2.carNumber}`;
    if (p2Time && p2) {
      const gapSec = Math.max(0.1, (p1.distanceTravelled - p2.distanceTravelled) / 50).toFixed(3);
      p2Time.textContent = `+${gapSec}s`;
    }

    // Podium P3
    const p3Car = document.getElementById('podium-p3-car');
    const p3Time = document.getElementById('podium-p3-time');
    if (p3Car && p3) p3Car.textContent = `#${p3.carNumber}`;
    if (p3Time && p3) {
      const gapSec = Math.max(0.2, (p1.distanceTravelled - p3.distanceTravelled) / 50).toFixed(3);
      p3Time.textContent = `+${gapSec}s`;
    }

    // Résumé
    const resTotal = document.getElementById('results-total-time');
    const resLaps = document.getElementById('results-laps-completed');
    const resBest = document.getElementById('results-best-lap');

    if (resTotal) resTotal.textContent = formattedWinnerTime;
    if (resLaps && currentStage) resLaps.textContent = `${currentStage.targetLaps} / ${currentStage.targetLaps}`;

    let sessionBest = this.telemetry.sessionBestLap;
    if (sessionBest) {
      const bMins = String(Math.floor(sessionBest / 60)).padStart(2, '0');
      const bSecs = (sessionBest % 60).toFixed(3).padStart(6, '0');
      const bestCarNum = this.telemetry.sessionBestLapCar ? this.telemetry.sessionBestLapCar.carNumber : (p1 ? p1.carNumber : '?');
      if (resBest) resBest.textContent = `${bMins}:${bSecs} (#${bestCarNum})`;
    } else {
      if (resBest) resBest.textContent = formattedWinnerTime;
    }

    // Tableau complet
    const tbody = document.getElementById('results-table-body');
    if (tbody) {
      tbody.innerHTML = '';
      const topCount = Math.min(20, allCars.length);
      for (let i = 0; i < topCount; i++) {
        const car = allCars[i];
        const isWin = (car === winner);
        const tr = document.createElement('tr');
        if (isWin) tr.className = 'winner-row';

        const carBestStr = (car.bestLapTime) ? `${car.bestLapTime.toFixed(3)}s` : '--';
        const gapStr = (i === 0) ? 'LEADER' : `+${Math.max(0.05, (p1.distanceTravelled - car.distanceTravelled) / 50).toFixed(2)}s`;

        tr.innerHTML = `
          <td><b>${i + 1}</b></td>
          <td><b>#${car.carNumber}</b></td>
          <td>${car.getLiveryInfo ? car.getLiveryInfo().team : 'GT3 F1'}</td>
          <td>${car.lapsCompleted} / ${currentStage ? currentStage.targetLaps : 3}</td>
          <td>${isWin ? formattedWinnerTime : '+GAP'}</td>
          <td>${gapStr}</td>
          <td>${carBestStr}</td>
        `;
        tbody.appendChild(tr);
      }
    }

    modal.classList.remove('hidden');
  },

  openSetupModal() {
    this.syncUIWithConfig();
    const modal = document.getElementById('race-setup-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeSetupModal() {
    const modal = document.getElementById('race-setup-modal');
    if (modal) modal.classList.add('hidden');
  },

  // Liaison des événements UI
  bindEvents() {
    if (typeof document === 'undefined') return;

    // Bouton ouverture setup depuis topbar
    const btnOpenSetup = document.getElementById('btn-open-race-setup');
    if (btnOpenSetup) {
      btnOpenSetup.addEventListener('click', () => {
        this.openSetupModal();
      });
    }

    // Boutons fermeture setup
    const btnCloseSetup = document.getElementById('btn-close-race-setup');
    const btnCancelSetup = document.getElementById('btn-cancel-race-setup');
    if (btnCloseSetup) btnCloseSetup.addEventListener('click', () => this.closeSetupModal());
    if (btnCancelSetup) btnCancelSetup.addEventListener('click', () => this.closeSetupModal());

    // Curseur voitures
    const carSlider = document.getElementById('setup-car-count');
    const carVal = document.getElementById('setup-car-count-val');
    if (carSlider) {
      carSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.config.carCount = val;
        if (carVal) carVal.textContent = val;
        document.querySelectorAll('.setup-card-item:nth-child(1) .chip-preset').forEach(chip => {
          chip.classList.toggle('active', parseInt(chip.dataset.val, 10) === val);
        });
      });
    }
    // Presets voitures
    document.querySelectorAll('.setup-card-item:nth-child(1) .chip-preset').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = parseInt(chip.dataset.val, 10);
        this.config.carCount = val;
        if (carSlider) carSlider.value = val;
        if (carVal) carVal.textContent = val;
        document.querySelectorAll('.setup-card-item:nth-child(1) .chip-preset').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Curseur tours
    const lapsSlider = document.getElementById('setup-laps');
    const lapsVal = document.getElementById('setup-laps-val');
    if (lapsSlider) {
      lapsSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.config.targetLaps = val;
        if (lapsVal) lapsVal.textContent = `${val} tour${val > 1 ? 's' : ''}`;
        document.querySelectorAll('.setup-card-item:nth-child(2) .chip-preset').forEach(chip => {
          chip.classList.toggle('active', parseInt(chip.dataset.val, 10) === val);
        });
      });
    }
    // Presets tours
    document.querySelectorAll('.setup-card-item:nth-child(2) .chip-preset').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = parseInt(chip.dataset.val, 10);
        this.config.targetLaps = val;
        if (lapsSlider) lapsSlider.value = val;
        if (lapsVal) lapsVal.textContent = `${val} tour${val > 1 ? 's' : ''}`;
        document.querySelectorAll('.setup-card-item:nth-child(2) .chip-preset').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Durée feux (3, 5, 10)
    const durBtns = document.querySelectorAll('#group-countdown-duration .segmented-btn');
    const durationVal = document.getElementById('setup-countdown-val');
    durBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dur = parseInt(btn.dataset.duration, 10);
        this.config.countdownDuration = dur;
        durBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (durationVal) durationVal.textContent = `${dur} secondes`;
      });
    });

    // Circuit (actuel vs aléatoire)
    const trackBtns = document.querySelectorAll('#group-track-choice .segmented-btn');
    const trackVal = document.getElementById('setup-track-val');
    trackBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const trk = btn.dataset.track;
        this.config.trackChoice = trk;
        trackBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (trackVal) trackVal.textContent = trk === 'random' ? 'Nouveau circuit aléatoire' : 'Circuit actuel';
      });
    });

    // Effets sonores et volume
    const soundToggle = document.getElementById('setup-sound-toggle');
    const soundVolSlider = document.getElementById('setup-sound-volume');
    const soundVolVal = document.getElementById('setup-sound-volume-val');
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => {
        this.config.soundEnabled = e.target.checked;
        if (typeof SoundSystem !== 'undefined') {
          SoundSystem.setMuted(!this.config.soundEnabled);
        }
      });
    }
    if (soundVolSlider) {
      soundVolSlider.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        this.config.soundVolume = v / 100;
        if (soundVolVal) soundVolVal.textContent = `${v}%`;
        if (typeof SoundSystem !== 'undefined') {
          SoundSystem.setVolume(this.config.soundVolume);
        }
      });
    }

    // Vitesse de simulation
    const simSpeedSlider = document.getElementById('setup-sim-speed');
    const simSpeedVal = document.getElementById('setup-sim-speed-val');
    if (simSpeedSlider) {
      simSpeedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.config.simSpeed = val;
        if (simSpeedVal) simSpeedVal.textContent = `${val}× (${val === 1 ? 'Temps réel' : 'Accéléré'})`;
      });
    }

    // Modes de jeu
    const modeCards = document.querySelectorAll('.setup-mode-card');
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        const m = card.dataset.mode;
        this.config.gameMode = m;
        this.syncUIWithConfig();
      });
    });

    // Algorithme génétique
    const gaPopSlider = document.getElementById('setup-ga-pop');
    const gaPopVal = document.getElementById('setup-ga-pop-val');
    const gaMutSlider = document.getElementById('setup-ga-mutation');
    const gaMutVal = document.getElementById('setup-ga-mutation-val');
    if (gaPopSlider) {
      gaPopSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.config.gaPopulation = val;
        if (gaPopVal) gaPopVal.textContent = val;
      });
    }
    if (gaMutSlider) {
      gaMutSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.config.gaMutation = val;
        if (gaMutVal) gaMutVal.textContent = `${val}%`;
      });
    }

    // Bouton Confirmer
    const btnConfirm = document.getElementById('btn-confirm-race-setup');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', () => {
        this.applyConfigToEngine(false);
        this.closeSetupModal();
      });
    }

    // Bouton DÉMARRER LA COURSE
    const btnStart = document.getElementById('btn-start-race-now');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        if (typeof SoundSystem !== 'undefined') {
          SoundSystem.initAudio();
          SoundSystem.setMuted(false);
          SoundSystem.setVolume(this.config.soundVolume || 0.75);
          if (typeof SoundSystem.playRaceStartEngine === 'function') {
            SoundSystem.playRaceStartEngine();
          }
        }
        this.applyConfigToEngine(true);
      });
    }

    // Bouton Mute dans le header
    const btnMute = document.getElementById('btn-topbar-mute');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        if (typeof SoundSystem !== 'undefined') {
          const isM = SoundSystem.toggleMute();
          this.config.soundEnabled = !isM;
          if (soundToggle) soundToggle.checked = !isM;
        }
      });
    }
    // Boutons des résultats
    const btnCloseRes = document.getElementById('btn-close-race-results');
    const btnResClose = document.getElementById('btn-results-close');
    const btnResNew = document.getElementById('btn-results-new-race');
    const btnResSetup = document.getElementById('btn-results-setup');
    const modalRes = document.getElementById('race-results-modal');

    if (btnCloseRes && modalRes) btnCloseRes.addEventListener('click', () => modalRes.classList.add('hidden'));
    if (btnResClose && modalRes) btnResClose.addEventListener('click', () => modalRes.classList.add('hidden'));
    if (btnResNew) {
      btnResNew.addEventListener('click', () => {
        if (modalRes) modalRes.classList.add('hidden');
        this.startCountdown();
      });
    }
    if (btnResSetup) {
      btnResSetup.addEventListener('click', () => {
        if (modalRes) modalRes.classList.add('hidden');
        this.openSetupModal();
      });
    }
  }
};

function registerLapRecord(car, lapDuration) {
  if (!car || typeof lapDuration !== 'number' || lapDuration <= 0) return;
  if (!RaceManager.telemetry.sessionBestLap || lapDuration < RaceManager.telemetry.sessionBestLap) {
    RaceManager.telemetry.sessionBestLap = lapDuration;
    RaceManager.telemetry.sessionBestLapCar = car;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.RaceManager = RaceManager;
}

// ==========================================================================
// 1. GÉNÉRATION DU CIRCUIT DE COURSE
// ==========================================================================

function buildTrack() {
  checkpoints = [];
  inside = [];
  outside = [];
  walls = [];

  const stageIdx = (typeof currentStageIndex === 'number' && currentStageIndex >= 0 && currentStageIndex < STAGES.length) ? currentStageIndex : 0;
  currentStage = STAGES[stageIdx] || STAGES[0];

  let builtWithRegistry = false;
  if (typeof CircuitRegistry !== 'undefined' && typeof CircuitRegistry.getByIndex === 'function' && trackMode !== 'randomChallenge') {
    try {
      const activeCircuit = CircuitRegistry.selectCircuit(stageIdx);
      const cW = 1850;
      const cH = 1080;
      const built = CircuitRegistry.build(activeCircuit, cW, cH);
      checkpoints = built.checkpoints;
      inside = built.inside;
      outside = built.outside;
      walls = built.walls;
      start = built.start;
      end = built.end;
      startHeading = built.startHeading;
      builtWithRegistry = true;
    } catch (err) {
      console.warn('Fallback vers build procédural:', err);
      builtWithRegistry = false;
    }
  }

  if (!builtWithRegistry) {
    // Mode défi aléatoire / fallback Perlin
    const noiseMax = (typeof currentStage !== 'undefined' && currentStage && currentStage.noiseMax) ? currentStage.noiseMax : 1.95;
    const total = 60;
    const pathWidth = (typeof currentStage !== 'undefined' && currentStage && currentStage.pathWidth) ? currentStage.pathWidth : 64;

    if (trackMode !== 'randomChallenge' && typeof currentStage !== 'undefined' && currentStage && currentStage.seed) {
      if (typeof noiseSeed === 'function') noiseSeed(currentStage.seed);
      if (typeof randomSeed === 'function') randomSeed(currentStage.seed);
    }

    const startX = (typeof random === 'function') ? random(1000) : 500;
    const startY = (typeof random === 'function') ? random(1000) : 500;
    const cW = (typeof width === 'number' && width > 100) ? width : 1400;
    const cH = (typeof height === 'number' && height > 100) ? height : 800;

    for (let i = 0; i < total; i++) {
      const a = (typeof map === 'function' && typeof TWO_PI !== 'undefined') ? map(i, 0, total, 0, TWO_PI) : (i / total) * Math.PI * 2;
      const xoff = (typeof map === 'function' ? map(Math.cos(a), -1, 1, 0, noiseMax) : Math.cos(a) * noiseMax) + startX;
      const yoff = (typeof map === 'function' ? map(Math.sin(a), -1, 1, 0, noiseMax) : Math.sin(a) * noiseMax) + startY;
      const noiseVal = (typeof noise === 'function') ? noise(xoff, yoff) : 0.5;
      const xr = (typeof map === 'function') ? map(noiseVal, 0, 1, 230, cW * 0.445) : (230 + noiseVal * (cW * 0.445 - 230));
      const yr = (typeof map === 'function') ? map(noiseVal, 0, 1, 150, cH * 0.40) : (150 + noiseVal * (cH * 0.40 - 150));

      const x1 = cW / 2 + (xr - pathWidth) * Math.cos(a);
      const y1 = cH / 2 + (yr - pathWidth) * Math.sin(a);
      const x2 = cW / 2 + (xr + pathWidth) * Math.cos(a);
      const y2 = cH / 2 + (yr + pathWidth) * Math.sin(a);

      checkpoints.push(new Boundary(x1, y1, x2, y2));
      inside.push(createVector(x1, y1));
      outside.push(createVector(x2, y2));
    }

    walls = [];
    for (let i = 0; i < checkpoints.length; i++) {
      const a1 = inside[i];
      const b1 = inside[(i + 1) % checkpoints.length];
      walls.push(new Boundary(a1.x, a1.y, b1.x, b1.y));

      const a2 = outside[i];
      const b2 = outside[(i + 1) % checkpoints.length];
      walls.push(new Boundary(a2.x, a2.y, b2.x, b2.y));
    }

    start = checkpoints[0].midpoint();
    end = checkpoints[checkpoints.length - 1].midpoint();
    if (checkpoints.length > 1) {
      const nextCP = checkpoints[1].midpoint();
      startHeading = Math.atan2(nextCP.y - start.y, nextCP.x - start.x);
    }
  }

  buildTrackScenery();
  drawTrackScenery();
  drawTrackMinimap();

  // Cadrage automatique et centrage parfait du circuit dès l'ouverture du jeu
  if (cameraMode === 'free') {
    updateCameraFree();
    // Snap immédiat — pas de lerp au premier rendu
    camX = targetCamX;
    camY = targetCamY;
    camZoom = targetCamZoom;
    camRotation = 0;
    targetCamRotation = 0;
    if (typeof updateZoomDisplay === 'function') updateZoomDisplay();
  }

  // Mise à jour du badge de numéro de circuit et du HUD
  updateTrackBadge();
  updateStageHUD();
}

// Calcul de la boîte englobante géométrique du circuit avec marges régulières
function getTrackBounds() {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const pts = (inside || []).concat(outside || []);
  if (!pts || pts.length === 0) {
    const defW = (typeof width === 'number' && width > 100) ? width : 1400;
    const defH = (typeof height === 'number' && height > 100) ? height : 800;
    return {
      minX: 0, maxX: defW, minY: 0, maxY: defH,
      centerX: defW / 2, centerY: defH / 2,
      w: defW, h: defH
    };
  }
  for (const p of pts) {
    if (!p) continue;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  // Marge de sécurité complète pour inclure vibreurs, bacs à graviers et dégagements (~40px)
  const trackMargin = 40;
  minX -= trackMargin;
  maxX += trackMargin;
  minY -= trackMargin;
  maxY += trackMargin;
  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    w: Math.max(10, maxX - minX),
    h: Math.max(10, maxY - minY)
  };
}

// Adaptation automatique du zoom à la largeur et à la hauteur d'affichage disponibles
function getOptimalTrackFitZoom() {
  const bounds = getTrackBounds();
  const container = (typeof document !== 'undefined') ? document.getElementById('canvas-container') : null;
  const cW = (container && container.clientWidth > 100) ? container.clientWidth : ((typeof width === 'number' && width > 100) ? width : 1400);
  const cH = (container && container.clientHeight > 100) ? container.clientHeight : ((typeof height === 'number' && height > 100) ? height : 800);

  // Marges visuelles généreuses (30% en hauteur pour dégager le portique F1 et le HUD, 22% en largeur)
  const usableW = cW * 0.78;
  const usableH = cH * 0.70;

  const trackW = Math.max(10, bounds.w);
  const trackH = Math.max(10, bounds.h);

  const zoomX = usableW / trackW;
  const zoomY = usableH / trackH;
  const fitZoom = Math.min(zoomX, zoomY);

  // Plage dynamique sécurisée : permet de dézoomer suffisamment sur les résolutions compactes
  // tout en satisfaisant la marge de test (sur 1400x800 -> 0.636)
  return Math.max(0.18, Math.min(1.20, Number(fitZoom.toFixed(3))));
}

// ==========================================================================
// SYSTÈME DE CAMÉRA IMMERSIVE MULTI-MODES (Req 5)
// Trois modes : free (vue aérienne), follow (troisième personne), cockpit
// ==========================================================================

// Vue aérienne globale : englobe tout le circuit avec 60px de marge (Req 5.5)
function updateCameraFree() {
  const bounds = getTrackBounds();
  targetCamX = bounds.centerX;
  targetCamY = bounds.centerY;

  // Utilise le calcul de zoom optimal existant pour cohérence avec l'interface
  targetCamZoom = getOptimalTrackFitZoom();

  targetCamRotation = 0;
}

// Vue troisième personne immersive : orientée dans la direction de déplacement, route visible devant (Req 4, 5.2, 5.3)
function updateCameraFollow(leader) {
  if (!leader || !leader.pos) {
    updateCameraFree();
    return;
  }

  // Look-ahead dynamique : place le point de visée devant la voiture
  // La voiture apparaît ainsi dans le tiers inférieur du canvas, orientée vers le haut,
  // et le tracé de la piste se déroule clairement devant elle sans masquer les virages.
  const carSpeed = (typeof leader.speed === 'number') ? leader.speed : 3.5;
  const lookAhead = 110 + Math.min(65, carSpeed * 12);
  targetCamX = leader.pos.x + Math.cos(leader.heading) * lookAhead;
  targetCamY = leader.pos.y + Math.sin(leader.heading) * lookAhead;

  // Rotation : oriente le vecteur direction du bolide vers le HAUT du canvas (-PI/2)
  targetCamRotation = -leader.heading - Math.PI / 2;

  // Zoom immersif et dynamique avec adaptation légère à la vitesse
  targetCamZoom = 1.35 - Math.min(0.20, carSpeed * 0.025);
}

// Vue cockpit : première personne depuis le capot/cockpit du véhicule (Req 4, 5.4)
function updateCameraCockpit(leader) {
  if (!leader || !leader.pos) {
    updateCameraFree();
    return;
  }

  // Caméra focalisée loin devant le capot pour une sensation de vitesse et trajectoire cockpit
  const carSpeed = (typeof leader.speed === 'number') ? leader.speed : 3.5;
  const forwardLook = 180 + Math.min(80, carSpeed * 15);
  targetCamX = leader.pos.x + Math.cos(leader.heading) * forwardLook;
  targetCamY = leader.pos.y + Math.sin(leader.heading) * forwardLook;

  // Rotation alignée rigoureusement vers l'avant (-PI/2)
  targetCamRotation = -leader.heading - Math.PI / 2;

  // Zoom immersif rapproché cockpit
  targetCamZoom = 1.70;
}

// Interpolation fluide de la caméra avec lerp position, zoom et rotation (Req 4, 5.2, 5.3, 5.9)
function smoothCamera() {
  const posLerp = 0.12;
  const zoomLerp = 0.10;
  const rotLerp = 0.08; // rotation douce progressive sans saccade

  camX = camX + (targetCamX - camX) * posLerp;
  camY = camY + (targetCamY - camY) * posLerp;
  camZoom = camZoom + (targetCamZoom - camZoom) * zoomLerp;

  // Normalisation de la différence de rotation à [-π, π]
  let rotDiff = targetCamRotation - camRotation;
  while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
  while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
  camRotation += rotDiff * rotLerp;

  // Limites sécurisées du zoom
  camZoom = Math.max(0.4, Math.min(2.5, camZoom));
}

// Vue 3D isométrique immersive haute fidélité (Fluide 60 FPS, zéro lag)
function updateCamera3D(leader) {
  const bounds = getTrackBounds();
  const fitZoom = getOptimalTrackFitZoom();
  // Cadrage global 3D axonométrique centré sur l'ensemble du circuit
  targetCamX = bounds.centerX;
  targetCamY = bounds.centerY;
  targetCamRotation = 0;
  targetCamZoom = fitZoom * 0.95;
}

// Basculement explicite du mode caméra (Req 5.1, 5.6)
function setCameraMode(mode) {
  cameraMode = mode;
  if (mode === 'free') {
    // Recalcul du cadrage optimal en mode libre (Req 5.5)
    updateCameraFree();
  } else if (mode === 'cockpit') {
    // Vue cockpit toujours synchronisée avec la voiture du joueur ("Ma Voiture")
    if (typeof currentDrivingMode !== 'undefined' && currentDrivingMode !== 'manual') {
      if (typeof setDrivingMode === 'function') {
        setDrivingMode('manual');
      }
    }
    cameraMode = 'cockpit';
  } else if (mode === '3d') {
    cameraMode = '3d';
    targetCamZoom = 1.25;
  }
  // Mise à jour de l'état actif des boutons dans l'interface
  const btnFollow = document.getElementById('btn-cam-follow');
  const btnFree = document.getElementById('btn-cam-free');
  const btn3D = document.getElementById('btn-cam-3d');
  if (btnFollow && btnFollow.classList) {
    if (mode === 'follow') btnFollow.classList.add('active');
    else btnFollow.classList.remove('active');
  }
  if (btnFree && btnFree.classList) {
    if (mode === 'free') btnFree.classList.add('active');
    else btnFree.classList.remove('active');
  }
  if (btn3D && btn3D.classList) {
    if (mode === '3d') btn3D.classList.add('active');
    else btn3D.classList.remove('active');
  }
}

// Balises, palmiers, végétation et infrastructure technologique autour du circuit
function buildTrackScenery() {
  trackScenery = [];
  const road = inside.map((point) => ({ x: point.x, y: point.y }))
    .concat(outside.slice().reverse().map((point) => ({ x: point.x, y: point.y })));
  let attempts = 0;
  const targetCount = 110;
  const maxW = (typeof width === 'number' && width > 100) ? width : 1850;
  const maxH = (typeof height === 'number' && height > 100) ? height : 1080;

  // Détermination du thème actif pour le type de décor (Req 3.5, 8)
  const activeCircuit = (typeof CircuitRegistry !== 'undefined' && typeof CircuitRegistry.getActive === 'function')
    ? CircuitRegistry.getActive()
    : null;
  const themeType = (activeCircuit && activeCircuit.type) ? activeCircuit.type : 'coastal';

  while (trackScenery.length < targetCount && attempts < 2500) {
    attempts++;
    const xBase = random(25, maxW - 25);
    const yBase = random(25, maxH - 25);
    // Dispersion régulière pour garantir une couverture homogène et éviter les répétitions
    const x = ((xBase + attempts * 97) % (maxW - 50)) + 25;
    const y = ((yBase + attempts * 61) % (maxH - 50)) + 25;
    if (isPointInsidePolygon(x, y, road)) continue;
    let edgeDistance = Infinity;
    for (const wall of walls) {
      edgeDistance = Math.min(edgeDistance, distanceToSegment(x, y, wall));
      if (edgeDistance < 25) break;
    }
    if (edgeDistance < 25) continue;

    const rnd = random(1);
    let type = 'oak';
    let r = 22;

    if (themeType === 'desert') {
      // Désert : cactus, formations rocheuses, buissons secs (zéro tente/panneau parasite)
      if (rnd < 0.42) { type = 'cactus'; r = random(14, 26); }
      else if (rnd < 0.72) { type = 'rock'; r = random(14, 28); }
      else if (rnd < 0.90) { type = 'bush'; r = random(8, 16); }
      else { type = 'pine'; r = random(14, 22); }
    } else if (themeType === 'forest') {
      // Forêt : chênes denses, pins sylvestres, buissons
      if (rnd < 0.48) { type = 'oak'; r = random(20, 36); }
      else if (rnd < 0.80) { type = 'pine'; r = random(16, 30); }
      else if (rnd < 0.94) { type = 'bush'; r = random(10, 18); }
      else { type = 'rock'; r = random(12, 22); }
    } else if (themeType === 'urban') {
      // Urbain : lampadaires, bâtiments en retrait, arbres d'alignement
      if (rnd < 0.35) { type = 'lamppost'; r = random(8, 12); }
      else if (rnd < 0.65) { type = 'oak'; r = random(16, 26); }
      else if (rnd < 0.85) { type = 'bush'; r = random(10, 16); }
      else { type = 'building'; r = random(24, 38); }
    } else {
      // Compétition & Moderne : barrières TecPro en retrait, grands arbres feuillus, bosquets
      if (rnd < 0.35) { type = 'barrier'; r = random(6, 10); }
      else if (rnd < 0.68) { type = 'oak'; r = random(18, 30); }
      else if (rnd < 0.88) { type = 'pine'; r = random(16, 26); }
      else { type = 'bush'; r = random(10, 16); }
    }

    trackScenery.push({
      x,
      y,
      kind: rnd,
      type,
      radius: r,
      seed: Math.floor(random(10000)),
      shade: random(0.85, 1.15)
    });
  }
}

function isPointInsidePolygon(x, y, polygon) {
  let inPolygon = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inPolygon = !inPolygon;
    }
  }
  return inPolygon;
}

function distanceToSegment(x, y, segment) {
  const dx = segment.b.x - segment.a.x;
  const dy = segment.b.y - segment.a.y;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared === 0
    ? 0
    : constrain(((x - segment.a.x) * dx + (y - segment.a.y) * dy) / lengthSquared, 0, 1);
  return dist(x, y, segment.a.x + ratio * dx, segment.a.y + ratio * dy);
}

// Rendu du terrain : Décor thématique immersif par circuit (Req 3.5, 8)
// Chaque circuit dispose de son propre background image et de décorations thématiques.
function drawTrackScenery() {
  if (!terrainLayer) return;
  if (typeof terrainLayer.clear === 'function') terrainLayer.clear();

  const baseW = Math.max((typeof width === 'number' && width > 100) ? width : 1850, 1850);
  const baseH = Math.max((typeof height === 'number' && height > 100) ? height : 1080, 1080);
  const margin = (typeof terrainMargin === 'number') ? terrainMargin : 850;
  const cx = baseW / 2;
  const cy = baseH / 2;

  // Repère mondial centré avec marges d'extension pour supprimer toute coupure
  if (typeof terrainLayer.push === 'function') terrainLayer.push();
  if (typeof terrainLayer.translate === 'function') terrainLayer.translate(margin, margin);

  // ------------------------------------------------------------------------
  // A. FOND NATUREL & ENVIRONNEMENT PROCÉDURAL HAUTE FIDÉLITÉ
  // ------------------------------------------------------------------------
  const activeCircuit = (typeof CircuitRegistry !== 'undefined' && typeof CircuitRegistry.getActive === 'function')
    ? CircuitRegistry.getActive()
    : null;
  const ambientHex = (activeCircuit && activeCircuit.ambientColor) ? activeCircuit.ambientColor : '#0a2e46';

  if (typeof terrainLayer.background === 'function') {
    terrainLayer.background(ambientHex);
  }

  // Fond d'ambiance avec halo lumineux centré sur le circuit
  terrainLayer.noStroke();
  terrainLayer.fill(ambientHex);
  terrainLayer.rect(-margin, -margin, baseW + margin * 2, baseH + margin * 2);

  terrainLayer.fill(255, 255, 255, 6);
  terrainLayer.ellipse(cx, cy, baseW * 1.5, baseH * 1.5);
  terrainLayer.fill(255, 255, 255, 9);
  terrainLayer.ellipse(cx, cy, baseW * 1.1, baseH * 1.1);

  // ------------------------------------------------------------------------
  // B. PAYSAGE PROCÉDURAL AUTHENTIQUE ADAPTÉ À CHAQUE GRAND PRIX
  // ------------------------------------------------------------------------
  const circuitId = (activeCircuit && activeCircuit.id) ? activeCircuit.id : 'coastal';

  if (circuitId === 'coastal') {
    // Stage 1 : Monaco Riviera — Littoral azuréen, plages dorées et récifs
    if (outside && outside.length >= 30) {
      const totalPts = outside.length;
      const coastPoints = [];
      const shallowPoints = [];
      const beachInnerPoints = [];

      for (let i = 0; i < totalPts; i++) {
        const pt = outside[i];
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        const udx = dx / d;
        const udy = dy / d;

        const angle = Math.atan2(dy, dx);
        const coastNoise = Math.sin(angle * 3.5) * 45 + Math.cos(angle * 7) * 20;
        const baseMargin = 85 + coastNoise;

        const shoreDist = d + Math.max(45, baseMargin);
        const sx = cx + udx * shoreDist;
        const sy = cy + udy * shoreDist;

        coastPoints.push({ x: sx, y: sy, angle, isRock: (Math.sin(angle * 4) > 0.25) });
        shallowPoints.push({ x: cx + udx * (shoreDist + 55), y: cy + udy * (shoreDist + 55) });
        beachInnerPoints.push({ x: cx + udx * (d + Math.max(20, baseMargin - 30)), y: cy + udy * (d + Math.max(20, baseMargin - 30)) });
      }

      // Eau peu profonde turquoise lagon
      terrainLayer.noStroke();
      terrainLayer.fill(20, 184, 166, 110);
      terrainLayer.beginShape();
      for (let p of shallowPoints) terrainLayer.vertex(p.x, p.y);
      terrainLayer.endShape(CLOSE);

      terrainLayer.fill(45, 212, 191, 140);
      terrainLayer.beginShape();
      for (let p of coastPoints) terrainLayer.vertex(p.x, p.y);
      terrainLayer.endShape(CLOSE);

      // Plages de sable doré
      terrainLayer.fill(228, 203, 158);
      terrainLayer.beginShape();
      for (let p of coastPoints) terrainLayer.vertex(p.x, p.y);
      terrainLayer.endShape(CLOSE);

      // Écume des vagues déferlantes
      terrainLayer.stroke(255, 255, 255, 210);
      terrainLayer.strokeWeight(3.5);
      terrainLayer.beginShape();
      for (let i = 0; i < coastPoints.length; i++) {
        const p = coastPoints[i];
        terrainLayer.vertex(p.x + Math.sin(i * 0.8) * 2, p.y + Math.sin(i * 0.8) * 2);
      }
      terrainLayer.endShape(CLOSE);

      // Pelouse côtière verdoyante
      terrainLayer.noStroke();
      terrainLayer.fill(32, 92, 56);
      terrainLayer.beginShape();
      for (let p of beachInnerPoints) terrainLayer.vertex(p.x, p.y);
      terrainLayer.endShape(CLOSE);
    }
  } else if (circuitId === 'desert') {
    // Stage 2 : Mojave Canyon Raceway — Strates rocheuses et plateaux ocre
    if (outside && outside.length >= 30) {
      const totalPts = outside.length;
      terrainLayer.noStroke();
      terrainLayer.fill(160, 80, 25, 95);
      terrainLayer.beginShape();
      for (let i = 0; i < totalPts; i += 2) {
        const pt = outside[i];
        const angle = Math.atan2(pt.y - cy, pt.x - cx);
        const distOut = Math.hypot(pt.x - cx, pt.y - cy) + 110 + Math.sin(angle * 5) * 35;
        terrainLayer.vertex(cx + Math.cos(angle) * distOut, cy + Math.sin(angle) * distOut);
      }
      terrainLayer.endShape(CLOSE);

      terrainLayer.fill(217, 119, 6, 85);
      terrainLayer.beginShape();
      for (let i = 0; i < totalPts; i += 2) {
        const pt = outside[i];
        const angle = Math.atan2(pt.y - cy, pt.x - cx);
        const distOut = Math.hypot(pt.x - cx, pt.y - cy) + 65;
        terrainLayer.vertex(cx + Math.cos(angle) * distOut, cy + Math.sin(angle) * distOut);
      }
      terrainLayer.endShape(CLOSE);
    }
  } else if (circuitId === 'forest') {
    // Stage 3 : Schwarzwald Ring — Prairies alpines et clairières denses
    if (outside && outside.length >= 30) {
      const totalPts = outside.length;
      terrainLayer.noStroke();
      terrainLayer.fill(16, 55, 30, 95);
      terrainLayer.beginShape();
      for (let i = 0; i < totalPts; i += 2) {
        const pt = outside[i];
        const angle = Math.atan2(pt.y - cy, pt.x - cx);
        const distOut = Math.hypot(pt.x - cx, pt.y - cy) + 120 + Math.sin(angle * 6) * 30;
        terrainLayer.vertex(cx + Math.cos(angle) * distOut, cy + Math.sin(angle) * distOut);
      }
      terrainLayer.endShape(CLOSE);

      terrainLayer.fill(22, 101, 52, 90);
      terrainLayer.beginShape();
      for (let i = 0; i < totalPts; i += 2) {
        const pt = outside[i];
        const angle = Math.atan2(pt.y - cy, pt.x - cx);
        const distOut = Math.hypot(pt.x - cx, pt.y - cy) + 65;
        terrainLayer.vertex(cx + Math.cos(angle) * distOut, cy + Math.sin(angle) * distOut);
      }
      terrainLayer.endShape(CLOSE);
    }
  } else if (circuitId === 'urban') {
    // Stage 4 : Marina Bay GP — Boulevards nocturnes et esplanade néon
    if (outside && outside.length >= 30) {
      const totalPts = outside.length;
      terrainLayer.noStroke();
      terrainLayer.fill(15, 23, 42, 140);
      terrainLayer.beginShape();
      for (let i = 0; i < totalPts; i += 2) {
        const pt = outside[i];
        const angle = Math.atan2(pt.y - cy, pt.x - cx);
        const distOut = Math.hypot(pt.x - cx, pt.y - cy) + 90;
        terrainLayer.vertex(cx + Math.cos(angle) * distOut, cy + Math.sin(angle) * distOut);
      }
      terrainLayer.endShape(CLOSE);

      terrainLayer.stroke(6, 182, 212, 70);
      terrainLayer.strokeWeight(3);
      terrainLayer.noFill();
      terrainLayer.beginShape();
      for (let i = 0; i < totalPts; i += 2) {
        const pt = outside[i];
        const angle = Math.atan2(pt.y - cy, pt.x - cx);
        const distOut = Math.hypot(pt.x - cx, pt.y - cy) + 55;
        terrainLayer.vertex(cx + Math.cos(angle) * distOut, cy + Math.sin(angle) * distOut);
      }
      terrainLayer.endShape(CLOSE);
    }
  } else {
    // Stage 5 : Silverstone Classic — Complexe FIA moderne et pelouse manucurée
    if (outside && outside.length >= 30) {
      const totalPts = outside.length;
      terrainLayer.noStroke();
      terrainLayer.fill(20, 45, 30, 90);
      terrainLayer.beginShape();
      for (let i = 0; i < totalPts; i += 2) {
        const pt = outside[i];
        const angle = Math.atan2(pt.y - cy, pt.x - cx);
        const distOut = Math.hypot(pt.x - cx, pt.y - cy) + 85;
        terrainLayer.vertex(cx + Math.cos(angle) * distOut, cy + Math.sin(angle) * distOut);
      }
      terrainLayer.endShape(CLOSE);
    }
  }

  // ------------------------------------------------------------------------
  // E. TRIBUNES DE SPECTATEURS & PADDOCK MOTORSPORT HAUT DE GAMME (Req 1, 2)
  // Positionnées avec une marge de sécurité stricte (> 65px de tout bord de piste)
  // Le panneau gris/bleu traversant la chaussée est définitivement supprimé.
  // ------------------------------------------------------------------------
  const roadPolygon = inside.map((point) => ({ x: point.x, y: point.y }))
    .concat(outside.slice().reverse().map((point) => ({ x: point.x, y: point.y })));

  const isNearRoad = (px, py, minDist = 55) => {
    if (isPointInsidePolygon(px, py, roadPolygon)) return true;
    for (const wall of walls) {
      if (distanceToSegment(px, py, wall) < minDist) return true;
    }
    return false;
  };

  // Tribunes spectateurs (Grandstands) le long des portions extérieures des virages
  if (checkpoints && checkpoints.length >= 30) {
    const standIndices = [
      Math.floor(checkpoints.length * 0.12),
      Math.floor(checkpoints.length * 0.38),
      Math.floor(checkpoints.length * 0.65),
      Math.floor(checkpoints.length * 0.88)
    ];
    for (let idx of standIndices) {
      const cp = checkpoints[idx];
      if (!cp || !cp.b) continue;
      const pt = cp.b;
      const nextCp = checkpoints[(idx + 1) % checkpoints.length];
      const dx = nextCp.b.x - pt.x;
      const dy = nextCp.b.y - pt.y;
      const angle = Math.atan2(dy, dx);
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      // Recul de sécurité 70px vers l'extérieur pour ne jamais empiéter sur l'asphalte
      const gx = pt.x + nx * 70;
      const gy = pt.y + ny * 70;

      // Vérifier que la tribune ne touche aucunement la piste
      if (isNearRoad(gx, gy, 45)) continue;

      terrainLayer.push();
      terrainLayer.translate(gx, gy);
      terrainLayer.rotate(angle);

      // Ombre portée de la tribune
      terrainLayer.noStroke();
      terrainLayer.fill(10, 20, 25, 95);
      terrainLayer.rect(-38, 5, 76, 26, 3);

      // Structure de base en béton
      terrainLayer.fill(50, 58, 70);
      terrainLayer.rect(-36, -8, 72, 24, 2);

      // 4 rangées de sièges avec spectateurs colorés
      const seatCols = [
        color(37, 99, 235),
        color(239, 68, 68),
        color(248, 250, 252),
        color(234, 179, 8)
      ];
      for (let r = 0; r < 4; r++) {
        terrainLayer.fill(seatCols[r % seatCols.length]);
        terrainLayer.rect(-34, -6 + r * 5, 68, 3.5, 0.8);
        // Têtes de spectateurs
        terrainLayer.fill(255, 230, 200, 200);
        for (let s = -30; s <= 30; s += 7) {
          terrainLayer.ellipse(s + ((r * 3) % 4), -5 + r * 5, 2.5, 2.5);
        }
      }

      // Toiture d'ombrage aérodynamique
      terrainLayer.fill(241, 245, 249, 220);
      terrainLayer.rect(-36, -11, 72, 6.5, 1.5);
      terrainLayer.stroke(148, 163, 184);
      terrainLayer.strokeWeight(1);
      terrainLayer.line(-36, -8, 36, -8);

      terrainLayer.pop();
    }
  }

  // Paddock et motorhomes d'assistance situés à l'écart de la ligne droite
  if (checkpoints && checkpoints.length > 0) {
    const cpStart = checkpoints[0];
    const m0 = cpStart.midpoint ? cpStart.midpoint() : { x: (cpStart.a.x + cpStart.b.x) / 2, y: (cpStart.a.y + cpStart.b.y) / 2 };
    let offX = 0, offY = 0;
    if (checkpoints.length > 1) {
      const m1 = checkpoints[1].midpoint();
      const len = Math.hypot(m1.x - m0.x, m1.y - m0.y) || 1;
      offX = -((m1.y - m0.y) / len);
      offY = ((m1.x - m0.x) / len);
    }
    const halfW = (cpStart.trackWidth ? cpStart.trackWidth : 92) * 0.5;
    const pitDist = halfW + 90; // Large recul de 90px pour garantir 0 collision et aucun panneau sur la route
    const pitX = m0.x + offX * pitDist;
    const pitY = m0.y + offY * pitDist;

    if (!isNearRoad(pitX, pitY, 50)) {
      terrainLayer.push();
      terrainLayer.translate(pitX, pitY);
      terrainLayer.rotate(startHeading);

      // Tarmac des stands
      terrainLayer.noStroke();
      terrainLayer.fill(35, 42, 52);
      terrainLayer.rect(-65, -20, 130, 48, 3);

      // Bâtiment de direction de course / Paddock Hospitality
      terrainLayer.fill(18, 26, 38);
      terrainLayer.rect(-55, -12, 110, 22, 2);
      terrainLayer.fill(0, 208, 132, 180);
      terrainLayer.rect(-55, -12, 110, 3, 1);

      // Camions transporteurs GT3
      const truckColors = [
        color(30, 58, 138),  // Bleu BMW
        color(225, 29, 72),  // Rouge Porsche
        color(30, 41, 59),   // Noir Mercedes
        color(234, 179, 8)   // Jaune Ferrari
      ];
      for (let t = 0; t < 4; t++) {
        const tx = -42 + t * 28;
        terrainLayer.fill(15, 23, 42, 110);
        terrainLayer.rect(tx + 2, 14, 20, 11, 1);
        terrainLayer.fill(truckColors[t]);
        terrainLayer.rect(tx, 12, 19, 10, 1.5);
        terrainLayer.fill(225, 235, 245);
        terrainLayer.rect(tx + 13, 13, 5, 8, 1);
      }
      terrainLayer.pop();
    }
  }

  // ------------------------------------------------------------------------
  // F. VÉGÉTATION & INFRASTRUCTURE DU CIRCUIT (RENDU PROCÉDURAL HAUTE FIDÉLITÉ)
  // ------------------------------------------------------------------------
  for (const feature of trackScenery) {
    const { x, y, type, radius = 22, seed = 42 } = feature;

    terrainLayer.push();
    terrainLayer.translate(x, y);

    if (type === 'palm') {
      // 1. PALMIER CÔTIER TROPICAL (Top-Down starburst fronds)
      terrainLayer.noStroke();
      terrainLayer.fill(10, 30, 22, 70);
      terrainLayer.ellipse(5, 6, radius * 1.8, radius * 1.8);

      const frondCount = 8;
      for (let f = 0; f < frondCount; f++) {
        const fAngle = (f / frondCount) * TWO_PI + (seed % 10) * 0.1;
        const frondLen = radius * 1.05;
        const fx = Math.cos(fAngle) * frondLen;
        const fy = Math.sin(fAngle) * frondLen;

        terrainLayer.stroke(15, 45, 25, 60);
        terrainLayer.strokeWeight(3.5);
        terrainLayer.line(3, 4, fx + 3, fy + 4);

        terrainLayer.stroke(22, 163, 74);
        terrainLayer.strokeWeight(2.6);
        terrainLayer.line(0, 0, fx, fy);

        terrainLayer.stroke(74, 222, 128);
        terrainLayer.strokeWeight(1.2);
        terrainLayer.line(0, 0, fx * 0.8, fy * 0.8);
      }
      terrainLayer.noStroke();
      terrainLayer.fill(92, 61, 24);
      terrainLayer.ellipse(0, 0, 7, 7);
      terrainLayer.fill(130, 90, 45);
      terrainLayer.ellipse(-1, -1, 3.5, 3.5);

    } else if (type === 'pine') {
      // 2. PIN MARITIME CÔTIER
      terrainLayer.noStroke();
      terrainLayer.fill(10, 25, 18, 85);
      terrainLayer.ellipse(5, 6, radius * 1.7, radius * 1.7);

      terrainLayer.fill(18, 55, 38);
      terrainLayer.ellipse(0, 0, radius * 1.5, radius * 1.5);
      terrainLayer.fill(28, 85, 56);
      terrainLayer.ellipse(-2, -2, radius * 1.1, radius * 1.1);
      terrainLayer.fill(42, 122, 80);
      terrainLayer.ellipse(-4, -4, radius * 0.65, radius * 0.65);
      terrainLayer.fill(74, 185, 154);
      terrainLayer.ellipse(-5, -5, radius * 0.25, radius * 0.25);

    } else if (type === 'rock') {
      // 3. ROCHER / BLOC DE GRANIT CÔTIER
      terrainLayer.noStroke();
      terrainLayer.fill(12, 22, 28, 90);
      terrainLayer.ellipse(4, 5, radius * 1.5, radius * 1.2);

      terrainLayer.fill(71, 85, 105);
      terrainLayer.beginShape();
      const sides = 6;
      for (let s = 0; s < sides; s++) {
        const sa = (s / sides) * TWO_PI;
        const rad = radius * (0.8 + ((s % 3) * 0.15));
        terrainLayer.vertex(Math.cos(sa) * rad, Math.sin(sa) * rad);
      }
      terrainLayer.endShape(CLOSE);

      terrainLayer.fill(148, 163, 184);
      terrainLayer.beginShape();
      terrainLayer.vertex(-radius * 0.6, -radius * 0.6);
      terrainLayer.vertex(radius * 0.4, -radius * 0.7);
      terrainLayer.vertex(radius * 0.2, 0);
      terrainLayer.vertex(-radius * 0.3, radius * 0.2);
      terrainLayer.endShape(CLOSE);

      terrainLayer.fill(45, 95, 55, 180);
      terrainLayer.ellipse(-radius * 0.2, radius * 0.25, radius * 0.4, radius * 0.3);

    } else if (type === 'bush') {
      // 4. BUISSONS & MASSIFS FLORAUX CÔTIERS
      terrainLayer.noStroke();
      terrainLayer.fill(10, 30, 20, 65);
      terrainLayer.ellipse(3, 4, radius * 1.6, radius * 1.4);

      terrainLayer.fill(34, 105, 58);
      terrainLayer.ellipse(0, 0, radius * 1.4, radius * 1.3);
      terrainLayer.fill(46, 138, 76);
      terrainLayer.ellipse(-2, -2, radius, radius * 0.9);

      terrainLayer.fill(254, 240, 138);
      terrainLayer.ellipse(-radius * 0.3, -radius * 0.2, 3, 3);
      terrainLayer.ellipse(radius * 0.2, radius * 0.3, 3, 3);
      terrainLayer.fill(244, 114, 182);
      terrainLayer.ellipse(radius * 0.3, -radius * 0.1, 3, 3);

    } else if (type === 'tent' || type === 'hospitality') {
      // 5. STRUCTURE D'ACCUEIL VIP MOTORSPORT (Design moderne épuré sans croix)
      terrainLayer.noStroke();
      terrainLayer.fill(12, 18, 25, 90);
      terrainLayer.rect(-radius * 0.7 + 3, -radius * 0.5 + 3, radius * 1.4, radius, 2);

      terrainLayer.fill(24, 32, 45);
      terrainLayer.rect(-radius * 0.7, -radius * 0.5, radius * 1.4, radius, 2);

      terrainLayer.fill(0, 208, 132, 220);
      terrainLayer.rect(-radius * 0.7, -radius * 0.5, radius * 1.4, 2.5, 1);

    } else if (type === 'cactus') {
      // 5b. CACTUS DU DÉSERT (Req 3.5 — décor désertique)
      terrainLayer.noStroke();
      terrainLayer.fill(10, 25, 18, 80);
      terrainLayer.ellipse(4, 5, radius * 1.4, radius * 1.6);
      // Tronc principal
      terrainLayer.fill(34, 120, 60);
      terrainLayer.rect(-radius * 0.15, -radius * 0.6, radius * 0.3, radius * 1.2, 2);
      // Bras latéraux
      terrainLayer.rect(-radius * 0.55, -radius * 0.2, radius * 0.2, radius * 0.5, 1);
      terrainLayer.rect(radius * 0.35, -radius * 0.3, radius * 0.2, radius * 0.6, 1);
      // Épines claires
      terrainLayer.fill(180, 220, 140);
      for (let s = 0; s < 6; s++) {
        const sy = -radius * 0.5 + s * radius * 0.2;
        terrainLayer.ellipse(-radius * 0.12, sy, 1.5, 1.5);
        terrainLayer.ellipse(radius * 0.12, sy + radius * 0.1, 1.5, 1.5);
      }

    } else if (type === 'lamppost') {
      // 5c. LAMPADAIRE URBAIN (Req 3.5 — décor urbain)
      terrainLayer.noStroke();
      terrainLayer.fill(10, 15, 22, 90);
      terrainLayer.ellipse(3, 4, radius * 1.2, radius * 0.8);
      // Poteau
      terrainLayer.fill(100, 110, 125);
      terrainLayer.rect(-1.5, -radius, 3, radius * 2, 1);
      // Luminaire
      terrainLayer.fill(200, 210, 220);
      terrainLayer.ellipse(0, -radius, 6, 4);
      // Halo lumineux
      terrainLayer.fill(255, 245, 200, 60);
      terrainLayer.ellipse(0, -radius, 16, 10);

    } else if (type === 'building') {
      // 5d. BÂTIMENT URBAIN (Req 3.5 — décor urbain)
      terrainLayer.noStroke();
      terrainLayer.fill(10, 15, 25, 95);
      terrainLayer.rect(-radius * 0.7 + 4, -radius * 0.7 + 5, radius * 1.4, radius * 1.4, 1);
      // Structure principale
      terrainLayer.fill(55, 62, 78);
      terrainLayer.rect(-radius * 0.7, -radius * 0.7, radius * 1.4, radius * 1.4, 1);
      // Fenêtres
      terrainLayer.fill(120, 160, 200, 80);
      for (let wx = -radius * 0.55; wx < radius * 0.55; wx += 7) {
        for (let wy = -radius * 0.55; wy < radius * 0.55; wy += 7) {
          terrainLayer.rect(wx, wy, 4, 4, 0.5);
        }
      }
      // Toit
      terrainLayer.fill(40, 45, 55);
      terrainLayer.rect(-radius * 0.7, -radius * 0.75, radius * 1.4, 4, 1);

    } else if (type === 'barrier') {
      // 5e. BARRIÈRE TECPRO (Req 8.1 — barrières de sécurité compétition)
      const theme = (activeCircuit && activeCircuit.theme) ? activeCircuit.theme : null;
      const bp = (theme && theme.curbPrimary) ? theme.curbPrimary : '#dc2626';
      const bs = (theme && theme.curbSecondary) ? theme.curbSecondary : '#ffffff';
      const col = (seed % 4 < 2) ? bp : bs;
      terrainLayer.noStroke();
      terrainLayer.fill(10, 15, 22, 80);
      terrainLayer.rect(-radius * 0.8 + 2, -radius * 0.3 + 2, radius * 1.6, radius * 0.6, 1);
      terrainLayer.fill(col);
      terrainLayer.rect(-radius * 0.8, -radius * 0.3, radius * 1.6, radius * 0.6, 1);
      // Marquage de bande
      terrainLayer.fill(40, 40, 50, 120);
      terrainLayer.rect(-radius * 0.8, 0, radius * 1.6, 1.5, 0.5);

    } else {
      // 6. GRAND ARBRE FEUILLU (CHÊNE / MULTI-LOBES)
      terrainLayer.noStroke();
      terrainLayer.fill(10, 28, 20, 85);
      terrainLayer.ellipse(6, 7, radius * 2.1, radius * 1.9);

      terrainLayer.fill(20, 62, 38);
      terrainLayer.ellipse(0, 0, radius * 1.9, radius * 1.8);

      terrainLayer.fill(32, 98, 58);
      terrainLayer.ellipse(-radius * 0.3, -radius * 0.25, radius * 1.1, radius * 1.1);
      terrainLayer.ellipse(radius * 0.35, -radius * 0.2, radius * 1.05, radius * 1.05);
      terrainLayer.ellipse(-radius * 0.2, radius * 0.35, radius, radius);
      terrainLayer.ellipse(radius * 0.3, radius * 0.3, radius * 0.95, radius * 0.95);

      terrainLayer.fill(59, 165, 93);
      terrainLayer.ellipse(-radius * 0.35, -radius * 0.3, radius * 0.65, radius * 0.65);
      terrainLayer.ellipse(radius * 0.1, -radius * 0.4, radius * 0.55, radius * 0.55);

      terrainLayer.fill(16, 48, 28);
      terrainLayer.ellipse(0, 0, 5, 5);
    }

    terrainLayer.pop();
  }

  // ------------------------------------------------------------------------
  // G. MARQUAGES SECTORIELS ÉLÉGANTS DU CIRCUIT
  // ------------------------------------------------------------------------
  terrainLayer.textFont('Orbitron');
  terrainLayer.textSize(10.5);
  const tagColor = (activeCircuit && activeCircuit.theme && activeCircuit.theme.primaryColor) ? activeCircuit.theme.primaryColor : '#10b981';
  terrainLayer.fill(tagColor);
  terrainLayer.textAlign(LEFT, TOP);
  const circName = activeCircuit ? activeCircuit.name.toUpperCase() : 'COSTA AZZURRA';
  terrainLayer.text(`« ${circName} · FIA GRADE 1 RACING CIRCUIT »`, 32, 24);
  if (typeof terrainLayer.pop === 'function') terrainLayer.pop();
}
function setup() {
  // Chargement de la progression persistante
  loadProgression();

  // Création du canvas et rattachement au conteneur dédié avec dimensions garanties ≥ 1850×1080 (Req 1.1)
  const container = document.getElementById('canvas-container');
  const w = Math.max((container && container.clientWidth > 300) ? container.clientWidth : 1850, 1850);
  const h = Math.max((container && container.clientHeight > 200) ? container.clientHeight : 1080, 1080);
  const canvas = createCanvas(w, h);
  canvas.parent('canvas-container');
  const margin = (typeof terrainMargin === 'number') ? terrainMargin : 850;
  terrainLayer = createGraphics(Math.max(w, 1850) + margin * 2, Math.max(h, 1080) + margin * 2);

  // Configuration du backend CPU pour TensorFlow.js
  tf.setBackend('cpu');

  // Génération du tracé initial
  buildTrack();

  // Chargement asynchrone des photos Google Satellite & bolides GT3
  loadPhotoAssets();

  // Création de la population initiale
  initPopulation();

  // Initialisation des écouteurs d'événements de l'interface
  setupUIEventListeners();

  // Initialisation du gestionnaire de course Formula Racing
  if (typeof RaceManager !== 'undefined' && typeof RaceManager.init === 'function') {
    RaceManager.init();
  }

  // Premier rendu de la télémétrie et du championnat
  updateStageHUD();
  updateTelemetryUI(0);
  drawTelemetryChart();
  renderStagesGrid();

  // Recalcul du centrage et du cadrage optimal dès que le layout CSS et les polices sont stabilisés
  setTimeout(() => {
    if (typeof windowResized === 'function') windowResized();
    if (cameraMode === 'free') {
      updateCameraFree();
      camX = targetCamX;
      camY = targetCamY;
      camZoom = targetCamZoom;
      camRotation = 0;
      targetCamRotation = 0;
      if (typeof updateZoomDisplay === 'function') updateZoomDisplay();
    }
  }, 120);
}

function initPopulation() {
  if (typeof vehicleVisualSequence !== 'undefined') vehicleVisualSequence = 0;
  for (let v of population) {
    try { v.dispose(); } catch (e) { }
  }
  for (let v of savedVehicles) {
    try { v.dispose(); } catch (e) { }
  }
  population = [];
  savedVehicles = [];
  stageAttemptElapsed = 0;
  currentWinner = null;

  for (let i = 0; i < TOTAL; i++) {
    population[i] = new Vehicle();
  }
  generationPopulationSize = TOTAL;

  // Positionnement officiel et rigoureux de chaque bolide sur son emplacement de départ
  if (typeof StartingGrid !== 'undefined' && typeof StartingGrid.positionCars === 'function') {
    StartingGrid.positionCars(population, checkpoints);
  }

  if (currentDrivingMode === 'manual' && population.length > 0) {
    manualVehicle = population[0];
    manualVehicle.isManual = true;
  }

  if (typeof RaceManager !== 'undefined' && RaceManager.countdown && RaceManager.countdown.active) {
    raceState = 'countdown';
    for (let v of population) {
      if (typeof v.freezeOnGrid === 'function') v.freezeOnGrid();
      else if (v.vel) v.vel.set(0, 0);
    }
  } else {
    raceState = 'racing';
  }
}

// Synchroniser le meilleur score de génération et le record historique réel.
function updateBestScores(vehicles) {
  currentBestFitness = 0;
  for (const vehicle of vehicles) {
    currentBestFitness = Math.max(currentBestFitness, vehicle.checkpointsCount);
  }
  allTimeBestFitness = Math.max(allTimeBestFitness, currentBestFitness);
  return currentBestFitness;
}

// ==========================================================================
// 3. BOUCLE PRINCIPALE DE JEU (DRAW)
// ==========================================================================

function draw() {
  // 1. Mise à jour physique si la simulation n'est pas en pause et que la course est active
  if (!isPaused && raceState === 'racing') {
    const frameDt = (typeof deltaTime === 'number' && deltaTime > 0 && deltaTime < 200) ? deltaTime : 16.6;
    totalSessionElapsed += frameDt;

    for (let n = 0; n < simulationSpeed; n++) {
      stageAttemptElapsed += 16.666;

      // Déplacement et calcul des véhicules dans l'ordre physique rigoureux
      for (let vehicle of population) {
        if (vehicle.dead || vehicle.finished) continue;

        // A. Évaluation sensorielle et décision de commande combinée (Mode IA vs Mode Manuel)
        if (vehicle.isManual && currentDrivingMode === 'manual') {
          vehicle.applyManualControl(manualInputState, walls);
        } else {
          vehicle.applyBehaviors(walls, population);
        }
        if (vehicle.dead) continue;

        // B. Déplacement cinématique : enregistre prevPos et avance pos
        vehicle.update();

        // C. Résolution physique des contacts (murs, bordures, bolides, obstacles) sans élimination abusive
        if (typeof vehicle.resolveCollisions === 'function') {
          vehicle.resolveCollisions(walls, population, checkpoints, typeof trackObstacles !== 'undefined' ? trackObstacles : null);
        }

        // D. Franchissement géométrique des checkpoints avec la trajectoire [prevPos -> pos]
        vehicle.check(checkpoints, currentStage.targetLaps, triggerVictory);

        if (raceState === 'finished') break;
      }

      if (raceState === 'finished') break;

      // Élimination des voitures mortes (les voitures qui ont terminé restent en piste)
      for (let i = population.length - 1; i >= 0; i--) {
        const vehicle = population[i];
        if (vehicle.dead) {
          savedVehicles.push(population.splice(i, 1)[0]);
        }
      }

      // Fin de génération : transition génétique uniquement si la course est encore active
      if (population.length === 0) {
        handleGenerationEnd();
        break; // Sortie des cycles pour cette frame
      }
    }
  }

  // 2. Détermination du podium en direct (Top 1 Leader, Top 2, Top 3) en O(N) sans tri
  let top1 = null;
  let top2 = null;
  let top3 = null;

  for (let i = 0; i < population.length; i++) {
    const v = population[i];
    if (!top1 || v.checkpointsCount > top1.checkpointsCount || (v.checkpointsCount === top1.checkpointsCount && v.distanceTravelled > top1.distanceTravelled)) {
      top3 = top2;
      top2 = top1;
      top1 = v;
    } else if (!top2 || v.checkpointsCount > top2.checkpointsCount || (v.checkpointsCount === top2.checkpointsCount && v.distanceTravelled > top2.distanceTravelled)) {
      top3 = top2;
      top2 = v;
    } else if (!top3 || v.checkpointsCount > top3.checkpointsCount || (v.checkpointsCount === top3.checkpointsCount && v.distanceTravelled > top3.distanceTravelled)) {
      top3 = v;
    }
  }
  const bestP = (currentWinner && raceState === 'finished') ? currentWinner : top1;
  currentLeaderCar = bestP;
  const currentLiveScore = updateBestScores(population.concat(savedVehicles));

  // Mise à jour de l'overlay de tour en direct
  const overlayLap = document.getElementById('overlay-lap');
  if (overlayLap && currentStage) {
    if (raceState === 'finished') {
      overlayLap.textContent = `${currentStage.targetLaps} / ${currentStage.targetLaps} (TERMINÉ 🏆)`;
    } else {
      const currentLap = bestP ? Math.min(currentStage.targetLaps, bestP.lapsCompleted + 1) : 1;
      overlayLap.textContent = `TOUR ${currentLap} / ${currentStage.targetLaps}`;
    }
  }

  // Mise à jour en continu du chronomètre officiel dans le HUD et le topbar
  const overlayTime = document.getElementById('overlay-time');
  const timerText = document.getElementById('timer-text');
  if (raceState === 'racing' || raceState === 'finished') {
    const totalSec = Math.floor(stageAttemptElapsed / 1000);
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    const tenths = Math.floor((stageAttemptElapsed % 1000) / 100);
    const formattedCurrent = `${mins}:${secs}.${tenths}`;
    if (overlayTime) overlayTime.textContent = formattedCurrent;
    if (timerText) timerText.textContent = formattedCurrent;
  }

  // 3. Rendu graphique du monde avec caméra fluide (Suivi du leader/joueur ou Vue globale libre avec zoom)
  const followTarget = (currentDrivingMode === 'manual' && manualVehicle)
    ? manualVehicle
    : (selectedVehicle && !selectedVehicle.dead ? selectedVehicle : bestP);

  // Mise à jour de la cible caméra selon le mode actif (Req 5.1)
  if (cameraMode === 'cockpit') {
    if (followTarget && followTarget.pos) {
      updateCameraCockpit(followTarget);
    } else {
      updateCameraFree();
    }
  } else if (cameraMode === 'follow') {
    if (followTarget && followTarget.pos) {
      updateCameraFollow(followTarget);
    } else {
      updateCameraFree();
    }
  } else if (cameraMode === '3d') {
    updateCamera3D(followTarget);
  } else {
    updateCameraFree();
  }

  // Interpolation fluide de la caméra (Req 5.2, 5.3, 5.9)
  smoothCamera();

  push();
  translate(width / 2, height / 2);

  // Projection et perspective selon le mode caméra (Haute fidélité sans lag)
  if (cameraMode === '3d') {
    // Vue 3D isométrique avec inclinaison et compression de perspective équilibrée
    rotate(-0.12);
    scale(camZoom, camZoom * 0.75);
  } else if (cameraMode === 'follow' || cameraMode === 'cockpit') {
    rotate(camRotation);
    scale(camZoom, camZoom * 0.78);
  } else {
    scale(camZoom);
  }

  translate(-camX, -camY);

  renderTrack();

  // Rendu adaptatif (LOD) des voitures :
  // D'abord le peloton (LOD silhouette légère), puis Top 3 et Top 2, et enfin le Champion au premier plan
  for (let i = 0; i < population.length; i++) {
    const vehicle = population[i];
    if (vehicle !== top1 && vehicle !== top2 && vehicle !== top3 && vehicle !== currentWinner) {
      vehicle.show('fleet');
    }
  }

  // Top 3 (Bronze) et Top 2 (Argent)
  if (top3 && top3 !== top1) {
    top3.show('top3');
  }
  if (top2 && top2 !== top1) {
    top2.show('top2');
  }

  // Rendu en surbrillance du champion (Or / Orange incandescent au premier plan)
  if (bestP) {
    bestP.highlight();
  }

  // Rendu officiel des bolides retirés / éliminés (Restent visibles en bord de piste avec feux de détresse)
  // Résout définitivement le problème de disparition des voitures : 100% des bolides restent visibles
  if (Array.isArray(savedVehicles)) {
    for (let i = 0; i < savedVehicles.length; i++) {
      const v = savedVehicles[i];
      if (v && v.pos) {
        push();
        translate(v.pos.x, v.pos.y);
        rotate(v.heading);
        rectMode(CENTER);

        // Silhouette F1 de bolide immobilisé (Gris mat aéro avec contours de sécurité)
        fill(24, 32, 47, 175);
        stroke(239, 68, 68, 190);
        strokeWeight(1.2);
        rect(0, 0, 36, 16, 2);

        // Cockpit sombre
        fill(15, 23, 42, 220);
        noStroke();
        ellipse(0, 0, 7.5, 5);

        // Numéro de position ou mention DNF
        fill(255, 255, 255, 210);
        if (typeof textFont === 'function') textFont('Orbitron');
        if (typeof textSize === 'function') textSize(5.5);
        if (typeof textAlign === 'function' && typeof CENTER !== 'undefined') textAlign(CENTER, CENTER);
        if (typeof text === 'function') text(v.gridSlot !== undefined ? 'P' + (v.gridSlot + 1) : 'DNF', 0, 0.2);

        // Feux de détresse clignotants FIA (Safety Hazard Blinkers)
        const frameIdx = (typeof frameCount !== 'undefined') ? frameCount : 0;
        if (Math.floor(frameIdx / 15) % 2 === 0) {
          fill(245, 158, 11, 250);
          noStroke();
          ellipse(-16, -6, 3.2, 3.2);
          ellipse(-16, 6, 3.2, 3.2);
          ellipse(16, -6, 3.2, 3.2);
          ellipse(16, 6, 3.2, 3.2);
        }
        pop();
      }
    }
  }

  // Rendu du Mode Débogage dans l'espace Monde (Hitbox, forces Craig Reynolds, checkpoints, barrières)
  if (debugMode) {
    drawWorldDebug(bestP);
  }

  // Structure surélevée du portique 2.5D au-dessus de la piste (les bolides passent en dessous)
  if (checkpoints && checkpoints.length > 0) {
    drawElevatedOverheadGantry(checkpoints[0]);
  }

  pop();

  // Overlay Cockpit GT3 / Formule 1 immersif (Req 4 : Vue cockpit de pilotage)
  if (cameraMode === 'cockpit') {
    renderCockpitOverlay(followTarget);
  }

  // Overlay "PAUSE" si la simulation est suspendue
  if (isPaused && raceState === 'racing') {
    renderPauseOverlay();
  }

  // Overlay HUD Débogage (Performances, Tensors, FPS, Véhicules vivants, Télémétrie)
  if (debugMode) {
    drawDebugHUD(bestP);
  }

  // Moteur audio Formule 1 professionnel : modulation dynamique du régime selon la vitesse du leader
  if (typeof SoundSystem !== 'undefined' && typeof SoundSystem.updateEngineSound === 'function') {
    if (raceState === 'racing' && typeof bestP !== 'undefined' && bestP && !bestP.dead) {
      const spd = (bestP.speed !== undefined) ? bestP.speed : 3;
      const ratio = Math.min(1.0, spd / 5.5);
      SoundSystem.updateEngineSound(ratio, true);
    } else {
      SoundSystem.updateEngineSound(0, false);
    }
  }

  // Mise à jour périodique des chiffres du tableau de bord (chaque 3 frames)
  if (frameCount % 3 === 0) {
    updateTelemetryUI(typeof currentLiveScore !== 'undefined' ? currentLiveScore : 0);
  }

  // Rendu en direct de l'architecture du réseau de neurones (si ouvert)
  if (neuralModalOpen) {
    renderNeuralNetworkVisualizer();
  }
}

// ==========================================================================
// 4. TRANSITION DE GÉNÉRATION ET GESTION DES MODES DE CIRCUIT
// ==========================================================================

function handleGenerationEnd() {
  if (raceState !== 'racing') return;

  // Réinitialisation du chronomètre d'épreuve pour la nouvelle tentative
  stageAttemptElapsed = 0;

  // Calcul du score maximal atteint par cette génération
  updateBestScores(savedVehicles);

  // Calcul rigoureux des vraies métriques de la génération (données réelles non simulées)
  let minScore = Infinity;
  let maxScore = 0;
  let sumScore = 0;
  const count = savedVehicles.length;

  for (let i = 0; i < count; i++) {
    const s = savedVehicles[i].checkpointsCount || 0;
    if (s < minScore) minScore = s;
    if (s > maxScore) maxScore = s;
    sumScore += s;
  }
  if (minScore === Infinity) minScore = 0;
  const avgScore = count > 0 ? (sumScore / count) : 0;

  // Enregistrement dans l'historique pour le graphique à 3 courbes (Meilleur, Moyenne, Min)
  generationHistory.push({
    gen: generationCount,
    best: maxScore,
    avg: parseFloat(avgScore.toFixed(1)),
    min: minScore,
    record: allTimeBestFitness
  });

  // Gestion des modes de circuits :
  if (trackMode === 'randomChallenge') {
    // Mode Défi Aléatoire : on change systématiquement de circuit !
    currentTrackIndex++;
    buildTrack();
  }

  // Création de la nouvelle génération par algorithme génétique
  currentGenLiveSamples = [];
  nextGeneration();
  generationCount++;

  // Repositionnement et alignement officiel de la nouvelle génération sur la grille de départ
  if (typeof StartingGrid !== 'undefined' && typeof StartingGrid.positionCars === 'function') {
    StartingGrid.positionCars(population, checkpoints);
  }

  if (currentDrivingMode === 'manual' && population.length > 0) {
    manualVehicle = population[0];
    manualVehicle.isManual = true;
  }

  // Libération synchronisée ou procédure officielle selon le mode
  if (typeof RaceManager !== 'undefined' && RaceManager.config && RaceManager.config.gameMode === 'race' && typeof setTimeout === 'function') {
    RaceManager.startCountdown();
  } else {
    for (let v of population) {
      if (typeof v.launchRace === 'function') v.launchRace();
      else {
        v.speed = 2.0;
        if (typeof p5 !== 'undefined' && p5.Vector && typeof p5.Vector.fromAngle === 'function') {
          v.vel = p5.Vector.fromAngle(v.heading).mult(v.speed);
        } else if (typeof createVector === 'function') {
          v.vel = createVector(Math.cos(v.heading) * v.speed, Math.sin(v.heading) * v.speed);
        } else if (v.vel) {
          v.vel.x = Math.cos(v.heading) * v.speed;
          v.vel.y = Math.sin(v.heading) * v.speed;
        }
      }
    }
  }
  // Échantillonnage continu pour courbe d'évolution en direct (dès la génération 1)
  liveSampleFrameCounter++;
  if (liveSampleFrameCounter % 15 === 0) {
    const allCars = (Array.isArray(population) ? population : []).concat(Array.isArray(savedVehicles) ? savedVehicles : []);
    if (allCars.length > 0) {
      let curMin = Infinity;
      let curMax = 0;
      let curSum = 0;
      for (let i = 0; i < allCars.length; i++) {
        const s = allCars[i].checkpointsCount || 0;
        if (s < curMin) curMin = s;
        if (s > curMax) curMax = s;
        curSum += s;
      }
      if (curMin === Infinity) curMin = 0;
      const curAvg = parseFloat((curSum / allCars.length).toFixed(1));
      currentGenLiveSamples.push({
        time: (typeof frameCount !== 'undefined') ? frameCount : Date.now(),
        best: curMax,
        avg: curAvg,
        min: curMin
      });
      if (currentGenLiveSamples.length > 60) {
        currentGenLiveSamples.shift();
      }
    }
  }

  // Couper la boucle audio du moteur entre deux générations
  if (typeof SoundSystem !== 'undefined' && typeof SoundSystem.updateEngineSound === 'function') {
    SoundSystem.updateEngineSound(0, false);
  }

  // Actualisation graphique du tableau de bord et de la courbe
  updateTelemetryUI(0);
  drawTelemetryChart();
}

// ==========================================================================
// 5. RENDU DU CIRCUIT (ASPHALTE, VIBREURS, DAMIER, BALISES)
// ==========================================================================

function drawInfiniteOceanRipples(left, top, w, h, cx, cy) {
  // Dégradés doux d'eau côtière turquoise vers l'île
  noStroke();
  fill(14, 62, 94, 55);
  ellipse(cx, cy, 2800, 1900);

  fill(18, 92, 126, 40);
  ellipse(cx, cy, 2100, 1400);

  // Vaguelettes et houle naturelle de haute mer
  const stepY = 110;
  const t = (typeof frameCount === 'number' ? frameCount : 0) * 0.015;
  const startY = Math.floor(top / stepY) * stepY;
  const endY = top + h + stepY;

  stroke(130, 220, 235, 18);
  strokeWeight(1.4);
  noFill();

  for (let y = startY; y <= endY; y += stepY) {
    beginShape();
    for (let x = left; x <= left + w + 120; x += 140) {
      const wave = Math.sin((x * 0.007) + (y * 0.012) + t) * 6;
      vertex(x, y + wave);
    }
    endShape();
  }
}

function renderTrack() {
  const safeZoom = Math.max(0.12, camZoom);
  const viewMargin = 850;
  const viewLeft = camX - (width / 2) / safeZoom - viewMargin;
  const viewTop = camY - (height / 2) / safeZoom - viewMargin;
  const viewW = (width / safeZoom) + viewMargin * 2;
  const viewH = (height / safeZoom) + viewMargin * 2;

  const activeCircuit = (typeof CircuitRegistry !== 'undefined' && typeof CircuitRegistry.getActive === 'function')
    ? CircuitRegistry.getActive()
    : null;
  const ambientHex = (activeCircuit && activeCircuit.ambientColor) ? activeCircuit.ambientColor : '#0a2e46';

  // 1. Fond d'environnement continu couvrant 100% de la vue caméra sans découpe ni bande parasite
  background(ambientHex);
  noStroke();
  fill(ambientHex);
  rect(viewLeft, viewTop, viewW, viewH);

  // 2. Couche de terrain (Photo satellite HD sans coupure, paddock, tribunes)
  const margin = (typeof terrainMargin === 'number') ? terrainMargin : 850;
  if (terrainLayer) {
    image(terrainLayer, -margin, -margin);
  }

  if (checkpoints.length === 0) return;

  const total = inside.length;
  const theme = (activeCircuit && activeCircuit.theme) ? activeCircuit.theme : null;
  const gravelCol = (theme && theme.gravelColor) ? color(theme.gravelColor) : color(196, 154, 88, 220);
  const curbPrimaryCol = (theme && theme.curbPrimary) ? color(theme.curbPrimary) : color(225, 29, 72);
  const curbSecondaryCol = (theme && theme.curbSecondary) ? color(theme.curbSecondary) : color(248, 250, 255);

  // A. Lit de gravier naturel de sécurité (Run-off gravel trap pouzzolane 24px)
  stroke(gravelCol);
  strokeWeight(24);
  strokeCap(ROUND);
  for (let i = 0; i < total; i++) {
    const next = (i + 1) % total;
    line(inside[i].x, inside[i].y, inside[next].x, inside[next].y);
    line(outside[i].x, outside[i].y, outside[next].x, outside[next].y);
  }
  // Bordure intérieure de gravier plus dense
  stroke(165, 128, 70, 160);
  strokeWeight(12);
  for (let i = 0; i < total; i++) {
    const next = (i + 1) % total;
    line(inside[i].x, inside[i].y, inside[next].x, inside[next].y);
    line(outside[i].x, outside[i].y, outside[next].x, outside[next].y);
  }

  // B. Chaussée en asphalte compétition haute adhérence
  const asphaltAlpha = 255;
  noStroke();
  for (let i = 0; i < total; i++) {
    const next = (i + 1) % total;
    const shade = (Math.floor(i / 5) % 2 === 0) ? 32 : 36;
    fill(shade, shade + 3, shade + 8, asphaltAlpha);
    quad(inside[i].x, inside[i].y, outside[i].x, outside[i].y,
      outside[next].x, outside[next].y, inside[next].x, inside[next].y);
  }

  // C. Trajectoire idéale gommée par les pneus (Rubbered Racing Line)
  stroke(12, 16, 22, 175);
  strokeWeight(18);
  strokeCap(ROUND);
  for (let i = 0; i < checkpoints.length; i++) {
    const next = (i + 1) % checkpoints.length;
    const m1 = checkpoints[i].midpoint();
    const m2 = checkpoints[next].midpoint();
    line(m1.x, m1.y, m2.x, m2.y);
  }

  // D. Marquages au sol : Lignes multivoies sur les lignes droites et médianes sportives
  push();
  strokeCap(ROUND);
  for (let i = 0; i < checkpoints.length; i++) {
    const next = (i + 1) % checkpoints.length;
    const cp = checkpoints[i];
    const cpNext = checkpoints[next];
    const w = cp.trackWidth || (cp.a && cp.b ? Math.hypot(cp.b.x - cp.a.x, cp.b.y - cp.a.y) : 90);
    const wNext = cpNext.trackWidth || (cpNext.a && cpNext.b ? Math.hypot(cpNext.b.x - cpNext.a.x, cpNext.b.y - cpNext.a.y) : 90);
    const avgW = (w + wNext) * 0.5;

    if (avgW >= 106) {
      // Zone large / ligne droite propice aux dépassements : Rendu 3 VOIES avec doubles séparateurs discontinus
      if (i % 3 !== 2) {
        // Voie 1/3 (gauche)
        const l1aX = cp.a.x + (cp.b.x - cp.a.x) * 0.333;
        const l1aY = cp.a.y + (cp.b.y - cp.a.y) * 0.333;
        const l1bX = cpNext.a.x + (cpNext.b.x - cpNext.a.x) * 0.333;
        const l1bY = cpNext.a.y + (cpNext.b.y - cpNext.a.y) * 0.333;

        // Voie 2/3 (droite)
        const l2aX = cp.a.x + (cp.b.x - cp.a.x) * 0.667;
        const l2aY = cp.a.y + (cp.b.y - cp.a.y) * 0.667;
        const l2bX = cpNext.a.x + (cpNext.b.x - cpNext.a.x) * 0.667;
        const l2bY = cpNext.a.y + (cpNext.b.y - cpNext.a.y) * 0.667;

        stroke(255, 255, 255, 140);
        strokeWeight(2.0);
        line(l1aX, l1aY, l1bX, l1bY);
        line(l2aX, l2aY, l2bX, l2bY);
      }
    } else {
      // Section technique sinueuse : Ligne axiale discontinue classique de circuit
      if (i % 2 === 0) {
        const m1 = cp.midpoint();
        const m2 = cpNext.midpoint();
        stroke(248, 250, 255, 75);
        strokeWeight(1.8);
        line(m1.x, m1.y, m2.x, m2.y);
      }
    }
  }
  pop();

  // E. Vibreurs de course FIA en relief 3D bicolores avec biseau 2.5D
  // 1. Ombre d'assise sous les vibreurs
  stroke(8, 12, 16, 230);
  strokeWeight(12);
  strokeCap(SQUARE);
  for (let i = 0; i < checkpoints.length; i++) {
    const next = (i + 1) % checkpoints.length;
    line(inside[i].x, inside[i].y, inside[next].x, inside[next].y);
    line(outside[i].x, outside[i].y, outside[next].x, outside[next].y);
  }
  // 2. Bandes alternées de vibreurs aux couleurs du thème officiel du circuit
  for (let i = 0; i < checkpoints.length; i++) {
    const next = (i + 1) % checkpoints.length;
    const isPrimary = (Math.floor(i / 2) % 2 === 0);
    strokeWeight(8.0);
    strokeCap(SQUARE);
    stroke(isPrimary ? curbPrimaryCol : curbSecondaryCol);
    line(inside[i].x, inside[i].y, inside[next].x, inside[next].y);
    line(outside[i].x, outside[i].y, outside[next].x, outside[next].y);
  }
  // 3. Biseau 2.5D supérieur éclairé par le soleil
  stroke(255, 255, 255, 115);
  strokeWeight(1.6);
  strokeCap(ROUND);
  for (let i = 0; i < checkpoints.length; i++) {
    const next = (i + 1) % checkpoints.length;
    line(inside[i].x, inside[i].y, inside[next].x, inside[next].y);
    line(outside[i].x, outside[i].y, outside[next].x, outside[next].y);
  }

  // F. Lignes continues de délimitation de piste (Track limits blanches F1)
  stroke(255, 255, 255, 230);
  strokeWeight(2);
  strokeCap(ROUND);
  for (let i = 0; i < total; i++) {
    const next = (i + 1) % total;
    line(inside[i].x, inside[i].y, inside[next].x, inside[next].y);
    line(outside[i].x, outside[i].y, outside[next].x, outside[next].y);
  }

  // G. Barrières de sécurité (Rail armco métallique FIA)
  // Ombre de barrière
  stroke(10, 18, 24, 90);
  strokeWeight(5.5);
  for (let wall of walls) {
    line(wall.a.x + 1.5, wall.a.y + 2, wall.b.x + 1.5, wall.b.y + 2);
  }
  // Corps du rail en acier galvanisé
  stroke(148, 163, 184, 210);
  strokeWeight(3.2);
  for (let wall of walls) {
    line(wall.a.x, wall.a.y, wall.b.x, wall.b.y);
  }
  // Ligne de crête métallique brillante
  stroke(241, 245, 249, 230);
  strokeWeight(1.2);
  for (let wall of walls) {
    line(wall.a.x, wall.a.y, wall.b.x, wall.b.y);
  }

  // H. Panneaux de distance de freinage 2.5D (150m, 100m, 50m) avant les virages clés
  draw2DBrakeBoards(checkpoints);

  // I. Ombre portée 2.5D au sol du portique de départ
  if (checkpoints.length > 0) {
    drawGantryGroundShadow(checkpoints[0]);
  }

  // J. Portiques sectoriels de chronométrage (Secteur 2 & Secteur 3)
  const s2 = Math.floor(checkpoints.length / 3);
  const s3 = Math.floor((checkpoints.length * 2) / 3);
  drawSectorGate(checkpoints[s2], 250, 204, 21, 'SECTEUR 2');
  drawSectorGate(checkpoints[s3], 168, 85, 247, 'SECTEUR 3');

  // K. Grille de départ officielle avec emplacements peints et Ligne à Damier
  if (typeof StartingGrid !== 'undefined' && typeof StartingGrid.draw === 'function') {
    const activeCarCount = (population && population.length > 0) ? population.length : (typeof TOTAL !== 'undefined' ? TOTAL : 20);
    StartingGrid.draw(checkpoints, activeCarCount);
  } else {
    drawCheckeredStartLine(checkpoints[0].a, checkpoints[0].b);
  }
}

// ------------------------------------------------------------------------
// MODULES GRAPHIQUES 2.5D : PANNEAUX DE DISTANCE & PORTIQUE SURÉLEVÉ
// ------------------------------------------------------------------------

function draw2DBrakeBoards(cps) {
  if (!cps || cps.length < 30) return;
  const brakeZones = [6, 12, 22, 40];
  const offsets = [
    { dist: 3, label: '150' },
    { dist: 2, label: '100' },
    { dist: 1, label: '50' }
  ];

  push();
  rectMode(CENTER);
  for (const zone of brakeZones) {
    for (const b of offsets) {
      const idx = (zone - b.dist + cps.length) % cps.length;
      const cp = cps[idx];
      const nextCp = cps[(idx + 1) % cps.length];
      if (!cp || !cp.b || !nextCp || !nextCp.b) continue;

      const dx = nextCp.b.x - cp.b.x;
      const dy = nextCp.b.y - cp.b.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const angle = Math.atan2(dy, dx);

      // 18px à l'extérieur de la bordure extérieure cp.b
      const bx = cp.b.x + nx * 18;
      const by = cp.b.y + ny * 18;

      // 1. Ombre portée 2.5D du panneau
      noStroke();
      fill(10, 15, 22, 110);
      ellipse(bx + 4, by + 5, 14, 6);

      // 2. Poteau vertical de support 2.5D
      stroke(100, 116, 139);
      strokeWeight(2.0);
      line(bx, by, bx + 1, by - 6);

      // 3. Panneau indicateur orienté vers les pilotes
      push();
      translate(bx, by - 6);
      rotate(angle);

      // Face du panneau avec bordure rouge sport
      fill(248, 250, 252);
      stroke(225, 29, 72);
      strokeWeight(1.4);
      rect(0, 0, 14, 8, 1);

      // Chiffre de métrage
      noStroke();
      fill(15, 23, 42);
      if (typeof textFont === 'function') textFont('Orbitron');
      if (typeof textSize === 'function') textSize(5);
      if (typeof textStyle === 'function' && typeof BOLD !== 'undefined') textStyle(BOLD);
      if (typeof textAlign === 'function' && typeof CENTER !== 'undefined') textAlign(CENTER, CENTER);
      if (typeof text === 'function') text(b.label, 0, 0);
      pop();
    }
  }
  pop();
}

function drawGantryGroundShadow(cp) {
  if (!cp || !cp.a || !cp.b) return;
  const p1 = cp.a;
  const p2 = cp.b;
  const sunDx = 16;
  const sunDy = 22;

  push();
  noStroke();
  // Ombre portée du tablier du pont traversant la piste
  fill(5, 8, 14, 115);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const fwdX = -dy / len * 16;
  const fwdY = dx / len * 16;

  beginShape();
  vertex(p1.x + sunDx - fwdX * 0.5, p1.y + sunDy - fwdY * 0.5);
  vertex(p2.x + sunDx - fwdX * 0.5, p2.y + sunDy - fwdY * 0.5);
  vertex(p2.x + sunDx + fwdX * 0.5, p2.y + sunDy + fwdY * 0.5);
  vertex(p1.x + sunDx + fwdX * 0.5, p1.y + sunDy + fwdY * 0.5);
  endShape(CLOSE);

  // Ombres portées des piliers gauche et droite
  fill(5, 8, 14, 130);
  rectMode(CENTER);
  rect(p1.x + sunDx * 0.7, p1.y + sunDy * 0.7, 12, 12, 2);
  rect(p2.x + sunDx * 0.7, p2.y + sunDy * 0.7, 12, 12, 2);
  pop();
}

function drawElevatedOverheadGantry(cp) {
  if (!cp || !cp.a || !cp.b) return;
  const p1 = cp.a;
  const p2 = cp.b;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;

  // Position des piliers hors piste (16px de dégagement extérieur)
  const leftX = p1.x - nx * 16;
  const leftY = p1.y - ny * 16;
  const rightX = p2.x + nx * 16;
  const rightY = p2.y + ny * 16;

  push();
  // 1. Piliers porteurs verticaux en treillis d'acier 3D
  const drawTower = (x, y) => {
    // Semelle béton
    fill(51, 65, 85);
    stroke(30, 41, 59);
    strokeWeight(1.5);
    rectMode(CENTER);
    rect(x, y, 16, 16, 2);

    // Colonne acier
    fill(148, 163, 184);
    rect(x, y - 6, 12, 12, 1.5);
    fill(203, 213, 225);
    rect(x - 2, y - 7, 5, 9, 1);
  };
  drawTower(leftX, leftY);
  drawTower(rightX, rightY);

  // 2. Tablier supérieur suspendu au-dessus de la piste (Perspective 2.5D surélevée)
  // Décalage vertical en hauteur 2.5D : -18px
  const elevY = -18;
  const g1x = leftX;
  const g1y = leftY + elevY;
  const g2x = rightX;
  const g2y = rightY + elevY;

  // Poutre maîtresse en acier (face inférieure ombrée)
  stroke(30, 41, 59);
  strokeWeight(9);
  strokeCap(SQUARE);
  line(g1x, g1y + 2, g2x, g2y + 2);

  // Poutre maîtresse (face supérieure éclairée)
  stroke(226, 232, 240);
  strokeWeight(7);
  line(g1x, g1y, g2x, g2y);

  // Bandeau sponsor / affichage LED officiel de la course
  const midX = (g1x + g2x) / 2;
  const midY = (g1y + g2y) / 2;
  const angle = Math.atan2(g2y - g1y, g2x - g1x);

  push();
  translate(midX, midY);
  rotate(angle);
  rectMode(CENTER);

  // Écran LED
  fill(10, 15, 26, 245);
  stroke(0, 208, 132, 200);
  strokeWeight(1.2);
  const panelW = Math.min(len * 0.75, 220);
  rect(0, 0, panelW, 11, 2);

  // Titre FIA
  noStroke();
  fill(0, 240, 255);
  if (typeof textFont === 'function') textFont('Orbitron');
  if (typeof textSize === 'function') textSize(5.8);
  if (typeof textStyle === 'function' && typeof BOLD !== 'undefined') textStyle(BOLD);
  if (typeof textAlign === 'function' && typeof CENTER !== 'undefined') textAlign(CENTER, CENTER);
  if (typeof text === 'function') {
    text('🏁 FIA FORMULA AUTONOMOUS GP · LIGNE DE DÉPART', 0, 0.2);
  }
  pop();

  // 3. Feux de départ 5 LED F1 suspendus sous le portique
  const isCountdown = (typeof RaceManager !== 'undefined' && RaceManager.countdown && RaceManager.countdown.active);
  const step = isCountdown ? (RaceManager.countdown.step || 0) : 0;
  const isRacing = (typeof raceState !== 'undefined' && raceState === 'racing');

  push();
  translate(midX, midY + 9);
  rotate(angle);
  rectMode(CENTER);

  fill(15, 23, 42, 240);
  stroke(51, 65, 85);
  strokeWeight(1.0);
  rect(0, 0, 52, 9, 2);

  for (let k = 0; k < 5; k++) {
    const lx = -20 + k * 10;
    noStroke();
    if (isCountdown) {
      if (k < step) {
        fill(255, 0, 40, 255);
        ellipse(lx, 0, 5, 5);
        fill(255, 0, 40, 110);
        ellipse(lx, 0, 9, 9);
      } else {
        fill(30, 41, 59);
        ellipse(lx, 0, 4.5, 4.5);
      }
    } else if (isRacing) {
      fill(34, 197, 94, 255);
      ellipse(lx, 0, 5, 5);
      fill(34, 197, 94, 90);
      ellipse(lx, 0, 8, 8);
    } else {
      fill(234, 179, 8, 220);
      ellipse(lx, 0, 4.5, 4.5);
    }
  }
  pop();

  pop();
}

function drawSectorGate(cp, r, g, b, label = '') {
  if (!cp) return;
  const debug = (typeof debugMode !== 'undefined' ? debugMode : false) || (typeof isDebugMode !== 'undefined' ? isDebugMode : false);
  if (debug) {
    push();
    // 1. Faisceau laser sectoriel translucide à travers la piste
    stroke(r, g, b, 40);
    strokeWeight(5);
    line(cp.a.x, cp.a.y, cp.b.x, cp.b.y);

    stroke(r, g, b, 180);
    strokeWeight(1.8);
    line(cp.a.x, cp.a.y, cp.b.x, cp.b.y);

    // 2. Balises lumineuses d'ancrage aux extrémités
    noStroke();
    fill(r, g, b, 230);
    ellipse(cp.a.x, cp.a.y, 7, 7);
    ellipse(cp.b.x, cp.b.y, 7, 7);
    fill(255, 255, 255, 240);
    ellipse(cp.a.x, cp.a.y, 3, 3);
    ellipse(cp.b.x, cp.b.y, 3, 3);

    // 3. Étiquette sectorielle typographique
    if (label) {
      const mid = cp.midpoint ? cp.midpoint() : { x: (cp.a.x + cp.b.x) / 2, y: (cp.a.y + cp.b.y) / 2 };
      fill(r, g, b, 200);
      textFont('Orbitron');
      textSize(7);
      textAlign(CENTER, BOTTOM);
      text(label, mid.x, mid.y - 4);
    }
    pop();
  } else {
    // Mode normal : ligne de chronométrage discrète dans l'asphalte (aucun laser ni texte invasif)
    push();
    stroke(18, 24, 32, 140);
    strokeWeight(1.2);
    line(cp.a.x, cp.a.y, cp.b.x, cp.b.y);
    pop();
  }
}

function drawCheckeredStartLine(p1, p2) {
  if (typeof StartingGrid !== 'undefined' && typeof StartingGrid.draw === 'function' && typeof checkpoints !== 'undefined' && checkpoints.length > 0) {
    const activeCount = (typeof population !== 'undefined' && population && population.length > 0) ? population.length : (typeof TOTAL !== 'undefined' ? TOTAL : 20);
    StartingGrid.draw(checkpoints, activeCount);
    return;
  }
  push();
  const segments = 14;

  let offX = 0, offY = 0;
  if (checkpoints.length > 1) {
    const m0 = checkpoints[0].midpoint();
    const m1 = checkpoints[1].midpoint();
    const len = Math.hypot(m1.x - m0.x, m1.y - m0.y) || 1;
    offX = ((m1.x - m0.x) / len) * 3.2;
    offY = ((m1.y - m0.y) / len) * 3.2;
  }

  // Grille de départ : Emplacements peints en quinconce (Slots 1 à 6)
  for (let slot = 0; slot < 6; slot++) {
    const distBack = (slot + 1) * 7.5;
    const laneOffset = (slot % 2 === 0) ? 0.32 : 0.68;
    const bx = lerp(p1.x, p2.x, laneOffset) - offX * distBack;
    const by = lerp(p1.y, p2.y, laneOffset) - offY * distBack;

    stroke(255, 255, 255, 110);
    strokeWeight(1.2);
    noFill();
    rectMode(CENTER);
    push();
    translate(bx, by);
    rotate(startHeading);
    rect(0, 0, 20, 10, 1.5);
    fill(255, 255, 255, 140);
    noStroke();
    textFont('Orbitron');
    textSize(5);
    textAlign(CENTER, CENTER);
    text(String(slot + 1), -4, 0);
    pop();
  }

  // 1. Ligne blanche d'arrêt de grille (Stop line) en amont
  stroke(245, 250, 255, 200);
  strokeWeight(2.5);
  line(p1.x - offX * 2, p1.y - offY * 2, p2.x - offX * 2, p2.y - offY * 2);

  // 2. Double rangée de damier bicolore Formule 1
  for (let row = 0; row < 2; row++) {
    const rOffX = (row === 0) ? -offX : offX;
    const rOffY = (row === 0) ? -offY : offY;

    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;
      const x1 = lerp(p1.x, p2.x, t1) + rOffX;
      const y1 = lerp(p1.y, p2.y, t1) + rOffY;
      const x2 = lerp(p1.x, p2.x, t2) + rOffX;
      const y2 = lerp(p1.y, p2.y, t2) + rOffY;

      const isWhite = (i + row) % 2 === 0;
      stroke(isWhite ? color(255, 255, 255) : color(15, 23, 42));
      strokeWeight(5.5);
      strokeCap(SQUARE);
      line(x1, y1, x2, y2);
    }
  }

  // 3. Portique suspendu de départ avec feux Formula 1
  noStroke();
  fill(0, 255, 160, 60);
  ellipse(p1.x, p1.y, 18, 18);
  ellipse(p2.x, p2.y, 18, 18);

  fill(0, 255, 160, 240);
  ellipse(p1.x, p1.y, 9, 9);
  ellipse(p2.x, p2.y, 9, 9);

  fill(255, 255, 255, 255);
  ellipse(p1.x, p1.y, 3.5, 3.5);
  ellipse(p2.x, p2.y, 3.5, 3.5);

  pop();
}

// Overlay immersif de vue cockpit GT3 / Formule 1 (Req 4 : Vue cockpit avec "Ma Voiture")
function renderCockpitOverlay(target) {
  if (typeof push !== 'function' || typeof pop !== 'function') return;
  const closeConst = (typeof CLOSE !== 'undefined') ? CLOSE : 'close';
  push();
  if (typeof resetMatrix === 'function') resetMatrix();

  const w = (typeof width === 'number') ? width : 1200;
  const h = (typeof height === 'number') ? height : 800;
  const isPlayer = !!(target && target.isManual);
  const carSpeed = (target && typeof target.speed === 'number') ? target.speed : 3.5;
  const speedKmh = Math.round(carSpeed * 32);
  const maxSpeed = (typeof STEERING_CONFIG !== 'undefined' && STEERING_CONFIG.maxspeed) ? STEERING_CONFIG.maxspeed : 6.0;
  const speedRatio = Math.min(1.0, Math.max(0, carSpeed / maxSpeed));

  // 1. Pare-soleil supérieur de pare-brise Formula / GT3
  noStroke();
  fill(10, 15, 22, 195);
  rect(0, 0, w, 38);
  fill(isPlayer ? color(0, 240, 255, 220) : color(0, 208, 132, 220));
  rect(0, 38, w, 2.5);

  fill(240, 245, 250, 230);
  if (typeof textFont === 'function') textFont('Orbitron');
  if (typeof textSize === 'function') textSize(11);
  if (typeof textAlign === 'function' && typeof CENTER !== 'undefined') textAlign(CENTER, CENTER);
  const bannerText = isPlayer
    ? '🏎️ COCKPIT PILOTE JOUEUR · VOTRE VOITURE (#1)'
    : 'AUTONOMOUS RACING LAB · COCKPIT TELEMETRY';
  if (typeof text === 'function') text(bannerText, w / 2, 20);

  // 2. Montants latéraux de pare-brise (A-pillars)
  fill(14, 19, 27, 230);
  beginShape();
  vertex(0, 0);
  vertex(60, 0);
  vertex(30, h * 0.72);
  vertex(0, h * 0.80);
  endShape(closeConst);

  beginShape();
  vertex(w, 0);
  vertex(w - 60, 0);
  vertex(w - 30, h * 0.72);
  vertex(w, h * 0.80);
  endShape(closeConst);

  // 3. Casquette aérodynamique de planche de bord (Dashboard Cowl)
  const dashH = Math.min(135, h * 0.22);
  const dashY = h - dashH;

  fill(7, 11, 17, 245);
  beginShape();
  vertex(0, h);
  vertex(0, dashY + 30);
  vertex(w * 0.18, dashY + 16);
  vertex(w * 0.32, dashY + 4);
  vertex(w * 0.50, dashY);
  vertex(w * 0.68, dashY + 4);
  vertex(w * 0.82, dashY + 16);
  vertex(w, dashY + 30);
  vertex(w, h);
  endShape(closeConst);

  stroke(isPlayer ? color(0, 240, 255, 160) : color(0, 208, 132, 160));
  strokeWeight(2);
  noFill();
  beginShape();
  vertex(w * 0.22, dashY + 18);
  vertex(w * 0.34, dashY + 6);
  vertex(w * 0.50, dashY + 2);
  vertex(w * 0.66, dashY + 6);
  vertex(w * 0.78, dashY + 18);
  endShape();
  noStroke();

  // 4. Écran de télémétrie numérique central (Digital Instrument Display)
  const clusterW = Math.min(270, w * 0.42);
  const clusterH = 74;
  const clusterX = w / 2 - clusterW / 2;
  const clusterY = h - clusterH - 12;

  fill(12, 17, 26, 250);
  stroke(30, 41, 59, 255);
  strokeWeight(1.5);
  rect(clusterX, clusterY, clusterW, clusterH, 8);
  noStroke();

  // Barre LED Shift Lights (12 diodes dynamiques F1 / GT3)
  const ledsCount = 12;
  const ledW = (clusterW - 32) / ledsCount - 3;
  const ledsActive = Math.round(speedRatio * ledsCount);
  for (let i = 0; i < ledsCount; i++) {
    const lx = clusterX + 16 + i * (ledW + 3);
    const ly = clusterY + 10;
    if (i < ledsActive) {
      if (i < 4) fill(34, 197, 94);
      else if (i < 8) fill(234, 179, 8);
      else fill(239, 68, 68);
    } else {
      fill(25, 35, 48, 180);
    }
    rect(lx, ly, ledW, 6, 2);
  }

  // Rapport de boîte de vitesse (Gear)
  let gear = 'N';
  if (carSpeed > 5.2) gear = '6';
  else if (carSpeed > 4.2) gear = '5';
  else if (carSpeed > 3.0) gear = '4';
  else if (carSpeed > 1.8) gear = '3';
  else if (carSpeed > 0.8) gear = '2';
  else if (carSpeed > 0.1) gear = '1';

  fill(isPlayer ? color(0, 240, 255) : color(0, 208, 132));
  if (typeof textFont === 'function') textFont('Orbitron');
  if (typeof textSize === 'function') textSize(24);
  if (typeof textAlign === 'function' && typeof CENTER !== 'undefined') textAlign(CENTER, CENTER);
  if (typeof text === 'function') text(gear, clusterX + 38, clusterY + 44);

  // Vitesse en km/h
  fill(255, 255, 255);
  if (typeof textSize === 'function') textSize(20);
  if (typeof text === 'function') text(`${speedKmh}`, clusterX + clusterW / 2, clusterY + 38);
  fill(148, 163, 184);
  if (typeof textSize === 'function') textSize(9);
  if (typeof text === 'function') text(isPlayer ? 'KM/H · PILOTE JOUEUR' : 'KM/H · TELEMETRY', clusterX + clusterW / 2, clusterY + 54);

  // Santé / Intégrité mécanique du bolide
  const healthVal = (target && typeof target.health === 'number') ? target.health : 100;
  fill(148, 163, 184);
  if (typeof textSize === 'function') textSize(9);
  if (typeof text === 'function') text(`HP ${Math.round(healthVal)}%`, clusterX + clusterW - 40, clusterY + 36);

  fill(25, 35, 48);
  rect(clusterX + clusterW - 62, clusterY + 46, 46, 5, 2);
  fill(healthVal > 50 ? color(34, 197, 94) : (healthVal > 25 ? color(234, 179, 8) : color(239, 68, 68)));
  rect(clusterX + clusterW - 62, clusterY + 46, 46 * (healthVal / 100), 5, 2);

  // 5. Volant de course GT3 / Formule 1 interactif avec braquage dynamique
  const steerInput = (target && typeof target.steerInput === 'number')
    ? target.steerInput
    : ((target && target.lastOutputs && target.lastOutputs[0] !== undefined) ? (target.lastOutputs[0] - 0.5) * 2 : 0);
  const wheelAngle = steerInput * 0.70;
  const wheelY = h - 20;

  push();
  translate(w / 2, wheelY);
  rotate(wheelAngle);

  // Palettes de vitesse arrière
  fill(50, 60, 75, 230);
  noStroke();
  rect(-74, -36, 10, 42, 3);
  rect(64, -36, 10, 42, 3);

  // Poignées ergonomiques
  fill(20, 26, 36);
  stroke(15, 20, 30);
  strokeWeight(2);
  rect(-66, -30, 24, 62, 8);
  rect(42, -30, 24, 62, 8);

  // Lignes de grip
  stroke(40, 52, 70, 160);
  strokeWeight(1);
  line(-62, -18, -46, -18);
  line(-62, -8, -46, -8);
  line(-62, 2, -46, 2);
  line(46, -18, 62, -18);
  line(46, -8, 62, -8);
  line(46, 2, 62, 2);

  // Branche centrale carbone
  fill(12, 17, 26);
  stroke(isPlayer ? color(0, 240, 255, 180) : color(0, 208, 132, 180));
  strokeWeight(1.5);
  beginShape();
  vertex(-48, -12);
  vertex(48, -12);
  vertex(42, 24);
  vertex(-42, 24);
  endShape(closeConst);

  // Repère 12 o'clock
  fill(isPlayer ? color(0, 240, 255) : color(250, 204, 21));
  noStroke();
  rect(-3, -34, 6, 8, 2);

  // Boutons F1 multifonctions
  fill(239, 68, 68); ellipse(-30, 4, 7, 7);
  fill(234, 179, 8); ellipse(-18, 12, 7, 7);
  fill(59, 130, 246); ellipse(18, 12, 7, 7);
  fill(34, 197, 94); ellipse(30, 4, 7, 7);

  // Écusson central
  fill(10, 15, 22);
  stroke(isPlayer ? color(0, 240, 255) : color(0, 208, 132));
  strokeWeight(2);
  ellipse(0, 6, 24, 24);
  fill(255, 255, 255);
  noStroke();
  if (typeof textFont === 'function') textFont('Orbitron');
  if (typeof textSize === 'function') textSize(7);
  if (typeof textAlign === 'function' && typeof CENTER !== 'undefined') textAlign(CENTER, CENTER);
  text(isPlayer ? 'YOU' : 'F1', 0, 6);

  pop();

  // 6. Alerte de crash / sortie de piste avec touche R
  if (target && target.dead) {
    fill(10, 15, 25, 220);
    stroke(239, 68, 68);
    strokeWeight(2);
    rect(w / 2 - 200, h * 0.42, 400, 60, 6);
    noStroke();
    fill(239, 68, 68);
    if (typeof textFont === 'function') textFont('Orbitron');
    if (typeof textSize === 'function') textSize(13);
    if (typeof textAlign === 'function' && typeof CENTER !== 'undefined') textAlign(CENTER, CENTER);
    text('⚠️ VÉHICULE HORS COURSE / IMPACT', w / 2, h * 0.42 + 20);
    fill(241, 245, 249);
    if (typeof textSize === 'function') textSize(10);
    text('Appuyez sur [R] pour remettre votre voiture sur la piste', w / 2, h * 0.42 + 42);
  }

  // 7. Rappel des commandes clavier pour le joueur en mode cockpit
  if (isPlayer) {
    fill(160, 220, 245, 210);
    if (typeof textFont === 'function') textFont('JetBrains Mono');
    if (typeof textSize === 'function') textSize(8.5);
    if (typeof textAlign === 'function' && typeof CENTER !== 'undefined') textAlign(CENTER, CENTER);
    text('[Z / ↑] Accélérer   ·   [Q/D / ←/→] Braquer   ·   [S / ↓ / Espace] Freiner   ·   [R] Remise en piste', w / 2, h - 6);
  }

  pop();
}

function renderPauseOverlay() {
  push();
  fill(5, 11, 20, 180);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  textSize(38);
  textFont('Orbitron');
  fill(255, 120, 0); // Orange flamboyant
  text('SIMULATION EN PAUSE', width / 2, height / 2 - 15);

  textSize(15);
  textFont('Inter');
  fill(180, 210, 230);
  text('Appuyez sur Espace ou cliquez sur Reprendre', width / 2, height / 2 + 25);
  pop();
}

// ==========================================================================
// 6. SYNCHRONISATION DU TABLEAU DE BORD (HUD) & GRAPHIQUE
// ==========================================================================

function updateTelemetryUI(currentScore) {
  const genEl = document.getElementById('stat-gen');
  const aliveEl = document.getElementById('stat-alive');
  const aliveSubEl = document.getElementById('stat-alive-subtext');
  const bestEl = document.getElementById('stat-current-best');
  const recordEl = document.getElementById('stat-record');

  const overlayGen = document.getElementById('overlay-gen');
  const overlayAlive = document.getElementById('overlay-alive');
  const overlayLeader = document.getElementById('overlay-leader');
  const timerText = document.getElementById('timer-text');
  const overlayTime = document.getElementById('overlay-time');

  const livingCount = population.length;
  const pct = generationPopulationSize > 0 ? Math.round((livingCount / generationPopulationSize) * 100) : 0;

  if (genEl) genEl.textContent = generationCount;
  if (aliveEl) aliveEl.textContent = `${livingCount} / ${generationPopulationSize}`;
  if (aliveSubEl) aliveSubEl.textContent = `${pct}% en piste`;
  if (bestEl) bestEl.textContent = currentScore;
  if (recordEl) recordEl.textContent = allTimeBestFitness;

  if (overlayGen) overlayGen.textContent = generationCount;
  if (overlayAlive) overlayAlive.textContent = `${livingCount} / ${generationPopulationSize}`;
  if (overlayLeader) overlayLeader.innerHTML = '🏆 CPR';

  // Chronomètre dynamique de l'épreuve active MM:SS.s
  const attemptSec = Math.floor(stageAttemptElapsed / 1000);
  const mins = String(Math.floor(attemptSec / 60)).padStart(2, '0');
  const secs = String(attemptSec % 60).padStart(2, '0');
  const tenths = Math.floor((stageAttemptElapsed % 1000) / 100);
  const formattedAttemptTime = `${mins}:${secs}.${tenths}`;
  if (timerText) timerText.textContent = formattedAttemptTime;
  if (overlayTime) overlayTime.textContent = formattedAttemptTime;

  // ------------------------------------------------------------------------
  // TÉLÉMÉTRIE DU COCKPIT GT3 & CLASSEMENT EN DIRECT (LIVE LEADERBOARD)
  // ------------------------------------------------------------------------
  const GT3_LIVERY_NAMES = [
    'BMW M4 GT3 #46',
    'Porsche 911 GT3 R #91',
    'Mercedes-AMG GT3 #77',
    'Audi R8 LMS GT3 #12',
    'Lamborghini Huracán #08',
    'Scuderia Corsa GT3 #23'
  ];

  // Bolide prioritaire : voiture du joueur en mode manuel / cockpit, sinon sélectionné, sinon leader
  let bestCar = null;
  if (currentDrivingMode === 'manual' && manualVehicle && !manualVehicle.dead) {
    bestCar = manualVehicle;
  } else if (selectedVehicle && !selectedVehicle.dead) {
    bestCar = selectedVehicle;
  } else if (currentWinner && raceState === 'finished') {
    bestCar = currentWinner;
  } else if (Array.isArray(population)) {
    for (let i = 0; i < population.length; i++) {
      const v = population[i];
      if (v && (!bestCar || (v.checkpointsCount || 0) > (bestCar.checkpointsCount || 0))) {
        bestCar = v;
      }
    }
  }

  // 1. Tachymètre & Compteur de vitesse GT3
  const speedEl = document.getElementById('gt3-speed-val');
  const gearEl = document.getElementById('gt3-gear-val');
  const tachoProgress = document.getElementById('tacho-progress-bar');
  if (speedEl || gearEl || tachoProgress) {
    let speedKmh = 0;
    let gear = 'N';
    if (bestCar) {
      const v = bestCar.vel || bestCar.velocity;
      const mag = (v && typeof v.mag === 'function') ? v.mag() : (bestCar.speed || 3.0);
      speedKmh = Math.round(mag * 44);
      if (speedKmh < 35) gear = '1';
      else if (speedKmh < 90) gear = '2';
      else if (speedKmh < 145) gear = '3';
      else if (speedKmh < 195) gear = '4';
      else if (speedKmh < 240) gear = '5';
      else gear = '6';
    }
    if (speedEl) speedEl.textContent = speedKmh;
    if (gearEl) gearEl.textContent = gear;
    if (tachoProgress && tachoProgress.style) {
      const ratio = Math.min(1, speedKmh / 260);
      const offset = 254 - (ratio * 190);
      tachoProgress.style.strokeDashoffset = offset;
    }
  }

  // 2. Informations du bolide leader
  const carNameEl = document.getElementById('gt3-car-name');
  const carLapEl = document.getElementById('gt3-car-lap');
  const carFitEl = document.getElementById('gt3-car-fitness');
  const carSensorsEl = document.getElementById('gt3-sensors-active');
  const throttleBar = document.getElementById('gt3-throttle-bar');
  const brakeBar = document.getElementById('gt3-brake-bar');
  const steerBar = document.getElementById('gt3-steer-bar');

  if (bestCar) {
    const carIdx = population.indexOf(bestCar);
    const liveryIdx = (carIdx >= 0 ? carIdx : 0) % GT3_LIVERY_NAMES.length;
    if (carNameEl) {
      carNameEl.textContent = bestCar.isManual ? '🏎️ Votre Voiture (#1 Joueur)' : GT3_LIVERY_NAMES[liveryIdx];
    }
    if (carLapEl && currentStage) carLapEl.textContent = Math.min(currentStage.targetLaps, (bestCar.lapsCompleted || 0) + 1);
    if (carFitEl) carFitEl.textContent = (bestCar.fitness !== undefined && bestCar.fitness > 0) ? bestCar.fitness.toFixed(3) : (currentScore / (currentStage ? currentStage.targetLaps * 60 : 60)).toFixed(3);
    if (carSensorsEl) carSensorsEl.textContent = (sensorDisplayMode === 'none') ? 'MASQUÉS' : '7 / 7 ACTIFS';

    if (bestCar.isManual && typeof manualInputState !== 'undefined') {
      if (throttleBar && throttleBar.style) {
        const thrPct = manualInputState.up ? 100 : (bestCar.speed > 0.5 ? 30 : 0);
        throttleBar.style.width = `${thrPct}%`;
      }
      if (brakeBar && brakeBar.style) {
        const brkPct = (manualInputState.down || manualInputState.handbrake) ? 100 : 0;
        brakeBar.style.width = `${brkPct}%`;
      }
      if (steerBar && steerBar.style) {
        const strVal = bestCar.steerInput || 0;
        const steerPct = Math.min(100, Math.max(0, Math.round((strVal + 1) * 50)));
        steerBar.style.width = `${steerPct}%`;
      }
    } else {
      if (throttleBar && throttleBar.style) {
        const speed = bestCar.speed || 3;
        const thrPct = Math.min(100, Math.max(10, Math.round((speed / 5) * 100)));
        throttleBar.style.width = `${thrPct}%`;
      }
      if (brakeBar && brakeBar.style) {
        const isBraking = bestCar.speed < 2.5;
        brakeBar.style.width = isBraking ? '85%' : '0%';
      }
      if (steerBar && steerBar.style) {
        const steerOut = (bestCar.lastOutputs && bestCar.lastOutputs[0] !== undefined) ? bestCar.lastOutputs[0] : 0.5;
        const steerPct = Math.min(100, Math.max(0, Math.round(steerOut * 100)));
        steerBar.style.width = `${steerPct}%`;
      }
    }
  }

  // 3. Prochain Checkpoint & Orientation dynamique
  const nextCpVal = document.getElementById('next-cp-val');
  const nextCpDist = document.getElementById('next-cp-distance');
  const nextCpArrow = document.getElementById('next-cp-arrow-icon');
  if (bestCar && checkpoints && checkpoints.length > 0) {
    const cpIdx = (bestCar.index !== undefined ? bestCar.index : 0) % checkpoints.length;
    if (nextCpVal) nextCpVal.textContent = `CP ${cpIdx + 1} / ${checkpoints.length}`;

    const targetCp = checkpoints[cpIdx];
    if (targetCp && targetCp.midpoint && bestCar.pos) {
      const m = targetCp.midpoint();
      const dx = m.x - bestCar.pos.x;
      const dy = m.y - bestCar.pos.y;
      const dist = Math.hypot(dx, dy);
      if (nextCpDist) nextCpDist.textContent = `${Math.round(dist * 2.8)} m`;

      if (nextCpArrow && nextCpArrow.style) {
        const targetAngle = Math.atan2(dy, dx);
        const heading = bestCar.heading || 0;
        const diff = targetAngle - heading;
        nextCpArrow.style.transform = `rotate(${diff}rad)`;
      }
    }
  }

  // 4. Live Leaderboard (Top 8 concurrents)
  const lbBadge = document.getElementById('lb-stage-badge');
  const lbTableRows = document.getElementById('lb-table-rows');
  if (lbBadge && currentStage) {
    lbBadge.textContent = `STAGE ${currentStage.stageNumber}`;
  }
  if (lbTableRows) {
    const allCars = (Array.isArray(population) ? population : [])
      .concat(Array.isArray(savedVehicles) ? savedVehicles : [])
      .filter((car) => car && typeof car === 'object');
    // Trier l'intégralité du peloton par score de checkpoints puis distance
    const sorted = allCars.slice().sort((a, b) => {
      const scA = a.checkpointsCount || 0;
      const scB = b.checkpointsCount || 0;
      if (scB !== scA) return scB - scA;
      return (b.distanceTravelled || 0) - (a.distanceTravelled || 0);
    }).slice(0, 8);

    const totalTrackCPs = (currentStage ? currentStage.targetLaps * 60 : 180);
    let html = '';
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      const pos = i + 1;
      const carNumber = `#${String(c.carNumber || ((allCars.indexOf(c) % 100) + 1)).padStart(2, '0')}`;
      const progPct = Math.min(100, Math.round(((c.checkpointsCount || 0) / Math.max(1, totalTrackCPs)) * 100));
      const fit = (c.fitness && c.fitness > 0) ? (c.fitness >= 1000 ? (c.fitness / 1000).toFixed(1) + 'k' : c.fitness.toFixed(1)) : ((c.checkpointsCount || 0) + (c.distanceTravelled ? Math.min(0.99, c.distanceTravelled * 0.001) : 0)).toFixed(2);
      let statusClass = 'running';
      let statusLabel = 'RUN';
      if (c.finished) {
        statusClass = 'finished';
        statusLabel = 'WIN 🏆';
      } else if (c.dead) {
        statusClass = 'eliminated';
        statusLabel = 'OUT';
      }
      const rowRankClass = (pos === 1) ? 'leader' : (pos === 2 ? 'p2' : (pos === 3 ? 'p3' : ''));
      const badgeColors = ['#10b981', '#06b6d4', '#8b5cf6', '#3b82f6', '#ef4444', '#f97316', '#ec4899', '#84cc16'];
      const badgeColor = badgeColors[i % badgeColors.length];
      const pilotName = (pos === 1) ? 'CPR' : (c.pilotName || 'AI-' + String(pos).padStart(2, '0'));
      const laps = (typeof c.lapCount === 'number') ? c.lapCount : (typeof c.lapsCompleted === 'number' ? c.lapsCompleted : 0);
      const timeStr = c.lastLapTimeStr || (c.formattedLapTime || '--:--');

      html += `
        <div class="lb-row ${rowRankClass}">
          <span class="lb-pos">${pos}</span>
          <span class="lb-car-pill" style="color: ${badgeColor}; border: 1px solid ${badgeColor}; background: rgba(6,24,17,0.85); font-weight:800; border-radius:3px; padding:1px 3px; font-size:0.62rem; text-align:center;">${carNumber}</span>
          <span class="lb-pilot" style="color: #cbd5e1; font-weight: 700; font-size: 0.65rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pilotName}</span>
          <span class="lb-lap" style="color: #ffffff; font-size: 0.65rem; text-align: center;">${laps}</span>
          <span class="lb-time" style="color: #00d084; font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; text-align: right;">${timeStr}</span>
        </div>`;
    }
    lbTableRows.innerHTML = html;
  }

  // 5. Informations étendues du véhicule leader et boussole directionnelle
  const vehSpeedEl = document.getElementById('vehicle-speed-val');
  const vehPosEl = document.getElementById('vehicle-pos-val');
  const vehLapEl = document.getElementById('vehicle-lap-val');
  const vehHeadingEl = document.getElementById('vehicle-heading-val');
  const compassNeedle = document.getElementById('vehicle-compass-needle');

  if (bestCar) {
    const v = bestCar.vel || bestCar.velocity;
    const mag = (v && typeof v.mag === 'function') ? v.mag() : (bestCar.speed || 3.0);
    const speedKmh = Math.round(mag * 44);
    if (vehSpeedEl) vehSpeedEl.textContent = `${speedKmh} km/h`;

    const allCars = (Array.isArray(population) ? population : []).concat(Array.isArray(savedVehicles) ? savedVehicles : []);
    const rank = allCars.indexOf(bestCar) + 1;
    if (vehPosEl) vehPosEl.textContent = `${rank > 0 ? rank : 1} / ${generationPopulationSize || TOTAL}`;

    if (vehLapEl && currentStage) {
      const curLap = Math.min(currentStage.targetLaps, (bestCar.lapsCompleted || 0) + 1);
      vehLapEl.textContent = `${curLap} / ${currentStage.targetLaps}`;
    }

    const headingDeg = Math.round(((bestCar.heading || 0) * 180 / Math.PI + 360) % 360);
    if (vehHeadingEl) vehHeadingEl.textContent = `${headingDeg}°`;
    if (compassNeedle && compassNeedle.style) {
      compassNeedle.style.transform = `rotate(${headingDeg}deg)`;
    }

    // Actualiser le radar capteurs & environnement
    drawRadarSensorDisplay(bestCar);
  }
}

// Mini-carte calculée depuis la géométrie physique du circuit courant.
function drawTrackMinimap() {
  const canvas = document.getElementById('track-minimap');
  if (!canvas || outside.length === 0) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const points = inside.concat(outside);
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const pad = 12;
  const scale = Math.min((w - pad * 2) / Math.max(maxX - minX, 1), (h - pad * 2) / Math.max(maxY - minY, 1));
  const mapPoint = (point) => ({
    x: pad + (point.x - minX) * scale + (w - pad * 2 - (maxX - minX) * scale) / 2,
    y: pad + (point.y - minY) * scale + (h - pad * 2 - (maxY - minY) * scale) / 2
  });

  ctx.clearRect(0, 0, w, h);
  // Fond radar sombre
  ctx.fillStyle = '#07101c';
  ctx.fillRect(0, 0, w, h);

  // Cercles concentriques radar holographique
  ctx.strokeStyle = 'rgba(0, 208, 132, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 35, 0, Math.PI * 2);
  ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Piste pleine
  ctx.beginPath();
  outside.forEach((point, index) => {
    const mapped = mapPoint(point);
    if (index === 0) ctx.moveTo(mapped.x, mapped.y);
    else ctx.lineTo(mapped.x, mapped.y);
  });
  ctx.closePath();
  inside.slice().reverse().forEach((point) => {
    const mapped = mapPoint(point);
    ctx.lineTo(mapped.x, mapped.y);
  });
  ctx.closePath();
  ctx.fillStyle = '#0B241B';
  ctx.fill('evenodd');

  // Bordures extérieures lumineuses en Vert Émeraude
  ctx.strokeStyle = 'rgba(0, 208, 132, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Trajectoire centrale
  ctx.beginPath();
  checkpoints.forEach((checkpoint, index) => {
    const mapped = mapPoint(checkpoint.midpoint());
    if (index === 0) ctx.moveTo(mapped.x, mapped.y);
    else ctx.lineTo(mapped.x, mapped.y);
  });
  ctx.closePath();
  ctx.strokeStyle = 'rgba(112, 230, 165, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Point de départ (Vert Émeraude)
  const startPoint = mapPoint(start);
  ctx.fillStyle = '#00D084';
  ctx.beginPath();
  ctx.arc(startPoint.x, startPoint.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // Positionnement de tous les véhicules actifs sur la mini-carte
  if (Array.isArray(population) && population.length > 0) {
    let bestCar = population[0];
    for (let v of population) {
      if (v.checkpointsCount > bestCar.checkpointsCount) bestCar = v;
      if (v.pos) {
        const pt = mapPoint(v.pos);
        ctx.fillStyle = (v === bestCar) ? '#FF8A00' : 'rgba(0, 208, 132, 0.65)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (v === bestCar) ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Halo doré pulsé sur le leader
    if (bestCar && bestCar.pos) {
      const leaderPoint = mapPoint(bestCar.pos);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  // Rose des vents / Boussole Nord dans le coin supérieur droit de la mini-carte
  ctx.save();
  const nx = w - 22;
  const ny = 22;
  ctx.fillStyle = 'rgba(7, 26, 20, 0.85)';
  ctx.strokeStyle = 'rgba(0, 208, 132, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(nx, ny, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Aiguille Nord rouge et Sud blanche
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(nx, ny - 9);
  ctx.lineTo(nx - 3, ny);
  ctx.lineTo(nx + 3, ny);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(nx, ny + 9);
  ctx.lineTo(nx - 3, ny);
  ctx.lineTo(nx + 3, ny);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('N', nx, ny - 10);
  ctx.restore();
}

function updateTrackBadge() {
  const badgeTrack = document.getElementById('badge-track');
  if (badgeTrack) {
    badgeTrack.textContent = `TRACK #${currentTrackIndex}`;
  }
}

// Changer de tracé redémarre l'évaluation avec les mêmes cerveaux.
function restartOnNewTrack() {
  if (typeof vehicleVisualSequence !== 'undefined') vehicleVisualSequence = 0;
  const previousCars = population.concat(savedVehicles);
  currentTrackIndex++;

  // Faire défiler vers le circuit authentique suivant parmi les 5 circuits
  if (typeof STAGES !== 'undefined' && STAGES.length > 0) {
    currentStageIndex = (currentStageIndex + 1) % STAGES.length;
    currentStage = STAGES[currentStageIndex];
  }

  raceState = 'countdown';
  currentWinner = null;
  stageAttemptElapsed = 0;
  buildTrack();
  population = Array.from({ length: TOTAL }, (_, index) => {
    const source = previousCars.length ? previousCars[index % previousCars.length] : null;
    return source ? new Vehicle(source.brain) : new Vehicle();
  });
  for (const vehicle of previousCars) {
    try {
      vehicle.dispose();
    } catch (e) { }
  }
  savedVehicles = [];
  generationPopulationSize = TOTAL;
  currentBestFitness = 0;

  // Repositionnement et immobilisation officielle sur la nouvelle grille de départ
  if (typeof StartingGrid !== 'undefined' && typeof StartingGrid.positionCars === 'function' && typeof checkpoints !== 'undefined' && checkpoints && checkpoints.length > 0) {
    StartingGrid.positionCars(population, checkpoints);
  }
  if (typeof RaceManager !== 'undefined' && typeof RaceManager.startCountdown === 'function' && typeof setTimeout === 'function') {
    RaceManager.startCountdown();
  }

  updateTelemetryUI(0);
  updateTrackBadge();
  updateStageHUD();
}

// Tracé dynamique du graphique d'évolution des scores en Canvas 2D (Meilleur, Moyenne, Min en direct dès la G1)
function drawTelemetryChart() {
  const canvas = document.getElementById('telemetry-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Ajustement dynamique de la résolution interne du canvas pour correspondre fidèlement au conteneur CSS
  const rect = (typeof canvas.getBoundingClientRect === 'function') ? canvas.getBoundingClientRect() : null;
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
  const targetW = Math.max(260, Math.round(((rect && rect.width > 20) ? rect.width : (canvas.clientWidth || 320)) * dpr));
  const targetH = Math.max(160, Math.round(((rect && rect.height > 20) ? rect.height : (canvas.clientHeight || 180)) * dpr));
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const w = canvas.width;
  const h = canvas.height;
  const pad = { left: 42 * dpr, right: 18 * dpr, top: 26 * dpr, bottom: 26 * dpr };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#071A14';
  ctx.fillRect(0, 0, w, h);

  // Collecte de la télémétrie active en direct sur le peloton
  const allCars = (Array.isArray(population) ? population : []).concat(Array.isArray(savedVehicles) ? savedVehicles : []);
  let liveMax = 0, liveAvg = 0, liveMin = 0;
  if (allCars.length > 0) {
    let sum = 0;
    let m = Infinity;
    for (let i = 0; i < allCars.length; i++) {
      const s = allCars[i].checkpointsCount || 0;
      if (s > liveMax) liveMax = s;
      if (s < m) m = s;
      sum += s;
    }
    liveMin = (m === Infinity) ? 0 : m;
    liveAvg = parseFloat((sum / allCars.length).toFixed(1));
  }

  // Déterminer les points à tracer
  let points = [];
  let isLiveG1 = false;

  if (generationHistory.length === 0) {
    isLiveG1 = true;
    if (currentGenLiveSamples.length >= 2) {
      points = currentGenLiveSamples.map((s, idx) => ({
        label: `+${Math.round(idx * 0.25)}s`,
        best: s.best,
        avg: s.avg,
        min: s.min
      }));
    } else {
      points = [
        { label: 'Départ', best: 0, avg: 0, min: 0 },
        { label: 'En cours', best: liveMax, avg: liveAvg, min: liveMin }
      ];
    }
  } else {
    // Plusieurs générations : historique précédent + point live actuel de la génération en cours
    points = generationHistory.slice(-25).map(p => ({
      label: `G${p.gen}`,
      best: p.best,
      avg: p.avg,
      min: p.min,
      record: p.record
    }));
    // Point dynamique actuel
    points.push({
      label: `G${generationCount}*`,
      best: Math.max(liveMax, points[points.length - 1].best),
      avg: liveAvg,
      min: liveMin,
      isLive: true
    });
  }

  const highestScore = Math.max(20, ...points.map(p => Math.max(p.record || 0, p.best || 0, p.avg || 0)));
  const maxVal = Math.ceil(highestScore / 10) * 10;
  const yFor = (value) => pad.top + plotH - ((value || 0) / maxVal) * plotH;
  const xFor = (index) => {
    if (points.length <= 1) return pad.left + plotW / 2;
    return pad.left + (index / (points.length - 1)) * plotW;
  };

  ctx.font = `${Math.round(9 * dpr)}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1;

  // Lignes de repère horizontales et valeurs de checkpoints
  for (let tick = 0; tick <= 4; tick++) {
    const value = (maxVal / 4) * tick;
    const y = yFor(value);
    ctx.strokeStyle = 'rgba(29, 89, 65, 0.4)';
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    ctx.fillStyle = '#A0B9AB';
    ctx.fillText(String(Math.round(value)), pad.left - 6 * dpr, y);
  }

  // Axes principaux
  ctx.strokeStyle = 'rgba(0, 208, 132, 0.45)';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(w - pad.right, pad.top + plotH);
  ctx.stroke();

  // Titre / Badge live en haut du graphique
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `bold ${Math.round(10 * dpr)}px Inter, sans-serif`;
  if (isLiveG1) {
    ctx.fillStyle = '#00D084';
    ctx.fillText(`● G1 LIVE : Top ${liveMax} CP  |  Moy ${liveAvg}  |  Min ${liveMin}`, pad.left, 7 * dpr);
  } else {
    ctx.fillStyle = '#00D084';
    ctx.fillText(`● G${generationCount} LIVE : Top ${liveMax} CP  |  Moy ${liveAvg}`, pad.left, 7 * dpr);
  }

  // Étiquettes d'abscisse
  ctx.fillStyle = '#A0B9AB';
  ctx.textBaseline = 'top';
  ctx.font = `${Math.round(9 * dpr)}px "JetBrains Mono", monospace`;
  if (points.length > 1) {
    ctx.textAlign = 'left';
    ctx.fillText(points[0].label || '0', pad.left, h - pad.bottom + 6 * dpr);
    ctx.textAlign = 'right';
    ctx.fillText(points[points.length - 1].label || 'Live', w - pad.right, h - pad.bottom + 6 * dpr);
  }

  // Gradient sous la courbe 'best'
  if (points.length > 1 && typeof ctx.createLinearGradient === 'function') {
    try {
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
      if (grad && typeof grad.addColorStop === 'function') {
        grad.addColorStop(0, 'rgba(0, 208, 132, 0.28)');
        grad.addColorStop(1, 'rgba(0, 208, 132, 0.00)');
        ctx.beginPath();
        points.forEach((point, index) => {
          const x = xFor(index);
          const y = yFor(point.best);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(xFor(points.length - 1), pad.top + plotH);
        ctx.lineTo(xFor(0), pad.top + plotH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }
    } catch (e) { }
  }

  // Fonction de tracé d'une série de données
  const drawSeries = (key, strokeColor, lineWidth, isDashed = false) => {
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth * dpr;
    if (typeof ctx.setLineDash === 'function') {
      if (isDashed) ctx.setLineDash([4 * dpr, 3 * dpr]);
      else ctx.setLineDash([]);
    }

    points.forEach((point, index) => {
      const x = xFor(index);
      const y = yFor(point[key] !== undefined ? point[key] : point.best);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([]);
    }
  };

  // 1. Courbe Min (Orange)
  drawSeries('min', '#FF8A00', 1.8);
  // 2. Courbe Moyenne (Vert clair)
  drawSeries('avg', '#70E6A5', 2.0);
  // 3. Courbe Meilleur (Vert émeraude)
  drawSeries('best', '#00D084', 2.5);

  // Points lumineux avec anneaux
  points.forEach((point, index) => {
    const x = xFor(index);
    const isLast = (index === points.length - 1);

    // Point Min (Orange)
    ctx.fillStyle = '#FF8A00';
    ctx.beginPath();
    ctx.arc(x, yFor(point.min !== undefined ? point.min : 0), 2.2 * dpr, 0, Math.PI * 2);
    ctx.fill();

    // Point Moyenne (Vert Clair)
    ctx.fillStyle = '#70E6A5';
    ctx.beginPath();
    ctx.arc(x, yFor(point.avg !== undefined ? point.avg : point.best), 2.5 * dpr, 0, Math.PI * 2);
    ctx.fill();

    // Point Meilleur (Vert Émeraude)
    ctx.fillStyle = '#00D084';
    ctx.beginPath();
    ctx.arc(x, yFor(point.best), (isLast ? 4.5 : 3.2) * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();

    // Pulsation animée sur le dernier point (Leader actif)
    if (isLast) {
      const pulseR = (5.5 + Math.sin(Date.now() * 0.007) * 2.2) * dpr;
      ctx.strokeStyle = 'rgba(0, 208, 132, 0.75)';
      ctx.lineWidth = 1.4 * dpr;
      ctx.beginPath();
      ctx.arc(x, yFor(point.best), pulseR, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

// Radar holographique 360° pour les capteurs et l'environnement du leader
function drawRadarSensorDisplay(leaderCar) {
  const canvas = document.getElementById('radar-sensor-display');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2 - 8;
  const maxR = Math.min(cx, cy) - 16;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#071A14';
  ctx.fillRect(0, 0, w, h);

  // Cercles concentriques de portée radar (25%, 50%, 75%, 100%)
  ctx.strokeStyle = 'rgba(29, 89, 65, 0.45)';
  ctx.lineWidth = 1;
  for (let step = 1; step <= 4; step++) {
    const r = (maxR / 4) * step;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Axes en croix du radar
  ctx.strokeStyle = 'rgba(29, 89, 65, 0.6)';
  ctx.beginPath();
  ctx.moveTo(cx - maxR, cy);
  ctx.lineTo(cx + maxR, cy);
  ctx.moveTo(cx, cy - maxR);
  ctx.lineTo(cx, cy + maxR);
  ctx.stroke();

  // 4 Quadrants / Cônes de détection (Avant 120°, Gauche 90°, Droite 90°, Arrière 120°)
  const drawArcSector = (startA, endA, fillColor, strokeColor) => {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxR, startA, endA);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Avant (haut, centré à -PI/2, span 120° = -PI/2 - PI/3 à -PI/2 + PI/3)
  drawArcSector(-Math.PI * 5 / 6, -Math.PI / 6, 'rgba(0, 208, 132, 0.16)', 'rgba(0, 208, 132, 0.65)');
  // Gauche (span 90° centré à PI, soit 3*PI/4 à 5*PI/4)
  drawArcSector(Math.PI * 3 / 4, Math.PI * 5 / 4, 'rgba(255, 138, 0, 0.12)', 'rgba(255, 138, 0, 0.5)');
  // Droite (span 90° centré à 0, soit -PI/4 à PI/4)
  drawArcSector(-Math.PI / 4, Math.PI / 4, 'rgba(112, 230, 165, 0.14)', 'rgba(112, 230, 165, 0.55)');
  // Arrière (bas, centré à PI/2, span 120° = PI/6 à 5*PI/6)
  drawArcSector(Math.PI / 6, Math.PI * 5 / 6, 'rgba(239, 68, 68, 0.10)', 'rgba(239, 68, 68, 0.45)');

  // Silhouette de la voiture de course au centre du radar (orientée vers le haut)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ef4444';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(-5, -12, 10, 24, 3);
  } else {
    ctx.rect(-5, -12, 10, 24);
  }
  ctx.fill();
  ctx.stroke();
  // Pare-brise
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-3, -6, 6, 5);
  // Aileron arrière
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-6, 9, 12, 2.5);
  ctx.restore();

  if (!leaderCar || !leaderCar.pos) return;
  const lHeading = leaderCar.heading || 0;
  const lSight = leaderCar.sight || 120;

  // Détection des obstacles (murs détectés par les lasers du leader)
  if (leaderCar.sensorHits && leaderCar.sensorDists) {
    ctx.fillStyle = '#00D084';
    for (let i = 0; i < leaderCar.sensorHits.length; i++) {
      const hit = leaderCar.sensorHits[i];
      const dist = leaderCar.sensorDists[i];
      if (hit && dist < lSight) {
        const angleWorld = Math.atan2(hit.y - leaderCar.pos.y, hit.x - leaderCar.pos.x);
        let relAngle = angleWorld - lHeading;
        const radarAngle = relAngle - Math.PI / 2;
        const rRatio = Math.min(1, dist / lSight);
        const rx = cx + Math.cos(radarAngle) * (rRatio * maxR);
        const ry = cy + Math.sin(radarAngle) * (rRatio * maxR);

        // Dessin du triangle obstacle
        ctx.beginPath();
        ctx.moveTo(rx, ry - 4);
        ctx.lineTo(rx - 3.5, ry + 3.5);
        ctx.lineTo(rx + 3.5, ry + 3.5);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Détection des autres véhicules (cercles)
  if (Array.isArray(population)) {
    const radarRange = 160;
    ctx.strokeStyle = '#cbd5e1';
    ctx.fillStyle = '#70E6A5';
    ctx.lineWidth = 1;
    for (let i = 0; i < population.length; i++) {
      const other = population[i];
      if (!other || other === leaderCar || other.dead || other.finished || !other.pos) continue;
      const dx = other.pos.x - leaderCar.pos.x;
      const dy = other.pos.y - leaderCar.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < radarRange) {
        const angleWorld = Math.atan2(dy, dx);
        let relAngle = angleWorld - lHeading;
        const radarAngle = relAngle - Math.PI / 2;
        const rRatio = dist / radarRange;
        const rx = cx + Math.cos(radarAngle) * (rRatio * maxR);
        const ry = cy + Math.sin(radarAngle) * (rRatio * maxR);

        ctx.beginPath();
        ctx.arc(rx, ry, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

// ========================================================================
// 7. COMMANDES ET CONTRÔLES INTERACTIFS
// ========================================================================
function setupUIEventListeners() {
  // A. Bouton Pause / Reprendre
  const btnPause = document.getElementById('btn-pause');
  const btnPauseText = document.getElementById('btn-pause-text');
  const pauseIcon = document.getElementById('pause-icon');
  const badgeStatus = document.getElementById('badge-status');
  const statusText = document.getElementById('status-text');

  if (btnPause) {
    btnPause.addEventListener('click', () => {
      isPaused = !isPaused;
      if (typeof RaceManager !== 'undefined' && RaceManager.countdown && RaceManager.countdown.active) {
        if (isPaused) RaceManager.pauseCountdown();
        else RaceManager.resumeCountdown();
      }
      if (isPaused) {
        btnPauseText.textContent = 'Reprendre';
        if (pauseIcon) pauseIcon.textContent = '▶';
        badgeStatus.classList.add('paused');
        statusText.textContent = 'PAUSED';
      } else {
        btnPauseText.textContent = 'Pause';
        if (pauseIcon) pauseIcon.textContent = 'Ⅱ';
        badgeStatus.classList.remove('paused');
        statusText.textContent = 'RUNNING';
      }
    });
  }

  // Raccourci clavier Espace pour Pause (hors champs de formulaire)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) && !e.target.isContentEditable) {
      e.preventDefault();
      if (btnPause) btnPause.click();
    }
  });

  // B. Bouton Réinitialiser
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (typeof RaceManager !== 'undefined') {
        RaceManager.cancelCountdown();
      }
      stopConfettiAnimation();
      generationCount = 1;
      currentBestFitness = 0;
      allTimeBestFitness = 0;
      generationHistory = [];
      currentGenLiveSamples = [];
      totalSessionElapsed = 0;
      stageAttemptElapsed = 0;
      raceState = 'racing';
      currentWinner = null;
      lastTimestamp = performance.now();
      const overlayTime = document.getElementById('overlay-time');
      const timerText = document.getElementById('timer-text');
      if (overlayTime) overlayTime.textContent = '00:00.0';
      if (timerText) timerText.textContent = '00:00.0';
      const badgeStatus = document.getElementById('badge-status');
      const statusText = document.getElementById('status-text');
      if (badgeStatus) {
        badgeStatus.classList.remove('finished');
        if (isPaused) {
          badgeStatus.classList.add('paused');
        } else {
          badgeStatus.classList.remove('paused');
        }
      }
      if (statusText) statusText.textContent = isPaused ? 'PAUSED' : 'RUNNING';
      initPopulation();
      if (typeof RaceManager !== 'undefined' && typeof RaceManager.startCountdown === 'function') {
        RaceManager.startCountdown();
      }
      updateStageHUD();
      updateTelemetryUI(0);
      drawTelemetryChart();
    });
  }

  // C. Bouton Nouveau Tracé
  const btnNewTrack = document.getElementById('btn-new-track');
  if (btnNewTrack) {
    btnNewTrack.addEventListener('click', () => {
      restartOnNewTrack();
    });
  }
  // D. Sélecteur de Mode de circuit (Entraînement vs Défi Aléatoire)
  const btnModeTraining = document.getElementById('btn-mode-training');
  const btnModeChallenge = document.getElementById('btn-mode-challenge');
  const badgeMode = document.getElementById('badge-mode');
  const modeDesc = document.getElementById('track-mode-desc');

  if (btnModeTraining && btnModeChallenge) {
    btnModeTraining.addEventListener('click', () => {
      trackMode = 'training';
      btnModeTraining.classList.add('active');
      btnModeChallenge.classList.remove('active');
      badgeMode.textContent = 'ENTRAÎNEMENT';
      modeDesc.textContent = "Circuit fixe entre generations ; scores comparables. Le bouton nouveau circuit relance l'evaluation en gardant les reseaux.";
      modeDesc.classList.remove('alert');
    });

    btnModeChallenge.addEventListener('click', () => {
      trackMode = 'randomChallenge';
      btnModeChallenge.classList.add('active');
      btnModeTraining.classList.remove('active');
      badgeMode.textContent = 'DÉFI ALÉATOIRE';
      modeDesc.textContent = "Circuit neuf a chaque generation. Les reseaux evoluent ; les scores bruts restent lies a la geometrie.";
      modeDesc.classList.add('alert');
    });
  }

  // E. Slider Vitesse de simulation
  const sliderSpeed = document.getElementById('slider-speed');
  const valSpeed = document.getElementById('val-speed');
  const speedBadge = document.getElementById('telemetry-speed-badge');
  if (sliderSpeed) {
    sliderSpeed.addEventListener('input', (e) => {
      simulationSpeed = parseInt(e.target.value, 10);
      valSpeed.textContent = `${simulationSpeed}×`;
      if (speedBadge) speedBadge.textContent = `${simulationSpeed}×`;
    });
  }

  // F. Slider Taux de mutation
  const sliderMutation = document.getElementById('slider-mutation');
  const valMutation = document.getElementById('val-mutation');
  if (sliderMutation) {
    sliderMutation.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value, 10);
      MUTATION_RATE = pct / 100;
      valMutation.textContent = `${pct}%`;
    });
  }

  // G. Slider Portée des capteurs
  const sliderSight = document.getElementById('slider-sight');
  const valSight = document.getElementById('val-sight');
  if (sliderSight) {
    sliderSight.addEventListener('input', (e) => {
      SIGHT = parseInt(e.target.value, 10);
      valSight.textContent = `${SIGHT} px`;
      for (let v of population) {
        v.sight = SIGHT;
      }
    });
  }

  // H. Slider Taille de population
  const sliderPopulation = document.getElementById('slider-population');
  const valPopulation = document.getElementById('val-population');
  if (sliderPopulation) {
    sliderPopulation.addEventListener('input', (e) => {
      TOTAL = parseInt(e.target.value, 10);
      valPopulation.textContent = `${TOTAL}`;
    });
  }

  // I. Sélecteur Mode d'affichage des capteurs
  const btnSensorsLeader = document.getElementById('btn-sensors-leader');
  const btnSensorsAll = document.getElementById('btn-sensors-all');
  const btnSensorsNone = document.getElementById('btn-sensors-none');

  const sensorButtons = [
    { btn: btnSensorsLeader, mode: 'leader' },
    { btn: btnSensorsAll, mode: 'all' },
    { btn: btnSensorsNone, mode: 'none' }
  ];

  for (let item of sensorButtons) {
    if (item.btn) {
      item.btn.addEventListener('click', () => {
        sensorDisplayMode = item.mode;
        for (let other of sensorButtons) {
          if (other.btn) other.btn.classList.remove('active');
        }
        item.btn.classList.add('active');
      });
    }
  }

  // J. Contrôles des Modals de Championnat et Victoire
  const btnOpenStages = document.getElementById('btn-open-stages');
  const stagesModal = document.getElementById('stages-modal');
  const btnCloseStages = document.getElementById('btn-close-stages');
  const btnStagesContinue = document.getElementById('btn-stages-continue');

  if (btnOpenStages && stagesModal) {
    btnOpenStages.addEventListener('click', () => {
      renderStagesGrid();
      stagesModal.classList.remove('hidden');
    });
  }

  if (btnCloseStages && stagesModal) {
    btnCloseStages.addEventListener('click', () => {
      stagesModal.classList.add('hidden');
    });
  }

  if (btnStagesContinue && stagesModal) {
    btnStagesContinue.addEventListener('click', () => {
      stagesModal.classList.add('hidden');
    });
  }

  // K. Boutons du Modal de Victoire
  const victoryModal = document.getElementById('victory-modal');
  const btnVictoryNext = document.getElementById('btn-victory-next');
  const btnVictoryReplay = document.getElementById('btn-victory-replay');
  const btnVictoryStages = document.getElementById('btn-victory-stages');

  if (btnVictoryNext) {
    btnVictoryNext.addEventListener('click', () => {
      stopConfettiAnimation();
      if (victoryModal) victoryModal.classList.add('hidden');
      const nextIndex = currentStageIndex + 1;
      if (nextIndex < STAGES.length) {
        loadStage(nextIndex, true);
      } else {
        // Grand Championnat terminé : ouvrir la grille des stages pour contempler la carrière
        if (stagesModal) {
          renderStagesGrid();
          stagesModal.classList.remove('hidden');
        } else {
          loadStage(0, true);
        }
      }
    });
  }

  if (btnVictoryReplay) {
    btnVictoryReplay.addEventListener('click', () => {
      stopConfettiAnimation();
      if (victoryModal) victoryModal.classList.add('hidden');
      loadStage(currentStageIndex, true);
    });
  }

  if (btnVictoryStages) {
    btnVictoryStages.addEventListener('click', () => {
      stopConfettiAnimation();
      if (victoryModal) victoryModal.classList.add('hidden');
      if (stagesModal) {
        renderStagesGrid();
        stagesModal.classList.remove('hidden');
      }
    });
  }

  // L. Boutons de Confirmation de Réinitialisation de Progression
  const resetConfirmModal = document.getElementById('reset-confirm-modal');
  const btnResetProg = document.getElementById('btn-reset-progression');
  const btnConfirmReset = document.getElementById('btn-confirm-reset');
  const btnCancelReset = document.getElementById('btn-cancel-reset');

  if (btnResetProg && resetConfirmModal) {
    btnResetProg.addEventListener('click', () => {
      resetConfirmModal.classList.remove('hidden');
    });
  }

  if (btnConfirmReset && resetConfirmModal) {
    btnConfirmReset.addEventListener('click', () => {
      resetConfirmModal.classList.add('hidden');
      resetProgressionData();
      if (stagesModal) stagesModal.classList.add('hidden');
    });
  }

  if (btnCancelReset && resetConfirmModal) {
    btnCancelReset.addEventListener('click', () => {
      resetConfirmModal.classList.add('hidden');
    });
  }

  // M. Accessibilité Clavier (Échap pour fermer les modales)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      stopConfettiAnimation();
      if (resetConfirmModal && !resetConfirmModal.classList.contains('hidden')) {
        resetConfirmModal.classList.add('hidden');
      } else if (stagesModal && !stagesModal.classList.contains('hidden')) {
        stagesModal.classList.add('hidden');
      } else if (victoryModal && !victoryModal.classList.contains('hidden')) {
        victoryModal.classList.add('hidden');
      }
    }
  });

  // N. Contrôles et Sliders des Paramètres de Steering IA
  const sliderMaxSpeed = document.getElementById('slider-maxspeed');
  const valMaxSpeed = document.getElementById('val-maxspeed');
  if (sliderMaxSpeed) {
    sliderMaxSpeed.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (valMaxSpeed) valMaxSpeed.textContent = String(val);
      STEERING_CONFIG.maxspeed = (val / 180) * 6.0;
      for (let car of population) car.maxspeed = STEERING_CONFIG.maxspeed;
    });
  }

  const sliderMaxForce = document.getElementById('slider-maxforce');
  const valMaxForce = document.getElementById('val-maxforce');
  if (sliderMaxForce) {
    sliderMaxForce.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (valMaxForce) valMaxForce.textContent = String(val);
      STEERING_CONFIG.maxforce = (val / 1.8) * 0.28;
    });
  }

  const sliderSepRad = document.getElementById('slider-separation-radius');
  const valSepRad = document.getElementById('val-separation-radius');
  if (sliderSepRad) {
    sliderSepRad.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (valSepRad) valSepRad.textContent = String(val);
      STEERING_CONFIG.separationRadius = (val / 70) * 36;
    });
  }

  const sliderWtSeek = document.getElementById('slider-weight-seek');
  const valWtSeek = document.getElementById('val-weight-seek');
  if (sliderWtSeek) {
    sliderWtSeek.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (valWtSeek) valWtSeek.textContent = val.toFixed(1);
      STEERING_CONFIG.weightSeek = val;
    });
  }

  const sliderWtSep = document.getElementById('slider-weight-sep');
  const valWtSep = document.getElementById('val-weight-sep');
  if (sliderWtSep) {
    sliderWtSep.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (valWtSep) valWtSep.textContent = val.toFixed(1);
      STEERING_CONFIG.weightSep = val;
    });
  }

  const sliderWtAvoid = document.getElementById('slider-weight-avoid');
  const valWtAvoid = document.getElementById('val-weight-avoid');
  if (sliderWtAvoid) {
    sliderWtAvoid.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (valWtAvoid) valWtAvoid.textContent = val.toFixed(1);
      STEERING_CONFIG.weightAvoid = val;
    });
  }

  // Checkboxes de steering
  const chkSeek = document.getElementById('chk-seek');
  if (chkSeek) chkSeek.addEventListener('change', (e) => { STEERING_CONFIG.seekEnabled = e.target.checked; });
  const chkSep = document.getElementById('chk-separation');
  if (chkSep) chkSep.addEventListener('change', (e) => { STEERING_CONFIG.sepEnabled = e.target.checked; });
  const chkAvoid = document.getElementById('chk-avoidance');
  if (chkAvoid) chkAvoid.addEventListener('change', (e) => { STEERING_CONFIG.avoidEnabled = e.target.checked; });
  const chkAlign = document.getElementById('chk-alignment');
  if (chkAlign) chkAlign.addEventListener('change', (e) => { STEERING_CONFIG.alignEnabled = e.target.checked; });
  const chkCohesion = document.getElementById('chk-cohesion');
  if (chkCohesion) chkCohesion.addEventListener('change', (e) => { STEERING_CONFIG.cohesionEnabled = e.target.checked; });

  // Boutons de mode Caméra : Vue globale, Vue 3D et Suivi
  const btnCamFollow = document.getElementById('btn-cam-follow');
  const btnCamFree = document.getElementById('btn-cam-free');
  const btnCam3D = document.getElementById('btn-cam-3d');

  if (btnCamFollow) {
    btnCamFollow.addEventListener('click', () => {
      setCameraMode('follow');
      updateZoomDisplay();
    });
  }
  if (btnCamFree) {
    btnCamFree.addEventListener('click', () => {
      setCameraMode('free');
      selectedVehicle = null;
      updateZoomDisplay();
    });
  }
  if (btnCam3D) {
    btnCam3D.addEventListener('click', () => {
      setCameraMode('3d');
      updateZoomDisplay();
    });
  }

  const selActiveCircuit = document.getElementById('select-active-circuit');
  if (selActiveCircuit) {
    selActiveCircuit.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      if (!isNaN(idx) && idx >= 0 && idx < STAGES.length) {
        loadStage(idx, false, true);
      }
    });
  }

  const btnModeAi = document.getElementById('btn-mode-ai');
  const btnModeManual = document.getElementById('btn-mode-manual');
  if (btnModeAi) {
    btnModeAi.addEventListener('click', () => {
      setDrivingMode('ai');
    });
  }
  if (btnModeManual) {
    btnModeManual.addEventListener('click', () => {
      setDrivingMode('manual');
    });
  }

  // Initialisation et gestion des Trajectoires & Capteurs (Module 3 Dock)
  window.trajOptions = {
    real: true,
    desired: true,
    force: true,
    target: false
  };

  const chkTrajReal = document.getElementById('chk-traj-real');
  const chkTrajDesired = document.getElementById('chk-traj-desired');
  const chkTrajForce = document.getElementById('chk-traj-force');
  const chkTrajTarget = document.getElementById('chk-traj-target');
  const btnToggleSensors = document.getElementById('btn-toggle-sensors');
  const btnToggleAllViz = document.getElementById('btn-toggle-all-viz');

  if (chkTrajReal) window.trajOptions.real = chkTrajReal.checked;
  if (chkTrajDesired) window.trajOptions.desired = chkTrajDesired.checked;
  if (chkTrajForce) window.trajOptions.force = chkTrajForce.checked;
  if (chkTrajTarget) window.trajOptions.target = chkTrajTarget.checked;

  function updateAllVizBtnState() {
    const allChecked = (chkTrajReal ? chkTrajReal.checked : true) &&
                       (chkTrajDesired ? chkTrajDesired.checked : true) &&
                       (chkTrajForce ? chkTrajForce.checked : true) &&
                       (chkTrajTarget ? chkTrajTarget.checked : true) &&
                       (sensorDisplayMode !== 'none');
    if (btnToggleAllViz) {
      if (allChecked) btnToggleAllViz.classList.add('active');
      else btnToggleAllViz.classList.remove('active');
    }
  }

  function syncSensorBtnState() {
    if (btnToggleSensors) {
      if (sensorDisplayMode !== 'none') btnToggleSensors.classList.add('active');
      else btnToggleSensors.classList.remove('active');
    }
    const carSensorsEl = document.getElementById('gt3-sensors-active');
    if (carSensorsEl) carSensorsEl.textContent = (sensorDisplayMode === 'none') ? 'MASQUÉS' : '7 / 7 ACTIFS';
  }

  const trajCheckboxes = [
    { el: chkTrajReal, key: 'real' },
    { el: chkTrajDesired, key: 'desired' },
    { el: chkTrajForce, key: 'force' },
    { el: chkTrajTarget, key: 'target' }
  ];

  trajCheckboxes.forEach(({ el, key }) => {
    if (el) {
      el.addEventListener('change', () => {
        window.trajOptions[key] = el.checked;
        if (el.checked && !isDebugActive()) {
          setDebugMode(true);
        }
        updateAllVizBtnState();
      });
    }
  });

  if (btnToggleSensors) {
    btnToggleSensors.addEventListener('click', () => {
      if (sensorDisplayMode === 'none') {
        sensorDisplayMode = 'all';
        if (!isDebugActive()) setDebugMode(true);
      } else {
        sensorDisplayMode = 'none';
      }
      syncSensorBtnState();
      updateAllVizBtnState();
    });
    syncSensorBtnState();
  }

  if (btnToggleAllViz) {
    btnToggleAllViz.addEventListener('click', () => {
      const isEverythingActive = (chkTrajReal ? chkTrajReal.checked : true) &&
                                 (chkTrajDesired ? chkTrajDesired.checked : true) &&
                                 (chkTrajForce ? chkTrajForce.checked : true) &&
                                 (chkTrajTarget ? chkTrajTarget.checked : true) &&
                                 (sensorDisplayMode !== 'none');

      const newState = !isEverythingActive;
      if (chkTrajReal) chkTrajReal.checked = newState;
      if (chkTrajDesired) chkTrajDesired.checked = newState;
      if (chkTrajForce) chkTrajForce.checked = newState;
      if (chkTrajTarget) chkTrajTarget.checked = newState;

      window.trajOptions.real = newState;
      window.trajOptions.desired = newState;
      window.trajOptions.force = newState;
      window.trajOptions.target = newState;

      sensorDisplayMode = newState ? 'all' : 'none';
      if (newState && !isDebugActive()) setDebugMode(true);

      syncSensorBtnState();
      updateAllVizBtnState();
    });
    updateAllVizBtnState();
  }

  // Animation de retour visuel sur les badges de touches
  function flashKeyBadge(badgeId) {
    const el = document.getElementById(badgeId);
    if (el) {
      el.classList.add('key-active');
      setTimeout(() => { el.classList.remove('key-active'); }, 180);
    }
  }

  // Fonction universelle de zoom à la molette sur le circuit (style Google Maps)
  // - Molette vers le haut (deltaY < 0) : Agrandit le circuit (Zoom In)
  // - Molette vers le bas  (deltaY > 0) : Rétrécit le circuit (Zoom Out)
  window.handleCircuitWheelZoom = function (e) {
    if (!e) return;
    // Laisser le navigateur gérer le zoom de la page avec Ctrl + Molette
    if (e.ctrlKey || e.metaKey) return;

    if (typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    const rawDelta = (typeof e.deltaY === 'number') ? e.deltaY : (e.detail || -e.wheelDelta || 0);
    if (rawDelta === 0) return false;

    // Sens strict : vers le haut (< 0) = agrandir, vers le bas (> 0) = rétrécir
    const isZoomIn = rawDelta < 0;
    const zoomMultiplier = isZoomIn ? 1.10 : 0.90;

    targetCamZoom = Math.max(0.38, Math.min(3.5, Number((targetCamZoom * zoomMultiplier).toFixed(3))));
    camZoom = targetCamZoom; // Réaction immédiate sans latence ni clic

    if (typeof updateZoomDisplay === 'function') {
      updateZoomDisplay();
    }
    return false;
  };

  const canvasContainer = document.getElementById('canvas-container');
  if (canvasContainer) {
    canvasContainer.addEventListener('wheel', window.handleCircuitWheelZoom, { passive: false });
  }

  const viewportWrapper = (typeof document !== 'undefined' && typeof document.querySelector === 'function')
    ? document.querySelector('.viewport-wrapper')
    : null;
  if (viewportWrapper && viewportWrapper !== canvasContainer) {
    viewportWrapper.addEventListener('wheel', window.handleCircuitWheelZoom, { passive: false });
  }

  // Écouteurs clavier (F3 / B débogage, M mode, ZQSD/flèches pilotage, Espace frein/pause, R reset)
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;

    // IMPORTANT : Permettre les raccourcis de zoom natifs du navigateur (Ctrl -, Ctrl +, Ctrl 0)
    if (e.ctrlKey || e.metaKey) return;

    const k = e.key ? e.key.toLowerCase() : '';

    // Débogage (F3 ou Touche B)
    if (e.key === 'F3' || k === 'b') {
      e.preventDefault();
      flashKeyBadge('code-key-b');
      toggleDebugMode();
      return;
    }

    // Basculer le mode de pilotage (Touche M)
    if (k === 'm') {
      flashKeyBadge('code-key-m');
      toggleDrivingMode();
      return;
    }

    // Visualiser le Réseau de Neurones en Direct (Touche N)
    if (k === 'n') {
      flashKeyBadge('code-key-n');
      toggleNeuralModal();
      return;
    }

    // Fermer le modal de réseau neuronal avec Échap
    if (e.key === 'Escape' && neuralModalOpen) {
      closeNeuralModal();
      return;
    }

    // Basculement du mode caméra (Touche C : free → follow → cockpit → free) (Req 5.6)
    if (k === 'c') {
      flashKeyBadge('code-key-c');
      if (cameraMode === 'free') setCameraMode('follow');
      else if (cameraMode === 'follow') setCameraMode('cockpit');
      else setCameraMode('free');
      updateZoomDisplay();
      return;
    }

    // Commandes de Zoom (+ / =) et (- / _) — bornes [0.4, 2.0] (Req 5.9)
    if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
      e.preventDefault();
      targetCamZoom = Math.min(2.0, targetCamZoom + 0.2);
      updateZoomDisplay();
      return;
    }
    if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      targetCamZoom = Math.max(0.4, targetCamZoom - 0.2);
      updateZoomDisplay();
      return;
    }

    // Commandes physiques en Mode Manuel
    if (currentDrivingMode === 'manual') {
      if (e.code === 'KeyW' || e.code === 'KeyZ' || e.code === 'ArrowUp') {
        manualInputState.up = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        manualInputState.down = true;
      }
      if (e.code === 'KeyA' || e.code === 'KeyQ' || e.code === 'ArrowLeft') {
        manualInputState.left = true;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        manualInputState.right = true;
      }
      if (e.code === 'Space' || k === ' ') {
        e.preventDefault();
        manualInputState.handbrake = true;
        flashKeyBadge('code-key-space');
      }
      if (k === 'r') {
        flashKeyBadge('code-key-r');
        if (manualVehicle) {
          manualVehicle.resetManual(checkpoints);
        } else {
          const btnReset = document.getElementById('btn-reset');
          if (btnReset) btnReset.click();
        }
      }
      return;
    }

    // Commandes en Mode IA
    // Réinitialiser la simulation (R)
    if (k === 'r') {
      flashKeyBadge('code-key-r');
      const btnReset = document.getElementById('btn-reset');
      if (btnReset) btnReset.click();
    }
    // Pause / Reprendre (Espace)
    if (e.code === 'Space' || k === ' ') {
      e.preventDefault();
      flashKeyBadge('code-key-space');
      const btnPause = document.getElementById('btn-pause');
      if (btnPause) btnPause.click();
    }
  });

  // Relâchement des touches pour le pilotage manuel
  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'KeyZ' || e.code === 'ArrowUp') {
      manualInputState.up = false;
    }
    if (e.code === 'KeyS' || e.code === 'ArrowDown') {
      manualInputState.down = false;
    }
    if (e.code === 'KeyA' || e.code === 'KeyQ' || e.code === 'ArrowLeft') {
      manualInputState.left = false;
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      manualInputState.right = false;
    }
    if (e.code === 'Space' || e.key === ' ') {
      manualInputState.handbrake = false;
    }
  });

  window.addEventListener('blur', () => {
    manualInputState.up = false;
    manualInputState.down = false;
    manualInputState.left = false;
    manualInputState.right = false;
    manualInputState.handbrake = false;
  });

  // Rendre les badges de touches cliquables directement à la souris
  const rowKeyR = document.getElementById('row-key-r');
  if (rowKeyR) {
    rowKeyR.addEventListener('click', () => {
      flashKeyBadge('code-key-r');
      if (currentDrivingMode === 'manual' && manualVehicle) {
        manualVehicle.resetManual(checkpoints);
      } else {
        const btnReset = document.getElementById('btn-reset');
        if (btnReset) btnReset.click();
      }
    });
  }

  const rowKeySpace = document.getElementById('row-key-space');
  if (rowKeySpace) {
    rowKeySpace.addEventListener('click', () => {
      flashKeyBadge('code-key-space');
      const btnPause = document.getElementById('btn-pause');
      if (btnPause) btnPause.click();
    });
  }

  const rowKeyB = document.getElementById('row-key-b');
  if (rowKeyB) {
    rowKeyB.addEventListener('click', () => {
      flashKeyBadge('code-key-b');
      toggleDebugMode();
    });
  }

  const rowKeyM = document.getElementById('row-key-m');
  if (rowKeyM) {
    rowKeyM.addEventListener('click', () => {
      flashKeyBadge('code-key-m');
      toggleDrivingMode();
    });
  }

  const btnTopbarDebug = document.getElementById('btn-topbar-debug');
  if (btnTopbarDebug) {
    btnTopbarDebug.addEventListener('click', () => {
      toggleDebugMode();
    });
  }

  const rowKeyN = document.getElementById('row-key-n');
  if (rowKeyN) {
    rowKeyN.addEventListener('click', () => {
      flashKeyBadge('code-key-n');
      toggleNeuralModal();
    });
  }

  const btnTopbarNn = document.getElementById('btn-topbar-nn');
  if (btnTopbarNn) {
    btnTopbarNn.addEventListener('click', () => {
      toggleNeuralModal();
    });
  }

  const btnCloseNeural = document.getElementById('btn-close-neural');
  if (btnCloseNeural) {
    btnCloseNeural.addEventListener('click', () => {
      closeNeuralModal();
    });
  }

  const btnCloseNeuralFooter = document.getElementById('btn-close-neural-footer');
  if (btnCloseNeuralFooter) {
    btnCloseNeuralFooter.addEventListener('click', () => {
      closeNeuralModal();
    });
  }

  const btnTargetChampion = document.getElementById('btn-target-champion');
  if (btnTargetChampion) {
    btnTargetChampion.addEventListener('click', () => {
      setNeuralTargetMode('champion');
    });
  }

  const btnTargetSelected = document.getElementById('btn-target-selected');
  if (btnTargetSelected) {
    btnTargetSelected.addEventListener('click', () => {
      setNeuralTargetMode('selected');
    });
  }

  const btnTargetManual = document.getElementById('btn-target-manual');
  if (btnTargetManual) {
    btnTargetManual.addEventListener('click', () => {
      setNeuralTargetMode('manual');
    });
  }

  const neuralModal = document.getElementById('neural-modal');
  if (neuralModal) {
    neuralModal.addEventListener('click', (e) => {
      if (e.target === neuralModal) {
        closeNeuralModal();
      }
    });
  }
}

// Adaptation automatique de la résolution à la fenêtre d'affichage
function windowResized() {
  const container = document.getElementById('canvas-container');
  if (!container) return;
  const w = container.clientWidth || 1400;
  const h = container.clientHeight || 800;
  if (w > 200 && h > 200 && (Math.abs(w - width) > 20 || Math.abs(h - height) > 20)) {
    if (typeof resizeCanvas === 'function') {
      resizeCanvas(w, h);
    }
    if (terrainLayer && typeof createGraphics === 'function') {
      const margin = (typeof terrainMargin === 'number') ? terrainMargin : 850;
      terrainLayer = createGraphics(Math.max(w, 1850) + margin * 2, Math.max(h, 1080) + margin * 2);
    }
    buildTrack();
    drawTrackScenery();
    if (cameraMode === 'free') {
      targetCamZoom = getOptimalTrackFitZoom();
      const bounds = getTrackBounds();
      targetCamX = bounds.centerX;
      targetCamY = bounds.centerY;
      updateZoomDisplay();
    }
  }
}

// Fonction standard p5.js mouseWheel pour capture directe et immédiate des événements molette
function mouseWheel(event) {
  if (typeof window !== 'undefined' && typeof window.handleCircuitWheelZoom === 'function') {
    const viewport = (typeof document !== 'undefined' && typeof document.querySelector === 'function')
      ? document.querySelector('.viewport-wrapper')
      : (typeof document !== 'undefined' && typeof document.getElementById === 'function' ? document.getElementById('canvas-container') : null);
    if (viewport && event) {
      const rect = (typeof viewport.getBoundingClientRect === 'function') ? viewport.getBoundingClientRect() : null;
      if (rect && typeof event.clientX === 'number') {
        const mx = event.clientX;
        const my = event.clientY;
        if (mx >= rect.left && mx <= rect.right && my >= rect.top && my <= rect.bottom) {
          return window.handleCircuitWheelZoom(event);
        }
      } else {
        return window.handleCircuitWheelZoom(event);
      }
    }
  }
}

// ========================================================================
// MODE DÉBOGAGE : INSPECTION MOTEUR, HITBOXES, CHECKPOINTS & FORCES REYNOLDS
// ========================================================================

function isDebugActive() {
  if (typeof debugMode !== 'undefined' && debugMode) return true;
  if (typeof isDebugMode !== 'undefined' && isDebugMode) return true;
  if (typeof window !== 'undefined') {
    return !!(window.debugMode || window.isDebugMode);
  }
  return false;
}

function setDebugMode(active) {
  debugMode = !!active;
  isDebugMode = debugMode;
  if (typeof window !== 'undefined') {
    window.debugMode = debugMode;
    window.isDebugMode = debugMode;
  }

  const topbarPill = document.getElementById('topbar-debug-pill');
  const btnTopbar = document.getElementById('btn-topbar-debug');
  const keyRow = document.getElementById('row-key-b');

  if (topbarPill) {
    topbarPill.textContent = debugMode ? 'ON' : 'OFF';
    if (debugMode) topbarPill.classList.add('active');
    else topbarPill.classList.remove('active');
  }
  if (btnTopbar) {
    if (debugMode) btnTopbar.classList.add('active');
    else btnTopbar.classList.remove('active');
  }
  if (keyRow) {
    if (debugMode) keyRow.classList.add('key-active-mode');
    else keyRow.classList.remove('key-active-mode');
  }
}

function toggleDebugMode(forceVal) {
  if (typeof forceVal === 'boolean') {
    setDebugMode(forceVal);
  } else {
    setDebugMode(!debugMode);
  }
}

if (typeof window !== 'undefined') {
  window.debugMode = debugMode;
  window.isDebugMode = debugMode;
  window.isDebugActive = isDebugActive;
  window.setDebugMode = setDebugMode;
  window.toggleDebugMode = toggleDebugMode;
}

// ========================================================================
// GESTION DU MODE DE PILOTAGE : IA AUTONOME vs PILOTAGE JOUEUR MANUEL
// ========================================================================

function updateZoomDisplay() {
  // Adaptation dynamique du niveau de zoom
}

function setDrivingMode(mode) {
  currentDrivingMode = (mode === 'manual') ? 'manual' : 'ai';
  if (typeof window !== 'undefined') {
    window.currentDrivingMode = currentDrivingMode;
  }

  const btnAi = document.getElementById('btn-mode-ai');
  const btnManual = document.getElementById('btn-mode-manual');
  const keymapAi = document.getElementById('keymap-ai');
  const keymapManual = document.getElementById('keymap-manual');
  const badgeMode = document.getElementById('badge-driving-mode');
  const btnCamFollow = document.getElementById('btn-cam-follow');
  const btnCamFree = document.getElementById('btn-cam-free');
  const topbarModeBtn = document.getElementById('btn-topbar-mode');

  if (topbarModeBtn) {
    if (currentDrivingMode === 'manual') {
      topbarModeBtn.innerHTML = '<span class="chip-icon">🎮</span><span>MODE MANUEL</span>';
      topbarModeBtn.classList.add('manual-active');
    } else {
      topbarModeBtn.innerHTML = '<span class="chip-icon">🤖</span><span>MODE IA</span>';
      topbarModeBtn.classList.remove('manual-active');
    }
  }

  if (currentDrivingMode === 'manual') {
    if (btnAi) btnAi.classList.remove('active');
    if (btnManual) btnManual.classList.add('active');
    if (keymapAi) keymapAi.classList.add('hidden');
    if (keymapManual) keymapManual.classList.remove('hidden');
    if (badgeMode) badgeMode.textContent = 'MODE MANUEL';

    // Assigner le bolide manuel : le bolide sélectionné, le leader ou le premier bolide vivant
    if (selectedVehicle && !selectedVehicle.dead && !selectedVehicle.finished) {
      manualVehicle = selectedVehicle;
    } else if (!manualVehicle || manualVehicle.dead || manualVehicle.finished) {
      const candidates = population.filter(v => !v.dead && !v.finished);
      manualVehicle = (candidates.length > 0) ? candidates[0] : (population[0] || null);
    }
    if (manualVehicle) {
      for (let v of population) v.isManual = false;
      manualVehicle.isManual = true;
      selectedVehicle = manualVehicle;
      if (cameraMode !== 'cockpit') {
        setCameraMode('follow');
      }
      updateZoomDisplay();
    }
  } else {
    if (btnAi) btnAi.classList.add('active');
    if (btnManual) btnManual.classList.remove('active');
    if (keymapAi) keymapAi.classList.remove('hidden');
    if (keymapManual) keymapManual.classList.add('hidden');
    if (badgeMode) badgeMode.textContent = 'MODE IA';

    for (let v of population) {
      v.isManual = false;
    }
    manualVehicle = null;
  }
}

function toggleDrivingMode() {
  setDrivingMode(currentDrivingMode === 'ai' ? 'manual' : 'ai');
}

// Clic de souris sur la scène : sélection et suivi immédiat d'une voiture sur le circuit
function mousePressed() {
  if (typeof mouseX !== 'number' || typeof mouseY !== 'number') return;
  if (typeof width === 'undefined' || typeof height === 'undefined') return;
  const currentZ = (typeof camZoom === 'number' && camZoom > 0.01) ? camZoom : 1.0;
  const dx = (mouseX - width / 2) / currentZ;
  const dy = (mouseY - height / 2) / currentZ;
  const rot = (cameraMode === 'follow' || cameraMode === 'cockpit') ? (camRotation || 0) : 0;
  const cosR = Math.cos(-rot);
  const sinR = Math.sin(-rot);
  const worldX = (dx * cosR - dy * sinR) + camX;
  const worldY = (dx * sinR + dy * cosR) + camY;

  let closest = null;
  let minDist = 36;

  if (Array.isArray(population)) {
    for (let v of population) {
      if (!v || v.dead || v.finished || !v.pos) continue;
      const d = Math.hypot(v.pos.x - worldX, v.pos.y - worldY);
      if (d < minDist) {
        minDist = d;
        closest = v;
      }
    }
  }

  if (closest) {
    selectedVehicle = closest;
    if (currentDrivingMode === 'manual') {
      for (let v of population) v.isManual = false;
      manualVehicle = closest;
      manualVehicle.isManual = true;
    }
    setCameraMode('follow');
    updateZoomDisplay();
  }
}

if (typeof window !== 'undefined') {
  window.currentDrivingMode = currentDrivingMode;
  window.setDrivingMode = setDrivingMode;
  window.toggleDrivingMode = toggleDrivingMode;
  window.updateZoomDisplay = updateZoomDisplay;
  window.getTrackBounds = getTrackBounds;
  window.getOptimalTrackFitZoom = getOptimalTrackFitZoom;
}

function drawWorldDebug(leaderCar) {
  if (!isDebugActive()) return;
  if (typeof push !== 'function') return;
  push();

  // 1. Barrières de collision physiques (Segments réels testés par les 7 rayons lasers)
  if (Array.isArray(walls)) {
    stroke(239, 68, 68, 175);
    strokeWeight(1.8);
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (w && w.a && w.b) {
        line(w.a.x, w.a.y, w.b.x, w.b.y);
      }
    }
  }

  // 2. Grille de checkpoints avec indices, sens normal et cible active
  if (Array.isArray(checkpoints)) {
    const totalCP = checkpoints.length;
    for (let i = 0; i < totalCP; i++) {
      const cp = checkpoints[i];
      if (!cp || !cp.a || !cp.b) continue;

      const isTarget = (leaderCar && (leaderCar.index % totalCP) === i);
      const isNext = (leaderCar && ((leaderCar.index + 1) % totalCP) === i);

      // Ligne de franchissement du checkpoint
      if (isTarget) {
        stroke(251, 191, 36, 240);
        strokeWeight(2.8);
      } else if (isNext) {
        stroke(0, 240, 255, 200);
        strokeWeight(1.8);
      } else {
        stroke(16, 185, 129, 130);
        strokeWeight(1.2);
      }
      line(cp.a.x, cp.a.y, cp.b.x, cp.b.y);

      // Flèche de sens normal de la course
      const mid = cp.midpoint ? cp.midpoint() : { x: (cp.a.x + cp.b.x) / 2, y: (cp.a.y + cp.b.y) / 2 };
      const nextCP = checkpoints[(i + 1) % totalCP];
      const nextMid = (nextCP && nextCP.midpoint) ? nextCP.midpoint() : (nextCP ? { x: (nextCP.a.x + nextCP.b.x) / 2, y: (nextCP.a.y + nextCP.b.y) / 2 } : mid);
      const angle = Math.atan2(nextMid.y - mid.y, nextMid.x - mid.x);
      const arrowLen = 16;
      const ax = mid.x + Math.cos(angle) * arrowLen;
      const ay = mid.y + Math.sin(angle) * arrowLen;

      if (typeof color === 'function') {
        stroke(isTarget ? color(255, 138, 0, 250) : color(0, 208, 132, 220));
      } else {
        stroke(isTarget ? '#FF8A00' : '#00D084');
      }
      strokeWeight(1.8);
      line(mid.x, mid.y, ax, ay);
      // Pointe de flèche (arrowhead) pour visualiser sans équivoque le sens normal de course
      const barbAngle = 0.45;
      const barbLen = 5.5;
      line(ax, ay, ax - Math.cos(angle - barbAngle) * barbLen, ay - Math.sin(angle - barbAngle) * barbLen);
      line(ax, ay, ax - Math.cos(angle + barbAngle) * barbLen, ay - Math.sin(angle + barbAngle) * barbLen);

      // Pastille numérotée avec libellé
      noStroke();
      if (typeof color === 'function') {
        fill(isTarget ? color(245, 158, 11, 240) : color(8, 20, 34, 215));
      } else {
        fill(isTarget ? '#f59e0b' : '#081422');
      }
      if (typeof rectMode === 'function') rectMode(CENTER);
      const badgeW = (i >= 10) ? 22 : 18;
      rect(mid.x, mid.y, badgeW, 13, 3);
      if (typeof rectMode === 'function') rectMode(CORNER);

      if (typeof color === 'function') {
        fill(isTarget ? color(0, 0, 0) : color(241, 245, 249));
      } else {
        fill(isTarget ? '#000000' : '#ffffff');
      }
      if (typeof textFont === 'function') textFont('JetBrains Mono');
      if (typeof textSize === 'function') textSize(7.5);
      if (typeof textAlign === 'function') textAlign(CENTER, CENTER);
      text(i, mid.x, mid.y);
    }
  }

  // 3. Inspection approfondie du véhicule leader (Hitbox, forces Craig Reynolds, lasers chiffrés)
  if (leaderCar && typeof leaderCar.drawDebugInfo === 'function') {
    leaderCar.drawDebugInfo();
  }

  // 4. Hitbox compacte des autres bolides vivants du peloton
  if (Array.isArray(population)) {
    for (let i = 0; i < Math.min(population.length, 12); i++) {
      const v = population[i];
      if (v && v !== leaderCar && !v.dead && !v.finished && v.pos) {
        push();
        translate(v.pos.x, v.pos.y);
        rotate(v.heading || 0);
        noFill();
        stroke(56, 189, 248, 120);
        strokeWeight(1.0);
        rect(0, 0, 32, 16, 2);
        pop();
      }
    }
  }

  pop();
}

function drawDebugHUD(leaderCar) {
  if (!isDebugActive()) return;
  if (typeof push !== 'function') return;
  push();
  const boxX = 260;
  const boxY = 74;
  const boxW = 295;
  const boxH = 192;

  // Fenêtre cybernétique semi-transparente
  fill(6, 16, 26, 235);
  stroke(16, 185, 129, 220);
  strokeWeight(1.5);
  rect(boxX, boxY, boxW, boxH, 6);

  // Barre de titre
  fill(16, 185, 129, 35);
  noStroke();
  rect(boxX + 1, boxY + 1, boxW - 2, 24, 5, 5, 0, 0);

  fill(16, 185, 129);
  if (typeof textFont === 'function') textFont('Orbitron');
  if (typeof textSize === 'function') textSize(9.5);
  if (typeof textAlign === 'function') textAlign(LEFT, CENTER);
  text('⚡ MODE DÉBOGAGE · MOTEUR IA', boxX + 10, boxY + 13);

  // Pastille active pulsante
  fill(16, 185, 129);
  ellipse(boxX + boxW - 14, boxY + 13, 6, 6);

  // Métriques en temps réel
  const fps = Math.round(typeof frameRate === 'function' ? frameRate() : 60);
  const tensors = (typeof tf !== 'undefined' && tf.memory) ? tf.memory().numTensors : 'N/A';
  const aliveCars = population ? population.length : 0;
  const deadCars = savedVehicles ? savedVehicles.length : 0;
  const speed = (leaderCar && leaderCar.vel) ? Math.round(leaderCar.vel.mag() * 32) : 0;
  const totalCP = (checkpoints && checkpoints.length) ? checkpoints.length : 60;
  const cpIndex = leaderCar ? (leaderCar.index % totalCP) : 0;

  if (typeof textFont === 'function') textFont('JetBrains Mono');
  if (typeof textSize === 'function') textSize(8.5);

  const drawMetricLine = (label, val, yOff, col) => {
    fill(148, 163, 184);
    textAlign(LEFT, CENTER);
    text(label, boxX + 10, boxY + yOff);
    if (col) fill(col);
    else fill(220, 235, 245);
    textAlign(RIGHT, CENTER);
    text(val, boxX + boxW - 10, boxY + yOff);
  };

  const cGood = (typeof color === 'function') ? color(0, 208, 132) : '#00D084';
  const cWarn = (typeof color === 'function') ? color(255, 138, 0) : '#FF8A00';
  const cEmerald = (typeof color === 'function') ? color(0, 208, 132) : '#00D084';
  const cGold = (typeof color === 'function') ? color(251, 191, 36) : '#fbbf24';

  drawMetricLine('Moteur Graphique / FPS:', `${fps} FPS`, 42, fps >= 55 ? cGood : cWarn);
  drawMetricLine('Tensors TensorFlow.js:', `${tensors}`, 58, cEmerald);
  drawMetricLine('Flotte (Vivants / Éliminés):', `${aliveCars} / ${deadCars}`, 74);
  drawMetricLine('Caméra Active & Zoom:', `${cameraMode.toUpperCase()} (${camZoom.toFixed(2)}x)`, 90);
  drawMetricLine('Leader Vitesse & Cap:', `${speed} km/h · CP #${cpIndex}`, 106, cGold);
  drawMetricLine('Sens Circulation Piste:', 'HORAIRE (AVANT 100%)', 122, cGood);
  drawMetricLine('Forces Reynolds (Seek/Sep/Av):', `${STEERING_CONFIG.weightSeek.toFixed(1)} / ${STEERING_CONFIG.weightSep.toFixed(1)} / ${STEERING_CONFIG.weightAvoid.toFixed(1)}`, 122);
  drawMetricLine('Raccourcis Clavier:', 'Espace (Pause) · R (Reset) · B (Debug)', 138);

  // Kicker inférieur
  stroke(16, 185, 129, 70);
  strokeWeight(1);
  line(boxX + 8, boxY + 168, boxX + boxW - 8, boxY + 168);
  noStroke();
  fill(16, 185, 129);
  textSize(7.5);
  textAlign(CENTER, CENTER);
  text('Appuyez sur [B] ou cliquez sur Débogage pour fermer', boxX + boxW / 2, boxY + 179);

  pop();
}

// ========================================================================
// 8. FONCTIONS DU SYSTÈME DE CHAMPIONNAT, PROGRESSION ET MODALES
// ========================================================================


function updateStageHUD() {
  const topbarBadge = document.getElementById('topbar-stage-badge');
  const topbarName = document.getElementById('topbar-stage-name');
  const topbarProg = document.getElementById('topbar-stage-progress');
  const overlayTitle = document.getElementById('overlay-stage-title');
  const overlayLap = document.getElementById('overlay-lap');
  const minimapSub = document.getElementById('minimap-stage-sub');
  const badgeTrack = document.getElementById('badge-track');

  if (currentStage) {
    if (topbarBadge) topbarBadge.textContent = `STAGE ${currentStage.stageNumber}`;
    if (topbarName) topbarName.textContent = currentStage.name;
    if (topbarProg) topbarProg.textContent = `${unlockedStages.length} / ${STAGES.length}`;
    if (overlayTitle) overlayTitle.textContent = `STAGE ${currentStage.stageNumber} : ${currentStage.name.toUpperCase()}`;
    if (overlayLap) overlayLap.textContent = `TOUR 1 / ${currentStage.targetLaps}`;
    if (minimapSub) minimapSub.textContent = `STAGE ${currentStage.stageNumber}`;
    if (badgeTrack) badgeTrack.textContent = `STAGE #${currentStage.stageNumber}`;
    const selCircuit = document.getElementById('select-active-circuit');
    if (selCircuit) selCircuit.value = String(currentStageIndex);
  }
}

function loadProgression() {
  unlockedStages = ['stage-1'];
  stageRecords = {};
  currentStageIndex = 0;
  currentStage = STAGES[0];

  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(PROGRESSION_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed.unlockedStages)) {
          const validIds = parsed.unlockedStages.filter(id =>
            typeof id === 'string' && STAGES.some(s => s.id === id)
          );
          if (!validIds.includes('stage-1')) {
            validIds.unshift('stage-1');
          }
          unlockedStages = validIds;
        }

        if (parsed.records && typeof parsed.records === 'object' && !Array.isArray(parsed.records)) {
          const cleanRecords = {};
          for (const [k, v] of Object.entries(parsed.records)) {
            if (STAGES.some(s => s.id === k) && v && typeof v === 'object' && typeof v.timeMs === 'number') {
              cleanRecords[k] = v;
            }
          }
          stageRecords = cleanRecords;
        }

        if (parsed.currentStageId) {
          const idx = STAGES.findIndex(s => s.id === parsed.currentStageId);
          if (idx !== -1 && unlockedStages.includes(parsed.currentStageId)) {
            currentStageIndex = idx;
            currentStage = STAGES[idx];
          }
        }
      }
    }
  } catch (err) {
    console.warn('Erreur lecture progression localStorage:', err);
    unlockedStages = ['stage-1'];
    stageRecords = {};
    currentStageIndex = 0;
    currentStage = STAGES[0];
  }
}

function saveProgression() {
  try {
    if (typeof localStorage !== 'undefined') {
      const payload = {
        unlockedStages,
        currentStageId: currentStage ? currentStage.id : 'stage-1',
        records: stageRecords
      };
      localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(payload));
    }
  } catch (err) {
    console.warn('Erreur sauvegarde progression localStorage:', err);
  }
}

function resetProgressionData() {
  unlockedStages = ['stage-1'];
  stageRecords = {};
  currentStageIndex = 0;
  currentStage = STAGES[0];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PROGRESSION_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Erreur purge progression localStorage:', err);
  }
  loadStage(0, false);
}

function loadStage(stageIndex, preserveBrains = false, unlockIfLocked = false) {
  if (stageIndex < 0 || stageIndex >= STAGES.length) return;
  const targetStage = STAGES[stageIndex];
  if (unlockIfLocked && !unlockedStages.includes(targetStage.id)) {
    unlockedStages.push(targetStage.id);
  }
  if (!unlockedStages.includes(targetStage.id)) {
    console.warn(`Stage ${targetStage.id} est verrouillé !`);
    return;
  }

  stopConfettiAnimation();
  const victoryModal = document.getElementById('victory-modal');
  if (victoryModal) victoryModal.classList.add('hidden');

  currentStageIndex = stageIndex;
  currentStage = targetStage;
  saveProgression();

  raceState = 'racing';
  currentWinner = null;
  generationCount = 1;
  currentBestFitness = 0;
  generationHistory = [];
  currentGenLiveSamples = [];
  totalSessionElapsed = 0;
  stageAttemptElapsed = 0;

  // Régénération du tracé spécifique au stage
  buildTrack();

  // Recentrage de la caméra en mode libre sur le nouveau circuit (Req 4.4, 5.5)
  setCameraMode('free');
  updateCameraFree();
  camX = targetCamX;
  camY = targetCamY;
  camZoom = targetCamZoom;
  camRotation = 0;
  targetCamRotation = 0;

  if (typeof vehicleVisualSequence !== 'undefined') vehicleVisualSequence = 0;

  // Renouvellement ou transfert de la population
  const previousCars = population.concat(savedVehicles);
  if (preserveBrains && previousCars.length > 0) {
    population = Array.from({ length: TOTAL }, (_, i) => {
      const src = previousCars[i % previousCars.length];
      return src ? new Vehicle(src.brain) : new Vehicle();
    });
  } else {
    population = [];
    for (let i = 0; i < TOTAL; i++) {
      population.push(new Vehicle());
    }
  }

  for (const v of previousCars) {
    try {
      v.dispose();
    } catch (e) { }
  }
  savedVehicles = [];
  generationPopulationSize = TOTAL;

  // Positionnement officiel et rigoureux sur la grille du stage
  if (typeof StartingGrid !== 'undefined' && typeof StartingGrid.positionCars === 'function' && typeof checkpoints !== 'undefined' && checkpoints.length > 0) {
    StartingGrid.positionCars(population, checkpoints);
  }

  const badgeStatus = document.getElementById('badge-status');
  const statusText = document.getElementById('status-text');
  if (badgeStatus) {
    badgeStatus.classList.remove('finished');
    if (isPaused) {
      badgeStatus.classList.add('paused');
    } else {
      badgeStatus.classList.remove('paused');
    }
  }
  if (statusText) {
    statusText.textContent = isPaused ? 'PAUSED' : 'RUNNING';
  }

  updateStageHUD();
  updateTelemetryUI(0);
  drawTelemetryChart();
  renderStagesGrid();
}

function triggerVictory(winnerVehicle) {
  if (raceState !== 'racing') return;
  if (!winnerVehicle || winnerVehicle.dead) return;
  if (typeof currentStage === 'undefined' || !currentStage) return;
  if (winnerVehicle.lapsCompleted < currentStage.targetLaps) return;

  winnerVehicle.finished = true;
  raceState = 'finished';
  currentWinner = winnerVehicle;

  // Signal sonore de victoire Formule 1
  if (typeof SoundSystem !== 'undefined') {
    SoundSystem.playVictory();
  }

  // Affichage du classement officiel Formula Racing
  if (typeof RaceManager !== 'undefined' && typeof RaceManager.generateResultsModal === 'function') {
    RaceManager.generateResultsModal(winnerVehicle);
  }

  // Calcul du temps officiel de course basé sur l'épreuve réelle
  const totalSec = Math.floor(stageAttemptElapsed / 1000);
  const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const secs = String(totalSec % 60).padStart(2, '0');
  const tenths = Math.floor((stageAttemptElapsed % 1000) / 100);
  const formattedTime = `${mins}:${secs}.${tenths}`;

  // Détection et enregistrement du record sur la base de l'épreuve active
  const stageId = currentStage.id;
  const prevRecord = stageRecords[stageId];
  let isNewRecord = false;
  if (!prevRecord || stageAttemptElapsed < prevRecord.timeMs) {
    isNewRecord = true;
    stageRecords[stageId] = {
      timeMs: stageAttemptElapsed,
      formattedTime,
      gen: generationCount
    };
  }

  // Déblocage du stage suivant
  const nextStageIndex = currentStageIndex + 1;
  if (nextStageIndex < STAGES.length) {
    const nextStage = STAGES[nextStageIndex];
    if (!unlockedStages.includes(nextStage.id)) {
      unlockedStages.push(nextStage.id);
    }
  }

  // Sauvegarde persistante
  saveProgression();

  // Mise à jour visuelle du statut de course dans le header
  const badgeStatus = document.getElementById('badge-status');
  const statusText = document.getElementById('status-text');
  if (badgeStatus) {
    badgeStatus.classList.remove('paused');
    badgeStatus.classList.add('finished');
  }
  if (statusText) {
    statusText.textContent = 'TERMINÉ 🏆';
  }

  // Mise à jour de l'interface du modal de victoire
  const victoryModal = document.getElementById('victory-modal');
  const victoryTitle = document.getElementById('victory-title');
  const victorySubtitle = document.getElementById('victory-subtitle');
  const victoryTime = document.getElementById('victory-time');
  const victoryTimeRecord = document.getElementById('victory-time-record');
  const victoryGen = document.getElementById('victory-gen');
  const victoryLaps = document.getElementById('victory-laps');
  const victoryCpCount = document.getElementById('victory-cp-count');
  const victoryCarName = document.getElementById('victory-car-name');
  const victoryCarLivery = document.getElementById('victory-car-livery');
  const btnVictoryNext = document.getElementById('btn-victory-next');
  const victoryNextText = document.getElementById('victory-next-text');

  if (nextStageIndex < STAGES.length) {
    if (victoryTitle) victoryTitle.textContent = 'VICTORY!';
    if (victorySubtitle) {
      victorySubtitle.textContent = `Stage ${currentStage.stageNumber} — ${currentStage.name} brillamment terminé !`;
    }
    if (btnVictoryNext && victoryNextText) {
      btnVictoryNext.style.display = 'inline-flex';
      victoryNextText.textContent = `Stage suivant ▶ (${STAGES[nextStageIndex].name})`;
    }
  } else {
    // Stage 5 : Fin grandiose du Grand Championnat
    if (victoryTitle) victoryTitle.textContent = '🏆 GRAND CHAMPION DU MONDE !';
    if (victorySubtitle) {
      victorySubtitle.textContent = 'Félicitations ! Vous avez conquis l\'intégralité des 5 stages du Championnat !';
    }
    if (btnVictoryNext && victoryNextText) {
      btnVictoryNext.style.display = 'inline-flex';
      victoryNextText.textContent = 'Voir le Palmarès des Stages 🏆';
    }
  }

  if (victoryTime) victoryTime.textContent = formattedTime;
  if (victoryTimeRecord) {
    victoryTimeRecord.textContent = isNewRecord
      ? '★ Nouveau record personnel !'
      : (prevRecord ? `Record actuel : ${prevRecord.formattedTime}` : 'Temps officiel homologué');
  }
  if (victoryGen) victoryGen.textContent = `Gén ${generationCount}`;
  if (victoryLaps) victoryLaps.textContent = `${winnerVehicle.lapsCompleted} / ${currentStage.targetLaps}`;
  if (victoryCpCount) victoryCpCount.textContent = `${winnerVehicle.checkpointsCount} checkpoints franchis`;

  const liveryVariants = [
    'Vert Émeraude Racing',
    'Cyan Cyber Néon',
    'Orange Brasier Incandescent',
    'Violet Hyperdrive',
    'Rouge Scuderia F1',
    'Or Impérial'
  ];
  const livery = liveryVariants[winnerVehicle.visualVariant % liveryVariants.length] || 'Formule 1 Prototype';
  if (victoryCarName) victoryCarName.textContent = `#1 Champion (Bolide #${winnerVehicle.visualVariant + 1})`;
  if (victoryCarLivery) victoryCarLivery.textContent = `Livrée ${livery}`;

  if (victoryModal) {
    victoryModal.classList.remove('hidden');
  }

  // Animation de confettis
  startConfettiAnimation();

  // Mise à jour de la grille des stages et du HUD
  renderStagesGrid();
  updateStageHUD();
}

let confettiAnimationId = null;
function stopConfettiAnimation() {
  if (confettiAnimationId && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  const canvas = document.getElementById('victory-confetti-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    if (ctx && typeof ctx.clearRect === 'function') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

function startConfettiAnimation() {
  if (typeof requestAnimationFrame !== 'function') return;
  const canvas = document.getElementById('victory-confetti-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const confettiColors = ['#00D084', '#70E6A5', '#FF8A00', '#ec4899', '#ffffff', '#10b981'];
  const particles = Array.from({ length: 85 }, () => ({
    x: Math.random() * w,
    y: Math.random() * -h,
    size: 4 + Math.random() * 6,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.15
  }));

  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
  }

  let frames = 0;
  function animate() {
    const modal = document.getElementById('victory-modal');
    if (!modal || modal.classList.contains('hidden') || frames > 400) {
      ctx.clearRect(0, 0, w, h);
      confettiAnimationId = null;
      return;
    }
    frames++;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      if (p.y > h) {
        p.y = -10;
        p.x = Math.random() * w;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    confettiAnimationId = requestAnimationFrame(animate);
  }
  animate();
}

function renderStagesGrid() {
  const grid = document.getElementById('stages-grid');
  const progressText = document.getElementById('stages-progress-text');
  const progressFill = document.getElementById('stages-progress-fill');

  const unlockedCount = unlockedStages.length;
  const pct = Math.round((unlockedCount / STAGES.length) * 100);

  if (progressText) {
    progressText.textContent = `${unlockedCount} / ${STAGES.length} Stages Débloqués (${pct}%)`;
  }
  if (progressFill) {
    progressFill.style.width = `${pct}%`;
  }

  if (!grid) return;

  grid.innerHTML = '';
  const stageFlags = ['🇫🇷 Monaco Riviera', '🇺🇸 Mojave Raceway', '🇩🇪 Schwarzwald Ring', '🇸🇬 Marina Bay GP', '🇬🇧 Silverstone GP'];
  const stageCategories = ['FIA Grade 1', 'Desert Speedway', 'Alpine Ring', 'Night Street', 'Speed Temple'];
  const stageLengths = ['4.85 km', '5.20 km', '4.60 km', '5.06 km', '5.89 km'];
  const stageTurns = ['16 virages', '12 virages', '18 virages', '23 virages', '18 virages'];

  STAGES.forEach((stage, idx) => {
    const isUnlocked = unlockedStages.includes(stage.id);
    const isActive = (currentStageIndex === idx);
    const record = stageRecords[stage.id];
    const isCompleted = !!record;

    const card = document.createElement('div');
    card.className = `stage-card ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''} ${!isUnlocked ? 'is-locked' : ''}`;
    card.setAttribute('data-stage-index', idx);

    card.innerHTML = `
      <div class="stage-card-preview">
        <canvas class="stage-preview-canvas" width="160" height="100"></canvas>
        <span class="stage-flag-chip">${stageFlags[idx] || '🏁 GP'}</span>
        ${!isUnlocked ? `
          <div class="lock-overlay">
            <span class="padlock-icon" aria-hidden="true">🔒</span>
            <span class="lock-hint">Stage précédent requis</span>
          </div>
        ` : ''}
      </div>
      <div class="stage-card-header">
        <span class="stage-badge-chip">STAGE ${stage.stageNumber}</span>
        <span class="stage-category-chip">${stageCategories[idx] || 'Compétition'}</span>
        <span class="stage-diff-stars">${stage.stars}</span>
      </div>
      <h3 class="stage-card-title">${stage.name}</h3>
      <p class="stage-card-sub">${stage.description}</p>
      <div class="stage-card-specs">
        <span>Longueur :</span> <b>${stageLengths[idx]}</b>
        <span>Virages :</span> <b>${stageTurns[idx]}</b>
        <span>Tours :</span> <b>${stage.targetLaps} tours</b>
        <span>Largeur :</span> <b>${stage.pathWidth}m</b>
        <span>Record :</span> <b>${record ? record.formattedTime : '--:--.-'}</b>
        <span>Gén :</span> <b>${record ? `G${record.gen}` : '-'}</b>
      </div>
      <div class="stage-card-status">
        ${!isUnlocked ? `
          <button class="status-tag status-tag-locked" type="button" disabled>Verrouillé 🔒</button>
        ` : isActive ? `
          <button class="status-tag status-tag-current" type="button">En cours sur piste 🏁</button>
        ` : `
          <button class="status-tag status-tag-play" type="button">Lancer ce Grand Prix ▶</button>
        `}
      </div>
    `;

    if (isUnlocked && !isActive) {
      card.addEventListener('click', () => {
        loadStage(idx, false);
        const stagesModal = document.getElementById('stages-modal');
        if (stagesModal) stagesModal.classList.add('hidden');
      });
    }

    grid.appendChild(card);

    const previewCanvas = card.querySelector('.stage-preview-canvas');
    if (previewCanvas && previewCanvas.getContext) {
      drawStagePreviewTrack(previewCanvas, stage);
    }
  });
}

function drawStagePreviewTrack(canvas, stage) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Fond dégradé tech FIA luxueux
  if (typeof ctx.createLinearGradient === 'function') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (grad && typeof grad.addColorStop === 'function') {
      grad.addColorStop(0, '#09111e');
      grad.addColorStop(1, '#050a12');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#09111e';
    }
  } else {
    ctx.fillStyle = '#09111e';
  }
  ctx.fillRect(0, 0, w, h);

  // Grille subtile de télémétrie en arrière-plan
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  for (let x = 16; x < w; x += 22) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 16; y < h; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  let pts = [];
  if (typeof CircuitRegistry !== 'undefined') {
    const c = (stage.circuitId && typeof CircuitRegistry.getById === 'function')
      ? CircuitRegistry.getById(stage.circuitId)
      : (typeof CircuitRegistry.getByIndex === 'function' ? CircuitRegistry.getByIndex((stage.stageNumber || 1) - 1) : null);
    if (c && typeof c.generate === 'function') {
      pts = c.generate(1850, 1080, 60);
    }
  }

  if (!pts || pts.length === 0) {
    const total = 40;
    const cx = w / 2;
    const cy = h / 2;
    const xr = w * 0.38;
    const yr = h * 0.35;
    for (let i = 0; i < total; i++) {
      const a = (i / total) * Math.PI * 2;
      const wave = Math.sin(a * stage.stageNumber * 1.5 + stage.seed) * 0.18;
      const r = 1 + wave;
      pts.push({
        x: cx + Math.cos(a) * xr * r,
        y: cy + Math.sin(a) * yr * r
      });
    }
  }

  // Normalisation rigoureuse de la géométrie dans l'espace de la miniature
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const pad = 14;
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  const offX = (w - spanX * scale) / 2 - minX * scale;
  const offY = (h - spanY * scale) / 2 - minY * scale;
  const normPts = pts.map(p => ({
    x: p.x * scale + offX,
    y: p.y * scale + offY
  }));

  // 1. Chaussée large d'asphalte
  ctx.beginPath();
  normPts.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.closePath();
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#141d2b';
  ctx.stroke();

  // 2. Bordure contrastée
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  // 3. Trajectoire idéale lumineuse (couleur thème officielle)
  const col = (stage.theme && stage.theme.primaryColor) ? stage.theme.primaryColor : '#00D084';
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 4. Ligne de départ / arrivée (balise lumineuse dorée)
  if (normPts.length > 0) {
    const startP = normPts[0];
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = col;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(startP.x, startP.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ====================================================================
// CONTRÔLE ET RENDU DU VISUALISEUR DU RÉSEAU DE NEURONES (LIVE SYNAPSES)
// ====================================================================

function toggleNeuralModal(forceOpen) {
  const modal = document.getElementById('neural-modal');
  if (!modal) return;

  if (typeof forceOpen === 'boolean') {
    neuralModalOpen = forceOpen;
  } else {
    neuralModalOpen = !neuralModalOpen;
  }

  if (neuralModalOpen) {
    modal.classList.remove('hidden');
    renderNeuralNetworkVisualizer();
  } else {
    modal.classList.add('hidden');
  }

  const btnTopbar = document.getElementById('btn-topbar-nn');
  if (btnTopbar) {
    if (neuralModalOpen) btnTopbar.classList.add('active');
    else btnTopbar.classList.remove('active');
  }
}

function closeNeuralModal() {
  toggleNeuralModal(false);
}

if (typeof window !== 'undefined') {
  window.toggleNeuralModal = toggleNeuralModal;
  window.closeNeuralModal = closeNeuralModal;
  window.setNeuralTargetMode = setNeuralTargetMode;
}

function setNeuralTargetMode(mode) {
  neuralTargetMode = mode;
  const chipChamp = document.getElementById('btn-target-champion');
  const chipSel = document.getElementById('btn-target-selected');
  const chipMan = document.getElementById('btn-target-manual');

  if (chipChamp) {
    if (mode === 'champion') chipChamp.classList.add('active');
    else chipChamp.classList.remove('active');
  }
  if (chipSel) {
    if (mode === 'selected') chipSel.classList.add('active');
    else chipSel.classList.remove('active');
  }
  if (chipMan) {
    if (mode === 'manual') chipMan.classList.add('active');
    else chipMan.classList.remove('active');
  }

  renderNeuralNetworkVisualizer();
}

function getNeuralTargetVehicle() {
  if (neuralTargetMode === 'manual' && manualVehicle) {
    return manualVehicle;
  }
  if (neuralTargetMode === 'selected' && selectedVehicle) {
    return selectedVehicle;
  }
  if (currentLeaderCar) return currentLeaderCar;
  if (population && population.length > 0) {
    const alive = population.find(v => !v.dead);
    if (alive) return alive;
    return population[0];
  }
  if (savedVehicles && savedVehicles.length > 0) {
    return savedVehicles[savedVehicles.length - 1];
  }
  return null;
}

function renderNeuralNetworkVisualizer() {
  const canvas = document.getElementById('neural-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width || 760;
  const h = canvas.height || 420;

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  const bgGrad = (typeof ctx.createLinearGradient === 'function') ? ctx.createLinearGradient(0, 0, w, h) : null;
  if (bgGrad && typeof bgGrad.addColorStop === 'function') {
    bgGrad.addColorStop(0, '#070f1e');
    bgGrad.addColorStop(1, '#040913');
    ctx.fillStyle = bgGrad;
  } else {
    ctx.fillStyle = '#070f1e';
  }
  ctx.fillRect(0, 0, w, h);

  // Grille cybernétique subtile en arrière-plan
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridStep = 32;
  for (let gx = 0; gx < w; gx += gridStep) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  const targetCar = getNeuralTargetVehicle();

  // Mise à jour des cartes statistiques & en-têtes HTML
  const targetNameEl = document.getElementById('neural-target-name');
  const speedEl = document.getElementById('nn-target-speed');
  const telemEl = document.getElementById('nn-target-telemetry');

  let steerDeg = 0;
  let throttlePct = 0;
  let carSpeedKmh = 0;

  if (targetCar) {
    carSpeedKmh = Math.round((targetCar.speed || 0) * 24.5);
    if (targetCar.lastOutputs && targetCar.lastOutputs.length >= 2) {
      steerDeg = Math.round(((targetCar.lastOutputs[0] || 0.5) - 0.5) * 70);
      throttlePct = Math.round((targetCar.lastOutputs[1] || 0) * 100);
    }
    if (targetNameEl) {
      const modeLabel = (neuralTargetMode === 'champion')
        ? '🏆 Champion Leader (Top 1)'
        : (neuralTargetMode === 'selected' ? '🎯 Véhicule Sélectionné' : '🎮 Ma Voiture (Joueur)');
      const statusText = targetCar.dead ? ' · 💀 ÉLIMINÉ' : (targetCar.finished ? ' · 🏁 VICTOIRE' : ' · 🟢 EN COURSE');
      const fitnessText = ` · Fitness: ${targetCar.checkpointsCount || 0}`;
      targetNameEl.textContent = `${modeLabel}${statusText}${fitnessText}`;
    }
  } else if (targetNameEl) {
    targetNameEl.textContent = 'En attente de véhicule actif...';
  }

  if (speedEl) speedEl.textContent = `${carSpeedKmh} km/h`;
  if (telemEl) {
    const steerDir = steerDeg > 0 ? `+${steerDeg}° (Droite)` : (steerDeg < 0 ? `${steerDeg}° (Gauche)` : `0° (Neutre)`);
    telemEl.textContent = `Braquage: ${steerDir} | Gaz: ${throttlePct}%`;
  }

  // Extraction sécurisée des poids synaptiques TensorFlow.js
  let weightsData = null;
  if (targetCar && targetCar.brain && targetCar.brain.model && typeof targetCar.brain.model.getWeights === 'function') {
    try {
      const weights = targetCar.brain.model.getWeights();
      if (weights && weights.length >= 4) {
        weightsData = {
          wInHidden: (weights[0] && weights[0].dataSync) ? weights[0].dataSync() : null,
          bHidden: (weights[1] && weights[1].dataSync) ? weights[1].dataSync() : null,
          wHiddenOut: (weights[2] && weights[2].dataSync) ? weights[2].dataSync() : null,
          bOut: (weights[3] && weights[3].dataSync) ? weights[3].dataSync() : null
        };
      }
    } catch (err) { }
  }

  // Calcul des activations réelles des 9 entrées
  const inActs = new Array(9).fill(0.5);
  const sensorDistMeters = new Array(7).fill(50);
  if (targetCar) {
    if (targetCar.sensorDists) {
      for (let i = 0; i < 7; i++) {
        sensorDistMeters[i] = Math.round(targetCar.sensorDists[i] || 0);
      }
    }
    if (targetCar.lastInputs && targetCar.lastInputs.length >= 9) {
      for (let i = 0; i < 9; i++) {
        inActs[i] = Math.max(0, Math.min(1, targetCar.lastInputs[i] || 0));
      }
    } else {
      for (let i = 0; i < 7; i++) inActs[i] = 1 - Math.min(1, sensorDistMeters[i] / 100);
      inActs[7] = Math.min(1, (targetCar.speed || 0) / (targetCar.maxspeed || 6));
      inActs[8] = 0;
    }
  }

  // Calcul des activations réelles des 16 neurones cachés (Sigmoïde)
  const hidActs = new Array(16).fill(0.5);
  if (weightsData && weightsData.wInHidden && weightsData.bHidden) {
    for (let j = 0; j < 16; j++) {
      let sum = weightsData.bHidden[j] || 0;
      for (let i = 0; i < 9; i++) {
        sum += inActs[i] * (weightsData.wInHidden[i * 16 + j] || 0);
      }
      hidActs[j] = 1 / (1 + Math.exp(-sum));
    }
  } else {
    for (let j = 0; j < 16; j++) {
      hidActs[j] = 0.5 + 0.45 * Math.sin(neuralAnimPhase * 0.04 + j * 0.4);
    }
  }

  // Activations des 2 neurones de sortie
  const outActs = [0.5, 0.5];
  if (targetCar && targetCar.lastOutputs && targetCar.lastOutputs.length >= 2) {
    outActs[0] = Math.max(0, Math.min(1, targetCar.lastOutputs[0]));
    outActs[1] = Math.max(0, Math.min(1, targetCar.lastOutputs[1]));
  } else if (weightsData && weightsData.wHiddenOut && weightsData.bOut) {
    for (let k = 0; k < 2; k++) {
      let sum = weightsData.bOut[k] || 0;
      for (let j = 0; j < 16; j++) {
        sum += hidActs[j] * (weightsData.wHiddenOut[j * 2 + k] || 0);
      }
      outActs[k] = 1 / (1 + Math.exp(-sum));
    }
  }

  // Coordonnées spatiales des 3 couches sur le canvas
  const xIn = 148;
  const xHid = 380;
  const xOut = 612;

  // 9 neurones d'entrée
  const inNodes = [];
  const inStartY = 50;
  const inSpacing = (h - 96) / 8;
  const inputLabels = [
    'Ray -45°', 'Ray -30°', 'Ray -15°', 'Ray 0° (Centre)',
    'Ray +15°', 'Ray +30°', 'Ray +45°', 'Vitesse', 'Angle Cap'
  ];
  for (let i = 0; i < 9; i++) {
    inNodes.push({ x: xIn, y: inStartY + i * inSpacing, act: inActs[i], label: inputLabels[i] });
  }

  // 16 neurones cachés
  const hidNodes = [];
  const hidStartY = 38;
  const hidSpacing = (h - 76) / 15;
  for (let j = 0; j < 16; j++) {
    hidNodes.push({ x: xHid, y: hidStartY + j * hidSpacing, act: hidActs[j] });
  }

  // 2 neurones de sortie
  const outNodes = [
    { x: xOut, y: h * 0.36, act: outActs[0], label: 'Direction' },
    { x: xOut, y: h * 0.68, act: outActs[1], label: 'Accélérateur' }
  ];

  // Titres des 3 couches
  ctx.font = '700 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('ENTRÉES (9 CAPTEURS)', xIn - 20, 24);
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('COUCHE CACHÉE (16 NEURONES)', xHid, 20);
  ctx.fillStyle = '#34d399';
  ctx.fillText('SORTIES (2 ACTIONS)', xOut + 20, 24);

  // 1. Synapses couche 1 : Entrées -> Cachée (144 connexions)
  for (let i = 0; i < 9; i++) {
    const nIn = inNodes[i];
    for (let j = 0; j < 16; j++) {
      const nH = hidNodes[j];
      const w = (weightsData && weightsData.wInHidden)
        ? weightsData.wInHidden[i * 16 + j]
        : Math.sin(i * 1.7 + j * 0.9);
      const isPos = w >= 0;
      const alpha = Math.min(0.5, Math.abs(w) * 0.22 + 0.03);
      ctx.beginPath();
      ctx.moveTo(nIn.x, nIn.y);
      ctx.bezierCurveTo((nIn.x + nH.x) * 0.5, nIn.y, (nIn.x + nH.x) * 0.5, nH.y, nH.x, nH.y);
      ctx.strokeStyle = isPos ? `rgba(0, 240, 255, ${alpha})` : `rgba(255, 59, 105, ${alpha})`;
      ctx.lineWidth = Math.min(1.8, Math.max(0.4, Math.abs(w) * 0.7));
      ctx.stroke();
    }
  }

  // 2. Synapses couche 2 : Cachée -> Sortie (32 connexions)
  for (let j = 0; j < 16; j++) {
    const nH = hidNodes[j];
    for (let k = 0; k < 2; k++) {
      const nOut = outNodes[k];
      const w = (weightsData && weightsData.wHiddenOut)
        ? weightsData.wHiddenOut[j * 2 + k]
        : Math.cos(j * 1.3 + k * 2.1);
      const isPos = w >= 0;
      const alpha = Math.min(0.7, Math.abs(w) * 0.32 + 0.06);
      ctx.beginPath();
      ctx.moveTo(nH.x, nH.y);
      ctx.bezierCurveTo((nH.x + nOut.x) * 0.5, nH.y, (nH.x + nOut.x) * 0.5, nOut.y, nOut.x, nOut.y);
      ctx.strokeStyle = isPos ? `rgba(0, 240, 255, ${alpha})` : `rgba(255, 59, 105, ${alpha})`;
      ctx.lineWidth = Math.min(2.4, Math.max(0.6, Math.abs(w) * 1.0));
      ctx.stroke();
    }
  }

  // 3. Particules d'impulsion synaptique animées (Cybernetic Nerve Pulses)
  neuralAnimPhase += 1;
  if (!neuralSignalParticles || neuralSignalParticles.length === 0) {
    neuralSignalParticles = [];
    for (let p = 0; p < 24; p++) {
      neuralSignalParticles.push({
        layer: p % 2,
        from: Math.floor(Math.random() * (p % 2 === 0 ? 9 : 16)),
        to: Math.floor(Math.random() * (p % 2 === 0 ? 16 : 2)),
        progress: Math.random(),
        speed: 0.012 + Math.random() * 0.018
      });
    }
  }

  for (let p of neuralSignalParticles) {
    p.progress += p.speed;
    if (p.progress >= 1) {
      p.progress = 0;
      p.from = Math.floor(Math.random() * (p.layer === 0 ? 9 : 16));
      p.to = Math.floor(Math.random() * (p.layer === 0 ? 16 : 2));
    }
    const n1 = p.layer === 0 ? inNodes[p.from] : hidNodes[p.from];
    const n2 = p.layer === 0 ? hidNodes[p.to] : outNodes[p.to];
    if (n1 && n2) {
      const t = p.progress;
      const cp1x = (n1.x + n2.x) * 0.5;
      const cp1y = n1.y;
      const cp2x = (n1.x + n2.x) * 0.5;
      const cp2y = n2.y;
      const px = Math.pow(1 - t, 3) * n1.x + 3 * Math.pow(1 - t, 2) * t * cp1x + 3 * (1 - t) * Math.pow(t, 2) * cp2x + Math.pow(t, 3) * n2.x;
      const py = Math.pow(1 - t, 3) * n1.y + 3 * Math.pow(1 - t, 2) * t * cp1y + 3 * (1 - t) * Math.pow(t, 2) * cp2y + Math.pow(t, 3) * n2.y;

      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = p.layer === 0 ? '#00f0ff' : '#34d399';
      if (typeof ctx.shadowBlur === 'number') {
        ctx.shadowColor = p.layer === 0 ? '#00f0ff' : '#34d399';
        ctx.shadowBlur = 5;
      }
      ctx.fill();
      if (typeof ctx.shadowBlur === 'number') ctx.shadowBlur = 0;
    }
  }

  // 4. Dessin des neurones d'entrée avec valeurs de capteurs
  for (let i = 0; i < 9; i++) {
    const node = inNodes[i];
    let col = '#00f0ff';
    if (i < 7) {
      const danger = node.act;
      if (danger > 0.75) col = '#ff3b69';
      else if (danger > 0.45) col = '#fbbf24';
      else col = '#10b981';
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(7, 17, 30, 0.95)';
    ctx.fill();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = col;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(node.x, node.y, Math.max(2, node.act * 5), 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();

    ctx.font = '600 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e2e8f0';
    let valStr = '';
    if (i < 7) valStr = `${sensorDistMeters[i]}m`;
    else if (i === 7) valStr = `${carSpeedKmh}km/h`;
    else valStr = `${Math.round(((targetCar && targetCar.lastInputs) ? targetCar.lastInputs[8] * 180 : 0))}°`;

    ctx.fillText(`${node.label}: ${valStr}`, node.x - 14, node.y + 3.5);
  }

  // 5. Dessin des 16 neurones cachés avec halo d'activation
  for (let j = 0; j < 16; j++) {
    const node = hidNodes[j];
    const act = node.act;
    const r = 5.5;

    if (act > 0.35) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + act * 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167, 139, 250, ${act * 0.35})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${Math.round(20 + act * 150)}, ${Math.round(20 + act * 100)}, ${Math.round(40 + act * 215)})`;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = act > 0.5 ? '#c084fc' : '#475569';
    ctx.stroke();
  }

  // 6. Dessin des 2 neurones de sortie avec jauges en direct
  // Sortie 0 : Direction (Steer)
  const nSteer = outNodes[0];
  ctx.beginPath();
  ctx.arc(nSteer.x, nSteer.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#38bdf8';
  if (typeof ctx.shadowBlur === 'number') {
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
  }
  ctx.stroke();
  if (typeof ctx.shadowBlur === 'number') ctx.shadowBlur = 0;

  // Aiguille d'orientation de braquage
  const sRad = (nSteer.act - 0.5) * Math.PI * 0.7;
  ctx.beginPath();
  ctx.moveTo(nSteer.x, nSteer.y);
  ctx.lineTo(nSteer.x + Math.sin(sRad) * 11, nSteer.y - Math.cos(sRad) * 11);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.font = '700 11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Direction (Braquage)', nSteer.x + 22, nSteer.y - 4);
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.fillStyle = steerDeg > 0 ? '#38bdf8' : (steerDeg < 0 ? '#f43f5e' : '#94a3b8');
  ctx.fillText(steerDeg > 0 ? `+${steerDeg}° (Droite)` : (steerDeg < 0 ? `${steerDeg}° (Gauche)` : `0° (Neutre)`), nSteer.x + 22, nSteer.y + 11);

  // Sortie 1 : Accélérateur (Gaz)
  const nThrot = outNodes[1];
  ctx.beginPath();
  ctx.arc(nThrot.x, nThrot.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#10b981';
  if (typeof ctx.shadowBlur === 'number') {
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
  }
  ctx.stroke();
  if (typeof ctx.shadowBlur === 'number') ctx.shadowBlur = 0;

  ctx.font = '700 11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Accélérateur (Gaz)', nThrot.x + 22, nThrot.y - 8);

  const barW = 75;
  const barH = 7;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(nThrot.x + 22, nThrot.y - 2, barW, barH);
  const fillW = Math.max(0, Math.min(barW, barW * nThrot.act));
  ctx.fillStyle = '#10b981';
  ctx.fillRect(nThrot.x + 22, nThrot.y - 2, fillW, barH);

  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#34d399';
  ctx.fillText(`${throttlePct}%`, nThrot.x + 22, nThrot.y + 16);

  ctx.restore();
}

