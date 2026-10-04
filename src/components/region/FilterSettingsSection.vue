<script setup lang="ts">
import type { OcrRegion } from '../../domain/region.ts';
import AccordionSection from '../ui/AccordionSection.vue';
import RangeField from '../ui/RangeField.vue';

defineProps<{ region: OcrRegion }>();
</script>

<template>
  <AccordionSection title="画像前処理（フィルタ）">
    <RangeField v-model="region.angle" :min="-45" :max="45" :step="0.1" :decimals="1">
      <template #prefix>傾き（この範囲の回転）:</template>
      <template #suffix> °</template>
    </RangeField>
    <button type="button" class="sub reset-angle button-gap-bottom--large" @click="region.angle = 0">傾きをリセット</button>
    <label><input v-model="region.filters.gray" type="checkbox"> グレースケール化</label>
    <label><input v-model="region.filters.bin" type="checkbox"> 二値化（白黒化）</label>
    <RangeField v-model="region.filters.thr" :min="0" :max="255" :step="1">
      <template #prefix>二値化しきい値:</template>
    </RangeField>
    <label><input v-model="region.filters.inv" type="checkbox"> 白黒反転（ネガポジ）</label>
  </AccordionSection>
</template>
