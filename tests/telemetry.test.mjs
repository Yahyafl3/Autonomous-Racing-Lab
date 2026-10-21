import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const sketchPath = fileURLToPath(new URL('../sketch.js', import.meta.url));
const sketchSource = await readFile(sketchPath, 'utf8');
const htmlSource = await readFile(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');

function createSimulationContext() {
  const elements = new Map();
  const makeElement = () => {
    const listeners = new Map();
    const classes = new Set();
    return {
      textContent: '', value: '', tagName: 'BUTTON',
      listeners,
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); }
      },
      addEventListener(type, handler) { listeners.set(type, handler); },
      click() { listeners.get('click')?.({ target: this, preventDefault() {} }); },
      input(value) { this.value = value; listeners.get('input')?.({ target: this }); },
      getContext() { return fakeCanvasContext(); }
    };
  };
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    }
  };
  const context = vm.createContext({ document, window: { addEventListener() {} } });
  vm.runInContext(sketchSource, context, { filename: 'sketch.js' });
  return { context, elements };
}

function fakeCanvasContext() {
  return new Proxy({}, { get: (target, key) => target[key] ?? (() => {}) , set: (target, key, value) => { target[key] = value; return true; } });
}

test('le meilleur de génération inclut les voitures déjà éliminées', () => {
  const { context } = createSimulationContext();
  const score = vm.runInContext(`updateBestScores([
    { checkpointsCount: 2 }, { checkpointsCount: 7 }, { checkpointsCount: 4 }
  ])`, context);
  assert.equal(score, 7);
  assert.equal(vm.runInContext('allTimeBestFitness', context), 7);
});

test('le record historique ne baisse pas si la génération suivante score moins', () => {
  const { context } = createSimulationContext();
  vm.runInContext('allTimeBestFitness = 9', context);
  const score = vm.runInContext('updateBestScores([{ checkpointsCount: 3 }])', context);
  assert.equal(score, 3);
  assert.equal(vm.runInContext('allTimeBestFitness', context), 9);
});

test('le score nul conserve le record tant qu’il n’y a pas de réinitialisation', () => {
  const { context } = createSimulationContext();
  vm.runInContext('allTimeBestFitness = 6', context);
  assert.equal(vm.runInContext('updateBestScores([])', context), 0);
  assert.equal(vm.runInContext('allTimeBestFitness', context), 6);
});

test('le compteur vivant utilise la taille réelle de la génération en cours', () => {
  const { context, elements } = createSimulationContext();
  vm.runInContext('TOTAL = 150; generationPopulationSize = 100; population = new Array(42)', context);
  vm.runInContext('updateTelemetryUI(5)', context);
  assert.equal(elements.get('stat-alive').textContent, '42 / 100');
  assert.equal(elements.get('stat-alive-subtext').textContent, '42% en piste');
});

test('le changement manuel redémarre tous les véhicules avec les réseaux existants', () => {
  const { context } = createSimulationContext();
  context.Vehicle = class {
    constructor(brain) {
      this.brain = brain ? brain.copy() : { id: 'fresh' };
      this.checkpointsCount = 0;
      this.disposed = false;
    }
    dispose() { this.disposed = true; }
  };
  context.buildTrack = () => { context.start = { x: 20, y: 30 }; };
  context.updateTelemetryUI = () => {};
  context.updateTrackBadge = () => {};
  vm.runInContext(`
    TOTAL = 3;
    allTimeBestFitness = 8;
    population = [{ checkpointsCount: 6, brain: { copy() { return { id: 'alpha' }; } }, dispose() { this.disposed = true; } }];
    savedVehicles = [{ checkpointsCount: 4, brain: { copy() { return { id: 'beta' }; } }, dispose() { this.disposed = true; } }];
    restartOnNewTrack();
  `, context);
  const result = vm.runInContext(`({
    ids: population.map(car => car.brain.id),
    scores: population.map(car => car.checkpointsCount),
    size: generationPopulationSize,
    saved: savedVehicles.length,
    best: currentBestFitness,
    record: allTimeBestFitness,
    track: currentTrackIndex
  })`, context);
  assert.deepEqual(Array.from(result.ids), ['alpha', 'beta', 'alpha']);
  assert.deepEqual(Array.from(result.scores), [0, 0, 0]);
  assert.equal(result.size, 3);
  assert.equal(result.saved, 0);
  assert.equal(result.best, 0);
  assert.equal(result.record, 8);
  assert.equal(result.track, 2);
});

