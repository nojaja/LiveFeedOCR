import { normalizePaddleOcrResult } from './ocr-providers.js';
import { adjustZoom, clampPanOffset, mapPointToZoomedContent } from './zoom.js';

// ===== 要素 =====
const SCRIPT_VERSION = 'v6';
const debugText = document.getElementById('debug-text');
const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const videoWrapper = document.getElementById('video-wrapper');
const captureStage = document.getElementById('capture-stage');
const captureZoomLevel = document.getElementById('capture-zoom-level');
const ctx = overlay.getContext('2d');
const regionCards = document.getElementById('region-cards');
const logList = document.getElementById('log-list');
const logCount = document.getElementById('log-count');
const csvBtn = document.getElementById('csv-btn');
const clearLogBtn = document.getElementById('clear-log-btn');
const progressText = document.getElementById('progress-text');
const stateText = document.getElementById('state-text');
const checkFps = document.getElementById('check-fps');
const ocrLang = document.getElementById('ocr-lang');

// 範囲セット
const setSelect = document.getElementById('set-select');
const setName = document.getElementById('set-name');
const setSaveBtn = document.getElementById('set-save-btn');
const setLoadBtn = document.getElementById('set-load-btn');
const setDeleteBtn = document.getElementById('set-delete-btn');
const setExportBtn = document.getElementById('set-export-btn');
const setImportBtn = document.getElementById('set-import-btn');
const setImportFile = document.getElementById('set-import-file');

// NDLOCR-Lite モデル
const ndlFilesInput = document.getElementById('ndl-files');
const ndlStatus = document.getElementById('ndl-status');
const ndlClearBtn = document.getElementById('ndl-clear-btn');

// ===== 状態 =====
// 範囲は映像サイズに対する割合(0〜1)で保持する（ウィンドウサイズが変わってもズレない）
// ・OCR範囲(複数可)  : 読み取り設定・画像前処理・変化検知の設定・傾き・切り取りプレビューを範囲ごとに持つ
// ・変化検知範囲(1つ): 変化(またはリファレンス一致)したら「すべてのOCR範囲」を読み取る
const DEFAULT_FILTERS = { gray: true, bin: true, thr: 128, inv: false };
const DEFAULT_DET = {
  mode: 'diff',        // diff: 通常の変化検知 / accum: ビット加算・減算の結果画像 / ref: リファレンス一致率(変化検知範囲のみ)
  auto: true,
  thr: 3,              // 変化量しきい値(%)
  pix: 30,             // 画素の差しきい値(0〜255)
  stable: 0,           // 安定待ち時間(ms)
  accumN: 3,           // ビット加算・減算の対象フレーム数
  accumMode: 'or',     // or: 加算(1枚でも白なら白) / and: 減算(全フレームで白のときだけ白)
  accumThr: 128,       // 変化検知範囲の2値化しきい値（OCR範囲はフィルタの二値化しきい値を使う）
  refMatch: 90,        // リファレンス一致率しきい値(%)
  refTrigger: 'above', // above: しきい値以上になったら / below: しきい値未満になったら
  refImage: '',        // リファレンス画像(dataURL)
};
const DEFAULT_READ = {
  type: 'ocr',         // ocr / qr
  engine: 'tesseract', // tesseract / ndl / paddle
  stripWs: true,       // スペース・改行を除去
  prefixUpdate: true,  // 前回結果と前方一致なら文字送りとみなして更新
};
const PALETTE = ['#00e676', '#00b0ff', '#e040fb', '#ffea00', '#ff5252', '#69f0ae', '#40c4ff', '#ff80ab'];
const DETECT_COLOR = '#ff9800';
const MAX_OCR_REGIONS = PALETTE.length;

let ocrRegions = [];      // { kind:'ocr', id, name, x,y,w,h, angle(度), filters, det, read, rt }
let detectRegion = null;  // { kind:'detect', name, x,y,w,h, det, rt }
let nextId = 1;

// rt = 保存しない実行時の状態
function newRuntime() {
  return {
    refFrame: null,    // 「最後に読み取った時点」の判定画像
    prevFrame: null,   // 1つ前の判定画像
    pending: false,    // 変化を検知して読み取り待ちか
    lastMotion: 0,     // 最後に「動き」を検知した時刻
    rebase: false,     // true: 次の判定画像を基準にするだけ（読み取りは起動しない）
    queued: false,     // 待ち行列に入っているか
    accum: null,       // ビット加算・減算用のフレーム履歴
    previewReady: false,
    refInit: false, refCond: false, refPending: false, refSince: 0,   // リファレンス判定用
    refSrc: '', refImg: null, refImgReady: false, refCache: null,
    cropCanvas: null, cropCtx: null,
    el: null,          // カードのDOM参照
  };
}

function regionColor(item) {
  return item.kind === 'detect' ? DETECT_COLOR : PALETTE[(item.id - 1) % PALETTE.length];
}
function angleRad(item) {
  return item.kind === 'ocr' ? (item.angle || 0) * Math.PI / 180 : 0;
}

// ===== 設定の自動保存 / 範囲セット（保存・読込・JSONエクスポート・インポート） =====
const SETTINGS_KEY = 'ocrSettingsV1';
const SETS_KEY = 'ocrRegionSetsV1';

function serializeItem(it) {
  const o = { name: it.name, x: it.x, y: it.y, w: it.w, h: it.h, det: it.det };
  if (it.kind === 'ocr') { o.id = it.id; o.angle = it.angle; o.filters = it.filters; o.read = it.read; }
  return o;
}

// 現在の範囲一式（OCR範囲すべて＋変化検知範囲）を1つの「範囲セット」として取り出す
function snapshot(name) {
  return {
    format: 'ocr-region-set',
    version: 1,
    name: name || '',
    nextId,
    ocrRegions: ocrRegions.map(serializeItem),
    detect: detectRegion ? serializeItem(detectRegion) : null,
  };
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      snap: snapshot(''),
      common: { fps: checkFps.value, lang: ocrLang.value, setName: setSelect.value },
    }));
  } catch (err) {
    console.warn('設定の保存に失敗:', err);
  }
}

function sanitizeRect(s) {
  if (!s || ![s.x, s.y, s.w, s.h].every(v => typeof v === 'number' && isFinite(v))) return null;
  const w = Math.min(Math.max(s.w, 0.005), 1);
  const h = Math.min(Math.max(s.h, 0.005), 1);
  return { x: Math.min(Math.max(s.x, 0), 1 - w), y: Math.min(Math.max(s.y, 0), 1 - h), w, h };
}

function clearRegions() {
  ocrRegions.forEach(r => { if (r.rt.el) r.rt.el.card.remove(); });
  ocrRegions = [];
  if (detectRegion) {
    if (detectRegion.rt.el) detectRegion.rt.el.card.remove();
    detectRegion = null;
  }
  ocrQueue.length = 0;
}

// 範囲セットを現在の作業状態として復元する（再読み込み直後に勝手に読み取らないよう基準だけ取り直す）
function applySnapshot(snap) {
  clearRegions();
  nextId = Math.max(1, snap.nextId || 1);
  (snap.ocrRegions || []).slice(0, MAX_OCR_REGIONS).forEach(s => {
    const rect = sanitizeRect(s);
    if (!rect) return;
    addOcrRegion(rect, s).rt.rebase = true;
  });
  if (snap.detect) {
    const rect = sanitizeRect(snap.detect);
    if (rect) setDetectRegion(rect, snap.detect).rt.rebase = true;
  }
  redraw();
}

function loadSettings() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch (err) { console.warn(err); }
  if (!data) return;

  if (data.common) {
    if (data.common.fps) checkFps.value = data.common.fps;
    if (data.common.lang) ocrLang.value = data.common.lang;
  }
  if (data.snap) {
    applySnapshot(data.snap);
  } else if (data.ocrRegions) {
    applySnapshot(data);   // 旧形式(v5)の保存データ
  }
  return data.common && data.common.setName;
}

// --- 範囲セット（名前を付けてブラウザに保存） ---
function readSets() {
  try {
    const o = JSON.parse(localStorage.getItem(SETS_KEY) || '{}');
    return (o && typeof o === 'object') ? o : {};
  } catch (err) {
    return {};
  }
}

function writeSets(sets) {
  try {
    localStorage.setItem(SETS_KEY, JSON.stringify(sets));
    return true;
  } catch (err) {
    alert('範囲セットの保存に失敗しました（ブラウザの保存容量を超えた可能性があります）。\n' + err.message);
    return false;
  }
}

function refreshSetSelect(selected) {
  const sets = readSets();
  const names = Object.keys(sets).sort();
  setSelect.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = names.length ? '（保存済みの範囲セットを選択）' : '（保存済みの範囲セットはありません）';
  setSelect.appendChild(none);
  names.forEach(n => {
    const op = document.createElement('option');
    op.value = n;
    const s = sets[n];
    op.textContent = `${n}（OCR範囲 ${(s.ocrRegions || []).length}個${s.detect ? '＋検知範囲' : ''}）`;
    setSelect.appendChild(op);
  });
  setSelect.value = names.includes(selected) ? selected : '';
}

function uniqueSetName(base, sets) {
  let name = base, i = 2;
  while (sets[name]) name = `${base} (${i++})`;
  return name;
}

setSaveBtn.addEventListener('click', () => {
  const name = setName.value.trim() || setSelect.value;
  if (!name) { alert('保存する範囲セットの名前を入力してください。'); return; }
  const sets = readSets();
  if (sets[name] && !confirm(`範囲セット「${name}」を上書きします。よろしいですか？`)) return;
  sets[name] = snapshot(name);
  if (!writeSets(sets)) return;
  refreshSetSelect(name);
  setName.value = '';
  saveSettings();
});

setLoadBtn.addEventListener('click', () => {
  const name = setSelect.value;
  const sets = readSets();
  if (!name || !sets[name]) { alert('読み込む範囲セットを選択してください。'); return; }
  if ((ocrRegions.length || detectRegion) && !confirm(`現在の範囲をすべて破棄して、範囲セット「${name}」を読み込みます。よろしいですか？`)) return;
  applySnapshot(sets[name]);
  saveSettings();
});

setDeleteBtn.addEventListener('click', () => {
  const name = setSelect.value;
  const sets = readSets();
  if (!name || !sets[name]) { alert('削除する範囲セットを選択してください。'); return; }
  if (!confirm(`保存済みの範囲セット「${name}」を削除します。よろしいですか？`)) return;
  delete sets[name];
  writeSets(sets);
  refreshSetSelect('');
  saveSettings();
});

