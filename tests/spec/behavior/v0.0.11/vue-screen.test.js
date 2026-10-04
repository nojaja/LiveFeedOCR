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

test('Vue画面は既存操作コントロールとVueの画面ライフサイクルを保持する', async () => {
  const [app, lifecycle] = await Promise.all([
    readProjectFile('src/App.vue'),
    readProjectFile('src/use-screen-controller.ts'),
  ]);
  for (const id of ['webcam', 'overlay', 'capture-zoom-in', 'region-cards', 'set-save-btn', 'ndl-files', 'log-list']) {
    assert.match(app, new RegExp(`id="${id}"`));
  }
  assert.match(app, /useScreenController\(/);
  assert.match(lifecycle, /onMounted\(/);
  assert.match(lifecycle, /onUnmounted\(/);
  assert.match(lifecycle, /startScreenController\(/);
});

test('永続化キーは既存設定、範囲セット、結果ログとの互換性を保つ', async () => {
  const controller = await readProjectFile('src/js/script.ts');
  assert.match(controller, /ocrSettingsV1/);
  assert.match(controller, /ocrRegionSetsV1/);
  assert.match(controller, /ocrResultLogV1/);
});
