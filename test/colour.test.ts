// The brush colour: the colour field's hue, saturation and lightness live in
// the store beside the hex the brush paints with, so a grey or a black keeps
// the hue and saturation it was reached from.

import { afterEach, describe, expect, it } from "vitest";
import { hslToHex, hexToRgb } from "../src/brush";
import { initRuntime } from "../src/runtime";
import { initStore, store } from "../src/store";
import type { SafelightAPI, StateCreator, StoreApi } from "../src/safelight";

function fakeStore<T extends object>(init: StateCreator<T>): StoreApi<T> {
  let state: T;
  const set = (partial: Partial<T> | ((s: T) => Partial<T>)) => {
    state = { ...state, ...(typeof partial === "function" ? partial(state) : partial) };
  };
  const get = () => state;
  state = init(set, get);
  const hook = ((selector?: (s: T) => unknown) => (selector ? selector(state) : state)) as StoreApi<T>;
  hook.getState = get;
  hook.setState = set;
  return hook;
}

function start() {
  initRuntime({
    stores: { create: fakeStore },
    develop: { brush: { defaults: { size: 0.1, feather: 0.5, opacity: 1, flow: 1 } } },
  } as Partial<SafelightAPI> as SafelightAPI);
  initStore();
}

describe("hslToHex", () => {
  it("writes the primaries, black, white and a grey", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000");
    expect(hslToHex(120, 100, 50)).toBe("#00ff00");
    expect(hslToHex(240, 100, 50)).toBe("#0000ff");
    expect(hslToHex(200, 80, 0)).toBe("#000000");
    expect(hslToHex(200, 80, 100)).toBe("#ffffff");
    expect(hslToHex(10, 0, 50)).toBe("#808080");
  });

  it("round-trips through hexToRgb", () => {
    const [r, g, b] = hexToRgb(hslToHex(30, 60, 40));
    expect([r, g, b].map((v) => Math.round(v * 255))).toEqual([163, 102, 41]);
  });
});

describe("brush colour", () => {
  afterEach(() => undefined);

  it("starts white, with the field's channels to match", () => {
    start();
    expect(store().getState()).toMatchObject({
      color: "#ffffff",
      colourHue: 0,
      colourSaturation: 0,
      colourLightness: 100,
    });
  });

  it("derives the hex from the field's channels", () => {
    start();
    store().getState().setColourChannels({ hue: 0, saturation: 100, lightness: 50 });
    expect(store().getState()).toMatchObject({ color: "#ff0000", colourHue: 0, colourSaturation: 100, colourLightness: 50 });
  });

  it("keeps the hue and saturation while lightness goes to 0 and back", () => {
    start();
    const s = store().getState();
    s.setColourChannels({ hue: 200, saturation: 70, lightness: 40 });
    const painted = store().getState().color;
    store().getState().setColourChannels({ hue: 200, saturation: 70, lightness: 0 });
    expect(store().getState().color).toBe("#000000");
    expect(store().getState()).toMatchObject({ colourHue: 200, colourSaturation: 70 });
    store().getState().setColourChannels({ hue: 200, saturation: 70, lightness: 40 });
    expect(store().getState().color).toBe(painted);
  });
});
