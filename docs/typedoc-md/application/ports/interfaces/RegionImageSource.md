[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [application/ports](../README.md) / RegionImageSource

# Interface: RegionImageSource\<O, D\>

Defined in: [application/ports.ts:31](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L31)

## Type Parameters

### O

`O` *extends* [`OcrRegion`](../../../domain/region/interfaces/OcrRegion.md) = [`OcrRegion`](../../../domain/region/interfaces/OcrRegion.md)

### D

`D` *extends* [`DetectRegion`](../../../domain/region/interfaces/DetectRegion.md) = [`DetectRegion`](../../../domain/region/interfaces/DetectRegion.md)

## Methods

### fallbackSurface()

> **fallbackSurface**(`reg`): `HTMLCanvasElement`

Defined in: [application/ports.ts:36](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L36)

#### Parameters

##### reg

`O`

#### Returns

`HTMLCanvasElement`

***

### previewReady()

> **previewReady**(`reg`): `boolean`

Defined in: [application/ports.ts:34](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L34)

#### Parameters

##### reg

`O`

#### Returns

`boolean`

***

### previewSurface()

> **previewSurface**(`reg`): `HTMLCanvasElement`

Defined in: [application/ports.ts:35](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L35)

#### Parameters

##### reg

`O`

#### Returns

`HTMLCanvasElement`

***

### referenceSample()

> **referenceSample**(`det`, `w`, `h`): [`GraySample`](../../../domain/image-filter/interfaces/GraySample.md)

Defined in: [application/ports.ts:39](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L39)

#### Parameters

##### det

`D`

##### w

`number`

##### h

`number`

#### Returns

[`GraySample`](../../../domain/image-filter/interfaces/GraySample.md)

***

### refreshPreview()

> **refreshPreview**(`reg`): `boolean`

Defined in: [application/ports.ts:33](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L33)

#### Parameters

##### reg

`O`

#### Returns

`boolean`

***

### sampleDetect()

> **sampleDetect**(`det`): [`GraySample`](../../../domain/image-filter/interfaces/GraySample.md)

Defined in: [application/ports.ts:38](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L38)

#### Parameters

##### det

`D`

#### Returns

[`GraySample`](../../../domain/image-filter/interfaces/GraySample.md)

***

### samplePreview()

> **samplePreview**(`reg`): [`GraySample`](../../../domain/image-filter/interfaces/GraySample.md)

Defined in: [application/ports.ts:37](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L37)

#### Parameters

##### reg

`O`

#### Returns

[`GraySample`](../../../domain/image-filter/interfaces/GraySample.md)

***

### videoError()

> **videoError**(): `string`

Defined in: [application/ports.ts:32](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L32)

#### Returns

`string`
