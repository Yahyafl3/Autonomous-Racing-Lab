import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function createCollisionTestContext() {
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
    crossover(other) { return this.copy(); }
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
    clearRect() {}, fillRect() {}, rect() {}, roundRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {},
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
  const boundarySource = fs.readFileSync(path.join(rootDir, 'boundary.js'), 'utf8');
  const vehicleSource = fs.readFileSync(path.join(rootDir, 'vehicle.js'), 'utf8');
  const gaSource = fs.readFileSync(path.join(rootDir, 'ga.js'), 'utf8');
  const sketchSource = fs.readFileSync(path.join(rootDir, 'sketch.js'), 'utf8');

  vm.runInContext(audioSource, context, { filename: 'audio.js' });
  vm.runInContext(boundarySource, context, { filename: 'boundary.js' });
  vm.runInContext(vehicleSource, context, { filename: 'vehicle.js' });
  vm.runInContext(gaSource, context, { filename: 'ga.js' });
  vm.runInContext(sketchSource, context, { filename: 'sketch.js' });

  const run = (code) => vm.runInContext(code, context);
  return { context, run, getElementById };
}

// --------------------------------------------------------------------------
// SUITE DE TESTS : GESTION DES COLLISIONS SANS ÉLIMINATION ABUSIVE
// --------------------------------------------------------------------------

test('1. Deux voitures se touchent légèrement : réaction physique sans disparition ni élimination', () => {
  const { run } = createCollisionTestContext();
  run('buildTrack()');

  // Créer deux véhicules proches qui vont entrer en collision latérale
  run('carA = new Vehicle()');
  run('carB = new Vehicle()');
  run('carA.pos.set(200, 200); carA.vel.set(3, 0); carA.speed = 3;');
  run('carB.pos.set(212, 200); carB.vel.set(-3, 0); carB.speed = 3;'); // Distance initiale = 12px < 17px

  const initialDist = run('Math.hypot(carA.pos.x - carB.pos.x, carA.pos.y - carB.pos.y)');
  assert.ok(initialDist < 17, 'Distance initiale inférieure au diamètre cumulé');

  // Résolution de la collision
  run('carA.handleCarCollisions([carA, carB])');

  assert.equal(run('carA.dead'), false, 'CarA ne doit PAS être éliminée suite au contact');
  assert.equal(run('carB.dead'), false, 'CarB ne doit PAS être éliminée suite au contact');
  assert.ok(run('carA.contactsCount') > 0, 'Le contact doit être comptabilisé');
  assert.ok(run('carB.contactsCount') > 0, 'Le contact doit être comptabilisé sur carB');

  // Les voitures doivent avoir été repoussées pour éviter l'interpénétration
  const newDist = run('Math.hypot(carA.pos.x - carB.pos.x, carA.pos.y - carB.pos.y)');
  assert.ok(newDist >= 16.5, `Les voitures ont été repoussées (${newDist.toFixed(1)}px >= 16.5px)`);
});

test('2. Une voiture touche une bordure : rebond, décélération et maintien en course', () => {
  const { run } = createCollisionTestContext();
  run('buildTrack()');

  run('car = new Vehicle()');
  // Créer un mur horizontal à y = 100
  run('wall = new Boundary(50, 100, 250, 100)');
  // Placer la voiture à y = 103 avec une vitesse se dirigeant vers le mur (vel.y = -2)
  run('car.pos.set(150, 103); car.vel.set(2, -2); car.speed = 3;');

  const initialSpeed = run('car.speed');

  // Résolution du contact avec le mur
  run('car.handleWallCollisions([wall])');

  assert.equal(run('car.dead'), false, 'La voiture ne doit PAS être éliminée par un simple frottement de bordure');
  assert.ok(run('car.wallContacts') > 0, 'Le contact avec la bordure est enregistré');

  // La voiture doit avoir été repoussée hors du mur
  assert.ok(run('car.pos.y') >= 108, `La carrosserie est repositionnée sur la piste (y: ${run('car.pos.y')})`);

  // La voiture a subi une décélération due au frottement
  assert.ok(run('car.speed') <= initialSpeed, 'La voiture ralentit au contact du mur');
});

