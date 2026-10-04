[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [application/ports](../README.md) / MonitorSink

# Interface: MonitorSink\<O, D\>

Defined in: [application/ports.ts:42](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L42)

## Type Parameters

### O

`O`

### D

`D`

## Methods

### detectionOf()

> **detectionOf**(`item`): [`DetectionState`](../../../domain/change-detection/interfaces/DetectionState.md)

Defined in: [application/ports.ts:43](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L43)

#### Parameters

##### item

`O` \| `D`

#### Returns

[`DetectionState`](../../../domain/change-detection/interfaces/DetectionState.md)

***

### enqueue()

> **enqueue**(`reg`, `reason`): `void`

Defined in: [application/ports.ts:46](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L46)

#### Parameters

##### reg

`O`

##### reason

`string`

#### Returns

`void`

***

### report()

> **report**(`item`, `verdict`): `void`

Defined in: [application/ports.ts:44](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L44)

#### Parameters

##### item

`O` \| `D`

##### verdict

[`Verdict`](../../../domain/change-detection/interfaces/Verdict.md)

#### Returns

`void`

***

### resetSilently()

> **resetSilently**(`reg`): `void`

Defined in: [application/ports.ts:47](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L47)

#### Parameters

##### reg

`O`

#### Returns

`void`

***

### setStatus()

> **setStatus**(`item`, `message`): `void`

Defined in: [application/ports.ts:45](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/ports.ts#L45)

#### Parameters

##### item

`O` \| `D`

##### message

[`StatusMessage`](../../../domain/change-detection/interfaces/StatusMessage.md)

#### Returns

`void`
