
  /* ───────── 3D circuit hero ───────── */
  (function () {
    const hero = document.querySelector('.home-hero');
    if (!hero) return;
    const canvas = document.getElementById('circuit');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!window.THREE) { hero.classList.add('no-webgl'); return; }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) { hero.classList.add('no-webgl'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const C = { ink: 0x0e0f24, asphalt: 0x1d2050, line: 0x2c3066, chalk: 0xf2efe8, livery: 0xff3d2e, ice: 0xa9b4ff, sodium: 0xffb547 };

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(C.ink, 14, 34);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);

    const world = new THREE.Group();
    scene.add(world);
    const track = new THREE.Group();
    track.position.set(-0.5, 0, 0.2);
    world.add(track);

    // Circuit layout (x, y, z) – a little elevation so it reads as 3D
    const curve = new THREE.CatmullRomCurve3([
      [-6, 0, -1], [-4.5, 0.4, -3.6], [-0.5, 0.9, -4], [3, 0.3, -2.6], [6.2, 0, -3.2],
      [7.6, 0.2, -0.4], [5.2, 0.7, 1.6], [2, 0.2, 0.9], [0.4, 0, 3.1], [-3.2, 0.3, 3.6], [-6.6, 0.5, 2.4]
    ].map(p => new THREE.Vector3(p[0], p[1], p[2])), true, 'catmullrom', 0.5);

    const UP = new THREE.Vector3(0, 1, 0);
    function sideAt(u, w) {
      return new THREE.Vector3().crossVectors(curve.getTangentAt(u), UP).normalize().multiplyScalar(w);
    }

    // Road surface
    const SEG = 500, ROAD = 0.42;
    (function () {
      const pos = [], idx = [];
      for (let i = 0; i <= SEG; i++) {
        const u = (i / SEG) % 1, p = curve.getPointAt(u), s = sideAt(u, ROAD);
        pos.push(p.x + s.x, p.y, p.z + s.z, p.x - s.x, p.y, p.z - s.z);
        if (i < SEG) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      track.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: C.asphalt, side: THREE.DoubleSide })));

      // Edge lines + red/white kerbs on both sides
      [1, -1].forEach(sign => {
        const pts = [], cols = [];
        for (let i = 0; i <= SEG; i++) {
          const u = (i / SEG) % 1, p = curve.getPointAt(u), s = sideAt(u, ROAD * sign);
          pts.push(p.x + s.x, p.y + 0.01, p.z + s.z);
          const kerb = Math.floor(i / 6) % 2 === 0 ? new THREE.Color(C.livery) : new THREE.Color(C.chalk);
          cols.push(kerb.r, kerb.g, kerb.b);
        }
        const g2 = new THREE.BufferGeometry();
        g2.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        g2.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        track.add(new THREE.Line(g2, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })));
      });

      // Dashed centre line
      const cg = new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(400).map(p => p.clone().setY(p.y + 0.012)));
      const cl = new THREE.Line(cg, new THREE.LineDashedMaterial({ color: C.ice, dashSize: 0.18, gapSize: 0.22, transparent: true, opacity: 0.45 }));
      cl.computeLineDistances();
      track.add(cl);
    })();

    // Pillars under the track, so the elevation reads
    for (let i = 0; i < 40; i++) {
      const p = curve.getPointAt(i / 40);
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x, -0.6, p.z), new THREE.Vector3(p.x, p.y, p.z)]);
      track.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: C.line, transparent: true, opacity: 0.7 })));
    }

    // Start / finish line
    (function () {
      const c = document.createElement('canvas'); c.width = 128; c.height = 32;
      const x = c.getContext('2d');
      for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {
        x.fillStyle = (i + j) % 2 ? '#0e0f24' : '#f2efe8'; x.fillRect(i * 16, j * 16, 16, 16);
      }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ROAD * 2, 0.22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide }));
      const p = curve.getPointAt(0);
      m.position.set(p.x, p.y + 0.015, p.z);
      m.lookAt(curve.getPointAt(0.002).add(new THREE.Vector3(0, 0.015, 0)));
      m.rotateX(-Math.PI / 2);
      track.add(m);
    })();

    // Soft glow texture for lights
    function glow(rgba) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, rgba); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }
    const sodiumGlow = glow('rgba(255,181,71,0.55)');
    function sprite(tex, s) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      sp.scale.set(s, s, 1); return sp;
    }

    // Floodlight towers
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.3;
      const x = Math.cos(a) * 9.6 + 0.6, z = Math.sin(a) * 6.4;
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -0.6, z), new THREE.Vector3(x, 2.8, z)]);
      track.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: C.line })));
      const l = sprite(sodiumGlow, 1.5); l.position.set(x, 2.85, z); track.add(l);
    }

    // Floor grid
    const grid = new THREE.GridHelper(70, 70, C.line, 0x1a1c3d);
    grid.position.y = -0.6;
    grid.material.transparent = true; grid.material.opacity = 0.55;
    world.add(grid);

    // Night-sky particles
    (function () {
      const n = 900, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 60;
        arr[i * 3 + 1] = Math.random() * 16 + 1.5;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 50 - 6;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      world.add(new THREE.Points(g, new THREE.PointsMaterial({ color: C.ice, size: 0.07, transparent: true, opacity: 0.75, depthWrite: false })));
    })();

    // The car
    const car = new THREE.Group();
    car.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.62), new THREE.MeshBasicMaterial({ color: C.chalk })));
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.09), new THREE.MeshBasicMaterial({ color: C.livery }));
    wing.position.set(0, 0.09, -0.27); car.add(wing);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.08), new THREE.MeshBasicMaterial({ color: C.livery }));
    nose.position.set(0, -0.03, 0.3); car.add(nose);
    car.add(sprite(glow('rgba(255,61,46,0.5)'), 1.4));
    track.add(car);

    // Light trail (a tapered ribbon behind the car)
    const TN = 110;
    const trailPos = new Float32Array((TN + 1) * 2 * 3), trailCol = new Float32Array((TN + 1) * 2 * 3), trailIdx = [];
    for (let i = 0; i < TN; i++) { const a = i * 2; trailIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    trailGeo.setIndex(trailIdx);
    track.add(new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    const red = new THREE.Color(C.livery);

    function placeCar(t) {
      const p = curve.getPointAt(t);
      car.position.set(p.x, p.y + 0.08, p.z);
      car.lookAt(curve.getPointAt((t + 0.002) % 1).add(new THREE.Vector3(0, 0.08, 0)));
      for (let i = 0; i <= TN; i++) {
        const u = ((t - i * 0.0016) % 1 + 1) % 1, q = curve.getPointAt(u), f = 1 - i / TN, s = sideAt(u, 0.13 * f);
        const o = i * 6;
        trailPos[o] = q.x + s.x; trailPos[o + 1] = q.y + 0.06; trailPos[o + 2] = q.z + s.z;
        trailPos[o + 3] = q.x - s.x; trailPos[o + 4] = q.y + 0.06; trailPos[o + 5] = q.z - s.z;
        const k = f * f;
        trailCol[o] = trailCol[o + 3] = red.r * k; trailCol[o + 1] = trailCol[o + 4] = red.g * k; trailCol[o + 2] = trailCol[o + 5] = red.b * k;
      }
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.attributes.color.needsUpdate = true;
    }

    // Layout
    let narrow = false, baseCam = new THREE.Vector3(), lookY = 0.3;
    function resize() {
      const w = hero.clientWidth, h = hero.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      narrow = w < 760;
      if (narrow) { world.position.set(0, 0, 0); world.scale.setScalar(0.42); baseCam.set(0, 9, 13); lookY = -2.4; }
      else { world.position.set(w < 1100 ? 3.4 : 3.9, 0, -0.5); world.scale.setScalar(w < 1100 ? 0.55 : 0.62); baseCam.set(0, 8.5, 14.5); lookY = 0.6; }
      camera.updateProjectionMatrix();
      if (!running || reduce) render();
    }

    // Interaction: drag to spin, gentle parallax
    let rotY = -0.35, vel = 0, dragging = false, px = 0, mx = 0, my = 0, t = 0.08;
    canvas.addEventListener('pointerdown', e => {
      dragging = true; px = e.clientX; vel = 0;
      canvas.setPointerCapture(e.pointerId); hero.classList.add('grabbing');
    });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - px; px = e.clientX;
      rotY += dx * 0.006; vel = dx * 0.0006;
      if (reduce) render();
    });
    const end = () => { dragging = false; hero.classList.remove('grabbing'); };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    if (!reduce) window.addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });

    function render() {
      world.rotation.y = rotY;
      const scrollLift = Math.min(window.scrollY / Math.max(hero.clientHeight, 1), 1);
      camera.position.set(baseCam.x + mx * 1.4, baseCam.y - my * 0.9 + scrollLift * 3, baseCam.z);
      camera.lookAt(0, lookY, 0);
      placeCar(t);
      renderer.render(scene, camera);
    }

    let running = false, last = 0;
    function frame(now) {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      t = (t + dt * 0.075) % 1;
      if (!dragging) { rotY += 0.06 * dt + vel; vel *= 0.94; }
      render();
      requestAnimationFrame(frame);
    }
    function start() { if (running || reduce) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
    function stop() { running = false; }

    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    window.addEventListener('resize', resize);
    resize();
    render();
  })();

  
