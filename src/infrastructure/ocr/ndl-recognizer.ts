import type { ProgressReporter, TextRecognizer } from '../../application/ports.ts';
import {
  NDL_DEFAULT_DIMS, decodeLogits, detectLineBoxes, modelPreference, parseCharset, parseDimsFromName, parseqRole,
  type NdlRole,
} from '../../domain/ndl-text.ts';
import { luma } from '../../domain/image-filter.ts';

// ----- モデルファイルの保存（IndexedDB） -----
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('ocrAppDb', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'role' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export class NdlFileRepository {
  async put(rec: any): Promise<void> {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put(rec);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAll(): Promise<any[]> {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const req = db.transaction('files', 'readonly').objectStore('files').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async clear(): Promise<void> {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ----- モデルの状態（読み込み済みファイル・文字セット・推論セッション） -----
export class NdlModelStore {
  files: Record<string, any> = {};
  charset: string[] | null = null;
  sessions: Record<string, { session: any; H: number; W: number }> = {};
  diag = '';
  private repo: NdlFileRepository;

  constructor(repo: NdlFileRepository = new NdlFileRepository()) { this.repo = repo; }

  async reload(): Promise<void> {
    try {
      const all = await this.repo.getAll();
      this.files = {};
      all.forEach(r => { this.files[r.role] = r; });
      this.sessions = {};
      this.charset = this.files.charset ? parseCharset(this.files.charset.text) : null;
    } catch (err) {
      console.warn('NDLOCRモデルの読み込みに失敗:', err);
    }
  }

  // 選択されたファイルを保存する。使えなかったファイルの理由を返す
  async importFiles(files: File[]): Promise<string[]> {
    const notes: string[] = [];
    for (const f of files) {
      const lower = f.name.toLowerCase();
      try {
        if (lower.endsWith('.onnx')) {
          const role = parseqRole(lower);
          if (!role) { notes.push(`${f.name}: 未使用のモデルです（PARSeq の30/50/100のみ使用）`); continue; }
          await this.repo.put({ role, fileName: f.name, data: await f.arrayBuffer(), dims: parseDimsFromName(lower) });
        } else if (/\.(ya?ml|txt)$/.test(lower)) {
          await this.repo.put({ role: 'charset', fileName: f.name, text: await f.text() });
        } else {
          notes.push(`${f.name}: 対応していない形式です`);
        }
      } catch (err: any) {
        notes.push(`${f.name}: 保存に失敗しました（${err.message}）`);
      }
    }
    await this.reload();
    return notes;
  }

  async clear(): Promise<void> {
    await this.repo.clear();
    await this.reload();
  }

  statusText(): string {
    const f = this.files;
    const mark = (role: string, label: string) => `${label}: ${f[role] ? '✔' : '－'}`;
    const cs = this.charset ? `（${this.charset.length}文字）` : '';
    return [mark('parseq30', 'PARSeq-30'), mark('parseq50', 'PARSeq-50'), mark('parseq100', 'PARSeq-100'),
      `文字セット: ${f.charset ? '✔' + cs : '－'}`].join(' ／ ');
  }
}

// ----- NDLOCR-Lite（onnxruntime-web）。行分割 → 行ごとに PARSeq で認識 -----
export class NdlRecognizer implements TextRecognizer {
  private models: NdlModelStore;
  private report: ProgressReporter;

  constructor(models: NdlModelStore, report: ProgressReporter) {
    this.models = models;
    this.report = report;
  }

  private async getSession(role: NdlRole) {
    const m = this.models;
    if (m.sessions[role]) return m.sessions[role];
    const rec = m.files[role];
    if (!rec) return null;
    const ort = (globalThis as any).ort;
    if (typeof ort === 'undefined') throw new Error('onnxruntime-web が読み込まれていません（ネット接続を確認）');
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/';
    ort.env.wasm.numThreads = 1;   // COOP/COEPヘッダーなしでも動くよう単一スレッド

    this.report(`NDLOCR-Lite（${role}）のモデルを読み込み中...`);
    const session = await ort.InferenceSession.create(new Uint8Array(rec.data), { executionProviders: ['wasm'] });

    // 入力サイズ：モデルのメタ情報 → ファイル名の「16x256」→ 既定値 の順に採用
    let dims = rec.dims || NDL_DEFAULT_DIMS[role];
    try {
      const shape = session.inputMetadata?.[session.inputNames[0]]?.shape;
      if (shape && shape.length === 4 && typeof shape[2] === 'number' && typeof shape[3] === 'number') dims = [shape[2], shape[3]];
    } catch { /* メタ情報が無いバージョンでは無視 */ }

    m.sessions[role] = { session, H: dims[0], W: dims[1] };
    return m.sessions[role];
  }

  // 画像を文字行ごとのキャンバスに分割する（見つからなければ画像全体）
  private segmentLines(canvas: HTMLCanvasElement): HTMLCanvasElement[] {
    const w = canvas.width, h = canvas.height;
    const px = canvas.getContext('2d')!.getImageData(0, 0, w, h).data;
    const gray = new Uint8Array(w * h);
    for (let i = 0, j = 0; j < gray.length; i += 4, j++) gray[j] = luma(px[i], px[i + 1], px[i + 2]) | 0;

    const lines = detectLineBoxes(gray, w, h).map(b => {
      const c = document.createElement('canvas');
      c.width = b.right - b.left;
      c.height = b.bottom - b.top;
      c.getContext('2d')!.drawImage(canvas, b.left, b.top, c.width, c.height, 0, 0, c.width, c.height);
      return c;
    });
    return lines.length ? lines : [canvas];
  }

  private async recognizeLine(lineCanvas: HTMLCanvasElement): Promise<string> {
    const m = this.models;
    const role = modelPreference(lineCanvas.width, lineCanvas.height).find(r => m.files[r]);
    if (!role) throw new Error('NDLOCR-LiteのPARSeqモデルが読み込まれていません');

    const s = (await this.getSession(role))!;
    const { H, W } = s;

    // 固定サイズ(H×W)へ伸縮し、(x/255-0.5)/0.5 で正規化した float32[1,3,H,W] を作る
    const t = document.createElement('canvas');
    t.width = W;
    t.height = H;
    const tc = t.getContext('2d', { willReadFrequently: true })!;
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
    const ort = (globalThis as any).ort;
    const feeds = { [s.session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, H, W]) };
    const out = (await s.session.run(feeds))[s.session.outputNames[0]];

    const [, T, C] = out.dims;
    const cs = m.charset!;
    m.diag = `${role}（入力 ${H}x${W}）／ 出力 [${out.dims.join(',')}] ／ 文字セット ${cs.length}文字 ／ クラス数−文字数=${C - cs.length}（PARSeqの標準は3）`;
    return decodeLogits(out.data, T, C, cs);
  }

  async recognize(canvas: HTMLCanvasElement): Promise<string> {
    const m = this.models;
    if (!m.charset || m.charset.length === 0) {
      throw new Error('NDLOCR-Liteの文字セット（NDLmoji.yaml）が読み込まれていません');
    }
    const texts: string[] = [];
    for (const line of this.segmentLines(canvas)) texts.push(await this.recognizeLine(line));
    this.report('NDLOCR診断: ' + m.diag);
    return texts.join('\n');
  }
}
