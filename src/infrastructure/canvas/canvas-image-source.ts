import { sampleSize, type DetectionState } from '../../domain/change-detection.ts';
import { applyRegionFilter, toGray, type GraySample } from '../../domain/image-filter.ts';
import { angleRad, type DetectRegion, type OcrRegion } from '../../domain/region.ts';
import type { ImageSurface, RegionImageSource } from '../../application/ports.ts';

// 範囲ごとに持つキャンバス資源（保存しない実行時の状態）
export class RegionSurface {
  cropCanvas: HTMLCanvasElement | null = null;
  cropCtx: CanvasRenderingContext2D | null = null;
  previewCanvas: HTMLCanvasElement | null = null;
  previewCtx: CanvasRenderingContext2D | null = null;
  previewReady = false;
  refSrc = '';
  refImg: HTMLImageElement | null = null;
  refImgReady = false;
  refCache: GraySample | null = null;

  constructor(withPreview: boolean) {
    if (withPreview) {
      const canvas = document.createElement('canvas');
      canvas.className = 'preview';
      canvas.width = 300;
      canvas.height = 80;
      this.previewCanvas = canvas;
      this.previewCtx = canvas.getContext('2d', { willReadFrequently: true });
    }
  }
}

export interface RegionRuntime { detection: DetectionState; surface: RegionSurface }
type WithRuntime<T> = T & { rt: RegionRuntime };

function create2d(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  return [canvas, canvas.getContext('2d', { willReadFrequently: true })!];
}

export interface CanvasSourceOptions {
  getVideo: () => HTMLVideoElement | null;
  onPreviewUpdated?: (reg: any, canvas: HTMLCanvasElement) => void;
}

// 映像(video)から範囲の画像を切り出し・加工・縮小サンプリングする
export class CanvasRegionImageSource
  implements RegionImageSource<WithRuntime<OcrRegion>, WithRuntime<DetectRegion>> {
  private getVideo: () => HTMLVideoElement | null;
  private onPreviewUpdated?: (reg: any, canvas: HTMLCanvasElement) => void;
  private sample = create2d();
  private ref = create2d();

  constructor(options: CanvasSourceOptions) {
    this.getVideo = options.getVideo;
    this.onPreviewUpdated = options.onPreviewUpdated;
  }

  videoError(): string {
    const video = this.getVideo();
    if (!video) return '映像要素が未準備です';
    if (!video.srcObject) return '映像ソースが未接続（カメラ許可を確認）';
    if (!video.videoWidth || video.readyState < 2) return '映像サイズが取得できません（videoWidth=0）';
    return '';
  }

  // OCR範囲(回転した矩形)の中身を、水平になるよう補正して範囲ごとのキャンバスに描く
  private captureCrop(reg: WithRuntime<OcrRegion>): HTMLCanvasElement | null {
    if (this.videoError()) return null;
    const video = this.getVideo()!;
    const s = reg.rt.surface;
    if (!s.cropCanvas) [s.cropCanvas, s.cropCtx] = create2d();
    const cc = s.cropCanvas, ctx = s.cropCtx!;

    const vw = video.videoWidth, vh = video.videoHeight;
    const w = Math.max(1, Math.round(reg.w * vw));
    const h = Math.max(1, Math.round(reg.h * vh));
    const cx = (reg.x + reg.w / 2) * vw;
    const cy = (reg.y + reg.h / 2) * vh;

    if (cc.width !== w) cc.width = w;
    if (cc.height !== h) cc.height = h;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#fff';           // 映像の外にはみ出した部分は白
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-angleRad(reg));       // 範囲の傾きと逆向きに回して水平に戻す
    ctx.drawImage(video, -cx, -cy);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return cc;
  }

  refreshPreview(reg: WithRuntime<OcrRegion>): boolean {
    const crop = this.captureCrop(reg);
    const s = reg.rt.surface;
    if (!crop || !s.previewCanvas) return false;

    const pc = s.previewCanvas, pctx = s.previewCtx!;
    const w = crop.width, h = crop.height;
    if (pc.width !== w) pc.width = w;
    if (pc.height !== h) pc.height = h;

    pctx.drawImage(crop, 0, 0);
    const imageData = pctx.getImageData(0, 0, w, h);
    applyRegionFilter(imageData.data, w, h, reg.filters, reg.det, reg.rt.detection);
    pctx.putImageData(imageData, 0, 0);
    s.previewReady = true;
    this.onPreviewUpdated?.(reg, pc);
    return true;
  }

  previewReady(reg: WithRuntime<OcrRegion>): boolean { return reg.rt.surface.previewReady; }

  previewSurface(reg: WithRuntime<OcrRegion>): ImageSurface { return reg.rt.surface.previewCanvas!; }

  fallbackSurface(reg: WithRuntime<OcrRegion>): ImageSurface | null { return reg.rt.surface.cropCanvas; }

  // 切り取りプレビュー(フィルタ/加算・減算後)の画像を縮小して判定用データにする
  samplePreview(reg: WithRuntime<OcrRegion>): GraySample {
    const pc = reg.rt.surface.previewCanvas!;
    const [canvas, ctx] = this.sample;
    const { w, h } = sampleSize(pc.width, pc.height);
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(pc, 0, 0, pc.width, pc.height, 0, 0, w, h);
    return toGray(ctx.getImageData(0, 0, w, h).data, w, h);
  }

  // 変化検知範囲：映像の該当部分を縮小してグレースケール化
  sampleDetect(det: WithRuntime<DetectRegion>): GraySample {
    const video = this.getVideo()!;
    const vw = video.videoWidth, vh = video.videoHeight;
    const sx = det.x * vw, sy = det.y * vh;
    const sw = Math.max(1, det.w * vw), sh = Math.max(1, det.h * vh);

    const [canvas, ctx] = this.sample;
    const { w, h } = sampleSize(sw, sh);
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
    return toGray(ctx.getImageData(0, 0, w, h).data, w, h);
  }

  // リファレンス画像を、判定画像と同じサイズのグレースケール配列にして返す（未設定/読込中は null）
  referenceSample(det: WithRuntime<DetectRegion>, w: number, h: number): GraySample | null {
    const s = det.rt.surface, src = det.det.refImage;
    if (!src) return null;
    if (s.refSrc !== src) {
      s.refSrc = src;
      s.refImgReady = false;
      s.refCache = null;
      const img = new Image();
      img.onload = () => { s.refImg = img; s.refImgReady = true; };
      img.src = src;
    }
    if (!s.refImgReady) return null;
    if (!s.refCache || s.refCache.w !== w || s.refCache.h !== h) {
      const [canvas, ctx] = this.ref;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(s.refImg!, 0, 0, w, h);
      s.refCache = toGray(ctx.getImageData(0, 0, w, h).data, w, h);
    }
    return s.refCache;
  }

  // 現在の変化検知範囲の画像をグレースケールPNG(dataURL)として取り出す
  captureReferenceImage(det: WithRuntime<DetectRegion>): string {
    const s = this.sampleDetect(det);
    const c = document.createElement('canvas');
    c.width = s.w;
    c.height = s.h;
    const cx = c.getContext('2d')!;
    const id = cx.createImageData(s.w, s.h);
    for (let i = 0, j = 0; j < s.gray.length; i += 4, j++) {
      id.data[i] = id.data[i + 1] = id.data[i + 2] = s.gray[j];
      id.data[i + 3] = 255;
    }
    cx.putImageData(id, 0, 0);
    det.rt.surface.refSrc = '';   // 次の判定でリファレンスを読み直す
    return c.toDataURL('image/png');
  }
}
