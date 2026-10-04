import { judgeChange, judgeReference, resetDetection } from '../domain/change-detection.ts';
import { accumulate, thresholdBits } from '../domain/image-filter.ts';
import type { GraySample } from '../domain/image-filter.ts';
import type { DetectRegion, OcrRegion } from '../domain/region.ts';
import type { MonitorSink, RegionImageSource } from './ports.ts';

export interface StepResult { text: string; color?: string }
type DetectCondition = DetectRegion & { andMet: boolean };

// 変化検知範囲の判定画像（加算・減算モードなら、重ね合わせた結果画像）
/**
 * 検知範囲の画像を取得し、必要なら複数フレームを累積する。
 * @param det 対象検知範囲
 * @param source 画像取得元
 * @param sink 状態取得先
 * @returns 判定用グレー画像
 */
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
/**
 * 処理名: 監視1ステップ実行
 * 処理概要: OCR/検知範囲を評価し、成立時に読み取りを依頼する。
 * 実装理由: タイマー駆動の監視ロジックを副作用境界から分離するため。
 * @param ocrRegions OCR範囲一覧
 * @param detectRegions 変化検知範囲一覧
 * @param source 画像取得ポート
 * @param sink 状態更新ポート
 * @param now 判定時刻
 * @returns 表示用監視状態
 */
export function runMonitorStep(
  ocrRegions: OcrRegion[],
  detectRegions: DetectCondition[],
  source: RegionImageSource,
  sink: MonitorSink<OcrRegion, DetectRegion>,
  now: number,
): StepResult {
  if (ocrRegions.length === 0 && detectRegions.length === 0) {
    return { text: '範囲が未設定です（「OCR範囲を描く」で映像上をドラッグしてください）' };
  }
  const vErr = source.videoError();
  if (vErr) return { text: '映像を取得できません: ' + vErr, color: '#dc3545' };
  evaluateOcrRegions(ocrRegions, source, sink, now);
  evaluateDetectionRegions(ocrRegions, detectRegions, source, sink, now);

  return {
    text: `監視中（OCR範囲 ${ocrRegions.length} 個${detectRegions.length ? ` ＋ 変化検知範囲 ${detectRegions.length}個（AND）` : ''}）`,
    color: '#198754',
  };
}

/** OCR範囲を評価し、変化が成立した範囲を読み取りキューへ送る。
 * @param regions OCR範囲
 * @param source 画像取得元
 * @param sink 状態更新先
 * @param now 判定時刻
 * @returns 戻り値なし
 */
function evaluateOcrRegions(
  regions: OcrRegion[], source: RegionImageSource, sink: MonitorSink<OcrRegion, DetectRegion>, now: number,
): void {
  for (const region of regions) {
    try {
      if (!source.refreshPreview(region)) continue;
      const verdict = judgeChange(sink.detectionOf(region), region.det, source.samplePreview(region), now);
      sink.report(region, verdict);
      if (verdict.fire) sink.enqueue(region, '自動（変化検知）');
    } catch (error: unknown) {
      sink.setStatus(region, { text: '映像の読み取りに失敗: ' + errorMessage(error), color: '#dc3545' });
    }
  }
}

/** 検知範囲を個別に評価した後、AND成立状態を処理する。
 * @param ocrRegions 読み取り対象範囲
 * @param detectRegions 検知範囲
 * @param source 画像取得元
 * @param sink 状態更新先
 * @param now 判定時刻
 * @returns 戻り値なし
 */
function evaluateDetectionRegions(
  ocrRegions: OcrRegion[],
  detectRegions: DetectCondition[],
  source: RegionImageSource,
  sink: MonitorSink<OcrRegion, DetectRegion>,
  now: number,
): void {
  if (detectRegions.length === 0) return;
  const sampleFailed = detectRegions.reduce((failed, region) => evaluateDetectionRegion(region, source, sink, now) || failed, false);
  updateAndStatus(ocrRegions, detectRegions, sink, sampleFailed);
}

