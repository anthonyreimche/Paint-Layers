// The GPU stage: the photo's paint layers, baked by core into one paint
// texture, composited over `c` bottom (layer 0) to top with the W3C blend
// modes (blend.ts is the CPU mirror). It declares a perceptual space so it
// adds no clip of its own: a display stage without one has `c` clipped to
// [0, 1] for it and everything after it, which would cost every unpainted
// pixel its range. On [0, 1] the perceptual encoding is the display encoding,
// so the blend maths sees what it was written for; the base is clamped only
// inside plComposite, where a layer covers.
//
// Identifier rules: uniform and texture keys are rewritten into the stage's
// namespace by whole-identifier replace, so the GLSL below uses `layers`,
// `mode0`…`visible3` only as those, and the helpers' names carry a `pl`
// prefix that no engine helper uses.

import type { ProcessingStageContribution, UniformDeclaration } from "./safelight";

export const EXT_ID = "paint-layers";
export const STAGE_ID = `${EXT_ID}.composite`;

/** The most layers core's paint texture bakes. */
export const MAX_LAYERS = 4;

export const LAYER_DEFAULTS = { mode: 0, opacity: 1, visible: true } as const;

export type SlotKey = "mode" | "opacity" | "visible";

/** A layer slot's qualified param-bag key, e.g. "paint-layers.composite.mode2". */
export const paramKey = (key: SlotKey, slot: number): string => `${STAGE_ID}.${key}${slot}`;

export const PARAM = {
  layers: `${STAGE_ID}.layers`,
} as const;

const SLOTS = Array.from({ length: MAX_LAYERS }, (_, i) => i);

const slotUniforms = (i: number): UniformDeclaration[] => [
  {
    key: `mode${i}`,
    glslType: "int",
    default: LAYER_DEFAULTS.mode,
    range: { min: 0, max: 15, step: 1 },
    label: `Layer ${i + 1} blend mode`,
  },
  {
    key: `opacity${i}`,
    glslType: "float",
    default: LAYER_DEFAULTS.opacity,
    range: { min: 0, max: 1 },
    label: `Layer ${i + 1} opacity`,
  },
  { key: `visible${i}`, glslType: "bool", default: LAYER_DEFAULTS.visible, label: `Layer ${i + 1} visible` },
];

export const HELPERS = `
float plLum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }
float plSat(vec3 c) { return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); }
vec3 plClipColor(vec3 c) {
  float l = plLum(c);
  float n = min(c.r, min(c.g, c.b));
  float x = max(c.r, max(c.g, c.b));
  vec3 o = c;
  if (n < 0.0) o = l + (o - l) * (l / (l - n));
  if (x > 1.0) o = l + (o - l) * ((1.0 - l) / (x - l));
  return o;
}
vec3 plSetLum(vec3 c, float l) { return plClipColor(c + (l - plLum(c))); }
vec3 plSetSat(vec3 c, float s) {
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  return mx > mn ? (c - mn) * (s / (mx - mn)) : vec3(0.0);
}
float plDodge(float cb, float cs) { return cb <= 0.0 ? 0.0 : (cs >= 1.0 ? 1.0 : min(1.0, cb / (1.0 - cs))); }
float plBurn(float cb, float cs) { return cb >= 1.0 ? 1.0 : (cs <= 0.0 ? 0.0 : 1.0 - min(1.0, (1.0 - cb) / cs)); }
vec3 plHardLight(vec3 cb, vec3 cs) {
  vec3 s2 = 2.0 * cs - 1.0;
  return mix(cb + s2 - cb * s2, cb * (2.0 * cs), vec3(lessThanEqual(cs, vec3(0.5))));
}
float plSoftLight(float cb, float cs) {
  if (cs <= 0.5) return cb - (1.0 - 2.0 * cs) * cb * (1.0 - cb);
  float d = cb <= 0.25 ? ((16.0 * cb - 12.0) * cb + 4.0) * cb : sqrt(cb);
  return cb + (2.0 * cs - 1.0) * (d - cb);
}
vec3 plBlend(int mode, vec3 cb, vec3 cs) {
  if (mode == 1) return cb * cs;
  if (mode == 2) return cb + cs - cb * cs;
  if (mode == 3) return plHardLight(cs, cb);
  if (mode == 4) return min(cb, cs);
  if (mode == 5) return max(cb, cs);
  if (mode == 6) return vec3(plDodge(cb.r, cs.r), plDodge(cb.g, cs.g), plDodge(cb.b, cs.b));
  if (mode == 7) return vec3(plBurn(cb.r, cs.r), plBurn(cb.g, cs.g), plBurn(cb.b, cs.b));
  if (mode == 8) return plHardLight(cb, cs);
  if (mode == 9) return vec3(plSoftLight(cb.r, cs.r), plSoftLight(cb.g, cs.g), plSoftLight(cb.b, cs.b));
  if (mode == 10) return abs(cb - cs);
  if (mode == 11) return cb + cs - 2.0 * cb * cs;
  if (mode == 12) return plSetLum(plSetSat(cs, plSat(cb)), plLum(cb));
  if (mode == 13) return plSetLum(plSetSat(cb, plSat(cs)), plLum(cb));
  if (mode == 14) return plSetLum(cs, plLum(cb));
  if (mode == 15) return plSetLum(cb, plLum(cs));
  return cs;
}
vec3 plComposite(vec3 c, vec4 paint, int mode, float opacity) {
  float a = paint.a * clamp(opacity, 0.0, 1.0);
  if (a <= 0.0) return c;
  return mix(c, plBlend(mode, clamp(c, 0.0, 1.0), paint.rgb), a);
}`;

export const INLINE_GLSL = SLOTS.map(
  (i) => `if (visible${i}) c = plComposite(c, layers(${i}, srcUv), mode${i}, opacity${i});`,
).join("\n");

export function buildStage(): ProcessingStageContribution {
  return {
    id: STAGE_ID,
    name: "Paint Layers",
    phase: "effects",
    presetScope: "per-image",
    space: { encoding: "perceptual" },
    uniforms: SLOTS.flatMap(slotUniforms),
    textures: [{ key: "layers", kind: "paint" }],
    helpers: HELPERS,
    glsl: INLINE_GLSL,
  };
}
