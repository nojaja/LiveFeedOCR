import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../../../..', import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, projectRoot), 'utf8');

test('アプリのエントリーはVueアプリをマウントし、旧スクリプトを直接importしない', async () => {
  const [html, entry] = await Promise.all([
    readProjectFile('src/html/index.html'),
    readProjectFile('src/html/main.ts'),
  ]);

  assert.match(html, /<div id="app"><\/div>/);
  assert.match(entry, /createApp\(/);
  assert.doesNotMatch(html + entry, /\.\.\/js\/script\.ts/);
});

test('Vue画面は既存操作コントロールを部品に分けて保持し、Vueのライフサイクルで動く', async () => {
  const parts = await Promise.all([
    'src/App.vue',
    'src/components/CaptureView.vue',
    'src/components/OcrLogPanel.vue',
    'src/components/RegionSetPanel.vue',
    'src/components/NdlModelPanel.vue',
    'src/components/ui/ZoomControls.vue',
  ].map(readProjectFile));
  const all = parts.join('\n');
  for (const id of ['webcam', 'overlay', 'capture-zoom', 'region-cards', 'set-save-btn', 'ndl-files', 'log-list']) {
    assert.match(all, new RegExp(`id="${id}`));
  }
  assert.match(parts[0], /createWorkspace\(/);
  const camera = await readProjectFile('src/composables/useCamera.ts');
  const monitor = await readProjectFile('src/composables/useMonitor.ts');
  for (const source of [camera, monitor]) {
    assert.match(source, /onMounted\(/);
    assert.match(source, /onUnmounted\(/);
  }
});

test('永続化キーは既存設定、範囲セット、結果ログとの互換性を保つ', async () => {
  const controller = await readProjectFile('src/application/repositories.ts');
  assert.match(controller, /ocrSettingsV1/);
  assert.match(controller, /ocrRegionSetsV1/);
  assert.match(controller, /ocrResultLogV1/);
});
