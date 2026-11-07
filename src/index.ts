// Paint Layers — Safelight extension entry point.
//
// One GPU stage (stage.ts) composites up to four painted layers over the
// photo; the panel (Panel.ts) manages the layers and the brush; the overlay
// (Overlay.ts) is the canvas tool held while the brush is on and paints into
// the chosen layer. The layers live in the photo's param bag as core's
// paint-texture shape, which core bakes per render.

import type { SafelightAPI } from "./safelight";
import { api, initRuntime } from "./runtime";
import { initStore, store } from "./store";
import { buildStage, EXT_ID, STAGE_ID } from "./stage";
import { PAINT_TOOL } from "./Overlay";
import { PaintPanel } from "./Panel";
import { resetAll } from "./persistence";

let unfollow: (() => void) | null = null;

export function activate(host: SafelightAPI): void {
  initRuntime(host);
  initStore();
  host.registerProcessingStage(buildStage());

  // The brush on holds the canvas; off lets it go.
  unfollow = store().subscribe((s, prev) => {
    if (s.armed !== prev.armed) host.develop.setCanvasTool(s.armed ? PAINT_TOOL : null);
  });

  host.registerPanel({
    id: `${EXT_ID}.panel`,
    title: "Paint Layers",
    component: PaintPanel,
    defaultDock: { module: "develop", direction: "right", order: 9, width: 250 },
    onReset: () => void resetAll(),
  });
}

export function deactivate(): void {
  // The host sweeps the panel, stage and canvas tool on disable/uninstall;
  // this makes their removal explicit and drops the brush so a re-enable
  // starts clean.
  try {
    store().getState().setArmed(false);
    unfollow?.();
    unfollow = null;
    api().develop.setCanvasTool(null);
    api().unregisterProcessingStage(STAGE_ID);
  } catch {
    /* activate() never ran — nothing to tear down */
  }
}
