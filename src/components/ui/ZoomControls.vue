<script setup lang="ts">
defineProps<{
  idPrefix?: string;
  levelLabel: string;
  outLabel: string;
  inLabel: string;
  subButtons?: boolean;
}>();
defineEmits<{ out: []; in: []; reset: [] }>();
</script>

<template>
  <div>
    <slot name="before" />
    <button type="button" :id="idPrefix && `${idPrefix}-out`" :class="{ sub: subButtons }" class="zoom-out" :aria-label="outLabel" @click="$emit('out')">−</button>
    <span :id="idPrefix && `${idPrefix}-level`" class="preview-zoom-level" aria-live="polite">{{ levelLabel }}</span>
    <button type="button" :id="idPrefix && `${idPrefix}-in`" :class="{ sub: subButtons }" class="zoom-in" :aria-label="inLabel" @click="$emit('in')">＋</button>
    <button type="button" :id="idPrefix && `${idPrefix}-reset`" :class="{ sub: subButtons }" class="zoom-reset" @click="$emit('reset')">リセット</button>
    <slot name="after" />
  </div>
</template>
