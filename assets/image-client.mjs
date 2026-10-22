export async function normalizeImage(file) {
    const worker = new Worker(new URL('./image-worker.mjs', import.meta.url), { type: 'module' });
    let timer;
    try {
        const blob = await new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new Error(securityMessage('timeout'))), 30000);
            worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data.blob);
            worker.onerror = () => reject(new Error(securityMessage('decode')));
            worker.onmessageerror = () => reject(new Error(securityMessage('decode')));
            worker.postMessage(file);
        });
        return new File([blob], file.name, { type: 'image/png' });
    } finally {
        clearTimeout(timer);
        worker.terminate();
    }
}
