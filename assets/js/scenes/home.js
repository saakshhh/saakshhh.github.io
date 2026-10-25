/* Home: the car on a polished studio floor under a softbox, slowly turning. */
import * as THREE from 'three';
import { Reflector } from '../../vendor/jsm/objects/Reflector.js';
import { createStage, studioEnvironment, radialTexture, reduceMotion } from '../engine.js';
import { buildCar } from '../car.js';

const host = document.querySelector('[data-scene]');
const canvas = host && host.querySelector('canvas');
const stage = host && createStage({ host, canvas, exposure: 1.05, fov: 26, bloom: { strength: 0.22, radius: 0.5, threshold: 1.25 } });

if (stage) {
  const { scene, camera, renderer, input } = stage;
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 1;
  scene.fog = new THREE.Fog(0x0e0f24, 14, 34);

  // mirror floor under a semi-opaque, slightly rough top layer = soft glossy reflection
  const mirror = new Reflector(new THREE.CircleGeometry(40, 64), {
    textureWidth: 1024, textureHeight: 1024, color: 0x6b6f80, clipBias: 0.003,
  });
  mirror.rotation.x = -Math.PI / 2; mirror.position.y = -0.002; scene.add(mirror);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({
    color: 0x0b0c1a, roughness: 0.55, metalness: 0.2, transparent: true, opacity: 0.78,
  }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // pit-box markings
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.6, transparent: true, opacity: 0.5 });
  [[-1.55, 0], [1.55, 0]].forEach(([x]) => {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 9), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.002, 0); scene.add(l);
  });
  const stop = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.08), new THREE.MeshStandardMaterial({ color: 0xffb547, roughness: 0.6, transparent: true, opacity: 0.6 }));
  stop.rotation.x = -Math.PI / 2; stop.position.set(0, 0.002, 3.6); scene.add(stop);

  // contact shadow (ambient occlusion under the floor of the car)
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 6.6), new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 'rgba(0,0,0,0.85)'], [0.55, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false,
  }));
  ao.rotation.x = -Math.PI / 2; ao.position.y = 0.004;

  const turntable = new THREE.Group(); scene.add(turntable);
  const car = buildCar(); turntable.add(car); turntable.add(ao);
  car.userData.wheels.forEach((w) => { if (w.front) w.steer.rotation.y = -0.22; });

  // key light: overhead softbox spot with soft shadows
  const key = new THREE.SpotLight(0xffffff, 150, 30, 0.6, 0.95, 1.6);
  key.position.set(1.5, 9, 3); key.target.position.set(0, 0, 0); key.angle = 0.48;
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.radius = 6;
  key.shadow.camera.near = 4; key.shadow.camera.far = 16;
  scene.add(key, key.target);
  // brand-coloured rim lights
  const rimR = new THREE.SpotLight(0xff3d2e, 100, 20, 0.6, 0.8, 1.5); rimR.position.set(-6, 2.5, -5); scene.add(rimR);
  const rimB = new THREE.SpotLight(0xa9b4ff, 90, 20, 0.6, 0.8, 1.5); rimB.position.set(6, 3, -4); scene.add(rimB);
  scene.add(new THREE.HemisphereLight(0x8890c0, 0x0a0a12, 0.25));

  // dust drifting in the light
  const N = 500, dust = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 3.2; dust[i * 3] = Math.cos(a) * r + 1; dust[i * 3 + 1] = Math.random() * 5; dust[i * 3 + 2] = Math.sin(a) * r; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  const dustPts = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.014, color: 0xffe2b8, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dustPts);

  const target = new THREE.Vector3(); let camDist = 11, camH = 1.5, lookOffset = new THREE.Vector3();
  stage.onResize = (s) => {
    // shift the projection so the car sits right of the headline on wide screens, above it on phones
    if (s.narrow) { camDist = 25; camH = 4.2; lookOffset.set(0, 0, 0); camera.fov = 30; camera.setViewOffset(s.width, s.height, 0, s.height * 0.2, s.width, s.height); }
    else { camDist = s.width < 1100 ? 22 : s.width < 1600 ? 19 : 16; camH = 2.4; lookOffset.set(0, 0, 0); camera.fov = 26; camera.setViewOffset(s.width, s.height, -s.width * (s.width < 1600 ? 0.25 : 0.2), s.height * 0.02, s.width, s.height); }
  };

  stage.onFrame = (dt, t) => {
    turntable.rotation.y = 0.75 + (reduceMotion ? 0 : t * 0.12) + input.drag;
    const yaw = -0.35 + input.sx * 0.12, pitch = input.sy * 0.25;
    camera.position.set(Math.sin(yaw) * camDist, camH - pitch, Math.cos(yaw) * camDist);
    target.copy(turntable.position).add(lookOffset);
    camera.lookAt(target.x, target.y + 0.35, target.z);
    const p = dustGeo.attributes.position;
    for (let i = 0; i < N; i++) { let y = p.getY(i) + dt * 0.05; if (y > 5) y = 0; p.setY(i, y); }
    p.needsUpdate = true;
  };
  window.__f1 = { stage, turntable, car };
  stage.start();
}
