[**live-feed-ocr**](../../../../README.md)

***

[live-feed-ocr](../../../../modules.md) / [infrastructure/canvas/canvas-image-source](../README.md) / CanvasRegionImageSource

# Class: CanvasRegionImageSource

Defined in: [infrastructure/canvas/canvas-image-source.ts:44](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/canvas/canvas-image-source.ts#L44)

## Implements

- [`RegionImageSource`](../../../../application/ports/interfaces/RegionImageSource.md)\<`WithRuntime`\<[`OcrRegion`](../../../../domain/region/interfaces/OcrRegion.md)\>, `WithRuntime`\<[`DetectRegion`](../../../../domain/region/interfaces/DetectRegion.md)\>\>

## Constructors

### Constructor

> **new CanvasRegionImageSource**(`options`): `CanvasRegionImageSource`

Defined in: [infrastructure/canvas/canvas-image-source.ts:51](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/canvas/canvas-image-source.ts#L51)

#### Parameters

##### options

[`CanvasSourceOptions`](../interfaces/CanvasSourceOptions.md)

#### Returns

`CanvasRegionImageSource`

## Methods

### captureReferenceImage()

> **captureReferenceImage**(`det`): `string`

Defined in: [infrastructure/canvas/canvas-image-source.ts:166](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/canvas/canvas-image-source.ts#L166)

#### Parameters

##### det

`WithRuntime`\<[`DetectRegion`](../../../../domain/region/interfaces/DetectRegion.md)\>

#### Returns

`string`

***

### fallbackSurface()

> **fallbackSurface**(`reg`): `HTMLCanvasElement`

Defined in: [infrastructure/canvas/canvas-image-source.ts:114](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/canvas/canvas-image-source.ts#L114)

#### Parameters

##### reg

`WithRuntime`\<[`OcrRegion`](../../../../domain/region/interfaces/OcrRegion.md)\>

#### Returns

`HTMLCanvasElement`

#### Implementation of

[`RegionImageSource`](../../../../application/ports/interfaces/RegionImageSource.md).[`fallbackSurface`](../../../../application/ports/interfaces/RegionImageSource.md#fallbacksurface)

***

### previewReady()

> **previewReady**(`reg`): `boolean`

Defined in: [infrastructure/canvas/canvas-image-source.ts:110](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/canvas/canvas-image-source.ts#L110)

#### Parameters

##### reg

`WithRuntime`\<[`OcrRegion`](../../../../domain/region/interfaces/OcrRegion.md)\>

#### Returns

`boolean`

#### Implementation of

[`RegionImageSource`](../../../../application/ports/interfaces/RegionImageSource.md).[`previewReady`](../../../../application/ports/interfaces/RegionImageSource.md#previewready)

***

### previewSurface()

> **previewSurface**(`reg`): `HTMLCanvasElement`

Defined in: [infrastructure/canvas/canvas-image-source.ts:112](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/canvas/canvas-image-source.ts#L112)

#### Parameters

##### reg

`WithRuntime`\<[`OcrRegion`](../../../../domain/region/interfaces/OcrRegion.md)\>

#### Returns

`HTMLCanvasElement`

#### Implementation of

[`RegionImageSource`](../../../../application/ports/interfaces/RegionImageSource.md).[`previewSurface`](../../../../application/ports/interfaces/RegionImageSource.md#previewsurface)

***

### referenceSample()

> **referenceSample**(`det`, `w`, `h`): [`GraySample`](../../../../domain/image-filter/interfaces/GraySample.md)

Defined in: [infrastructure/canvas/canvas-image-source.ts:143](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/canvas/canvas-image-source.ts#L143)

#### Parameters

##### det

`WithRuntime`\<[`DetectRegion`](../../../../domain/region/interfaces/DetectRegion.md)\>

##### w

`number`

##### h

`number`

#### Returns

[`GraySample`](../../../../domain/image-filter/interfaces/GraySample.md)

#### Implementation of

[`RegionImageSource`](../../../../application/ports/interfaces/RegionImageSource.md).[`referenceSample`](../../../../application/ports/interfaces/RegionImageSource.md#referencesample)

***

### refreshPreview()

> **refreshPreview**(`reg`): `boolean`

Defined in: [infrastructure/canvas/canvas-image-source.ts:91](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/canvas/canvas-image-source.ts#L91)

#### Parameters

##### reg

`WithRuntime`\<[`OcrRegion`](../../../../domain/region/interfaces/OcrRegion.md)\>

#### Returns

`boolean`

#### Implementation of

[`RegionImageSource`](../../../../application/ports/interfaces/RegionImageSource.md).[`refreshPreview`](../../../../application/ports/interfaces/RegionImageSource.md#refreshpreview)

***

### sampleDetect()

> **sampleDetect**(`det`): [`GraySample`](../../../../domain/image-filter/interfaces/GraySample.md)

Defined in: [infrastructure/canvas/canvas-image-source.ts:128](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/canvas/canvas-image-source.ts#L128)

#### Parameters

##### det

`WithRuntime`\<[`DetectRegion`](../../../../domain/region/interfaces/DetectRegion.md)\>

#### Returns

[`GraySample`](../../../../domain/image-filter/interfaces/GraySample.md)

#### Implementation of

[`RegionImageSource`](../../../../application/ports/interfaces/RegionImageSource.md).[`sampleDetect`](../../../../application/ports/interfaces/RegionImageSource.md#sampledetect)

***

### samplePreview()

> **samplePreview**(`reg`): [`GraySample`](../../../../domain/image-filter/interfaces/GraySample.md)

Defined in: [infrastructure/canvas/canvas-image-source.ts:117](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/canvas/canvas-image-source.ts#L117)

#### Parameters

##### reg

`WithRuntime`\<[`OcrRegion`](../../../../domain/region/interfaces/OcrRegion.md)\>

#### Returns

[`GraySample`](../../../../domain/image-filter/interfaces/GraySample.md)

#### Implementation of

[`RegionImageSource`](../../../../application/ports/interfaces/RegionImageSource.md).[`samplePreview`](../../../../application/ports/interfaces/RegionImageSource.md#samplepreview)

***

### videoError()

> **videoError**(): `string`

Defined in: [infrastructure/canvas/canvas-image-source.ts:56](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/infrastructure/canvas/canvas-image-source.ts#L56)

#### Returns

`string`

#### Implementation of

[`RegionImageSource`](../../../../application/ports/interfaces/RegionImageSource.md).[`videoError`](../../../../application/ports/interfaces/RegionImageSource.md#videoerror)
