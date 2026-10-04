[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [domain/change-detection](../README.md) / judgeReference

# Function: judgeReference()

> **judgeReference**(`st`, `d`, `cur`, `refSample`, `now`): [`Verdict`](../interfaces/Verdict.md)

Defined in: [domain/change-detection.ts:119](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/domain/change-detection.ts#L119)

## Parameters

### st

[`DetectionState`](../interfaces/DetectionState.md)

### d

[`Detection`](../../region/interfaces/Detection.md)

### cur

[`GraySample`](../../image-filter/interfaces/GraySample.md)

### refSample

[`GraySample`](../../image-filter/interfaces/GraySample.md)

### now

`number`

## Returns

[`Verdict`](../interfaces/Verdict.md)
