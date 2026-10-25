/* Experience: a floodlit night circuit. The car laps at speed, the floor
   throws sparks on the straights, and a broadcast camera tracks it. */
import * as THREE from 'three';
import { createStage, canvasTexture, reduceMotion } from '../engine.js';
import { buildCar, driveWheels } from '../car.js';

const host = document.querySelector('[data-scene]');
const canvas = host && host.querySelector('canvas');
const stage = host && createStage({ host, canvas, exposure: 1.1, fov: 32, far: 2500, background: 0x05060f, bloom: { strength: 0.55, radius: 0.6, threshold: 0.9 } });

if (stage) {
  const { scene, camera, renderer, input } = stage;
  scene.fog = new THREE.FogExp2(0x0d0c1e, 0.0011);

  /* ── circuit layout ── */
  const S = 24;
  const curve = new THREE.CatmullRomCurve3([
    [-6, 0, -1], [-4.5, 0.4, -3.6], [-0.5, 0.9, -4], [3, 0.3, -2.6], [6.2, 0, -3.2],
    [7.6, 0.2, -0.4], [5.2, 0.7, 1.6], [2, 0.2, 0.9], [0.4, 0, 3.1], [-3.2, 0.3, 3.6], [-6.6, 0.5, 2.4],
  ].map((p) => new THREE.Vector3(p[0] * S, p[1] * 1.6, p[2] * S)), true, 'catmullrom', 0.5);
  const L = curve.getLength();
  const UP = new THREE.Vector3(0, 1, 0);
  const SEG = 1400;
  const frames = [];
  for (let i = 0; i <= SEG; i++) {
    const u = (i / SEG) % 1, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(t, UP).normalize(); // lateral unit vector
    frames.push({ p, t, side, d: (i / SEG) * L });
  }
  // curvature (signed: + = turning left) for speed + kerbs + steering
  const curv = frames.map((f, i) => {
    const n = frames[(i + 4) % SEG].t, a = f.t;
    const cross = a.x * n.z - a.z * n.x;
    return Math.asin(Math.max(-1, Math.min(1, cross))) / ((4 / SEG) * L);
  });
  const smooth = (arr, k) => arr.map((_, i) => { let s = 0; for (let j = -k; j <= k; j++) s += arr[(i + j + SEG) % SEG]; return s / (2 * k + 1); });
  const curvS = smooth(curv.slice(0, SEG), 12);

  /* ribbons along the track: a/b are lateral offsets (m), h = height above surface */
  function ribbon(a, b, mat, { h = 0, vScale = 10, filter = null, wall = 0 } = {}) {
    const pos = [], uv = [], idx = []; let vtx = 0, prevOk = false;
    for (let i = 0; i <= SEG; i++) {
      const f = frames[i], ok = !filter || filter(i % SEG);
      if (ok) {
        const v = f.d / vScale;
        if (wall) {
          const q = f.p.clone().addScaledVector(f.side, a);
          pos.push(q.x, q.y + h, q.z, q.x, q.y + h + wall, q.z); uv.push(v, 0, v, 1);
        } else {
          const qa = f.p.clone().addScaledVector(f.side, a), qb = f.p.clone().addScaledVector(f.side, b);
          pos.push(qa.x, qa.y + h, qa.z, qb.x, qb.y + h, qb.z); uv.push(0, v, 1, v);
        }
        if (prevOk) { const k = vtx - 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
        vtx += 2;
      }
      prevOk = ok;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m); return m;
  }

  /* asphalt: grain, a darker rubbered-in racing line, subtle patch repairs */
  const asphaltTex = canvasTexture(512, 1024, (g, w, h) => {
    g.fillStyle = '#2b2c33'; g.fillRect(0, 0, w, h);
    const line = g.createLinearGradient(0, 0, w, 0);
    line.addColorStop(0, 'rgba(0,0,0,0)'); line.addColorStop(0.35, 'rgba(10,10,14,0.35)'); line.addColorStop(0.5, 'rgba(10,10,14,0.5)'); line.addColorStop(0.65, 'rgba(10,10,14,0.35)'); line.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = line; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90000; i++) {
      const c = 30 + Math.random() * 40;
      g.fillStyle = `rgba(${c},${c},${c + 5},${0.15 + Math.random() * 0.25})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(20,20,26,0.25)'; g.fillRect(Math.random() * w, Math.random() * h, 60 + Math.random() * 120, 40 + Math.random() * 90); }
  }, { srgb: true, aniso: 16 });
  asphaltTex.wrapS = THREE.ClampToEdgeWrapping; asphaltTex.wrapT = THREE.RepeatWrapping;
  const asphalt = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.78, metalness: 0.0, roughnessMap: asphaltTex });
  ribbon(-6, 6, asphalt, { vScale: 24 });

  const paint = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.55 });
  ribbon(5.65, 5.95, paint, { h: 0.012 });
  ribbon(-5.95, -5.65, paint, { h: 0.012 });

  // kerbs on the outside and inside of corners
  const kerbTex = canvasTexture(64, 256, (g, w, h) => {
    g.fillStyle = '#e8e6e0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d42a1f'; g.fillRect(0, 0, w, h / 2);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, w * 0.12, h);
  }, { repeat: [1, 1] });
  const kerb = new THREE.MeshStandardMaterial({ map: kerbTex, roughness: 0.5 });
  const corner = (i) => Math.abs(curvS[i]) > 0.012;
  ribbon(5.95, 7.4, kerb, { h: 0.035, vScale: 3, filter: corner });
  ribbon(-7.4, -5.95, kerb, { h: 0.035, vScale: 3, filter: corner });

  // run-off tarmac, then grass
  const runoff = new THREE.MeshStandardMaterial({ color: 0x1d1f27, roughness: 0.92 });
  ribbon(5.95, 13, runoff, { h: -0.01 }); ribbon(-13, -5.95, runoff, { h: -0.01 });
  const grassTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#16231a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${20 + Math.random() * 30},${45 + Math.random() * 40},${25 + Math.random() * 20},0.6)`; g.fillRect(Math.random() * w, Math.random() * h, 1, 2); }
  }, { repeat: [220, 220] });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.4; ground.receiveShadow = true; scene.add(ground);

  // barriers: tyre-wall / concrete with livery-coloured boards
  const barrierTex = canvasTexture(1024, 64, (g, w, h) => {
    const cols = ['#ff3d2e', '#0e0f24', '#a9b4ff', '#f2efe8', '#0e0f24', '#ffb547'];
    for (let i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.fillRect((i * w) / 6, 0, w / 6, h); }
    g.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 6; i++) g.fillRect((i * w) / 6, 0, 3, h);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 0, w, 6);
  }, { repeat: [1, 1] });
  barrierTex.wrapS = THREE.RepeatWrapping;
  const barrier = new THREE.MeshStandardMaterial({ map: barrierTex, roughness: 0.6, side: THREE.DoubleSide });
  ribbon(13.2, 0, barrier, { wall: 1.1, vScale: 36, h: -0.05 });
  ribbon(-13.2, 0, barrier, { wall: 1.1, vScale: 36, h: -0.05 });
  // debris / catch fencing above the outer wall
  const fenceTex = canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(200,205,220,0.9)'; g.lineWidth = 2;
    for (let i = -w; i < w * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); }
  }, { repeat: [1, 1], srgb: true });
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping; fenceTex.repeat.set(1, 6);
  const fence = new THREE.MeshStandardMaterial({ map: fenceTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 });
  ribbon(13.4, 0, fence, { wall: 3.6, vScale: 3.2, h: 1.05 });

  /* ── floodlight towers: real spot lights so the car passes through pools of light ── */
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x2a2d3a, metalness: 0.7, roughness: 0.45 });
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.94, 0.82).multiplyScalar(8), toneMapped: false });
  const TOWERS = 10;
  for (let k = 0; k < TOWERS; k++) {
    const i = Math.floor(((k + 0.3) / TOWERS) * SEG), f = frames[i];
    const s = k % 2 ? 1 : -1;
    const base = f.p.clone().addScaledVector(f.side, s * 22);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 26, 12), towerMat);
    pole.position.set(base.x, 13 - 0.4, base.z); scene.add(pole);
    const head = new THREE.Group(); head.position.set(base.x, 26, base.z);
    head.lookAt(f.p.x, 0, f.p.z); scene.add(head);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 0.5), towerMat); head.add(frame);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
      const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), lampMat);
      lamp.position.set(-2 + c, -0.55 + r * 1.1, 0.26); head.add(lamp);
    }
    const spot = new THREE.SpotLight(0xffefd6, 5200, 90, 0.62, 0.65, 1.7);
    spot.position.copy(head.position);
    spot.target.position.copy(f.p).addScaledVector(f.side, s * 2);
    scene.add(spot, spot.target);
  }

  /* ── grandstand along the main straight ── */
  {
    const f = frames[Math.floor(SEG * 0.93)];
    const gs = new THREE.Group(); scene.add(gs);
    const base = f.p.clone().addScaledVector(f.side, -24);
    gs.position.set(base.x, -0.4, base.z);
    gs.lookAt(f.p.x, -0.4, f.p.z);
    const crowd = canvasTexture(512, 128, (g, w, h) => {
      g.fillStyle = '#0d0e18'; g.fillRect(0, 0, w, h);
      const cols = ['#ff3d2e', '#f2efe8', '#a9b4ff', '#ffb547', '#3a3d5a', '#262838'];
      for (let i = 0; i < 2600; i++) { g.fillStyle = cols[Math.floor(Math.random() * cols.length)]; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    }, { repeat: [6, 1] });
    for (let r = 0; r < 8; r++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(110, 1.1, 1.6), new THREE.MeshStandardMaterial({ color: 0x1a1c28, roughness: 0.8 }));
      step.position.set(0, 0.55 + r * 1.1, -r * 1.6); gs.add(step);
      const ppl = new THREE.Mesh(new THREE.PlaneGeometry(110, 1.0), new THREE.MeshStandardMaterial({ map: crowd, roughness: 1, emissive: 0x222233, emissiveIntensity: 0.4, emissiveMap: crowd }));
      ppl.position.set(0, 1.6 + r * 1.1, -r * 1.6 + 0.81); gs.add(ppl);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(114, 0.4, 16), towerMat); roof.position.set(0, 14, -6); gs.add(roof);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(110, 0.15, 0.15), lampMat); strip.position.set(0, 13.7, 1.8); gs.add(strip);
  }

  /* ── skyline with lit windows ── */
  {
    const winTex = canvasTexture(128, 256, (g, w, h) => {
      g.fillStyle = '#07080f'; g.fillRect(0, 0, w, h);
      for (let y = 6; y < h; y += 10) for (let x = 6; x < w; x += 10) {
        if (Math.random() < 0.42) { const warm = Math.random() < 0.7; g.fillStyle = warm ? `rgba(255,${190 + Math.random() * 50},${120 + Math.random() * 60},${0.5 + Math.random() * 0.5})` : 'rgba(170,190,255,0.8)'; g.fillRect(x, y, 5, 5); }
      }
    }, { repeat: [1, 1] });
    const bMat = new THREE.MeshStandardMaterial({ color: 0x0b0c14, roughness: 0.4, metalness: 0.4, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 1.4 });
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, r = 650 + Math.random() * 450;
      const h = 25 + Math.random() * 110, w = 18 + Math.random() * 36;
      const geo = new THREE.BoxGeometry(w, h, w);
      const uvs = geo.attributes.uv; for (let k = 0; k < uvs.count; k++) uvs.setXY(k, uvs.getX(k) * w / 40, uvs.getY(k) * h / 80);
      const b = new THREE.Mesh(geo, bMat);
      b.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); b.rotation.y = Math.random(); scene.add(b);
    }
    winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  }

  /* ── sky ── */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 top = vec3(0.012,0.014,0.05); vec3 hor = vec3(0.16,0.09,0.12); vec3 c = mix(hor, top, pow(smoothstep(-0.02, 0.45, h), 0.6)); gl_FragColor = vec4(c,1.0); }',
  }));
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0x5560a0, 0x0b0b10, 0.35));

  // reflections come from the circuit itself
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(scene, 0.04, 0.5, 2000).texture;
  pm.dispose();

  /* ── the car ── */
  const car = buildCar(); scene.add(car);
  car.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const moon = new THREE.DirectionalLight(0xc8d0ff, 1.4);
  moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 60 });
  moon.shadow.bias = -0.0004; moon.shadow.radius = 4;
  scene.add(moon, moon.target);
  // a soft blob of contact shadow travels with the car
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 6.4), new THREE.MeshBasicMaterial({
    map: canvasTexture(64, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h / 2); gr.addColorStop(0, 'rgba(0,0,0,0.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
    transparent: true, depthWrite: false,
  }));
  blob.rotation.x = -Math.PI / 2; car.add(blob); blob.position.y = 0.02;

  /* ── sparks from the plank ── */
  const SP = 320;
  const spPos = new Float32Array(SP * 6), spCol = new Float32Array(SP * 6);
  const sparks = Array.from({ length: SP }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1 }));
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  spGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
  const spLines = new THREE.LineSegments(spGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  spLines.frustumCulled = false; scene.add(spLines);
  let spNext = 0;
  const tmp = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();

  function emitSparks(n, speed, groundY) {
    for (let k = 0; k < n; k++) {
      const s = sparks[spNext]; spNext = (spNext + 1) % SP;
      s.p.set((Math.random() - 0.5) * 0.7, 0.03, -1.0 - Math.random() * 1.1).applyMatrix4(car.matrixWorld);
      s.p.y = groundY + 0.03;
      s.v.copy(fwd).multiplyScalar(speed * (0.35 + Math.random() * 0.35))
        .addScaledVector(right, (Math.random() - 0.5) * 7).add(tmp.set(0, 0.5 + Math.random() * 3.2, 0));
      s.life = 0; s.max = 0.18 + Math.random() * 0.4;
    }
  }
  function updateSparks(dt, groundY) {
    for (let i = 0; i < SP; i++) {
      const s = sparks[i], o = i * 6;
      if (s.life >= s.max) { spCol.fill(0, o, o + 6); continue; }
      s.life += dt;
      s.v.y -= 9.8 * dt; s.v.multiplyScalar(1 - dt * 1.6);
      s.p.addScaledVector(s.v, dt);
      if (s.p.y < groundY + 0.01) { s.p.y = groundY + 0.01; s.v.y *= -0.35; }
      const k = 1 - s.life / s.max, tail = 0.022 + 0.02 * k;
      spPos[o] = s.p.x; spPos[o + 1] = s.p.y; spPos[o + 2] = s.p.z;
      spPos[o + 3] = s.p.x - s.v.x * tail; spPos[o + 4] = s.p.y - s.v.y * tail; spPos[o + 5] = s.p.z - s.v.z * tail;
      const r = 3.2 * k, g = 2.0 * k * k, b = 0.7 * k * k * k;
      spCol[o] = r; spCol[o + 1] = g; spCol[o + 2] = b; spCol[o + 3] = r * 0.3; spCol[o + 4] = g * 0.15; spCol[o + 5] = 0;
    }
    spGeo.attributes.position.needsUpdate = true; spGeo.attributes.color.needsUpdate = true;
  }

  /* ── driving ── */
  let dist = L * 0.86, speed = 50;
  const sample = (d) => {
    const x = ((d % L) + L) % L / L * SEG, i = Math.floor(x), t = x - i, a = frames[i], b = frames[i + 1];
    return { p: a.p.clone().lerp(b.p, t), t: a.t.clone().lerp(b.t, t).normalize(), c: curvS[i % SEG] * (1 - t) + curvS[(i + 1) % SEG] * t, i };
  };
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let camInit = false, camR = 7.6, camH = 1.25;

  stage.onResize = (s) => {
    if (s.narrow) { camera.fov = 44; camR = 9.5; camH = 1.9; camera.setViewOffset(s.width, s.height, 0, s.height * 0.12, s.width, s.height); }
    else { camera.fov = 32; camR = 7.6; camH = 1.25; camera.setViewOffset(s.width, s.height, -s.width * 0.16, s.height * 0.02, s.width, s.height); }
  };

  stage.onFrame = (dt, t) => {
    // look ahead for braking: slow for the tightest curvature in the next ~60 m
    let maxC = 0;
    for (let d = 0; d < 60; d += 6) maxC = Math.max(maxC, Math.abs(sample(dist + d).c));
    const target = THREE.MathUtils.clamp(78 - maxC * 2200, 26, 78);
    speed += (target - speed) * Math.min(dt * (target < speed ? 2.6 : 0.9), 1);
    const step = speed * dt;
    dist = (dist + step) % L;
    const cur = sample(dist), ahead = sample(dist + 2.5);
    car.position.copy(cur.p);
    car.lookAt(ahead.p.x, ahead.p.y, ahead.p.z);
    car.rotateZ(-cur.c * speed * 0.012); // body roll
    car.updateMatrixWorld();
    driveWheels(car, step, THREE.MathUtils.clamp(-cur.c * 14, -0.35, 0.35));
    // ERS harvesting: rain light blinks on the straights
    car.userData.rainLight.visible = speed < 60 || Math.floor(t * 4) % 2 === 0;

    fwd.set(0, 0, 1).applyQuaternion(car.quaternion); right.set(1, 0, 0).applyQuaternion(car.quaternion);
    if (!reduceMotion && speed > 58 && Math.random() < (speed - 58) / 18) emitSparks(Math.floor(2 + Math.random() * 5), speed, cur.p.y);
    updateSparks(dt, cur.p.y);

    moon.position.copy(car.position).add(tmp.set(8, 25, 6)); moon.target.position.copy(car.position);

    // broadcast camera orbiting slowly around the car; drag swings it
    const a = 2.15 + Math.sin(t * 0.13) * 0.75 + input.drag;
    const off = tmp.set(Math.sin(a) * camR, camH, Math.cos(a) * camR);
    off.applyAxisAngle(UP, Math.atan2(fwd.x, fwd.z));
    const want = car.position.clone().add(off);
    const lookWant = car.position.clone().addScaledVector(fwd, 1.2).add(tmp.set(0, 0.45, 0));
    if (!camInit || !dt) { camPos.copy(want); camLook.copy(lookWant); camInit = true; }
    const k = 1 - Math.exp(-dt * 5);
    camPos.lerp(want, k); camLook.lerp(lookWant, 1 - Math.exp(-dt * 12));
    camera.position.copy(camPos);
    camera.position.y = Math.max(camera.position.y, cur.p.y + 0.5);
    camera.lookAt(camLook);
  };
  stage.start();
}
