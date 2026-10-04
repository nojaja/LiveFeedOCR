<script setup lang="ts">
import type { ReadSettings } from '../../domain/region.ts';
import AccordionSection from '../ui/AccordionSection.vue';

defineProps<{ read: ReadSettings }>();
</script>

<template>
  <AccordionSection title="読み取り設定">
    <label>読み取り方式
      <select v-model="read.type">
        <option value="ocr">OCR（文字認識）</option>
        <option value="qr">QRコード</option>
      </select>
    </label>
    <label v-show="read.type === 'ocr'">OCRエンジン
      <select v-model="read.engine">
        <option value="tesseract">Tesseract.js</option>
        <option value="ndl">NDLOCR-Lite（モデル読み込みが必要）</option>
        <option value="paddle">PaddleOCR.js（初回にモデルを取得）</option>
      </select>
    </label>
    <label v-show="read.type === 'ocr'"><input v-model="read.stripWs" type="checkbox"> OCR結果のスペース・改行を除去する</label>
    <label v-show="read.type === 'ocr'"><input v-model="read.prefixUpdate" type="checkbox"> 前回結果と前方一致なら、文字送りとみなして前回結果を更新する</label>
  </AccordionSection>
</template>
