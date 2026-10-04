import { onMounted, onUnmounted, ref, shallowRef, watchEffect, type Ref } from 'vue';
import { angleRad } from '../domain/region.ts';
import {
  computeDragRect, hitTest, rectFromDrag, resizeCursor, toPixels, type DragState, type Point,
} from '../domain/geometry.ts';
import { MAX_OCR_REGIONS } from '../domain/region.ts';
import { renderOverlay, type DraftRect } from '../infrastructure/canvas/overlay-renderer.ts';
import type { Dialogs } from '../application/ports.ts';
import type { OcrView, RegionView, RegionsStore } from './useRegions.ts';
import type { CaptureViewport } from './useCaptureViewport.ts';

/** 領域エディターコールバックの正確な型を保持する。 */
class RegionEditorCallbackSignatures {
  /**
   * 範囲形状変更を通知する。
   * @param reg OCR範囲
   * @returns 戻り値なし
   */
  static geometryChanged(reg: OcrView): void { void reg; }

  /**
   * 範囲形状確定を通知する。
   * @param item 編集対象範囲
   * @returns 戻り値なし
   */
  static geometryCommitted(item: RegionView): void { void item; }
}

export type DrawMode = 'ocr' | 'detect' | 'edit';

export interface RegionEditorOptions {
  regions: RegionsStore;
  viewport: CaptureViewport;
  wrapper: Ref<HTMLElement | null>;
  video: Ref<HTMLVideoElement | null>;
  overlay: Ref<HTMLCanvasElement | null>;
  dialogs: Dialogs;
  onGeometryChanged: typeof RegionEditorCallbackSignatures.geometryChanged;
  onGeometryCommitted: typeof RegionEditorCallbackSignatures.geometryCommitted;
}

// オーバーレイ上での範囲の描画・移動・リサイズ
/**
 * 処理名: 範囲エディター管理
 * 処理概要: ポインター入力で範囲を描画、移動、リサイズする。
 * 実装理由: Canvasオーバーレイの編集状態をComposableへ集約するため。
 * @param opts 範囲、表示要素、操作ポート
 * @returns 編集状態と操作ハンドラー
 */
