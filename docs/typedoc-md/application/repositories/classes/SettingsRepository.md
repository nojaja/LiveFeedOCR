[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [application/repositories](../README.md) / SettingsRepository

# Class: SettingsRepository

Defined in: [application/repositories.ts:22](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L22)

## Constructors

### Constructor

> **new SettingsRepository**(`store`): `SettingsRepository`

Defined in: [application/repositories.ts:24](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L24)

#### Parameters

##### store

[`KeyValueStore`](../../ports/interfaces/KeyValueStore.md)

#### Returns

`SettingsRepository`

## Methods

### load()

> **load**(): [`StoredSettings`](../interfaces/StoredSettings.md)

Defined in: [application/repositories.ts:26](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L26)

#### Returns

[`StoredSettings`](../interfaces/StoredSettings.md)

***

### save()

> **save**(`snap`, `common`): `void`

Defined in: [application/repositories.ts:31](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/repositories.ts#L31)

#### Parameters

##### snap

[`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)

##### common

[`CommonSettings`](../interfaces/CommonSettings.md)

#### Returns

`void`
