import libheifFactory from '../vendor/libheif/libheif-bundle.mjs';

self.onmessage = async ({ data: { file, mime, quality } }) => {
    let images = [];
    try {
        if (file.size > 50 * 1024 * 1024) throw new Error('File exceeds 50 MiB / ファイルは50 MiBまでです');
        const libheif = await libheifFactory();
        const decoder = new libheif.HeifDecoder();
        images = decoder.decode(new Uint8Array(await file.arrayBuffer()));
        if (!images?.length) throw new Error('Image decode failed / 画像のデコードに失敗しました');
        const image = images[0];
        const width = image.get_width(), height = image.get_height();
        if (width <= 0 || height <= 0 || width * height > 32_000_000 || Math.max(width, height) > 16384)
            throw new Error('Image exceeds pixel limit / 画像のピクセル上限を超えています');
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const pixels = ctx.createImageData(width, height);
        await new Promise((resolve, reject) => image.display(pixels, result => {
            if (!result) return reject(new Error('Image decode failed / 画像のデコードに失敗しました'));
            ctx.putImageData(result, 0, 0);
            resolve();
        }));
        const blob = await canvas.convertToBlob({ type: mime, quality });
        self.postMessage({ blob });
    } catch (error) { self.postMessage({ error: error.message }); }
    finally { for (const image of images) image.free(); }
};
