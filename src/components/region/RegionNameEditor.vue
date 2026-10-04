<script setup lang="ts">
import { nextTick, ref } from 'vue';

const props = defineProps<{ name: string }>();
const emit = defineEmits<{ 'update:name': [name: string] }>();

const editing = ref(false);
const draft = ref('');
const input = ref<HTMLInputElement | null>(null);

async function startEditing() {
  if (editing.value) return;
  draft.value = props.name;
  editing.value = true;
  await nextTick();
  input.value?.focus();
  input.value?.select();
}

function save() {
  if (!editing.value) return;
  const name = draft.value.trim();
  if (name && name !== props.name) emit('update:name', name);
  editing.value = false;
}

function cancel() {
  editing.value = false;
}
</script>

<template>
  <span class="rname-editor">
    <span
      v-if="!editing"
      class="rname"
      role="button"
      tabindex="0"
      title="ダブルクリックして名称を編集"
      @dblclick.stop="startEditing"
      @keydown.enter.prevent="startEditing"
    >{{ name }}</span>
    <input
      v-else
      ref="input"
      v-model="draft"
      class="rname-input"
      type="text"
      aria-label="範囲の名称"
      @blur="save"
      @keydown.enter.prevent="save"
      @keydown.esc.prevent="cancel"
    >
  </span>
</template>