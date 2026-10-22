import * as pdfjsLib from './pdf-runtime.mjs';

const { PDFDocument } = PDFLib;

// DOM要素
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const selectFileBtn = document.getElementById('select-file-btn');
const fileInfo = document.getElementById('file-info');
const fileListHeader = document.getElementById('file-list-header');
const fileListContainer = document.getElementById('file-list-container');
const clearAllBtn = document.getElementById('clear-all-btn');
const mergeBtn = document.getElementById('merge-btn');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressDetails = document.getElementById('progress-details');
const errorBox = document.getElementById('error-box');
const errorMessage = document.getElementById('error-message');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIconSun = document.getElementById('theme-icon-sun');
const themeIconMoon = document.getElementById('theme-icon-moon');
const outputFilenameInput = document.getElementById('output-filename');
const addOutlinesCheckbox = document.getElementById('add-outlines');
const groupByFileCheckbox = document.getElementById('group-by-file');
const groupByFileOption = document.getElementById('group-by-file-option');
const outlineEditorSection = document.getElementById('outline-editor-section');
const outlineEditorList = document.getElementById('outline-editor-list');
const outlineEditorEmpty = document.getElementById('outline-editor-empty');
const downloadNoOutlineBtn = document.getElementById('download-no-outline-btn');
const downloadWithOutlineBtn = document.getElementById('download-with-outline-btn');

let selectedFiles = [];
let draggedItem = null;

// ステップ5用：結合済みPDFとアウトラインデータを保持
let pendingMergedPdf = null;
let pendingOutlineData = [];
let editFlatItems = []; // [{id, title, pageIndex, depth}]
let outlineDragSrcIndex = null;

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguage();
});

// メインのアウトラインチェックが変わったらサブオプションを表示/非表示
addOutlinesCheckbox.addEventListener('change', () => {
    groupByFileOption.style.display = addOutlinesCheckbox.checked ? '' : 'none';
});

downloadNoOutlineBtn.addEventListener('click', () => finalizeAndDownload(false));
downloadWithOutlineBtn.addEventListener('click', () => finalizeAndDownload(true));
document.getElementById('sort-natural-btn').addEventListener('click', sortOutlineByNatural);
document.getElementById('sort-page-btn').addEventListener('click', sortOutlineByPage);
document.getElementById('auto-nest-btn').addEventListener('click', autoNestOutline);
document.getElementById('flatten-all-btn').addEventListener('click', flattenOutline);

// --- イベントリスナー ---
selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    handleFileSelection(e.target.files);
    fileInput.value = '';
});
clearAllBtn.addEventListener('click', clearAllFiles);
mergeBtn.addEventListener('click', mergePdfs);

setupDropZone(dropArea, (dt) => handleFileSelection(dt.files));

// --- ファイル操作 ---
function handleFileSelection(fileList) {
    if (!acceptFiles([...selectedFiles, ...Array.from(fileList)], showError)) return;
    const pdfFiles = Array.from(fileList).filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
        if (selectedFiles.length === 0) showError(t('error.nopdf'));
        return;
    }
    const newFiles = pdfFiles.map(f => ({
        file: f,
        name: f.name,
        id: crypto.randomUUID()
    }));
    selectedFiles = [...selectedFiles, ...newFiles];
    renderFileList();
}

function removeFile(id) {
    selectedFiles = selectedFiles.filter(f => f.id !== id);
    renderFileList();
}

function clearAllFiles() {
    selectedFiles = [];
    renderFileList();
}

function generateOutputFilename() {
    if (selectedFiles.length === 0) {
        return 'merged';
    }

    // ファイル名から.pdfを除去
    const getBaseName = (name) => name.replace(/\.pdf$/i, '');

    if (selectedFiles.length === 1) {
        return getBaseName(selectedFiles[0].name) + '_merged';
    }

    // 最初と最後のファイル名を使用
    const firstName = getBaseName(selectedFiles[0].name);
    const lastName = getBaseName(selectedFiles[selectedFiles.length - 1].name);

    // 同じ名前の場合は1つだけ
    if (firstName === lastName) {
        return firstName + '_merged';
    }

    return firstName + '-' + lastName + '_merged';
}

