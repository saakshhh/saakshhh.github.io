/* Contact: the start gantry. Five lights come on one by one, go out,
   and the car on the grid launches underneath. Click to run it again. */
import * as THREE from 'three';
import { createStage, nightEnvironment, canvasTexture, radialTexture, reduceMotion } from '../engine.js';
import { buildCar, driveWheels, makeMaterials } from '../car.js';

const host = document.querySelector('[data-scene]');
const canvas = host && host.querySelector('canvas');
const stage = host && createStage({ host, canvas, exposure: 0.92, fov: 34, far: 900, background: 0x06070f, bloom: { strength: 0.9, radius: 0.55, threshold: 0.85 } });

if (stage) {
  const { scene, camera, renderer, input } = stage;
  scene.environment = nightEnvironment(renderer);
  scene.fog = new THREE.FogExp2(0x090918, 0.0065);
  const M = makeMaterials();

  /* sky */
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(0.13,0.07,0.1), vec3(0.01,0.012,0.04), pow(smoothstep(-0.02,0.5,h),0.7)); gl_FragColor = vec4(c,1.0); }',
  })));

  /* track surface with grid boxes and the start line */
  const trackTex = canvasTexture(512, 2048, (g, w, h) => {
    g.fillStyle = '#26272e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120000; i++) { const c = 28 + Math.random() * 40; g.fillStyle = `rgba(${c},${c},${c + 5},0.3)`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
    g.fillStyle = '#e8e6e0';
    g.fillRect(8, 0, 10, h); g.fillRect(w - 18, 0, 10, h);
    // grid slots (staggered), behind the start line
    for (let k = 0; k < 6; k++) {
      const x = k % 2 ? w * 0.62 : w * 0.18, y = h * 0.52 + k * 120;
      g.fillRect(x, y, w * 0.2, 7); g.fillRect(x, y, 7, 46); g.fillRect(x + w * 0.2 - 7, y, 7, 46);
    }
    // chequered start line
    for (let i = 0; i < 32; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? '#e8e6e0' : '#1a1b20'; g.fillRect(i * (w / 32), h * 0.5 + j * (w / 32), w / 32, w / 32);
    }
  }, { aniso: 16 });
  const track = new THREE.Mesh(new THREE.PlaneGeometry(14, 56), new THREE.MeshStandardMaterial({ map: trackTex, roughness: 0.72, roughnessMap: trackTex }));
  track.rotation.x = -Math.PI / 2; track.receiveShadow = true; scene.add(track);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 260), new THREE.MeshStandardMaterial({ color: 0x24252c, roughness: 0.75 }));
  road.rotation.x = -Math.PI / 2; road.position.z = -158; road.receiveShadow = true; scene.add(road);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x0f1712, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02; scene.add(grass);
  // pit wall and barriers
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xbfbcc6, roughness: 0.8 });
  [-7.4, 7.4].forEach((x) => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 120), wallMat); w.position.set(x, 0.55, -20); w.receiveShadow = true; scene.add(w); });

  /* the gantry */
  const metal = new THREE.MeshStandardMaterial({ color: 0x30333d, metalness: 0.8, roughness: 0.4 });
  const gantry = new THREE.Group(); gantry.position.set(0, 0, -1); scene.add(gantry);
  const beamY = 6.6;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.5, 0.7), metal); beam.position.y = beamY; gantry.add(beam);
  const chord = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.14, 0.14), metal); chord.position.set(0, beamY + 1.1, 0); gantry.add(chord);
  for (let i = 0; i < 22; i++) {
    const x = -7.35 + i * 0.7;
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8), metal);
    d.position.set(x + 0.35, beamY + 0.68, 0); d.rotation.z = (i % 2 ? 1 : -1) * 0.56; gantry.add(d);
  }
  [-7.6, 7.6].forEach((x) => {
    for (const z of [-0.35, 0.35]) for (const dx of [-0.35, 0.35]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, beamY + 1.2, 0.14), metal); leg.position.set(x + dx, (beamY + 1.2) / 2, z); gantry.add(leg);
    }
    for (let y = 0.8; y < beamY; y += 1.1) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.06), metal); r.position.set(x, y, 0.35); gantry.add(r);
      const r2 = r.clone(); r2.position.z = -0.35; gantry.add(r2);
    }
  });
  // FIA-style panel between units
  const panelTex = canvasTexture(1024, 128, (g, w, h) => {
    g.fillStyle = '#0d0e14'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff3d2e'; g.fillRect(0, h - 10, w, 10);
    g.fillStyle = '#f2efe8'; g.font = '800 56px "Unbounded", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('LIGHTS OUT', w / 2, h / 2 - 4);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.75), new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.5, emissive: 0xffffff, emissiveMap: panelTex, emissiveIntensity: 0.25 }));
  sign.position.set(0, beamY + 0.9, 0.12); gantry.add(sign);

  /* five light units: four red lamps each, in hooded housings */
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0f, roughness: 0.55, metalness: 0.3 });
  const units = [];
  const lampGeo = new THREE.SphereGeometry(0.16, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let u = 0; u < 5; u++) {
    const g = new THREE.Group(); g.position.set(-3.2 + u * 1.6, beamY - 1.25, 0.1); gantry.add(g);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.5), housingMat); g.add(box);
    const border = new THREE.Mesh(new THREE.BoxGeometry(1.04, 2.04, 0.02), new THREE.MeshStandardMaterial({ color: 0x1c1e26, metalness: 0.6, roughness: 0.4 }));
    border.position.z = 0.25; g.add(border);
    const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), metal); hanger.position.y = 1.1; g.add(hanger);
    const mats = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
      const red = r < 2;
      const m = new THREE.MeshPhysicalMaterial({
        color: red ? 0x1c0403 : 0x050906, roughness: 0.28, clearcoat: 0.4, clearcoatRoughness: 0.2, metalness: 0, envMapIntensity: 0.25,
        emissive: red ? 0xff1a0a : 0x000000, emissiveIntensity: 0,
      });
      const lamp = new THREE.Mesh(lampGeo, m);
      lamp.rotation.x = Math.PI / 2; lamp.scale.set(1, 0.35, 1);
      lamp.position.set(-0.22 + c * 0.44, 0.66 - r * 0.44, 0.25); g.add(lamp);
      const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 24, 1, true, -Math.PI / 2, Math.PI), housingMat);
      hood.rotation.x = Math.PI / 2; hood.position.set(lamp.position.x, lamp.position.y, 0.33);
      hood.material.side = THREE.DoubleSide; g.add(hood);
      if (red) mats.push(m);
    }
    const glow = new THREE.PointLight(0xff2a14, 0, 9, 1.6); glow.position.set(0, 0.4, 0.9); g.add(glow);
    units.push({ mats, glow });
  }

  /* car on pole */
  const car = buildCar({ materials: M }); scene.add(car);
  const GRID = new THREE.Vector3(2.0, 0, 6.6);
  car.rotation.y = Math.PI; car.position.copy(GRID);
  car.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  /* stadium bokeh + floodlights in the distance */
  const bokehTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
  const BN = 260, bPos = new Float32Array(BN * 3), bCol = new Float32Array(BN * 3);
  const palette = [[1, 0.8, 0.55], [1, 0.9, 0.8], [0.66, 0.7, 1], [1, 0.3, 0.2], [1, 0.7, 0.3]];
  for (let i = 0; i < BN; i++) {
    const side = i % 2 ? 1 : -1;
    bPos[i * 3] = side * (16 + Math.random() * 30); bPos[i * 3 + 1] = 1 + Math.random() * 7; bPos[i * 3 + 2] = -25 - Math.random() * 90;
    const c = palette[Math.floor(Math.random() * palette.length)], k = 0.25 + Math.random() * 0.8;
    bCol[i * 3] = c[0] * k; bCol[i * 3 + 1] = c[1] * k; bCol[i * 3 + 2] = c[2] * k;
  }
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3)); bGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
  scene.add(new THREE.Points(bGeo, new THREE.PointsMaterial({ map: bokehTex, size: 0.7, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.94, 0.82).multiplyScalar(7), toneMapped: false });
  [[-26, -30], [26, -45], [-30, -80], [30, -95]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 28, 10), metal); pole.position.set(x, 14, z); scene.add(pole);
    const head = new THREE.Mesh(new THREE.PlaneGeometry(5, 2), lampMat); head.position.set(x, 28, z); head.lookAt(0, 0, 0); scene.add(head);
  });

  /* lighting */
  const key = new THREE.SpotLight(0xfff0dd, 520, 60, 0.45, 0.7, 1.5);
  key.position.set(-8, 18, 14); key.target.position.set(1, 0, 3); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.radius = 4;
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight(0x4c5490, 0x0b0b10, 0.45));

  /* start sequence */
  let seq = 0, hold = 1.2, launched = false, carV = 0;
  const restart = () => { seq = 0; hold = 0.6 + Math.random() * 1.8; launched = false; carV = 0; car.position.copy(GRID); car.visible = true; };
  canvas.addEventListener('click', () => { restart(); if (reduceMotion) stage.renderOnce(); });
  restart();

  const look = new THREE.Vector3(); let camX = -4;
  stage.onResize = (s) => {
    if (s.narrow) { camX = -1.0; camera.fov = 50; camera.position.set(camX, 1.4, 24); look.set(0, 5.4, 0); camera.setViewOffset(s.width, s.height, 0, s.height * 0.08, s.width, s.height); }
    else { camX = -4.0; camera.fov = 34; camera.position.set(camX, 1.3, 27); look.set(-0.6, 4.4, 0); camera.setViewOffset(s.width, s.height, -s.width * 0.18, s.height * 0.12, s.width, s.height); }
  };

  stage.onFrame = (dt, t) => {
    if (reduceMotion) seq = 5.5; else seq += dt;
    const lit = Math.min(5, Math.floor(seq)); // one more unit each second
    const out = seq >= 5 + hold;
    units.forEach((u, i) => {
      const on = !out && i < lit;
      const k = on ? 1 : 0;
      u.mats.forEach((m) => { m.emissiveIntensity += (k * 7 - m.emissiveIntensity) * (dt ? Math.min(dt * 30, 1) : 1); });
      u.glow.intensity = u.mats[0].emissiveIntensity * 1.4;
    });
    if (out && !launched && !reduceMotion) launched = true;
    if (launched) {
      carV = Math.min(carV + dt * 15, 85);
      const step = carV * dt;
      car.position.z -= step;
      driveWheels(car, step, 0);
      car.userData.rainLight.visible = true;
      if (car.position.z < -140) car.visible = false;
    }
    if (out && seq > 5 + hold + 5.5) restart();
    // parallax
    camera.position.x += (camX + input.sx * 0.8 - camera.position.x) * (dt ? Math.min(dt * 2, 1) : 1);
    camera.lookAt(look.x, look.y - input.sy * 0.3, look.z);
  };
  stage.start();
}
