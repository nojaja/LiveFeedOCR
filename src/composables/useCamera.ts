import { onMounted, onUnmounted, type Ref } from 'vue';
import type { Dialogs } from '../application/ports.ts';

// カメラ映像を取得して <video> に接続し、画面破棄時に停止する
/**
 * 処理名: カメラライフサイクル管理
 * 処理概要: カメラ映像をvideoへ接続し、破棄時にストリームを停止する。
 * 実装理由: カメラ資源を画面の表示期間に限定するため。
 * @param videoEl 接続先video要素
 * @param dialogs 利用者通知サービス
 * @returns 開始・停止処理
 */
export function useCamera(videoEl: Ref<HTMLVideoElement | null>, dialogs: Dialogs) {
  let stream: MediaStream | null = null;
  let active = true;

  /** カメラを取得してvideoへ接続する。 @returns 非同期開始処理 */
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

  /** 映像要素とカメラストリームを解放する。 @returns 戻り値なし */
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
