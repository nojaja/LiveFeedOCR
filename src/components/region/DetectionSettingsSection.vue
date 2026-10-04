<script setup lang="ts">
import type { Detection } from '../../domain/region.ts';
import AccordionSection from '../ui/AccordionSection.vue';
import RangeField from '../ui/RangeField.vue';

defineProps<{ det: Detection; isDetect: boolean }>();
defineEmits<{ captureReference: [] }>();
</script>

<template>
  <AccordionSection title="変化検知の設定">
    <label><input v-model="det.auto" type="checkbox"> {{ isDetect ? '条件を満たしたら【すべてのOCR範囲】を自動で読み取る' : '変化があったら自動で読み取る' }}</label>
    <label>判定モード
      <select v-model="det.mode">
        <option value="diff">通常の変化検知</option>
        <option value="accum">{{ isDetect ? 'ビット加算/減算の結果画像で判定' : 'ビット加算/減算の結果画像で判定（結果画像をOCRにも使用）' }}</option>
        <option v-if="isDetect" value="ref">リファレンス画像との一致率で判定</option>
      </select>
    </label>

    <div v-show="det.mode === 'accum'">
      <p class="note note--small note--compact">
        直近Nフレーム（判定fpsで取得した画像）を2値化して重ね合わせます。背景など変化の激しい部分は白に、動かない文字は黒のまま残る想定です。{{ isDetect ? '' : '二値化には画像前処理の「二値化しきい値」を使い、重ねた結果画像がプレビュー・変化判定・OCRに使われます。' }}
      </p>
      <RangeField v-model="det.accumN" :min="2" :max="30" :step="1">
        <template #prefix>対象フレーム数:</template>
        <template #suffix> frame</template>
      </RangeField>
      <label>重ね方
        <select v-model="det.accumMode">
          <option value="or">加算（1枚でも白なら白：暗い文字向け）</option>
          <option value="and">減算（全フレームで白のときだけ白：明るい文字向け）</option>
        </select>
      </label>
      <RangeField v-if="isDetect" v-model="det.accumThr" :min="0" :max="255" :step="1">
        <template #prefix>2値化しきい値（加算・減算用）:</template>
      </RangeField>
    </div>

    <div v-if="isDetect" v-show="det.mode === 'ref'">
      <p class="note note--small note--compact">基準にしたい画面が映った状態で「現在の画像をリファレンスにする」を押してください。この範囲の画像とリファレンス画像の一致率で判定します。</p>
      <button type="button" class="sub ref-capture-btn button-gap-bottom" @click="$emit('captureReference')">現在の画像をリファレンスにする</button>
      <img v-if="det.refImage" class="ref-img" alt="リファレンス画像" :src="det.refImage">
      <div v-else class="ref-none note note--small note--danger">リファレンス画像が未設定です</div>
      <RangeField v-model="det.refMatch" :min="1" :max="100" :step="1">
        <template #prefix>一致率しきい値:</template>
        <template #suffix> %</template>
      </RangeField>
      <label>トリガの条件
        <select v-model="det.refTrigger">
          <option value="above">一致率がしきい値以上になったら（その画面が表示されたら）</option>
          <option value="below">一致率がしきい値未満になったら（その画面が消えたら）</option>
        </select>
      </label>
    </div>

    <RangeField v-show="det.mode === 'diff' || det.mode === 'accum'" v-model="det.thr" :min="0.2" :max="30" :step="0.2" :decimals="1">
      <template #prefix>変化量しきい値:</template>
      <template #suffix> %（画素の何%が変わったら読み取るか）</template>
    </RangeField>
    <RangeField v-model="det.pix" :min="5" :max="120" :step="1">
      <template #prefix>画素の差しきい値:</template>
      <template #suffix>（0〜255。{{ isDetect ? '変化検知範囲のグレースケール画像' : 'この範囲の切り取りプレビュー画像' }}に対して適用。小さいほど敏感・ノイズに弱い）</template>
    </RangeField>
    <RangeField v-model="det.stable" :min="0" :max="3000" :step="10">
      <template #prefix>安定待ち時間:</template>
      <template #suffix> ms（条件を満たしてから読み取るまでの待ち。0で即時）</template>
    </RangeField>
  </AccordionSection>
</template>