// --- JSONエクスポート / インポート ---
setExportBtn.addEventListener('click', () => {
  const name = setName.value.trim() || setSelect.value || 'ocr-region-set';
  const snap = snapshot(name);
  if (!snap.ocrRegions.length && !snap.detect) { alert('エクスポートする範囲がありません。'); return; }
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ocr-region-set_${name.replace(/[\\/:*?"<>|\s]+/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

setImportBtn.addEventListener('click', () => setImportFile.click());

setImportFile.addEventListener('change', async () => {
  const file = setImportFile.files[0];
  setImportFile.value = '';
  if (!file) return;
  let snap;
  try {
    snap = JSON.parse(await file.text());
  } catch (err) {
    alert('JSONとして読み込めませんでした: ' + err.message);
    return;
  }
  if (!snap || snap.format !== 'ocr-region-set' || !Array.isArray(snap.ocrRegions)) {
    alert('このアプリの範囲セットJSON（format: "ocr-region-set"）ではありません。');
    return;
  }
  if ((ocrRegions.length || detectRegion) && !confirm('現在の範囲をすべて破棄して、インポートした範囲セットを読み込みます。よろしいですか？')) return;

  applySnapshot(snap);

  // 保存済みの範囲セット一覧にも追加（同名があれば連番を付ける）
  const sets = readSets();
  const base = (snap.name && String(snap.name).trim()) || file.name.replace(/\.json$/i, '');
  const name = uniqueSetName(base, sets);
  sets[name] = snapshot(name);
  if (writeSets(sets)) refreshSetSelect(name);
  saveSettings();
  alert(`範囲セットをインポートしました（OCR範囲 ${ocrRegions.length}個${detectRegion ? '＋変化検知範囲' : ''}）。保存済み一覧には「${name}」として追加しました。`);
});

// ===== 1. カメラ初期化 =====
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    video.srcObject = stream;
  } catch (err) {
    alert("カメラアクセスエラー。localhost経由で開いているか確認してください。");
    console.error(err);
  }
}

function resizeOverlay() {
  overlay.width = video.clientWidth;
  overlay.height = video.clientHeight;
  applyCaptureTransform();
  redraw();
}
video.addEventListener('loadedmetadata', resizeOverlay);
window.addEventListener('resize', resizeOverlay);
if (window.ResizeObserver) new ResizeObserver(resizeOverlay).observe(video);

// ===== 2. 範囲指定（マウス/タッチ） =====
let isDrawing = false;
let startX = 0, startY = 0, curX = 0, curY = 0;
let captureZoom = 1;
const capturePan = { x: 0, y: 0 };
let capturePanState = null;
let controlPressed = false;

function refreshPanCursors() {
  videoWrapper.classList.toggle('is-pan-ready', controlPressed && captureZoom > 1.001);
  document.querySelectorAll('.preview-viewport.is-zoomed').forEach(viewport => {
    viewport.classList.toggle('is-pan-ready', controlPressed);
  });
}

document.addEventListener('keydown', event => {
  if (event.key !== 'Control' || controlPressed) return;
  controlPressed = true;
  refreshPanCursors();
});
document.addEventListener('keyup', event => {
  if (event.key !== 'Control') return;
  controlPressed = false;
  refreshPanCursors();
});
window.addEventListener('blur', () => {
  controlPressed = false;
  refreshPanCursors();
});

function clampCapturePan() {
  capturePan.x = clampPanOffset(videoWrapper.clientWidth, captureStage.offsetWidth, captureZoom, capturePan.x);
  capturePan.y = clampPanOffset(videoWrapper.clientHeight, captureStage.offsetHeight, captureZoom, capturePan.y);
}

function applyCaptureTransform() {
  clampCapturePan();
  captureStage.style.setProperty('--capture-pan-x', `${capturePan.x}px`);
  captureStage.style.setProperty('--capture-pan-y', `${capturePan.y}px`);
  captureStage.style.setProperty('--capture-zoom', captureZoom);
}

function setCaptureZoom(zoom) {
  captureZoom = Math.min(4, Math.max(0.5, zoom));
  applyCaptureTransform();
  captureZoomLevel.textContent = `${Math.round(captureZoom * 100)}%`;
  refreshPanCursors();
}

function beginCapturePan(event) {
  if (!event.ctrlKey || captureZoom <= 1.001 || event.button !== 0) return false;
  event.preventDefault();
  overlay.setPointerCapture(event.pointerId);
  capturePanState = {
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    x: capturePan.x,
    y: capturePan.y,
  };
  videoWrapper.classList.add('is-panning');
  return true;
}

function moveCapturePan(event) {
  if (!capturePanState) return false;
  capturePan.x = capturePanState.x + event.clientX - capturePanState.clientX;
  capturePan.y = capturePanState.y + event.clientY - capturePanState.clientY;
  applyCaptureTransform();
  return true;
}

function endCapturePan() {
  if (!capturePanState) return false;
  capturePanState = null;
  videoWrapper.classList.remove('is-panning');
  return true;
}

function changeCaptureZoom(deltaY) {
  setCaptureZoom(adjustZoom(captureZoom, deltaY));
}

videoWrapper.addEventListener('wheel', event => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  changeCaptureZoom(event.deltaY);
}, { passive: false });
document.getElementById('capture-zoom-in').addEventListener('click', () => changeCaptureZoom(-1));
document.getElementById('capture-zoom-out').addEventListener('click', () => changeCaptureZoom(1));
document.getElementById('capture-zoom-reset').addEventListener('click', () => setCaptureZoom(1));
document.getElementById('capture-zoom-controls').addEventListener('pointerdown', event => event.stopPropagation());

function getDrawMode() {
  return document.querySelector('input[name="draw-mode"]:checked').value;
}

function getPos(e) {
  const rect = videoWrapper.getBoundingClientRect();
  const bounds = {
    left: rect.left + videoWrapper.clientLeft,
    top: rect.top + videoWrapper.clientTop,
    width: captureStage.offsetWidth,
    height: captureStage.offsetHeight,
  };
  return mapPointToZoomedContent(e.clientX, e.clientY, bounds, captureZoom, capturePan.x, capturePan.y);
}

overlay.addEventListener('pointerdown', (e) => {
  if (beginCapturePan(e)) return;
  const p = getPos(e);

  // 「範囲の移動とリサイズ」モード：掴んだ範囲/ハンドルのドラッグを開始
  if (getDrawMode() === 'edit') {
    const hit = hitTest(p);
    if (hit) {
      overlay.setPointerCapture(e.pointerId);
      dragState = { item: hit.item, handle: hit.handle, startP: p, g0: itemPx(hit.item) };
    }
    return;
  }

  overlay.setPointerCapture(e.pointerId);
  isDrawing = true;
  startX = curX = p.x;
  startY = curY = p.y;
});

overlay.addEventListener('pointermove', (e) => {
  if (moveCapturePan(e)) return;
  const p = getPos(e);
  if (dragState) { applyDrag(p); return; }
  if (!isDrawing) { updateCursor(p); return; }
  curX = p.x;
  curY = p.y;
  redraw();
});

overlay.addEventListener('pointerup', (e) => {
  if (endCapturePan()) return;
  if (dragState) endDrag();
  else finishDrawing();
});
overlay.addEventListener('pointercancel', () => {
  if (endCapturePan()) return;
  if (dragState) endDrag();
  isDrawing = false;
  redraw();
});

function finishDrawing() {
  if (!isDrawing) return;
  isDrawing = false;

  const w = Math.abs(curX - startX);
  const h = Math.abs(curY - startY);
  if (w > 10 && h > 10) {
    const rect = {
      x: Math.min(startX, curX) / overlay.width,
      y: Math.min(startY, curY) / overlay.height,
      w: w / overlay.width,
      h: h / overlay.height,
    };
    if (getDrawMode() === 'ocr') {
      if (ocrRegions.length >= MAX_OCR_REGIONS) {
        alert(`OCR範囲は最大 ${MAX_OCR_REGIONS} 個までです。不要な範囲を削除してください。`);
      } else {
        addOcrRegion(rect);   // 新しいOCR範囲を追加（設定直後に1回読み取る）
      }
    } else {
      setDetectRegion(rect);  // 変化検知範囲は1つ。描き直すと置き換え
    }
    saveSettings();
  }
  redraw();
}

// ----- 範囲の移動とリサイズ -----
const HANDLES = [
  { n: 'nw', sx: -1, sy: -1 }, { n: 'n', sx: 0, sy: -1 }, { n: 'ne', sx: 1, sy: -1 },
  { n: 'e',  sx: 1,  sy: 0 },                              { n: 'se', sx: 1, sy: 1 },
  { n: 's',  sx: 0,  sy: 1 }, { n: 'sw', sx: -1, sy: 1 }, { n: 'w', sx: -1, sy: 0 },
];
const HANDLE_HIT = 9;     // ハンドルの当たり判定(px)
const MIN_REGION = 10;    // 範囲の最小サイズ(px)
let dragState = null;     // { item, handle, startP, g0 }

function allItems() {
  return ocrRegions.concat(detectRegion ? [detectRegion] : []);
}

// 範囲をキャンバス上のピクセル座標で表す（中心・幅・高さ・回転）
function itemPx(it) {
  return {
    cx: (it.x + it.w / 2) * overlay.width,
    cy: (it.y + it.h / 2) * overlay.height,
    w: it.w * overlay.width,
    h: it.h * overlay.height,
    a: angleRad(it),
  };
}

// 画面上の点 ⇔ 範囲の回転座標系（中心原点・範囲の傾きに揃えた座標）
function toLocal(g, p) {
  const dx = p.x - g.cx, dy = p.y - g.cy;
  const c = Math.cos(-g.a), s = Math.sin(-g.a);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}
function toWorld(g, q) {
  const c = Math.cos(g.a), s = Math.sin(g.a);
  return { x: g.cx + q.x * c - q.y * s, y: g.cy + q.x * s + q.y * c };
}

// どのハンドル/範囲の上にいるか（後から追加した範囲を優先。ハンドル → 範囲内部の順）
function hitTest(p) {
  const items = allItems().reverse();
  for (const item of items) {
    const g = itemPx(item);
    const q = toLocal(g, p);
    for (const h of HANDLES) {
      if (Math.hypot(q.x - h.sx * g.w / 2, q.y - h.sy * g.h / 2) <= HANDLE_HIT) return { item, handle: h };
    }
  }
  for (const item of items) {
    const g = itemPx(item);
    const q = toLocal(g, p);
    if (Math.abs(q.x) <= g.w / 2 && Math.abs(q.y) <= g.h / 2) return { item, handle: null };
  }
  return null;
}

function updateCursor(p) {
  if (getDrawMode() !== 'edit') { overlay.style.cursor = 'crosshair'; return; }
  const hit = p ? hitTest(p) : null;
  if (!hit) { overlay.style.cursor = 'default'; return; }
  if (!hit.handle) { overlay.style.cursor = 'move'; return; }
  // ハンドル方向を範囲の傾きぶん回し、45°単位で適切なリサイズカーソルを選ぶ
  const a = angleRad(hit.item);
  const dx = hit.handle.sx, dy = hit.handle.sy;
  const ang = Math.atan2(dx * Math.sin(a) + dy * Math.cos(a), dx * Math.cos(a) - dy * Math.sin(a)) * 180 / Math.PI;
  const idx = ((Math.round(ang / 45) % 4) + 4) % 4;
  overlay.style.cursor = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'][idx];
}

function applyDrag(p) {
  const d = dragState;
  const g = d.g0;
  let cx = g.cx, cy = g.cy, w = g.w, h = g.h;

  if (!d.handle) {
    // 移動
    cx = g.cx + (p.x - d.startP.x);
    cy = g.cy + (p.y - d.startP.y);
    if (g.a === 0) {
      cx = Math.min(Math.max(cx, w / 2), overlay.width - w / 2);
      cy = Math.min(Math.max(cy, h / 2), overlay.height - h / 2);
    } else {
      cx = Math.min(Math.max(cx, 0), overlay.width);
      cy = Math.min(Math.max(cy, 0), overlay.height);
    }
  } else {
    // リサイズ：掴んだ辺/角だけ動かし、反対側は固定（傾いていても傾きに沿って伸縮）
    const q = toLocal(g, p);
    let l = -g.w / 2, r = g.w / 2, t = -g.h / 2, b = g.h / 2;
    const { sx, sy } = d.handle;
    if (sx < 0) l = Math.min(q.x, r - MIN_REGION);
    if (sx > 0) r = Math.max(q.x, l + MIN_REGION);
    if (sy < 0) t = Math.min(q.y, b - MIN_REGION);
    if (sy > 0) b = Math.max(q.y, t + MIN_REGION);
    w = r - l;
    h = b - t;
    const c = toWorld(g, { x: (l + r) / 2, y: (t + b) / 2 });
    cx = c.x;
    cy = c.y;
  }

  const it = d.item;
  it.x = (cx - w / 2) / overlay.width;
  it.y = (cy - h / 2) / overlay.height;
  it.w = w / overlay.width;
  it.h = h / overlay.height;
  redraw();
  if (it.kind === 'ocr') { it.rt.accum = null; try { updatePreview(it); } catch (e) { console.warn(e); } }
}

function endDrag() {
  const it = dragState.item;
  dragState = null;
  resetItem(it, true);   // 判定対象が変わったので基準を取り直す（移動しただけでは読み取らない）
  saveSettings();
  redraw();
}

// 変化判定の基準を最初から取り直す。silent=true なら読み取りは起動しない
function resetItem(it, silent) {
  const rt = it.rt;
  rt.refFrame = null;
  rt.prevFrame = null;
  rt.pending = false;
  rt.rebase = !!silent;
  rt.accum = null;
  rt.refInit = false;
  rt.refPending = false;
}

// 描画モードの切り替え時：カーソルとハンドル表示を更新
document.querySelectorAll('input[name="draw-mode"]').forEach(el => {
  el.addEventListener('change', () => { updateCursor(null); redraw(); });
});

// ===== 範囲の描画 =====
// angle: 範囲の中心まわりの回転(ラジアン)。OCR範囲のみ使用
function drawRect(cx, cy, w, h, angle, color, dash, label) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.setLineDash([]);

  if (label) {
    ctx.font = '12px sans-serif';
    const tw = ctx.measureText(label).width + 8;
    const ly = (cy - h / 2 >= 22) ? -h / 2 - 18 : -h / 2;
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, ly, tw, 18);
    ctx.fillStyle = '#000';
    ctx.fillText(label, -w / 2 + 4, ly + 13);
  }
  ctx.restore();
}

