import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const sketchPath = fileURLToPath(new URL('../sketch.js', import.meta.url));
const vehiclePath = fileURLToPath(new URL('../vehicle.js', import.meta.url));

const sketchSource = await readFile(sketchPath, 'utf8');
const vehicleSource = await readFile(vehiclePath, 'utf8');

const toPlain = (v) => JSON.parse(JSON.stringify(v));

function createChampionshipContext(initialStorage = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const elements = new Map();

  function makeElement(id) {
    const listeners = new Map();
    const classes = new Set();
    const children = [];
    const element = {
      id,
      textContent: '',
      value: '',
      tagName: 'DIV',
      style: {},
      listeners,
      children,
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); },
        get length() { return classes.size; }
      },
      addEventListener(type, handler) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(handler);
      },
      click() {
        const handlers = listeners.get('click') || [];
        for (const h of handlers) h({ target: this, preventDefault() {} });
      },
      input(value) {
        this.value = value;
        const handlers = listeners.get('input') || [];
        for (const h of handlers) h({ target: this });
      },
      setAttribute(k, v) { this[k] = v; },
      getAttribute(k) { return this[k]; },
      appendChild(child) { children.push(child); return child; },
      querySelector() { return makeElement('child-canvas'); },
      getContext() {
        return new Proxy({}, {
          get: (target, key) => target[key] ?? (() => {}),
          set: (target, key, value) => { target[key] = value; return true; }
        });
      }
    };
    return element;
  }

  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    },
    createElement(tag) {
      const el = makeElement(`created-${tag}`);
      el.tagName = tag.toUpperCase();
      return el;
    }
  };

  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
    clear() { storage.clear(); },
    get _storage() { return storage; }
  };

  class Vector {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; return this; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    mult(n) { this.x *= n; this.y *= n; return this; }
    heading() { return Math.atan2(this.y, this.x); }
    static sub(v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y); }
    static fromAngle(angle) { return new Vector(Math.cos(angle), Math.sin(angle)); }
    static dist(v1, v2) { return Math.hypot(v1.x - v2.x, v1.y - v2.y); }
  }

  class MockNeuralNetwork {
    constructor() {}
    copy() { return new MockNeuralNetwork(); }
    mutate() {}
    predict() { return [0.5, 0.5]; }
    dispose() {}
  }

  class MockRay {
    constructor(pos, angle) { this.pos = pos; this.dir = Vector.fromAngle(angle); }
    rotate(angle) { this.dir = Vector.fromAngle(angle); }
    cast() { return null; }
    show() {}
  }

  class MockBoundary {
    constructor(x1, y1, x2, y2) { this.a = { x: x1, y: y1 }; this.b = { x: x2, y: y2 }; }
    midpoint() { return new Vector((this.a.x + this.b.x) / 2, (this.a.y + this.b.y) / 2); }
  }

  const sandbox = {
    document,
    window: { addEventListener() {} },
    localStorage,
    createVector: (x, y) => new Vector(x, y),
    p5: { Vector },
    radians: (deg) => (deg * Math.PI) / 180,
    TWO_PI: Math.PI * 2,
    PI: Math.PI,
    cos: Math.cos,
    sin: Math.sin,
    map: (value, low, high, outLow, outHigh) => outLow + ((value - low) / (high - low)) * (outHigh - outLow),
    constrain: (v, min, max) => Math.min(Math.max(v, min), max),
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    lerp: (start, stop, amt) => start + (stop - start) * amt,
    random: (min, max) => (max === undefined ? (min || 1) * 0.5 : min + (max - min) * 0.5),
    noise: () => 0.5,
    noiseSeed: () => {},
    randomSeed: () => {},
    width: 1400,
    height: 800,
    frameCount: 1,
    deltaTime: 16.6,
    createCanvas: () => ({ parent() {} }),
    createGraphics: () => ({
      noStroke() {}, fill() {}, ellipse() {}, stroke() {}, strokeWeight() {},
      textFont() {}, textSize() {}, textAlign() {}, text() {}
    }),
    color: () => '#00f0ff',
    push: () => {},
    pop: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    stroke: () => {},
    noStroke: () => {},
    fill: () => {},
    noFill: () => {},
    ellipse: () => {},
    rect: () => {},
    rectMode: () => {},
    CENTER: 'center',
    CORNER: 'corner',
    LEFT: 'left',
    RIGHT: 'right',
    TOP: 'top',
    BOTTOM: 'bottom',
    line: () => {},
    triangle: () => {},
    background: () => {},
    cursor: () => {},
    beginShape: () => {},
    endShape: () => {},
    CLOSE: 'close',
    vertex: () => {},
    textAlign: () => {},
    textSize: () => {},
    textFont: () => {},
    text: () => {},
    strokeWeight: () => {},
    strokeCap: () => {},
    ROUND: 'round',
    SQUARE: 'square',
    PROJECT: 'project',
    bezierVertex: () => {},
    curveVertex: () => {},
    quad: () => {},
    arc: () => {},
    image: () => {},
    tf: { setBackend: () => {} },
    NeuralNetwork: MockNeuralNetwork,
    Ray: MockRay,
    Boundary: MockBoundary,
    nextGeneration: () => {},
    renderTrack: () => {},
    renderPauseOverlay: () => {},
    updateTelemetryUI: () => {}
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(vehicleSource, context, { filename: 'vehicle.js' });
  vm.runInContext(sketchSource, context, { filename: 'sketch.js' });

  return { context, elements, localStorage };
}

