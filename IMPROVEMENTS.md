# 改善・機能追加 手順書

優先度順に並べています。完了したら `[x]` に変えてください。

---

## 優先度1：バグ修正（今すぐ）

### 1-A. A3/B5用紙サイズのスケーリング修正

**問題**
`index.html` の `createNupPdfBytes` 内でスケール計算が面付けセルのサイズを基準にしていないため、A3横長などを選択してもページが小さいまま余白が多い状態になる。

**調査箇所**
- `index.html` 内 `createNupPdfBytes` 関数（約1380行付近）
- `scale` の計算式
- `drawPage` に渡す `width` / `height`

**修正手順**
1. `createNupPdfBytes` で出力用紙の実際のサイズ（`paperW`, `paperH`）を取得している箇所を確認する
2. 各セルの幅・高さ（`cellW = paperW / cols`, `cellH = paperH / rows`）を計算する
3. `scale` を「セルに収まる最大倍率」として算出する
   ```
   scaleX = cellW / srcWidth
   scaleY = cellH / srcHeight
   scale  = Math.min(scaleX, scaleY)
   ```
4. `drawPage` に渡す `width` / `height` を `srcWidth * scale` / `srcHeight * scale` に修正する
5. プレビューと実際のPDF出力が一致することを確認する

**確認方法**
- A4 PDF を A3 横長 2×1 で出力し、各ページが用紙幅いっぱいに広がることを目視確認

---

### 1-B. HEIC WASM初期化の先行ロード

**問題**
`heic.html` は初回変換時に libheif-js を遅延ロードしており、最初の変換だけ2〜3秒のラグが発生する。

**修正手順**
1. `heic.html` の `<script>` 内で、現在 `convertFiles()` の中で初めて呼び出している初期化処理（`createLibheif()` 相当）を特定する
2. その初期化処理を `DOMContentLoaded` イベント内（または最下部の script 内）に移動し、ページロード直後にバックグラウンドで走らせる
   ```js
   // ページロード後すぐに初期化を開始
   let libheifReady = null;
   document.addEventListener('DOMContentLoaded', () => {
     libheifReady = createLibheif(); // Promiseを保持しておく
   });
   ```
3. `convertFiles()` 内では `await libheifReady` で待つだけにする（すでに完了していればほぼ0ms）

**確認方法**
- ページを開いて数秒後にHEICファイルをドロップし、変換がすぐ始まることを確認
- ネットワークタブで libheif-js の WASM ロードがページロード時に発生していることを確認

---

## 優先度2：UX改善（近い内）

### 2-A. Web Worker 化（大PDFでのUIフリーズ防止）

**問題**
50MB超のPDFを処理するとメインスレッドがブロックされ、プログレスバーが止まって見える。

**対象ファイル**
主に `index.html`（N-up）。余裕があれば `merge.html` も対象。

**修正手順**
1. `index.html` の `createNupPdfBytes` 関数のロジックを `nup-worker.js` として切り出す
2. Worker 内で `pdf-lib` を importScripts でロードする（CDNのESMビルドが必要か確認）
3. メインスレッドは `postMessage` でページデータを渡し、Worker から進捗 (`{type:'progress', pct:50}`) と完了 (`{type:'done', bytes:...}`) を受け取る
4. 進捗メッセージを受け取るたびにプログレスバーを更新する

**注意**
- pdf-lib は CDN のバージョンが Worker 内で使えるか事前に確認する
- 使えない場合は `pdf-lib` のファイルをローカルに置いてから `importScripts('./pdf-lib.min.js')` で読み込む

**確認方法**
- 100ページ超のPDFで N-up 処理中もプログレスバーが動き続けることを確認

---

### 2-B. モバイルナビゲーションの改善

**問題**
ツールが7本あり、スマートフォン（375px幅）でナビボタンが2〜3行に折り返してしまう。

**修正手順**
1. 全7ファイルの共通ナビ部分を確認する（`<nav>` タグ周辺）
2. デスクトップ（md以上）はそのまま横並び、スマートフォンはハンバーガーボタン＋ドロワーに変更する
   ```html
   <!-- ハンバーガーボタン（md未満で表示） -->
   <button id="menu-btn" class="md:hidden ...">☰</button>
   <!-- ドロワー（md未満で初期非表示） -->
   <div id="drawer" class="hidden md:flex ...">
     <!-- 既存のリンク群 -->
   </div>
   ```
3. JavaScript で `menu-btn` クリック時に `drawer` の `hidden` をトグルする
4. **7ファイル全て**に同じ変更を適用する（後述の2-Cを先に実施すると1箇所の修正で済む）

