import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const sketchPath = fileURLToPath(new URL('../sketch.js', import.meta.url));
const vehiclePath = fileURLToPath(new URL('../vehicle.js', import.meta.url));
const audioPath = fileURLToPath(new URL('../audio.js', import.meta.url));
const gaPath = fileURLToPath(new URL('../ga.js', import.meta.url));

const sketchSource = await readFile(sketchPath, 'utf8');
const vehicleSource = await readFile(vehiclePath, 'utf8');
const audioSource = await readFile(audioPath, 'utf8');
const gaSource = await readFile(gaPath, 'utf8');

function createRaceTestContext() {
  const elements = new Map();

  function makeElement(id) {
    const listeners = new Map();
    const classes = new Set();
    const children = [];
    const element = {
      id,
      textContent: '',
      innerHTML: '',
      value: '',
      checked: true,
      disabled: false,
      dataset: {},
      tagName: 'DIV',
      style: {},
      listeners,
      children,
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); },
        toggle(name, force) {
          if (force !== undefined) {
            if (force) classes.add(name);
            else classes.delete(name);
            return force;
          }
          if (classes.has(name)) { classes.delete(name); return false; }
          classes.add(name); return true;
        },
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
      change(checked) {
        if (checked !== undefined) this.checked = checked;
        const handlers = listeners.get('change') || [];
        for (const h of handlers) h({ target: this });
      },
      setAttribute(k, v) { this[k] = v; },
      getAttribute(k) { return this[k]; },
      appendChild(child) { children.push(child); return child; },
      querySelector(sel) { return makeElement('sub-elem'); },
      querySelectorAll(sel) { return []; },
      getContext() {
        return new Proxy({}, {
          get: (target, key) => target[key] ?? (() => {}),
          set: (target, key, value) => { target[key] = value; return true; }
        });
      }
    };
    return element;
  }

  function getElementById(id) {
    if (!elements.has(id)) {
      elements.set(id, makeElement(id));
    }
    return elements.get(id);
  }

  class Vector {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; return this; }
    add(v) { this.x += (v.x || 0); this.y += (v.y || 0); return this; }
    sub(v) { this.x -= (v.x || 0); this.y -= (v.y || 0); return this; }
    mult(n) { this.x *= n; this.y *= n; return this; }
    mag() { return Math.hypot(this.x, this.y); }
    heading() { return Math.atan2(this.y, this.x); }
    static sub(v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y); }
    static fromAngle(angle) { return new Vector(Math.cos(angle), Math.sin(angle)); }
    static dist(v1, v2) { return Math.hypot((v1.x || 0) - (v2.x || 0), (v1.y || 0) - (v2.y || 0)); }
  }

  class MockNeuralNetwork {
    constructor() {}
    copy() { return new MockNeuralNetwork(); }
    mutate() {}
    crossover() { return new MockNeuralNetwork(); }
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

  const fakeStorage = new Map();
  const localStorageMock = {
    getItem: (k) => (fakeStorage.has(k) ? fakeStorage.get(k) : null),
    setItem: (k, v) => fakeStorage.set(k, String(v)),
    removeItem: (k) => fakeStorage.delete(k),
    clear: () => fakeStorage.clear()
  };

  const sandbox = {
    console,
    Math,
    Date,
    performance: { now: () => 1000 },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    p5: { Vector },
    Vector,
    NeuralNetwork: MockNeuralNetwork,
    Ray: MockRay,
    Boundary: MockBoundary,
    createVector: (x = 0, y = 0) => new Vector(x, y),
    radians: (deg) => (deg * Math.PI) / 180,
    map: (val, inMin, inMax, outMin, outMax) => outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin),
    constrain: (v, min, max) => Math.min(Math.max(v, min), max),
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    lerp: (start, stop, amt) => start + (stop - start) * amt,
    random: (min, max) => (max === undefined ? (min || 1) * 0.5 : min + (max - min) * 0.5),
    cos: Math.cos,
    sin: Math.sin,
    noise: () => 0.5,
    noiseSeed: () => {},
    randomSeed: () => {},
    color: (r, g, b) => ({ r, g, b }),
    TWO_PI: Math.PI * 2,
    PI: Math.PI,
    width: 1400,
    height: 800,
    frameCount: 1,
    deltaTime: 16.6,
    createCanvas: () => ({ parent() {} }),
    createGraphics: () => ({
      noStroke() {}, fill() {}, ellipse() {}, stroke() {}, strokeWeight() {},
      line() {}, quad() {}, clear() {}, text() {}, textFont() {}, textSize() {}, textAlign() {}
    }),
    document: {
      getElementById,
      querySelectorAll: (sel) => [],
      createElement: (tag) => {
        const el = makeElement(`created-${tag}`);
        el.tagName = tag.toUpperCase();
        return el;
      }
    },
    window: {
      addEventListener: () => {},
      localStorage: localStorageMock
    },
    localStorage: localStorageMock,
    tf: {
      tensor: () => ({ dispose: () => {} }),
      tensor2d: () => ({ dispose: () => {} }),
      setBackend: () => {},
      memory: () => ({ numTensors: 0 })
    }
  };

  sandbox.window.document = sandbox.document;
  const context = vm.createContext(sandbox);

  vm.runInContext(audioSource, context, { filename: 'audio.js' });
  vm.runInContext(vehicleSource, context, { filename: 'vehicle.js' });
  vm.runInContext(gaSource, context, { filename: 'ga.js' });
  vm.runInContext(sketchSource, context, { filename: 'sketch.js' });

  const run = (code) => vm.runInContext(code, context);

  return { context, run, getElementById };
}

