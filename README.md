# LiveFeedOCR
A browser-based OCR tool that extracts text in real-time from selected regions of video capture feeds.
ビデオキャプチャの映像から指定領域の文字をリアルタイムに読み取るブラウザベースのOCRツール。

## 起動

Node.js 20.19以降を用意し、リポジトリのルートで `npm install` の後 `npm run dev` を実行してください。カメラ利用にはHTTPSまたはlocalhostが必要です。配布用ファイルは `npm run build` で `dist/` に生成されます。

## OCRエンジン

OCR範囲ごとにTesseract.js、NDLOCR-Lite、PaddleOCR.jsを選べます。PaddleOCR.jsは日本語向けPP-OCRv5をブラウザー内で推論し、初回利用時にモデルとランタイムがダウンロードされます。映像画像はOCRサービスへ送信しません。処理性能・ダウンロード量は端末とネットワークに依存します。

PaddleOCR.js SDKはApache-2.0で公開されています。依存パッケージ、モデル、ランタイムを再配布する場合はそれぞれのライセンスと配布条件を確認してください。YomiToku Studioはブラウザー内OCR機能がありますが、再利用可能な公式ブラウザーSDKは確認できていないため、このアプリのエンジンとしては未対応です。

## 開発とテスト

- `npm test` — 自動テスト
- `npm run build` — 本番ビルド