function updateOutputFilename() {
    outputFilenameInput.value = generateOutputFilename();
}

async function renderFileList() {
    const totalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);

    if (selectedFiles.length === 0) {
        fileInfo.textContent = '';
        fileListHeader.classList.add('hidden');
    } else if (selectedFiles.length === 1) {
        fileInfo.textContent = `${t('common.selected')}: ${selectedFiles[0].name} (${formatBytes(totalSize)})`;
        fileListHeader.classList.remove('hidden');
        fileListHeader.classList.add('flex');
    } else {
        fileInfo.textContent = `${selectedFiles.length}${t('common.files.selected')} (${t('common.total')} ${formatBytes(totalSize)})`;
        fileListHeader.classList.remove('hidden');
        fileListHeader.classList.add('flex');
    }

    // 出力ファイル名を自動更新
    updateOutputFilename();

    fileListContainer.innerHTML = '';

    for (let i = 0; i < selectedFiles.length; i++) {
        const fileObj = selectedFiles[i];
        const li = document.createElement('li');
        li.className = 'bg-white dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm animate-fade-in cursor-move';
        li.draggable = true;
        li.dataset.id = fileObj.id;

        // ドラッグイベント
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);

        const leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center gap-3 overflow-hidden';

        // 順番表示
        const orderBadge = document.createElement('span');
        orderBadge.className = 'flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center';
        orderBadge.textContent = i + 1;

        // サムネイル
        const thumbDiv = document.createElement('div');
        thumbDiv.className = 'w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-600 flex items-center justify-center flex-shrink-0 overflow-hidden';
        const canvas = document.createElement('canvas');
        canvas.className = 'w-full h-full object-contain';
        thumbDiv.appendChild(canvas);
        generateThumbnail(fileObj.file, canvas);

        // ファイル名
        const nameDiv = document.createElement('div');
        nameDiv.className = 'truncate';
        nameDiv.innerHTML = `<div class="font-medium text-slate-700 dark:text-slate-200 truncate"><span data-safe-0></span></div><div class="text-xs text-slate-500 dark:text-slate-400">${formatBytes(fileObj.file.size)}</div>`;
        nameDiv.querySelector('[data-safe-0]').textContent = fileObj.name;

        leftDiv.appendChild(orderBadge);
        leftDiv.appendChild(thumbDiv);
        leftDiv.appendChild(nameDiv);

        // 削除ボタン
        const removeBtn = document.createElement('button');
        removeBtn.className = 'p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-600 transition-colors flex-shrink-0';
        removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeFile(fileObj.id);
        };

        li.appendChild(leftDiv);
        li.appendChild(removeBtn);
        fileListContainer.appendChild(li);
    }

    mergeBtn.disabled = selectedFiles.length < 2;
    hideError();
}

// --- ドラッグ&ドロップ並び替え ---
function handleDragStart(e) {
    draggedItem = e.target;
    e.target.classList.add('opacity-50');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('li');
    if (target && target !== draggedItem) {
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
            target.parentNode.insertBefore(draggedItem, target);
        } else {
            target.parentNode.insertBefore(draggedItem, target.nextSibling);
        }
    }
}

function handleDrop(e) {
    e.preventDefault();
    updateOrderFromDOM();
}

function handleDragEnd(e) {
    e.target.classList.remove('opacity-50');
    draggedItem = null;
    updateOrderFromDOM();
}

function updateOrderFromDOM() {
    const items = fileListContainer.querySelectorAll('li');
    const newOrder = [];
    items.forEach(item => {
        const id = item.dataset.id;
        const file = selectedFiles.find(f => f.id === id);
        if (file) newOrder.push(file);
    });
    selectedFiles = newOrder;
    renderFileList();
}

// --- サムネイル生成 ---
async function generateThumbnail(file, canvas) {
    let pdf;
    try {
        const arrayBuffer = await file.arrayBuffer();
        pdf = await pdfjsLib.getDocument({ isEvalSupported: false, data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.2 });
        checkPixels(viewport.width, viewport.height);
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        }).promise;
    } catch (err) {
        console.error('Thumbnail error:', err);
    } finally { await pdf?.destroy(); }
}

