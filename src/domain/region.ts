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

export function paletteColor(id: number): string {
  return PALETTE[(id - 1) % PALETTE.length];
}

export function regionColor(item: RegionItem): string {
  return item.kind === 'detect' ? DETECT_COLOR : paletteColor(item.id);
}

export function angleRad(item: RegionItem): number {
  return item.kind === 'ocr' ? (item.angle || 0) * Math.PI / 180 : 0;
}

export function sanitizeRect(s: Partial<Rect> | null | undefined): Rect | null {
  if (!s || ![s.x, s.y, s.w, s.h].every(v => typeof v === 'number' && isFinite(v))) return null;
  const w = Math.min(Math.max(s.w, 0.005), 1);
  const h = Math.min(Math.max(s.h, 0.005), 1);
  return { x: Math.min(Math.max(s.x, 0), 1 - w), y: Math.min(Math.max(s.y, 0), 1 - h), w, h };
}

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

export function serializeRegion(it: RegionItem): any {
  const o: any = { name: it.name, x: it.x, y: it.y, w: it.w, h: it.h, det: it.det };
  o.id = it.id;
  if (it.kind === 'ocr') { o.angle = it.angle; o.filters = it.filters; o.read = it.read; }
  return o;
}

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

export function isRegionSet(snap: any): boolean {
  return !!snap && snap.format === REGION_SET_FORMAT && Array.isArray(snap.ocrRegions);
}

export interface RestoredRegions {
  nextId: number;
  nextDetectId: number;
  ocr: { rect: Rect; saved: any }[];
  detect: { rect: Rect; saved: any }[];
}

// 保存データから復元対象だけを取り出す（不正な矩形は除外し、OCR範囲は上限まで）
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

export function describeRegionSet(s: any): string {
  const detectCount = Array.isArray(s.detect) ? s.detect.length : (s.detect ? 1 : 0);
  return `OCR範囲 ${(s.ocrRegions || []).length}個${detectCount ? `＋変化検知範囲 ${detectCount}個（AND）` : ''}`;
}

export function uniqueName(base: string, existing: Record<string, unknown>): string {
  let name = base, i = 2;
  while (existing[name]) name = `${base} (${i++})`;
  return name;
}
