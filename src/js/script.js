// ===== 要素 =====
const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');
const previewImg = document.getElementById('preview-img');
const execBtn = document.getElementById('exec-btn');
const resultText = document.getElementById('result-text');
const resultMeta = document.getElementById('result-meta');
const progressText = document.getElementById('progress-text');

// フィルタUIの要素
const filterGrayscale = document.getElementById('filter-grayscale');
const filterBinarize = document.getElementById('filter-binarize');
const sliderThreshold = document.getElementById('slider-threshold');
const thresholdVal = document.getElementById('threshold-val');
const filterInvert = document.getElementById('filter-invert');

// 変化検知UI
const autoOcr = document.getElementById('auto-ocr');
const checkFps = document.getElementById('check-fps');
const changeThr = document.getElementById('change-thr');
const changeThrVal = document.getElementById('change-thr-val');
const pixelThr = document.getElementById('pixel-thr');
const pixelThrVal = document.getElementById('pixel-thr-val');
const stableMs = document.getElementById('stable-ms');
const stableMsVal = document.getElementById('stable-ms-val');
const stateText = document.getElementById('state-text');
const diffText = document.getElementById('diff-text');
const diffFill = document.getElementById('diff-fill');
const diffMark = document.getElementById('diff-mark');
const ocrLang = document.getElementById('ocr-lang');
const clearOcrBtn = document.getElementById('clear-ocr-btn');
const clearDetectBtn = document.getElementById('clear-detect-btn');

// ===== 状態 =====
// 範囲は映像サイズに対する割合(0〜1)で保持する（ウィンドウサイズが変わってもズレない）
const regions = { ocr: null, detect: null };
const REGION_STYLE = {
  ocr:    { color: '#00e676', label: 'OCR範囲',     dash: [] },
  detect: { color: '#ff9800', label: '変化検知範囲', dash: [6, 4] },
};

let lastCropCanvas = null;   // 直近にOCR対象として切り出した(フィルタ前の)画像
let ocrRunning = false;

// 変化検知用
let refFrame = null;     // 「最後にOCRした時点」の検知範囲のフレーム
let prevFrame = null;    // 1つ前の判定フレーム
let pending = false;     // 変化を検知してOCR待ちか
let lastMotionTime = 0;  // 最後に「動き」を検知した時刻

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
  overlay.setPointerCapture(e.pointerId);
  isDrawing = true;
  const p = getPos(e);
  startX = curX = p.x;
  startY = curY = p.y;
});

overlay.addEventListener('pointermove', (e) => {
  if (!isDrawing) return;
  const p = getPos(e);
  curX = p.x;
  curY = p.y;
  redraw();
});

overlay.addEventListener('pointerup', finishDrawing);
overlay.addEventListener('pointercancel', () => { isDrawing = false; redraw(); });

function finishDrawing() {
  if (!isDrawing) return;
  isDrawing = false;

  const w = Math.abs(curX - startX);
  const h = Math.abs(curY - startY);
  if (w > 10 && h > 10) {
    const mode = getDrawMode();
    regions[mode] = {
      x: Math.min(startX, curX) / overlay.width,
      y: Math.min(startY, curY) / overlay.height,
      w: w / overlay.width,
      h: h / overlay.height,
    };
    onRegionChanged(mode);
  }
  redraw();
}

function onRegionChanged(mode) {
  // 検知範囲(またはそのフォールバックであるOCR範囲)が変わったら基準をリセット
  if (mode === 'detect' || !regions.detect) {
    refFrame = null;
    prevFrame = null;
    pending = false;
  }
  updateButtons();
}

clearOcrBtn.addEventListener('click', () => {
  regions.ocr = null;
  onRegionChanged('ocr');
  redraw();
});
clearDetectBtn.addEventListener('click', () => {
  regions.detect = null;
  refFrame = null; prevFrame = null; pending = false;
  redraw();
});

// ===== 範囲の描画 =====
function drawRegion(r, style) {
  const x = r.x * overlay.width;
  const y = r.y * overlay.height;
  const w = r.w * overlay.width;
  const h = r.h * overlay.height;

  ctx.save();
  ctx.setLineDash(style.dash);
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();

  ctx.font = '12px sans-serif';
  const tw = ctx.measureText(style.label).width + 8;
  const ly = y >= 18 ? y - 18 : y;
  ctx.fillStyle = style.color;
  ctx.fillRect(x, ly, tw, 18);
  ctx.fillStyle = '#000';
  ctx.fillText(style.label, x + 4, ly + 13);
}

