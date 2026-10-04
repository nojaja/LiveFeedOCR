import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { createDetectionState, diffRatio, judgeChange, judgeReference, resetDetection } from '../../../../src/domain/change-detection.ts';
import { accumulate, applyRegionFilter, filterImageData, thresholdBits } from '../../../../src/domain/image-filter.ts';
import { createOcrRegion, createSnapshot, restoreSnapshot, sanitizeRect } from '../../../../src/domain/region.ts';
import { addResult, buildCsv, stripWhitespace } from '../../../../src/domain/result-log.ts';
import { computeDragRect, hitTest, rectFromDrag, toPixels } from '../../../../src/domain/geometry.ts';
import { decodeLogits, detectLineBoxes, parseCharset, parseqRole } from '../../../../src/domain/ndl-text.ts';
import { JobQueue } from '../../../../src/application/job-queue.ts';
import { readRegion } from '../../../../src/application/read-region.ts';
import { runMonitorStep } from '../../../../src/application/monitor.ts';

const sample = (values, w = values.length, h = 1) => ({ gray: Uint8Array.from(values), w, h });

test('変化検知: 初回は読み取り待ちになり、安定待ち0msで即発火する', () => {
  const st = createDetectionState();
  const det = { thr: 3, pix: 30, stable: 0, auto: true };
  assert.equal(judgeChange(st, det, sample([0, 0, 0, 0]), 0).fire, true);
  assert.equal(judgeChange(st, det, sample([0, 0, 0, 0]), 10).fire, false);
  const changed = judgeChange(st, det, sample([255, 255, 0, 0]), 20);
  assert.equal(changed.fire, true);
  assert.equal(changed.metric.value, 50);
});

test('変化検知: 基準の取り直し(silent)では読み取りを起動しない', () => {
  const st = createDetectionState();
  resetDetection(st, true);
  const det = { thr: 3, pix: 30, stable: 0, auto: true };
  assert.equal(judgeChange(st, det, sample([0, 0]), 0).fire, false);
});

test('変化検知: 自動オフでは発火せず指標だけ返す', () => {
  const st = createDetectionState();
  const v = judgeChange(st, { thr: 3, pix: 30, stable: 0, auto: false }, sample([0, 0]), 0);
  assert.equal(v.fire, false);
  assert.ok(v.metric);
});

test('リファレンス判定: 初回成立では発火せず、不成立を経て成立すると1回だけ発火する', () => {
  const st = createDetectionState();
  const det = { pix: 30, refMatch: 90, refTrigger: 'above', stable: 0, auto: true, refImage: 'x' };
  const ref = sample([10, 10, 10, 10]);
  assert.equal(judgeReference(st, det, sample([10, 10, 10, 10]), ref, 0).fire, false);
  assert.equal(judgeReference(st, det, sample([200, 200, 200, 200]), ref, 1).fire, false);
  assert.equal(judgeReference(st, det, sample([10, 10, 10, 10]), ref, 2).fire, true);
  assert.equal(judgeReference(st, det, sample([10, 10, 10, 10]), ref, 3).fire, false);
  assert.equal(judgeReference(st, det, sample([1]), null, 4).fire, false);
});

test('diffRatio: サイズ違いは100%', () => {
  assert.equal(diffRatio(sample([0, 0]), sample([0, 0, 0]), 1), 100);
});

test('画像フィルタ: 二値化と反転、加算/減算', () => {
  const px = Uint8ClampedArray.from([200, 200, 200, 255, 10, 10, 10, 255]);
  filterImageData(px, { gray: true, bin: true, thr: 128, inv: true });
  assert.deepEqual(Array.from(px), [0, 0, 0, 255, 255, 255, 255, 255]);

  const holder = { accum: null };
  accumulate(holder, Uint8Array.from([255, 0]), 2, 1, 2, 'or');
  assert.deepEqual(Array.from(accumulate(holder, Uint8Array.from([0, 0]), 2, 1, 2, 'or')), [255, 0]);
  const h2 = { accum: null };
  accumulate(h2, Uint8Array.from([255, 255]), 2, 1, 2, 'and');
  assert.deepEqual(Array.from(accumulate(h2, Uint8Array.from([255, 0]), 2, 1, 2, 'and')), [255, 0]);
  assert.deepEqual(Array.from(thresholdBits([10, 200], 128)), [0, 255]);

  const data = Uint8ClampedArray.from([200, 200, 200, 255]);
  applyRegionFilter(data, 1, 1, { gray: false, bin: false, thr: 0, inv: false }, { mode: 'diff' }, { accum: null });
  assert.deepEqual(Array.from(data), [200, 200, 200, 255]);
});

