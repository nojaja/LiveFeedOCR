# 品質ベースライン初回監査（v0.0.11）

- 監査日: 2026-10-04
- 対象: リポジトリ全体（package.json、.github/workflows、tests、docs/spec、品質設定ファイル）
- 初回判定: 追加品質ゲート未整備のため未達。
- 最終判定: 必須QAコマンドはすべて終了コード0。Lintの警告・エラーともに0件。

## QAゲート導入後の再確認

| コマンド | 結果 | 備考 |
|---|---|---|
| `npm run test:ci` | 成功 | Node.jsテスト28件、Jest 7件成功。domain対象coverage: Statements 80.30%、Branches 69.41%、Functions 73.49%、Lines 84.46%。全体閾値50%を超過。 |
| `npm run type-check` | 成功 | `vue-tsc --noEmit`。 |
| `npm run depcruise` | 成功 | 56 modules / 154 dependencies、違反なし。 |
| `npm run cpd` | 成功 | 77ファイルを検査、clone 0件。 |
| `npm run docs` | 成功 | Markdownを `docs/typedoc-md/` に生成。TypeDoc直接実行時に未文書化型参照の警告2件。 |
| `npm run build` | 成功 | `dist/index.bundle.js`を生成。Vite警告（OpenCV外部化、巨大チャンク、outDir）は残存。 |
| `npm run lint` | 成功 | ESLint errors 0、warnings 0。ESLintルール設定を変更せず、未使用引数をすべて解消。 |

`docs/typedoc-md/`への生成を確認した。coverage計測対象は現在`src/domain/**/*.ts`のみであり、アプリケーション層・インフラ層までの網羅率は測定していない。ビルドではOpenCV外部化、巨大チャンク、outDirに関する既存警告が残る。GitHub Actions workflowへ7ゲートを追加したが、リモートCI実行はこの監査では確認していない。

依存再現性の確認ではローカルの`npm ci`が実行中esbuildのWindowsファイルロック（EPERM）で中断した。`npm install`で依存を復旧した後、全7ゲートを再実行して成功を確認した。クリーンなGitHub-hosted runner上のCI実行は未確認。

## 是正結果

- テスト基盤: 既存Node.jsテストを維持したうえでJest + ts-jestを追加し、`test:ci`でcoverageを強制する。
- モジュール形式: package rootはSkill指定のCommonJSとし、アプリソースとテストには個別のESM境界package.jsonを置く。Vite設定はCommonJSへ移行し、ビルド成功を確認。
- 静的解析・依存・重複検査・typedoc: 設定とスクリプトを追加し、各コマンド成功を確認。
- CI: Pagesデプロイworkflowでtype-check、depcruise、cpd、test:ci、lint、docs、buildを実行するよう設定。
- Lint: Cognitive Complexity違反を処理分割で解消し、全エラーを修正。未使用変数警告53件は設定指定どおりwarn扱い。
- Lint警告是正: 実行コードでは引数を処理内で明示的に使用し、契約型は引数名・型・戻り値を維持した署名別名で定義。既存の厳密な型契約を広げず、rest引数も導入していない。ESLint設定・severity・ignoreは変更していない。

## 初回監査結果（導入前の記録）

| 項目 | 状況 | 根拠・結果 |
|---|---|---|
| 自動テスト | 部分適合 | `npm test` は成功（28件）。実行系は Jest + ts-jest ではなく Node.js の `node --test --experimental-strip-types`。coverage 計測・50% 閾値はない。 |
| 型チェック | 部分適合 | `npm run typecheck`（`vue-tsc --noEmit`）は成功。Skill指定の `npm run type-check` スクリプト名は未定義。 |
| Lint | 未整備 | `lint` スクリプト、ESLint 設定・依存関係がない。 |
| dependency-cruiser | 未整備 | `depcruise` スクリプトと設定がない。既存ファイルに `|| exit 0` 等の失敗回避は見つからなかったが、検査自体は未実施。 |
| 重複コード検査 | 未整備 | `cpd` スクリプト、jscpd 依存関係がない。 |
| API ドキュメント | 未整備 | typedoc / typedoc-plugin-markdown、`docs` スクリプト、`docs/typedoc-md/` がない。 |
| 本番ビルド | 適合（警告あり） | `npm run build` 成功。Vite が OpenCV の `fs` / `path` / `crypto` 外部化、巨大チャンク、outDir がプロジェクトルート外であることを警告。 |
| バージョン付き仕様 | 適合 | `docs/spec/v0.0.11/vue-screen-migration.md` に受け入れ条件と設計判断を含む仕様が存在する。ほかに v0.0.9、v0.0.10 の仕様あり。 |
| Jest 設定分割 | 未整備 | Jest 設定ファイルおよび Jest 実行基盤がないため、分割状況は該当なし。 |
| CI の `test:ci` | 未整備 | `.github/workflows/gh-pages.yml` は `npm ci` 後に build のみ実行し、`test:ci` を定義・実行していない。 |

## 是正アクション

1. **実行基盤とモジュール形式を決定する。** 現状は Vue/Vite の ESM プロジェクト（`package.json` の `type: module`）であり、既存テストも Node.js test runner を利用している。埋め込み Skill の CommonJS 指定および Jest + ts-jest 必須化は現状と衝突する。ブラウザーアプリの ESM 前提と既存テストを維持するのか、CommonJS/Jest へ移行するのかを先に決める。決定前に `type` やテスト基盤を変更しない。
2. **合意したテスト基盤に coverage と `test:ci` を追加する。** CI から `npm run test:ci` を実行し、coverage 50% の閾値を失敗条件にする。テスト分割の要否も同時に決める。
3. **静的解析・依存検査を導入する。** Vue SFC 対応を含む ESLint flat config、SonarJS/JSDoc ルール、dependency-cruiser 設定とスクリプトを追加し、CI で失敗を伝播させる。併せて jscpd を指定の閾値で追加する。
4. **typedoc Markdown 生成を追加する。** 公開 API の対象範囲を定め、`docs/typedoc-md/` に生成する `docs` スクリプトと CI ゲートを追加する。
5. **CI を品質ゲートへ拡張する。** 既存の Pages デプロイ用 build に加え、テスト・型チェック・lint・depcruise・cpd・docs を検証する workflow を用意する。
6. **build 警告を個別に評価する。** OpenCV の Node 組み込みモジュール外部化がブラウザー実行に影響しないことを確認し、巨大チャンクは必要に応じて遅延ロード等を検討する。outDir 警告は既存の出力先意図を確認したうえで対処する。

## 受け入れ条件

- 合意したテストコマンドが CI 上で実行され、coverage 閾値を含めて成功する。
- 型チェック、lint、depcruise、cpd、build、docs の各ゲートが CI 上で成功する。
- dependency-cruiser / jscpd の失敗を握りつぶす設定がない。
- 公開 API の Markdown が `docs/typedoc-md/` に生成される。
- 本仕様の是正対象が完了した際は、本書に各ゲートの実行結果と残課題を追記する。

## 設計判断

- 初回監査では品質ツールを追加したり、アプリのモジュール形式・テスト基盤を一括変更したりせず、実態と不足項目を記録する。
- `type: module` は既存 Vite 設定（ESM import）と整合しているため、CommonJS 化は互換性・設定の影響を評価し、明示的な方針決定後に行う。
- 既存の仕様書に受け入れ条件と設計判断があるため、今回は新たな仕様ディレクトリを作らず v0.0.11 の監査記録として追加する。
