// 多言語対応 (i18n) - 日本語/英語
const translations = {
    ja: {
        // ナビゲーション
        'nav.nup': '面付け',
        'nav.merge': '結合',

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

        // 失敗ファイル
        'failed.title': '処理に失敗したファイル',
        'failed.reprocess': '失敗したファイルのみ再処理',
    },
    en: {
        // Navigation
        'nav.nup': 'N-up',
        'nav.merge': 'Merge',

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

        // Failed files
        'failed.title': 'Failed Files',
        'failed.reprocess': 'Reprocess Failed Files',
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
