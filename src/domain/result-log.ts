export interface LogEntry {
  id: string;
  time: number;
  region: string;
  method: string;
  reason: string;
  text: string;
  updates: number;
}

export interface NewResult {
  text: string;
  reason: string;
  region?: string;
  method?: string;
  prefixUpdate?: boolean;
}

export function pad2(n: number): string { return String(n).padStart(2, '0'); }

export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
         `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function newLogId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// 以前のバージョンで保存されたログにも削除用のIDを付ける
export function normalizeLog(raw: unknown, makeId: () => string = newLogId): LogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e: any) => (e.id ? e : { ...e, id: makeId() }));
}

// OCR結果のスペース・改行の除去（全角スペースも含む）
export function stripWhitespace(text: string): string {
  return text.replace(/[\s\u3000]+/g, '');
}

export function normalizePaddleOcrResult(result: any): string {
  if (!result || !Array.isArray(result.items) || result.items.some((item: any) => !item || typeof item.text !== 'string')) {
    throw new Error('Invalid PaddleOCR result: expected an items array with text strings');
  }
  return result.items.map((item: any) => item.text).filter(Boolean).join('\n');
}

// 結果を追加する。prefixUpdate=true で、同じ範囲の前回結果と前方一致するなら
// 「文字送りで文字が増えた」とみなし、新規行を作らず前回の行を更新する
export function addResult(
  entries: LogEntry[], input: NewResult, now: number, id: string,
): { entries: LogEntry[]; entry: LogEntry; merged: boolean } {
  const { text, reason, region, method, prefixUpdate } = input;
  if (prefixUpdate && text) {
    let idx = -1;
    for (let i = entries.length - 1; i >= 0; i--) {
      if ((entries[i].region || '') === (region || '')) { idx = i; break; }
    }
    const prev = idx >= 0 ? entries[idx] : null;
    if (prev && prev.text && text.startsWith(prev.text)) {
      const entry: LogEntry = {
        ...prev, text, time: now, reason, method: method || '', updates: (prev.updates || 0) + 1,
      };
      const next = entries.slice();
      next[idx] = entry;
      return { entries: next, entry, merged: true };
    }
  }
  const entry: LogEntry = { id, time: now, region: region || '', method: method || '', reason, text, updates: 0 };
  return { entries: [...entries, entry], entry, merged: false };
}

export function removeEntry(entries: LogEntry[], id: string): LogEntry[] {
  return entries.filter(e => e.id !== id);
}

export function csvEscape(value: unknown): string {
  return '"' + String(value).replace(/"/g, '""') + '"';
}

export function buildCsv(entries: LogEntry[]): string {
  const lines = ['日時,範囲,方式,実行理由,結果'];
  entries.forEach(e => {
    lines.push([formatTime(e.time), e.region || '', e.method || '', e.reason, e.text].map(csvEscape).join(','));
  });
  // 先頭にBOMを付けてExcelでも日本語が文字化けしないようにする
  return '\ufeff' + lines.join('\r\n');
}

export function csvFileName(now: Date): string {
  return `ocr_results_${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_` +
         `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}.csv`;
}

export function describeLogEntry(entry: LogEntry): string {
  const parts = [formatTime(entry.time), entry.region, entry.method, entry.reason];
  if (entry.updates) parts.push(`文字送り更新 ×${entry.updates}`);
  return parts.filter(Boolean).join(' ／ ');
}
