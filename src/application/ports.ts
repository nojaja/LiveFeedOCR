import type { GraySample } from '../domain/image-filter.ts';
import type { StatusMessage, Verdict, DetectionState } from '../domain/change-detection.ts';
import type { DetectRegion, OcrRegion } from '../domain/region.ts';

export type ImageSurface = HTMLCanvasElement;

/** 型契約の引数型を実行可能な署名へまとめる。各関数本体は型参照専用で呼び出さない。 */
class PortSignatures {
  /**
   * キーバリュー読み取りシグネチャ。
   * @param key キー
   * @returns 保存値
   */
  static getItem(key: string): string | null { void key; throw new Error('型契約専用'); }

  /**
   * キーバリュー書き込みシグネチャ。
   * @param key キー
   * @param value 値
   * @returns 保存処理
   */
  static setItem(key: string, value: string): void { void key; void value; throw new Error('型契約専用'); }

  /**
   * OCR認識シグネチャ。
   * @param image 認識画像
   * @returns 認識テキスト
   */
  static recognize(image: ImageSurface): Promise<string> { void image; throw new Error('型契約専用'); }

  /**
   * QR読み取りシグネチャ。
   * @param candidates 候補画像
   * @returns QR内容またはnull
   */
  static readQr(candidates: ImageSurface[]): string | null { void candidates; throw new Error('型契約専用'); }

  /**
   * 通知シグネチャ。
   * @param message 通知文
   * @returns 戻り値なし
   */
  static alert(message: string): void { void message; throw new Error('型契約専用'); }

  /**
   * 確認シグネチャ。
   * @param message 確認文
   * @returns 承認結果
   */
  static confirm(message: string): boolean { void message; throw new Error('型契約専用'); }

  /**
   * 進捗通知シグネチャ。
   * @param message 進捗文
   * @returns 戻り値なし
   */
  static reportProgress(message: string): void { void message; throw new Error('型契約専用'); }

  /**
   * Blobダウンロードシグネチャ。
   * @param blob 出力データ
   * @param fileName 出力名
   * @returns 戻り値なし
   */
  static download(blob: Blob, fileName: string): void { void blob; void fileName; throw new Error('型契約専用'); }

  /**
   * クリップボード書き込みシグネチャ。
   * @param text コピー文字列
   * @returns コピー処理
   */
  static copyText(text: string): Promise<void> { void text; throw new Error('型契約専用'); }

  /**
   * プレビュー更新シグネチャ。
   * @template O OCR範囲型
   * @param reg OCR範囲
   * @returns 更新結果
   */
  static refreshPreview<O extends OcrRegion>(reg: O): boolean { void reg; throw new Error('型契約専用'); }

  /**
   * プレビュー準備状態シグネチャ。
   * @template O OCR範囲型
   * @param reg OCR範囲
   * @returns 準備済みならtrue
   */
  static previewReady<O extends OcrRegion>(reg: O): boolean { void reg; throw new Error('型契約専用'); }

  /**
   * プレビュー画像取得シグネチャ。
   * @template O OCR範囲型
   * @param reg OCR範囲
   * @returns プレビュー画像
   */
  static previewSurface<O extends OcrRegion>(reg: O): ImageSurface { void reg; throw new Error('型契約専用'); }

  /**
   * 代替画像取得シグネチャ。
   * @template O OCR範囲型
   * @param reg OCR範囲
   * @returns 代替画像
   */
  static fallbackSurface<O extends OcrRegion>(reg: O): ImageSurface | null { void reg; throw new Error('型契約専用'); }

  /**
   * プレビューサンプル取得シグネチャ。
   * @template O OCR範囲型
   * @param reg OCR範囲
   * @returns グレー画像
   */
  static samplePreview<O extends OcrRegion>(reg: O): GraySample { void reg; throw new Error('型契約専用'); }

