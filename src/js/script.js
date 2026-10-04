const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');
const previewImg = document.getElementById('preview-img');
const sendBtn = document.getElementById('send-btn');
const resultText = document.getElementById('result-text');

// フィルタUIの要素
const filterGrayscale = document.getElementById('filter-grayscale');
const filterBinarize = document.getElementById('filter-binarize');
const sliderThreshold = document.getElementById('slider-threshold');
const thresholdVal = document.getElementById('threshold-val');
const filterInvert = document.getElementById('filter-invert');

let originalCroppedCanvas = null; // フィルタをかける前のオリジナル切り抜き画像
let currentCroppedBase64 = null;  // サーバーに送信する加工後のBase64データ

// 1. カメラ初期化
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

video.addEventListener('loadedmetadata', () => {
  overlay.width = video.clientWidth;
  overlay.height = video.clientHeight;
});

// 2. マウス操作
let isDrawing = false;
let startX = 0, startY = 0, rectWidth = 0, rectHeight = 0;

overlay.addEventListener('mousedown', (e) => {
  isDrawing = true;
  const rect = overlay.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
});

overlay.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const rect = overlay.getBoundingClientRect();
  rectWidth = (e.clientX - rect.left) - startX;
  rectHeight = (e.clientY - rect.top) - startY;

  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, overlay.width, overlay.height);
  ctx.clearRect(startX, startY, rectWidth, rectHeight);
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, startY, rectWidth, rectHeight);
});

overlay.addEventListener('mouseup', finishDrawing);
overlay.addEventListener('mouseleave', () => { if (isDrawing) finishDrawing(); });

function finishDrawing() {
  isDrawing = false;
  if (Math.abs(rectWidth) > 10 && Math.abs(rectHeight) > 10) {
    cropOriginalImage();
  }
}

// 3. 元画像の切り出し
function cropOriginalImage() {
  const scaleX = video.videoWidth / video.clientWidth;
  const scaleY = video.videoHeight / video.clientHeight;

  const sx = Math.min(startX, startX + rectWidth) * scaleX;
  const sy = Math.min(startY, startY + rectHeight) * scaleY;
  const sw = Math.abs(rectWidth) * scaleX;
  const sh = Math.abs(rectHeight) * scaleY;

  // 加工のベースとなるオリジナルキャンバスを作成
  originalCroppedCanvas = document.createElement('canvas');
  originalCroppedCanvas.width = sw;
  originalCroppedCanvas.height = sh;
  const oCtx = originalCroppedCanvas.getContext('2d');
  
  oCtx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
  
  // 切り出しが完了したら、現在のフィルタ設定を適用する
  applyFilters();
  sendBtn.disabled = false;
}

// 4. 画像前処理（フィルタ適用）
function applyFilters() {
  if (!originalCroppedCanvas) return;

  const width = originalCroppedCanvas.width;
  const height = originalCroppedCanvas.height;

  // フィルタ処理用キャンバス
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // オリジナル画像を描画
  ctx.drawImage(originalCroppedCanvas, 0, 0);

  // ピクセルデータを取得
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const useGrayscale = filterGrayscale.checked;
  const useBinarize = filterBinarize.checked;
  const threshold = parseInt(sliderThreshold.value, 10);
  const useInvert = filterInvert.checked;

  thresholdVal.innerText = threshold;

  // 1ピクセルずつ処理 (RGBAなので4バイトずつ進む)
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i+1];
    let b = data[i+2];

    // グレースケール化 または 二値化のベース輝度計算
    if (useGrayscale || useBinarize) {
      // 輝度(Y)を求める標準的な計算式
      let v = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = v;
    }

    // 二値化（しきい値より明るければ白、暗ければ黒）
    if (useBinarize) {
      let v = r >= threshold ? 255 : 0;
      r = g = b = v;
    }

    // 白黒反転（Tesseractは白背景に黒文字が得意なため）
    if (useInvert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    // 書き戻し
    data[i] = r;
    data[i+1] = g;
    data[i+2] = b;
  }

  // 処理したピクセルデータをキャンバスに反映
  ctx.putImageData(imageData, 0, 0);

  // プレビュー表示を更新
  currentCroppedBase64 = canvas.toDataURL('image/png');
  previewImg.src = currentCroppedBase64;
}

// フィルタUIが操作されたら再計算を実行
filterGrayscale.addEventListener('change', applyFilters);
filterBinarize.addEventListener('change', applyFilters);
sliderThreshold.addEventListener('input', applyFilters);
filterInvert.addEventListener('change', applyFilters);

// 5. Node.jsサーバーへ送信
sendBtn.addEventListener('click', async () => {
  if (!currentCroppedBase64) return;
  sendBtn.disabled = true;
  sendBtn.innerText = 'OCR処理中...';
  resultText.innerText = '処理中...';

  try {
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: currentCroppedBase64 })
    });
    const data = await response.json();
    resultText.innerText = data.success ? (data.text || 'テキストが見つかりません') : ('エラー: ' + data.error);
  } catch (err) {
    resultText.innerText = '通信エラー';
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerText = 'この状態の画像をOCRに送信';
  }
});

// 開始
initCamera();