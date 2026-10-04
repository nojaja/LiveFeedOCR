<script setup lang="ts">
import { ref } from 'vue';
import { describeLogEntry, type LogEntry } from '../../domain/result-log.ts';

const props = defineProps<{ entry: LogEntry; copyText: (text: string) => Promise<void> }>();
defineEmits<{ remove: [id: string] }>();

const copyLabel = ref('コピー');
const copyDisabled = ref(false);

async function copy() {
  try {
    await props.copyText(props.entry.text || '');
    copyLabel.value = 'コピー済み';
  } catch (error) {
    console.error(error);
    copyLabel.value = '失敗';
  }
  copyDisabled.value = true;
  setTimeout(() => {
    copyLabel.value = 'コピー';
    copyDisabled.value = false;
  }, 1200);
}
</script>

<template>
  <div class="log-item" :data-id="entry.id">
    <div class="log-head">
      <div class="log-meta">{{ describeLogEntry(entry) }}</div>
      <div class="log-actions">
        <button type="button" class="log-copy" title="OCR結果をクリップボードにコピー" aria-label="OCR結果をクリップボードにコピー" :disabled="copyDisabled" @click="copy">{{ copyLabel }}</button>
        <button type="button" class="log-del" title="この結果を削除" @click="$emit('remove', entry.id)">✕ 削除</button>
      </div>
    </div>
    <div class="log-text" :class="{ empty: !entry.text }">{{ entry.text || '（テキストが検出されませんでした）' }}</div>
  </div>
</template>
