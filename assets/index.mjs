import * as pdfjsLib from './pdf-runtime.mjs';

// グローバル変数と定数
const { PDFDocument, rgb, StandardFonts, degrees } = PDFLib;
const MM_TO_PT = 72 / 25.4;

// DOM要素
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const selectFileBtn = document.getElementById('select-file-btn');
const selectFolderBtn = document.getElementById('select-folder-btn');
const folderSupportNote = document.getElementById('folder-support-note');
const fileInfo = document.getElementById('file-info');
const convertBtn = document.getElementById('convert-btn');
const fileListContainer = document.getElementById('file-list-container');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressDetails = document.getElementById('progress-details');
const logArea = document.getElementById('log');
const errorBox = document.getElementById('error-box');
const errorMessage = document.getElementById('error-message');

// ダークモード関連要素
// ダークモード関連要素
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIconSun = document.getElementById('theme-icon-sun');
const themeIconMoon = document.getElementById('theme-icon-moon');

const autoRotateCheckbox = document.getElementById('auto-rotate');
const enablePreviewCheckbox = document.getElementById('enable-preview');
const previewModal = document.getElementById('preview-modal');
const previewCanvas = document.getElementById('preview-canvas');
const cancelPreviewBtn = document.getElementById('cancel-preview-btn');
const closePreviewBtn = document.getElementById('close-preview-btn');
const confirmConvertBtn = document.getElementById('confirm-convert-btn');
const failedFilesSection = document.getElementById('failed-files-section');
const failedFilesList = document.getElementById('failed-files-list');
const reprocessBtn = document.getElementById('reprocess-btn');

let selectedFiles = [];
let listGeneration = 0;
let inputDirHandle = null;
let failedFiles = [];

// --- 初期化処理 ---
const fileListHeader = document.getElementById('file-list-header');
const clearAllBtn = document.getElementById('clear-all-btn');

// モバイル判定
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
}

document.addEventListener('DOMContentLoaded', () => {
    // デスクトップかつFile System Access API対応の場合のみフォルダボタンを表示
    if ('showDirectoryPicker' in window && !isMobileDevice()) {
        selectFolderBtn.classList.remove('hidden');
        selectFolderBtn.classList.add('flex');
    }

    // テーマ・言語の初期化
    initTheme();
    initLanguage();
});

// --- イベントリスナー ---

selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    handleFileSelection(e.target.files);
    fileInput.value = ''; // 同じファイルを再度選択できるようにリセット
});
clearAllBtn.addEventListener('click', clearAllFiles);
selectFolderBtn.addEventListener('click', handleFolderSelection);
setupDropZone(dropArea, handleDrop);
convertBtn.addEventListener('click', handleConvertButtonClick);
cancelPreviewBtn.addEventListener('click', () => previewModal.classList.add('hidden'));
closePreviewBtn.addEventListener('click', () => previewModal.classList.add('hidden'));
confirmConvertBtn.addEventListener('click', () => {
    previewModal.classList.add('hidden');
    startBatchProcess();
});
reprocessBtn.addEventListener('click', () => {
    selectedFiles = failedFiles;
    failedFiles = [];
    failedFilesSection.classList.add('hidden');
    startBatchProcess();
});

// --- 用紙サイズ選択のラジオボタン制御 ---
const orientationSelector = document.getElementById('orientation-selector');
const paperSizeRadios = document.querySelectorAll('input[name="paper-size"]');

paperSizeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.value === 'auto') {
            orientationSelector.classList.add('hidden');
        } else {
            orientationSelector.classList.remove('hidden');
        }
    });
});

// ヘルパー関数: 選択された用紙サイズ値を取得
function getSelectedPaperSize() {
    const sizeRadio = document.querySelector('input[name="paper-size"]:checked');
    if (!sizeRadio || sizeRadio.value === 'auto') {
        return 'auto';
    }
    const orientationRadio = document.querySelector('input[name="paper-orientation"]:checked');
    return `${sizeRadio.value}-${orientationRadio.value}`;
}

// --- 関数定義 ---

function getVisualSize(page) {
    const size = page.getSize();
    const rotation = page.getRotation().angle;
    if (rotation % 180 === 90) {
        return { width: size.height, height: size.width };
    }
    return size;
}


