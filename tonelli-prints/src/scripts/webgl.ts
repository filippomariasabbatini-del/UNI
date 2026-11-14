/**
 * WebGL 2 con accelerazione hardware? Serve a decidere se scaricare la scena 3D: con GPU software
 * (o senza WebGL) il sito resta sul contenuto statico e non carica nulla.
 */
export function hasHardwareWebGL(): boolean {
  try {
    const context = document
      .createElement('canvas')
      .getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return context !== null;
  } catch {
    return false;
  }
}