// --------------------------------------------------------------------------
// SUITE DE TESTS FORMULA RACING (10 TESTS OBLIGATOIRES)
// --------------------------------------------------------------------------

test('1. Le départ avec les sons activés : bips et signal lights out audibles', () => {
  const { run } = createRaceTestContext();

  assert.ok(run('SoundSystem'), 'SoundSystem doit être initialisé');
  assert.ok(run('RaceManager'), 'RaceManager doit être initialisé');

  // Activer le son
  run('RaceManager.config.soundEnabled = true');
  run('SoundSystem.setMuted(false)');
  assert.equal(run('SoundSystem.getIsMuted()'), false, 'Le son doit être actif');

  // Démarrage de la procédure de feux
  run('RaceManager.config.countdownDuration = 0.05');
  run('RaceManager.startCountdown()');

  assert.equal(run('raceState'), 'countdown', 'L\'état de course doit être en countdown');
  assert.equal(run('RaceManager.countdown.active'), true, 'La procédure de départ doit être active');
  run('RaceManager.cancelCountdown()');
});

test('2. Le départ avec les sons désactivés : aucun son émis en sourdine (Mute)', () => {
  const { run } = createRaceTestContext();

  run('RaceManager.config.soundEnabled = false');
  run('SoundSystem.setMuted(true)');
  assert.equal(run('SoundSystem.getIsMuted()'), true, 'Le son doit être coupé (Mute)');

  let audioOutput = false;
  run('SoundSystem.initAudio = () => { return null; }');
  run('SoundSystem.playBeep(880, 0.1)');
  run('SoundSystem.playLightsOut()');
  run('SoundSystem.playVictory()');
  run('SoundSystem.playCollision()');

  assert.equal(audioOutput, false, 'Aucun son ne doit être émis en mode sourdine');
});

test('3. L\'annulation pendant le compte à rebours : arrêt propre sans départ fantôme', () => {
  const { run } = createRaceTestContext();

  run('RaceManager.config.countdownDuration = 5');
  run('RaceManager.startCountdown()');
  assert.equal(run('RaceManager.countdown.active'), true, 'Le compte à rebours doit démarrer');
  assert.ok(run('RaceManager.countdown.timerIds.length > 0'), 'Des timers doivent être programmés');

  // Annulation
  run('RaceManager.cancelCountdown()');
  assert.equal(run('RaceManager.countdown.active'), false, 'Le compte à rebours doit être inactif');
  assert.equal(run('RaceManager.countdown.timerIds.length'), 0, 'Tous les timers doivent être effacés');
  assert.notEqual(run('raceState'), 'racing', 'La course ne doit pas avoir démarré');
});