function drawItem(it) {
  const g = itemPx(it);
  drawRect(g.cx, g.cy, g.w, g.h, g.a, regionColor(it), it.kind === 'detect' ? [6, 4] : [], it.name);
}

function drawHandles(it) {
  const g = itemPx(it);
  const color = regionColor(it);
  ctx.save();
  ctx.translate(g.cx, g.cy);
  ctx.rotate(g.a);
  ctx.setLineDash([]);
  for (const h of HANDLES) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(h.sx * g.w / 2 - 4, h.sy * g.h / 2 - 4, 8, 8);
    ctx.strokeRect(h.sx * g.w / 2 - 4, h.sy * g.h / 2 - 4, 8, 8);
  }
  ctx.restore();
}

function redraw() {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (detectRegion) drawItem(detectRegion);
  ocrRegions.forEach(drawItem);

  if (getDrawMode() === 'edit') {
    allItems().forEach(drawHandles);
  }

  if (isDrawing) {
    const mode = getDrawMode();
    const w = Math.abs(curX - startX), h = Math.abs(curY - startY);
    drawRect((startX + curX) / 2, (startY + curY) / 2, w, h, 0,
             mode === 'ocr' ? PALETTE[(nextId - 1) % PALETTE.length] : DETECT_COLOR,
             mode === 'ocr' ? [] : [6, 4], '');
  }
}

// ===== 3. 範囲カード（読み取り設定・切り取りプレビュー・画像前処理・変化検知の設定）の生成 =====
function detectSettingsHtml(isDetect) {
  const accumThr = isDetect ? `
        <label data-when="det.mode=accum">2値化しきい値（加算・減算用）: <span data-val="det.accumThr"></span>
          <input type="range" data-path="det.accumThr" min="0" max="255" step="1">
        </label>` : '';
  const refBlock = isDetect ? `
        <div data-when="det.mode=ref">
          <p class="note note--small note--compact">基準にしたい画面が映った状態で「現在の画像をリファレンスにする」を押してください。この範囲の画像とリファレンス画像の一致率で判定します。</p>
          <button type="button" class="sub ref-capture-btn button-gap-bottom">現在の画像をリファレンスにする</button>
          <img class="ref-img" alt="リファレンス画像" hidden>
          <div class="ref-none note note--small note--danger">リファレンス画像が未設定です</div>
          <label>一致率しきい値: <span data-val="det.refMatch"></span> %
            <input type="range" data-path="det.refMatch" min="1" max="100" step="1">
          </label>
          <label>トリガの条件
            <select data-path="det.refTrigger">
              <option value="above">一致率がしきい値以上になったら（その画面が表示されたら）</option>
              <option value="below">一致率がしきい値未満になったら（その画面が消えたら）</option>
            </select>
          </label>
        </div>` : '';
  const modeOptions = isDetect
    ? `<option value="diff">通常の変化検知</option>
       <option value="accum">ビット加算/減算の結果画像で判定</option>
       <option value="ref">リファレンス画像との一致率で判定</option>`
    : `<option value="diff">通常の変化検知</option>
       <option value="accum">ビット加算/減算の結果画像で判定（結果画像をOCRにも使用）</option>`;
  return `
    <details class="acc" open>
      <summary>変化検知の設定</summary>
      <div class="acc-body">
        <label><input type="checkbox" data-path="det.auto"> ${isDetect ? '条件を満たしたら【すべてのOCR範囲】を自動で読み取る' : '変化があったら自動で読み取る'}</label>
        <label>判定モード
          <select data-path="det.mode">${modeOptions}</select>
        </label>

        <div data-when="det.mode=accum">
          <p class="note note--small note--compact">直近Nフレーム（判定fpsで取得した画像）を2値化して重ね合わせます。背景など変化の激しい部分は白に、動かない文字は黒のまま残る想定です。${isDetect ? '' : '二値化には画像前処理の「二値化しきい値」を使い、重ねた結果画像がプレビュー・変化判定・OCRに使われます。'}</p>
          <label>対象フレーム数: <span data-val="det.accumN"></span> frame
            <input type="range" data-path="det.accumN" min="2" max="30" step="1">
          </label>
          <label>重ね方
            <select data-path="det.accumMode">
              <option value="or">加算（1枚でも白なら白：暗い文字向け）</option>
              <option value="and">減算（全フレームで白のときだけ白：明るい文字向け）</option>
            </select>
          </label>
          ${accumThr}
        </div>
        ${refBlock}

        <label data-when="det.mode=diff|accum">変化量しきい値: <span data-val="det.thr"></span> %（画素の何%が変わったら読み取るか）
          <input type="range" data-path="det.thr" min="0.2" max="30" step="0.2">
        </label>
        <label>画素の差しきい値: <span data-val="det.pix"></span>（0〜255。${isDetect ? '変化検知範囲のグレースケール画像' : 'この範囲の切り取りプレビュー画像'}に対して適用。小さいほど敏感・ノイズに弱い）
          <input type="range" data-path="det.pix" min="5" max="120" step="1">
        </label>
        <label>安定待ち時間: <span data-val="det.stable"></span> ms（条件を満たしてから読み取るまでの待ち。0で即時）
          <input type="range" data-path="det.stable" min="0" max="3000" step="100">
        </label>
      </div>
    </details>`;
}

function getPath(obj, path) { return path.split('.').reduce((o, k) => o[k], obj); }
function setPath(obj, path, val) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = val;
}
function formatVal(path, v) {
  return (path === 'angle' || path === 'det.thr') ? Number(v).toFixed(1) : String(v);
}

// data-when="path=値1|値2" を持つ要素を、現在の設定値に応じて表示/非表示にする
function applyVisibility(root, obj) {
  root.querySelectorAll('[data-when]').forEach(el => {
    const [path, vals] = el.dataset.when.split('=');
    let v;
    try { v = String(getPath(obj, path)); } catch (e) { v = ''; }
    el.classList.toggle('is-hidden', !vals.split('|').includes(v));
  });
}

