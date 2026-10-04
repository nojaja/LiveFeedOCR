[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [application/repositories](../README.md) / ResultLogRepository

# Class: ResultLogRepository

Defined in: [application/repositories.ts:55](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L55)

## Constructors

### Constructor

> **new ResultLogRepository**(`store`): `ResultLogRepository`

Defined in: [application/repositories.ts:57](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L57)

#### Parameters

##### store

[`KeyValueStore`](../../ports/interfaces/KeyValueStore.md)

#### Returns

`ResultLogRepository`

## Methods

### load()

> **load**(): [`LogEntry`](../../../domain/result-log/interfaces/LogEntry.md)[]

Defined in: [application/repositories.ts:59](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L59)

#### Returns

[`LogEntry`](../../../domain/result-log/interfaces/LogEntry.md)[]

***

### save()

> **save**(`entries`): `void`

Defined in: [application/repositories.ts:63](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L63)

#### Parameters

##### entries

[`LogEntry`](../../../domain/result-log/interfaces/LogEntry.md)[]

#### Returns

`void`
