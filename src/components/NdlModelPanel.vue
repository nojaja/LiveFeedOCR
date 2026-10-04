<script setup lang="ts">
import { ref } from 'vue';
import { useWorkspace } from '../composables/useWorkspace.ts';
import AccordionSection from './ui/AccordionSection.vue';

const { ndl } = useWorkspace();
const fileInput = ref<HTMLInputElement | null>(null);

async function onFilesChange() {
  const input = fileInput.value!;
  const files = Array.from(input.files ?? []);
  input.value = '';
  await ndl.importFiles(files);
}
</script>

<template>
  <AccordionSection title="NDLOCR-Lite モデルの読み込み" :open="false">
    <p class="note note--small note--compact">
      NDLOCR-Lite（国立国会図書館）の <b>PARSeq の onnx（30／50／100文字用）</b> と文字セット <b>NDLmoji.yaml</b> を選択してください（複数選択可）。
      ブラウザ（IndexedDB）に保存され、再読み込み後も使えます。使う範囲のカードで「OCRエンジン」を NDLOCR-Lite にしてください。
    </p>
    <input id="ndl-files" ref="fileInput" type="file" class="file-input" multiple accept=".onnx,.yaml,.yml,.txt" @change="onFilesChange">
    <div id="ndl-status">{{ ndl.status.value }}</div>
    <button class="sub button-danger" id="ndl-clear-btn" type="button" @click="ndl.clear()">保存済みモデルを削除</button>
  </AccordionSection>
</template>
