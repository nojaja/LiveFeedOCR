import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustZoom, clampPanOffset, mapPointToZoomedContent, MIN_ZOOM, MAX_ZOOM } from '../src/js/zoom.ts';

test('Ctrl+wheel相当の入力で拡大縮小し、上限下限を超えない', () => {
  assert.ok(adjustZoom(1, -1) > 1);
  assert.ok(adjustZoom(1, 1) < 1);
  assert.equal(adjustZoom(MAX_ZOOM, -1), MAX_ZOOM);
  assert.equal(adjustZoom(MIN_ZOOM, 1), MIN_ZOOM);
});

test('拡大縮小中もポインター位置を元のコンテンツ座標に戻す', () => {
  const bounds = { left: 100, top: 50, width: 400, height: 200 };
  assert.deepEqual(mapPointToZoomedContent(300, 150, bounds, 2), { x: 200, y: 100 });
  assert.deepEqual(mapPointToZoomedContent(100, 50, bounds, 0.5), { x: 0, y: 0 });
});

test('パン移動後のキャプチャ位置を元のコンテンツ座標に戻す', () => {
  const bounds = { left: 100, top: 50, width: 400, height: 200 };
  assert.deepEqual(mapPointToZoomedContent(350, 125, bounds, 2, 50, -25), { x: 200, y: 100 });
});

test('拡大表示領域外のポインターをコンテンツ端に制限する', () => {
  const bounds = { left: 100, top: 50, width: 400, height: 200 };
  assert.deepEqual(mapPointToZoomedContent(0, 0, bounds, 2), { x: 50, y: 25 });
  assert.deepEqual(mapPointToZoomedContent(1000, 500, bounds, 2), { x: 400, y: 200 });
});

test('ズーム時のパンを画像端が表示領域を覆う範囲に制限する', () => {
  assert.equal(clampPanOffset(400, 400, 2, 999), 200);
  assert.equal(clampPanOffset(400, 400, 2, -999), -200);
  assert.equal(clampPanOffset(400, 400, 1, 80), 0);
  assert.equal(clampPanOffset(400, 100, 2, 80), 0);
});
