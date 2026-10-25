/* Projects: an exploded front corner (tyre, brake disc, caliper, duct, upright)
   on display stands. The carbon disc heats up and glows as if under braking. */
import * as THREE from 'three';
import { Reflector } from '../../vendor/jsm/objects/Reflector.js';
import { createStage, studioEnvironment, canvasTexture, radialTexture, reduceMotion } from '../engine.js';
import { makeMaterials, buildWheel } from '../car.js';

const host = document.querySelector('[data-scene]');
const canvas = host && host.querySelector('canvas');
const stage = host && createStage({ host, canvas, exposure: 1.0, fov: 30, bloom: { strength: 0.5, radius: 0.45, threshold: 1.0 } });

if (stage) {
  const { scene, camera, renderer, input } = stage;
  scene.environment = studioEnvironment(renderer);
  scene.fog = new THREE.Fog(0x0e0f24, 6, 16);
  const M = makeMaterials();
  const H = 0.38; // axle height

  /* floor */
  const mirror = new Reflector(new THREE.CircleGeometry(12, 64), { textureWidth: 1024, textureHeight: 1024, color: 0x5d6070, clipBias: 0.003 });
  mirror.rotation.x = -Math.PI / 2; mirror.position.y = -0.002; scene.add(mirror);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.MeshStandardMaterial({ color: 0x0b0c1a, roughness: 0.5, metalness: 0.2, transparent: true, opacity: 0.82 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const rig = new THREE.Group(); scene.add(rig);         // rotates with drag
  const axis = new THREE.Group(); rig.add(axis);          // parts laid out along local X
  axis.position.y = H;

  /* tyre + rim (outer face toward +X) */
  const wheel = buildWheel(M, { width: 0.3, outward: 1, compound: '#ff3d2e', label: 'SOFT  SLICK  18' });
  wheel.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  axis.add(wheel);

  /* brake disc: carbon-carbon with ~1,000 radial cooling holes on the rim */
  const discR = 0.165, discIn = 0.095, discT = 0.034;
  const faceTex = canvasTexture(512, 512, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#121216'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 9000; i++) { const v = 20 + Math.random() * 25; g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(Math.random() * w, Math.random() * w, 2, 2); }
    g.strokeStyle = 'rgba(80,80,90,0.25)'; g.lineWidth = 1;
    for (let r = c * 0.6; r < c; r += 3) { g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); }
  });
  const heatTex = radialTexture([[0, 'rgba(0,0,0,1)'], [0.52, 'rgba(0,0,0,1)'], [0.62, 'rgba(120,20,0,1)'], [0.86, 'rgba(255,120,30,1)'], [0.97, 'rgba(255,200,90,1)'], [1, 'rgba(0,0,0,1)']]);
  const discFace = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.55, metalness: 0.3, emissive: 0xffffff, emissiveMap: heatTex, emissiveIntensity: 0, side: THREE.DoubleSide });
  const holes = canvasTexture(2048, 64, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 340; i++) {
      g.fillStyle = '#ffb070'; g.beginPath();
      g.arc((i + (row % 2) * 0.5) * (w / 340), h * (0.22 + row * 0.28), 2.2, 0, Math.PI * 2); g.fill();
    }
  });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.6, metalness: 0.2, emissive: 0xffffff, emissiveMap: holes, emissiveIntensity: 0 });
  const disc = new THREE.Group(); axis.add(disc);
  const discOuter = new THREE.Mesh(new THREE.CylinderGeometry(discR, discR, discT, 128, 1, true), rimMat);
  discOuter.rotation.z = Math.PI / 2; disc.add(discOuter);
  const discInner = new THREE.Mesh(new THREE.CylinderGeometry(discIn, discIn, discT, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.7, side: THREE.BackSide }));
  discInner.rotation.z = Math.PI / 2; disc.add(discInner);
  [1, -1].forEach((s) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(discIn, discR, 128, 1), discFace);
    ring.position.x = s * discT / 2; ring.rotation.y = s * Math.PI / 2; disc.add(ring);
  });
  // bell / drive pegs
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const peg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.02), M.metal);
    peg.position.set(0, Math.cos(a) * (discIn - 0.006), Math.sin(a) * (discIn - 0.006)); peg.rotation.x = -a; disc.add(peg);
  }
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.06, 48), M.rim);
  bell.rotation.z = Math.PI / 2; bell.position.x = 0.01; disc.add(bell);
  disc.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const discLight = new THREE.PointLight(0xff6a1a, 0, 1.6, 2); disc.add(discLight);

  /* caliper: a six-piston monobloc wrapped over the rear of the disc */
  const caliper = new THREE.Group(); axis.add(caliper);
  const calMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2c34, metalness: 0.85, roughness: 0.32, clearcoat: 0.6 });
  const arc = 1.25;
  [1, -1].forEach((s) => {
    const half = new THREE.Mesh(new THREE.TorusGeometry(discR - 0.02, 0.032, 16, 48, arc), calMat);
    half.rotation.y = Math.PI / 2; half.rotation.x = Math.PI / 2 - arc / 2 + Math.PI / 2;
    half.scale.set(1, 1, 0.9); half.position.x = s * 0.035; caliper.add(half);
    for (let k = 0; k < 3; k++) {
      const a = -arc / 2 + (k + 0.5) * (arc / 3) + Math.PI / 2 + Math.PI / 2;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 20), M.metal);
      pot.rotation.z = Math.PI / 2; pot.position.set(s * 0.066, Math.sin(a) * (discR - 0.02), Math.cos(a) * (discR - 0.02)); caliper.add(pot);
    }
  });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.16), calMat);
  bridge.position.set(0, 0, -(discR + 0.012)); caliper.add(bridge);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.006, 0.12), M.red);
  stripe.position.set(0, 0.017, -(discR + 0.012)); caliper.add(stripe);
  caliper.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  /* brake duct drum: carbon, with cooling slots */
  const duct = new THREE.Group(); axis.add(duct);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.215, 0.12, 64, 1, true), new THREE.MeshPhysicalMaterial({ map: M.carbon.map, metalness: 0.25, roughness: 0.4, clearcoat: 0.8, side: THREE.DoubleSide }));
  drum.rotation.z = Math.PI / 2; duct.add(drum);
  const drumFace = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.215, 64), M.carbon);
  drumFace.position.x = -0.06; drumFace.rotation.y = -Math.PI / 2; duct.add(drumFace);
  const scoop = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 32, 1, true), M.carbon);
  scoop.rotation.x = Math.PI / 2 + 0.2; scoop.position.set(-0.02, -0.06, 0.32); duct.add(scoop);
  duct.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  /* upright with wishbone pickups */
  const upright = new THREE.Group(); axis.add(upright);
  const upMat = new THREE.MeshStandardMaterial({ color: 0x9da2ad, metalness: 1, roughness: 0.28 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.12), upMat); upright.add(body);
  const hubC = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.1, 40), upMat);
  hubC.rotation.z = Math.PI / 2; upright.add(hubC);
  [0.22, -0.22].forEach((y) => {
    const lug = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 12), upMat); lug.position.set(-0.02, y, 0); upright.add(lug);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 12), M.carbon);
    arm.rotation.z = Math.PI / 2; arm.position.set(-0.3, y, 0.05); arm.scale.z = 0.5; upright.add(arm);
  });
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 24), M.metal);
  axle.rotation.z = Math.PI / 2; axle.position.x = 0.3; upright.add(axle);
  upright.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  /* display stands */
  const standMat = new THREE.MeshStandardMaterial({ color: 0x3a3d4a, metalness: 0.9, roughness: 0.25 });
  const stands = [disc, duct, upright].map((part) => {
    const st = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 12), standMat); st.add(rod);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.012, 32), standMat); st.add(foot);
    rig.add(st); return { st, rod, foot, part };
  });

  /* ember particles shed by the hot disc */
  const EN = 160, ePos = new Float32Array(EN * 3), eCol = new Float32Array(EN * 3);
  const embers = Array.from({ length: EN }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 1, max: 1 }));
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3)); eGeo.setAttribute('color', new THREE.BufferAttribute(eCol, 3));
  const ePts = new THREE.Points(eGeo, new THREE.PointsMaterial({ size: 0.012, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  ePts.frustumCulled = false; scene.add(ePts);
  let eNext = 0;

  /* lights */
  const key = new THREE.SpotLight(0xffffff, 55, 12, 0.7, 0.9, 1.6);
  key.position.set(0.5, 3.6, 3.2); key.target.position.set(-0.5, 0.3, -0.4); scene.add(key.target); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.radius = 5;
  scene.add(key);
  const rimR = new THREE.SpotLight(0xff3d2e, 16, 10, 0.5, 0.8, 1.5); rimR.position.set(-2.5, 2.5, -2.5); rimR.target.position.set(-0.6, 0.4, -0.5); scene.add(rimR.target); scene.add(rimR);
  const rimB = new THREE.SpotLight(0xa9b4ff, 22, 10, 0.7, 0.8, 1.5); rimB.position.set(2.5, 1.2, -2); scene.add(rimB);
  scene.add(new THREE.HemisphereLight(0x8890c0, 0x0a0a12, 0.25));

  const look = new THREE.Vector3(-0.5, H * 0.9, -0.4);
  stage.onResize = (s) => {
    if (s.narrow) { camera.fov = 36; camera.position.set(0.1, 1.3, 7.2); camera.setViewOffset(s.width, s.height, 0, s.height * 0.22, s.width, s.height); }
    else { camera.fov = 30; camera.position.set(0.35, 0.85, s.width < 1100 ? 4.4 : 3.8); camera.setViewOffset(s.width, s.height, -s.width * 0.2, s.height * 0.03, s.width, s.height); }
  };

  const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
  stage.onFrame = (dt, t) => {
    rig.rotation.y = -0.72 + input.sx * 0.2 + input.drag + (reduceMotion ? 0 : Math.sin(t * 0.25) * 0.12);
    // exploded layout, breathing slightly
    const e = reduceMotion ? 1 : 0.92 + Math.sin(t * 0.8) * 0.08;
    disc.position.x = -0.62 * e; caliper.position.x = -0.62 * e;
    duct.position.x = -1.0 * e; upright.position.x = -1.38 * e;
    caliper.position.y = 0.0; caliper.rotation.x = 0;
    // spin
    const spin = reduceMotion ? 0 : dt * 2.2;
    wheel.rotation.x += spin; disc.rotation.x += spin;
    // braking heat cycle: build, hold, cool
    const cyc = (t % 7) / 7;
    const heat = reduceMotion ? 0.75 : Math.max(0, Math.min(1, cyc < 0.35 ? cyc / 0.35 : cyc < 0.55 ? 1 : 1 - (cyc - 0.55) / 0.45));
    const hh = heat * heat;
    discFace.emissiveIntensity = 1.5 * hh; rimMat.emissiveIntensity = 2.2 * hh;
    discFace.emissive.setRGB(1, 0.55 + 0.35 * heat, 0.35 + 0.35 * heat);
    discLight.intensity = 1.1 * hh;
    // embers
    rig.updateMatrixWorld();
    if (!reduceMotion && heat > 0.55 && dt) {
      const n = Math.random() < heat ? 2 : 0;
      for (let k = 0; k < n; k++) {
        const s = embers[eNext]; eNext = (eNext + 1) % EN;
        const a = Math.random() * Math.PI * 2;
        s.p.set(0, Math.cos(a) * discR, Math.sin(a) * discR);
        disc.localToWorld(s.p);
        s.v.set((Math.random() - 0.5) * 0.3, -Math.sin(a) * 0.9 + 0.4, Math.cos(a) * 0.9).applyQuaternion(rig.getWorldQuaternion(wq));
        s.life = 0; s.max = 0.5 + Math.random() * 0.9;
      }
    }
    for (let i = 0; i < EN; i++) {
      const s = embers[i], o = i * 3;
      if (s.life >= s.max) { eCol[o] = eCol[o + 1] = eCol[o + 2] = 0; continue; }
      s.life += dt; s.v.y += dt * 0.3; s.v.multiplyScalar(1 - dt * 0.8); s.p.addScaledVector(s.v, dt);
      const k = 1 - s.life / s.max;
      ePos[o] = s.p.x; ePos[o + 1] = s.p.y; ePos[o + 2] = s.p.z;
      eCol[o] = 3 * k; eCol[o + 1] = 1.4 * k * k; eCol[o + 2] = 0.3 * k * k * k;
    }
    eGeo.attributes.position.needsUpdate = true; eGeo.attributes.color.needsUpdate = true;
    // stands follow the parts down to the floor
    stands.forEach(({ st, rod, foot, part }) => {
      part.getWorldPosition(wp);
      const top = wp.y - (part === disc ? discR + 0.01 : part === duct ? 0.21 : 0.21);
      st.position.set(wp.x, 0, wp.z);
      rod.scale.y = Math.max(top, 0.01); rod.position.y = top / 2; foot.position.y = 0.006;
    });
    camera.lookAt(look);
  };
  stage.start();
}
