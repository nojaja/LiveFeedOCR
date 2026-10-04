// ===== 要素 =====
const SCRIPT_VERSION = 'v5';
const debugText = document.getElementById('debug-text');
const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
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

// ===== 状態 =====
// 範囲は映像サイズに対する割合(0〜1)で保持する（ウィンドウサイズが変わってもズレない）
// ・OCR範囲(複数可)  : それぞれが「切り取りプレビュー」「画像前処理」「変化検知の設定」「傾き」を持つ
// ・変化検知範囲(1つ): 変化したら「すべてのOCR範囲」をOCRする
const DEFAULT_FILTERS = { gray: true, bin: true, thr: 128, inv: false };
const DEFAULT_DET = { auto: true, thr: 3, pix: 30, stable: 500 };
const PALETTE = ['#00e676', '#00b0ff', '#e040fb', '#ffea00', '#ff5252', '#69f0ae', '#40c4ff', '#ff80ab'];
const DETECT_COLOR = '#ff9800';
const MAX_OCR_REGIONS = PALETTE.length;

let ocrRegions = [];      // { kind:'ocr', id, name, x,y,w,h, angle(度), filters, det, rt }
let detectRegion = null;  // { kind:'detect', name, x,y,w,h, det, rt }
let nextId = 1;

// rt = 保存しない実行時の状態
function newRuntime() {
  return {
    refFrame: null,    // 「最後にOCRした時点」の判定画像
    prevFrame: null,   // 1つ前の判定画像
    pending: false,    // 変化を検知してOCR待ちか
    lastMotion: 0,     // 最後に「動き」を検知した時刻
    rebase: false,     // true: 次の判定画像を基準にするだけ（OCRは起動しない）
    queued: false,     // OCR待ち行列に入っているか
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

// ===== 設定の自動保存（範囲・画像前処理・変化検知の設定など） =====
const SETTINGS_KEY = 'ocrSettingsV1';

function serializeItem(it) {
  const o = { name: it.name, x: it.x, y: it.y, w: it.w, h: it.h, det: it.det };
  if (it.kind === 'ocr') { o.id = it.id; o.angle = it.angle; o.filters = it.filters; }
  return o;
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      nextId,
      ocrRegions: ocrRegions.map(serializeItem),
      detect: detectRegion ? serializeItem(detectRegion) : null,
      common: { fps: checkFps.value, lang: ocrLang.value },
    }));
  } catch (err) {
    console.warn('設定の保存に失敗:', err);
  }
}

function loadSettings() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch (err) { console.warn(err); }
  if (!data) return;

  if (data.common) {
    if (data.common.fps) checkFps.value = data.common.fps;
    if (data.common.lang) ocrLang.value = data.common.lang;
  }
  nextId = data.nextId || 1;
  (data.ocrRegions || []).slice(0, MAX_OCR_REGIONS).forEach(s => {
    const reg = addOcrRegion({ x: s.x, y: s.y, w: s.w, h: s.h }, s);
    reg.rt.rebase = true;   // 再読み込み直後に勝手にOCRしない
    nextId = Math.max(nextId, reg.id + 1);
  });
  if (data.detect) {
    const d = setDetectRegion({ x: data.detect.x, y: data.detect.y, w: data.detect.w, h: data.detect.h }, data.detect);
    d.rt.rebase = true;
  }
}

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
  redraw();
}
video.addEventListener('loadedmetadata', resizeOverlay);
window.addEventListener('resize', resizeOverlay);
if (window.ResizeObserver) new ResizeObserver(resizeOverlay).observe(video);

// ===== 2. 範囲指定（マウス/タッチ） =====
let isDrawing = false;
let startX = 0, startY = 0, curX = 0, curY = 0;

function getDrawMode() {
  return document.querySelector('input[name="draw-mode"]:checked').value;
}

function getPos(e) {
  const rect = overlay.getBoundingClientRect();
  return {
    x: Math.min(Math.max(e.clientX - rect.left, 0), rect.width),
    y: Math.min(Math.max(e.clientY - rect.top, 0), rect.height),
  };
}

overlay.addEventListener('pointerdown', (e) => {
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
  const p = getPos(e);
  if (dragState) { applyDrag(p); return; }
  if (!isDrawing) { updateCursor(p); return; }
  curX = p.x;
  curY = p.y;
  redraw();
});

