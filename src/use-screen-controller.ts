import { onMounted, onUnmounted } from 'vue';

export function useScreenController() {
  let disposeScreen: (() => void) | undefined;
  let disposed = false;

  onMounted(async () => {
    const { startScreenController } = await import('./js/script');
    if (!disposed) disposeScreen = startScreenController();
  });

  onUnmounted(() => {
    disposed = true;
    disposeScreen?.();
  });
}
