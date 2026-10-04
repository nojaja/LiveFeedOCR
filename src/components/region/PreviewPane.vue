<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue';
import { usePreviewViewport } from '../../composables/usePreviewViewport.ts';
import { useWorkspace } from '../../composables/useWorkspace.ts';
import type { OcrView } from '../../composables/useRegions.ts';
import ZoomControls from '../ui/ZoomControls.vue';

const props = defineProps<{ region: OcrView }>();
const { ctrlPressed } = useWorkspace();
const viewportEl = ref<HTMLElement | null>(null);
const pv = usePreviewViewport(viewportEl, ctrlPressed);

// 画像処理が描き込むキャンバスをそのまま表示領域に取り付ける
onMounted(() => {
  const canvas = props.region.rt.surface.previewCanvas;
  if (canvas && viewportEl.value) viewportEl.value.appendChild(canvas);
});

watchEffect(() => {
  const canvas = props.region.rt.surface.previewCanvas;
  const viewport = viewportEl.value;
  void props.region.ui.previewW;
  if (!canvas || !viewport) return;
  const fitWidth = Math.max(1, Math.min(canvas.width, viewport.clientWidth || canvas.width));
  canvas.style.setProperty('--preview-width', `${fitWidth * pv.zoom.value}px`);
}, { flush: 'post' });
</script>

<template>
  <ZoomControls
    class="preview-zoom-controls"
    :level-label="pv.zoomLabel.value"
    out-label="プレビューを縮小"
    in-label="プレビューを拡大"
    sub-buttons
    @out="pv.changeZoom(1)"
    @in="pv.changeZoom(-1)"
    @reset="pv.setZoom(1)"
  >
    <template #before><span>プレビュー（Ctrl＋ホイールで拡大、Ctrl＋ドラッグで移動）</span></template>
  </ZoomControls>
  <div
    ref="viewportEl"
    class="preview-viewport"
    :class="{ 'is-zoomed': pv.zoomed.value, 'is-pan-ready': pv.panReady.value, 'is-panning': pv.panning.value }"
    @wheel="pv.onWheel"
    @pointerdown="pv.onPointerDown"
    @pointermove="pv.onPointerMove"
    @pointerup="pv.endPan"
    @pointercancel="pv.endPan"
  ></div>
</template>
