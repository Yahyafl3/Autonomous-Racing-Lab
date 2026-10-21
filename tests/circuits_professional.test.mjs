import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const circuitsPath = fileURLToPath(new URL('../circuits.js', import.meta.url));
const rayPath = fileURLToPath(new URL('../ray.js', import.meta.url));
const nnPath = fileURLToPath(new URL('../nn.js', import.meta.url));
const sketchPath = fileURLToPath(new URL('../sketch.js', import.meta.url));
const vehiclePath = fileURLToPath(new URL('../vehicle.js', import.meta.url));

const circuitsSource = await readFile(circuitsPath, 'utf8');
const raySource = await readFile(rayPath, 'utf8');
const nnSource = await readFile(nnPath, 'utf8');
const sketchSource = await readFile(sketchPath, 'utf8');
const vehicleSource = await readFile(vehiclePath, 'utf8');

function createFullContext() {
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
      getContext() { return new Proxy({}, { get: () => () => {}, set: () => true }); }
    };
  };
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    }
  };
  const sandbox = {
    document,
    window: { addEventListener() {} },
    console: { log() {}, warn() {}, error() {} },
    width: 1400,
    height: 800,
    TWO_PI: Math.PI * 2,
    PI: Math.PI,
    random: (min, max) => {
      if (max === undefined) return min !== undefined ? min / 2 : Math.random();
      return min + (max - min) * 0.45;
    },
    map: (value, low, high, outLow, outHigh) => outLow + ((value - low) / (high - low)) * (outHigh - outLow),
    cos: Math.cos,
    sin: Math.sin,
    noise: () => 0.5,
    createVector: (x, y) => ({
      x: x || 0,
      y: y || 0,
      copy() { return sandbox.createVector(this.x, this.y); },
      add(v) { this.x += v.x; this.y += v.y; return this; },
      sub(v) { this.x -= v.x; this.y -= v.y; return this; },
      mult(n) { this.x *= n; this.y *= n; return this; },
      div(n) { this.x /= n; this.y /= n; return this; },
      mag() { return Math.hypot(this.x, this.y); },
      magSq() { return this.x * this.x + this.y * this.y; },
      heading() { return Math.atan2(this.y, this.x); },
      normalize() {
        const m = this.mag();
        if (m !== 0) this.div(m);
        return this;
      },
      limit(max) {
        if (this.magSq() > max * max) {
          this.normalize();
          this.mult(max);
        }
        return this;
      },
      dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
    }),
    p5: {
      Vector: {
        fromAngle(angle, len = 1) {
          return sandbox.createVector(Math.cos(angle) * len, Math.sin(angle) * len);
        },
        sub(v1, v2) {
          return sandbox.createVector(v1.x - v2.x, v1.y - v2.y);
        },
        dist(v1, v2) {
          return Math.hypot(v1.x - v2.x, v1.y - v2.y);
        }
      }
    },
    Boundary: class {
      constructor(x1, y1, x2, y2) { this.a = { x: x1, y: y1 }; this.b = { x: x2, y: y2 }; }
      midpoint() { return { x: (this.a.x + this.b.x) / 2, y: (this.a.y + this.b.y) / 2 }; }
    },
    constrain: (value, min, max) => Math.min(Math.max(value, min), max),
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    color: (r, g, b, a) => ({
      r, g, b, a,
      setAlpha(val) { this.a = val; },
      toString() { return `rgba(${r},${g},${b},${a || 1})`; }
    }),
    createGraphics: () => ({
      clear() {},
      background() {},
      push() {},
      pop() {},
      translate() {},
      rotate() {},
      image() {},
      fill() {},
      noFill() {},
      stroke() {},
      noStroke() {},
      strokeWeight() {},
      rect() {},
      ellipse() {},
      beginShape() {},
      vertex() {},
      endShape() {},
      textFont() {},
      textSize() {},
      textAlign() {},
      text() {},
      arc() {},
      line() {}
    }),
    localStorage: {
      store: {},
      getItem(k) { return this.store[k] || null; },
      setItem(k, v) { this.store[k] = v; },
      removeItem(k) { delete this.store[k]; }
    },
    tf: {
      setBackend() {},
      tensor2d: () => ({ dispose() {} }),
      sequential: () => ({
        add() {},
        compile() {},
        predict: () => ({ dataSync: () => [0, 0], dispose() {} }),
        dispose() {},
        getWeights: () => [],
        setWeights: () => {}
      })
    },
    radians: deg => (deg * Math.PI) / 180,
    NeuralNetwork: class {
      constructor() {}
      copy() { return this; }
      mutate() {}
      predict() { return [0.5, 0.5]; }
      dispose() {}
    }
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(circuitsSource, context, { filename: 'circuits.js' });
  vm.runInContext(raySource, context, { filename: 'ray.js' });
  vm.runInContext(vehicleSource, context, { filename: 'vehicle.js' });
  vm.runInContext(sketchSource, context, { filename: 'sketch.js' });
  return { context, elements };
}

