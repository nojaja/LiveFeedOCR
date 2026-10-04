import { angleRad, type Rect, type RegionItem } from './region.ts';

export interface Handle { n: string; sx: number; sy: number }

export const HANDLES: Handle[] = [
  { n: 'nw', sx: -1, sy: -1 }, { n: 'n', sx: 0, sy: -1 }, { n: 'ne', sx: 1, sy: -1 },
  { n: 'e', sx: 1, sy: 0 }, { n: 'se', sx: 1, sy: 1 },
  { n: 's', sx: 0, sy: 1 }, { n: 'sw', sx: -1, sy: 1 }, { n: 'w', sx: -1, sy: 0 },
];
export const HANDLE_HIT = 9;   // ハンドルの当たり判定(px)
export const MIN_REGION = 4;  // 範囲の最小サイズ(px)
export const MIN_DRAW_SIZE = 4;

export interface Point { x: number; y: number }
export interface Size { width: number; height: number }

// 範囲をキャンバス上のピクセル座標で表す（中心・幅・高さ・回転）
export interface Geometry { cx: number; cy: number; w: number; h: number; a: number }

export interface DragState {
  item: RegionItem;
  handle: Handle | null;
  startP: Point;
  g0: Geometry;
}

/**
 * 処理名: 矩形のピクセル変換
 * 処理概要: 比率で保持する範囲をキャンバス上の矩形に変換する。
 * 実装理由: 描画と編集で同じピクセル座標を使うため。
 * @param it 対象範囲
 * @param size キャンバス寸法
 * @returns ピクセル単位の矩形
 */
export function toPixels(it: RegionItem, size: Size): Geometry {
  return {
    cx: (it.x + it.w / 2) * size.width,
    cy: (it.y + it.h / 2) * size.height,
    w: it.w * size.width,
    h: it.h * size.height,
    a: angleRad(it),
  };
}

/**
 * 処理名: 座標のローカル変換
 * 処理概要: ワールド座標を範囲の回転座標へ変換する。
 * 実装理由: 回転した範囲内のヒット判定を簡潔にするため。
 * @param g 範囲の形状
 * @param p ワールド座標
 * @returns ローカル座標
 */
