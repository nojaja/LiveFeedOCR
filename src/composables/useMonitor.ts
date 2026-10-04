import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import { runMonitorStep } from '../application/monitor.ts';
import type { MonitorSink, RegionImageSource } from '../application/ports.ts';
import type { DetectView, OcrView, RegionsStore, RegionView } from './useRegions.ts';

/** 監視Composableへ渡す読み取り登録コールバックの正確な型を保持する。 */
class MonitorCallbackSignature {
  /**
   * 読み取り対象と理由をコールバックへ渡す。
   * @param reg OCR範囲
   * @param reason 実行理由
   * @returns 戻り値なし
   */
  static enqueue(reg: OcrView, reason: string): void { void reg; void reason; }
}

export interface MonitorDeps {
  regions: RegionsStore;
  source: RegionImageSource<OcrView, DetectView>;
  fps: Ref<string>;
  isBusy: () => boolean;
  enqueue: typeof MonitorCallbackSignature.enqueue;
  describeVideo: () => string;
}

// 指定fpsで「プレビュー更新 → 変化判定」を繰り返す判定ループ
/**
 * 処理名: 監視ライフサイクル管理
 * 処理概要: 指定頻度で映像監視を実行し、画面破棄時に停止する。
 * 実装理由: タイマーと監視状態を画面の生存期間に結びつけるため。
 * @param deps 範囲、映像、実行状態の依存
 * @returns 状態表示と開始・停止処理
 */
export function useMonitor(deps: MonitorDeps) {
  const { regions, source } = deps;
  const stateText = ref('画面を初期化しています...');
  const stateColor = ref('#333');
  const debugText = ref('Vue画面を起動しています...');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = false;

  const sink: MonitorSink<OcrView, DetectView> = {
    /**
     * 領域ランタイムから検知状態を取り出す。
     * @param item 対象範囲
     * @returns 検知状態
     */
    detectionOf: item => (item as RegionView).rt.detection,
    /**
     * 判定結果を範囲ストアへ報告する。
     * @param item 対象範囲
     * @param verdict 判定結果
     * @returns 戻り値なし
     */
    report: (item, verdict) => regions.report(item as RegionView, verdict),
    /**
     * 範囲状態表示を更新する。
     * @param item 対象範囲
     * @param message 表示メッセージ
     * @returns 戻り値なし
     */
    setStatus: (item, message) => regions.setStatus(item as RegionView, message),
    enqueue: deps.enqueue,
    /**
     * 範囲の検知状態を無通知でリセットする。
     * @param reg 対象範囲
     * @returns 戻り値なし
     */
    resetSilently: reg => regions.resetItem(reg, true),
  };

  /**
   * 監視状態の文言と色を更新する。
   * @param text 表示文
   * @param color 表示色
   * @returns 戻り値なし
   */
  function setState(text: string, color = '#333') {
    stateText.value = text;
    stateColor.value = color;
  }

  /** 監視判定を一度実行する。 @returns 戻り値なし */
  function step() {
    debugText.value = deps.describeVideo() +
      ` ／ OCR範囲 ${regions.ocrRegions.value.length} 個 ／ 変化検知範囲 ${regions.detectRegions.value.length} 個`;
    if (deps.isBusy()) return;   // 範囲を移動/リサイズしている間は判定しない
    const result = runMonitorStep(
      regions.ocrRegions.value, regions.detectRegions.value, source, sink, performance.now(),
    );
    setState(result.text, result.color);
  }

  /** タイマーを再設定して次回監視を実行する。 @returns 戻り値なし */
  function tick() {
    if (!active) return;
    const fps = parseInt(deps.fps.value, 10) || 5;
    timer = setTimeout(tick, 1000 / fps);
    try {
      step();
    } catch (err: any) {
      console.error(err);
      setState('判定処理でエラー: ' + err.message, '#dc3545');
    }
  }

  /** 監視タイマーを開始する。 @returns 戻り値なし */
  function start() {
    if (active) return;
    active = true;
    tick();
  }

  /** 監視タイマーを停止する。 @returns 戻り値なし */
  function stop() {
    active = false;
    clearTimeout(timer);
  }

  onMounted(start);
  onUnmounted(stop);

  return { stateText, stateColor, debugText, start, stop };
}
