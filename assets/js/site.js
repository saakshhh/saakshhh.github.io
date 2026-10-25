/* Navigation menu, project-card tilt and email copy. Shared by every page. */
(function () {
  /* ── mobile menu ── */
  const nav = document.querySelector('.nav');
  const btn = nav && nav.querySelector('.menu-btn');
  if (btn) {
    const set = (open) => {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('span').textContent = open ? 'Close' : 'Menu';
    };
    btn.addEventListener('click', () => set(!nav.classList.contains('open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) set(false); });
  }

  /* ── 3D tilt on project cards ── */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y) * 12).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ── copy email ── */
  document.querySelectorAll('[data-copy]').forEach((b) => {
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        b.textContent = 'Email copied';
      } catch (e) {
        b.textContent = 'Press Ctrl+C to copy';
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('.email'));
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      }
      setTimeout(() => { b.textContent = 'Copy email'; }, 2200);
    });
  });
})();
