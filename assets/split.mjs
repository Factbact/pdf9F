const { PDFDocument } = PDFLib;

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const selectFileBtn = document.getElementById('select-file-btn');
const fileInfo = document.getElementById('file-info');
const settingsSection = document.getElementById('settings-section');
const executeSection = document.getElementById('execute-section');
const splitBtn = document.getElementById('split-btn');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressDetails = document.getElementById('progress-details');
const resultsSection = document.getElementById('results-section');
const resultsList = document.getElementById('results-list');
const downloadAllBtn = document.getElementById('download-all-btn');
const errorBox = document.getElementById('error-box');
const errorMessage = document.getElementById('error-message');

let selectedFile = null;
let selectionGeneration = 0;
let totalPageCount = 0;
let splitResults = []; // { name, bytes }[]

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguage();
});

// --- イベントリスナー ---
selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelection(e.target.files[0]);
    fileInput.value = '';
});
setupDropZone(dropArea, (dt) => {
    const pdfs = Array.from(dt.files).filter(f => f.type === 'application/pdf');
    if (pdfs.length > 0) handleFileSelection(pdfs[0]);
    else showError(t('split.error.nopdf'));
});

// モード切替でサブ入力を表示
document.querySelectorAll('input[name="split-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
        document.getElementById('range-input-area').classList.toggle('hidden', radio.value !== 'range');
        document.getElementById('interval-input-area').classList.toggle('hidden', radio.value !== 'interval');
    });
});

splitBtn.addEventListener('click', runSplit);
downloadAllBtn.addEventListener('click', downloadAll);

// --- ファイル処理 ---
async function handleFileSelection(file) {
    if (isProcessing()) return;
    const generation = ++selectionGeneration;
    selectedFile = null;
    totalPageCount = 0;
    splitResults = [];
    fileInfo.textContent = '';
    resultsList.replaceChildren();
    for (const section of [settingsSection, executeSection, resultsSection]) section.classList.add('hidden');
    if (!acceptFiles([file], showError)) return;
    hideError();
    try {
        const buf = await file.arrayBuffer();
        const pdf = await loadPdfSafely(buf, {});
        if (generation !== selectionGeneration || isProcessing()) return;
        totalPageCount = pdf.getPageCount();
        selectedFile = file;

        fileInfo.textContent = `${file.name}  —  ${totalPageCount} ${t('split.pagecount')}`;
        settingsSection.classList.remove('hidden');
        executeSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        resultsList.innerHTML = '';
        splitResults = [];
    } catch (e) {
        if (generation !== selectionGeneration || isProcessing()) return;
        if (e.message.includes('encrypted') || e.message.includes('password')) {
            showError(t('error.encrypted'));
        } else {
            showError(t('error.ioread'));
        }
        console.error(e);
    }
}

// --- ページ範囲パーサー ---
// "1,3-5,8" → [0,2,3,4,7] (0-indexed)
function parsePageRange(rangeStr, maxPage) {
    const pages = new Set();
    const parts = rangeStr.split(',');
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const match = trimmed.match(/^(\d+)(?:-(\d+))?$/);
        if (!match) return null;
        const from = parseInt(match[1]);
        const to = match[2] ? parseInt(match[2]) : from;
        if (from < 1 || to < from || to > maxPage) return null;
        for (let i = from; i <= to; i++) pages.add(i - 1);
    }
    if (pages.size === 0) return null;
    return Array.from(pages).sort((a, b) => a - b);
}

// --- 分割実行 ---
async function runSplit() {
    return withProcessingLock(() => runSplitTask());
}