test('pause, modes de piste, curseurs et capteurs pilotent le vrai état UI', () => {
  const { context, elements } = createSimulationContext();
  vm.runInContext('setupUIEventListeners()', context);

  elements.get('btn-pause').click();
  assert.equal(vm.runInContext('isPaused', context), true);
  assert.equal(elements.get('status-text').textContent, 'PAUSED');
  assert.equal(elements.get('pause-icon').textContent, '▶');
  elements.get('btn-pause').click();
  assert.equal(vm.runInContext('isPaused', context), false);
  assert.equal(elements.get('status-text').textContent, 'RUNNING');

  elements.get('btn-mode-challenge').click();
  assert.equal(vm.runInContext('trackMode', context), 'randomChallenge');
  assert.equal(elements.get('btn-mode-challenge').classList.contains('active'), true);
  elements.get('btn-mode-training').click();
  assert.equal(vm.runInContext('trackMode', context), 'training');

  elements.get('slider-speed').input('4');
  elements.get('slider-mutation').input('12');
  elements.get('slider-sight').input('140');
  elements.get('slider-population').input('160');
  assert.equal(vm.runInContext('[simulationSpeed, MUTATION_RATE, SIGHT, TOTAL].join(",")', context), '4,0.12,140,160');
  assert.equal(elements.get('val-speed').textContent, '4×');
  assert.equal(elements.get('val-mutation').textContent, '12%');
  assert.equal(elements.get('val-sight').textContent, '140 px');
  assert.equal(elements.get('val-population').textContent, '160');

  elements.get('btn-sensors-all').click();
  assert.equal(vm.runInContext('sensorDisplayMode', context), 'all');
  assert.equal(elements.get('btn-sensors-all').classList.contains('active'), true);
});

test('construction du circuit garde 60 checkpoints et 120 murs alignés', () => {
  const { context } = createSimulationContext();
  context.width = 1400;
  context.height = 800;
  context.TWO_PI = Math.PI * 2;
  context.random = (min, max) => {
    if (max === undefined) return min / 2;
    return min + (max - min) * .37;
  };
  context.map = (value, low, high, outLow, outHigh) => outLow + ((value - low) / (high - low)) * (outHigh - outLow);
  context.cos = Math.cos;
  context.sin = Math.sin;
  context.noise = () => .5;
  context.createVector = (x, y) => ({ x, y });
  context.Boundary = class {
    constructor(x1, y1, x2, y2) { this.a = { x: x1, y: y1 }; this.b = { x: x2, y: y2 }; }
    midpoint() { return { x: (this.a.x + this.b.x) / 2, y: (this.a.y + this.b.y) / 2 }; }
  };
  context.constrain = (value, min, max) => Math.min(Math.max(value, min), max);
  context.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  context.updateTrackBadge = () => {};
  vm.runInContext('buildTrack()', context);
  const result = vm.runInContext(`({
    checkpoints: checkpoints.length,
    walls: walls.length,
    scenery: trackScenery.length,
    sceneryOffRoad: trackScenery.every((feature) => {
      const road = inside.map((point) => ({ x: point.x, y: point.y }))
        .concat(outside.slice().reverse().map((point) => ({ x: point.x, y: point.y })));
      return !isPointInsidePolygon(feature.x, feature.y, road)
        && walls.every((wall) => distanceToSegment(feature.x, feature.y, wall) >= 17);
    }),
    firstWallStartMatches: walls[0].a.x === inside[0].x && walls[0].a.y === inside[0].y,
    outerWallStartMatches: walls[1].a.x === outside[0].x && walls[1].a.y === outside[0].y,
    startIsFirstCheckpoint: start.x === checkpoints[0].midpoint().x && start.y === checkpoints[0].midpoint().y
  })`, context);
  assert.equal(result.checkpoints, 60);
  assert.equal(result.walls, 120);
  assert.ok(result.scenery > 0);
  assert.equal(result.sceneryOffRoad, true);
  assert.equal(result.firstWallStartMatches, true);
  assert.equal(result.outerWallStartMatches, true);
  assert.equal(result.startIsFirstCheckpoint, true);
});

test('les éléments du dashboard existent pour chaque statistique et commande connectée', () => {
  const referencedIds = [...sketchSource.matchAll(/getElementById\('([^']+)'\)/g)].map((match) => match[1]);
  const htmlIds = new Set([...htmlSource.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  assert.deepEqual(referencedIds.filter((id) => !htmlIds.has(id)), []);
});
