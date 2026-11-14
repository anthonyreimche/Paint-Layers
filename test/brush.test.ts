import { describe, expect, it } from "vitest";
import {
  DAB_SPACING,
  dabDistance,
  hexToRgb,
  lineDabs,
  makeDab,
  resolveTip,
  shouldStamp,
  stampSpacing,
  strokeDabs,
  type BrushState,
  type TipDynamics,
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

describe("textured brush dabs", () => {
  const TIP: TipDynamics = {
    id: "tb.fog",
    spacing: 0.5,
    scatter: 0,
    count: 1,
    sizeJitter: 0,
    angleJitter: 0,
    flowJitter: 0,
    angle: 0,
    followStroke: false,
  };
  const tipped = (over: Partial<TipDynamics> = {}): BrushState => ({ ...brush, tip: { ...TIP, ...over } });
  const sequence = (...values: number[]) => {
    let i = 0;
    return () => values[i++ % values.length];
  };
  const centre = () => 0.5;

  it("keeps a round brush free of angles, tips and jitter", () => {
    const dabs = strokeDabs({ x: 0.5, y: 0.5 }, { x: 1, y: 0 }, brush, RED, 1, false, true, () => {
      throw new Error("the round brush must not draw random numbers");
    });
    expect(dabs).toEqual([makeDab({ x: 0.5, y: 0.5 }, brush, RED, false, true)]);
    expect("angle" in dabs[0]).toBe(false);
    expect("tip" in dabs[0]).toBe(false);
  });

  it("spaces dabs by a fraction of the diameter", () => {
    expect(stampSpacing(brush)).toBeCloseTo(0.02, 9);
    expect(stampSpacing(tipped({ spacing: 0.5 }))).toBeCloseTo(0.08, 9);
    expect(shouldStamp({ x: 0, y: 0 }, { x: 0, y: 0.079 }, tipped({ spacing: 0.5 }), 1)).toBe(false);
    expect(shouldStamp({ x: 0, y: 0 }, { x: 0, y: 0.08 }, tipped({ spacing: 0.5 }), 1)).toBe(true);
  });

  it("names the tip and starts the stroke on the first dab only, and angles every dab", () => {
    const first = strokeDabs({ x: 0.5, y: 0.5 }, { x: 1, y: 0 }, tipped({ count: 3 }), RED, 1, false, true, centre);
    expect(first).toHaveLength(3);
    expect(first[0]).toMatchObject({ tip: "tb.fog", strokeStart: true, angle: 0 });
    for (const d of first.slice(1)) {
      expect("tip" in d).toBe(false);
      expect("strokeStart" in d).toBe(false);
      expect(d.angle).toBe(0);
    }
    const later = strokeDabs({ x: 0.5, y: 0.5 }, { x: 1, y: 0 }, tipped(), RED, 1, false, false, centre);
    expect("tip" in later[0]).toBe(false);
    expect(later[0].angle).toBe(0);
  });

  it("scatters across the stroke by scatter x diameter, converted back to UV", () => {
    const b = tipped({ scatter: 0.5 });
    // r = 1 -> +1 of the half-width: 0.5 * 0.16 = 0.08 to the stroke's left.
    const right = strokeDabs({ x: 0.5, y: 0.5 }, { x: 1, y: 0 }, b, RED, 2, false, false, () => 1);
    expect(right[0].x).toBeCloseTo(0.5, 9);
    expect(right[0].y).toBeCloseTo(0.58, 9);
    const left = strokeDabs({ x: 0.5, y: 0.5 }, { x: 1, y: 0 }, b, RED, 2, false, false, () => 0);
    expect(left[0].y).toBeCloseTo(0.42, 9);
    // A vertical stroke scatters sideways, where x is divided by the aspect.
    const side = strokeDabs({ x: 0.5, y: 0.5 }, { x: 0, y: 1 }, b, RED, 2, false, false, () => 1);
    expect(Math.abs(side[0].x - 0.5)).toBeCloseTo(0.04, 9);
    expect(side[0].y).toBeCloseTo(0.5, 9);
  });

  it("shrinks the radius by the size jitter, never below 2% of the brush", () => {
    const some = strokeDabs({ x: 0, y: 0 }, { x: 1, y: 0 }, tipped({ sizeJitter: 0.5 }), RED, 1, false, false, sequence(0.5, 0.5, 0.5, 0.5));
    expect(some[0].radius).toBeCloseTo(0.08 * 0.75, 9);
    const most = strokeDabs({ x: 0, y: 0 }, { x: 1, y: 0 }, tipped({ sizeJitter: 1 }), RED, 1, false, false, () => 1);
    expect(most[0].radius).toBeCloseTo(0.08 * 0.02, 9);
  });

  it("turns by the angle, the stroke direction and the jitter", () => {
    const base = strokeDabs({ x: 0, y: 0 }, { x: 1, y: 0 }, tipped({ angle: 0.3 }), RED, 1, false, false, centre);
    expect(base[0].angle).toBeCloseTo(0.3, 9);
    const follow = strokeDabs({ x: 0, y: 0 }, { x: 0, y: 1 }, tipped({ angle: 0.3, followStroke: true }), RED, 1, false, false, centre);
    expect(follow[0].angle).toBeCloseTo(0.3 + Math.PI / 2, 9);
    // The direction is measured in aspect-corrected units: 1 across, 1 down at aspect 2 is 45 degrees.
    const diagonal = strokeDabs({ x: 0, y: 0 }, { x: 0.5, y: 1 }, tipped({ followStroke: true }), RED, 2, false, false, centre);
    expect(diagonal[0].angle).toBeCloseTo(Math.PI / 4, 9);
    const jitter = strokeDabs({ x: 0, y: 0 }, { x: 1, y: 0 }, tipped({ angleJitter: 1 }), RED, 1, false, false, sequence(0.5, 0.5, 1, 0.5));
    expect(jitter[0].angle).toBeCloseTo(Math.PI, 9);
  });

  it("thins the flow by the flow jitter", () => {
    const dabs = strokeDabs({ x: 0, y: 0 }, { x: 1, y: 0 }, tipped({ flowJitter: 0.5 }), RED, 1, false, false, () => 1);
    expect(dabs[0].flow).toBeCloseTo(0.4 * 0.5, 9);
  });

  it("keeps opacity, colour and erase as the round brush has them", () => {
    const dabs = strokeDabs({ x: 0, y: 0 }, { x: 1, y: 0 }, tipped(), RED, 1, true, true, centre);
    expect(dabs[0]).toMatchObject({ opacity: 0.7, color: [1, 0, 0], erase: true, feather: 0.5 });
  });

  it("draws the random numbers in a fixed order, so a seeded source repeats", () => {
    const run = () =>
      strokeDabs({ x: 0.3, y: 0.3 }, { x: 1, y: 0 }, tipped({ count: 4, scatter: 1, sizeJitter: 1, angleJitter: 1, flowJitter: 1 }), RED, 1, false, false, sequence(0.1, 0.9, 0.3, 0.7, 0.5));
    expect(run()).toEqual(run());
  });

  it("lays a Shift+click line with the same generator", () => {
    const dabs = lineDabs({ x: 0.1, y: 0.5 }, { x: 0.3, y: 0.5 }, tipped({ count: 2 }), RED, 1, false, centre);
    // 0.2 / 0.08 -> 3 steps, 2 dabs each.
    expect(dabs).toHaveLength(6);
    expect(dabs[0]).toMatchObject({ tip: "tb.fog", strokeStart: true });
    expect(dabs.filter((d) => d.strokeStart).length).toBe(1);
    expect(dabs.filter((d) => d.tip).length).toBe(1);
    expect(dabs.every((d) => d.angle === 0)).toBe(true);
    expect(dabs[5].x).toBeCloseTo(0.3, 9);
  });

  it("turns a line's dabs along it when following the stroke", () => {
    const dabs = lineDabs({ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.5 }, tipped({ followStroke: true }), RED, 1, false, centre);
    expect(dabs.every((d) => Math.abs((d.angle ?? 0) - Math.PI / 2) < 1e-9)).toBe(true);
  });
});

describe("resolving the tip", () => {
  const stored = {
    tip: "tb.fog" as string | null,
    brushSpacing: 0.3,
    brushScatter: 0.1,
    brushCount: 2,
    brushSizeJitter: 0.2,
    brushAngle: 0.5,
    brushAngleJitter: 0.4,
    brushFollowStroke: true,
    brushFlowJitter: 0.6,
  };

  it("gives the stored dynamics when the tip is registered", () => {
    expect(resolveTip(stored, ["a", "tb.fog"])).toEqual({
      id: "tb.fog",
      spacing: 0.3,
      scatter: 0.1,
      count: 2,
      sizeJitter: 0.2,
      angle: 0.5,
      angleJitter: 0.4,
      followStroke: true,
      flowJitter: 0.6,
    });
  });

  it("is round when the tip is unset or its extension is off", () => {
    expect(resolveTip({ ...stored, tip: null }, ["tb.fog"])).toBeUndefined();
    expect(resolveTip(stored, ["other"])).toBeUndefined();
  });
});
