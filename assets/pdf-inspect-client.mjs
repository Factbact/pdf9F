const queue = [];
let active = 0;

export function inspectPdf(bytes) {
    if (queue.length >= 50) return Promise.reject(new Error(securityMessage('busy')));
    return new Promise((resolve, reject) => {
        queue.push({ bytes, resolve, reject });
        drain();
    });
}

function drain() {
    while (active < 2 && queue.length) {
        const job = queue.shift();
        active++;
        inspect(job.bytes).then(job.resolve, job.reject).finally(() => { active--; drain(); });
    }
}

async function inspect(bytes) {
    const worker = new Worker(new URL('./pdf-inspect-worker.mjs', import.meta.url), { type: 'module' });
    let timer;
    try {
        return await new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new Error(securityMessage('timeout'))), 30000);
            worker.onmessage = ({ data }) => {
                if (data.error) reject(new Error(['files', 'pages'].includes(data.error) ? securityMessage(data.error) : data.error));
                else resolve(data.pages);
            };
            worker.onerror = () => reject(new Error('PDF inspection failed.'));
            worker.onmessageerror = () => reject(new Error('PDF inspection failed.'));
            // Keep the caller's buffer intact for the subsequent editing operation.
            worker.postMessage(bytes);
        });
    } finally {
        clearTimeout(timer);
        worker.terminate();
    }
}
