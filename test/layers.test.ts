import { describe, expect, it } from "vitest";
import {
  addLayer,
  appendToLayer,
  deleteLayer,
  layersPatch,
  MAX_LAYERS,
  moveLayer,
  nextLayerName,
  readLayers,
  resolveActive,
  updateLayer,
  type Layer,
} from "../src/layers";
import { PARAM, paramKey } from "../src/stage";
import type { PaintDab } from "../src/safelight";

const dab = (x: number, color: [number, number, number] = [1, 0, 0]): PaintDab => ({
  x,
  y: 0.5,
  radius: 0.1,
  erase: false,
  feather: 0.5,
  opacity: 1,
  flow: 1,
  color,
});

const layer = (id: string, over: Partial<Layer> = {}): Layer => ({
  id,
  name: id.toUpperCase(),
  dabs: [dab(0.1)],
  mode: 0,
  opacity: 1,
  visible: true,
  ...over,
});

describe("readLayers", () => {
  it("joins each stored layer with its slot's mode, opacity and visibility", () => {
    const bag = {
      [PARAM.layers]: [
        { id: "a", name: "Glow", dabs: [dab(0.1)] },
        { id: "b", name: "Shade", dabs: [] },
      ],
      [paramKey("mode", 0)]: 3,
      [paramKey("opacity", 0)]: 0.4,
      [paramKey("visible", 1)]: false,
    };
    expect(readLayers(bag)).toEqual([
      { id: "a", name: "Glow", dabs: [dab(0.1)], mode: 3, opacity: 0.4, visible: true },
      { id: "b", name: "Shade", dabs: [], mode: 0, opacity: 1, visible: false },
    ]);
  });

  it("reads an absent or foreign value as no layers", () => {
    expect(readLayers({})).toEqual([]);
    expect(readLayers({ [PARAM.layers]: "x" })).toEqual([]);
  });

  it("keeps a damaged layer in its slot, naming it and dropping the dabs it can't read", () => {
    const bag = {
      [PARAM.layers]: [
        { dabs: [dab(0.1), { x: 1 }, { ...dab(0.2), color: [1, 0] }] },
        { id: "b", name: "B", dabs: "x" },
      ],
      [paramKey("mode", 1)]: 2,
    };
    const layers = readLayers(bag);
    expect(layers.map((l) => [l.id, l.name, l.dabs.length, l.mode])).toEqual([
      ["layer-0", "Layer 1", 1, 0],
      ["b", "B", 0, 2],
    ]);
  });

  it("reads only the first four layers, which are all core bakes", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ id: `l${i}`, name: `L${i}`, dabs: [] }));
    expect(readLayers({ [PARAM.layers]: many })).toHaveLength(MAX_LAYERS);
  });

  it("reads modes, opacities and visibilities defensively", () => {
    const bag = {
      [PARAM.layers]: [{ id: "a", name: "A", dabs: [] }, { id: "b", name: "B", dabs: [] }],
      [paramKey("mode", 0)]: 42,
      [paramKey("opacity", 0)]: 7,
      [paramKey("visible", 0)]: 0,
      [paramKey("mode", 1)]: 2.6,
      [paramKey("opacity", 1)]: "half",
    };
    expect(readLayers(bag).map((l) => [l.mode, l.opacity, l.visible])).toEqual([
      [0, 1, false],
      [0, 1, true],
    ]);
  });

  it("keeps a dab's stroke marker", () => {
    const marked = { ...dab(0.1), strokeStart: true };
    expect(readLayers({ [PARAM.layers]: [{ id: "a", name: "A", dabs: [marked] }] })[0].dabs).toEqual([marked]);
  });
});

