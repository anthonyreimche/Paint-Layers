import { describe, expect, it } from "vitest";
import { brushStep } from "../src/keys";
import type { BrushSettings } from "../src/store";

const brush: BrushSettings = {
  brushSize: 0.5,
  brushFeather: 0.97,
  brushOpacity: 0.05,
  brushFlow: 1,
  brushErase: false,
};

describe("brushStep", () => {
  it("steps the brush by core's increments and clamps at core's limits", () => {
    expect(brushStep("brush.larger", brush)).toEqual({ brushSize: 0.5 });
    expect(brushStep("brush.smaller", brush)).toEqual({ brushSize: 0.49 });
    expect(brushStep("brush.featherUp", brush)).toEqual({ brushFeather: 1 });
    expect(brushStep("brush.opacityDown", brush)).toEqual({ brushOpacity: 0.01 });
    expect(brushStep("brush.flowUp", brush)).toEqual({ brushFlow: 1 });
    expect(brushStep("brush.flowDown", brush)).toEqual({ brushFlow: 0.9 });
  });

  it("leaves actions that aren't brush steps to core", () => {
    expect(brushStep("brush.unknown", brush)).toBeNull();
    expect(brushStep("mask.delete", brush)).toBeNull();
  });
});
