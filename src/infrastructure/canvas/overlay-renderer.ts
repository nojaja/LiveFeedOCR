import { DETECT_COLOR, paletteColor, regionColor, type RegionItem } from '../../domain/region.ts';
import { HANDLES, toPixels, type Size } from '../../domain/geometry.ts';

export interface DraftRect { startX: number; startY: number; curX: number; curY: number; mode: 'ocr' | 'detect' }

// angle: 範囲の中心まわりの回転(ラジアン)
function drawRect(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number,
  angle: number, color: string, dash: number[], label: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.setLineDash([]);

  if (label) {
    ctx.font = '12px sans-serif';
    const tw = ctx.measureText(label).width + 8;
    const ly = (cy - h / 2 >= 22) ? -h / 2 - 18 : -h / 2;
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, ly, tw, 18);
    ctx.fillStyle = '#000';
    ctx.fillText(label, -w / 2 + 4, ly + 13);
  }
  ctx.restore();
}

function drawHandles(ctx: CanvasRenderingContext2D, it: RegionItem, size: Size) {
  const g = toPixels(it, size);
  const color = regionColor(it);
  ctx.save();
  ctx.translate(g.cx, g.cy);
  ctx.rotate(g.a);
  ctx.setLineDash([]);
  for (const h of HANDLES) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(h.sx * g.w / 2 - 4, h.sy * g.h / 2 - 4, 8, 8);
    ctx.strokeRect(h.sx * g.w / 2 - 4, h.sy * g.h / 2 - 4, 8, 8);
  }
  ctx.restore();
}

export interface OverlayScene {
  size: Size;
  detect: RegionItem | null;
  ocr: RegionItem[];
  showHandles: boolean;
  draft: DraftRect | null;
  nextId: number;
}

export function renderOverlay(ctx: CanvasRenderingContext2D, scene: OverlayScene): void {
  const { size } = scene;
  ctx.clearRect(0, 0, size.width, size.height);
  const drawItem = (it: RegionItem) => {
    const g = toPixels(it, size);
    drawRect(ctx, g.cx, g.cy, g.w, g.h, g.a, regionColor(it), it.kind === 'detect' ? [6, 4] : [], it.name);
  };
  if (scene.detect) drawItem(scene.detect);
  scene.ocr.forEach(drawItem);

  if (scene.showHandles) {
    (scene.detect ? [...scene.ocr, scene.detect] : scene.ocr).forEach(it => drawHandles(ctx, it, size));
  }

  const d = scene.draft;
  if (d) {
    const w = Math.abs(d.curX - d.startX), h = Math.abs(d.curY - d.startY);
    drawRect(ctx, (d.startX + d.curX) / 2, (d.startY + d.curY) / 2, w, h, 0,
      d.mode === 'ocr' ? paletteColor(scene.nextId) : DETECT_COLOR,
      d.mode === 'ocr' ? [] : [6, 4], '');
  }
}
