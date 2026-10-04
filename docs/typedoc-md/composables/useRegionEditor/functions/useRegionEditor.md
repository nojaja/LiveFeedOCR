[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/useRegionEditor](../README.md) / useRegionEditor

# Function: useRegionEditor()

> **useRegionEditor**(`opts`): `object`

Defined in: [composables/useRegionEditor.ts:26](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionEditor.ts#L26)

## Parameters

### opts

[`RegionEditorOptions`](../interfaces/RegionEditorOptions.md)

## Returns

`object`

### cursor

> **cursor**: `Ref`\<`string`, `string`\>

### dragging

> **dragging**: () => `boolean`

#### Returns

`boolean`

### drawMode

> **drawMode**: `Ref`\<[`DrawMode`](../type-aliases/DrawMode.md), [`DrawMode`](../type-aliases/DrawMode.md)\>

### onPointerCancel

> **onPointerCancel**: () => `void`

#### Returns

`void`

### onPointerDown

> **onPointerDown**: (`e`) => `void`

#### Parameters

##### e

`PointerEvent`

#### Returns

`void`

### onPointerMove

> **onPointerMove**: (`e`) => `void`

#### Parameters

##### e

`PointerEvent`

#### Returns

`void`

### onPointerUp

> **onPointerUp**: (`e`) => `void`

#### Parameters

##### e

`PointerEvent`

#### Returns

`void`

### setDrawMode

> **setDrawMode**: (`mode`) => `void`

#### Parameters

##### mode

[`DrawMode`](../type-aliases/DrawMode.md)

#### Returns

`void`
