export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1600,
  quality: 0.8,
  mimeType: 'image/jpeg',
};

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });
}

function calcSize(w: number, h: number, maxDim: number): { w: number; h: number } {
  if (w <= maxDim && h <= maxDim) return { w, h };
  if (w >= h) {
    return { w: maxDim, h: Math.round((h * maxDim) / w) };
  }
  return { w: Math.round((w * maxDim) / h), h: maxDim };
}

export async function compressImageDataUrl(
  dataUrl: string,
  options: CompressOptions = {},
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;

  const opts = { ...DEFAULTS, ...options };

  try {
    const img = await loadImage(dataUrl);
    const { w, h } = calcSize(img.naturalWidth || img.width, img.naturalHeight || img.height, opts.maxDimension);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const compressed = canvas.toDataURL(opts.mimeType, opts.quality);

    if (compressed.length >= dataUrl.length) {
      return dataUrl;
    }

    return compressed;
  } catch (err) {
    console.warn('[imageCompressor] Failed, returning original:', err);
    return dataUrl;
  }
}

export async function fileToCompressedDataUrl(
  file: File,
  options: CompressOptions = {},
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return compressImageDataUrl(dataUrl, options);
}

export function dataUrlSizeKB(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4 / 1024);
}
