import { convertHeicToBlob } from './heic-client.mjs';
import { normalizeImage } from './image-client.mjs';

const MM_TO_PT = 2.83465;
const PAPER_SIZES = {
    'a4': { width: 210, height: 297 },
    'a3': { width: 297, height: 420 },
    'b5': { width: 182, height: 257 }
};

// DOM要素
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const selectFileBtn = document.getElementById('select-file-btn');
const fileInfo = document.getElementById('file-info');
const fileListHeader = document.getElementById('file-list-header');
const fileListContainer = document.getElementById('file-list-container');
const clearAllBtn = document.getElementById('clear-all-btn');
const convertBtn = document.getElementById('convert-btn');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressDetails = document.getElementById('progress-details');
const errorBox = document.getElementById('error-box');
const errorMessage = document.getElementById('error-message');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIconSun = document.getElementById('theme-icon-sun');
const themeIconMoon = document.getElementById('theme-icon-moon');

let selectedFiles = [];
let importing = false;
let selectionGeneration = 0;

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguage();
});

// --- イベントリスナー ---
selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    handleFileSelection(e.target.files);
    fileInput.value = '';
});
clearAllBtn.addEventListener('click', clearAllFiles);
convertBtn.addEventListener('click', convertToPdf);
setupDropZone(dropArea, (dt) => handleFileSelection(dt.files));

// --- ファイル操作 ---
async function handleFileSelection(fileList) {
    if (importing) { showError(securityMessage('busy')); return; }
    if (!acceptFiles([...selectedFiles, ...Array.from(fileList)], showError)) return;
    const imageFiles = Array.from(fileList).filter(f =>
        /^image\/(png|jpeg|gif|webp|bmp|heic|heif)$/.test(f.type) || /\.(heic|heif)$/i.test(f.name)
    );
    if (imageFiles.length === 0) {
        if (selectedFiles.length === 0) showError(t('img2pdf.error.noimage') || '画像ファイルを選択してください');
        return;
    }

    importing = true;
    convertBtn.disabled = true;
    const generation = selectionGeneration;
    try {
    for (const file of imageFiles) {
        if (generation !== selectionGeneration) return;
        let processedFile = file;
        let thumbnail = null;

        try {
        // HEIC変換
        if (/\.(heic|heif)$/i.test(file.name)) {
            try {
                const pngBlob = await convertHeicToBlob(file, 'image/png', 0.8);
                processedFile = new File([pngBlob], file.name.replace(/\.heic$/i, '.png'), { type: 'image/png' });
            } catch (e) {
                if (generation === selectionGeneration) showError(e.message);
                console.error('HEIC conversion error:', e);
                continue;
            }
        }

        // サムネイル生成
        if (generation !== selectionGeneration) return;
        processedFile = await normalizeImage(processedFile);
        if (generation !== selectionGeneration) return;
        thumbnail = await createThumbnail(processedFile);
        if (generation !== selectionGeneration) return;
        validateFiles([...selectedFiles, processedFile]);

        selectedFiles.push({
            file: processedFile,
            name: file.name,
            thumbnail,
            id: crypto.randomUUID()
        });
        } catch (error) { if (generation === selectionGeneration) showError(error.message); continue; }
    }
    } finally {
        importing = false;
        renderFileList();
    }
}

function createThumbnail(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error(securityMessage('decode')));
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

function removeFile(id) {
    selectedFiles = selectedFiles.filter(f => f.id !== id);
    renderFileList();
}

function clearAllFiles() {
    selectionGeneration++;
    selectedFiles = [];
    renderFileList();
}

function renderFileList() {
    const totalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);

    if (selectedFiles.length === 0) {
        fileInfo.textContent = '';
        fileListHeader.classList.add('hidden');
    } else {
        fileInfo.textContent = `${selectedFiles.length}${t('common.files.selected') || '枚選択中'} (${formatBytes(totalSize)})`;
        fileListHeader.classList.remove('hidden');
        fileListHeader.classList.add('flex');
    }

    fileListContainer.innerHTML = '';

    for (let i = 0; i < selectedFiles.length; i++) {
        const fileObj = selectedFiles[i];
        const div = document.createElement('div');
        div.className = 'relative group bg-white dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in';

        div.innerHTML = `
            <div class="aspect-square bg-slate-100 dark:bg-slate-600 overflow-hidden">
                <img data-safe-0="" data-safe-1="" class="w-full h-full object-cover">
            </div>
            <div class="absolute top-1 left-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">${i + 1}</div>
            <button class="remove-btn absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-safe-2="">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div class="p-2">
                <p class="text-xs text-slate-600 dark:text-slate-300 truncate"><span data-safe-3></span></p>
            </div>
        `;
        div.querySelector('[data-safe-0]').setAttribute('src', fileObj.thumbnail);
        div.querySelector('[data-safe-1]').setAttribute('alt', fileObj.name);
        div.querySelector('[data-safe-2]').setAttribute('data-id', fileObj.id);
        div.querySelector('[data-safe-3]').textContent = fileObj.name;

        div.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(fileObj.id);
        });

        fileListContainer.appendChild(div);
    }

    convertBtn.disabled = importing || selectedFiles.length === 0;
}

