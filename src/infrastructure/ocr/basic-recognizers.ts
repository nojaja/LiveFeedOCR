import type { ProgressReporter, QrReader, TextRecognizer } from '../../application/ports.ts';
import { normalizePaddleOcrResult } from '../../domain/result-log.ts';

// ----- Tesseract.js（ワーカーを使い回す） -----
export class TesseractRecognizer implements TextRecognizer {
  private worker: any = null;
  private workerLang: string | null = null;
  private getLang: () => string;
  private report: ProgressReporter;

  constructor(getLang: () => string, report: ProgressReporter) {
    this.getLang = getLang;
    this.report = report;
  }

  private async getWorker(lang: string) {
    const Tesseract = (globalThis as any).Tesseract;
    if (typeof Tesseract === 'undefined') throw new Error('Tesseract.js が読み込まれていません（ネット接続を確認）');
    if (this.worker && this.workerLang === lang) return this.worker;
    if (this.worker) { await this.worker.terminate(); this.worker = null; }

    this.report('OCRエンジンを準備中... (初回は言語データのダウンロードに数秒かかります)');
    this.worker = await Tesseract.createWorker(lang, 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') this.report(`文字を認識中... ${Math.round(m.progress * 100)}%`);
        else this.report(`準備中: ${m.status}...`);
      },
    });
    this.workerLang = lang;
    return this.worker;
  }

  async recognize(canvas: HTMLCanvasElement): Promise<string> {
    const w = await this.getWorker(this.getLang());
    const result = await w.recognize(canvas.toDataURL('image/png'));
    return result.data.text;
  }

  dispose(): void {
    if (!this.worker) return;
    void this.worker.terminate().catch((err: unknown) => console.warn('OCRワーカーの終了に失敗:', err));
    this.worker = null;
    this.workerLang = null;
  }
}

// ----- PaddleOCR.js（ブラウザー内モデル推論。初期化済みインスタンスを共有） -----
export class PaddleRecognizer implements TextRecognizer {
  private enginePromise: Promise<any> | null = null;
  private report: ProgressReporter;

  constructor(report: ProgressReporter) { this.report = report; }

  async recognize(canvas: HTMLCanvasElement): Promise<string> {
    if (!this.enginePromise) {
      this.report('PaddleOCRモデルを準備中...（初回はモデルのダウンロードが必要です）');
      this.enginePromise = import('@paddleocr/paddleocr-js').then(({ PaddleOCR }) => PaddleOCR.create({
        lang: 'japan',
        ocrVersion: 'PP-OCRv5',
        worker: true,
        ortOptions: {
          backend: 'wasm',
          numThreads: 1,
          wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/',
        },
      })).catch(error => {
        this.enginePromise = null;
        throw error;
      });
    }
    const engine = await this.enginePromise;
    this.report('PaddleOCRで認識中...');
    const [result] = await engine.predict(canvas);
    return normalizePaddleOcrResult(result);
  }
}

// ----- QRコード（jsQR） -----
export class JsQrReader implements QrReader {
  read(candidates: HTMLCanvasElement[]): string | null {
    const jsQR = (globalThis as any).jsQR;
    if (typeof jsQR === 'undefined') throw new Error('jsQR が読み込まれていません（ネット接続を確認）');
    // 加工後のプレビュー画像から順に、だめなら次の候補（加工前の切り出し画像）で試す
    for (const c of candidates) {
      const cx = c.getContext('2d')!;
      const id = cx.getImageData(0, 0, c.width, c.height);
      const r = jsQR(id.data, c.width, c.height, { inversionAttempts: 'attemptBoth' });
      if (r) return r.data;
    }
    return null;
  }
}