test('範囲セット: スナップショットの往復で不正な矩形を除外する', () => {
  const reg = createOcrRegion({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, 3, { name: 'A', det: { mode: 'ref' } });
  assert.equal(reg.det.mode, 'diff');
  const snap = createSnapshot('s', 4, [reg], null);
  snap.ocrRegions.push({ x: 'bad' });
  const restored = restoreSnapshot(snap);
  assert.equal(restored.ocr.length, 1);
  assert.equal(restored.nextId, 4);
  assert.equal(sanitizeRect({ x: 2, y: 0, w: 0.5, h: 0.5 }).x, 0.5);
});

test('結果ログ: 前方一致なら文字送りとして前回行を更新する', () => {
  const first = addResult([], { text: 'ab', reason: 'r', region: 'R', method: 'm', prefixUpdate: true }, 1, 'id1');
  const second = addResult(first.entries, { text: 'abc', reason: 'r', region: 'R', method: 'm', prefixUpdate: true }, 2, 'id2');
  assert.equal(second.merged, true);
  assert.equal(second.entries.length, 1);
  assert.equal(second.entries[0].updates, 1);
  const other = addResult(second.entries, { text: 'x', reason: 'r', region: 'R', prefixUpdate: true }, 3, 'id3');
  assert.equal(other.entries.length, 2);
  assert.ok(buildCsv(other.entries).startsWith('\ufeff日時'));
  assert.equal(stripWhitespace('a b\u3000c\n'), 'abc');
});

test('ジオメトリ: ヒットテスト・ドラッグ・描画矩形', () => {
  const size = { width: 100, height: 100 };
  const item = { kind: 'ocr', id: 1, x: 0.2, y: 0.2, w: 0.4, h: 0.4, angle: 0 };
  assert.equal(hitTest([item], { x: 40, y: 40 }, size).handle, null);
  assert.equal(hitTest([item], { x: 20, y: 20 }, size).handle.n, 'nw');
  assert.equal(hitTest([item], { x: 95, y: 95 }, size), null);
  const drag = { item, handle: null, startP: { x: 40, y: 40 }, g0: toPixels(item, size) };
  assert.deepEqual(computeDragRect(drag, { x: 50, y: 40 }, size), { x: 0.3, y: 0.2, w: 0.4, h: 0.4 });
  assert.equal(rectFromDrag({ x: 0, y: 0 }, { x: 5, y: 50 }, size), null);
  assert.deepEqual(rectFromDrag({ x: 50, y: 50 }, { x: 10, y: 20 }, size), { x: 0.1, y: 0.2, w: 0.4, h: 0.3 });
});

test('NDLテキスト処理: ファイル判定・文字セット・行検出・デコード', () => {
  assert.equal(parseqRole('parseq_30_16x256.onnx'), 'parseq30');
  assert.equal(parseqRole('deim.onnx'), null);
  assert.deepEqual(parseCharset('charset_train: "あいう"'), ['あ', 'い', 'う']);
  assert.equal(decodeLogits([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0], 3, 4, ['a', 'b']), 'ab');

  const w = 40, h = 30, gray = new Uint8Array(w * h).fill(255);
  for (let y = 10; y < 20; y++) for (let x = 5; x < 35; x++) gray[y * w + x] = 0;
  const boxes = detectLineBoxes(gray, w, h);
  assert.equal(boxes.length, 1);
  assert.ok(boxes[0].top <= 10 && boxes[0].bottom >= 20);
});

test('待ち行列: 重複を防ぎ、順番に実行し、無効なキーは飛ばす', async () => {
  const ran = [];
  const valid = new Set([1, 2]);
  const queue = new JobQueue(async job => { ran.push(job.key); }, key => valid.has(key));
  assert.equal(queue.enqueue(1, 'a'), true);
  queue.enqueue(3, 'invalid');
  assert.equal(queue.enqueue(2, 'b'), true);
  assert.equal(queue.enqueue(2, 'dup'), false);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(ran, [1, 2]);
});

test('読み取りユースケース: エンジン選択・空白除去・QR未検出', async () => {
  const preview = {}, fallback = {};
  const deps = {
    recognizers: {
      tesseract: { recognize: async () => ' a b \n' },
      ndl: { recognize: async () => 'ndl' },
      paddle: { recognize: async () => 'paddle' },
    },
    qr: { read: candidates => (candidates.length === 2 ? null : 'qr') },
  };
  const ocr = await readRegion({ read: { type: 'ocr', engine: 'tesseract', stripWs: true } }, { preview, fallback }, deps);
  assert.equal(ocr.text, 'ab');
  assert.equal(ocr.method, 'Tesseract');
  const unknown = await readRegion({ read: { type: 'ocr', engine: 'x', stripWs: false } }, { preview, fallback }, deps);
  assert.equal(unknown.text, 'a b');
  const qr = await readRegion({ read: { type: 'qr' } }, { preview, fallback }, deps);
  assert.equal(qr.kind, 'not-found');
  assert.equal((await readRegion({ read: { type: 'qr' } }, { preview, fallback: null }, deps)).text, 'qr');
});

test('判定ステップ: 変化検知範囲が成立するとすべてのOCR範囲を読み取り依頼する', () => {
  const makeRegion = id => ({ id, kind: 'ocr', det: { mode: 'diff', thr: 3, pix: 30, stable: 0, auto: true }, st: createDetectionState() });
  const regions = [makeRegion(1), makeRegion(2)];
  const detect = { kind: 'detect', det: { mode: 'diff', thr: 3, pix: 30, stable: 0, auto: true }, st: createDetectionState() };
  detect.st.rebase = true;
  regions.forEach(r => { r.st.rebase = true; });
  let frame = [0, 0, 0, 0];
  const source = {
    videoError: () => '',
    refreshPreview: () => true,
    samplePreview: () => sample([0, 0, 0, 0]),
    sampleDetect: () => sample(frame),
    referenceSample: () => null,
  };
  const enqueued = [];
  const sink = {
    detectionOf: item => item.st,
    report() {},
    setStatus() {},
    enqueue: (reg, reason) => enqueued.push([reg.id, reason]),
    resetSilently: reg => resetDetection(reg.st, true),
  };
  runMonitorStep(regions, detect, source, sink, 0);
  assert.deepEqual(enqueued, []);
  frame = [255, 255, 255, 255];
  const result = runMonitorStep(regions, detect, source, sink, 1);
  assert.deepEqual(enqueued, [[1, '自動（変化検知範囲）'], [2, '自動（変化検知範囲）']]);
  assert.match(result.text, /監視中/);
  assert.match(runMonitorStep([], null, source, sink, 2).text, /未設定/);
  assert.match(runMonitorStep(regions, null, { ...source, videoError: () => 'ng' }, sink, 3).text, /ng/);
});

// ---- 依存の向き（クリーンアーキテクチャ） ----
const srcRoot = fileURLToPath(new URL('../../../../src/', import.meta.url));

async function sourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(join(srcRoot, dir), { withFileTypes: true })) {
    if (entry.isFile() && /\.(ts|vue)$/.test(entry.name)) out.push(join(srcRoot, dir, entry.name));
  }
  return out;
}

async function imports(file) {
  const text = await readFile(file, 'utf8');
  return [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
}

test('依存の向き: domain は何にも依存せず、application は infrastructure/vue に依存しない', async () => {
  for (const file of await sourceFiles('domain')) {
    for (const spec of await imports(file)) {
      assert.ok(spec.startsWith('./'), `${file} は ${spec} に依存してはならない`);
    }
  }
  for (const file of await sourceFiles('application')) {
    for (const spec of await imports(file)) {
      assert.ok(!/infrastructure|composables|components|^vue$/.test(spec), `${file} は ${spec} に依存してはならない`);
    }
  }
});
