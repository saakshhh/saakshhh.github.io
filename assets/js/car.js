/* Procedural 2020s-style F1 car, built to real-world scale (metres).
   Nose points to +Z, the car's right side is +X, the ground is y = 0. */
import * as THREE from 'three';
import { canvasTexture } from './engine.js';

const PAL = { ink: '#0e0f24', navy: '#141947', red: '#ff3d2e', ice: '#a9b4ff', sodium: '#ffb547', chalk: '#f2efe8' };

/* ─────────── materials ─────────── */
let _carbonTex = null;
export function carbonTexture() {
  if (_carbonTex) return _carbonTex;
  _carbonTex = canvasTexture(256, 256, (g, w) => {
    const n = 16, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const twill = ((x + y) >> 1) % 2 === 0;               // 2x2 twill weave
      const gr = twill ? g.createLinearGradient(x * s, y * s, x * s + s, y * s)
                       : g.createLinearGradient(x * s, y * s, x * s, y * s + s);
      gr.addColorStop(0, '#0d0e12'); gr.addColorStop(0.5, twill ? '#2a2c34' : '#202228'); gr.addColorStop(1, '#0d0e12');
      g.fillStyle = gr; g.fillRect(x * s, y * s, s, s);
    }
  }, { repeat: [6, 6] });
  return _carbonTex;
}

export function makeMaterials() {
  const carbon = new THREE.MeshPhysicalMaterial({
    map: carbonTexture(), color: 0xffffff, metalness: 0.25, roughness: 0.38,
    clearcoat: 0.9, clearcoatRoughness: 0.12,
  });
  const carbonMatte = new THREE.MeshStandardMaterial({ map: carbonTexture(), color: 0x9a9aa0, metalness: 0.1, roughness: 0.7 });
  const paint = new THREE.MeshPhysicalMaterial({
    color: PAL.navy, metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03,
  });
  const red = new THREE.MeshPhysicalMaterial({ color: PAL.red, metalness: 0.2, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04 });
  const ice = new THREE.MeshPhysicalMaterial({ color: PAL.ice, metalness: 0.3, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 });
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x141416, metalness: 0, roughness: 0.82, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color(0x30303a) });
  const rim = new THREE.MeshStandardMaterial({ color: 0x1b1c22, metalness: 0.85, roughness: 0.32 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc9ccd6, metalness: 1, roughness: 0.22 });
  const black = new THREE.MeshStandardMaterial({ color: 0x050507, metalness: 0, roughness: 0.9 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a0b12, metalness: 0.9, roughness: 0.04, clearcoat: 1 });
  const sodium = new THREE.MeshPhysicalMaterial({ color: PAL.sodium, metalness: 0.2, roughness: 0.35, clearcoat: 1 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf2efe8, metalness: 0.1, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
  const rainLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.05, 0.03).multiplyScalar(6), toneMapped: false });
  return { carbon, carbonMatte, paint, red, ice, rubber, rim, metal, black, glass, sodium, white, rainLight };
}

/* ─────────── geometry helpers ─────────── */
const cr = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

/* Loft a smooth body through superellipse cross-sections.
   Each key: { z, w (half width), yb (bottom), yt (top), n (top squareness), nb (bottom squareness) } */
