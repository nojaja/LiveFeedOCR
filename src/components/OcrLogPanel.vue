<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { useWorkspace } from '../composables/useWorkspace.ts';
import LogItem from './log/LogItem.vue';

const { log } = useWorkspace();
const listEl = ref<HTMLElement | null>(null);

const scrollToLatest = () => {
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
};
onMounted(scrollToLatest);

// 追加・更新のたびに最新の結果が見えるよう最下部へスクロールする
watch(() => log.entries.value, async () => {
  await nextTick();
  scrollToLatest();
}, { flush: 'post' });
</script>

<template>
  <div class="panel log-panel">
    <h3>OCR結果ログ <span id="log-count" class="log-count">{{ log.entries.value.length ? `（${log.entries.value.length}件）` : '' }}</span></h3>
    <div id="log-list" ref="listEl">
      <div v-if="!log.entries.value.length" class="log-empty">結果がここに時刻付きで蓄積されます...</div>
      <LogItem v-for="entry in log.entries.value" :key="entry.id" :entry="entry" :copy-text="log.copyText" @remove="log.remove" />
    </div>
    <div class="row log-toolbar">
      <button class="sub button-success" id="csv-btn" @click="log.exportCsv()">CSVダウンロード</button>
      <button class="sub button-danger" id="clear-log-btn" @click="log.clearAll()">ログを消去</button>
    </div>
    <p class="note note--small note--log">結果はブラウザに自動保存され、再読み込みしても残ります。</p>
  </div>
</template>
