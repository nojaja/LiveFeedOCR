<script setup lang="ts">
import { createWorkspace, provideWorkspace } from './composables/useWorkspace.ts';
import CaptureView from './components/CaptureView.vue';
import CommonSettingsPanel from './components/CommonSettingsPanel.vue';
import DetectRegionCard from './components/DetectRegionCard.vue';
import DrawModePanel from './components/DrawModePanel.vue';
import NdlModelPanel from './components/NdlModelPanel.vue';
import OcrLogPanel from './components/OcrLogPanel.vue';
import OcrRegionCard from './components/OcrRegionCard.vue';
import RegionSetPanel from './components/RegionSetPanel.vue';
import StatusFooter from './components/StatusFooter.vue';

const workspace = createWorkspace();
provideWorkspace(workspace);
const { regions } = workspace;
</script>

<template>
  <main>
    <h2>LiveFeedOCR 画面キャプチャ＆画像フィルタOCR（変化検知つき）</h2>
    <p>
      映像上でドラッグして範囲を指定します。<b>OCR範囲</b> は複数描けて、読み取り方式（OCR／QRコード）・画像前処理・変化検知の設定を範囲ごとに持てます。
      <b>変化検知範囲</b>は複数指定でき、すべての条件が成立したとき（AND）にすべてのOCR範囲をまとめて読み取ります。
      範囲の組み合わせは「範囲セット」として保存・JSON入出力できます。
    </p>

    <div class="top-row">
      <CaptureView />
      <OcrLogPanel />
    </div>

    <div class="bottom-row">
      <div class="panel">
        <h3>範囲の指定</h3>
        <DrawModePanel />
        <RegionSetPanel />
        <CommonSettingsPanel />
        <NdlModelPanel />
        <StatusFooter />
      </div>

      <div id="region-cards">
        <OcrRegionCard v-for="region in regions.ocrRegions.value" :key="region.id" :region="region" />
        <DetectRegionCard v-for="region in regions.detectRegions.value" :key="region.id" :region="region" />
      </div>
    </div>
  </main>
</template>
