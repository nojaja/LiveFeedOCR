[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [application/monitor](../README.md) / runMonitorStep

# Function: runMonitorStep()

> **runMonitorStep**(`ocrRegions`, `detectRegions`, `source`, `sink`, `now`): [`StepResult`](../interfaces/StepResult.md)

Defined in: [application/monitor.ts:22](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/monitor.ts#L22)

## Parameters

### ocrRegions

[`OcrRegion`](../../../domain/region/interfaces/OcrRegion.md)[]

### detectRegions

`DetectCondition`[]

### source

[`RegionImageSource`](../../ports/interfaces/RegionImageSource.md)

### sink

[`MonitorSink`](../../ports/interfaces/MonitorSink.md)\<[`OcrRegion`](../../../domain/region/interfaces/OcrRegion.md), [`DetectRegion`](../../../domain/region/interfaces/DetectRegion.md)\>

### now

`number`

## Returns

[`StepResult`](../interfaces/StepResult.md)
