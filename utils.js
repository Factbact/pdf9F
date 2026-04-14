// utils.js - 共通ユーティリティ (全ページで共有)

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