**確認方法**
- Chrome DevTools のモバイルエミュレーター（iPhone SE / 375px）で全ページのナビを確認

---

### 2-C. ヘッダー・ナビの重複排除

**問題**
7つのHTMLファイルに同一のナビゲーションHTMLと Tailwind 設定がコピーされており、変更時に全ファイルを修正する必要がある。

**方針**
ビルドツールを導入せず、軽量な fetch インクルード方式を採用する。

**修正手順**
1. 共通ナビ部分を `_nav.html` として切り出す
   ```html
   <!-- _nav.html -->
   <nav class="...">
     <a href="index.html">N-up</a>
     <a href="merge.html">結合</a>
     ...
   </nav>
   ```
2. `utils.js` にナビをロードして挿入する関数を追加する
   ```js
   async function loadNav() {
     const res = await fetch('./_nav.html');
     const html = await res.text();
     document.getElementById('nav-placeholder').innerHTML = html;
   }
   ```
3. 各HTMLの `<nav>` 部分を `<div id="nav-placeholder"></div>` に置き換える
4. 各ページの script 内で `loadNav()` を呼び出す

**注意**
- `file://` プロトコルでは fetch が失敗するが、ローカルサーバー（`python -m http.server` など）や本番ホスティングでは問題なし
- 現在 `file://` 直接開きで使っている場合は採用を見送り、全ファイル一括置換スクリプト方式に切り替える

---

### 2-D. img2pdf の HEIC 処理を libheif-js に統一

**問題**
`img2pdf.html` だけ非推奨の `heic2any` を使っており、iPhone 12以降の10-bit HEIC が正しく変換できない場合がある。

**修正手順**
1. `heic.html` で実装済みの libheif-js を使った HEIC デコード処理を関数として確認する
2. `img2pdf.html` の `heic2any` を呼び出している箇所を特定する
3. libheif-js の CDN URL を `img2pdf.html` の `<head>` に追加する
4. `heic2any` の呼び出しを libheif-js ベースの処理に置き換える（`heic.html` からコピーして調整）
5. `heic2any` の `<script>` タグを削除する

**確認方法**
- iPhone 14以降で撮影した HEIC ファイルを img2pdf に読み込み、正常に変換・PDF化されることを確認

---

## 優先度3：新機能（次フェーズ）

### 3-A. ページ編集ツール（新規ファイル: `pageedit.html`）

**概要**
PDFを読み込んでページのサムネイルを一覧表示し、削除・並べ替え・回転ができるツール。

**使用ライブラリ**
- PDF.js（サムネイルレンダリング）
- pdf-lib（ページ操作・出力）

**実装手順**
1. `pageedit.html` を新規作成し、他ツールと同じヘッダー・スタイルを適用する
2. ファイル読み込み → PDF.js で全ページをサムネイル（canvas）として描画する
3. 各サムネイルにチェックボックス・回転ボタン（←90°/→90°）を付ける
4. サムネイル間のドラッグ＆ドロップで並べ替えを実装する（SortableJS CDN が便利）
5. 「削除」ボタンでチェック済みページを除去する
6. 「保存」ボタンで pdf-lib を使い、現在の順序・回転情報を反映したPDFを出力する
7. ナビゲーションに「ページ編集」リンクを追加する

**UI イメージ**
```
[ファイル読込] → サムネイルグリッド → [削除] [回転] → [PDFを保存]
```

**注意**
- サムネイル描画は非同期で1ページずつ順次行い、全ページ完了を待たずに表示を始める
- 大量ページ（200p超）の場合は仮想スクロールを検討（最初は省略可）

---

### 3-B. PDF to Image（新規ファイル: `pdf2img.html`）

**概要**
PDFの各ページをJPG/PNG画像として書き出し、ZIPでまとめてダウンロードする。

**使用ライブラリ**
- PDF.js（レンダリング）
- JSZip（ZIP生成、CDN追加が必要）

**実装手順**
1. `pdf2img.html` を新規作成する
2. 解像度スライダーを用意する（72 / 150 / 300 dpi 相当のスケール係数：1x / 2x / 4x）
3. 出力フォーマット選択（PNG / JPEG＋品質スライダー）を追加する
4. PDF.js でページを canvas にレンダリングし、`canvas.toDataURL()` で画像データを取得する
5. 1ページずつ処理してプログレスバーを更新する
6. JSZip で全画像を `page_001.jpg` のような名前でまとめ、`output.zip` としてダウンロードさせる
7. 単ページPDFの場合はZIPではなく直接画像をダウンロードする

