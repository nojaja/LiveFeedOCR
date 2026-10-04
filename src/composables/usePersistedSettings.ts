import { onUnmounted, reactive, watch } from 'vue';
import type { CommonSettings, SettingsRepository } from '../application/repositories.ts';
import type { RegionsStore } from './useRegions.ts';

export function useCommonSettings() {
  return reactive<CommonSettings>({ fps: '5', lang: 'jpn', setName: '' });
}

export interface PersistenceDeps {
  repository: SettingsRepository;
  regions: RegionsStore;
  common: CommonSettings;
  delayMs?: number;
}

// 設定（範囲一式＋共通設定）の復元と、変更時の自動保存
export function usePersistedSettings({ repository, regions, common, delayMs = 300 }: PersistenceDeps) {
  const data = repository.load();
  if (data) {
    if (data.common) {
      if (data.common.fps) common.fps = String(data.common.fps);
      if (data.common.lang) common.lang = data.common.lang;
      if (data.common.setName) common.setName = data.common.setName;
    }
    if (data.snap) regions.applySnapshot(data.snap);
    else if (data.ocrRegions) regions.applySnapshot(data);   // 旧形式(v5)の保存データ
  }

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
