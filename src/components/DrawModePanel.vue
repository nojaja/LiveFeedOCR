<script setup lang="ts">
import { useWorkspace } from '../composables/useWorkspace.ts';

const { editor } = useWorkspace();
const { drawMode } = editor;
</script>

<template>
  <div class="group">
    <label><input type="radio" name="draw-mode" value="ocr" :checked="drawMode === 'ocr'" @change="editor.setDrawMode('ocr')"> <span class="swatch ocr"></span>OCR範囲を描く（複数追加できます）</label>
    <label><input type="radio" name="draw-mode" value="detect" :checked="drawMode === 'detect'" @change="editor.setDrawMode('detect')"> <span class="swatch detect"></span>変化検知範囲を描く（橙・破線／複数・AND条件）</label>
    <label><input type="radio" name="draw-mode" value="edit" :checked="drawMode === 'edit'" @change="editor.setDrawMode('edit')"> 範囲の移動とリサイズ</label>
    <p class="note note--edit-help">移動とリサイズ：範囲の枠内をドラッグで移動、四隅・四辺の□をドラッグでリサイズできます（OCR範囲は傾きに沿って伸縮）。</p>
    <p class="note">範囲の削除は、各範囲のカードの「この範囲を削除」ボタンで行います。</p>
  </div>
</template>
