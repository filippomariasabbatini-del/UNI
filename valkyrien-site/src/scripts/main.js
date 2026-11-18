import { createFlights } from './flights.js';
import { playIntro } from './intro.js';

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
  window.matchMedia('(min-width: 76.0625rem)').addEventListener('change', (e) => e.matches && setOpen(false));
}

function initHeroMotion() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const video = hero.querySelector('[data-hero-video]');
  const videoReady = video?.dataset.ready === 'true';
  if (!videoReady) video?.remove();

  const art = hero.querySelector('[data-hero-art]');
  const flights = art ? createFlights(art, hero) : null;

  // Background motion follows the OS setting only (no on-page control, by client decision).
  const apply = () => {
    if (reducedMotion.matches) {
      flights?.stop();
      if (videoReady) { video.pause(); video.dataset.playing = 'false'; }
    } else {
      flights?.start();
      if (videoReady) video.play().then(() => (video.dataset.playing = 'true')).catch(() => {});
    }
  };
  apply();
  reducedMotion.addEventListener('change', apply);
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

function initLangSwitch() {
  const sw = document.querySelector('[data-lang-switch]');
  if (!sw) return;
  const summary = sw.querySelector('summary');
  document.addEventListener('click', (e) => sw.open && !sw.contains(e.target) && (sw.open = false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sw.open) {
      sw.open = false;
      summary.focus();
    }
  });
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

playIntro();
initNav();
initLangSwitch();
initHeaderState();
initHeroMotion();
initReveal();
