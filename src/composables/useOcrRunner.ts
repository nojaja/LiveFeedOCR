import { JobQueue } from '../application/job-queue.ts';
import { readRegion, type ReadDeps } from '../application/read-region.ts';
import type { RegionImageSource } from '../application/ports.ts';
import type { OcrLog } from './useOcrLog.ts';
import type { OcrView, RegionsStore } from './useRegions.ts';

export interface OcrRunnerDeps {
  regions: RegionsStore;
  source: RegionImageSource<OcrView, any>;
  read: ReadDeps;
  log: OcrLog;
  report: (message: string) => void;
}

// 読み取りの待ち行列（範囲ごとに順番に実行）と、結果のログ記録
export function useOcrRunner({ regions, source, read, log, report }: OcrRunnerDeps) {
  const find = (id: number) => regions.ocrRegions.value.find(r => r.id === id);

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

      log.add({
        text: outcome.text, reason, region: reg.name, method: outcome.method,
        prefixUpdate: reg.read.type === 'ocr' && reg.read.prefixUpdate,
      });
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
    enqueue: (reg: OcrView, reason: string) => queue.enqueue(reg.id, reason),
    clearQueue: () => queue.clear(),
  };
}

export type OcrRunner = ReturnType<typeof useOcrRunner>;
