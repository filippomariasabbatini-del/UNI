import { gsap } from 'gsap';
import { HEIGHT } from './logo';
import type { StageState } from './scene';

/**
 * Le quattro fasi su un'unica timeline. Inizio di ogni fase, in secondi: 0%, 35%, 60% e 85% della
 * durata. Ogni tween dichiara partenza e arrivo, così la timeline si può scorrere avanti e indietro.
 */
export const DURATION = 22;
export const PHASES = [0, 0.35 * DURATION, 0.6 * DURATION, 0.85 * DURATION] as const;

export function initialState(): StageState {
  return {
    z: 0,
    hot: 0,
    travel: 0,
    nozzle: 0,
    park: 0,
    chip: 0,
    pulse: 0,
    printer: 1,
    lift: 0,
    zoom: 0,
    front: 0,
  };
}

export function buildTimeline(state: StageState): gsap.core.Timeline {
  const timeline = gsap.timeline({ paused: true });
  const [, insert, close, finish] = PHASES;
  const half = HEIGHT / 2;
  const tween = (
    key: keyof StageState,
    from: number,
    to: number,
    at: number,
    duration: number,
    ease = 'power2.inOut',
  ): void => {
    timeline.fromTo(
      state,
      { [key]: from },
      { [key]: to, duration, ease, immediateRender: false },
      at,
    );
  };

  // 1. L'ugello scende e stampa fino a metà altezza, seguendo il perimetro
  tween('nozzle', 0, 1, 0.2, 1.1, 'power2.out');
  tween('hot', 0, 1, 1.1, 0.4);
  tween('z', 0, half, 1.3, insert - 1.9, 'none');
  tween('travel', 0, 9, 1.3, insert - 1.9, 'none');
  tween('hot', 1, 0, insert - 0.6, 0.6);

  // 2. Pausa: ugello di lato, camera sulla sede, il tag scende e l'onda conferma
  tween('park', 0, 1, insert, 1.2);
  tween('zoom', 0, 1, insert + 0.2, 1.7);
  tween('chip', 0, 1, insert + 1.7, 1.7, 'power3.out');
  tween('pulse', 0, 1, insert + 3.4, 1.5, 'none');

  // 3. L'ugello torna e chiude il pezzo sopra il tag
  tween('zoom', 1, 0, close, 1.4);
  tween('park', 1, 0, close + 0.1, 1.1);
  tween('hot', 0, 1, close + 1.1, 0.3);
  tween('z', half, HEIGHT, close + 1.3, finish - close - 1.8, 'none');
  tween('travel', 9, 15, close + 1.3, finish - close - 1.8, 'none');
  tween('hot', 1, 0, finish - 0.5, 0.5);

  // 4. Piatto e ugello svaniscono, il pezzo si alza e si mette in piedi
  tween('nozzle', 1, 0, finish, 1, 'power2.in');
  tween('printer', 1, 0, finish + 0.2, 1.2);
  tween('front', 0, 1, finish + 0.5, 2.2);
  tween('lift', 0, 1, finish + 0.7, 2);
  timeline.set({}, {}, DURATION);
  return timeline;
}

/** Fase in corso a un dato istante della timeline. */
export function phaseAt(time: number): number {
  if (time >= DURATION - 0.01) return PHASES.length - 1;
  let phase = 0;
  PHASES.forEach((start, index) => {
    if (time >= start - 0.001) phase = index;
  });
  return phase;
}
