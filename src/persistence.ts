// Writes to the photo's layers. Everything goes through setDynParams, which
// gives undo/redo, the sidecar, photo switches and paste-settings for free;
// core bakes the paint texture per render. A stroke writes live and commits
// once at pointer-up; every other edit commits as it is made, except a slider
// drag, which commits on release.

import type { PaintDab } from "./safelight";
import {
  addLayer,
  appendToLayer,
  deleteLayer,
  layersPatch,
  moveLayer,
  readLayers,
  resolveActive,
  storedLayers,
  updateLayer,
  type Layer,
  type LayerPatch,
} from "./layers";
import { api } from "./runtime";
import { PARAM } from "./stage";

function develop() {
  return api().stores.useDevelopStore.getState();
}

const current = (): readonly Layer[] => readLayers(develop().paramBag);

function newLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function write(layers: readonly Layer[]): void {
  develop().setDynParams(layersPatch(layers));
}

function commit(layers: readonly Layer[], label: string): void {
  write(layers);
  void develop().commitEdit(label);
}

/** Starts a stroke on the chosen layer (the top one when it is gone, a new one
 *  on a photo without layers) and returns the layer painted. */
export function beginStroke(activeId: string | null, dabs: readonly PaintDab[]): string {
  const layers = current();
  const target = resolveActive(layers, activeId);
  if (target) {
    continueStroke(target.id, dabs);
    return target.id;
  }
  const id = newLayerId();
  write(appendToLayer(addLayer(layers, id), id, dabs));
  return id;
}

/** Appends dabs live: only the layer list changes, so no history entry. */
export function continueStroke(layerId: string, dabs: readonly PaintDab[]): void {
  develop().setDynParams({ [PARAM.layers]: storedLayers(appendToLayer(current(), layerId, dabs)) });
}

export function endStroke(): Promise<void> {
  return develop().commitEdit("Paint Stroke");
}

/** Adds an empty layer on top; null when all four slots are taken. */
export function addNewLayer(): string | null {
  const layers = current();
  const id = newLayerId();
  const next = addLayer(layers, id);
  if (next === layers) return null;
  commit(next, "Add Paint Layer");
  return id;
}

export function removeLayer(id: string): void {
  commit(deleteLayer(current(), id), "Delete Paint Layer");
}

export function shiftLayer(id: string, delta: 1 | -1): void {
  const layers = current();
  const next = moveLayer(layers, id, delta);
  if (next !== layers) commit(next, "Move Paint Layer");
}

/** Changes a layer's fields: committed under `label`, or written live for a
 *  drag that commits on release (commitDrag). */
export function setLayer(id: string, patch: LayerPatch, label?: string): void {
  const next = updateLayer(current(), id, patch);
  if (label) commit(next, label);
  else write(next);
}

export function commitDrag(label: string): void {
  void develop().commitEdit(label);
}

export function clearLayer(id: string): void {
  commit(updateLayer(current(), id, { dabs: [] }), "Clear Paint Layer");
}

export async function resetAll(): Promise<void> {
  write([]);
  await develop().commitEdit("Reset Paint Layers");
}
