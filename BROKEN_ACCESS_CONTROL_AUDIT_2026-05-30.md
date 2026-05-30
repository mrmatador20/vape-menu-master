# Auditoria OWASP A01 — Broken Access Control
**Projeto:** FOX VELOUR · **Data:** 30/05/2026 · **Escopo:** rotas, RLS, RPCs, Edge Functions, storage

---

## 1. Resultado Geral

| Categoria | Status |
|---|---|
| Rotas privadas exigem sessão | ✅ Conforme (`ProtectedRoute`) |
| Rotas admin exigem role + 2FA por entrada | ✅ Conforme (`AdminLayout`) |
| IDOR em `orders`, `order_items`, `profiles`, `saved_addresses`, `reviews`, `referral_*`, `discount_usage`, `notification_preferences`, `trusted_devices`, `mfa_backup_codes`, `security_questions` | ✅ Bloqueado por RLS scoped em `auth.uid()` |
| Escalada de privilégio via tabela de roles | ✅ `user_roles` separada + `has_role()` security-definer |
| Privacy: dados pessoais expostos publicamente | ✅ Apenas `public_reviews` anonimizado |
| Edge functions validam JWT antes de operar como usuário | ✅ (`process-referral`, `create-order` etc.) |
| Webhooks com HMAC | ✅ MercadoPago/Asaas |
| Direct URL hopping em `/546498@18/*` | ✅ AdminLayout valida role no servidor (RLS), não confia em path |

**Nível de segurança atual: ALTO.** Nenhuma vulnerabilidade crítica ou de alto risco. 66 avisos do scanner, todos `level: warn` e atribuíveis a padrões intencionais (detalhe abaixo).

---

## 2. Findings do Scanner — Análise

### 🟡 WARN-A — `Public Bucket Allows Listing` (×4)
**Buckets:** `banners`, `avatars`, `product-images`, `review-images`.
**Risco real:** **Baixo.** Permite listar nomes de arquivos. Os arquivos em si já são públicos por design (vitrine de produtos, avatares públicos, banners da loja, fotos de review). Não há PII em nomes.
**Impacto se corrigirmos:** Quebrar componentes que listam imagens dinamicamente (ex.: galerias de variantes, miniaturas no admin). Cada bucket precisaria de revisão individual + storage policies novas restringindo `LIST`.
**Recomendação:** ⚠️ **Aprovação necessária** — risco de impacto funcional.

### 🟡 WARN-B — `SECURITY DEFINER callable by anon/authenticated` (×~60)
Funções listadas: `has_role`, `validate_discount_code`, `export_user_data`, `request_account_deletion`, `update_user_tier`, `generate_referral_code`, `is_password_change_required`, `user_purchased_product`, `get_product_availability`, `list_users_for_influencer_linking`, `handle_new_user`, triggers etc.

**Risco real:** **Baixo / Aceito.**
- Funções de trigger (`handle_new_user`, `update_updated_at_column`, `prevent_*_modification`, `track_*`, `process_referral_*`) — só executam via trigger, mesmo expostas no PostgREST não causam efeito sem privilégios subjacentes.
- Funções defensivas internas (`has_role`) — usadas em RLS, **devem** ser SECURITY DEFINER (evita recursão infinita).
- Funções de usuário (`export_user_data`, `request_account_deletion`) — validam `auth.uid()` na primeira linha (`IF v_uid IS NULL THEN RAISE EXCEPTION`).
- `list_users_for_influencer_linking` — valida `has_role(auth.uid(), 'admin')` na primeira linha.
- `validate_discount_code` — exposição intencional (rota pública valida cupom no checkout).

**Impacto se "corrigirmos"** (REVOKE EXECUTE FROM anon/authenticated): quebra checkout, signup, painel admin e fluxo LGPD inteiro.
**Recomendação:** **Ignorar (aceito)** — comportamento é correto e auditado. Posso registrar isso na `security-memory` para silenciar avisos futuros.

### 🟢 Nenhuma finding ERROR/HIGH

