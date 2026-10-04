import { computed, reactive, type Ref } from 'vue';
import { PAN_THRESHOLD, adjustZoom, clampPanOffset, clampZoom, mapPointToZoomedContent } from '../domain/zoom.ts';

export interface CaptureViewportElements {
  wrapper: Ref<HTMLElement | null>;
  stage: Ref<HTMLElement | null>;
  overlay: Ref<HTMLElement | null>;
}

// キャプチャ画面の拡大縮小（Ctrl＋ホイール）とパン（Ctrl＋ドラッグ）
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
  function refresh() {
    const wrapper = els.wrapper.value, stage = els.stage.value;
    if (!wrapper || !stage) return;
    view.panX = clampPanOffset(wrapper.clientWidth, stage.offsetWidth, view.zoom, view.panX);
    view.panY = clampPanOffset(wrapper.clientHeight, stage.offsetHeight, view.zoom, view.panY);
  }

  function setZoom(zoom: number) {
    view.zoom = clampZoom(zoom);
    refresh();
  }

  function changeZoom(deltaY: number) { setZoom(adjustZoom(view.zoom, deltaY)); }

  function onWheel(event: WheelEvent) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    changeZoom(event.deltaY);
  }

  function beginPan(event: PointerEvent): boolean {
    if (!event.ctrlKey || view.zoom <= PAN_THRESHOLD || event.button !== 0) return false;
    event.preventDefault();
    els.overlay.value?.setPointerCapture(event.pointerId);
    panState = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: view.panX, y: view.panY };
    view.panning = true;
    return true;
  }

  function movePan(event: PointerEvent): boolean {
    if (!panState) return false;
    view.panX = panState.x + event.clientX - panState.clientX;
    view.panY = panState.y + event.clientY - panState.clientY;
    refresh();
    return true;
  }

  function endPan(): boolean {
    if (!panState) return false;
    panState = null;
    view.panning = false;
    return true;
  }

  // クライアント座標 → ズーム・パンを打ち消したステージ内の座標
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
