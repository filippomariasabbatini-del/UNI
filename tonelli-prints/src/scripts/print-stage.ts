import { readJson } from './dom';
import { prefersReducedMotion } from './motion';
import fragment from './print-stage.frag.glsl?raw';

/**
 * Scena di stampa dell'hero: tre oggetti in vetro, stampati strato dopo strato in WebGL
 * (raymarching, vedi print-stage.frag.glsl). Miglioramento progressivo: senza WebGL, con GPU
 * software o se il dispositivo non regge il ritmo, resta la foto.
 */

const VERTEX = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

/** Fasi di un ciclo, in ms: stampa, giro di presentazione, fusione, pausa prima del pezzo successivo */
const PRINT = 5200;
const SHOW = 2600;
const MELT = 1100;
const GAP = 450;
const CYCLE = PRINT + SHOW + MELT + GAP;

/** Altezza dei tre oggetti in unità dello shader. 1 unità = 50 mm, strati da 0,2 mm */
const HEIGHTS = [1.2, 1.24, 1.18];
const LAYERS_PER_UNIT = 250;
const TINTS = ['--tp-glass-1', '--tp-glass-2', '--tp-glass-3'];

/** Sotto questa media il rendering scala di risoluzione; se non basta, torna la foto */
const SLOW_FRAME_MS = 26;
const SAMPLE_FRAMES = 45;

type Vec3 = [number, number, number];

interface Frame {
  object: number;
  /** Quota del taglio di stampa. Oltre la cima = oggetto intero */
  height: number;
  melt: number;
  yaw: number;
  glow: number;
  nozzle: [number, number, number, number];
  progress: number;
  done: boolean;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smooth = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/** Semi-larghezze (x, z) dell'oggetto alla quota h: l'ugello resta sopra il materiale */
function footprint(object: number, h: number): [number, number] {
  if (object === 0) return [0.3, 0.05];
  if (object === 1) {
    if (h > 1.1) return [0.19, 0.02];
    const body = 0.3 * Math.sqrt(Math.max(0, 1 - ((h - 0.37) / 0.39) ** 2));
    const head = 0.23 * Math.sqrt(Math.max(0, 1 - ((h - 0.88) / 0.25) ** 2));
    const x = Math.max(body, head, 0.05);
    return [x, x * 0.7];
  }
  if (h < 0.14) return [0.42, 0.16];
  return h < 0.92 ? [0.07, 0.06] : [0.36, 0.06];
}

function frameAt(clock: number, pointer: number): Frame {
  const index = Math.floor(clock / CYCLE);
  const t = clock % CYCLE;
  const object = index % HEIGHTS.length;
  const top = (HEIGHTS[object] ?? 1.2) + 0.06;
  const yaw = 0.42 * Math.sin(clock * 0.00045) + pointer * 0.5;
  const sweepX = Math.sin(clock * 0.0075);
  const sweepZ = Math.sin(clock * 0.0049);

  if (t < PRINT) {
    const progress = t / PRINT;
    const height = top * progress;
    const [x, z] = footprint(object, height);
    return {
      object,
      height,
      melt: 0,
      yaw,
      glow: 1,
      nozzle: [x * sweepX, height + 0.012, z * sweepZ, 1],
      progress,
      done: false,
    };
  }
  if (t < PRINT + SHOW) {
    const s = (t - PRINT) / SHOW;
    const [x, z] = footprint(object, top);
    const settle = 1 - smooth(s * 5);
    return {
      object,
      height: 9,
      melt: 0,
      yaw: yaw + Math.PI * 2 * smooth(s),
      glow: 1 - smooth(s * 4),
      nozzle: [
        x * sweepX * settle,
        top + 1.8 * smooth(s * 2.2),
        z * sweepZ * settle,
        1 - smooth((s - 0.2) * 4),
      ],
      progress: 1,
      done: true,
    };
  }
  if (t < PRINT + SHOW + MELT) {
    const melt = (t - PRINT - SHOW) / MELT;
    return { object, height: 9, melt, yaw, glow: 0, nozzle: [0, 9, 0, 0], progress: 1, done: true };
  }
  // Piano vuoto: l'ugello scende per il pezzo successivo
  const g = smooth((t - PRINT - SHOW - MELT) / GAP);
  return {
    object: (object + 1) % HEIGHTS.length,
    height: -1,
    melt: 0,
    yaw,
    glow: g,
    nozzle: [0, 0.012 + 1.6 * (1 - g), 0, g],
    progress: 0,
    done: false,
  };
}

/** Oggetto finito e fermo: per chi ha chiesto meno movimento */
const STILL: Frame = {
  object: 0,
  height: 9,
  melt: 0,
  yaw: 0.45,
  glow: 0,
  nozzle: [0, 9, 0, 0],
  progress: 1,
  done: true,
};

function token(style: CSSStyleDeclaration, name: string): Vec3 {
  const hex = style.getPropertyValue(name).trim();
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? parseInt(hex.slice(1), 16) : 0x888888;
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

/** Compila e collega senza bloccare il thread principale, dove il browser lo permette. */
function buildProgram(gl: WebGLRenderingContext): Promise<WebGLProgram | null> {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) return Promise.resolve(null);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.bindAttribLocation(program, 0, 'a');
  gl.linkProgram(program);

  const linked = (): WebGLProgram | null =>
    gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  if (!parallel) return Promise.resolve(linked());
  return new Promise((resolve) => {
    const poll = (): void => {
      if (gl.isContextLost()) resolve(null);
      else if (gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) resolve(linked());
      else requestAnimationFrame(poll);
    };
    poll();
  });
}

export async function initPrintStage(stage: HTMLElement): Promise<void> {
  const canvas = stage.querySelector<HTMLCanvasElement>('[data-stage-canvas]');
  if (!canvas || !('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    // Niente rendering software: lì la foto è la scelta giusta
    failIfMajorPerformanceCaveat: true,
  });
  if (!gl) return;
  const program = await buildProgram(gl);
  if (!program) return;

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string): WebGLUniformLocation | null =>
    gl.getUniformLocation(program, name);
  const u = {
    res: uniform('uRes'),
    time: uniform('uTime'),
    height: uniform('uH'),
    melt: uniform('uMelt'),
    yaw: uniform('uYaw'),
    glow: uniform('uGlow'),
    object: uniform('uObj'),
    tint: uniform('uTint'),
    nozzle: uniform('uNoz'),
  };
  const style = getComputedStyle(stage);
  const tints = TINTS.map((name) => token(style, name));
  gl.uniform3fv(uniform('uAccent'), token(style, '--tp-accent'));
  gl.uniform3fv(uniform('uBg'), token(style, '--tp-surface'));
  gl.uniform3fv(uniform('uInk'), token(style, '--tp-fg'));

