[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/useNdlModels](../README.md) / useNdlModels

# Function: useNdlModels()

> **useNdlModels**(`models`, `dialogs`): `object`

Defined in: [composables/useNdlModels.ts:6](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useNdlModels.ts#L6)

## Parameters

### models

[`NdlModelStore`](../../../infrastructure/ocr/ndl-recognizer/classes/NdlModelStore.md)

### dialogs

[`Dialogs`](../../../application/ports/interfaces/Dialogs.md)

## Returns

`object`

### clear

> **clear**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

### importFiles

> **importFiles**: (`files`) => `Promise`\<`void`\>

#### Parameters

##### files

`File`[]

#### Returns

`Promise`\<`void`\>

### reload

> **reload**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

### status

> **status**: `Ref`\<`string`, `string`\>
