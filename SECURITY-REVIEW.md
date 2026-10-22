# セキュリティ修正・検証記録（2026-10-22）

対象: Factbact/pdf9F。比較元: `da6460d5626616645c4a446e80bb6670edcaba74`。
作業ブランチ: `security/pdf-processing-hardening`。mainへのマージ・本番デプロイは実施していません。

## 発見事項と対処

| 優先度 | 問題・リスク | 対処 |
|---|---|---|
| P0 | PDF.js 3.11.174のCVE-2024-4367。細工されたPDFのフォント処理からJavaScriptが実行され得る | 6.4.299のES Modulesへ移行。本体とWorkerを同じnpmパッケージから配備。アプリ内の全5か所のgetDocumentと共通ラッパーで`isEvalSupported: false`。分割ページの未使用読み込みを削除 |
| P1 | ファイル名・相対パス・HEIC変換エラーのHTML/属性への直接挿入 | 静的テンプレートにDOM APIで属性を設定し、文字列はtextContentで挿入。outlineの既存エスケープは維持。翻訳のHTML使用は固定の見出し6キーに限定 |
| P2 | CDNの実行コード、バージョン未固定のTailwind、古いHEICデコーダーへの依存 | JS・Worker・WASM・フォントをvendorに固定。CSSをビルド。同一オリジン以外の実行・通信を許可しないCSP。heic2anyを削除し共通HEIC Workerへ統一 |
| P2 | Tailwind 3のビルド依存にbracesのスタック枯渇、PostCSS selector parserのCPU枯渇の監査指摘 | Tailwind 4.3.3/PostCSS 8.5.31へ更新。従来の色データ・ダークモード選択状態を維持。最終npm auditは0件 |
| P3 | 無制限の入力・描画、循環するしおり、Worker・Object URLの解放漏れ | 入出力上限、しおりの訪問済み検査・階層制限、PDFタスク破棄、HEIC Worker終了、画像/Canvas/URL解放を追加 |
| P3 | 暗号化を無視したpdf-libの読み込み、分割のtry外の失敗 | 暗号化PDFを拒否。読み込みも例外処理内へ移動。変換失敗後の操作復帰を検証 |

CVEの根拠: [Mozillaのアドバイザリ](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq)。
ビルド依存の根拠: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)、[PostCSS selector parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)。
上記はセキュリティ修正です。スクリプトの外出しはCSP対応、CSSの配色互換設定は移行に伴う表示維持のためです。一般的なコード整理を独立した改善としては含めていません。

## 外部依存の全体像

