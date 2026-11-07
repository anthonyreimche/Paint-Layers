// Static per-pixel texture-fetch count of a stage's inline program: loops with
// literal bounds multiply the fetches inside them, helper calls are expanded,
// every branch is counted (an upper bound), a call to one of the stage's
// sampled texture keys counts as one fetch, and a loop form the analyzer does
// not understand throws instead of being skipped. Correctness tests on a CPU
// transcription say nothing about what the GPU executes per pixel.

import type { ProcessingStageContribution } from "../src/safelight";

type Memo = Map<string, number | null>;

const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function closingBrace(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return i;
  }
  throw new Error("unbalanced braces");
}

function collectFunctions(src: string): Map<string, string> {
  const fns = new Map<string, string>();
  const def = /\b(?:float|int|bool|vec[234]|ivec[234]|mat[34]|void)\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = def.exec(src))) {
    const open = m.index + m[0].length - 1;
    const close = closingBrace(src, open);
    fns.set(m[1], src.slice(open + 1, close));
    def.lastIndex = close;
  }
  return fns;
}

const LOOP =
  /\bfor\s*\(\s*int\s+(\w+)\s*=\s*(-?\d+)\s*;\s*\1\s*(<=|<)\s*(-?\d+)\s*;\s*\1\s*(?:\+\+|\+=\s*1)\s*\)\s*\{/g;

interface Program {
  fns: Map<string, string>;
  samplers: readonly string[];
  memo: Memo;
}

const calls = (text: string, name: string): number =>
  (text.match(new RegExp(`\\b${name}\\s*\\(`, "g")) ?? []).length;

function functionFetches(name: string, p: Program): number {
  const seen = p.memo.get(name);
  if (seen === null) throw new Error(`recursive helper ${name}`);
  if (seen !== undefined) return seen;
  p.memo.set(name, null);
  const v = blockFetches(p.fns.get(name) ?? "", p);
  p.memo.set(name, v);
  return v;
}

function flatFetches(text: string, p: Program): number {
  if (/\b(for|while|do)\b/.test(text)) {
    throw new Error(`unrecognized loop form: ${text.trim().slice(0, 80)}`);
  }
  let n = calls(text, "texture");
  for (const s of p.samplers) n += calls(text, s);
  for (const name of p.fns.keys()) {
    const c = calls(text, name);
    if (c) n += c * functionFetches(name, p);
  }
  return n;
}

function blockFetches(block: string, p: Program): number {
  let total = 0;
  let cursor = 0;
  const loop = new RegExp(LOOP.source, "g");
  let m: RegExpExecArray | null;
  while ((m = loop.exec(block))) {
    const open = m.index + m[0].length - 1;
    const close = closingBrace(block, open);
    total += flatFetches(block.slice(cursor, m.index), p);
    const from = Number(m[2]);
    const to = Number(m[4]);
    const trips = Math.max(0, m[3] === "<=" ? to - from + 1 : to - from);
    total += trips * blockFetches(block.slice(open + 1, close), p);
    cursor = close + 1;
    loop.lastIndex = cursor;
  }
  return total + flatFetches(block.slice(cursor), p);
}

/** Fetches per pixel of the stage's inline glsl, its helpers expanded. */
export function inlineFetches(stage: ProcessingStageContribution): number {
  const samplers = (stage.textures ?? [])
    .filter((t) => t.kind === "paint" || t.kind === "coverage")
    .map((t) => t.key);
  const fns = collectFunctions(stripComments(stage.helpers ?? ""));
  return blockFetches(stripComments(stage.glsl), { fns, samplers, memo: new Map() });
}
