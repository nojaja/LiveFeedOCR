import type { Detection, Filters } from './region.ts';

export interface GraySample { gray: Uint8Array; w: number; h: number }

export interface AccumState {
  w: number; h: number; n: number; mode: string; frames: Uint8Array[];
}

export interface AccumHolder { accum: AccumState | null }

/**
 * 処理名: 輝度計算
 * 処理概要: RGB値を標準的な輝度値へ変換する。
 * 実装理由: 色情報を明るさ基準の画像処理へ利用するため。
 * @param r 赤成分
 * @param g 緑成分
 * @param b 青成分
 * @returns 輝度値
 */
export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * 処理名: グレースケール変換
 * 処理概要: RGBA配列を輝度のグレースケール画像にする。
 * 実装理由: 変化検知の画素比較を効率化するため。
 * @param px RGBA画素配列
 * @param w 画像幅
 * @param h 画像高さ
 * @returns グレースケール画像と寸法
 */
export function toGray(px: ArrayLike<number>, w: number, h: number): GraySample {
  const gray = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    gray[j] = luma(px[i], px[i + 1], px[i + 2]) | 0;
  }
  return { gray, w, h };
}

/**
 * 処理名: 画像フィルタ適用
 * 処理概要: グレースケール化、二値化、反転を画素へ適用する。
 * 実装理由: OCR入力画像を設定に合わせて前処理するため。
 * @param data RGBA画素配列
 * @param f フィルタ設定
 * @returns 戻り値なし。配列を直接更新する
 */
export function filterImageData(data: Uint8ClampedArray | Uint8Array, f: Filters): void {
  for (let i = 0; i < data.length; i += 4) {
    applyPixelFilter(data, i, f);
  }
}

/**
 * 処理名: 単一画素フィルタ
 * 処理概要: 指定画素へグレースケール、二値化、反転を適用する。
 * 実装理由: 画素処理の条件分岐を独立させるため。
 * @param data RGBA画素配列
 * @param index 対象画素の先頭インデックス
 * @param filters フィルタ設定
 * @returns 戻り値なし。配列を直接更新する
 */
function applyPixelFilter(data: Uint8ClampedArray | Uint8Array, index: number, filters: Filters): void {
  let red = data[index];
  let green = data[index + 1];
  let blue = data[index + 2];
  if (filters.gray || filters.bin) red = green = blue = luma(red, green, blue);
  if (filters.bin) red = green = blue = red >= filters.thr ? 255 : 0;
  if (filters.inv) {
    red = 255 - red;
    green = 255 - green;
    blue = 255 - blue;
  }
  data[index] = red;
  data[index + 1] = green;
  data[index + 2] = blue;
}

/**
 * 処理名: フレーム累積
 * 処理概要: 直近フレームをORまたはAND条件で合成する。
 * 実装理由: 複数フレームから文字の安定した画素を抽出するため。
 * @param holder 前回までの累積状態
 * @param bits 今回の二値画像
 * @param w 画像幅
 * @param h 画像高さ
 * @param n 保持するフレーム数
 * @param mode 合成モード
 * @returns 合成後の二値画像
 */
export function accumulate(holder: AccumHolder, bits: Uint8Array, w: number, h: number, n: number, mode: string): Uint8Array {
  let a = holder.accum;
  if (!a || a.w !== w || a.h !== h || a.n !== n || a.mode !== mode) {
    a = holder.accum = { w, h, n, mode, frames: [] };
  }
  a.frames.push(bits);
  while (a.frames.length > n) a.frames.shift();
  const len = w * h;
  const out = new Uint8Array(len);
  if (mode === 'or') combineAnyFrame(a.frames, out);
  else combineAllFrames(a.frames, out);
  return out;
}

/** OR合成で、いずれかのフレームにある白画素を出力へ反映する。
 * @param frames 累積対象フレーム
 * @param output 合成先配列
 * @returns 戻り値なし。outputを更新する
 */
function combineAnyFrame(frames: Uint8Array[], output: Uint8Array): void {
  for (const frame of frames) {
    for (let index = 0; index < output.length; index++) if (frame[index]) output[index] = 255;
  }
}

/** AND合成で、全フレームにある白画素のみを出力へ残す。
 * @param frames 累積対象フレーム
 * @param output 合成先配列
 * @returns 戻り値なし。outputを更新する
 */
function combineAllFrames(frames: Uint8Array[], output: Uint8Array): void {
  output.fill(255);
  for (const frame of frames) {
    for (let index = 0; index < output.length; index++) if (!frame[index]) output[index] = 0;
  }
}

/**
 * 処理名: 二値画像生成
 * 処理概要: 輝度をしきい値と比較して0または255へ変換する。
 * 実装理由: フレーム累積に使う二値表現を作るため。
 * @param gray 輝度配列
 * @param thr 二値化しきい値
 * @returns 二値画素配列
 */
export function thresholdBits(gray: ArrayLike<number>, thr: number): Uint8Array {
  const bits = new Uint8Array(gray.length);
  for (let i = 0; i < bits.length; i++) bits[i] = gray[i] >= thr ? 255 : 0;
  return bits;
}

/**
 * 処理名: 累積画像フィルタ
 * 処理概要: 二値化、フレーム合成、反転を行い画素配列へ反映する。
 * 実装理由: 設定された累積モードをOCR前処理へ適用するため。
 * @param data RGBA画素配列
 * @param w 画像幅
 * @param h 画像高さ
 * @param f フィルタ設定
 * @param d 累積設定
 * @param holder 累積状態
 * @returns 戻り値なし。配列を直接更新する
 */
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

/**
 * 処理名: 範囲フィルタ選択
 * 処理概要: 検出モードに適した前処理を適用する。
 * 実装理由: 単純フィルタと累積フィルタの適用経路を統一するため。
 * @param data RGBA画素配列
 * @param w 画像幅
 * @param h 画像高さ
 * @param f フィルタ設定
 * @param d 検出設定
 * @param holder 累積状態
 * @returns 戻り値なし。配列を直接更新する
 */
export function applyRegionFilter(
  data: Uint8ClampedArray | Uint8Array, w: number, h: number,
  f: Filters, d: Detection, holder: AccumHolder,
): void {
  if (d.mode === 'accum') accumulateImage(data, w, h, f, d, holder);
  else filterImageData(data, f);
}
