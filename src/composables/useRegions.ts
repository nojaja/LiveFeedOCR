import { markRaw, ref, type Ref } from 'vue';
import {
  MAX_OCR_REGIONS, createDetectRegion, createOcrRegion, createSnapshot, restoreSnapshot,
  type DetectRegion, type OcrRegion, type Rect, type RegionSnapshot,
} from '../domain/region.ts';
import { createDetectionState, resetDetection, type StatusMessage, type Verdict } from '../domain/change-detection.ts';
import { RegionSurface, type RegionRuntime } from '../infrastructure/canvas/canvas-image-source.ts';

export interface MetricView { text: string; fill: string; mark: string; color: string }

export interface ItemUi {
  state: string;
  stateColor: string;
  metric: MetricView | null;
  previewW: number;
}

export type OcrView = OcrRegion & { rt: RegionRuntime; ui: ItemUi };
export type DetectView = DetectRegion & { rt: RegionRuntime; ui: ItemUi };
export type RegionView = OcrView | DetectView;

function createRuntime(withPreview: boolean): RegionRuntime {
  return markRaw({ detection: createDetectionState(), surface: new RegionSurface(withPreview) });
}

function createUi(): ItemUi {
  return { state: '待機中', stateColor: '#333', metric: null, previewW: 0 };
}

function toMetricView(m: NonNullable<Verdict['metric']>): MetricView {
  const sm = m.scaleMax || Math.max(m.thr * 2, 10);
  return {
    text: `${m.label}: ${m.value.toFixed(2)} %（しきい値 ${m.thr.toFixed(1)} %）`,
    fill: `${Math.min(100, (m.value / sm) * 100)}%`,
    mark: `${Math.min(100, (m.thr / sm) * 100)}%`,
    color: m.met ? '#dc3545' : '#17a2b8',
  };
}

export interface RegionsHooks { onClear?: () => void }

// OCR範囲(複数)と変化検知範囲(1つ)のリアクティブな状態と、その編集操作
export function useRegions(hooks: RegionsHooks = {}) {
  const ocrRegions = ref<OcrView[]>([]) as Ref<OcrView[]>;
  const detectRegion = ref<DetectView | null>(null) as Ref<DetectView | null>;
  const nextId = ref(1);

  function allItems(): RegionView[] {
    return (ocrRegions.value as RegionView[]).concat(detectRegion.value ? [detectRegion.value] : []);
  }

  function addOcr(rect: Rect, saved?: any): OcrView {
    let id = saved && saved.id;
    if (!id || ocrRegions.value.some(r => r.id === id)) id = nextId.value++;
    nextId.value = Math.max(nextId.value, id + 1);
    const view: OcrView = { ...createOcrRegion(rect, id, saved), rt: createRuntime(true), ui: createUi() };
    ocrRegions.value.push(view);
    return ocrRegions.value[ocrRegions.value.length - 1];
  }

  function removeOcr(reg: OcrView) {
    ocrRegions.value = ocrRegions.value.filter(r => r !== reg);
  }

  function setDetect(rect: Rect, saved?: any): DetectView {
    const view: DetectView = { ...createDetectRegion(rect, saved), rt: createRuntime(false), ui: createUi() };
    view.rt.detection.rebase = true;   // 設定しただけでは読み取らない
    detectRegion.value = view;
    return detectRegion.value;
  }

  function removeDetect() { detectRegion.value = null; }

  function clear() {
    ocrRegions.value = [];
    detectRegion.value = null;
    hooks.onClear?.();
  }

  function snapshot(name = ''): RegionSnapshot {
    return createSnapshot(name, nextId.value, ocrRegions.value, detectRegion.value);
  }

  // 保存した範囲一式を現在の作業状態として復元する（直後に勝手に読み取らないよう基準だけ取り直す）
  function applySnapshot(snap: any) {
    clear();
    const restored = restoreSnapshot(snap);
    nextId.value = restored.nextId;
    restored.ocr.forEach(e => { addOcr(e.rect, e.saved).rt.detection.rebase = true; });
    if (restored.detect) setDetect(restored.detect.rect, restored.detect.saved).rt.detection.rebase = true;
  }

  function resetItem(item: RegionView, silent: boolean) {
    resetDetection(item.rt.detection, silent);
  }

  function setStatus(item: RegionView, message: StatusMessage) {
    item.ui.state = message.text;
    item.ui.stateColor = message.color || '#333';
  }

  function report(item: RegionView, verdict: Verdict) {
    if (verdict.metric) item.ui.metric = toMetricView(verdict.metric);
    if (verdict.status) setStatus(item, verdict.status);
  }

  return {
    ocrRegions, detectRegion, nextId, allItems,
    canAddOcr: () => ocrRegions.value.length < MAX_OCR_REGIONS,
    addOcr, removeOcr, setDetect, removeDetect, clear,
    snapshot, applySnapshot, resetItem, setStatus, report,
  };
}

export type RegionsStore = ReturnType<typeof useRegions>;