async function handleFolderSelection() {
    if (!('showDirectoryPicker' in window)) {
        handleError(t('error.folder.nosupport')); return;
    }
    try {
        const dirHandle = await window.showDirectoryPicker();
        const filesWithPaths = await getFilesInDirectory(dirHandle);
        if (filesWithPaths.length > 0) {
            updateSelectedFiles(filesWithPaths, dirHandle);
        } else {
            handleError(t('error.folder.nopdf').replace('フォルダ', `フォルダ「${dirHandle.name}」`));
        }
    } catch (error) {
        if (error.name !== 'AbortError') handleError(t('error.folder.read'), error);
    }
}

function handleFileSelection(fileList) {
    if (isProcessing()) return;
    const pdfFiles = Array.from(fileList).filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
        if (selectedFiles.length === 0) handleError(t('error.nopdf'));
        return;
    }
    const filesToProcess = pdfFiles.map(f => ({ file: f, relativePath: f.name, id: crypto.randomUUID(), rotation: 0 }));
    // 既存のリストに追加（上書きではない）
    addFilesToList(filesToProcess);
}

function addFilesToList(newFiles) {
    if (isProcessing()) return;
    if (!acceptFiles([...selectedFiles, ...newFiles], handleError)) return;
    selectedFiles = [...selectedFiles, ...newFiles];
    renderFileList();
}

function removeFileFromList(fileId) {
    selectedFiles = selectedFiles.filter(f => f.id !== fileId);
    renderFileList();
}

function clearAllFiles() {
    selectedFiles = [];
    inputDirHandle = null;
    renderFileList();
}

async function handleDrop(dataTransfer) {
    if (dataTransfer.items && dataTransfer.items.length > 0 && typeof dataTransfer.items[0].webkitGetAsEntry === 'function') {
        const entry = dataTransfer.items[0].webkitGetAsEntry();
        if (entry.isDirectory) {
            try {
                const dirHandle = await navigator.storage.getDirectory();
                const dirHandleForDrop = await dirHandle.getDirectoryHandle(entry.fullPath.substring(1), { create: false });
                const filesWithPaths = await getFilesInDirectory(dirHandleForDrop);
                if (filesWithPaths.length > 0) {
                    updateSelectedFiles(filesWithPaths, dirHandleForDrop);
                } else {
                    handleError('ドロップされたフォルダにPDFファイルが見つかりませんでした。');
                }
                return;
            } catch (e) {
                log('フォルダのドラッグ＆ドロップは、ローカルサーバー経由での実行時に最も安定して動作します。');
            }
        }
    }
    handleFileSelection(dataTransfer.files);
}

async function getFilesInDirectory(dirHandle, path = '', budget = { count: 0, bytes: 0 }, depth = 0) {
    if (depth > 32) throw new Error(securityMessage('files'));
    const files = [];
    for await (const entry of dirHandle.values()) {
        const newPath = path ? `${path}/${entry.name}` : entry.name;
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
            const file = await entry.getFile();
            budget.count++; budget.bytes += file.size;
            if (budget.count > 50 || budget.bytes > PROCESSING_LIMITS.totalBytes || file.size > PROCESSING_LIMITS.fileBytes) throw new Error(securityMessage('files'));
            files.push({ file, relativePath: newPath });
        } else if (entry.kind === 'directory') {
            files.push(...await getFilesInDirectory(entry, newPath, budget, depth + 1));
        }
    }
    return files;
}

async function updateSelectedFiles(filesToProcess, dirHandle = null) {
    if (isProcessing()) return;
    if (!acceptFiles(filesToProcess, handleError)) return;
    selectedFiles = filesToProcess.map(f => ({ ...f, id: f.id || crypto.randomUUID(), rotation: f.rotation || 0 }));
    inputDirHandle = dirHandle;

    await renderFileList();
}