// --------------------------------------------------------------------------
// TEST 1 : Aucun vainqueur n'est déclaré avant la fin du nombre de tours requis
// --------------------------------------------------------------------------
test('1. Aucun vainqueur n\'est déclaré avant la fin du nombre de tours requis', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  const vehicle = vm.runInContext('new Vehicle()', context);
  const targetLaps = 3;
  let victoryTriggered = false;
  const onVictory = () => { victoryTriggered = true; };

  const checkpoints = vm.runInContext('checkpoints', context);

  // Simuler 2 tours complets sur les 60 checkpoints
  for (let lap = 0; lap < 2; lap++) {
    for (let cp = 1; cp < checkpoints.length; cp++) {
      vehicle.pos = checkpoints[cp].midpoint();
      vehicle.check(checkpoints, targetLaps, onVictory);
    }
    // Ligne d'arrivée
    vehicle.pos = checkpoints[0].midpoint();
    vehicle.check(checkpoints, targetLaps, onVictory);
  }

  assert.equal(vehicle.lapsCompleted, 2);
  assert.equal(vehicle.finished, false);
  assert.equal(victoryTriggered, false);
});

// --------------------------------------------------------------------------
// TEST 2 : Un véhicule terminé déclenche une seule victoire
// --------------------------------------------------------------------------
test('2. Un véhicule terminé déclenche une seule victoire', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  const vehicle = vm.runInContext('new Vehicle()', context);
  const targetLaps = 1;
  let victoryCalls = 0;
  const onVictory = () => { victoryCalls++; };

  const checkpoints = vm.runInContext('checkpoints', context);

  // Franchir checkpoints 1 à 59
  for (let cp = 1; cp < checkpoints.length; cp++) {
    vehicle.pos = checkpoints[cp].midpoint();
    vehicle.check(checkpoints, targetLaps, onVictory);
  }

  // Franchir checkpoint 0 (fin du 1er tour)
  vehicle.pos = checkpoints[0].midpoint();
  vehicle.check(checkpoints, targetLaps, onVictory);

  assert.equal(vehicle.lapsCompleted, 1);
  assert.equal(vehicle.finished, true);
  assert.equal(victoryCalls, 1);

  // Tentative de refranchissement immédiat
  vehicle.check(checkpoints, targetLaps, onVictory);
  vehicle.check(checkpoints, targetLaps, onVictory);
  assert.equal(victoryCalls, 1, 'Le callback de victoire ne doit être appelé qu\'une seule fois');
});

// --------------------------------------------------------------------------
// TEST 3 : Un véhicule accidenté ne débloque aucun stage
// --------------------------------------------------------------------------
test('3. Un véhicule accidenté ne débloque aucun stage', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('setupUIEventListeners()', context);

  const initialUnlocked = vm.runInContext('unlockedStages', context);
  assert.deepEqual(toPlain(initialUnlocked), ['stage-1']);

  // Un véhicule crashe
  const vehicle = vm.runInContext('new Vehicle()', context);
  vehicle.dead = true;
  context.vehicle = vehicle;

  // Mise à jour de la boucle de course avec ce véhicule mort
  vm.runInContext('population = [vehicle]', context);
  vm.runInContext(`
    for (let i = population.length - 1; i >= 0; i--) {
      const v = population[i];
      if (v.dead) savedVehicles.push(population.splice(i, 1)[0]);
    }
  `, context);

  const afterUnlocked = vm.runInContext('unlockedStages', context);
  assert.deepEqual(toPlain(afterUnlocked), ['stage-1']);
  assert.equal(vm.runInContext('raceState', context), 'racing');
});

// --------------------------------------------------------------------------
// TEST 4 : La fin d'une génération génétique ne débloque aucun stage
// --------------------------------------------------------------------------
test("4. La fin d'une génération génétique ne débloque aucun stage", () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);
  vm.runInContext('initPopulation()', context);

  const initialUnlocked = vm.runInContext('unlockedStages', context);
  assert.deepEqual(toPlain(initialUnlocked), ['stage-1']);

  // Simuler la fin de génération (toutes les voitures éliminées)
  context.nextGeneration = () => {};
  vm.runInContext('savedVehicles = population.splice(0, population.length)', context);
  vm.runInContext('handleGenerationEnd()', context);

  const afterGenUnlocked = vm.runInContext('unlockedStages', context);
  assert.deepEqual(toPlain(afterGenUnlocked), ['stage-1'], 'La fin de génération ne doit débloquer aucun stage');
  assert.equal(vm.runInContext('generationCount', context), 2);
});

