export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 8;
export const ZOOM_FACTOR = 1.1;
export const PAN_THRESHOLD = 1.001;

export interface Bounds {
/** 画面上の矩形情報。ズーム座標の変換に使う。 @property 計算範囲を統一するため保持する。 */
 left: number; top: number; width: number; height: number
}

/**
 * 処理名: ズーム値の制限
 * 処理概要: ズーム値を指定範囲に収める。
 * 実装理由: 表示倍率が操作範囲を超えないようにする。
 * @param zoom 制限する倍率
 * @param min 最小倍率
 * @param max 最大倍率
 * @returns 制限後の倍率
 */
export function clampZoom(zoom: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  return Math.min(max, Math.max(min, zoom));
}

/**
 * 処理名: ズーム倍率の更新
 * 処理概要: ホイール方向に応じて倍率を変更する。
 * 実装理由: 操作入力を一貫したズーム値へ変換する。
 * @param current 現在の倍率
 * @param deltaY ホイール移動量
 * @param min 最小倍率
 * @param max 最大倍率
 * @returns 更新後の倍率
 */
export function adjustZoom(current: number, deltaY: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  if (!Number.isFinite(current) || !Number.isFinite(deltaY)) return 1;
  const next = current * (deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR);
  return clampZoom(next, min, max);
}

/**
 * 処理名: ズーム座標の逆変換
 * 処理概要: 画面ポインター座標をコンテンツ座標へ戻す。
 * 実装理由: ズームやパン中も正しい範囲を選択する。
 * @param clientX 画面上のX座標
 * @param clientY 画面上のY座標
 * @param bounds コンテンツの表示矩形
 * @param zoom 現在の倍率
 * @param panX 水平パン量
 * @param panY 垂直パン量
 * @returns コンテンツ内の座標
 */
export function mapPointToZoomedContent(
  clientX: number, clientY: number, bounds: Bounds, zoom: number, panX = 0, panY = 0,
) {
  const x = (clientX - bounds.left - bounds.width * (1 - zoom) / 2 - panX) / zoom;
  const y = (clientY - bounds.top - bounds.height * (1 - zoom) / 2 - panY) / zoom;
  return {
    x: Math.min(Math.max(x, 0), bounds.width),
    y: Math.min(Math.max(y, 0), bounds.height),
  };
}

/**
 * 処理名: パン量の制限
 * 処理概要: 表示領域内にコンテンツが収まる範囲へ移動量を制限する。
 * 実装理由: ズーム中に画像端が空白になることを防ぐ。
 * @param viewportSize 表示領域の寸法
 * @param contentSize コンテンツの寸法
 * @param zoom 現在の倍率
 * @param offset 要求された移動量
 * @returns 制限後の移動量
 */
export function clampPanOffset(viewportSize: number, contentSize: number, zoom: number, offset: number): number {
  if (![viewportSize, contentSize, zoom, offset].every(Number.isFinite) || viewportSize <= 0 || contentSize <= 0 || zoom <= 0) return 0;
  if (contentSize * zoom <= viewportSize) return 0;
  const minOffset = viewportSize - contentSize * (1 + zoom) / 2;
  const maxOffset = contentSize * (zoom - 1) / 2;
  return Math.min(maxOffset, Math.max(minOffset, offset));
}
