[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/useRegions](../README.md) / useRegions

# Function: useRegions()

> **useRegions**(`hooks?`): `object`

Defined in: [composables/useRegions.ts:43](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegions.ts#L43)

## Parameters

### hooks?

[`RegionsHooks`](../interfaces/RegionsHooks.md) = `{}`

## Returns

`object`

### addDetect

> **addDetect**: (`rect`, `saved?`) => [`DetectView`](../type-aliases/DetectView.md)

#### Parameters

##### rect

[`Rect`](../../../domain/region/interfaces/Rect.md)

##### saved?

`any`

#### Returns

[`DetectView`](../type-aliases/DetectView.md)

### addOcr

> **addOcr**: (`rect`, `saved?`) => [`OcrView`](../type-aliases/OcrView.md)

#### Parameters

##### rect

[`Rect`](../../../domain/region/interfaces/Rect.md)

##### saved?

`any`

#### Returns

[`OcrView`](../type-aliases/OcrView.md)

### allItems

> **allItems**: () => [`RegionView`](../type-aliases/RegionView.md)[]

#### Returns

[`RegionView`](../type-aliases/RegionView.md)[]

### applySnapshot

> **applySnapshot**: (`snap`) => `void`

#### Parameters

##### snap

`any`

#### Returns

`void`

### canAddOcr

> **canAddOcr**: () => `boolean`

#### Returns

`boolean`

### clear

> **clear**: () => `void`

#### Returns

`void`

### detectRegions

> **detectRegions**: `Ref`\<[`DetectView`](../type-aliases/DetectView.md)[], [`DetectView`](../type-aliases/DetectView.md)[]\>

### nextDetectId

> **nextDetectId**: `Ref`\<`number`, `number`\>

### nextId

> **nextId**: `Ref`\<`number`, `number`\>

### ocrRegions

> **ocrRegions**: `Ref`\<[`OcrView`](../type-aliases/OcrView.md)[], [`OcrView`](../type-aliases/OcrView.md)[]\>

### removeDetect

> **removeDetect**: (`reg`) => `void`

#### Parameters

##### reg

[`DetectView`](../type-aliases/DetectView.md)

#### Returns

`void`

### removeOcr

> **removeOcr**: (`reg`) => `void`

#### Parameters

##### reg

[`OcrView`](../type-aliases/OcrView.md)

#### Returns

`void`

### report

> **report**: (`item`, `verdict`) => `void`

#### Parameters

##### item

[`RegionView`](../type-aliases/RegionView.md)

##### verdict

[`Verdict`](../../../domain/change-detection/interfaces/Verdict.md)

#### Returns

`void`

### resetItem

> **resetItem**: (`item`, `silent`) => `void`

#### Parameters

##### item

[`RegionView`](../type-aliases/RegionView.md)

##### silent

`boolean`

#### Returns

`void`

### setStatus

> **setStatus**: (`item`, `message`) => `void`

#### Parameters

##### item

[`RegionView`](../type-aliases/RegionView.md)

##### message

[`StatusMessage`](../../../domain/change-detection/interfaces/StatusMessage.md)

#### Returns

`void`

### snapshot

> **snapshot**: (`name`) => [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)

#### Parameters

##### name?

`string` = `''`

#### Returns

[`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)