// --------------------------------------------------------------------------
// TEST 5 : Le stage suivant se débloque après une victoire réelle
// --------------------------------------------------------------------------
test('5. Le stage suivant se débloque après une victoire réelle', () => {
  const { context, elements } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);
  vm.runInContext('currentStageIndex = 0; currentStage = STAGES[0]; unlockedStages = ["stage-1"]; raceState = "racing";', context);

  const winner = vm.runInContext('new Vehicle()', context);
  winner.lapsCompleted = 3;
  winner.checkpointsCount = 180;
  context.winner = winner;

  vm.runInContext('triggerVictory(winner)', context);

  const unlocked = vm.runInContext('unlockedStages', context);
  assert.deepEqual(toPlain(unlocked), ['stage-1', 'stage-2']);
  assert.equal(vm.runInContext('raceState', context), 'finished');

  // Vérification de l'ouverture du modal de victoire
  const victoryModal = elements.get('victory-modal');
  assert.equal(victoryModal.classList.contains('hidden'), false);
  assert.equal(elements.get('victory-title').textContent, 'VICTORY!');
});

// --------------------------------------------------------------------------
// TEST 6 : Les stages déjà débloqués restent accessibles après rechargement
// --------------------------------------------------------------------------
test('6. Les stages déjà débloqués restent accessibles après rechargement', () => {
  const storageData = JSON.stringify({
    unlockedStages: ['stage-1', 'stage-2', 'stage-3'],
    currentStageId: 'stage-2',
    records: { 'stage-1': { timeMs: 45000, formattedTime: '00:45.0', gen: 1 } }
  });

  const { context } = createChampionshipContext({
    'autonomous_racing_lab_progression': storageData
  });

  vm.runInContext('loadProgression()', context);

  const unlocked = vm.runInContext('unlockedStages', context);
  assert.deepEqual(toPlain(unlocked), ['stage-1', 'stage-2', 'stage-3']);
  assert.equal(vm.runInContext('currentStage.id', context), 'stage-2');
  assert.equal(vm.runInContext('stageRecords["stage-1"].formattedTime', context), '00:45.0');
});

// --------------------------------------------------------------------------
// TEST 7 : Le stage actif charge le nombre de tours configuré
// --------------------------------------------------------------------------
test('7. Le stage actif charge le nombre de tours configuré', () => {
  const { context } = createChampionshipContext();

  const stages = vm.runInContext('STAGES', context);
  assert.equal(stages.length, 5);
  assert.equal(stages[0].targetLaps, 3);
  assert.equal(stages[1].targetLaps, 5);
  assert.equal(stages[2].targetLaps, 7);
  assert.equal(stages[3].targetLaps, 10);
  assert.equal(stages[4].targetLaps, 15);

  // Charger le stage 2
  vm.runInContext('unlockedStages = ["stage-1", "stage-2"]', context);
  vm.runInContext('loadStage(1, false)', context);

  assert.equal(vm.runInContext('currentStage.targetLaps', context), 5);
  assert.equal(vm.runInContext('currentStage.name', context), stages[1].name);
});

// --------------------------------------------------------------------------
// TEST 8 : Le modal de victoire ne s'ouvre pas plusieurs fois pour le même résultat
// --------------------------------------------------------------------------
test("8. Le modal de victoire ne s'ouvre pas plusieurs fois pour le même résultat", () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);
  vm.runInContext('currentStageIndex = 0; currentStage = STAGES[0]; raceState = "racing";', context);

  const car1 = vm.runInContext('new Vehicle()', context);
  car1.lapsCompleted = 3;
  const car2 = vm.runInContext('new Vehicle()', context);
  car2.lapsCompleted = 3;

  context.car1 = car1;
  context.car2 = car2;

  vm.runInContext('triggerVictory(car1)', context);
  const firstWinner = vm.runInContext('currentWinner', context);
  assert.equal(firstWinner, car1);

  // Un deuxième bolide tente de déclencher une victoire sur la même frame
  vm.runInContext('triggerVictory(car2)', context);
  const maintainedWinner = vm.runInContext('currentWinner', context);
  assert.equal(maintainedWinner, car1, 'Le premier vainqueur doit être conservé sans réouverture concurrente');
});

// --------------------------------------------------------------------------
// TEST 9 : Les cas d'une population de 0, 1, 2 ou plusieurs véhicules ne provoquent aucune exception
// --------------------------------------------------------------------------
test("9. Les cas d'une population de 0, 1, 2 ou plusieurs véhicules ne provoquent aucune exception", () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  // Test avec 0 véhicule
  vm.runInContext('population = []; savedVehicles = [];', context);
  assert.doesNotThrow(() => {
    vm.runInContext('draw()', context);
  });

  // Test avec 1 véhicule
  vm.runInContext('population = [new Vehicle()]; savedVehicles = [];', context);
  assert.doesNotThrow(() => {
    vm.runInContext('draw()', context);
  });

  // Test avec 2 véhicules
  vm.runInContext('population = [new Vehicle(), new Vehicle()]; savedVehicles = [];', context);
  assert.doesNotThrow(() => {
    vm.runInContext('draw()', context);
  });

  // Test avec 10 véhicules
  vm.runInContext('population = Array.from({ length: 10 }, () => new Vehicle()); savedVehicles = [];', context);
  assert.doesNotThrow(() => {
    vm.runInContext('draw()', context);
  });
});