// --- PDF結合 ---
async function mergePdfs() {
    if (selectedFiles.length < 2) return;

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressDetails.textContent = t('progress.merging');
    mergeBtn.disabled = true;
    hideError();

    try {
        const mergedPdf = await PDFDocument.create();
        const total = selectedFiles.length;
        const outlineData = []; // ブックマーク情報を収集

        for (let i = 0; i < total; i++) {
            const fileObj = selectedFiles[i];
            progressDetails.textContent = `${t('progress.processing')}: ${i + 1} / ${total} - ${fileObj.name}`;

            const arrayBuffer = await fileObj.file.arrayBuffer();
            let srcPdf;
            try {
                srcPdf = await loadPdfSafely(arrayBuffer, {});
            } catch (loadError) {
                throw new Error(`"${fileObj.name}" ${t('error.loadfailed')}`);
            }

            // 現在のページ数を記録（このファイルの開始ページ）
            const startPageIndex = mergedPdf.getPageCount();
            checkPageCount(startPageIndex + srcPdf.getPageCount());

            // ファイル名からブックマークタイトルを作成（.pdf を除去）
            const bookmarkTitle = fileObj.name.replace(/\.pdf$/i, '');

            // 既存アウトラインを抽出してページオフセットを適用
            const existingOutline = await extractExistingOutline(arrayBuffer.slice(0));
            const offsetItems = existingOutline ? applyOffset(existingOutline, startPageIndex) : [];

            if (groupByFileCheckbox.checked) {
                // オプトイン：ファイル名を親にして既存アウトラインを子にまとめる
                outlineData.push({ title: bookmarkTitle, pageIndex: startPageIndex, children: offsetItems });
            } else {
                // デフォルト：既存アウトラインをそのままフラットに追加
                if (offsetItems.length > 0) {
                    outlineData.push(...offsetItems);
                } else {
                    // アウトラインがないファイルはファイル名でブックマークを作成
                    outlineData.push({ title: bookmarkTitle, pageIndex: startPageIndex, children: [] });
                }
            }

            const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));

            progressBar.style.width = `${((i + 1) / total) * 100}%`;
        }

        progressDetails.textContent = `${t('progress.done')} ${mergedPdf.getPageCount()}${t('progress.pages')}`;

        // 結合結果とアウトラインデータを保持してステップ5へ
        pendingMergedPdf = mergedPdf;
        pendingOutlineData = addOutlinesCheckbox.checked ? outlineData : [];
        showOutlineEditor();

    } catch (error) {
        showError(error.message);
    }

    mergeBtn.disabled = false;
}

// --- エラー表示 ---
function showError(message) {
    errorMessage.textContent = message;
    errorBox.classList.remove('hidden');
}

function hideError() {
    errorBox.classList.add('hidden');
}

// ================================================================
// アウトラインエディタ（ステップ5）
// ================================================================

// ツリー → フラット配列
function treeToFlat(items, depth = 0) {
    const result = [];
    for (const item of items) {
        result.push({ id: crypto.randomUUID(), title: item.title, pageIndex: item.pageIndex, depth });
        if (item.children && item.children.length > 0) {
            result.push(...treeToFlat(item.children, depth + 1));
        }
    }
    return result;
}

// フラット配列 → ツリー
function flatToTree(flatItems) {
    const root = [];
    const stack = [{ node: { children: root }, depth: -1 }];
    for (const item of flatItems) {
        while (stack.length > 1 && stack[stack.length - 1].depth >= item.depth) stack.pop();
        const node = { title: item.title, pageIndex: item.pageIndex, children: [] };
        stack[stack.length - 1].node.children.push(node);
        stack.push({ node, depth: item.depth });
    }
    return root;
}

// アイテムindexから「そのアイテム＋子孫」のインデックス範囲を返す
function subtreeRange(flatItems, startIdx) {
    const depth = flatItems[startIdx].depth;
    let end = startIdx + 1;
    while (end < flatItems.length && flatItems[end].depth > depth) end++;
    return { start: startIdx, end }; // [start, end)
}

// --- 自動整理ボタン ---

function sortTreeNaturally(items) {
    items.sort((a, b) => a.title.localeCompare(b.title, 'ja', { numeric: true, sensitivity: 'base' }));
    items.forEach(item => sortTreeNaturally(item.children));
    return items;
}

