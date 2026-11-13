export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Anima un numero da `from` a `to` chiamando `render` a ogni frame. Senza animazione se l'utente la riduce. */
export function tween(
  from: number,
  to: number,
  duration: number,
  render: (value: number) => void,
): () => void {
  if (prefersReducedMotion() || from === to) {
    render(to);
    return () => undefined;
  }
  let frame = 0;
  const start = performance.now();
  const step = (now: number): void => {
    const progress = Math.min(1, (now - start) / duration);
    render(from + (to - from) * easeOutCubic(progress));
    if (progress < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}
