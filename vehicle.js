// ==========================================================================
// AUTONOMOUS RACING LAB — CLASSE DU VÉHICULE AUTONOME (VEHICLE)
// Pilotage par Steering Behaviors, Réseau de Neurones et Raycasting
// ==========================================================================

function isDebugActive() {
  if (typeof debugMode !== 'undefined' && debugMode) return true;
  if (typeof isDebugMode !== 'undefined' && isDebugMode) return true;
  if (typeof window !== 'undefined') {
    return !!(window.debugMode || window.isDebugMode);
  }
  return false;
}

// Calcul de la distance d'un point (x, y) à la droite infinie passant par p1 et p2
function pldistance(p1, p2, x, y) {
  const num = Math.abs((p2.y - p1.y) * x - (p2.x - p1.x) * y + p2.x * p1.y - p2.y * p1.x);
  const den = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
  return num / den;
}

// Détection de l'intersection stricte entre deux segments de droite avec tolérance epsilon
function segmentIntersects(p1, p2, p3, p4, eps = 1e-4) {
  if (!p1 || !p2 || !p3 || !p4) return false;
  const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y, x4 = p4.x, y4 = p4.y;
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-6) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
  return t >= -eps && t <= 1 + eps && u >= -eps && u <= 1 + eps;
}

// Distance orthogonale minimale d'un point (px, py) à un segment fini [a, b]
function pointToSegmentDist(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - a.x, py - a.y);
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

let vehicleVisualSequence = 0;

class Vehicle {
  constructor(brain) {
    // Télémétrie et progression
    this.checkpointsCount = 0;
    this.lapsCompleted = 0;
    this.lapCheckpointsCount = 0;
    this.fitness = 0;
    this.normalizedFitness = 0;
    this.dead = false;
    this.finished = false;
    this.distanceTravelled = 0;

    // Télémétrie de course Formule 1 & chronométrage officiel des tours
    this.lapTimes = [];
    this.bestLapTime = null;
    this.lastLapCrossingTime = 0;
    this.raceTime = 0;

    // Numéro de course officiel permanent et variante visuelle (10 équipes F1)
    const carIdx = vehicleVisualSequence++;
    this.carNumber = (carIdx % 100) + 1;
    this.visualVariant = carIdx % 10;
    this.gridSlot = carIdx;
    this.isManual = false;
    this.steerInput = 0;

    // Positionnement Grand Prix Formule 1 sur la grille : départ échelonné 2 par 2 sans chevauchement
    if (typeof checkpoints !== 'undefined' && checkpoints && checkpoints.length > 5 && checkpoints[0].a && checkpoints[0].b) {
      const lanes = 2;
      const lane = carIdx % lanes;
      const row = Math.floor(carIdx / lanes);
      const targetDist = row * 24.0 + (lane === 1 ? 12.0 : 0.0);

      let accumulated = 0;
      let currIdx = 0;
      const N = checkpoints.length;
      let slotFound = false;

      while (accumulated < targetDist && accumulated < 4000) {
        const prevIdx = (currIdx - 1 + N) % N;
        const cpCurr = checkpoints[currIdx];
        const cpPrev = checkpoints[prevIdx];
        const mCurr = cpCurr.midpoint ? cpCurr.midpoint() : { x: (cpCurr.a.x + cpCurr.b.x) / 2, y: (cpCurr.a.y + cpCurr.b.y) / 2 };
        const mPrev = cpPrev.midpoint ? cpPrev.midpoint() : { x: (cpPrev.a.x + cpPrev.b.x) / 2, y: (cpPrev.a.y + cpPrev.b.y) / 2 };
        const segLen = Math.hypot(mCurr.x - mPrev.x, mCurr.y - mPrev.y) || 1;

        if (accumulated + segLen >= targetDist) {
          const frac = (targetDist - accumulated) / segLen;
          const inX = cpCurr.a.x * (1 - frac) + cpPrev.a.x * frac;
          const inY = cpCurr.a.y * (1 - frac) + cpPrev.a.y * frac;
          const outX = cpCurr.b.x * (1 - frac) + cpPrev.b.x * frac;
          const outY = cpCurr.b.y * (1 - frac) + cpPrev.b.y * frac;

          const laneT = (lane === 0) ? 0.32 : 0.68;
          this.pos = createVector(inX + (outX - inX) * laneT, inY + (outY - inY) * laneT);
          this.heading = Math.atan2(mCurr.y - mPrev.y, mCurr.x - mPrev.x);
          this.index = (currIdx === 0 && frac < 0.15) ? 1 : currIdx;
          slotFound = true;
          break;
        }
        accumulated += segLen;
        currIdx = prevIdx;
      }

      if (!slotFound) {
        const pA = checkpoints[0].a;
        const pB = checkpoints[0].b;
        const laneT = (lane === 0) ? 0.32 : 0.68;
        this.pos = createVector(pA.x + (pB.x - pA.x) * laneT, pA.y + (pB.y - pA.y) * laneT);
        this.heading = (typeof startHeading !== 'undefined') ? startHeading : 0;
        this.index = 1;
      }
    } else if (typeof checkpoints !== 'undefined' && checkpoints && checkpoints.length > 0) {
      const cp0 = checkpoints[0];
      const pA = cp0.a;
      const pB = cp0.b;
      this.pos = (pA && pB) ? createVector((pA.x + pB.x) / 2, (pA.y + pB.y) / 2) : (cp0.midpoint ? createVector(cp0.midpoint().x, cp0.midpoint().y) : createVector(0, 0));
      this.heading = (typeof startHeading !== 'undefined' && typeof startHeading === 'number') ? startHeading : 0;
      this.index = (checkpoints.length > 1) ? 1 : 0;
    } else if (typeof start !== 'undefined' && start) {
      this.pos = createVector(start.x, start.y);
      this.heading = (typeof startHeading !== 'undefined' && typeof startHeading === 'number') ? startHeading : 0;
      this.index = 0;
    } else {
      this.pos = createVector(0, 0);
      this.heading = 0;
      this.index = 0;
    }
    this.prevPos = createVector(this.pos.x, this.pos.y);

    // Propriétés physiques de pilotage Formule 1 & Steering Behaviors
    this.maxspeed = 6;
    this.maxforce = 0.28; // Force de steering maximale (Craig Reynolds)
    this.radius = 8.5; // Rayon physique de carrosserie (17px d'envergure)
    this.health = 100; // Intégrité structurelle (100 = intact, 0 = détruit)
    this.maxHealth = 100;
    this.contactsCount = 0;
    this.wallContacts = 0;
    this.carContacts = 0;
    this.eliminationReason = null;

    // Si une procédure de départ / feux rouges est en cours, immobilisation absolue
    if (typeof raceState !== 'undefined' && (raceState === 'countdown' || raceState === 'ready' || raceState === 'setup')) {
      this.speed = 0;
      this.vel = createVector(0, 0);
    } else {
      this.speed = 2.0; // Départ lancé standard
      this.vel = p5.Vector.fromAngle(this.heading).mult(this.speed);
    }
    this.acc = createVector();
    this.sight = (typeof SIGHT !== 'undefined') ? SIGHT : 120;
    this.steerForce = createVector();

    // Trajectoire réelle suivie (historique des 32 dernières positions)
    this.trail = [];
    this.maxTrailLength = 32;

    // 7 Capteurs laser couvrant 150° (vision latérale et frontale)
    this.rayAngles = [-75, -45, -20, 0, 20, 45, 75];
    this.rays = [];
    this.sensorHits = [];
    this.sensorDists = [];

    for (let i = 0; i < this.rayAngles.length; i++) {
      this.rays.push(new Ray(this.pos, radians(this.rayAngles[i])));
      this.rays[i].rotate(this.heading);
      this.sensorHits.push(null);
      this.sensorDists.push(this.sight);
    }

    this.goal = (typeof checkpoints !== 'undefined' && checkpoints && checkpoints.length > this.index) ? checkpoints[this.index] : null;
    this.counter = 0;

    // Données de télémétrie en direct
    this.lastInputs = [];
    this.lastOutputs = [0.5, 0.5];

    // Réseau de neurones : 9 entrées (7 rayons + vitesse + angle au checkpoint cible), 16 cachés, 2 sorties
    if (brain) {
      this.brain = brain.copy();
    } else {
      this.brain = new NeuralNetwork(9, 16, 2);
    }
  }

  // Libération propre de la mémoire TensorFlow.js
  dispose() {
    if (this.brain) {
      try {
        this.brain.dispose();
      } catch (e) {}
    }
  }

  // ========================================================================
  // STEERING BEHAVIORS (CRAIG REYNOLDS) & COMBINAISON DES FORCES
  // ========================================================================

