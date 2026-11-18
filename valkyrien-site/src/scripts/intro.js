/*
 * Home intro timeline (~3s). Web Animations API for every CSS-animatable value;
 * the globe -> frame morph tweens the rect's rx attribute (not reliably CSS-animatable in Safari).
 */
const EASE = {
  inst: 'cubic-bezier(0.22, 1, 0.36, 1)',
  focus: 'cubic-bezier(0.33, 1, 0.68, 1)',
  strike: 'cubic-bezier(0.55, 0, 1, 0.45)',
};
const MARK_SCALE = 2.5263;     // logo 32-grid -> scene units (frame 28.5u -> 72u)
const SCENE_W = 240;           // viewBox width
const T = { impact: 930, fade: 1250, morph: 1300, outer: 1420, inner: 1590, dock: 2450, dockDur: 650 };

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
  draw(frame, 0, 550);
  overlay.querySelectorAll('.intro__grid > *').forEach((el, i) => draw(el, 120 + i * 60, 450));

  // 2. Shield raised
  const shield = q('.intro__shield');
  A(shield, [{ opacity: 0 }, { opacity: 1 }], { delay: 250, duration: 300, easing: EASE.inst });
  draw(shield, 250, 450);

  // 3. Arrow strikes, shield parries
  const arrow = q('.intro__arrow');
  A(arrow, [
    { transform: 'translate(-130px, 80px)', opacity: 0 },
    { opacity: 1, offset: 0.25 },
    { transform: 'translate(74px, 80px)', opacity: 1 },
  ], { delay: 450, duration: T.impact - 450, easing: EASE.strike });
  A(arrow, [
    { transform: 'translate(74px, 80px) rotate(0deg)', opacity: 1 },
    { transform: 'translate(63px, 95px) rotate(-24deg)', opacity: 0 },
  ], { delay: T.impact, duration: 420, easing: EASE.inst, fill: 'forwards' });
  A(q('.intro__defence'), [
    { transform: 'translateX(0)' }, { transform: 'translateX(1.5px)', offset: 0.3 }, { transform: 'translateX(0)' },
  ], { delay: T.impact, duration: 260, easing: EASE.inst, fill: 'forwards' });
  A(q('.intro__pulse'), [
    { opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.45)' },
  ], { delay: T.impact, duration: 520, easing: EASE.inst, fill: 'forwards' });
  A(q('.intro__sparks'), [
    { opacity: 0, transform: 'translateX(0)' }, { opacity: 1, offset: 0.3 }, { opacity: 0, transform: 'translateX(-4px)' },
  ], { delay: T.impact, duration: 380, easing: EASE.inst, fill: 'forwards' });

  // 4. Defence and globe grid recede; the globe outline squares into the logo frame
  A(q('.intro__defence'), [{ opacity: 1 }, { opacity: 0 }], { delay: T.fade, duration: 350, easing: EASE.inst, fill: 'forwards' });
  A(q('.intro__grid'), [{ opacity: 1 }, { opacity: 0 }], { delay: T.fade, duration: 350, easing: EASE.inst, fill: 'forwards' });
  at(T.morph, () => tweenAttr(frame, 'rx', 36, 1.5 * MARK_SCALE, 500));

  // 5. Chevrons: same stagger and curve as the header mark (0 / +150 / +320 ms, 800 ms)
  draw(marks[0], T.outer, 800);
  draw(marks[1], T.outer + 170, 800);

  // 6. Dock into the header
  at(T.dock, dock);
  at(T.dock + T.dockDur + 50, () => finish(false));

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
    A(q('.intro__bg'), [{ opacity: 1 }, { opacity: 0 }], { duration: 450, delay: 200, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' });
    A(q('.intro__skip'), [{ opacity: 1 }, { opacity: 0 }], { ...o, duration: 200 });
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

  const skip = () => finish(true);
  const onKey = (e) => e.key === 'Escape' && skip();
  const events = [['click', skip], ['wheel', skip], ['touchstart', skip]];
  events.forEach(([t, fn]) => overlay.addEventListener(t, fn, { passive: true }));
  document.addEventListener('keydown', onKey);
  function removeListeners() {
    events.forEach(([t, fn]) => overlay.removeEventListener(t, fn));
    document.removeEventListener('keydown', onKey);
  }
}
