/**
 * Converte um texto em um slug seguro para URLs:
 * minúsculas, sem acentos, sem caracteres especiais,
 * espaços viram hífens.
 *
 * Exemplo: "Short Duplo Açaí!" -> "short-duplo-acai"
 */
export function slugify(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // troca não-alfanumérico por hífen
    .replace(/^-+|-+$/g, '') // remove hífens das pontas
    .replace(/-{2,}/g, '-'); // colapsa hífens duplicados
}
