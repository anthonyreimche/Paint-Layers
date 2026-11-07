import { describe, expect, it } from "vitest";
import {
  BLEND_MODES,
  blend,
  compositeLayer,
  compositeLayers,
  lum,
  MODE,
  sat,
  type Rgb,
} from "../src/blend";

const near = (got: Rgb, want: Rgb, digits = 9) => {
  for (let i = 0; i < 3; i++) expect(got[i]).toBeCloseTo(want[i], digits);
};

const grey = (v: number): Rgb => [v, v, v];

describe("mode table", () => {
  it("lists the sixteen W3C modes in uniform order, Normal first", () => {
    expect(BLEND_MODES.map((m) => m.label)).toEqual([
      "Normal",
      "Multiply",
      "Screen",
      "Overlay",
      "Darken",
      "Lighten",
      "Colour Dodge",
      "Colour Burn",
      "Hard Light",
      "Soft Light",
      "Difference",
      "Exclusion",
      "Hue",
      "Saturation",
      "Colour",
      "Luminosity",
    ]);
    BLEND_MODES.forEach((m, i) => expect(MODE[m.id]).toBe(i));
  });
});

describe("separable modes", () => {
  it("Normal takes the paint", () => {
    near(blend(MODE.normal, [0.2, 0.4, 0.6], [0.9, 0.1, 0.3]), [0.9, 0.1, 0.3]);
  });

  it("Multiply and Screen", () => {
    near(blend(MODE.multiply, [0.5, 0.2, 1], grey(0.5)), [0.25, 0.1, 0.5]);
    near(blend(MODE.screen, grey(0.5), grey(0.5)), grey(0.75));
  });

  it("Overlay is Hard Light with the layers swapped", () => {
    near(blend(MODE.overlay, grey(0.25), grey(0.8)), grey(0.4));
    near(blend(MODE.overlay, grey(0.75), grey(0.8)), grey(0.9));
  });

  it("Darken and Lighten pick per channel", () => {
    near(blend(MODE.darken, [0.2, 0.8, 0.5], [0.6, 0.1, 0.5]), [0.2, 0.1, 0.5]);
    near(blend(MODE.lighten, [0.2, 0.8, 0.5], [0.6, 0.1, 0.5]), [0.6, 0.8, 0.5]);
  });

  it("Colour Dodge keeps black, saturates at white paint and divides between", () => {
    near(blend(MODE.colorDodge, [0, 0.3, 0.25], [1, 1, 0.5]), [0, 1, 0.5]);
    near(blend(MODE.colorDodge, grey(0.6), grey(0.5)), grey(1));
  });

  it("Colour Burn keeps white, crushes at black paint and divides between", () => {
    near(blend(MODE.colorBurn, [1, 0.7, 0.75], [0, 0, 0.5]), [1, 0, 0.5]);
    near(blend(MODE.colorBurn, grey(0.2), grey(0.5)), grey(0));
  });

  it("Hard Light multiplies under half and screens over it", () => {
    near(blend(MODE.hardLight, grey(0.8), grey(0.25)), grey(0.4));
    near(blend(MODE.hardLight, grey(0.4), grey(0.75)), grey(0.7));
  });

  it("Soft Light follows the W3C curve, with D(Cb) switching at a quarter", () => {
    near(blend(MODE.softLight, grey(0.5), grey(0.25)), grey(0.375));
    near(blend(MODE.softLight, grey(0.16), grey(0.75)), grey(0.279168));
    near(blend(MODE.softLight, grey(0.64), grey(0.75)), grey(0.72));
    near(blend(MODE.softLight, grey(0.3), grey(0.5)), grey(0.3));
  });

  it("Difference and Exclusion", () => {
    near(blend(MODE.difference, [0.2, 0.9, 0.5], [0.6, 0.1, 0.5]), [0.4, 0.8, 0]);
    near(blend(MODE.exclusion, [0.5, 0.2, 0], [0.5, 0.6, 1]), [0.5, 0.56, 1]);
  });

  it("reads an unknown mode as Normal", () => {
    near(blend(99, grey(0.2), [0.9, 0.1, 0.3]), [0.9, 0.1, 0.3]);
    near(blend(-1, grey(0.2), [0.9, 0.1, 0.3]), [0.9, 0.1, 0.3]);
  });
});

