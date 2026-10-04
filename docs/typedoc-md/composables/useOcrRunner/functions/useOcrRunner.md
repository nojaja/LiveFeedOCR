[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/useOcrRunner](../README.md) / useOcrRunner

# Function: useOcrRunner()

> **useOcrRunner**(`__namedParameters`): `object`

Defined in: [composables/useOcrRunner.ts:16](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useOcrRunner.ts#L16)

## Parameters

### \_\_namedParameters

[`OcrRunnerDeps`](../interfaces/OcrRunnerDeps.md)

## Returns

`object`

### clearQueue

> **clearQueue**: () => `void`

#### Returns

`void`

### enqueue

> **enqueue**: (`reg`, `reason`) => `boolean`

#### Parameters

##### reg

[`OcrView`](../../useRegions/type-aliases/OcrView.md)

##### reason

`string`

#### Returns

`boolean`
