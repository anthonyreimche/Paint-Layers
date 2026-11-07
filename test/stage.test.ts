import { describe, expect, it } from "vitest";
import { BLEND_MODES } from "../src/blend";
import { MAX_LAYERS } from "../src/layers";
import { buildStage, EXT_ID, HELPERS, INLINE_GLSL, PARAM, paramKey, STAGE_ID } from "../src/stage";
import { inlineFetches } from "./fetch-budget";

describe("stage contract", () => {
  const stage = buildStage();

  it("runs among the effects, per image, under the extension id", () => {
    expect(EXT_ID).toBe("paint-layers");
    expect(stage.id).toBe("paint-layers.composite");
    expect(stage.id).toBe(STAGE_ID);
    expect(stage.phase).toBe("effects");
    expect(stage.presetScope).toBe("per-image");
  });

  it("declares a space so the photo's full range reaches it and passes on unclipped", () => {
    expect(stage.space).toEqual({ encoding: "perceptual" });
  });

  it("reads one paint texture of layers", () => {
    expect(stage.textures).toEqual([{ key: "layers", kind: "paint" }]);
    expect(PARAM.layers).toBe("paint-layers.composite.layers");
  });

  it("declares a mode, opacity and visibility per layer slot", () => {
    expect(MAX_LAYERS).toBe(4);
    expect(stage.uniforms.map((u) => [u.key, u.glslType, u.default])).toEqual(
      [
        ...[0, 1, 2, 3].flatMap((i) => [
          [`mode${i}`, "int", 0],
          [`opacity${i}`, "float", 1],
          [`visible${i}`, "bool", true],
        ]),
        ["highlight", "int", -1],
        ["highlightStrength", "float", 0],
      ],
    );
    expect(paramKey("opacity", 2)).toBe("paint-layers.composite.opacity2");
  });

  it("has no passes and isn't maskable", () => {
    expect(stage.passes).toBeUndefined();
    expect("mask" in stage).toBe(false);
  });
});

describe("GLSL", () => {
  it("tints the highlighted layer's coverage last, in the masks' hover colour", () => {
    const tint = "if (highlight >= 0) c = mix(c, vec3(0.9, 0.25, 0.25), layers(highlight, srcUv).a * highlightStrength);";
    expect(INLINE_GLSL.endsWith(tint)).toBe(true);
    expect(PARAM.highlight).toBe("paint-layers.composite.highlight");
    expect(PARAM.highlightStrength).toBe("paint-layers.composite.highlightStrength");
  });

  it("composites the four layers bottom to top at source-UV, each behind its visibility", () => {
    const order = [0, 1, 2, 3].map((i) =>
      INLINE_GLSL.indexOf(`if (visible${i}) c = plComposite(c, layers(${i}, srcUv), mode${i}, opacity${i});`),
    );
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("clamps the base only where a layer covers, and mixes by coverage times opacity", () => {
    expect(HELPERS).toContain("float a = paint.a * clamp(opacity, 0.0, 1.0);");
    expect(HELPERS).toContain("if (a <= 0.0) return c;");
    expect(HELPERS).toContain("return mix(c, plBlend(mode, clamp(c, 0.0, 1.0), paint.rgb), a);");
    expect(INLINE_GLSL).not.toContain("clamp");
  });

  it("branches on every blend mode the panel offers, Normal as the fallback", () => {
    for (let m = 1; m < BLEND_MODES.length; m++) {
      expect(HELPERS).toContain(`if (mode == ${m}) `);
    }
    expect(HELPERS).not.toContain(`if (mode == 0) `);
    expect(HELPERS).not.toContain(`if (mode == ${BLEND_MODES.length}) `);
  });

  it("measures luminosity with the W3C weights", () => {
    expect(HELPERS).toContain("dot(c, vec3(0.3, 0.59, 0.11))");
  });

  it("names nothing that the host rewrites or provides", () => {
    const helperNames = [...HELPERS.matchAll(/\b(?:float|vec3|vec4)\s+(\w+)\s*\(/g)].map((m) => m[1]);
    expect(helperNames.length).toBeGreaterThan(0);
    for (const name of helperNames) {
      expect(name.startsWith("pl")).toBe(true);
    }
    expect(HELPERS).not.toMatch(/\blayers\b/);
    expect(HELPERS).not.toMatch(/\b(mode|opacity|visible)[0-3]\b/);
  });

  it("is version-independent", () => {
    expect(INLINE_GLSL).not.toContain("#");
    expect(HELPERS).not.toContain("#");
  });
});

describe("GPU cost", () => {
  it("fetches each layer's tile once per pixel, and the hovered layer's while one is tinted", () => {
    expect(inlineFetches(buildStage())).toBe(5);
    const tinted = INLINE_GLSL.split("\n").filter((line) => line.includes("layers(highlight"));
    expect(tinted).toHaveLength(1);
    expect(tinted[0].startsWith("if (highlight >= 0)")).toBe(true);
  });
});
