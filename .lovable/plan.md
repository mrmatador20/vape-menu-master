# Refatoração Premium do Admin Panel — Fox Velour

Refatoração ampla e em múltiplas camadas. Antes de codar, alinho o escopo abaixo para evitar retrabalho.

## 1. Navegação e Arquitetura

- **Remover** `/admin/pix-payments` da sidebar e do `App.tsx` (mantém arquivo como legado opcional).
- **Agrupar sidebar** com submenus colapsáveis usando shadcn `Collapsible`:
  - "Configurações de Venda" → Descontos, Taxas de Entrega, Indicações.
  - "Catálogo" → Produtos, Categorias, Banners.
  - "Operações" → Pedidos, Avaliações.
  - "Insights" → Dashboard, Estatísticas, Métricas Indicações.
  - "Sistema" → Segurança, Auditoria, Configurações.
- **Slide-overs** (shadcn `Sheet` lado direito, `max-w-2xl`/`max-w-4xl`) substituindo `Dialog` em:
  - `ProductFormDialog` → `ProductFormSheet`
  - `OrderDetail` (extrair de `Orders.tsx`) → `OrderDetailSheet`
  - Edição de categoria/subcategoria em `Categories.tsx`

## 2. Catálogo

- **Categorias (Tree View)**: refatorar `Categories.tsx` para árvore expandível Categoria → Subcategorias com contagem `(N)` ao lado, drag-handle visual (sem persist no escopo dessa task — apenas exibição). Reusar `useCategories` + `useSubcategories`.
- **Motor de variantes**: já existe `GenerateVariantsDialog` + `VariantsTable`. Vou:
  - Permitir matriz visual (linhas=tamanhos, colunas=cores) com inputs inline de estoque/preço.
  - SKU autogerado mas editável; preço e estoque por célula.
- **CategoryCombobox/SubcategoryCombobox**: já existem com criação inline. Garantir uso no novo Sheet.

## 3. Mesa de Operações (Pedidos)

- Em `Orders.tsx`:
  - Adicionar coluna **Status Financeiro** (Pago / Pendente / Expirado / Reembolsado) derivado de `payment_method` + `status`.
  - Manter coluna **Status Logístico** (Em separação / Enviado / Entregue / Cancelado).
  - **Checkboxes** por linha + header → barra de ações em massa (Alterar status, Imprimir etiquetas).
  - **OrderDetailSheet**: timeline de eventos (criação → confirmação → envio → entrega) + bloco "Pagamento PIX" mostrando ID da transação, link de cobrança e expiração quando PIX.

> Para PIX, vou ler de `orders` os campos disponíveis (`expires_at`, etc). Não criarei novas tabelas.

## 4. Dashboard / BI

- Em `Dashboard.tsx`:
  - Adicionar **gráfico de linha** Receita × Tempo (últimos 30 dias) usando `recharts` (já presente via shadcn).
  - **Gráfico de barras** Vendas por Categoria.
  - Painel **Ações Urgentes**: produtos com estoque ≤ min_stock + pedidos pendentes de despacho > 24h.

## 5. Identidade Visual Fox Velour

Atualizar `src/index.css` (tokens HSL):

- `--background`: branco gelo (`40 30% 98%`)
- `--card`: branco puro (`0 0% 100%`)
- `--foreground`: preto suave (`30 10% 12%`)
- `--primary`: dourado queimado (`35 65% 45%`) — CTAs apenas
- `--radius`: `0.5rem` (8px)
- Remover sombras pesadas: `--shadow-card` mais sutil.
- Tipografia: importar Inter via `index.html` e setar `font-family` no body.

## Arquivos

**Criar:**
- `src/components/admin/ProductFormSheet.tsx` (wrapper Sheet em volta do form existente)
- `src/components/admin/OrderDetailSheet.tsx`
- `src/components/admin/CategoryTree.tsx`
- `src/components/admin/dashboard/RevenueChart.tsx`
- `src/components/admin/dashboard/CategorySalesChart.tsx`
- `src/components/admin/dashboard/UrgentActionsPanel.tsx`

**Editar:**
- `src/components/admin/AdminSidebar.tsx` — submenus colapsáveis
- `src/App.tsx` — remover rota pix-payments
- `src/pages/admin/Orders.tsx` — colunas duplas, checkboxes, ações em massa, sheet
- `src/pages/admin/Categories.tsx` — tree view
- `src/pages/admin/Products.tsx` — usar Sheet
- `src/pages/admin/Dashboard.tsx` — gráficos + ações urgentes
- `src/components/admin/VariantsTable.tsx` — matriz inline
- `src/index.css` — paleta Fox Velour
- `index.html` — Inter font

## Fora de escopo (follow-up)

- Persistência de drag-and-drop de ordem de categorias.
- Geração real de PDF de etiqueta de envio (vou stub print HTML).
- Webhook PIX novo / mudanças no schema de pagamentos.
- Mudanças nas Edge Functions.

Confirma para eu seguir? Posso também reduzir escopo se preferir entregar em fases (ex: Fase 1 = Visual + Sidebar + Pedidos; Fase 2 = Dashboard BI + Slide-overs).