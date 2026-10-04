import { computed, ref, watch, type Ref } from 'vue';
import { PAN_THRESHOLD, adjustZoom, clampZoom } from '../domain/zoom.ts';

// 切り取りプレビューの拡大縮小（Ctrl＋ホイール）とスクロールパン（Ctrl＋ドラッグ）
export function usePreviewViewport(
  viewport: Ref<HTMLElement | null>, ctrlPressed: Ref<boolean>,
) {
  const zoom = ref(1);
  const panning = ref(false);
  let panState: { clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null = null;

  const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`);
  const zoomed = computed(() => zoom.value > PAN_THRESHOLD);
  const panReady = computed(() => zoomed.value && ctrlPressed.value);

  function setZoom(value: number) { zoom.value = clampZoom(value); }
  function changeZoom(deltaY: number) { setZoom(adjustZoom(zoom.value, deltaY)); }

  watch(zoom, level => {
    const v = viewport.value;
    if (v && level <= PAN_THRESHOLD) { v.scrollLeft = 0; v.scrollTop = 0; }
  });

  function onWheel(event: WheelEvent) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    changeZoom(event.deltaY);
  }

  function onPointerDown(event: PointerEvent) {
    const v = viewport.value;
    if (!v || !event.ctrlKey || !zoomed.value || event.button !== 0) return;
    event.preventDefault();
    v.setPointerCapture(event.pointerId);
    panState = { clientX: event.clientX, clientY: event.clientY, scrollLeft: v.scrollLeft, scrollTop: v.scrollTop };
    panning.value = true;
  }

  function onPointerMove(event: PointerEvent) {
    const v = viewport.value;
    if (!v || !panState) return;
    v.scrollLeft = panState.scrollLeft - (event.clientX - panState.clientX);
    v.scrollTop = panState.scrollTop - (event.clientY - panState.clientY);
  }

  function endPan() {
    panState = null;
    panning.value = false;
  }

  return { zoom, zoomLabel, zoomed, panReady, panning, setZoom, changeZoom, onWheel, onPointerDown, onPointerMove, endPan };
}