describe("layersPatch", () => {
  it("writes the layer list and every slot's settings, defaults in the empty slots", () => {
    const patch = layersPatch([layer("a", { mode: 9, opacity: 0.5 }), layer("b", { visible: false })]);
    expect(patch[PARAM.layers]).toEqual([
      { id: "a", name: "A", dabs: [dab(0.1)] },
      { id: "b", name: "B", dabs: [dab(0.1)] },
    ]);
    expect([0, 1, 2, 3].map((i) => patch[paramKey("mode", i)])).toEqual([9, 0, 0, 0]);
    expect([0, 1, 2, 3].map((i) => patch[paramKey("opacity", i)])).toEqual([0.5, 1, 1, 1]);
    expect([0, 1, 2, 3].map((i) => patch[paramKey("visible", i)])).toEqual([true, false, true, true]);
  });

  it("round-trips through readLayers", () => {
    const layers = [layer("a", { mode: 15, opacity: 0.25 }), layer("b", { visible: false })];
    expect(readLayers(layersPatch(layers))).toEqual(layers);
  });
});

describe("layer operations", () => {
  const stack = [
    layer("a", { mode: 1, opacity: 0.2 }),
    layer("b", { mode: 2, visible: false }),
    layer("c", { mode: 3, dabs: [] }),
  ];

  it("adds a layer on top with defaults, up to four", () => {
    const four = addLayer(stack, "d");
    expect(four[3]).toEqual({ id: "d", name: "Layer 1", dabs: [], mode: 0, opacity: 1, visible: true });
    expect(addLayer(four, "e")).toBe(four);
  });

  it("names a new layer with the lowest free number", () => {
    expect(nextLayerName([])).toBe("Layer 1");
    expect(nextLayerName([layer("a", { name: "Layer 2" })])).toBe("Layer 1");
    expect(nextLayerName([layer("a", { name: "Layer 1" }), layer("b", { name: "Sky" })])).toBe("Layer 2");
  });

  it("moves a layer's dabs, name, mode, opacity and visibility together", () => {
    const moved = moveLayer(stack, "b", 1);
    expect(moved.map((l) => l.id)).toEqual(["a", "c", "b"]);
    expect(moved[2]).toEqual(stack[1]);
    expect(moved[1]).toEqual(stack[2]);
    const patch = layersPatch(moved);
    expect([0, 1, 2].map((i) => patch[paramKey("mode", i)])).toEqual([1, 3, 2]);
    expect([0, 1, 2].map((i) => patch[paramKey("visible", i)])).toEqual([true, true, false]);
  });

  it("leaves the order alone moving past either end", () => {
    expect(moveLayer(stack, "c", 1)).toBe(stack);
    expect(moveLayer(stack, "a", -1)).toBe(stack);
    expect(moveLayer(stack, "missing", 1)).toBe(stack);
  });

  it("deletes a layer and shifts the ones above it down, settings and all", () => {
    const left = deleteLayer(stack, "a");
    expect(left).toEqual([stack[1], stack[2]]);
    const patch = layersPatch(left);
    expect([0, 1, 2].map((i) => patch[paramKey("mode", i)])).toEqual([2, 3, 0]);
    expect([0, 1, 2].map((i) => patch[paramKey("opacity", i)])).toEqual([1, 1, 1]);
    expect([0, 1, 2].map((i) => patch[paramKey("visible", i)])).toEqual([false, true, true]);
  });

  it("updates one layer's fields", () => {
    const out = updateLayer(stack, "b", { name: "Dodge", mode: 6, opacity: 0.3, visible: true });
    expect(out[1]).toEqual({ ...stack[1], name: "Dodge", mode: 6, opacity: 0.3, visible: true });
    expect(out[0]).toBe(stack[0]);
  });

  it("appends dabs to one layer", () => {
    const out = appendToLayer(stack, "c", [dab(0.3), dab(0.4)]);
    expect(out[2].dabs).toEqual([dab(0.3), dab(0.4)]);
    expect(out[0]).toBe(stack[0]);
    expect(appendToLayer(stack, "missing", [dab(0.3)])).toBe(stack);
  });
});

describe("resolveActive", () => {
  const stack = [layer("a"), layer("b")];

  it("keeps the chosen layer while it exists", () => {
    expect(resolveActive(stack, "a")?.id).toBe("a");
  });

  it("falls back to the top layer, or none", () => {
    expect(resolveActive(stack, "gone")?.id).toBe("b");
    expect(resolveActive(stack, null)?.id).toBe("b");
    expect(resolveActive([], "a")).toBeNull();
  });
});
