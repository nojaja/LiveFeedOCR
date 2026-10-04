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

// 範囲の読み取り設定に従って、QRコードまたはOCRで文字列を取り出す
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