async function renderFileList() {
    const generation = ++listGeneration;
    const totalInputSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);

    if (selectedFiles.length === 1) {
        fileInfo.textContent = `${t('common.selected')}: ${selectedFiles[0].file.name} (${formatBytes(totalInputSize)})`;
    } else if (selectedFiles.length > 1) {
        fileInfo.textContent = `${selectedFiles.length}${t('common.files.selected')} (${t('common.total')} ${formatBytes(totalInputSize)})`;
    } else {
        fileInfo.textContent = '';
    }

    // ファイルリストヘッダーの表示/非表示
    if (selectedFiles.length > 0) {
        fileListHeader.classList.remove('hidden');
        fileListHeader.classList.add('flex');
    } else {
        fileListHeader.classList.add('hidden');
        fileListHeader.classList.remove('flex');
    }

    fileListContainer.innerHTML = '';

    if (selectedFiles.length > 0) {
        for (const fileObj of selectedFiles) {
            const li = document.createElement('li');
            li.className = 'bg-white dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm animate-fade-in group/item';

            const leftDiv = document.createElement('div');
            leftDiv.className = 'flex items-center gap-3 overflow-hidden';

            // アイコンプレースホルダー (サムネイル用)
            const iconDiv = document.createElement('div');
            iconDiv.className = 'w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-600 flex items-center justify-center flex-shrink-0 overflow-hidden relative border border-slate-200 dark:border-slate-500';

            // キャンバスを作成してサムネイルを表示
            const canvas = document.createElement('canvas');
            canvas.className = 'w-full h-full object-contain';
            iconDiv.appendChild(canvas);

            const textDiv = document.createElement('div');
            textDiv.className = 'truncate';
            textDiv.innerHTML = `<div class="font-medium text-slate-700 dark:text-slate-200 truncate" data-safe-0=""><span data-safe-1></span></div><div class="text-xs text-slate-500 dark:text-slate-400">${formatBytes(fileObj.file.size)}</div>`;
            textDiv.querySelector('[data-safe-0]').setAttribute('title', fileObj.relativePath);
            textDiv.querySelector('[data-safe-1]').textContent = fileObj.relativePath;

            leftDiv.appendChild(iconDiv);
            leftDiv.appendChild(textDiv);

            const rightDiv = document.createElement('div');
            rightDiv.className = 'flex-shrink-0 ml-4 flex items-center gap-3';

            // 向きの確認
            try {
                const arrayBuffer = await fileObj.file.arrayBuffer();
                const pdfDoc = await loadPdfSafely(arrayBuffer, {});
                if (generation !== listGeneration) return;
                if (pdfDoc.getPageCount() > 0) {
                    const firstPage = pdfDoc.getPage(0);
                    const visualSize = getVisualSize(firstPage);

                    // 手動回転を適用して表示サイズを計算
                    const totalRotation = (fileObj.rotation || 0);
                    const isRotated90or270 = totalRotation % 180 === 90;

                    // 90度または270度回転している場合は幅と高さを入れ替え
                    const effectiveWidth = isRotated90or270 ? visualSize.height : visualSize.width;
                    const effectiveHeight = isRotated90or270 ? visualSize.width : visualSize.height;

                    const isPortrait = effectiveHeight > effectiveWidth;

                    const badgeClass = isPortrait
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
                    const icon = isPortrait
                        ? '<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>'
                        : '<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h12a2 2 0 012 2z" /></svg>';

                    // 回転ボタン
                    const rotateBtn = document.createElement('button');
                    rotateBtn.className = 'p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors';
                    rotateBtn.title = '90度回転';
                    rotateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>`;
                    rotateBtn.onclick = (e) => {
                        e.stopPropagation();
                        fileObj.rotation = ((fileObj.rotation || 0) + 90) % 360;
                        renderFileList(); // バッジを更新するために再描画
                    };

                    // 削除ボタン
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-600 transition-colors';
                    removeBtn.title = t('status.remove');
                    removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
                    removeBtn.onclick = (e) => {
                        e.stopPropagation();
                        removeFileFromList(fileObj.id);
                    };

                    // 回転バッジ (回転されている場合)
                    let rotationBadge = '';
                    if (fileObj.rotation > 0) {
                        rotationBadge = `<span class="text-xs font-bold text-blue-600 dark:text-blue-400 mr-2">+${fileObj.rotation}°</span>`;
                    }

                    const badgeDiv = document.createElement('div');
                    badgeDiv.className = 'flex items-center';
                    badgeDiv.innerHTML = `${rotationBadge}<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}">${icon}${isPortrait ? t('status.portrait') : t('status.landscape')}</span>`;

                    rightDiv.appendChild(badgeDiv);
                    rightDiv.appendChild(rotateBtn);
                    rightDiv.appendChild(removeBtn);
                } else {
                    rightDiv.innerHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">${t('status.nopage')}</span>`;
                }
            } catch (e) {
                console.error(e);
                rightDiv.innerHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">${t('status.readerror')}</span>`;
            }

            li.appendChild(leftDiv);
            li.appendChild(rightDiv);
            if (generation !== listGeneration) return;
            fileListContainer.appendChild(li);
            // 非同期でサムネイル生成
            generateThumbnail(fileObj.file, canvas, fileObj.rotation || 0).catch(err => {
                console.error('Thumbnail generation failed:', err);
                iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>';
            });


        }
    }

    convertBtn.disabled = selectedFiles.length === 0;
    hideError();
}