// --------------------------------------------------------------------------
// TEST 10 : Sécurité au premier passage sur la ligne de départ (pas de victoire prématurée)
// --------------------------------------------------------------------------
test('10. Sécurité au premier passage sur la ligne de départ : pas de victoire prématurée', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  const vehicle = vm.runInContext('new Vehicle()', context);
  const checkpoints = vm.runInContext('checkpoints', context);
  let triggered = false;

  // Le véhicule est posé sur la grille de départ (checkpoint 0)
  vehicle.pos = checkpoints[0].midpoint();
  vehicle.index = 0; // Si l'index pointe accidentellement sur 0 au départ
  vehicle.check(checkpoints, 1, () => { triggered = true; });

  assert.equal(vehicle.lapsCompleted, 0, 'Le tour ne doit pas être validé sans avoir parcouru les checkpoints intermédiaires');
  assert.equal(vehicle.finished, false);
  assert.equal(triggered, false);
});

// --------------------------------------------------------------------------
// TEST 11 : Réinitialisation et résilience face aux données de progression corrompues
// --------------------------------------------------------------------------
test('11. Réinitialisation et résilience face aux données de progression corrompues', () => {
  // Test données corrompues
  const corruptedStorage = {
    autonomous_racing_lab_progression: JSON.stringify({
      unlockedStages: ['stage-99', null, 42],
      records: 'not an object',
      currentStageId: 'invalid-id'
    })
  };
  const { context } = createChampionshipContext(corruptedStorage);
  vm.runInContext('loadProgression()', context);

  const unlocked = vm.runInContext('unlockedStages', context);
  assert.ok(toPlain(unlocked).includes('stage-1'), 'Stage 1 doit toujours rester déverrouillé');
  assert.equal(vm.runInContext('currentStageIndex', context), 0);

  // Test réinitialisation complète
  vm.runInContext('unlockedStages = ["stage-1", "stage-2", "stage-3"]; stageRecords = { "stage-1": { timeMs: 5000 } };', context);
  vm.runInContext('resetProgressionData()', context);
  const resetUnlocked = vm.runInContext('unlockedStages', context);
  assert.deepEqual(toPlain(resetUnlocked), ['stage-1']);
  const resetRecords = vm.runInContext('stageRecords', context);
  assert.deepEqual(toPlain(resetRecords), {});
  assert.equal(vm.runInContext('currentStageIndex', context), 0);
});

// --------------------------------------------------------------------------
// TEST 12 : Les checkpoints sautés empêchent la validation du tour
// --------------------------------------------------------------------------
test('12. Les checkpoints sautés (> 2) empêchent la validation du tour', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  const vehicle = vm.runInContext('new Vehicle()', context);
  const checkpoints = vm.runInContext('checkpoints', context);
  let triggered = false;

  // On saute 10 checkpoints (seulement 49 checkpoints franchis sur 60)
  for (let cp = 1; cp < checkpoints.length - 10; cp++) {
    vehicle.pos = checkpoints[cp].midpoint();
    vehicle.check(checkpoints, 1, () => { triggered = true; });
  }

  // Tentative de passer la ligne d'arrivée
  vehicle.index = 0;
  vehicle.pos = checkpoints[0].midpoint();
  vehicle.check(checkpoints, 1, () => { triggered = true; });

  assert.equal(vehicle.lapsCompleted, 0, 'Le tour ne doit pas être validé si trop de checkpoints ont été manqués');
  assert.equal(vehicle.finished, false);
  assert.equal(triggered, false);
});

// --------------------------------------------------------------------------
// TEST 13 : Un véhicule terminé ne peut plus compter de tours ni déclencher de victoire
// --------------------------------------------------------------------------
test('13. Un véhicule terminé ne peut plus compter de tours ni déclencher de victoire', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  const vehicle = vm.runInContext('new Vehicle()', context);
  const checkpoints = vm.runInContext('checkpoints', context);
  vehicle.finished = true;
  vehicle.lapsCompleted = 3;

  let extraCalls = 0;
  vehicle.pos = checkpoints[0].midpoint();
  vehicle.check(checkpoints, 3, () => { extraCalls++; });

  assert.equal(vehicle.lapsCompleted, 3, 'Les tours ne doivent plus augmenter');
  assert.equal(extraCalls, 0, 'Aucun rappel de victoire ne doit avoir lieu');
});

