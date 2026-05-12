## Painel Admin — Novas funcionalidades

Vou implementar 4 grandes melhorias no painel admin da Fox Velour. Como é um pacote grande, abaixo está o plano para você aprovar antes de eu começar.

---

### 1. Relatórios de Performance

Nova página **Admin → Relatórios** (`/admin/reports`) com:

- **Ticket Médio**: receita total ÷ nº pedidos confirmados/entregues, com comparativo por período (7d / 30d / 90d).
- **Receita por período**: gráfico de linhas (recharts) com vendas diárias.
- **Top Produtos Mais Vendidos**: ranking por quantidade vendida (via `order_items`).
- **Produtos Mais Vistos vs. Mais Vendidos**: tabela comparativa com taxa de conversão (views ÷ vendas).
  - Requer rastreamento de visualizações → nova tabela `product_views` (incrementada quando o usuário abre o `QuickViewSheet` ou a página do produto).

### 2. Alertas de Reestoque Inteligentes

Aprimorar o card `LowStockAlert` no Dashboard:

- **Previsão de esgotamento**: calcula a média de vendas/dia dos últimos 30 dias por produto e estima dias restantes (`stock ÷ vendas_diárias`).
- Badge colorido: 🔴 esgota em <3 dias, 🟡 <7 dias, 🟢 >7 dias.
- Mostra: "Eclipse esgotará em ~4 dias (média 2,1/dia)".

### 3. Impressão de Etiquetas

Na página **Admin → Pedidos**, adicionar botão **"Imprimir Etiqueta"** em cada pedido:

- Abre uma nova janela com layout A4 imprimível contendo:
  - **Etiqueta de envio**: remetente (Fox Velour), destinatário (nome, endereço completo, CEP, telefone), nº do pedido, data.
  - **Declaração de conteúdo**: tabela com itens, quantidade, valor unitário, valor total, peso estimado.
- CSS `@media print` para impressão limpa (sem header/sidebar).
- Botão também disponível em lote: "Imprimir etiquetas selecionadas".

### 4. Variações de Produto Aprimoradas

Já existe `GenerateVariantsDialog` (gera grade tamanho × cor). Vou adicionar:

- **Fotos por variação (cor)**: nova coluna `image_url` na tabela `flavors`. No `VariantsTable`, cada linha de cor terá um upload de imagem.
- **Troca de imagem no site**: no `QuickViewSheet` e na página do produto, ao selecionar uma cor, a imagem principal muda para a foto da variação correspondente (fallback: imagem do produto).
- **Grade rápida** (já existe via `GenerateVariantsDialog`) — vou adicionar presets de tamanhos comuns: `[P, M, G, GG]`, `[PP, P, M, G, GG]`, `[36, 38, 40, 42, 44]` para 1 clique.

---

### Mudanças técnicas resumidas

- **DB (migrations)**:
  - `product_views` (id, product_id, user_id?, created_at) + RLS público para insert.
  - `flavors.image_url TEXT` (nova coluna).
- **Frontend**:
  - Nova rota `/admin/reports` + item no `AdminSidebar`.
  - Hook `useProductAnalytics` (vendas, views, ticket médio, previsão de estoque).
  - Componente `PrintShippingLabel.tsx` + integração em `admin/Orders.tsx`.
  - Atualizar `VariantsTable.tsx`, `GenerateVariantsDialog.tsx`, `QuickViewSheet.tsx`, e a página do produto para usar a imagem da variação.
  - Hook leve `useTrackProductView` chamado no QuickView/página do produto.

Posso prosseguir com tudo, ou você quer priorizar alguma parte (ex: começar só por relatórios + variações)?