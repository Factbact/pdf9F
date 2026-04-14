// 多言語対応 (i18n) - 日本語/英語
const translations = {
    ja: {
        // ナビゲーション
        'nav.nup': '面付け',
        'nav.merge': '結合',
        'nav.split': 'PDF分割',
        'nav.compress': 'PDF圧縮',
        'nav.heic': 'HEIC変換',
        'nav.img2pdf': '画像→PDF',
        'nav.outline': 'アウトライン整列',

        // 面付けツール
        'nup.title': 'PDF<span class="text-gradient">面付け</span>ツール',
        'nup.subtitle': 'Professional N-up Converter',
        'nup.step1.title': 'ファイルまたはフォルダを選択',
        'nup.step2.title': '設定',
        'nup.step3.title': '実行',
        'nup.step4.title': '進捗状況',
        'nup.convert.btn': 'PDF変換を実行',

        // 結合ツール
        'merge.title': 'PDF<span class="text-gradient">結合</span>ツール',
        'merge.subtitle': 'PDF Merge Tool',
        'merge.step1.title': 'PDFファイルを追加',
        'merge.step2.title': '設定',
        'merge.step3.title': '実行',
        'merge.step4.title': '進捗状況',
        'merge.btn': 'PDFを結合',
        'merge.output.label': '出力ファイル名',
        'merge.output.note': '※ .pdf は自動的に付加されます',
        'merge.outline.label': 'アウトライン（しおり）を自動追加',
        'merge.outline.desc': '各ファイルの先頭ページにブックマークを作成します。PDFビューアのサイドバーから素早くジャンプできます。',
        'merge.drag.hint': 'ドラッグで並び替え',

        // 共通UI
        'common.drop.title': 'PDFファイルをここにドラッグ＆ドロップ',
        'common.drop.subtitle': 'または、以下のボタンから選択してください',
        'common.drop.subtitle.merge': 'または、ボタンから選択してください',
        'common.btn.addfile': 'ファイルを追加',
        'common.btn.folder': 'フォルダを選択',
        'common.btn.clearall': 'すべてクリア',
        'common.selected': '選択中のファイル',
        'common.files.selected': '個のファイルを選択中',
        'common.total': '合計',
        'common.log': 'ログ',

        // 設定項目
        'settings.layout': 'レイアウト',
        'settings.layout.1x2': '1x2 (2ページ/枚 - 縦)',
        'settings.layout.2x1': '2x1 (2ページ/枚 - 横)',
        'settings.layout.2x2': '2x2 (4ページ/枚)',
        'settings.layout.2x3': '2x3 (6ページ/枚)',
        'settings.layout.3x3': '3x3 (9ページ/枚)',
        'settings.layout.4x4': '4x4 (16ページ/枚)',
        'settings.margin': '余白 (mm)',
        'settings.gutter': 'セル間隔 (mm)',
        'settings.autorotate': 'ページの向きを自動で揃える',
        'settings.autorotate.desc': '横向きのページを自動で回転させ、向きを統一します。',
        'settings.preview': '変換前にプレビューを表示する',
        'settings.preview.desc': 'チェックを入れると、変換前にレイアウトのプレビューを確認できます。',
        'settings.manualrotate': '手動回転 (全ページ)',
        'settings.rotate0': '回転なし (0°)',
        'settings.rotate90': '時計回りに90°回転',
        'settings.rotate180': '180°回転',
        'settings.rotate270': '時計回りに270°回転',
        'settings.papersize': '出力用紙サイズ',
        'settings.papersize.auto': '自動（元PDFサイズ × グリッド）',
        'settings.papersize.auto.short': '自動',
        'settings.papersize.a3l': 'A3 ⬜ 横長',
        'settings.papersize.a3p': 'A3 ⬛ 縦長',
        'settings.papersize.a4l': 'A4 ⬜ 横長',
        'settings.papersize.a4p': 'A4 ⬛ 縦長',
        'settings.papersize.b4l': 'B4 ⬜ 横長',
        'settings.papersize.b4p': 'B4 ⬛ 縦長',
        'settings.papersize.b5l': 'B5 ⬜ 横長',
        'settings.papersize.b5p': 'B5 ⬛ 縦長',
        'settings.orientation.landscape': '横長',
        'settings.orientation.portrait': '縦長',

        // ステータス
        'status.portrait': '縦向き',
        'status.landscape': '横向き',
        'status.nopage': 'ページなし',
        'status.readerror': '読込エラー',
        'status.rotate': '90度回転',
        'status.remove': '削除',

        // プレビュー
        'preview.title': '出力プレビュー',
        'preview.cancel': 'キャンセル',
        'preview.convert': '変換を実行',

        // エラー・進捗
        'error.nopdf': 'PDFファイルが見つかりませんでした。',
        'error.nofile': 'ファイルが選択されていません。',
        'error.folder.nosupport': 'お使いのブラウザはフォルダ選択機能に対応していません。',
        'error.folder.nopdf': 'フォルダ内にPDFファイルが見つかりませんでした。',
        'error.folder.read': 'フォルダの読み込み中にエラーが発生しました。',
        'error.compression': '対応していない圧縮形式が使われています。macOSの「プレビュー」でPDFを開き、「ファイル」→「書き出す」で再保存してから再度お試しください。',
        'error.ioread': 'ファイルの読み込み中にエラーが発生しました。PDFが破損しているか、対応していない形式の可能性があります。',
        'error.encrypted': 'このPDFはパスワードで保護されています。',
        'error.invalid': '有効なPDFファイルではありません。',
        'error.loadfailed': 'の読み込みに失敗しました。',
        'progress.processing': '処理中',
        'progress.files': 'ファイル',
        'progress.remaining': '残り時間の目安',
        'progress.done': '完了！',
        'progress.generating': 'PDFを生成中...',
        'progress.merging': '結合を開始しています...',
        'progress.outline': 'アウトラインを追加中...',
        'progress.total.input': '入力合計',
        'progress.total.output': '出力合計',
        'progress.pages': 'ページのPDFを生成しました。',
        'progress.all.done': 'すべてのファイルの処理が完了しました！',
        'progress.few.seconds': '数秒',
        'progress.seconds': '秒',
        'progress.minutes': '分',

        // 失敗ファイル
        'failed.title': '処理に失敗したファイル',
        'failed.reprocess': '失敗したファイルのみ再処理',

        // 分割ツール
        'split.title': 'PDF<span class="text-gradient">分割</span>ツール',
        'split.subtitle': 'PDF Split Tool',
        'split.step1.title': 'PDFファイルを選択',
        'split.step2.title': '分割設定',
        'split.step3.title': '実行',
        'split.step4.title': '進捗状況',
        'split.drop.title': 'PDFファイルをここにドラッグ＆ドロップ',
        'split.drop.subtitle': 'または、ボタンから選択してください',
        'split.mode.label': '分割モード',
        'split.mode.pages': 'ページを個別に分割（1ページ1ファイル）',
        'split.mode.range': 'ページ範囲を指定して抽出',
        'split.mode.interval': 'N枚ごとに分割',
        'split.range.label': 'ページ範囲',
        'split.range.placeholder': '例: 1,3-5,8-10',
        'split.range.hint': 'カンマ区切りでページ番号または範囲（例: 1,3-5,8）',
        'split.interval.label': '何ページごとに分割',
        'split.interval.pages': 'ページ',
        'split.btn': 'PDF分割を実行',
        'split.progress.splitting': '分割中',
        'split.progress.done': '完了',
        'split.results.title': '分割結果',
        'split.results.download': 'ダウンロード',
        'split.results.downloadall': 'すべてダウンロード',
        'split.error.nopdf': 'PDFファイルを選択してください',
        'split.error.range': '無効なページ範囲です。例: 1,3-5,8',
        'split.error.nopage': '指定されたページが存在しません（総ページ数: {n}）',
        'split.pagecount': 'ページ',

        // 圧縮ツール
        'compress.title': 'PDF<span class="text-gradient">圧縮</span>ツール',
        'compress.subtitle': 'PDF Compress Tool',
        'compress.step1.title': 'PDFファイルを選択',
        'compress.step2.title': '圧縮設定',
        'compress.step3.title': '実行',
        'compress.step4.title': '進捗状況',
        'compress.drop.title': 'PDFファイルをここにドラッグ＆ドロップ',
        'compress.drop.subtitle': 'または、ボタンから選択してください',
        'compress.quality.label': '画質',
        'compress.quality.screen': '低画質（最小サイズ / 72 dpi）',
        'compress.quality.ebook': '中画質（スクリーン表示 / 120 dpi）',
        'compress.quality.printer': '高画質（印刷用 / 150 dpi）',
        'compress.quality.prepress': '最高画質（業務用 / 200 dpi）',
        'compress.quality.note': '※ PDF内の画像をJPEGに変換します。テキスト主体のPDFは逆に大きくなる場合があります。',
        'compress.btn': 'PDF圧縮を実行',
        'compress.progress.rendering': 'ページをレンダリング中',
        'compress.progress.saving': 'PDFを生成中',
        'compress.progress.done': '完了',
        'compress.results.reduction': '削減率',
        'compress.error.nopdf': 'PDFファイルを選択してください',

        // HEICツール
        'heic.title': 'HEIC to <span class="text-gradient">PNG</span>',
        'heic.subtitle': 'Image Converter',
        'heic.step1.title': 'HEICファイルを追加',
        'heic.step2.title': '変換',
        'heic.step3.title': '進捗状況',
        'heic.drop.title': 'HEICファイルをここにドラッグ＆ドロップ',
        'heic.drop.subtitle': 'または、ボタンから選択してください',
        'heic.filecount': '選択中のファイル',
        'heic.btn.convert': 'PNGに変換',
        'heic.btn.download': 'ダウンロード',
        'heic.results.title': '変換結果',
        'heic.progress.converting': '変換中',
        'heic.progress.done': '完了',
        'heic.error.noheic': 'HEICファイルを選択してください',
        'heic.error.failed': '変換失敗',

        // 画像→PDFツール
        'img2pdf.title': '画像 → <span class="text-gradient">PDF</span>',
        'img2pdf.subtitle': 'Image to PDF Converter',
        'img2pdf.step1.title': '画像を追加',
        'img2pdf.drop.title': '画像をここにドラッグ＆ドロップ',
        'img2pdf.drop.subtitle': 'JPG, PNG, GIF, WebP, HEIC対応',
        'img2pdf.filecount': '選択中の画像',
        'img2pdf.step2.title': '設定',
        'img2pdf.settings.pagesize': 'ページサイズ',
        'img2pdf.settings.pagesize.a4': 'A4',
        'img2pdf.settings.pagesize.a3': 'A3',
        'img2pdf.settings.pagesize.b5': 'B5',
        'img2pdf.settings.pagesize.fit': '画像に合わせる',
        'img2pdf.settings.orientation': '向き',
        'img2pdf.settings.orientation.auto': '自動（画像に合わせる）',
        'img2pdf.settings.orientation.portrait': '縦',
        'img2pdf.settings.orientation.landscape': '横',
        'img2pdf.settings.margin': '余白',
        'img2pdf.settings.margin.none': 'なし',
        'img2pdf.settings.margin.small': '小（10mm）',
        'img2pdf.settings.margin.medium': '中（20mm）',
        'img2pdf.settings.margin.large': '大（30mm）',
        'img2pdf.settings.alignment': '画像配置',
        'img2pdf.settings.alignment.fit': 'フィット（余白を埋める）',
        'img2pdf.settings.alignment.center': '中央配置',
        'img2pdf.step3.title': '変換',
        'img2pdf.btn.convert': 'PDFに変換',
        'img2pdf.progress.converting': '変換中',
        'img2pdf.progress.generating': 'PDF生成中...',
        'img2pdf.progress.done': '完了',
        'img2pdf.error.noimage': '画像ファイルを選択してください',
    },
    en: {
        // Navigation
        'nav.nup': 'N-up',
        'nav.merge': 'Merge',
        'nav.split': 'PDF Split',
        'nav.compress': 'Compress',
        'nav.heic': 'HEIC',
        'nav.img2pdf': 'Img to PDF',
        'nav.outline': 'Outline',

        // N-up Tool
        'nup.title': 'PDF <span class="text-gradient">N-up</span> Tool',
        'nup.subtitle': 'Professional N-up Converter',
        'nup.step1.title': 'Select Files or Folder',
        'nup.step2.title': 'Settings',
        'nup.step3.title': 'Execute',
        'nup.step4.title': 'Progress',
        'nup.convert.btn': 'Convert PDF',

        // Merge Tool
        'merge.title': 'PDF <span class="text-gradient">Merge</span> Tool',
        'merge.subtitle': 'PDF Merge Tool',
        'merge.step1.title': 'Add PDF Files',
        'merge.step2.title': 'Settings',
        'merge.step3.title': 'Execute',
        'merge.step4.title': 'Progress',
        'merge.btn': 'Merge PDFs',
        'merge.output.label': 'Output Filename',
        'merge.output.note': '* .pdf will be added automatically',
        'merge.outline.label': 'Auto-add Outlines (Bookmarks)',
        'merge.outline.desc': 'Creates bookmarks at the start of each file. Jump quickly from the PDF viewer sidebar.',
        'merge.drag.hint': 'Drag to reorder',

        // Common UI
        'common.drop.title': 'Drag & drop PDF files here',
        'common.drop.subtitle': 'Or select from the buttons below',
        'common.drop.subtitle.merge': 'Or select from the button below',
        'common.btn.addfile': 'Add Files',
        'common.btn.folder': 'Select Folder',
        'common.btn.clearall': 'Clear All',
        'common.selected': 'Selected Files',
        'common.files.selected': 'files selected',
        'common.total': 'Total',
        'common.log': 'Log',

        // Settings
        'settings.layout': 'Layout',
        'settings.layout.1x2': '1x2 (2 pages/sheet - Portrait)',
        'settings.layout.2x1': '2x1 (2 pages/sheet - Landscape)',
        'settings.layout.2x2': '2x2 (4 pages/sheet)',
        'settings.layout.2x3': '2x3 (6 pages/sheet)',
        'settings.layout.3x3': '3x3 (9 pages/sheet)',
        'settings.layout.4x4': '4x4 (16 pages/sheet)',
        'settings.margin': 'Margin (mm)',
        'settings.gutter': 'Cell Gap (mm)',
        'settings.autorotate': 'Auto-rotate pages',
        'settings.autorotate.desc': 'Automatically rotate landscape pages to match orientation.',
        'settings.preview': 'Show preview before conversion',
        'settings.preview.desc': 'Check to preview layout before converting.',
        'settings.manualrotate': 'Manual Rotation (All Pages)',
        'settings.rotate0': 'No rotation (0°)',
        'settings.rotate90': 'Rotate 90° clockwise',
        'settings.rotate180': 'Rotate 180°',
        'settings.rotate270': 'Rotate 270° clockwise',
        'settings.papersize': 'Output Paper Size',
        'settings.papersize.auto': 'Auto (Source PDF × Grid)',
        'settings.papersize.auto.short': 'Auto',
        'settings.papersize.a3l': 'A3 ⬜ Wide',
        'settings.papersize.a3p': 'A3 ⬛ Tall',
        'settings.papersize.a4l': 'A4 ⬜ Wide',
        'settings.papersize.a4p': 'A4 ⬛ Tall',
        'settings.papersize.b4l': 'B4 ⬜ Wide',
        'settings.papersize.b4p': 'B4 ⬛ Tall',
        'settings.papersize.b5l': 'B5 ⬜ Wide',
        'settings.papersize.b5p': 'B5 ⬛ Tall',
        'settings.orientation.landscape': 'Wide',
        'settings.orientation.portrait': 'Tall',

        // Status
        'status.portrait': 'Portrait',
        'status.landscape': 'Landscape',
        'status.nopage': 'No pages',
        'status.readerror': 'Read error',
        'status.rotate': 'Rotate 90°',
        'status.remove': 'Remove',

        // Preview
        'preview.title': 'Output Preview',
        'preview.cancel': 'Cancel',
        'preview.convert': 'Convert',

        // Errors & Progress
        'error.nopdf': 'No PDF files found.',
        'error.nofile': 'No files selected.',
        'error.folder.nosupport': 'Your browser does not support folder selection.',
        'error.folder.nopdf': 'No PDF files found in folder.',
        'error.folder.read': 'Error reading folder.',
        'error.compression': 'Unsupported compression format. Try re-saving the PDF using macOS Preview (File → Export).',
        'error.ioread': 'Error reading file. The PDF may be corrupted or in an unsupported format.',
        'error.encrypted': 'This PDF is password protected.',
        'error.invalid': 'Not a valid PDF file.',
        'error.loadfailed': 'failed to load.',
        'progress.processing': 'Processing',
        'progress.files': 'files',
        'progress.remaining': 'Estimated time remaining',
        'progress.done': 'Done!',
        'progress.generating': 'Generating PDF...',
        'progress.merging': 'Starting merge...',
        'progress.outline': 'Adding outlines...',
        'progress.total.input': 'Total input',
        'progress.total.output': 'Total output',
        'progress.pages': 'page PDF generated.',
        'progress.all.done': 'All files processed successfully!',
        'progress.few.seconds': 'a few seconds',
        'progress.seconds': 's',
        'progress.minutes': 'm ',

        // Failed files
        'failed.title': 'Failed Files',
        'failed.reprocess': 'Reprocess Failed Files',

        // Split Tool
        'split.title': 'PDF <span class="text-gradient">Split</span> Tool',
        'split.subtitle': 'PDF Split Tool',
        'split.step1.title': 'Select PDF File',
        'split.step2.title': 'Split Settings',
        'split.step3.title': 'Execute',
        'split.step4.title': 'Progress',
        'split.drop.title': 'Drag & drop PDF file here',
        'split.drop.subtitle': 'Or click the button to select',
        'split.mode.label': 'Split Mode',
        'split.mode.pages': 'Split into individual pages (1 page per file)',
        'split.mode.range': 'Extract page range',
        'split.mode.interval': 'Split every N pages',
        'split.range.label': 'Page Range',
        'split.range.placeholder': 'e.g. 1,3-5,8-10',
        'split.range.hint': 'Comma-separated page numbers or ranges (e.g. 1,3-5,8)',
        'split.interval.label': 'Pages per split',
        'split.interval.pages': 'pages',
        'split.btn': 'Split PDF',
        'split.progress.splitting': 'Splitting',
        'split.progress.done': 'Done',
        'split.results.title': 'Split Results',
        'split.results.download': 'Download',
        'split.results.downloadall': 'Download All',
        'split.error.nopdf': 'Please select a PDF file',
        'split.error.range': 'Invalid page range. Example: 1,3-5,8',
        'split.error.nopage': 'Specified pages do not exist (total pages: {n})',
        'split.pagecount': 'pages',

        // Compress Tool
        'compress.title': 'PDF <span class="text-gradient">Compress</span> Tool',
        'compress.subtitle': 'PDF Compress Tool',
        'compress.step1.title': 'Select PDF Files',
        'compress.step2.title': 'Compression Settings',
        'compress.step3.title': 'Execute',
        'compress.step4.title': 'Progress',
        'compress.drop.title': 'Drag & drop PDF files here',
        'compress.drop.subtitle': 'Or click the button to select',
        'compress.quality.label': 'Quality',
        'compress.quality.screen': 'Low (Smallest size / 72 dpi)',
        'compress.quality.ebook': 'Medium (Screen / 120 dpi)',
        'compress.quality.printer': 'High (Print / 150 dpi)',
        'compress.quality.prepress': 'Highest (Professional / 200 dpi)',
        'compress.quality.note': '* Images in the PDF are converted to JPEG. Text-heavy PDFs may become larger.',
        'compress.btn': 'Compress PDF',
        'compress.progress.rendering': 'Rendering pages',
        'compress.progress.saving': 'Generating PDF',
        'compress.progress.done': 'Done',
        'compress.results.reduction': 'Reduction',
        'compress.error.nopdf': 'Please select PDF files',

        // HEIC Tool
        'heic.title': 'HEIC to <span class="text-gradient">PNG</span>',
        'heic.subtitle': 'Image Converter',
        'heic.step1.title': 'Add HEIC Files',
        'heic.step2.title': 'Convert',
        'heic.step3.title': 'Progress',
        'heic.drop.title': 'Drag & Drop HEIC files here',
        'heic.drop.subtitle': 'Or click the button to select',
        'heic.filecount': 'Selected files',
        'heic.btn.convert': 'Convert to PNG',
        'heic.btn.download': 'Download',
        'heic.results.title': 'Results',
        'heic.progress.converting': 'Converting',
        'heic.progress.done': 'Done',
        'heic.error.noheic': 'Please select HEIC files',
        'heic.error.failed': 'Conversion failed',

        // Image to PDF Tool
        'img2pdf.title': 'Image to <span class="text-gradient">PDF</span>',
        'img2pdf.subtitle': 'Image to PDF Converter',
        'img2pdf.step1.title': 'Add Images',
        'img2pdf.drop.title': 'Drag & Drop images here',
        'img2pdf.drop.subtitle': 'Supports JPG, PNG, GIF, WebP, HEIC',
        'img2pdf.filecount': 'Selected images',
        'img2pdf.step2.title': 'Settings',
        'img2pdf.settings.pagesize': 'Page Size',
        'img2pdf.settings.pagesize.a4': 'A4',
        'img2pdf.settings.pagesize.a3': 'A3',
        'img2pdf.settings.pagesize.b5': 'B5',
        'img2pdf.settings.pagesize.fit': 'Fit to Image',
        'img2pdf.settings.orientation': 'Orientation',
        'img2pdf.settings.orientation.auto': 'Auto (Match Image)',
        'img2pdf.settings.orientation.portrait': 'Portrait',
        'img2pdf.settings.orientation.landscape': 'Landscape',
        'img2pdf.settings.margin': 'Margin',
        'img2pdf.settings.margin.none': 'None',
        'img2pdf.settings.margin.small': 'Small (10mm)',
        'img2pdf.settings.margin.medium': 'Medium (20mm)',
        'img2pdf.settings.margin.large': 'Large (30mm)',
        'img2pdf.settings.alignment': 'Alignment',
        'img2pdf.settings.alignment.fit': 'Fit (Fill Margin)',
        'img2pdf.settings.alignment.center': 'Center',
        'img2pdf.step3.title': 'Convert',
        'img2pdf.btn.convert': 'Convert to PDF',
        'img2pdf.progress.converting': 'Converting',
        'img2pdf.progress.generating': 'Generating PDF...',
        'img2pdf.progress.done': 'Done',
        'img2pdf.error.noimage': 'Please select image files',
    }
};

