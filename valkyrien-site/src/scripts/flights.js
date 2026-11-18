/*
 * Hero flight layer: a stylised aircraft flies along one of the dashed routes,
 * from one hub to another. Each flight picks origin and destination at random
 * (never repeating the previous leg), then waits a random interval.
 * Runs only while the hero is on screen and the tab is visible.
 */
const SPEED = 80;                  // scene units per second
const DUR_MIN = 2200;
const DUR_MAX = 4200;
const GAP_MIN = 500;
const GAP_MAX = 1600;
const FADE = 0.12;                 // share of the flight spent fading in / out

const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const rand = (a, b) => a + Math.random() * (b - a);

export function createFlights(svg, hero) {
  const plane = svg.querySelector('.net-plane');
  const ping = svg.querySelector('.net-ping');
  const routes = [...svg.querySelectorAll('.net-route[data-from]')];
  if (!plane || !routes.length) return { start() {}, stop() {} };

  const legs = routes.flatMap((path) => [
    { path, reverse: false, to: path.dataset.to },
    { path, reverse: true, to: path.dataset.from },
  ]);

  let enabled = false;   // motion allowed
  let visible = true;    // hero on screen and tab visible
  let raf = 0;
  let timer = 0;
  let last = null;

  const pick = () => {
    const pool = legs.filter((l) => l !== last);
    last = pool[Math.floor(Math.random() * pool.length)];
    return last;
  };

  function fly() {
    timer = 0;
    if (!enabled || !visible) return;
    const { path, reverse, to } = pick();
    const len = path.getTotalLength();
    const dur = Math.min(DUR_MAX, Math.max(DUR_MIN, (len / SPEED) * 1000));
    let t0 = null;
    let angle = 0;

    const step = (now) => {
      if (t0 === null) t0 = now;
      const t = Math.min(1, (now - t0) / dur);
      const s = easeInOutSine(t);
      const at = (u) => path.getPointAtLength((reverse ? 1 - u : u) * len);
      const p = at(s);
      const q = at(Math.min(1, s + 0.01));
      if (s < 0.99) angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
      const scale = 0.82 + 0.22 * Math.sin(Math.PI * t);            // climb, cruise, descend
      const opacity = Math.min(1, t / FADE, (1 - t) / FADE);
      plane.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${angle.toFixed(1)}) scale(${scale.toFixed(3)})`);
      plane.style.opacity = opacity.toFixed(3);

      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        raf = 0;
        land(to);
        timer = setTimeout(fly, rand(GAP_MIN, GAP_MAX));
      }
    };
    raf = requestAnimationFrame(step);
  }

  function land(hub) {
    const node = svg.querySelector(`[data-hub="${hub}"]`);
    if (!node || !ping) return;
    ping.setAttribute('cx', node.getAttribute('cx'));
    ping.setAttribute('cy', node.getAttribute('cy'));
    ping.animate(
      [{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.9)' }],
      { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }

  function halt() {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    raf = 0;
    timer = 0;
    plane.style.opacity = '0';
  }

  const resume = () => enabled && visible && !raf && !timer && (timer = setTimeout(fly, rand(200, 700)));

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && !document.hidden;
    visible ? resume() : halt();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    visible ? resume() : halt();
  });

  return {
    start() { enabled = true; resume(); },
    stop() { enabled = false; halt(); },
  };
}
