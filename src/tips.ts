// The tip picker's data: tips filed under their groups, and each tip's alpha
// drawn once as a small preview.

import type { BrushTipContribution } from "./safelight";

export const THUMB_SIZE = 32;

export interface TipGroup {
  group: string | undefined;
  tips: BrushTipContribution[];
}

/** Ungrouped tips first, then each group in the order it first appears. */
export function groupTips(tips: readonly BrushTipContribution[]): TipGroup[] {
  const groups: TipGroup[] = [];
  for (const tip of tips) {
    const found = groups.find((g) => g.group === tip.group);
    if (found) found.tips.push(tip);
    else groups.push({ group: tip.group, tips: [tip] });
  }
  return [...groups.filter((g) => g.group === undefined), ...groups.filter((g) => g.group !== undefined)];
}

const cache = new Map<string, string | null>();

export function clearThumbnails(): void {
  cache.clear();
}

/** The tip's alpha as a PNG data URL, light on a dark tile whatever the theme,
 *  cached per id; null where no canvas is available. */
export function tipThumbnail(tip: BrushTipContribution): string | null {
  const cached = cache.get(tip.id);
  if (cached !== undefined) return cached;
  const url = draw(tip);
  cache.set(tip.id, url);
  return url;
}

function draw(tip: BrushTipContribution): string | null {
  const { width, height, data } = tip.alpha;
  const source = document.createElement("canvas");
  const out = document.createElement("canvas");
  const sctx = source.getContext("2d");
  const octx = out.getContext("2d");
  if (!sctx || !octx || width < 1 || height < 1) return null;
  source.width = width;
  source.height = height;
  const image = sctx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    image.data[i * 4] = 235;
    image.data[i * 4 + 1] = 235;
    image.data[i * 4 + 2] = 235;
    image.data[i * 4 + 3] = data[i] ?? 0;
  }
  sctx.putImageData(image, 0, 0);
  out.width = THUMB_SIZE;
  out.height = THUMB_SIZE;
  octx.fillStyle = "#1c1c1c";
  octx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);
  const scale = THUMB_SIZE / Math.max(width, height);
  const w = width * scale;
  const h = height * scale;
  octx.imageSmoothingEnabled = true;
  octx.drawImage(source, (THUMB_SIZE - w) / 2, (THUMB_SIZE - h) / 2, w, h);
  return out.toDataURL("image/png");
}
