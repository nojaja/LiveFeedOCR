[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [application/job-queue](../README.md) / JobQueue

# Class: JobQueue\<K\>

Defined in: [application/job-queue.ts:4](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/job-queue.ts#L4)

## Type Parameters

### K

`K`

## Constructors

### Constructor

> **new JobQueue**\<`K`\>(`runJob`, `isValid?`, `onQueued?`): `JobQueue`\<`K`\>

Defined in: [application/job-queue.ts:12](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/job-queue.ts#L12)

#### Parameters

##### runJob

(`job`) => `Promise`\<`void`\>

##### isValid?

(`key`) => `boolean`

##### onQueued?

(`key`) => `void`

#### Returns

`JobQueue`\<`K`\>

## Accessors

### size

#### Get Signature

> **get** **size**(): `number`

Defined in: [application/job-queue.ts:22](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/job-queue.ts#L22)

##### Returns

`number`

## Methods

### clear()

> **clear**(): `void`

Defined in: [application/job-queue.ts:35](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/job-queue.ts#L35)

#### Returns

`void`

***

### enqueue()

> **enqueue**(`key`, `reason`): `boolean`

Defined in: [application/job-queue.ts:26](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/job-queue.ts#L26)

#### Parameters

##### key

`K`

##### reason

`string`

#### Returns

`boolean`

***

### has()

> **has**(`key`): `boolean`

Defined in: [application/job-queue.ts:24](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/application/job-queue.ts#L24)

#### Parameters

##### key

`K`

#### Returns

`boolean`
