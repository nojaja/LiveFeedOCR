[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/useCaptureViewport](../README.md) / useCaptureViewport

# Function: useCaptureViewport()

> **useCaptureViewport**(`els`, `ctrlPressed`): `object`

Defined in: [composables/useCaptureViewport.ts:11](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useCaptureViewport.ts#L11)

## Parameters

### els

[`CaptureViewportElements`](../interfaces/CaptureViewportElements.md)

### ctrlPressed

`Ref`\<`boolean`\>

## Returns

`object`

### beginPan

> **beginPan**: (`event`) => `boolean`

#### Parameters

##### event

`PointerEvent`

#### Returns

`boolean`

### changeZoom

> **changeZoom**: (`deltaY`) => `void`

#### Parameters

##### deltaY

`number`

#### Returns

`void`

### endPan

> **endPan**: () => `boolean`

#### Returns

`boolean`

### movePan

> **movePan**: (`event`) => `boolean`

#### Parameters

##### event

`PointerEvent`

#### Returns

`boolean`

### onWheel

> **onWheel**: (`event`) => `void`

#### Parameters

##### event

`WheelEvent`

#### Returns

`void`

### panReady

> **panReady**: `ComputedRef`\<`boolean`\>

### refresh

> **refresh**: () => `void`

#### Returns

`void`

### setZoom

> **setZoom**: (`zoom`) => `void`

#### Parameters

##### zoom

`number`

#### Returns

`void`

### stageStyle

> **stageStyle**: `ComputedRef`\<\{ `--capture-pan-x`: `string`; `--capture-pan-y`: `string`; `--capture-zoom`: `number`; \}\>

### toContentPoint

> **toContentPoint**: (`clientX`, `clientY`) => `object`

#### Parameters

##### clientX

`number`

##### clientY

`number`

#### Returns

`object`

##### x

> **x**: `number`

##### y

> **y**: `number`

### view

> **view**: `object`

#### view.panning

> **panning**: `boolean` = `false`

#### view.panX

> **panX**: `number` = `0`

#### view.panY

> **panY**: `number` = `0`

#### view.zoom

> **zoom**: `number` = `1`

### zoomLabel

> **zoomLabel**: `ComputedRef`\<`string`\>
