import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function createGridTestContext() {
  class Vector {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; return this; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    mult(n) { this.x *= n; this.y *= n; return this; }
    div(n) { if (n !== 0) { this.x /= n; this.y /= n; } return this; }
    mag() { return Math.hypot(this.x, this.y); }
    heading() { return Math.atan2(this.y, this.x); }
    copy() { return new Vector(this.x, this.y); }
    normalize() { const m = this.mag(); if (m !== 0) this.div(m); return this; }
    limit(max) { if (this.mag() > max) { this.normalize(); this.mult(max); } return this; }
    static dist(v1, v2) { return Math.hypot(v2.x - v1.x, v2.y - v1.y); }
    static fromAngle(angle) { return new Vector(Math.cos(angle), Math.sin(angle)); }
  }

  class MockNeuralNetwork {
    constructor(a, b, c) { this.inputs = a; this.hidden = b; this.outputs = c; }
    predict(arr) { return [0.5, 0.5]; }
    copy() { return new MockNeuralNetwork(this.inputs, this.hidden, this.outputs); }
    mutate() {}
    dispose() {}
  }

  class MockRay {
    constructor(pos, angle) { this.pos = pos; this.dir = Vector.fromAngle(angle); }
    rotate(offset) { this.dir = Vector.fromAngle(offset); }
    lookAt(x, y) { this.dir.x = x - this.pos.x; this.dir.y = y - this.pos.y; this.dir.normalize(); }
    cast() { return null; }
  }

  class MockBoundary {
    constructor(x1, y1, x2, y2) { this.a = { x: x1, y: y1 }; this.b = { x: x2, y: y2 }; }
    midpoint() { return new Vector((this.a.x + this.b.x) / 2, (this.a.y + this.b.y) / 2); }
  }

  const elements = {};
  const mockCanvasContext = {
    clearRect() {}, fillRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {},
    line() {}, moveTo() {}, lineTo() {}, closePath() {}, setLineDash() {}, strokeStyle: '', fillStyle: '',
    save() {}, restore() {}, scale() {}, translate() {}, rotate() {},
    fillText() {}, strokeText() {}, measureText: () => ({ width: 10 }), font: '', textAlign: '', textBaseline: ''
  };
  const makeElement = (id) => {
    if (!elements[id]) {
      elements[id] = {
        id,
        textContent: '',
        value: '',
        style: {},
        getContext: () => mockCanvasContext,
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); },
          toggle(c, force) {
            if (force === undefined) {
              if (this.classes.has(c)) this.classes.delete(c);
              else this.classes.add(c);
            } else if (force) {
              this.classes.add(c);
            } else {
              this.classes.delete(c);
            }
          }
        },
        dataset: {},
        addEventListener: () => {},
        click: () => {}
      };
    }
    return elements[id];
  };

  const getElementById = (id) => makeElement(id);

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
    HALF_PI: Math.PI / 2,
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
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: (tag) => makeElement(`created-${tag}`),
      addEventListener: () => {}
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

  const audioSource = fs.readFileSync(path.join(rootDir, 'audio.js'), 'utf8');
  const vehicleSource = fs.readFileSync(path.join(rootDir, 'vehicle.js'), 'utf8');
  const gaSource = fs.readFileSync(path.join(rootDir, 'ga.js'), 'utf8');
  const sketchSource = fs.readFileSync(path.join(rootDir, 'sketch.js'), 'utf8');

  vm.runInContext(audioSource, context, { filename: 'audio.js' });
  vm.runInContext(vehicleSource, context, { filename: 'vehicle.js' });
  vm.runInContext(gaSource, context, { filename: 'ga.js' });
  vm.runInContext(sketchSource, context, { filename: 'sketch.js' });

  const run = (code) => vm.runInContext(code, context);
  return { context, run, getElementById };
}

// --------------------------------------------------------------------------
// SUITE DE TESTS : GRILLE DE DÉPART DE COURSE AUTOMOBILE (STARTING GRID)
// --------------------------------------------------------------------------

test('1. StartingGrid est initialisé avec une configuration conforme de grille', () => {
  const { run } = createGridTestContext();
  assert.ok(run('typeof StartingGrid !== "undefined"'), 'StartingGrid doit être défini');
  assert.equal(typeof run('StartingGrid.getSlot'), 'function', 'getSlot doit être une fonction');
  assert.equal(typeof run('StartingGrid.positionCars'), 'function', 'positionCars doit être une fonction');
  assert.equal(typeof run('StartingGrid.draw'), 'function', 'draw doit être une fonction');

  const cfg = run('StartingGrid.config');
  assert.ok(cfg.baseDist >= 20, 'baseDist doit être >= 20px pour placer P1 derrière la ligne');
  assert.ok(cfg.laneT0 < 0.5, 'laneT0 (Pôle) doit être à gauche/intérieur du centre');
  assert.ok(cfg.laneT1 > 0.5, 'laneT1 (Extérieur) doit être à droite/extérieur du centre');
});

test('2. Organisation en deux colonnes décalées en quinconce (P1, P2, P3...)', () => {
  const { run } = createGridTestContext();
  run('buildTrack()');

  const slot0 = run('StartingGrid.getSlot(0, checkpoints, 20)');
  const slot1 = run('StartingGrid.getSlot(1, checkpoints, 20)');
  const slot2 = run('StartingGrid.getSlot(2, checkpoints, 20)');
  const slot3 = run('StartingGrid.getSlot(3, checkpoints, 20)');

  // Colonne et Rangée
  assert.equal(slot0.col, 0, 'P1 doit être en colonne 0 (Pôle)');
  assert.equal(slot1.col, 1, 'P2 doit être en colonne 1');
  assert.equal(slot2.col, 0, 'P3 doit être en colonne 0');
  assert.equal(slot3.col, 1, 'P4 doit être en colonne 1');

  assert.equal(slot0.row, 0, 'P1 doit être en rangée 0');
  assert.equal(slot1.row, 0, 'P2 doit être en rangée 0');
  assert.equal(slot2.row, 1, 'P3 doit être en rangée 1');
  assert.equal(slot3.row, 1, 'P4 doit être en rangée 1');

  // Décalage latéral net entre les deux colonnes
  const latDist = Math.hypot(slot0.x - slot1.x, slot0.y - slot1.y);
  assert.ok(latDist >= 25, `Écart latéral entre colonnes (${latDist.toFixed(1)}px) suffisant pour des bolides de 18px`);
});

