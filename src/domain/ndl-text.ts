// NDLOCR-Lite（PARSeq）まわりの、DOM・onnxに依存しない純粋なロジック
export type NdlRole = 'parseq30' | 'parseq50' | 'parseq100';

export const NDL_DEFAULT_DIMS: Record<NdlRole, [number, number]> = {
  parseq30: [16, 256], parseq50: [16, 384], parseq100: [16, 768],
};

/** 処理名: モデル種別判定
 * 処理概要: ファイル名からPARSeq文字数モデルを判別する。
 * 実装理由: 入力行に適した推論モデルを選ぶため。
 * @param lowerName 小文字化したファイル名
 * @returns モデル種別。不明ならnull
 */
export function parseqRole(lowerName: string): NdlRole | null {
  if (!lowerName.includes('parseq')) return null;
  const tokens: string[] = lowerName.replace(/\d+x\d+/, '').match(/\d+/g) || [];
  if (tokens.includes('100')) return 'parseq100';
  if (tokens.includes('50')) return 'parseq50';
  if (tokens.includes('30')) return 'parseq30';
  return null;
}

/** 処理名: モデル寸法解析
 * 処理概要: ファイル名から幅と高さを抽出する。
 * 実装理由: モデル入力サイズを自動判定するため。
 * @param lowerName 小文字化したファイル名
 * @returns 寸法。未指定ならnull
 */
export function parseDimsFromName(lowerName: string): [number, number] | null {
  const dm = lowerName.match(/(\d+)x(\d+)/);
  return dm ? [parseInt(dm[1], 10), parseInt(dm[2], 10)] : null;
}

/** 処理名: YAML文字列デコード
 * 処理概要: YAMLの引用文字列エスケープを復元する。
 * 実装理由: NDL文字セットの文字を正しく読むため。
 * @param s 引用された文字列
 * @returns デコード後文字列
 */
function decodeYamlQuoted(s: string): string {
  if (s[0] === "'") return s.slice(1, -1).replace(/''/g, "'");
  const inner = s.slice(1, -1)
    .replace(/\\x([0-9a-fA-F]{2})/g, '\\u00$1')
    .replace(/\\U([0-9a-fA-F]{8})/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)));
  try { return JSON.parse('"' + inner + '"'); } catch { return inner.replace(/\\(.)/g, '$1'); }
}

/** 処理名: 文字セット抽出
 * 処理概要: YAML本文から文字セットを抽出する。
 * 実装理由: PARSeqの出力番号を文字へ対応づけるため。
 * @param text YAML本文
 * @returns 文字一覧
 */
export function parseCharset(text: string): string[] {
  const quoted = /"(?:[^"\\]|\\[\s\S])*"|'(?:[^']|'')*'/;
  const m = text.match(new RegExp('charset(?:_train)?\\s*:\\s*(' + quoted.source + ')'));
  if (m) return Array.from(decodeYamlQuoted(m[1]));
  const all = (text.match(new RegExp(quoted.source, 'g')) || []).sort((a, b) => b.length - a.length);
  if (all.length) return Array.from(decodeYamlQuoted(all[0]));
  return Array.from(text.replace(/[\r\n]/g, ''));
}

/** 処理名: モデル優先順位決定
 * 処理概要: 行の縦横比をもとにモデル候補を並べる。
 * 実装理由: 行長に合う認識モデルを先に試すため。
 * @param lineWidth 行幅
 * @param lineHeight 行高さ
 * @returns 優先順のモデル種別
 */
export function modelPreference(lineWidth: number, lineHeight: number): NdlRole[] {
  const est = Math.ceil(lineWidth / Math.max(1, lineHeight));
  return est <= 30 ? ['parseq30', 'parseq50', 'parseq100']
    : est <= 50 ? ['parseq50', 'parseq100', 'parseq30']
    : ['parseq100', 'parseq50', 'parseq30'];
}

export interface LineBox { left: number; top: number; right: number; bottom: number }

/** 行検出処理間で共有する画素判定関数の引数型を保持する。 */
class InkPredicateSignature {
  /**
   * 判定対象画素を確認する。
   * @param index 画像配列の位置
   * @returns 文字画素ならtrue
   */
  static test(index: number): boolean { void index; return false; }
}

/** 処理名: 大津しきい値計算
 * 処理概要: 輝度ヒストグラムから二値化しきい値を求める。
 * 実装理由: 画像ごとの明暗差に適応するため。
 * @param hist 輝度ヒストグラム
 * @param total 総画素数
 * @returns 推定しきい値
 */
export function otsuThreshold(hist: ArrayLike<number>, total: number): number {
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let wB = 0, sumB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = t; }
  }
  return thr;
}

/** 処理名: OCR行領域検出
 * 処理概要: グレー画像の水平投影から文字行の矩形を求める。
 * 実装理由: 行単位の認識入力を切り出すため。
 * @param gray グレー画像データ
 * @param w 画像幅
 * @param h 画像高さ
 * @returns 検出した行矩形
 */
