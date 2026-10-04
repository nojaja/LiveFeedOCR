import { normalizeLog, type LogEntry } from '../domain/result-log.ts';
import type { RegionSnapshot } from '../domain/region.ts';
import type { KeyValueStore } from './ports.ts';

export const SETTINGS_KEY = 'ocrSettingsV1';
export const SETS_KEY = 'ocrRegionSetsV1';
export const LOG_KEY = 'ocrResultLogV1';

export interface CommonSettings { fps: string; lang: string; setName: string }
export interface StoredSettings { snap?: RegionSnapshot; common?: Partial<CommonSettings>; ocrRegions?: any[]; [k: string]: any }

/**
 * 処理名: JSON設定読み込み
 * 処理概要: キーバリューストアからJSONを読み、失敗時は既定値を返す。
 * 実装理由: 不正データや読み込み失敗を永続化層で隔離するため。
 * @param store 保存先
 * @param key 項目キー
 * @param fallback 読み込み失敗時の値
 * @returns 読み込んだ値または既定値
 */
function readJson<T>(store: KeyValueStore, key: string, fallback: T): T {
  try {
    const raw = store.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    console.warn(`${key} の読み込みに失敗:`, err);
    return fallback;
  }
}

/** 共通設定の永続化を担当するリポジトリ。 */
export class SettingsRepository {
  private store: KeyValueStore;
  /** @param store 設定を保存するキーバリューストア */
  constructor(store: KeyValueStore) { this.store = store; }

  /**
   * 処理名: 共通設定読み込み
   * 処理概要: 永続化された設定を復元する。
   * 実装理由: アプリ再起動後もユーザー設定を保持するため。
   * @returns 設定データ。未保存ならnull
   */
  load(): StoredSettings | null {
    const data = readJson<StoredSettings | null>(this.store, SETTINGS_KEY, null);
    return data && typeof data === 'object' ? data : null;
  }

  /**
   * 処理名: 共通設定保存
   * 処理概要: 範囲と共通設定を永続化する。
   * 実装理由: 編集内容を次回起動へ引き継ぐため。
   * @param snap 範囲スナップショット
   * @param common 共通設定
   * @returns 戻り値なし
   */
  save(snap: RegionSnapshot, common: CommonSettings): void {
    try {
      this.store.setItem(SETTINGS_KEY, JSON.stringify({ snap, common }));
    } catch (err) {
      console.warn('設定の保存に失敗:', err);
    }
  }
}

/** 名前付き範囲セットの永続化を担当するリポジトリ。 */
export class RegionSetRepository {
  private store: KeyValueStore;
  /** @param store 範囲セットを保存するキーバリューストア */
  constructor(store: KeyValueStore) { this.store = store; }

  /**
   * 処理名: 全範囲セット読み込み
   * 処理概要: 保存済みセットを名前付きマップで返す。
   * 実装理由: セット選択UIへ一覧を提供するため。
   * @returns 範囲セット一覧
   */
  readAll(): Record<string, RegionSnapshot> {
    const o = readJson<any>(this.store, SETS_KEY, {});
    return o && typeof o === 'object' ? o : {};
  }

  /**
   * 処理名: 全範囲セット保存
   * 処理概要: 名前付きセット一覧を永続化する。
   * 実装理由: セットの追加・削除をまとめて保持するため。
   * @param sets 保存するセット一覧
   * @returns 戻り値なし
   */
  // 保存に失敗したら例外を投げる（容量超過など）
  writeAll(sets: Record<string, RegionSnapshot>): void {
    this.store.setItem(SETS_KEY, JSON.stringify(sets));
  }
}

/** OCR結果ログの永続化を担当するリポジトリ。 */
export class ResultLogRepository {
  private store: KeyValueStore;
  /** @param store ログを保存するキーバリューストア */
  constructor(store: KeyValueStore) { this.store = store; }

  /**
   * 処理名: 結果ログ読み込み
   * 処理概要: 保存済みログを正規化して復元する。
   * 実装理由: 旧ログ形式を含むデータをUIで利用するため。
   * @returns 正規化済みログ一覧
   */
  load(): LogEntry[] {
    return normalizeLog(readJson<unknown>(this.store, LOG_KEY, []));
  }

  /**
   * 処理名: 結果ログ保存
   * 処理概要: ログ一覧を永続化する。
   * 実装理由: 認識結果をセッション間で保持するため。
   * @param entries 保存するログ
   * @returns 戻り値なし
   */
  save(entries: LogEntry[]): void {
    try {
      this.store.setItem(LOG_KEY, JSON.stringify(entries));
    } catch (err) {
      console.warn('ログの保存に失敗:', err);
    }
  }
}
