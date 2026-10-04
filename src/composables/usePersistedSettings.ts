import { onUnmounted, reactive, watch } from 'vue';
import type { CommonSettings, SettingsRepository } from '../application/repositories.ts';
import type { RegionsStore } from './useRegions.ts';

/**
 * 処理名: 共通設定生成
 * 処理概要: 初期値を持つリアクティブな共通設定を返す。
 * 実装理由: 画面と保存処理で設定状態を共有するため。
 * @returns 共通設定オブジェクト
 */
export function useCommonSettings() {
  return reactive<CommonSettings>({ fps: '5', lang: 'jpn', setName: '' });
}

/**
 * 永続化Composableの依存契約。
 * @property repository 設定の保存先
 * @property regions 範囲状態ストア
 * @property common 共通設定
 * @property delayMs 自動保存の待ち時間
 */
export interface PersistenceDeps {
  repository: SettingsRepository;
  regions: RegionsStore;
  common: CommonSettings;
  delayMs?: number;
}

/**
 * 処理名: 設定の復元と自動保存
 * 処理概要: 保存済み設定を復元し、更新を遅延保存する。
 * 実装理由: 編集状態を再起動後にも保持するため。
 * @param root0 設定永続化依存
 * @param root0.repository 設定リポジトリ
 * @param root0.regions 範囲状態ストア
 * @param root0.common 共通設定
 * @param root0.delayMs 自動保存の待ち時間
 * @returns 即時保存処理
 */
export function usePersistedSettings({ repository, regions, common, delayMs = 300 }: PersistenceDeps) {
  restorePersistedData(repository.load(), regions, common);

  /** 設定状態を現在のリポジトリへ保存する。 @returns 戻り値なし */
  function save() {
    repository.save(regions.snapshot(''), { fps: common.fps, lang: common.lang, setName: common.setName });
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  watch(
    () => [regions.snapshot(''), common.fps, common.lang, common.setName],
    () => {
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(() => { dirty = false; save(); }, delayMs);
    },
    { deep: true },   // det/filters/read はスナップショットが参照で保持するため、深く追跡しないと変更を検知できない
  );

  onUnmounted(() => {
    clearTimeout(timer);
    if (dirty) save();
  });

  return { save };
}

/** 保存済みの共通設定と範囲をストアへ復元する。
 * @param data 保存データ
 * @param regions 範囲状態ストア
 * @param common 共通設定
 * @returns 戻り値なし
 */
function restorePersistedData(
  data: ReturnType<SettingsRepository['load']>, regions: RegionsStore, common: CommonSettings,
): void {
  if (!data) return;
  restoreCommonSettings(data.common, common);
  if (data.snap) regions.applySnapshot(data.snap);
  else if (data.ocrRegions) regions.applySnapshot(data);
}

/** 保存データに含まれる共通設定を現在の状態へ適用する。
 * @param saved 保存済み設定
 * @param common 共通設定ストア
 * @returns 戻り値なし
 */
function restoreCommonSettings(
  saved: Partial<CommonSettings> | undefined,
  common: CommonSettings,
): void {
  if (!saved) return;
  if (saved.fps) common.fps = String(saved.fps);
  if (saved.lang) common.lang = saved.lang;
  if (saved.setName) common.setName = saved.setName;
}