export function detectLineBoxes(gray: Uint8Array, w: number, h: number): LineBox[] {
  const histogram = new Array(256).fill(0);
  for (const value of gray) histogram[value]++;
  const ink = makeInkPredicate(gray, otsuThreshold(histogram, gray.length));
  const rows = countInkRows(w, h, ink);
  return combineNearbyRows(findInkRows(rows, w))
    .map(run => lineBoxFor(gray, w, h, run, ink))
    .filter((box): box is LineBox => box !== null);
}

/**
 * 処理名: インク画素判定作成
 * 処理概要: 少数色側を文字色とみなす判定関数を作成する。
 * 実装理由: 明暗反転した画像でも文字領域を検出するため。
 * @param gray グレー画像
 * @param threshold 二値化しきい値
 * @returns インク画素判定関数
 */
function makeInkPredicate(gray: Uint8Array, threshold: number): typeof InkPredicateSignature.test {
  let darkCount = 0;
  for (const pixel of gray) if (pixel <= threshold) darkCount++;
  const darkInk = darkCount <= gray.length - darkCount;
  return index => darkInk ? gray[index] <= threshold : gray[index] > threshold;
}

/**
 * 処理名: 水平投影計算
 * 処理概要: 各画像行に含まれるインク画素数を集計する。
 * 実装理由: 文字行の上下境界を検出するため。
 * @param width 画像幅
 * @param height 画像高さ
 * @param isInk インク判定関数
 * @returns 行ごとの画素数
 */
function countInkRows(width: number, height: number, isInk: typeof InkPredicateSignature.test): Uint32Array {
  const rows = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) if (isInk(y * width + x)) rows[y]++;
  }
  return rows;
}

/**
 * 処理名: 行区間抽出
 * 処理概要: インク量のしきい値を超える連続行を抽出する。
 * 実装理由: 投影値から文字行の候補を構成するため。
 * @param rows 行ごとのインク画素数
 * @param width 画像幅
 * @returns 上端・下端の行区間
 */
function findInkRows(rows: Uint32Array, width: number): [number, number][] {
  const runs: [number, number][] = [];
  const minimumInk = Math.max(1, Math.round(width * 0.004));
  let start = -1;
  for (let y = 0; y <= rows.length; y++) {
    const active = y < rows.length && rows[y] >= minimumInk;
    if (active && start < 0) start = y;
    if (!active && start >= 0) {
      runs.push([start, y]);
      start = -1;
    }
  }
  return runs;
}

/**
 * 処理名: 近接行統合
 * 処理概要: 間隔の小さい行区間を一つにまとめる。
 * 実装理由: 句読点などで分断された一行を維持するため。
 * @param runs 行区間一覧
 * @returns 統合後の行区間
 */
function combineNearbyRows(runs: [number, number][]): [number, number][] {
  const merged: [number, number][] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    const gap = last ? run[0] - last[1] : Infinity;
    const height = last ? Math.max(last[1] - last[0], run[1] - run[0]) : 0;
    if (last && gap <= 0.25 * height) last[1] = run[1];
    else merged.push(run);
  }
  return merged;
}

/**
 * 処理名: 行矩形生成
 * 処理概要: 行区間のインク境界を測定し余白付き矩形にする。
 * 実装理由: 認識器に渡す行画像を切り出すため。
 * @param gray グレー画像
 * @param width 画像幅
 * @param height 画像高さ
 * @param run 行区間
 * @param isInk インク判定関数
 * @returns 行矩形。無効区間ならnull
 */
function lineBoxFor(
  gray: Uint8Array,
  width: number,
  height: number,
  run: [number, number],
  isInk: typeof InkPredicateSignature.test,
): LineBox | null {
  const [top, bottom] = run;
  const lineHeight = bottom - top;
  if (lineHeight < 4) return null;
  let left = width;
  let right = -1;
  for (let y = top; y < bottom; y++) {
    for (let x = 0; x < width; x++) {
      if (!isInk(y * width + x)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  if (right < 0) return null;
  const padX = Math.max(2, Math.round(lineHeight * 0.3));
  const padY = Math.max(2, Math.round(lineHeight * 0.2));
  return {
    left: Math.max(0, left - padX),
    right: Math.min(width, right + 1 + padX),
    top: Math.max(0, top - padY),
    bottom: Math.min(height, bottom + padY),
  };
}

/** 処理名: OCR logitsデコード
 * 処理概要: 時系列ごとの最大スコアを文字列へ変換する。
 * 実装理由: PARSeq推論結果を読みやすいテキストにするため。
 * @param data 推論スコア
 * @param T 時系列長
 * @param C クラス数
 * @param charset 文字セット
 * @returns 認識テキスト
 */
export function decodeLogits(data: ArrayLike<number>, T: number, C: number, charset: string[]): string {
  let text = '';
  for (let ti = 0; ti < T; ti++) {
    let bi = 0, bv = -Infinity;
    for (let c = 0; c < C; c++) {
      const v = data[ti * C + c];
      if (v > bv) { bv = v; bi = c; }
    }
    if (bi === 0) break;
    const ch = charset[bi - 1];
    if (ch !== undefined) text += ch;   // [B],[P] など文字セット外の番号は無視
  }
  return text;
}