// data-path を持つ入力要素と、対応するオブジェクトの値を双方向に結び付ける
function bindInputs(root, obj, onChange) {
  root.querySelectorAll('[data-path]').forEach(el => {
    const path = el.dataset.path;
    const label = root.querySelector(`[data-val="${path}"]`);
    const isCheck = el.type === 'checkbox';
    const isSelect = el.tagName === 'SELECT';
    const val = getPath(obj, path);
    if (isCheck) el.checked = !!val; else el.value = val;
    if (label) label.textContent = formatVal(path, val);

    el.addEventListener((isCheck || isSelect) ? 'change' : 'input', () => {
      const v = isCheck ? el.checked : (isSelect ? el.value : Number(el.value));
      setPath(obj, path, v);
      if (label) label.textContent = formatVal(path, v);
      onChange(path);
      applyVisibility(root, obj);
      saveSettings();
    });
  });
  applyVisibility(root, obj);
}

function collectEl(card) {
  const preview = card.querySelector('.preview');
  return {
    card,
    state: card.querySelector('.item-state'),
    diffText: card.querySelector('.item-diff-text'),
    diffFill: card.querySelector('.diff-fill'),
    diffMark: card.querySelector('.diff-mark'),
    preview,
    previewViewport: card.querySelector('.preview-viewport'),
    previewZoomLevel: card.querySelector('.preview-zoom-level'),
    previewCtx: preview ? preview.getContext('2d', { willReadFrequently: true }) : null,
  };
}

const previewZoomLevels = new WeakMap();
const previewPanStates = new WeakMap();

function applyPreviewZoom(canvas, zoom) {
  const viewport = canvas.parentElement;
  const fitWidth = Math.max(1, Math.min(canvas.width, viewport.clientWidth || canvas.width));
  canvas.style.setProperty('--preview-width', `${fitWidth * zoom}px`);
}

function setPreviewZoom(reg, zoom) {
  const level = Math.min(4, Math.max(0.5, zoom));
  const { preview, previewViewport } = reg.rt.el;
  previewZoomLevels.set(preview, level);
  previewViewport.classList.toggle('is-zoomed', level > 1.001);
  applyPreviewZoom(reg.rt.el.preview, level);
  reg.rt.el.previewZoomLevel.textContent = `${Math.round(level * 100)}%`;
  if (level <= 1.001) {
    previewViewport.scrollLeft = 0;
    previewViewport.scrollTop = 0;
  }
  refreshPanCursors();
}

function changePreviewZoom(reg, deltaY) {
  const current = previewZoomLevels.get(reg.rt.el.preview) || 1;
  setPreviewZoom(reg, adjustZoom(current, deltaY));
}

function beginPreviewPan(viewport, event) {
  const canvas = viewport.querySelector('.preview');
  if (!event.ctrlKey || (previewZoomLevels.get(canvas) || 1) <= 1.001 || event.button !== 0) return;
  event.preventDefault();
  viewport.setPointerCapture(event.pointerId);
  previewPanStates.set(viewport, {
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    scrollLeft: viewport.scrollLeft,
    scrollTop: viewport.scrollTop,
  });
  viewport.classList.add('is-panning');
}

function movePreviewPan(viewport, event) {
  const state = previewPanStates.get(viewport);
  if (!state) return;
  viewport.scrollLeft = state.scrollLeft - (event.clientX - state.clientX);
  viewport.scrollTop = state.scrollTop - (event.clientY - state.clientY);
}

function endPreviewPan(viewport) {
  if (!previewPanStates.has(viewport)) return;
  previewPanStates.delete(viewport);
  viewport.classList.remove('is-panning');
}

const DIFF_HTML = `
  <div class="item-state">待機中</div>
  <div class="item-diff-text">変化量: -</div>
  <div class="diff-bar"><div class="diff-fill"></div><div class="diff-mark"></div></div>`;

function buildOcrCard(reg) {
  const card = document.createElement('div');
  card.className = 'panel region-card';
  card.innerHTML = `
    <h3 class="card-title">
      <span class="swatch"></span>
      <span class="rname"></span>
      <button type="button" class="sub del-btn">この範囲を削除</button>
    </h3>
    <div class="preview-zoom-controls">
      <span>プレビュー（Ctrl＋ホイールで拡大、Ctrl＋ドラッグで移動）</span>
      <button type="button" class="sub preview-zoom-out" aria-label="プレビューを縮小">−</button>
      <span class="preview-zoom-level" aria-live="polite">100%</span>
      <button type="button" class="sub preview-zoom-in" aria-label="プレビューを拡大">＋</button>
      <button type="button" class="sub preview-zoom-reset">リセット</button>
    </div>
    <div class="preview-viewport"><canvas class="preview" width="300" height="80"></canvas></div>

    <details class="acc" open>
      <summary>読み取り設定</summary>
      <div class="acc-body">
        <label>読み取り方式
          <select data-path="read.type">
            <option value="ocr">OCR（文字認識）</option>
            <option value="qr">QRコード</option>
          </select>
        </label>
        <label data-when="read.type=ocr">OCRエンジン
          <select data-path="read.engine">
            <option value="tesseract">Tesseract.js</option>
            <option value="ndl">NDLOCR-Lite（モデル読み込みが必要）</option>
            <option value="paddle">PaddleOCR.js（初回にモデルを取得）</option>
          </select>
        </label>
        <label data-when="read.type=ocr"><input type="checkbox" data-path="read.stripWs"> OCR結果のスペース・改行を除去する</label>
        <label data-when="read.type=ocr"><input type="checkbox" data-path="read.prefixUpdate"> 前回結果と前方一致なら、文字送りとみなして前回結果を更新する</label>
      </div>
    </details>

    <details class="acc" open>
      <summary>画像前処理（フィルタ）</summary>
      <div class="acc-body">
        <label>傾き（この範囲の回転）: <span data-val="angle"></span> °
          <input type="range" data-path="angle" min="-45" max="45" step="0.1">
        </label>
        <button type="button" class="sub reset-angle button-gap-bottom--large">傾きをリセット</button>
        <label><input type="checkbox" data-path="filters.gray"> グレースケール化</label>
        <label><input type="checkbox" data-path="filters.bin"> 二値化（白黒化）</label>
        <label>二値化しきい値: <span data-val="filters.thr"></span>
          <input type="range" data-path="filters.thr" min="0" max="255" step="1">
        </label>
        <label><input type="checkbox" data-path="filters.inv"> 白黒反転（ネガポジ）</label>
      </div>
    </details>

    ${detectSettingsHtml(false)}
    ${DIFF_HTML}
    <button type="button" class="exec-btn button-gap-top">この範囲を今すぐ読み取る</button>`;
  card.querySelector('.rname').textContent = reg.name;
  card.querySelector('.card-title .swatch').style.setProperty('--swatch-color', regionColor(reg));
  regionCards.appendChild(card);
  reg.rt.el = collectEl(card);
  reg.rt.el.previewViewport.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    changePreviewZoom(reg, event.deltaY);
  }, { passive: false });
  reg.rt.el.previewViewport.addEventListener('pointerdown', event => beginPreviewPan(reg.rt.el.previewViewport, event));
  reg.rt.el.previewViewport.addEventListener('pointermove', event => movePreviewPan(reg.rt.el.previewViewport, event));
  reg.rt.el.previewViewport.addEventListener('pointerup', () => endPreviewPan(reg.rt.el.previewViewport));
  reg.rt.el.previewViewport.addEventListener('pointercancel', () => endPreviewPan(reg.rt.el.previewViewport));
  card.querySelector('.preview-zoom-in').addEventListener('click', () => changePreviewZoom(reg, -1));
  card.querySelector('.preview-zoom-out').addEventListener('click', () => changePreviewZoom(reg, 1));
  card.querySelector('.preview-zoom-reset').addEventListener('click', () => setPreviewZoom(reg, 1));

  bindInputs(card, reg, (path) => {
    if (path === 'angle' || path.startsWith('filters.') || path === 'det.mode' || path.startsWith('det.accum')) {
      // 画像そのものが変わるので、変化とは見なさず基準を取り直す
      reg.rt.accum = null;
      try { updatePreview(reg); } catch (e) { console.warn(e); }
      resetItem(reg, true);
      if (path === 'angle') redraw();
    }
  });

  card.querySelector('.reset-angle').addEventListener('click', () => {
    const el = card.querySelector('[data-path="angle"]');
    el.value = 0;
    el.dispatchEvent(new Event('input'));
  });
  card.querySelector('.exec-btn').addEventListener('click', () => {
    resetItem(reg, true);
    enqueueOcr(reg, '手動');
  });
  card.querySelector('.del-btn').addEventListener('click', () => removeOcrRegion(reg));
}

function updateRefThumb(det) {
  const el = det.rt.el;
  if (!el) return;
  const img = el.card.querySelector('.ref-img');
  const none = el.card.querySelector('.ref-none');
  if (det.det.refImage) {
    img.src = det.det.refImage;
    img.hidden = false;
    none.classList.add('is-hidden');
  } else {
    img.hidden = true;
    none.classList.remove('is-hidden');
  }
}

function buildDetectCard(det) {
  const card = document.createElement('div');
  card.className = 'panel region-card';
  card.innerHTML = `
    <h3 class="card-title">
      <span class="swatch"></span>
      <span class="rname"></span>
      <button type="button" class="sub del-btn">この範囲を削除</button>
    </h3>
    <p class="note note--small note--detect-help">この範囲が条件を満たしたら、すべてのOCR範囲の読み取りを実行します。</p>
    ${detectSettingsHtml(true)}
    ${DIFF_HTML}`;
  card.querySelector('.rname').textContent = det.name;
  card.querySelector('.card-title .swatch').style.setProperty('--swatch-color', DETECT_COLOR);
  regionCards.appendChild(card);
  det.rt.el = collectEl(card);

  bindInputs(card, det, (path) => {
    if (path === 'det.mode' || path.startsWith('det.accum') || path === 'det.refMatch' || path === 'det.refTrigger') {
      resetItem(det, true);
    }
  });
  updateRefThumb(det);

  card.querySelector('.ref-capture-btn').addEventListener('click', () => {
    if (videoError()) { alert('映像を取得できません: ' + videoError()); return; }
    const s = sampleDetectRaw(det);
    const c = document.createElement('canvas');
    c.width = s.w;
    c.height = s.h;
    const cx = c.getContext('2d');
    const id = cx.createImageData(s.w, s.h);
    for (let i = 0, j = 0; j < s.gray.length; i += 4, j++) {
      id.data[i] = id.data[i + 1] = id.data[i + 2] = s.gray[j];
      id.data[i + 3] = 255;
    }
    cx.putImageData(id, 0, 0);
    det.det.refImage = c.toDataURL('image/png');
    det.rt.refSrc = '';          // 次の判定でリファレンスを読み直す
    resetItem(det, true);
    updateRefThumb(det);
    saveSettings();
  });
  card.querySelector('.del-btn').addEventListener('click', () => removeDetectRegion());
}

