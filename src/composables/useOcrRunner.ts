import { JobQueue } from '../application/job-queue.ts';
import { readRegion, type ReadDeps } from '../application/read-region.ts';
import type { ProgressReporter, RegionImageSource } from '../application/ports.ts';
import type { OcrLog } from './useOcrLog.ts';
import type { OcrView, RegionsStore } from './useRegions.ts';

export interface OcrRunnerDeps {
  regions: RegionsStore;
  source: RegionImageSource<OcrView, any>;
  read: ReadDeps;
  log: OcrLog;
  report: ProgressReporter;
}

// 読み取りの待ち行列（範囲ごとに順番に実行）と、結果のログ記録
/**
 * 処理名: OCRジョブ実行管理
 * 処理概要: 範囲ごとにOCRを逐次実行し、進捗と結果を記録する。
 * 実装理由: エンジン競合を避け、結果処理を一箇所へ集約するため。
 * @param root0 依存関係一式
 * @param root0.regions 範囲ストア
 * @param root0.source 画像取得元
 * @param root0.read 読み取りユースケース依存
 * @param root0.log 結果ログ操作
 * @param root0.report 進捗通知
 * @returns ジョブ投入・消去操作
 */
export function useOcrRunner({ regions, source, read, log, report }: OcrRunnerDeps) {
  /** IDから現在存在するOCR範囲を検索する。
  * @param id 範囲ID
   * @returns 範囲。存在しなければundefined
   */
  const find = (id: number) => regions.ocrRegions.value.find(r => r.id === id);

  /** OCRジョブを処理して範囲状態とログを更新する。
  * @param root0 ジョブ情報
  * @param root0.key 範囲ID
  * @param root0.reason 実行理由
   * @returns 非同期処理
   */
  async function runJob({ key, reason }: { key: number; reason: string }) {
    const reg = find(key);
    if (!reg) return;
    try {
      // 加算/減算モードは直近のフレーム履歴の結果をそのまま使う
      if (reg.det.mode !== 'accum' || !source.previewReady(reg)) {
        if (!source.refreshPreview(reg)) return;
      }

      regions.setStatus(reg, { text: '読み取り中...', color: '#0d6efd' });
      const outcome = await readRegion(
        reg, { preview: source.previewSurface(reg), fallback: source.fallbackSurface(reg) }, read,
      );
      if (outcome.kind === 'not-found') {
        regions.setStatus(reg, { text: 'QRコードが見つかりません', color: '#dc3545' });
        report(`${reg.name}: QRコードが見つかりませんでした`);
        return;
      }

      if (reg.read.type !== 'ocr' || outcome.text || reason === '手動') {
        log.add({
          text: outcome.text, reason, region: reg.name, method: outcome.method,
          prefixUpdate: reg.read.type === 'ocr' && reg.read.prefixUpdate,
        });
      }
      if (outcome.engine !== 'ndl') report(`${reg.name}: 完了`);
      regions.setStatus(reg, { text: '読み取り完了', color: '#198754' });
    } catch (err: any) {
      console.error(err);
      report(`${reg.name}: 読み取り中にエラーが発生しました: ${err.message}`);
      regions.setStatus(reg, { text: '読み取りエラー', color: '#dc3545' });
    }
  }

  const queue = new JobQueue<number>(
    runJob,
    id => !!find(id),   // 待っている間に削除された範囲は読み取らない
    id => { const reg = find(id); if (reg) regions.setStatus(reg, { text: '読み取り待ち...', color: '#0d6efd' }); },
  );

  return {
    /** 読み取りジョブをキューへ登録する。
     * @param reg OCR範囲
     * @param reason 実行理由
     * @returns 登録できた場合true
     */
    enqueue: (reg: OcrView, reason: string) => queue.enqueue(reg.id, reason),
    /** 待機中のOCRジョブを消去する。
     * @returns 戻り値なし
     */
    clearQueue: () => queue.clear(),
  };
}

export type OcrRunner = ReturnType<typeof useOcrRunner>;
