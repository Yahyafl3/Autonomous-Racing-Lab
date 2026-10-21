// ==========================================================================
// AUTONOMOUS RACING LAB — MODULE DES CIRCUITS DE COURSE OFFICIELS
// 5 Circuits Authentiques : Côtier, Désertique, Forestier, Urbain & Compétition
// Géométrie agrandie, tracés allongés, chaussée élargie & zones multivoies de dépassement
// ==========================================================================

const CIRCUITS = [
  {
    id: 'coastal',
    stageNumber: 1,
    name: 'Circuit Pro Grand Prix',
    type: 'competition',
    stars: '★☆☆☆☆',
    targetLaps: 3,
    pathWidth: 92,
    baseWidth: 92,
    wideWidth: 128,
    wideSections: [[52, 14], [28, 40]],
    bgPath: 'assets/tracks/bg_coastal.jpg',
    ambientColor: '#0d1b14',
    theme: {
      primaryColor: '#00D084',
      asphaltColor: '#171e28',
      wallColor: '#00D084',
      curbPrimary: '#dc2626',
      curbSecondary: '#f8fafc',
      gravelColor: '#c8a35e'
    },
    description: 'Complexe automobile professionnel moderne : immense ligne droite des stands multivoies, courbe parabolique fluide et chicanes rapides.',
    generate(w, h, count = 60) {
      const COASTAL_WAYPOINTS = [
        // 1. Ligne droite des stands (Main Straight - Official Start/Finish Line facing East)
        { u: 0.660, v: 0.660 }, // Start / Finish Line
        { u: 0.730, v: 0.662 },
        { u: 0.785, v: 0.664 },

        // 2. Virage 1 & Virage 2 (Courbe Est en montée vers le carrousel)
        { u: 0.825, v: 0.635 },
        { u: 0.844, v: 0.575 },
        { u: 0.840, v: 0.490 },
        { u: 0.820, v: 0.400 },
        { u: 0.795, v: 0.300 },
        { u: 0.768, v: 0.220 },

        // 3. Épingle Nord-Est (Grand virage parabolique en haut à droite)
        { u: 0.742, v: 0.170 },
        { u: 0.705, v: 0.145 },
        { u: 0.665, v: 0.175 },

        // 4. Enchaînement des Esses / Descente vers le centre
        { u: 0.630, v: 0.235 },
        { u: 0.590, v: 0.305 },
        { u: 0.545, v: 0.355 },
        { u: 0.495, v: 0.345 },

        // 5. Chicane Nord et passage forestier
        { u: 0.445, v: 0.300 },
        { u: 0.395, v: 0.260 },
        { u: 0.340, v: 0.245 },
        { u: 0.280, v: 0.255 },

        // 6. Grand Carrousel Ouest (Courbe parabolique autour du paddock Ouest)
        { u: 0.225, v: 0.295 },
        { u: 0.175, v: 0.370 },
        { u: 0.142, v: 0.470 },
        { u: 0.135, v: 0.575 },
        { u: 0.155, v: 0.675 },
        { u: 0.195, v: 0.745 },

        // 7. Raccordement et entrée ligne droite des stands
        { u: 0.245, v: 0.715 },
        { u: 0.295, v: 0.680 },
        { u: 0.360, v: 0.665 },
        { u: 0.450, v: 0.662 },
        { u: 0.540, v: 0.660 },
        { u: 0.600, v: 0.660 }
      ];

      const N = COASTAL_WAYPOINTS.length;
      const pts = [];
      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.44;
      const ry = h * 0.40;

      for (let i = 0; i < count; i++) {
        const t = (i / count) * N;
        const p1Idx = Math.floor(t) % N;
        const p0Idx = (p1Idx - 1 + N) % N;
        const p2Idx = (p1Idx + 1) % N;
        const p3Idx = (p1Idx + 2) % N;
        const frac = t - Math.floor(t);

        const p0 = COASTAL_WAYPOINTS[p0Idx];
        const p1 = COASTAL_WAYPOINTS[p1Idx];
        const p2 = COASTAL_WAYPOINTS[p2Idx];
        const p3 = COASTAL_WAYPOINTS[p3Idx];

        const frac2 = frac * frac;
        const frac3 = frac2 * frac;

        const u = 0.5 * (
          (2 * p1.u) +
          (-p0.u + p2.u) * frac +
          (2 * p0.u - 5 * p1.u + 4 * p2.u - p3.u) * frac2 +
          (-p0.u + 3 * p1.u - 3 * p2.u + p3.u) * frac3
        );

        const v = 0.5 * (
          (2 * p1.v) +
          (-p0.v + p2.v) * frac +
          (2 * p0.v - 5 * p1.v + 4 * p2.v - p3.v) * frac2 +
          (-p0.v + 3 * p1.v - 3 * p2.v + p3.v) * frac3
        );

        pts.push({
          x: cx + ((u - 0.4895) / 0.355) * rx,
          y: cy + ((v - 0.4450) / 0.300) * ry
        });
      }
      return pts;
    }
  },
  {
    id: 'desert',
    stageNumber: 2,
    name: 'Mojave Canyon Raceway',
    type: 'desert',
    stars: '★★☆☆☆',
    targetLaps: 5,
    pathWidth: 90,
    baseWidth: 90,
    wideWidth: 130,
    wideSections: [[53, 14], [25, 36]],
    bgPath: 'assets/tracks/bg_desert.jpg',
    ambientColor: '#2b1308',
    theme: {
      primaryColor: '#ff8800',
      asphaltColor: '#1c1512',
      wallColor: '#ff8800',
      curbPrimary: '#f59e0b',
      curbSecondary: '#fef3c7',
      gravelColor: '#b45309'
    },
    description: 'Immense gorge désertique avec longue ligne droite de pointe à 3 voies, virages relevés et épingle de dépassement.',
    generate(w, h, count = 60) {
      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.45;
      const ry = h * 0.39;
      const pts = [];
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        // Tracé canyon étiré longue portée avec épingle sud élargie et switchbacks nord
        const rMod = 0.94
          + 0.34 * Math.cos(theta * 2)
          - 0.16 * Math.sin(theta * 3)
          + 0.09 * Math.cos(theta * 5);
        const x = cx + Math.cos(theta) * rx * rMod;
        const y = cy + Math.sin(theta) * ry * rMod;
        pts.push({ x, y });
      }
      return pts;
    }
  },
  {
    id: 'forest',
    stageNumber: 3,
    name: 'Schwarzwald GP',
    type: 'forest',
    stars: '★★★☆☆',
    targetLaps: 7,
    pathWidth: 88,
    baseWidth: 88,
    wideWidth: 124,
    wideSections: [[54, 11], [30, 40]],
    bgPath: 'assets/tracks/bg_forest.jpg',
    ambientColor: '#08160e',
    theme: {
      primaryColor: '#10b981',
      asphaltColor: '#131916',
      wallColor: '#10b981',
      curbPrimary: '#16a34a',
      curbSecondary: '#f8fafc',
      gravelColor: '#78716c'
    },
    description: 'Grand circuit alpin à travers la forêt noire, carrousel ondulant, enchaînement d’esses et chicane de descente.',
    generate(w, h, count = 60) {
      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.43;
      const ry = h * 0.40;
      const pts = [];
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        // Tracé forestier asymétrique ondulant avec carrousel et chicanes rapides
        const rMod = 0.95
          + 0.21 * Math.cos(theta * 3)
          + 0.17 * Math.sin(theta * 2)
          - 0.13 * Math.cos(theta * 4)
          + 0.07 * Math.sin(theta * 5);
        const x = cx + Math.cos(theta) * rx * rMod;
        const y = cy + Math.sin(theta) * ry * rMod;
        pts.push({ x, y });
      }
      return pts;
    }
  },
  {
    id: 'urban',
    stageNumber: 4,
    name: 'Marina Bay Urban Circuit',
    type: 'urban',
    stars: '★★★★☆',
    targetLaps: 10,
    pathWidth: 88,
    baseWidth: 88,
    wideWidth: 126,
    wideSections: [[53, 13], [31, 41]],
    bgPath: 'assets/tracks/bg_urban.jpg',
    ambientColor: '#07101e',
    theme: {
      primaryColor: '#06b6d4',
      asphaltColor: '#0e1726',
      wallColor: '#06b6d4',
      curbPrimary: '#0284c7',
      curbSecondary: '#f8fafc',
      gravelColor: '#475569'
    },
    description: 'Tracé urbain grandiose : grands boulevards multivoies, virages à 90°, pont architectural et chicane du port.',
    generate(w, h, count = 60) {
      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.44;
      const ry = h * 0.38;
      const pts = [];
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        // Tracé urbain GP Marina Bay fluide et spectaculaire :
        // Grands boulevards multivoies, virages 90° à courbure progressive, esplanade du port
        const rMod = 0.94
          + 0.15 * Math.cos(theta)
          + 0.16 * Math.cos(theta * 2)
          - 0.09 * Math.sin(theta * 3)
          + 0.05 * Math.cos(theta * 4);
        const x = cx + Math.cos(theta) * rx * rMod;
        const y = cy + Math.sin(theta) * ry * rMod;
        pts.push({ x, y });
      }
      return pts;
    }
  },
  {
    id: 'competition',
    stageNumber: 5,
    name: 'Silverstone Grand Prix',
    type: 'competition',
    stars: '★★★★★',
    targetLaps: 15,
    pathWidth: 95,
    baseWidth: 95,
    wideWidth: 132,
    wideSections: [[52, 14], [26, 38]],
    bgPath: 'assets/tracks/bg_competition.jpg',
    ambientColor: '#0a141e',
    theme: {
      primaryColor: '#f59e0b',
      asphaltColor: '#171b26',
      wallColor: '#f59e0b',
      curbPrimary: '#dc2626',
      curbSecondary: '#ffffff',
      gravelColor: '#d97706'
    },
    description: 'Le temple FIA de la vitesse : immense ligne droite des stands à 3 voies, Esses rapides de Maggots et courbe Parabolique.',
    generate(w, h, count = 60) {
      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.46;
      const ry = h * 0.40;
      const pts = [];
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        // Tracé FIA Grand Prix professionnel : Hamilton Straight, Maggots/Becketts, Wellington et Stowe
        const rMod = 0.96
          + 0.27 * Math.cos(theta)
          - 0.19 * Math.sin(theta * 2)
          + 0.17 * Math.cos(theta * 3)
          - 0.09 * Math.sin(theta * 4)
          + 0.05 * Math.cos(theta * 5);
        const x = cx + Math.cos(theta) * rx * rMod;
        const y = cy + Math.sin(theta) * ry * rMod;
        pts.push({ x, y });
      }
      return pts;
    }
  }
];

