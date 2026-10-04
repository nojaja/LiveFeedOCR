// NDLOCR-Lite（PARSeq）まわりの、DOM・onnxに依存しない純粋なロジック
export type NdlRole = 'parseq30' | 'parseq50' | 'parseq100';

export const NDL_DEFAULT_DIMS: Record<NdlRole, [number, number]> = {
  parseq30: [16, 256], parseq50: [16, 384], parseq100: [16, 768],
};

// ファイル名から PARSeq モデルの種類(30/50/100文字用)を判定
export function parseqRole(lowerName: string): NdlRole | null {
  if (!lowerName.includes('parseq')) return null;
  const tokens: string[] = lowerName.replace(/\d+x\d+/, '').match(/\d+/g) || [];
  if (tokens.includes('100')) return 'parseq100';
  if (tokens.includes('50')) return 'parseq50';
  if (tokens.includes('30')) return 'parseq30';
  return null;
}

export function parseDimsFromName(lowerName: string): [number, number] | null {
  const dm = lowerName.match(/(\d+)x(\d+)/);
  return dm ? [parseInt(dm[1], 10), parseInt(dm[2], 10)] : null;
}

function decodeYamlQuoted(s: string): string {
  if (s[0] === "'") return s.slice(1, -1).replace(/''/g, "'");
  const inner = s.slice(1, -1)
    .replace(/\\x([0-9a-fA-F]{2})/g, '\\u00$1')
    .replace(/\\U([0-9a-fA-F]{8})/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)));
  try { return JSON.parse('"' + inner + '"'); } catch { return inner.replace(/\\(.)/g, '$1'); }
}

// NDLmoji.yaml 等から文字セットを取り出す（charset(_train) の値、なければ最長の引用文字列、なければ本文全体）
export function parseCharset(text: string): string[] {
  const quoted = /"(?:[^"\\]|\\[\s\S])*"|'(?:[^']|'')*'/;
  const m = text.match(new RegExp('charset(?:_train)?\\s*:\\s*(' + quoted.source + ')'));
  if (m) return Array.from(decodeYamlQuoted(m[1]));
  const all = (text.match(new RegExp(quoted.source, 'g')) || []).sort((a, b) => b.length - a.length);
  if (all.length) return Array.from(decodeYamlQuoted(all[0]));
  return Array.from(text.replace(/[\r\n]/g, ''));
}

// 行のアスペクト比から文字数を見積もり、30/50/100文字用のモデルを優先順に選ぶ
export function modelPreference(lineWidth: number, lineHeight: number): NdlRole[] {
  const est = Math.ceil(lineWidth / Math.max(1, lineHeight));
  return est <= 30 ? ['parseq30', 'parseq50', 'parseq100']
    : est <= 50 ? ['parseq50', 'parseq100', 'parseq30']
    : ['parseq100', 'parseq50', 'parseq30'];
}

export interface LineBox { left: number; top: number; right: number; bottom: number }

// 大津の方法でしきい値を求める
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

// グレー画像を「文字行」に分割する（水平投影で行を切り出す）。見つからなければ空配列
export function detectLineBoxes(gray: Uint8Array, w: number, h: number): LineBox[] {
  const hist = new Array(256).fill(0);
  for (let j = 0; j < gray.length; j++) hist[gray[j]]++;
  const thr = otsuThreshold(hist, gray.length);

  // 少数派の色を「文字（インク）」とみなす
  let dark = 0;
  for (let j = 0; j < gray.length; j++) if (gray[j] <= thr) dark++;
  const inkIsDark = dark <= gray.length - dark;
  const isInk = (j: number) => (inkIsDark ? gray[j] <= thr : gray[j] > thr);

  const rows = new Uint32Array(h);
  for (let y = 0; y < h; y++) {
    let c = 0;
    for (let x = 0; x < w; x++) if (isInk(y * w + x)) c++;
    rows[y] = c;
  }
  const minInk = Math.max(1, Math.round(w * 0.004));
  const runs: [number, number][] = [];
  let start = -1;
  for (let y = 0; y <= h; y++) {
    const on = y < h && rows[y] >= minInk;
    if (on && start < 0) start = y;
    if (!on && start >= 0) { runs.push([start, y]); start = -1; }
  }
  // 近すぎる行どうし（濁点・句点などで分断されたもの）は結合
  const merged: [number, number][] = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] <= 0.25 * Math.max(last[1] - last[0], r[1] - r[0])) last[1] = r[1];
    else merged.push([r[0], r[1]]);
  }

  const boxes: LineBox[] = [];
  for (const [y0, y1] of merged.filter(r => r[1] - r[0] >= 4)) {
    const lh = y1 - y0;
    const padY = Math.max(2, Math.round(lh * 0.2));
    let xmin = w, xmax = -1;
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < w; x++) {
        if (isInk(y * w + x)) { if (x < xmin) xmin = x; if (x > xmax) xmax = x; }
      }
    }
    if (xmax < 0) continue;
    const padX = Math.max(2, Math.round(lh * 0.3));
    boxes.push({
      left: Math.max(0, xmin - padX),
      right: Math.min(w, xmax + 1 + padX),
      top: Math.max(0, y0 - padY),
      bottom: Math.min(h, y1 + padY),
    });
  }
  return boxes;
}

// 出力 logits[1, T, C] を位置ごとに argmax。0番はEOS、1〜は文字セットの先頭から
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
