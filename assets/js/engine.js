/* Shared 3D stage: renderer, post-processing, environment lighting, input,
   resize handling and a render loop that pauses when the scene is off-screen. */
import * as THREE from 'three';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// ?still renders single frames on demand (used for screenshots / debugging)
const still = /[?&]still/.test(location.search);

export function createStage({
  host, canvas, exposure = 1, bloom = null, shadows = true,
  fov = 35, near = 0.1, far = 1000, background = 0x0e0f24, maxDpr = 1.75,
}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !bloom, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('no gl');
  } catch (e) {
    host.classList.add('no-webgl');
    return null;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  if (background !== null) scene.background = new THREE.Color(background);
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);

  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);

  let composer = null, bloomPass = null;
  if (bloom) {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(4, 4), bloom.strength, bloom.radius, bloom.threshold);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    composer.setPixelRatio(dpr);
  }

  const stage = {
    THREE, renderer, scene, camera, composer, bloomPass, host, canvas,
    width: 1, height: 1, aspect: 1, narrow: false,
    input: { mx: 0, my: 0, sx: 0, sy: 0, drag: 0, dragV: 0, dragging: false },
    onResize: null, onFrame: null, time: 0,
  };

  /* ── input: pointer parallax + drag to rotate ── */
  const input = stage.input;
  let lastX = 0;
  window.addEventListener('pointermove', (e) => {
    input.mx = (e.clientX / innerWidth) * 2 - 1;
    input.my = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  canvas.addEventListener('pointerdown', (e) => {
    input.dragging = true; lastX = e.clientX; input.dragV = 0;
    canvas.setPointerCapture(e.pointerId);
    host.classList.add('grabbing');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!input.dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    input.drag += dx * 0.006; input.dragV = dx * 0.006;
    if (reduceMotion) renderOnce();
  });
  const endDrag = () => { input.dragging = false; host.classList.remove('grabbing'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  /* ── sizing ── */
  function resize() {
    const w = Math.max(host.clientWidth, 1), h = Math.max(host.clientHeight, 1);
    stage.width = w; stage.height = h; stage.aspect = w / h; stage.narrow = w < 760;
    renderer.setSize(w, h, false);
    if (composer) { composer.setSize(w, h); bloomPass.resolution.set(w, h); }
    camera.aspect = w / h;
    if (stage.onResize) stage.onResize(stage);
    camera.updateProjectionMatrix();
    if (!running) renderOnce();
  }

  function draw() {
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  function renderOnce() {
    if (stage.onFrame) stage.onFrame(0, stage.time);
    draw();
  }

  /* ── loop with adaptive quality ── */
  let running = false, last = 0, frames = 0, slowAcc = 0;
  function frame(now) {
    if (!running) return;
    const raw = (now - last) / 1000; last = now;
    const dt = Math.min(raw, 0.05);
    stage.time += dt;
    // smooth the drag inertia
    if (!input.dragging) { input.drag += input.dragV; input.dragV *= 0.93; }
    input.sx += (input.mx - input.sx) * Math.min(dt * 3, 1);
    input.sy += (input.my - input.sy) * Math.min(dt * 3, 1);
    if (stage.onFrame) stage.onFrame(dt, stage.time);
    draw();
    // after warm-up, drop resolution once if the device is struggling
    frames++;
    if (frames > 30 && frames < 150) {
      slowAcc += raw;
      if (frames === 149 && slowAcc / 119 > 0.034 && dpr > 1) {
        dpr = 1; renderer.setPixelRatio(1); if (composer) composer.setPixelRatio(1); resize();
      }
    }
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduceMotion || still) return;
    running = true; last = performance.now(); requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible && !document.hidden ? start() : stop(); })
    .observe(host);
  document.addEventListener('visibilitychange', () => (document.hidden || !visible ? stop() : start()));
  window.addEventListener('resize', resize);

  stage.resize = resize;
  stage.start = () => { resize(); host.classList.add('ready'); start(); if (reduceMotion || still) renderOnce(); };
  stage.renderAt = (t) => { stage.time = t; renderOnce(); };
  window.__stage = stage;
  stage.renderOnce = renderOnce;
  return stage;
}

/* Bake a light-emitting environment scene into a prefiltered env map,
   which drives the reflections that make paint and carbon read as real. */
export function bakeEnvironment(renderer, build) {
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  build(envScene);
  const rt = pm.fromScene(envScene, 0.02);
  envScene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  pm.dispose();
  return rt.texture;
}

export function glowMaterial(color, intensity) {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, toneMapped: false });
}

/* Studio: big overhead softboxes, side strip lights, brand-tinted rims. */
export function studioEnvironment(renderer, { red = 0xff3d2e, ice = 0xa9b4ff } = {}) {
  return bakeEnvironment(renderer, (s) => {
    s.background = new THREE.Color(0x020309);
    const room = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x05060d, side: THREE.BackSide }));
    s.add(room);
    const panel = (w, h, color, k, pos, look) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glowMaterial(color, k));
      m.position.set(...pos); m.lookAt(...look); s.add(m);
    };
    panel(14, 3.2, 0xffffff, 3.2, [0, 12, 0], [0, 0, 0]);
    panel(14, 1.0, 0xffffff, 2.2, [0, 11, 6], [0, 0, 0]);
    panel(14, 1.0, 0xffffff, 2.2, [0, 11, -6], [0, 0, 0]);
    panel(1.2, 7, 0xfff2e0, 1.6, [-14, 4, 3], [0, 2, 0]);
    panel(1.2, 7, 0xe8ecff, 1.6, [14, 4, -3], [0, 2, 0]);
    panel(10, 1.2, red, 2.4, [-8, 2, -14], [0, 1, 0]);
    panel(10, 1.2, ice, 2.0, [8, 2, 14], [0, 1, 0]);
    // floor stays dark so lower bodywork reflects the ground
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0x030306 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.5; s.add(floor);
  });
}

/* Night circuit: deep sky, rows of floodlights and a warm city glow. */
export function nightEnvironment(renderer) {
  return bakeEnvironment(renderer, (s) => {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 top = vec3(0.004,0.006,0.02); vec3 hor = vec3(0.09,0.07,0.09); vec3 c = mix(hor, top, smoothstep(-0.05, 0.5, h)); if (h < 0.0) c = vec3(0.01); gl_FragColor = vec4(c,1.0); }',
    }));
    s.add(sky);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), glowMaterial(i % 3 ? 0xfff1d6 : 0xffd29a, 9));
      m.position.set(Math.cos(a) * 26, 9 + (i % 2) * 2, Math.sin(a) * 26);
      m.lookAt(0, 0, 0); s.add(m);
    }
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(30, 1.5), glowMaterial(0xff8a3d, 0.6));
    strip.position.set(0, 2, -30); s.add(strip);
    const strip2 = strip.clone(); strip2.position.set(-30, 2, 0); strip2.rotation.y = Math.PI / 2; s.add(strip2);
  });
}

/* Canvas-generated textures */
export function canvasTexture(w, h, paint, { repeat = null, srgb = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

export function radialTexture(stops) {
  return canvasTexture(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}
