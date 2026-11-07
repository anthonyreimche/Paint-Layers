// The hovered layer's red tint, Masking's hover look for a mask. Core draws it
// from view-only stage values (api.develop.setViewValues), never part of the
// edit. It fades in and out as core fades a mask's: a third of the way to the
// target each frame, keeping the last layer while it fades out.

import { api } from "./runtime";
import { HIGHLIGHT_STRENGTH, PARAM } from "./stage";

let slot = -1;
let target = 0;
let shown = 0;
let frame: number | null = null;

function tick(): void {
  shown += (target - shown) * 0.3;
  if (Math.abs(target - shown) < 0.01) shown = target;
  api().develop.setViewValues(
    shown > 0.002 ? { [PARAM.highlight]: slot, [PARAM.highlightStrength]: shown } : null,
  );
  frame = shown !== target ? requestAnimationFrame(tick) : null;
}

/** Tint layer `next` (its slot, bottom layer 0), or with null fade out. */
export function highlightLayer(next: number | null): void {
  const moved = next !== null && next !== slot && shown > 0;
  if (next !== null) slot = next;
  target = next !== null ? HIGHLIGHT_STRENGTH : 0;
  if (frame === null && (moved || shown !== target)) frame = requestAnimationFrame(tick);
}

/** Drop the tint at once; core clears the view values when the extension stops. */
export function stopHighlight(): void {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  slot = -1;
  target = 0;
  shown = 0;
}
