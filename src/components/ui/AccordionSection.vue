<script setup lang="ts">
withDefaults(defineProps<{ title: string; open?: boolean }>(), { open: true });
</script>

<template>
  <details class="acc" :open="open">
    <summary>{{ title }}</summary>
    <div class="acc-body"><slot /></div>
  </details>
</template>