export function loft(keys, { rings = 90, segs = 48, capStart = true, capEnd = true } = {}) {
  const K = keys.length, sampled = [];
  for (let i = 0; i < rings; i++) {
    const f = (i / (rings - 1)) * (K - 1);
    const k = Math.min(Math.floor(f), K - 2), t = f - k;
    const a = keys[Math.max(k - 1, 0)], b = keys[k], c = keys[k + 1], d = keys[Math.min(k + 2, K - 1)];
    const s = {};
    for (const p of ['z', 'w', 'yb', 'yt', 'n', 'nb', 'x']) {
      const g = (o) => (o[p] ?? (p === 'nb' ? (o.n ?? 3) : p === 'n' ? 3 : 0));
      s[p] = cr(g(a), g(b), g(c), g(d), t);
    }
    sampled.push(s);
  }
  const pos = [], uv = [], idx = [];
  let len = 0; const vs = [0];
  for (let i = 1; i < rings; i++) { len += Math.abs(sampled[i].z - sampled[i - 1].z); vs.push(len); }
  for (let i = 0; i < rings; i++) {
    const s = sampled[i], cy = (s.yt + s.yb) / 2, h = (s.yt - s.yb) / 2;
    for (let j = 0; j <= segs; j++) {
      const th = -Math.PI / 2 + (j / segs) * Math.PI * 2;
      const c = Math.cos(th), sn = Math.sin(th);
      const n = sn >= 0 ? s.n : s.nb;
      const x = s.x + s.w * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = cy + h * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      pos.push(x, y, s.z);
      uv.push(vs[i] / len, j / segs);
    }
  }
  const row = segs + 1;
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < segs; j++) {
    const a = i * row + j, b = a + row;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const addCap = (ring, flip) => {
    const s = sampled[ring], ci = pos.length / 3;
    pos.push(s.x, (s.yt + s.yb) / 2, s.z); uv.push(ring ? 1 : 0, 0.5);
    for (let j = 0; j < segs; j++) {
      const a = ring * row + j;
      flip ? idx.push(ci, a + 1, a) : idx.push(ci, a, a + 1);
    }
  };
  if (capStart) addCap(0, sampled[0].z < sampled[1].z);
  if (capEnd) addCap(rings - 1, sampled[rings - 1].z < sampled[rings - 2].z);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* NACA-style cambered airfoil, extruded along X (span). Leading edge at z = 0, chord runs to -Z. */
export function wingElement({ chord, span, thick = 0.1, camber = -0.05, aoa = 0, taper = 1, lift = 0, sweep = 0 }) {
  const shape = new THREE.Shape(), N = 28, up = [], lo = [];
  for (let i = 0; i <= N; i++) {
    const t = (1 - Math.cos((i / N) * Math.PI)) / 2;
    const yt = 5 * thick * (0.2969 * Math.sqrt(t) - 0.126 * t - 0.3516 * t * t + 0.2843 * t ** 3 - 0.1036 * t ** 4);
    const yc = camber * 4 * t * (1 - t);
    up.push([t * chord, (yc + yt) * chord]); lo.push([t * chord, (yc - yt) * chord]);
  }
  const ca = Math.cos(aoa), sa = Math.sin(aoa);
  const rot = ([x, y]) => [x * ca - y * sa, x * sa + y * ca];
  const pts = [...up.map(rot), ...lo.reverse().slice(1, -1).map(rot)];
  shape.moveTo(...pts[0]); pts.slice(1).forEach((p) => shape.lineTo(...p));
  const g = new THREE.ExtrudeGeometry(shape, { depth: span, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -span / 2);
  g.rotateY(Math.PI / 2); // chord → -Z, span → X
  if (taper !== 1) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 - (1 - taper) * Math.abs(p.getX(i)) / (span / 2); p.setZ(i, p.getZ(i) * k); p.setY(i, p.getY(i) * k); }
    g.computeVertexNormals();
  }
  if (lift || sweep) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = (p.getX(i) / (span / 2)) ** 2; p.setY(i, p.getY(i) + lift * k); p.setZ(i, p.getZ(i) - sweep * k); }
    g.computeVertexNormals();
  }
  return g;
}

/* Thin strut between two points (suspension arms, pushrods). */
const _up = new THREE.Vector3(0, 1, 0);
export function strut(a, b, r, mat, flat = 1) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = new THREE.Vector3().subVectors(B, A), L = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 10), mat);
  m.scale.set(1, 1, flat);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(_up, d.normalize());
  m.castShadow = true;
  return m;
}