describe("non-separable modes", () => {
  it("measure luminosity with the W3C weights", () => {
    expect(lum([1, 0, 0])).toBeCloseTo(0.3, 12);
    expect(lum([0, 1, 0])).toBeCloseTo(0.59, 12);
    expect(lum([0, 0, 1])).toBeCloseTo(0.11, 12);
    expect(sat([0.2, 0.4, 0.6])).toBeCloseTo(0.4, 12);
  });

  it("Hue takes the paint's hue at the photo's saturation and luminosity", () => {
    near(blend(MODE.hue, [0.2, 0.4, 0.6], [1, 0, 0]), [0.642, 0.242, 0.242]);
    near(blend(MODE.hue, grey(0.5), [1, 0, 0]), grey(0.5));
  });

  it("Saturation takes the paint's saturation, clipping back into range at the photo's luminosity", () => {
    const out = blend(MODE.saturation, [0.2, 0.4, 0.6], [1, 0, 0.5]);
    expect(lum(out)).toBeCloseTo(0.362, 9);
    expect(Math.min(...out)).toBeCloseTo(0, 9);
    expect(out[0] < out[1] && out[1] < out[2]).toBe(true);
    near(blend(MODE.saturation, [0.2, 0.4, 0.6], grey(0.9)), grey(0.362));
  });

  it("Colour takes the paint's hue and saturation at the photo's luminosity", () => {
    near(blend(MODE.color, grey(0.5), [1, 0, 0]), [1, 0.5 - 0.3 * (0.5 / 0.7), 0.5 - 0.3 * (0.5 / 0.7)]);
    expect(lum(blend(MODE.color, [0.1, 0.7, 0.3], [0.2, 0.3, 0.9]))).toBeCloseTo(lum([0.1, 0.7, 0.3]), 9);
  });

  it("Luminosity takes the paint's luminosity at the photo's hue and saturation", () => {
    near(blend(MODE.luminosity, grey(0.2), [0.9, 0.1, 0.3]), grey(lum([0.9, 0.1, 0.3])));
    const out = blend(MODE.luminosity, [0.2, 0.3, 0.4], grey(0.5));
    expect(lum(out)).toBeCloseTo(0.5, 9);
    expect(out[1] - out[0]).toBeCloseTo(0.1, 9);
  });

  it("keep every result in range for in-range inputs", () => {
    const samples: Rgb[] = [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
      [0.05, 0.95, 0.5],
      [0.9, 0.85, 0.02],
    ];
    for (const mode of [MODE.hue, MODE.saturation, MODE.color, MODE.luminosity]) {
      for (const cb of samples) {
        for (const cs of samples) {
          for (const v of blend(mode, cb, cs)) {
            expect(v).toBeGreaterThanOrEqual(-1e-12);
            expect(v).toBeLessThanOrEqual(1 + 1e-12);
          }
        }
      }
    }
  });
});

describe("compositeLayer", () => {
  const over: Rgb = [1.5, -0.2, 0.5];

  it("leaves an unpainted pixel exactly as it was, past white and below black", () => {
    expect(compositeLayer(over, [1, 0, 0, 0], MODE.multiply, 1)).toEqual(over);
    expect(compositeLayer(over, [1, 0, 0, 1], MODE.multiply, 0)).toEqual(over);
  });

  it("lays Normal paint at full coverage", () => {
    near(compositeLayer([0.2, 0.4, 0.6], [0.9, 0.1, 0.3, 1], MODE.normal, 1), [0.9, 0.1, 0.3]);
  });

  it("blends against the base clamped to 0–1 where the paint covers", () => {
    near(compositeLayer(over, [0.5, 0.5, 0.5, 1], MODE.multiply, 1), [0.5, 0, 0.25]);
  });

  it("mixes the unclamped base with the blend by coverage times opacity", () => {
    const blended: Rgb = [0.5, 0, 0.25];
    const t = 0.8 * 0.5;
    near(compositeLayer(over, [0.5, 0.5, 0.5, 0.8], MODE.multiply, 0.5), [
      over[0] + (blended[0] - over[0]) * t,
      over[1] + (blended[1] - over[1]) * t,
      over[2] + (blended[2] - over[2]) * t,
    ]);
  });

  it("clamps the layer opacity to 0–1", () => {
    near(compositeLayer(grey(0.2), [0.9, 0.9, 0.9, 1], MODE.normal, 3), grey(0.9));
    expect(compositeLayer(grey(0.2), [0.9, 0.9, 0.9, 1], MODE.normal, -1)).toEqual(grey(0.2));
  });
});

describe("compositeLayers", () => {
  const red = { color: [1, 0, 0] as Rgb, coverage: 1, mode: MODE.normal, opacity: 0.5, visible: true };
  const half = { color: grey(0.5), coverage: 1, mode: MODE.multiply, opacity: 1, visible: true };

  it("composites bottom (layer 0) to top", () => {
    near(compositeLayers(grey(0.4), [red, half]), [0.35, 0.1, 0.1]);
    near(compositeLayers(grey(0.4), [half, red]), [0.6, 0.1, 0.1]);
  });

  it("skips hidden layers", () => {
    near(compositeLayers(grey(0.4), [red, { ...half, visible: false }]), [0.7, 0.2, 0.2]);
  });
});