function sortTreeByPage(items) {
    items.sort((a, b) => (a.pageIndex ?? Infinity) - (b.pageIndex ?? Infinity));
    items.forEach(item => sortTreeByPage(item.children));
    return items;
}

function detectDepthFromTitle(title) {
    // "1.2.3 Title" → ドットの数 = depth
    const dotNum = title.match(/^(\d+(?:\.\d+)+)\s/);
    if (dotNum) return (dotNum[1].match(/\./g) || []).length;
    // "1. Title" or "1 Title" → depth 0
    if (/^\d+[.\s]/.test(title)) return 0;
    // 日本語: 章→0, 節→1, 項→2
    if (/^第?\d+章/.test(title)) return 0;
    if (/^第?\d+節/.test(title)) return 1;
    if (/^第?\d+項/.test(title)) return 2;
    // 漢数字
    if (/^[一二三四五六七八九十百]+章/.test(title)) return 0;
    if (/^[一二三四五六七八九十百]+節/.test(title)) return 1;
    // (1) (1.1) スタイル
    const paren = title.match(/^\((\d+(?:\.\d+)*)\)/);
    if (paren) return (paren[1].match(/\./g) || []).length;
    return null;
}

function sortOutlineByNatural() {
    const tree = flatToTree(editFlatItems);
    sortTreeNaturally(tree);
    editFlatItems = treeToFlat(tree);
    renderOutlineEditor();
}

function sortOutlineByPage() {
    const tree = flatToTree(editFlatItems);
    sortTreeByPage(tree);
    editFlatItems = treeToFlat(tree);
    renderOutlineEditor();
}

function autoNestOutline() {
    editFlatItems = editFlatItems.map(item => {
        const detected = detectDepthFromTitle(item.title);
        return detected !== null ? { ...item, depth: detected } : item;
    });
    renderOutlineEditor();
}

function flattenOutline() {
    editFlatItems = editFlatItems.map(item => ({ ...item, depth: 0 }));
    renderOutlineEditor();
}

function showOutlineEditor() {
    editFlatItems = treeToFlat(pendingOutlineData);
    outlineEditorSection.classList.remove('hidden');
    outlineEditorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderOutlineEditor();
}

function renderOutlineEditor() {
    outlineEditorList.innerHTML = '';

    if (editFlatItems.length === 0) {
        outlineEditorList.classList.add('hidden');
        outlineEditorEmpty.classList.remove('hidden');
        downloadWithOutlineBtn.disabled = true;
        downloadWithOutlineBtn.classList.add('opacity-50', 'cursor-not-allowed');
        return;
    }

    outlineEditorList.classList.remove('hidden');
    outlineEditorEmpty.classList.add('hidden');
    downloadWithOutlineBtn.disabled = false;
    downloadWithOutlineBtn.classList.remove('opacity-50', 'cursor-not-allowed');

    editFlatItems.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'flex items-center gap-1 p-2 rounded-xl bg-white dark:bg-slate-700/60 border border-slate-100 dark:border-slate-700 group hover:border-emerald-300 dark:hover:border-emerald-700 transition-all';
        li.draggable = true;
        li.dataset.idx = idx;
        li.style.marginLeft = `${item.depth * 24}px`;

        li.innerHTML = `
            <span class="outline-drag-handle cursor-grab text-slate-300 dark:text-slate-500 hover:text-slate-500 px-1 flex-shrink-0 select-none text-base leading-none" title="ドラッグで並び替え">⠿</span>
            <button class="outdent-btn flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors ${item.depth === 0 ? 'opacity-30 cursor-not-allowed' : ''}" title="一段上げる" ${item.depth === 0 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button class="indent-btn flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}" title="一段下げる" ${idx === 0 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            <span class="outline-title flex-1 text-sm text-slate-700 dark:text-slate-200 truncate cursor-pointer px-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors" title="クリックして編集">${escapeHtml(item.title)}</span>
            <span class="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400">${item.pageIndex !== null ? 'p' + (item.pageIndex + 1) : '—'}</span>
            <button class="delete-btn flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="削除">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        `;

        // タイトル編集（クリック）
        const titleEl = li.querySelector('.outline-title');
        titleEl.addEventListener('click', () => startTitleEdit(titleEl, idx));

        // インデント/アウトデント
        li.querySelector('.outdent-btn').addEventListener('click', () => { outdentItem(idx); });
        li.querySelector('.indent-btn').addEventListener('click', () => { indentItem(idx); });

        // 削除
        li.querySelector('.delete-btn').addEventListener('click', () => { deleteOutlineItem(idx); });

        // ドラッグ
        li.addEventListener('dragstart', (e) => {
            outlineDragSrcIndex = idx;
            e.dataTransfer.effectAllowed = 'move';
            li.classList.add('opacity-50');
        });
        li.addEventListener('dragend', () => li.classList.remove('opacity-50'));
        li.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            if (outlineDragSrcIndex === null || outlineDragSrcIndex === idx) return;
            moveOutlineSubtree(outlineDragSrcIndex, idx);
            outlineDragSrcIndex = null;
        });

        outlineEditorList.appendChild(li);
    });
}