function handleConvertButtonClick() {
    if (selectedFiles.length === 0) return;

    if (enablePreviewCheckbox.checked) {
        showPreview();
    } else {
        startBatchProcess();
    }
}

async function showPreview() {
    return withProcessingLock(() => showPreviewTask());
}

async function showPreviewTask() {
    if (selectedFiles.length === 0) return;
    previewModal.classList.remove('hidden');

    // キャンバスのコンテキスト取得とクリア
    const canvas = previewCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ローディング表示（簡易的）
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('Generating Preview...', canvas.width / 2, canvas.height / 2); // この部分はcanvas内の描画なので英語のままで良いか、t()を入れるか。プレビューなので英語で良いかもだが、一応残すか。一旦このままにする。

    const [cols, rows] = document.getElementById('layout').value.split('x').map(Number);
    const margin = parseFloat(document.getElementById('margin').value) * MM_TO_PT;
    const gutter = parseFloat(document.getElementById('gutter').value) * MM_TO_PT;
    const manualRotation = parseInt(document.getElementById('manual-rotate').value, 10);

    // 必要なページ数 (1シート分)
    const maxPages = cols * rows;

    // ページ情報を収集
    let pagesToRender = [];
    const previewDocuments = [];
    try {
    let cellWidth = 0;
    let cellHeight = 0;
    let firstPageFound = false;

    for (const fileObj of selectedFiles) {
        if (pagesToRender.length >= maxPages) break;
        try {
            const arrayBuffer = await fileObj.file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ isEvalSupported: false, data: arrayBuffer }).promise;
            previewDocuments.push(pdf);
            const numPages = pdf.numPages;

            for (let i = 1; i <= numPages; i++) {
                if (pagesToRender.length >= maxPages) break;

                const page = await pdf.getPage(i);

                // 個別回転を考慮したビューポートを取得
                // pdf.jsのrotationは90度単位。fileObj.rotationも90度単位と仮定。
                const fileRotation = fileObj.rotation || 0;
                // 元のページの回転 + 個別回転
                const totalRotation = (page.rotate + fileRotation) % 360;

                // スケール1でビューポートを取得してサイズを確認
                const viewport = page.getViewport({ scale: 1, rotation: totalRotation });

                if (!firstPageFound) {
                    cellWidth = viewport.width;
                    cellHeight = viewport.height;
                    firstPageFound = true;
                }

                pagesToRender.push({
                    page: page,
                    viewport: viewport,
                    totalRotation: totalRotation
                });
            }
        } catch (e) {
            console.error("Preview load error for file " + fileObj.file.name, e);
        }
    }

    if (pagesToRender.length === 0) return;

    // 用紙サイズ定義 (mm)
    const PAPER_SIZES = {
        'a3': { width: 297, height: 420 },
        'a4': { width: 210, height: 297 },
        'b4': { width: 257, height: 364 },
        'b5': { width: 182, height: 257 }
    };

    // 出力用紙サイズの決定
    const paperSizeValue = getSelectedPaperSize();
    let newPageWidth, newPageHeight;

    if (paperSizeValue === 'auto') {
        // 自動モード: 元PDFサイズ × グリッド数
        newPageWidth = (cellWidth * cols) + (gutter * (cols - 1)) + (margin * 2);
        newPageHeight = (cellHeight * rows) + (gutter * (rows - 1)) + (margin * 2);
    } else {
        // 指定サイズモード
        const [size, orientation] = paperSizeValue.split('-');
        const paperSize = PAPER_SIZES[size];

        if (orientation === 'landscape') {
            newPageWidth = paperSize.height * MM_TO_PT;
            newPageHeight = paperSize.width * MM_TO_PT;
        } else {
            newPageWidth = paperSize.width * MM_TO_PT;
            newPageHeight = paperSize.height * MM_TO_PT;
        }

        // セルサイズを逆算
        cellWidth = (newPageWidth - margin * 2 - gutter * (cols - 1)) / cols;
        cellHeight = (newPageHeight - margin * 2 - gutter * (rows - 1)) / rows;
    }

    checkPixels(newPageWidth, newPageHeight);

    canvas.width = newPageWidth;
    canvas.height = newPageHeight;

    // 背景白塗り
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 描画ループ
    for (let i = 0; i < pagesToRender.length; i++) {
        const item = pagesToRender[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + col * (cellWidth + gutter);
        const y = margin + row * (cellHeight + gutter);

        // セル領域の描画 (デバッグ用枠線)
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellWidth, cellHeight);

        // 描画用の一時キャンバスを作成
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // 自動回転ロジック (簡易版: アスペクト比が基準と異なる場合に90度回転)
        let renderRotation = item.totalRotation;
        let renderViewport = item.viewport;

        if (autoRotateCheckbox.checked) {
            const isCellPortrait = cellHeight > cellWidth;
            const isPagePortrait = renderViewport.height > renderViewport.width;

            if (isCellPortrait !== isPagePortrait) {
                // 向きが合わない場合、90度回転させる
                renderRotation = (renderRotation + 90) % 360;
                renderViewport = item.page.getViewport({ scale: 1, rotation: renderRotation });
            }
        }

        // 手動回転の適用 (表示上の回転)
        if (manualRotation > 0) {
            renderRotation = (renderRotation + manualRotation) % 360;
            renderViewport = item.page.getViewport({ scale: 1, rotation: renderRotation });
        }

        // セルに収まるようにスケール計算
        const scaleX = cellWidth / renderViewport.width;
        const scaleY = cellHeight / renderViewport.height;
        const scale = Math.min(scaleX, scaleY);

        // 最終的な描画用ビューポート
        const finalViewport = item.page.getViewport({ scale: scale, rotation: renderRotation });

        checkPixels(finalViewport.width, finalViewport.height);

        tempCanvas.width = finalViewport.width;
        tempCanvas.height = finalViewport.height;

        const renderContext = {
            canvasContext: tempCtx,
            viewport: finalViewport
        };

        await pdfjsLib.renderPage(item.page, renderContext);

        // メインキャンバスに転送 (中央寄せ)
        const drawX = x + (cellWidth - finalViewport.width) / 2;
        const drawY = y + (cellHeight - finalViewport.height) / 2;

        ctx.drawImage(tempCanvas, drawX, drawY);
        tempCanvas.width = tempCanvas.height = 0;
    }
    } catch (error) { handleError(error.message); }
    finally { await Promise.all(previewDocuments.map(doc => doc.destroy())); }
}



