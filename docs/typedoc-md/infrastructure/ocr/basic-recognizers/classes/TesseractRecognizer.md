[**live-feed-ocr**](../../../../README.md)

***

[live-feed-ocr](../../../../modules.md) / [infrastructure/ocr/basic-recognizers](../README.md) / TesseractRecognizer

# Class: TesseractRecognizer

Defined in: [infrastructure/ocr/basic-recognizers.ts:5](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/basic-recognizers.ts#L5)

## Implements

- [`TextRecognizer`](../../../../application/ports/interfaces/TextRecognizer.md)

## Constructors

### Constructor

> **new TesseractRecognizer**(`getLang`, `report`): `TesseractRecognizer`

Defined in: [infrastructure/ocr/basic-recognizers.ts:11](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/basic-recognizers.ts#L11)

#### Parameters

##### getLang

() => `string`

##### report

[`ProgressReporter`](../../../../application/ports/interfaces/ProgressReporter.md)

#### Returns

`TesseractRecognizer`

## Methods

### dispose()

> **dispose**(): `void`

Defined in: [infrastructure/ocr/basic-recognizers.ts:39](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/basic-recognizers.ts#L39)

#### Returns

`void`

***

### recognize()

> **recognize**(`canvas`): `Promise`\<`string`\>

Defined in: [infrastructure/ocr/basic-recognizers.ts:33](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/basic-recognizers.ts#L33)

#### Parameters

##### canvas

`HTMLCanvasElement`

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`TextRecognizer`](../../../../application/ports/interfaces/TextRecognizer.md).[`recognize`](../../../../application/ports/interfaces/TextRecognizer.md#recognize)
