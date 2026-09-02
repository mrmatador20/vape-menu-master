const SEP = "━━━━━━━━━━━━━━━━━━━";

export const DEFAULT_TELEGRAM_TEMPLATE =
  `🛍️ <b>NOVA VENDA REALIZADA! - FOX VELOUR</b>\n` +
  `${SEP}\n` +
  `🆔 <b>Pedido:</b> <code>{order_id}</code>\n\n` +
  `👤 <b>DADOS DO CLIENTE</b>\n` +
  `• <b>Nome:</b> {cliente_nome}\n` +
  `• <b>E-mail:</b> {cliente_email}\n` +
  `• <b>Telefone:</b> {cliente_telefone}\n\n` +
  `📍 <b>ENDEREÇO DE ENTREGA</b>\n` +
  `{endereco_completo}\n\n` +
  `📦 <b>ITENS DO PEDIDO</b>\n` +
  `{itens}\n\n` +
  `💵 <b>RESUMO FINANCEIRO</b>\n` +
  `• <b>Subtotal:</b> {subtotal}\n` +
  `• <b>Frete:</b> {frete}\n` +
  `• <b>Desconto:</b> -{desconto}\n` +
  `• 💰 <b>TOTAL PAGO:</b> <b>{total}</b>\n\n` +
  `💳 <b>PAGAMENTO</b>\n` +
  `• <b>Método:</b> {metodo_pagamento}\n` +
  `• 🚚 <b>Status:</b> {status_pedido}\n` +
  `${SEP}`;

export const TELEGRAM_TEMPLATE_TAGS: { tag: string; label: string }[] = [
  { tag: "{order_id}", label: "ID do Pedido" },
  { tag: "{cliente_nome}", label: "Nome do Cliente" },
  { tag: "{cliente_email}", label: "E-mail do Cliente" },
  { tag: "{cliente_telefone}", label: "Telefone/WhatsApp" },
  { tag: "{endereco_completo}", label: "Endereço completo formatado" },
  { tag: "{itens}", label: "Lista de produtos (cor, tamanho, qtd e valor)" },
  { tag: "{subtotal}", label: "Valor subtotal" },
  { tag: "{frete}", label: "Valor do frete e tipo" },
  { tag: "{desconto}", label: "Valor do desconto" },
  { tag: "{total}", label: "Valor total pago" },
  { tag: "{metodo_pagamento}", label: "Forma de pagamento (PIX / Cartão)" },
  { tag: "{status_pedido}", label: "Status atual do pedido" },
];
