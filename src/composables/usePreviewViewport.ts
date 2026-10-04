import { computed, ref, watch, type Ref } from 'vue';
import { PAN_THRESHOLD, adjustZoom, clampZoom } from '../domain/zoom.ts';

// 切り取りプレビューの拡大縮小（Ctrl＋ホイール）とスクロールパン（Ctrl＋ドラッグ）
/**
 * 処理名: プレビュー表示操作管理
 * 処理概要: プレビューのズームとポインターによるパンを提供する。
 * 実装理由: 元画像を変更せず詳細表示を可能にするため。
 * @param viewport プレビュー表示領域
 * @param ctrlPressed Ctrlキー状態
 * @returns 表示状態と操作関数
 */
export function usePreviewViewport(
  viewport: Ref<HTMLElement | null>, ctrlPressed: Ref<boolean>,
) {
  const zoom = ref(1);
  const panning = ref(false);
  let panState: { clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null = null;

  const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`);
  const zoomed = computed(() => zoom.value > PAN_THRESHOLD);
  const panReady = computed(() => zoomed.value && ctrlPressed.value);

  /**
   * 指定倍率を設定する。
   * @param value 要求倍率
   * @returns 戻り値なし
   */
  function setZoom(value: number) { zoom.value = clampZoom(value); }
  /**
   * ホイール量に応じて倍率を変更する。
   * @param deltaY ホイール移動量
   * @returns 戻り値なし
   */
  function changeZoom(deltaY: number) { setZoom(adjustZoom(zoom.value, deltaY)); }

  watch(zoom, level => {
    const v = viewport.value;
    if (v && level <= PAN_THRESHOLD) { v.scrollLeft = 0; v.scrollTop = 0; }
  });

  /**
   * Ctrl+ホイール操作をズームへ反映する。
   * @param event ホイールイベント
   * @returns 戻り値なし
   */
  function onWheel(event: WheelEvent) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    changeZoom(event.deltaY);
  }

  /**
   * Ctrl+左ドラッグのパンを開始する。
   * @param event ポインターイベント
   * @returns 戻り値なし
   */
  function onPointerDown(event: PointerEvent) {
    const v = viewport.value;
    if (!v || !event.ctrlKey || !zoomed.value || event.button !== 0) return;
    event.preventDefault();
    v.setPointerCapture(event.pointerId);
    panState = { clientX: event.clientX, clientY: event.clientY, scrollLeft: v.scrollLeft, scrollTop: v.scrollTop };
    panning.value = true;
  }

  /**
   * パン中のスクロール位置を更新する。
   * @param event ポインターイベント
   * @returns 戻り値なし
   */
  function onPointerMove(event: PointerEvent) {
    const v = viewport.value;
    if (!v || !panState) return;
    v.scrollLeft = panState.scrollLeft - (event.clientX - panState.clientX);
    v.scrollTop = panState.scrollTop - (event.clientY - panState.clientY);
  }

  /**
   * パン操作を終了する。
   * @returns 戻り値なし
   */
  function endPan() {
    panState = null;
    panning.value = false;
  }

  return { zoom, zoomLabel, zoomed, panReady, panning, setZoom, changeZoom, onWheel, onPointerDown, onPointerMove, endPan };
}
