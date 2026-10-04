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
export type DetectView = DetectRegion & { rt: RegionRuntime; ui: ItemUi; andMet: boolean };
export type RegionView = OcrView | DetectView;

/**
 * 範囲の検知状態とCanvas資源を初期化する。
 * @param withPreview OCRプレビューを作成するか
 * @returns 範囲ランタイム
 */
function createRuntime(withPreview: boolean): RegionRuntime {
  return markRaw({ detection: createDetectionState(), surface: new RegionSurface(withPreview) });
}

/**
 * 範囲表示用の初期UI状態を作る。
 * @returns 初期UI状態
 */
function createUi(): ItemUi {
  return { state: '待機中', stateColor: '#333', metric: null, previewW: 0 };
}

/**
 * 判定指標をバー表示向けの値へ変換する。
 * @param m 判定指標
 * @returns UI表示値
 */
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

// OCR範囲と変化検知範囲のリアクティブな状態と、その編集操作
/**
 * 処理名: 範囲状態管理
 * 処理概要: OCR・検知範囲の生成、編集、保存復元を提供する。
 * 実装理由: 画面部品から範囲状態と操作ロジックを分離するため。
 * @param hooks 範囲ストアのライフサイクル通知
 * @returns 範囲状態と操作
 */
export function useRegions(hooks: RegionsHooks = {}) {
  const ocrRegions = ref<OcrView[]>([]) as Ref<OcrView[]>;
  const detectRegions = ref<DetectView[]>([]) as Ref<DetectView[]>;
  const nextId = ref(1);
  const nextDetectId = ref(1);

  /**
   * OCR範囲と検知範囲を描画順にまとめる。
   * @returns 全範囲
   */
  function allItems(): RegionView[] {
    return (ocrRegions.value as RegionView[]).concat(detectRegions.value);
  }

  /** OCR範囲を追加し、実行時・UI状態を初期化する。
   * @param rect 範囲矩形
   * @param saved 復元データ
   * @returns 追加範囲
   */
  function addOcr(rect: Rect, saved?: any): OcrView {
    let id = saved && saved.id;
    if (!id || ocrRegions.value.some(r => r.id === id)) id = nextId.value++;
    nextId.value = Math.max(nextId.value, id + 1);
    const view: OcrView = { ...createOcrRegion(rect, id, saved), rt: createRuntime(true), ui: createUi() };
    ocrRegions.value.push(view);
    return ocrRegions.value[ocrRegions.value.length - 1];
  }

  /**
   * OCR範囲をストアから取り除く。
   * @param reg 対象範囲
   * @returns 戻り値なし
   */
  function removeOcr(reg: OcrView) {
    ocrRegions.value = ocrRegions.value.filter(r => r !== reg);
  }

  /** 検知範囲を追加し、実行時状態を初期化する。
   * @param rect 範囲矩形
   * @param saved 復元データ
   * @returns 追加範囲
   */
  function addDetect(rect: Rect, saved?: any): DetectView {
    let id = saved && saved.id;
    if (!id || detectRegions.value.some(r => r.id === id)) id = nextDetectId.value++;
    nextDetectId.value = Math.max(nextDetectId.value, id + 1);
    const view: DetectView = { ...createDetectRegion(rect, id, saved), rt: createRuntime(false), ui: createUi(), andMet: false };
    view.rt.detection.rebase = true;   // 設定しただけでは読み取らない
    detectRegions.value.push(view);
    return view;
  }

  /**
   * 検知範囲をストアから取り除く。
   * @param reg 対象範囲
   * @returns 戻り値なし
   */
  function removeDetect(reg: DetectView) { detectRegions.value = detectRegions.value.filter(item => item !== reg); }

  /**
   * すべての範囲を消去して登録済みフックを呼び出す。
   * @returns 戻り値なし
   */
  function clear() {
    ocrRegions.value = [];
    detectRegions.value = [];
    hooks.onClear?.();
  }

  /** 現在の範囲と採番状態を保存用スナップショットにする。
   * @param name セット名
   * @returns 範囲スナップショット
   */
  function snapshot(name = ''): RegionSnapshot {
    return createSnapshot(name, nextId.value, ocrRegions.value, detectRegions.value, nextDetectId.value);
  }

  // 保存した範囲一式を現在の作業状態として復元する（直後に勝手に読み取らないよう基準だけ取り直す）
  /**
   * 保存スナップショットから範囲状態を復元する。
   * @param snap スナップショット
   * @returns 戻り値なし
   */
  function applySnapshot(snap: any) {
    clear();
    const restored = restoreSnapshot(snap);
    nextId.value = restored.nextId;
    nextDetectId.value = restored.nextDetectId;
    restored.ocr.forEach(e => { addOcr(e.rect, e.saved).rt.detection.rebase = true; });
    restored.detect.forEach(e => { addDetect(e.rect, e.saved).rt.detection.rebase = true; });
  }

  /**
   * 範囲の検知履歴をリセットする。
   * @param item 対象範囲
   * @param silent 発火抑制
   * @returns 戻り値なし
   */
  function resetItem(item: RegionView, silent: boolean) {
    resetDetection(item.rt.detection, silent);
    if (item.kind === 'detect') item.andMet = false;
  }

  /**
   * 範囲の状態表示を更新する。
   * @param item 対象範囲
   * @param message 表示内容
   * @returns 戻り値なし
   */
  function setStatus(item: RegionView, message: StatusMessage) {
    item.ui.state = message.text;
    item.ui.stateColor = message.color || '#333';
  }

  /**
   * 判定結果の指標と状態をUIへ反映する。
   * @param item 対象範囲
   * @param verdict 判定結果
   * @returns 戻り値なし
   */
  function report(item: RegionView, verdict: Verdict) {
    if (verdict.metric) item.ui.metric = toMetricView(verdict.metric);
    if (verdict.status) setStatus(item, verdict.status);
  }

  return {
    ocrRegions, detectRegions, nextId, nextDetectId, allItems,
    /**
     * OCR範囲の追加上限に達していないかを返す。
     * @returns 追加可能ならtrue
     */
    canAddOcr: () => ocrRegions.value.length < MAX_OCR_REGIONS,
    addOcr, removeOcr, addDetect, removeDetect, clear,
    snapshot, applySnapshot, resetItem, setStatus, report,
  };
}

export type RegionsStore = ReturnType<typeof useRegions>;
