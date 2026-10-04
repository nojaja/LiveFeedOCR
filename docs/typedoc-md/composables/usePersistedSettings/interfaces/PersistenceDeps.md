[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/usePersistedSettings](../README.md) / PersistenceDeps

# Interface: PersistenceDeps

Defined in: [composables/usePersistedSettings.ts:9](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/usePersistedSettings.ts#L9)

## Properties

### common

> **common**: [`CommonSettings`](../../../application/repositories/interfaces/CommonSettings.md)

Defined in: [composables/usePersistedSettings.ts:12](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/usePersistedSettings.ts#L12)

***

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [composables/usePersistedSettings.ts:13](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/usePersistedSettings.ts#L13)

***

### regions

> **regions**: `object`

Defined in: [composables/usePersistedSettings.ts:11](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/usePersistedSettings.ts#L11)

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

> **repository**: [`SettingsRepository`](../../../application/repositories/classes/SettingsRepository.md)

Defined in: [composables/usePersistedSettings.ts:10](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/usePersistedSettings.ts#L10)
