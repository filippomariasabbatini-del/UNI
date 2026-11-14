import type { MaterialId } from '../../config/pricing';
import { readJson } from '../dom';
import { prefersReducedMotion } from '../motion';
import { HEIGHT, HEIGHT_MM, LAYERS } from './logo';
import { type Look, type Palette, type StageScene, type StageView, createScene } from './scene';
import { DURATION, PHASES, buildTimeline, initialState, phaseAt } from './timeline';

/**
 * Scena 3D dell'hero: il logo viene stampato, a metà riceve il tag NFC, viene chiuso e infine si
 * può ruotare e guardare ai raggi X. Qui stanno avvio, controlli e interazione; la scena è in
 * scene.ts, le fasi in timeline.ts.
 */

interface StageConfig {
  materials: { id: MaterialId; name: string }[];
  material: MaterialId;
}

/** Resa di ogni filamento. Il colore è il token --tp-filament-<id>. */
const LOOKS: Record<MaterialId, Omit<Look, 'color'>> = {
  'pla-plus': { roughness: 0.62, metalness: 0, bump: 2.2 },
  petg: { roughness: 0.28, metalness: 0, bump: 1.6 },
  'carbon-fiber': { roughness: 0.55, metalness: 0.35, bump: 1.8 },
  'silky-pla': { roughness: 0.3, metalness: 0.6, bump: 2 },
  'wood-pla': { roughness: 0.86, metalness: 0, bump: 2.6 },
  tpu: { roughness: 0.74, metalness: 0, bump: 1.4 },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function initLogoStage(stage: HTMLElement): void {
  const canvas = stage.querySelector<HTMLCanvasElement>('[data-stage-canvas]');
  const viewport = stage.querySelector<HTMLElement>('[data-stage-view]');
  const config = readJson<StageConfig>(stage, 'config');
  if (!canvas || !viewport || !config) return;

  const style = getComputedStyle(stage);
  const token = (name: string): string => style.getPropertyValue(name).trim() || '#888888';
  const palette: Palette = {
    hot: token('--tp-stage-hot'),
    bed: token('--tp-stage-bed'),
    bedLine: token('--tp-stage-bed-line'),
    brass: token('--tp-stage-brass'),
    copper: token('--tp-stage-copper'),
    steel: token('--tp-stage-steel'),
    ink: token('--tp-fg'),
    chip: token('--tp-stage-chip'),
  };

  let scene: StageScene;
  try {
    scene = createScene(canvas, palette);
  } catch {
    // WebGL non disponibile o solo software: resta il logo statico
    return;
  }

  const fallback = stage.querySelector<HTMLElement>('[data-stage-fallback]');
  const controls = stage.querySelector<HTMLElement>('[data-stage-controls]');
  const readout = stage.querySelector<HTMLElement>('[data-stage-readout]');
  const heightLabel = stage.querySelector<HTMLElement>('[data-stage-z]');
  const layerLabel = stage.querySelector<HTMLElement>('[data-stage-layer]');
  const nfcLabel = stage.querySelector<HTMLElement>('[data-stage-nfc]');
  const materialLabel = stage.querySelector<HTMLElement>('[data-stage-material-name]');
  const toggle = stage.querySelector<HTMLButtonElement>('[data-stage-toggle]');
  const xraySwitch = stage.querySelector<HTMLButtonElement>('[data-stage-xray]');
  const steps = [...stage.querySelectorAll<HTMLButtonElement>('[data-stage-step]')];
  const swatches = [...stage.querySelectorAll<HTMLButtonElement>('[data-stage-material]')];

  const reduced = prefersReducedMotion();
  const state = initialState();
  const view: StageView = { yaw: 0, pitch: 0, xray: 0 };
  const timeline = buildTimeline(state);

  let seek: gsap.core.Tween | null = null;
  let request = 0;
  let last = 0;
  let clock = 0;
  let running = false;
  let started = false;
  let paused = false;
  let dirty = true;
  let shownPhase = -1;
  let shownLayer = -1;
  let shownHeight = '';
  let finished = false;
  // Rotazione libera del prodotto finito
  let dragging = false;
  let moved = 0;
  let pointerX = 0;
  let pointerY = 0;
  let spin = 0;
  let idleSince = 0;
  // Raggi X: fissati dall'interruttore (o da un tocco sul tag) oppure accesi dal passaggio del cursore
  let xrayPinned = false;
  let xrayHover = false;

  const setLook = (id: MaterialId): void => {
    scene.setLook({ color: token(`--tp-filament-${id}`), ...LOOKS[id] });
    for (const swatch of swatches) {
      swatch.setAttribute('aria-checked', String(swatch.dataset['stageMaterial'] === id));
    }
    if (materialLabel) {
      materialLabel.textContent = config.materials.find((item) => item.id === id)?.name ?? '';
    }
    dirty = true;
  };

  const setXray = (pinned: boolean): void => {
    xrayPinned = pinned;
    xraySwitch?.setAttribute('aria-checked', String(pinned));
    dirty = true;
  };

  const updateUi = (): void => {
    const phase = phaseAt(timeline.time());
    if (phase !== shownPhase) {
      shownPhase = phase;
      steps.forEach((step, index) => {
        if (index === phase) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      });
    }
    const layer = Math.round((state.z / HEIGHT) * LAYERS);
    if (layer !== shownLayer) {
      shownLayer = layer;
      if (layerLabel) layerLabel.textContent = String(layer).padStart(2, '0');
    }
    // La quota cambia più spesso dello strato: va aggiornata per conto suo
    const height = ((state.z / HEIGHT) * HEIGHT_MM).toFixed(2);
    if (height !== shownHeight) {
      shownHeight = height;
      if (heightLabel) heightLabel.textContent = height;
    }
    const done = state.lift > 0.98;
    if (done !== finished) {
      finished = done;
      stage.toggleAttribute('data-finished', done);
      if (xraySwitch) xraySwitch.disabled = !done;
      if (!done) {
        setXray(false);
        xrayHover = false;
        view.yaw = 0;
        view.pitch = 0;
        spin = 0;
      } else {
        idleSince = performance.now();
      }
    }
    const xrayOn = done && (xrayPinned || xrayHover);
    if (nfcLabel) nfcLabel.toggleAttribute('data-visible', xrayOn);
  };

  const frame = (now: number): void => {
    request = requestAnimationFrame(frame);
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;

    const floating = finished && !paused && !reduced;
    if (floating) clock += delta;
    // Dopo un po' di inattività il pezzo riprende a girare piano da solo
    const auto = floating && !dragging && now - idleSince > 2200 ? 0.32 : 0;
    spin += (auto - spin) * Math.min(1, delta * (dragging ? 12 : 2.5));
    if (!dragging) view.yaw += spin * delta;

    const xrayTarget = finished && (xrayPinned || xrayHover) ? 1 : 0;
    const easing = Math.abs(xrayTarget - view.xray) > 0.002;
    view.xray = easing ? view.xray + (xrayTarget - view.xray) * Math.min(1, delta * 9) : xrayTarget;

    const moving =
      timeline.isActive() ||
      (seek?.isActive() ?? false) ||
      floating ||
      dragging ||
      easing ||
      xrayTarget === 1 ||
      Math.abs(spin) > 0.002;
    if (!moving && !dirty) return;
    dirty = false;
    updateUi();
    scene.render(state, view, clock);
  };

  const setRunning = (shouldRun: boolean): void => {
    if (shouldRun === running) return;
    running = shouldRun;
    if (shouldRun) {
      last = performance.now();
      dirty = true;
      request = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(request);
    }
  };

  const setPaused = (value: boolean): void => {
    paused = value;
    if (toggle) {
      toggle.toggleAttribute('data-paused', value);
      toggle.setAttribute(
        'aria-label',
        (value ? toggle.dataset['labelPlay'] : toggle.dataset['labelPause']) ?? '',
      );
    }
  };

  /** Porta la scena all'inizio della fase scelta e la riproduce fino alla sua fine. */
  const goTo = (index: number): void => {
    const start = PHASES[index];
    if (start === undefined) return;
    const end = PHASES[index + 1] ?? DURATION;
    seek?.kill();
    timeline.pause();
    setPaused(false);
    started = true;
    if (reduced) {
      timeline.time(end);
      dirty = true;
      return;
    }
    const distance = Math.abs(timeline.time() - start);
    if (index === PHASES.length - 1) {
      // Prodotto finito: si arriva direttamente in fondo
      const span = Math.abs(timeline.time() - DURATION);
      seek = timeline.tweenTo(DURATION, {
        duration: clamp(span * 0.3, 1.2, 4),
        ease: 'power2.inOut',
      });
      return;
    }
    seek = timeline.tweenTo(start, {
      duration: Math.min(1.4, 0.3 + distance * 0.1),
      ease: 'power2.inOut',
      onComplete: () => {
        seek = timeline.tweenTo(end);
      },
    });
  };

  steps.forEach((step, index) => step.addEventListener('click', () => goTo(index)));
  for (const swatch of swatches) {
    swatch.addEventListener('click', () => {
      const id = config.materials.find((item) => item.id === swatch.dataset['stageMaterial'])?.id;
      if (id) setLook(id);
    });
  }
  xraySwitch?.addEventListener('click', () => {
    if (finished) setXray(!xrayPinned);
  });
  toggle?.addEventListener('click', () => {
    setPaused(!paused);
    if (paused) {
      timeline.pause();
      seek?.pause();
    } else if (seek?.paused()) {
      seek.resume();
    } else if (timeline.time() < DURATION) {
      timeline.play();
    }
    dirty = true;
  });

  // Trascinamento e raggi X: solo sul prodotto finito. In verticale il tocco resta allo scroll della pagina.
  const normalized = (event: PointerEvent): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    ];
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (!finished || !event.isPrimary) return;
    dragging = true;
    moved = 0;
    pointerX = event.clientX;
    pointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!finished) return;
    if (!dragging) {
      if (event.pointerType === 'mouse') {
        const over = scene.overChip(...normalized(event));
        if (over !== xrayHover) {
          xrayHover = over;
          dirty = true;
        }
      }
      return;
    }
    const dx = event.clientX - pointerX;
    const dy = event.clientY - pointerY;
    pointerX = event.clientX;
    pointerY = event.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    view.yaw += dx * 0.011;
    view.pitch = clamp(view.pitch + dy * 0.007, -0.75, 0.75);
    spin = dx * 0.6;
  });
  const release = (event: PointerEvent, tapped: boolean): void => {
    if (!dragging) return;
    dragging = false;
    idleSince = performance.now();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    // Un tocco (senza trascinare) sul tag accende o spegne i raggi X
    if (tapped && moved < 8 && scene.overChip(...normalized(event))) {
      setXray(!xrayPinned);
      if (xrayPinned) navigator.vibrate?.(12);
    }
  };
  canvas.addEventListener('pointerup', (event) => release(event, true));
  canvas.addEventListener('pointercancel', (event) => release(event, false));
  canvas.addEventListener('pointerleave', () => {
    if (xrayHover) {
      xrayHover = false;
      dirty = true;
    }
  });

  const resize = (): void => {
    scene.resize(
      viewport.clientWidth,
      viewport.clientHeight,
      Math.min(window.devicePixelRatio || 1, 2),
    );
    dirty = true;
  };
  const resizer = new ResizeObserver(resize);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.some((entry) => entry.isIntersecting);
    setRunning(visible);
    if (visible && !started && !reduced) {
      started = true;
      timeline.play();
    }
  });

  canvas.addEventListener('webglcontextlost', () => {
    setRunning(false);
    observer.disconnect();
    resizer.disconnect();
    timeline.kill();
    seek?.kill();
    stage.removeAttribute('data-active');
    canvas.hidden = true;
    for (const element of [controls, readout, toggle, nfcLabel]) {
      if (element) element.hidden = true;
    }
    fallback?.removeAttribute('aria-hidden');
  });

  setLook(config.material);
  // Con il movimento ridotto si parte dal prodotto finito, fermo
  if (reduced) timeline.time(DURATION);
  resize();
  updateUi();
  scene.render(state, view, clock);
  canvas.hidden = false;
  for (const element of [controls, readout, nfcLabel]) {
    if (element) element.hidden = false;
  }
  if (toggle && !reduced) toggle.hidden = false;
  fallback?.setAttribute('aria-hidden', 'true');
  requestAnimationFrame(() => stage.setAttribute('data-active', ''));
  resizer.observe(viewport);
  observer.observe(stage);
}
