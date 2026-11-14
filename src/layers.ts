// The layer model. The photo's paramBag holds the layer list under the paint
// texture's key — PaintLayer[] plus a name, the shape core bakes — and each
// slot's mode, opacity and visibility under that slot's uniform keys. A slot
// is a position in the list, so the operations here work on whole layers and
// layersPatch rewrites every slot: a reorder or delete carries a layer's dabs,
// name and settings together.

import type { PaintDab, PaintLayer } from "./safelight";
import { BLEND_MODES } from "./blend";
import { LAYER_DEFAULTS, MAX_LAYERS, PARAM, paramKey } from "./stage";

export { MAX_LAYERS };

export interface StoredLayer extends PaintLayer {
  name: string;
}

export interface Layer extends StoredLayer {
  mode: number;
  opacity: number;
  visible: boolean;
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

// The bag comes back from sidecar JSON, so a dab is checked field by field.
function isPaintDab(value: unknown): value is PaintDab {
  if (!record(value)) return false;
  const c = value.color;
  return (
    finite(value.x) &&
    finite(value.y) &&
    finite(value.radius) &&
    finite(value.feather) &&
    finite(value.opacity) &&
    finite(value.flow) &&
    typeof value.erase === "boolean" &&
    (value.strokeStart === undefined || typeof value.strokeStart === "boolean") &&
    (value.tip === undefined || typeof value.tip === "string") &&
    (value.angle === undefined || finite(value.angle)) &&
    Array.isArray(c) &&
    c.length === 3 &&
    c.every(finite)
  );
}

function readMode(v: unknown): number {
  return Number.isInteger(v) && finite(v) && v >= 0 && v < BLEND_MODES.length ? v : LAYER_DEFAULTS.mode;
}

function readOpacity(v: unknown): number {
  return finite(v) && v >= 0 && v <= 1 ? v : LAYER_DEFAULTS.opacity;
}

function readVisible(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (finite(v)) return v !== 0;
  return LAYER_DEFAULTS.visible;
}

/** The photo's layers, bottom first. A damaged entry keeps its slot, so the
 *  slot settings stay paired with the layers core bakes. */
export function readLayers(bag: Record<string, unknown>): Layer[] {
  const list = bag[PARAM.layers];
  if (!Array.isArray(list)) return [];
  return list.slice(0, MAX_LAYERS).map((entry: unknown, i) => {
    const e = record(entry) ? entry : {};
    return {
      id: typeof e.id === "string" && e.id ? e.id : `layer-${i}`,
      name: typeof e.name === "string" ? e.name : `Layer ${i + 1}`,
      dabs: Array.isArray(e.dabs) ? e.dabs.filter(isPaintDab) : [],
      mode: readMode(bag[paramKey("mode", i)]),
      opacity: readOpacity(bag[paramKey("opacity", i)]),
      visible: readVisible(bag[paramKey("visible", i)]),
    };
  });
}

/** The bag entries for `layers`: the list, and every slot's settings, the
 *  empty slots at their defaults. */
export function layersPatch(layers: readonly Layer[]): Record<string, unknown> {
  const patch: Record<string, unknown> = { [PARAM.layers]: storedLayers(layers) };
  for (let i = 0; i < MAX_LAYERS; i++) {
    const l = layers[i];
    patch[paramKey("mode", i)] = l ? l.mode : LAYER_DEFAULTS.mode;
    patch[paramKey("opacity", i)] = l ? l.opacity : LAYER_DEFAULTS.opacity;
    patch[paramKey("visible", i)] = l ? l.visible : LAYER_DEFAULTS.visible;
  }
  return patch;
}

/** The list alone, for writes that change only dabs. */
export function storedLayers(layers: readonly Layer[]): StoredLayer[] {
  return layers.map(({ id, name, dabs }) => ({ id, name, dabs }));
}

export function nextLayerName(layers: readonly Layer[]): string {
  const taken = new Set(layers.map((l) => l.name));
  let n = 1;
  while (taken.has(`Layer ${n}`)) n++;
  return `Layer ${n}`;
}

/** A new empty layer on top; `layers` itself when all four slots are full. */
export function addLayer(layers: readonly Layer[], id: string): readonly Layer[] {
  if (layers.length >= MAX_LAYERS) return layers;
  return [...layers, { id, name: nextLayerName(layers), dabs: [], ...LAYER_DEFAULTS }];
}

export function deleteLayer(layers: readonly Layer[], id: string): readonly Layer[] {
  return layers.filter((l) => l.id !== id);
}

/** Moves a layer one slot up (+1, toward the top) or down (−1). */
export function moveLayer(layers: readonly Layer[], id: string, delta: 1 | -1): readonly Layer[] {
  const from = layers.findIndex((l) => l.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= layers.length) return layers;
  const out = [...layers];
  [out[from], out[to]] = [out[to], out[from]];
  return out;
}

export type LayerPatch = Partial<Pick<Layer, "name" | "dabs" | "mode" | "opacity" | "visible">>;

export function updateLayer(layers: readonly Layer[], id: string, patch: LayerPatch): readonly Layer[] {
  return layers.map((l) => (l.id === id ? { ...l, ...patch } : l));
}

export function appendToLayer(layers: readonly Layer[], id: string, dabs: readonly PaintDab[]): readonly Layer[] {
  if (!layers.some((l) => l.id === id)) return layers;
  return layers.map((l) => (l.id === id ? { ...l, dabs: [...l.dabs, ...dabs] } : l));
}

/** The layer being painted: the chosen one while it exists, else the top. */
export function resolveActive(layers: readonly Layer[], activeId: string | null): Layer | null {
  return layers.find((l) => l.id === activeId) ?? layers[layers.length - 1] ?? null;
}