test('3. Une voiture touche un obstacle : repoussement et maintien en course', () => {
  const { run } = createCollisionTestContext();
  run('car = new Vehicle()');
  run('car.pos.set(300, 300); car.vel.set(3, 0); car.speed = 3;');
  run('obstacle = { x: 310, y: 300, radius: 10 }'); // Distance = 10px < 8.5 + 10 = 18.5px

  run('car.handleObstacleCollisions([obstacle])');

  assert.equal(run('car.dead'), false, 'La voiture ne doit PAS disparaître suite au contact avec un obstacle');
  assert.ok(run('car.contactsCount') > 0, 'Le contact avec l\'obstacle est compté');
  assert.ok(run('car.speed') < 3, 'La voiture subit un ralentissement réaliste');
  // La voiture est repoussée
  assert.ok(run('car.pos.x') < 300, 'La voiture subit un recul/déviation');
});

test('4. Une voiture très éloignée de la piste : pas d\'élimination immédiate, survie via le timeout (Req 6.1)', () => {
  const { run } = createCollisionTestContext();
  run('buildTrack()');

  run('car = new Vehicle()');
  // Position complètement aberrante hors du circuit (> 300px au large de tous les checkpoints)
  run('car.pos.set(50, 50);');
  run('car.checkOutOfBounds(checkpoints)');

  // Req 6.1 : OFF_TRACK n'est plus une cause d'élimination valide.
  // checkOutOfBounds ne doit PAS mettre dead = true ; c'est le timeout qui élimine.
  assert.equal(run('car.dead'), false, 'checkOutOfBounds ne doit PAS éliminer la voiture (Req 6.1)');
  assert.notEqual(run('car.eliminationReason'), 'OFF_TRACK', 'OFF_TRACK n\'est plus une cause d\'élimination valide');
  assert.notEqual(run('car.eliminationReason'), 'OFF_CANVAS', 'OFF_CANVAS n\'est plus une cause d\'élimination valide');

  // En revanche, après LIFESPAN frames d'inactivité, la voiture est bien éliminée via TIMEOUT
  run('car.counter = 9999;');
  run('car.update()');
  assert.equal(run('car.dead'), true, 'La voiture doit être éliminée par TIMEOUT_INACTIVITY après LIFESPAN frames');
  assert.equal(run('car.eliminationReason'), 'TIMEOUT_INACTIVITY', 'La raison doit être TIMEOUT_INACTIVITY');
});

test('5. Une voiture subit plusieurs contacts légers successifs : aucun dommage, survie garantie (Req 6.6)', () => {
  const { run } = createCollisionTestContext();
  run('car = new Vehicle()');
  run('car.pos.set(200, 200); car.vel.set(0.5, -0.5); car.speed = 0.8;'); // Vitesse faible → impact < 1.2
  run('wall = new Boundary(100, 195, 300, 195)');

  const initialHealth = run('car.health');

  // Simuler 4 frottements légers successifs le long d'un vibreur (vDotN < 1.2)
  for (let i = 0; i < 4; i++) {
    run('car.handleWallCollisions([wall])');
    assert.equal(run('car.dead'), false, `La voiture doit rester vivante au contact #${i + 1}`);
  }

  // Req 6.6 : aucun dommage pour des impacts de faible intensité (≤ 1.2 px/frame)
  assert.equal(run('car.dead'), false, '4 contacts légers ne doivent PAS éliminer la voiture');
  assert.equal(run('car.health'), initialHealth, 'Aucun dommage infligé pour des contacts de faible intensité (Req 6.6)');
});

test('6. Une nouvelle génération démarre après la fin de la précédente : bolides réinitialisés avec pleine intégrité', () => {
  const { run } = createCollisionTestContext();
  run('buildTrack()');
  run('TOTAL = 10');
  run('initPopulation()');

  // Simuler des dégâts et contacts sur toute la flotte
  run('for (let v of population) { v.health = 20; v.contactsCount = 5; }');

  // Éliminer toute la flotte pour forcer une nouvelle génération
  run('for (let v of population) { v.dead = true; savedVehicles.push(v); }');
  run('population = []');
  run('handleGenerationEnd()');

  assert.equal(run('population.length'), 10, 'La nouvelle génération doit compter 10 voitures');
  for (let i = 0; i < 10; i++) {
    assert.equal(run(`population[${i}].dead`), false, `Voiture #${i} de la nouvelle génération est prête à courir`);
    assert.equal(run(`population[${i}].health`), 100, `Voiture #${i} a 100% d'intégrité mécanique`);
    assert.equal(run(`population[${i}].contactsCount`), 0, `Voiture #${i} a un compteur de contacts remis à zéro`);
  }
});
