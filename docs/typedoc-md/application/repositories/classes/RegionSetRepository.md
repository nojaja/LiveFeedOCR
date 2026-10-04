[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [application/repositories](../README.md) / RegionSetRepository

# Class: RegionSetRepository

Defined in: [application/repositories.ts:40](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L40)

## Constructors

### Constructor

> **new RegionSetRepository**(`store`): `RegionSetRepository`

Defined in: [application/repositories.ts:42](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L42)

#### Parameters

##### store

[`KeyValueStore`](../../ports/interfaces/KeyValueStore.md)

#### Returns

`RegionSetRepository`

## Methods

### readAll()

> **readAll**(): `Record`\<`string`, [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)\>

Defined in: [application/repositories.ts:44](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L44)

#### Returns

`Record`\<`string`, [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)\>

***

### writeAll()

> **writeAll**(`sets`): `void`

Defined in: [application/repositories.ts:50](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L50)

#### Parameters

##### sets

`Record`\<`string`, [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)\>

#### Returns

`void`