function redraw() {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (regions.detect) drawRegion(regions.detect, REGION_STYLE.detect);
  if (regions.ocr) drawRegion(regions.ocr, REGION_STYLE.ocr);

  if (isDrawing) {
    const style = REGION_STYLE[getDrawMode()];
    ctx.save();
    ctx.setLineDash(style.dash);
    ctx.strokeStyle = style.color;
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    const x = Math.min(startX, curX), y = Math.min(startY, curY);
    const w = Math.abs(curX - startX), h = Math.abs(curY - startY);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
}

// ===== 3. 切り出し（OCR用・フルサイズ） =====
function captureCrop() {
  const r = regions.ocr;
  if (!r || !video.videoWidth) return null;

  const sx = r.x * video.videoWidth;
  const sy = r.y * video.videoHeight;
  const sw = Math.max(1, r.w * video.videoWidth);
  const sh = Math.max(1, r.h * video.videoHeight);

  const c = document.createElement('canvas');
  c.width = Math.round(sw);
  c.height = Math.round(sh);
  c.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}

// ===== 4. 画像前処理（フィルタ適用） =====
// 元キャンバスを受け取り、加工後のdataURLを返す
function applyFilters(srcCanvas) {
  const width = srcCanvas.width;
  const height = srcCanvas.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c2 = canvas.getContext('2d');
  c2.drawImage(srcCanvas, 0, 0);

  const imageData = c2.getImageData(0, 0, width, height);
  const data = imageData.data;

  const useGrayscale = filterGrayscale.checked;
  const useBinarize = filterBinarize.checked;
  const threshold = parseInt(sliderThreshold.value, 10);
  const useInvert = filterInvert.checked;

  thresholdVal.innerText = threshold;

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

  c2.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

// フィルタUIが操作されたら、直近の切り抜きでプレビューだけ更新
function refreshPreview() {
  thresholdVal.innerText = sliderThreshold.value;
  if (lastCropCanvas) previewImg.src = applyFilters(lastCropCanvas);
}
filterGrayscale.addEventListener('change', refreshPreview);
filterBinarize.addEventListener('change', refreshPreview);
sliderThreshold.addEventListener('input', refreshPreview);
filterInvert.addEventListener('change', refreshPreview);

// ===== 5. 変化検知 =====
// 検知範囲を小さな解像度に縮小してグレースケール配列にする（軽量化のため）
const sampleCanvas = document.createElement('canvas');
const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
const SAMPLE_BASE = 160;

function sampleGray(region) {
  if (!video.videoWidth || video.readyState < 2) return null;

  const sx = region.x * video.videoWidth;
  const sy = region.y * video.videoHeight;
  const sw = Math.max(1, region.w * video.videoWidth);
  const sh = Math.max(1, region.h * video.videoHeight);

  const aspect = sw / sh;
  let w, h;
  if (aspect >= 1) { w = SAMPLE_BASE; h = Math.max(8, Math.round(SAMPLE_BASE / aspect)); }
  else { h = SAMPLE_BASE; w = Math.max(8, Math.round(SAMPLE_BASE * aspect)); }

  sampleCanvas.width = w;
  sampleCanvas.height = h;
  sampleCtx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  const px = sampleCtx.getImageData(0, 0, w, h).data;

  const gray = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    gray[j] = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) | 0;
  }
  return { gray, w, h };
}

// 2フレーム間で「画素の差がしきい値を超えた画素」の割合(%)を返す
function diffRatio(a, b) {
  if (!a || !b || a.w !== b.w || a.h !== b.h) return 100;
  const thr = parseInt(pixelThr.value, 10);
  let count = 0;
  const n = a.gray.length;
  for (let i = 0; i < n; i++) {
    if (Math.abs(a.gray[i] - b.gray[i]) > thr) count++;
  }
  return (count / n) * 100;
}

function setState(text, color) {
  stateText.textContent = text;
  stateText.style.color = color || '#333';
}

