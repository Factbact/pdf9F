// Decode untrusted raster images off the UI thread, in a disposable worker.
self.onmessage = async ({ data: file }) => {
    let bitmap;
    try {
        if (!/^image\/(png|jpeg|gif|webp|bmp)$/.test(file.type) || file.size > 50 * 1024 * 1024)
            throw new Error('Unsupported or oversized image / 画像形式またはサイズが対象外です');
        bitmap = await createImageBitmap(file);
        const { width, height } = bitmap;
        if (width <= 0 || height <= 0 || width * height > 32_000_000 || Math.max(width, height) > 16384)
            throw new Error('Image exceeds pixel limit / 画像のピクセル上限を超えています');
        const canvas = new OffscreenCanvas(width, height);
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        self.postMessage({ blob });
    } catch (error) { self.postMessage({ error: error.message }); }
    finally { bitmap?.close(); }
};
