import { afterEach, describe, expect, it, vi } from "vitest";
import { groupTips, tipThumbnail, clearThumbnails } from "../src/tips";
import type { BrushTipContribution } from "../src/safelight";

const tip = (id: string, group?: string): BrushTipContribution => ({
  id,
  label: id.toUpperCase(),
  alpha: { width: 2, height: 1, data: new Uint8Array([255, 0]) },
  ...(group ? { group } : {}),
});

describe("groupTips", () => {
  it("lists ungrouped tips first, then each group in the order it first appears", () => {
    const groups = groupTips([tip("a", "Clouds"), tip("b"), tip("c", "Pack"), tip("d", "Clouds")]);
    expect(groups.map((g) => [g.group, g.tips.map((t) => t.id)])).toEqual([
      [undefined, ["b"]],
      ["Clouds", ["a", "d"]],
      ["Pack", ["c"]],
    ]);
  });

  it("is empty for no tips", () => {
    expect(groupTips([])).toEqual([]);
  });
});

describe("tipThumbnail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearThumbnails();
  });

  function stubDocument() {
    const made: string[] = [];
    vi.stubGlobal("document", {
      createElement: () => {
        const ctx = {
          fillStyle: "",
          fillRect: vi.fn(),
          createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
          putImageData: vi.fn(),
          drawImage: vi.fn(),
          imageSmoothingEnabled: false,
        };
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ctx,
          toDataURL: () => {
            made.push("url");
            return `data:image/png;base64,${made.length}`;
          },
        };
        return canvas;
      },
    });
    return made;
  }

  it("draws a tip once and serves the cached data URL after that", () => {
    const made = stubDocument();
    const first = tipThumbnail(tip("a"));
    expect(first).toMatch(/^data:image\/png/);
    expect(tipThumbnail(tip("a"))).toBe(first);
    expect(made).toHaveLength(1);
    expect(tipThumbnail(tip("b"))).not.toBe(first);
    expect(made).toHaveLength(2);
  });

  it("gives nothing where there is no canvas", () => {
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => null }) });
    expect(tipThumbnail(tip("a"))).toBeNull();
  });
});
