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

/** 処理名: 2桁整形
 * 処理概要: 数値を先頭ゼロ付き2桁文字列にする。
 * 実装理由: 日時の固定幅表示に利用するため。
 * @param n 整形対象値
 * @returns 2桁表現
 */
export function pad2(n: number): string { return String(n).padStart(2, '0'); }

/** 処理名: 日時整形
 * 処理概要: 時刻をローカル日時文字列へ変換する。
 * 実装理由: ログとCSVの表示形式を統一するため。
 * @param ms Unix時刻ミリ秒
 * @returns 日時文字列
 */
export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
         `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** 処理名: ログID生成
 * 処理概要: ログ項目に使用する一意性の高いIDを生成する。
 * 実装理由: 保存済み結果を識別・削除できるようにするため。
 * @returns 新しいログID
 */
export function newLogId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/** 処理名: 保存ログ正規化
 * 処理概要: 古いログ項目に不足するIDを補完する。
 * 実装理由: 旧形式のログも現行UIで扱うため。
 * @param raw 読み込んだ値
 * @param makeId ID生成関数
 * @returns 正規化済みログ一覧
 */
export function normalizeLog(raw: unknown, makeId: () => string = newLogId): LogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e: any) => (e.id ? e : { ...e, id: makeId() }));
}

/** 処理名: 空白除去
 * 処理概要: 半角・全角スペースと改行を除去する。
 * 実装理由: OCR結果比較と文字送り判定を安定させるため。
 * @param text 入力文字列
 * @returns 空白除去済み文字列
 */
export function stripWhitespace(text: string): string {
  return text.replace(/[\s\u3000]+/g, '');
}

/** 処理名: PaddleOCR結果正規化
 * 処理概要: 行配列を検証して改行区切りの文字列へ変換する。
 * 実装理由: 外部SDKの応答を内部の文字列契約に合わせるため。
 * @param result SDK応答データ
 * @returns 認識テキスト
 */
export function normalizePaddleOcrResult(result: unknown): string {
  if (!result || typeof result !== 'object' || !('items' in result) || !Array.isArray(result.items)) {
    throw new Error('Invalid PaddleOCR result: expected an items array with text strings');
  }
  if (!result.items.every(isPaddleOcrItem)) {
    throw new Error('Invalid PaddleOCR result: expected an items array with text strings');
  }
  return result.items.map(item => item.text).filter(Boolean).join('\n');
}

/** PaddleOCRの行要素に文字列テキストがあるかを検証する。
 * @param item 検証対象
 * @returns 正しい行要素ならtrue
 */
function isPaddleOcrItem(item: unknown): item is { text: string } {
  return typeof item === 'object' && item !== null && 'text' in item && typeof item.text === 'string';
}

/** 処理名: 結果ログ追加
 * 処理概要: OCR結果を追加し、文字送りなら前回行を更新する。
 * 実装理由: 連続認識を重複行ではなく更新履歴として扱うため。
 * @param entries 現在のログ
 * @param input 追加する認識結果
 * @param now 記録時刻
 * @param id 新規項目ID
 * @returns 更新後のログと対象項目
 */
export function addResult(
  entries: LogEntry[], input: NewResult, now: number, id: string,
): { entries: LogEntry[]; entry: LogEntry; merged: boolean } {
  const { text, reason, region, method, prefixUpdate } = input;
  if (prefixUpdate && text) {
    const idx = findPreviousRegion(entries, region);
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

/** 処理名: 前回範囲検索
 * 処理概要: 指定範囲の最新ログ位置を後方から探す。
 * 実装理由: 文字送り更新対象を取得するため。
 * @param entries ログ一覧
 * @param region 範囲名
 * @returns 一致位置。存在しなければ-1
 */
function findPreviousRegion(entries: LogEntry[], region?: string): number {
  for (let i = entries.length - 1; i >= 0; i--) {
    if ((entries[i].region || '') === (region || '')) return i;
  }
  return -1;
}

/** 処理名: ログ項目削除
 * 処理概要: 指定IDの項目を除いた配列を返す。
 * 実装理由: ログ削除操作を不変データで実現するため。
 * @param entries ログ一覧
 * @param id 削除対象ID
 * @returns 削除後のログ一覧
 */
export function removeEntry(entries: LogEntry[], id: string): LogEntry[] {
  return entries.filter(e => e.id !== id);
}

/** 処理名: CSVセルエスケープ
 * 処理概要: 値をCSVの引用セルへ変換する。
 * 実装理由: カンマや引用符を含む文字列を安全に出力するため。
 * @param value セル値
 * @returns エスケープ済みセル
 */
export function csvEscape(value: unknown): string {
  return '"' + String(value).replace(/"/g, '""') + '"';
}

/** 処理名: ログCSV生成
 * 処理概要: ログ一覧をBOM付きCSV文字列へ変換する。
 * 実装理由: 表計算ソフトで日本語を含むログを利用できるようにするため。
 * @param entries ログ一覧
 * @returns CSV文字列
 */
export function buildCsv(entries: LogEntry[]): string {
  const lines = ['日時,範囲,方式,実行理由,結果'];
  entries.forEach(e => {
    lines.push([formatTime(e.time), e.region || '', e.method || '', e.reason, e.text].map(csvEscape).join(','));
  });
  // 先頭にBOMを付けてExcelでも日本語が文字化けしないようにする
  return '\ufeff' + lines.join('\r\n');
}

/** 処理名: CSVファイル名生成
 * 処理概要: 現在日時を含むログCSV名を生成する。
 * 実装理由: エクスポートファイルを識別しやすくするため。
 * @param now 基準日時
 * @returns CSVファイル名
 */
export function csvFileName(now: Date): string {
  return `ocr_results_${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_` +
         `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}.csv`;
}

/** 処理名: ログ説明生成
 * 処理概要: 日時、範囲、方式、理由を一行にまとめる。
 * 実装理由: ログ項目のアクセシブルな説明に用いるため。
 * @param entry ログ項目
 * @returns 説明文
 */
export function describeLogEntry(entry: LogEntry): string {
  const parts = [formatTime(entry.time), entry.region, entry.method, entry.reason];
  if (entry.updates) parts.push(`文字送り更新 ×${entry.updates}`);
  return parts.filter(Boolean).join(' ／ ');
}
