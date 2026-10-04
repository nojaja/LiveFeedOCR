import type { GraySample } from '../domain/image-filter.ts';
import type { StatusMessage, Verdict, DetectionState } from '../domain/change-detection.ts';
import type { DetectRegion, OcrRegion } from '../domain/region.ts';

export type ImageSurface = HTMLCanvasElement;

// ---- 出力ポート（インフラ層が実装する） ----
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface TextRecognizer {
  recognize(image: ImageSurface): Promise<string>;
}

export interface QrReader {
  read(candidates: ImageSurface[]): string | null;
}

export interface Dialogs {
  alert(message: string): void;
  confirm(message: string): boolean;
}

export interface ProgressReporter {
  (message: string): void;
}

// 判定対象の映像・画像処理（canvasなどの実装を隠す）
export interface RegionImageSource<O extends OcrRegion = OcrRegion, D extends DetectRegion = DetectRegion> {
  videoError(): string;
  refreshPreview(reg: O): boolean;
  previewReady(reg: O): boolean;
  previewSurface(reg: O): ImageSurface;
  fallbackSurface(reg: O): ImageSurface | null;
  samplePreview(reg: O): GraySample;
  sampleDetect(det: D): GraySample;
  referenceSample(det: D, w: number, h: number): GraySample | null;
}

export interface MonitorSink<O, D> {
  detectionOf(item: O | D): DetectionState;
  report(item: O | D, verdict: Verdict): void;
  setStatus(item: O | D, message: StatusMessage): void;
  enqueue(reg: O, reason: string): void;
  resetSilently(reg: O): void;
}