// --------------------------------------------------------------------------
// TEST 14 : Rejouer et Stage suivant relancent et chargent les bons stages avec préservation des cerveaux
// --------------------------------------------------------------------------
test('14. Rejouer et Stage suivant relancent et chargent les bons stages avec préservation des cerveaux', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);
  vm.runInContext('unlockedStages = ["stage-1", "stage-2"];', context);

  // Charger le Stage 2 avec preserveBrains = true
  vm.runInContext('loadStage(1, true)', context);
  assert.equal(vm.runInContext('currentStageIndex', context), 1);
  assert.equal(vm.runInContext('currentStage.id', context), 'stage-2');
  assert.equal(vm.runInContext('raceState', context), 'racing');
  assert.equal(vm.runInContext('currentWinner', context), null);
  assert.equal(vm.runInContext('population.length', context), vm.runInContext('TOTAL', context));

  // Rejouer le Stage 2
  vm.runInContext('loadStage(1, true)', context);
  assert.equal(vm.runInContext('currentStageIndex', context), 1);
  assert.equal(vm.runInContext('raceState', context), 'racing');
});

// --------------------------------------------------------------------------
// TEST 15 : Le dernier stage (Stage 5) gère la victoire finale sans retour silencieux
// --------------------------------------------------------------------------
test('15. Le dernier stage (Stage 5) gère la victoire finale et la gloire du championnat', () => {
  const { context, elements } = createChampionshipContext();
  vm.runInContext('setupUIEventListeners()', context);
  vm.runInContext('buildTrack()', context);
  vm.runInContext('unlockedStages = ["stage-1", "stage-2", "stage-3", "stage-4", "stage-5"];', context);
  vm.runInContext('loadStage(4, false);', context); // Index 4 = Stage 5

  const car = vm.runInContext('new Vehicle()', context);
  car.lapsCompleted = 15;
  car.finished = true;
  context.car = car;

  vm.runInContext('triggerVictory(car)', context);

  assert.equal(vm.runInContext('raceState', context), 'finished');
  assert.equal(vm.runInContext('currentWinner', context), car);

  const titleEl = elements.get('victory-title');
  assert.ok(titleEl.textContent.includes('CHAMPION'), 'Le titre doit célébrer la victoire mondiale');

  const btnNext = elements.get('btn-victory-next');
  btnNext.click();

  // Le clic ne doit pas réinitialiser silencieusement à l'index 0, la grille des stages est accessible
  const stagesModal = elements.get('stages-modal');
  assert.equal(stagesModal.classList.contains('hidden'), false, 'La grille des stages doit être ouverte');
});

// --------------------------------------------------------------------------
// TEST 16 : Le chronomètre d\'épreuve mesure le temps de la tentative active et se réinitialise par génération
// --------------------------------------------------------------------------
test('16. Le chronomètre d\'épreuve mesure le temps de la tentative active et se réinitialise par génération', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  // Simuler 100 frames physiques
  vm.runInContext('stageAttemptElapsed = 1666.6;', context);
  assert.equal(vm.runInContext('stageAttemptElapsed', context), 1666.6);

  // La génération s'éteint sans vainqueur
  vm.runInContext('savedVehicles = [new Vehicle()]; population = []; handleGenerationEnd();', context);
  assert.equal(vm.runInContext('stageAttemptElapsed', context), 0, 'Le chronomètre de tentative doit être remis à zéro pour la nouvelle génération');
});

// --------------------------------------------------------------------------
// TEST 17 : Un checkpoint simplement approché sans franchissement
// --------------------------------------------------------------------------
test('17. Un checkpoint simplement approché sans franchissement', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  const checkpoints = vm.runInContext('checkpoints', context);
  const cp1 = checkpoints[1];
  const mid = cp1.midpoint();
  const norm = { x: -(cp1.b.y - cp1.a.y), y: cp1.b.x - cp1.a.x };
  const normLen = Math.hypot(norm.x, norm.y);
  const uNorm = { x: norm.x / normLen, y: norm.y / normLen };

  const vehicle = vm.runInContext('new Vehicle()', context);
  vehicle.index = 1;
  const Vector = vm.runInContext('p5.Vector', context);
  // Déplacement avant le checkpoint sans le franchir (10px avant -> 3px avant)
  vehicle.prevPos = new Vector(mid.x - uNorm.x * 10, mid.y - uNorm.y * 10);
  vehicle.pos = new Vector(mid.x - uNorm.x * 3, mid.y - uNorm.y * 3);

  vehicle.check(checkpoints, 3, () => {});

  assert.equal(vehicle.checkpointsCount, 0, 'Le checkpoint ne doit pas être validé sans franchissement');
  assert.equal(vehicle.index, 1, 'L\'index cible doit rester sur le même checkpoint');
});

