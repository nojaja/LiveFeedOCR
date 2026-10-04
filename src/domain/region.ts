// 範囲は映像サイズに対する割合(0〜1)で保持する（ウィンドウサイズが変わってもズレない）
export interface Rect { x: number; y: number; w: number; h: number }

export interface Filters { gray: boolean; bin: boolean; thr: number; inv: boolean }

export type DetectMode = 'diff' | 'accum' | 'ref';

export interface Detection {
  mode: DetectMode;
  auto: boolean;
  thr: number;
  pix: number;
  stable: number;
  accumN: number;
  accumMode: 'or' | 'and';
  accumThr: number;
  refMatch: number;
  refTrigger: 'above' | 'below';
  refImage: string;
}

export type ReadType = 'ocr' | 'qr';
export type OcrEngine = 'tesseract' | 'ndl' | 'paddle';

export interface ReadSettings {
  type: ReadType;
  engine: OcrEngine;
  stripWs: boolean;
  prefixUpdate: boolean;
}

export interface OcrRegion extends Rect {
  kind: 'ocr';
  id: number;
  name: string;
  angle: number;
  filters: Filters;
  det: Detection;
  read: ReadSettings;
}

export interface DetectRegion extends Rect {
  kind: 'detect';
  id: number;
  name: string;
  det: Detection;
}

export type RegionItem = OcrRegion | DetectRegion;

export const DEFAULT_FILTERS: Filters = { gray: true, bin: true, thr: 128, inv: false };
export const DEFAULT_DET: Detection = {
  mode: 'diff',
  auto: true,
  thr: 3,
  pix: 30,
  stable: 0,
  accumN: 3,
  accumMode: 'or',
  accumThr: 128,
  refMatch: 90,
  refTrigger: 'above',
  refImage: '',
};
export const DEFAULT_READ: ReadSettings = {
  type: 'ocr',
  engine: 'tesseract',
  stripWs: true,
  prefixUpdate: true,
};

export const PALETTE = ['#00e676', '#00b0ff', '#e040fb', '#ffea00', '#ff5252', '#69f0ae', '#40c4ff', '#ff80ab'];
export const DETECT_COLOR = '#ff9800';
export const MAX_OCR_REGIONS = PALETTE.length;

/** 処理名: 範囲色選択
 * 処理概要: IDに対応する色をパレットから選ぶ。
 * 実装理由: 領域をUI上で区別するため。
 * @param id 範囲ID
 * @returns CSS色表現
 */
export function paletteColor(id: number): string {
  return PALETTE[(id - 1) % PALETTE.length];
}

/** 処理名: 範囲色取得
 * 処理概要: 範囲の種類とIDから表示色を返す。
 * 実装理由: OCR範囲と検知範囲を視覚的に識別するため。
 * @param item 範囲項目
 * @returns CSS色表現
 */
export function regionColor(item: RegionItem): string {
  return item.kind === 'detect' ? DETECT_COLOR : paletteColor(item.id);
}

/** 処理名: 範囲角度取得
 * 処理概要: 範囲設定の角度をラジアンで返す。
 * 実装理由: 描画と座標変換で共通の角度値を使うため。
 * @param item 範囲項目
 * @returns 回転角度
 */
export function angleRad(item: RegionItem): number {
  return item.kind === 'ocr' ? (item.angle || 0) * Math.PI / 180 : 0;
}

/** 処理名: 矩形検証
 * 処理概要: 任意データから有効な正規化矩形を復元する。
 * 実装理由: 外部入力や保存データの不正値を安全に処理するため。
 * @param s 復元対象
 * @returns 有効な矩形。不正ならnull
 */
export function sanitizeRect(s: Partial<Rect> | null | undefined): Rect | null {
  if (!s || ![s.x, s.y, s.w, s.h].every(v => typeof v === 'number' && isFinite(v))) return null;
  const w = Math.min(Math.max(s.w, 0.005), 1);
  const h = Math.min(Math.max(s.h, 0.005), 1);
  return { x: Math.min(Math.max(s.x, 0), 1 - w), y: Math.min(Math.max(s.y, 0), 1 - h), w, h };
}

/** 処理名: OCR範囲生成
 * 処理概要: 既定設定を含むOCR範囲を作成する。
 * 実装理由: UIで新しい読み取り範囲を即時編集できるようにするため。
 * @param rect 初期矩形
 * @param id 範囲ID
 * @param saved 復元する保存設定
 * @returns OCR範囲
 */
export function createOcrRegion(rect: Rect, id: number, saved?: any): OcrRegion {
  const region: OcrRegion = {
    kind: 'ocr',
    id,
    name: (saved && saved.name) || `OCR範囲 ${id}`,
    x: rect.x, y: rect.y, w: rect.w, h: rect.h,
    angle: (saved && typeof saved.angle === 'number') ? saved.angle : 0,
    filters: Object.assign({}, DEFAULT_FILTERS, saved && saved.filters),
    det: Object.assign({}, DEFAULT_DET, saved && saved.det),
    read: Object.assign({}, DEFAULT_READ, saved && saved.read),
  };
  if (region.det.mode === 'ref') region.det.mode = 'diff';   // リファレンス判定は変化検知範囲のみ
  return region;
}

