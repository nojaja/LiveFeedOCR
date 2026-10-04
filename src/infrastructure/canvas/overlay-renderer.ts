import { DETECT_COLOR, paletteColor, regionColor, type RegionItem } from '../../domain/region.ts';
import { HANDLES, toPixels, type Size } from '../../domain/geometry.ts';

export interface DraftRect { startX: number; startY: number; curX: number; curY: number; mode: 'ocr' | 'detect' }

// angle: 範囲の中心まわりの回転(ラジアン)
function drawRect(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number,
  angle: number, color: string, dash: number[], label: string, zoom: number, labelAbove: boolean,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.setLineDash(dash.map(value => value / zoom));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 / zoom;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.setLineDash([]);

  if (label) {
    ctx.font = `${12 / zoom}px sans-serif`;
    const tw = ctx.measureText(label).width + 8 / zoom;
    const ly = labelAbove ? -h / 2 - 18 / zoom : -h / 2;
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, ly, tw, 18 / zoom);
    ctx.fillStyle = '#000';
    ctx.fillText(label, -w / 2 + 4 / zoom, ly + 13 / zoom);
  }
  ctx.restore();
}

function drawHandles(ctx: CanvasRenderingContext2D, it: RegionItem, size: Size, zoom: number) {
  const g = toPixels(it, size);
  const color = regionColor(it);
  ctx.save();
  ctx.translate(g.cx, g.cy);
  ctx.rotate(g.a);
  ctx.setLineDash([]);
  for (const h of HANDLES) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / zoom;
    const handleSize = 8 / zoom;
    ctx.fillRect(h.sx * g.w / 2 - handleSize / 2, h.sy * g.h / 2 - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(h.sx * g.w / 2 - handleSize / 2, h.sy * g.h / 2 - handleSize / 2, handleSize, handleSize);
  }
  ctx.restore();
}

export interface OverlayScene {
  size: Size;
  zoom: number;
  panX: number;
  panY: number;
  detect: RegionItem[];
  ocr: RegionItem[];
  showHandles: boolean;
  draft: DraftRect | null;
  nextId: number;
}

export function renderOverlay(ctx: CanvasRenderingContext2D, scene: OverlayScene): void {
  const { size, zoom, panX, panY } = scene;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.setTransform(zoom, 0, 0, zoom, size.width * (1 - zoom) / 2 + panX, size.height * (1 - zoom) / 2 + panY);
  const labelAbove = (cy: number, h: number) => size.height * (1 - zoom) / 2 + panY + (cy - h / 2) * zoom >= 22;
  const drawItem = (it: RegionItem) => {
    const g = toPixels(it, size);
    drawRect(ctx, g.cx, g.cy, g.w, g.h, g.a, regionColor(it), it.kind === 'detect' ? [6, 4] : [], it.name, zoom, labelAbove(g.cy, g.h));
  };
  scene.detect.forEach(drawItem);
  scene.ocr.forEach(drawItem);

  if (scene.showHandles) {
    [...scene.ocr, ...scene.detect].forEach(it => drawHandles(ctx, it, size, zoom));
  }

  const d = scene.draft;
  if (d) {
    const w = Math.abs(d.curX - d.startX), h = Math.abs(d.curY - d.startY);
    drawRect(ctx, (d.startX + d.curX) / 2, (d.startY + d.curY) / 2, w, h, 0,
      d.mode === 'ocr' ? paletteColor(scene.nextId) : DETECT_COLOR,
      d.mode === 'ocr' ? [] : [6, 4], '', zoom, false);
  }
}
