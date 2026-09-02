// Mapeia motivos de recusa do Asaas para mensagens amigáveis em PT-BR.
export type RefusalCode =
  | 'insufficient_funds'
  | 'invalid_card_data'
  | 'expired_card'
  | 'security_block'
  | 'min_value'
  | 'generic';

const MESSAGES: Record<RefusalCode, string> = {
  insufficient_funds:
    'Transação não autorizada pela operadora do cartão. Verifique seu saldo/limite ou tente outro cartão.',
  invalid_card_data:
    'Dados do cartão inválidos. Confira o número, validade e o código CVV.',
  expired_card:
    'O cartão informado está vencido. Por favor, utilize outro cartão.',
  security_block:
    'Transação não autorizada. Entre em contato com seu banco ou tente outro cartão.',
  min_value:
    'O valor mínimo para pagamento online é de R$ 5,00. Adicione mais itens ao carrinho para concluir a compra.',
  generic:
    'Não foi possível processar o pagamento com este cartão. Tente novamente ou utilize outro cartão.',
};


export const mapRefusal = (raw?: string | null): { code: RefusalCode; message: string } => {
  const t = String(raw || '').toLowerCase();

  const has = (...terms: string[]) => terms.some((x) => t.includes(x));

  let code: RefusalCode = 'generic';

  if (has('insufficient', 'saldo', 'limite', 'sem limite', 'insuficiente', 'not enough')) {
    code = 'insufficient_funds';
  } else if (has('expired', 'vencid', 'expirad', 'invalid expiration', 'validade')) {
    code = 'expired_card';
  } else if (
    has('cvv', 'ccv', 'security code', 'invalid card', 'cartao invalido', 'cartão inválido',
        'invalid_credit_card', 'invalid number', 'numero invalido', 'número inválido',
        'dados do cartao', 'dados do cartão', 'invalid data')
  ) {
    code = 'invalid_card_data';
  } else if (
    has('fraud', 'fraude', 'suspect', 'suspeit', 'blocked', 'bloquead', 'stolen', 'roubado',
        'restricted', 'restrit', 'security', 'seguranca', 'segurança', 'do not honor', 'nao autorizada',
        'não autorizada', 'not authorized', 'unauthorized', 'denied', 'negada')
  ) {
    code = 'security_block';
  }

  return { code, message: MESSAGES[code] };
};

export const logOrderEvent = async (
  client: any,
  orderId: string,
  eventType: string,
  message: string,
  refusalReason?: string | null,
  metadata: Record<string, unknown> = {},
) => {
  try {
    await client.from('order_logs').insert({
      order_id: orderId,
      event_type: eventType,
      message,
      refusal_reason: refusalReason || null,
      metadata,
    });
  } catch (e) {
    console.error('[order_logs] insert failed:', (e as Error).name);
  }
};