export function useRegionEditor(opts: RegionEditorOptions) {
  const { regions, viewport, wrapper, video, overlay, dialogs } = opts;
  const drawMode = ref<DrawMode>('ocr');
  const cursor = ref('crosshair');
  const overlaySize = ref({ width: 0, height: 0 });
  const draft = shallowRef<DraftRect | null>(null);
  const drag = shallowRef<DragState | null>(null);
  let resizeObserver: ResizeObserver | null = null;

  /**
   * オーバーレイのピクセル寸法を返す。
   * @returns 現在の幅と高さ
   */
  const size = () => ({ width: overlay.value?.width || 0, height: overlay.value?.height || 0 });

  /**
   * 表示コンテナーに合わせてCanvas寸法を更新する。
   * @returns 戻り値なし
   */
  function resizeOverlay() {
    const host = wrapper.value, o = overlay.value;
    if (!host || !o) return;
    o.width = host.clientWidth;
    o.height = host.clientHeight;
    overlaySize.value = { width: o.width, height: o.height };
    viewport.refresh();
  }

  // 範囲・モード・描画中の枠・ズーム・パンが変わるたびに描き直す
  watchEffect(() => {
    const o = overlay.value;
    const ctx = o?.getContext('2d');
    if (!ctx) return;
    const s = overlaySize.value;
    const { zoom, panX, panY } = viewport.view;
    renderOverlay(ctx, {
      size: s,
      zoom,
      panX,
      panY,
      detect: regions.detectRegions.value,
      ocr: regions.ocrRegions.value,
      showHandles: drawMode.value === 'edit',
      draft: draft.value,
      nextId: regions.nextId.value,
    });
  }, { flush: 'post' });

  /**
   * 編集対象に合わせてカーソルを選択する。
   * @param p ポインター座標
   * @returns 戻り値なし
   */
  function updateCursor(p: Point | null) {
    if (drawMode.value !== 'edit') { cursor.value = 'crosshair'; return; }
    const hit = p ? hitTest(regions.allItems(), p, size()) : null;
    if (!hit) { cursor.value = 'default'; return; }
    cursor.value = hit.handle ? resizeCursor(hit.handle, angleRad(hit.item)) : 'move';
  }

  /**
   * 描画・編集モードを変更する。
   * @param mode 新しいモード
   * @returns 戻り値なし
   */
  function setDrawMode(mode: DrawMode) {
    drawMode.value = mode;
    updateCursor(null);
  }

  /**
   * ポインター押下からパン、編集、描画を開始する。
   * @param e ポインターイベント
   * @returns 戻り値なし
   */
  function onPointerDown(e: PointerEvent) {
    if (viewport.beginPan(e)) return;
    const p = viewport.toContentPoint(e.clientX, e.clientY);

    // 「範囲の移動とリサイズ」モード：掴んだ範囲/ハンドルのドラッグを開始
    if (drawMode.value === 'edit') {
      const hit = hitTest(regions.allItems(), p, size());
      if (hit) {
        overlay.value?.setPointerCapture(e.pointerId);
        drag.value = { item: hit.item, handle: hit.handle, startP: p, g0: toPixels(hit.item, size()) };
      }
      return;
    }

    overlay.value?.setPointerCapture(e.pointerId);
    draft.value = { startX: p.x, startY: p.y, curX: p.x, curY: p.y, mode: drawMode.value };
  }

  /**
   * ポインター移動に応じてパン、範囲編集、描画枠を更新する。
   * @param e ポインターイベント
   * @returns 戻り値なし
   */
  function onPointerMove(e: PointerEvent) {
    if (viewport.movePan(e)) return;
    const p = viewport.toContentPoint(e.clientX, e.clientY);
    const d = drag.value;
    if (d) { applyDrag(d, p); return; }
    if (!draft.value) { updateCursor(p); return; }
    draft.value = { ...draft.value, curX: p.x, curY: p.y };
  }

  /**
   * ドラッグ中の範囲矩形を更新する。
   * @param d ドラッグ状態
   * @param p 現在座標
   * @returns 戻り値なし
   */
  function applyDrag(d: DragState, p: Point) {
    const it = d.item as RegionView;
    Object.assign(it, computeDragRect(d, p, size()));
    if (it.kind === 'ocr') {
      it.rt.detection.accum = null;
      try { opts.onGeometryChanged(it); } catch (err) { console.warn(err); }
    }
  }

  /**
   * 範囲ドラッグを確定して検知基準をリセットする。
   * @returns 戻り値なし
   */
  function endDrag() {
    const d = drag.value;
    drag.value = null;
    if (!d) return;
    regions.resetItem(d.item as RegionView, true);   // 判定対象が変わったので基準を取り直す
    opts.onGeometryCommitted(d.item as RegionView);
  }

  /**
   * 描画枠を検証しOCRまたは検知範囲として登録する。
   * @returns 戻り値なし
   */
  function finishDrawing() {
    const d = draft.value;
    draft.value = null;
    if (!d) return;
    const rect = rectFromDrag({ x: d.startX, y: d.startY }, { x: d.curX, y: d.curY }, size());
    if (!rect) return;
    if (d.mode === 'ocr') {
      if (!regions.canAddOcr()) dialogs.alert(`OCR範囲は最大 ${MAX_OCR_REGIONS} 個までです。不要な範囲を削除してください。`);
      else regions.addOcr(rect);   // 追加直後に1回読み取る
    } else {
      regions.addDetect(rect);
    }
  }

  /**
   * ポインター解放時に現在の操作を確定する。
   * @param e ポインターイベント
   * @returns 戻り値なし
   */
  function onPointerUp() {
    if (viewport.endPan()) return;
    if (drag.value) endDrag();
    else finishDrawing();
  }

  /**
   * キャンセルされたドラッグ状態を解除する。
   * @returns 戻り値なし
   */
  function onPointerCancel() {
    if (viewport.endPan()) return;
    if (drag.value) endDrag();
    draft.value = null;
  }

  onMounted(() => {
    video.value?.addEventListener('loadedmetadata', resizeOverlay);
    window.addEventListener('resize', resizeOverlay);
    if (window.ResizeObserver && wrapper.value) {
      resizeObserver = new ResizeObserver(resizeOverlay);
      resizeObserver.observe(wrapper.value);
    }
    resizeOverlay();
  });

  onUnmounted(() => {
    video.value?.removeEventListener('loadedmetadata', resizeOverlay);
    window.removeEventListener('resize', resizeOverlay);
    resizeObserver?.disconnect();
  });

  return {
    drawMode, cursor,
    /**
     * 範囲編集ドラッグの実行状態を返す。
     * @returns ドラッグ中ならtrue
     */
    dragging: () => !!drag.value,
    setDrawMode,
    onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
  };
}

export type RegionEditor = ReturnType<typeof useRegionEditor>;
