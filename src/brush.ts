// The brush's pure stroke model, a port of the masking panel's rules: dabs are
// captured in source-UV with the brush settings and colour frozen at paint
// time, spaced a quarter radius apart measured in aspect-corrected UV (so
// spacing is round on screen), and Shift+click interpolates a straight line at
// that spacing. The first dab of each stroke carries `strokeStart`, so core
// caps every stroke's opacity on its own and stacks the strokes.
//
// With a brush tip, each spacing step lays `count` dabs instead, scattered
// across the stroke, shrunk, turned and thinned at random (an injected source,
// so the maths is testable). The stroke's first dab names the tip; every dab
// carries its angle.

import type { PaintDab } from "./safelight";

export interface Point {
  x: number;
  y: number;
}

/** A tip's dynamics as a stroke lays them: fractions of the diameter for
 *  `spacing` and `scatter`, 0 to 1 for the jitters, radians for `angle`. */
export interface TipDynamics {
  id: string;
  spacing: number;
  scatter: number;
  count: number;
  sizeJitter: number;
  angleJitter: number;
  flowJitter: number;
  angle: number;
  followStroke: boolean;
}

/** Core's shared brush state (develop-store fields); `tip` is set when the
 *  brush stamps a registered tip, absent for the round brush. */
export interface BrushState {
  brushSize: number;
  brushFeather: number;
  brushOpacity: number;
  brushFlow: number;
  brushErase: boolean;
  tip?: TipDynamics;
}

/** A random source: a number in [0, 1). */
export type Random = () => number;

/** The stored tip settings a stroke reads. */
export interface StoredTip {
  tip: string | null;
  brushSpacing: number;
  brushScatter: number;
  brushCount: number;
  brushSizeJitter: number;
  brushAngle: number;
  brushAngleJitter: number;
  brushFollowStroke: boolean;
  brushFlowJitter: number;
}

/** The dynamics to stroke with: the stored tip when something still registers
 *  it, otherwise none (the round brush; the stored id is kept for when its
 *  extension is back). */
export function resolveTip(s: StoredTip, registeredIds: readonly string[]): TipDynamics | undefined {
  if (s.tip === null || !registeredIds.includes(s.tip)) return undefined;
  return {
    id: s.tip,
    spacing: s.brushSpacing,
    scatter: s.brushScatter,
    count: s.brushCount,
    sizeJitter: s.brushSizeJitter,
    angleJitter: s.brushAngleJitter,
    flowJitter: s.brushFlowJitter,
    angle: s.brushAngle,
    followStroke: s.brushFollowStroke,
  };
}

/** Smallest a jittered dab gets, as a fraction of the brush radius. */
const MIN_RADIUS_FRACTION = 0.02;

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

/** Distance between stamps, in aspect-corrected UV. */
export function stampSpacing(brush: BrushState): number {
  return brush.tip ? brush.tip.spacing * 2 * brush.brushSize : brush.brushSize * DAB_SPACING;
}

export function shouldStamp(last: Point, cur: Point, brush: BrushState, aspect: number): boolean {
  return dabDistance(last, cur, aspect) >= stampSpacing(brush);
}

/** The dabs of one spacing step at `p`. `direction` is the stroke's UV
 *  movement into `p` (zero-length on a stroke's first dab). The round brush
 *  lays one plain dab and draws no random numbers. */
export function strokeDabs(
  p: Point,
  direction: Point,
  brush: BrushState,
  colour: Readonly<Colour>,
  aspect: number,
  altKey: boolean,
  strokeStart: boolean,
  random: Random,
): Dab[] {
  const tip = brush.tip;
  if (!tip) return [makeDab(p, brush, colour, altKey, strokeStart)];
  const dx = direction.x * aspect;
  const dy = direction.y;
  const length = Math.hypot(dx, dy);
  const ux = length > 0 ? dx / length : 1;
  const uy = length > 0 ? dy / length : 0;
  const heading = Math.atan2(uy, ux);
  const diameter = brush.brushSize * 2;
  const dabs: Dab[] = [];
  for (let i = 0; i < tip.count; i++) {
    const across = tip.scatter * diameter * (2 * random() - 1);
    const sizeR = random();
    const angleR = random();
    const flowR = random();
    const first = strokeStart && i === 0;
    const dab = makeDab({ x: p.x + (-uy * across) / aspect, y: p.y + ux * across }, brush, colour, altKey, first);
    dab.radius = Math.max(brush.brushSize * MIN_RADIUS_FRACTION, brush.brushSize * (1 - tip.sizeJitter * sizeR));
    dab.flow = brush.brushFlow * (1 - tip.flowJitter * flowR);
    dab.angle = tip.angle + (tip.followStroke ? heading : 0) + tip.angleJitter * Math.PI * (2 * angleR - 1);
    if (first) dab.tip = tip.id;
    dabs.push(dab);
  }
  return dabs;
}

export function lineDabs(
  from: Point,
  to: Point,
  brush: BrushState,
  colour: Readonly<Colour>,
  aspect: number,
  altKey: boolean,
  random: Random = Math.random,
): Dab[] {
  const steps = Math.max(1, Math.ceil(dabDistance(from, to, aspect) / stampSpacing(brush)));
  const direction = { x: to.x - from.x, y: to.y - from.y };
  const dabs: Dab[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p = { x: from.x + direction.x * t, y: from.y + direction.y * t };
    dabs.push(...strokeDabs(p, direction, brush, colour, aspect, altKey, i === 1, random));
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
