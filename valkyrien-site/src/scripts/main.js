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

initNav();
initHeroMotion();