  // 1. SEEK : calcul de la force de pilotage vers une cible (centre du checkpoint)
  seek(target) {
    if (!target) return createVector(0, 0);
    const targetPos = (target.x !== undefined && target.y !== undefined)
      ? target
      : (target.midpoint ? target.midpoint() : this.pos);

    const dx = targetPos.x - this.pos.x;
    const dy = targetPos.y - this.pos.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return createVector(0, 0);

    // Vitesse désirée = Cible normalisée * maxspeed
    const desiredX = (dx / d) * this.maxspeed;
    const desiredY = (dy / d) * this.maxspeed;

    // Reynolds Steering Force = Vitesse désirée - Vitesse actuelle
    let steerX = desiredX - this.vel.x;
    let steerY = desiredY - this.vel.y;

    const steerMag = Math.hypot(steerX, steerY);
    if (steerMag > this.maxforce && steerMag > 0) {
      steerX = (steerX / steerMag) * this.maxforce;
      steerY = (steerY / steerMag) * this.maxforce;
    }

    return createVector(steerX, steerY);
  }

  // 2. SEPARATION : force répulsive entre véhicules pour éviter les collisions et chevauchements
  separate(vehicles, customRadius) {
    const desiredSeparation = customRadius || 34;
    let sumX = 0, sumY = 0;
    let count = 0;
    if (!vehicles || vehicles.length <= 1) return createVector(0, 0);

    for (let i = 0; i < vehicles.length; i++) {
      const other = vehicles[i];
      if (!other || other === this || other.dead || other.finished || !other.pos) continue;
      const d = Math.hypot(this.pos.x - other.pos.x, this.pos.y - other.pos.y);
      if (d > 0 && d < desiredSeparation) {
        const diffX = (this.pos.x - other.pos.x) / d;
        const diffY = (this.pos.y - other.pos.y) / d;
        sumX += diffX / Math.max(0.5, d);
        sumY += diffY / Math.max(0.5, d);
        count++;
      }
    }

    if (count > 0) {
      sumX /= count;
      sumY /= count;
      const mag = Math.hypot(sumX, sumY);
      if (mag > 0) {
        const desX = (sumX / mag) * this.maxspeed;
        const desY = (sumY / mag) * this.maxspeed;
        let steerX = desX - this.vel.x;
        let steerY = desY - this.vel.y;
        const limitMag = this.maxforce * 1.6;
        const sm = Math.hypot(steerX, steerY);
        if (sm > limitMag && sm > 0) {
          steerX = (steerX / sm) * limitMag;
          steerY = (steerY / sm) * limitMag;
        }
        return createVector(steerX, steerY);
      }
    }
    return createVector(0, 0);
  }

  // 3. OBSTACLE / WALL AVOIDANCE : répulsion anticipée contre les bordures de piste
  avoidWalls(walls) {
    if (!this.sensorHits || this.sensorHits.length === 0) return createVector(0, 0);
    const dangerDist = 40;
    let steerX = 0, steerY = 0;

    for (let i = 0; i < this.sensorHits.length; i++) {
      const hit = this.sensorHits[i];
      const dist = this.sensorDists[i];
      if (hit && dist < dangerDist) {
        const dx = this.pos.x - hit.x;
        const dy = this.pos.y - hit.y;
        const len = Math.hypot(dx, dy) || 1;
        const weight = (dangerDist - dist) / dangerDist;
        steerX += (dx / len) * weight;
        steerY += (dy / len) * weight;
      }
    }

    const sm = Math.hypot(steerX, steerY);
    if (sm > 0) {
      const desX = (steerX / sm) * this.maxspeed;
      const desY = (steerY / sm) * this.maxspeed;
      let sX = desX - this.vel.x;
      let sY = desY - this.vel.y;
      const limitMag = this.maxforce * 2.2;
      const sMag = Math.hypot(sX, sY);
      if (sMag > limitMag && sMag > 0) {
        sX = (sX / sMag) * limitMag;
        sY = (sY / sMag) * limitMag;
      }
      return createVector(sX, sY);
    }
    return createVector(0, 0);
  }

  // 4. ALIGNEMENT : alignement fluide avec la trajectoire des bolides proches
  align(vehicles, customRadius) {
    const neighborDist = customRadius || 50;
    let sumX = 0, sumY = 0;
    let count = 0;
    if (!vehicles || vehicles.length <= 1) return createVector(0, 0);

    for (let i = 0; i < vehicles.length; i++) {
      const other = vehicles[i];
      if (!other || other === this || other.dead || other.finished || !other.pos || !other.vel) continue;
      const d = Math.hypot(this.pos.x - other.pos.x, this.pos.y - other.pos.y);
      if (d > 0 && d < neighborDist) {
        sumX += other.vel.x;
        sumY += other.vel.y;
        count++;
      }
    }

    if (count > 0) {
      sumX /= count;
      sumY /= count;
      const mag = Math.hypot(sumX, sumY);
      if (mag > 0) {
        const desX = (sumX / mag) * this.maxspeed;
        const desY = (sumY / mag) * this.maxspeed;
        let steerX = desX - this.vel.x;
        let steerY = desY - this.vel.y;
        const limitMag = this.maxforce * 0.8;
        const sm = Math.hypot(steerX, steerY);
        if (sm > limitMag && sm > 0) {
          steerX = (steerX / sm) * limitMag;
          steerY = (steerY / sm) * limitMag;
        }
        return createVector(steerX, steerY);
      }
    }
    return createVector(0, 0);
  }

  // 5. COHÉSION : rester à proximité du groupe sans collisions
  cohesion(vehicles, customRadius) {
    const neighborDist = customRadius || 60;
    let sumX = 0, sumY = 0;
    let count = 0;
    if (!vehicles || vehicles.length <= 1) return createVector(0, 0);

    for (let i = 0; i < vehicles.length; i++) {
      const other = vehicles[i];
      if (!other || other === this || other.dead || other.finished || !other.pos) continue;
      const d = Math.hypot(this.pos.x - other.pos.x, this.pos.y - other.pos.y);
      if (d > 0 && d < neighborDist) {
        sumX += other.pos.x;
        sumY += other.pos.y;
        count++;
      }
    }

    if (count > 0) {
      sumX /= count;
      sumY /= count;
      return this.seek({ x: sumX, y: sumY });
    }
    return createVector(0, 0);
  }