| 用途 | 修正前 | 修正後・配信 |
|---|---|---|
| PDF.js本体/Worker | cdnjs 3.11.174 | 6.4.299 / vendor/pdfjs、CMap・標準フォント・WASM・ICCを同梱 |
| pdf-lib | unpkg/jsDelivr 1.17.1 | 1.17.1維持 / vendor/pdf-lib |
| HEIC変換 | jsDelivr libheif-js 1.19.8 | libheif-js 1.23.5、内部libheifも1.23.5を実行時照会で確認 / vendor/libheif |
| 画像→PDFのHEIC | jsDelivr heic2any 0.0.4 | 削除。上記と同じデコーダー |
| Tailwind | cdn.tailwindcss.com、版未固定 | 4.3.3をビルド時のみ使用。assets/*.cssを配信 |
| フォント | Google Fonts CSS / fonts.gstatic.com | Outfit・Plus Jakarta SansをOFLとともにvendor/fontsへ固定。ファイル版はSHA-256で識別 |
| 開発・検証 | なし | @tailwindcss/postcss 4.3.3、postcss 8.5.31、@playwright/test 1.64.1 |

正確な推移的依存と取得integrityはpackage-lock.json、配備ファイルのSHA-256はvendor-manifest.jsonに記録しています。再配布ライセンスも同梱しています。npmパッケージからコピーする`npm run build`はネットワーク不要です。フォントの明示的な更新のみ`scripts/fetch-fonts.cjs`を使用します。

実行時CDNを全廃したため、CDN向けSRI/crossoriginは不要になりました。配布物はmanifest回帰テストで照合します。ホスティング元自体の侵害を防ぐ仕組みではありません。

## 操作・互換性の変更

- 入力: 50ファイル、各50 MiB、合計200 MiB。PDFは各500ページ、結合結果も500ページまで。
- 出力: 保持する分割・圧縮・HEIC結果は合計200 MiB。単一PDF出力も200 MiB。面付けの複数ダウンロードは逐次処理のため各出力に適用。
- 画像/描画: 32,000,000ピクセル、各辺16,384pxまで。しおり: 最大5,000項目、32階層、循環は拒否。フォルダー走査も32階層まで。
- PDF.js読み込みと各HEIC Workerは30秒で打ち切り。HEICは従来同様に先頭画像を変換し、PNG/JPEG/WebPの選択を維持。
- 暗号化PDFはパスワード入力機能を設けず、安全に拒否します。従来のignoreEncryptionによる不完全な出力を避けます。
- 画像→PDFはPNG/JPEG/GIF/WebP/BMPおよびHEIC/HEIFをデコード後PNGへ正規化。SVGなどは対象外。GIF等は先頭フレームの静止画像として扱います。
- ES Modules・WASM・OffscreenCanvas・createImageBitmapに対応した現行ブラウザが必要です。ローカルではHTTPサーバーを使い、GitHub Pagesでは従来の7つのHTML URLを維持します。

## テストと結果

使用データは合成PDF、合成画像、およびSHA-256を固定した[libheif公開HEICサンプル](https://github.com/strukturag/libheif/blob/master/examples/example.heic)のみです。暗号化フィクスチャは合成PDFをテスト用パスワードで暗号化したものです。個人のファイルは使用していません。

| 検証 | 結果 |
|---|---|
| 比較元の通常7機能 | 7/7成功 |
| 修正後Chrome: ブラウザ回帰・静的セキュリティ検査 | 38/38成功 |
| 修正後Edge | 35/35成功（追加3形式テスト前の同等実装） |
| 面付け/結合/分割/圧縮/画像→PDF/しおり整列 | 出力PDFを再読込し、ページ数1/8/1/4/1/4を確認。しおりの自然順ソートを検証 |
| 特殊文字 | `<img ... onerror=...>`、引用符、&を含むファイル名/しおりが文字列として表示され、イベント属性ノード・コード実行がないことを確認 |
| 破損ファイル | 7機能で未処理のブラウザ例外なし。エラー表示/結果表示と操作復帰を検証 |
| 暗号化PDF | PDFを扱う5機能で拒否。修正前後の診断をtests/compare-errors.cjsで記録 |
| 上限 | 実51 MiBファイル、51ファイル、合計容量、501ページ、巨大PDFページ、画像ピクセル制限を検証 |
| 資源解放 | PDFロードタスクの破棄、HEIC Worker終了、HEIC結果URLのclear時解放を確認 |
| 通信/コンソール | ページとWorkerのリクエストを監視。通常7機能で外部リクエスト0、POST/送信bodyなし、未処理例外・CSP違反なし。Edgeの内部ダウンロードUIはサイト通信から除外 |
| 日英・テーマ・見た目 | 各ページの日英切替、ダーク切替、スクリーンショットを確認。旧配色とチェック状態を維持 |
| GitHub Pages相当 | ローカルHTTPの`/pdf9F/`下でJS/Worker/フォント/WASMの相対パスを検証。本番デプロイは未実施 |
| npm audit | 開発依存を含め0件 |

再現: READMEの手順で`npm test`。テストごとのコンソール/通信記録とスクリーンショットは無視対象の`test-results/`に生成します。ベースライン比較には比較元コミットのHTML、utils.js、translations.js、favicon.pngを`.tmp/baseline/`へ展開し、`BASELINE=1`でブラウザテストを実行します。修正前のCDN通信はその比較時にのみ発生します。

## 主な修正箇所（新しいファイルの行番号）

インラインコードを外出ししたため、指定された旧HTML行は下記モジュールへ移っています。

| 修正対象 | 新しい箇所 |
|---|---|
| 全7 HTMLのCSP・読み込み | 各HTML:6、index.html:577 / split.html:226 |
| PDF.jsバージョン、Worker、eval禁止、資源管理 | assets/pdf-runtime.mjs:1 |
| index.html旧887/1502 | assets/index.mjs:265 / :898 |
| merge.html旧651 | assets/merge.mjs:178 |
| split.html旧441 | assets/split.mjs:185 |
| compress.html旧371/528 | assets/compress.mjs:82 / :246 |
| heic.html旧531/648/661 | assets/heic.mjs:143 / :226 / :242 |
| img2pdf.html旧519 | assets/img2pdf.mjs:129 |
| outlineの循環・過深階層対策 | assets/outline.mjs:98 |
| 共通上限・安全なPDF読み込み | utils.js:3 / :35 |
| HEIC Workerと終了処理 | assets/heic-worker.mjs:1 / assets/heic-client.mjs:1 |
| CSS/vendorビルドとハッシュ一覧 | scripts/build.cjs:1 / vendor-manifest.json:1 |
| 回帰テスト | tests/browser.test.cjs:1 / tests/security.test.cjs:1 |

## 残存リスク・未検証

- pdf-libの解析・保存はUIスレッド上です。圧縮率の高い悪意ある入力、巨大なオブジェクト構造、画像デコードの内部割当では上限確認より前に負荷がかかり得ます。入力サイズ制限はメモリ使用量の厳密な上限ではなく、完全なDoS防止ではありません。pdf-lib処理全体のWorker化とキャンセルは未実装です。
- PDF.jsの30秒制限は読み込みまでで、全描画時間の制限ではありません。ブラウザやWASMの未知の脆弱性も排除できません。npm auditはネイティブ/WASMの全依存の完全な監査ではありません。
- Safari/Firefox、iOS/Android、実機の10bit HEIC、巨大な実業務PDFや全種類のフォント/画像符号化の網羅テストは未実施です。
- PDFのアクション・リンクを除去する無害化ツールではありません。しおりの既存Action保持など、従来の編集仕様を維持しています。
- GitHub Pagesのmeta CSPではframe-ancestorsを設定できません。クリックジャッキング対策には配信側HTTPヘッダーが必要です。style-srcのunsafe-inlineは既存デザインと動的スタイルのため残しています。script-srcにはunsafe-inline/unsafe-evalを許可せず、WASMのためwasm-unsafe-evalのみ許可します。
- 正常7機能は修正前後で比較済みですが、悪意ある入力・OOM・全ブラウザの完全な組み合わせ試験を意味しません。利用者のファイル内容や新しい個人情報を保存・送信する処理は追加していません。既存のテーマ・言語設定のみlocalStorageを使用します。
