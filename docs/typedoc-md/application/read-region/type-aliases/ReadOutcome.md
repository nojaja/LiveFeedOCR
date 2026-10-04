[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [application/read-region](../README.md) / ReadOutcome

# Type Alias: ReadOutcome

> **ReadOutcome** = \{ `kind`: `"not-found"`; `method`: `"QR"`; \} \| \{ `engine`: [`OcrEngine`](../../../domain/region/type-aliases/OcrEngine.md) \| `"qr"`; `kind`: `"text"`; `method`: `string`; `text`: `string`; \}

Defined in: [application/read-region.ts:11](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/read-region.ts#L11)
