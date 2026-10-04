import { onMounted, onUnmounted, ref } from 'vue';

// Ctrlキーの押下状態（Ctrl＋ドラッグでのパン操作のカーソル切り替えに使う）
/**
 * 処理名: Ctrlキー状態監視
 * 処理概要: Ctrl押下状態をリアクティブに公開し、画面破棄時にイベントを解除する。
 * 実装理由: 操作モードとカーソル表示を同期させるため。
 * @returns Ctrl押下状態
 */
export function useControlKey() {
  const pressed = ref(false);
  /**
   * Ctrlキー押下を状態へ反映する。
   * @param e キーイベント
   */
  const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Control') pressed.value = true; };
  /**
   * Ctrlキー解放を状態へ反映する。
   * @param e キーイベント
   */
  const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Control') pressed.value = false; };
  /**
   * ウィンドウ復帰時のキー状態を解除する。
   * @returns 戻り値なし
   */
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