  // Application combinée cohérente des forces de steering et du réseau de neurones
  applyBehaviors(walls, vehicles = []) {
    // Si la procédure de feux de départ est active, aucune voiture ne tourne avant le signal officiel
    if (typeof raceState !== 'undefined' && (raceState === 'countdown' || raceState === 'ready' || raceState === 'setup')) {
      return;
    }

    // 1. Perception sensorielle laser et prédiction du réseau
    this.look(walls);
    if (this.dead) return;

    // 2. Configuration des poids de steering (personnalisables via l'interface)
    const cfg = (typeof STEERING_CONFIG !== 'undefined') ? STEERING_CONFIG : {
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

    this.maxforce = cfg.maxforce || 0.28;

    // 3. Calcul des forces résultantes
    let totalX = 0, totalY = 0;

    if (cfg.seekEnabled && this.goal) {
      const seekForce = this.seek(this.goal.midpoint ? this.goal.midpoint() : this.goal);
      const w = cfg.weightSeek !== undefined ? cfg.weightSeek : 1.0;
      totalX += seekForce.x * w;
      totalY += seekForce.y * w;
      this.debugSeekForce = seekForce;
    } else {
      this.debugSeekForce = null;
    }

    if (cfg.sepEnabled && vehicles && vehicles.length > 1) {
      const sepForce = this.separate(vehicles, cfg.separationRadius || 40);
      const w = cfg.weightSep !== undefined ? cfg.weightSep : 1.5;
      totalX += sepForce.x * w;
      totalY += sepForce.y * w;
      this.debugSepForce = sepForce;
    } else {
      this.debugSepForce = null;
    }

    if (cfg.avoidEnabled && walls && walls.length > 0) {
      const avoidForce = this.avoidWalls(walls);
      const w = cfg.weightAvoid !== undefined ? cfg.weightAvoid : 1.6;
      totalX += avoidForce.x * w;
      totalY += avoidForce.y * w;
      this.debugAvoidForce = avoidForce;
    } else {
      this.debugAvoidForce = null;
    }

    if (cfg.alignEnabled && vehicles && vehicles.length > 1) {
      const alignForce = this.align(vehicles, 50);
      const w = cfg.weightAlign !== undefined ? cfg.weightAlign : 0.7;
      totalX += alignForce.x * w;
      totalY += alignForce.y * w;
    }

    if (cfg.cohesionEnabled && vehicles && vehicles.length > 1) {
      const cohesionForce = this.cohesion(vehicles, 60);
      const w = cfg.weightCohesion !== undefined ? cfg.weightCohesion : 0.6;
      totalX += cohesionForce.x * w;
      totalY += cohesionForce.y * w;
    }

    // 4. Limitation et application fluide (anti-oscillation avec amortissement angulaire)
    const tMag = Math.hypot(totalX, totalY);
    const limitTotal = this.maxforce * 1.5;
    if (tMag > limitTotal && tMag > 0) {
      totalX = (totalX / tMag) * limitTotal;
      totalY = (totalY / tMag) * limitTotal;
    }
    this.steerForce = createVector(totalX, totalY);

    if (tMag > 0.005) {
      const steerHeading = Math.atan2(totalY, totalX);
      let normDiff = steerHeading - this.heading;
      const PI = Math.PI, TWO_PI = Math.PI * 2;
      while (normDiff < -PI) normDiff += TWO_PI;
      while (normDiff > PI) normDiff -= TWO_PI;
      // Amortissement proportionnel pour une trajectoire lisse sans à-coups
      this.heading += Math.max(-0.055, Math.min(0.055, normDiff * 0.12));
    }
  }

  // Pilotage manuel joueur (Mode Manuel : ZQSD / Flèches, Espace freinage, R remise en piste)
  applyManualControl(inputState, walls) {
    if (this.dead || this.finished) return;

    // 1. Perception sensorielle pour le mode Débogage et détection des collisions
    if (walls && walls.length > 0) {
      if (typeof SIGHT !== 'undefined') this.sight = SIGHT;
      for (let i = 0; i < this.rays.length; i++) {
        const ray = this.rays[i];
        let closest = null;
        let record = this.sight;
        for (let wall of walls) {
          const pt = ray.cast(wall);
          if (pt) {
            const d = p5.Vector.dist(this.pos, pt);
            if (d < record && d < this.sight) {
              record = d;
              closest = pt;
            }
          }
        }
        this.sensorHits[i] = closest;
        this.sensorDists[i] = record;
      }
    }

    if (this.dead) return;

    // 2. Braquage et direction (Gauche / Droite)
    let steerDir = 0;
    if (inputState && inputState.left) steerDir -= 1;
    if (inputState && inputState.right) steerDir += 1;

    // Lissage dynamique du braquage Formule 1
    this.steerInput = (this.steerInput || 0) * 0.65 + steerDir * 0.35;
    const maxTurnRate = 0.082;
    const turnResponsiveness = Math.min(1.25, Math.max(0.3, this.speed / 2.2));
    this.heading += this.steerInput * maxTurnRate * turnResponsiveness;

    // 3. Accélération, Freinage et Frein d'urgence
    const accelRate = 0.22;
    const brakeRate = 0.32;
    const hardBrakeRate = 0.55;

    if (inputState && inputState.handbrake) {
      // Espace : Freinage renforcé F1
      this.speed = Math.max(0, this.speed - hardBrakeRate);
      this.lastOutputs = [0.5 + this.steerInput * 0.45, 0.0];
    } else if (inputState && inputState.up) {
      // Z ou Flèche Haut : Accélération
      this.speed = Math.min(this.maxspeed, this.speed + accelRate);
      this.lastOutputs = [0.5 + this.steerInput * 0.45, 1.0];
    } else if (inputState && inputState.down) {
      // S ou Flèche Bas : Freinage standard
      this.speed = Math.max(0, this.speed - brakeRate);
      this.lastOutputs = [0.5 + this.steerInput * 0.45, 0.1];
    } else {
      // Décélération naturelle (résistance au roulement)
      this.speed = Math.max(0, this.speed - 0.035);
      this.lastOutputs = [0.5 + this.steerInput * 0.45, 0.4];
    }
  }

  // Remise sur la piste du bolide joueur (Touche R en Mode Manuel)
  resetManual(checkpointsList) {
    const cps = checkpointsList || (typeof checkpoints !== 'undefined' ? checkpoints : null);
    if (!cps || cps.length === 0) return;

    const targetIdx = (this.index >= 0 && this.index < cps.length) ? this.index : 0;
    const cp = cps[targetIdx];
    const prevIdx = (targetIdx - 1 + cps.length) % cps.length;
    const prevCp = cps[prevIdx];

    if (cp && cp.a && cp.b) {
      const mid = cp.midpoint ? cp.midpoint() : { x: (cp.a.x + cp.b.x) / 2, y: (cp.a.y + cp.b.y) / 2 };
      const prevMid = prevCp && prevCp.midpoint ? prevCp.midpoint() : { x: (prevCp.a.x + prevCp.b.x) / 2, y: (prevCp.a.y + prevCp.b.y) / 2 };
      this.pos.set(mid.x, mid.y);
      this.prevPos.set(mid.x, mid.y);
      this.heading = Math.atan2(mid.y - prevMid.y, mid.x - prevMid.x);
    }

    this.speed = 1.5;
    this.vel = p5.Vector.fromAngle(this.heading).mult(this.speed);
    this.dead = false;
    this.counter = 0;
    this.trail = [];
    for (let i = 0; i < this.rays.length; i++) {
      this.rays[i].rotate(this.heading);
    }
  }

  // Mutation génétique avec taux dynamique configurable
  mutate(rate) {
    const currentRate = (typeof rate !== 'undefined')
      ? rate
      : ((typeof MUTATION_RATE !== 'undefined') ? MUTATION_RATE : 0.08);
    this.brain.mutate(currentRate);
  }

  applyForce(force) {
    this.acc.add(force);
  }

  // Immobilisation absolue sur la grille pendant les feux de départ
  freezeOnGrid() {
    this.speed = 0;
    if (this.vel) this.vel.set(0, 0);
  }

  // Libération officielle des bolides à l'extinction des feux ("Lights Out")
  launchRace() {
    this.speed = 2.0;
    this.vel = p5.Vector.fromAngle(this.heading).mult(this.speed);
    this.counter = 0;
    this.lastLapCrossingTime = (typeof stageAttemptElapsed === 'number') ? (stageAttemptElapsed / 1000) : 0;
  }

  // Mise à jour de la physique et déplacement du bolide à chaque frame
  update() {
    // Si la procédure de feux de départ est active, aucune voiture ne bouge avant le signal officiel
    if (typeof raceState !== 'undefined' && (raceState === 'countdown' || raceState === 'ready' || raceState === 'setup')) {
      return;
    }

    if (!this.dead && !this.finished) {
      this.prevPos.set(this.pos.x, this.pos.y);

      // Calcul de la vitesse vectorielle à partir du cap et de la vitesse scalaire
      this.vel = p5.Vector.fromAngle(this.heading).mult(this.speed);
      this.pos.add(this.vel);
      this.distanceTravelled += this.speed;

      // Historique de trajectoire suivie (enregistrement régulier des positions)
      if (typeof frameCount === 'undefined' || frameCount % 2 === 0) {
        this.trail.push({ x: this.pos.x, y: this.pos.y });
        if (this.trail.length > this.maxTrailLength) {
          this.trail.shift();
        }
      }

      // Compteur d'inactivité avant élimination si la voiture n'atteint pas le checkpoint suivant
      // Si la voiture roule activement à bonne vitesse vers l'avant, le délai est largement étendu
      const isMovingForward = (typeof this.speed === 'number' && this.speed > 2.0);
      this.counter += (isMovingForward ? 0.35 : 1.0);
      const currentLifespan = (typeof LIFESPAN !== 'undefined') ? LIFESPAN : 750;
      if (this.counter > currentLifespan) {
        this.dead = true;
        this.eliminationReason = 'TIMEOUT_INACTIVITY';
      }

      // Maintien de l'orientation exacte des faisceaux laser selon le cap actuel
      for (let i = 0; i < this.rays.length; i++) {
        this.rays[i].rotate(this.heading);
      }
    }
  }

  // ========================================================================
  // GESTION RÉALISTE DES COLLISIONS ET DES CONTACTS PHYSIQUES
  // Un contact physique (voiture, bordure, obstacle) ne provoque PAS d'élimination
  // brutale : rebond, décélération, glissement le long des vibreurs et continuité de course.
  // Seules la sortie définitive de piste ou la destruction critique mènent au statut OUT.
  // ========================================================================

  // 1. Collision avec les bordures et vibreurs de la piste (Walls / Curbs)
  handleWallCollisions(walls) {
    if (this.dead || this.finished || !walls || walls.length === 0) return;

    const r = this.radius || 8.5;
    const px = this.pos.x;
    const py = this.pos.y;

    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];
      if (!wall || !wall.a || !wall.b) continue;

      // Optimisation boîte englobante (AABB)
      const minX = Math.min(wall.a.x, wall.b.x) - r;
      const maxX = Math.max(wall.a.x, wall.b.x) + r;
      const minY = Math.min(wall.a.y, wall.b.y) - r;
      const maxY = Math.max(wall.a.y, wall.b.y) + r;
      if (px < minX || px > maxX || py < minY || py > maxY) continue;

      const dx = wall.b.x - wall.a.x;
      const dy = wall.b.y - wall.a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;

      let t = ((px - wall.a.x) * dx + (py - wall.a.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const cx = wall.a.x + t * dx;
      const cy = wall.a.y + t * dy;
      const dist = Math.hypot(px - cx, py - cy);

      if (dist < r) {
        // Contact physique réel avec la bordure
        const nx = dist > 0.0001 ? (px - cx) / dist : 0;
        const ny = dist > 0.0001 ? (py - cy) / dist : 0;
        const penetration = r - dist;

        // A. Repousser la carrosserie pour qu'elle reste sur la piste
        this.pos.x += nx * (penetration + 0.2);
        this.pos.y += ny * (penetration + 0.2);

        // B. Rebond élastique modéré et frottement contre le mur
        const vDotN = this.vel.x * nx + this.vel.y * ny;
        if (vDotN < 0) {
          const restitution = 0.32;
          this.vel.x -= (1 + restitution) * vDotN * nx;
          this.vel.y -= (1 + restitution) * vDotN * ny;

          // Ralentissement proportionnel : la voiture frotte le vibreur et perd de la vitesse
          const normalSpeed = Math.abs(vDotN);
          const damping = Math.max(0.40, 0.78 - normalSpeed * 0.08);
          this.speed = Math.max(1.1, this.speed * damping);

          // Réalignement du cap selon le vecteur vitesse résultant (glisse le long du mur)
          this.heading = Math.atan2(this.vel.y, this.vel.x);
        }

        this.wallContacts = (this.wallContacts || 0) + 1;
        this.contactsCount = (this.contactsCount || 0) + 1;

        // C. Dommages réalistes : un frottement le long d'un vibreur n'inflige qu'une usure légère.
        // Seul un impact violent contre un rail inflige des dégâts notables.
        // Req 6.6 — zero damage when impact force ≤ 1.2 px/frame (grazing contact).
        const impactForce = Math.max(0, -vDotN);
        const damage = impactForce > 1.2 ? Math.round(impactForce * 4.0) : 0;
        this.health = Math.max(0, (this.health || 100) - damage);

        // Seule une accumulation critique de dégâts violents ou crash frontal massif élimine
        if (this.health <= 0) {
          this.dead = true;
          this.eliminationReason = 'CRITICAL_WALL_DAMAGE';
        }
        break;
      }
    }
  }

  // 2. Contact physique entre deux voitures (Car-to-car collision)
  handleCarCollisions(vehicles) {
    if (this.dead || this.finished || !vehicles || vehicles.length <= 1) return;

    const r = this.radius || 8.5;
    for (let i = 0; i < vehicles.length; i++) {
      const other = vehicles[i];
      if (!other || other === this || other.dead || other.finished || !other.pos) continue;

      const otherR = other.radius || 8.5;
      const minDist = r + otherR;
      const dx = this.pos.x - other.pos.x;
      const dy = this.pos.y - other.pos.y;
      const d = Math.hypot(dx, dy);

      if (d > 0 && d < minDist) {
        // Contact portière contre portière : les voitures s'écartent sans disparaître
        const overlap = minDist - d;
        const nx = dx / d;
        const ny = dy / d;

        // A. Séparation géométrique douce
        this.pos.x += nx * overlap * 0.5;
        this.pos.y += ny * overlap * 0.5;
        other.pos.x -= nx * overlap * 0.5;
        other.pos.y -= ny * overlap * 0.5;

        // B. Échange d'impulsion physique réaliste
        const otherVelX = other.vel ? other.vel.x : 0;
        const otherVelY = other.vel ? other.vel.y : 0;
        const relVx = this.vel.x - otherVelX;
        const relVy = this.vel.y - otherVelY;
        const vDotN = relVx * nx + relVy * ny;

        if (vDotN < 0) {
          const impulse = -(1 + 0.30) * vDotN * 0.5;
          this.vel.x += nx * impulse;
          this.vel.y += ny * impulse;
          if (other.vel) {
            other.vel.x -= nx * impulse;
            other.vel.y -= ny * impulse;
          }

          this.speed = Math.max(1.0, Math.hypot(this.vel.x, this.vel.y));
          if (other.vel) other.speed = Math.max(1.0, Math.hypot(other.vel.x, other.vel.y));

          this.heading = Math.atan2(this.vel.y, this.vel.x);
          if (other.vel) other.heading = Math.atan2(other.vel.y, other.vel.x);
        }

        // C. Incrément statistiques de course (aucune élimination pour contact entre bolides)
        this.carContacts = (this.carContacts || 0) + 1;
        other.carContacts = (other.carContacts || 0) + 1;
        this.contactsCount = (this.contactsCount || 0) + 1;
        other.contactsCount = (other.contactsCount || 0) + 1;
        this.health = Math.max(30, (this.health || 100) - 1);
        other.health = Math.max(30, (other.health || 100) - 1);
      }
    }
  }

  // 3. Collision avec obstacles de piste (Obstacles / Débris)
  handleObstacleCollisions(obstacles) {
    if (this.dead || this.finished || !obstacles || obstacles.length === 0) return;
    const r = this.radius || 8.5;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (!obs || obs.x === undefined || obs.y === undefined) continue;
      const obsR = obs.radius || 12;
      const dx = this.pos.x - obs.x;
      const dy = this.pos.y - obs.y;
      const d = Math.hypot(dx, dy);
      const minDist = r + obsR;

      if (d > 0 && d < minDist) {
        const overlap = minDist - d;
        const nx = dx / d;
        const ny = dy / d;
        this.pos.x += nx * (overlap + 0.5);
        this.pos.y += ny * (overlap + 0.5);

        // Ralentissement sensible et déviation
        this.speed = Math.max(0.8, this.speed * 0.55);
        this.vel.x = nx * this.speed;
        this.vel.y = ny * this.speed;
        this.heading = Math.atan2(this.vel.y, this.vel.x);

        this.health = Math.max(1, (this.health || 100) - 5);
        this.contactsCount = (this.contactsCount || 0) + 1;
      }
    }
  }

