import { onMounted, onUnmounted, type Ref } from 'vue';
import type { Dialogs } from '../application/ports.ts';

// カメラ映像を取得して <video> に接続し、画面破棄時に停止する
export function useCamera(videoEl: Ref<HTMLVideoElement | null>, dialogs: Dialogs) {
  let stream: MediaStream | null = null;
  let active = true;

  async function start() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (!active) {
        s.getTracks().forEach(track => track.stop());
        return;
      }
      stream = s;
      if (videoEl.value) videoEl.value.srcObject = s;
    } catch (err) {
      if (!active) return;
      dialogs.alert('カメラアクセスエラー。localhost経由で開いているか確認してください。');
      console.error(err);
    }
  }

  function stop() {
    active = false;
    const video = videoEl.value;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
  }

  onMounted(start);
  onUnmounted(stop);

  return { start, stop };
}
