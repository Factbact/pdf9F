// A disposable worker makes a stuck/hostile decoder cancellable and releases its WASM heap.
export async function convertHeicToBlob(file, mime, quality) {
    const worker = new Worker(new URL('./heic-worker.mjs', import.meta.url), { type: 'module' });
    try {
        return await new Promise((resolve, reject) => {
            const timer = setTimeout(() => { worker.terminate(); reject(new Error(securityMessage('timeout'))); }, 30000);
            worker.onmessage = ({ data }) => {
                clearTimeout(timer);
                if (data.error) reject(new Error(data.error));
                else resolve(data.blob);
            };
            worker.onerror = () => { clearTimeout(timer); reject(new Error(securityMessage('decode'))); };
            worker.postMessage({ file, mime, quality });
        });
    } finally { worker.terminate(); }
}
