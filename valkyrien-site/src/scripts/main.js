const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function initNav() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.dataset.open = String(open);
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 56.0625rem)').addEventListener('change', (e) => e.matches && setOpen(false));
}

function initHeroMotion() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const video = hero.querySelector('[data-hero-video]');
  const toggle = hero.querySelector('[data-motion-toggle]');
  const label = hero.querySelector('[data-motion-label]');
  const videoReady = video?.dataset.ready === 'true';

  if (!videoReady) video?.remove();

  const play = () => {
    hero.dataset.motion = 'running';
    toggle?.setAttribute('aria-pressed', 'false');
    if (label) label.textContent = 'Pause background motion';
    if (videoReady && video) {
      video.play().then(() => (video.dataset.playing = 'true')).catch(() => {});
    }
  };

  const pause = () => {
    hero.dataset.motion = 'paused';
    toggle?.setAttribute('aria-pressed', 'true');
    if (label) label.textContent = 'Play background motion';
    if (videoReady && video) {
      video.pause();
      video.dataset.playing = 'false';
    }
  };

  toggle?.addEventListener('click', () => (hero.dataset.motion === 'paused' ? play() : pause()));
  reducedMotion.matches ? pause() : play();
  reducedMotion.addEventListener('change', (e) => (e.matches ? pause() : play()));
}

/*
 * Micro-Fade-Up scroll reveal.
 * Blocks entering the viewport in the same frame are staggered in DOM order;
 * a block that enters alone appears without delay.
 */
function initReveal() {
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (!items.length) return;

  const revealAll = () => items.forEach((el) => (el.dataset.revealed = 'true'));
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return revealAll();

  const stagger = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--reveal-stagger')) || 80;
  const order = new Map(items.map((el, i) => [el, i]));

  const io = new IntersectionObserver(
    (entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .map((e) => e.target)
        .sort((a, b) => order.get(a) - order.get(b))
        .forEach((el, i) => {
          el.style.setProperty('--reveal-delay', `${Math.min(i, 5) * stagger}ms`);
          el.dataset.revealed = 'true';
          io.unobserve(el);
        });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );

  document.documentElement.classList.add('reveal-ready');
  items.forEach((el) => io.observe(el));
  reducedMotion.addEventListener('change', (e) => e.matches && (io.disconnect(), revealAll()));
}

function initHeaderState() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let ticking = false;
  const update = () => {
    header.dataset.scrolled = String(window.scrollY > 8);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

initNav();
initHeaderState();
initHeroMotion();
initReveal();
