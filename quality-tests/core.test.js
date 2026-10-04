const assert = require('node:assert/strict');
const {
  createDetectionState, diffRatio, judgeChange, judgeReference, resetDetection,
} = require('../src/domain/change-detection.ts');
const { accumulate, applyRegionFilter, filterImageData, thresholdBits } = require('../src/domain/image-filter.ts');
const {
  createDetectRegion, createOcrRegion, createSnapshot, restoreSnapshot, sanitizeRect,
} = require('../src/domain/region.ts');
const { addResult, buildCsv, normalizePaddleOcrResult, stripWhitespace } = require('../src/domain/result-log.ts');
const { computeDragRect, hitTest, rectFromDrag, toPixels } = require('../src/domain/geometry.ts');
const { decodeLogits, detectLineBoxes, parseCharset, parseqRole } = require('../src/domain/ndl-text.ts');
const { adjustZoom, clampPanOffset, mapPointToZoomedContent, MIN_ZOOM, MAX_ZOOM } = require('../src/domain/zoom.ts');
const { JobQueue } = require('../src/application/job-queue.ts');
const { readRegion } = require('../src/application/read-region.ts');
const { runMonitorStep } = require('../src/application/monitor.ts');

function sample(values, w = values.length, h = 1) {
  return { gray: Uint8Array.from(values), w, h };
}

test('変化検知とリファレンス判定の状態遷移', () => {
  const state = createDetectionState();
  const settings = { thr: 3, pix: 30, stable: 0, auto: true };
  assert.equal(judgeChange(state, settings, sample([0, 0, 0, 0]), 0).fire, true);
  assert.equal(judgeChange(state, settings, sample([0, 0, 0, 0]), 10).fire, false);
  assert.equal(judgeChange(state, settings, sample([255, 255, 0, 0]), 20).metric.value, 50);
  resetDetection(state, true);
  assert.equal(judgeChange(state, settings, sample([0, 0]), 0).fire, false);
  assert.equal(judgeChange(createDetectionState(), { ...settings, auto: false }, sample([0]), 0).fire, false);

  const referenceState = createDetectionState();
  const referenceSettings = { ...settings, refMatch: 90, refTrigger: 'above', refImage: 'x' };
  const reference = sample([10, 10, 10, 10]);
  assert.equal(judgeReference(referenceState, referenceSettings, reference, reference, 0).fire, false);
  assert.equal(judgeReference(referenceState, referenceSettings, sample([200, 200, 200, 200]), reference, 1).fire, false);
  assert.equal(judgeReference(referenceState, referenceSettings, reference, reference, 2).fire, true);
  assert.equal(judgeReference(referenceState, referenceSettings, reference, null, 3).fire, false);
  assert.equal(diffRatio(sample([0, 0]), sample([0, 0, 0]), 1), 100);
});

test('画像フィルタの二値化、反転、累積、領域適用', () => {
  const pixels = Uint8ClampedArray.from([200, 200, 200, 255, 10, 10, 10, 255]);
  filterImageData(pixels, { gray: true, bin: true, thr: 128, inv: true });
  assert.deepEqual(Array.from(pixels), [0, 0, 0, 255, 255, 255, 255, 255]);
  assert.deepEqual(Array.from(thresholdBits([10, 200], 128)), [0, 255]);

  const holder = { accum: null };
  assert.deepEqual(Array.from(accumulate(holder, Uint8Array.from([255, 0]), 2, 1, 2, 'or')), [255, 0]);
  assert.deepEqual(Array.from(accumulate(holder, Uint8Array.from([0, 0]), 2, 1, 2, 'or')), [255, 0]);
  const other = { accum: null };
  accumulate(other, Uint8Array.from([255, 255]), 2, 1, 2, 'and');
  assert.deepEqual(Array.from(accumulate(other, Uint8Array.from([255, 0]), 2, 1, 2, 'and')), [255, 0]);
  const data = Uint8ClampedArray.from([200, 200, 200, 255]);
  applyRegionFilter(data, 1, 1, { gray: false, bin: false, thr: 0, inv: false }, { mode: 'diff' }, { accum: null });
  assert.deepEqual(Array.from(data), [200, 200, 200, 255]);
});