  // 4. Détection rigoureuse d'une véritable sortie de piste (Out of Bounds)
  checkOutOfBounds(checkpoints) {
    if (this.dead || this.finished) return;

    // A. En dehors de l'arène de course étendue
    const margin = 500;
    const bounds = (typeof getTrackBounds === 'function') ? getTrackBounds() : null;
    const minX = bounds ? bounds.minX - margin : -margin;
    const maxX = bounds ? bounds.maxX + margin : ((typeof width !== 'undefined' ? width : 1400) + margin);
    const minY = bounds ? bounds.minY - margin : -margin;
    const maxY = bounds ? bounds.maxY + margin : ((typeof height !== 'undefined' ? height : 800) + margin);

    // Req 6.1 — OFF_CANVAS is not a valid elimination cause.
    // A vehicle that drifts outside the extended arena bounds is clamped back to the
    // boundary and redirected toward its current target checkpoint, rather than
    // eliminated. The inactivity timeout (TIMEOUT_INACTIVITY) will naturally handle
    // a vehicle that is genuinely stuck and cannot progress.
    if (this.pos.x < minX || this.pos.x > maxX || this.pos.y < minY || this.pos.y > maxY) {
      // 1. Clamp position to inside the arena
      this.pos.x = Math.max(minX + 1, Math.min(maxX - 1, this.pos.x));
      this.pos.y = Math.max(minY + 1, Math.min(maxY - 1, this.pos.y));

      // 2. Redirect heading toward the nearest checkpoint to avoid boundary oscillation.
      //    update() will rebuild vel from heading next frame, so we only need to set heading.
      if (checkpoints && checkpoints.length > 0) {
        const targetIdx = Math.max(0, Math.min(checkpoints.length - 1, this.index || 0));
        const cp = checkpoints[targetIdx];
        if (cp && cp.midpoint) {
          const m = cp.midpoint();
          this.heading = Math.atan2(m.y - this.pos.y, m.x - this.pos.x);
        }
      }

      // 3. Keep speed low but non-zero so update() integrates motion
      this.speed = Math.max(1.0, Math.min(this.speed * 0.5, 2.0));
      if (this.vel) { this.vel.x = Math.cos(this.heading) * this.speed; this.vel.y = Math.sin(this.heading) * this.speed; }
      return;
    }

    // B. Sortie définitive au-delà du lit de gravier (zone non praticable)
    if (checkpoints && checkpoints.length > 0) {
      let minDist = Infinity;
      const totalCPs = checkpoints.length;
      const curIdx = this.index || 0;
      const searchWindow = Math.min(12, Math.floor(totalCPs / 2));
      for (let k = -searchWindow; k <= searchWindow; k++) {
        const i = (curIdx + k + totalCPs * 10) % totalCPs;
        const cp = checkpoints[i];
        if (cp && cp.midpoint) {
          const m = cp.midpoint();
          const d = Math.hypot(this.pos.x - m.x, this.pos.y - m.y);
          if (d < minDist) minDist = d;
        }
      }

      // Si au-delà du seuil local, vérifier tous les checkpoints pour éliminer tout faux positif
      if (minDist > 250) {
        for (let i = 0; i < totalCPs; i++) {
          const cp = checkpoints[i];
          if (cp && cp.midpoint) {
            const m = cp.midpoint();
            const d = Math.hypot(this.pos.x - m.x, this.pos.y - m.y);
            if (d < minDist) minDist = d;
          }
        }
      }

      // Req 6.1 — OFF_TRACK is not a valid elimination cause.
      // A vehicle that wanders more than 280px from all checkpoint midpoints is
      // far off the racing surface. Rather than eliminating it immediately, we
      // let the inactivity timer (TIMEOUT_INACTIVITY) handle removal: the vehicle
      // will stop making checkpoint progress and expire naturally within LIFESPAN
      // frames. This prevents phantom eliminations caused by geometry edge-cases
      // or transient position spikes from collision resolution.
      if (minDist > 280) {
        // Do not set dead = true here. The timeout mechanism is the correct path.
        // No action needed: the counter continues to increment in update().
        return;
      }
    }
  }

