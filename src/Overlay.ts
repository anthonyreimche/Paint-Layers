// The canvas tool held while the brush is on (PAINT_TOOL), so crop, masks and
// heal never paint at the same time. It captures the pointer, maps it to source-UV
// through api.develop's overlay helpers (client px → layout px by the
// Interface-scale zoom → toImage; never offsetX/Y, which break under Windows
// display scaling), stamps dabs into the chosen layer at the masking panel's
// spacing, and commits one history entry per stroke. It draws its own brush
// ring (the native cursor is hidden) and a centred reference ring while a
// brush slider is dragged; the paint itself shows in the render.

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { hexToRgb, lineDabs, makeDab, shouldStamp, type BrushState, type Dab, type Point } from "./brush";
import { brushStep } from "./keys";
import { beginStroke, continueStroke, endStroke } from "./persistence";
import { api, h } from "./runtime";
import type { CanvasTool } from "./safelight";
import { store } from "./store";

const RING_STYLE: CSSProperties = {
  position: "absolute",
  display: "none",
  transform: "translate(-50%, -50%)",
  borderRadius: "50%",
  boxShadow: "0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.35)",
  pointerEvents: "none",
};

function brushState(s: BrushState): BrushState {
  const { brushSize, brushFeather, brushOpacity, brushFlow, brushErase } = s;
  return { brushSize, brushFeather, brushOpacity, brushFlow, brushErase };
}

