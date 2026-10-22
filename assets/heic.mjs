import { convertHeicToBlob } from './heic-client.mjs';



const resultUrls = new Set();
function clearResultUrls() {
    for (const url of resultUrls) URL.revokeObjectURL(url);
    resultUrls.clear();
}
window.addEventListener('pagehide', clearResultUrls);

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
const resultsSection = document.getElementById('results-section');
const resultsGrid = document.getElementById('results-grid');
const errorBox = document.getElementById('error-box');
const errorMessage = document.getElementById('error-message');

let selectedFiles = [];

// --- フォーマット選択 ---
const formatLabels = { png: 'PNGに変換', jpeg: 'JPEGに変換', webp: 'WebPに変換' };
const jpegQualityRow = document.getElementById('jpeg-quality-row');
const jpegQualityInput = document.getElementById('jpeg-quality');
const jpegQualityLabel = document.getElementById('jpeg-quality-label');
const convertBtnLabel = document.getElementById('convert-btn-label');

document.querySelectorAll('input[name="output-format"]').forEach(radio => {
    radio.addEventListener('change', () => {
        const fmt = radio.value;
        convertBtnLabel.textContent = formatLabels[fmt];
        jpegQualityRow.classList.toggle('hidden', fmt !== 'jpeg');
    });
});
jpegQualityInput.addEventListener('input', () => {
    jpegQualityLabel.textContent = jpegQualityInput.value;
});

function getOutputFormat() {
    const fmt = document.querySelector('input[name="output-format"]:checked').value;
    const mimeMap = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
    const extMap  = { png: '.png', jpeg: '.jpg', webp: '.webp' };
    const quality = fmt === 'jpeg' ? parseInt(jpegQualityInput.value) / 100 : undefined;
    return { mime: mimeMap[fmt], ext: extMap[fmt], quality };
}

// --- 初期化 (module は defer 済みなので DOM は確実に ready) ---
initTheme();
initLanguage();

// --- イベントリスナー ---
selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    handleFileSelection(e.target.files);
    fileInput.value = '';
});
clearAllBtn.addEventListener('click', clearAllFiles);
convertBtn.addEventListener('click', convertFiles);
setupDropZone(dropArea, (dt) => handleFileSelection(dt.files));

