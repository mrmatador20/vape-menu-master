/**
 * Traduz erros de RLS / Storage do backend em mensagens amigáveis (PT-BR).
 * Zero-Trust: o frontend apenas esconde botões; quem realmente barra é o banco.
 */
export const getStorageErrorMessage = (err: any): string => {
  const raw = String(err?.message || err?.error_description || err || '');
  const lower = raw.toLowerCase();

  if (
    lower.includes('row-level security') ||
    lower.includes('violates row-level') ||
    lower.includes('permission denied') ||
    lower.includes('unauthorized') ||
    lower.includes('not authorized') ||
    err?.statusCode === '403' ||
    err?.status === 403
  ) {
    return 'Permissão negada: apenas administradores podem enviar ou alterar imagens do banner.';
  }

  if (lower.includes('payload too large') || lower.includes('exceeded the maximum')) {
    return 'Arquivo muito grande. Envie uma imagem de até 5 MB.';
  }

  if (lower.includes('mime') || lower.includes('invalid_mime_type')) {
    return 'Formato inválido. Use apenas JPG, PNG, WEBP ou AVIF.';
  }

  return raw || 'Falha ao salvar. Tente novamente.';
};
