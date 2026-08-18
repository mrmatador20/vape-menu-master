/**
 * Traduz erros de atualização de pedidos (RLS/triggers do banco) em mensagens
 * amigáveis, sem expor detalhes internos do banco de dados.
 */
export function friendlyOrderError(error: unknown): string {
  const raw = String(
    (error as any)?.message || (error as any)?.error_description || error || ''
  ).toLowerCase();

  if (!raw) return 'Não foi possível atualizar o pedido. Tente novamente.';

  if (raw.includes('dados financeiros')) {
    return 'Não é possível alterar valores, frete ou forma de pagamento deste pedido.';
  }
  if (raw.includes('alteração de status') || raw.includes('alteracao de status')) {
    return 'Este pedido não pode mais ser cancelado ou alterado.';
  }
  if (
    raw.includes('row-level security') ||
    raw.includes('row level security') ||
    raw.includes('permission denied') ||
    raw.includes('acesso negado') ||
    raw.includes('violates')
  ) {
    return 'Você não tem permissão para alterar este pedido.';
  }
  if (raw.includes('network') || raw.includes('failed to fetch')) {
    return 'Falha de conexão. Verifique sua internet e tente novamente.';
  }

  return 'Não foi possível atualizar o pedido. Tente novamente.';
}
