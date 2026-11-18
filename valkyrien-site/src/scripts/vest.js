/*
 * Scroll companion: each time a new section enters while scrolling down,
 * a round strikes the plate at a random point and ricochets off at a random angle.
 * Hidden at the top of the page; static (no hits) with prefers-reduced-motion.
 */
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_IN = 'cubic-bezier(0.55, 0, 1, 0.45)';
const IN_MS = 180;          // incoming flight
const OUT_MS = 560;         // ricochet
const HIT_MS = IN_MS + OUT_MS;
const rand = (a, b) => a + Math.random() * (b - a);
const deg = (rad) => (rad * 180) / Math.PI;

export function initVest(reducedMotion) {
  const vest = document.querySelector('[data-vest]');
  if (!vest) return;
  const q = (s) => vest.querySelector(s);
  const round = q('.vest__round');
  const flash = q('.vest__flash');
  const sparks = q('.vest__sparks');
  const dent = q('.vest__dent');
  const body = q('.vest__body');

  // Visible once the reader starts scrolling
  const showAt = () => Math.min(160, window.innerHeight * 0.2);
  const onScroll = () => (vest.dataset.visible = String(window.scrollY > showAt()));
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  let busy = false;
  let pending = false;

  function hit() {
    if (reducedMotion.matches || document.documentElement.classList.contains('intro-playing')) return;
    if (busy) { pending = true; return; }
    busy = true;

    // Random impact point on the plate, random approach slope from the left
    const ix = rand(44, 76), iy = rand(60, 98);
    const sx = -320, sy = iy + rand(-70, 70);
    const inAngle = Math.atan2(iy - sy, ix - sx);
    // Ricochet: mirror across the plate normal, then a random spread
    const outAngle = Math.PI - inAngle + (rand(0.35, 0.9) * (Math.random() < 0.5 ? -1 : 1));
    const dist = rand(170, 240);
    const ex = ix + Math.cos(outAngle) * dist, ey = iy + Math.sin(outAngle) * dist;
    const spin = rand(360, 900) * (Math.random() < 0.5 ? -1 : 1);

    round.animate([
      { transform: `translate(${sx}px, ${sy}px) rotate(${deg(inAngle)}deg)`, opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { transform: `translate(${ix}px, ${iy}px) rotate(${deg(inAngle)}deg)`, opacity: 1 },
    ], { duration: IN_MS, easing: EASE_IN, fill: 'forwards' });

    round.animate([
      { transform: `translate(${ix}px, ${iy}px) rotate(${deg(outAngle)}deg)`, opacity: 1 },
      { transform: `translate(${ex}px, ${ey}px) rotate(${deg(outAngle) + spin}deg)`, opacity: 0 },
    ], { delay: IN_MS, duration: OUT_MS, easing: EASE_OUT, fill: 'forwards' });

    for (const el of [flash, sparks, dent]) el.setAttribute('transform', '');
    flash.setAttribute('cx', ix); flash.setAttribute('cy', iy);
    dent.setAttribute('cx', ix); dent.setAttribute('cy', iy);
    sparks.setAttribute('transform', `translate(${ix} ${iy}) rotate(${rand(0, 60).toFixed(0)})`);

    flash.animate([{ opacity: 0.95, transform: 'scale(0.3)' }, { opacity: 0, transform: 'scale(2.4)' }],
      { delay: IN_MS, duration: 320, easing: EASE_OUT });
    sparks.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }],
      { delay: IN_MS, duration: 300, easing: EASE_OUT });
    dent.animate([{ opacity: 0 }, { opacity: 1, offset: 0.05 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }],
      { delay: IN_MS, duration: 1500, easing: 'linear' });
    body.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(2px)', offset: 0.3 }, { transform: 'translateX(0)' }],
      { delay: IN_MS, duration: 220, easing: EASE_OUT });

    setTimeout(() => (vest.dataset.hit = 'true'), IN_MS);
    setTimeout(() => (vest.dataset.hit = 'false'), IN_MS + 160);
    setTimeout(() => {
      busy = false;
      if (pending) { pending = false; hit(); }
    }, HIT_MS);
  }

  // Trigger: a section's top crosses 55% of the viewport while scrolling down
  const sections = [...document.querySelectorAll('main > section')].slice(1);
  let lastY = window.scrollY;
  let primed = false;
  const io = new IntersectionObserver((entries) => {
    const down = window.scrollY > lastY;
    lastY = window.scrollY;
    if (!primed) { primed = true; return; }           // ignore the initial callback on load
    if (down && entries.some((e) => e.isIntersecting)) hit();
  }, { rootMargin: '0px 0px -45% 0px' });
  sections.forEach((s) => io.observe(s));
  window.addEventListener('scroll', () => { if (!primed) lastY = window.scrollY; }, { passive: true });
}