// 現在の言語
let currentLang = 'ja';

// 翻訳を取得
function t(key) {
    return translations[currentLang][key] || translations['ja'][key] || key;
}

// 言語を初期化
function initLanguage() {
    const saved = localStorage.getItem('lang');
    if (saved && (saved === 'ja' || saved === 'en')) {
        currentLang = saved;
    } else {
        // ブラウザの言語設定を確認
        const browserLang = navigator.language.slice(0, 2);
        currentLang = browserLang === 'ja' ? 'ja' : 'en';
    }
    applyTranslations();
    updateLangButton();
}

// 言語を切り替え
function toggleLanguage() {
    currentLang = currentLang === 'ja' ? 'en' : 'ja';
    localStorage.setItem('lang', currentLang);
    applyTranslations();
    updateLangButton();
}

// 言語ボタンを更新（国旗表示）
function updateLangButton() {
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
        // 現在の言語の逆を表示（切り替え先を示す）
        langBtn.textContent = currentLang === 'ja' ? '🇺🇸' : '🇯🇵';
    }
}

// 翻訳を適用
function applyTranslations() {
    // data-i18n 属性を持つ要素を翻訳
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = translation;
        } else if (el.tagName === 'OPTION') {
            el.textContent = translation;
        } else {
            el.innerHTML = translation;
        }
    });

    // data-i18n-title 属性を持つ要素のtitleを翻訳
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });
}