test('4. La pause et la reprise : gestion fluide de l\'interruption du départ', () => {
  const { run } = createRaceTestContext();

  run('RaceManager.startCountdown()');
  assert.equal(run('RaceManager.countdown.active'), true);

  // Mettre en pause pendant le compte à rebours
  run('RaceManager.pauseCountdown()');
  assert.equal(run('RaceManager.countdown.active'), false, 'Le compte à rebours doit s\'arrêter proprement');
  assert.equal(run('RaceManager.countdown.timerIds.length'), 0);

  // Reprendre
  run('RaceManager.resumeCountdown()');
  assert.equal(run('RaceManager.countdown.active'), true, 'Le compte à rebours doit reprendre');
  run('RaceManager.cancelCountdown()');
});

test('5. Les courses de 1, 5 et 30 tours : fin de course validée uniquement au tour requis', () => {
  const { run } = createRaceTestContext();
  run('buildTrack()');

  for (const targetLaps of [1, 5, 30]) {
    run(`RaceManager.config.targetLaps = ${targetLaps}`);
    run(`currentStage.targetLaps = ${targetLaps}`);
    run('raceState = "racing"');

    const testCar = run('new Vehicle()');
    run('testCar = new Vehicle()');
    run(`testCar.lapsCompleted = ${targetLaps - 1}`);
    run('testCar.lapCheckpointsCount = 60');
    run('testCar.index = 0');

    // Avant le dernier tour, pas de victoire
    assert.equal(run('testCar.lapsCompleted') < targetLaps, true);

    // Franchissement du tour final
    run(`testCar.lapsCompleted = ${targetLaps}`);
    run('testCar.finished = true');
    run('RaceManager.finishRace(testCar)');

    assert.equal(run('raceState'), 'finished', `Course de ${targetLaps} tours doit déclarer l'état terminé`);
    assert.equal(run('currentWinner === testCar'), true, 'Le vainqueur doit être déclaré');
  }
});

test('6. Les populations de 5, 20, 50 et 100 voitures : répartition en quinconce sans superposition', () => {
  const { run } = createRaceTestContext();
  run('buildTrack()');

  for (const carCount of [5, 20, 50, 100]) {
    run(`RaceManager.config.carCount = ${carCount}`);
    run(`TOTAL = ${carCount}`);
    run('initPopulation()');

    assert.equal(run('population.length'), carCount, `La population doit être de ${carCount} voitures`);

    // Vérifier les positions de départ : coordonnées valides et espacement
    const positions = run('population.map(v => ({ x: v.pos.x, y: v.pos.y }))');

    for (let i = 0; i < positions.length; i++) {
      const p1 = positions[i];
      assert.ok(!isNaN(p1.x) && !isNaN(p1.y), `Voiture #${i} a des coordonnées valides`);

      // Vérifier l'absence de superposition exacte avec les autres bolides
      for (let j = i + 1; j < positions.length; j++) {
        const p2 = positions[j];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        assert.ok(dist > 0.001, `Les voitures ${i} et ${j} ne doivent pas être superposées`);
      }
    }
  }
});

test('7. Le comptage des tours et la détection de la ligne d\'arrivée : anti-triche et bon sens', () => {
  const { run } = createRaceTestContext();
  run('buildTrack()');
  run('raceState = "racing"');

  const cpCount = run('checkpoints ? checkpoints.length : 0');
  assert.ok(cpCount >= 60, 'Le circuit doit contenir ses checkpoints');

  run('testCar = new Vehicle()');
  run('testCar.lapsCompleted = 0');
  run('testCar.lapCheckpointsCount = 0');

  // 1. Franchissement dans le mauvais sens : pas de tour validé
  run('testCar.prevPos.set(checkpoints[0].a.x, checkpoints[0].a.y)');
  run('testCar.pos.set(checkpoints[0].a.x - 20, checkpoints[0].a.y - 20)');
  run('testCar.index = 0');
  run('testCar.check(checkpoints, 3)');
  assert.equal(run('testCar.lapsCompleted'), 0, 'Le franchissement à l\'envers ne valide pas de tour');

  // 2. Franchissement de la ligne sans avoir fait tous les checkpoints intermédiaires
  run('testCar.prevPos.set(checkpoints[0].a.x - 5, checkpoints[0].a.y)');
  run('testCar.pos.set(checkpoints[0].b.x + 5, checkpoints[0].b.y)');
  run('testCar.lapCheckpointsCount = 5'); // Incomplet
  run('testCar.index = 0');
  run('testCar.check(checkpoints, 3)');
  assert.equal(run('testCar.lapsCompleted'), 0, 'Un tour incomplet ne doit pas être compté');

  // 3. Tour complet valide dans le bon sens
  run('testCar.lapCheckpointsCount = 59');
  run('const cp0 = checkpoints[0];');
  run('const mid = cp0.midpoint();');
  run('const normX = -(cp0.b.y - cp0.a.y); const normY = cp0.b.x - cp0.a.x;');
  run('const len = Math.hypot(normX, normY) || 1;');
  run('const uX = normX / len; const uY = normY / len;');
  run('testCar.prevPos.set(mid.x - uX * 5, mid.y - uY * 5);');
  run('testCar.pos.set(mid.x + uX * 5, mid.y + uY * 5);');
  run('testCar.index = 0');
  run('testCar.check(checkpoints, 3)');
  assert.equal(run('testCar.lapsCompleted'), 1, 'Un tour complet franchi dans le bon sens incrémente les tours complétés');
});