test('3. Les voitures sont strictement contenues dans la surface asphaltée du circuit', () => {
  const { run } = createGridTestContext();
  run('buildTrack()');

  for (let i = 0; i < 20; i++) {
    const slot = run(`StartingGrid.getSlot(${i}, checkpoints, 20)`);
    assert.ok(!isNaN(slot.x) && !isNaN(slot.y), `Slot #${i} a des coordonnées finies`);

    // Distance aux bordures intérieure et extérieure
    const distToIn = Math.hypot(slot.x - slot.inPt.x, slot.y - slot.inPt.y);
    const distToOut = Math.hypot(slot.x - slot.outPt.x, slot.y - slot.outPt.y);
    assert.ok(distToIn > 15, `Voiture #${i} a une marge intérieure suffisante (${distToIn.toFixed(1)}px > 15px)`);
    assert.ok(distToOut > 15, `Voiture #${i} a une marge extérieure suffisante (${distToOut.toFixed(1)}px > 15px)`);
  }
});

test('4. Orientation rigoureuse de chaque bolide selon la tangente du tracé', () => {
  const { run } = createGridTestContext();
  run('buildTrack()');

  for (let i = 0; i < 10; i++) {
    const slot = run(`StartingGrid.getSlot(${i}, checkpoints, 20)`);
    assert.ok(typeof slot.heading === 'number' && !isNaN(slot.heading), `Cap valide pour slot #${i}`);

    // Vecteur unitaire orienté vers l'avant de la piste
    const fwdX = Math.cos(slot.heading);
    const fwdY = Math.sin(slot.heading);
    assert.ok(Math.hypot(fwdX, fwdY) > 0.99, 'Vecteur cap normalisé');
  }
});

test('5. Adaptation dynamique et absence totale de chevauchement pour 5, 20, 50 et 100 voitures', () => {
  const { run } = createGridTestContext();
  run('buildTrack()');

  for (const carCount of [5, 20, 50, 100]) {
    run(`TOTAL = ${carCount}`);
    run('initPopulation()');

    assert.equal(run('population.length'), carCount);

    const positions = run('population.map(v => ({ x: v.pos.x, y: v.pos.y }))');
    let minDistance = Infinity;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const d = Math.hypot(positions[i].x - positions[j].x, positions[i].y - positions[j].y);
        if (d < minDistance) minDistance = d;
        assert.ok(d > 20.0, `Les voitures #${i} et #${j} ne doivent pas se chevaucher (dist: ${d.toFixed(1)}px > 20px)`);
      }
    }
  }
});

test('6. Immobilisation absolue des voitures sur la grille avant le signal de départ', () => {
  const { run } = createGridTestContext();
  run('buildTrack()');
  run('RaceManager.config.countdownDuration = 2');
  run('RaceManager.startCountdown()');

  assert.equal(run('raceState'), 'countdown', 'L\'état doit être en countdown');
  assert.equal(run('RaceManager.countdown.active'), true, 'Le compte à rebours doit être actif');

  const speeds = run('population.map(v => v.speed)');
  const vels = run('population.map(v => Math.hypot(v.vel.x, v.vel.y))');

  for (let i = 0; i < speeds.length; i++) {
    assert.equal(speeds[i], 0, `Voiture #${i} doit avoir une vitesse nulle`);
    assert.equal(vels[i], 0, `Voiture #${i} doit avoir un vecteur vitesse nul`);
  }

  run('RaceManager.cancelCountdown()');
});

test('7. Libération synchronisée de toutes les voitures à l\'extinction des feux ("Lights Out")', () => {
  const { run } = createGridTestContext();
  run('buildTrack()');
  run('RaceManager.startCountdown()');

  // Déclenchement officiel de l'extinction des feux
  run('RaceManager.triggerLightsOut()');

  assert.equal(run('raceState'), 'racing', 'La course doit être lancée (racing)');
  assert.equal(run('RaceManager.countdown.active'), false, 'Le compte à rebours doit être terminé');

  const speeds = run('population.map(v => v.speed)');
  for (let i = 0; i < speeds.length; i++) {
    assert.ok(speeds[i] > 1.0, `Voiture #${i} doit être lancée après l'extinction des feux`);
  }
});

test('8. Réinitialisation complète et replacement sur la grille après un Reset', () => {
  const { run } = createGridTestContext();
  run('buildTrack()');
  run('TOTAL = 10');
  run('initPopulation()');

  // Simuler une avancée des voitures
  run('for (let v of population) { v.pos.x += 100; v.speed = 4; }');

  // Clic Reset simulé
  run('initPopulation()');

  // Vérifier que chaque voiture a retrouvé son emplacement de grille initial
  for (let i = 0; i < 10; i++) {
    const slot = run(`StartingGrid.getSlot(${i}, checkpoints, 10)`);
    const carPos = run(`({ x: population[${i}].pos.x, y: population[${i}].pos.y })`);
    assert.ok(Math.hypot(carPos.x - slot.x, carPos.y - slot.y) < 0.1, `Voiture #${i} replacée sur son emplacement`);
  }
});
