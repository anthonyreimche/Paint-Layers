# Paint Layers for Safelight

Paint brush strokes in any colour onto up to four layers that sit over the
photo. Each layer has a blend mode and an opacity, so a layer can dodge and
burn (Soft Light, Overlay), tint (Colour, Hue), darken (Multiply) or simply
lay paint (Normal).

It registers one GPU processing stage that runs among the effects, after the
photo's own edits, a **Develop ▸ Paint Layers** panel, and a canvas brush.

## Controls

| Control | Effect |
| --- | --- |
| Layers | Up to four, top layer first. Click a layer's name to paint on it; the switch shows or hides it; ↑ ↓ reorder; × deletes. |
| Name, Blend mode, Opacity | The chosen layer's. The blend modes are Normal, Multiply, Screen, Overlay, Darken, Lighten, Colour Dodge, Colour Burn, Hard Light, Soft Light, Difference, Exclusion, Hue, Saturation, Colour and Luminosity. |
| Paint | Turns the brush on. The first stroke on a photo without layers adds one. |
| Colour | The brush colour. Each stroke keeps the colour it was painted with. |
| Brush | Round, or any textured brush tip another extension has registered (fog, clouds, imported brushes), filed under the tip's group. Picking a tip loads the settings it was made for. With none registered, only Round shows. |
| Size, Feather, Flow, Opacity, Erase | The brush settings. Feather is hidden for a textured tip, which has none. |
| Spacing, Scatter, Count | For a textured tip: the gap between stamps and how far they land off the stroke (both as a share of the brush diameter), and how many are laid at each step. |
| Size jitter, Angle, Angle jitter, Follow stroke, Flow jitter | For a textured tip: how much each stamp shrinks at random, the tip's turn, how far it turns at random (100% is a full turn either way), whether it turns along the stroke, and how much each stamp thins at random. Double-click a slider to return it to the tip's own value. |
| Clear layer | Removes the chosen layer's paint and keeps the layer. |

While painting, the brush shares Safelight's brush shortcuts: `[` `]` size,
`Shift+[` `]` feather, `,` `.` opacity, `Shift+,` `.` flow, Alt to erase,
Shift+click for a straight line, Ctrl/⌘ or Space to pan and zoom, Esc when
done. Each stroke is one undo step; the layers are saved with the photo.

## Textured brushes

A textured tip is stamped in place of the round, feathered disc. Each stroke
names its tip, so saved strokes bake the same each session. A stroke whose tip
is no longer registered (its extension is off) bakes as the round brush until
the extension is back. The brush outline on the canvas stays a circle.

## How it works

Safelight bakes the layers into one texture per render, a tile per layer
holding its colour and coverage. The stage reads the four tiles (four texture
fetches per pixel) and composites them bottom to top:
`c = mix(c, blend(mode, clamp(c, 0, 1), colour), coverage × opacity)`, with
the blend modes as the W3C Compositing and Blending spec defines them. The
photo is clamped to 0–1 only where a layer covers it, so unpainted pixels keep
their full range.

## Requirements

Safelight 3.2.5 or later, for paint textures on extension stages (the `paint` texture kind) and the brush tip list. Textured brushes come from an extension that registers brush tips, such as Texture Brushes.

## Build

```sh
npm install --legacy-peer-deps
npm run build      # → dist/index.js
npm test           # blend maths, layer model, brush and tip dabs, stage contract, fetch budget
npm run test:gpu   # the stage on the real renderer (needs a Safelight checkout)
```

## Licence

MIT