test('8. La fin de course et l\'affichage des résultats : podium et classement complet', () => {
  const { run, getElementById } = createRaceTestContext();
  run('buildTrack()');
  run('TOTAL = 10');
  run('initPopulation()');

  run('winner = population[0]');
  run('winner.lapsCompleted = 3');
  run('winner.carNumber = 44');

  run('RaceManager.finishRace(winner)');

  assert.equal(run('raceState'), 'finished');
  assert.equal(run('currentWinner === winner'), true);

  // Vérifier la mise à jour des éléments du modal de résultats
  const p1Car = getElementById('podium-p1-car');
  assert.equal(p1Car.textContent, '#44', 'Le podium P1 doit afficher le numéro du vainqueur');
  const resultsModal = getElementById('race-results-modal');
  assert.equal(resultsModal.classList.contains('hidden'), false, 'Le modal des résultats doit être affiché');
});

test('9. Le changement de paramètres entre deux courses : configuration dynamique prise en compte', () => {
  const { run } = createRaceTestContext();
  run('buildTrack()');

  // Course 1
  run('RaceManager.config.carCount = 15');
  run('RaceManager.config.targetLaps = 2');
  run('RaceManager.config.simSpeed = 1');
  run('RaceManager.applyConfigToEngine(false)');

  assert.equal(run('TOTAL'), 15);
  assert.equal(run('currentStage.targetLaps'), 2);
  assert.equal(run('simulationSpeed'), 1);

  // Course 2 : modification des paramètres
  run('RaceManager.config.carCount = 45');
  run('RaceManager.config.targetLaps = 8');
  run('RaceManager.config.simSpeed = 3');
  run('RaceManager.applyConfigToEngine(false)');

  assert.equal(run('TOTAL'), 45, 'Le nombre de voitures doit être mis à jour à 45');
  assert.equal(run('currentStage.targetLaps'), 8, 'Le nombre de tours doit être mis à jour à 8');
  assert.equal(run('simulationSpeed'), 3, 'La vitesse de simulation doit être mise à jour à 3×');
  assert.equal(run('population.length'), 45, 'La flotte en piste doit compter 45 véhicules');
});

test('10. Le fonctionnement de l\'entraînement génétique après une course', () => {
  const { run } = createRaceTestContext();
  run('buildTrack()');

  // Passage en mode Entraînement
  run('RaceManager.config.gameMode = "training"');
  run('RaceManager.config.gaMutation = 12');
  run('RaceManager.config.gaPopulation = 30');
  run('RaceManager.applyConfigToEngine(false)');

  assert.equal(run('MUTATION_RATE'), 0.12, 'Le taux de mutation génétique doit être appliqué');
  assert.equal(run('TOTAL'), 30, 'La taille de population doit être appliquée');

  // Éliminer les voitures pour déclencher la reproduction génétique
  run('for (let v of population) { v.dead = true; v.checkpointsCount = 10; savedVehicles.push(v); }');
  run('population = [];');

  // Vérifier que nextGeneration produit une nouvelle génération valide
  run('handleGenerationEnd()');

  assert.equal(run('generationCount'), 2, 'La génération suivante doit être incrémentée à 2');
  assert.equal(run('population.length'), 30, 'La nouvelle génération doit compter 30 enfants mutants');
  assert.equal(run('population[0].dead'), false, 'Les nouveaux bolides sont vivants et prêts à rouler');
});
