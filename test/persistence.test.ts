// The store-facing writes against a stand-in develop store: painting writes
// live and commits once per stroke, and every layer edit is one history entry.

import { beforeEach, describe, expect, it } from "vitest";
import {
  addNewLayer,
  beginStroke,
  clearLayer,
  continueStroke,
  endStroke,
  removeLayer,
  resetAll,
  setLayer,
  shiftLayer,
} from "../src/persistence";
import { readLayers } from "../src/layers";
import { initRuntime } from "../src/runtime";
import { PARAM, paramKey } from "../src/stage";
import type { DevelopStoreState, PaintDab, SafelightAPI } from "../src/safelight";

const dab = (x: number): PaintDab => ({
  x,
  y: 0.5,
  radius: 0.1,
  erase: false,
  feather: 0.5,
  opacity: 1,
  flow: 1,
  color: [1, 0, 0],
});

let bag: Record<string, unknown>;
let log: string[];

beforeEach(() => {
  bag = {};
  log = [];
  // Only the bag and its two writers are exercised, hence the partial casts.
  const develop = {
    getState: () =>
      ({
        paramBag: bag,
        setDynParams: (patch: Record<string, unknown>) => {
          bag = { ...bag, ...patch };
          log.push("write");
        },
        commitEdit: async (label: string) => void log.push(`commit ${label}`),
      }) as Partial<DevelopStoreState> as DevelopStoreState,
  };
  initRuntime({ stores: { useDevelopStore: develop } } as Partial<SafelightAPI> as SafelightAPI);
});

describe("painting", () => {
  it("creates the first layer for a stroke on an empty photo and commits once at the end", async () => {
    const id = beginStroke(null, [dab(0.1)]);
    continueStroke(id, [dab(0.2)]);
    continueStroke(id, [dab(0.3)]);
    expect(log).toEqual(["write", "write", "write"]);
    await endStroke();
    expect(log).toEqual(["write", "write", "write", "commit Paint Stroke"]);
    const layers = readLayers(bag);
    expect(layers).toHaveLength(1);
    expect(layers[0].id).toBe(id);
    expect(layers[0].name).toBe("Layer 1");
    expect(layers[0].dabs.map((d) => d.x)).toEqual([0.1, 0.2, 0.3]);
  });

  it("paints into the chosen layer, or the top one when the choice is gone", () => {
    const a = addNewLayer();
    const b = addNewLayer();
    expect(beginStroke(a, [dab(0.1)])).toBe(a);
    expect(beginStroke("gone", [dab(0.2)])).toBe(b);
    expect(readLayers(bag).map((l) => l.dabs.length)).toEqual([1, 1]);
  });

  it("writes only the layer list while a stroke runs", () => {
    const id = addNewLayer();
    if (!id) throw new Error("no layer");
    bag = { ...bag, [paramKey("mode", 0)]: 42 };
    continueStroke(id, [dab(0.4)]);
    expect(bag[paramKey("mode", 0)]).toBe(42);
    expect(readLayers(bag)[0].dabs).toHaveLength(1);
  });
});

describe("layer edits", () => {
  it("adds up to four layers, each one history entry", () => {
    const ids = [addNewLayer(), addNewLayer(), addNewLayer(), addNewLayer()];
    expect(ids.every((id) => typeof id === "string")).toBe(true);
    expect(new Set(ids).size).toBe(4);
    expect(addNewLayer()).toBeNull();
    expect(log.filter((l) => l.startsWith("commit"))).toEqual(Array(4).fill("commit Add Paint Layer"));
  });

  it("moves and deletes a layer with its settings", () => {
    const a = addNewLayer();
    const b = addNewLayer();
    if (!a || !b) throw new Error("no layer");
    setLayer(a, { mode: 3, opacity: 0.5 }, "Paint Layer Blend Mode");
    setLayer(b, { visible: false }, "Hide Paint Layer");
    shiftLayer(a, 1);
    expect(readLayers(bag).map((l) => [l.id, l.mode, l.opacity, l.visible])).toEqual([
      [b, 0, 1, false],
      [a, 3, 0.5, true],
    ]);
    removeLayer(b);
    expect(readLayers(bag).map((l) => [l.id, l.mode, l.opacity, l.visible])).toEqual([[a, 3, 0.5, true]]);
    expect(bag[paramKey("mode", 1)]).toBe(0);
    expect(log.filter((l) => l.startsWith("commit"))).toEqual([
      "commit Add Paint Layer",
      "commit Add Paint Layer",
      "commit Paint Layer Blend Mode",
      "commit Hide Paint Layer",
      "commit Move Paint Layer",
      "commit Delete Paint Layer",
    ]);
  });

  it("writes a setting live without a label and commits with one", () => {
    const a = addNewLayer();
    if (!a) throw new Error("no layer");
    log.length = 0;
    setLayer(a, { opacity: 0.3 });
    expect(log).toEqual(["write"]);
    expect(readLayers(bag)[0].opacity).toBe(0.3);
  });

  it("clears a layer's dabs and keeps the layer", () => {
    const id = beginStroke(null, [dab(0.1)]);
    clearLayer(id);
    expect(readLayers(bag)[0].dabs).toEqual([]);
    expect(log[log.length - 1]).toBe("commit Clear Paint Layer");
  });

  it("resets to no layers", async () => {
    addNewLayer();
    await resetAll();
    expect(bag[PARAM.layers]).toEqual([]);
    expect(log[log.length - 1]).toBe("commit Reset Paint Layers");
  });
});
