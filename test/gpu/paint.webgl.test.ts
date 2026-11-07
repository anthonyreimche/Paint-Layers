// The stage on the real renderer (run via `npm run test:gpu`): it compiles with
// core's paint texture, an unpainted photo is a bit-exact no-op, a painted
// layer composites as the CPU mirror (blend.ts) says for several modes, layers
// stack bottom to top, and pixels no layer covers keep their full range.
//
// Read at "pre-output" in the perceptual space: float32 `c` as every stage
// left it, sign and headroom intact, so the base frame (no stage) is the `c`
// the stage received and the CPU mirror starts from it.

import { describe, expect, it } from "vitest";
import { buildStage, PARAM, paramKey } from "@paint/stage";
import { compositeLayer, compositeLayers, MODE, type BlendModeId, type Rgb } from "@paint/blend";
import { CURRENT_PROCESS_VERSION } from "@/catalog/types";
import {
  OPEN_PROBE,
  type Frame,
  floatImage,
  identityParams,
  rendererBuildError,
  withRenderer,
} from "@/rendering/webgl/webgl.test-support";

const W = 64;
const H = 16;
const STAGE = buildStage();

// Columns of differing colour, some past white and below black, so the blend
// sees its clamp and an unpainted pixel shows any clip.
const SOURCE = floatImage(W, H, (x, y) => {
  const t = x / (W - 1);
  return [0.05 + 1.3 * t, 0.9 - 0.8 * t + 0.02 * y, x % 8 === 0 ? -0.08 : 0.35 + 0.3 * Math.sin(x)];
});

// Exact in the RGBA8 paint texture.
const q = (v: number): number => Math.round(v * 255) / 255;
const COLOUR: Rgb = [q(0.85), q(0.3), q(0.6)];

const dab = (x: number, radius: number, color: Rgb) => ({
  x,
  y: 0.5,
  radius,
  erase: false,
  feather: 0,
  opacity: 1,
  flow: 1,
  strokeStart: true,
  color: [color[0], color[1], color[2]],
});

/** Covers the whole 4:1 frame. */
const FULL = (color: Rgb) => [dab(0.5, 3, color)];

function frame(bag: Record<string, unknown> | null): Frame {
  return withRenderer({ stages: bag ? [STAGE] : [], pipeline: OPEN_PROBE }, (renderer) => {
    renderer.setImage(SOURCE);
    renderer.setParams(identityParams({ processVersion: CURRENT_PROCESS_VERSION }));
    if (bag) renderer.setContributedParams(bag);
    const f = renderer.readFloatFrame("pre-output", Infinity, { encoding: "perceptual" });
    if (!f) throw new Error("readFloatFrame returned null");
    return f;
  });
}

const pixel = (f: Frame, x: number, y: number): Rgb => {
  const o = (y * f.width + x) * 4;
  return [f.data[o], f.data[o + 1], f.data[o + 2]];
};

/** Worst channel error against `want` over the interior (tile edges aside). */
function worst(got: Frame, base: Frame, want: (c: Rgb) => Rgb): number {
  let err = 0;
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      const expected = want(pixel(base, x, y));
      const actual = pixel(got, x, y);
      for (let ch = 0; ch < 3; ch++) err = Math.max(err, Math.abs(actual[ch] - expected[ch]));
    }
  }
  return err;
}

describe("paint layers on the GPU", () => {
  it("compiles with the paint texture", () => {
    expect(rendererBuildError({ stages: [STAGE] })).toBeNull();
  });

  it("is a bit-exact no-op with no layers", () => {
    expect(frame({}).data).toEqual(frame(null).data);
  });

  it("is a bit-exact no-op with its one layer hidden", () => {
    const hidden = frame({
      [PARAM.layers]: [{ id: "a", name: "A", dabs: FULL(COLOUR) }],
      [paramKey("visible", 0)]: false,
    });
    expect(hidden.data).toEqual(frame(null).data);
  });

  const modes: BlendModeId[] = [
    "normal",
    "multiply",
    "screen",
    "overlay",
    "colorDodge",
    "colorBurn",
    "softLight",
    "difference",
    "hue",
    "saturation",
    "color",
    "luminosity",
  ];
  for (const id of modes) {
    it(`composites a ${id} layer at 60 % as the CPU mirror does`, () => {
      const base = frame(null);
      const out = frame({
        [PARAM.layers]: [{ id: "a", name: "A", dabs: FULL(COLOUR) }],
        [paramKey("mode", 0)]: MODE[id],
        [paramKey("opacity", 0)]: 0.6,
      });
      const err = worst(out, base, (c) => compositeLayer(c, [...COLOUR, 1], MODE[id], 0.6));
      console.log(`[paint-gpu] ${id}: max error ${err.toExponential(2)}`);
      expect(err).toBeLessThan(5e-3);
    });
  }

  it("stacks layers bottom to top", () => {
    const grey: Rgb = [q(0.5), q(0.5), q(0.5)];
    const base = frame(null);
    const out = frame({
      [PARAM.layers]: [
        { id: "a", name: "A", dabs: FULL(COLOUR) },
        { id: "b", name: "B", dabs: FULL(grey) },
      ],
      [paramKey("mode", 0)]: MODE.normal,
      [paramKey("opacity", 0)]: 0.5,
      [paramKey("mode", 1)]: MODE.multiply,
    });
    const err = worst(out, base, (c) =>
      compositeLayers(c, [
        { color: COLOUR, coverage: 1, mode: MODE.normal, opacity: 0.5, visible: true },
        { color: grey, coverage: 1, mode: MODE.multiply, opacity: 1, visible: true },
      ]),
    );
    console.log(`[paint-gpu] two layers: max error ${err.toExponential(2)}`);
    expect(err).toBeLessThan(5e-3);
  });

  it("leaves pixels no layer covers exactly as they were, past white and below black", () => {
    const base = frame(null);
    // Radius 1.2 image heights at x 0.25 on a 4:1 frame reaches x 0.55.
    const out = frame({
      [PARAM.layers]: [{ id: "a", name: "A", dabs: [dab(0.25, 1.2, COLOUR)] }],
      [paramKey("mode", 0)]: MODE.multiply,
    });
    let overRange = 0;
    let changed = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const b = pixel(base, x, y);
        const o = pixel(out, x, y);
        if (x > 0.65 * W) {
          expect(o).toEqual(b);
          if (b.some((v) => v > 1 || v < 0)) overRange++;
        } else if (x < 0.4 * W && o.some((v, ch) => Math.abs(v - b[ch]) > 1e-3)) {
          changed++;
        }
      }
    }
    expect(overRange).toBeGreaterThan(0);
    expect(changed).toBeGreaterThan(0);
  });
});