function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    logArea.textContent += `[${timestamp}] ${message}\n`;
    logArea.scrollTop = logArea.scrollHeight;
}

function updateProgress(percentage) {
    const p = Math.round(percentage);
    progressBar.style.width = `${p}%`;
    // プログレスバーのテキストを削除して見た目をすっきりさせる
}

function showProgress() {
    progressSection.classList.remove('hidden');
    failedFilesSection.classList.add('hidden');
    logArea.textContent = '';
    progressDetails.textContent = '';
    updateProgress(0);
}

function handleError(message, error = null) {
    errorMessage.textContent = message;
    errorBox.classList.remove('hidden');
    if (error) console.error(error);
    log(`${t('common.log')}: ${message}`);
    convertBtn.disabled = false;
}

function hideError() {
    errorBox.classList.add('hidden');
}

async function createNupPdfBytes(fileObject) {
    const { file, rotation: fileRotation } = fileObject;
    const layoutValue = document.getElementById('layout').value;
    const [cols, rows] = layoutValue.split('x').map(Number);
    const margin = parseFloat(document.getElementById('margin').value) * MM_TO_PT;
    const gutter = parseFloat(document.getElementById('gutter').value) * MM_TO_PT;

    const fileBuffer = await file.arrayBuffer();

    // ignoreEncryption: true で、オーナーパスワードのみのPDFも処理可能に
    // (ユーザーパスワードが必要なPDFはエラーになる)
    let srcPdf;
    try {
        srcPdf = await loadPdfSafely(fileBuffer, {});
    } catch (loadError) {
        if (loadError.message.includes('encrypted') || loadError.message.includes('password')) {
            throw new Error(t('error.encrypted'));
        }
        throw loadError;
    }

    const pages = srcPdf.getPages();

    // 1. 個別ファイル回転の適用
    if (fileRotation && fileRotation > 0) {
        for (const page of pages) {
            page.setRotation(degrees(page.getRotation().angle + fileRotation));
        }
    }

    // 2. 自動回転の適用 (向きの統一)
    if (autoRotateCheckbox.checked && pages.length > 0) {
        const firstPageSize = getVisualSize(pages[0]);
        const isFirstPagePortrait = firstPageSize.height > firstPageSize.width;

        for (const page of pages) {
            const size = getVisualSize(page);
            const isCurrentPagePortrait = size.height > size.width;
            if (isFirstPagePortrait !== isCurrentPagePortrait) {
                page.setRotation(degrees(page.getRotation().angle + 90));
            }
        }
    }

    const manualRotation = parseInt(document.getElementById('manual-rotate').value, 10);

    // 手動回転が設定されている場合は適用
    if (manualRotation > 0) {
        for (const page of pages) {
            page.setRotation(degrees(page.getRotation().angle + manualRotation));
        }
    }

    const pageCount = srcPdf.getPageCount();
    log(`  ${t('progress.pages').replace('ページのPDFを生成しました。', '')} ${pageCount}`); // ここは少し変則的だが、元の意味は「元のページ数: count」なので、tを使わずに英語化するか、汎用的なログ文言にする。
    // translations.jsには 'progress.pages': 'ページのPDFを生成しました。' があるが、これは完了時のメッセージ用。
    // 'original page count' のようなキーがないので、一旦英語で固定するか、キーを追加する。
    // 今回はキーを追加せずに、英語で統一するか、日本語のままにするか...
    // ユーザー要望の「1→この辺も英語にはなりませんよ」はUIの主要部分。ログも気にするなら修正。
    // ログは common.log で「ログ」とはなっているが、内容も翻訳すべき。
    // ここは一旦英語化してしまうのが安全。または t() でラップして対応。
    // translations.js にキーがないので、t()内でデフォルト英語、第二引数日本語とするようなヘルパーではないので、
    // 新規キーなしで直書き対応する。
    // "Pages: ${pageCount}" とシンプルにする。

    const newPdf = await PDFDocument.create();
    const embeddedPages = await newPdf.embedPages(srcPdf.getPages());

    // 最初のページの表示サイズを取得
    // (自動回転と手動回転が適用された後のサイズ)
    const firstPageVisualSize = getVisualSize(pages[0]);

    // 用紙サイズ定義 (mm)
    const PAPER_SIZES = {
        'a3': { width: 297, height: 420 },
        'a4': { width: 210, height: 297 },
        'b4': { width: 257, height: 364 },
        'b5': { width: 182, height: 257 }
    };

    // 出力用紙サイズの決定
    const paperSizeValue = getSelectedPaperSize();
    let newPageWidth, newPageHeight, cellWidth, cellHeight;

    if (paperSizeValue === 'auto') {
        // 自動モード: 元PDFサイズ × グリッド数（従来の動作）
        cellWidth = firstPageVisualSize.width;
        cellHeight = firstPageVisualSize.height;
        newPageWidth = (cellWidth * cols) + (gutter * (cols - 1)) + (margin * 2);
        newPageHeight = (cellHeight * rows) + (gutter * (rows - 1)) + (margin * 2);
    } else {
        // 指定サイズモード: 用紙サイズからセルサイズを逆算
        const [size, orientation] = paperSizeValue.split('-');
        const paperSize = PAPER_SIZES[size];

        if (orientation === 'landscape') {
            newPageWidth = paperSize.height * MM_TO_PT;
            newPageHeight = paperSize.width * MM_TO_PT;
        } else {
            newPageWidth = paperSize.width * MM_TO_PT;
            newPageHeight = paperSize.height * MM_TO_PT;
        }

        // セルサイズを逆算（出力サイズから余白・溝を引いてグリッドで割る）
        cellWidth = (newPageWidth - margin * 2 - gutter * (cols - 1)) / cols;
        cellHeight = (newPageHeight - margin * 2 - gutter * (rows - 1)) / rows;
    }

    for (let i = 0; i < pageCount; i++) {
        const pageIndexInSheet = i % (cols * rows);
        if (pageIndexInSheet === 0) newPdf.addPage([newPageWidth, newPageHeight]);
        const currentPage = newPdf.getPage(newPdf.getPageCount() - 1);
        const col = pageIndexInSheet % cols;
        const row = Math.floor(pageIndexInSheet / cols);

        // セルの位置 (セルの左上)
        const cellX = margin + col * (cellWidth + gutter);
        const cellY = newPageHeight - margin - (row + 1) * cellHeight - row * gutter;

        // ページの埋め込み
        const embeddedPage = embeddedPages[i];

        // embedPages() はページの /Rotate をXObjectのMatrixに適用するため、
        // embeddedPage.width / .height はすでに「表示上の」寸法になっている。
        // そのため、回転に基づく width/height の入れ替えは不要。
        let visualW = embeddedPage.width;
        let visualH = embeddedPage.height;
        let extraRotation = 0;

        // 自動回転: ページの向きがセルと合わない場合、追加で90度回転
        if (document.getElementById('auto-rotate').checked) {
            const isCellPortrait = cellHeight > cellWidth;
            const isPagePortrait = visualH > visualW;
            if (isCellPortrait !== isPagePortrait) {
                extraRotation = 90;
                [visualW, visualH] = [visualH, visualW];
            }
        }

        const scale = Math.min(cellWidth / visualW, cellHeight / visualH);
        const drawnW = embeddedPage.width * scale;
        const drawnH = embeddedPage.height * scale;

        // 追加回転後の表示寸法
        const drawnVisualW = extraRotation === 90 ? drawnH : drawnW;
        const drawnVisualH = extraRotation === 90 ? drawnW : drawnH;

        // セル内に中央配置
        const x = cellX + (cellWidth - drawnVisualW) / 2;
        const y = cellY + (cellHeight - drawnVisualH) / 2;

        // 90度回転時は原点を視覚ボックスの右下に調整
        const drawX = extraRotation === 90 ? x + drawnVisualW : x;
        const drawY = y;

        const drawOpts = { x: drawX, y: drawY, width: drawnW, height: drawnH };
        if (extraRotation > 0) drawOpts.rotate = degrees(extraRotation);
        currentPage.drawPage(embeddedPage, drawOpts);
        updateProgress(((i + 1) / pageCount) * 100);
    }

    log(`  ${t('progress.generating')}`);
    const bytes = await newPdf.save();
    checkOutputBytes(bytes.length);
    return bytes;
}