// Gestionnaire global des circuits
const CircuitRegistry = {
  circuits: CIRCUITS,
  activeCircuitId: 'coastal',
  loadedImages: {},

  init() {
    this.activeCircuitId = CIRCUITS[0].id;
  },

  getActive() {
    const found = this.circuits.find(c => c.id === this.activeCircuitId);
    return found || this.circuits[0];
  },

  getById(id) {
    return this.circuits.find(c => c.id === id) || null;
  },

  getByIndex(idx) {
    if (idx < 0 || idx >= this.circuits.length) return this.circuits[0];
    return this.circuits[idx];
  },

  selectCircuit(idOrIndex) {
    let target = null;
    if (typeof idOrIndex === 'number') {
      target = this.getByIndex(idOrIndex);
    } else if (typeof idOrIndex === 'string') {
      target = this.getById(idOrIndex);
    }
    if (target) {
      this.activeCircuitId = target.id;
      return target;
    }
    return this.getActive();
  },

  // Préchargement asynchrone des images de fond des circuits
  preloadBackgrounds() {
    if (typeof loadImage !== 'function') return;
    for (const c of this.circuits) {
      if (c.bgPath && !this.loadedImages[c.id]) {
        loadImage(c.bgPath, (img) => {
          this.loadedImages[c.id] = img;
        }, (err) => {
          console.warn(`Fallback image circuit ${c.id}:`, err);
        });
      }
    }
  },

  getActiveBackground() {
    const active = this.getActive();
    return this.loadedImages[active.id] || null;
  },

  // Calcul d'une largeur de piste progressive avec sections multivoies et transitions lissées
  getWidthAt(circuit, i, total = 60) {
    const baseW = circuit.baseWidth || circuit.pathWidth || 88;
    const wideW = circuit.wideWidth || Math.round(baseW * 1.38);
    const wideSections = circuit.wideSections || [[54, 12], [28, 38]];
    const taper = 4; // 4 checkpoints de transition douce

    let maxBlend = 0;
    for (const [s, e] of wideSections) {
      const inSection = (s <= e) ? (i >= s && i <= e) : (i >= s || i <= e);
      if (inSection) {
        maxBlend = 1;
        break;
      }
      const dStart = Math.min((i - s + total) % total, (s - i + total) % total);
      const dEnd = Math.min((i - e + total) % total, (e - i + total) % total);
      const dMin = Math.min(dStart, dEnd);
      if (dMin <= taper) {
        const b = 0.5 * (1 + Math.cos((dMin / taper) * Math.PI));
        if (b > maxBlend) maxBlend = b;
      }
    }
    return baseW + (wideW - baseW) * maxBlend;
  },

  // Génération complète et normalisée du circuit (checkpoints, inside, outside, walls)
  build(circuit, canvasW, canvasH) {
    const targetCircuit = (typeof circuit === 'string') ? (this.getById(circuit) || this.getActive()) : (circuit || this.getActive());
    const w = (typeof canvasW === 'number' && canvasW > 200) ? canvasW : 1850;
    const h = (typeof canvasH === 'number' && canvasH > 200) ? canvasH : 1080;
    const total = 60;

    const rawPoints = targetCircuit.generate(w, h, total);

    // Lissage par spline / moyenne glissante fermée — 3 passes (Req 1.6)
    let smoothed = rawPoints.slice();
    for (let pass = 0; pass < 3; pass++) {
      const next = [];
      for (let i = 0; i < total; i++) {
        const prev = smoothed[(i - 1 + total) % total];
        const curr = smoothed[i];
        const nxt = smoothed[(i + 1) % total];
        next.push({
          x: prev.x * 0.22 + curr.x * 0.56 + nxt.x * 0.22,
          y: prev.y * 0.22 + curr.y * 0.56 + nxt.y * 0.22
        });
      }
      smoothed = next;
    }

    const checkpoints = [];
    const inside = [];
    const outside = [];
    const BoundaryClass = (typeof Boundary !== 'undefined') ? Boundary : function(x1, y1, x2, y2) {
      this.a = { x: x1, y: y1 };
      this.b = { x: x2, y: y2 };
      this.midpoint = () => ({ x: (this.a.x + this.b.x) / 2, y: (this.a.y + this.b.y) / 2 });
    };

    const VectorCreator = (typeof createVector === 'function') ? createVector : (x, y) => ({ x, y });

    for (let i = 0; i < total; i++) {
      const prev = smoothed[(i - 1 + total) % total];
      const next = smoothed[(i + 1) % total];
      const curr = smoothed[i];

      // Vecteur tangent unitaire
      const tx = next.x - prev.x;
      const ty = next.y - prev.y;
      const tLen = Math.hypot(tx, ty) || 1;
      const utx = tx / tLen;
      const uty = ty / tLen;

      // Vecteur normal orthogonal orienté vers l'extérieur
      const nx = uty;
      const ny = -utx;

      const trackWidth = this.getWidthAt(targetCircuit, i, total);
      const halfWidth = trackWidth / 2;

      const inX = curr.x - nx * halfWidth;
      const inY = curr.y - ny * halfWidth;
      const outX = curr.x + nx * halfWidth;
      const outY = curr.y + ny * halfWidth;

      const cp = new BoundaryClass(inX, inY, outX, outY);
      cp.trackWidth = trackWidth;
      checkpoints.push(cp);
      inside.push(VectorCreator(inX, inY));
      outside.push(VectorCreator(outX, outY));
    }

    // Murs physiques infranchissables
    const walls = [];
    for (let i = 0; i < total; i++) {
      const next = (i + 1) % total;
      walls.push(new BoundaryClass(inside[i].x, inside[i].y, inside[next].x, inside[next].y));
      walls.push(new BoundaryClass(outside[i].x, outside[i].y, outside[next].x, outside[next].y));
    }

    const start = checkpoints[0].midpoint();
    const end = checkpoints[total - 1].midpoint();
    const nextMid = checkpoints[1].midpoint();
    const startHeading = Math.atan2(nextMid.y - start.y, nextMid.x - start.x);

    return {
      circuit: targetCircuit,
      checkpoints,
      inside,
      outside,
      walls,
      start,
      end,
      startHeading
    };
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.CIRCUITS = CIRCUITS;
  globalThis.CircuitRegistry = CircuitRegistry;
}