test('1. CircuitRegistry contient 5 vrais circuits avec géométrie et background dédiés', async () => {
  const { context } = createFullContext();
  const registry = vm.runInContext('CircuitRegistry', context);
  assert.equal(registry.circuits.length, 5);

  const expectedIds = ['coastal', 'desert', 'forest', 'urban', 'competition'];
  expectedIds.forEach((id, idx) => {
    const c = registry.getByIndex(idx);
    assert.equal(c.id, id);
    assert.ok(c.bgPath.startsWith('assets/tracks/'));
    assert.ok(c.pathWidth >= 80 && c.pathWidth <= 135, `Circuit ${c.id} width ${c.pathWidth} should be in [80, 135]`);
    assert.ok(typeof c.generate === 'function');
  });
});

test('2. Les 5 fichiers de background haute résolution existent physiquement', async () => {
  const expectedFiles = [
    'assets/tracks/bg_coastal.jpg',
    'assets/tracks/bg_desert.jpg',
    'assets/tracks/bg_forest.jpg',
    'assets/tracks/bg_urban.jpg',
    'assets/tracks/bg_competition.jpg'
  ];
  for (const f of expectedFiles) {
    const p = fileURLToPath(new URL(`../${f}`, import.meta.url));
    await assert.doesNotReject(access(p), `Le fichier ${f} doit exister sur le disque`);
  }
});

test('3. Chaque circuit génère 60 checkpoints et 120 murs physiques avec géométrie distincte', () => {
  const { context } = createFullContext();
  const registry = vm.runInContext('CircuitRegistry', context);

  const shapes = [];
  for (let i = 0; i < 5; i++) {
    const circuit = registry.getByIndex(i);
    const built = registry.build(circuit, 1400, 800);
    assert.equal(built.checkpoints.length, 60);
    assert.equal(built.walls.length, 120);
    assert.equal(built.inside.length, 60);
    assert.equal(built.outside.length, 60);

    // Vérifier l'absence de coordonnées NaN
    for (const cp of built.checkpoints) {
      assert.ok(!isNaN(cp.a.x) && !isNaN(cp.a.y));
      assert.ok(!isNaN(cp.b.x) && !isNaN(cp.b.y));
    }

    shapes.push(built.checkpoints.map(cp => ({ x: Math.round(cp.a.x), y: Math.round(cp.a.y) })));
  }

  // Vérifier que les 5 formes sont géométriquement différentes
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      let identical = true;
      for (let k = 0; k < 60; k++) {
        if (shapes[i][k].x !== shapes[j][k].x || shapes[i][k].y !== shapes[j][k].y) {
          identical = false;
          break;
        }
      }
      assert.equal(identical, false, `Circuit ${i} et ${j} doivent avoir des tracés géométriquement différents`);
    }
  }
});

test('4. restartOnNewTrack fait défiler successivement les 5 circuits distincts', () => {
  const { context } = createFullContext();
  vm.runInContext('buildTrack()', context);

  const initialStage = vm.runInContext('currentStageIndex', context);
  assert.equal(initialStage, 0);

  // Premier clic sur Nouveau Circuit -> Stage 2 (Désertique)
  vm.runInContext('restartOnNewTrack()', context);
  assert.equal(vm.runInContext('currentStageIndex', context), 1);
  assert.equal(vm.runInContext('currentStage.circuitId', context), 'desert');

  // Deuxième clic -> Stage 3 (Forestier)
  vm.runInContext('restartOnNewTrack()', context);
  assert.equal(vm.runInContext('currentStageIndex', context), 2);
  assert.equal(vm.runInContext('currentStage.circuitId', context), 'forest');

  // Troisième clic -> Stage 4 (Urbain)
  vm.runInContext('restartOnNewTrack()', context);
  assert.equal(vm.runInContext('currentStageIndex', context), 3);
  assert.equal(vm.runInContext('currentStage.circuitId', context), 'urban');

  // Quatrième clic -> Stage 5 (Compétition)
  vm.runInContext('restartOnNewTrack()', context);
  assert.equal(vm.runInContext('currentStageIndex', context), 4);
  assert.equal(vm.runInContext('currentStage.circuitId', context), 'competition');

  // Cinquième clic -> Retour Stage 1 (Côtier)
  vm.runInContext('restartOnNewTrack()', context);
  assert.equal(vm.runInContext('currentStageIndex', context), 0);
  assert.equal(vm.runInContext('currentStage.circuitId', context), 'coastal');
});

test('5. Les bolides sur la grille de départ ne meurent pas au départ (pas de faux OFF_TRACK)', () => {
  const { context } = createFullContext();
  vm.runInContext('TOTAL = 20; buildTrack();', context);
  vm.runInContext('population = Array.from({ length: 20 }, () => new Vehicle());', context);
  vm.runInContext('StartingGrid.positionCars(population, checkpoints);', context);

  const cars = vm.runInContext('population', context);
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    // Vérifier coordonnées valides
    assert.ok(car.pos.x > 0 && car.pos.y > 0);
    // Vérifier statut vivant
    assert.equal(car.dead, false);
    // Vérifier que checkOutOfBounds ne tue pas la voiture sur la grille
    vm.runInContext(`population[${i}].checkOutOfBounds(checkpoints)`, context);
    assert.equal(car.dead, false, `La voiture ${i} ne doit pas être éliminée sur sa place de départ`);
  }
});
