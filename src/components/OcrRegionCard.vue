<script setup lang="ts">
import { watch } from 'vue';
import { regionColor } from '../domain/region.ts';
import { useWorkspace } from '../composables/useWorkspace.ts';
import type { OcrView } from '../composables/useRegions.ts';
import DetectionSettingsSection from './region/DetectionSettingsSection.vue';
import FilterSettingsSection from './region/FilterSettingsSection.vue';
import ItemStatus from './region/ItemStatus.vue';
import PreviewPane from './region/PreviewPane.vue';
import ReadSettingsSection from './region/ReadSettingsSection.vue';

const props = defineProps<{ region: OcrView }>();
const { regions, actions } = useWorkspace();

// 画像そのものが変わる設定。変化とは見なさず基準を取り直す
watch(
  () => {
    const r = props.region;
    return [r.angle, r.filters.gray, r.filters.bin, r.filters.thr, r.filters.inv,
      r.det.mode, r.det.accumN, r.det.accumMode, r.det.accumThr];
  },
  () => actions.onOcrImageSettingChanged(props.region),
);
</script>

<template>
  <div class="panel region-card">
    <h3 class="card-title">
      <span class="swatch" :style="{ '--swatch-color': regionColor(region) }"></span>
      <span class="rname">{{ region.name }}</span>
      <button type="button" class="sub del-btn" @click="regions.removeOcr(region)">この範囲を削除</button>
    </h3>
    <PreviewPane :region="region" />
    <ReadSettingsSection :read="region.read" />
    <FilterSettingsSection :region="region" />
    <DetectionSettingsSection :det="region.det" :is-detect="false" />
    <ItemStatus :ui="region.ui" />
    <button type="button" class="exec-btn button-gap-top" @click="actions.readNow(region)">この範囲を今すぐ読み取る</button>
  </div>
</template>