// --------------------------------------------------------------------------
// TEST 18 : Un franchissement valide de checkpoint
// --------------------------------------------------------------------------
test('18. Un franchissement valide de checkpoint', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  const checkpoints = vm.runInContext('checkpoints', context);
  const cp1 = checkpoints[1];
  const mid = cp1.midpoint();
  const norm = { x: -(cp1.b.y - cp1.a.y), y: cp1.b.x - cp1.a.x };
  const normLen = Math.hypot(norm.x, norm.y);
  const uNorm = { x: norm.x / normLen, y: norm.y / normLen };

  const vehicle = vm.runInContext('new Vehicle()', context);
  vehicle.index = 1;
  const Vector = vm.runInContext('p5.Vector', context);
  // Déplacement qui traverse le checkpoint dans le bon sens (10px avant -> 10px après)
  vehicle.prevPos = new Vector(mid.x - uNorm.x * 10, mid.y - uNorm.y * 10);
  vehicle.pos = new Vector(mid.x + uNorm.x * 10, mid.y + uNorm.y * 10);

  vehicle.check(checkpoints, 3, () => {});

  assert.equal(vehicle.checkpointsCount, 1, 'Le checkpoint doit être validé après franchissement');
  assert.equal(vehicle.index, 2, 'L\'index cible doit avancer au checkpoint suivant');
});

// --------------------------------------------------------------------------
// TEST 19 : Un franchissement dans le mauvais sens
// --------------------------------------------------------------------------
test('19. Un franchissement dans le mauvais sens', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  const checkpoints = vm.runInContext('checkpoints', context);
  const cp1 = checkpoints[1];
  const mid = cp1.midpoint();
  const norm = { x: -(cp1.b.y - cp1.a.y), y: cp1.b.x - cp1.a.x };
  const normLen = Math.hypot(norm.x, norm.y);
  const uNorm = { x: norm.x / normLen, y: norm.y / normLen };

  const vehicle = vm.runInContext('new Vehicle()', context);
  vehicle.index = 1;
  const Vector = vm.runInContext('p5.Vector', context);
  // Déplacement à contre-sens (10px après -> 10px avant)
  vehicle.prevPos = new Vector(mid.x + uNorm.x * 10, mid.y + uNorm.y * 10);
  vehicle.pos = new Vector(mid.x - uNorm.x * 10, mid.y - uNorm.y * 10);

  vehicle.check(checkpoints, 3, () => {});

  assert.equal(vehicle.checkpointsCount, 0, 'Le franchissement à contre-sens doit être rejeté');
  assert.equal(vehicle.index, 1, 'L\'index cible ne doit pas avancer en marche arrière');
});

// --------------------------------------------------------------------------
// TEST 20 : Un passage rapide entre deux frames
// --------------------------------------------------------------------------
test('20. Un passage rapide entre deux frames', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  const checkpoints = vm.runInContext('checkpoints', context);
  const cp1 = checkpoints[1];
  const mid = cp1.midpoint();
  const norm = { x: -(cp1.b.y - cp1.a.y), y: cp1.b.x - cp1.a.x };
  const normLen = Math.hypot(norm.x, norm.y);
  const uNorm = { x: norm.x / normLen, y: norm.y / normLen };

  const vehicle = vm.runInContext('new Vehicle()', context);
  vehicle.index = 1;
  const Vector = vm.runInContext('p5.Vector', context);
  // Grand saut de 80px (40px avant -> 40px après) simulant une haute vitesse
  vehicle.prevPos = new Vector(mid.x - uNorm.x * 40, mid.y - uNorm.y * 40);
  vehicle.pos = new Vector(mid.x + uNorm.x * 40, mid.y + uNorm.y * 40);

  vehicle.check(checkpoints, 3, () => {});

  assert.equal(vehicle.checkpointsCount, 1, 'Le passage rapide doit être détecté sans faux négatif');
  assert.equal(vehicle.index, 2);
});

// --------------------------------------------------------------------------
// TEST 21 : Un tour complet valide
// --------------------------------------------------------------------------
test('21. Un tour complet valide', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  const checkpoints = vm.runInContext('checkpoints', context);
  const vehicle = vm.runInContext('new Vehicle()', context);

  // Parcourir tous les 59 checkpoints intermédiaires (1 à 59)
  for (let cp = 1; cp < checkpoints.length; cp++) {
    vehicle.pos = checkpoints[cp].midpoint();
    vehicle.check(checkpoints, 3, () => {});
  }
  assert.equal(vehicle.lapsCompleted, 0);
  assert.equal(vehicle.lapCheckpointsCount, 59);

  // Franchir la ligne d'arrivée (checkpoint 0)
  vehicle.pos = checkpoints[0].midpoint();
  vehicle.check(checkpoints, 3, () => {});

  assert.equal(vehicle.lapsCompleted, 1, 'Un tour complet valide doit incrémenter lapsCompleted à 1');
  assert.equal(vehicle.lapCheckpointsCount, 0, 'Le compteur de tour doit être remis à zéro pour le prochain tour');
  assert.equal(vehicle.index, 1, 'L\'index cible doit être repositionné sur le checkpoint 1');
});