function addOcrRegion(rect, saved) {
  let id = saved && saved.id;
  if (!id || ocrRegions.some(r => r.id === id)) id = nextId++;
  nextId = Math.max(nextId, id + 1);
  const reg = {
    kind: 'ocr',
    id,
    name: (saved && saved.name) || `OCR範囲 ${id}`,
    x: rect.x, y: rect.y, w: rect.w, h: rect.h,
    angle: (saved && typeof saved.angle === 'number') ? saved.angle : 0,
    filters: Object.assign({}, DEFAULT_FILTERS, saved && saved.filters),
    det: Object.assign({}, DEFAULT_DET, saved && saved.det),
    read: Object.assign({}, DEFAULT_READ, saved && saved.read),
    rt: newRuntime(),
  };
  if (reg.det.mode === 'ref') reg.det.mode = 'diff';   // リファレンス判定は変化検知範囲のみ
  ocrRegions.push(reg);
  buildOcrCard(reg);
  return reg;
}

function setDetectRegion(rect, saved) {
  if (detectRegion) removeDetectRegion(true);
  detectRegion = {
    kind: 'detect',
    name: '変化検知範囲',
    x: rect.x, y: rect.y, w: rect.w, h: rect.h,
    det: Object.assign({}, DEFAULT_DET, saved && saved.det),
    rt: newRuntime(),
  };
  detectRegion.rt.rebase = true;   // 設定しただけでは読み取らない
  buildDetectCard(detectRegion);
  return detectRegion;
}

function removeOcrRegion(reg) {
  ocrRegions = ocrRegions.filter(r => r !== reg);
  if (reg.rt.el) reg.rt.el.card.remove();
  redraw();
  saveSettings();
}

function removeDetectRegion(skipSave) {
  if (!detectRegion) return;
  if (detectRegion.rt.el) detectRegion.rt.el.card.remove();
  detectRegion = null;
  redraw();
  if (!skipSave) saveSettings();
}

// ===== 4. 切り出し（OCR範囲・傾き補正つき・フルサイズ） =====
function videoError() {
  if (!video.srcObject) return '映像ソースが未接続（カメラ許可を確認）';
  if (!video.videoWidth || video.readyState < 2) return '映像サイズが取得できません（videoWidth=0）';
  return '';
}

// OCR範囲(回転した矩形)の中身を、水平になるよう補正して範囲ごとのキャンバスに描く
function captureCrop(reg) {
  if (videoError()) return null;
  const rt = reg.rt;
  if (!rt.cropCanvas) {
    rt.cropCanvas = document.createElement('canvas');
    rt.cropCtx = rt.cropCanvas.getContext('2d', { willReadFrequently: true });
  }
  const cc = rt.cropCanvas, cx2 = rt.cropCtx;

  const vw = video.videoWidth, vh = video.videoHeight;
  const w = Math.max(1, Math.round(reg.w * vw));
  const h = Math.max(1, Math.round(reg.h * vh));
  const cx = (reg.x + reg.w / 2) * vw;
  const cy = (reg.y + reg.h / 2) * vh;

  if (cc.width !== w) cc.width = w;
  if (cc.height !== h) cc.height = h;

  cx2.setTransform(1, 0, 0, 1, 0, 0);
  cx2.fillStyle = '#fff';           // 映像の外にはみ出した部分は白
  cx2.fillRect(0, 0, w, h);
  cx2.translate(w / 2, h / 2);
  cx2.rotate(-angleRad(reg));       // 範囲の傾きと逆向きに回して水平に戻す
  cx2.drawImage(video, -cx, -cy);
  cx2.setTransform(1, 0, 0, 1, 0, 0);
  return cc;
}

// ===== 5. 画像前処理（フィルタ・ビット加算/減算） =====
// RGBAのピクセル配列にフィルタ設定をその場で適用する
function filterImageData(data, f) {
  const useGrayscale = f.gray;
  const useBinarize = f.bin;
  const threshold = f.thr;
  const useInvert = f.inv;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (useGrayscale || useBinarize) {
      const v = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = v;
    }
    if (useBinarize) {
      const v = r >= threshold ? 255 : 0;
      r = g = b = v;
    }
    if (useInvert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

// 直近Nフレームの2値画像(0/255)を重ねて1枚にする
//  or : 1枚でも白なら白（加算）→ 暗い文字向け。変化の激しい背景は白くなり、動かない文字は黒のまま残る
//  and: 全フレームで白のときだけ白（減算）→ 明るい文字向け
function accumulate(rt, bits, w, h, n, mode) {
  let a = rt.accum;
  if (!a || a.w !== w || a.h !== h || a.n !== n || a.mode !== mode) {
    a = rt.accum = { w, h, n, mode, frames: [] };
  }
  a.frames.push(bits);
  while (a.frames.length > n) a.frames.shift();

  const len = w * h;
  const out = new Uint8Array(len);
  if (mode === 'or') {
    for (const f of a.frames) {
      for (let i = 0; i < len; i++) if (f[i]) out[i] = 255;
    }
  } else {
    out.fill(255);
    for (const f of a.frames) {
      for (let i = 0; i < len; i++) if (!f[i]) out[i] = 0;
    }
  }
  return out;
}

// ビット加算/減算モード：範囲の画像を二値化 → 重ね合わせ → 結果をプレビュー画像にする
function accumulateImage(reg, data, w, h) {
  const f = reg.filters, d = reg.det;
  const n = w * h;
  const bits = new Uint8Array(n);
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    bits[j] = v >= f.thr ? 255 : 0;
  }
  const out = accumulate(reg.rt, bits, w, h, d.accumN, d.accumMode);
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    let v = out[j];
    if (f.inv) v = 255 - v;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
}

// 切り出した画像を加工して、その範囲の切り取りプレビュー(canvas)へ描く
function updatePreview(reg) {
  const crop = captureCrop(reg);
  const el = reg.rt.el;
  if (!crop || !el) return false;

  const pc = el.preview, pctx = el.previewCtx;
  const w = crop.width, h = crop.height;
  if (pc.width !== w) pc.width = w;
  if (pc.height !== h) pc.height = h;

  pctx.drawImage(crop, 0, 0);
  const imageData = pctx.getImageData(0, 0, w, h);
  if (reg.det.mode === 'accum') accumulateImage(reg, imageData.data, w, h);
  else filterImageData(imageData.data, reg.filters);
  pctx.putImageData(imageData, 0, 0);
  applyPreviewZoom(pc, previewZoomLevels.get(pc) || 1);
  reg.rt.previewReady = true;
  return true;
}

// ===== 6. 変化検知 =====
// 判定用に小さな解像度へ縮小してグレースケール配列にする（軽量化のため）
const sampleCanvas = document.createElement('canvas');
const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
const refCanvas = document.createElement('canvas');
const refCtx = refCanvas.getContext('2d', { willReadFrequently: true });
const SAMPLE_BASE = 160;

function sampleSize(sw, sh) {
  const aspect = sw / sh;
  if (aspect >= 1) return { w: SAMPLE_BASE, h: Math.max(8, Math.round(SAMPLE_BASE / aspect)) };
  return { w: Math.max(8, Math.round(SAMPLE_BASE * aspect)), h: SAMPLE_BASE };
}

function toGray(px, w, h) {
  const gray = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    gray[j] = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) | 0;
  }
  return { gray, w, h };
}

// OCR範囲：切り取りプレビュー(フィルタ/加算・減算後)の画像を縮小して判定用データにする
function samplePreview(reg) {
  const pc = reg.rt.el.preview;
  const { w, h } = sampleSize(pc.width, pc.height);
  sampleCanvas.width = w;
  sampleCanvas.height = h;
  sampleCtx.drawImage(pc, 0, 0, pc.width, pc.height, 0, 0, w, h);
  return toGray(sampleCtx.getImageData(0, 0, w, h).data, w, h);
}

// 変化検知範囲：映像の該当部分を縮小してグレースケール化
function sampleDetectRaw(det) {
  const vw = video.videoWidth, vh = video.videoHeight;
  const sx = det.x * vw;
  const sy = det.y * vh;
  const sw = Math.max(1, det.w * vw);
  const sh = Math.max(1, det.h * vh);

  const { w, h } = sampleSize(sw, sh);
  sampleCanvas.width = w;
  sampleCanvas.height = h;
  sampleCtx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  return toGray(sampleCtx.getImageData(0, 0, w, h).data, w, h);
}

// 変化検知範囲の判定画像（加算・減算モードなら、重ね合わせた結果画像）
function sampleDetect(det) {
  const s = sampleDetectRaw(det);
  if (det.det.mode !== 'accum') return s;
  const bits = new Uint8Array(s.gray.length);
  for (let i = 0; i < bits.length; i++) bits[i] = s.gray[i] >= det.det.accumThr ? 255 : 0;
  return { gray: accumulate(det.rt, bits, s.w, s.h, det.det.accumN, det.det.accumMode), w: s.w, h: s.h };
}

// 2画像間で「画素の差がしきい値を超えた画素」の割合(%)を返す
function diffRatio(a, b, pixThr) {
  if (!a || !b || a.w !== b.w || a.h !== b.h) return 100;
  let count = 0;
  const n = a.gray.length;
  for (let i = 0; i < n; i++) {
    if (Math.abs(a.gray[i] - b.gray[i]) > pixThr) count++;
  }
  return (count / n) * 100;
}

function setItemState(it, text, color) {
  const el = it.rt.el;
  if (!el) return;
  el.state.textContent = text;
  el.state.style.setProperty('--state-color', color || '#333');
}

// 指標(変化量/一致率)をバーと数値で表示する
function showMetric(it, label, value, thr, met, scaleMax) {
  const el = it.rt.el;
  if (!el) return;
  const sm = scaleMax || Math.max(thr * 2, 10);
  el.diffText.textContent = `${label}: ${value.toFixed(2)} %（しきい値 ${thr.toFixed(1)} %）`;
  el.diffFill.style.setProperty('--diff-width', `${Math.min(100, (value / sm) * 100)}%`);
  el.diffFill.style.setProperty('--diff-color', met ? '#dc3545' : '#17a2b8');
  el.diffMark.style.setProperty('--diff-position', `${Math.min(100, (thr / sm) * 100)}%`);
}