  const fallback = stage.querySelector<HTMLElement>('[data-stage-fallback]');
  const hud = stage.querySelector<HTMLElement>('[data-stage-hud]');
  const toggle = stage.querySelector<HTMLButtonElement>('[data-stage-toggle]');
  const nameLabel = stage.querySelector<HTMLElement>('[data-stage-name]');
  const statusLabel = stage.querySelector<HTMLElement>('[data-stage-status]');
  const layerLabel = stage.querySelector<HTMLElement>('[data-stage-layer]');
  const totalLabel = stage.querySelector<HTMLElement>('[data-stage-total]');
  const bar = stage.querySelector<HTMLElement>('[data-stage-bar]');
  const names = readJson<string[]>(stage, 'objects') ?? [];
  const still = prefersReducedMotion();

  let clock = 0;
  let last = 0;
  let request = 0;
  let running = false;
  let visible = false;
  let paused = false;
  let pointer = 0;
  let pointerTarget = 0;
  let quality = 1;
  let sampled = 0;
  let elapsed = 0;
  let shownObject = -1;
  let shownLayer = -1;
  let shownDone: boolean | null = null;

  const resize = (): void => {
    const ratio = Math.max(0.6, Math.min(window.devicePixelRatio || 1, 1.5) * quality);
    const width = Math.max(1, Math.round(stage.clientWidth * ratio));
    const height = Math.max(1, Math.round(stage.clientHeight * ratio));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(u.res, width, height);
  };