// --- ファイル操作 ---
function handleFileSelection(fileList) {
    if (!acceptFiles([...selectedFiles, ...Array.from(fileList)], showError)) return;
    const heicFiles = Array.from(fileList).filter(f => {
        const nameLower = f.name.toLowerCase();
        return nameLower.endsWith('.heic') || nameLower.endsWith('.heif')
            || f.type === 'image/heic' || f.type === 'image/heif';
    });
    if (heicFiles.length === 0) {
        if (selectedFiles.length === 0) showError(t('heic.error.noheic') || 'HEICファイルを選択してください');
        return;
    }
    const newFiles = heicFiles.map(f => ({
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
    resultsSection.classList.add('hidden');
    clearResultUrls();
    resultsGrid.innerHTML = '';
}

function renderFileList() {
    const totalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);

    if (selectedFiles.length === 0) {
        fileInfo.textContent = '';
        fileListHeader.classList.add('hidden');
    } else if (selectedFiles.length === 1) {
        fileInfo.textContent = `${t('common.selected') || '選択中'}: ${selectedFiles[0].name} (${formatBytes(totalSize)})`;
        fileListHeader.classList.remove('hidden');
        fileListHeader.classList.add('flex');
    } else {
        fileInfo.textContent = `${selectedFiles.length}${t('common.files.selected') || 'ファイル選択中'} (${formatBytes(totalSize)})`;
        fileListHeader.classList.remove('hidden');
        fileListHeader.classList.add('flex');
    }

    fileListContainer.innerHTML = '';

    for (let i = 0; i < selectedFiles.length; i++) {
        const fileObj = selectedFiles[i];
        const li = document.createElement('li');
        li.className = 'bg-white dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm animate-fade-in';

        const leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center gap-3 overflow-hidden';

        const orderBadge = document.createElement('span');
        orderBadge.className = 'flex-shrink-0 w-6 h-6 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 text-xs font-bold flex items-center justify-center';
        orderBadge.textContent = i + 1;

        const iconDiv = document.createElement('div');
        iconDiv.className = 'w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-600 flex items-center justify-center flex-shrink-0';
        iconDiv.innerHTML = `<svg class="w-5 h-5 text-fuchsia-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>`;

        const nameDiv = document.createElement('div');
        nameDiv.className = 'truncate';
        nameDiv.innerHTML = `<div class="font-medium text-slate-700 dark:text-slate-200 truncate"><span data-safe-0></span></div><div class="text-xs text-slate-500 dark:text-slate-400">${formatBytes(fileObj.file.size)}</div>`;
        nameDiv.querySelector('[data-safe-0]').textContent = fileObj.name;

        leftDiv.appendChild(orderBadge);
        leftDiv.appendChild(iconDiv);
        leftDiv.appendChild(nameDiv);

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

    convertBtn.disabled = selectedFiles.length === 0;
    hideError();
}

// --- HEIC デコード → 指定フォーマットで Blob を返す ---
// --- 変換 ---
async function convertFiles() {
    if (selectedFiles.length === 0) return;

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressDetails.textContent = t('heic.progress.converting') || '変換中...';
    convertBtn.disabled = true;
    resultsSection.classList.add('hidden');
    clearResultUrls();
    resultsGrid.innerHTML = '';
    hideError();

    const results = [];
    let outputBytes = 0;
    const { mime, ext, quality } = getOutputFormat();

    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const fileObj = selectedFiles[i];
            progressDetails.textContent = `${t('heic.progress.converting') || '変換中'}: ${i + 1} / ${selectedFiles.length} - ${fileObj.name}`;

            try {
                const blob = await convertHeicToBlob(fileObj.file, mime, quality);
                checkOutputBytes(outputBytes + blob.size);
                outputBytes += blob.size;
                const url = URL.createObjectURL(blob);
                resultUrls.add(url);
                const newName = fileObj.name.replace(/\.(heic|heif)$/i, ext);
                results.push({ name: newName, url, blob });
            } catch (err) {
                console.error('Conversion error:', err);
                const errMsg = err && (err.message || err.toString()) || '不明なエラー';
                results.push({ name: fileObj.name, error: true, errorMsg: errMsg });
            }

            progressBar.style.width = `${((i + 1) / selectedFiles.length) * 100}%`;
        }

        progressDetails.textContent = `${t('heic.progress.done') || '完了'}: ${results.filter(r => !r.error).length}/${selectedFiles.length}`;

        // 結果を表示
        displayResults(results);

    } catch (error) {
        showError(error.message);
    }

    convertBtn.disabled = false;
}

function displayResults(results) {
    resultsSection.classList.remove('hidden');

    results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'bg-white dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden';

        if (result.error) {
            div.innerHTML = `
                <div class="aspect-square bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <svg class="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div class="p-3">
                    <p class="text-xs text-red-500 truncate"><span data-safe-0></span></p>
                    <p class="text-xs text-red-400">${t('heic.error.failed') || '変換失敗'}</p>
                    <p class="text-xs text-red-300 mt-1 break-all"><span data-safe-1></span></p>
                </div>
            `;
            div.querySelector('[data-safe-0]').textContent = result.name;
            div.querySelector('[data-safe-1]').textContent = result.errorMsg || '';
        } else {
            div.innerHTML = `
                <div class="aspect-square bg-slate-100 dark:bg-slate-600 overflow-hidden">
                    <img data-safe-0="" data-safe-1="" class="w-full h-full object-cover">
                </div>
                <div class="p-3">
                    <p class="text-xs text-slate-600 dark:text-slate-300 truncate mb-2"><span data-safe-4></span></p>
                    <a data-safe-2="" data-safe-3=""
                        class="inline-flex items-center gap-1 text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 hover:text-fuchsia-700 dark:hover:text-fuchsia-300">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        ${t('heic.btn.download') || 'ダウンロード'}
                    </a>
                </div>
            `;
            div.querySelector('[data-safe-0]').setAttribute('src', result.url);
            div.querySelector('[data-safe-1]').setAttribute('alt', result.name);
            div.querySelector('[data-safe-2]').setAttribute('href', result.url);
            div.querySelector('[data-safe-3]').setAttribute('download', result.name);
            div.querySelector('[data-safe-4]').textContent = result.name;
        }

        resultsGrid.appendChild(div);
    });
}

// --- エラー表示 ---
function showError(message) {
    errorMessage.textContent = message;
    errorBox.classList.remove('hidden');
}

function hideError() {
    errorBox.classList.add('hidden');
}
