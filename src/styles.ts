// The panel's look, matching the Masking panel rule for rule: its add button,
// status line and Done button, brush box, list rows (sizes, hover, selected
// tint, eye, hover-revealed buttons, red delete hover) and editor. Plain CSS,
// because the app's Tailwind build never scans an extension. `:where()` drops
// every rule to zero specificity, so a stylesheet that restyles the panel
// wins over them. The `html.sl-larger-text` rules repeat core's Accessibility
// rule for small text.

import type { UITokens } from "./safelight";

const P = "safelight-paint-layers";

export const STYLESHEET_ID = `${P}.styles`;

export const cls = {
  panel: `${P}-panel`,
  create: `${P}-create`,
  head: `${P}-head`,
  hint: `${P}-hint`,
  done: `${P}-done`,
  brush: `${P}-brush`,
  erase: `${P}-erase`,
  colour: `${P}-colour`,
  muted: `${P}-muted`,
  list: `${P}-list`,
  row: `${P}-row`,
  on: `${P}-on`,
  off: `${P}-off`,
  eye: `${P}-eye`,
  hidden: `${P}-hidden`,
  name: `${P}-name`,
  rename: `${P}-rename`,
  act: `${P}-act`,
  remove: `${P}-remove`,
  reveal: `${P}-reveal`,
  editor: `${P}-editor`,
  section: `${P}-section`,
  caption: `${P}-caption`,
  reset: `${P}-reset`,
  addComponent: `${P}-add-component`,
  tips: `${P}-tips`,
  tip: `${P}-tip`,
  round: `${P}-round`,
} as const;

const tint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

export function paintLayersCss(t: UITokens): string {
  return `
:where(.${cls.panel} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${cls.create}) { display: flex; width: 100%; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.25rem; background-color: ${t.surface2}; padding: 0.375rem 0.5rem; font-size: 11px; color: ${t.textSecondary}; }
:where(.${cls.create}:hover) { color: ${t.textPrimary}; }
:where(.${cls.create}:disabled) { cursor: default; opacity: 0.4; }
:where(.${cls.head}) { display: flex; align-items: center; justify-content: space-between; }
:where(.${cls.hint}) { font-size: 10px; color: ${t.textMuted}; }
:where(.${cls.done}) { border-radius: 0.25rem; background-color: ${t.surface2}; padding: 0.125rem 0.375rem; font-size: 11px; color: ${t.textSecondary}; }
:where(.${cls.done}:hover) { color: ${t.textPrimary}; }
:where(.${cls.brush}) { border-radius: 0.25rem; background-color: ${tint(t.surface2, 50)}; padding: 0.375rem; }
:where(.${cls.brush} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${cls.erase}) { display: flex; align-items: center; gap: 0.375rem; padding: 0 0.125rem; font-size: 11px; color: ${t.textSecondary}; }
:where(.${cls.colour}) { height: 0.875rem; width: 1.5rem; flex-shrink: 0; cursor: pointer; border-radius: 0.25rem; border: 1px solid ${t.borderSubtle}; background: transparent; padding: 0; }
:where(.${cls.muted}) { color: ${t.textMuted}; }
:where(.${cls.tips}) { display: flex; flex-wrap: wrap; gap: 0.125rem; }
:where(.${cls.tip}) { display: flex; height: 2.25rem; width: 2.25rem; flex-shrink: 0; align-items: center; justify-content: center; overflow: hidden; border-radius: 0.25rem; padding: 0.125rem; }
:where(.${cls.tip}:hover) { background-color: ${t.surface2}; }
:where(.${cls.tip}.${cls.on}) { background-color: ${tint(t.accent, 20)}; }
:where(.${cls.tip} img) { height: 100%; width: 100%; border-radius: 0.125rem; object-fit: contain; }
:where(.${cls.round}) { display: block; height: 100%; width: 100%; border-radius: 0.125rem; background: radial-gradient(circle, #ebebeb 35%, rgba(235, 235, 235, 0) 68%), #1c1c1c; }
:where(.${cls.list} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${cls.row}) { display: flex; cursor: pointer; align-items: center; gap: 0.375rem; border-radius: 0.25rem; padding: 0.25rem 0.375rem; font-size: 11px; color: ${t.textSecondary}; }
:where(.${cls.row}:hover) { background-color: ${t.surface2}; }
:where(.${cls.row}.${cls.on}) { background-color: ${tint(t.accent, 20)}; color: ${t.textPrimary}; }
:where(.${cls.row}.${cls.off}) { opacity: 0.5; }
:where(.${cls.eye}) { flex-shrink: 0; border-radius: 0.25rem; padding: 0 0.125rem; color: ${t.textMuted}; }
:where(.${cls.eye}.${cls.hidden}) { color: ${tint(t.textMuted, 40)}; }
:where(.${cls.eye}:hover) { color: ${t.textPrimary}; }
:where(.${cls.rename}) { min-width: 0; flex: 1 1 0%; border-radius: 0.25rem; background-color: ${t.surface3}; padding: 0 0.25rem; font-size: 11px; color: ${t.textPrimary}; outline: none; }
:where(.${cls.name}) { flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.${cls.act}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${t.textMuted}; }
:where(.${cls.act}:hover:not(:disabled)) { color: ${t.textPrimary}; }
:where(.${cls.remove}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${t.textMuted}; }
:where(.${cls.remove}:hover) { color: ${t.labelRed}; }
:where(.${cls.reveal}) { opacity: 0; }
:where(.${cls.row}:hover .${cls.reveal}) { opacity: 1; }
:where(.${cls.row}:hover .${cls.reveal}:disabled) { cursor: default; opacity: 0.3; }
:where(.${cls.editor}) { border-top: 1px solid ${t.borderSubtle}; padding-top: 0.5rem; }
:where(.${cls.editor} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${cls.section} > :not(:last-child)) { margin-block: 0 0.375rem; }
:where(.${cls.caption}) { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${t.textMuted}; }
:where(.${cls.reset}) { border-radius: 0.25rem; padding: 0 0.25rem; font-size: 10px; color: ${t.textMuted}; }
:where(.${cls.reset}:hover) { color: ${t.textPrimary}; }
:where(.${cls.addComponent}) { display: flex; width: 100%; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.25rem; background-color: ${t.surface2}; padding: 0.25rem 0.5rem; font-size: 10px; color: ${t.textSecondary}; }
:where(.${cls.addComponent}:hover) { color: ${t.textPrimary}; }
:where(.${cls.addComponent}:disabled) { cursor: default; opacity: 0.4; }
html.sl-larger-text .${cls.hint}, html.sl-larger-text .${cls.addComponent}, html.sl-larger-text .${cls.caption}, html.sl-larger-text .${cls.reset} { font-size: 12px !important; }
html.sl-larger-text .${cls.create}, html.sl-larger-text .${cls.done}, html.sl-larger-text .${cls.erase}, html.sl-larger-text .${cls.row}, html.sl-larger-text .${cls.rename} { font-size: 13px !important; line-height: 1.45 !important; }
html.sl-larger-text .${cls.caption} { text-transform: none !important; letter-spacing: normal !important; }
`;
}
