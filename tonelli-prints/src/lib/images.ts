const CANDIDATE_WIDTHS = [400, 640, 800, 1080, 1440];

/** Larghezze per srcset: mai più larghe dell'originale (niente upscaling). */
export function responsiveWidths(originalWidth: number, candidates = CANDIDATE_WIDTHS): number[] {
  const widths = candidates.filter((width) => width < originalWidth);
  return widths.length < candidates.length ? [...widths, originalWidth] : widths;
}
