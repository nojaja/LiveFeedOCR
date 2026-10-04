import { onMounted, ref } from 'vue';
import type { Dialogs } from '../application/ports.ts';
import type { NdlModelStore } from '../infrastructure/ocr/ndl-recognizer.ts';

// NDLOCR-Lite モデルファイルの読み込み状況と、取り込み・削除操作
/**
 * 処理名: NDLモデル操作管理
 * 処理概要: モデル状態を表示し、再読込・取込・削除を公開する。
 * 実装理由: モデル管理処理を画面部品から分離するため。
 * @param models NDLモデルストア
 * @param dialogs 確認ダイアログサービス
 * @returns 状態とモデル操作
 */
export function useNdlModels(models: NdlModelStore, dialogs: Dialogs) {
  const status = ref('読み込み状況を確認中...');

  /** 保存済みモデルを再読込して状態を更新する。 @returns 非同期処理 */
  async function reload() {
    await models.reload();
    status.value = models.statusText();
  }

  /** ファイルをモデルストアへ取り込み、状態を更新する。
   * @param files 取り込むファイル一覧
   * @returns 非同期処理
   */
  async function importFiles(files: File[]) {
    const notes = await models.importFiles(files);
    status.value = models.statusText();
    if (notes.length) status.value += '\n' + notes.join('\n');
  }

  /** 確認後に保存済みモデルをすべて削除する。 @returns 非同期処理 */
  async function clear() {
    if (!dialogs.confirm('保存済みのNDLOCR-Liteモデルと文字セットをすべて削除します。よろしいですか？')) return;
    await models.clear();
    status.value = models.statusText();
  }

  onMounted(reload);

  return { status, reload, importFiles, clear };
}

export type NdlModels = ReturnType<typeof useNdlModels>;
