/* About: a modern F1 steering wheel. Shift lights climb through the gears,
   the dash updates, and the wheel steers with your cursor. */
import * as THREE from 'three';
import { createStage, studioEnvironment, canvasTexture, reduceMotion } from '../engine.js';
import { makeMaterials } from '../car.js';

const host = document.querySelector('[data-scene]');
const canvas = host && host.querySelector('canvas');
const stage = host && createStage({ host, canvas, exposure: 1.0, fov: 28, shadows: false, bloom: { strength: 0.85, radius: 0.45, threshold: 0.95 } });

if (stage) {
  const { scene, camera, renderer, input } = stage;
  scene.environment = studioEnvironment(renderer);
  const M = makeMaterials();

  const W = 2.0, TOP = 0.6, BOT = -0.75;
  const wheel = new THREE.Group(); scene.add(wheel);
  const plate = new THREE.Group(); wheel.add(plate);

  /* faceplate: carbon with printed button labels */
  const faceTex = canvasTexture(1024, 692, (g, w, h) => {
    const n = 48, s = w / n;
    for (let y = 0; y < Math.ceil(h / s); y++) for (let x = 0; x < n; x++) {
      const tw = ((x + y) >> 1) % 2 === 0;
      const gr = tw ? g.createLinearGradient(x * s, y * s, x * s + s, y * s) : g.createLinearGradient(x * s, y * s, x * s, y * s + s);
      gr.addColorStop(0, '#0b0c10'); gr.addColorStop(0.5, tw ? '#25272e' : '#1c1e24'); gr.addColorStop(1, '#0b0c10');
      g.fillStyle = gr; g.fillRect(x * s, y * s, s, s);
    }
    const P = (x, y) => [((x + W / 2) / W) * w, (1 - (y - BOT) / (TOP - BOT)) * h];
    g.fillStyle = '#e9e7f0'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 19px "Instrument Sans", Arial, sans-serif';
    [['PIT', -0.72, 0.135], ['N', 0.72, 0.135], ['RADIO', -0.72, -0.115], ['OK', 0.72, -0.115], ['DRS', -0.72, -0.365], ['BOX', 0.72, -0.365],
     ['STRAT', -0.45, -0.37], ['BBAL', 0, -0.37], ['DIFF', 0.45, -0.37]].forEach(([t, x, y]) => g.fillText(t, ...P(x, y)));
    g.strokeStyle = 'rgba(169,180,255,0.35)'; g.lineWidth = 2;
    const [ax, ay] = P(-0.52, 0.42), [bx, by] = P(0.52, -0.2);
    g.strokeRect(ax, ay, bx - ax, by - ay);
  });
  faceTex.repeat.set(1 / W, 1 / (TOP - BOT)); faceTex.offset.set(0.5, -BOT / (TOP - BOT));
  const faceMat = new THREE.MeshPhysicalMaterial({ map: faceTex, metalness: 0.25, roughness: 0.38, clearcoat: 0.9, clearcoatRoughness: 0.1 });

  const outline = new THREE.Shape();
  const r = 0.22;
  outline.moveTo(-W / 2 + r, BOT);
  outline.lineTo(-0.35, BOT); outline.quadraticCurveTo(0, BOT + 0.12, 0.35, BOT);
  outline.lineTo(W / 2 - r, BOT); outline.quadraticCurveTo(W / 2, BOT, W / 2, BOT + r);
  outline.lineTo(W / 2, TOP - r); outline.quadraticCurveTo(W / 2, TOP, W / 2 - r, TOP);
  outline.lineTo(-W / 2 + r, TOP); outline.quadraticCurveTo(-W / 2, TOP, -W / 2, TOP - r);
  outline.lineTo(-W / 2, BOT + r); outline.quadraticCurveTo(-W / 2, BOT, -W / 2 + r, BOT);
  const D = 0.16;
  const bodyGeo = new THREE.ExtrudeGeometry(outline, { depth: D, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.03, bevelSegments: 4, curveSegments: 24 });
  plate.add(new THREE.Mesh(bodyGeo, [faceMat, M.carbon]));
  const FZ = D + 0.03; // front face z

  /* grips: rubberised, with a fine stipple bump */
  const stipple = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { g.fillStyle = Math.random() > 0.5 ? '#9a9a9a' : '#666'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  }, { repeat: [4, 4], srgb: false });
  const gripMat = new THREE.MeshPhysicalMaterial({ color: 0x17171b, roughness: 0.92, bumpMap: stipple, bumpScale: 0.6, sheen: 0.5, sheenColor: new THREE.Color(0x2a2a33), sheenRoughness: 0.9 });
  [1, -1].forEach((s) => {
    const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.95, 12, 28), gripMat);
    grip.scale.set(1.05, 1, 1.35); grip.rotation.z = s * 0.14; grip.position.set(s * 1.18, -0.12, 0.06);
    plate.add(grip);
    const horn = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.18, 8, 16), M.carbon);
    horn.rotation.z = s * -0.9; horn.position.set(s * 1.05, 0.52, 0.08); plate.add(horn);
    // shift paddles (behind, upper) and clutch paddles (behind, lower)
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.025), M.carbon);
    paddle.position.set(s * 0.95, 0.42, -0.16); paddle.rotation.z = s * -0.25; plate.add(paddle);
    const clutch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.025), M.carbon);
    clutch.position.set(s * 0.82, -0.52, -0.16); clutch.rotation.z = s * 0.3; plate.add(clutch);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.03), M.red);
    tip.position.set(s * 1.25, 0.34, -0.16); tip.rotation.z = s * -0.25; plate.add(tip);
  });

  /* quick-release hub */
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.28, 48), M.metal);
  hub.rotation.x = Math.PI / 2; hub.position.z = -0.2; plate.add(hub);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 24), M.rim);
  col.rotation.x = Math.PI / 2; col.position.z = -1.8; wheel.add(col);

  /* dash display */
  const dash = document.createElement('canvas'); dash.width = 640; dash.height = 340;
  const dctx = dash.getContext('2d');
  const dashTex = new THREE.CanvasTexture(dash); dashTex.colorSpace = THREE.SRGBColorSpace; dashTex.anisotropy = 8;
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.62, 0.05), M.glass);
  bezel.position.set(0, 0.11, FZ + 0.005); plate.add(bezel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.54), new THREE.MeshBasicMaterial({ map: dashTex, toneMapped: false }));
  screen.position.set(0, 0.11, FZ + 0.032); plate.add(screen);

  let gear = 3, rpm = 0.5, lastDash = -1;
  function drawDash(t) {
    const g = dctx, w = dash.width, h = dash.height;
    g.fillStyle = '#06070d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff3d2e'; g.fillRect(0, 0, w, 6);
    g.textBaseline = 'middle';
    g.fillStyle = '#f2efe8'; g.textAlign = 'center';
    g.font = '900 190px "Unbounded", Arial, sans-serif';
    g.fillText(String(gear), w / 2, h * 0.52);
    g.font = '700 26px "Instrument Sans", Arial, sans-serif';
    g.textAlign = 'left'; g.fillStyle = '#8a8ba8'; g.fillText('LAP', 26, 46); g.fillText('DELTA', 26, 140); g.fillText('TYRE', 26, 234);
    g.textAlign = 'right'; g.fillText('ERS', w - 26, 46); g.fillText('BBAL', w - 26, 140); g.fillText('SPEED', w - 26, 234);
    g.font = '800 40px "Unbounded", Arial, sans-serif';
    g.textAlign = 'left'; g.fillStyle = '#f2efe8'; g.fillText('27', 26, 88);
    const delta = (Math.sin(t * 0.7) * 0.25 - 0.08);
    g.fillStyle = delta < 0 ? '#3ddc84' : '#ff3d2e'; g.fillText((delta < 0 ? '-' : '+') + Math.abs(delta).toFixed(3), 26, 182);
    g.fillStyle = '#ff3d2e'; g.fillText('SOFT', 26, 276);
    g.textAlign = 'right'; g.fillStyle = '#ffb547'; g.fillText(Math.round(62 + Math.sin(t * 0.4) * 20) + '%', w - 26, 88);
    g.fillStyle = '#f2efe8'; g.fillText('56.5', w - 26, 182);
    g.fillText(String(Math.round(180 + gear * 18 + rpm * 22)), w - 26, 276);
    // rev bar
    g.fillStyle = '#1a1c2c'; g.fillRect(26, h - 26, w - 52, 10);
    g.fillStyle = rpm > 0.95 ? '#a9b4ff' : '#ff3d2e'; g.fillRect(26, h - 26, (w - 52) * rpm, 10);
    dashTex.needsUpdate = true;
  }

  /* shift lights: 5 green, 5 red, 5 blue */
  const leds = [];
  const ledCols = [0x3ddc84, 0x3ddc84, 0x3ddc84, 0x3ddc84, 0x3ddc84, 0xff2a1a, 0xff2a1a, 0xff2a1a, 0xff2a1a, 0xff2a1a, 0x6f84ff, 0x6f84ff, 0x6f84ff, 0x6f84ff, 0x6f84ff];
  const ledGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.03, 24);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.1, 0.03), M.black);
  housing.position.set(0, 0.5, FZ + 0.01); plate.add(housing);
  ledCols.forEach((c, i) => {
    const on = new THREE.Color(c).multiplyScalar(5), off = new THREE.Color(c).multiplyScalar(0.06);
    const m = new THREE.MeshBasicMaterial({ color: off.clone(), toneMapped: false });
    const led = new THREE.Mesh(ledGeo, m);
    led.rotation.x = Math.PI / 2; led.position.set(-0.735 + i * 0.105, 0.5, FZ + 0.03);
    plate.add(led); leds.push({ m, on, off });
  });
  // rain / pit-limiter lights at the corners
  [-1, 1].forEach((s) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb547).multiplyScalar(0.08), toneMapped: false });
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 24), m);
    l.rotation.x = Math.PI / 2; l.position.set(s * 0.86, 0.5, FZ + 0.02); plate.add(l);
    leds.push({ m, side: true });
  });

  /* buttons with metal bezels */
  const btnColors = [0xff3d2e, 0xf2efe8, 0xffb547, 0x3ddc84, 0x6f84ff, 0x1b1c22];
  [[-0.72, 0.25], [0.72, 0.25], [-0.72, 0.0], [0.72, 0.0], [-0.72, -0.25], [0.72, -0.25]].forEach(([x, y], i) => {
    const bez = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 10, 32), M.metal);
    bez.position.set(x, y, FZ + 0.006); plate.add(bez);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.062, 0.05, 32), new THREE.MeshPhysicalMaterial({ color: btnColors[i], roughness: 0.35, clearcoat: 1 }));
    cap.rotation.x = Math.PI / 2; cap.position.set(x, y, FZ + 0.02); plate.add(cap);
  });

  /* rotary switches: anodised, knurled, with a pointer */
  const knurl = canvasTexture(256, 32, (g, w, h) => {
    for (let i = 0; i < 64; i++) { g.fillStyle = i % 2 ? '#d0d3dc' : '#6c707c'; g.fillRect((i * w) / 64, 0, w / 64, h); }
  }, { srgb: true });
  const knobMats = [0xff3d2e, 0xa9b4ff, 0xffb547].map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: 0.3, map: knurl }));
  const knobs = [];
  [[-0.45, -0.52], [0, -0.52], [0.45, -0.52]].forEach(([x, y], i) => {
    const k = new THREE.Group(); k.position.set(x, y, FZ);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.105, 0.09, 48), [knobMats[i], new THREE.MeshStandardMaterial({ color: 0x24262e, metalness: 0.9, roughness: 0.35 }), knobMats[i]]);
    body.rotation.x = Math.PI / 2; body.position.z = 0.045; k.add(body);
    const ptr = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.07, 0.01), new THREE.MeshBasicMaterial({ color: 0xf2efe8 }));
    ptr.position.set(0, 0.05, 0.095); k.add(ptr);
    plate.add(k); knobs.push(k);
  });
  // thumb toggles on the grips
  [1, -1].forEach((s) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 24), M.metal);
    t.rotation.x = Math.PI / 2; t.position.set(s * 1.05, 0.28, FZ - 0.01); plate.add(t);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 24), s > 0 ? M.sodium : M.red);
    cap.rotation.x = Math.PI / 2; cap.position.set(s * 1.05, 0.28, FZ + 0.025); plate.add(cap);
  });

  /* lights */
  const key = new THREE.SpotLight(0xffffff, 60, 20, 0.5, 0.9, 1.5); key.position.set(-3, 5, 6); scene.add(key);
  const rimR = new THREE.PointLight(0xff3d2e, 18, 10, 1.6); rimR.position.set(3, 1, -2); scene.add(rimR);
  const rimB = new THREE.PointLight(0xa9b4ff, 12, 10, 1.6); rimB.position.set(-3, -1.5, -1.5); scene.add(rimB);
  scene.add(new THREE.HemisphereLight(0x9aa2d0, 0x0a0a12, 0.3));

  // the glow of the dash on the grips and fingers
  const dashLight = new THREE.PointLight(0xf2efe8, 1.2, 2, 2); dashLight.position.set(0, 0.11, FZ + 0.3); plate.add(dashLight);

  stage.onResize = (s) => {
    if (s.narrow) { camera.position.set(0, 0.1, 14.5); camera.fov = 30; camera.setViewOffset(s.width, s.height, 0, s.height * 0.24, s.width, s.height); }
    else { camera.position.set(0, 0.2, s.width < 1100 ? 8.4 : 7.4); camera.fov = 28; camera.setViewOffset(s.width, s.height, -s.width * 0.19, s.height * 0.03, s.width, s.height); }
    camera.lookAt(0, -0.05, 0);
  };

  document.fonts && document.fonts.ready.then(() => { lastDash = -1; if (reduceMotion) stage.renderOnce(); });

  stage.onFrame = (dt, t) => {
    // rev up through the gears; short-shift on the blue lights
    if (!reduceMotion && dt) {
      rpm += dt * (0.32 - gear * 0.018);
      if (rpm > 1.04) { gear = gear >= 8 ? 3 : gear + 1; rpm = 0.5; lastDash = -1; }
    } else if (reduceMotion) { rpm = 0.78; }
    const lit = Math.floor(Math.min(rpm, 1) * 15.999);
    const flash = rpm > 0.98 && Math.floor(t * 16) % 2 === 0;
    leds.forEach((l, i) => {
      if (l.side) { l.m.color.setRGB(1, 0.71, 0.28).multiplyScalar(gear === 8 && Math.floor(t * 3) % 2 ? 4 : 0.06); return; }
      l.m.color.copy(flash ? l.off : (i < lit ? l.on : l.off));
    });
    if (lastDash < 0 || t - lastDash > 0.12) { drawDash(t); lastDash = t; }

    // steer with the cursor, rock a little at idle
    const steerTo = -input.sx * 0.55 + (reduceMotion ? 0 : Math.sin(t * 0.6) * 0.04);
    wheel.rotation.z += (steerTo - wheel.rotation.z) * Math.min(dt * 4, 1);
    wheel.rotation.y = -0.38 + input.sx * 0.18 + input.drag;
    wheel.rotation.x = 0.08 + input.sy * 0.12;
    knobs[1].rotation.z = -gear * 0.35;
    if (reduceMotion || !dt) { wheel.rotation.z = steerTo; }
  };
  stage.start();
}
