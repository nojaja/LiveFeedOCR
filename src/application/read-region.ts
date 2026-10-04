import { stripWhitespace } from '../domain/result-log.ts';
import type { OcrEngine, OcrRegion } from '../domain/region.ts';
import type { ImageSurface, QrReader, TextRecognizer } from './ports.ts';

export const ENGINE_LABELS: Record<OcrEngine, string> = {
  tesseract: 'Tesseract',
  ndl: 'NDLOCR-Lite',
  paddle: 'PaddleOCR',
};

export type ReadOutcome =
  | { kind: 'not-found'; method: 'QR' }
  | { kind: 'text'; method: string; text: string; engine: OcrEngine | 'qr' };

export interface ReadDeps {
  recognizers: Record<OcrEngine, TextRecognizer>;
  qr: QrReader;
}

export interface ReadInput {
  preview: ImageSurface;
  fallback: ImageSurface | null;
}

/**
 * 処理名: 領域読み取り
 * 処理概要: OCRまたはQRの設定に応じて画像を読み取り、結果を整える。
 * 実装理由: 認識エンジン選択と後処理を画面層から分離するため。
 * @param region 読み取り対象と設定
 * @param input 入力画像
 * @param deps 認識器とQR読み取り器
 * @returns 認識結果
 */
export async function readRegion(
  region: Pick<OcrRegion, 'read'>, input: ReadInput, deps: ReadDeps,
): Promise<ReadOutcome> {
  if (region.read.type === 'qr') {
    const candidates = input.fallback ? [input.preview, input.fallback] : [input.preview];
    const text = deps.qr.read(candidates);
    return text === null ? { kind: 'not-found', method: 'QR' } : { kind: 'text', method: 'QR', text, engine: 'qr' };
  }
  const engine: OcrEngine = region.read.engine in deps.recognizers ? region.read.engine : 'tesseract';
  let text = (await deps.recognizers[engine].recognize(input.preview)).trim();
  if (region.read.stripWs) text = stripWhitespace(text);
  return { kind: 'text', method: ENGINE_LABELS[engine], text, engine };
}
