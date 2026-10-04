[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [domain/image-filter](../README.md) / accumulateImage

# Function: accumulateImage()

> **accumulateImage**(`data`, `w`, `h`, `f`, `d`, `holder`): `void`

Defined in: [domain/image-filter.ts:80](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/domain/image-filter.ts#L80)

## Parameters

### data

`Uint8Array`\<`ArrayBufferLike`\> \| `Uint8ClampedArray`\<`ArrayBufferLike`\>

### w

`number`

### h

`number`

### f

[`Filters`](../../region/interfaces/Filters.md)

### d

`Pick`\<[`Detection`](../../region/interfaces/Detection.md), `"accumN"` \| `"accumMode"`\>

### holder

[`AccumHolder`](../interfaces/AccumHolder.md)

## Returns

`void`
