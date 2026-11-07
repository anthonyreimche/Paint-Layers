// Session state: whether the brush is on, the layer chosen for painting, the
// brush colour and the brush's own settings. Not part of the photo's edit —
// the layers themselves live in the paramBag (persistence.ts).

import type { StoreApi } from "./safelight";
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

export interface PaintState extends BrushSettings {
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
  }));
  return instance;
}

export function store(): StoreApi<PaintState> {
  if (!instance) throw new Error("[paint-layers] store used before activate()");
  return instance;
}
