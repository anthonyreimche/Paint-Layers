// The Develop panel, laid out and styled like the Masking panel (styles.ts):
// the add button, a status line with Paint/Done, the brush while it is on,
// the layer list (top layer first, as it stacks; double-click a name to
// rename), and the chosen layer's blend mode and opacity.

import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";
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
import { dynamicsOf, store } from "./store";
import { cls } from "./styles";
import { highlightLayer } from "./highlight";
import { groupTips, tipThumbnail } from "./tips";
import type { BrushTipContribution } from "./safelight";

const MODE_OPTIONS = BLEND_MODES.map((m, i) => ({ value: String(i), label: m.label }));

export function PaintPanel() {
  const a = api();
  const { Panel, Slider } = a.components;
  const { Select, tokens } = a.ui;
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
  const tipId = store()((s) => s.tip);
  const brushSpacing = store()((s) => s.brushSpacing);
  const brushScatter = store()((s) => s.brushScatter);
  const brushCount = store()((s) => s.brushCount);
  const brushSizeJitter = store()((s) => s.brushSizeJitter);
  const brushAngle = store()((s) => s.brushAngle);
  const brushAngleJitter = store()((s) => s.brushAngleJitter);
  const brushFollowStroke = store()((s) => s.brushFollowStroke);
  const brushFlowJitter = store()((s) => s.brushFlowJitter);
  const tips = a.develop.useBrushTips();
  const [renaming, setRenaming] = react.useState<{ id: string; value: string } | null>(null);
  const held = a.develop.useCanvasToolHeld();

  // Another tool took the canvas (crop, masks, heal): the brush goes off.
  react.useEffect(() => {
    if (armed && !held) store().getState().setArmed(false);
  }, [armed, held]);

  const layers = readLayers(paramBag);
  const active = resolveActive(layers, activeId);

  // The hovered row's layer is tinted on the image, as a hovered mask is;
  // its slot follows the layer when the list changes under the pointer.
  const [hoveredId, setHoveredId] = react.useState<string | null>(null);
  const hoveredSlot = hoveredId ? layers.findIndex((l) => l.id === hoveredId) : -1;
  react.useEffect(() => {
    highlightLayer(hoveredSlot >= 0 ? hoveredSlot : null);
  }, [hoveredSlot]);
  react.useEffect(() => () => highlightLayer(null), []);

  const select = (id: string) => store().getState().setActiveLayer(id);

  const add = () => {
    const id = addNewLayer();
    if (id) select(id);
  };

  const on = (yes: boolean) => (yes ? ` ${cls.on}` : "");
  // A button inside a row acts without also choosing the row's layer.
  const inRow = (act: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    act();
  };

  const finishRename = () => {
    if (!renaming) return;
    const name = renaming.value.trim();
    const layer = layers.find((l) => l.id === renaming.id);
    setRenaming(null);
    if (layer && name && name !== layer.name) setLayer(layer.id, { name }, "Rename Paint Layer");
  };

  const layerName = (layer: Layer) =>
    renaming?.id === layer.id
      ? h("input", {
          autoFocus: true,
          value: renaming.value,
          maxLength: 40,
          "aria-label": "Layer name",
          className: cls.rename,
          onClick: (e: MouseEvent<HTMLInputElement>) => e.stopPropagation(),
          onChange: (e: ChangeEvent<HTMLInputElement>) => setRenaming({ id: layer.id, value: e.currentTarget.value }),
          onBlur: finishRename,
          onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setRenaming(null);
          },
        })
      : h(
          "span",
          {
            className: cls.name,
            title: "Double-click to rename",
            onDoubleClick: (e: MouseEvent<HTMLSpanElement>) => {
              e.stopPropagation();
              setRenaming({ id: layer.id, value: layer.name });
            },
          },
          layer.name || "Untitled",
          h("span", { className: cls.muted }, ` (${BLEND_MODES[layer.mode]?.label ?? "Normal"})`),
        );

  const layerRow = (layer: Layer, slot: number) =>
    h(
      "div",
      {
        key: layer.id,
        title: "Paint on this layer",
        className: cls.row + on(layer.id === active?.id) + (layer.visible ? "" : ` ${cls.off}`),
        onClick: () => select(layer.id),
        onMouseEnter: () => setHoveredId(layer.id),
        onMouseLeave: () => setHoveredId(null),
      },
      h(
        "button",
        {
          type: "button",
          title: layer.visible ? "Hide" : "Show",
          "aria-label": layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`,
          "aria-pressed": layer.visible,
          className: cls.eye + (layer.visible ? "" : ` ${cls.hidden}`),
          // Hovering the visibility toggle shouldn't tint the layer.
          onMouseEnter: () => setHoveredId(null),
          onMouseLeave: () => setHoveredId(layer.id),
          onClick: inRow(() =>
            setLayer(layer.id, { visible: !layer.visible }, layer.visible ? "Hide Paint Layer" : "Show Paint Layer"),
          ),
        },
        layer.visible ? "◉" : "○",
      ),
      layerName(layer),
      h(
        "button",
        {
          type: "button",
          title: "Move up",
          "aria-label": `Move ${layer.name} up`,
          className: `${cls.act} ${cls.reveal}`,
          disabled: slot === layers.length - 1,
          onClick: inRow(() => shiftLayer(layer.id, 1)),
        },
        "↑",
      ),
      h(
        "button",
        {
          type: "button",
          title: "Move down",
          "aria-label": `Move ${layer.name} down`,
          className: `${cls.act} ${cls.reveal}`,
          disabled: slot === 0,
          onClick: inRow(() => shiftLayer(layer.id, -1)),
        },
        "↓",
      ),
      h(
        "button",
        {
          type: "button",
          title: "Delete layer",
          "aria-label": `Delete ${layer.name}`,
          className: `${cls.remove} ${cls.reveal}`,
          onClick: inRow(() => removeLayer(layer.id)),
        },
        "×",
      ),
    );

  const layerEditor = (layer: Layer) =>
    h(
      "div",
      { className: cls.editor },
      h(
        "div",
        { className: cls.section },
        h(
          "div",
          { className: cls.head },
          h("span", { className: cls.caption }, "Blending"),
          h(
            "button",
            {
              type: "button",
              title: "Reset this layer's blend mode and opacity",
              className: cls.reset,
              onClick: () => setLayer(layer.id, { mode: 0, opacity: 1 }, "Reset Paint Layer"),
            },
            "Reset",
          ),
        ),
        h(Select, {
          value: String(layer.mode),
          options: MODE_OPTIONS,
          ariaLabel: "Blend mode",
          onChange: (v: string) => setLayer(layer.id, { mode: Number(v) }, "Paint Layer Blend Mode"),
        }),
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
        h(
          "button",
          {
            type: "button",
            className: cls.addComponent,
            disabled: layer.dabs.length === 0,
            onClick: () => clearLayer(layer.id),
          },
          "Clear Layer",
        ),
      ),
    );

  // Brush settings, shown as percentages like the masking panel does; `scale`
  // is the UI unit per stored unit (degrees for an angle in radians, 1 for a count).
  const brushSlider = (
    label: string,
    value: number,
    min: number,
    defaultValue: number,
    set: (v: number) => void,
    max = 100,
    scale = 100,
  ) =>
    h(Slider, {
      key: label,
      label,
      value: Math.round(value * scale),
      min,
      max,
      step: 1,
      defaultValue,
      onChange: (v: number) => {
        set(v / scale);
        store().getState().setBrushPreview(true);
      },
      onCommit: () => store().getState().setBrushPreview(false),
    });

  // A tip that is no longer registered (its extension is off) shows as Round.
  const pickedTip = tips.find((t) => t.id === tipId) ?? null;
  const tipDefaults = dynamicsOf(pickedTip?.brush);
  const dynamics = (patch: Parameters<typeof d.setBrushDynamics>[0]) => d.setBrushDynamics(patch);

  const tipButton = (tip: BrushTipContribution) => {
    const url = tipThumbnail(tip);
    return h(
      "button",
      {
        key: tip.id,
        type: "button",
        title: tip.label,
        "aria-label": tip.label,
        "aria-pressed": tip.id === pickedTip?.id,
        className: cls.tip + on(tip.id === pickedTip?.id),
        onClick: () => d.pickTip(tip.id, tip.brush),
      },
      url ? h("img", { src: url, alt: "", draggable: false }) : null,
    );
  };

  const tipPicker = () =>
    h(
      "div",
      { className: cls.section },
      h("span", { className: cls.caption }, "Brush"),
      h(
        "div",
        { className: cls.tips },
        h(
          "button",
          {
            type: "button",
            title: "Round",
            "aria-label": "Round",
            "aria-pressed": pickedTip === null,
            className: cls.tip + on(pickedTip === null),
            onClick: () => d.pickTip(null),
          },
          h("span", { className: cls.round }),
        ),
        groupTips(tips).flatMap((g) => (g.group === undefined ? g.tips.map(tipButton) : [])),
      ),
      ...groupTips(tips)
        .filter((g) => g.group !== undefined)
        .map((g) =>
          h(
            "div",
            { key: g.group, className: cls.section },
            h("span", { className: cls.caption }, g.group),
            h("div", { className: cls.tips }, g.tips.map(tipButton)),
          ),
        ),
      tips.length === 0
        ? h("span", { className: cls.hint }, "Install Texture Brushes for fog, cloud and other brushes.")
        : null,
    );

  const d = store().getState();
  const topFirst = layers.map((layer, slot) => ({ layer, slot })).reverse();
  const atCap = layers.length >= MAX_LAYERS;
  const status = armed
    ? active
      ? `${brushErase ? "Erase from" : "Paint on"} ${active.name || "Untitled"}`
      : "Paint to add a layer"
    : `${layers.length}/${MAX_LAYERS} layers`;

  return h(
    Panel,
    { title: "Paint Layers", defaultOpen: true },
    h(
      "div",
      { className: cls.panel },
      h(
        "button",
        {
          type: "button",
          className: cls.create,
          disabled: atCap,
          title: atCap ? `Layer limit reached (${MAX_LAYERS})` : undefined,
          onClick: add,
        },
        "+ Add Layer",
      ),
      h(
        "div",
        { className: cls.head },
        h("span", { className: cls.hint }, status),
        h(
          "button",
          { type: "button", className: cls.done, onClick: () => d.toggleArmed() },
          armed ? "Done" : "Paint",
        ),
      ),
      armed
        ? h(
            "div",
            { className: cls.brush },
            h(
              "label",
              { className: cls.erase },
              h("input", {
                type: "color",
                value: color,
                "aria-label": "Brush colour",
                className: cls.colour,
                onChange: (e: ChangeEvent<HTMLInputElement>) => d.setColor(e.currentTarget.value),
              }),
              "Colour",
            ),
            tipPicker(),
            brushSlider("Size", brushSize, 1, 8, (v) => d.setBrushSize(v), 50),
            pickedTip ? null : brushSlider("Feather", brushFeather, 0, 50, (v) => d.setBrushFeather(v)),
            brushSlider("Opacity", brushOpacity, 1, 100, (v) => d.setBrushOpacity(v)),
            brushSlider("Flow", brushFlow, 1, 100, (v) => d.setBrushFlow(v)),
            pickedTip
              ? [
                  brushSlider("Spacing", brushSpacing, 1, Math.round(tipDefaults.brushSpacing * 100), (v) => dynamics({ brushSpacing: v }), 200),
                  brushSlider("Scatter", brushScatter, 0, Math.round(tipDefaults.brushScatter * 100), (v) => dynamics({ brushScatter: v }), 200),
                  brushSlider("Count", brushCount, 1, tipDefaults.brushCount, (v) => dynamics({ brushCount: v }), 16, 1),
                  brushSlider("Size jitter", brushSizeJitter, 0, Math.round(tipDefaults.brushSizeJitter * 100), (v) => dynamics({ brushSizeJitter: v })),
                  brushSlider("Angle", brushAngle, -180, Math.round((tipDefaults.brushAngle * 180) / Math.PI), (v) => dynamics({ brushAngle: v }), 180, 180 / Math.PI),
                  brushSlider("Angle jitter", brushAngleJitter, 0, Math.round(tipDefaults.brushAngleJitter * 100), (v) => dynamics({ brushAngleJitter: v })),
                  h(
                    "label",
                    { key: "Follow stroke", className: cls.erase },
                    h("input", {
                      type: "checkbox",
                      checked: brushFollowStroke,
                      onChange: (e: ChangeEvent<HTMLInputElement>) => dynamics({ brushFollowStroke: e.currentTarget.checked }),
                      style: { accentColor: tokens.sliderFill },
                    }),
                    "Follow stroke",
                  ),
                  brushSlider("Flow jitter", brushFlowJitter, 0, Math.round(tipDefaults.brushFlowJitter * 100), (v) => dynamics({ brushFlowJitter: v })),
                ]
              : null,
            h(
              "label",
              { className: cls.erase },
              h("input", {
                type: "checkbox",
                checked: brushErase,
                onChange: (e: ChangeEvent<HTMLInputElement>) => d.setBrushErase(e.currentTarget.checked),
                style: { accentColor: tokens.sliderFill },
              }),
              "Erase",
              h("span", { className: cls.muted }, "· Alt erase · [ ] size · ⇧ feather · , . opacity · ⇧, ⇧. flow"),
            ),
          )
        : null,
      layers.length > 0
        ? h("div", { className: cls.list }, topFirst.map(({ layer, slot }) => layerRow(layer, slot)))
        : null,
      active ? layerEditor(active) : null,
    ),
  );
}