// --- PDF変換 ---
async function convertToPdf() {
    if (importing) return;
    if (selectedFiles.length === 0) return;

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressDetails.textContent = t('img2pdf.progress.converting') || '変換中...';
    convertBtn.disabled = true;
    hideError();

    try {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();

        const pageSizeOption = document.getElementById('page-size').value;
        const orientationOption = document.getElementById('orientation').value;
        const marginMm = parseFloat(document.getElementById('margin').value);
        const alignmentOption = document.getElementById('alignment').value;
        const margin = marginMm * MM_TO_PT;

        for (let i = 0; i < selectedFiles.length; i++) {
            const fileObj = selectedFiles[i];
            progressDetails.textContent = `${t('img2pdf.progress.converting') || '変換中'}: ${i + 1} / ${selectedFiles.length}`;

            // 画像を読み込み
            const imgBytes = await fileObj.file.arrayBuffer();
            let embeddedImg;

            if (fileObj.file.type === 'image/png') {
                embeddedImg = await pdfDoc.embedPng(imgBytes);
            } else {
                embeddedImg = await pdfDoc.embedJpg(imgBytes);
            }

            const imgWidth = embeddedImg.width;
            const imgHeight = embeddedImg.height;
            const isImagePortrait = imgHeight > imgWidth;

            // ページサイズ決定
            let pageWidth, pageHeight;
            if (pageSizeOption === 'fit') {
                pageWidth = imgWidth + margin * 2;
                pageHeight = imgHeight + margin * 2;
            } else {
                const paperSize = PAPER_SIZES[pageSizeOption];
                let isPagePortrait;

                if (orientationOption === 'auto') {
                    isPagePortrait = isImagePortrait;
                } else {
                    isPagePortrait = orientationOption === 'portrait';
                }

                if (isPagePortrait) {
                    pageWidth = paperSize.width * MM_TO_PT;
                    pageHeight = paperSize.height * MM_TO_PT;
                } else {
                    pageWidth = paperSize.height * MM_TO_PT;
                    pageHeight = paperSize.width * MM_TO_PT;
                }
            }

            const page = pdfDoc.addPage([pageWidth, pageHeight]);

            // 描画サイズ計算
            const availableWidth = pageWidth - margin * 2;
            const availableHeight = pageHeight - margin * 2;

            let drawWidth, drawHeight;
            if (alignmentOption === 'fit') {
                const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
                drawWidth = imgWidth * scale;
                drawHeight = imgHeight * scale;
            } else {
                // 中央配置（原寸または縮小）
                if (imgWidth <= availableWidth && imgHeight <= availableHeight) {
                    drawWidth = imgWidth;
                    drawHeight = imgHeight;
                } else {
                    const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
                    drawWidth = imgWidth * scale;
                    drawHeight = imgHeight * scale;
                }
            }

            const x = margin + (availableWidth - drawWidth) / 2;
            const y = margin + (availableHeight - drawHeight) / 2;

            page.drawImage(embeddedImg, { x, y, width: drawWidth, height: drawHeight });

            progressBar.style.width = `${((i + 1) / selectedFiles.length) * 100}%`;
        }

        progressDetails.textContent = t('img2pdf.progress.generating') || 'PDF生成中...';
        const pdfBytes = await pdfDoc.save();
        checkOutputBytes(pdfBytes.length);

        // ダウンロード
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'images.pdf';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        progressDetails.textContent = `${t('img2pdf.progress.done') || '完了'}: ${selectedFiles.length}${t('common.files.pages') || 'ページ'}`;

    } catch (error) {
        console.error('Conversion error:', error);
        showError(error.message);
    }

    convertBtn.disabled = false;
}

// --- エラー表示 ---
function showError(message) {
    errorMessage.textContent = message;
    errorBox.classList.remove('hidden');
}

function hideError() {
    errorBox.classList.add('hidden');
}
