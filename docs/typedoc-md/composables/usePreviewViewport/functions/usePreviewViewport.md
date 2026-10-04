[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/usePreviewViewport](../README.md) / usePreviewViewport

# Function: usePreviewViewport()

> **usePreviewViewport**(`viewport`, `ctrlPressed`): `object`

Defined in: [composables/usePreviewViewport.ts:5](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/usePreviewViewport.ts#L5)

## Parameters

### viewport

`Ref`\<`HTMLElement`\>

### ctrlPressed

`Ref`\<`boolean`\>

## Returns

`object`

### changeZoom

> **changeZoom**: (`deltaY`) => `void`

#### Parameters

##### deltaY

`number`

#### Returns

`void`

### endPan

> **endPan**: () => `void`

#### Returns

`void`

### onPointerDown

> **onPointerDown**: (`event`) => `void`

#### Parameters

##### event

`PointerEvent`

#### Returns

`void`

### onPointerMove

> **onPointerMove**: (`event`) => `void`

#### Parameters

##### event

`PointerEvent`

#### Returns

`void`

### onWheel

> **onWheel**: (`event`) => `void`

#### Parameters

##### event

`WheelEvent`

#### Returns

`void`

### panning

> **panning**: `Ref`\<`boolean`, `boolean`\>

### panReady

> **panReady**: `ComputedRef`\<`boolean`\>

### setZoom

> **setZoom**: (`value`) => `void`

#### Parameters

##### value

`number`

#### Returns

`void`

### zoom

> **zoom**: `Ref`\<`number`, `number`\>

### zoomed

> **zoomed**: `ComputedRef`\<`boolean`\>

### zoomLabel

> **zoomLabel**: `ComputedRef`\<`string`\>