function startTitleEdit(titleEl, idx) {
    const current = editFlatItems[idx].title;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.className = 'flex-1 text-sm text-slate-700 dark:text-slate-200 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-400 rounded px-1 py-0 outline-none w-full min-w-0';
    titleEl.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
        editFlatItems[idx].title = input.value.trim() || current;
        renderOutlineEditor();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { editFlatItems[idx].title = current; renderOutlineEditor(); }
    });
}

function outdentItem(idx) {
    if (editFlatItems[idx].depth === 0) return;
    const { start, end } = subtreeRange(editFlatItems, idx);
    const delta = -1;
    for (let i = start; i < end; i++) editFlatItems[i].depth = Math.max(0, editFlatItems[i].depth + delta);
    renderOutlineEditor();
}

function indentItem(idx) {
    if (idx === 0) return;
    const maxDepth = editFlatItems[idx - 1].depth + 1;
    if (editFlatItems[idx].depth >= maxDepth) return;
    const { start, end } = subtreeRange(editFlatItems, idx);
    for (let i = start; i < end; i++) editFlatItems[i].depth++;
    renderOutlineEditor();
}

function deleteOutlineItem(idx) {
    const { start, end } = subtreeRange(editFlatItems, idx);
    editFlatItems.splice(start, end - start);
    renderOutlineEditor();
}

function moveOutlineSubtree(srcIdx, dstIdx) {
    const { start: sStart, end: sEnd } = subtreeRange(editFlatItems, srcIdx);
    const subtree = editFlatItems.splice(sStart, sEnd - sStart);

    // spliceで配列が縮んだのでdstを補正
    const adjustedDst = dstIdx > sStart ? dstIdx - (sEnd - sStart) : dstIdx;
    const insertAt = Math.max(0, Math.min(adjustedDst, editFlatItems.length));

    // 挿入先の深さに合わせてサブツリーの深さを調整
    const targetDepth = insertAt < editFlatItems.length ? editFlatItems[insertAt].depth : 0;
    const depthDelta = targetDepth - subtree[0].depth;
    if (depthDelta !== 0) {
        subtree.forEach(item => item.depth = Math.max(0, item.depth + depthDelta));
    }

    editFlatItems.splice(insertAt, 0, ...subtree);
    renderOutlineEditor();
}

async function finalizeAndDownload(useOutline) {
    if (!pendingMergedPdf) return;

    downloadNoOutlineBtn.disabled = true;
    downloadWithOutlineBtn.disabled = true;

    try {
        if (useOutline && editFlatItems.length > 0) {
            const treeData = flatToTree(editFlatItems);
            await addOutlinesToPdf(pendingMergedPdf, treeData);
        }

        const bytes = await pendingMergedPdf.save();
        checkOutputBytes(bytes.length);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = outputFilenameInput.value.trim() || 'merged';
        a.download = filename.endsWith('.pdf') ? filename : filename + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
        showError(err.message);
    } finally {
        downloadNoOutlineBtn.disabled = false;
        downloadWithOutlineBtn.disabled = false;
    }
}

