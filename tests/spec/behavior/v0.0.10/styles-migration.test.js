import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../../../..', import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, projectRoot), 'utf8');

test('HTMLはインラインCSSを持たず、Viteエントリーからsrc/stylesのCSSを読み込む', async () => {
  const [html, entry] = await Promise.all([
    readProjectFile('src/html/index.html'),
    readProjectFile('src/html/main.ts'),
  ]);

  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  assert.match(entry, /import\s+['"]\.\.\/styles\/main\.css['"]/);
});

test('JavaScriptが生成するUIテンプレートにインラインstyle属性を含めない', async () => {
  const script = await readProjectFile('src/App.vue');
  assert.doesNotMatch(script, /\sstyle\s*=/i);
});
