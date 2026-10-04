<script setup lang="ts">
import { useWorkspace } from '../composables/useWorkspace.ts';

const { monitor, progress } = useWorkspace();
const { stateText, stateColor, debugText } = monitor;
</script>

<template>
  <div id="state-text" :style="{ '--state-color': stateColor }">{{ stateText }}</div>
  <div id="progress-text">{{ progress }}</div>
  <div id="debug-text">{{ debugText }}</div>
</template>