/* Sidewall graphics: compound band + text around the tyre. */
const _sidewalls = {};
function sidewallTexture(color, label) {
  const key = color + label;
  if (_sidewalls[key]) return _sidewalls[key];
  const t = canvasTexture(1024, 1024, (g, S) => {
    g.clearRect(0, 0, S, S);
    const c = S / 2;
    g.lineWidth = S * 0.028; g.strokeStyle = color;
    g.beginPath(); g.arc(c, c, S * 0.43, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(242,239,232,0.92)';
    g.font = `700 ${S * 0.04}px "Unbounded", Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 0; k < 2; k++) {
      const chars = label.split(''), r = S * 0.475, spread = 0.055;
      const start = k * Math.PI - ((chars.length - 1) * spread) / 2;
      chars.forEach((ch, i) => {
        const a = start + i * spread;
        g.save(); g.translate(c + Math.cos(a - Math.PI / 2) * r, c + Math.sin(a - Math.PI / 2) * r);
        g.rotate(a); g.fillText(ch, 0, 0); g.restore();
      });
    }
  });
  _sidewalls[key] = t; return t;
}

/* A complete wheel: slick tyre, rim, aero cover, wheel nut. Axis = X. */
export function buildWheel(M, { radius = 0.36, width = 0.3, rimR = 0.235, compound = PAL.red, label = 'SOFT  SLICK  18', outward = 1 } = {}) {
  const g = new THREE.Group();
  const hw = width / 2, R = radius;
  const prof = [
    [rimR - 0.004, -hw * 0.86], [rimR + 0.02, -hw], [R - 0.05, -hw - 0.006], [R - 0.022, -hw + 0.004],
    [R - 0.006, -hw + 0.026], [R, -hw + 0.06], [R + 0.002, 0], [R, hw - 0.06], [R - 0.006, hw - 0.026],
    [R - 0.022, hw - 0.004], [R - 0.05, hw + 0.006], [rimR + 0.02, hw], [rimR - 0.004, hw * 0.86],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const tyreGeo = new THREE.LatheGeometry(prof, 96);
  tyreGeo.rotateZ(Math.PI / 2);
  const tyre = new THREE.Mesh(tyreGeo, M.rubber); tyre.castShadow = tyre.receiveShadow = true; g.add(tyre);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, width * 0.84, 64, 1, true), M.rim);
  rim.rotation.z = Math.PI / 2; g.add(rim);

  // aero wheel cover (outer face) and inner barrel face
  const cover = new THREE.Mesh(new THREE.CircleGeometry(rimR + 0.002, 64), M.carbon);
  cover.position.x = outward * (hw * 0.86); cover.rotation.y = outward * Math.PI / 2; g.add(cover);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(rimR, 48), M.black);
  inner.position.x = -outward * (hw * 0.8); inner.rotation.y = -outward * Math.PI / 2; g.add(inner);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(rimR - 0.01, 0.008, 8, 64), M.metal);
  ring.position.x = outward * (hw * 0.86); ring.rotation.y = Math.PI / 2; g.add(ring);

  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.05, 6), M.sodium);
  nut.rotation.z = Math.PI / 2; nut.position.x = outward * (hw * 0.86 + 0.02); g.add(nut);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 16), M.metal);
  pin.rotation.z = Math.PI / 2; pin.position.x = outward * (hw * 0.86 + 0.03); g.add(pin);

  // sidewall decal on both faces
  const sw = new THREE.MeshStandardMaterial({ map: sidewallTexture(compound, label), transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  [1, -1].forEach((s) => {
    const d = new THREE.Mesh(new THREE.RingGeometry(rimR + 0.02, R - 0.012, 96), sw);
    d.position.x = s * (hw + 0.0065); d.rotation.y = s * Math.PI / 2; g.add(d);
  });
  g.userData.radius = R;
  return g;
}

/* ─────────── livery textures ─────────── */
function spineLivery() {
  // x = along the body (0 = nose tip → 1 = gearbox), y = around the section (0.5 = top)
  return canvasTexture(2048, 512, (g, W, H) => {
    g.fillStyle = PAL.navy; g.fillRect(0, 0, W, H);
    // red spine stripe along the top, flaring on the nose and engine cover
    g.fillStyle = PAL.red;
    g.beginPath();
    g.moveTo(0, H * 0.4); g.bezierCurveTo(W * 0.2, H * 0.43, W * 0.3, H * 0.455, W * 0.42, H * 0.47);
    g.lineTo(W * 0.42, H * 0.53); g.bezierCurveTo(W * 0.3, H * 0.545, W * 0.2, H * 0.57, 0, H * 0.6);
    g.fill();
    g.beginPath();
    g.moveTo(W * 0.55, H * 0.47); g.bezierCurveTo(W * 0.7, H * 0.42, W * 0.85, H * 0.4, W, H * 0.38);
    g.lineTo(W, H * 0.62); g.bezierCurveTo(W * 0.85, H * 0.6, W * 0.7, H * 0.58, W * 0.55, H * 0.53);
    g.fill();
    // periwinkle pinstripes either side
    g.strokeStyle = PAL.ice; g.lineWidth = 5;
    [[0.395, 0.468], [0.605, 0.532]].forEach(([a, b]) => {
      g.beginPath(); g.moveTo(0, H * a); g.bezierCurveTo(W * 0.2, H * (a + (b - a) * 0.3), W * 0.3, H * (a + (b - a) * 0.6), W * 0.42, H * b); g.stroke();
    });
    // race number on the nose
    g.save(); g.translate(W * 0.2, H * 0.5); g.rotate(Math.PI / 2);
    g.fillStyle = PAL.chalk; g.font = `900 ${H * 0.09}px "Unbounded", Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('27', 0, 0); g.restore();
    // underside darker
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, H * 0.12); g.fillRect(0, H * 0.88, W, H * 0.12);
  });
}
function podLivery() {
  return canvasTexture(1024, 512, (g, W, H) => {
    g.fillStyle = PAL.navy; g.fillRect(0, 0, W, H);
    // sweeping red flash rising toward the rear on both flanks (y≈0.25 and 0.75 are the sides)
    [[0.25, 1], [0.75, -1]].forEach(([c, s]) => {
      g.fillStyle = PAL.red;
      g.beginPath();
      g.moveTo(0, H * (c - 0.02 * s)); g.bezierCurveTo(W * 0.35, H * (c + 0.0 * s), W * 0.6, H * (c + 0.12 * s), W, H * (c + 0.2 * s));
      g.lineTo(W, H * (c + 0.26 * s)); g.bezierCurveTo(W * 0.6, H * (c + 0.2 * s), W * 0.35, H * (c + 0.1 * s), 0, H * (c + 0.06 * s));
      g.fill();
      g.strokeStyle = PAL.ice; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, H * (c - 0.045 * s)); g.bezierCurveTo(W * 0.35, H * (c - 0.025 * s), W * 0.6, H * (c + 0.09 * s), W, H * (c + 0.17 * s)); g.stroke();
    });
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, W, H * 0.08); g.fillRect(0, H * 0.92, W, H * 0.08);
  });
}