**確認方法**
- 10ページのPDFを150dpi/JPEGで変換し、全ページが正しく出力されることを確認

---

### 3-C. ページ番号・透かし追加（新規ファイル: `stamp.html`）

**概要**
PDFの各ページにページ番号やテキスト透かしを追加する。

**使用ライブラリ**
- pdf-lib

**実装手順（ページ番号）**
1. `stamp.html` を新規作成し、タブUIで「ページ番号」と「透かし」を切り替える構成にする
2. 設定項目：位置（ヘッダー左/中央/右・フッター左/中央/右）、フォントサイズ、開始番号、余白
3. pdf-lib の `StandardFonts.Helvetica` を使ってテキストを描画する
4. `page.drawText(`${startNum + i}`, { x, y, size, color })` で各ページに番号を追記する

**実装手順（透かし）**
1. 設定項目：テキスト内容、フォントサイズ、不透明度（0.1〜0.5）、回転角度（デフォルト45°）
2. 各ページの中央に `page.drawText(text, { x, y, size, opacity, rotate })` で描画する

**確認方法**
- 5ページのPDFにページ番号を追加し、プレビューで位置と番号が正しいことを確認

---

### 3-D. クリップボード貼り付け対応

**対象ファイル**
`img2pdf.html`、`heic.html`

**実装手順**
1. 各ファイルのドロップゾーンに `paste` イベントリスナーを追加する
   ```js
   document.addEventListener('paste', (e) => {
     const items = e.clipboardData.items;
     const files = [];
     for (const item of items) {
       if (item.kind === 'file') files.push(item.getAsFile());
     }
     if (files.length > 0) handleFiles(files);
   });
   ```
2. ドロップゾーンの説明文に「Ctrl+V で貼り付けも可」を追記する（i18n対応）

**確認方法**
- スクリーンショットをコピー後、img2pdf でCtrl+Vを押して画像が追加されることを確認

---

### 3-E. 分割後ファイルの命名ルール設定

**対象ファイル**
`split.html`

**実装手順**
1. 詳細設定セクションに「ファイル名プレフィックス」入力欄を追加する
2. 「連番フォーマット」を選択できるようにする（`001`形式 / `1`形式）
3. 例えばプレフィックス `請求書_`、フォーマット `001` なら `請求書_001.pdf` になる
4. 現在の `output_p${pageNum}.pdf` 生成箇所をプレフィックス設定に応じて変更する
5. ページ範囲モードの場合は `請求書_p3-5.pdf` のような名前にする

---

### 3-F. PWA対応（オフライン化・インストール可能）

**実装手順**
1. `manifest.json` を作成する
   ```json
   {
     "name": "PDF Web Tools",
     "short_name": "PDF Tools",
     "start_url": "/index.html",
     "display": "standalone",
     "background_color": "#0f172a",
     "theme_color": "#6366f1",
     "icons": [{"src": "favicon.png", "sizes": "512x512", "type": "image/png"}]
   }
   ```
2. 各HTMLの `<head>` に `<link rel="manifest" href="/manifest.json">` を追加する
3. `sw.js`（Service Worker）を作成し、全HTMLと `utils.js`、`translations.js` をキャッシュする
   ```js
   const CACHE = 'pdf-tools-v1';
   const ASSETS = ['/', '/index.html', '/merge.html', ...];
   self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
   self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
   ```
4. `index.html` で Service Worker を登録する
   ```js
   if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
   ```

**注意**
- `file://` では動作しない（ローカルサーバーかHTTPSホスティングが必要）
- CDN読み込みのライブラリはキャッシュできないため、ローカルに落とすか CDN をキャッシュリストから除外する

---

## 進捗チェックリスト

| # | 項目 | ステータス |
|---|------|-----------|
| 1-A | A3/B5スケール修正 | `[ ]` 未着手 |
| 1-B | HEIC先行ロード | `[ ]` 未着手 |
| 2-A | Web Worker化 | `[ ]` 未着手 |
| 2-B | モバイルナビ改善 | `[ ]` 未着手 |
| 2-C | ナビ重複排除 | `[ ]` 未着手 |
| 2-D | img2pdf HEIC統一 | `[ ]` 未着手 |
| 3-A | ページ編集ツール | `[ ]` 未着手 |
| 3-B | PDF to Image | `[ ]` 未着手 |
| 3-C | ページ番号・透かし | `[ ]` 未着手 |
| 3-D | クリップボード対応 | `[ ]` 未着手 |
| 3-E | 分割ファイル命名 | `[ ]` 未着手 |
| 3-F | PWA対応 | `[ ]` 未着手 |
