// The hovered layer's tint, as Masking's hovered mask has: it fades in toward
// the masks' strength and back out through api.develop.setViewValues, keeps
// the layer while it fades out, and clears the view values when done.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { highlightLayer, stopHighlight } from "../src/highlight";
import { initRuntime } from "../src/runtime";
import { HIGHLIGHT_STRENGTH, PARAM } from "../src/stage";
import type { SafelightAPI } from "../src/safelight";

let frames: (() => void)[] = [];
let sent: (Record<string, unknown> | null)[] = [];

const runFrames = (n = 100) => {
  for (let i = 0; i < n && frames.length > 0; i++) frames.shift()?.();
};

beforeEach(() => {
  frames = [];
  sent = [];
  Object.assign(globalThis, {
    requestAnimationFrame: (cb: () => void) => frames.push(cb),
    cancelAnimationFrame: () => void (frames = []),
  });
  initRuntime({
    develop: { setViewValues: (v: Record<string, unknown> | null) => void sent.push(v) },
  } as Partial<SafelightAPI> as SafelightAPI);
});

afterEach(() => stopHighlight());

describe("highlightLayer", () => {
  it("fades the layer's tint in to the masks' strength", () => {
    highlightLayer(2);
    runFrames();
    const strengths = sent.map((v) => v?.[PARAM.highlightStrength] as number);
    expect(strengths.every((s, i) => i === 0 || s >= strengths[i - 1])).toBe(true);
    expect(sent[sent.length - 1]).toEqual({ [PARAM.highlight]: 2, [PARAM.highlightStrength]: HIGHLIGHT_STRENGTH });
    expect(frames).toHaveLength(0);
  });

  it("fades out on the layer it showed, then clears the view values", () => {
    highlightLayer(1);
    runFrames();
    sent = [];
    highlightLayer(null);
    runFrames();
    expect(sent.slice(0, -1).every((v) => v?.[PARAM.highlight] === 1)).toBe(true);
    expect(sent[sent.length - 1]).toBeNull();
  });

  it("moves straight to another hovered layer", () => {
    highlightLayer(0);
    runFrames();
    highlightLayer(3);
    runFrames();
    expect(sent[sent.length - 1]).toEqual({ [PARAM.highlight]: 3, [PARAM.highlightStrength]: HIGHLIGHT_STRENGTH });
  });
});
