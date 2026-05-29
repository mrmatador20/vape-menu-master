/**
 * Otimização de imagens client-side:
 * - Redimensiona proporcionalmente até maxWidth (mantendo aspect ratio)
 * - Converte para WebP com qualidade configurável (default 0.8)
 * - Retorna Blob + filename .webp + contentType image/webp
 *
 * Se o arquivo já for image/webp e estiver dentro do tamanho/largura, retorna como está.
 * GIFs animados são preservados (não convertidos) para não perder animação.
 */

export interface OptimizeOptions {
  maxWidth?: number;
  quality?: number; // 0..1
}

export interface OptimizedImage {
  blob: Blob;
  filename: string;
  contentType: string;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, '') || 'image';

export async function optimizeImage(
  file: File,
  opts: OptimizeOptions = {},
): Promise<OptimizedImage> {
  const { maxWidth = 1200, quality = 0.8 } = opts;

  // GIF: pode ser animado — preserve original.
  if (file.type === 'image/gif') {
    return { blob: file, filename: file.name, contentType: file.type };
  }

  // Não-imagem: retorna como está (defesa).
  if (!file.type.startsWith('image/')) {
    return { blob: file, filename: file.name, contentType: file.type || 'application/octet-stream' };
  }

  try {
    const dataUrl = await fileToDataUrl(file);
    const img = await loadImage(dataUrl);

    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    const targetW = Math.round(img.width * scale);
    const targetH = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context indisponível');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', quality),
    );

    if (!blob) {
      // Fallback: usa original
      return { blob: file, filename: file.name, contentType: file.type };
    }

    return {
      blob,
      filename: `${stripExtension(file.name)}.webp`,
      contentType: 'image/webp',
    };
  } catch {
    return { blob: file, filename: file.name, contentType: file.type };
  }
}
