/**
 * collision_elimination.test.mjs
 *
 * Task 4.6 — Unit tests for Req 6.1, 6.2, 6.5, 6.6
 * Covers the three valid elimination causes and the absence of invalid ones.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const rootDir    = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Shared sandbox factory (same pattern as collision_system.test.mjs)
// ---------------------------------------------------------------------------
function createCtx() {
  class Vector {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y)    { this.x = x; this.y = y; return this; }
    add(v)       { this.x += v.x; this.y += v.y; return this; }
    sub(v)       { this.x -= v.x; this.y -= v.y; return this; }
    mult(n)      { this.x *= n;   this.y *= n;   return this; }
    div(n)       { if (n !== 0) { this.x /= n; this.y /= n; } return this; }
    mag()        { return Math.hypot(this.x, this.y); }
    heading()    { return Math.atan2(this.y, this.x); }
    copy()       { return new Vector(this.x, this.y); }
    normalize()  { const m = this.mag(); if (m !== 0) this.div(m); return this; }
    limit(max)   { if (this.mag() > max) { this.normalize(); this.mult(max); } return this; }
    static dist(v1, v2)     { return Math.hypot(v2.x - v1.x, v2.y - v1.y); }
    static fromAngle(angle) { return new Vector(Math.cos(angle), Math.sin(angle)); }
  }

  class MockNN {
    constructor(a, b, c) { this.inputs = a; this.hidden = b; this.outputs = c; }
    predict() { return [0.5, 0.5]; }
    copy()    { return new MockNN(this.inputs, this.hidden, this.outputs); }
    mutate()  {}
    crossover(o) { return this.copy(); }
    dispose() {}
  }

  class MockRay {
    constructor(pos, angle) { this.pos = pos; this.dir = Vector.fromAngle(angle); }
    rotate(offset) { this.dir = Vector.fromAngle(offset); }
    cast()         { return null; }
  }

  class MockBoundary {
    constructor(x1, y1, x2, y2) { this.a = { x: x1, y: y1 }; this.b = { x: x2, y: y2 }; }
    midpoint() { return new Vector((this.a.x + this.b.x) / 2, (this.a.y + this.b.y) / 2); }
  }

  const elements = {};
  const makeEl = (id) => {
    if (!elements[id]) {
      elements[id] = {
        id, textContent: '', value: '', style: {},
        getContext: () => ({
          clearRect(){}, fillRect(){}, rect(){}, beginPath(){}, arc(){},
          fill(){}, stroke(){}, moveTo(){}, lineTo(){}, closePath(){},
          save(){}, restore(){}, scale(){}, translate(){}, rotate(){},
          fillText(){}, measureText: () => ({ width: 10 }), font: '',
          textAlign: '', textBaseline: '', strokeStyle: '', fillStyle: '',
          setLineDash(){}
        }),
        classList: {
          _s: new Set(),
          add(c)          { this._s.add(c); },
          remove(c)       { this._s.delete(c); },
          contains(c)     { return this._s.has(c); },
          toggle(c, f)    {
            if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); }
            else                 { f ? this._s.add(c) : this._s.delete(c); }
          }
        },
        dataset: {},
        addEventListener: () => {},
        querySelector:    () => null,
        querySelectorAll: () => [],
        appendChild:      () => {},
        innerHTML: '',
        click: () => {}
      };
    }
    return elements[id];
  };

  const fakeStorage = new Map();
  const sandbox = {
    console, Math, Date,
    performance: { now: () => 1000 },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    p5: { Vector },
    Vector,
    NeuralNetwork: MockNN,
    Ray:           MockRay,
    Boundary:      MockBoundary,
    createVector:  (x = 0, y = 0) => new Vector(x, y),
    radians: (deg) => (deg * Math.PI) / 180,
    map: (v, i0, i1, o0, o1) => o0 + ((v - i0) / (i1 - i0)) * (o1 - o0),
    constrain: (v, mn, mx) => Math.min(Math.max(v, mn), mx),
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    lerp: (s, e, t) => s + (e - s) * t,
    random: (mn, mx) => (mx === undefined ? (mn || 1) * 0.5 : mn + (mx - mn) * 0.5),
    cos: Math.cos, sin: Math.sin,
    noise: () => 0.5, noiseSeed: () => {}, randomSeed: () => {},
    color: (r, g, b) => ({ r, g, b }),
    lerpColor: (c1, c2, t) => c1,
    TWO_PI: Math.PI * 2, PI: Math.PI, HALF_PI: Math.PI / 2,
    width: 1850, height: 1080,
    frameCount: 1, deltaTime: 16.6,
    ROUND: 'round', CENTER: 'center', CLOSE: 'close', SQUARE: 'square',
    createCanvas:   () => ({ parent() {} }),
    createGraphics: (w, h) => ({
      clear(){}, background(){}, noStroke(){}, stroke(){}, strokeWeight(){},
      strokeCap(){}, fill(){}, noFill(){}, ellipse(){}, rect(){}, line(){},
      quad(){}, beginShape(){}, endShape(){}, vertex(){}, bezierVertex(){},
      push(){}, pop(){}, translate(){}, rotate(){}, scale(){}, image(){},
      text(){}, textFont(){}, textSize(){}, textAlign(){},
      width: w || 1850, height: h || 1080
    }),
    textFont(){}, textSize(){}, textAlign(){}, text(){}, textStyle(){},
    fill(){}, noFill(){}, stroke(){}, noStroke(){}, strokeWeight(){},
    strokeCap(){}, rectMode(){}, ellipseMode(){}, imageMode(){},
    ellipse(){}, rect(){}, quad(){}, line(){}, beginShape(){}, endShape(){},
    vertex(){}, bezierVertex(){}, push(){}, pop(){}, translate(){}, rotate(){}, scale(){},
    image(){}, background(){}, tint(){}, noTint(){},
    frameRate(){}, redraw(){},
    document: {
      getElementById: makeEl,
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: (tag) => makeEl('created-' + tag),
      addEventListener: () => {}
    },
    window: {
      addEventListener: () => {},
      localStorage: { getItem: k => null, setItem: () => {}, removeItem: () => {}, clear: () => {} }
    },
    localStorage: { getItem: k => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
    tf: {
      tensor: () => ({ dispose: () => {} }),
      tensor2d: () => ({ dispose: () => {} }),
      setBackend: () => {},
      memory: () => ({ numTensors: 0 }),
      sequential: () => ({
        add: () => {}, compile: () => {}, predict: () => ({ dataSync: () => [0.5, 0.5], dispose: () => {} }),
        getWeights: () => [], setWeights: () => {}, dispose: () => {}
      }),
      layers: {
        dense: () => ({})
      }
    }
  };
  sandbox.window.document = sandbox.document;

  const ctx = vm.createContext(sandbox);

  const load = (file) =>
    vm.runInContext(
      fs.readFileSync(path.join(rootDir, file), 'utf8'),
      ctx,
      { filename: file }
    );

  load('audio.js');
  load('boundary.js');
  load('vehicle.js');
  load('ga.js');
  load('sketch.js');

  const run = (code) => vm.runInContext(code, ctx);
  return { run };
}

// ---------------------------------------------------------------------------
// Req 6.1a — TIMEOUT_INACTIVITY is a valid elimination cause
// ---------------------------------------------------------------------------
test('Req 6.1a — timeout after LIFESPAN frames eliminates via TIMEOUT_INACTIVITY', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  // Force counter past LIFESPAN without crossing a checkpoint
  run('car.counter = LIFESPAN + 1');
  run('car.update()');

  assert.equal(run('car.dead'), true,
    'Vehicle must be dead after exceeding LIFESPAN without checkpoint progress');
  assert.equal(run('car.eliminationReason'), 'TIMEOUT_INACTIVITY',
    'Elimination reason must be TIMEOUT_INACTIVITY');
});

// ---------------------------------------------------------------------------
// Req 6.1b — CRITICAL_WALL_DAMAGE is a valid elimination cause
// ---------------------------------------------------------------------------
test('Req 6.1b — accumulated critical wall damage eliminates via CRITICAL_WALL_DAMAGE', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  // Drive the vehicle into a wall at high speed so impactForce > 1.2
  // Wall at y=100, vehicle at y=108 (inside radius=8.5), high inward velocity
  run('wall = new Boundary(0, 100, 400, 100)');
  run('car.pos.set(200, 108); car.vel.set(0, -5); car.speed = 5;');

  // Set health to 1 so one high-speed impact eliminates it
  run('car.health = 1');
  run('car.handleWallCollisions([wall])');

  assert.equal(run('car.dead'), true,
    'Vehicle must die when health reaches 0 from critical wall damage');
  assert.equal(run('car.eliminationReason'), 'CRITICAL_WALL_DAMAGE',
    'Elimination reason must be CRITICAL_WALL_DAMAGE');
});

// ---------------------------------------------------------------------------
// Req 6.1c — RACE_FINISHED is a valid elimination cause (finished, not dead)
// ---------------------------------------------------------------------------
test('Req 6.1c — completing required laps sets finished=true, dead stays false (Req 6.5)', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  // Drive the vehicle to cross checkpoint 0 with enough lapCheckpointsCount accumulated
  // to trigger the lap-completion branch inside check().
  // We need to cross checkpoint 0 in the forward direction with
  // lapCheckpointsCount >= checkpoints.length - 1.
  run(`
    const goal0 = checkpoints[0];
    const a = goal0.a;
    const b = goal0.b;
    // Midpoint of the checkpoint segment
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    // Forward normal of the checkpoint: n = (-(b.y-a.y), b.x-a.x)
    const nx = -(b.y - a.y);
    const ny = b.x - a.x;
    const nLen = Math.hypot(nx, ny) || 1;
    // Place prevPos 5px behind the checkpoint, pos 5px ahead
    car.prevPos.set(mx - (nx/nLen)*5, my - (ny/nLen)*5);
    car.pos.set(  mx + (nx/nLen)*5, my + (ny/nLen)*5);
    car.index = 0;
    // Simulate having already crossed all other checkpoints this lap
    car.lapCheckpointsCount = checkpoints.length;  // >= length-1 → triggers lap complete
    // Set lapsCompleted to one below the required threshold
    car.lapsCompleted = currentStage.targetLaps - 1;
    // Call check — should complete the lap and set finished=true
    car.check(checkpoints, currentStage.targetLaps, (v) => { /* mock victory, suppress UI */ });
  `);

  assert.equal(run('car.finished'), true,
    'Vehicle must have finished = true after completing targetLaps');
  assert.equal(run('car.dead'), false,
    'A finished vehicle must NOT have dead = true (Req 6.5)');
});

// ---------------------------------------------------------------------------
// Req 6.2 — Car-to-car collision NEVER eliminates a vehicle
// ---------------------------------------------------------------------------
test('Req 6.2 — car-to-car collision does not eliminate either vehicle', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('carA = new Vehicle(); carB = new Vehicle()');

  // Place them overlapping, heading toward each other at high speed
  run('carA.pos.set(500, 500); carA.vel.set(6, 0);  carA.speed = 6;');
  run('carB.pos.set(510, 500); carB.vel.set(-6, 0); carB.speed = 6;');

  run('carA.handleCarCollisions([carA, carB])');

  assert.equal(run('carA.dead'), false, 'carA must NOT be eliminated by car-to-car contact (Req 6.2)');
  assert.equal(run('carB.dead'), false, 'carB must NOT be eliminated by car-to-car contact (Req 6.2)');
  assert.notEqual(run('carA.eliminationReason'), 'OFF_CANVAS');
  assert.notEqual(run('carA.eliminationReason'), 'OFF_TRACK');
});

// ---------------------------------------------------------------------------
// Req 6.6 — Zero damage below the 1.2 px/frame threshold
// ---------------------------------------------------------------------------
test('Req 6.6 — low-speed wall contact (vDotN ≤ 1.2) applies zero damage', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');
  // Wall at y=100; vehicle at y=108 (barely touching), very slow inward velocity
  run('wall = new Boundary(0, 100, 400, 100)');
  run('car.pos.set(200, 108); car.vel.set(0.5, -0.8); car.speed = 0.8;'); // |vDotN| < 1.2
  run('car.health = 100');

  run('car.handleWallCollisions([wall])');

  assert.equal(run('car.health'), 100,
    'Health must remain 100 after a low-speed grazing contact (Req 6.6)');
  assert.equal(run('car.dead'), false,
    'Vehicle must not be eliminated by a low-speed contact');
});

// ---------------------------------------------------------------------------
// Req 6.6 — Significant damage above the 1.2 px/frame threshold (preserved physics)
// ---------------------------------------------------------------------------
test('Req 6.6 — high-speed wall contact (vDotN > 1.2) applies realistic damage', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');
  // Wall at y=100; vehicle inside wall at y=108, high inward velocity
  run('wall = new Boundary(0, 100, 400, 100)');
  run('car.pos.set(200, 108); car.vel.set(0, -3); car.speed = 3;'); // |vDotN| ≈ 3 > 1.2
  run('car.health = 100');

  run('car.handleWallCollisions([wall])');

  assert.ok(run('car.health') < 100,
    'Health must decrease after a high-speed wall impact (Req 6.6 — realistic damage preserved)');
});

// ---------------------------------------------------------------------------
// Req 6.1 — OFF_CANVAS is no longer a valid elimination cause
// ---------------------------------------------------------------------------
test('Req 6.1 — vehicle far outside canvas bounds is clamped, NOT eliminated', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  // Place vehicle extremely far outside any reasonable track bounds
  run('car.pos.set(-99999, -99999)');
  run('car.checkOutOfBounds(checkpoints)');

  assert.equal(run('car.dead'), false,
    'checkOutOfBounds must NOT eliminate a vehicle via OFF_CANVAS (Req 6.1)');
  assert.notEqual(run('car.eliminationReason'), 'OFF_CANVAS',
    'OFF_CANVAS must not be assigned as an elimination reason');
  // Position should have been clamped to a finite value
  assert.ok(run('isFinite(car.pos.x)'), 'Position x must be clamped to a finite value');
  assert.ok(run('isFinite(car.pos.y)'), 'Position y must be clamped to a finite value');
});

// ---------------------------------------------------------------------------
// Req 6.1 — OFF_TRACK is no longer a valid elimination cause
// ---------------------------------------------------------------------------
test('Req 6.1 — vehicle far from all checkpoints is NOT eliminated by checkOutOfBounds', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  // Position vehicle more than 280px from all checkpoints
  run('car.pos.set(50, 50)');
  run('car.checkOutOfBounds(checkpoints)');

  assert.equal(run('car.dead'), false,
    'checkOutOfBounds must NOT eliminate a vehicle via OFF_TRACK (Req 6.1)');
  assert.notEqual(run('car.eliminationReason'), 'OFF_TRACK',
    'OFF_TRACK must not be assigned as an elimination reason');
});

// ---------------------------------------------------------------------------
// Req 6.1 — Timeout is the mechanism for a permanently off-track vehicle
// ---------------------------------------------------------------------------
test('Req 6.1 — off-track vehicle is eventually eliminated by TIMEOUT_INACTIVITY', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  // Vehicle sits far from all checkpoints without making progress
  run('car.pos.set(50, 50)');
  run('car.checkOutOfBounds(checkpoints)');
  assert.equal(run('car.dead'), false, 'Not yet dead — timeout not reached');

  // Simulate LIFESPAN+1 frames passing without checkpoint progress
  run('car.counter = LIFESPAN + 1');
  run('car.update()');

  assert.equal(run('car.dead'), true,
    'Vehicle must eventually be eliminated by TIMEOUT_INACTIVITY');
  assert.equal(run('car.eliminationReason'), 'TIMEOUT_INACTIVITY',
    'Elimination reason must be TIMEOUT_INACTIVITY, not OFF_TRACK');
});


// ---------------------------------------------------------------------------
// Req 6.1 — Boundary clamp redirects heading toward track (no oscillation)
// ---------------------------------------------------------------------------
test('Req 6.1 — clamped vehicle heading redirects toward target checkpoint', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  // Place vehicle far outside the left boundary
  run('car.pos.set(-99999, 540)');
  run('car.heading = Math.PI;'); // Pointing left (away from track)
  run('car.speed = 6;');
  run('car.checkOutOfBounds(checkpoints)');

  // After clamp, heading should point toward the target checkpoint (roughly rightward)
  const headingAfter = run('car.heading');
  const cosHeading = Math.cos(headingAfter);

  assert.ok(cosHeading > 0,
    `Heading must redirect toward track (cos(heading) > 0), got cos = ${cosHeading.toFixed(3)}`);
  assert.ok(run('isFinite(car.heading)'),
    'Heading must be finite after clamp');
});

// ---------------------------------------------------------------------------
// Req 6.1 — Clamped vehicle is not frozen (speed > 0)
// ---------------------------------------------------------------------------
test('Req 6.1 — clamped vehicle speed is non-zero (not frozen)', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  run('car.pos.set(-99999, -99999)');
  run('car.speed = 6;');
  run('car.checkOutOfBounds(checkpoints)');

  assert.ok(run('car.speed') > 0,
    `Speed must be non-zero after clamp to prevent freezing, got ${run('car.speed')}`);
  assert.ok(run('car.speed') <= 2.0,
    `Speed must be capped at 2.0 after clamp to prevent overshoot, got ${run('car.speed')}`);
});

// ---------------------------------------------------------------------------
// Req 6.1 — After clamp + update, vehicle moves toward track (not back to boundary)
// ---------------------------------------------------------------------------
test('Req 6.1 — clamped vehicle moves toward track on next update, not oscillating', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  // Place far left, heading left (away from track)
  run('car.pos.set(-99999, 540); car.heading = Math.PI; car.speed = 6;');
  run('car.checkOutOfBounds(checkpoints)');

  const posAfterClamp = { x: run('car.pos.x'), y: run('car.pos.y') };

  // Run one update step — vehicle should move toward the track, not back to boundary
  run('car.update()');
  const posAfterUpdate = { x: run('car.pos.x'), y: run('car.pos.y') };

  // The vehicle should have moved rightward (toward track center at x ≈ 925)
  assert.ok(posAfterUpdate.x > posAfterClamp.x,
    `Vehicle must move toward track after clamp+update (x: ${posAfterClamp.x} → ${posAfterUpdate.x}), not oscillate at boundary`);
});

// ---------------------------------------------------------------------------
// Req 6.1 — Repeated clamp+update cycles don't trap vehicle at boundary
// ---------------------------------------------------------------------------
test('Req 6.1 — repeated clamp+update cycles move vehicle toward track or timeout', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  // Start far outside
  run('car.pos.set(-99999, 540); car.heading = Math.PI; car.speed = 6; car.counter = 0;');

  // Run 50 cycles of update + resolveCollisions (simulating 50 frames)
  run(`
    for (let i = 0; i < 50; i++) {
      car.update();
      if (car.dead) break;
      car.resolveCollisions(walls, [car], checkpoints, null);
      if (car.dead) break;
    }
  `);

  // After 50 frames the vehicle should either:
  // a) still be alive and closer to the track than the starting position, OR
  // b) be dead from timeout (counter > 280 after 50 frames is impossible, so it should be alive)
  assert.equal(run('car.dead'), false,
    'Vehicle must not be eliminated after only 50 frames (LIFESPAN=280)');

  const currentX = run('car.pos.x');
  assert.ok(currentX > -99999,
    `Vehicle must have moved from the extreme position, got x = ${currentX}`);
  assert.ok(run('isFinite(car.pos.x)') && run('isFinite(car.pos.y)'),
    'Position must remain finite after repeated clamp cycles');
});

// ---------------------------------------------------------------------------
// Req 6.1 — Vehicle clamped to boundary still times out if it never reaches a checkpoint
// ---------------------------------------------------------------------------
test('Req 6.1 — clamped vehicle with no checkpoint progress eventually times out', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  // Place at boundary and simulate LIFESPAN frames without checkpoint progress
  run('car.pos.set(-99999, 540); car.speed = 6; car.counter = 0;');

  // Clamp once
  run('car.checkOutOfBounds(checkpoints)');

  // Simulate LIFESPAN+1 update calls with no checkpoint crossing
  run('car.counter = LIFESPAN + 1');
  run('car.update()');

  assert.equal(run('car.dead'), true,
    'Clamped vehicle must eventually be eliminated by TIMEOUT_INACTIVITY');
  assert.equal(run('car.eliminationReason'), 'TIMEOUT_INACTIVITY',
    'Reason must be TIMEOUT_INACTIVITY, not OFF_CANVAS or OFF_TRACK');
});

// ---------------------------------------------------------------------------
// Req 6.1 — Clamp does not affect normal on-track driving
// ---------------------------------------------------------------------------
test('Req 6.1 — on-track vehicle is never clamped by checkOutOfBounds', () => {
  const { run } = createCtx();
  run('buildTrack()');
  run('car = new Vehicle()');

  // Vehicle is at its starting position (on the grid, inside the track)
  const posBefore = { x: run('car.pos.x'), y: run('car.pos.y'), heading: run('car.heading'), speed: run('car.speed') };

  run('car.checkOutOfBounds(checkpoints)');

  const posAfter = { x: run('car.pos.x'), y: run('car.pos.y'), heading: run('car.heading'), speed: run('car.speed') };

  assert.equal(posAfter.x, posBefore.x, 'On-track vehicle position x must not change');
  assert.equal(posAfter.y, posBefore.y, 'On-track vehicle position y must not change');
  assert.equal(posAfter.heading, posBefore.heading, 'On-track vehicle heading must not change');
  assert.equal(posAfter.speed, posBefore.speed, 'On-track vehicle speed must not change');
  assert.equal(run('car.dead'), false, 'On-track vehicle must not be eliminated');
});