export function toLocal(g: Geometry, p: Point): Point {
  const dx = p.x - g.cx, dy = p.y - g.cy;
  const c = Math.cos(-g.a), s = Math.sin(-g.a);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

/**
 * 処理名: 座標のワールド変換
 * 処理概要: ローカル座標を範囲の回転座標から戻す。
 * 実装理由: 範囲ハンドル操作の結果を画面座標へ反映するため。
 * @param g 範囲の形状
 * @param q ローカル座標
 * @returns ワールド座標
 */
export function toWorld(g: Geometry, q: Point): Point {
  const c = Math.cos(g.a), s = Math.sin(g.a);
  return { x: g.cx + q.x * c - q.y * s, y: g.cy + q.x * s + q.y * c };
}

/**
 * 処理名: 範囲ヒット判定
 * 処理概要: ポインター位置にある範囲またはハンドルを返す。
 * 実装理由: 範囲編集対象を決定するため。
 * @param items 描画順の範囲一覧
 * @param p ポインター座標
 * @param size キャンバス寸法
 * @returns ヒットした範囲とハンドル。対象外ならnull
 */
export function hitTest(items: RegionItem[], p: Point, size: Size): { item: RegionItem; handle: Handle | null } | null {
  const ordered = items.slice().reverse();
  for (const item of ordered) {
    const g = toPixels(item, size);
    const q = toLocal(g, p);
    for (const h of HANDLES) {
      if (Math.hypot(q.x - h.sx * g.w / 2, q.y - h.sy * g.h / 2) <= HANDLE_HIT) return { item, handle: h };
    }
  }
  for (const item of ordered) {
    const g = toPixels(item, size);
    const q = toLocal(g, p);
    if (Math.abs(q.x) <= g.w / 2 && Math.abs(q.y) <= g.h / 2) return { item, handle: null };
  }
  return null;
}

/**
 * 処理名: リサイズカーソル選択
 * 処理概要: 回転角度を考慮してカーソル種別を選ぶ。
 * 実装理由: 操作方向を視覚的に示すため。
 * @param handle 選択中のハンドル
 * @param angle 範囲の回転角度
 * @returns CSSカーソル名
 */
export function resizeCursor(handle: Handle, angle: number): string {
  const dx = handle.sx, dy = handle.sy;
  const ang = Math.atan2(dx * Math.sin(angle) + dy * Math.cos(angle), dx * Math.cos(angle) - dy * Math.sin(angle)) * 180 / Math.PI;
  const idx = ((Math.round(ang / 45) % 4) + 4) % 4;
  return ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'][idx];
}

/**
 * 処理名: ドラッグ矩形計算
 * 処理概要: 移動またはリサイズ操作後の範囲を算出する。
 * 実装理由: ポインター操作から永続化可能な範囲比率を得るため。
 * @param d ドラッグ開始状態
 * @param p 現在のポインター位置
 * @param size キャンバス寸法
 * @returns 更新後の比率矩形
 */
export function computeDragRect(d: DragState, p: Point, size: Size): Rect {
  const g = d.g0;
  let cx: number;
  let cy: number;
  let w = g.w;
  let h = g.h;

  if (!d.handle) {
    const moved = movedCenter(g, d, p, size);
    cx = moved.x;
    cy = moved.y;
  } else {
    // 掴んだ辺/角だけ動かし、反対側は固定（傾いていても傾きに沿って伸縮）
    const q = toLocal(g, p);
    let l = -g.w / 2, r = g.w / 2, t = -g.h / 2, b = g.h / 2;
    const { sx, sy } = d.handle;
    if (sx < 0) l = Math.min(q.x, r - MIN_REGION);
    if (sx > 0) r = Math.max(q.x, l + MIN_REGION);
    if (sy < 0) t = Math.min(q.y, b - MIN_REGION);
    if (sy > 0) b = Math.max(q.y, t + MIN_REGION);
    w = r - l;
    h = b - t;
    const c = toWorld(g, { x: (l + r) / 2, y: (t + b) / 2 });
    cx = c.x;
    cy = c.y;
  }

  return {
    x: (cx - w / 2) / size.width,
    y: (cy - h / 2) / size.height,
    w: w / size.width,
    h: h / size.height,
  };
}

/**
 * 処理名: ドラッグ移動中心の制限
 * 処理概要: 移動後の範囲中心をキャンバス内に収める。
 * 実装理由: 範囲がキャンバス外へ移動しないようにするため。
 * @param g 元の矩形形状
 * @param drag ドラッグ開始状態
 * @param point 現在のポインター位置
 * @param size キャンバス寸法
 * @returns 制限された中心座標
 */
function movedCenter(g: Geometry, drag: DragState, point: Point, size: Size): Point {
  const x = g.cx + (point.x - drag.startP.x);
  const y = g.cy + (point.y - drag.startP.y);
  const halfWidth = g.w / 2;
  const halfHeight = g.h / 2;
  if (g.a === 0) {
    return {
      x: Math.min(Math.max(x, halfWidth), size.width - halfWidth),
      y: Math.min(Math.max(y, halfHeight), size.height - halfHeight),
    };
  }
  return { x: Math.min(Math.max(x, 0), size.width), y: Math.min(Math.max(y, 0), size.height) };
}

/**
 * 処理名: 描画矩形計算
 * 処理概要: 始点と終点から最小サイズを満たす矩形を生成する。
 * 実装理由: 小さすぎる範囲の登録を防ぐため。
 * @param start ドラッグ始点
 * @param end ドラッグ終点
 * @param size キャンバス寸法
 * @returns 比率矩形。サイズ不足ならnull
 */
export function rectFromDrag(start: Point, end: Point, size: Size): Rect | null {
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  if (w < MIN_DRAW_SIZE || h < MIN_DRAW_SIZE) return null;
  return {
    x: Math.min(start.x, end.x) / size.width,
    y: Math.min(start.y, end.y) / size.height,
    w: w / size.width,
    h: h / size.height,
  };
}
