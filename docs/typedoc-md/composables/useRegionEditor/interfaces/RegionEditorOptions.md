[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/useRegionEditor](../README.md) / RegionEditorOptions

# Interface: RegionEditorOptions

Defined in: [composables/useRegionEditor.ts:14](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionEditor.ts#L14)

## Properties

### dialogs

> **dialogs**: [`Dialogs`](../../../application/ports/interfaces/Dialogs.md)

Defined in: [composables/useRegionEditor.ts:20](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionEditor.ts#L20)

***

### onGeometryChanged

> **onGeometryChanged**: (`reg`) => `void`

Defined in: [composables/useRegionEditor.ts:21](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionEditor.ts#L21)

#### Parameters

##### reg

[`OcrView`](../../useRegions/type-aliases/OcrView.md)

#### Returns

`void`

***

### onGeometryCommitted

> **onGeometryCommitted**: (`item`) => `void`

Defined in: [composables/useRegionEditor.ts:22](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionEditor.ts#L22)

#### Parameters

##### item

[`RegionView`](../../useRegions/type-aliases/RegionView.md)

#### Returns

`void`

***

### overlay

> **overlay**: `Ref`\<`HTMLCanvasElement`\>

Defined in: [composables/useRegionEditor.ts:19](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionEditor.ts#L19)

***

### regions

> **regions**: `object`

Defined in: [composables/useRegionEditor.ts:15](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionEditor.ts#L15)

#### addDetect

> **addDetect**: (`rect`, `saved?`) => [`DetectView`](../../useRegions/type-aliases/DetectView.md)

##### Parameters

###### rect

[`Rect`](../../../domain/region/interfaces/Rect.md)

###### saved?

`any`

##### Returns

[`DetectView`](../../useRegions/type-aliases/DetectView.md)

#### addOcr

> **addOcr**: (`rect`, `saved?`) => [`OcrView`](../../useRegions/type-aliases/OcrView.md)

##### Parameters

###### rect

[`Rect`](../../../domain/region/interfaces/Rect.md)

###### saved?

`any`

##### Returns

[`OcrView`](../../useRegions/type-aliases/OcrView.md)

#### allItems

> **allItems**: () => [`RegionView`](../../useRegions/type-aliases/RegionView.md)[]

##### Returns

[`RegionView`](../../useRegions/type-aliases/RegionView.md)[]

#### applySnapshot

> **applySnapshot**: (`snap`) => `void`

##### Parameters

###### snap

`any`

##### Returns

`void`

#### canAddOcr

> **canAddOcr**: () => `boolean`

##### Returns

`boolean`

#### clear

> **clear**: () => `void`

##### Returns

`void`

#### detectRegions

> **detectRegions**: `Ref`\<[`DetectView`](../../useRegions/type-aliases/DetectView.md)[], [`DetectView`](../../useRegions/type-aliases/DetectView.md)[]\>

#### nextDetectId

> **nextDetectId**: `Ref`\<`number`, `number`\>

#### nextId

> **nextId**: `Ref`\<`number`, `number`\>

#### ocrRegions

> **ocrRegions**: `Ref`\<[`OcrView`](../../useRegions/type-aliases/OcrView.md)[], [`OcrView`](../../useRegions/type-aliases/OcrView.md)[]\>

#### removeDetect

> **removeDetect**: (`reg`) => `void`

##### Parameters

###### reg

[`DetectView`](../../useRegions/type-aliases/DetectView.md)

##### Returns

`void`

#### removeOcr

> **removeOcr**: (`reg`) => `void`

##### Parameters

###### reg

[`OcrView`](../../useRegions/type-aliases/OcrView.md)

##### Returns

`void`

#### report

> **report**: (`item`, `verdict`) => `void`

##### Parameters

###### item

[`RegionView`](../../useRegions/type-aliases/RegionView.md)

###### verdict

[`Verdict`](../../../domain/change-detection/interfaces/Verdict.md)

##### Returns

`void`

#### resetItem

> **resetItem**: (`item`, `silent`) => `void`

##### Parameters

###### item

[`RegionView`](../../useRegions/type-aliases/RegionView.md)

###### silent

`boolean`

##### Returns

`void`

#### setStatus

> **setStatus**: (`item`, `message`) => `void`

##### Parameters

###### item

[`RegionView`](../../useRegions/type-aliases/RegionView.md)

###### message

[`StatusMessage`](../../../domain/change-detection/interfaces/StatusMessage.md)

##### Returns

`void`

#### snapshot

> **snapshot**: (`name`) => [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)

##### Parameters

###### name?

`string` = `''`

##### Returns

[`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)

***

### video

> **video**: `Ref`\<`HTMLVideoElement`\>

Defined in: [composables/useRegionEditor.ts:18](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionEditor.ts#L18)

***

### viewport

> **viewport**: `object`

Defined in: [composables/useRegionEditor.ts:16](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionEditor.ts#L16)

#### beginPan

> **beginPan**: (`event`) => `boolean`

##### Parameters

###### event

`PointerEvent`

##### Returns

`boolean`

#### changeZoom

> **changeZoom**: (`deltaY`) => `void`

##### Parameters

###### deltaY

`number`

##### Returns

`void`

#### endPan

> **endPan**: () => `boolean`

##### Returns

`boolean`

#### movePan

> **movePan**: (`event`) => `boolean`

##### Parameters

###### event

`PointerEvent`

##### Returns

`boolean`

#### onWheel

> **onWheel**: (`event`) => `void`

##### Parameters

###### event

`WheelEvent`

##### Returns

`void`

#### panReady

> **panReady**: `ComputedRef`\<`boolean`\>

#### refresh

> **refresh**: () => `void`

##### Returns

`void`

#### setZoom

> **setZoom**: (`zoom`) => `void`

##### Parameters

###### zoom

`number`

##### Returns

`void`

#### stageStyle

> **stageStyle**: `ComputedRef`\<\{ `--capture-pan-x`: `string`; `--capture-pan-y`: `string`; `--capture-zoom`: `number`; \}\>

#### toContentPoint

> **toContentPoint**: (`clientX`, `clientY`) => `object`

##### Parameters

###### clientX

`number`

###### clientY

`number`

##### Returns

`object`

###### x

> **x**: `number`

###### y

> **y**: `number`

#### view

> **view**: `object`

##### view.panning

> **panning**: `boolean` = `false`

##### view.panX

> **panX**: `number` = `0`

##### view.panY

> **panY**: `number` = `0`

##### view.zoom

> **zoom**: `number` = `1`

#### zoomLabel

> **zoomLabel**: `ComputedRef`\<`string`\>

***

### wrapper

> **wrapper**: `Ref`\<`HTMLElement`\>

Defined in: [composables/useRegionEditor.ts:17](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionEditor.ts#L17)