// 1つの範囲について変化を判定する。「今読み取るべきか」を true/false で返す
function judge(it, cur, now) {
  const rt = it.rt, d = it.det;

  if (!rt.refFrame) {
    rt.refFrame = cur;
    rt.prevFrame = cur;
    if (rt.rebase) {
      // 再読み込み/フィルタ・傾き・移動・モード変更直後：基準を取り直すだけ
      rt.rebase = false;
      rt.pending = false;
    } else {
      // 範囲を追加した直後：最初の1回を読み取るため pending にする
      rt.pending = true;
      rt.lastMotion = now;
    }
  }

  const diffFromRef = diffRatio(cur, rt.refFrame, d.pix);    // 最後に読み取った時点との差
  const diffFromPrev = diffRatio(cur, rt.prevFrame, d.pix);  // 直前画像との差（動いている最中か）
  rt.prevFrame = cur;
  showMetric(it, '変化量', diffFromRef, d.thr, diffFromRef >= d.thr);

  if (!d.auto) {
    setItemState(it, '自動読み取りはオフです（変化量の表示のみ）');
    return false;
  }

  if (!rt.pending && diffFromRef >= d.thr) {
    rt.pending = true;
    rt.lastMotion = now;
  }
  if (!rt.pending) {
    setItemState(it, '監視中（変化なし）', '#198754');
    return false;
  }

  // まだ動いている間は待つ。動きが止まってから stable ms 経過で読み取り
  if (diffFromPrev >= Math.max(0.2, d.thr / 2)) rt.lastMotion = now;
  const waited = now - rt.lastMotion;
  if (waited >= d.stable) {
    rt.refFrame = cur;   // この時点の画像を新しい基準にする
    rt.pending = false;
    return true;
  }
  setItemState(it, `変化を検知。安定待ち... ${Math.max(0, d.stable - waited).toFixed(0)}ms`, '#e8590c');
  return false;
}

// リファレンス画像を、現在の判定画像と同じサイズのグレースケール配列にして返す（未設定/読込中は null）
function getRefSample(it, w, h) {
  const rt = it.rt, d = it.det;
  if (!d.refImage) return null;
  if (rt.refSrc !== d.refImage) {
    rt.refSrc = d.refImage;
    rt.refImgReady = false;
    rt.refCache = null;
    const img = new Image();
    img.onload = () => { rt.refImg = img; rt.refImgReady = true; };
    img.src = d.refImage;
  }
  if (!rt.refImgReady) return null;
  if (!rt.refCache || rt.refCache.w !== w || rt.refCache.h !== h) {
    refCanvas.width = w;
    refCanvas.height = h;
    refCtx.drawImage(rt.refImg, 0, 0, w, h);
    rt.refCache = toGray(refCtx.getImageData(0, 0, w, h).data, w, h);
  }
  return rt.refCache;
}

// リファレンス一致率モード（変化検知範囲のみ）：条件が「成立した瞬間」に1回だけ true を返す
function judgeRef(it, cur, now) {
  const rt = it.rt, d = it.det;
  const refS = getRefSample(it, cur.w, cur.h);
  if (!refS) {
    setItemState(it, d.refImage ? 'リファレンス画像を読み込み中...' : 'リファレンス画像が未設定です', '#dc3545');
    return false;
  }

  const match = 100 - diffRatio(cur, refS, d.pix);   // リファレンスと一致している画素の割合
  const cond = d.refTrigger === 'above' ? match >= d.refMatch : match < d.refMatch;
  showMetric(it, '一致率', match, d.refMatch, cond, 100);

  // 設定直後の初回：すでに成立していても発火させず、いったん不成立になってから成立したときに発火
  if (!rt.refInit) {
    rt.refInit = true;
    rt.refCond = cond;
    rt.refPending = false;
  }

  if (!d.auto) {
    setItemState(it, '自動読み取りはオフです（一致率の表示のみ）');
    return false;
  }
  if (!cond) {
    rt.refCond = false;
    rt.refPending = false;
    setItemState(it, '監視中（条件未成立）', '#198754');
    return false;
  }
  if (rt.refCond) {
    setItemState(it, '条件成立中（いったん不成立になると再トリガ）', '#6c757d');
    return false;
  }
  if (!rt.refPending) { rt.refPending = true; rt.refSince = now; }
  const waited = now - rt.refSince;
  if (waited >= d.stable) {
    rt.refCond = true;
    rt.refPending = false;
    return true;
  }
  setItemState(it, `条件成立。安定待ち... ${Math.max(0, d.stable - waited).toFixed(0)}ms`, '#e8590c');
  return false;
}

function updateDebug() {
  if (!debugText) return;
  debugText.textContent =
    `script ${SCRIPT_VERSION} ／ 映像 ${video.videoWidth}x${video.videoHeight} readyState=${video.readyState}` +
    ` ／ OCR範囲 ${ocrRegions.length} 個 ／ 変化検知範囲 ${detectRegion ? 'あり' : 'なし'}` +
    ` ／ Tesseract: ${typeof Tesseract !== 'undefined' ? 'OK' : '未読込'}` +
    ` ／ ONNX: ${typeof ort !== 'undefined' ? 'OK' : '未読込'} ／ jsQR: ${typeof jsQR !== 'undefined' ? 'OK' : '未読込'}`;
}

function setState(text, color) {
  stateText.textContent = text;
  stateText.style.setProperty('--state-color', color || '#333');
}

// 判定ループ：指定fpsで「プレビュー更新 → 変化判定」を行う
function monitorTick() {
  const fps = parseInt(checkFps.value, 10) || 5;
  setTimeout(monitorTick, 1000 / fps);
  try {
    monitorStep();
  } catch (err) {
    console.error(err);
    setState('判定処理でエラー: ' + err.message, '#dc3545');
  }
}

function monitorStep() {
  updateDebug();
  if (dragState) return;   // 範囲を移動/リサイズしている間は判定しない
  if (ocrRegions.length === 0 && !detectRegion) {
    setState('範囲が未設定です（「OCR範囲を描く」で映像上をドラッグしてください）');
    return;
  }
  const vErr = videoError();
  if (vErr) { setState('映像を取得できません: ' + vErr, '#dc3545'); return; }

  const now = performance.now();

  // 各OCR範囲：プレビューは「自動で読み取る」のON/OFFに関係なく、判定fpsで更新し続ける
  for (const reg of ocrRegions) {
    try {
      if (!updatePreview(reg)) continue;
      if (judge(reg, samplePreview(reg), now)) {
        enqueueOcr(reg, '自動（変化検知）');
      }
    } catch (err) {
      setItemState(reg, '映像の読み取りに失敗: ' + err.message, '#dc3545');
    }
  }

  // 変化検知範囲：条件を満たしたら、すべてのOCR範囲を読み取る
  if (detectRegion) {
    try {
      const cur = sampleDetect(detectRegion);
      const fire = detectRegion.det.mode === 'ref'
        ? judgeRef(detectRegion, cur, now)
        : judge(detectRegion, cur, now);
      if (fire) {
        if (ocrRegions.length === 0) {
          setItemState(detectRegion, 'OCR範囲が未設定です', '#dc3545');
        } else {
          setItemState(detectRegion, `条件成立 → すべてのOCR範囲（${ocrRegions.length}個）を読み取り`, '#0d6efd');
          for (const reg of ocrRegions) {
            resetItem(reg, true);   // 読み取り後の画面を各範囲の新しい基準にする（二重実行の防止）
            enqueueOcr(reg, '自動（変化検知範囲）');
          }
        }
      }
    } catch (err) {
      setItemState(detectRegion, '映像の読み取りに失敗: ' + err.message, '#dc3545');
    }
  }

  setState(`監視中（OCR範囲 ${ocrRegions.length} 個${detectRegion ? ' ＋ 変化検知範囲' : ''}）`, '#198754');
}

// ===== 7. 読み取り：Tesseract.js / NDLOCR-Lite / PaddleOCR.js / QRコード =====
// ----- Tesseract.js（ワーカーを使い回す） -----
let worker = null;
let workerLang = null;

async function getWorker(lang) {
  if (typeof Tesseract === 'undefined') throw new Error('Tesseract.js が読み込まれていません（ネット接続を確認）');
  if (worker && workerLang === lang) return worker;
  if (worker) { await worker.terminate(); worker = null; }

  progressText.textContent = 'OCRエンジンを準備中... (初回は言語データのダウンロードに数秒かかります)';
  worker = await Tesseract.createWorker(lang, 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        progressText.textContent = `文字を認識中... ${Math.round(m.progress * 100)}%`;
      } else {
        progressText.textContent = `準備中: ${m.status}...`;
      }
    }
  });
  workerLang = lang;
  return worker;
}

async function recognizeTesseract(canvas) {
  const w = await getWorker(ocrLang.value);
  const result = await w.recognize(canvas.toDataURL('image/png'));
  return result.data.text;
}

// ----- PaddleOCR.js（ブラウザー内モデル推論。初期化済みインスタンスを共有） -----
let paddleOcrPromise = null;

async function recognizePaddleOcr(canvas) {
  if (!paddleOcrPromise) {
    progressText.textContent = 'PaddleOCRモデルを準備中...（初回はモデルのダウンロードが必要です）';
    paddleOcrPromise = import('@paddleocr/paddleocr-js').then(({ PaddleOCR }) => PaddleOCR.create({
      lang: 'japan',
      ocrVersion: 'PP-OCRv5',
      worker: true,
      ortOptions: {
        backend: 'wasm',
        numThreads: 1,
        wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/',
      },
    })).catch(error => {
      paddleOcrPromise = null;
      throw error;
    });
  }
  const engine = await paddleOcrPromise;
  progressText.textContent = 'PaddleOCRで認識中...';
  const [result] = await engine.predict(canvas);
  return normalizePaddleOcrResult(result);
}

// ----- QRコード（jsQR） -----
function readQr(reg) {
  if (typeof jsQR === 'undefined') throw new Error('jsQR が読み込まれていません（ネット接続を確認）');
  const tryRead = (c, cx) => {
    const id = cx.getImageData(0, 0, c.width, c.height);
    return jsQR(id.data, c.width, c.height, { inversionAttempts: 'attemptBoth' });
  };
  const el = reg.rt.el;
  // まず加工後のプレビュー画像、だめなら加工前の切り出し画像で試す
  let r = tryRead(el.preview, el.previewCtx);
  if (!r && reg.rt.cropCanvas) r = tryRead(reg.rt.cropCanvas, reg.rt.cropCtx);
  return r ? r.data : null;
}