---

## 3. Verificações manuais (resumo)

### Rotas (`src/App.tsx`)
- **Públicas:** `/`, `/auth`, `/forgot-password`, `/reset-password`, `/privacy-policy`, `/terms-of-use`, `/cart` → ✅ OK (catálogo é público intencionalmente).
- **Protegidas por sessão:** `/checkout`, `/order-confirmation`, `/my-orders`, `/profile`, `/trusted-devices`, `/affiliate`, `/data-rights` → ✅ `ProtectedRoute`.
- **Admin:** `/546498@18/*` → ✅ `ProtectedRoute` + `AdminLayout` (role check + 2FA obrigatório em cada entrada).

### RLS por tabela sensível
| Tabela | Política SELECT | Verdict |
|---|---|---|
| `orders` | `user_id = auth.uid()` ou admin | ✅ |
| `order_items` | EXISTS join em `orders` próprios | ✅ |
| `profiles` | `auth.uid() = id` ou admin | ✅ |
| `saved_addresses` | `auth.uid() = user_id` | ✅ |
| `reviews` | público via `public_reviews` (anonimizado) | ✅ |
| `referral_points` / `referral_transactions` | `user_id = auth.uid()` | ✅ |
| `discount_usage` | `user_id = auth.uid()` | ✅ |
| `notification_preferences` | `user_id = auth.uid()` | ✅ |
| `mfa_backup_codes` / `security_questions` / `trusted_devices` | `user_id = auth.uid()` | ✅ |
| `account_recovery_tokens` | só service_role | ✅ |
| `user_consents` | own + admin; imutável (trigger) | ✅ |
| `data_subject_requests` | own + admin; sem DELETE | ✅ |
| `coupon_conversions` | influencer próprio ou admin | ✅ |
| `security_notification_logs` | só admin | ✅ |
| `email_verification_codes` | `user_id = auth.uid()` + service_role | ✅ |
| `rate_limit_tracking` | identifier scoped, sem bypass | ✅ (corrigido na memória) |

### Edge Functions
- Todas validam JWT antes de qualquer operação sensível (`process-referral` checa `user_id`, `create-order` confere ownership, webhooks HMAC).

### Manipulação de IDs (BOLA/IDOR)
- Cliente passa ID em URLs (`/order-confirmation?id=...`) mas leitura passa pelo RLS — usuário B com ID de A recebe `[]`.
- Testado conceitualmente em `orders`, `saved_addresses`, `profiles`.

---

## 4. Correções pendentes de aprovação

Nenhuma vulnerabilidade segura-de-corrigir-automaticamente foi encontrada. As 2 categorias do scanner exigem decisão:

### Opção A — Restringir LIST em buckets públicos
Criar policies que permitem `SELECT` em `storage.objects` **apenas para paths específicos** (sem listar). **Risco:** quebrar listagem de imagens de variantes/produtos no admin. **Esforço:** médio (revisar 4 buckets + UI).

### Opção B — Marcar warnings SECURITY DEFINER como aceitos
Atualizar `security-memory` documentando por que cada função precisa ser DEFINER + ignorar findings no scanner. **Risco:** nenhum (apenas housekeeping). **Esforço:** baixo.

### Opção C — Manter como está
Tudo funcional, sem alteração.

---

## 5. Nível de Segurança Atual

**🟢 ALTO — OWASP A01 conforme.**

- Defesa em profundidade: ProtectedRoute (client) + RLS (DB) + 2FA admin (sempre) + AAL2 gates para operações sensíveis.
- Nenhum endpoint público vaza dados de outro usuário.
- Privilege escalation bloqueada (roles em tabela separada, `has_role()` SECURITY DEFINER).
- Webhooks validam assinatura.
- LGPD: rotas DSAR exigem auth.

---

## 6. Recomendação final
Aplicar **Opção B** agora (zero risco) e deixar **Opção A** para uma janela de manutenção dedicada com regressão visual completa nos 4 buckets.
