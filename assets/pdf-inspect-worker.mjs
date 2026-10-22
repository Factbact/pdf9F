import '../vendor/pdf-lib/pdf-lib.min.js';

// Parse untrusted object graphs off the UI thread before the editor loads them.
self.onmessage = async ({ data: bytes }) => {
    try {
        if (bytes.byteLength > 50 * 1024 * 1024) throw new Error('files');
        const pdf = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: false });
        const pages = pdf.getPageCount();
        if (pages > 500) throw new Error('pages');
        self.postMessage({ pages });
    } catch (error) {
        self.postMessage({ error: String(error.message || error) });
    }
};
