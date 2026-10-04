<script setup lang="ts">
import { useWorkspace } from '../composables/useWorkspace.ts';
import ZoomControls from './ui/ZoomControls.vue';

const { elements, viewport, editor } = useWorkspace();
const { view, zoomLabel, panReady, stageStyle } = viewport;
const { cursor } = editor;
</script>

<template>
  <div
    id="video-wrapper"
    :ref="(el) => (elements.wrapper.value = el as HTMLElement | null)"
    :class="{ 'is-pan-ready': panReady, 'is-panning': view.panning }"
    @wheel="viewport.onWheel"
  >
    <div id="capture-stage" :ref="(el) => (elements.stage.value = el as HTMLElement | null)" :style="stageStyle">
      <video id="webcam" :ref="(el) => (elements.video.value = el as HTMLVideoElement | null)" autoplay playsinline muted></video>
      <canvas
        id="overlay"
        :ref="(el) => (elements.overlay.value = el as HTMLCanvasElement | null)"
        :style="{ cursor }"
        @pointerdown="editor.onPointerDown"
        @pointermove="editor.onPointerMove"
        @pointerup="editor.onPointerUp"
        @pointercancel="editor.onPointerCancel"
      ></canvas>
    </div>
    <ZoomControls
      id="capture-zoom-controls"
      id-prefix="capture-zoom"
      aria-label="キャプチャ画面の拡大縮小"
      :level-label="zoomLabel"
      out-label="キャプチャ画面を縮小"
      in-label="キャプチャ画面を拡大"
      @pointerdown.stop
      @out="viewport.changeZoom(1)"
      @in="viewport.changeZoom(-1)"
      @reset="viewport.setZoom(1)"
    >
      <template #after><span>Ctrl＋ホイールでズーム／Ctrl＋ドラッグで移動</span></template>
    </ZoomControls>
  </div>
</template>
