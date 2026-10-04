import { inject, onUnmounted, provide, ref, shallowRef, toRef, type InjectionKey } from 'vue';
import { RegionSetRepository, ResultLogRepository, SettingsRepository } from '../application/repositories.ts';
import type { ClipboardWriter, Dialogs, DownloadHandler, KeyValueStore } from '../application/ports.ts';
import { CanvasRegionImageSource } from '../infrastructure/canvas/canvas-image-source.ts';
import { browserDialogs, browserStore, copyTextToClipboard, describeRuntimes, downloadBlob } from '../infrastructure/browser/browser-services.ts';
import { JsQrReader, PaddleRecognizer, TesseractRecognizer } from '../infrastructure/ocr/basic-recognizers.ts';
import { NdlModelStore, NdlRecognizer } from '../infrastructure/ocr/ndl-recognizer.ts';
import { useCamera } from './useCamera.ts';
import { useCaptureViewport } from './useCaptureViewport.ts';
import { useCommonSettings, usePersistedSettings } from './usePersistedSettings.ts';
import { useControlKey } from './useControlKey.ts';
import { useMonitor } from './useMonitor.ts';
import { useNdlModels } from './useNdlModels.ts';
import { useOcrLog } from './useOcrLog.ts';
import { useOcrRunner } from './useOcrRunner.ts';
import { useRegionEditor } from './useRegionEditor.ts';
import { useRegionSets } from './useRegionSets.ts';
import { useRegions, type DetectView, type OcrView } from './useRegions.ts';

export interface WorkspaceServices {
  store: KeyValueStore;
  dialogs: Dialogs;
  download: DownloadHandler;
  copyText: ClipboardWriter;
}

export const browserServices: WorkspaceServices = {
  store: browserStore,
  dialogs: browserDialogs,
  download: downloadBlob,
  copyText: copyTextToClipboard,
};

// 画面全体で共有する状態・振る舞いを組み立てる（各コンポーネントは inject で必要な部分だけ使う）
/**
 * 処理名: ワークスペース組み立て
 * 処理概要: 画面状態、リポジトリ、認識エンジン、Composableを接続する。
 * 実装理由: アプリ全体の依存とライフサイクルを一つの境界に集約するため。
 * @param services ブラウザーサービスまたはテスト用サービス
 * @returns 画面全体の状態と操作
 */
