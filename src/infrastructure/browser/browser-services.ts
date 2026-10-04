import type { Dialogs, KeyValueStore } from '../../application/ports.ts';

export const browserStore: KeyValueStore = {
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
};

export const browserDialogs: Dialogs = {
  alert: message => window.alert(message),
  confirm: message => window.confirm(message),
};

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
export function describeRuntimes(): string {
  const g = globalThis as any;
  return `Tesseract: ${typeof g.Tesseract !== 'undefined' ? 'OK' : '未読込'}` +
    ` ／ ONNX: ${typeof g.ort !== 'undefined' ? 'OK' : '未読込'} ／ jsQR: ${typeof g.jsQR !== 'undefined' ? 'OK' : '未読込'}`;
}