async function runSplitTask() {
    if (!selectedFile) { showError(t('split.error.nopdf')); return; }

    hideError();
    splitResults = [];
    resultsList.innerHTML = '';
    resultsSection.classList.add('hidden');
    progressSection.classList.remove('hidden');
    splitBtn.disabled = true;

    try {
    const mode = document.querySelector('input[name="split-mode"]:checked').value;
    const fileBuffer = await selectedFile.arrayBuffer();
    const srcPdf = await loadPdfSafely(fileBuffer, {});
    const pageCount = srcPdf.getPageCount();
    const baseName = selectedFile.name.replace(/\.pdf$/i, '');

        if (mode === 'pages') {
            // 1ページ1ファイル
            for (let i = 0; i < pageCount; i++) {
                const newPdf = await PDFDocument.create();
                const [page] = await newPdf.copyPages(srcPdf, [i]);
                newPdf.addPage(page);
                const bytes = await newPdf.save();
                const name = `${baseName}_p${String(i + 1).padStart(String(pageCount).length, '0')}.pdf`;
                checkOutputBytes(splitResults.reduce((sum, item) => sum + item.bytes.length, bytes.length));
                splitResults.push({ name, bytes });
                updateProgress(((i + 1) / pageCount) * 100, `${t('split.progress.splitting')} ${i + 1} / ${pageCount}`);
                await new Promise(r => setTimeout(r, 0)); // UI更新
            }
        } else if (mode === 'range') {
            const rangeStr = document.getElementById('range-input').value.trim();
            if (!rangeStr) { showError(t('split.error.range')); splitBtn.disabled = false; return; }
            const indices = parsePageRange(rangeStr, pageCount);
            if (!indices) {
                showError(t('split.error.range'));
                splitBtn.disabled = false;
                return;
            }
            const newPdf = await PDFDocument.create();
            const copiedPages = await newPdf.copyPages(srcPdf, indices);
            copiedPages.forEach(p => newPdf.addPage(p));
            const bytes = await newPdf.save();
            const name = `${baseName}_extract.pdf`;
            checkOutputBytes(splitResults.reduce((sum, item) => sum + item.bytes.length, bytes.length));
                splitResults.push({ name, bytes });
            updateProgress(100, t('split.progress.done'));
        } else if (mode === 'interval') {
            const n = Math.max(1, parseInt(document.getElementById('interval-input').value) || 1);
            const chunkCount = Math.ceil(pageCount / n);
            for (let chunk = 0; chunk < chunkCount; chunk++) {
                const from = chunk * n;
                const to = Math.min(from + n, pageCount);
                const indices = Array.from({ length: to - from }, (_, k) => from + k);
                const newPdf = await PDFDocument.create();
                const copiedPages = await newPdf.copyPages(srcPdf, indices);
                copiedPages.forEach(p => newPdf.addPage(p));
                const bytes = await newPdf.save();
                const fromPage = from + 1;
                const toPage = to;
                const name = `${baseName}_p${String(fromPage).padStart(String(pageCount).length, '0')}-${String(toPage).padStart(String(pageCount).length, '0')}.pdf`;
                checkOutputBytes(splitResults.reduce((sum, item) => sum + item.bytes.length, bytes.length));
                splitResults.push({ name, bytes });
                updateProgress(((chunk + 1) / chunkCount) * 100, `${t('split.progress.splitting')} ${chunk + 1} / ${chunkCount}`);
                await new Promise(r => setTimeout(r, 0));
            }
        }

        renderResults();
    } catch (e) {
        showError(e.message || t('error.ioread'));
        console.error(e);
    }

    splitBtn.disabled = false;
}

function updateProgress(pct, text) {
    progressBar.style.width = `${Math.round(pct)}%`;
    if (text) progressDetails.textContent = text;
}

function renderResults() {
    resultsList.innerHTML = '';
    splitResults.forEach((item, idx) => {
        const li = document.createElement('div');
        li.className = 'flex items-center justify-between bg-white dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in';
        li.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12" /></svg>
                </div>
                <span class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate"><span data-safe-0></span></span>
                <span class="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">${formatBytes(item.bytes.length)}</span>
            </div>
            <button data-idx="${idx}" class="dl-btn flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex-shrink-0 ml-3">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                <span data-i18n="split.results.download">ダウンロード</span>
            </button>`;
        li.querySelector('[data-safe-0]').textContent = item.name;
        resultsList.appendChild(li);
    });

    resultsList.querySelectorAll('.dl-btn').forEach(btn => {
        btn.addEventListener('click', () => downloadSingle(parseInt(btn.dataset.idx)));
    });

    applyTranslations();
    resultsSection.classList.remove('hidden');
}

function downloadSingle(idx) {
    const { name, bytes } = splitResults[idx];
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function downloadAll() {
    for (let i = 0; i < splitResults.length; i++) {
        downloadSingle(i);
        if (i < splitResults.length - 1) await new Promise(r => setTimeout(r, 300));
    }
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorBox.classList.remove('hidden');
}

function hideError() {
    errorBox.classList.add('hidden');
}
