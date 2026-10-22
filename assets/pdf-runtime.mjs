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