// ----- NDLOCR-Lite（onnxruntime-web。モデルファイルは利用者が読み込み、IndexedDBに保存） -----
// 構成：行検出（この版では画像の行分割で代用）→ 行ごとに PARSeq（30/50/100文字用）で認識
const NDL_DEFAULT_DIMS = { parseq30: [16, 256], parseq50: [16, 384], parseq100: [16, 768] };
const ndl = { files: {}, sessions: {}, charset: null, diag: '' };

function idbOpen() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('ocrAppDb', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'role' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbPut(rec) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGetAll() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction('files', 'readonly').objectStore('files').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function idbClear() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ファイル名から PARSeq モデルの種類(30/50/100文字用)を判定
function parseqRole(lowerName) {
  if (!lowerName.includes('parseq')) return null;
  const tokens = lowerName.replace(/\d+x\d+/, '').match(/\d+/g) || [];
  if (tokens.includes('100')) return 'parseq100';
  if (tokens.includes('50')) return 'parseq50';
  if (tokens.includes('30')) return 'parseq30';
  return null;
}

function decodeYamlQuoted(s) {
  if (s[0] === "'") return s.slice(1, -1).replace(/''/g, "'");
  const inner = s.slice(1, -1)
    .replace(/\\x([0-9a-fA-F]{2})/g, '\\u00$1')
    .replace(/\\U([0-9a-fA-F]{8})/g, (m, h) => String.fromCodePoint(parseInt(h, 16)));
  try { return JSON.parse('"' + inner + '"'); } catch (e) { return inner.replace(/\\(.)/g, '$1'); }
}

// NDLmoji.yaml 等から文字セットを取り出す（charset(_train) の値、なければ最長の引用文字列、なければ本文全体）
function parseCharset(text) {
  const quoted = /"(?:[^"\\]|\\[\s\S])*"|'(?:[^']|'')*'/;
  let m = text.match(new RegExp('charset(?:_train)?\\s*:\\s*(' + quoted.source + ')'));
  if (m) return Array.from(decodeYamlQuoted(m[1]));
  const all = (text.match(new RegExp(quoted.source, 'g')) || []).sort((a, b) => b.length - a.length);
  if (all.length) return Array.from(decodeYamlQuoted(all[0]));
  return Array.from(text.replace(/[\r\n]/g, ''));
}

function refreshNdlStatus() {
  const f = ndl.files;
  const mark = (role, label) => `${label}: ${f[role] ? '✔' : '－'}`;
  const cs = ndl.charset ? `（${ndl.charset.length}文字）` : '';
  ndlStatus.textContent =
    [mark('parseq30', 'PARSeq-30'), mark('parseq50', 'PARSeq-50'), mark('parseq100', 'PARSeq-100'), `文字セット: ${f.charset ? '✔' + cs : '－'}`].join(' ／ ');
}

async function loadNdlFilesFromDb() {
  try {
    const all = await idbGetAll();
    ndl.files = {};
    all.forEach(r => { ndl.files[r.role] = r; });
    ndl.sessions = {};
    ndl.charset = ndl.files.charset ? parseCharset(ndl.files.charset.text) : null;
  } catch (err) {
    console.warn('NDLOCRモデルの読み込みに失敗:', err);
  }
  refreshNdlStatus();
}

ndlFilesInput.addEventListener('change', async () => {
  const notes = [];
  for (const f of ndlFilesInput.files) {
    const lower = f.name.toLowerCase();
    try {
      if (lower.endsWith('.onnx')) {
        const role = parseqRole(lower);
        if (!role) { notes.push(`${f.name}: 未使用のモデルです（PARSeq の30/50/100のみ使用）`); continue; }
        const dm = lower.match(/(\d+)x(\d+)/);
        await idbPut({ role, fileName: f.name, data: await f.arrayBuffer(), dims: dm ? [parseInt(dm[1], 10), parseInt(dm[2], 10)] : null });
      } else if (/\.(ya?ml|txt)$/.test(lower)) {
        await idbPut({ role: 'charset', fileName: f.name, text: await f.text() });
      } else {
        notes.push(`${f.name}: 対応していない形式です`);
      }
    } catch (err) {
      notes.push(`${f.name}: 保存に失敗しました（${err.message}）`);
    }
  }
  ndlFilesInput.value = '';
  await loadNdlFilesFromDb();
  if (notes.length) ndlStatus.textContent += '\n' + notes.join('\n');
});

ndlClearBtn.addEventListener('click', async () => {
  if (!confirm('保存済みのNDLOCR-Liteモデルと文字セットをすべて削除します。よろしいですか？')) return;
  await idbClear();
  await loadNdlFilesFromDb();
});

async function ndlGetSession(role) {
  if (ndl.sessions[role]) return ndl.sessions[role];
  const rec = ndl.files[role];
  if (!rec) return null;
  if (typeof ort === 'undefined') throw new Error('onnxruntime-web が読み込まれていません（ネット接続を確認）');
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/';
  ort.env.wasm.numThreads = 1;   // COOP/COEPヘッダーなしでも動くよう単一スレッド

  progressText.textContent = `NDLOCR-Lite（${role}）のモデルを読み込み中...`;
  const session = await ort.InferenceSession.create(new Uint8Array(rec.data), { executionProviders: ['wasm'] });

  // 入力サイズ：モデルのメタ情報 → ファイル名の「16x256」→ 既定値 の順に採用
  let dims = rec.dims || NDL_DEFAULT_DIMS[role];
  try {
    const shape = session.inputMetadata && session.inputMetadata[session.inputNames[0]] && session.inputMetadata[session.inputNames[0]].shape;
    if (shape && shape.length === 4 && typeof shape[2] === 'number' && typeof shape[3] === 'number') dims = [shape[2], shape[3]];
  } catch (e) { /* メタ情報が無いバージョンでは無視 */ }

  ndl.sessions[role] = { session, H: dims[0], W: dims[1] };
  return ndl.sessions[role];
}

// 画像を「文字行」ごとに分割する（行検出モデル DEIMv2 の代わりに、2値化した画像の水平投影で行を切り出す）
function segmentLines(canvas) {
  const w = canvas.width, h = canvas.height;
  const cx = canvas.getContext('2d');
  const px = cx.getImageData(0, 0, w, h).data;
  const gray = new Uint8Array(w * h);
  const hist = new Array(256).fill(0);
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) {
    const v = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) | 0;
    gray[j] = v;
    hist[v]++;
  }
  // 大津の方法でしきい値を決め、少数派の色を「文字（インク）」とみなす
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let wB = 0, sumB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = gray.length - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = t; }
  }
  let dark = 0;
  for (let j = 0; j < gray.length; j++) if (gray[j] <= thr) dark++;
  const inkIsDark = dark <= gray.length - dark;
  const isInk = j => (inkIsDark ? gray[j] <= thr : gray[j] > thr);

  const rows = new Uint32Array(h);
  for (let y = 0; y < h; y++) {
    let c = 0;
    for (let x = 0; x < w; x++) if (isInk(y * w + x)) c++;
    rows[y] = c;
  }
  const minInk = Math.max(1, Math.round(w * 0.004));
  let runs = [];
  let start = -1;
  for (let y = 0; y <= h; y++) {
    const on = y < h && rows[y] >= minInk;
    if (on && start < 0) start = y;
    if (!on && start >= 0) { runs.push([start, y]); start = -1; }
  }
  // 近すぎる行どうし（濁点・句点などで分断されたもの）は結合
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] <= 0.25 * Math.max(last[1] - last[0], r[1] - r[0])) last[1] = r[1];
    else merged.push([r[0], r[1]]);
  }
  runs = merged.filter(r => r[1] - r[0] >= 4);
  if (runs.length === 0) return [canvas];

  const lines = [];
  for (const [y0, y1] of runs) {
    const lh = y1 - y0;
    const padY = Math.max(2, Math.round(lh * 0.2));
    const top = Math.max(0, y0 - padY), bottom = Math.min(h, y1 + padY);
    let xmin = w, xmax = -1;
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < w; x++) {
        if (isInk(y * w + x)) { if (x < xmin) xmin = x; if (x > xmax) xmax = x; }
      }
    }
    if (xmax < 0) continue;
    const padX = Math.max(2, Math.round(lh * 0.3));
    const left = Math.max(0, xmin - padX), right = Math.min(w, xmax + 1 + padX);
    const c = document.createElement('canvas');
    c.width = right - left;
    c.height = bottom - top;
    c.getContext('2d').drawImage(canvas, left, top, c.width, c.height, 0, 0, c.width, c.height);
    lines.push(c);
  }
  return lines.length ? lines : [canvas];
}

// 1行ぶんの画像を PARSeq で認識する
async function ndlRecognizeLine(lineCanvas) {
  // 行のアスペクト比から文字数を見積もり、30/50/100文字用のモデルを選ぶ
  const est = Math.ceil(lineCanvas.width / Math.max(1, lineCanvas.height));
  const order = est <= 30 ? ['parseq30', 'parseq50', 'parseq100']
              : est <= 50 ? ['parseq50', 'parseq100', 'parseq30']
              : ['parseq100', 'parseq50', 'parseq30'];
  const role = order.find(r => ndl.files[r]);
  if (!role) throw new Error('NDLOCR-LiteのPARSeqモデルが読み込まれていません');

  const s = await ndlGetSession(role);
  const { H, W } = s;

  // 固定サイズ(H×W)へ伸縮し、(x/255-0.5)/0.5 で正規化した float32[1,3,H,W] を作る
  const t = document.createElement('canvas');
  t.width = W;
  t.height = H;
  const tc = t.getContext('2d', { willReadFrequently: true });
  tc.fillStyle = '#fff';
  tc.fillRect(0, 0, W, H);
  tc.imageSmoothingQuality = 'high';
  tc.drawImage(lineCanvas, 0, 0, W, H);
  const px = tc.getImageData(0, 0, W, H).data;
  const plane = W * H;
  const input = new Float32Array(3 * plane);
  for (let i = 0, j = 0; j < plane; i += 4, j++) {
    input[j] = (px[i] / 255 - 0.5) / 0.5;
    input[plane + j] = (px[i + 1] / 255 - 0.5) / 0.5;
    input[2 * plane + j] = (px[i + 2] / 255 - 0.5) / 0.5;
  }
  const feeds = { [s.session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, H, W]) };
  const out = (await s.session.run(feeds))[s.session.outputNames[0]];

  // 出力 logits[1, T, C] を位置ごとに argmax。0番はEOS、1〜は文字セットの先頭から
  const [, T, C] = out.dims;
  const data = out.data;
  const cs = ndl.charset;
  ndl.diag = `${role}（入力 ${H}x${W}）／ 出力 [${out.dims.join(',')}] ／ 文字セット ${cs.length}文字 ／ クラス数−文字数=${C - cs.length}（PARSeqの標準は3）`;
  let text = '';
  for (let ti = 0; ti < T; ti++) {
    let bi = 0, bv = -Infinity;
    for (let c = 0; c < C; c++) {
      const v = data[ti * C + c];
      if (v > bv) { bv = v; bi = c; }
    }
    if (bi === 0) break;                 // EOS
    const ch = cs[bi - 1];
    if (ch !== undefined) text += ch;    // [B],[P] など文字セット外の番号は無視
  }
  return text;
}

