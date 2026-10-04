import { onMounted, ref } from 'vue';
import type { Dialogs } from '../application/ports.ts';
import type { NdlModelStore } from '../infrastructure/ocr/ndl-recognizer.ts';

// NDLOCR-Lite モデルファイルの読み込み状況と、取り込み・削除操作
export function useNdlModels(models: NdlModelStore, dialogs: Dialogs) {
  const status = ref('読み込み状況を確認中...');

  async function reload() {
    await models.reload();
    status.value = models.statusText();
  }

  async function importFiles(files: File[]) {
    const notes = await models.importFiles(files);
    status.value = models.statusText();
    if (notes.length) status.value += '\n' + notes.join('\n');
  }

  async function clear() {
    if (!dialogs.confirm('保存済みのNDLOCR-Liteモデルと文字セットをすべて削除します。よろしいですか？')) return;
    await models.clear();
    status.value = models.statusText();
  }

  onMounted(reload);

  return { status, reload, importFiles, clear };
}

export type NdlModels = ReturnType<typeof useNdlModels>;
