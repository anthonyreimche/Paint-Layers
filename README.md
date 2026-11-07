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
| Size, Feather, Flow, Opacity, Erase | Safelight's shared brush settings. |
| Clear layer | Removes the chosen layer's paint and keeps the layer. |

While painting, the brush shares Safelight's brush shortcuts: `[` `]` size,
`Shift+[` `]` feather, `,` `.` opacity, `Shift+,` `.` flow, Alt to erase,
Shift+click for a straight line, Ctrl/⌘ or Space to pan and zoom, Esc when
done. Each stroke is one undo step; the layers are saved with the photo.

## How it works

Safelight bakes the layers into one texture per render, a tile per layer
holding its colour and coverage. The stage reads the four tiles (four texture
fetches per pixel) and composites them bottom to top:
`c = mix(c, blend(mode, clamp(c, 0, 1), colour), coverage × opacity)`, with
the blend modes as the W3C Compositing and Blending spec defines them. The
photo is clamped to 0–1 only where a layer covers it, so unpainted pixels keep
their full range.

## Requirements

Safelight with paint textures for extension stages (the `paint` texture kind).

## Build

```sh
npm install --legacy-peer-deps
npm run build      # → dist/index.js
npm test           # blend maths, layer model, brush, stage contract, fetch budget
npm run test:gpu   # the stage on the real renderer (needs a Safelight checkout)
```

## Licence

MIT
