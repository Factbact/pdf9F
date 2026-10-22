import * as pdfjsLib from './pdf-runtime.mjs';

const { PDFDocument } = PDFLib;

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const selectFileBtn = document.getElementById('select-file-btn');
const fileListArea = document.getElementById('file-list-area');
const fileList = document.getElementById('file-list');
const fileCount = document.getElementById('file-count');
const clearBtn = document.getElementById('clear-btn');
const settingsSection = document.getElementById('settings-section');
const executeSection = document.getElementById('execute-section');
const compressBtn = document.getElementById('compress-btn');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressDetails = document.getElementById('progress-details');
const progressFileInfo = document.getElementById('progress-file-info');
const resultsSection = document.getElementById('results-section');
const resultsList = document.getElementById('results-list');
const downloadAllBtn = document.getElementById('download-all-btn');
const summaryArea = document.getElementById('summary-area');
const summaryOriginal = document.getElementById('summary-original');
const summaryCompressed = document.getElementById('summary-compressed');
const summaryReduction = document.getElementById('summary-reduction');
const errorBox = document.getElementById('error-box');
const errorMessage = document.getElementById('error-message');

const qualitySettings = {
    screen:   { dpi: 72,  jpegQuality: 0.50 },
    ebook:    { dpi: 120, jpegQuality: 0.65 },
    printer:  { dpi: 150, jpegQuality: 0.82 },
    prepress: { dpi: 200, jpegQuality: 0.92 },
};

let selectedFiles = [];
let compressResults = []; // { name, originalSize, bytes }[]

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguage();
});

// --- イベントリスナー ---
selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelection(e.target.files);
    fileInput.value = '';
});
setupDropZone(dropArea, (dt) => {
    const pdfs = Array.from(dt.files).filter(f => f.type === 'application/pdf');
    if (pdfs.length > 0) handleFileSelection(pdfs);
    else showError(t('compress.error.nopdf'));
});
clearBtn.addEventListener('click', clearAll);
compressBtn.addEventListener('click', runCompress);
downloadAllBtn.addEventListener('click', downloadAll);

// --- ファイル処理 ---
function handleFileSelection(files) {
    if (!acceptFiles([...selectedFiles, ...Array.from(files)], showError)) return;
    hideError();
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf');
    if (pdfs.length === 0) { showError(t('compress.error.nopdf')); return; }

    selectedFiles = [...selectedFiles, ...pdfs];
    renderFileList();
    settingsSection.classList.remove('hidden');
    executeSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    resultsList.innerHTML = '';
    compressResults = [];
}

function renderFileList() {
    fileList.innerHTML = '';
    fileCount.textContent = selectedFiles.length;
    selectedFiles.forEach((file, idx) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between bg-white dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700';
        div.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12" /></svg>
                </div>
                <div class="overflow-hidden">
                    <p class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate"><span data-safe-0></span></p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">${formatBytes(file.size)}</p>
                </div>
            </div>
            <button data-idx="${idx}" class="rm-btn ml-3 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>`;
        div.querySelector('[data-safe-0]').textContent = file.name;
        fileList.appendChild(div);
    });

    fileList.querySelectorAll('.rm-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedFiles.splice(parseInt(btn.dataset.idx), 1);
            renderFileList();
            if (selectedFiles.length === 0) clearAll();
        });
    });

    fileListArea.classList.toggle('hidden', selectedFiles.length === 0);
}

function clearAll() {
    selectedFiles = [];
    compressResults = [];
    fileList.innerHTML = '';
    fileListArea.classList.add('hidden');
    settingsSection.classList.add('hidden');
    executeSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    progressSection.classList.add('hidden');
    hideError();
}