// --------------------------------------------------------------------------
// TEST 22 : Un tour incomplet
// --------------------------------------------------------------------------
test('22. Un tour incomplet', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  const checkpoints = vm.runInContext('checkpoints', context);
  const vehicle = vm.runInContext('new Vehicle()', context);

  // Parcourir seulement la moitié des checkpoints (1 à 30)
  for (let cp = 1; cp <= 30; cp++) {
    vehicle.pos = checkpoints[cp].midpoint();
    vehicle.check(checkpoints, 3, () => {});
  }

  // Tenter de franchir la ligne d'arrivée prématurément
  vehicle.index = 0;
  vehicle.pos = checkpoints[0].midpoint();
  vehicle.check(checkpoints, 3, () => {});

  assert.equal(vehicle.lapsCompleted, 0, 'Un tour incomplet ne doit jamais incrémenter lapsCompleted');
  assert.equal(vehicle.finished, false);
});

// --------------------------------------------------------------------------
// TEST 23 : Le rejet d'un gagnant avec un nombre de tours insuffisant
// --------------------------------------------------------------------------
test('23. Le rejet d\'un gagnant avec un nombre de tours insuffisant', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);
  vm.runInContext('currentStage = STAGES[0]; raceState = "racing";', context); // targetLaps = 3

  const car = vm.runInContext('new Vehicle()', context);
  car.lapsCompleted = 2; // Seulement 2 tours alors que 3 sont requis
  context.car = car;

  vm.runInContext('triggerVictory(car)', context);

  assert.equal(vm.runInContext('raceState', context), 'racing', 'La course doit continuer');
  assert.equal(vm.runInContext('currentWinner', context), null, 'Aucun gagnant ne doit être déclaré');
  assert.equal(car.finished, false);
});

// --------------------------------------------------------------------------
// TEST 24 : L'absence de victoire pour un véhicule mort
// --------------------------------------------------------------------------
test('24. L\'absence de victoire pour un véhicule mort', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);
  vm.runInContext('currentStage = STAGES[0]; raceState = "racing";', context);

  const deadCar = vm.runInContext('new Vehicle()', context);
  deadCar.lapsCompleted = 3;
  deadCar.dead = true;
  context.deadCar = deadCar;

  vm.runInContext('triggerVictory(deadCar)', context);

  assert.equal(vm.runInContext('raceState', context), 'racing');
  assert.equal(vm.runInContext('currentWinner', context), null);
  assert.equal(deadCar.finished, false);
});

// --------------------------------------------------------------------------
// TEST 25 : L'absence de nouvelle génération après la victoire
// --------------------------------------------------------------------------
test('25. L\'absence de nouvelle génération après la victoire', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);
  vm.runInContext('currentStage = STAGES[0]; raceState = "racing"; generationCount = 1;', context);

  const winner = vm.runInContext('new Vehicle()', context);
  winner.lapsCompleted = 3;
  context.winner = winner;
  vm.runInContext('triggerVictory(winner)', context);

  assert.equal(vm.runInContext('raceState', context), 'finished');

  // Appel de handleGenerationEnd lorsque la course est terminée
  vm.runInContext('handleGenerationEnd()', context);

  assert.equal(vm.runInContext('generationCount', context), 1, 'La génération ne doit pas s\'incrémenter après victoire');
});

// --------------------------------------------------------------------------
// TEST 26 : La conservation du record après une tentative échouée
// --------------------------------------------------------------------------
test('26. La conservation du record après une tentative échouée', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);
  vm.runInContext('currentStage = STAGES[0]; raceState = "racing";', context);

  // Établir un record initial officiel
  const stageId = vm.runInContext('currentStage.id', context);
  vm.runInContext(`
    stageRecords['${stageId}'] = {
      timeMs: 42000,
      formattedTime: '00:42.0',
      gen: 1
    };
  `, context);

  // Nouvelle tentative qui échoue (tous les bolides crashent, pas de vainqueur)
  vm.runInContext('stageAttemptElapsed = 65000;', context);
  vm.runInContext('savedVehicles = [new Vehicle()]; population = []; handleGenerationEnd();', context);

  const maintainedRecord = vm.runInContext(`stageRecords['${stageId}']`, context);
  assert.equal(maintainedRecord.timeMs, 42000, 'Le record d\'origine doit rester intact');
  assert.equal(maintainedRecord.formattedTime, '00:42.0');
});

// --------------------------------------------------------------------------
// TEST 27 : La cohérence stricte entre finished, dead et raceState
// --------------------------------------------------------------------------
test('27. La cohérence stricte entre finished, dead et raceState', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);
  vm.runInContext('currentStage = STAGES[0]; raceState = "racing";', context);

  const car = vm.runInContext('new Vehicle()', context);
  car.lapsCompleted = 3;
  context.car = car;

  vm.runInContext('triggerVictory(car)', context);

  assert.equal(car.finished, true, 'Le bolide gagnant doit avoir finished = true');
  assert.equal(car.dead, false, 'Le bolide gagnant ne doit pas être dead');
  assert.equal(vm.runInContext('raceState', context), 'finished', 'raceState doit être "finished"');
  assert.equal(vm.runInContext('currentWinner', context), car, 'currentWinner doit référencer le véhicule vainqueur');

  // Simulation d'une frame physique après victoire : draw() ne doit pas altérer le vainqueur
  assert.doesNotThrow(() => {
    vm.runInContext('draw()', context);
  });
  assert.equal(car.finished, true);
  assert.equal(car.dead, false);
});

