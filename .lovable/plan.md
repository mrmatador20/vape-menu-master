## Rastreio de Vendas por Cupom (Influencers)

Adicionar sistema completo de tracking de cupons vinculados a influencers, com métricas e link automático.

---

### 1. Banco de Dados (migration)

**Alterações em `discounts`:**
- `influencer_name TEXT` — nome livre do influencer/responsável
- `influencer_user_id UUID` — opcional, vínculo a usuário cadastrado
- `is_influencer_coupon BOOLEAN DEFAULT false`

**Nova tabela `coupon_conversions`:**
- `id`, `order_id`, `discount_id`, `coupon_code`, `influencer_name`, `influencer_user_id`
- `order_total NUMERIC`, `discount_amount NUMERIC`
- `created_at`
- RLS: apenas admin pode SELECT; service_role insere

**Trigger em `orders`:**
- Quando status muda para `confirmed`/`delivered`, busca `discount_usage` daquele pedido
- Se o cupom for `is_influencer_coupon = true`, insere em `coupon_conversions`

**View `influencer_metrics_summary`:**
- Agrega por cupom: total de usos, valor total vendido, último uso
- Acessível apenas para admins

---

### 2. Admin — Formulário de Cupom

Em `DiscountFormDialog.tsx`:
- Switch "Cupom de Influencer/Parceiro"
- Quando ativo, mostra:
  - Input "Nome do Influencer/Responsável" (texto livre)
  - Combobox opcional "Vincular a usuário cadastrado" (busca em `profiles`)

---

### 3. Admin — Painel de Métricas

Nova rota `/admin/influencer-metrics` (e botão "Ver Métricas" na página de Descontos):
- Tabela: **Cupom | Influencer | Total de Usos | Valor Total Vendido | Última Venda**
- Filtro por intervalo de datas (date-range picker)
- Cards de resumo: Total de vendas via influencers, Top 3 cupons
- Ordenação por valor vendido (ranking)
- Design em dourado/branco (consistente com painel atual)

Botão "Ver Métricas" passa a abrir essa página (substitui modal genérico, se existir).

---

### 4. Link de Indicação Automático

Novo campo gerado: `https://foxvelour.com/?cupom=EMILLY10`
- Botão "Copiar link" ao lado de cada cupom de influencer
- No frontend (`App.tsx` ou `CartContext`), ler `?cupom=` na URL e salvar em localStorage
- Aplicar automaticamente no checkout

---

### 5. Resumo Técnico

- **Migration:** alter `discounts`, criar `coupon_conversions`, criar trigger `track_coupon_conversion`, criar view de métricas
- **Backend:** trigger no Postgres faz tudo automaticamente — sem mudanças em edge functions
- **Frontend novo/editado:**
  - `src/components/admin/DiscountFormDialog.tsx` (campos influencer)
  - `src/pages/admin/InfluencerMetrics.tsx` (nova página)
  - `src/hooks/useInfluencerMetrics.ts` (novo hook com filtro de data)
  - `src/pages/admin/Discounts.tsx` (botão "Ver Métricas" + coluna influencer)
  - `src/components/admin/AdminSidebar.tsx` (item de menu)
  - `src/App.tsx` (rota + leitura de `?cupom=`)
  - `src/context/CartContext.tsx` (auto-aplicar cupom da URL no checkout)

Posso prosseguir com tudo?
