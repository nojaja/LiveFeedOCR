[**live-feed-ocr**](../../../../README.md)

***

[live-feed-ocr](../../../../modules.md) / [infrastructure/ocr/ndl-recognizer](../README.md) / NdlModelStore

# Class: NdlModelStore

Defined in: [infrastructure/ocr/ndl-recognizer.ts:50](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L50)

## Constructors

### Constructor

> **new NdlModelStore**(`repo?`): `NdlModelStore`

Defined in: [infrastructure/ocr/ndl-recognizer.ts:57](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L57)

#### Parameters

##### repo?

[`NdlFileRepository`](NdlFileRepository.md) = `...`

#### Returns

`NdlModelStore`

## Properties

### charset

> **charset**: `string`[] = `null`

Defined in: [infrastructure/ocr/ndl-recognizer.ts:52](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L52)

***

### diag

> **diag**: `string` = `''`

Defined in: [infrastructure/ocr/ndl-recognizer.ts:54](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L54)

***

### files

> **files**: `Record`\<`string`, `any`\> = `{}`

Defined in: [infrastructure/ocr/ndl-recognizer.ts:51](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L51)

***

### sessions

> **sessions**: `Record`\<`string`, \{ `H`: `number`; `session`: `any`; `W`: `number`; \}\> = `{}`

Defined in: [infrastructure/ocr/ndl-recognizer.ts:53](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L53)

## Methods

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [infrastructure/ocr/ndl-recognizer.ts:94](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L94)

#### Returns

`Promise`\<`void`\>

***

### importFiles()

> **importFiles**(`files`): `Promise`\<`string`[]\>

Defined in: [infrastructure/ocr/ndl-recognizer.ts:72](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L72)

#### Parameters

##### files

`File`[]

#### Returns

`Promise`\<`string`[]\>

***

### reload()

> **reload**(): `Promise`\<`void`\>

Defined in: [infrastructure/ocr/ndl-recognizer.ts:59](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L59)

#### Returns

`Promise`\<`void`\>

***

### statusText()

> **statusText**(): `string`

Defined in: [infrastructure/ocr/ndl-recognizer.ts:99](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L99)

#### Returns

`string`