test('範囲スナップショットを検証し、複数検知範囲を復元する', () => {
  const region = createOcrRegion({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, 3, { name: 'A', det: { mode: 'ref' } });
  assert.equal(region.det.mode, 'diff');
  const snapshot = createSnapshot('set', 4, [region], []);
  snapshot.ocrRegions.push({ x: 'bad' });
  assert.equal(restoreSnapshot(snapshot).ocr.length, 1);
  assert.equal(sanitizeRect({ x: 2, y: 0, w: 0.5, h: 0.5 }).x, 0.5);

  const first = createDetectRegion({ x: 0, y: 0, w: 0.2, h: 0.2 }, 1);
  const second = createDetectRegion({ x: 0.3, y: 0.3, w: 0.2, h: 0.2 }, 2);
  const restored = restoreSnapshot(createSnapshot('set', 1, [], [first, second], 3));
  assert.equal(restored.detect.length, 2);
  assert.equal(restored.nextDetectId, 3);
  assert.equal(restoreSnapshot({ ocrRegions: [], detect: { x: 0, y: 0, w: 0.2, h: 0.2 } }).detect.length, 1);
});

test('結果ログの追記、統合、CSVとOCR応答の検証', () => {
  const first = addResult([], { text: 'ab', reason: 'r', region: 'R', method: 'm', prefixUpdate: true }, 1, 'id1');
  const merged = addResult(first.entries, { text: 'abc', reason: 'r', region: 'R', method: 'm', prefixUpdate: true }, 2, 'id2');
  assert.equal(merged.merged, true);
  assert.equal(merged.entries[0].updates, 1);
  assert.equal(addResult(merged.entries, { text: 'x', reason: 'r', region: 'R', prefixUpdate: true }, 3, 'id3').entries.length, 2);
  assert.ok(buildCsv(merged.entries).startsWith('\ufeff日時'));
  assert.equal(stripWhitespace('a b\u3000c\n'), 'abc');
  assert.equal(normalizePaddleOcrResult({ items: [{ text: '先頭' }, { text: '末尾' }] }), '先頭\n末尾');
  assert.equal(normalizePaddleOcrResult({ items: [] }), '');
  assert.throws(() => normalizePaddleOcrResult(null), /invalid PaddleOCR result/i);
  assert.throws(() => normalizePaddleOcrResult({ items: [{ text: 42 }] }), /invalid PaddleOCR result/i);
});

test('ジオメトリとズームの座標・境界を計算する', () => {
  const bounds = { left: 100, top: 50, width: 400, height: 200 };
  assert.equal(adjustZoom(1, -1) > 1, true);
  assert.equal(adjustZoom(1, 1) < 1, true);
  assert.equal(adjustZoom(MAX_ZOOM, -1), MAX_ZOOM);
  assert.equal(adjustZoom(MIN_ZOOM, 1), MIN_ZOOM);
  assert.deepEqual(mapPointToZoomedContent(300, 150, bounds, 2), { x: 200, y: 100 });
  assert.deepEqual(mapPointToZoomedContent(0, 0, bounds, 2), { x: 50, y: 25 });
  assert.equal(clampPanOffset(400, 400, 2, 999), 200);
  assert.equal(clampPanOffset(400, 400, 1, 80), 0);

  const size = { width: 100, height: 100 };
  const item = { kind: 'ocr', id: 1, x: 0.2, y: 0.2, w: 0.4, h: 0.4, angle: 0 };
  assert.equal(hitTest([item], { x: 40, y: 40 }, size).handle, null);
  assert.equal(hitTest([item], { x: 20, y: 20 }, size).handle.n, 'nw');
  assert.equal(hitTest([item], { x: 95, y: 95 }, size), null);
  const drag = { item, handle: null, startP: { x: 40, y: 40 }, g0: toPixels(item, size) };
  assert.deepEqual(computeDragRect(drag, { x: 50, y: 40 }, size), { x: 0.3, y: 0.2, w: 0.4, h: 0.4 });
  assert.equal(rectFromDrag({ x: 0, y: 0 }, { x: 3, y: 50 }, size), null);
  assert.deepEqual(rectFromDrag({ x: 0, y: 0 }, { x: 4, y: 4 }, size), { x: 0, y: 0, w: 0.04, h: 0.04 });
});

test('NDLテキストを解析・デコードする', () => {
  assert.equal(parseqRole('parseq_30_16x256.onnx'), 'parseq30');
  assert.equal(parseqRole('deim.onnx'), null);
  assert.deepEqual(parseCharset('charset_train: "あいう"'), ['あ', 'い', 'う']);
  assert.equal(decodeLogits([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0], 3, 4, ['a', 'b']), 'ab');
  const width = 40;
  const height = 30;
  const gray = new Uint8Array(width * height).fill(255);
  for (let y = 10; y < 20; y++) {
    for (let x = 5; x < 35; x++) gray[y * width + x] = 0;
  }
  assert.equal(detectLineBoxes(gray, width, height).length, 1);
});

test('アプリケーション層のキュー、読み取り、監視を実行する', async () => {
  const ran = [];
  const queue = new JobQueue(async job => { ran.push(job.key); }, key => [1, 2].includes(key));
  assert.equal(queue.enqueue(1, 'first'), true);
  queue.enqueue(3, 'invalid');
  assert.equal(queue.enqueue(2, 'second'), true);
  assert.equal(queue.enqueue(2, 'duplicate'), false);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(ran, [1, 2]);

  const preview = {};
  const dependencies = {
    recognizers: {
      tesseract: { recognize: async () => ' a b \n' },
      ndl: { recognize: async () => 'ndl' },
      paddle: { recognize: async () => 'paddle' },
    },
    qr: { read: candidates => (candidates.length === 2 ? null : 'qr') },
  };
  const read = await readRegion({ read: { type: 'ocr', engine: 'tesseract', stripWs: true } }, { preview, fallback: {} }, dependencies);
  assert.equal(read.text, 'ab');
  assert.equal(read.method, 'Tesseract');
  assert.equal((await readRegion({ read: { type: 'qr' } }, { preview, fallback: {} }, dependencies)).kind, 'not-found');

  const regions = [1, 2].map(id => ({ id, kind: 'ocr', det: { mode: 'diff', thr: 3, pix: 30, stable: 0, auto: true }, st: createDetectionState() }));
  const detects = [1, 2].map(id => ({ id, kind: 'detect', det: { mode: 'diff', thr: 3, pix: 30, stable: 0, auto: true }, st: createDetectionState(), andMet: false }));
  detects.forEach(region => { region.st.rebase = true; });
  regions.forEach(region => { region.st.rebase = true; });
  const frames = { 1: [0, 0, 0, 0], 2: [0, 0, 0, 0] };
  const source = {
    videoError: () => '',
    refreshPreview: () => true,
    samplePreview: () => sample([0, 0, 0, 0]),
    sampleDetect: region => sample(frames[region.id]),
    referenceSample: () => null,
  };
  const enqueued = [];
  const sink = {
    detectionOf: item => item.st,
    report() {},
    setStatus() {},
    enqueue: (region, reason) => enqueued.push([region.id, reason]),
    resetSilently: region => resetDetection(region.st, true),
  };
  runMonitorStep(regions, detects, source, sink, 0);
  frames[1] = [255, 255, 255, 255];
  runMonitorStep(regions, detects, source, sink, 1);
  frames[2] = [255, 255, 255, 255];
  runMonitorStep(regions, detects, source, sink, 2);
  assert.deepEqual(enqueued, [[1, '自動（変化検知範囲AND）'], [2, '自動（変化検知範囲AND）']]);
});
