[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/useOcrLog](../README.md) / useOcrLog

# Function: useOcrLog()

> **useOcrLog**(`deps`): `object`

Defined in: [composables/useOcrLog.ts:14](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useOcrLog.ts#L14)

## Parameters

### deps

[`LogDeps`](../interfaces/LogDeps.md)

## Returns

`object`

### add

> **add**: (`input`) => `void`

#### Parameters

##### input

[`NewResult`](../../../domain/result-log/interfaces/NewResult.md)

#### Returns

`void`

### clearAll

> **clearAll**: () => `void`

#### Returns

`void`

### copyText

> **copyText**: (`text`) => `Promise`\<`void`\> = `deps.copyText`

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`void`\>

### entries

> **entries**: `Ref`\<`object`[], [`LogEntry`](../../../domain/result-log/interfaces/LogEntry.md)[] \| `object`[]\>

### exportCsv

> **exportCsv**: () => `void`

#### Returns

`void`

### remove

> **remove**: (`id`) => `void`

#### Parameters

##### id

`string`

#### Returns

`void`