function showDiff(ratio) {
  const thr = parseFloat(changeThr.value);
  const scaleMax = Math.max(thr * 2, 10);
  diffText.textContent = `変化量: ${ratio.toFixed(2)} %（しきい値 ${thr.toFixed(1)} %）`;
  diffFill.style.width = Math.min(100, (ratio / scaleMax) * 100) + '%';
  diffFill.style.background = ratio >= thr ? '#dc3545' : '#17a2b8';
  diffMark.style.left = Math.min(100, (thr / scaleMax) * 100) + '%';
}

// 判定ループ：指定fpsで検知範囲を確認する
function monitorTick() {
  const fps = parseInt(checkFps.value, 10) || 5;
  setTimeout(monitorTick, 1000 / fps);

  const region = regions.detect || regions.ocr;
  if (!region) { setState('範囲が未設定です（映像上でドラッグしてください）'); return; }

  const cur = sampleGray(region);
  if (!cur) return;

  const now = performance.now();

  // 初回（範囲設定直後）：最初の1回をOCRするため pending にする
  if (!refFrame) {
    refFrame = cur;
    prevFrame = cur;
    pending = true;
    lastMotionTime = now;
  }

  const diffFromRef = diffRatio(cur, refFrame);    // 最後のOCR時点との差
  const diffFromPrev = diffRatio(cur, prevFrame);  // 直前フレームとの差（動いている最中か）
  prevFrame = cur;
  showDiff(diffFromRef);

  const thr = parseFloat(changeThr.value);

  if (!autoOcr.checked) {
    setState('自動OCRはオフです（変化量の表示のみ）');
    return;
  }

  // 変化検知
  if (!pending && diffFromRef >= thr) {
    pending = true;
    lastMotionTime = now;
  }

  if (pending) {
    // まだ動いている間は待つ。動きが止まってから stableMs 経過でOCR
    if (diffFromPrev >= Math.max(0.2, thr / 2)) lastMotionTime = now;

    const waited = now - lastMotionTime;
    const need = parseInt(stableMs.value, 10);

    if (ocrRunning) {
      setState('OCR実行中...（完了後、再変化があれば再度実行）', '#0d6efd');
    } else if (waited >= need) {
      refFrame = cur;   // この時点の画面を新しい基準にする
      pending = false;
      runOcr('自動（変化検知）');
    } else {
      setState(`変化を検知。安定待ち... ${Math.max(0, need - waited).toFixed(0)}ms`, '#e8590c');
    }
  } else {
    setState('監視中（変化なし）', '#198754');
  }
}

// ===== 6. OCR（Tesseract.js・ワーカーを使い回す） =====
let worker = null;
let workerLang = null;

async function getWorker(lang) {
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

async function runOcr(reason) {
  if (ocrRunning) return;
  const crop = captureCrop();
  if (!crop) return;

  ocrRunning = true;
  updateButtons();

  lastCropCanvas = crop;
  const dataUrl = applyFilters(crop);
  previewImg.src = dataUrl;

  try {
    const w = await getWorker(ocrLang.value);
    const result = await w.recognize(dataUrl);
    resultText.innerText = result.data.text.trim() || '（テキストが検出されませんでした）';
    resultMeta.textContent = `${new Date().toLocaleTimeString()} ／ ${reason}`;
    progressText.textContent = '完了';
  } catch (err) {
    console.error(err);
    resultText.innerText = 'OCR処理中にエラーが発生しました。';
    progressText.textContent = '';
  } finally {
    ocrRunning = false;
    updateButtons();
  }
}

execBtn.addEventListener('click', () => {
  // 手動実行時は現在の画面を基準にして、直後の二重実行を防ぐ
  const region = regions.detect || regions.ocr;
  if (region) {
    const cur = sampleGray(region);
    if (cur) { refFrame = cur; prevFrame = cur; pending = false; }
  }
  runOcr('手動');
});

function updateButtons() {
  execBtn.disabled = ocrRunning || !regions.ocr;
}

// ===== スライダー表示の更新 =====
changeThr.addEventListener('input', () => { changeThrVal.textContent = parseFloat(changeThr.value).toFixed(1); });
pixelThr.addEventListener('input', () => { pixelThrVal.textContent = pixelThr.value; });
stableMs.addEventListener('input', () => { stableMsVal.textContent = stableMs.value; });
ocrLang.addEventListener('change', () => { /* 次回OCR時にワーカーが作り直される */ });

// ===== 開始 =====
updateButtons();
initCamera();
monitorTick();