async function startBatchProcess() {
    return withProcessingLock(() => startBatchProcessTask());
}

async function startBatchProcessTask() {
    if (selectedFiles.length === 0) {
        handleError(t('error.nofile')); return;
    }
    showProgress();
    hideError();
    convertBtn.disabled = true;
    let totalOutputSize = 0;
    const startTime = Date.now();

    const processFile = async (fileObject, index, outputDirHandle = null) => {
        const fileNumber = index + 1;
        const totalFiles = selectedFiles.length;
        log(`---`);
        log(`[${fileNumber}/${totalFiles}] "${fileObject.relativePath}" ${t('progress.processing')}`);
        updateProgress(0);

        try {
            const newPdfBytes = await createNupPdfBytes(fileObject);
            totalOutputSize += newPdfBytes.length;

            if (outputDirHandle) {
                await savePdfToFile(newPdfBytes, fileObject, outputDirHandle);
            } else {
                await downloadPdf(newPdfBytes, fileObject);
            }
        } catch (error) {
            let userMessage = `"${fileObject.file.name}" ${t('error.loadfailed') || 'failed to load.'}`;

            // エラーメッセージに応じたわかりやすい説明
            if (error.message.includes('Unknown compression method') || error.message.includes('flate stream')) {
                userMessage += t('error.compression');
            } else if (error.message.includes('I/O read operation failed')) {
                userMessage += t('error.ioread');
            } else if (error.message.includes('encrypted') || error.message.includes('password')) {
                userMessage += t('error.encrypted');
            } else if (error.message.includes('Invalid PDF')) {
                userMessage += t('error.invalid');
            } else {
                userMessage += error.message;
            }

            handleError(userMessage, error);
            failedFiles.push(fileObject);
        }

        const elapsedTime = Date.now() - startTime;
        const avgTimePerFile = elapsedTime / fileNumber;
        const remainingFiles = totalFiles - fileNumber;
        const etr = remainingFiles * avgTimePerFile;
        progressDetails.textContent = `${t('progress.processing')}: ${fileNumber} / ${totalFiles} ${t('progress.files')} | ${t('progress.remaining')}: ${formatTime(etr)}`;
    };

    if (inputDirHandle) {
        try {
            const outputFolderName = `${inputDirHandle.name}_N-up`; // フォルダ名は英語固定にするか、そのままにするか。面付け→N-up
            log(`Creating output folder "${outputFolderName}"...`);
            const outputDirHandle = await inputDirHandle.getDirectoryHandle(outputFolderName, { create: true });
            for (let i = 0; i < selectedFiles.length; i++) {
                await processFile(selectedFiles[i], i, outputDirHandle);
            }
        } catch (error) {
            handleError(t('error.folder.read'), error); // 正確なキーがないので代用
        }
    } else {
        for (let i = 0; i < selectedFiles.length; i++) {
            await processFile(selectedFiles[i], i);
        }
    }

    log(`---`);
    log(t('progress.all.done'));
    const totalInputSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);
    progressDetails.textContent = `${t('progress.done')} ${t('progress.total.input')}: ${formatBytes(totalInputSize)} → ${t('progress.total.output')}: ${formatBytes(totalOutputSize)}`;
    convertBtn.disabled = false;

    if (failedFiles.length > 0) {
        renderFailedFiles();
    }
}