  /**
   * 検知サンプル取得シグネチャ。
   * @template D 検知範囲型
   * @param det 検知範囲
   * @returns グレー画像
   */
  static sampleDetect<D extends DetectRegion>(det: D): GraySample { void det; throw new Error('型契約専用'); }

  /**
   * リファレンスサンプル取得シグネチャ。
   * @template D 検知範囲型
   * @param det 検知範囲
   * @param w 画像幅
   * @param h 画像高さ
   * @returns グレー画像またはnull
   */
  static referenceSample<D extends DetectRegion>(det: D, w: number, h: number): GraySample | null {
    void det; void w; void h; throw new Error('型契約専用');
  }

  /**
   * 検知状態取得シグネチャ。
   * @template O OCR範囲型
   * @template D 検知範囲型
   * @param item 範囲
   * @returns 検知状態
   */
  static detectionOf<O, D>(item: O | D): DetectionState { void item; throw new Error('型契約専用'); }

  /**
   * 判定報告シグネチャ。
   * @template O OCR範囲型
   * @template D 検知範囲型
   * @param item 範囲
   * @param verdict 判定
   * @returns 戻り値なし
   */
  static report<O, D>(item: O | D, verdict: Verdict): void { void item; void verdict; throw new Error('型契約専用'); }

  /**
   * 状態報告シグネチャ。
   * @template O OCR範囲型
   * @template D 検知範囲型
   * @param item 範囲
   * @param message 表示内容
   * @returns 戻り値なし
   */
  static setStatus<O, D>(item: O | D, message: StatusMessage): void { void item; void message; throw new Error('型契約専用'); }

  /**
   * OCRジョブ登録シグネチャ。
   * @template O OCR範囲型
   * @param reg OCR範囲
   * @param reason 実行理由
   * @returns 戻り値なし
   */
  static enqueue<O>(reg: O, reason: string): void { void reg; void reason; throw new Error('型契約専用'); }

  /**
   * 静かなリセットシグネチャ。
   * @template O OCR範囲型
   * @param reg OCR範囲
   * @returns 戻り値なし
   */
  static resetSilently<O>(reg: O): void { void reg; throw new Error('型契約専用'); }
}

export type DownloadHandler = typeof PortSignatures.download;
export type ClipboardWriter = typeof PortSignatures.copyText;

// ---- 出力ポート（インフラ層が実装する） ----
export interface KeyValueStore {
  getItem: typeof PortSignatures.getItem;
  setItem: typeof PortSignatures.setItem;
}

export interface TextRecognizer {
  recognize: typeof PortSignatures.recognize;
}

export interface QrReader {
  read: typeof PortSignatures.readQr;
}

export interface Dialogs {
  alert: typeof PortSignatures.alert;
  confirm: typeof PortSignatures.confirm;
}

export type ProgressReporter = typeof PortSignatures.reportProgress;

// 判定対象の映像・画像処理（canvasなどの実装を隠す）
export interface RegionImageSource<O extends OcrRegion = OcrRegion, D extends DetectRegion = DetectRegion> {
  videoError(): string;
  refreshPreview: typeof PortSignatures.refreshPreview<O>;
  previewReady: typeof PortSignatures.previewReady<O>;
  previewSurface: typeof PortSignatures.previewSurface<O>;
  fallbackSurface: typeof PortSignatures.fallbackSurface<O>;
  samplePreview: typeof PortSignatures.samplePreview<O>;
  sampleDetect: typeof PortSignatures.sampleDetect<D>;
  referenceSample: typeof PortSignatures.referenceSample<D>;
}

export interface MonitorSink<O, D> {
  detectionOf: typeof PortSignatures.detectionOf<O, D>;
  report: typeof PortSignatures.report<O, D>;
  setStatus: typeof PortSignatures.setStatus<O, D>;
  enqueue: typeof PortSignatures.enqueue<O>;
  resetSilently: typeof PortSignatures.resetSilently<O>;
}
