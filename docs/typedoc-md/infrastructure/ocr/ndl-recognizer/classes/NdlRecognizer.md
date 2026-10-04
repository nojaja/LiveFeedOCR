[**live-feed-ocr**](../../../../README.md)

***

[live-feed-ocr](../../../../modules.md) / [infrastructure/ocr/ndl-recognizer](../README.md) / NdlRecognizer

# Class: NdlRecognizer

Defined in: [infrastructure/ocr/ndl-recognizer.ts:109](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L109)

## Implements

- [`TextRecognizer`](../../../../application/ports/interfaces/TextRecognizer.md)

## Constructors

### Constructor

> **new NdlRecognizer**(`models`, `report`): `NdlRecognizer`

Defined in: [infrastructure/ocr/ndl-recognizer.ts:113](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L113)

#### Parameters

##### models

[`NdlModelStore`](NdlModelStore.md)

##### report

[`ProgressReporter`](../../../../application/ports/interfaces/ProgressReporter.md)

#### Returns

`NdlRecognizer`

## Methods

### recognize()

> **recognize**(`canvas`): `Promise`\<`string`\>

Defined in: [infrastructure/ocr/ndl-recognizer.ts:194](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/ndl-recognizer.ts#L194)

#### Parameters

##### canvas

`HTMLCanvasElement`

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`TextRecognizer`](../../../../application/ports/interfaces/TextRecognizer.md).[`recognize`](../../../../application/ports/interfaces/TextRecognizer.md#recognize)
