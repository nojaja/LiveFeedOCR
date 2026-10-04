import { judgeChange, judgeReference } from '../domain/change-detection.ts';
import { accumulate, thresholdBits } from '../domain/image-filter.ts';
import type { GraySample } from '../domain/image-filter.ts';
import type { DetectRegion, OcrRegion } from '../domain/region.ts';
import type { MonitorSink, RegionImageSource } from './ports.ts';

export interface StepResult { text: string; color?: string }

// 変化検知範囲の判定画像（加算・減算モードなら、重ね合わせた結果画像）
function detectSample(
  det: DetectRegion, source: RegionImageSource, sink: MonitorSink<OcrRegion, DetectRegion>,
): GraySample {
  const s = source.sampleDetect(det);
  if (det.det.mode !== 'accum') return s;
  const bits = thresholdBits(s.gray, det.det.accumThr);
  const gray = accumulate(sink.detectionOf(det), bits, s.w, s.h, det.det.accumN, det.det.accumMode);
  return { gray, w: s.w, h: s.h };
}

// 判定ループの1ステップ：プレビュー更新 → 変化判定 → 必要なら読み取りを依頼
export function runMonitorStep(
  ocrRegions: OcrRegion[],
  detectRegion: DetectRegion | null,
  source: RegionImageSource,
  sink: MonitorSink<OcrRegion, DetectRegion>,
  now: number,
): StepResult {
  if (ocrRegions.length === 0 && !detectRegion) {
    return { text: '範囲が未設定です（「OCR範囲を描く」で映像上をドラッグしてください）' };
  }
  const vErr = source.videoError();
  if (vErr) return { text: '映像を取得できません: ' + vErr, color: '#dc3545' };

  // 各OCR範囲：プレビューは「自動で読み取る」のON/OFFに関係なく更新し続ける
  for (const reg of ocrRegions) {
    try {
      if (!source.refreshPreview(reg)) continue;
      const verdict = judgeChange(sink.detectionOf(reg), reg.det, source.samplePreview(reg), now);
      sink.report(reg, verdict);
      if (verdict.fire) sink.enqueue(reg, '自動（変化検知）');
    } catch (err: any) {
      sink.setStatus(reg, { text: '映像の読み取りに失敗: ' + err.message, color: '#dc3545' });
    }
  }

  // 変化検知範囲：条件を満たしたら、すべてのOCR範囲を読み取る
  if (detectRegion) {
    try {
      const cur = detectSample(detectRegion, source, sink);
      const st = sink.detectionOf(detectRegion);
      const verdict = detectRegion.det.mode === 'ref'
        ? judgeReference(st, detectRegion.det, cur, source.referenceSample(detectRegion, cur.w, cur.h), now)
        : judgeChange(st, detectRegion.det, cur, now);
      sink.report(detectRegion, verdict);
      if (verdict.fire) {
        if (ocrRegions.length === 0) {
          sink.setStatus(detectRegion, { text: 'OCR範囲が未設定です', color: '#dc3545' });
        } else {
          sink.setStatus(detectRegion, { text: `条件成立 → すべてのOCR範囲（${ocrRegions.length}個）を読み取り`, color: '#0d6efd' });
          for (const reg of ocrRegions) {
            sink.resetSilently(reg);   // 読み取り後の画面を新しい基準にする（二重実行の防止）
            sink.enqueue(reg, '自動（変化検知範囲）');
          }
        }
      }
    } catch (err: any) {
      sink.setStatus(detectRegion, { text: '映像の読み取りに失敗: ' + err.message, color: '#dc3545' });
    }
  }

  return {
    text: `監視中（OCR範囲 ${ocrRegions.length} 個${detectRegion ? ' ＋ 変化検知範囲' : ''}）`,
    color: '#198754',
  };
}
