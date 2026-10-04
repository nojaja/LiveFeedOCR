<script setup lang="ts">
import { watch } from 'vue';
import { DETECT_COLOR } from '../domain/region.ts';
import { useWorkspace } from '../composables/useWorkspace.ts';
import type { DetectView } from '../composables/useRegions.ts';
import DetectionSettingsSection from './region/DetectionSettingsSection.vue';
import ItemStatus from './region/ItemStatus.vue';
import RegionNameEditor from './region/RegionNameEditor.vue';

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
      <RegionNameEditor v-model:name="region.name" />
      <button type="button" class="sub del-btn" @click="regions.removeDetect(region)">この範囲を削除</button>
    </h3>
    <p class="note note--small note--detect-help">各条件は成立後に保持され、すべての変化検知範囲が成立すると、すべてのOCR範囲を読み取ります（AND）。</p>
    <DetectionSettingsSection :det="region.det" is-detect @capture-reference="actions.captureReference(region)" />
    <ItemStatus :ui="region.ui" />
  </div>
</template>
