// Session state: whether the brush is on, the layer chosen for painting, the
// brush colour and the brush's own settings. Not part of the photo's edit —
// the layers themselves live in the paramBag (persistence.ts).

import type { BrushTipSettings, StoreApi } from "./safelight";
import { api } from "./runtime";

/** The brush a dab is stamped with: size is a radius in image-height units,
 *  the rest 0 to 1. */
export interface BrushSettings {
  brushSize: number;
  brushFeather: number;
  brushOpacity: number;
  brushFlow: number;
  brushErase: boolean;
}

/** The tip dynamics, in the units a tip's own settings use (BrushTipSettings):
 *  fractions of the diameter, 0 to 1 jitters, the angle in radians. */
export interface BrushDynamics {
  brushSpacing: number;
  brushScatter: number;
  brushCount: number;
  brushSizeJitter: number;
  brushAngle: number;
  brushAngleJitter: number;
  brushFollowStroke: boolean;
  brushFlowJitter: number;
}

export const DYNAMICS_DEFAULTS: Readonly<BrushDynamics> = {
  brushSpacing: 0.25,
  brushScatter: 0,
  brushCount: 1,
  brushSizeJitter: 0,
  brushAngle: 0,
  brushAngleJitter: 0,
  brushFollowStroke: false,
  brushFlowJitter: 0,
};

export function dynamicsOf(b: BrushTipSettings | undefined): BrushDynamics {
  return {
    brushSpacing: b?.spacing ?? DYNAMICS_DEFAULTS.brushSpacing,
    brushScatter: b?.scatter ?? DYNAMICS_DEFAULTS.brushScatter,
    brushCount: b?.count ?? DYNAMICS_DEFAULTS.brushCount,
    brushSizeJitter: b?.sizeJitter ?? DYNAMICS_DEFAULTS.brushSizeJitter,
    brushAngle: b?.angle ?? DYNAMICS_DEFAULTS.brushAngle,
    brushAngleJitter: b?.angleJitter ?? DYNAMICS_DEFAULTS.brushAngleJitter,
    brushFollowStroke: b?.followStroke ?? DYNAMICS_DEFAULTS.brushFollowStroke,
    brushFlowJitter: b?.flowJitter ?? DYNAMICS_DEFAULTS.brushFlowJitter,
  };
}

export interface PaintState extends BrushSettings, BrushDynamics {
  /** The chosen brush tip's id; null is the round brush. Kept while the
   *  extension that registers it is off. */
  tip: string | null;
  armed: boolean;
  activeLayerId: string | null;
  /** The colour input's "#rrggbb". */
  color: string;
  /** A brush slider is being dragged: the overlay shows the brush at the
   *  view's centre. */
  brushPreview: boolean;
  setArmed(v: boolean): void;
  toggleArmed(): void;
  setActiveLayer(id: string | null): void;
  setColor(hex: string): void;
  setBrushSize(v: number): void;
  setBrushFeather(v: number): void;
  setBrushOpacity(v: number): void;
  setBrushFlow(v: number): void;
  setBrushErase(v: boolean): void;
  setBrushPreview(v: boolean): void;
  /** Picks a tip (null for Round). A tip loads its own brush settings, each
   *  one it leaves out taking its default; Round leaves the dynamics alone. */
  pickTip(id: string | null, brush?: BrushTipSettings): void;
  setBrushDynamics(patch: Partial<BrushDynamics>): void;
}

let instance: StoreApi<PaintState> | null = null;

export function initStore(): StoreApi<PaintState> {
  instance = api().stores.create<PaintState>((set) => ({
    armed: false,
    activeLayerId: null,
    color: "#ffffff",
    brushSize: 0.08,
    brushFeather: 0.5,
    brushOpacity: 1,
    brushFlow: 1,
    brushErase: false,
    brushPreview: false,
    tip: null,
    ...DYNAMICS_DEFAULTS,
    setArmed: (armed) => set({ armed }),
    toggleArmed: () => set((s) => ({ armed: !s.armed })),
    setActiveLayer: (activeLayerId) => set({ activeLayerId }),
    setColor: (color) => set({ color }),
    setBrushSize: (brushSize) => set({ brushSize }),
    setBrushFeather: (brushFeather) => set({ brushFeather }),
    setBrushOpacity: (brushOpacity) => set({ brushOpacity }),
    setBrushFlow: (brushFlow) => set({ brushFlow }),
    setBrushErase: (brushErase) => set({ brushErase }),
    setBrushPreview: (brushPreview) => set({ brushPreview }),
    pickTip: (id, brush) => set(id === null ? { tip: null } : { tip: id, ...dynamicsOf(brush) }),
    setBrushDynamics: (patch) => set(patch),
  }));
  return instance;
}

export function store(): StoreApi<PaintState> {
  if (!instance) throw new Error("[paint-layers] store used before activate()");
  return instance;
}
