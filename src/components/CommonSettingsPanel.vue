<script setup lang="ts">
import { useWorkspace } from '../composables/useWorkspace.ts';

const { common } = useWorkspace();
</script>

<template>
  <div class="group">
    <label>判定fps（1秒あたりの確認回数・すべての範囲で共通。プレビューも同じ頻度で更新）
      <select id="check-fps" v-model="common.fps">
        <option value="1">1 fps</option>
        <option value="2">2 fps</option>
        <option value="5">5 fps</option>
        <option value="10">10 fps</option>
        <option value="15">15 fps</option>
      </select>
    </label>
    <label>OCR言語
      <select id="ocr-lang" v-model="common.lang">
        <option value="jpn">日本語 (jpn)</option>
        <option value="jpn+eng">日本語＋英語 (jpn+eng)</option>
        <option value="eng">英語 (eng)</option>
      </select>
    </label>
  </div>
</template>
