[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/useRegionSets](../README.md) / useRegionSets

# Function: useRegionSets()

> **useRegionSets**(`__namedParameters`): `object`

Defined in: [composables/useRegionSets.ts:16](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useRegionSets.ts#L16)

## Parameters

### \_\_namedParameters

[`RegionSetDeps`](../interfaces/RegionSetDeps.md)

## Returns

`object`

### exportJson

> **exportJson**: () => `void`

#### Returns

`void`

### importFile

> **importFile**: (`file`) => `Promise`\<`void`\>

#### Parameters

##### file

`File`

#### Returns

`Promise`\<`void`\>

### load

> **load**: () => `void`

#### Returns

`void`

### newName

> **newName**: `Ref`\<`string`, `string`\>

### options

> **options**: `ComputedRef`\<`object`[]\>

### refresh

> **refresh**: (`select?`) => `void`

#### Parameters

##### select?

`string`

#### Returns

`void`

### remove

> **remove**: () => `void`

#### Returns

`void`

### save

> **save**: () => `void`

#### Returns

`void`

### selected

> **selected**: `Ref`\<`string`, `string`\>

### sets

> **sets**: `Ref`\<`Record`\<`string`, [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)\>, `Record`\<`string`, [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)\>\>
