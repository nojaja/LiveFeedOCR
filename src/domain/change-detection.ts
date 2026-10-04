import type { Detection } from './region.ts';
import type { AccumState, GraySample } from './image-filter.ts';

export const SAMPLE_BASE = 160;

export interface DetectionState {
  refFrame: GraySample | null;
  prevFrame: GraySample | null;
  pending: boolean;
  lastMotion: number;
  rebase: boolean;
  accum: AccumState | null;
  refInit: boolean;
  refCond: boolean;
  refPending: boolean;
  refSince: number;
}

export interface StatusMessage { text: string; color?: string }

export interface Metric {
  label: string;
  value: number;
  thr: number;
  met: boolean;
  scaleMax?: number;
}

export interface Verdict {
  fire: boolean;
  status?: StatusMessage;
  metric?: Metric;
}

export function createDetectionState(): DetectionState {
  return {
    refFrame: null, prevFrame: null, pending: false, lastMotion: 0, rebase: false, accum: null,
    refInit: false, refCond: false, refPending: false, refSince: 0,
  };
}

// 変化判定の基準を最初から取り直す。silent=true なら読み取りは起動しない
export function resetDetection(st: DetectionState, silent: boolean): void {
  st.refFrame = null;
  st.prevFrame = null;
  st.pending = false;
  st.rebase = !!silent;
  st.accum = null;
  st.refInit = false;
  st.refPending = false;
}

// 判定用に小さな解像度へ縮小するときのサイズ
export function sampleSize(sw: number, sh: number): { w: number; h: number } {
  const aspect = sw / sh;
  if (aspect >= 1) return { w: SAMPLE_BASE, h: Math.max(8, Math.round(SAMPLE_BASE / aspect)) };
  return { w: Math.max(8, Math.round(SAMPLE_BASE * aspect)), h: SAMPLE_BASE };
}

// 2画像間で「画素の差がしきい値を超えた画素」の割合(%)を返す
export function diffRatio(a: GraySample | null, b: GraySample | null, pixThr: number): number {
  if (!a || !b || a.w !== b.w || a.h !== b.h) return 100;
  let count = 0;
  const n = a.gray.length;
  for (let i = 0; i < n; i++) {
    if (Math.abs(a.gray[i] - b.gray[i]) > pixThr) count++;
  }
  return (count / n) * 100;
}

// 通常の変化検知。「今読み取るべきか」を fire で返す
export function judgeChange(st: DetectionState, d: Detection, cur: GraySample, now: number): Verdict {
  if (!st.refFrame) {
    st.refFrame = cur;
    st.prevFrame = cur;
    if (st.rebase) {
      st.rebase = false;
      st.pending = false;
    } else {
      st.pending = true;
      st.lastMotion = now;
    }
  }

  const diffFromRef = diffRatio(cur, st.refFrame, d.pix);
  const diffFromPrev = diffRatio(cur, st.prevFrame, d.pix);
  st.prevFrame = cur;
  const metric: Metric = { label: '変化量', value: diffFromRef, thr: d.thr, met: diffFromRef >= d.thr };

  if (!d.auto) {
    return { fire: false, metric, status: { text: '自動読み取りはオフです（変化量の表示のみ）' } };
  }

  if (!st.pending && diffFromRef >= d.thr) {
    st.pending = true;
    st.lastMotion = now;
  }
  if (!st.pending) {
    return { fire: false, metric, status: { text: '監視中（変化なし）', color: '#198754' } };
  }

  // まだ動いている間は待つ。動きが止まってから stable ms 経過で読み取り
  if (diffFromPrev >= Math.max(0.2, d.thr / 2)) st.lastMotion = now;
  const waited = now - st.lastMotion;
  if (waited >= d.stable) {
    st.refFrame = cur;
    st.pending = false;
    return { fire: true, metric };
  }
  return {
    fire: false, metric,
    status: { text: `変化を検知。安定待ち... ${Math.max(0, d.stable - waited).toFixed(0)}ms`, color: '#e8590c' },
  };
}

// リファレンス一致率モード：条件が「成立した瞬間」に1回だけ fire する
export function judgeReference(
  st: DetectionState, d: Detection, cur: GraySample, refSample: GraySample | null, now: number,
): Verdict {
  if (!refSample) {
    return {
      fire: false,
      status: { text: d.refImage ? 'リファレンス画像を読み込み中...' : 'リファレンス画像が未設定です', color: '#dc3545' },
    };
  }

  const match = 100 - diffRatio(cur, refSample, d.pix);
  const cond = d.refTrigger === 'above' ? match >= d.refMatch : match < d.refMatch;
  const metric: Metric = { label: '一致率', value: match, thr: d.refMatch, met: cond, scaleMax: 100 };

  // 設定直後の初回：すでに成立していても発火させない
  if (!st.refInit) {
    st.refInit = true;
    st.refCond = cond;
    st.refPending = false;
  }

  if (!d.auto) {
    return { fire: false, metric, status: { text: '自動読み取りはオフです（一致率の表示のみ）' } };
  }
  if (!cond) {
    st.refCond = false;
    st.refPending = false;
    return { fire: false, metric, status: { text: '監視中（条件未成立）', color: '#198754' } };
  }
  if (st.refCond) {
    return { fire: false, metric, status: { text: '条件成立中（いったん不成立になると再トリガ）', color: '#6c757d' } };
  }
  if (!st.refPending) { st.refPending = true; st.refSince = now; }
  const waited = now - st.refSince;
  if (waited >= d.stable) {
    st.refCond = true;
    st.refPending = false;
    return { fire: true, metric };
  }
  return {
    fire: false, metric,
    status: { text: `条件成立。安定待ち... ${Math.max(0, d.stable - waited).toFixed(0)}ms`, color: '#e8590c' },
  };
}
