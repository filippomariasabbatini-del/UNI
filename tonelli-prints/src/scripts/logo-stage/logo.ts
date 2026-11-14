import {
  CanvasTexture,
  ExtrudeGeometry,
  Path,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  Vector2,
} from 'three';
import markSvg from '../../assets/brand/mark.svg?raw';

/**
 * Geometria del logo, ricavata dal tracciato di src/assets/brand/mark.svg.
 * Spazio locale: il logo giace nel piano XY (y verso l'alto dell'immagine) e si stampa lungo +Z,
 * da z = 0 (piatto) a z = HEIGHT.
 */

const VIEWBOX = 512;
/** Il logo è largo circa 2,4 unità */
const SCALE = 2.4 / VIEWBOX;

export const BEVEL = 0.08;
export const HEIGHT = 0.5;
/** Il pezzo reale: 5 mm in strati da 0,2 mm */
export const HEIGHT_MM = 5;
export const LAYERS = 25;

/** Sede del tag NFC: centro del cerchio inscritto più grande nella parte piena (in unità del viewBox) */
const POCKET_VIEW = { x: 213, y: 405, radius: 60 };
const WALL_VIEW = 9;

const toLocal = (x: number, y: number): [number, number] => [
  (x - VIEWBOX / 2) * SCALE,
  (VIEWBOX / 2 - y) * SCALE,
];

export const POCKET = {
  x: toLocal(POCKET_VIEW.x, POCKET_VIEW.y)[0],
  y: toLocal(POCKET_VIEW.x, POCKET_VIEW.y)[1],
  radius: POCKET_VIEW.radius * SCALE,
  depth: 0.05,
};
export const CHIP_RADIUS = POCKET.radius * 0.9;

const pathData = / d="([^"]+)"/.exec(markSvg)?.[1] ?? '';

/** Il tracciato usa solo M, C e Z assoluti: lo genera lo script di vettorizzazione */
function buildPath(target: Path, subpath: string): void {
  for (const [, command, values] of subpath.matchAll(/([MC])([^MCZ]*)/g)) {
    const n = (values ?? '').trim().split(/\s+/).map(Number);
    const point = (index: number): [number, number] => toLocal(n[index] ?? 0, n[index + 1] ?? 0);
    if (command === 'M') target.moveTo(...point(0));
    else target.bezierCurveTo(...point(0), ...point(2), ...point(4));
  }
  target.closePath();
}

export function logoShape(): Shape {
  const [outer = '', ...holes] = pathData.split(/(?=M)/);
  const shape = new Shape();
  buildPath(shape, outer);
  for (const subpath of holes) {
    const hole = new Path();
    buildPath(hole, subpath);
    shape.holes.push(hole);
  }
  return shape;
}

/** Corpo estruso con smusso. Gruppo 0 = facce sopra e sotto, gruppo 1 = pareti. */
export function logoBody(shape: Shape): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: HEIGHT - BEVEL * 2,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: 0.05,
    // Lo smusso rientra invece di allargare: il profilo resta quello del logo
    bevelOffset: -0.05,
    bevelSegments: 4,
    curveSegments: 20,
  });
  geometry.translate(0, 0, BEVEL);
  return geometry;
}