/** 処理名: 検知範囲生成
 * 処理概要: 既定設定を含む変化検知範囲を作成する。
 * 実装理由: OCR範囲と独立した検知領域を定義するため。
 * @param rect 初期矩形
 * @param id 範囲ID
 * @param saved 復元する保存設定
 * @returns 検知範囲
 */
export function createDetectRegion(rect: Rect, id: number, saved?: any): DetectRegion {
  return {
    kind: 'detect',
    id,
    name: (saved && saved.name) || `変化検知範囲 ${id}`,
    x: rect.x, y: rect.y, w: rect.w, h: rect.h,
    det: Object.assign({}, DEFAULT_DET, saved && saved.det),
  };
}

// ---- 範囲セット（スナップショット） ----
export const REGION_SET_FORMAT = 'ocr-region-set';

export interface RegionSnapshot {
  format: typeof REGION_SET_FORMAT;
  version: number;
  name: string;
  nextId: number;
  nextDetectId?: number;
  ocrRegions: any[];
  detect: any[] | any | null;
}

/**
 * 範囲スナップショットの復元結果。
 * @property nextId 次のOCR範囲ID
 * @property nextDetectId 次の検知範囲ID
 * @property ocr 復元するOCR範囲データ
 * @property detect 復元する検知範囲データ
 */
export interface RestoredRegions {
  nextId: number;
  nextDetectId: number;
  ocr: { rect: Rect | null; saved: any }[];
  detect: { rect: Rect | null; saved: any }[];
}

/** 処理名: 範囲シリアライズ
 * 処理概要: 実行時状態を保存可能なデータへ変換する。
 * 実装理由: UI内部状態を永続化形式から分離するため。
 * @param it 範囲項目
 * @returns 保存用データ
 */
export function serializeRegion(it: RegionItem): any {
  const o: any = { name: it.name, x: it.x, y: it.y, w: it.w, h: it.h, det: it.det };
  o.id = it.id;
  if (it.kind === 'ocr') { o.angle = it.angle; o.filters = it.filters; o.read = it.read; }
  return o;
}

/** 処理名: 範囲スナップショット生成
 * 処理概要: 範囲一覧と採番状態を保存用スナップショットにする。
 * 実装理由: 範囲セットを一貫した単位で保存するため。
 * @param name セット名
 * @param nextId 次のOCR ID
 * @param ocr OCR範囲一覧
 * @param detect 検知範囲一覧
 * @param nextDetectId 次の検知ID
 * @returns スナップショット
 */
export function createSnapshot(name: string, nextId: number, ocr: OcrRegion[], detect: DetectRegion[], nextDetectId = 1): RegionSnapshot {
  return {
    format: REGION_SET_FORMAT,
    version: 1,
    name: name || '',
    nextId,
    nextDetectId,
    ocrRegions: ocr.map(serializeRegion),
    detect: detect.map(serializeRegion),
  };
}

/** 処理名: 範囲セット判定
 * 処理概要: 値が範囲セット形式かを検証する。
 * 実装理由: インポートデータの形式を判別するため。
 * @param snap 判定対象
 * @returns 範囲セット形式ならtrue
 */
export function isRegionSet(snap: any): boolean {
  return !!snap && snap.format === REGION_SET_FORMAT && Array.isArray(snap.ocrRegions);
}

/** 処理名: スナップショット復元
 * 処理概要: 保存データを検証して範囲実行状態を復元する。
 * 実装理由: 不正データを除外しながら利用可能な範囲を復元するため。
 * @param snap 保存スナップショット
 * @returns 復元結果
 */
export function restoreSnapshot(snap: any): RestoredRegions {
  const ocr = (snap.ocrRegions || []).slice(0, MAX_OCR_REGIONS)
    .map((saved: any) => ({ rect: sanitizeRect(saved), saved }))
    .filter((e: any) => e.rect);
  // v1旧形式ではdetectは単一オブジェクト、新形式では配列。
  const savedDetects = Array.isArray(snap.detect) ? snap.detect : snap.detect ? [snap.detect] : [];
  const detect = savedDetects
    .map((saved: any) => ({ rect: sanitizeRect(saved), saved }))
    .filter((e: any) => e.rect);
  return {
    nextId: Math.max(1, snap.nextId || 1),
    nextDetectId: Math.max(1, snap.nextDetectId || 1, ...detect.map((e: any) => (Number(e.saved.id) || 0) + 1)),
    ocr,
    detect,
  };
}

/** 処理名: 範囲セット説明生成
 * 処理概要: セット内容の表示用説明を作る。
 * 実装理由: セット選択時に範囲数を示すため。
 * @param s 範囲セットデータ
 * @returns 説明文字列
 */
export function describeRegionSet(s: any): string {
  const detectCount = Array.isArray(s.detect) ? s.detect.length : (s.detect ? 1 : 0);
  return `OCR範囲 ${(s.ocrRegions || []).length}個${detectCount ? `＋変化検知範囲 ${detectCount}個（AND）` : ''}`;
}

/** 処理名: 一意名生成
 * 処理概要: 既存名と重複しない名前を選ぶ。
 * 実装理由: 新規セット名の衝突を避けるため。
 * @param base 候補名
 * @param existing 既存名一覧
 * @returns 一意な名前
 */
export function uniqueName(base: string, existing: Record<string, unknown>): string {
  let name = base, i = 2;
  while (existing[name]) name = `${base} (${i++})`;
  return name;
}
