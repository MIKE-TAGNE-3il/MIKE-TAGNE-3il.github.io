/* Mike Tagne Fotso — Portfolio
   Motion system: critically damped springs by default (damping 1.0),
   a slight bounce (0.8) only after a gesture that carried momentum.
   Every animation starts from the on-screen value and can be interrupted. */
(() => {
  'use strict';

  const root = document.documentElement;
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mqReduce.matches;
  mqReduce.addEventListener?.('change', e => { reduce = e.matches; });
  const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ------------------------------------------------------------------
     Spring engine — parameterised like Apple: damping ratio + response.
     k = (2π / response)², c = 4π·ζ / response (mass = 1)
  ------------------------------------------------------------------ */
  const springs = new Map();
  let raf = 0, last = 0;
  function tick(ts) {
    const dt = Math.min(last ? ts - last : 16, 40) / 1000; last = ts;
    springs.forEach((s, key) => {
      let rem = dt;
      while (rem > 0) {
        const h = Math.min(rem, 0.004); rem -= h;
        for (const p in s.to) {
          const a = -s.k * (s.v[p] - s.to[p]) - s.c * s.vel[p];
          s.vel[p] += a * h; s.v[p] += s.vel[p] * h;
        }
      }
      let moving = false;
      for (const p in s.to) {
        if (Math.abs(s.vel[p]) > s.eps * 8 || Math.abs(s.v[p] - s.to[p]) > s.eps) moving = true;
      }
      if (!moving) for (const p in s.to) { s.v[p] = s.to[p]; s.vel[p] = 0; }
      s.apply(s.v);
      if (!moving) { springs.delete(key); s.done && s.done(); }
    });
    if (springs.size) raf = requestAnimationFrame(tick); else { raf = 0; last = 0; }
  }
  function spring(key, o) {
    const prev = springs.get(key);
    const vel = {};
    for (const p in o.to) {
      vel[p] = o.velocity && o.velocity[p] !== undefined ? o.velocity[p] : (prev ? prev.vel[p] || 0 : 0);
    }
    const r = o.response || 0.4, d = o.damping === undefined ? 1 : o.damping;
    springs.set(key, {
      v: { ...o.from }, vel, to: { ...o.to }, apply: o.apply, done: o.done, eps: o.eps || 0.01,
      k: Math.pow(2 * Math.PI / r, 2), c: 4 * Math.PI * d / r
    });
    if (!raf) raf = requestAnimationFrame(tick);
  }
  const stopSpring = key => springs.delete(key);

  /* ------------------------------------------------------------------
     Press feedback on pointer-down (not on release)
  ------------------------------------------------------------------ */
  const pressSel = '.btn, .icon-btn, .sheet__close, .card__open';
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest(pressSel); if (!el) return;
    const target = el.classList.contains('card__open') ? el.closest('.card') : el;
    target.classList.add('is-pressed');
    const up = () => { target.classList.remove('is-pressed'); el.removeEventListener('pointerleave', up); };
    el.addEventListener('pointerleave', up, { once: true });
    addEventListener('pointerup', up, { once: true });
    addEventListener('pointercancel', up, { once: true });
  });

  /* ------------------------------------------------------------------
     Pill indicator (nav + lenses)
  ------------------------------------------------------------------ */
  function pill(ind) {
    const st = { x: 0, w: 0, o: 0 }; let placed = false;
    const apply = v => {
      st.x = v.x; st.w = v.w; st.o = v.o;
      ind.style.transform = `translateX(${v.x}px)`; ind.style.width = v.w + 'px'; ind.style.opacity = clamp(v.o, 0, 1);
    };
    return (el, animate) => {
      const to = el ? { x: el.offsetLeft, w: el.offsetWidth, o: 1 } : { x: st.x, w: st.w, o: 0 };
      if (!placed || !animate || reduce) { stopSpring(ind); apply(to); placed = !!el; return; }
      spring(ind, { from: { ...st }, to, apply, damping: 1, response: 0.35 });
    };
  }

  /* ------------------------------------------------------------------
     Nav scrollspy
  ------------------------------------------------------------------ */
  const navLinks = [...document.querySelectorAll('.nav a')];
  const placeNav = pill(document.querySelector('.nav__ind'));
  const spyTargets = ['accueil', 'projets', 'lab', 'experience', 'contact'].map(id => document.getElementById(id));
  let navCurrent = null;
  function setNav(id) {
    const link = navLinks.find(a => a.getAttribute('href') === '#' + id) || null;
    if (link === navCurrent) return;
    navCurrent = link;
    navLinks.forEach(a => a.setAttribute('aria-current', String(a === link)));
    placeNav(link, true);
  }
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) setNav(en.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  spyTargets.forEach(s => s && spy.observe(s));

  /* ------------------------------------------------------------------
     Hero entrance — once, 60 ms stagger. The h1 (LCP) only moves, never fades.
  ------------------------------------------------------------------ */
  if (!reduce && scrollY < 40 && Element.prototype.animate) {
    document.querySelectorAll('[data-enter]').forEach((el, i) => {
      const lcp = el.hasAttribute('data-enter-lcp');
      el.animate(lcp
        ? [{ transform: 'translateY(16px)' }, { transform: 'none' }]
        : [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
        { duration: 560, delay: i * 60, easing: EASE, fill: 'backwards' });
    });
    const photo = document.querySelector('[data-enter-photo]');
    photo && photo.animate([{ transform: 'scale(.97)' }, { transform: 'none' }], { duration: 700, easing: EASE });
  }

  /* ------------------------------------------------------------------
     Section reveal — content is visible at rest; armed only when motion is allowed,
     and only for blocks that are below the fold at load.
  ------------------------------------------------------------------ */
  if (!reduce && 'IntersectionObserver' in window) {
    const blocks = [...document.querySelectorAll('[data-reveal]')];
    blocks.forEach(b => { if (b.getBoundingClientRect().top < innerHeight * 0.92) b.classList.add('is-in'); });
    root.classList.add('rv-armed');
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    blocks.forEach(b => !b.classList.contains('is-in') && io.observe(b));
  }

  /* ------------------------------------------------------------------
     Pipeline — lights up once, left to right (top to bottom on phones)
  ------------------------------------------------------------------ */
  const pipe = document.getElementById('pipe');
  if (pipe && !reduce && Element.prototype.animate && pipe.getBoundingClientRect().top > innerHeight * 0.8) {
    pipe.classList.add('is-arming');
    const stages = [...pipe.querySelectorAll('.stage')];
    const fill = pipe.querySelector('.pipe__fill');
    const io = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      const vertical = matchMedia('(max-width: 860px)').matches;
      const axis = vertical ? 'scaleY' : 'scaleX';
      const total = 1300, step = total / stages.length;
      fill.animate([{ transform: `${axis}(0)` }, { transform: `${axis}(1)` }], { duration: total, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' });
      stages.forEach((s, i) => setTimeout(() => {
        s.classList.add('is-lit');
        s.querySelector('.stage__dot').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 420, easing: EASE });
      }, (i / (stages.length - 1)) * total));
      setTimeout(() => { pipe.classList.remove('is-arming'); stages.forEach(s => s.classList.remove('is-lit')); fill.getAnimations().forEach(a => a.cancel()); }, total + 600);
    }, { threshold: 0.45 });
    io.observe(pipe);
  }

  /* ------------------------------------------------------------------
     Lens (Technique / Gouvernance) — one spring drives --p on the schematic
  ------------------------------------------------------------------ */
  function setupLens(detail) {
    if (detail._lens) { detail._lens.place(); return; }
    const lens = detail.querySelector('.lens'); if (!lens) return;
    const btns = [...lens.querySelectorAll('button')];
    const place = pill(lens.querySelector('.lens__ind'));
    const st = { p: 0 };
    const svg = () => detail.querySelector('svg.dg');
    const apply = v => { st.p = clamp(v.p, 0, 1); const s = svg(); s && s.style.setProperty('--p', st.p.toFixed(4)); };
    lens.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      place(b, true);
      if (reduce) { apply({ p: +b.dataset.v }); return; }
      spring(lens, { from: { ...st }, to: { p: +b.dataset.v }, apply, damping: 1, response: 0.4, eps: 0.001 });
    });
    detail._lens = {
      place: () => place(btns.find(b => b.getAttribute('aria-pressed') === 'true'), false),
      reset: () => { stopSpring(lens); btns.forEach((x, i) => x.setAttribute('aria-pressed', String(i === 0))); apply({ p: 0 }); }
    };
    detail._lens.place();
  }

  /* ------------------------------------------------------------------
     Project sheet — grows from its card and returns to it (symmetric path).
     Driven by one spring p ∈ [0,1]; interruptible in both directions.
  ------------------------------------------------------------------ */
  const sheet = document.getElementById('sheet');
  const scrim = document.getElementById('scrim');
  const content = document.getElementById('sheet-content');
  const scroller = sheet.querySelector('.sheet__scroll');
  const bar = sheet.querySelector('.sheet__bar');
  const closeBtn = sheet.querySelector('.sheet__close');
  const handle = sheet.querySelector('.sheet__handle');
  const cards = [...document.querySelectorAll('[data-project]')];
  const navEl = document.querySelector('.nav');
  const outside = [document.getElementById('main'), navEl, document.querySelector('footer')];

  const S = { card: null, detail: null, svg: null, p: 0, target: 0, geo: null, dragY: 0, pushed: false, lastFocus: null };
  const R = 28;

  function geometry() {
    const sr = sheet.getBoundingClientRect();
    const top = sr.top - S.dragY, bottom = sr.bottom - S.dragY;
    const cr = S.card.getBoundingClientRect();
    return { t: cr.top - top, r: sr.right - cr.right, b: bottom - cr.bottom, l: cr.left - sr.left };
  }
  function render(p) {
    S.p = p;
    const g = S.geo, q = 1 - p;
    const rb = lerp(R, 0, clamp(p, 0, 1));
    sheet.style.clipPath = `inset(${g.t * q}px ${g.r * q}px ${g.b * q}px ${g.l * q}px round ${R}px ${R}px ${rb}px ${rb}px)`;
    const c = clamp((p - 0.35) / 0.65, 0, 1);
    content.style.opacity = c; bar.style.opacity = c;
    content.style.transform = `translateY(${(1 - c) * 16}px)`;
    scrim.style.opacity = clamp(p, 0, 1);
    navEl.style.opacity = 1 - clamp(p * 1.6, 0, 1);
  }
  function setDrag(y) { S.dragY = y; sheet.style.transform = `translateX(-50%) translateY(${y}px)`; }

  function mount(card) {
    S.card = card; S.detail = card.querySelector('.detail'); S.svg = card.querySelector('[data-thumb] svg');
    content.appendChild(S.detail);
    S.detail.querySelector('[data-slot]').appendChild(S.svg);
    S.svg.classList.add('is-live');
    const prevTitle = document.getElementById('sheet-title'); prevTitle && prevTitle.removeAttribute('id');
    S.detail.querySelector('[data-sheet-title]').id = 'sheet-title';
    sheet.classList.add('is-open'); sheet.inert = false;
    scrim.classList.add('is-on');
    scroller.scrollTop = 0;
    root.classList.add('is-locked');
    outside.forEach(el => el && (el.inert = true));
    card.classList.add('is-source');
    setupLens(S.detail);
  }
  function unmount() {
    const { card, detail, svg } = S;
    if (!card) return;
    svg.classList.remove('is-live');
    detail._lens && detail._lens.reset();
    card.querySelector('[data-thumb]').appendChild(svg);
    card.appendChild(detail);
    sheet.classList.remove('is-open'); sheet.inert = true;
    sheet.style.clipPath = ''; sheet.style.opacity = ''; setDrag(0); sheet.style.transform = '';
    scrim.classList.remove('is-on'); scrim.style.opacity = ''; navEl.style.opacity = '';
    content.style.opacity = ''; content.style.transform = ''; bar.style.opacity = '';
    root.classList.remove('is-locked');
    outside.forEach(el => el && (el.inert = false));
    card.classList.remove('is-source');
    const focusTo = card.querySelector('.card__open');
    S.card = S.detail = S.svg = null;
    focusTo && focusTo.focus({ preventScroll: true });
  }

  function open(card, { push = true } = {}) {
    if (S.card && S.card !== card) return;
    if (!S.card) { S.lastFocus = document.activeElement; mount(card); }
    S.target = 1;
    if (push && !S.pushed) { history.pushState({ sheet: card.id }, '', '#' + card.id); S.pushed = true; }
    if (reduce) {
      stopSpring('sheet'); S.geo = { t: 0, r: 0, b: 0, l: 0 }; render(1); navEl.style.opacity = 0;
      sheet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
      scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
    } else {
      if (!springs.has('sheet') && S.p === 0) S.geo = geometry();
      spring('sheet', { from: { p: S.p }, to: { p: 1 }, apply: v => render(v.p), damping: 1, response: 0.5, eps: 0.0005 });
    }
    requestAnimationFrame(() => closeBtn.focus({ preventScroll: true }));
  }

  function close({ fromHistory = false, velocity } = {}) {
    if (!S.card || S.target === 0) return;
    S.target = 0;
    if (!fromHistory && S.pushed) { S.pushed = false; history.back(); }
    else if (!fromHistory && location.hash === '#' + S.card.id) { history.replaceState(null, '', location.pathname + location.search); }
    S.pushed = false;
    if (reduce) {
      stopSpring('sheet');
      const a = sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' });
      scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' });
      a.onfinish = () => { a.cancel(); scrim.getAnimations().forEach(x => x.cancel()); if (S.target === 0) unmount(); };
      return;
    }
    if (S.dragY) {
      spring('drag', { from: { y: S.dragY }, to: { y: 0 }, apply: v => setDrag(v.y), damping: 1, response: 0.45 });
    }
    spring('sheet', {
      from: { p: S.p }, to: { p: 0 }, velocity, apply: v => render(v.p), damping: 1, response: 0.45, eps: 0.0005,
      done: () => { if (S.target === 0) { stopSpring('drag'); unmount(); } }
    });
  }

  cards.forEach(card => {
    card.querySelector('.card__open').addEventListener('click', () => {
      if (S.card === card && S.target === 0) { open(card); return; }   // re-grab mid-close
      open(card);
    });
  });
  closeBtn.addEventListener('click', () => close());
  scrim.addEventListener('click', () => close());

  addEventListener('popstate', () => {
    const id = location.hash.slice(1);
    if (S.card && S.target === 1 && id !== S.card.id) close({ fromHistory: true });
    else if (!S.card) { const c = cards.find(x => x.id === id); c && open(c, { push: false }); }
  });

  // Keyboard: Esc closes, Tab stays inside the sheet
  sheet.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...sheet.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null || x === closeBtn);
    if (!f.length) return;
    const first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });

  // Drag down to dismiss — 1:1 tracking, rubber-band upward, momentum projection on release
  const project = (v, d = 0.998) => (v / 1000) * d / (1 - d);
  const rubber = (o, dim, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o));
  let drag = null;
  handle.addEventListener('pointerdown', e => {
    if (!S.card || S.target !== 1 || e.button > 0) return;
    stopSpring('drag');
    handle.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, y0: e.clientY - S.dragY, hist: [{ y: e.clientY, t: e.timeStamp }] };
  });
  handle.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const raw = e.clientY - drag.y0;
    setDrag(raw >= 0 ? raw : -rubber(-raw, innerHeight));
    drag.hist.push({ y: e.clientY, t: e.timeStamp }); if (drag.hist.length > 6) drag.hist.shift();
  });
  const release = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const h = drag.hist.filter(p => e.timeStamp - p.t < 100); drag = null;
    let v = 0;
    if (h.length > 1) { const a = h[0], b = h[h.length - 1]; v = (b.y - a.y) / Math.max(1, b.t - a.t) * 1000; }
    if (S.dragY + project(v) > 160) close();
    else spring('drag', { from: { y: S.dragY }, to: { y: 0 }, velocity: { y: v }, apply: x => setDrag(x.y), damping: 0.8, response: 0.4 });
  };
  handle.addEventListener('pointerup', release);
  handle.addEventListener('pointercancel', release);

  // Deep link: /#homebox opens that project
  const initial = cards.find(c => '#' + c.id === location.hash);
  if (initial) {
    initial.scrollIntoView({ block: 'center' });
    requestAnimationFrame(() => open(initial, { push: false }));
  }

  addEventListener('resize', () => {
    placeNav(navCurrent, false);
    S.detail && S.detail._lens && S.detail._lens.place();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeNav(navCurrent, false));

  /* ------------------------------------------------------------------
     Copy e-mail — status feedback in a toast
  ------------------------------------------------------------------ */
  const EMAIL = 'mikeallantagne@gmail.com';
  const toast = document.getElementById('toast');
  let toastT;
  function say(msg) {
    toast.textContent = msg; toast.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('is-on'), 2200);
  }
  function selectEmail() {
    const el = document.getElementById('email');
    const r = document.createRange(); r.selectNodeContents(el);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    say("Adresse sélectionnée : copiez-la avec Ctrl+C");
  }
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
    try {
      navigator.clipboard.writeText(EMAIL).then(() => say('Adresse copiée'), selectEmail);
    } catch (_) { selectEmail(); }
  }));
})();
