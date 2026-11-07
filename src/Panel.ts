// The Develop panel: the layer list (top layer first, as it stacks), the chosen
// layer's name, blend mode and opacity, and the brush — its colour and
// settings, which are its own. Controls come from api.ui and api.components; inline
// style only lays them out.

import type { ChangeEvent, CSSProperties } from "react";
import { BLEND_MODES } from "./blend";
import { MAX_LAYERS, readLayers, resolveActive, type Layer } from "./layers";
import {
  addNewLayer,
  clearLayer,
  commitDrag,
  removeLayer,
  setLayer,
  shiftLayer,
} from "./persistence";
import { api, h } from "./runtime";
import { store } from "./store";

const MODE_OPTIONS = BLEND_MODES.map((m, i) => ({ value: String(i), label: m.label }));

export function PaintPanel() {
  const a = api();
  const Slider = a.components.Slider;
  const { Button, Field, Row, Section, Select, Stack, TextInput, Toggle, tokens } = a.ui;
  const dev = a.stores.useDevelopStore;
  const react = a.react;

  const armed = store()((s) => s.armed);
  const activeId = store()((s) => s.activeLayerId);
  const color = store()((s) => s.color);
  const paramBag = dev((s) => s.paramBag);
  const brushSize = store()((s) => s.brushSize);
  const brushFeather = store()((s) => s.brushFeather);
  const brushOpacity = store()((s) => s.brushOpacity);
  const brushFlow = store()((s) => s.brushFlow);
  const brushErase = store()((s) => s.brushErase);
  const renamed = react.useRef(false);
  const held = a.develop.useCanvasToolHeld();

  // Another tool took the canvas (crop, masks, heal): the brush goes off.
  react.useEffect(() => {
    if (armed && !held) store().getState().setArmed(false);
  }, [armed, held]);

  const layers = readLayers(paramBag);
  const active = resolveActive(layers, activeId);
  const hint: CSSProperties = { fontSize: "10px", lineHeight: 1.4, color: tokens.textMuted };

  const select = (id: string) => store().getState().setActiveLayer(id);

  const add = () => {
    const id = addNewLayer();
    if (id) select(id);
  };

  const layerRow = (layer: Layer, slot: number) =>
    h(
      Row,
      { key: layer.id, gap: 4 },
      h(Toggle, {
        checked: layer.visible,
        ariaLabel: layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`,
        onChange: (v: boolean) => setLayer(layer.id, { visible: v }, v ? "Show Paint Layer" : "Hide Paint Layer"),
      }),
      h(
        Button,
        {
          size: "sm",
          variant: "ghost",
          active: layer.id === active?.id,
          title: "Paint on this layer",
          style: { flex: 1, justifyContent: "flex-start", minWidth: 0, overflow: "hidden" },
          onClick: () => select(layer.id),
        },
        layer.name || "Untitled",
      ),
      h(
        Button,
        {
          size: "sm",
          variant: "ghost",
          title: "Move up",
          "aria-label": `Move ${layer.name} up`,
          disabled: slot === layers.length - 1,
          onClick: () => shiftLayer(layer.id, 1),
        },
        "↑",
      ),
      h(
        Button,
        {
          size: "sm",
          variant: "ghost",
          title: "Move down",
          "aria-label": `Move ${layer.name} down`,
          disabled: slot === 0,
          onClick: () => shiftLayer(layer.id, -1),
        },
        "↓",
      ),
      h(
        Button,
        {
          size: "sm",
          variant: "ghost",
          title: "Delete layer",
          "aria-label": `Delete ${layer.name}`,
          onClick: () => removeLayer(layer.id),
        },
        "×",
      ),
    );

  const layerSettings = (layer: Layer) =>
    h(
      Stack,
      { gap: 6 },
      h(
        Field,
        { label: "Name" },
        h(TextInput, {
          value: layer.name,
          maxLength: 40,
          "aria-label": "Layer name",
          onChange: (v: string) => {
            renamed.current = true;
            setLayer(layer.id, { name: v });
          },
          onBlur: () => {
            if (!renamed.current) return;
            renamed.current = false;
            commitDrag("Rename Paint Layer");
          },
        }),
      ),
      h(
        Field,
        { label: "Blend mode" },
        h(Select, {
          value: String(layer.mode),
          options: MODE_OPTIONS,
          ariaLabel: "Blend mode",
          onChange: (v: string) => setLayer(layer.id, { mode: Number(v) }, "Paint Layer Blend Mode"),
        }),
      ),
      h(Slider, {
        label: "Opacity",
        value: Math.round(layer.opacity * 100),
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 100,
        onChange: (v: number) => setLayer(layer.id, { opacity: v / 100 }),
        onCommit: () => commitDrag("Paint Layer Opacity"),
      }),
    );

  // Brush settings, shown as percentages like the masking panel does.
  const brushSlider = (
    label: string,
    value: number,
    min: number,
    defaultValue: number,
    set: (v: number) => void,
    max = 100,
  ) =>
    h(Slider, {
      key: label,
      label,
      value: Math.round(value * 100),
      min,
      max,
      step: 1,
      defaultValue,
      onChange: (v: number) => {
        set(v / 100);
        store().getState().setBrushPreview(true);
      },
      onCommit: () => store().getState().setBrushPreview(false),
    });

  const d = store().getState();
  const topFirst = layers.map((layer, slot) => ({ layer, slot })).reverse();

  return h(
    Stack,
    { gap: 10, style: { padding: "6px 8px 8px" } },
    h(
      Section,
      {
        title: "Layers",
        right: h(
          Button,
          { size: "sm", disabled: layers.length >= MAX_LAYERS, onClick: add },
          "Add layer",
        ),
      },
      layers.length === 0
        ? h("span", { style: hint }, "No layers yet. Add one, or turn the brush on and paint.")
        : h(Stack, { gap: 2 }, topFirst.map(({ layer, slot }) => layerRow(layer, slot))),
      active ? layerSettings(active) : null,
    ),
    h(
      Section,
      {
        title: "Brush",
        right: h(
          Button,
          { size: "sm", active: armed, onClick: () => store().getState().toggleArmed() },
          armed ? "Done" : "Paint",
        ),
      },
      h(
        Row,
        { gap: 8 },
        h("input", {
          type: "color",
          value: color,
          "aria-label": "Brush colour",
          title: "Brush colour",
          onChange: (e: ChangeEvent<HTMLInputElement>) => store().getState().setColor(e.currentTarget.value),
          style: {
            width: "32px",
            height: "22px",
            padding: 0,
            border: `1px solid ${tokens.border}`,
            borderRadius: "3px",
            background: "transparent",
            cursor: "pointer",
          },
        }),
        h("span", { style: { fontSize: "11px", color: tokens.textSecondary } }, "Colour"),
      ),
      h(
        Stack,
        { gap: 1 },
        brushSlider("Size", brushSize, 1, 8, (v) => d.setBrushSize(v), 50),
        brushSlider("Feather", brushFeather, 0, 50, (v) => d.setBrushFeather(v)),
        brushSlider("Flow", brushFlow, 1, 100, (v) => d.setBrushFlow(v)),
        brushSlider("Opacity", brushOpacity, 1, 100, (v) => d.setBrushOpacity(v)),
      ),
      h(
        Row,
        { gap: 8, justify: "space-between" },
        h(Toggle, { checked: brushErase, onChange: (v: boolean) => d.setBrushErase(v), label: "Erase" }),
        h(
          Button,
          {
            size: "sm",
            variant: "ghost",
            disabled: !active || active.dabs.length === 0,
            onClick: () => active && clearLayer(active.id),
          },
          "Clear layer",
        ),
      ),
      armed
        ? h(
            "span",
            { style: hint },
            "Alt erases, Shift+click paints a straight line, Ctrl or Space pans and zooms, Esc when done.",
          )
        : null,
    ),
  );
}
