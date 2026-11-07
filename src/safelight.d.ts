// The slice of Safelight's extension API this extension touches, mirrored from
// the app's src/extensions/api/contributions.ts, api/components.ts,
// api/scoped-api.ts and src/state/develop-store.ts. Extensions are standalone
// bundles, so the host's source is not on the type path; React types come from
// @types/react (dev only).

import type { ComponentType, CSSProperties, ReactNode } from "react";

/** One freehand brush dab in source-UV; radius in image-height units. */
export interface BrushDab {
  x: number;
  y: number;
  radius: number;
  erase: boolean;
  feather: number;
  opacity?: number;
  flow?: number;
  /** First dab of a pointer stroke: opacity caps each stroke on its own. */
  strokeStart?: boolean;
}

/** A brush dab that lays colour: `color` is display-encoded sRGB, 0 to 1. A
 *  change of colour starts a new stroke, as `strokeStart` does. */
export interface PaintDab extends BrushDab {
  color: [number, number, number];
}

/** One layer of a paint texture, in the order the layers bake: the first is
 *  layer 0. Other fields an extension keeps on it are left alone. */
export interface PaintLayer {
  id: string;
  dabs: PaintDab[];
}

export interface StoreApi<T> {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState(): T;
  setState(partial: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(listener: (state: T, prev: T) => void): () => void;
}

export type StateCreator<T> = (
  set: (partial: Partial<T> | ((s: T) => Partial<T>)) => void,
  get: () => T,
) => T;

export interface DevelopStoreState {
  photoId: string | null;
  /** Extension stage params by qualified key. Values are whatever the owning
   *  stage wrote and come back from sidecar JSON — a runtime boundary. */
  paramBag: Record<string, unknown>;
  setDynParam(key: string, value: unknown): void;
  setDynParams(patch: Record<string, unknown>): void;
  commitEdit(label: string): Promise<void>;
}

export interface UIStoreState {
  activeModule: "library" | "develop";
}

export interface AppSettings {
  /** Interface scale — the <body> CSS zoom that client-px coordinates must be
   *  divided by to reach layout px. */
  uiScale: number;
}

export interface OverlayRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OverlayPoint {
  x: number;
  y: number;
}

export interface DevelopOverlayState {
  rect: OverlayRect | null;
  imageRect: OverlayRect | null;
  nonce: number;
  toScreen: ((u: number, v: number) => OverlayPoint) | null;
  toImage: ((x: number, y: number) => OverlayPoint) | null;
  radiusToScreen: ((r: number) => number) | null;
  radiusToImage: ((px: number) => number) | null;
}

export type GlslType = "float" | "int" | "bool" | "vec2" | "vec3" | "vec4" | "sampler2D";

export interface UniformDeclaration {
  key: string;
  glslType: GlslType;
  default: number | number[] | boolean;
  range?: { min: number; max: number; step?: number };
  label?: string;
}

export interface StagePass {
  glsl: string;
  helpers?: string;
  iterations?: number;
  uniforms?: UniformDeclaration[];
}

export type ProcessingPhase =
  | "geometry"
  | "decode"
  | "noise-reduction"
  | "scene-linear"
  | "tone-map"
  | "display-adjust"
  | "effects"
  | "output-encode";

export interface TextureRequirement {
  key: string;
  /** "paint": the photo's paramBag value at "{stageId}.{key}" is a
   *  PaintLayer[]; the stage's inline glsl and helpers read it as
   *  `vec4 key(int layer, vec2 uv)` — the layer's straight colour (rgb,
   *  display-encoded) and coverage (a) at source-UV, vec4(0) for a layer that
   *  isn't painted. One per stage. */
  kind: "lut" | "coverage" | "dynamic" | "paint";
}

/** The values a processing stage receives and hands back. */
export interface StageSpace {
  encoding: "linear" | "perceptual";
  primaries?: "rec709" | "rec2020";
}

export interface ProcessingStageContribution {
  id: string;
  name: string;
  phase: ProcessingPhase;
  priority?: number;
  glsl: string;
  helpers?: string;
  uniforms: UniformDeclaration[];
  passes?: StagePass[];
  textures?: TextureRequirement[];
  presetScope?: "global" | "per-image";
  space?: StageSpace;
}

export interface SlotContribution {
  id: string;
  slot:
    | "develop-canvas-overlay"
    | "develop-toolbar"
    | "develop-detail"
    | "library-toolbar"
    | "library-subbar";
  component: ComponentType;
  order?: number;
}

export interface PanelContribution {
  id: string;
  title: string;
  component: ComponentType;
  defaultDock?: {
    module: "library" | "develop";
    direction: "left" | "right" | "bottom";
    order?: number;
    width?: number;
    height?: number;
  };
  onReset?: () => void;
}

export interface CursorContribution {
  id: string;
  css?: string;
  image?: string;
  hotspotX?: number;
  hotspotY?: number;
  fallback?: string;
}

export interface SliderProps {
  label: string;
  value: number;
  onChange(value: number): void;
  onCommit?(): void;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  hideValue?: boolean;
  compact?: boolean;
}

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  active?: boolean;
  full?: boolean;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
  style?: CSSProperties;
  onClick?(): void;
  children?: ReactNode;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange(value: string): void;
  options?: SelectOption[];
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
}