export function createWorkspace(services: WorkspaceServices = browserServices) {
  const elements = {
    video: shallowRef<HTMLVideoElement | null>(null),
    overlay: shallowRef<HTMLCanvasElement | null>(null),
    wrapper: shallowRef<HTMLElement | null>(null),
    stage: shallowRef<HTMLElement | null>(null),
  };
  const progress = ref('');
  /**
   * OCR進捗を画面表示状態へ反映する。
   * @param message 進捗文
   * @returns 戻り値なし
   */
  const report = (message: string) => { progress.value = message; };

  const ctrlPressed = useControlKey();
  const common = useCommonSettings();
  /**
   * 初期化後にジョブキュー消去処理を接続する。
   * @returns 戻り値なし
   */
  let clearQueue = () => {};
  const regions = useRegions({
    /**
     * 全範囲消去時に待機中ジョブを破棄する。
     * @returns 戻り値なし
     */
    onClear: () => clearQueue(),
  });
  const settings = usePersistedSettings({ repository: new SettingsRepository(services.store), regions, common });
  const log = useOcrLog({
    repository: new ResultLogRepository(services.store),
    dialogs: services.dialogs, download: services.download, copyText: services.copyText,
  });

  const source = new CanvasRegionImageSource({
    /**
     * 現在のvideo要素を返す。
     * @returns video要素またはnull
     */
    getVideo: () => elements.video.value,
    /**
     * プレビュー寸法を範囲UIへ反映する。
     * @param reg 対象範囲
     * @param canvas プレビュー画像
     * @returns 戻り値なし
     */
    onPreviewUpdated: (reg, canvas) => { reg.ui.previewW = canvas.width; },
  });

  const ndlModels = new NdlModelStore();
  const tesseract = new TesseractRecognizer(() => common.lang, report);
  const runner = useOcrRunner({
    regions, source, log, report,
    read: {
      recognizers: { tesseract, ndl: new NdlRecognizer(ndlModels, report), paddle: new PaddleRecognizer(report) },
      qr: new JsQrReader(),
    },
  });
  clearQueue = runner.clearQueue;
  onUnmounted(() => tesseract.dispose());

  const viewport = useCaptureViewport(elements, ctrlPressed);
  useCamera(elements.video, services.dialogs);

  /**
   * 画像設定変更を反映し、変化として扱わないよう基準を取り直す。
   * @param reg 対象OCR範囲
   * @returns 戻り値なし
   */
  function onOcrImageSettingChanged(reg: OcrView) {
    reg.rt.detection.accum = null;
    try { source.refreshPreview(reg); } catch (e) { console.warn(e); }
    regions.resetItem(reg, true);
  }

  const editor = useRegionEditor({
    regions, viewport, wrapper: elements.wrapper, video: elements.video, overlay: elements.overlay, dialogs: services.dialogs,
    /**
     * 範囲移動後にOCRプレビューを更新する。
     * @param reg 対象範囲
     * @returns 戻り値なし
     */
    onGeometryChanged: reg => source.refreshPreview(reg),
    /**
     * 編集確定を通知する。永続化は設定監視が担当する。
     * @returns 戻り値なし
     */
    onGeometryCommitted: () => { /* 保存は自動保存が行う */ },
  });

  const monitor = useMonitor({
    regions, source, fps: toRef(common, 'fps'),
    isBusy: editor.dragging,
    enqueue: runner.enqueue,
    /**
     * 現在の映像寸法とランタイム情報を説明する。
     * @returns 映像状態文
     */
    describeVideo: () => {
      const v = elements.video.value;
      return `映像 ${v?.videoWidth ?? 0}x${v?.videoHeight ?? 0} readyState=${v?.readyState ?? 0} ／ ${describeRuntimes()}`;
    },
  });

  const regionSets = useRegionSets({
    regions, repository: new RegionSetRepository(services.store), dialogs: services.dialogs,
    download: services.download, selected: toRef(common, 'setName'),
  });
  regionSets.refresh(common.setName);

  const ndl = useNdlModels(ndlModels, services.dialogs);

  return {
    elements, common, progress, ctrlPressed,
    regions, log, viewport, editor, monitor, regionSets, ndl, settings,
    dialogs: services.dialogs,
    actions: {
      onOcrImageSettingChanged,
      /**
       * 検知設定変更後に基準状態を初期化する。
       * @param det 対象検知範囲
       * @returns 戻り値なし
       */
      onDetectSettingChanged: (det: DetectView) => regions.resetItem(det, true),
      /**
       * 指定OCR範囲の手動読み取りをキューへ登録する。
       * @param reg 対象範囲
       * @returns 戻り値なし
       */
      readNow(reg: OcrView) {
        regions.resetItem(reg, true);
        runner.enqueue(reg, '手動');
      },
      /**
       * 現在の検知範囲画像をリファレンスとして保存する。
       * @param det 対象検知範囲
       * @returns 戻り値なし
       */
      captureReference(det: DetectView) {
        const err = source.videoError();
        if (err) { services.dialogs.alert('映像を取得できません: ' + err); return; }
        det.det.refImage = source.captureReferenceImage(det);
        regions.resetItem(det, true);
      },
    },
  };
}

export type Workspace = ReturnType<typeof createWorkspace>;
const workspaceKey: InjectionKey<Workspace> = Symbol('workspace');

/** Workspaceを子コンポーネントへ提供する。
 * @param workspace 共有する状態
 * @returns 戻り値なし
 */
export function provideWorkspace(workspace: Workspace) { provide(workspaceKey, workspace); }

/**
 * 提供されたWorkspaceを取得し、未提供なら例外を投げる。
 * @returns 共有状態
 */
export function useWorkspace(): Workspace {
  const ws = inject(workspaceKey);
  if (!ws) throw new Error('Workspace が提供されていません');
  return ws;
}
