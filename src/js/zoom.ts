export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;
export const ZOOM_FACTOR = 1.1;

export function adjustZoom(current, deltaY, min = MIN_ZOOM, max = MAX_ZOOM) {
  if (!Number.isFinite(current) || !Number.isFinite(deltaY)) return 1;
  const next = current * (deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR);
  return Math.min(max, Math.max(min, next));
}

export function mapPointToZoomedContent(clientX, clientY, bounds, zoom, panX = 0, panY = 0) {
  const x = (clientX - bounds.left - bounds.width * (1 - zoom) / 2 - panX) / zoom;
  const y = (clientY - bounds.top - bounds.height * (1 - zoom) / 2 - panY) / zoom;
  return {
    x: Math.min(Math.max(x, 0), bounds.width),
    y: Math.min(Math.max(y, 0), bounds.height),
  };
}

export function clampPanOffset(viewportSize, contentSize, zoom, offset) {
  if (![viewportSize, contentSize, zoom, offset].every(Number.isFinite) || viewportSize <= 0 || contentSize <= 0 || zoom <= 0) return 0;
  if (contentSize * zoom <= viewportSize) return 0;
  const minOffset = viewportSize - contentSize * (1 + zoom) / 2;
  const maxOffset = contentSize * (zoom - 1) / 2;
  return Math.min(maxOffset, Math.max(minOffset, offset));
}
