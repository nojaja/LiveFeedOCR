<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
}>(), { decimals: 0 });
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const shown = computed(() => props.decimals ? Number(props.modelValue).toFixed(props.decimals) : String(props.modelValue));
</script>

<template>
  <label>
    <slot name="prefix" /> <span>{{ shown }}</span><slot name="suffix" />
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    >
  </label>
</template>
