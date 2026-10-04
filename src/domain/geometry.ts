import { angleRad, type Rect, type RegionItem } from './region.ts';

export interface Handle { n: string; sx: number; sy: number }

export const HANDLES: Handle[] = [
  { n: 'nw', sx: -1, sy: -1 }, { n: 'n', sx: 0, sy: -1 }, { n: 'ne', sx: 1, sy: -1 },
  { n: 'e', sx: 1, sy: 0 }, { n: 'se', sx: 1, sy: 1 },
  { n: 's', sx: 0, sy: 1 }, { n: 'sw', sx: -1, sy: 1 }, { n: 'w', sx: -1, sy: 0 },
];
export const HANDLE_HIT = 9;   // ハンドルの当たり判定(px)
export const MIN_REGION = 10;  // 範囲の最小サイズ(px)
export const MIN_DRAW_SIZE = 10;

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

export function toPixels(it: RegionItem, size: Size): Geometry {
  return {
    cx: (it.x + it.w / 2) * size.width,
    cy: (it.y + it.h / 2) * size.height,
    w: it.w * size.width,
    h: it.h * size.height,
    a: angleRad(it),
  };
}

// 画面上の点 ⇔ 範囲の回転座標系（中心原点・範囲の傾きに揃えた座標）
export function toLocal(g: Geometry, p: Point): Point {
  const dx = p.x - g.cx, dy = p.y - g.cy;
  const c = Math.cos(-g.a), s = Math.sin(-g.a);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

export function toWorld(g: Geometry, q: Point): Point {
  const c = Math.cos(g.a), s = Math.sin(g.a);
  return { x: g.cx + q.x * c - q.y * s, y: g.cy + q.x * s + q.y * c };
}

// どのハンドル/範囲の上にいるか（後から追加した範囲を優先。ハンドル → 範囲内部の順）
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

// ハンドル方向を範囲の傾きぶん回し、45°単位で適切なリサイズカーソルを選ぶ
export function resizeCursor(handle: Handle, angle: number): string {
  const dx = handle.sx, dy = handle.sy;
  const ang = Math.atan2(dx * Math.sin(angle) + dy * Math.cos(angle), dx * Math.cos(angle) - dy * Math.sin(angle)) * 180 / Math.PI;
  const idx = ((Math.round(ang / 45) % 4) + 4) % 4;
  return ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'][idx];
}

// ドラッグ中の点から、範囲の新しい位置・大きさ(割合)を求める
export function computeDragRect(d: DragState, p: Point, size: Size): Rect {
  const g = d.g0;
  let cx = g.cx, cy = g.cy, w = g.w, h = g.h;

  if (!d.handle) {
    cx = g.cx + (p.x - d.startP.x);
    cy = g.cy + (p.y - d.startP.y);
    if (g.a === 0) {
      cx = Math.min(Math.max(cx, w / 2), size.width - w / 2);
      cy = Math.min(Math.max(cy, h / 2), size.height - h / 2);
    } else {
      cx = Math.min(Math.max(cx, 0), size.width);
      cy = Math.min(Math.max(cy, 0), size.height);
    }
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

// 描画ドラッグの始点・終点から範囲(割合)を作る。小さすぎる場合は null
export function rectFromDrag(start: Point, end: Point, size: Size): Rect | null {
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  if (w <= MIN_DRAW_SIZE || h <= MIN_DRAW_SIZE) return null;
  return {
    x: Math.min(start.x, end.x) / size.width,
    y: Math.min(start.y, end.y) / size.height,
    w: w / size.width,
    h: h / size.height,
  };
}