// --- 圧縮実行 ---
async function runCompress() {
    if (selectedFiles.length === 0) { showError(t('compress.error.nopdf')); return; }

    hideError();
    compressResults = [];
    resultsList.innerHTML = '';
    resultsSection.classList.add('hidden');
    summaryArea.classList.add('hidden');
    progressSection.classList.remove('hidden');
    compressBtn.disabled = true;

    const quality = document.querySelector('input[name="compress-quality"]:checked').value;
    const { dpi, jpegQuality } = qualitySettings[quality];
    const scale = dpi / 72;

    const totalFiles = selectedFiles.length;

    try {
        for (let fi = 0; fi < totalFiles; fi++) {
            const file = selectedFiles[fi];
            const fileBasePct = (fi / totalFiles) * 100;
            const fileSharePct = 100 / totalFiles;

            progressFileInfo.textContent = `${fi + 1} / ${totalFiles}  —  ${file.name}`;
            updateProgress(fileBasePct, `${t('compress.progress.rendering')} (${fi + 1}/${totalFiles})`);

            const arrayBuffer = await file.arrayBuffer();

            // pdf.js でページレンダリング
            const pdfJsDoc = await pdfjsLib.getDocument({ isEvalSupported: false, data: arrayBuffer }).promise;
            try {
            const pageCount = pdfJsDoc.numPages;

            const newPdf = await PDFDocument.create();

            for (let pi = 0; pi < pageCount; pi++) {
                const page = await pdfJsDoc.getPage(pi + 1);

                // scale=1 でポイント単位の寸法を取得
                const viewport1 = page.getViewport({ scale: 1 });
                const pointWidth = viewport1.width;
                const pointHeight = viewport1.height;

                // target DPI でレンダリング
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                checkPixels(Math.round(viewport.width), Math.round(viewport.height));
                canvas.width = Math.round(viewport.width);
                canvas.height = Math.round(viewport.height);
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;

                // JPEG エンコード
                const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
                const jpegBase64 = jpegDataUrl.split(',')[1];
                const jpegBytes = Uint8Array.from(atob(jpegBase64), c => c.charCodeAt(0));

                // pdf-lib に埋め込み
                const jpegImage = await newPdf.embedJpg(jpegBytes);
                const newPage = newPdf.addPage([pointWidth, pointHeight]);
                newPage.drawImage(jpegImage, {
                    x: 0,
                    y: 0,
                    width: pointWidth,
                    height: pointHeight,
                });

                canvas.width = canvas.height = 0;
                page.cleanup();
                const pagePct = ((pi + 1) / pageCount) * fileSharePct;
                updateProgress(fileBasePct + pagePct, `${t('compress.progress.rendering')} (${fi + 1}/${totalFiles}) — ${pi + 1}/${pageCount}`);
                await new Promise(r => setTimeout(r, 0)); // UI更新
            }

            updateProgress(fileBasePct + fileSharePct * 0.9, `${t('compress.progress.saving')} (${fi + 1}/${totalFiles})`);
            const bytes = await newPdf.save();
            checkOutputBytes(compressResults.reduce((sum, item) => sum + item.bytes.length, bytes.length));

            const baseName = file.name.replace(/\.pdf$/i, '');
            compressResults.push({
                name: `${baseName}_compressed.pdf`,
                originalSize: file.size,
                bytes,
            });
            updateProgress(fileBasePct + fileSharePct, `${t('compress.progress.done')} (${fi + 1}/${totalFiles})`);
            } finally { await pdfJsDoc.destroy(); }
        }

        updateProgress(100, t('compress.progress.done'));
        renderResults();

    } catch (e) {
        showError(e.message || t('error.ioread'));
        console.error(e);
    }

    compressBtn.disabled = false;
}

function updateProgress(pct, text) {
    progressBar.style.width = `${Math.min(100, Math.round(pct))}%`;
    if (text) progressDetails.textContent = text;
}

function renderResults() {
    resultsList.innerHTML = '';

    let totalOriginal = 0;
    let totalCompressed = 0;

    compressResults.forEach((item, idx) => {
        totalOriginal += item.originalSize;
        totalCompressed += item.bytes.length;

        const reduction = item.originalSize > 0
            ? Math.round((1 - item.bytes.length / item.originalSize) * 100)
            : 0;
        const reductionColor = reduction > 0
            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800'
            : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';

        const div = document.createElement('div');
        div.className = 'bg-white dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in';
        div.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                        <svg class="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12" /></svg>
                    </div>
                    <div class="overflow-hidden">
                        <p class="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate"><span data-safe-0></span></p>
                        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span class="text-xs text-slate-500 dark:text-slate-400">${formatBytes(item.originalSize)}</span>
                            <svg class="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">${formatBytes(item.bytes.length)}</span>
                            <span class="text-xs font-bold px-1.5 py-0.5 rounded border ${reductionColor}">
                                ${reduction > 0 ? '-' : '+'}${Math.abs(reduction)}%
                            </span>
                        </div>
                    </div>
                </div>
                <button data-idx="${idx}" class="dl-btn flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex-shrink-0">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    <span data-i18n="split.results.download">ダウンロード</span>
                </button>
            </div>`;
        div.querySelector('[data-safe-0]').textContent = item.name;
        resultsList.appendChild(div);
    });

    resultsList.querySelectorAll('.dl-btn').forEach(btn => {
        btn.addEventListener('click', () => downloadSingle(parseInt(btn.dataset.idx)));
    });

    // サマリー
    if (compressResults.length > 1) {
        const totalReduction = totalOriginal > 0
            ? Math.round((1 - totalCompressed / totalOriginal) * 100)
            : 0;
        summaryOriginal.textContent = formatBytes(totalOriginal);
        summaryCompressed.textContent = formatBytes(totalCompressed);
        summaryReduction.textContent = `${totalReduction > 0 ? '-' : '+'}${Math.abs(totalReduction)}%`;
        summaryArea.classList.remove('hidden');
    }

    applyTranslations();
    resultsSection.classList.remove('hidden');
}

function downloadSingle(idx) {
    const { name, bytes } = compressResults[idx];
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function downloadAll() {
    for (let i = 0; i < compressResults.length; i++) {
        downloadSingle(i);
        if (i < compressResults.length - 1) await new Promise(r => setTimeout(r, 300));
    }
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorBox.classList.remove('hidden');
}

function hideError() {
    errorBox.classList.add('hidden');
}