/** Sezione piana del logo, con le UV che coprono il viewBox: la texture è disegnata nello stesso spazio. */
export function logoSection(shape: Shape): ShapeGeometry {
  const geometry = new ShapeGeometry(shape, 20);
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  const size = VIEWBOX * SCALE;
  for (let index = 0; index < position.count; index += 1) {
    uv.setXY(index, position.getX(index) / size + 0.5, position.getY(index) / size + 0.5);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Punti del perimetro (contorno esterno, poi intaglio): il percorso dell'ugello. */
export function logoPerimeter(shape: Shape): Vector2[] {
  const outer = shape.getSpacedPoints(160);
  const inner = shape.holes.flatMap((hole) => hole.getSpacedPoints(80));
  return [...outer, ...inner];
}

const TEXTURE_SIZE = 768;

function sectionCanvas(
  draw: (context: CanvasRenderingContext2D, outline: Path2D) => void,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (context) {
    context.scale(TEXTURE_SIZE / VIEWBOX, TEXTURE_SIZE / VIEWBOX);
    draw(context, new Path2D(pathData));
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const gray = (value: number): string => `rgb(${value} ${value} ${value})`;

function honeycomb(context: CanvasRenderingContext2D): void {
  const size = 15;
  const stepX = size * Math.sqrt(3);
  const stepY = size * 1.5;
  context.beginPath();
  for (let row = -1; row * stepY < VIEWBOX + size; row += 1) {
    for (let column = -1; column * stepX < VIEWBOX + stepX; column += 1) {
      const cx = column * stepX + (row % 2 === 0 ? 0 : stepX / 2);
      const cy = row * stepY;
      for (let side = 0; side <= 6; side += 1) {
        const angle = (Math.PI / 3) * side + Math.PI / 6;
        const x = cx + size * Math.cos(angle);
        const y = cy + size * Math.sin(angle);
        if (side === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
    }
  }
  context.lineWidth = 3;
  context.strokeStyle = gray(236);
  context.stroke();
}

export type SectionKind = 'infill' | 'pocket' | 'bridge' | 'solid';

/**
 * Sezione del pezzo in scala di grigi (il colore lo dà il materiale): pareti piene e riempimento a
 * nido d'ape ('infill'). 'pocket' = con la sede aperta del tag, 'bridge' = primo strato che la
 * richiude, 'solid' = ultimi strati compatti.
 */
export function sectionTexture(kind: SectionKind): CanvasTexture {
  return sectionCanvas((context, outline) => {
    context.save();
    context.clip(outline, 'evenodd');
    context.fillStyle = gray(kind === 'solid' ? 232 : 118);
    context.fillRect(0, 0, VIEWBOX, VIEWBOX);
    if (kind === 'solid') {
      // Passate diagonali dell'ultimo strato
      context.strokeStyle = gray(250);
      context.lineWidth = 1.2;
      context.beginPath();
      for (let offset = -VIEWBOX; offset < VIEWBOX; offset += 4) {
        context.moveTo(offset, 0);
        context.lineTo(offset + VIEWBOX, VIEWBOX);
      }
      context.stroke();
    } else {
      honeycomb(context);
    }
    // Pareti: metà del tratto cade fuori dal profilo ed è tagliata dal clip
    context.lineWidth = WALL_VIEW * 2;
    context.strokeStyle = gray(246);
    context.stroke(outline);

    const { x, y, radius } = POCKET_VIEW;
    if (kind === 'pocket' || kind === 'bridge') {
      context.beginPath();
      context.arc(x, y, radius + WALL_VIEW, 0, Math.PI * 2);
      context.fillStyle = gray(246);
      context.fill();
    }
    if (kind === 'pocket') {
      context.globalCompositeOperation = 'destination-out';
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  });
}

/** Bordo dello strato attivo: il filamento appena deposto, ancora caldo. */
export function hotEdgeTexture(): CanvasTexture {
  return sectionCanvas((context, outline) => {
    context.clip(outline, 'evenodd');
    context.strokeStyle = 'rgb(255 255 255 / 0.2)';
    context.lineWidth = WALL_VIEW * 3.6;
    context.stroke(outline);
    context.strokeStyle = 'rgb(255 255 255)';
    context.lineWidth = WALL_VIEW * 1.6;
    context.stroke(outline);
  });
}

/** Righe orizzontali per le pareti (layer FDM) e, ruotate, per le passate dell'ultimo strato. */
export function layerBump(repeatX: number, repeatY: number, rotation = 0): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (context) {
    for (let y = 0; y < canvas.height; y += 1) {
      // Profilo a cordone: pieno al centro, solco tra uno strato e l'altro
      const bead = Math.sqrt(Math.sin((Math.PI * (y + 0.5)) / canvas.height));
      context.fillStyle = gray(Math.round(60 + 195 * bead));
      context.fillRect(0, y, canvas.width, 1);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.rotation = rotation;
  return texture;
}

/** Lastra PEI testurizzata: grana fine e griglia sottile. `base` è il colore, in esadecimale. */
export function bedTexture(base: string, line: string): CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);
    // Grana deterministica: la scena è identica a ogni caricamento
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let index = 0; index < 9000; index += 1) {
      const shade = random() > 0.5 ? 255 : 0;
      context.fillStyle = `rgb(${shade} ${shade} ${shade} / ${0.03 + random() * 0.05})`;
      context.fillRect(random() * size, random() * size, 1.5, 1.5);
    }
    context.strokeStyle = line;
    context.lineWidth = 1;
    context.beginPath();
    for (let index = 0; index <= 8; index += 1) {
      const at = Math.round((index * size) / 8) + 0.5;
      context.moveTo(at, 0);
      context.lineTo(at, size);
      context.moveTo(0, at);
      context.lineTo(size, at);
    }
    context.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
