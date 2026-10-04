[**live-feed-ocr**](../../../README.md)

***

[live-feed-ocr](../../../modules.md) / [composables/useWorkspace](../README.md) / provideWorkspace

# Function: provideWorkspace()

> **provideWorkspace**(`workspace`): `void`

Defined in: [composables/useWorkspace.ts:130](https://github.com/nojaja/LiveFeedOCR/blob/ca5865df3e8a2bef0837f4c35238f0bff858498b/src/composables/useWorkspace.ts#L130)

## Parameters

### workspace

#### actions

\{ `onDetectSettingChanged`: (`det`) => `void`; `onOcrImageSettingChanged`: (`reg`) => `void`; `captureReference`: `void`; `readNow`: `void`; \} = `...`

#### actions.onDetectSettingChanged

(`det`) => `void` = `...`

#### actions.onOcrImageSettingChanged

(`reg`) => `void`

#### actions.captureReference

#### actions.readNow

#### common

\{ `fps`: `string`; `lang`: `string`; `setName`: `string`; \}

#### common.fps

`string`

#### common.lang

`string`

#### common.setName

`string`

#### ctrlPressed

`Ref`\<`boolean`, `boolean`\>

#### dialogs

[`Dialogs`](../../../application/ports/interfaces/Dialogs.md) = `services.dialogs`

#### editor

\{ `cursor`: `Ref`\<`string`, `string`\>; `dragging`: () => `boolean`; `drawMode`: `Ref`\<[`DrawMode`](../../useRegionEditor/type-aliases/DrawMode.md), [`DrawMode`](../../useRegionEditor/type-aliases/DrawMode.md)\>; `onPointerCancel`: () => `void`; `onPointerDown`: (`e`) => `void`; `onPointerMove`: (`e`) => `void`; `onPointerUp`: (`e`) => `void`; `setDrawMode`: (`mode`) => `void`; \}

#### editor.cursor

`Ref`\<`string`, `string`\>

#### editor.dragging

() => `boolean` = `...`

#### editor.drawMode

`Ref`\<[`DrawMode`](../../useRegionEditor/type-aliases/DrawMode.md), [`DrawMode`](../../useRegionEditor/type-aliases/DrawMode.md)\>

#### editor.onPointerCancel

() => `void`

#### editor.onPointerDown

(`e`) => `void`

#### editor.onPointerMove

(`e`) => `void`

#### editor.onPointerUp

(`e`) => `void`

#### editor.setDrawMode

(`mode`) => `void`

#### elements

\{ `overlay`: `ShallowRef`\<`HTMLCanvasElement`, `HTMLCanvasElement`\>; `stage`: `ShallowRef`\<`HTMLElement`, `HTMLElement`\>; `video`: `ShallowRef`\<`HTMLVideoElement`, `HTMLVideoElement`\>; `wrapper`: `ShallowRef`\<`HTMLElement`, `HTMLElement`\>; \}

#### elements.overlay

`ShallowRef`\<`HTMLCanvasElement`, `HTMLCanvasElement`\> = `...`

#### elements.stage

`ShallowRef`\<`HTMLElement`, `HTMLElement`\> = `...`

#### elements.video

`ShallowRef`\<`HTMLVideoElement`, `HTMLVideoElement`\> = `...`

#### elements.wrapper

`ShallowRef`\<`HTMLElement`, `HTMLElement`\> = `...`

#### log

\{ `add`: (`input`) => `void`; `clearAll`: () => `void`; `copyText`: (`text`) => `Promise`\<`void`\>; `entries`: `Ref`\<`object`[], [`LogEntry`](../../../domain/result-log/interfaces/LogEntry.md)[] \| `object`[]\>; `exportCsv`: () => `void`; `remove`: (`id`) => `void`; \}

#### log.add

(`input`) => `void`

#### log.clearAll

() => `void`

#### log.copyText

(`text`) => `Promise`\<`void`\> = `deps.copyText`

#### log.entries

`Ref`\<`object`[], [`LogEntry`](../../../domain/result-log/interfaces/LogEntry.md)[] \| `object`[]\>

#### log.exportCsv

() => `void`

#### log.remove

(`id`) => `void`

#### monitor

\{ `debugText`: `Ref`\<`string`, `string`\>; `start`: () => `void`; `stateColor`: `Ref`\<`string`, `string`\>; `stateText`: `Ref`\<`string`, `string`\>; `stop`: () => `void`; \}

#### monitor.debugText

`Ref`\<`string`, `string`\>

#### monitor.start

() => `void`

#### monitor.stateColor

`Ref`\<`string`, `string`\>

#### monitor.stateText

`Ref`\<`string`, `string`\>

#### monitor.stop

() => `void`

#### ndl

\{ `clear`: () => `Promise`\<`void`\>; `importFiles`: (`files`) => `Promise`\<`void`\>; `reload`: () => `Promise`\<`void`\>; `status`: `Ref`\<`string`, `string`\>; \}

#### ndl.clear

() => `Promise`\<`void`\>

#### ndl.importFiles

(`files`) => `Promise`\<`void`\>

#### ndl.reload

() => `Promise`\<`void`\>

#### ndl.status

`Ref`\<`string`, `string`\>

#### progress

`Ref`\<`string`, `string`\>

#### regions

\{ `addDetect`: (`rect`, `saved?`) => [`DetectView`](../../useRegions/type-aliases/DetectView.md); `addOcr`: (`rect`, `saved?`) => [`OcrView`](../../useRegions/type-aliases/OcrView.md); `allItems`: () => [`RegionView`](../../useRegions/type-aliases/RegionView.md)[]; `applySnapshot`: (`snap`) => `void`; `canAddOcr`: () => `boolean`; `clear`: () => `void`; `detectRegions`: `Ref`\<[`DetectView`](../../useRegions/type-aliases/DetectView.md)[], [`DetectView`](../../useRegions/type-aliases/DetectView.md)[]\>; `nextDetectId`: `Ref`\<`number`, `number`\>; `nextId`: `Ref`\<`number`, `number`\>; `ocrRegions`: `Ref`\<[`OcrView`](../../useRegions/type-aliases/OcrView.md)[], [`OcrView`](../../useRegions/type-aliases/OcrView.md)[]\>; `removeDetect`: (`reg`) => `void`; `removeOcr`: (`reg`) => `void`; `report`: (`item`, `verdict`) => `void`; `resetItem`: (`item`, `silent`) => `void`; `setStatus`: (`item`, `message`) => `void`; `snapshot`: (`name`) => [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md); \}

#### regions.addDetect

(`rect`, `saved?`) => [`DetectView`](../../useRegions/type-aliases/DetectView.md)

#### regions.addOcr

(`rect`, `saved?`) => [`OcrView`](../../useRegions/type-aliases/OcrView.md)

#### regions.allItems

() => [`RegionView`](../../useRegions/type-aliases/RegionView.md)[]

#### regions.applySnapshot

(`snap`) => `void`

#### regions.canAddOcr

() => `boolean` = `...`

#### regions.clear

() => `void`

#### regions.detectRegions

`Ref`\<[`DetectView`](../../useRegions/type-aliases/DetectView.md)[], [`DetectView`](../../useRegions/type-aliases/DetectView.md)[]\>

#### regions.nextDetectId

`Ref`\<`number`, `number`\>

#### regions.nextId

`Ref`\<`number`, `number`\>

#### regions.ocrRegions

`Ref`\<[`OcrView`](../../useRegions/type-aliases/OcrView.md)[], [`OcrView`](../../useRegions/type-aliases/OcrView.md)[]\>

#### regions.removeDetect

(`reg`) => `void`

#### regions.removeOcr

(`reg`) => `void`

#### regions.report

(`item`, `verdict`) => `void`

#### regions.resetItem

(`item`, `silent`) => `void`

#### regions.setStatus

(`item`, `message`) => `void`

#### regions.snapshot

(`name`) => [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)

#### regionSets

\{ `exportJson`: () => `void`; `importFile`: (`file`) => `Promise`\<`void`\>; `load`: () => `void`; `newName`: `Ref`\<`string`, `string`\>; `options`: `ComputedRef`\<`object`[]\>; `refresh`: (`select?`) => `void`; `remove`: () => `void`; `save`: () => `void`; `selected`: `Ref`\<`string`, `string`\>; `sets`: `Ref`\<`Record`\<`string`, [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)\>, `Record`\<`string`, [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)\>\>; \}

#### regionSets.exportJson

() => `void`

#### regionSets.importFile

(`file`) => `Promise`\<`void`\>

#### regionSets.load

() => `void`

#### regionSets.newName

`Ref`\<`string`, `string`\>

#### regionSets.options

`ComputedRef`\<`object`[]\>

#### regionSets.refresh

(`select?`) => `void`

#### regionSets.remove

() => `void`

#### regionSets.save

() => `void`

#### regionSets.selected

`Ref`\<`string`, `string`\>

#### regionSets.sets

`Ref`\<`Record`\<`string`, [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)\>, `Record`\<`string`, [`RegionSnapshot`](../../../domain/region/interfaces/RegionSnapshot.md)\>\>

#### settings

\{ `save`: () => `void`; \}

#### settings.save

() => `void`

#### viewport

\{ `beginPan`: (`event`) => `boolean`; `changeZoom`: (`deltaY`) => `void`; `endPan`: () => `boolean`; `movePan`: (`event`) => `boolean`; `onWheel`: (`event`) => `void`; `panReady`: `ComputedRef`\<`boolean`\>; `refresh`: () => `void`; `setZoom`: (`zoom`) => `void`; `stageStyle`: `ComputedRef`\<\{ `--capture-pan-x`: `string`; `--capture-pan-y`: `string`; `--capture-zoom`: `number`; \}\>; `toContentPoint`: (`clientX`, `clientY`) => `object`; `view`: \{ `panning`: `boolean`; `panX`: `number`; `panY`: `number`; `zoom`: `number`; \}; `zoomLabel`: `ComputedRef`\<`string`\>; \}

#### viewport.beginPan

(`event`) => `boolean`

#### viewport.changeZoom

(`deltaY`) => `void`

#### viewport.endPan

() => `boolean`

#### viewport.movePan

(`event`) => `boolean`

#### viewport.onWheel

(`event`) => `void`

#### viewport.panReady

`ComputedRef`\<`boolean`\>

#### viewport.refresh

() => `void`

#### viewport.setZoom

(`zoom`) => `void`

#### viewport.stageStyle

`ComputedRef`\<\{ `--capture-pan-x`: `string`; `--capture-pan-y`: `string`; `--capture-zoom`: `number`; \}\>

#### viewport.toContentPoint

(`clientX`, `clientY`) => `object`

#### viewport.view

\{ `panning`: `boolean`; `panX`: `number`; `panY`: `number`; `zoom`: `number`; \}

#### viewport.view.panning

`boolean` = `false`

#### viewport.view.panX

`number` = `0`

#### viewport.view.panY

`number` = `0`

#### viewport.view.zoom

`number` = `1`

#### viewport.zoomLabel

`ComputedRef`\<`string`\>

## Returns

`void`