overlay.addEventListener('pointerup', () => {
  if (dragState) endDrag();
  else finishDrawing();
});
overlay.addEventListener('pointercancel', () => {
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
        addOcrRegion(rect);   // 新しいOCR範囲を追加（設定直後に1回OCRする）
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
  if (it.kind === 'ocr') { try { updatePreview(it); } catch (e) { console.warn(e); } }
}

function endDrag() {
  const it = dragState.item;
  dragState = null;
  resetItem(it, it.kind === 'detect');   // 判定対象が変わったので基準をリセット
  saveSettings();
  redraw();
}

// 変化判定の基準を最初から取り直す。silent=true ならOCRは起動しない
function resetItem(it, silent) {
  const rt = it.rt;
  rt.refFrame = null;
  rt.prevFrame = null;
  rt.pending = false;
  rt.rebase = !!silent;
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

// ===== 3. 範囲カード（切り取りプレビュー・画像前処理・変化検知の設定）の生成 =====
function detectSettingsHtml(isDetect) {
  return `
    <details class="acc" open>
      <summary>変化検知の設定</summary>
      <div class="acc-body">
        <label><input type="checkbox" data-path="det.auto"> ${isDetect ? '変化があったら【すべてのOCR範囲】を自動でOCRする' : '変化があったら自動でOCRする'}</label>
        <label>変化量しきい値: <span data-val="det.thr"></span> %（画素の何%が変わったらOCRするか）
          <input type="range" data-path="det.thr" min="0.2" max="30" step="0.2">
        </label>
        <label>画素の差しきい値: <span data-val="det.pix"></span>（0〜255。${isDetect ? 'グレースケール画像' : 'この範囲の切り取りプレビュー画像'}に対して適用。小さいほど敏感・ノイズに弱い）
          <input type="range" data-path="det.pix" min="5" max="120" step="1">
        </label>
        <label>安定待ち時間: <span data-val="det.stable"></span> ms（変化が止まってからOCRするまでの待ち）
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

// data-path を持つ入力要素と、対応するオブジェクトの値を双方向に結び付ける
function bindInputs(root, obj, onChange) {
  root.querySelectorAll('[data-path]').forEach(el => {
    const path = el.dataset.path;
    const label = root.querySelector(`[data-val="${path}"]`);
    const isCheck = el.type === 'checkbox';
    const val = getPath(obj, path);
    if (isCheck) el.checked = !!val; else el.value = val;
    if (label) label.textContent = formatVal(path, val);

    el.addEventListener(isCheck ? 'change' : 'input', () => {
      const v = isCheck ? el.checked : Number(el.value);
      setPath(obj, path, v);
      if (label) label.textContent = formatVal(path, v);
      onChange(path);
      saveSettings();
    });
  });
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
    previewCtx: preview ? preview.getContext('2d', { willReadFrequently: true }) : null,
  };
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
      <span class="swatch" style="background:${regionColor(reg)}"></span>
      <span class="rname"></span>
      <button type="button" class="sub del-btn">この範囲を削除</button>
    </h3>
    <canvas class="preview" width="300" height="80"></canvas>

    <details class="acc" open>
      <summary>画像前処理（フィルタ）</summary>
      <div class="acc-body">
        <label>傾き（この範囲の回転）: <span data-val="angle"></span> °
          <input type="range" data-path="angle" min="-45" max="45" step="0.1">
        </label>
        <button type="button" class="sub reset-angle" style="margin-bottom:8px;">傾きをリセット</button>
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
    <button type="button" class="exec-btn" style="margin-top:10px;">この範囲を今すぐOCR</button>`;
  card.querySelector('.rname').textContent = reg.name;
  regionCards.appendChild(card);
  reg.rt.el = collectEl(card);

  bindInputs(card, reg, (path) => {
    if (path === 'angle' || path.startsWith('filters.')) {
      // 画像そのものが変わるので、変化とは見なさず基準を取り直す
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

function buildDetectCard(det) {
  const card = document.createElement('div');
  card.className = 'panel region-card';
  card.innerHTML = `
    <h3 class="card-title">
      <span class="swatch" style="background:${DETECT_COLOR}"></span>
      <span class="rname"></span>
      <button type="button" class="sub del-btn">この範囲を削除</button>
    </h3>
    <p class="note" style="font-size:12px;color:#666;margin:0 0 10px;">この範囲が「変化あり」と判定されたら、すべてのOCR範囲のOCRを実行します。</p>
    ${detectSettingsHtml(true)}
    ${DIFF_HTML}`;
  card.querySelector('.rname').textContent = det.name;
  regionCards.appendChild(card);
  det.rt.el = collectEl(card);

  bindInputs(card, det, () => {});
  card.querySelector('.del-btn').addEventListener('click', () => removeDetectRegion());
}

function addOcrRegion(rect, saved) {
  const id = saved && saved.id ? saved.id : nextId++;
  const reg = {
    kind: 'ocr',
    id,
    name: (saved && saved.name) || `OCR範囲 ${id}`,
    x: rect.x, y: rect.y, w: rect.w, h: rect.h,
    angle: (saved && saved.angle) || 0,
    filters: Object.assign({}, DEFAULT_FILTERS, saved && saved.filters),
    det: Object.assign({}, DEFAULT_DET, saved && saved.det),
    rt: newRuntime(),
  };
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
  detectRegion.rt.rebase = true;   // 設定しただけではOCRしない
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

// ===== 5. 画像前処理（フィルタ適用） =====
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

// 切り出した画像にフィルタをかけて、その範囲の切り取りプレビュー(canvas)へ描く
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
  filterImageData(imageData.data, reg.filters);
  pctx.putImageData(imageData, 0, 0);
  return true;
}

// ===== 6. 変化検知 =====
// 判定用に小さな解像度へ縮小してグレースケール配列にする（軽量化のため）
const sampleCanvas = document.createElement('canvas');
const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
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

// OCR範囲：切り取りプレビュー(フィルタ適用後)の画像を縮小して判定用データにする
function samplePreview(reg) {
  const pc = reg.rt.el.preview;
  const { w, h } = sampleSize(pc.width, pc.height);
  sampleCanvas.width = w;
  sampleCanvas.height = h;
  sampleCtx.drawImage(pc, 0, 0, pc.width, pc.height, 0, 0, w, h);
  return toGray(sampleCtx.getImageData(0, 0, w, h).data, w, h);
}

// 変化検知範囲：映像の該当部分を縮小してグレースケール化
function sampleDetect(det) {
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
  el.state.style.color = color || '#333';
}

function showDiff(it, ratio) {
  const el = it.rt.el;
  if (!el) return;
  const thr = it.det.thr;
  const scaleMax = Math.max(thr * 2, 10);
  el.diffText.textContent = `変化量: ${ratio.toFixed(2)} %（しきい値 ${thr.toFixed(1)} %）`;
  el.diffFill.style.width = Math.min(100, (ratio / scaleMax) * 100) + '%';
  el.diffFill.style.background = ratio >= thr ? '#dc3545' : '#17a2b8';
  el.diffMark.style.left = Math.min(100, (thr / scaleMax) * 100) + '%';
}

// 1つの範囲について変化を判定する。「今OCRすべきか」を true/false で返す
function judge(it, cur, now) {
  const rt = it.rt, d = it.det;

  if (!rt.refFrame) {
    rt.refFrame = cur;
    rt.prevFrame = cur;
    if (rt.rebase) {
      // 再読み込み/フィルタ・傾き変更/移動直後：基準を取り直すだけ
      rt.rebase = false;
      rt.pending = false;
    } else {
      // 範囲を追加した直後：最初の1回をOCRするため pending にする
      rt.pending = true;
      rt.lastMotion = now;
    }
  }

  const diffFromRef = diffRatio(cur, rt.refFrame, d.pix);    // 最後のOCR時点との差
  const diffFromPrev = diffRatio(cur, rt.prevFrame, d.pix);  // 直前画像との差（動いている最中か）
  rt.prevFrame = cur;
  showDiff(it, diffFromRef);

  if (!d.auto) {
    setItemState(it, '自動OCRはオフです（変化量の表示のみ）');
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

  // まだ動いている間は待つ。動きが止まってから stable ms 経過でOCR
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

function updateDebug() {
  if (!debugText) return;
  debugText.textContent =
    `script ${SCRIPT_VERSION} ／ 映像 ${video.videoWidth}x${video.videoHeight} readyState=${video.readyState}` +
    ` ／ OCR範囲 ${ocrRegions.length} 個 ／ 変化検知範囲 ${detectRegion ? 'あり' : 'なし'}` +
    ` ／ Tesseract: ${typeof Tesseract !== 'undefined' ? 'OK' : '未読込'}`;
}

function setState(text, color) {
  stateText.textContent = text;
  stateText.style.color = color || '#333';
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

  // 各OCR範囲：プレビューは「自動でOCRする」のON/OFFに関係なく、判定fpsで更新し続ける
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

  // 変化検知範囲：変化ありなら、すべてのOCR範囲をOCRする
  if (detectRegion) {
    try {
      if (judge(detectRegion, sampleDetect(detectRegion), now)) {
        if (ocrRegions.length === 0) {
          setItemState(detectRegion, 'OCR範囲が未設定です', '#dc3545');
        } else {
          setItemState(detectRegion, `変化を検知 → すべてのOCR範囲（${ocrRegions.length}個）をOCR`, '#0d6efd');
          for (const reg of ocrRegions) {
            resetItem(reg, true);   // OCR後の画面を各範囲の新しい基準にする（二重実行の防止）
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

// ===== 7. OCR（Tesseract.js・ワーカーを使い回し、範囲ごとに順番に実行） =====
let worker = null;
let workerLang = null;
const ocrQueue = [];
let ocrRunning = false;

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

function enqueueOcr(reg, reason) {
  if (reg.rt.queued) return;   // 同じ範囲が既に待ち行列にあれば重複させない
  reg.rt.queued = true;
  setItemState(reg, 'OCR待ち...', '#0d6efd');
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
    // 最新の状態でプレビューを更新し、その画像(フィルタ・傾き補正済み)をOCRに渡す
    if (!updatePreview(reg)) return;
    const dataUrl = reg.rt.el.preview.toDataURL('image/png');

    setItemState(reg, 'OCR実行中...', '#0d6efd');
    const w = await getWorker(ocrLang.value);
    const result = await w.recognize(dataUrl);
    addLogEntry(result.data.text.trim(), reason, reg.name);
    progressText.textContent = `${reg.name}: 完了`;
    setItemState(reg, 'OCR完了', '#198754');
  } catch (err) {
    console.error(err);
    progressText.textContent = `${reg.name}: OCR処理中にエラーが発生しました: ${err.message}`;
    setItemState(reg, 'OCRエラー', '#dc3545');
  }
}

// ===== 8. OCR結果ログ（チャット形式表示・自動保存・1件ずつ削除・CSV出力） =====
const LOG_KEY = 'ocrResultLogV1';
let ocrLog = [];   // { id, time: ミリ秒, region: 範囲名, reason: 実行理由, text: 認識結果 }

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

function createLogElement(entry) {
  const item = document.createElement('div');
  item.className = 'log-item';
  item.dataset.id = entry.id;

  const head = document.createElement('div');
  head.className = 'log-head';

  const meta = document.createElement('div');
  meta.className = 'log-meta';
  meta.textContent = [formatTime(entry.time), entry.region, entry.reason].filter(Boolean).join(' ／ ');

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'log-del';
  del.title = 'この結果を削除';
  del.textContent = '✕ 削除';
  del.addEventListener('click', () => deleteLogEntry(entry.id));

  head.appendChild(meta);
  head.appendChild(del);

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

function addLogEntry(text, reason, region) {
  const entry = { id: newLogId(), time: Date.now(), region: region || '', reason, text };
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
    alert('保存されたOCR結果がありません。');
    return;
  }
  const lines = ['日時,範囲,実行理由,認識結果'];
  ocrLog.forEach(e => {
    lines.push([formatTime(e.time), e.region || '', e.reason, e.text].map(csvEscape).join(','));
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
  if (!confirm(`保存済みのOCR結果 ${ocrLog.length} 件をすべて消去します。よろしいですか？\n（必要ならCSVを先にダウンロードしてください）`)) return;
  ocrLog = [];
  saveLog();
  renderLog();
});

renderLog();

// ===== 共通設定の保存 =====
checkFps.addEventListener('change', saveSettings);
ocrLang.addEventListener('change', saveSettings);   // 次回OCR時にワーカーが作り直される

// ===== 開始 =====
loadSettings();
redraw();
initCamera();
monitorTick();