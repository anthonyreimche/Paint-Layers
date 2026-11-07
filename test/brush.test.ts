import { describe, expect, it } from "vitest";
import {
  DAB_SPACING,
  dabDistance,
  hexToRgb,
  lineDabs,
  makeDab,
  shouldStamp,
  type BrushState,
} from "../src/brush";

const brush: BrushState = {
  brushSize: 0.08,
  brushFeather: 0.5,
  brushOpacity: 0.7,
  brushFlow: 0.4,
  brushErase: false,
};
const RED: [number, number, number] = [1, 0, 0];

describe("makeDab", () => {
  it("captures the brush settings and colour at paint time", () => {
    expect(makeDab({ x: 0.3, y: 0.6 }, brush, RED, false, false)).toEqual({
      x: 0.3,
      y: 0.6,
      radius: 0.08,
      erase: false,
      feather: 0.5,
      opacity: 0.7,
      flow: 0.4,
      color: [1, 0, 0],
    });
  });

  it("marks the first dab of a stroke", () => {
    expect(makeDab({ x: 0, y: 0 }, brush, RED, false, true).strokeStart).toBe(true);
    expect("strokeStart" in makeDab({ x: 0, y: 0 }, brush, RED, false, false)).toBe(false);
  });

  it("copies the colour rather than sharing it", () => {
    const colour: [number, number, number] = [0.2, 0.4, 0.6];
    const dab = makeDab({ x: 0, y: 0 }, brush, colour, false, false);
    colour[0] = 1;
    expect(dab.color).toEqual([0.2, 0.4, 0.6]);
  });

  it("erases from Alt or from the Erase toggle", () => {
    expect(makeDab({ x: 0, y: 0 }, brush, RED, true, false).erase).toBe(true);
    expect(makeDab({ x: 0, y: 0 }, { ...brush, brushErase: true }, RED, false, false).erase).toBe(true);
  });
});

describe("spacing", () => {
  it("measures distance in aspect-corrected UV so spacing is round on screen", () => {
    expect(dabDistance({ x: 0, y: 0 }, { x: 0.1, y: 0 }, 2)).toBeCloseTo(0.2, 9);
    expect(dabDistance({ x: 0, y: 0 }, { x: 0, y: 0.1 }, 2)).toBeCloseTo(0.1, 9);
  });

  it("stamps once the pointer has moved a quarter radius", () => {
    expect(DAB_SPACING).toBe(0.25);
    expect(shouldStamp({ x: 0, y: 0 }, { x: 0, y: 0.019 }, brush, 1)).toBe(false);
    expect(shouldStamp({ x: 0, y: 0 }, { x: 0, y: 0.02 }, brush, 1)).toBe(true);
  });

  it("interpolates a straight line at that spacing as one stroke, excluding the start", () => {
    const dabs = lineDabs({ x: 0.1, y: 0.5 }, { x: 0.2, y: 0.5 }, brush, RED, 1, false);
    expect(dabs).toHaveLength(5);
    expect(dabs[0].x).toBeCloseTo(0.12, 9);
    expect(dabs[0].strokeStart).toBe(true);
    expect(dabs.slice(1).every((d) => d.strokeStart === undefined)).toBe(true);
    expect(dabs[4]).toMatchObject({ x: 0.2, y: 0.5, radius: 0.08, color: [1, 0, 0] });
  });

  it("still stamps one dab for a click shorter than the spacing", () => {
    expect(lineDabs({ x: 0.1, y: 0.5 }, { x: 0.101, y: 0.5 }, brush, RED, 1, false)).toHaveLength(1);
  });
});

describe("brush colour", () => {
  it("reads a colour input's hex as display-encoded 0–1", () => {
    expect(hexToRgb("#ff8000")).toEqual([1, 128 / 255, 0]);
    expect(hexToRgb("#FFFFFF")).toEqual([1, 1, 1]);
  });

  it("reads anything else as white", () => {
    expect(hexToRgb("red")).toEqual([1, 1, 1]);
    expect(hexToRgb("#fff")).toEqual([1, 1, 1]);
  });
});