  // 5. Résolution complète et unifiée des collisions physiques
  resolveCollisions(walls, vehicles, checkpoints, obstacles) {
    if (this.dead || this.finished) return;
    this.handleWallCollisions(walls);
    this.handleCarCollisions(vehicles);
    if (obstacles) this.handleObstacleCollisions(obstacles);
    this.checkOutOfBounds(checkpoints);
  }

  // Calcul d'une fonction de fitness continue, rigoureuse et équitable
  calculateFitness() {
    // 1. Checkpoints franchis (1000 points chacun)
    let score = this.checkpointsCount * 1000;

    // 2. Progression continue en distance vers le prochain checkpoint
    if (this.goal) {
      const mid = this.goal.midpoint();
      const d = p5.Vector.dist(this.pos, mid);
      score += Math.max(0, 900 - d * 3.5);
    }

    // 3. Distance utile totale parcourue
    score += this.distanceTravelled * 0.4;

    // 4. Bonus massif pour tour de circuit complété
    score += this.lapsCompleted * 50000;

    // 5. Malus de collision immédiate sans avoir franchi de checkpoint
    if (this.dead && this.checkpointsCount === 0) {
      score = Math.max(1, score * 0.35);
    }

    this.fitness = Math.max(1, score);
    return this.fitness;
  }

  // Vérification rigoureuse du franchissement ordonné des checkpoints et des tours
  check(checkpoints, targetLaps, onVictoryCallback) {
    if (this.dead || this.finished || !checkpoints || checkpoints.length === 0) return;

    if (this.index >= checkpoints.length) {
      this.index = 0;
    }
    this.goal = checkpoints[this.index];
    if (!this.goal || !this.goal.a || !this.goal.b) return;

    // 1. Détection géométrique de franchissement entre la trajectoire [prevPos -> pos] et le segment [a, b]
    let crossed = segmentIntersects(this.prevPos, this.pos, this.goal.a, this.goal.b);
    if (!crossed) {
      // Tolérance pour vibreurs et bordures : extension latérale de 24px autour du checkpoint
      const mid = this.goal.midpoint ? this.goal.midpoint() : { x: (this.goal.a.x + this.goal.b.x) / 2, y: (this.goal.a.y + this.goal.b.y) / 2 };
      const curDist = Math.hypot(this.pos.x - mid.x, this.pos.y - mid.y);
      const halfW = (this.goal.trackWidth || 92) * 0.5 + 24;
      if (curDist < halfW) {
        const dx = this.goal.b.x - this.goal.a.x;
        const dy = this.goal.b.y - this.goal.a.y;
        const extA = { x: this.goal.a.x - dx * 0.18, y: this.goal.a.y - dy * 0.18 };
        const extB = { x: this.goal.b.x + dx * 0.18, y: this.goal.b.y + dy * 0.18 };
        crossed = segmentIntersects(this.prevPos, this.pos, extA, extB);
      }
    }

    // 2. Vérification du sens de circulation attendu (sens horaire vers l'avant de la piste)
    // Le segment va de a (intérieur) vers b (extérieur). La normale avant est (-(b.y - a.y), b.x - a.x)
    const normX = -(this.goal.b.y - this.goal.a.y);
    const normY = this.goal.b.x - this.goal.a.x;
    const fwdDot = (this.pos.x - this.prevPos.x) * normX + (this.pos.y - this.prevPos.y) * normY;

    // Validation stricte : franchissement réel dans le sens normal de course (pas de franchissement arrière ni simple proximité passive)
    if (crossed && fwdDot > 0) {
      this.checkpointsCount++;
      this.lapCheckpointsCount++;
      this.calculateFitness();
      this.counter = 0; // Réinitialisation du délai d'inactivité : la voiture progresse !
      this.prevPos.set(this.pos.x, this.pos.y);

      // Passage de la ligne d'arrivée (checkpoint 0 après avoir fait tous les checkpoints intermédiaires)
      if (this.index === 0) {
        const minExpectedCPs = Math.max(1, checkpoints.length - 1);
        if (this.lapCheckpointsCount >= minExpectedCPs) {
          this.lapsCompleted++;
          this.lapCheckpointsCount = 0;
          this.index = 1; // On repart sur le premier checkpoint pour le tour suivant

          // Enregistrement officiel du chrono de tour
          const nowSec = (typeof stageAttemptElapsed === 'number') ? (stageAttemptElapsed / 1000) : 0;
          const lapDuration = (this.lastLapCrossingTime > 0) ? (nowSec - this.lastLapCrossingTime) : nowSec;
          this.lastLapCrossingTime = nowSec;
          if (lapDuration > 0.4) {
            this.lapTimes.push(lapDuration);
            if (this.bestLapTime === null || lapDuration < this.bestLapTime) {
              this.bestLapTime = lapDuration;
            }
            if (typeof registerLapRecord === 'function') {
              registerLapRecord(this, lapDuration);
            }
          }

          const requiredLaps = (typeof targetLaps === 'number' && targetLaps > 0)
            ? targetLaps
            : ((typeof currentStage !== 'undefined' && currentStage && currentStage.targetLaps)
                ? currentStage.targetLaps
                : 1);

          if (this.lapsCompleted >= requiredLaps) {
            this.finished = true;
            this.raceTime = nowSec;
            if (typeof onVictoryCallback === 'function') {
              onVictoryCallback(this);
            } else if (typeof triggerVictory === 'function') {
              triggerVictory(this);
            }
          }
        } else {
          // Premier passage ou passage prématuré sur la ligne sans avoir bouclé le circuit
          this.lapCheckpointsCount = 0;
          this.index = 1;
        }
      } else {
        // Checkpoint intermédiaire franchi avec succès
        this.index = (this.index + 1) % checkpoints.length;
      }
    }
  }

  // Poids pour la sélection génétique basé sur la vraie fitness
  getSelectionWeight() {
    return this.calculateFitness();
  }

  // Perception de l'environnement, analyse par le réseau neuronal et commande de direction / vitesse
  look(walls) {
    const inputs = [];
    if (typeof SIGHT !== 'undefined') {
      this.sight = SIGHT;
    }

    // 1. Évaluation des 7 faisceaux laser contre tous les murs du circuit
    for (let i = 0; i < this.rays.length; i++) {
      const ray = this.rays[i];
      let closest = null;
      let record = this.sight;

      for (let wall of walls) {
        const pt = ray.cast(wall);
        if (pt) {
          const d = p5.Vector.dist(this.pos, pt);
          if (d < record && d < this.sight) {
            record = d;
            closest = pt;
          }
        }
      }

      this.sensorHits[i] = closest;
      this.sensorDists[i] = record;

      // Normalisation des 7 capteurs : 0 = voie complètement libre, 1 = mur immédiat
      inputs[i] = map(record, 0, this.sight, 1, 0);
    }

    // 2. Entrée 8 : Vitesse actuelle normalisée (0 à 1)
    inputs[7] = this.speed / this.maxspeed;

    // 3. Entrée 9 : Angle relatif vers le prochain checkpoint (-1 à +1)
    let angleToGoal = 0;
    if (this.goal) {
      const toGoal = p5.Vector.sub(this.goal.midpoint(), this.pos);
      let diff = toGoal.heading() - this.heading;
      while (diff < -PI) diff += TWO_PI;
      while (diff > PI) diff -= TWO_PI;
      angleToGoal = diff / PI;
    }
    inputs[8] = angleToGoal;

    this.lastInputs = inputs;

    // 4. Inférence du réseau de neurones
    const output = this.brain.predict(inputs);
    this.lastOutputs = output;

    // Sortie 0 : Direction (-1 = braquage gauche maximal, +1 = braquage droite maximal)
    const steer = map(output[0], 0, 1, -1, 1);
    // Sortie 1 : Accélération / Accélérateur (0 à 1)
    const throttle = output[1];

    // Modèle physique de braquage Formule 1 réactif
    const maxTurnRate = 0.088; // ~5 degrés par frame
    const turnResponsiveness = Math.min(1.2, Math.max(0.35, this.speed / 2.0));
    this.heading += steer * maxTurnRate * turnResponsiveness;

    // Gestion de l'accélération et du freinage
    const targetSpeed = map(throttle, 0, 1, 1.2, this.maxspeed);
    const accelRate = 0.25;
    if (this.speed < targetSpeed) {
      this.speed = Math.min(this.maxspeed, this.speed + accelRate);
    } else {
      this.speed = Math.max(1.0, this.speed - accelRate * 0.8);
    }

    return createVector(0, 0);
  }