/* ─────────── the car ─────────── */
export function buildCar({ materials } = {}) {
  const M = materials || makeMaterials();
  const car = new THREE.Group();
  const body = new THREE.Group(); car.add(body);
  const add = (mesh, parent = body) => { mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; };

  const spineMat = M.paint.clone(); spineMat.map = spineLivery(); spineMat.color.set(0xffffff);
  const podMat = M.paint.clone(); podMat.map = podLivery(); podMat.color.set(0xffffff);

  // monocoque, nose and engine cover
  add(new THREE.Mesh(loft([
    { z: 2.98, w: 0.065, yb: 0.1, yt: 0.2, n: 2.2, nb: 2.6 },
    { z: 2.6, w: 0.1, yb: 0.11, yt: 0.29, n: 2.4, nb: 3 },
    { z: 2.1, w: 0.135, yb: 0.15, yt: 0.4, n: 2.6, nb: 3 },
    { z: 1.55, w: 0.18, yb: 0.17, yt: 0.5, n: 2.8, nb: 3.5 },
    { z: 1.0, w: 0.24, yb: 0.12, yt: 0.59, n: 3, nb: 4 },
    { z: 0.5, w: 0.29, yb: 0.07, yt: 0.645, n: 3.2, nb: 5 },
    { z: 0.0, w: 0.33, yb: 0.06, yt: 0.67, n: 3.2, nb: 5 },
    { z: -0.38, w: 0.3, yb: 0.06, yt: 0.7, n: 2.6, nb: 5 },
    { z: -0.7, w: 0.2, yb: 0.08, yt: 0.97, n: 2.2, nb: 5 },
    { z: -1.05, w: 0.18, yb: 0.1, yt: 0.9, n: 2.2, nb: 4 },
    { z: -1.55, w: 0.15, yb: 0.12, yt: 0.72, n: 2.4, nb: 4 },
    { z: -2.0, w: 0.12, yb: 0.15, yt: 0.56, n: 2.6, nb: 4 },
    { z: -2.38, w: 0.08, yb: 0.2, yt: 0.44, n: 2.6, nb: 3 },
  ], { rings: 120, segs: 56 }), spineMat));

  // sidepods with undercut and downwash ramp
  add(new THREE.Mesh(loft([
    { z: 0.62, w: 0.74, yb: 0.13, yt: 0.52, n: 4.5, nb: 3 },
    { z: 0.45, w: 0.8, yb: 0.11, yt: 0.56, n: 4, nb: 2.6 },
    { z: 0.05, w: 0.79, yb: 0.12, yt: 0.555, n: 3.6, nb: 2.4 },
    { z: -0.45, w: 0.72, yb: 0.12, yt: 0.52, n: 3.2, nb: 2.4 },
    { z: -1.0, w: 0.54, yb: 0.12, yt: 0.44, n: 2.8, nb: 2.6 },
    { z: -1.55, w: 0.33, yb: 0.13, yt: 0.36, n: 2.6, nb: 2.6 },
    { z: -2.05, w: 0.17, yb: 0.15, yt: 0.31, n: 2.4, nb: 2.4 },
  ], { rings: 70, segs: 56 }), podMat));
  // sidepod inlets (dark mouths on the front face)
  [1, -1].forEach((s) => {
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.2), M.black);
    mouth.position.set(s * 0.56, 0.42, 0.624); add(mouth);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.018, 0.05), M.carbon);
    lip.position.set(s * 0.56, 0.31, 0.63); add(lip);
  });

  // cockpit opening, headrest and driver helmet
  const opening = new THREE.Mesh(new THREE.CircleGeometry(1, 48), M.black);
  opening.scale.set(0.24, 0.5, 1); opening.rotation.x = -Math.PI / 2 - 0.03; opening.position.set(0, 0.675, 0.02); add(opening);
  const rimC = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 10, 60), M.carbon);
  rimC.scale.set(0.245, 0.51, 1); rimC.rotation.x = -Math.PI / 2 - 0.03; rimC.position.set(0, 0.675, 0.02); add(rimC);
  const helmetMat = M.white.clone();
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.135, 40, 28), helmetMat);
  helmet.scale.set(0.95, 1, 1.12); helmet.position.set(0, 0.79, -0.2); add(helmet);
  const helmetStripe = new THREE.Mesh(new THREE.SphereGeometry(0.137, 40, 28, 0, Math.PI * 2, 0.55, 0.22), M.red);
  helmetStripe.scale.copy(helmet.scale); helmetStripe.position.copy(helmet.position); add(helmetStripe);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.138, 40, 20, -Math.PI * 0.32, Math.PI * 0.64, 1.1, 0.42), M.glass);
  visor.scale.copy(helmet.scale); visor.position.copy(helmet.position); visor.rotation.y = 0; add(visor);
  const headrest = new THREE.Mesh(loft([
    { z: -0.08, w: 0.27, yb: 0.6, yt: 0.66, n: 3 }, { z: -0.3, w: 0.28, yb: 0.6, yt: 0.73, n: 3 }, { z: -0.45, w: 0.24, yb: 0.6, yt: 0.72, n: 3 },
  ], { rings: 12, segs: 24 }), M.black); add(headrest);

  // halo
  const haloCurve = new THREE.CatmullRomCurve3([
    [0.29, 0.68, -0.52], [0.31, 0.86, -0.36], [0.27, 0.93, -0.06], [0.14, 0.95, 0.2], [0, 0.955, 0.27],
    [-0.14, 0.95, 0.2], [-0.27, 0.93, -0.06], [-0.31, 0.86, -0.36], [-0.29, 0.68, -0.52],
  ].map((p) => new THREE.Vector3(...p)));
  add(new THREE.Mesh(new THREE.TubeGeometry(haloCurve, 90, 0.026, 14, false), M.paint));
  const pillarCurve = new THREE.CatmullRomCurve3([[0, 0.955, 0.27], [0, 0.85, 0.42], [0, 0.66, 0.52]].map((p) => new THREE.Vector3(...p)));
  const pillar = add(new THREE.Mesh(new THREE.TubeGeometry(pillarCurve, 20, 0.028, 12, false), M.paint));
  pillar.scale.x = 0.7;

  // airbox intake + roll hoop camera
  const intake = new THREE.Mesh(new THREE.CircleGeometry(1, 32), M.black);
  intake.scale.set(0.085, 0.07, 1); intake.position.set(0, 0.86, -0.5); intake.rotation.x = -0.35; add(intake);
  const tcam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.07), M.sodium);
  tcam.position.set(0, 0.99, -0.72); add(tcam);
  // engine cover fin
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0.85); finShape.lineTo(0, 0.99); finShape.quadraticCurveTo(0.5, 0.97, 1.4, 0.86); finShape.lineTo(1.4, 0.5); finShape.closePath();
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.01, bevelEnabled: false }), M.paint);
  fin.rotation.y = Math.PI / 2; fin.position.set(-0.005, 0, -0.85); add(fin);

  // mirrors
  [1, -1].forEach((s) => {
    add(strut([s * 0.26, 0.66, 0.36], [s * 0.44, 0.73, 0.32], 0.01, M.paint, 0.5));
    const housing = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 6, 12), M.paint));
    housing.rotation.z = Math.PI / 2; housing.scale.set(1, 1, 0.6); housing.position.set(s * 0.48, 0.745, 0.31);
    const glassM = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.04), M.glass);
    glassM.position.set(s * 0.48, 0.745, 0.29); glassM.rotation.y = Math.PI; add(glassM);
  });

  // floor and edge
  const floorShape = new THREE.Shape();
  floorShape.moveTo(-0.22, 1.05); floorShape.lineTo(0.22, 1.05); floorShape.quadraticCurveTo(0.8, 0.9, 0.82, 0.35);
  floorShape.lineTo(0.8, -0.95); floorShape.quadraticCurveTo(0.62, -1.25, 0.5, -1.4); floorShape.lineTo(0.5, -1.78); floorShape.lineTo(-0.5, -1.78);
  floorShape.lineTo(-0.5, -1.4); floorShape.quadraticCurveTo(-0.62, -1.25, -0.8, -0.95); floorShape.lineTo(-0.82, 0.35); floorShape.quadraticCurveTo(-0.8, 0.9, -0.22, 1.05);
  const floorGeo = new THREE.ExtrudeGeometry(floorShape, { depth: 0.025, bevelEnabled: false, curveSegments: 12 });
  floorGeo.rotateX(Math.PI / 2); floorGeo.translate(0, 0.06, 0);
  const floor = add(new THREE.Mesh(floorGeo, M.carbon));
  [1, -1].forEach((s) => {
    const edge = add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 1.5), M.carbon));
    edge.position.set(s * 0.81, 0.09, -0.3);
    const edgeWing = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.9), M.carbon));
    edgeWing.position.set(s * 0.79, 0.12, -0.1); edgeWing.rotation.z = s * -0.15;
  });
  // diffuser
  const diff = add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.012, 0.75), M.carbon));
  diff.position.set(0, 0.17, -2.12); diff.rotation.x = 0.36;
  for (let i = -2; i <= 2; i++) {
    const strake = add(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.62), M.carbon));
    strake.position.set(i * 0.22, 0.11, -2.1); strake.rotation.x = 0.36;
  }
  // crash structure + rain light
  add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.32), M.carbon)).position.set(0, 0.32, -2.5);
  const rain = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.01), M.rainLight);
  rain.position.set(0, 0.33, -2.665); body.add(rain);
  const exhaust = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 20, 1, true), M.metal));
  exhaust.rotation.x = Math.PI / 2 - 0.15; exhaust.position.set(0, 0.48, -2.38);

  // front wing: main plane + three flaps, endplates
  const fw = new THREE.Group(); body.add(fw); fw.position.set(0, 0, 3.08);
  const fwEls = [
    { z: 0, y: 0.06, chord: 0.3, aoa: 0.04, mat: M.carbon, span: 1.92, lift: 0.03 },
    { z: -0.2, y: 0.1, chord: 0.15, aoa: 0.2, mat: M.carbon, span: 1.88, lift: 0.07 },
    { z: -0.29, y: 0.135, chord: 0.13, aoa: 0.34, mat: M.carbon, span: 1.84, lift: 0.1 },
    { z: -0.37, y: 0.17, chord: 0.12, aoa: 0.48, mat: M.red, span: 1.8, lift: 0.13 },
  ];
  fwEls.forEach((e, i) => {
    if (i === 0) {
      add(new THREE.Mesh(wingElement({ chord: e.chord, span: e.span, aoa: e.aoa, thick: 0.07, lift: e.lift, sweep: 0.06 }), e.mat), fw).position.set(0, e.y, e.z);
    } else {
      // flaps are split by the nose and sweep up toward the endplates
      const half = e.span / 2 - 0.16;
      [1, -1].forEach((s) => {
        const g = wingElement({ chord: e.chord, span: half * 2, aoa: e.aoa, thick: 0.06 });
        const p = g.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const u = (p.getX(k) * s + half) / (2 * half); // 0 at nose → 1 at tip
          p.setY(k, p.getY(k) + e.lift * u * u); p.setZ(k, p.getZ(k) - 0.08 * u * u);
        }
        g.computeVertexNormals();
        const m = add(new THREE.Mesh(g, e.mat), fw);
        m.position.set(s * (half + 0.16), e.y, e.z);
      });
    }
  });
  [1, -1].forEach((s) => {
    const epShape = new THREE.Shape();
    epShape.moveTo(0, 0); epShape.lineTo(0.56, 0); epShape.lineTo(0.56, 0.2); epShape.quadraticCurveTo(0.3, 0.34, 0.06, 0.12); epShape.closePath();
    const ep = add(new THREE.Mesh(new THREE.ExtrudeGeometry(epShape, { depth: 0.012, bevelEnabled: false }), M.carbon), fw);
    ep.rotation.y = Math.PI / 2; ep.position.set(s * 0.965 - 0.006, 0.035, 0.04);
    const tip = add(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.012, 0.3), M.red), fw);
    tip.position.set(s * 0.962, 0.3, -0.36);
  });

  // rear wing: main plane, DRS flap, endplates, swan-neck pylon, beam wing
  const rw = new THREE.Group(); body.add(rw); rw.position.set(0, 0, -2.32);
  add(new THREE.Mesh(wingElement({ chord: 0.33, span: 1.0, aoa: 0.16, thick: 0.1, camber: -0.07 }), M.carbon), rw).position.set(0, 0.78, 0);
  const drs = add(new THREE.Mesh(wingElement({ chord: 0.2, span: 0.98, aoa: 0.55, thick: 0.08 }), M.red), rw);
  drs.position.set(0, 0.86, -0.27);
  [1, -1].forEach((s) => {
    const ep = add(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.42, 0.52), M.paint), rw);
    ep.position.set(s * 0.505, 0.75, -0.22);
    const cap = add(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.05, 0.52), M.red), rw);
    cap.position.set(s * 0.505, 0.985, -0.22);
  });
  add(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.42, 0.14), M.carbon), rw).position.set(0, 0.6, -0.08);
  add(new THREE.Mesh(wingElement({ chord: 0.16, span: 0.78, aoa: 0.2, thick: 0.1 }), M.carbon), rw).position.set(0, 0.4, -0.18);

  // wheels and suspension
  const wheels = [];
  const corners = [
    { x: 0.8, z: 1.84, w: 0.3, front: true }, { x: -0.8, z: 1.84, w: 0.3, front: true },
    { x: 0.79, z: -1.76, w: 0.4, front: false }, { x: -0.79, z: -1.76, w: 0.4, front: false },
  ];
  corners.forEach((c) => {
    const s = Math.sign(c.x);
    const steer = new THREE.Group(); steer.position.set(c.x, 0.36, c.z); car.add(steer);
    const wheel = buildWheel(M, { width: c.w, outward: s, compound: PAL.red });
    steer.add(wheel);
    wheels.push({ steer, wheel, front: c.front });
    // brake duct drum behind the rim
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.12, 24), M.carbon);
    duct.rotation.z = Math.PI / 2; duct.position.set(-s * (c.w / 2 - 0.02), 0, 0); duct.castShadow = true; steer.add(duct);
    // wishbones (two legs each), push/pull rod and track rod
    const ix = s * (c.front ? 0.2 : 0.14), ox = c.x - s * (c.w / 2 + 0.04);
    const up = c.front ? 0.5 : 0.48, lo = c.front ? 0.18 : 0.17;
    add(strut([ix, up, c.z + 0.22], [ox, up + 0.02, c.z], 0.013, M.carbon, 0.45), car);
    add(strut([ix, up - 0.02, c.z - 0.22], [ox, up + 0.02, c.z], 0.013, M.carbon, 0.45), car);
    add(strut([ix, lo, c.z + 0.28], [ox, lo, c.z], 0.014, M.carbon, 0.45), car);
    add(strut([ix, lo, c.z - 0.25], [ox, lo, c.z], 0.014, M.carbon, 0.45), car);
    add(strut([s * 0.22, c.front ? 0.24 : 0.5, c.z + (c.front ? 0.08 : -0.1)], [ox, c.front ? 0.5 : 0.2, c.z], 0.012, M.carbon), car);
    add(strut([ix, (up + lo) / 2, c.z + 0.12], [ox, (up + lo) / 2, c.z + 0.1], 0.01, M.carbon, 0.6), car);
    // wheel wake deflector above front tyres
    if (c.front) {
      const wd = add(new THREE.Mesh(new THREE.BoxGeometry(c.w * 0.9, 0.008, 0.3), M.carbon), car);
      wd.position.set(c.x, 0.76, c.z - 0.02); wd.rotation.x = 0.18;
    }
  });

  car.userData = { wheels, rainLight: rain, materials: M, length: 5.65 };
  return car;
}

/* Rolls and steers the wheels. distance: metres travelled this frame. */
export function driveWheels(car, distance, steer = 0) {
  car.userData.wheels.forEach((w) => {
    w.wheel.rotation.x += distance / w.wheel.userData.radius;
    if (w.front) w.steer.rotation.y = steer;
  });
}
