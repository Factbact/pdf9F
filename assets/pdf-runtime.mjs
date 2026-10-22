import * as pdfjs from '../vendor/pdfjs/pdf.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;
// All paths are relative to this module, including when hosted at /pdf9F/.
export function getDocument(options) {
    const task = pdfjs.getDocument({
        ...options,
        isEvalSupported: false,
        cMapUrl: new URL('../vendor/pdfjs/cmaps/', import.meta.url).href,
        cMapPacked: true,
        standardFontDataUrl: new URL('../vendor/pdfjs/standard_fonts/', import.meta.url).href,
        wasmUrl: new URL('../vendor/pdfjs/wasm/', import.meta.url).href,
        iccUrl: new URL('../vendor/pdfjs/iccs/', import.meta.url).href,
        maxImageSize: 32_000_000,
        canvasMaxAreaInBytes: 128_000_000
    });
    let timer;
    const original = Promise.race([task.promise, new Promise((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(securityMessage('timeout')));
            void task.destroy().catch(() => {});
        }, 30000);
    })]);
    const checked = original.then(async doc => {
        try { checkPageCount(doc.numPages); }
        catch (error) { await task.destroy(); throw error; }
        // PDF.js 6 owns destruction on the loading task, not PDFDocumentProxy.
        doc.destroy = () => task.destroy();
        return doc;
    }, async error => { await task.destroy(); throw error; }).finally(() => clearTimeout(timer));
    return { promise: checked, destroy: () => task.destroy() };
}

export async function renderPage(page, parameters) {
    const task = page.render(parameters);
    let timer;
    try {
        await Promise.race([task.promise, new Promise((_, reject) => {
            timer = setTimeout(() => {
                task.cancel();
                reject(new Error(securityMessage('timeout')));
            }, 30000);
        })]);
    } finally { clearTimeout(timer); }
}

// Only thumbnails share this queue: previews may need several live documents.
let activeThumbnails = 0;
const thumbnailQueue = [];
export function renderThumbnail(file, canvas, options = {}) {
    for (let i = thumbnailQueue.length - 1; i >= 0; i--) {
        if (!thumbnailQueue[i].canvas.isConnected) thumbnailQueue.splice(i, 1)[0].resolve();
    }
    return new Promise((resolve, reject) => {
        thumbnailQueue.push({ file, canvas, options, resolve, reject });
        drainThumbnails();
    });
}
function drainThumbnails() {
    while (activeThumbnails < 2 && thumbnailQueue.length) {
        const job = thumbnailQueue.shift();
        if (!job.canvas.isConnected) { job.resolve(); continue; }
        activeThumbnails++;
        drawThumbnail(job).then(job.resolve, job.reject).finally(() => {
            activeThumbnails--;
            drainThumbnails();
        });
    }
}
async function drawThumbnail({ file, canvas, options }) {
    const pdf = await getDocument({ isEvalSupported: false, data: await file.arrayBuffer() }).promise;
    try {
        if (!canvas.isConnected) return;
        const page = await pdf.getPage(1);
        const rotation = options.rotation ?? page.rotate;
        const original = page.getViewport({ scale: 1, rotation });
        const scale = options.width ? options.width / original.width : 0.2;
        const viewport = page.getViewport({ scale, rotation });
        checkPixels(viewport.width, viewport.height);
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await renderPage(page, { canvasContext: canvas.getContext('2d'), viewport });
    } finally { await pdf.destroy(); }
}