  // Silhouette de supercar GT3 professionnelle en vue de dessus (Top-Down Racing Model)
  drawCarBody(lodLevel = 'fleet') {
    push();
    translate(this.pos.x, this.pos.y);
    // Orientation physique rigoureuse et nette selon le cap exact du bolide
    rotate(this.heading);
    rectMode(CENTER);

    const isLeader = (lodLevel === 'leader' || lodLevel === true);
    const isTop2 = (lodLevel === 'top2');
    const isTop3 = (lodLevel === 'top3');

    // 10 Livrées officielles de Formule 1 professionnelles
    const liveries = [
      {
        name: 'Oracle Red Bull Racing',
        number: '1',
        team: 'Red Bull Racing',
        body: [15, 23, 42],        // Dark Matte Navy #0f172a
        accent: [239, 68, 68],     // Bull Red #ef4444
        stripe: [250, 204, 21],    // Electric Yellow #facc15
        rims: [203, 213, 225],     // Silver
        halo: [15, 23, 42],
        tireStripe: [239, 68, 68], // Soft Red
        roofNum: [255, 255, 255]
      },
      {
        name: 'Scuderia Ferrari HP',
        number: '16',
        team: 'Ferrari',
        body: [225, 29, 72],       // Rosso Corsa #e11d48
        accent: [254, 240, 138],   // Modena Yellow #fef08a
        stripe: [255, 255, 255],   // White
        rims: [226, 232, 240],     // Chrome Silver
        halo: [180, 20, 50],
        tireStripe: [254, 240, 138], // Medium Yellow
        roofNum: [255, 255, 255]
      },
      {
        name: 'Mercedes-AMG PETRONAS F1',
        number: '44',
        team: 'Mercedes-AMG',
        body: [30, 41, 59],        // Obsidian Stealth Black #1e293b
        accent: [6, 182, 212],     // Petronas Emerald Teal #06b6d4
        stripe: [203, 213, 225],   // Silver Arrow
        rims: [15, 23, 42],        // Satin Black
        halo: [6, 182, 212],
        tireStripe: [255, 255, 255], // Hard White
        roofNum: [255, 255, 255]
      },
      {
        name: 'McLaren Formula 1 Team',
        number: '4',
        team: 'McLaren',
        body: [249, 115, 22],      // Papaya Orange #f97316
        accent: [14, 165, 233],    // Anthracite Blue #0ea5e9
        stripe: [15, 23, 42],      // Stealth Carbon
        rims: [15, 23, 42],        // Black
        halo: [249, 115, 22],
        tireStripe: [239, 68, 68], // Soft Red
        roofNum: [15, 23, 42]
      },
      {
        name: 'Aston Martin Aramco F1',
        number: '14',
        team: 'Aston Martin',
        body: [6, 78, 59],         // British Racing Green #064e3b
        accent: [163, 230, 53],    // AMR Acid Lime #a3e635
        stripe: [255, 255, 255],   // White
        rims: [148, 163, 184],     // Titanium
        halo: [6, 78, 59],
        tireStripe: [254, 240, 138], // Medium Yellow
        roofNum: [255, 255, 255]
      },
      {
        name: 'BWT Alpine F1 Team',
        number: '10',
        team: 'Alpine',
        body: [37, 99, 235],       // Alpine Racing Blue #2563eb
        accent: [236, 72, 153],    // BWT Pastel Pink #ec4899
        stripe: [15, 23, 42],      // Carbon
        rims: [15, 23, 42],
        halo: [236, 72, 153],
        tireStripe: [255, 255, 255], // Hard White
        roofNum: [255, 255, 255]
      },
      {
        name: 'Williams Racing',
        number: '23',
        team: 'Williams',
        body: [29, 78, 216],       // Heritage Deep Blue #1d4ed8
        accent: [56, 189, 248],    // Electric Cyan #38bdf8
        stripe: [255, 255, 255],   // White
        rims: [15, 23, 42],
        halo: [29, 78, 216],
        tireStripe: [239, 68, 68], // Soft Red
        roofNum: [255, 255, 255]
      },
      {
        name: 'Visa Cash App RB F1',
        number: '3',
        team: 'RB',
        body: [59, 130, 246],      // Vibrant Electric Blue #3b82f6
        accent: [255, 255, 255],   // Pure White
        stripe: [239, 68, 68],     // Bull Red
        rims: [226, 232, 240],     // Chrome Silver
        halo: [59, 130, 246],
        tireStripe: [254, 240, 138], // Medium Yellow
        roofNum: [255, 255, 255]
      },
      {
        name: 'Stake F1 Team Kick Sauber',
        number: '77',
        team: 'Kick Sauber',
        body: [9, 9, 11],          // Carbon Black #09090b
        accent: [34, 197, 94],     // Fluo Neon Green #22c55e
        stripe: [34, 197, 94],     // Neon Green
        rims: [34, 197, 94],       // Fluo Green Rims
        halo: [34, 197, 94],
        tireStripe: [34, 197, 94], // Neon Green
        roofNum: [34, 197, 94]
      },
      {
        name: 'MoneyGram Haas F1 Team',
        number: '27',
        team: 'Haas',
        body: [248, 250, 252],     // Pure Pearl White #f8fafc
        accent: [225, 29, 72],     // Haas Racing Red #e11d48
        stripe: [30, 41, 59],      // Dark Slate #1e293b
        rims: [15, 23, 42],        // Satin Black
        halo: [225, 29, 72],
        tireStripe: [239, 68, 68], // Soft Red
        roofNum: [15, 23, 42]
      }
    ];

    const livery = liveries[this.visualVariant % liveries.length];
    const isBraking = (this.speed < 2.4 || (this.lastOutputs && this.lastOutputs[1] < 0.25));
    const steerAngle = (this.lastOutputs && this.lastOutputs[0] !== undefined)
      ? (this.lastOutputs[0] - 0.5) * 0.55
      : (this.steerInput ? this.steerInput * 0.45 : 0);

    // Dimensions Formule 1 réalistes (Longueur 36px, Largeur aéro 16px)
    const carLen = 36;
    const halfW = 8.0;

    // 2.5D Directional Sun Shadow & Dynamic Chassis Tilt
    const worldSunX = 4.0;
    const worldSunY = 5.2;
    const cosH = Math.cos(-this.heading);
    const sinH = Math.sin(-this.heading);
    const localSunX = worldSunX * cosH - worldSunY * sinH;
    const localSunY = worldSunX * sinH + worldSunY * cosH;

    // Dynamic 2.5D roll (lean into turns) & pitch (braking dive / accel squat)
    const rollOffset = -steerAngle * 2.2;
    const pitchOffset = isBraking ? 1.0 : (this.speed > 4.5 ? -0.5 : 0);

    // 1. Phares & feux diurnes aérodynamiques
    noStroke();
    fill(255, 255, 255, isLeader ? 35 : 20);
    triangle(18, -3, 46, -14, 46, 1);
    triangle(18, 3, 46, -1, 46, 14);

    // 2. Ombres portées 2.5D au sol sous le bolide F1
    // A. Ombre d'occlusion ambiante de contact au sol
    fill(0, 0, 0, 140);
    ellipse(0, 0, carLen, halfW * 2.1);
    // B. Ombre directionnelle projetée par le soleil
    fill(5, 10, 16, 95);
    ellipse(localSunX, localSunY, carLen + 2, halfW * 2.3);

    // Halo doré pulsant pour identifier le Leader P1 sans dénaturer sa livrée
    if (isLeader) {
      noFill();
      const pulseAura = 120 + Math.sin(Date.now() * 0.008) * 60;
      stroke(245, 158, 11, pulseAura);
      strokeWeight(2.0);
      ellipse(0, 0, carLen + 8, halfW * 2 + 8);
    }

    // 3. Roues et pneus slicks F1 découverts (au sol avec braquage actif)
    const drawF1Wheel = (wx, wy, isFront) => {
      push();
      translate(wx, wy);
      if (isFront) rotate(steerAngle);
      // Pneu slick noir mat
      fill(14, 18, 26);
      stroke(28, 36, 48);
      strokeWeight(0.8);
      rect(0, 0, isFront ? 7.8 : 8.8, isFront ? 3.6 : 4.4, 1.2);
      // Bande de gomme colorée Pirelli (Soft Rouge, Medium Jaune, Hard Blanc)
      noStroke();
      const tColor = livery.tireStripe || [255, 255, 255];
      fill(tColor[0], tColor[1], tColor[2], 210);
      ellipse(0, 0, isFront ? 3.8 : 4.2, 1.8);
      // Écrou central / jante
      fill(livery.rims[0], livery.rims[1], livery.rims[2]);
      ellipse(0, 0, 1.6, 1.6);
      // Disque de frein incandescent lors des gros freinages
      if (isBraking && this.speed > 1.5) {
        fill(255, 75, 10, 240);
        ellipse(0.8, 0, 2.4, 2.6);
        fill(255, 200, 50, 180);
        ellipse(0.8, 0, 1.2, 1.2);
      }
      pop();
    };

    // 4 Roues F1 découvertes au niveau du sol
    drawF1Wheel(10.5, -7.8, true);
    drawF1Wheel(10.5, 7.8, true);
    drawF1Wheel(-9.0, -8.2, false);
    drawF1Wheel(-9.0, 8.2, false);

    // DÉBUT DE LA CAISSE 2.5D SURÉLEVÉE AVEC INCLINAISON (ROLL & PITCH)
    push();
    translate(pitchOffset, rollOffset);

    // 4. Aileron Avant F1 (Front Wing) en carbone avec dérives latérales et flaps
    fill(12, 16, 24);
    stroke(livery.accent[0], livery.accent[1], livery.accent[2], 230);
    strokeWeight(1.1);
    // Voilure principale avant
    rect(17.5, 0, 3.5, 17, 0.8);
    // Flaps supérieurs peints aux couleurs de l'écurie
    fill(livery.accent[0], livery.accent[1], livery.accent[2]);
    noStroke();
    rect(18.2, -5.5, 1.8, 4.5, 0.4);
    rect(18.2, 5.5, 1.8, 4.5, 0.4);
    // Plaques d'extrémité (Endplates) de l'aileron avant
    fill(livery.stripe[0], livery.stripe[1], livery.stripe[2]);
    rect(17.5, -8.6, 4.2, 0.9, 0.3);
    rect(17.5, 8.6, 4.2, 0.9, 0.3);

    // 5. Museau et cône avant effilé F1 (Nosecone)
    // Chaque écurie conserve sa livrée d'origine (Ferrari rouge, McLaren orange, Mercedes noire, etc.)
    const bodyColor = livery.body;
    fill(bodyColor[0], bodyColor[1], bodyColor[2]);
    stroke(isLeader ? color(255, 215, 0) : color(livery.accent[0], livery.accent[1], livery.accent[2], 220));
    strokeWeight(isLeader ? 2.2 : 1.1);

    beginShape();
    vertex(18.5, 0);       // Pointe du museau
    vertex(15, -2.5);
    vertex(7, -3.8);       // Entrée ponton avant
    vertex(3, -6.5);       // Entrée d'air ponton
    vertex(-6, -6.5);      // Flanc ponton
    vertex(-11, -3.8);     // Resserrement capot moteur
    vertex(-15, -2.2);     // Sortie arrière diffuseur
    vertex(-15, 2.2);
    vertex(-11, 3.8);
    vertex(-6, 6.5);
    vertex(3, 6.5);
    vertex(7, 3.8);
    vertex(15, 2.5);
    endShape(CLOSE);

    // Arête 2.5D lumineuse et biseautée
    stroke(255, 255, 255, 75);
    strokeWeight(0.9);
    line(15, -2.0, 3, -5.8);
    stroke(10, 15, 22, 110);
    strokeWeight(1.1);
    line(15, 2.0, 3, 5.8);

    // 6. Entrées d'air latérales des pontons (Sidepod air intakes)
    fill(8, 12, 18);
    stroke(livery.accent[0], livery.accent[1], livery.accent[2], 180);
    strokeWeight(0.7);
    rect(2.5, -4.8, 2.8, 2.4, 0.5);
    rect(2.5, 4.8, 2.8, 2.4, 0.5);

    // 7. Décoration et livrée F1 (bande sportive de l'écurie)
    fill(livery.stripe[0], livery.stripe[1], livery.stripe[2], 220);
    noStroke();
    beginShape();
    vertex(16, -0.9);
    vertex(6, -1.8);
    vertex(-13, -1.8);
    vertex(-13, 1.8);
    vertex(6, 1.8);
    vertex(16, 0.9);
    endShape(CLOSE);

    // 8. Cockpit baignoire F1 et casque du pilote
    fill(6, 10, 16);
    stroke(30, 41, 59);
    strokeWeight(0.8);
    ellipse(0, 0, 7.5, 5.0);

    // Casque de pilote
    fill(livery.accent[0], livery.accent[1], livery.accent[2]);
    noStroke();
    ellipse(-0.4, 0, 3.6, 3.4);
    // Visière noire du casque
    fill(10, 14, 22);
    ellipse(0.6, 0, 1.6, 2.2);
    // Reflet spéculaire 2.5D sur la visière
    fill(255, 255, 255, 190);
    ellipse(0.8, -0.4, 1.2, 0.8);

    // 9. Halo de protection en titane F1
    noFill();
    stroke(livery.halo[0], livery.halo[1], livery.halo[2]);
    strokeWeight(1.4);
    // Arche avant centrale
    line(0, 0, 3.4, 0);
    // Anneau de protection autour de la tête
    const halfPi = (typeof HALF_PI !== 'undefined') ? HALF_PI : (Math.PI / 2);
    arc(0.2, 0, 6.2, 4.6, -halfPi * 0.9, halfPi * 0.9);

    // 10. Prise d'air moteur supérieure (Airbox) & Aileron de requin (Shark Fin)
    fill(15, 20, 28);
    stroke(livery.accent[0], livery.accent[1], livery.accent[2], 190);
    strokeWeight(0.8);
    ellipse(-2.8, 0, 2.6, 3.0);

    // Dérive dorsale (Shark Fin) en carbone
    fill(bodyColor[0], bodyColor[1], bodyColor[2]);
    stroke(livery.accent[0], livery.accent[1], livery.accent[2], 190);
    strokeWeight(0.7);
    line(-3.5, 0, -13.5, 0);

    // 11. Aileron Arrière F1 (Rear Wing) avec volet DRS et dérives
    fill(10, 14, 20);
    stroke(livery.accent[0], livery.accent[1], livery.accent[2], 240);
    strokeWeight(1.2);
    rect(-14.5, 0, 3.4, 16.5, 0.6);
    // Volet DRS central
    fill(livery.stripe[0], livery.stripe[1], livery.stripe[2], 220);
    noStroke();
    rect(-14.8, 0, 1.4, 13.0, 0.4);
    // Dérives latérales de l'aileron arrière
    fill(livery.accent[0], livery.accent[1], livery.accent[2]);
    rect(-14.5, -8.3, 4.2, 0.9, 0.3);
    rect(-14.5, 8.3, 4.2, 0.9, 0.3);

    // 12. Feu arrière LED de pluie / freinage FIA Formule 1
    if (isBraking) {
      fill(255, 0, 35, 255);
      stroke(255, 120, 120);
      strokeWeight(1.2);
      rect(-16.4, 0, 1.8, 3.5, 0.5);
      noStroke();
      fill(255, 0, 30, 110);
      ellipse(-17.5, 0, 14, 14);
    } else {
      fill(180, 0, 20, 220);
      noStroke();
      rect(-16.2, 0, 1.2, 2.6, 0.4);
    }

    // 13. Numéro de course officiel F1 sur le museau
    fill(livery.roofNum[0], livery.roofNum[1], livery.roofNum[2]);
    noStroke();
    textFont('Orbitron');
    textSize(5);
    textAlign(CENTER, CENTER);
    text(isLeader ? '1' : livery.number, 11, 0.2);

    // FIN DE LA CAISSE 2.5D
    pop();

    // 14. Indicateur Mode Manuel (Joueur)
    if (this.isManual) {
      push();
      noFill();
      const p = Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.16) * 2.2;
      stroke(0, 240, 255, 220);
      strokeWeight(2.4);
      ellipse(0, 0, 48 + p, 26 + p);

      fill(0, 240, 255, 240);
      noStroke();
      rect(0, -18, 28, 8, 2);
      fill(10, 15, 25);
      textFont('Orbitron');
      textSize(5.2);
      textAlign(CENTER, CENTER);
      text('JOUEUR', 0, -17.5);
      pop();
    }

