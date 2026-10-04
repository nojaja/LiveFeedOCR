[**live-feed-ocr**](../../../../README.md)

***

[live-feed-ocr](../../../../modules.md) / [infrastructure/ocr/basic-recognizers](../README.md) / PaddleRecognizer

# Class: PaddleRecognizer

Defined in: [infrastructure/ocr/basic-recognizers.ts:77](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/basic-recognizers.ts#L77)

## Implements

- [`TextRecognizer`](../../../../application/ports/interfaces/TextRecognizer.md)

## Constructors

### Constructor

> **new PaddleRecognizer**(`report`): `PaddleRecognizer`

Defined in: [infrastructure/ocr/basic-recognizers.ts:81](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/basic-recognizers.ts#L81)

#### Parameters

##### report

[`ProgressReporter`](../../../../application/ports/interfaces/ProgressReporter.md)

#### Returns

`PaddleRecognizer`

## Methods

### recognize()

> **recognize**(`canvas`): `Promise`\<`string`\>

Defined in: [infrastructure/ocr/basic-recognizers.ts:83](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/basic-recognizers.ts#L83)

#### Parameters

##### canvas

`HTMLCanvasElement`

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`TextRecognizer`](../../../../application/ports/interfaces/TextRecognizer.md).[`recognize`](../../../../application/ports/interfaces/TextRecognizer.md#recognize)