  const updateHud = (frame: Frame): void => {
    const layers = Math.round((HEIGHTS[frame.object] ?? 1.2) * LAYERS_PER_UNIT);
    const layer = Math.round(frame.progress * layers);
    if (frame.object !== shownObject) {
      shownObject = frame.object;
      if (nameLabel) nameLabel.textContent = names[frame.object] ?? '';
      if (totalLabel) totalLabel.textContent = String(layers);
    }
    if (layer !== shownLayer) {
      shownLayer = layer;
      if (layerLabel) layerLabel.textContent = String(layer).padStart(3, '0');
      bar?.style.setProperty('--stage-progress', frame.progress.toFixed(3));
    }
    if (frame.done !== shownDone) {
      shownDone = frame.done;
      hud?.toggleAttribute('data-done', frame.done);
      if (statusLabel) {
        statusLabel.textContent =
          (frame.done ? statusLabel.dataset['done'] : statusLabel.dataset['printing']) ?? '';
      }
    }
  };

  const draw = (): void => {
    const frame = still ? STILL : frameAt(clock, pointer);
    gl.uniform1f(u.time, clock / 1000);
    gl.uniform1f(u.height, frame.height);
    gl.uniform1f(u.melt, frame.melt);
    gl.uniform1f(u.yaw, frame.yaw);
    gl.uniform1f(u.glow, frame.glow);
    gl.uniform1i(u.object, frame.object);
    gl.uniform3fv(u.tint, tints[frame.object] ?? [0.8, 0.8, 0.8]);
    gl.uniform4fv(u.nozzle, frame.nozzle);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    updateHud(frame);
  };

  const stop = (): void => {
    running = false;
    cancelAnimationFrame(request);
  };

  /** Torna alla foto: contesto perso o dispositivo troppo lento */
  const giveUp = (): void => {
    stop();
    observer.disconnect();
    resizer.disconnect();
    stage.removeAttribute('data-active');
    canvas.hidden = true;
    if (hud) hud.hidden = true;
    if (toggle) toggle.hidden = true;
    fallback?.removeAttribute('aria-hidden');
  };

  const measure = (delta: number): void => {
    // I salti lunghi sono cambi di scheda o scroll, non frame lenti
    if (delta > 120) return;
    elapsed += delta;
    sampled += 1;
    if (sampled < SAMPLE_FRAMES) return;
    const average = elapsed / sampled;
    sampled = 0;
    elapsed = 0;
    if (average < SLOW_FRAME_MS) return;
    if (quality <= 0.5) {
      giveUp();
      return;
    }
    quality -= 0.25;
    resize();
  };

  const tick = (now: number): void => {
    const delta = now - last;
    last = now;
    clock += Math.min(delta, 64);
    pointer += (pointerTarget - pointer) * 0.08;
    draw();
    request = requestAnimationFrame(tick);
    measure(delta);
  };

  const sync = (): void => {
    const shouldRun = visible && !paused && !still;
    if (shouldRun === running) return;
    if (!shouldRun) {
      stop();
      return;
    }
    running = true;
    sampled = 0;
    elapsed = 0;
    last = performance.now();
    request = requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    sync();
  });
  const resizer = new ResizeObserver(() => {
    resize();
    // Cambiare dimensione svuota il canvas: se l'animazione è ferma va ridisegnato
    if (!running) draw();
  });

  canvas.addEventListener('webglcontextlost', giveUp);
  stage.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const rect = stage.getBoundingClientRect();
    pointerTarget = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  });
  stage.addEventListener('pointerleave', () => {
    pointerTarget = 0;
  });
  toggle?.addEventListener('click', () => {
    paused = !paused;
    toggle.toggleAttribute('data-paused', paused);
    toggle.setAttribute(
      'aria-label',
      (paused ? toggle.dataset['labelPlay'] : toggle.dataset['labelPause']) ?? '',
    );
    sync();
  });

  resize();
  draw();
  canvas.hidden = false;
  if (hud) hud.hidden = false;
  if (toggle && !still) toggle.hidden = false;
  fallback?.setAttribute('aria-hidden', 'true');
  // Al frame successivo, così la dissolvenza parte dallo stato iniziale
  requestAnimationFrame(() => stage.setAttribute('data-active', ''));
  resizer.observe(stage);
  observer.observe(stage);
}
