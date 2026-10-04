[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/useWorkspace](../README.md) / createWorkspace

# Function: createWorkspace()

> **createWorkspace**(`services?`): `object`

Defined in: [composables/useWorkspace.ts:35](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useWorkspace.ts#L35)

## Parameters

### services?

[`WorkspaceServices`](../interfaces/WorkspaceServices.md) = `browserServices`

## Returns

`object`

### actions

> **actions**: `object`

#### actions.onDetectSettingChanged

> **onDetectSettingChanged**: (`det`) => `void`

##### Parameters

###### det

[`DetectView`](../../useRegions/type-aliases/DetectView.md)

##### Returns

`void`

#### actions.onOcrImageSettingChanged

> **onOcrImageSettingChanged**: (`reg`) => `void`

##### Parameters

###### reg

[`OcrView`](../../useRegions/type-aliases/OcrView.md)

##### Returns

`void`

#### actions.captureReference()

> **captureReference**(`det`): `void`

##### Parameters

###### det

[`DetectView`](../../useRegions/type-aliases/DetectView.md)

##### Returns

`void`

#### actions.readNow()

> **readNow**(`reg`): `void`

##### Parameters

###### reg

[`OcrView`](../../useRegions/type-aliases/OcrView.md)

##### Returns

`void`

### common

> **common**: `object`

#### common.fps

> **fps**: `string`

#### common.lang

> **lang**: `string`

#### common.setName

> **setName**: `string`

### ctrlPressed

> **ctrlPressed**: `Ref`\<`boolean`, `boolean`\>

### dialogs

> **dialogs**: [`Dialogs`](../../../application/ports/interfaces/Dialogs.md) = `services.dialogs`

### editor

> **editor**: `object`

#### editor.cursor

> **cursor**: `Ref`\<`string`, `string`\>

#### editor.dragging

> **dragging**: () => `boolean`

##### Returns

`boolean`

#### editor.drawMode

> **drawMode**: `Ref`\<[`DrawMode`](../../useRegionEditor/type-aliases/DrawMode.md), [`DrawMode`](../../useRegionEditor/type-aliases/DrawMode.md)\>

#### editor.onPointerCancel

> **onPointerCancel**: () => `void`

##### Returns

`void`

#### editor.onPointerDown

> **onPointerDown**: (`e`) => `void`

##### Parameters

###### e

`PointerEvent`

##### Returns

`void`

#### editor.onPointerMove

> **onPointerMove**: (`e`) => `void`

##### Parameters

###### e

`PointerEvent`

##### Returns

`void`

#### editor.onPointerUp

> **onPointerUp**: (`e`) => `void`

##### Parameters

###### e

`PointerEvent`

##### Returns

`void`

#### editor.setDrawMode

> **setDrawMode**: (`mode`) => `void`

##### Parameters

###### mode

[`DrawMode`](../../useRegionEditor/type-aliases/DrawMode.md)

##### Returns

`void`

### elements

> **elements**: `object`

#### elements.overlay

> **overlay**: `ShallowRef`\<`HTMLCanvasElement`, `HTMLCanvasElement`\>

#### elements.stage

> **stage**: `ShallowRef`\<`HTMLElement`, `HTMLElement`\>

#### elements.video

> **video**: `ShallowRef`\<`HTMLVideoElement`, `HTMLVideoElement`\>

#### elements.wrapper

> **wrapper**: `ShallowRef`\<`HTMLElement`, `HTMLElement`\>

### log

> **log**: `object`

#### log.add

> **add**: (`input`) => `void`

##### Parameters

###### input

[`NewResult`](../../../domain/result-log/interfaces/NewResult.md)

##### Returns

`void`

#### log.clearAll

> **clearAll**: () => `void`

##### Returns

`void`

#### log.copyText

> **copyText**: (`text`) => `Promise`\<`void`\> = `deps.copyText`

##### Parameters

###### text

`string`

##### Returns

`Promise`\<`void`\>

#### log.entries

> **entries**: `Ref`\<`object`[], [`LogEntry`](../../../domain/result-log/interfaces/LogEntry.md)[] \| `object`[]\>

#### log.exportCsv

> **exportCsv**: () => `void`

##### Returns

`void`

#### log.remove

> **remove**: (`id`) => `void`

##### Parameters

###### id

`string`

##### Returns

`void`

### monitor

> **monitor**: `object`

#### monitor.debugText

> **debugText**: `Ref`\<`string`, `string`\>

#### monitor.start

> **start**: () => `void`

##### Returns

`void`

#### monitor.stateColor

> **stateColor**: `Ref`\<`string`, `string`\>

#### monitor.stateText

> **stateText**: `Ref`\<`string`, `string`\>

#### monitor.stop

> **stop**: () => `void`

##### Returns

`void`

### ndl

> **ndl**: `object`

#### ndl.clear

> **clear**: () => `Promise`\<`void`\>

##### Returns

`Promise`\<`void`\>

#### ndl.importFiles

> **importFiles**: (`files`) => `Promise`\<`void`\>

##### Parameters

###### files

`File`[]

##### Returns

`Promise`\<`void`\>

#### ndl.reload

> **reload**: () => `Promise`\<`void`\>

##### Returns

`Promise`\<`void`\>

#### ndl.status

> **status**: `Ref`\<`string`, `string`\>

### progress

> **progress**: `Ref`\<`string`, `string`\>

### regions

> **regions**: `object`

#### regions.addDetect

> **addDetect**: (`rect`, `saved?`) => [`DetectView`](../../useRegions/type-aliases/DetectView.md)

##### Parameters

###### rect

[`Rect`](../../../domain/region/interfaces/Rect.md)

###### saved?

`any`

##### Returns

[`DetectView`](../../useRegions/type-aliases/DetectView.md)

#### regions.addOcr

> **addOcr**: (`rect`, `saved?`) => [`OcrView`](../../useRegions/type-aliases/OcrView.md)

##### Parameters

###### rect

[`Rect`](../../../domain/region/interfaces/Rect.md)

###### saved?

`any`

##### Returns

[`OcrView`](../../useRegions/type-aliases/OcrView.md)

#### regions.allItems

> **allItems**: () => [`RegionView`](../../useRegions/type-aliases/RegionView.md)[]

##### Returns

[`RegionView`](../../useRegions/type-aliases/RegionView.md)[]

#### regions.applySnapshot

> **applySnapshot**: (`snap`) => `void`

##### Parameters

###### snap

`any`

##### Returns

`void`

#### regions.canAddOcr

> **canAddOcr**: () => `boolean`

##### Returns

`boolean`

#### regions.clear

> **clear**: () => `void`

##### Returns

`void`

#### regions.detectRegions

> **detectRegions**: `Ref`\<[`DetectView`](../../useRegions/type-aliases/DetectView.md)[], [`DetectView`](../../useRegions/type-aliases/DetectView.md)[]\>

#### regions.nextDetectId

> **nextDetectId**: `Ref`\<`number`, `number`\>

#### regions.nextId

> **nextId**: `Ref`\<`number`, `number`\>

#### regions.ocrRegions

> **ocrRegions**: `Ref`\<[`OcrView`](../../useRegions/type-aliases/OcrView.md)[], [`OcrView`](../../useRegions/type-aliases/OcrView.md)[]\>

#### regions.removeDetect

> **removeDetect**: (`reg`) => `void`

##### Parameters

###### reg

[`DetectView`](../../useRegions/type-aliases/DetectView.md)

##### Returns

`void`

#### regions.removeOcr

> **removeOcr**: (`reg`) => `void`

##### Parameters

###### reg

[`OcrView`](../../useRegions/type-aliases/OcrView.md)

##### Returns

`void`

#### regions.report

> **report**: (`item`, `verdict`) => `void`

##### Parameters

###### item

[`RegionView`](../../useRegions/type-aliases/RegionView.md)

###### verdict

[`Verdict`](../../../domain/change-detection/interfaces/Verdict.md)

##### Returns

`void`

#### regions.resetItem

> **resetItem**: (`item`, `silent`) => `void`

##### Parameters

###### item

[`RegionView`](../../useRegions/type-aliases/RegionView.md)

###### silent

`boolean`

##### Returns

`void`

#### regions.setStatus

> **setStatus**: (`item`, `message`) => `void`

##### Parameters

###### item

[`RegionView`](../../useRegions/type-aliases/RegionView.md)

###### message

[`StatusMessage`](../../../domain/change-detection/interfaces/StatusMessage.md)

##### Returns

`void`

#### regions.snapshot

> **snapshot**: (`name`) => [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)

##### Parameters

###### name?

`string` = `''`

##### Returns

[`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)

### regionSets

> **regionSets**: `object`

#### regionSets.exportJson

> **exportJson**: () => `void`

##### Returns

`void`

#### regionSets.importFile

> **importFile**: (`file`) => `Promise`\<`void`\>

##### Parameters

###### file

`File`

##### Returns

`Promise`\<`void`\>

#### regionSets.load

> **load**: () => `void`

##### Returns

`void`

#### regionSets.newName

> **newName**: `Ref`\<`string`, `string`\>

#### regionSets.options

> **options**: `ComputedRef`\<`object`[]\>

#### regionSets.refresh

> **refresh**: (`select?`) => `void`

##### Parameters

###### select?

`string`

##### Returns

`void`

#### regionSets.remove

> **remove**: () => `void`

##### Returns

`void`

#### regionSets.save

> **save**: () => `void`

##### Returns

`void`

#### regionSets.selected

> **selected**: `Ref`\<`string`, `string`\>

#### regionSets.sets

> **sets**: `Ref`\<`Record`\<`string`, [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)\>, `Record`\<`string`, [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)\>\>

### settings

> **settings**: `object`

#### settings.save

> **save**: () => `void`

##### Returns

`void`

### viewport

> **viewport**: `object`

#### viewport.beginPan

> **beginPan**: (`event`) => `boolean`

##### Parameters

###### event

`PointerEvent`

##### Returns

`boolean`

#### viewport.changeZoom

> **changeZoom**: (`deltaY`) => `void`

##### Parameters

###### deltaY

`number`

##### Returns

`void`

#### viewport.endPan

> **endPan**: () => `boolean`

##### Returns

`boolean`

#### viewport.movePan

> **movePan**: (`event`) => `boolean`

##### Parameters

###### event

`PointerEvent`

##### Returns

`boolean`

#### viewport.onWheel

> **onWheel**: (`event`) => `void`

##### Parameters

###### event

`WheelEvent`

##### Returns

`void`

#### viewport.panReady

> **panReady**: `ComputedRef`\<`boolean`\>

#### viewport.refresh

> **refresh**: () => `void`

##### Returns

`void`

#### viewport.setZoom

> **setZoom**: (`zoom`) => `void`

##### Parameters

###### zoom

`number`

##### Returns

`void`

#### viewport.stageStyle

> **stageStyle**: `ComputedRef`\<\{ `--capture-pan-x`: `string`; `--capture-pan-y`: `string`; `--capture-zoom`: `number`; \}\>

#### viewport.toContentPoint

> **toContentPoint**: (`clientX`, `clientY`) => `object`

##### Parameters

###### clientX

`number`

###### clientY

`number`

##### Returns

`object`

###### x

> **x**: `number`

###### y

> **y**: `number`

#### viewport.view

> **view**: `object`

#### viewport.view.panning

> **panning**: `boolean` = `false`

#### viewport.view.panX

> **panX**: `number` = `0`

#### viewport.view.panY

> **panY**: `number` = `0`

#### viewport.view.zoom

> **zoom**: `number` = `1`

#### viewport.zoomLabel

> **zoomLabel**: `ComputedRef`\<`string`\>