async function savePdfToFile(bytes, fileObject, outputDirHandle) {
    const { file, relativePath } = fileObject;
    const layoutValue = document.getElementById('layout').value;
    const suffix = `_${layoutValue}.pdf`;
    const newFileName = file.name.replace(/\.pdf$/i, '') + suffix;
    const pathParts = relativePath.split('/');
    pathParts.pop();
    let currentDirHandle = outputDirHandle;
    for (const part of pathParts) {
        currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: true });
    }
    log(`  Saving file: ${[outputDirHandle.name, ...pathParts, newFileName].join('/')}`);
    const fileHandle = await currentDirHandle.getFileHandle(newFileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(bytes);
    await writable.close();
    log(`  Saved.`);
}

async function downloadPdf(bytes, fileObject) {
    const { file } = fileObject;
    const layoutValue = document.getElementById('layout').value;
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = `_${layoutValue}.pdf`;
    a.download = file.name.replace(/\.pdf$/i, '') + suffix;
    document.body.appendChild(a);
    a.click();
    log(`  Downloading "${a.download}"...`);
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

async function generateThumbnail(file, canvas, rotation) {
    return pdfjsLib.renderThumbnail(file, canvas, { width: 128, rotation });
}

function renderFailedFiles() {
    failedFilesSection.classList.remove('hidden');
    failedFilesList.innerHTML = '';
    for (const fileObject of failedFiles) {
        const li = document.createElement('li');
        li.className = 'bg-red-50 dark:bg-red-900/30 p-3 rounded-lg text-red-700 dark:text-red-200 border border-red-100 dark:border-red-800 flex items-center';
        li.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg> <span data-safe-0></span>`;
        li.querySelector('[data-safe-0]').textContent = fileObject.relativePath;
        failedFilesList.appendChild(li);
    }
}
