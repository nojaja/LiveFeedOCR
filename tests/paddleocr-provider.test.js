import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePaddleOcrResult } from '../src/js/ocr-providers.js';

test('PaddleOCRの複数行を表示順に改行で連結する', () => {
  assert.equal(normalizePaddleOcrResult({ items: [{ text: '先頭行' }, { text: '次の行' }] }), '先頭行\n次の行');
});

test('PaddleOCRの空結果は空文字列になる', () => {
  assert.equal(normalizePaddleOcrResult({ items: [] }), '');
});

test('不正なPaddleOCR応答を空結果として扱わずエラーにする', () => {
  assert.throws(() => normalizePaddleOcrResult(null), /invalid PaddleOCR result/i);
  assert.throws(() => normalizePaddleOcrResult({ items: [{ text: 42 }] }), /invalid PaddleOCR result/i);
});