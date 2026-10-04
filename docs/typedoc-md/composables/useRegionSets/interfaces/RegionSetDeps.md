[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/useRegionSets](../README.md) / RegionSetDeps

# Interface: RegionSetDeps

Defined in: [composables/useRegionSets.ts:7](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionSets.ts#L7)

## Properties

### dialogs

> **dialogs**: [`Dialogs`](../../../application/ports/interfaces/Dialogs.md)

Defined in: [composables/useRegionSets.ts:10](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionSets.ts#L10)

***

### download

> **download**: (`blob`, `fileName`) => `void`

Defined in: [composables/useRegionSets.ts:11](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionSets.ts#L11)

#### Parameters

##### blob

`Blob`

##### fileName

`string`

#### Returns

`void`

***

### regions

> **regions**: `object`

Defined in: [composables/useRegionSets.ts:8](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionSets.ts#L8)

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

### repository

> **repository**: [`RegionSetRepository`](../../../application/repositories/classes/RegionSetRepository.md)

Defined in: [composables/useRegionSets.ts:9](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionSets.ts#L9)

***

### selected

> **selected**: `Ref`\<`string`\>

Defined in: [composables/useRegionSets.ts:12](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionSets.ts#L12)
