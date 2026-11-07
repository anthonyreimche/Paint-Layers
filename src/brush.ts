// The brush's pure stroke model, a port of the masking panel's rules: dabs are
// captured in source-UV with the brush settings and colour frozen at paint
// time, spaced a quarter radius apart measured in aspect-corrected UV (so
// spacing is round on screen), and Shift+click interpolates a straight line at
// that spacing. The first dab of each stroke carries `strokeStart`, so core
// caps every stroke's opacity on its own and stacks the strokes.

import type { PaintDab } from "./safelight";

export interface Point {
  x: number;
  y: number;
}

/** Core's shared brush state (develop-store fields). */
export interface BrushState {
  brushSize: number;
  brushFeather: number;
  brushOpacity: number;
  brushFlow: number;
  brushErase: boolean;
}

export type Colour = [number, number, number];

export interface Dab extends PaintDab {
  opacity: number;
  flow: number;
}

export const DAB_SPACING = 0.25;

export function makeDab(
  p: Point,
  brush: BrushState,
  colour: Readonly<Colour>,
  altKey: boolean,
  strokeStart: boolean,
): Dab {
  return {
    x: p.x,
    y: p.y,
    radius: brush.brushSize,
    erase: altKey || brush.brushErase,
    feather: brush.brushFeather,
    opacity: brush.brushOpacity,
    flow: brush.brushFlow,
    color: [colour[0], colour[1], colour[2]],
    ...(strokeStart ? { strokeStart: true } : {}),
  };
}

export function dabDistance(a: Point, b: Point, aspect: number): number {
  return Math.hypot((b.x - a.x) * aspect, b.y - a.y);
}

export function shouldStamp(last: Point, cur: Point, brush: BrushState, aspect: number): boolean {
  return dabDistance(last, cur, aspect) >= brush.brushSize * DAB_SPACING;
}

export function lineDabs(
  from: Point,
  to: Point,
  brush: BrushState,
  colour: Readonly<Colour>,
  aspect: number,
  altKey: boolean,
): Dab[] {
  const steps = Math.max(
    1,
    Math.ceil(dabDistance(from, to, aspect) / (brush.brushSize * DAB_SPACING)),
  );
  const dabs: Dab[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    dabs.push(makeDab(p, brush, colour, altKey, i === 1));
  }
  return dabs;
}

/** A colour input's "#rrggbb" as display-encoded sRGB, 0 to 1; white for
 *  anything else. */
export function hexToRgb(hex: string): Colour {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return [1, 1, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}
