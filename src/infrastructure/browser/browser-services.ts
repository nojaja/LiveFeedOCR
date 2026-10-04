import type { Dialogs, KeyValueStore } from '../../application/ports.ts';

export const browserStore: KeyValueStore = {
  /** キーに対応する保存文字列を読む。
   * @param key 保存キー
   * @returns 保存値。未登録ならnull
   */
  getItem: key => localStorage.getItem(key),
  /** 文字列値を指定キーで保存する。
   * @param key 保存キー
   * @param value 保存値
   * @returns 戻り値なし
   */
  setItem: (key, value) => localStorage.setItem(key, value),
};

export const browserDialogs: Dialogs = {
  /** ブラウザー標準の通知を表示する。
   * @param message 表示メッセージ
   * @returns 戻り値なし
   */
  alert: message => window.alert(message),
  /** ブラウザー標準の確認ダイアログを表示する。
   * @param message 確認メッセージ
   * @returns 利用者が承認した場合true
   */
  confirm: message => window.confirm(message),
};

/**
 * 処理名: Blobダウンロード
 * 処理概要: Blobを一時URL経由でブラウザーにダウンロードさせる。
 * 実装理由: ファイルI/Oをブラウザーサービス境界に閉じ込めるため。
 * @param blob 出力データ
 * @param fileName ダウンロード名
 * @returns 戻り値なし
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 処理名: クリップボードコピー
 * 処理概要: テキストをクリップボードへコピーする。
 * 実装理由: コピー機能のブラウザー依存処理を集約するため。
 * @param text コピーする内容
 * @returns コピー処理
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      console.warn('Clipboard APIでのコピーに失敗。選択コピーを試します:', error);
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.className = 'clipboard-proxy';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('このブラウザーではクリップボードへコピーできません');
}

// CDNから読み込んだ外部ランタイムの有無
/**
 * 処理名: ランタイム状態表示
 * 処理概要: OCR関連の外部ランタイム読み込み状態を説明する。
 * 実装理由: 起動時の診断情報を利用者へ提示するため。
 * @returns ランタイム状態文字列
 */
export function describeRuntimes(): string {
  const g = globalThis as any;
  return `Tesseract: ${typeof g.Tesseract !== 'undefined' ? 'OK' : '未読込'}` +
    ` ／ ONNX: ${typeof g.ort !== 'undefined' ? 'OK' : '未読込'} ／ jsQR: ${typeof g.jsQR !== 'undefined' ? 'OK' : '未読込'}`;
}
