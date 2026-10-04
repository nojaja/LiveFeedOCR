import { normalizeLog, type LogEntry } from '../domain/result-log.ts';
import type { RegionSnapshot } from '../domain/region.ts';
import type { KeyValueStore } from './ports.ts';

export const SETTINGS_KEY = 'ocrSettingsV1';
export const SETS_KEY = 'ocrRegionSetsV1';
export const LOG_KEY = 'ocrResultLogV1';

export interface CommonSettings { fps: string; lang: string; setName: string }
export interface StoredSettings { snap?: RegionSnapshot; common?: Partial<CommonSettings>; ocrRegions?: any[]; [k: string]: any }

function readJson<T>(store: KeyValueStore, key: string, fallback: T): T {
  try {
    const raw = store.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    console.warn(`${key} の読み込みに失敗:`, err);
    return fallback;
  }
}

export class SettingsRepository {
  private store: KeyValueStore;
  constructor(store: KeyValueStore) { this.store = store; }

  load(): StoredSettings | null {
    const data = readJson<StoredSettings | null>(this.store, SETTINGS_KEY, null);
    return data && typeof data === 'object' ? data : null;
  }

  save(snap: RegionSnapshot, common: CommonSettings): void {
    try {
      this.store.setItem(SETTINGS_KEY, JSON.stringify({ snap, common }));
    } catch (err) {
      console.warn('設定の保存に失敗:', err);
    }
  }
}

export class RegionSetRepository {
  private store: KeyValueStore;
  constructor(store: KeyValueStore) { this.store = store; }

  readAll(): Record<string, RegionSnapshot> {
    const o = readJson<any>(this.store, SETS_KEY, {});
    return o && typeof o === 'object' ? o : {};
  }

  // 保存に失敗したら例外を投げる（容量超過など）
  writeAll(sets: Record<string, RegionSnapshot>): void {
    this.store.setItem(SETS_KEY, JSON.stringify(sets));
  }
}

export class ResultLogRepository {
  private store: KeyValueStore;
  constructor(store: KeyValueStore) { this.store = store; }

  load(): LogEntry[] {
    return normalizeLog(readJson<unknown>(this.store, LOG_KEY, []));
  }

  save(entries: LogEntry[]): void {
    try {
      this.store.setItem(LOG_KEY, JSON.stringify(entries));
    } catch (err) {
      console.warn('ログの保存に失敗:', err);
    }
  }
}