function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- 既存アウトライン抽出 (pdf.js) ---
async function extractExistingOutline(arrayBuffer) {
    let pdfDoc;
    try {
        const loadingTask = pdfjsLib.getDocument({ isEvalSupported: false, data: new Uint8Array(arrayBuffer) });
        pdfDoc = await loadingTask.promise;
        const outline = await pdfDoc.getOutline();
        if (!outline || outline.length === 0) {
                return null;
        }

        let outlineCount = 0;
        async function processItems(items, depth = 0) {
            if (depth > 32) throw new Error('Outline nesting limit exceeded');
            const result = [];
            for (const item of items) {
                if (++outlineCount > 5000) throw new Error('Outline item limit exceeded');
                let pageIndex = null;
                if (item.dest) {
                    try {
                        let dest = item.dest;
                        if (typeof dest === 'string') {
                            dest = await pdfDoc.getDestination(dest);
                        }
                        if (Array.isArray(dest) && dest.length > 0) {
                            pageIndex = await pdfDoc.getPageIndex(dest[0]);
                        }
                    } catch (e) { /* 解決できない宛先はスキップ */ }
                }
                result.push({
                    title: item.title || '',
                    pageIndex,
                    children: item.items && item.items.length > 0 ? await processItems(item.items, depth + 1) : []
                });
            }
            return result;
        }

        const result = await processItems(outline);
        return result;
    } catch (e) {
        return null;
    } finally { await pdfDoc?.destroy(); }
}

function applyOffset(items, offset) {
    return items.map(item => ({
        ...item,
        pageIndex: item.pageIndex !== null ? item.pageIndex + offset : null,
        children: applyOffset(item.children, offset)
    }));
}

// --- アウトライン追加（階層対応）---
function buildOutlineTree(context, pdfDoc, items, parentRef) {
    if (!items || items.length === 0) return [];
    const nodes = [];
    for (const item of items) {
        if (item.pageIndex === null || item.pageIndex < 0 || item.pageIndex >= pdfDoc.getPageCount()) continue;
        const page = pdfDoc.getPage(item.pageIndex);
        const destArray = context.obj([page.ref, 'XYZ', null, null, null]);
        const itemDict = context.obj({
            Title: PDFLib.PDFHexString.fromText(item.title || ''),
            Dest: destArray,
        });
        const itemRef = context.register(itemDict);

        const childNodes = buildOutlineTree(context, pdfDoc, item.children || [], itemRef);
        if (childNodes.length > 0) {
            for (let i = 0; i < childNodes.length; i++) {
                if (i > 0) childNodes[i].dict.set(PDFLib.PDFName.of('Prev'), childNodes[i - 1].ref);
                if (i < childNodes.length - 1) childNodes[i].dict.set(PDFLib.PDFName.of('Next'), childNodes[i + 1].ref);
            }
            itemDict.set(PDFLib.PDFName.of('First'), childNodes[0].ref);
            itemDict.set(PDFLib.PDFName.of('Last'), childNodes[childNodes.length - 1].ref);
            itemDict.set(PDFLib.PDFName.of('Count'), PDFLib.PDFNumber.of(childNodes.length));
        }
        nodes.push({ ref: itemRef, dict: itemDict });
    }
    if (parentRef) {
        nodes.forEach(node => node.dict.set(PDFLib.PDFName.of('Parent'), parentRef));
    }
    return nodes;
}

async function addOutlinesToPdf(pdfDoc, outlineData) {
    const context = pdfDoc.context;
    const topNodes = buildOutlineTree(context, pdfDoc, outlineData, null);
    if (topNodes.length === 0) return;

    for (let i = 0; i < topNodes.length; i++) {
        if (i > 0) topNodes[i].dict.set(PDFLib.PDFName.of('Prev'), topNodes[i - 1].ref);
        if (i < topNodes.length - 1) topNodes[i].dict.set(PDFLib.PDFName.of('Next'), topNodes[i + 1].ref);
    }

    const outlinesDict = context.obj({
        Type: 'Outlines',
        First: topNodes[0].ref,
        Last: topNodes[topNodes.length - 1].ref,
        Count: topNodes.length,
    });
    const outlinesRef = context.register(outlinesDict);
    topNodes.forEach(node => node.dict.set(PDFLib.PDFName.of('Parent'), outlinesRef));
    pdfDoc.catalog.set(PDFLib.PDFName.of('Outlines'), outlinesRef);
}