// --------------------------------------------------------------------------
// TEST 35 : Les ressources TensorFlow.js sont correctement libérées lors des remplacements de population
// --------------------------------------------------------------------------
test('35. Les ressources TensorFlow.js sont correctement libérées lors des remplacements de population', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('buildTrack()', context);

  let disposeCount = 0;
  class TrackableBrain {
    constructor() {}
    copy() { return new TrackableBrain(); }
    mutate() {}
    predict() { return [0.5, 0.5]; }
    dispose() { disposeCount++; }
  }
  context.NeuralNetwork = TrackableBrain;

  // Création d'une population initiale de 20 voitures vivantes et 5 mortes
  vm.runInContext(`
    TOTAL = 20;
    population = Array.from({ length: 20 }, () => new Vehicle());
    savedVehicles = Array.from({ length: 5 }, () => new Vehicle());
    unlockedStages = ['stage-1', 'stage-2'];
  `, context);

  assert.equal(disposeCount, 0);

  // Remplacement de population via loadStage avec préservation des cerveaux
  vm.runInContext('loadStage(1, true)', context);

  // Les 25 anciennes voitures (20 vivantes + 5 mortes) doivent avoir été disposées
  assert.equal(disposeCount, 25, 'Toutes les anciennes voitures et leurs cerveaux doivent être libérés');

  // Nouveau remplacement via loadStage sans préservation
  const prevCount = disposeCount;
  vm.runInContext('loadStage(0, false)', context);
  assert.equal(disposeCount, prevCount + 20, 'Les 20 voitures du stage précédent doivent être libérées');
});

// --------------------------------------------------------------------------
// TEST 36 : Cadrage automatique géométrique et réinitialisation de la caméra (Vue complète)
// --------------------------------------------------------------------------
test('36. Le calcul de cadrage et le zoom de vue complète adaptent le zoom et centrent le circuit', () => {
  const { context } = createChampionshipContext();
  vm.runInContext('setupUIEventListeners(); buildTrack();', context);

  // Vérification de la présence des fonctions d'auto-fit
  assert.equal(typeof context.getTrackBounds, 'function');
  assert.equal(typeof context.getOptimalTrackFitZoom, 'function');

  const bounds = context.getTrackBounds();
  assert.ok(bounds.w > 300, 'La largeur du circuit doit être positive et représentative');
  assert.ok(bounds.h > 200, 'La hauteur du circuit doit être positive et représentative');
  assert.ok(bounds.centerX > 0, 'Le centre X doit être calculé');
  assert.ok(bounds.centerY > 0, 'Le centre Y doit être calculé');

  const optimalZoom = context.getOptimalTrackFitZoom();
  assert.ok(optimalZoom >= 0.45 && optimalZoom <= 1.4, `Le zoom optimal doit être compris entre 0.45 et 1.4 (obtenu: ${optimalZoom})`);

  // Au démarrage, camZoom et targetCamZoom doivent avoir été initialisés au zoom optimal
  const currentCamZoom = vm.runInContext('camZoom', context);
  const currentTargetCamZoom = vm.runInContext('targetCamZoom', context);
  const currentCameraMode = vm.runInContext('cameraMode', context);
  assert.equal(currentCamZoom, optimalZoom, 'camZoom initial doit correspondre à getOptimalTrackFitZoom()');
  assert.equal(currentTargetCamZoom, optimalZoom, 'targetCamZoom initial doit correspondre à getOptimalTrackFitZoom()');
  assert.equal(currentCameraMode, 'free', 'Le mode caméra initial doit être free');

  // Clic sur "Vue complète" (#btn-cam-free) doit réinitialiser la caméra au centre du circuit avec le zoom optimal
  vm.runInContext(`
    cameraMode = 'follow';
    targetCamZoom = 2.0;
  `, context);
  const btnCamFree = context.document.getElementById('btn-cam-free');
  assert.ok(btnCamFree, 'Le bouton Vue complète doit exister');
  btnCamFree.click();

  assert.equal(vm.runInContext('cameraMode', context), 'free', 'Vue complète doit rétablir cameraMode à free');
  assert.equal(vm.runInContext('targetCamZoom', context), optimalZoom, 'Vue complète doit réinitialiser targetCamZoom au zoom optimal');
  assert.equal(vm.runInContext('targetCamX', context), bounds.centerX, 'Vue complète doit centrer la caméra sur bounds.centerX');
  assert.equal(vm.runInContext('targetCamY', context), bounds.centerY, 'Vue complète doit centrer la caméra sur bounds.centerY');
});


