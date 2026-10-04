import { ref } from 'vue';
import { addResult, buildCsv, csvFileName, newLogId, removeEntry, type LogEntry, type NewResult } from '../domain/result-log.ts';
import type { Dialogs } from '../application/ports.ts';
import type { ResultLogRepository } from '../application/repositories.ts';

export interface LogDeps {
  repository: ResultLogRepository;
  dialogs: Dialogs;
  download: (blob: Blob, fileName: string) => void;
  copyText: (text: string) => Promise<void>;
}

// 読み取り結果ログ（自動保存・1件ずつ削除・CSV出力・文字送りの更新）
export function useOcrLog(deps: LogDeps) {
  const entries = ref<LogEntry[]>(deps.repository.load());

  function persist() { deps.repository.save(entries.value); }

  function add(input: NewResult) {
    entries.value = addResult(entries.value, input, Date.now(), newLogId()).entries;
    persist();
  }

  function remove(id: string) {
    entries.value = removeEntry(entries.value, id);
    persist();
  }

  function exportCsv() {
    if (entries.value.length === 0) {
      deps.dialogs.alert('保存された結果がありません。');
      return;
    }
    const blob = new Blob([buildCsv(entries.value)], { type: 'text/csv;charset=utf-8;' });
    deps.download(blob, csvFileName(new Date()));
  }

  function clearAll() {
    if (entries.value.length === 0) return;
    if (!deps.dialogs.confirm(`保存済みの結果 ${entries.value.length} 件をすべて消去します。よろしいですか？\n（必要ならCSVを先にダウンロードしてください）`)) return;
    entries.value = [];
    persist();
  }

  return { entries, add, remove, exportCsv, clearAll, copyText: deps.copyText };
}

export type OcrLog = ReturnType<typeof useOcrLog>;