/** 一つの検知範囲について画像判定と状態表示を行う。
 * @param region 判定対象
 * @param source 画像取得元
 * @param sink 状態更新先
 * @param now 判定時刻
 * @returns 読み取り失敗した場合true
 */
function evaluateDetectionRegion(
  region: DetectCondition,
  source: RegionImageSource,
  sink: MonitorSink<OcrRegion, DetectRegion>,
  now: number,
): boolean {
  try {
    const current = detectSample(region, source, sink);
    const state = sink.detectionOf(region);
    const verdict = region.det.mode === 'ref'
      ? judgeReference(state, region.det, current, source.referenceSample(region, current.w, current.h), now)
      : judgeChange(state, region.det, current, now);
    sink.report(region, verdict);
    if (verdict.fire) region.andMet = true;
    if (region.andMet) sink.setStatus(region, { text: '条件成立（AND待ち）', color: '#0d6efd' });
    return false;
  } catch (error: unknown) {
    sink.setStatus(region, { text: '映像の読み取りに失敗: ' + errorMessage(error), color: '#dc3545' });
    return true;
  }
}

/** AND条件の成立状況を表示し、全成立ならOCRを起動する。
 * @param ocrRegions OCR範囲
 * @param detectRegions 検知範囲
 * @param sink 状態更新先
 * @param sampleFailed サンプル取得失敗の有無
 * @returns 戻り値なし
 */
function updateAndStatus(
  ocrRegions: OcrRegion[], detectRegions: DetectCondition[],
  sink: MonitorSink<OcrRegion, DetectRegion>, sampleFailed: boolean,
): void {
  const readyCount = detectRegions.filter(region => region.andMet).length;
  if (!sampleFailed && readyCount === detectRegions.length) {
    triggerAndRead(ocrRegions, detectRegions, sink);
    resetDetectRegions(detectRegions, sink);
  } else if (readyCount > 0) {
    showWaitingRegions(detectRegions, readyCount, sink);
  }
}

/** 全検知条件成立時の状態表示とOCRキュー投入を行う。
 * @param ocrRegions OCR範囲
 * @param detectRegions 検知範囲
 * @param sink 状態更新先
 * @returns 戻り値なし
 */
function triggerAndRead(
  ocrRegions: OcrRegion[], detectRegions: DetectCondition[], sink: MonitorSink<OcrRegion, DetectRegion>,
): void {
  if (ocrRegions.length === 0) {
    detectRegions.forEach(region => sink.setStatus(region, { text: 'OCR範囲が未設定です', color: '#dc3545' }));
    return;
  }
  detectRegions.forEach(region => sink.setStatus(region, {
    text: `AND成立 → OCR範囲 ${ocrRegions.length}個を読み取り`, color: '#0d6efd',
  }));
  for (const region of ocrRegions) {
    sink.resetSilently(region);
    sink.enqueue(region, '自動（変化検知範囲AND）');
  }
}

/** 未成立の検知範囲にAND待ち件数を表示する。
 * @param regions 検知範囲
 * @param readyCount 成立済み数
 * @param sink 状態更新先
 * @returns 戻り値なし
 */
function showWaitingRegions(
  regions: DetectCondition[], readyCount: number, sink: MonitorSink<OcrRegion, DetectRegion>,
): void {
  regions.filter(region => !region.andMet).forEach(region => {
    sink.setStatus(region, { text: `AND待ち（${readyCount}/${regions.length}成立）`, color: '#e8590c' });
  });
}

/** 各検知範囲の成立状態と判定基準を初期化する。
 * @param regions 検知範囲
 * @param sink 状態更新先
 * @returns 戻り値なし
 */
function resetDetectRegions(regions: DetectCondition[], sink: MonitorSink<OcrRegion, DetectRegion>): void {
  regions.forEach(region => {
    region.andMet = false;
    resetDetection(sink.detectionOf(region), true);
  });
}

/** 任意の例外値を表示用文字列へ正規化する。
 * @param error 捕捉した値
 * @returns エラーメッセージ
 */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
