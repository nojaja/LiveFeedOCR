<script setup lang="ts">
import type { ItemUi } from '../../composables/useRegions.ts';

defineProps<{ ui: ItemUi }>();
</script>

<template>
  <div class="item-state" :style="{ '--state-color': ui.stateColor }">{{ ui.state }}</div>
  <div class="item-diff-text">{{ ui.metric ? ui.metric.text : '変化量: -' }}</div>
  <div class="diff-bar">
    <div class="diff-fill" :style="ui.metric ? { '--diff-width': ui.metric.fill, '--diff-color': ui.metric.color } : undefined"></div>
    <div class="diff-mark" :style="ui.metric ? { '--diff-position': ui.metric.mark } : undefined"></div>
  </div>
</template>
