import { ref } from 'vue';
import { addResult, buildCsv, csvFileName, newLogId, removeEntry, type LogEntry, type NewResult } from '../domain/result-log.ts';
import type { ClipboardWriter, Dialogs, DownloadHandler } from '../application/ports.ts';
import type { ResultLogRepository } from '../application/repositories.ts';

export interface LogDeps {
  repository: ResultLogRepository;
  dialogs: Dialogs;
  download: DownloadHandler;
  copyText: ClipboardWriter;
}

// 読み取り結果ログ（自動保存・1件ずつ削除・CSV出力・文字送りの更新）
/**
 * 処理名: OCR結果ログ管理
 * 処理概要: ログの追加、削除、CSV出力、全消去を提供する。
 * 実装理由: 認識履歴を永続化し画面処理から分離するため。
 * @param deps リポジトリと画面サービス
 * @returns ログ状態と操作
 */
export function useOcrLog(deps: LogDeps) {
  const entries = ref<LogEntry[]>(deps.repository.load());

  /** 現在のログを永続化する。 @returns 戻り値なし */
  function persist() { deps.repository.save(entries.value); }

  /** ログへ認識結果を追加または文字送り更新する。
   * @param input 認識結果
   * @returns 戻り値なし
   */
  function add(input: NewResult) {
    entries.value = addResult(entries.value, input, Date.now(), newLogId()).entries;
    persist();
  }

  /** 指定IDのログ項目を削除する。
   * @param id 削除対象ID
   * @returns 戻り値なし
   */
  function remove(id: string) {
    entries.value = removeEntry(entries.value, id);
    persist();
  }

  /** ログをCSVファイルとして出力する。 @returns 戻り値なし */
  function exportCsv() {
    if (entries.value.length === 0) {
      deps.dialogs.alert('保存された結果がありません。');
      return;
    }
    const blob = new Blob([buildCsv(entries.value)], { type: 'text/csv;charset=utf-8;' });
    deps.download(blob, csvFileName(new Date()));
  }

  /** 確認後、すべてのログを削除する。 @returns 戻り値なし */
  function clearAll() {
    if (entries.value.length === 0) return;
    if (!deps.dialogs.confirm(`保存済みの結果 ${entries.value.length} 件をすべて消去します。よろしいですか？\n（必要ならCSVを先にダウンロードしてください）`)) return;
    entries.value = [];
    persist();
  }

  return { entries, add, remove, exportCsv, clearAll, copyText: deps.copyText };
}

export type OcrLog = ReturnType<typeof useOcrLog>;
