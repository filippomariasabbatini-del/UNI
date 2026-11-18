/*
 * Home intro timeline (2s total). Skippable only by scrolling down (wheel, swipe up, scroll keys).
 * Web Animations API for every CSS-animatable value;
 * the globe -> frame morph tweens the rect's rx attribute (not reliably CSS-animatable in Safari).
 */
const EASE = {
  inst: 'cubic-bezier(0.22, 1, 0.36, 1)',
  focus: 'cubic-bezier(0.33, 1, 0.68, 1)',
  strike: 'cubic-bezier(0.55, 0, 1, 0.45)',
};
const MARK_SCALE = 2.5263;     // logo 32-grid -> scene units (frame 28.5u -> 72u)
const SCENE_W = 240;           // viewBox width
const T = { impact: 600, fade: 800, morph: 840, outer: 900, dock: 1580, dockDur: 420 };

export function playIntro() {
  const root = document.documentElement;
  const tpl = document.getElementById('intro-template');
  if (!tpl || !root.classList.contains('intro-pending')) return;

  try { sessionStorage.setItem('vk-intro', '1'); } catch { /* storage blocked: intro may replay, harmless */ }

  root.classList.add('intro-playing', 'intro-hide-mark', 'intro-hold-hero');
  document.body.append(tpl.content.cloneNode(true));
  root.classList.remove('intro-pending');

  const overlay = document.querySelector('[data-intro]');
  const q = (s) => overlay.querySelector(s);
  const svg = q('.intro__scene');
  const frame = q('.intro__frame');
  const marks = [q('.intro__outer'), q('.intro__inner')];
  const anims = [];
  const timers = [];
  let rafId = 0;
  let done = false;

  const A = (el, kf, o) => {
    const a = el.animate(kf, { fill: 'both', ...o });
    anims.push(a);
    return a;
  };
  const draw = (el, delay, duration, easing = EASE.focus) =>
    A(el, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay, duration, easing });
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));

  // 1. Globe
  draw(frame, 0, 360);
  overlay.querySelectorAll('.intro__grid > *').forEach((el, i) => draw(el, 80 + i * 40, 300));

  // 2. Shield raised
  const shield = q('.intro__shield');
  A(shield, [{ opacity: 0 }, { opacity: 1 }], { delay: 160, duration: 200, easing: EASE.inst });
  draw(shield, 160, 300);

  // 3. Arrow strikes, shield parries
  const arrow = q('.intro__arrow');
  A(arrow, [
    { transform: 'translate(-130px, 80px)', opacity: 0 },
    { opacity: 1, offset: 0.25 },
    { transform: 'translate(74px, 80px)', opacity: 1 },
  ], { delay: 300, duration: T.impact - 300, easing: EASE.strike });
  A(arrow, [
    { transform: 'translate(74px, 80px) rotate(0deg)', opacity: 1 },
    { transform: 'translate(63px, 95px) rotate(-24deg)', opacity: 0 },
  ], { delay: T.impact, duration: 280, easing: EASE.inst, fill: 'forwards' });
  A(q('.intro__defence'), [
    { transform: 'translateX(0)' }, { transform: 'translateX(1.5px)', offset: 0.3 }, { transform: 'translateX(0)' },
  ], { delay: T.impact, duration: 180, easing: EASE.inst, fill: 'forwards' });
  A(q('.intro__pulse'), [
    { opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.45)' },
  ], { delay: T.impact, duration: 340, easing: EASE.inst, fill: 'forwards' });
  A(q('.intro__sparks'), [
    { opacity: 0, transform: 'translateX(0)' }, { opacity: 1, offset: 0.3 }, { opacity: 0, transform: 'translateX(-4px)' },
  ], { delay: T.impact, duration: 250, easing: EASE.inst, fill: 'forwards' });

  // 4. Defence and globe grid recede; the globe outline squares into the logo frame
  A(q('.intro__defence'), [{ opacity: 1 }, { opacity: 0 }], { delay: T.fade, duration: 230, easing: EASE.inst, fill: 'forwards' });
  A(q('.intro__grid'), [{ opacity: 1 }, { opacity: 0 }], { delay: T.fade, duration: 230, easing: EASE.inst, fill: 'forwards' });
  at(T.morph, () => tweenAttr(frame, 'rx', 36, 1.5 * MARK_SCALE, 320));

  // 5. Chevrons: header-mark curve and stagger, compressed to fit the 2s budget
  draw(marks[0], T.outer, 520);
  draw(marks[1], T.outer + 110, 520);

  // 6. Dock into the header
  at(T.dock, dock);
  at(T.dock + T.dockDur, () => finish(false));

  function tweenAttr(el, attr, from, to, duration) {
    const t0 = performance.now();
    const ease = (t) => 1 - (1 - t) ** 3;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      el.setAttribute(attr, (from + (to - from) * ease(t)).toFixed(3));
      if (t < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
  }

  function dock() {
    const target = document.querySelector('.site-header .brand__mark');
    if (!target) return;
    root.classList.remove('intro-hold-hero');   // hero copy comes into focus as the cover lifts

    const r = target.getBoundingClientRect();
    const tL = r.left + (r.width * 1.75) / 32;
    const tT = r.top + (r.height * 1.75) / 32;
    const tW = (r.width * 28.5) / 32;
    const s = svg.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    const scale = tW / f.width;
    const tx = tL - s.left - (f.left - s.left) * scale;
    const ty = tT - s.top - (f.top - s.top) * scale;
    const k = s.width / SCENE_W;                  // screen px per scene unit
    const endStroke = 1.5 / (k * scale);          // land at the header's 1.5px

    svg.style.transformOrigin = '0 0';
    const o = { duration: T.dockDur, easing: EASE.inst, fill: 'forwards' };
    A(svg, [{ transform: 'translate(0, 0) scale(1)' }, { transform: `translate(${tx}px, ${ty}px) scale(${scale})` }], o);
    A(frame, [{ strokeWidth: 1 }, { strokeWidth: endStroke }], o);
    marks.forEach((m) => A(m, [{ strokeWidth: 1 / MARK_SCALE }, { strokeWidth: endStroke / MARK_SCALE }], o));
    // cover lifts after the mark has started travelling, so the flight reads
    A(q('.intro__bg'), [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 120, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' });
  }

  function finish(skipped) {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    cancelAnimationFrame(rafId);
    removeListeners();
    root.classList.remove('intro-playing', 'intro-hold-hero');
    const teardown = () => {
      anims.forEach((a) => a.cancel());
      overlay.remove();
      root.classList.remove('intro-hide-mark');
    };
    if (!skipped) return teardown();
    root.classList.remove('intro-hide-mark');
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE.inst, fill: 'forwards' }).finished.then(teardown);
  }

  // Skip = the user keeps scrolling down. The gesture that skips also scrolls the page.
  const skip = (dy = 0) => {
    finish(true);
    if (dy > 0) requestAnimationFrame(() => window.scrollBy({ top: dy, behavior: 'auto' }));
  };
  const onWheel = (e) => e.deltaY > 0 && skip(e.deltaY);
  let touchY = null;
  const onTouchStart = (e) => (touchY = e.touches[0].clientY);
  const onTouchMove = (e) => {
    if (touchY === null) return;
    const dy = touchY - e.touches[0].clientY;   // finger moving up = scrolling down
    if (dy > 12) skip(dy);
  };
  const SCROLL_KEYS = { ArrowDown: 40, PageDown: window.innerHeight * 0.9, ' ': window.innerHeight * 0.9, End: 0 };
  const onKey = (e) => {
    if (!(e.key in SCROLL_KEYS) || e.shiftKey) return;
    e.preventDefault();
    if (e.key === 'End') { finish(true); requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight })); }
    else skip(SCROLL_KEYS[e.key]);
  };
  const listeners = [
    [window, 'wheel', onWheel, { passive: true }],
    [window, 'touchstart', onTouchStart, { passive: true }],
    [window, 'touchmove', onTouchMove, { passive: true }],
    [document, 'keydown', onKey, false],
  ];
  listeners.forEach(([t, ev, fn, o]) => t.addEventListener(ev, fn, o));
  function removeListeners() {
    listeners.forEach(([t, ev, fn, o]) => t.removeEventListener(ev, fn, o));
  }
}
