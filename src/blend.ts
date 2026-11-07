// The CPU mirror of the stage's compositing (stage.ts HELPERS): the W3C
// Compositing and Blending Level 1 blend modes on display-encoded colour, and
// the per-layer mix. Unit and GPU tests check the shader against this.

export type Rgb = readonly [number, number, number];

export const BLEND_MODES = [
  { id: "normal", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
  { id: "darken", label: "Darken" },
  { id: "lighten", label: "Lighten" },
  { id: "colorDodge", label: "Colour Dodge" },
  { id: "colorBurn", label: "Colour Burn" },
  { id: "hardLight", label: "Hard Light" },
  { id: "softLight", label: "Soft Light" },
  { id: "difference", label: "Difference" },
  { id: "exclusion", label: "Exclusion" },
  { id: "hue", label: "Hue" },
  { id: "saturation", label: "Saturation" },
  { id: "color", label: "Colour" },
  { id: "luminosity", label: "Luminosity" },
] as const;

export type BlendModeId = (typeof BLEND_MODES)[number]["id"];

/** Each mode's uniform value: its index in BLEND_MODES. */
export const MODE = Object.fromEntries(BLEND_MODES.map((m, i) => [m.id, i])) as Record<BlendModeId, number>;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

const map3 = (a: Rgb, b: Rgb, f: (cb: number, cs: number) => number): Rgb => [
  f(a[0], b[0]),
  f(a[1], b[1]),
  f(a[2], b[2]),
];

const multiply = (cb: number, cs: number): number => cb * cs;
const screen = (cb: number, cs: number): number => cb + cs - cb * cs;
const hardLight = (cb: number, cs: number): number =>
  cs <= 0.5 ? multiply(cb, 2 * cs) : screen(cb, 2 * cs - 1);

function colorDodge(cb: number, cs: number): number {
  if (cb <= 0) return 0;
  if (cs >= 1) return 1;
  return Math.min(1, cb / (1 - cs));
}

function colorBurn(cb: number, cs: number): number {
  if (cb >= 1) return 1;
  if (cs <= 0) return 0;
  return 1 - Math.min(1, (1 - cb) / cs);
}

function softLight(cb: number, cs: number): number {
  if (cs <= 0.5) return cb - (1 - 2 * cs) * cb * (1 - cb);
  const d = cb <= 0.25 ? ((16 * cb - 12) * cb + 4) * cb : Math.sqrt(cb);
  return cb + (2 * cs - 1) * (d - cb);
}

export const lum = (c: Rgb): number => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

export const sat = (c: Rgb): number => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);

function clipColor(c: Rgb): Rgb {
  const l = lum(c);
  const n = Math.min(c[0], c[1], c[2]);
  const x = Math.max(c[0], c[1], c[2]);
  const toward = (v: Rgb, k: number): Rgb => [l + (v[0] - l) * k, l + (v[1] - l) * k, l + (v[2] - l) * k];
  let out = c;
  if (n < 0) out = toward(out, l / (l - n));
  if (x > 1) out = toward(out, (1 - l) / (x - l));
  return out;
}

function setLum(c: Rgb, l: number): Rgb {
  const d = l - lum(c);
  return clipColor([c[0] + d, c[1] + d, c[2] + d]);
}

/** W3C SetSat: the max channel becomes `s`, the min 0, the mid in proportion. */
function setSat(c: Rgb, s: number): Rgb {
  const mx = Math.max(c[0], c[1], c[2]);
  const mn = Math.min(c[0], c[1], c[2]);
  if (mx <= mn) return [0, 0, 0];
  const k = s / (mx - mn);
  return [(c[0] - mn) * k, (c[1] - mn) * k, (c[2] - mn) * k];
}

/** B(Cb, Cs) for `mode`; an unknown mode is Normal. */
export function blend(mode: number, cb: Rgb, cs: Rgb): Rgb {
  switch (mode) {
    case MODE.multiply:
      return map3(cb, cs, multiply);
    case MODE.screen:
      return map3(cb, cs, screen);
    case MODE.overlay:
      return map3(cb, cs, (b, s) => hardLight(s, b));
    case MODE.darken:
      return map3(cb, cs, Math.min);
    case MODE.lighten:
      return map3(cb, cs, Math.max);
    case MODE.colorDodge:
      return map3(cb, cs, colorDodge);
    case MODE.colorBurn:
      return map3(cb, cs, colorBurn);
    case MODE.hardLight:
      return map3(cb, cs, hardLight);
    case MODE.softLight:
      return map3(cb, cs, softLight);
    case MODE.difference:
      return map3(cb, cs, (b, s) => Math.abs(b - s));
    case MODE.exclusion:
      return map3(cb, cs, (b, s) => b + s - 2 * b * s);
    case MODE.hue:
      return setLum(setSat(cs, sat(cb)), lum(cb));
    case MODE.saturation:
      return setLum(setSat(cb, sat(cs)), lum(cb));
    case MODE.color:
      return setLum(cs, lum(cb));
    case MODE.luminosity:
      return setLum(cb, lum(cs));
    default:
      return cs;
  }
}

/** One layer over `c`: `paint` is the tile's straight colour and coverage. The
 *  blend sees `c` clamped to 0–1; the mix keeps the unclamped `c`, so a pixel
 *  the layer doesn't cover is returned as it came. */
export function compositeLayer(
  c: Rgb,
  paint: readonly [number, number, number, number],
  mode: number,
  opacity: number,
): Rgb {
  const a = paint[3] * clamp01(opacity);
  if (a <= 0) return c;
  const b = blend(mode, [clamp01(c[0]), clamp01(c[1]), clamp01(c[2])], [paint[0], paint[1], paint[2]]);
  return [c[0] + (b[0] - c[0]) * a, c[1] + (b[1] - c[1]) * a, c[2] + (b[2] - c[2]) * a];
}

export interface LayerSample {
  color: Rgb;
  coverage: number;
  mode: number;
  opacity: number;
  visible: boolean;
}

/** The layers over `c`, bottom (index 0) first. */
export function compositeLayers(c: Rgb, layers: readonly LayerSample[]): Rgb {
  let out = c;
  for (const l of layers) {
    if (!l.visible) continue;
    out = compositeLayer(out, [l.color[0], l.color[1], l.color[2], l.coverage], l.mode, l.opacity);
  }
  return out;
}
