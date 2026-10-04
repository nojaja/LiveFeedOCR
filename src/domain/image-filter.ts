import type { Detection, Filters } from './region.ts';

export interface GraySample { gray: Uint8Array; w: number; h: number }

export interface AccumState {
  w: number; h: number; n: number; mode: string; frames: Uint8Array[];
}

export interface AccumHolder { accum: AccumState | null }

export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function toGray(px: ArrayLike<number>, w: number, h: number): GraySample {
  const gray = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    gray[j] = luma(px[i], px[i + 1], px[i + 2]) | 0;
  }
  return { gray, w, h };
}

// RGBAのピクセル配列にフィルタ設定をその場で適用する
export function filterImageData(data: Uint8ClampedArray | Uint8Array, f: Filters): void {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (f.gray || f.bin) {
      r = g = b = luma(r, g, b);
    }
    if (f.bin) {
      r = g = b = r >= f.thr ? 255 : 0;
    }
    if (f.inv) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

// 直近Nフレームの2値画像(0/255)を重ねて1枚にする
//  or : 1枚でも白なら白（加算）
//  and: 全フレームで白のときだけ白（減算）
export function accumulate(holder: AccumHolder, bits: Uint8Array, w: number, h: number, n: number, mode: string): Uint8Array {
  let a = holder.accum;
  if (!a || a.w !== w || a.h !== h || a.n !== n || a.mode !== mode) {
    a = holder.accum = { w, h, n, mode, frames: [] };
  }
  a.frames.push(bits);
  while (a.frames.length > n) a.frames.shift();

  const len = w * h;
  const out = new Uint8Array(len);
  if (mode === 'or') {
    for (const f of a.frames) {
      for (let i = 0; i < len; i++) if (f[i]) out[i] = 255;
    }
  } else {
    out.fill(255);
    for (const f of a.frames) {
      for (let i = 0; i < len; i++) if (!f[i]) out[i] = 0;
    }
  }
  return out;
}

export function thresholdBits(gray: ArrayLike<number>, thr: number): Uint8Array {
  const bits = new Uint8Array(gray.length);
  for (let i = 0; i < bits.length; i++) bits[i] = gray[i] >= thr ? 255 : 0;
  return bits;
}

// ビット加算/減算モード：二値化 → 重ね合わせ → 結果でピクセルを置き換える
export function accumulateImage(
  data: Uint8ClampedArray | Uint8Array, w: number, h: number,
  f: Filters, d: Pick<Detection, 'accumN' | 'accumMode'>, holder: AccumHolder,
): void {
  const n = w * h;
  const bits = new Uint8Array(n);
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    bits[j] = luma(data[i], data[i + 1], data[i + 2]) >= f.thr ? 255 : 0;
  }
  const out = accumulate(holder, bits, w, h, d.accumN, d.accumMode);
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    let v = out[j];
    if (f.inv) v = 255 - v;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
}

// 範囲の検出モードに応じた前処理を適用する
export function applyRegionFilter(
  data: Uint8ClampedArray | Uint8Array, w: number, h: number,
  f: Filters, d: Detection, holder: AccumHolder,
): void {
  if (d.mode === 'accum') accumulateImage(data, w, h, f, d, holder);
  else filterImageData(data, f);
}
