<script setup lang="ts">
import { ref } from 'vue';
import { useWorkspace } from '../composables/useWorkspace.ts';

const { regionSets } = useWorkspace();
const { options, selected, newName } = regionSets;
const fileInput = ref<HTMLInputElement | null>(null);

async function onFileChange() {
  const input = fileInput.value!;
  const file = input.files?.[0];
  input.value = '';
  if (file) await regionSets.importFile(file);
}
</script>

<template>
  <div class="group">
    <b class="set-title">範囲セット</b>
    <p class="note note--set-help">OCR範囲すべてと変化検知範囲（各設定込み）を、名前を付けてブラウザに保存できます。</p>
    <select id="set-select" v-model="selected" class="field-gap-bottom">
      <option value="">{{ options.length ? '（保存済みの範囲セットを選択）' : '（保存済みの範囲セットはありません）' }}</option>
      <option v-for="o in options" :key="o.name" :value="o.name">{{ o.label }}</option>
    </select>
    <input id="set-name" v-model="newName" type="text" placeholder="保存する名前（空なら選択中のセットを上書き）">
    <div class="row set-actions">
      <button class="sub" id="set-save-btn" type="button" @click="regionSets.save()">セーブ</button>
      <button class="sub" id="set-load-btn" type="button" @click="regionSets.load()">ロード</button>
      <button class="sub button-danger" id="set-delete-btn" type="button" @click="regionSets.remove()">削除</button>
    </div>
    <div class="row">
      <button class="sub" id="set-export-btn" type="button" @click="regionSets.exportJson()">JSONエクスポート</button>
      <button class="sub" id="set-import-btn" type="button" @click="fileInput?.click()">JSONインポート</button>
    </div>
    <input id="set-import-file" ref="fileInput" type="file" accept=".json,application/json" @change="onFileChange">
  </div>
</template>