    // 15. Distinctions Podium & Championnat
    if (isLeader) {
      noFill();
      const pulse = sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.12) * 2;
      stroke(245, 158, 11, 180);
      strokeWeight(2.2);
      ellipse(0, 0, 48 + pulse, 28 + pulse);
      stroke(251, 191, 36, 90);
      strokeWeight(4.5);
      ellipse(0, 0, 56 + pulse, 34 + pulse);

      fill(245, 158, 11, 240);
      stroke(255, 255, 255, 240);
      strokeWeight(0.8);
      rect(0, 0, 7.5, 7.5, 2);
      noStroke();
      fill(15, 23, 42);
      textFont('Orbitron');
      textSize(5.5);
      textAlign(CENTER, CENTER);
      text('1', 0, 0.5);
    } else if (isTop2) {
      noFill();
      stroke(203, 213, 225, 170);
      strokeWeight(1.6);
      ellipse(0, 0, 44, 26);
      fill(203, 213, 225, 230);
      stroke(255, 255, 255, 200);
      strokeWeight(0.8);
      rect(0, 0, 7, 7, 2);
      noStroke();
      fill(15, 23, 42);
      textFont('Orbitron');
      textSize(5);
      textAlign(CENTER, CENTER);
      text('2', 0, 0.5);
    } else if (isTop3) {
      noFill();
      stroke(217, 119, 6, 170);
      strokeWeight(1.6);
      ellipse(0, 0, 44, 26);
      fill(217, 119, 6, 230);
      stroke(255, 255, 255, 200);
      strokeWeight(0.8);
      rect(0, 0, 7, 7, 2);
      noStroke();
      fill(255, 255, 255);
      textFont('Orbitron');
      textSize(5);
      textAlign(CENTER, CENTER);
      text('3', 0, 0.5);
    }

    pop();
  }

  // Dessin des trajectoires : réelle suivie (trail), désirée (vers la cible) et force de steering
  drawTrajectories(isLeader = false) {
    if (this.dead || this.finished) return;
    if (!isDebugActive()) return; // Éléments de diagnostic strictement réservés au mode débogage actif

    // 1. Trajectoire réelle suivie (historique des positions avec dégradé d'opacité)
    if (this.trail && this.trail.length > 1) {
      push();
      noFill();
      const trailLen = this.trail.length;
      for (let i = 1; i < trailLen; i++) {
        const t = i / trailLen;
        const alpha = Math.floor(t * (isLeader ? 230 : 120));
        stroke(isLeader ? color(16, 185, 129, alpha) : color(0, 240, 255, alpha * 0.7));
        strokeWeight(isLeader ? 2.4 : 1.4);
        line(this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y);
      }
      pop();
    }

    // 2. Trajectoire désirée, force de braquage et cible pour le leader
    if (isLeader && this.goal && this.goal.midpoint) {
      const mid = this.goal.midpoint();
      push();

      // Trajectoire désirée (ligne pointillée verte/cyan vers le prochain checkpoint)
      stroke(16, 185, 129, 210);
      strokeWeight(1.8);
      const hasLineDash = (typeof drawingContext !== 'undefined' && drawingContext && typeof drawingContext.setLineDash === 'function');
      if (hasLineDash) drawingContext.setLineDash([6, 6]);
      line(this.pos.x, this.pos.y, mid.x, mid.y);
      if (hasLineDash) drawingContext.setLineDash([]);

      // Cible sur le circuit (anneaux concentriques animés rouge/orange)
      noFill();
      const currentFc = (typeof frameCount !== 'undefined') ? frameCount : 0;
      const pulse = Math.sin(currentFc * 0.16) * 3;
      stroke(239, 68, 68, 160);
      strokeWeight(1.8);
      ellipse(mid.x, mid.y, 22 + pulse, 22 + pulse);
      stroke(255, 68, 68, 240);
      strokeWeight(2.2);
      ellipse(mid.x, mid.y, 11, 11);
      fill(255, 68, 68, 255);
      noStroke();
      ellipse(mid.x, mid.y, 4, 4);

      // Force de steering (flèche verte proportionnelle à l'accélération latérale)
      if (this.steerForce && (this.steerForce.x !== 0 || this.steerForce.y !== 0)) {
        const forceMag = Math.hypot(this.steerForce.x, this.steerForce.y);
        if (forceMag > 0.001) {
          const angle = Math.atan2(this.steerForce.y, this.steerForce.x);
          const arrowLen = Math.min(45, forceMag * 140);
          const endX = this.pos.x + Math.cos(angle) * arrowLen;
          const endY = this.pos.y + Math.sin(angle) * arrowLen;

          stroke(34, 197, 94, 255);
          strokeWeight(2.6);
          line(this.pos.x, this.pos.y, endX, endY);

          fill(34, 197, 94);
          noStroke();
          const tipAngle = 0.42;
          const tipLen = 7.5;
          triangle(
            endX, endY,
            endX - Math.cos(angle - tipAngle) * tipLen, endY - Math.sin(angle - tipAngle) * tipLen,
            endX - Math.cos(angle + tipAngle) * tipLen, endY - Math.sin(angle + tipAngle) * tipLen
          );
        }
      }
      pop();
    }
  }

  show(lodLevel = 'fleet') {
    const debug = isDebugActive();
    if (debug && (lodLevel === 'top2' || lodLevel === 'top3')) {
      this.drawTrajectories(false);
    }
    this.drawCarBody(lodLevel);
    if (debug) {
      const mode = (typeof sensorDisplayMode !== 'undefined') ? sensorDisplayMode : 'leader';
      if (mode === 'all') {
        for (let i = 0; i < this.rays.length; i++) {
          this.rays[i].show(this.sensorHits[i], this.sensorDists[i], this.sight);
        }
      }
    }
  }

  // Affichage en surbrillance de la voiture leader (CHAMPIONNE ORANGE)
  highlight() {
    const debug = isDebugActive();
    if (debug) {
      this.drawTrajectories(true);
    }
    this.drawCarBody('leader');

    // Les rayons lasers et le faisceau de checkpoint cible ne sont affichés qu'en mode débogage
    if (debug) {
      const mode = (typeof sensorDisplayMode !== 'undefined') ? sensorDisplayMode : 'leader';
      if (mode !== 'none') {
        for (let i = 0; i < this.rays.length; i++) {
          this.rays[i].show(this.sensorHits[i], this.sensorDists[i], this.sight);
        }
      }

      // Checkpoint cible du leader illuminé en ORANGE CHAMPION éclatant
      if (this.goal) {
        push();
        // Halo externe orange
        stroke(255, 110, 0, 100);
        strokeWeight(7);
        line(this.goal.a.x, this.goal.a.y, this.goal.b.x, this.goal.b.y);

        // Faisceau principal orange champion
        stroke(255, 130, 0, 240);
        strokeWeight(3.5);
        line(this.goal.a.x, this.goal.a.y, this.goal.b.x, this.goal.b.y);

        // Ligne centrale ultra-brillante or/blanc
        stroke(255, 230, 160, 255);
        strokeWeight(1.4);
        line(this.goal.a.x, this.goal.a.y, this.goal.b.x, this.goal.b.y);
        pop();
      }
    }
  }

  // Rendu visuel complet du mode débogage pour le bolide (Hitbox, vecteurs Reynolds, distances lasers)
  drawDebugInfo() {
    if (!isDebugActive()) return;
    push();

    // 1. Hitbox orientée de la carrosserie (Boîte de collision réelle 36x18 px)
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.heading);
    noFill();
    stroke(0, 240, 255, 220);
    strokeWeight(1.4);
    rect(0, 0, 36, 18, 2);
    // Centre géométrique et d'inertie
    fill(255, 40, 80);
    noStroke();
    ellipse(0, 0, 4, 4);
    pop();

    // 2. Faisceaux laser et distances numériques exactes
    for (let i = 0; i < this.rays.length; i++) {
      const hit = this.sensorHits[i];
      const d = Math.round(this.sensorDists[i] || this.sight);
      if (hit) {
        const isCritical = (d < 25);
        fill(isCritical ? color(239, 68, 68) : color(0, 240, 255));
        noStroke();
        ellipse(hit.x, hit.y, 6, 6);

        fill(255, 255, 255);
        textFont('JetBrains Mono');
        textSize(8.5);
        textAlign(CENTER, BOTTOM);
        text(`${d}px`, hit.x, hit.y - 3);
      }
    }

    // 3. Décomposition des forces de pilotage de Reynolds (Flèches colorées avec libellés)
    const drawForceVector = (vec, col, label, scale = 110) => {
      if (!vec) return;
      const mag = Math.hypot(vec.x, vec.y);
      if (mag < 0.005) return;
      const len = Math.min(45, mag * scale);
      const angle = Math.atan2(vec.y, vec.x);
      const endX = this.pos.x + Math.cos(angle) * len;
      const endY = this.pos.y + Math.sin(angle) * len;

      stroke(col);
      strokeWeight(2.4);
      line(this.pos.x, this.pos.y, endX, endY);
      noStroke();
      fill(col);
      textFont('Orbitron');
      textSize(8);
      textAlign(LEFT, CENTER);
      text(label, endX + 4, endY);
    };

    drawForceVector(this.debugSeekForce, color(0, 240, 255), 'SEEK');
    drawForceVector(this.debugSepForce, color(236, 72, 153), 'SEP');
    drawForceVector(this.debugAvoidForce, color(245, 158, 11), 'AVOID');

    // 4. Badge télémétrique flottant au-dessus du bolide
    const badgeW = 95;
    const badgeH = 16;
    fill(6, 14, 25, 230);
    stroke(16, 185, 129, 210);
    strokeWeight(1.2);
    rect(this.pos.x - badgeW / 2, this.pos.y - 30, badgeW, badgeH, 3);
    noStroke();
    fill(255, 255, 255);
    textFont('Orbitron');
    textSize(7.5);
    textAlign(CENTER, CENTER);
    text(`#${this.carNumber || 1} · ${(this.speed || 0).toFixed(1)} px/f · CP ${this.index}`, this.pos.x, this.pos.y - 22);

    pop();
  }
}
