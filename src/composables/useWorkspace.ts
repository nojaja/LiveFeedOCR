import { inject, onUnmounted, provide, ref, shallowRef, toRef, type InjectionKey } from 'vue';
import { RegionSetRepository, ResultLogRepository, SettingsRepository } from '../application/repositories.ts';
import type { Dialogs, KeyValueStore } from '../application/ports.ts';
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
  download: (blob: Blob, fileName: string) => void;
  copyText: (text: string) => Promise<void>;
}

export const browserServices: WorkspaceServices = {
  store: browserStore,
  dialogs: browserDialogs,
  download: downloadBlob,
  copyText: copyTextToClipboard,
};

// 画面全体で共有する状態・振る舞いを組み立てる（各コンポーネントは inject で必要な部分だけ使う）
export function createWorkspace(services: WorkspaceServices = browserServices) {
  const elements = {
    video: shallowRef<HTMLVideoElement | null>(null),
    overlay: shallowRef<HTMLCanvasElement | null>(null),
    wrapper: shallowRef<HTMLElement | null>(null),
    stage: shallowRef<HTMLElement | null>(null),
  };
  const progress = ref('');
  const report = (message: string) => { progress.value = message; };

  const ctrlPressed = useControlKey();
  const common = useCommonSettings();
  let clearQueue = () => {};
  const regions = useRegions({ onClear: () => clearQueue() });
  const settings = usePersistedSettings({ repository: new SettingsRepository(services.store), regions, common });
  const log = useOcrLog({
    repository: new ResultLogRepository(services.store),
    dialogs: services.dialogs, download: services.download, copyText: services.copyText,
  });

  const source = new CanvasRegionImageSource({
    getVideo: () => elements.video.value,
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

  // 範囲の画像が変わったので、変化とは見なさず基準を取り直す
  function onOcrImageSettingChanged(reg: OcrView) {
    reg.rt.detection.accum = null;
    try { source.refreshPreview(reg); } catch (e) { console.warn(e); }
    regions.resetItem(reg, true);
  }

  const editor = useRegionEditor({
    regions, viewport, wrapper: elements.wrapper, video: elements.video, overlay: elements.overlay, dialogs: services.dialogs,
    onGeometryChanged: reg => source.refreshPreview(reg),
    onGeometryCommitted: () => { /* 保存は自動保存が行う */ },
  });

  const monitor = useMonitor({
    regions, source, fps: toRef(common, 'fps'),
    isBusy: editor.dragging,
    enqueue: runner.enqueue,
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
      onDetectSettingChanged: (det: DetectView) => regions.resetItem(det, true),
      readNow(reg: OcrView) {
        regions.resetItem(reg, true);
        runner.enqueue(reg, '手動');
      },
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

export function provideWorkspace(workspace: Workspace) { provide(workspaceKey, workspace); }

export function useWorkspace(): Workspace {
  const ws = inject(workspaceKey);
  if (!ws) throw new Error('Workspace が提供されていません');
  return ws;
}
