import { computed, ref, type Ref } from 'vue';
import { REGION_SET_FORMAT, describeRegionSet, isRegionSet, uniqueName, type RegionSnapshot } from '../domain/region.ts';
import type { Dialogs, DownloadHandler } from '../application/ports.ts';
import type { RegionSetRepository } from '../application/repositories.ts';
import type { RegionsStore } from './useRegions.ts';

export interface RegionSetDeps {
  regions: RegionsStore;
  repository: RegionSetRepository;
  dialogs: Dialogs;
  download: DownloadHandler;
  selected: Ref<string>;   // 選択中のセット名（共通設定として保存される）
}

// 範囲セット（名前を付けて保存・読込・削除・JSONエクスポート/インポート）
/**
 * 処理名: 範囲セット管理
 * 処理概要: 範囲セットの保存、読込、削除、JSON入出力を提供する。
 * 実装理由: 複数の範囲構成を再利用可能にするため。
 * @param root0 依存関係一式
 * @param root0.regions 範囲ストア
 * @param root0.repository セットリポジトリ
 * @param root0.dialogs ダイアログサービス
 * @param root0.download ダウンロード処理
 * @param root0.selected 選択中のセット名
 * @returns セット状態と操作
 */
export function useRegionSets({ regions, repository, dialogs, download, selected }: RegionSetDeps) {
  const sets = ref<Record<string, RegionSnapshot>>(repository.readAll());
  const newName = ref('');
  /**
   * 現在の範囲が一つ以上あるかを返す。
   * @returns 範囲が存在すればtrue
   */
  const hasRegions = () => regions.ocrRegions.value.length > 0 || regions.detectRegions.value.length > 0;

  const options = computed(() => Object.keys(sets.value).sort().map(name => ({
    name, label: `${name}（${describeRegionSet(sets.value[name])}）`,
  })));

  /**
   * 永続化済みセットを再読み込みし選択値を更新する。
   * @param select 選択するセット
   * @returns 戻り値なし
   */
  function refresh(select?: string) {
    sets.value = repository.readAll();
    selected.value = select !== undefined && select in sets.value ? select : '';
  }

  /**
   * セット一覧を書き込み、失敗時は利用者へ通知する。
   * @param next 保存する一覧
   * @returns 保存成功時true
   */
  function write(next: Record<string, RegionSnapshot>): boolean {
    try {
      repository.writeAll(next);
      return true;
    } catch (err: any) {
      dialogs.alert('範囲セットの保存に失敗しました（ブラウザの保存容量を超えた可能性があります）。\n' + err.message);
      return false;
    }
  }

  /**
   * 現在の範囲を選択中または入力名のセットとして保存する。
   * @returns 戻り値なし
   */
  function save() {
    const name = newName.value.trim() || selected.value;
    if (!name) { dialogs.alert('保存する範囲セットの名前を入力してください。'); return; }
    const all = repository.readAll();
    if (all[name] && !dialogs.confirm(`範囲セット「${name}」を上書きします。よろしいですか？`)) return;
    all[name] = regions.snapshot(name);
    if (!write(all)) return;
    refresh(name);
    newName.value = '';
  }

  /**
   * 選択中の範囲セットを現在の編集状態へ読み込む。
   * @returns 戻り値なし
   */
  function load() {
    const name = selected.value;
    const all = repository.readAll();
    if (!name || !all[name]) { dialogs.alert('読み込む範囲セットを選択してください。'); return; }
    if (hasRegions() && !dialogs.confirm(`現在の範囲をすべて破棄して、範囲セット「${name}」を読み込みます。よろしいですか？`)) return;
    regions.applySnapshot(all[name]);
  }

  /**
   * 確認後、選択中のセットを削除する。
   * @returns 戻り値なし
   */
  function remove() {
    const name = selected.value;
    const all = repository.readAll();
    if (!name || !all[name]) { dialogs.alert('削除する範囲セットを選択してください。'); return; }
    if (!dialogs.confirm(`保存済みの範囲セット「${name}」を削除します。よろしいですか？`)) return;
    delete all[name];
    write(all);
    refresh('');
  }

  /**
   * 現在の範囲を名前付きJSONファイルとして出力する。
   * @returns 戻り値なし
   */
  function exportJson() {
    const name = newName.value.trim() || selected.value || REGION_SET_FORMAT;
    const snap = regions.snapshot(name);
    if (!snap.ocrRegions.length && !snap.detect?.length) { dialogs.alert('エクスポートする範囲がありません。'); return; }
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    download(blob, `ocr-region-set_${name.replace(/[\\/:*?"<>|\s]+/g, '_')}.json`);
  }

  /** JSONファイルを検証して範囲セットとして取り込む。
   * @param file 入力ファイル
   * @returns 非同期処理
   */
  async function importFile(file: File) {
    let snap: any;
    try {
      snap = JSON.parse(await file.text());
    } catch (err: any) {
      dialogs.alert('JSONとして読み込めませんでした: ' + err.message);
      return;
    }
    if (!isRegionSet(snap)) {
      dialogs.alert('このアプリの範囲セットJSON（format: "ocr-region-set"）ではありません。');
      return;
    }
    if (hasRegions() && !dialogs.confirm('現在の範囲をすべて破棄して、インポートした範囲セットを読み込みます。よろしいですか？')) return;

    regions.applySnapshot(snap);

    // 保存済みの範囲セット一覧にも追加（同名があれば連番を付ける）
    const all = repository.readAll();
    const base = (snap.name && String(snap.name).trim()) || file.name.replace(/\.json$/i, '');
    const name = uniqueName(base, all);
    all[name] = regions.snapshot(name);
    if (write(all)) refresh(name);
    dialogs.alert(`範囲セットをインポートしました（OCR範囲 ${regions.ocrRegions.value.length}個＋変化検知範囲 ${regions.detectRegions.value.length}個）。保存済み一覧には「${name}」として追加しました。`);
  }

  return { sets, options, selected, newName, refresh, save, load, remove, exportJson, importFile };
}

export type RegionSets = ReturnType<typeof useRegionSets>;
