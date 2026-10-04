import { computed, reactive, type Ref } from 'vue';
import { PAN_THRESHOLD, adjustZoom, clampPanOffset, clampZoom, mapPointToZoomedContent } from '../domain/zoom.ts';

export interface CaptureViewportElements {
  wrapper: Ref<HTMLElement | null>;
  stage: Ref<HTMLElement | null>;
  overlay: Ref<HTMLElement | null>;
}

// キャプチャ画面の拡大縮小（Ctrl＋ホイール）とパン（Ctrl＋ドラッグ）
/**
 * 処理名: キャプチャ表示操作管理
 * 処理概要: キャプチャ領域のズーム、パン、座標変換を提供する。
 * 実装理由: 映像解像度を変えずに表示領域を操作するため。
 * @param els 表示要素参照
 * @param ctrlPressed Ctrlキー状態
 * @returns 表示状態と操作関数
 */
export function useCaptureViewport(els: CaptureViewportElements, ctrlPressed: Ref<boolean>) {
  const view = reactive({ zoom: 1, panX: 0, panY: 0, panning: false });
  let panState: { pointerId: number; clientX: number; clientY: number; x: number; y: number } | null = null;

  const zoomLabel = computed(() => `${Math.round(view.zoom * 100)}%`);
  const panReady = computed(() => ctrlPressed.value && view.zoom > PAN_THRESHOLD);
  const stageStyle = computed(() => ({
    '--capture-pan-x': `${view.panX}px`,
    '--capture-pan-y': `${view.panY}px`,
    '--capture-zoom': view.zoom,
  }));

  // 表示サイズの変化後に、パン位置を範囲内へ収める
  /** 表示寸法に合わせてパン位置を制限する。 @returns 戻り値なし */
  function refresh() {
    const wrapper = els.wrapper.value, stage = els.stage.value;
    if (!wrapper || !stage) return;
    view.panX = clampPanOffset(wrapper.clientWidth, stage.offsetWidth, view.zoom, view.panX);
    view.panY = clampPanOffset(wrapper.clientHeight, stage.offsetHeight, view.zoom, view.panY);
  }

  /** 指定倍率を設定してパン位置を補正する。
   * @param zoom 要求倍率
   * @returns 戻り値なし
   */
  function setZoom(zoom: number) {
    view.zoom = clampZoom(zoom);
    refresh();
  }

  /** ホイール量に応じてズーム倍率を変更する。
   * @param deltaY ホイール移動量
   * @returns 戻り値なし
   */
  function changeZoom(deltaY: number) { setZoom(adjustZoom(view.zoom, deltaY)); }

  /** Ctrlを押したホイール操作のみズームへ反映する。
   * @param event ホイールイベント
   * @returns 戻り値なし
   */
  function onWheel(event: WheelEvent) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    changeZoom(event.deltaY);
  }

  /** Ctrl+左ドラッグのパン操作を開始する。
   * @param event ポインターイベント
   * @returns パンを開始した場合true
   */
  function beginPan(event: PointerEvent): boolean {
    if (!event.ctrlKey || view.zoom <= PAN_THRESHOLD || event.button !== 0) return false;
    event.preventDefault();
    els.overlay.value?.setPointerCapture(event.pointerId);
    panState = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: view.panX, y: view.panY };
    view.panning = true;
    return true;
  }

  /** ポインター移動分だけ表示位置を更新する。
   * @param event ポインターイベント
   * @returns パン中ならtrue
   */
  function movePan(event: PointerEvent): boolean {
    if (!panState) return false;
    view.panX = panState.x + event.clientX - panState.clientX;
    view.panY = panState.y + event.clientY - panState.clientY;
    refresh();
    return true;
  }

  /** パン状態を終了する。
   * @returns パンを終了した場合true
   */
  function endPan(): boolean {
    if (!panState) return false;
    panState = null;
    view.panning = false;
    return true;
  }

  // クライアント座標 → ズーム・パンを打ち消したステージ内の座標
  /**
   * 画面座標をズーム・パン前のステージ座標へ変換する。
   * @param clientX 画面X座標
   * @param clientY 画面Y座標
   * @returns ステージ内座標
   */
  function toContentPoint(clientX: number, clientY: number) {
    const wrapper = els.wrapper.value!, stage = els.stage.value!;
    const rect = wrapper.getBoundingClientRect();
    const bounds = {
      left: rect.left + wrapper.clientLeft,
      top: rect.top + wrapper.clientTop,
      width: stage.offsetWidth,
      height: stage.offsetHeight,
    };
    return mapPointToZoomedContent(clientX, clientY, bounds, view.zoom, view.panX, view.panY);
  }

  return {
    view, zoomLabel, panReady, stageStyle,
    refresh, setZoom, changeZoom, onWheel, beginPan, movePan, endPan, toContentPoint,
  };
}

export type CaptureViewport = ReturnType<typeof useCaptureViewport>;
