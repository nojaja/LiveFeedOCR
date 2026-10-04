<script setup lang="ts">
import { watch } from 'vue';
import { DETECT_COLOR } from '../domain/region.ts';
import { useWorkspace } from '../composables/useWorkspace.ts';
import type { DetectView } from '../composables/useRegions.ts';
import DetectionSettingsSection from './region/DetectionSettingsSection.vue';
import ItemStatus from './region/ItemStatus.vue';

const props = defineProps<{ region: DetectView }>();
const { regions, actions } = useWorkspace();

watch(
  () => {
    const d = props.region.det;
    return [d.mode, d.accumN, d.accumMode, d.accumThr, d.refMatch, d.refTrigger];
  },
  () => actions.onDetectSettingChanged(props.region),
);
</script>

<template>
  <div class="panel region-card">
    <h3 class="card-title">
      <span class="swatch" :style="{ '--swatch-color': DETECT_COLOR }"></span>
      <span class="rname">{{ region.name }}</span>
      <button type="button" class="sub del-btn" @click="regions.removeDetect()">この範囲を削除</button>
    </h3>
    <p class="note note--small note--detect-help">この範囲が条件を満たしたら、すべてのOCR範囲の読み取りを実行します。</p>
    <DetectionSettingsSection :det="region.det" is-detect @capture-reference="actions.captureReference(region)" />
    <ItemStatus :ui="region.ui" />
  </div>
</template>
