import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Transforma uma URL pública do Supabase Storage para usar o endpoint
 * de transformação de imagens (resize + qualidade), reduzindo drasticamente
 * o peso das imagens servidas em listagens/cards.
 *
 * O Supabase serve automaticamente WebP/AVIF baseado no header Accept do navegador.
 * Se a URL não for do Supabase Storage, retorna como está.
 */
export function optimizedImage(
  url: string | undefined | null,
  opts: { width?: number; quality?: number; resize?: 'cover' | 'contain' } = {}
): string {
  if (!url) return '';
  try {
    const { width = 600, quality = 65, resize = 'cover' } = opts;
    if (url.includes('/storage/v1/object/public/')) {
      const transformed = url.replace(
        '/storage/v1/object/public/',
        '/storage/v1/render/image/public/'
      );
      const sep = transformed.includes('?') ? '&' : '?';
      return `${transformed}${sep}width=${width}&quality=${quality}&resize=${resize}`;
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Gera um srcSet responsivo a partir de uma URL do Supabase Storage.
 */
export function imageSrcSet(
  url: string | undefined | null,
  widths: number[] = [240, 360, 480, 720],
  quality = 65
): string {
  if (!url || !url.includes('/storage/v1/object/public/')) return '';
  return widths
    .map((w) => `${optimizedImage(url, { width: w, quality })} ${w}w`)
    .join(', ');
}

/**
 * Gera URL de placeholder ultra-leve (~1-3kb) para blur-up enquanto a
 * imagem real carrega. Usa width muito pequeno + qualidade baixa.
 */
export function placeholderImage(url: string | undefined | null): string {
  if (!url) return '';
  return optimizedImage(url, { width: 24, quality: 30 });
}