async function recognizeNdl(canvas) {
  if (!ndl.charset || ndl.charset.length === 0) {
    throw new Error('NDLOCR-Liteの文字セット（NDLmoji.yaml）が読み込まれていません');
  }
  const lines = segmentLines(canvas);
  const texts = [];
  for (const line of lines) texts.push(await ndlRecognizeLine(line));
  progressText.textContent = 'NDLOCR診断: ' + ndl.diag;
  return texts.join('\n');
}

// ----- 読み取りの待ち行列（範囲ごとに順番に実行） -----
const ocrQueue = [];
let ocrRunning = false;

function enqueueOcr(reg, reason) {
  if (reg.rt.queued) return;   // 同じ範囲が既に待ち行列にあれば重複させない
  reg.rt.queued = true;
  setItemState(reg, '読み取り待ち...', '#0d6efd');
  ocrQueue.push({ reg, reason });
  processQueue();
}

async function processQueue() {
  if (ocrRunning) return;
  ocrRunning = true;
  try {
    while (ocrQueue.length > 0) {
      const job = ocrQueue.shift();
      job.reg.rt.queued = false;
      if (!ocrRegions.includes(job.reg)) continue;   // 待っている間に削除された
      await runOcrJob(job);
    }
  } finally {
    ocrRunning = false;
  }
}

async function runOcrJob({ reg, reason }) {
  try {
    // 最新の状態でプレビューを更新（加算/減算モードは直近のフレーム履歴の結果をそのまま使う）
    if (reg.det.mode !== 'accum' || !reg.rt.previewReady) {
      if (!updatePreview(reg)) return;
    }
    const canvas = reg.rt.el.preview;

    setItemState(reg, '読み取り中...', '#0d6efd');
    let text, method;
    if (reg.read.type === 'qr') {
      method = 'QR';
      text = readQr(reg);
      if (text === null) {
        setItemState(reg, 'QRコードが見つかりません', '#dc3545');
        progressText.textContent = `${reg.name}: QRコードが見つかりませんでした`;
        return;
      }
    } else {
      const recognizers = {
        tesseract: recognizeTesseract,
        ndl: recognizeNdl,
        paddle: recognizePaddleOcr,
      };
      const methodNames = { tesseract: 'Tesseract', ndl: 'NDLOCR-Lite', paddle: 'PaddleOCR' };
      const engine = reg.read.engine in recognizers ? reg.read.engine : 'tesseract';
      method = methodNames[engine];
      text = (await recognizers[engine](canvas)).trim();
      // スペース・改行の除去（範囲ごとにON/OFF）。全角スペースも含む
      if (reg.read.stripWs) text = text.replace(/[\s\u3000]+/g, '');
    }

    addLogEntry({ text, reason, region: reg.name, method, prefixUpdate: reg.read.type === 'ocr' && reg.read.prefixUpdate });
    if (reg.read.type === 'qr' || reg.read.engine !== 'ndl') progressText.textContent = `${reg.name}: 完了`;
    setItemState(reg, '読み取り完了', '#198754');
  } catch (err) {
    console.error(err);
    progressText.textContent = `${reg.name}: 読み取り中にエラーが発生しました: ${err.message}`;
    setItemState(reg, '読み取りエラー', '#dc3545');
  }
}

// ===== 8. 読み取り結果ログ（チャット形式表示・自動保存・1件ずつ削除・CSV出力・文字送りの更新） =====
const LOG_KEY = 'ocrResultLogV1';
let ocrLog = [];   // { id, time: ミリ秒, region: 範囲名, method: 方式, reason: 実行理由, text: 結果, updates: 文字送り更新の回数 }

function newLogId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

try {
  ocrLog = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  if (!Array.isArray(ocrLog)) ocrLog = [];
} catch (err) {
  console.warn('ログの読み込みに失敗:', err);
  ocrLog = [];
}
// 以前のバージョンで保存されたログにも削除用のIDを付ける
ocrLog.forEach(e => { if (!e.id) e.id = newLogId(); });

function saveLog() {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(ocrLog));
  } catch (err) {
    console.warn('ログの保存に失敗:', err);
  }
}

function pad2(n) { return String(n).padStart(2, '0'); }

function formatTime(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
         `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function showEmptyLogIfNeeded() {
  if (ocrLog.length === 0 && !logList.querySelector('.log-empty')) {
    logList.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'log-empty';
    empty.textContent = '結果がここに時刻付きで蓄積されます...';
    logList.appendChild(empty);
  }
}

async function copyTextToClipboard(text) {
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

function createLogElement(entry) {
  const item = document.createElement('div');
  item.className = 'log-item';
  item.dataset.id = entry.id;

  const head = document.createElement('div');
  head.className = 'log-head';

  const meta = document.createElement('div');
  meta.className = 'log-meta';
  const parts = [formatTime(entry.time), entry.region, entry.method, entry.reason];
  if (entry.updates) parts.push(`文字送り更新 ×${entry.updates}`);
  meta.textContent = parts.filter(Boolean).join(' ／ ');

  const actions = document.createElement('div');
  actions.className = 'log-actions';

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'log-copy';
  copy.title = 'OCR結果をクリップボードにコピー';
  copy.setAttribute('aria-label', 'OCR結果をクリップボードにコピー');
  copy.textContent = 'コピー';
  copy.addEventListener('click', async () => {
    try {
      await copyTextToClipboard(entry.text || '');
      copy.textContent = 'コピー済み';
    } catch (error) {
      console.error(error);
      copy.textContent = '失敗';
    }
    copy.disabled = true;
    setTimeout(() => {
      if (!copy.isConnected) return;
      copy.textContent = 'コピー';
      copy.disabled = false;
    }, 1200);
  });

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'log-del';
  del.title = 'この結果を削除';
  del.textContent = '✕ 削除';
  del.addEventListener('click', () => deleteLogEntry(entry.id));

  head.appendChild(meta);
  actions.appendChild(copy);
  actions.appendChild(del);
  head.appendChild(actions);

  const body = document.createElement('div');
  body.className = 'log-text' + (entry.text ? '' : ' empty');
  body.textContent = entry.text || '（テキストが検出されませんでした）';

  item.appendChild(head);
  item.appendChild(body);
  return item;
}

function updateLogCount() {
  logCount.textContent = ocrLog.length ? `（${ocrLog.length}件）` : '';
}

function renderLog() {
  logList.innerHTML = '';
  ocrLog.forEach(e => logList.appendChild(createLogElement(e)));
  showEmptyLogIfNeeded();
  logList.scrollTop = logList.scrollHeight;
  updateLogCount();
}

// 結果を追加する。prefixUpdate=true で、同じ範囲の前回結果と前方一致するなら「文字送りで文字が増えた」とみなし、新規行を作らず前回の行を更新する
function addLogEntry({ text, reason, region, method, prefixUpdate }) {
  if (prefixUpdate && text) {
    let prev = null;
    for (let i = ocrLog.length - 1; i >= 0; i--) {
      if ((ocrLog[i].region || '') === (region || '')) { prev = ocrLog[i]; break; }
    }
    if (prev && prev.text && text.startsWith(prev.text)) {
      prev.text = text;
      prev.time = Date.now();
      prev.reason = reason;
      prev.method = method;
      prev.updates = (prev.updates || 0) + 1;
      saveLog();
      const el = logList.querySelector(`.log-item[data-id="${prev.id}"]`);
      if (el) el.replaceWith(createLogElement(prev));
      return;
    }
  }

  const entry = { id: newLogId(), time: Date.now(), region: region || '', method: method || '', reason, text, updates: 0 };
  ocrLog.push(entry);
  saveLog();

  // 空状態の表示を消してから追記し、最新が見えるよう最下部へスクロール
  const empty = logList.querySelector('.log-empty');
  if (empty) empty.remove();
  logList.appendChild(createLogElement(entry));
  logList.scrollTop = logList.scrollHeight;
  updateLogCount();
}

function deleteLogEntry(id) {
  ocrLog = ocrLog.filter(e => e.id !== id);
  saveLog();
  const el = logList.querySelector(`.log-item[data-id="${id}"]`);
  if (el) el.remove();
  showEmptyLogIfNeeded();
  updateLogCount();
}

function csvEscape(value) {
  return '"' + String(value).replace(/"/g, '""') + '"';
}

function downloadCsv() {
  if (ocrLog.length === 0) {
    alert('保存された結果がありません。');
    return;
  }
  const lines = ['日時,範囲,方式,実行理由,結果'];
  ocrLog.forEach(e => {
    lines.push([formatTime(e.time), e.region || '', e.method || '', e.reason, e.text].map(csvEscape).join(','));
  });
  // 先頭にBOMを付けてExcelでも日本語が文字化けしないようにする
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  a.href = url;
  a.download = `ocr_results_${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_` +
               `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

csvBtn.addEventListener('click', downloadCsv);
clearLogBtn.addEventListener('click', () => {
  if (ocrLog.length === 0) return;
  if (!confirm(`保存済みの結果 ${ocrLog.length} 件をすべて消去します。よろしいですか？\n（必要ならCSVを先にダウンロードしてください）`)) return;
  ocrLog = [];
  saveLog();
  renderLog();
});

renderLog();

// ===== 共通設定の保存 =====
checkFps.addEventListener('change', saveSettings);
ocrLang.addEventListener('change', saveSettings);   // 次回OCR時にワーカーが作り直される
setSelect.addEventListener('change', saveSettings);

// ===== 開始 =====
const lastSetName = loadSettings();
refreshSetSelect(lastSetName);
loadNdlFilesFromDb();
redraw();
initCamera();
monitorTick();