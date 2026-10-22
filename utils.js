// utils.js - 共通ユーティリティ (全ページで共有)

const PROCESSING_LIMITS = Object.freeze({ files: 50, fileBytes: 50 * 1024 * 1024, totalBytes: 200 * 1024 * 1024, pages: 500, pixels: 32_000_000 });
function securityMessage(kind) {
    const en = document.documentElement.lang === 'en';
    const messages = {
        files: ['最大50ファイル、1ファイル50 MiB、合計200 MiBまでです。', 'Limit: 50 files, 50 MiB per file, 200 MiB total.'],
        pages: ['PDFは500ページまで処理できます。', 'PDF processing is limited to 500 pages.'],
        output: ['出力データの合計は200 MiBまでです。', 'Combined output is limited to 200 MiB.'],
        pixels: ['画像・描画サイズが上限（32メガピクセル、辺16384px）を超えています。', 'Image/render limit: 32 megapixels, 16384 pixels per side.'],
        timeout: ['処理がタイムアウトしました。', 'Processing timed out.'],
        busy: ['読み込み中です。完了後に追加してください。', 'Loading files. Please wait before adding more.'],
        decode: ['画像のデコードに失敗しました。', 'Image decoding failed.']
    };
    return messages[kind][en ? 1 : 0];
}
function validateFiles(files) {
    const list = Array.from(files, entry => entry.file || entry);
    if (list.length > PROCESSING_LIMITS.files || list.some(f => f.size > PROCESSING_LIMITS.fileBytes) ||
        list.reduce((sum, f) => sum + f.size, 0) > PROCESSING_LIMITS.totalBytes) throw new Error(securityMessage('files'));
}
function acceptFiles(files, report) {
    try { validateFiles(files); return true; }
    catch (error) { report(error.message); return false; }
}
function checkPageCount(count) {
    if (count > PROCESSING_LIMITS.pages) throw new Error(securityMessage('pages'));
}
function checkOutputBytes(bytes) {
    if (bytes > PROCESSING_LIMITS.totalBytes) throw new Error(securityMessage('output'));
}
function checkPixels(width, height) {
    if (!Number.isFinite(width * height) || width <= 0 || height <= 0 ||
        width * height > PROCESSING_LIMITS.pixels || Math.max(width, height) > 16384) throw new Error(securityMessage('pixels'));
}
async function loadPdfSafely(bytes, options = {}) {
    if (bytes.byteLength > PROCESSING_LIMITS.fileBytes) throw new Error(securityMessage('files'));
    const { inspectPdf } = await import('./assets/pdf-inspect-client.mjs');
    await inspectPdf(bytes);
    const doc = await PDFLib.PDFDocument.load(bytes, { ...options, ignoreEncryption: false });
    checkPageCount(doc.getPageCount());
    return doc;
}

// --- フォーマット ---

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatTime(ms) {
    if (ms < 1000) return (typeof t !== 'undefined' ? t('progress.few.seconds') : null) || '数秒';
    const seconds = Math.round(ms / 1000);
    const sec = (typeof t !== 'undefined' ? t('progress.seconds') : null) || '秒';
    const min = (typeof t !== 'undefined' ? t('progress.minutes') : null) || '分';
    if (seconds < 60) return `${seconds}${sec}`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}${min}${remainingSeconds}${sec}`;
}

// --- テーマ ---

function setTheme(theme) {
    const sun = document.getElementById('theme-icon-sun');
    const moon = document.getElementById('theme-icon-moon');
    const btn = document.getElementById('theme-toggle-btn');
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        if (sun) sun.classList.remove('hidden');
        if (moon) moon.classList.add('hidden');
        if (btn) {
            btn.classList.add('text-yellow-500');
            btn.classList.remove('text-slate-400');
        }
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if (sun) sun.classList.add('hidden');
        if (moon) moon.classList.remove('hidden');
        if (btn) {
            btn.classList.remove('text-yellow-500');
            btn.classList.add('text-slate-400');
        }
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme === 'dark' || (!savedTheme && systemDark) ? 'dark' : 'light');
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            const current = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
            setTheme(current === 'dark' ? 'light' : 'dark');
        });
    }
}

// --- ドロップゾーン ---

// dropAreaEl: ドロップ対象のDOM要素
// onDrop(dataTransfer): ドロップ時に呼ばれるコールバック
function setupDropZone(dropAreaEl, onDrop) {
    if (!dropAreaEl) return;
    dropAreaEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropAreaEl.classList.add('dragging');
    });
    dropAreaEl.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropAreaEl.classList.remove('dragging');
    });
    dropAreaEl.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropAreaEl.classList.remove('dragging');
        onDrop(e.dataTransfer);
    });
}

// Serialize conversions and freeze editing while a batch owns its inputs.
let processing = false;
function isProcessing() { return processing; }
async function withProcessingLock(operation) {
    if (processing) return;
    processing = true;
    const regions = [...document.querySelectorAll('main, #preview-modal')];
    const previous = regions.map(el => el.inert);
    const stopEditing = event => {
        // Programmatic download links created by the operation must still work.
        if (event.type === 'click' && event.target.closest?.('a[download]')) return;
        if (event.target.closest?.('#theme-toggle-btn, #lang-toggle-btn')) return;
        if (['drop', 'dragstart', 'change', 'input'].includes(event.type) ||
            event.target.closest?.('button, input, select, textarea, [contenteditable]')) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    };
    const events = ['click', 'change', 'input', 'drop', 'dragstart'];
    for (const event of events) document.addEventListener(event, stopEditing, true);
    regions.forEach(el => { el.inert = true; el.setAttribute('aria-busy', 'true'); });
    try { return await operation(); }
    finally {
        regions.forEach((el, i) => { el.inert = previous[i]; el.removeAttribute('aria-busy'); });
        for (const event of events) document.removeEventListener(event, stopEditing, true);
        processing = false;
    }
}