export interface TextInputProps {
  value: string;
  onChange(value: string): void;
  onBlur?(): void;
  disabled?: boolean;
  maxLength?: number;
  "aria-label"?: string;
}

export interface ToggleProps {
  checked: boolean;
  onChange(checked: boolean): void;
  label?: ReactNode;
  ariaLabel?: string;
}

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
}

export interface SectionProps {
  title: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
}

export interface RowProps {
  children?: ReactNode;
  gap?: number;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean;
  style?: CSSProperties;
}

export interface StackProps {
  children?: ReactNode;
  gap?: number;
  style?: CSSProperties;
}

/** The theme CSS-variable strings for inline styles. */
export interface UITokens {
  readonly surface2: "var(--color-surface-2)";
  readonly surface3: "var(--color-surface-3)";
  readonly border: "var(--color-border)";
  readonly borderSubtle: "var(--color-border-subtle)";
  readonly textPrimary: "var(--color-text-primary)";
  readonly textSecondary: "var(--color-text-secondary)";
  readonly textMuted: "var(--color-text-muted)";
  readonly accent: "var(--color-accent)";
}

export interface UiKit {
  Button: ComponentType<ButtonProps>;
  Select: ComponentType<SelectProps>;
  TextInput: ComponentType<TextInputProps>;
  Toggle: ComponentType<ToggleProps>;
  Field: ComponentType<FieldProps>;
  Section: ComponentType<SectionProps>;
  Row: ComponentType<RowProps>;
  Stack: ComponentType<StackProps>;
  tokens: UITokens;
}

/** An extension's on-image tool that takes the canvas over while it is held. */
export interface CanvasTool {
  overlay: ComponentType<{ rect: OverlayRect }>;
  /** Whether zoom and pan still reach the canvas under the overlay. */
  zoomable?: boolean;
  /** Escape was pressed: core lets the tool go after this. */
  onEscape?(): void;
  /** A shortcut's action (keybinding id) pressed while the tool is held:
   *  whether the tool took it. */
  onAction?(action: string): boolean;
  /** Whether the tool would take `action` now, without acting. */
  wants?(action: string): boolean;
}

export interface SafelightAPI {
  version: 1;
  extensionId: string;
  react: typeof import("react");
  registerProcessingStage(c: ProcessingStageContribution): void;
  unregisterProcessingStage(id: string): void;
  registerPanel(c: PanelContribution): void;
  registerSlot(c: SlotContribution): void;
  components: { Slider: ComponentType<SliderProps> };
  ui: UiKit;
  stores: {
    create<T>(init: StateCreator<T>): StoreApi<T>;
    useDevelopStore: StoreApi<DevelopStoreState>;
    useUIStore: StoreApi<UIStoreState>;
    useSettings: StoreApi<AppSettings>;
  };
  develop: {
    useDevelopOverlay(): DevelopOverlayState;
    /** Hold the canvas with this tool, or let it go (null). One extension
     *  holds it at a time: the last to set it. */
    setCanvasTool(tool: CanvasTool | null): void;
    /** React hook: whether this extension holds the canvas tool. */
    useCanvasToolHeld(): boolean;
    setCanvasCursor(
      cursor: string | CursorContribution | null,
      opts?: { priority?: number },
    ): () => void;
  };
}
