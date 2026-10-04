import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import { runMonitorStep } from '../application/monitor.ts';
import type { MonitorSink, RegionImageSource } from '../application/ports.ts';
import type { DetectView, OcrView, RegionsStore, RegionView } from './useRegions.ts';

export interface MonitorDeps {
  regions: RegionsStore;
  source: RegionImageSource<OcrView, DetectView>;
  fps: Ref<string>;
  isBusy: () => boolean;
  enqueue: (reg: OcrView, reason: string) => void;
  describeVideo: () => string;
}

// 指定fpsで「プレビュー更新 → 変化判定」を繰り返す判定ループ
export function useMonitor(deps: MonitorDeps) {
  const { regions, source } = deps;
  const stateText = ref('画面を初期化しています...');
  const stateColor = ref('#333');
  const debugText = ref('Vue画面を起動しています...');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = false;

  const sink: MonitorSink<OcrView, DetectView> = {
    detectionOf: item => (item as RegionView).rt.detection,
    report: (item, verdict) => regions.report(item as RegionView, verdict),
    setStatus: (item, message) => regions.setStatus(item as RegionView, message),
    enqueue: deps.enqueue,
    resetSilently: reg => regions.resetItem(reg, true),
  };

  function setState(text: string, color = '#333') {
    stateText.value = text;
    stateColor.value = color;
  }

  function step() {
    debugText.value = deps.describeVideo() +
      ` ／ OCR範囲 ${regions.ocrRegions.value.length} 個 ／ 変化検知範囲 ${regions.detectRegions.value.length} 個`;
    if (deps.isBusy()) return;   // 範囲を移動/リサイズしている間は判定しない
    const result = runMonitorStep(
      regions.ocrRegions.value, regions.detectRegions.value, source, sink, performance.now(),
    );
    setState(result.text, result.color);
  }

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

  function start() {
    if (active) return;
    active = true;
    tick();
  }

  function stop() {
    active = false;
    clearTimeout(timer);
  }

  onMounted(start);
  onUnmounted(stop);

  return { stateText, stateColor, debugText, start, stop };
}
