[**live-feed-ocr**](../../../../README.md)

***

[live-feed-ocr](../../../../modules.md) / [infrastructure/ocr/basic-recognizers](../README.md) / JsQrReader

# Class: JsQrReader

Defined in: [infrastructure/ocr/basic-recognizers.ts:108](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/basic-recognizers.ts#L108)

## Implements

- [`QrReader`](../../../../application/ports/interfaces/QrReader.md)

## Constructors

### Constructor

> **new JsQrReader**(): `JsQrReader`

#### Returns

`JsQrReader`

## Methods

### read()

> **read**(`candidates`): `string`

Defined in: [infrastructure/ocr/basic-recognizers.ts:109](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/ocr/basic-recognizers.ts#L109)

#### Parameters

##### candidates

`HTMLCanvasElement`[]

#### Returns

`string`

#### Implementation of

[`QrReader`](../../../../application/ports/interfaces/QrReader.md).[`read`](../../../../application/ports/interfaces/QrReader.md#read)
