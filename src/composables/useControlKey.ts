import { onMounted, onUnmounted, ref } from 'vue';

// Ctrlキーの押下状態（Ctrl＋ドラッグでのパン操作のカーソル切り替えに使う）
export function useControlKey() {
  const pressed = ref(false);
  const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Control') pressed.value = true; };
  const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Control') pressed.value = false; };
  const onBlur = () => { pressed.value = false; };

  onMounted(() => {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
  });
  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  });

  return pressed;
}
