export type PixelCrop = { x: number; y: number; width: number; height: number };

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize = 512,
  opts?: {
    background?: string;
    mimeType?: string;
    quality?: number;
    outputWidth?: number;
    outputHeight?: number;
  }
): Promise<Blob> {
  const outW = opts?.outputWidth ?? outputSize;
  const outH = opts?.outputHeight ?? outputSize;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const background = opts?.background ?? '#FFFFFF';
  const mimeType = opts?.mimeType ?? 'image/jpeg';
  const quality = opts?.quality ?? 0.92;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
      mimeType,
      quality
    );
  });

  return blob;
}
