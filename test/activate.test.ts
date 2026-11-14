// Activation smoke test: the entry point wires the stage and panel against a
// stand-in API in node, holds the canvas tool while the brush is on, and
// deactivate() takes them down. No React render — the components are
// exercised by the in-app checks; this pins the contract activate() makes.

import { afterEach, describe, expect, it } from "vitest";
import { activate, deactivate } from "../src/index";
import { store } from "../src/store";
import type {
  CanvasTool,
  PanelContribution,
  ProcessingStageContribution,
  SafelightAPI,
  StateCreator,
  StoreApi,
} from "../src/safelight";

function fakeStore<T extends object>(init: StateCreator<T>): StoreApi<T> {
  let state: T;
  const listeners = new Set<(s: T, prev: T) => void>();
  const set = (partial: Partial<T> | ((s: T) => Partial<T>)) => {
    const prev = state;
    state = { ...state, ...(typeof partial === "function" ? partial(state) : partial) };
    for (const l of listeners) l(state, prev);
  };
  const get = () => state;
  state = init(set, get);
  const hook = ((selector?: (s: T) => unknown) => (selector ? selector(state) : state)) as StoreApi<T>;
  hook.getState = get;
  hook.setState = set;
  hook.subscribe = (l) => {
    listeners.add(l);
    return () => void listeners.delete(l);
  };
  return hook;
}

interface Registered {
  stages: ProcessingStageContribution[];
  panels: PanelContribution[];
  unregistered: string[];
  tools: (CanvasTool | null)[];
  stylesheets: string[];
}

function fakeApi(): { api: SafelightAPI; registered: Registered } {
  const registered: Registered = { stages: [], panels: [], unregistered: [], tools: [], stylesheets: [] };
  // Only the members activate() touches are populated, hence the partial cast.
  const api = {
    version: 1,
    extensionId: "paint-layers",
    registerProcessingStage: (c: ProcessingStageContribution) => void registered.stages.push(c),
    unregisterProcessingStage: (id: string) => void registered.unregistered.push(id),
    registerPanel: (c: PanelContribution) => void registered.panels.push(c),
    registerStylesheet: (c: { id: string; css: string }) => void registered.stylesheets.push(c.id),
    ui: { tokens: {} },
    stores: { create: fakeStore },
    develop: { setCanvasTool: (t: CanvasTool | null) => void registered.tools.push(t) },
  } as Partial<SafelightAPI> as SafelightAPI;
  return { api, registered };
}

describe("activate", () => {
  afterEach(() => deactivate());

  it("registers the stage and panel under the extension id", () => {
    const { api, registered } = fakeApi();
    activate(api);
    expect(registered.stages.map((s) => s.id)).toEqual(["paint-layers.composite"]);
    expect(registered.panels.map((p) => [p.id, p.title])).toEqual([["paint-layers.panel", "Paint Layers"]]);
    expect(registered.panels[0].defaultDock?.module).toBe("develop");
    expect(registered.stylesheets).toEqual(["safelight-paint-layers.styles"]);
  });

  it("starts with the brush off, no layer chosen and a white brush of its own", () => {
    const { api } = fakeApi();
    activate(api);
    const s = store().getState();
    expect(s).toMatchObject({
      armed: false,
      activeLayerId: null,
      color: "#ffffff",
      brushSize: 0.08,
      brushFeather: 0.5,
      brushOpacity: 1,
      brushFlow: 1,
      brushErase: false,
      brushPreview: false,
    });
  });

  it("keeps the brush settings in its own store", () => {
    const { api } = fakeApi();
    activate(api);
    const s = store().getState();
    s.setBrushSize(0.2);
    s.setBrushFeather(0.1);
    s.setBrushFlow(0.3);
    s.setBrushOpacity(0.4);
    s.setBrushErase(true);
    s.setBrushPreview(true);
    expect(store().getState()).toMatchObject({
      brushSize: 0.2,
      brushFeather: 0.1,
      brushFlow: 0.3,
      brushOpacity: 0.4,
      brushErase: true,
      brushPreview: true,
    });
  });

  it("starts on the round brush with the tip dynamics at their defaults", () => {
    const { api } = fakeApi();
    activate(api);
    expect(store().getState()).toMatchObject({
      tip: null,
      brushSpacing: 0.25,
      brushScatter: 0,
      brushCount: 1,
      brushSizeJitter: 0,
      brushAngleJitter: 0,
      brushFlowJitter: 0,
      brushAngle: 0,
      brushFollowStroke: false,
    });
  });

  it("loads a tip's own brush settings when it is picked, defaulting what it leaves out", () => {
    const { api } = fakeApi();
    activate(api);
    const s = store().getState();
    s.pickTip("tb.cloud", { spacing: 0.6, scatter: 0.6, count: 2, sizeJitter: 0.5, angleJitter: 1, followStroke: true });
    expect(store().getState()).toMatchObject({
      tip: "tb.cloud",
      brushSpacing: 0.6,
      brushScatter: 0.6,
      brushCount: 2,
      brushSizeJitter: 0.5,
      brushAngleJitter: 1,
      brushFlowJitter: 0,
      brushAngle: 0,
      brushFollowStroke: true,
    });
    store().getState().pickTip("tb.dust", undefined);
    expect(store().getState()).toMatchObject({
      tip: "tb.dust",
      brushSpacing: 0.25,
      brushScatter: 0,
      brushCount: 1,
      brushSizeJitter: 0,
      brushAngleJitter: 0,
      brushFollowStroke: false,
    });
  });

  it("goes back to Round without touching the dynamics, and sets them one by one", () => {
    const { api } = fakeApi();
    activate(api);
    store().getState().pickTip("tb.cloud", { spacing: 0.6 });
    store().getState().setBrushDynamics({ brushScatter: 0.9, brushAngle: 1 });
    store().getState().pickTip(null);
    expect(store().getState()).toMatchObject({ tip: null, brushSpacing: 0.6, brushScatter: 0.9, brushAngle: 1 });
  });

  it("holds the canvas tool while the brush is on and lets it go when off", () => {
    const { api, registered } = fakeApi();
    activate(api);
    store().getState().setArmed(true);
    store().getState().setArmed(false);
    expect(registered.tools.map((t) => t !== null)).toEqual([true, false]);
  });

  it("takes core's brush shortcuts while it holds the canvas", () => {
    const { api, registered } = fakeApi();
    activate(api);
    store().getState().setArmed(true);
    const tool = registered.tools[0];
    expect(tool?.wants?.("brush.larger")).toBe(true);
    expect(tool?.onAction?.("brush.larger")).toBe(true);
    expect(store().getState().brushSize).toBe(0.09);
    expect(tool?.onAction?.("mask.delete")).toBe(false);
    tool?.onEscape?.();
    expect(store().getState().armed).toBe(false);
  });

  it("disarms, lets the canvas go and drops the stage on deactivate", () => {
    const { api, registered } = fakeApi();
    activate(api);
    store().getState().setArmed(true);
    deactivate();
    expect(store().getState().armed).toBe(false);
    expect(registered.unregistered).toEqual(["paint-layers.composite"]);
    expect(registered.tools[registered.tools.length - 1]).toBeNull();
  });
});
