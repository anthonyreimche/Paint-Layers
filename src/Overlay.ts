// The canvas tool held while the brush is on (PAINT_TOOL), so crop, masks and
// heal never paint at the same time. It captures the pointer, maps it to source-UV
// through api.develop's overlay helpers (framePoint, then toImage), stamps dabs
// into the chosen layer at the masking panel's spacing, and commits one history
// entry per stroke. It shows the official brush ring; Ctrl, Cmd or Space held
// hands the pointer to the canvas's pan and zoom, which core does for a
// zoomable tool.

import type { PointerEvent as ReactPointerEvent } from "react";
import { hexToRgb, lineDabs, resolveTip, shouldStamp, strokeDabs, type BrushState, type Dab, type Point } from "./brush";
import { beginStroke, continueStroke, endStroke } from "./persistence";
import { api, h } from "./runtime";
import type { BrushSetting, CanvasTool } from "./safelight";
import { store, type PaintState } from "./store";

const BRUSH_KEY = {
  size: "brushSize",
  feather: "brushFeather",
  opacity: "brushOpacity",
  flow: "brushFlow",
} as const satisfies Record<BrushSetting, keyof PaintState>;

function brushState(s: PaintState): BrushState {
  const { brushSize, brushFeather, brushOpacity, brushFlow, brushErase } = s;
  const tip = resolveTip(s, api().develop.brushTips().map((t) => t.id));
  return { brushSize, brushFeather, brushOpacity, brushFlow, brushErase, ...(tip ? { tip } : {}) };
}

interface Stroke {
  last: Point;
  layerId: string;
}

export function PaintOverlay() {
  const react = api().react;
  const dev = api().stores.useDevelopStore;
  const armed = store()((s) => s.armed);
  const photoId = dev((s) => s.photoId);
  const brushSize = store()((s) => s.brushSize);
  const brushFeather = store()((s) => s.brushFeather);
  const brushErase = store()((s) => s.brushErase);
  const brushPreview = store()((s) => s.brushPreview);
  const tipId = store()((s) => s.tip);
  const tips = api().develop.useBrushTips();
  // A tip has no feather, so its brush shows the one ring.
  const feathered = !tips.some((t) => t.id === tipId);
  const { rect, imageRect, toImage } = api().develop.useDevelopOverlay();

  const [alt, setAlt] = react.useState(false);
  const [pointer, setPointer] = react.useState<Point | null>(null);
  const stroke = react.useRef<Stroke | null>(null);
  const lastPoint = react.useRef<Point | null>(null);

  const visible = armed && !!rect && !!photoId && !!toImage;
  const aspect = imageRect && imageRect.h > 0 ? imageRect.w / imageRect.h : 1;

  // A photo switch mid-stroke must not carry the stroke's layer over.
  react.useEffect(() => {
    stroke.current = null;
    lastPoint.current = null;
  }, [photoId]);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!visible || e.button !== 0 || !toImage) return;
    const at = api().develop.framePoint(e.currentTarget, e.clientX, e.clientY);
    const p = toImage(at.x, at.y);
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const brush = brushState(store().getState());
    const colour = hexToRgb(store().getState().color);
    const dabs: Dab[] =
      e.shiftKey && lastPoint.current
        ? lineDabs(lastPoint.current, p, brush, colour, aspect, e.altKey)
        : strokeDabs(p, { x: 0, y: 0 }, brush, colour, aspect, e.altKey, true, Math.random);
    const layerId = beginStroke(store().getState().activeLayerId, dabs);
    store().getState().setActiveLayer(layerId);
    lastPoint.current = p;
    stroke.current = { last: p, layerId };
    setPointer(at);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!visible || !toImage) return;
    const at = api().develop.framePoint(e.currentTarget, e.clientX, e.clientY);
    setPointer(at);
    setAlt(e.altKey);
    const s = stroke.current;
    if (!s) return;
    const p = toImage(at.x, at.y);
    const brush = brushState(store().getState());
    if (!shouldStamp(s.last, p, brush, aspect)) return;
    const heading = { x: p.x - s.last.x, y: p.y - s.last.y };
    continueStroke(
      s.layerId,
      strokeDabs(p, heading, brush, hexToRgb(store().getState().color), aspect, e.altKey, false, Math.random),
    );
    s.last = p;
    lastPoint.current = p;
  };

  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!stroke.current) return;
    stroke.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    void endStroke();
  };

  if (!visible) return null;

  return h(
    "div",
    {
      onPointerDown: onDown,
      onPointerMove: onMove,
      onPointerUp: onUp,
      onPointerLeave: () => {
        if (!stroke.current) setPointer(null);
      },
      style: {
        position: "absolute",
        inset: 0,
        touchAction: "none",
        cursor: api().cursors.resolve("crosshair"),
        overflow: "hidden",
      },
    },
    h(api().develop.BrushCursor, {
      at: brushPreview ? "centre" : pointer,
      size: brushSize,
      feather: feathered ? brushFeather : 0,
      erase: alt || brushErase,
    }),
  );
}

/** Steps the brush by `action` (one of Develop's brush shortcuts) when `run`;
 *  whether it is one. */
function takeAction(action: string, run: boolean): boolean {
  const s = store().getState();
  const step = api().develop.brush.step(action, {
    size: s.brushSize,
    feather: s.brushFeather,
    opacity: s.brushOpacity,
    flow: s.brushFlow,
  });
  if (!step) return false;
  if (run) store().setState({ [BRUSH_KEY[step.key]]: step.value });
  return true;
}

/** The tool held while the brush is on. Develop's brush shortcuts set the
 *  brush; Escape turns it off. */
export const PAINT_TOOL: CanvasTool = {
  overlay: PaintOverlay,
  zoomable: true,
  onEscape: () => store().getState().setArmed(false),
  onAction: (action) => takeAction(action, true),
  wants: (action) => takeAction(action, false),
};
