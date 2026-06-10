# Sistema Balcão + Controle de Estoque + Auditoria

Implementação completa de PDV interno (Balcão) com estoque sincronizado, auditoria imutável, papéis e segurança backend-first.

## 1. Banco de dados (migration única)

### Novos enums
- `stock_movement_type`: `baixa_manual`, `reversao`, `entrada`, `ajuste_manual`, `venda_online`, `venda_loja_fisica`
- `stock_movement_reason`: `venda_loja`, `produto_danificado`, `troca`, `ajuste_estoque`, `outro`, `venda_site`, `reversao`
- Estender `app_role` com `'super_admin'` e `'operador'` (mantendo `admin`, `moderator`, `user`)

### Novas tabelas

**`stock_movements`** (imutável)
- product_id, flavor_id (opcional), movement_type, reason, quantity
- stock_before, stock_after
- user_id, user_email_snapshot, user_role_snapshot
- request_id (UNIQUE, idempotência), reversed_by_movement_id (nullable, self-FK)
- ip_address, user_agent, notes, created_at
- Trigger `prevent_audit_log_modification` (UPDATE/DELETE bloqueado)

**`security_events`**
- user_id (nullable), event_type, severity, ip_address, user_agent, metadata, created_at
- Imutável (sem UPDATE/DELETE)

### Funções SECURITY DEFINER (única forma de mexer no estoque)
- `balcao_baixa_estoque(p_product_id, p_flavor_id, p_quantity, p_reason, p_notes, p_request_id)` — bloqueia linha (`SELECT ... FOR UPDATE`), valida role (operador/admin/super_admin), valida estoque>=qty, decrementa, insere movimento, retorna id.
- `balcao_reverter_baixa(p_movement_id, p_request_id)` — apenas super_admin; bloqueia, valida não-revertido, restaura estoque, marca `reversed_by_movement_id`.
- `balcao_entrada_estoque(...)` — admin/super_admin.
- `balcao_ajuste_estoque(...)` — super_admin apenas.
- `log_security_event(...)` — chamado por triggers/funções.

### RLS endurecida
- `products`: revogar INSERT/UPDATE/DELETE de `authenticated`; só `service_role` e funções SECURITY DEFINER mutam estoque. SELECT continua público.
- `flavors`: mesmo tratamento na coluna stock (revogar UPDATE direto de authenticated; admin pode atualizar metadados via função dedicada — mantemos políticas admin existentes para não quebrar painel atual, mas migrações futuras de stock só via função).
- `stock_movements`: SELECT por admin/super_admin (todos), operador (apenas próprios `user_id = auth.uid()`). INSERT/UPDATE/DELETE negados (apenas funções).
- `security_events`: SELECT super_admin; INSERT só funções; sem UPDATE/DELETE.
- GRANTs explícitos em todas novas tabelas.

### Rate limiting
Reutilizar `rate_limit_tracking` existente; funções de balcão chamam helper interno: 30 movimentações/min e 100 consultas/min por user_id. Excessos → `log_security_event` + erro.

## 2. Frontend — novas páginas admin

### `/546498@18/balcao` — `pages/admin/Balcao.tsx`
- Grid de produtos (foto, nome, SKU, categoria, preço, estoque, status)
- Busca instantânea (nome/SKU), filtros (categoria, faixa de estoque, status)
- Botão "Dar Baixa" → `BalcaoBaixaDialog`:
  - quantidade (default 1), motivo (select), observação, seletor de variante se houver
  - gera `request_id` (uuid) no client; ao confirmar chama RPC `balcao_baixa_estoque`
  - invalida queries de produtos/estoque

### `/546498@18/stock-logs` — `pages/admin/StockLogs.tsx`
- Tabela com filtros (produto, SKU, usuário, tipo, intervalo de datas)
- Busca rápida
- Exportação CSV/Excel (sheetjs já no projeto se disponível, senão CSV puro) e PDF (jspdf se disponível, senão print-to-pdf)
- Botão "Reverter" visível só para super_admin em movimentos não revertidos → RPC `balcao_reverter_baixa`

### `/546498@18/balcao-dashboard` — `pages/admin/BalcaoDashboard.tsx`
- Cards: baixas hoje, reversões hoje, vendas físicas, ajustes
- Top produtos movimentados (30d), produtos com menor estoque, usuários mais ativos
- Gráfico de linha últimos 30 dias (recharts já no projeto)

### Sidebar admin
Adicionar grupo "Balcão" com 3 itens, visível conforme role (`useUserRole` + novo helper `useIsBalcaoAuthorized`).

## 3. Hooks
- `useStockMovements(filters)` — lista paginada
- `useBalcaoBaixa()` — mutation com retry-safe request_id
- `useBalcaoReverter()` — mutation super_admin
- `useBalcaoDashboard()` — agregações

## 4. Segurança aplicada
- Toda mutação via RPC; frontend nunca envia `stock_after`/preço
- Funções leem role/estoque do banco (ignoram payload)
- request_id UNIQUE = idempotência (duplo clique)
- `FOR UPDATE` nos produtos/flavors = sem race condition
- Tentativas negadas chamam `log_security_event`
- Logs de auditoria imutáveis por trigger

## 5. Arquivos

**Migration**: `supabase/migrations/<timestamp>_balcao_stock_system.sql`

**Novos**:
- `src/pages/admin/Balcao.tsx`
- `src/pages/admin/StockLogs.tsx`
- `src/pages/admin/BalcaoDashboard.tsx`
- `src/components/admin/BalcaoBaixaDialog.tsx`
- `src/components/admin/BalcaoReverterDialog.tsx`
- `src/hooks/useStockMovements.ts`
- `src/hooks/useBalcao.ts`
- `src/hooks/useBalcaoDashboard.ts`
- `src/lib/exportStockLogs.ts`

**Editados**:
- `src/App.tsx` (3 rotas)
- `src/components/admin/AdminSidebar.tsx` (grupo Balcão)
- `src/hooks/useUserRole.ts` (suportar novos roles)

## 6. Pontos de confirmação

1. **Tela do site (catálogo público)**: já lê de `products.stock`; ao usar funções RPC o estoque cai/sobe e o React Query invalida → site reflete em tempo real ✅
2. **`venda_online`**: dispararemos um movimento automático via trigger em `orders` quando status vira `confirmed/delivered` (complementa `update_stock_on_order_completion` existente) para que toda baixa apareça em Logs.
3. **Painel admin atual de produtos**: continuará permitindo edição de metadados (nome, preço, imagens). Mas o campo `stock` ficará read-only — alterações de estoque só via Balcão/Ajuste. Isso evita bypass.

## Perguntas antes de codar

1. Confirma que **o campo estoque no editor de Produtos do admin deve ficar somente leitura** (passa a ser obrigatório usar Balcão → Ajuste de Estoque)? Sem isso, qualquer admin contornaria a auditoria.
2. Para **exportação PDF/Excel**, posso adicionar as libs `xlsx` e `jspdf` ao projeto?
3. Hoje só existe role `admin`. Quer que eu já **migre o seu usuário atual para `super_admin`** automaticamente, ou prefere configurar manualmente depois?