function isEditable(t: EventTarget | null): boolean {
  return (
    t instanceof HTMLElement &&
    (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
  );
}

interface Stroke {
  last: Point;
  layerId: string;
}

export function PaintOverlay() {
  const react = api().react;
  const dev = api().stores.useDevelopStore;
  const armed = store()((s) => s.armed);
  const color = store()((s) => s.color);
  const photoId = dev((s) => s.photoId);
  const brushSize = store()((s) => s.brushSize);
  const brushFeather = store()((s) => s.brushFeather);
  const brushErase = store()((s) => s.brushErase);
  const brushPreview = store()((s) => s.brushPreview);
  const { rect, imageRect, toImage, toScreen, radiusToScreen } = api().develop.useDevelopOverlay();

  const [gesture, setGesture] = react.useState(false);
  const [alt, setAlt] = react.useState(false);
  const gestureRef = react.useRef(false);
  const ringRef = react.useRef<HTMLDivElement | null>(null);
  const innerRef = react.useRef<HTMLDivElement | null>(null);
  const stroke = react.useRef<Stroke | null>(null);
  const lastPoint = react.useRef<Point | null>(null);
  const cursor = react.useRef({ lx: 0, ly: 0, shown: false });

  const visible = armed && !!rect && !!photoId && !!toImage && !!toScreen && !!radiusToScreen;
  const aspect = imageRect && imageRect.h > 0 ? imageRect.w / imageRect.h : 1;
  const setGestureState = (v: boolean) => {
    gestureRef.current = v;
    setGesture(v);
  };

  react.useEffect(() => {
    if (!visible || gesture) return;
    return api().develop.setCanvasCursor("none", { priority: 20 });
  }, [visible, gesture]);

  // A photo switch mid-stroke must not carry the stroke's layer over.
  react.useEffect(() => {
    stroke.current = null;
    lastPoint.current = null;
  }, [photoId]);

  // Ctrl/⌘ or Space held → click-through so the canvas pans/zooms underneath;
  // Alt tracked for the erase look of the ring.
  react.useEffect(() => {
    if (!visible) {
      setGestureState(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.code === "Space" || e.ctrlKey || e.metaKey) setGestureState(true);
      if (e.altKey) setAlt(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || !(e.ctrlKey || e.metaKey)) setGestureState(false);
      if (!e.altKey) setAlt(false);
    };
    const onBlur = () => {
      setGestureState(false);
      setAlt(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
      setGestureState(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const placeRing = (lx: number, ly: number, show: boolean) => {
    cursor.current = { lx, ly, shown: show };
    const s = store().getState();
    const px = radiusToScreen ? radiusToScreen(s.brushSize) : 0;
    const place = (el: HTMLDivElement | null, d: number, vis: boolean) => {
      if (!el) return;
      el.style.display = vis ? "block" : "none";
      el.style.width = `${d}px`;
      el.style.height = `${d}px`;
      el.style.left = `${lx}px`;
      el.style.top = `${ly}px`;
    };
    place(ringRef.current, Math.max(3, px) * 2, show);
    place(innerRef.current, Math.max(1, px * (1 - s.brushFeather)) * 2, show);
  };

  // Resize the ring the instant a shortcut or slider changes the brush, not
  // only on the next pointer move.
  react.useEffect(() => {
    if (cursor.current.shown) placeRing(cursor.current.lx, cursor.current.ly, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brushSize, brushFeather]);

  // Entering pan/zoom mode mid-stroke ends the stroke (committing what's
  // there) and hides the ring so the overlay visibly hands off to the canvas.
  react.useEffect(() => {
    if (!gesture || !stroke.current) return;
    stroke.current = null;
    void endStroke();
    placeRing(0, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gesture]);

  const localPoint = (e: ReactPointerEvent<HTMLDivElement>): { lx: number; ly: number } => {
    const r = e.currentTarget.getBoundingClientRect();
    const zoom = api().stores.useSettings.getState().uiScale || 1;
    return { lx: (e.clientX - r.left) / zoom, ly: (e.clientY - r.top) / zoom };
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!visible || gestureRef.current || e.button !== 0 || !toImage) return;
    const { lx, ly } = localPoint(e);
    const p = toImage(lx, ly);
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const brush = brushState(store().getState());
    const colour = hexToRgb(store().getState().color);
    const dabs: Dab[] =
      e.shiftKey && lastPoint.current
        ? lineDabs(lastPoint.current, p, brush, colour, aspect, e.altKey)
        : [makeDab(p, brush, colour, e.altKey, true)];
    const layerId = beginStroke(store().getState().activeLayerId, dabs);
    store().getState().setActiveLayer(layerId);
    lastPoint.current = p;
    stroke.current = { last: p, layerId };
    placeRing(lx, ly, true);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!visible || gestureRef.current || !toImage) return;
    const { lx, ly } = localPoint(e);
    placeRing(lx, ly, true);
    setAlt(e.altKey);
    const s = stroke.current;
    if (!s) return;
    const p = toImage(lx, ly);
    const brush = brushState(store().getState());
    if (!shouldStamp(s.last, p, brush, aspect)) return;
    continueStroke(s.layerId, [makeDab(p, brush, hexToRgb(store().getState().color), e.altKey, false)]);
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

  const erasing = alt || brushErase;
  const ringColor = erasing ? "rgba(255,107,107,0.95)" : "rgba(255,255,255,0.9)";
  const ringBorder = `1.5px ${erasing ? "dashed" : "solid"} ${ringColor}`;
  const refPx = rect && radiusToScreen ? radiusToScreen(brushSize) : 0;
  const centred = (d: number, border: string, background?: string): CSSProperties => ({
    ...RING_STYLE,
    display: "block",
    border,
    background,
    left: `${rect ? rect.x + rect.w / 2 : 0}px`,
    top: `${rect ? rect.y + rect.h / 2 : 0}px`,
    width: `${d}px`,
    height: `${d}px`,
  });

  return h(
    "div",
    {
      onPointerDown: onDown,
      onPointerMove: onMove,
      onPointerUp: onUp,
      onPointerLeave: () => {
        if (!stroke.current) placeRing(0, 0, false);
      },
      style: {
        position: "absolute",
        inset: 0,
        pointerEvents: gesture ? "none" : "auto",
        touchAction: "none",
        cursor: gesture ? "default" : "none",
        overflow: "hidden",
      },
    },
    h("div", { ref: ringRef, style: { ...RING_STYLE, border: ringBorder } }),
    h("div", { ref: innerRef, style: { ...RING_STYLE, border: "1px solid rgba(255,255,255,0.45)" } }),
    brushPreview && rect
      ? h(
          "div",
          { style: { position: "absolute", inset: 0, pointerEvents: "none" } },
          h("div", { style: centred(Math.max(3, refPx) * 2, "1.5px solid rgba(255,255,255,0.9)", color) }),
          h("div", {
            style: centred(
              Math.max(1, refPx * (1 - brushFeather)) * 2,
              "1px solid rgba(255,255,255,0.45)",
            ),
          }),
        )
      : null,
  );
}

/** Steps the brush by `action` (one of Develop's brush shortcuts) when `run`;
 *  whether it is one. */
function takeAction(action: string, run: boolean): boolean {
  const patch = brushStep(action, store().getState());
  if (!patch) return false;
  if (run) store().setState(patch);
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
