# Registro Formal de Warnings de Segurança Aceitos
**Projeto:** FOX VELOUR
**Data:** 30/05/2026
**Responsável técnico:** Matheus Herminio Costa Cardoso
**Origem:** Auditoria OWASP A01 (Broken Access Control) — `BROKEN_ACCESS_CONTROL_AUDIT_2026-05-30.md`

Este documento formaliza os warnings emitidos pelo scanner automatizado de segurança que foram revisados manualmente e considerados **aceitáveis** dentro do modelo de ameaças e do contexto funcional do FOX VELOUR. Todos os itens listados aqui foram avaliados quanto a:

1. Vetor de ataque real
2. Dados ou recursos efetivamente expostos
3. Mitigantes existentes (RLS, SECURITY DEFINER, `search_path`, validações de aplicação)
4. Impacto funcional de qualquer "correção" superficial
5. Conformidade com OWASP / LGPD / ANPD

---

## 1. SECURITY DEFINER functions — **ACEITO**

**Funções:** `has_role`, `export_user_data`, `request_account_deletion`, `validate_discount_code`, `user_purchased_product`, `prevent_consent_modification`, `update_updated_at_column`, `handle_new_user`, `award_referral_points`, demais helpers de referral/2FA.

**Por que o scanner alerta:** funções `SECURITY DEFINER` executam com privilégios do owner e podem, se mal escritas, contornar RLS.

**Por que é aceitável aqui:**
- Todas as funções com efeito sobre dados do usuário verificam `auth.uid()` internamente (ex.: `export_user_data` filtra por `auth.uid()`; `request_account_deletion` insere DSR vinculado ao caller).
- `has_role` é o padrão recomendado pelo Supabase para evitar recursão de RLS em `user_roles` — é justamente o mitigante do anti-pattern, não a vulnerabilidade.
- Todas declaram `SET search_path = public`, eliminando o vetor de search_path hijacking.
- Não há nenhuma função `SECURITY DEFINER` que aceite `user_id` como parâmetro arbitrário sem validação.
- Remover `SECURITY DEFINER` quebraria: leitura de roles (recursão), portabilidade LGPD, validação de cupons, gravação imutável de consentimentos.

**Risco residual:** baixo. Auditável via `pg_proc` + revisão de código.

---

## 2. RLS com `roles: {public}` em vez de `{authenticated}` — **ACEITO**

**Tabelas afetadas:** `profiles`, `saved_addresses`, `security_questions`, `mfa_backup_codes`, `trusted_devices`, `email_verification_codes`, `notification_preferences` (políticas do próprio usuário).

**Por que o scanner alerta:** preferência por explicitar `TO authenticated`.

**Por que é aceitável:** todas essas políticas têm cláusula `auth.uid() = user_id` (ou equivalente), o que torna o efeito idêntico ao `TO authenticated` — usuários anônimos não possuem `auth.uid()` e portanto nunca satisfazem a condição. O comportamento de segurança é o mesmo; o warning é estilístico.

**Risco residual:** nenhum.

---

## 3. Buckets de storage públicos (`avatars`, `banners`, `product-images`, `review-images`) — **ACEITO TEMPORARIAMENTE**

**Por que o scanner alerta:** buckets marcados `public = true` permitem `SELECT`/`LIST` sem autenticação.

**Por que é aceitável hoje:**
- Catálogo, banners e avatares **precisam** ser servíveis publicamente via CDN para anônimos (SEO, performance, compatibilidade com `<img src>`).
- `INSERT/UPDATE/DELETE` em todos eles é restrito por políticas RLS (admins para catálogo/banners; path `auth.uid()/*` para avatares e review-images).
- Não há `.list()` invocado pela aplicação em produção (verificado por busca em `src/`). LIST direta via API exporia apenas nomes de arquivos públicos, não dados sensíveis.

**Próximo passo formal:** análise completa em `BUCKET_IMPACT_ANALYSIS_2026-05-30.md` antes de qualquer restrição.

**Risco residual:** baixo (enumeração de nomes de arquivos públicos).

---

## 4. `product_views` permite INSERT anônimo — **ACEITO**

**Por que:** métrica de visualização de produto, sem PII (`user_id IS NULL` obrigatório para anônimos). Sem essa política, perderíamos analytics de visitantes não logados.

**Risco residual:** flood de inserts — mitigado por rate-limit na borda e ausência de PII.

---

## 5. `rate_limit_tracking` acessível para `anon` (apenas `identifier='anonymous'`) — **ACEITO**

**Por que:** o próprio sistema de rate-limit precisa ser consultável antes do login (login attempts, signup attempts, password reset). A política restringe estritamente à linha `identifier='anonymous'`, sem vazamento entre usuários.

**Risco residual:** nenhum — RLS impede leitura de identificadores de outros usuários.

---

## 6. `settings` com leitura pública para chaves `site_%`, `theme_%`, `store_discount_%` — **ACEITO**

**Por que:** dados de marca, tema visual e desconto global são públicos por design (renderizados no front antes do login). Nenhum segredo, chave de API, ou configuração de pagamento é exposto — políticas filtram explicitamente por prefixo.

**Risco residual:** nenhum.

---

## 7. `coupon_conversions` / `referral_*` gravados via `service_role` — **ACEITO**

**Por que:** edge functions com JWT validado são as únicas responsáveis pela contabilização de pontos/conversões. Usuários nunca escrevem diretamente. RLS de SELECT restringe leitura ao próprio influencer/usuário.

**Risco residual:** nenhum.

---

## Resumo

| # | Item | Severidade scanner | Risco real | Decisão |
|---|------|-------------------|-----------|---------|
| 1 | SECURITY DEFINER | warn | baixo | Aceito |
| 2 | RLS `{public}` com `auth.uid()` | warn | nenhum | Aceito |
| 3 | Buckets públicos | warn | baixo | Aceito (sob análise) |
| 4 | `product_views` anon INSERT | warn | nenhum | Aceito |
| 5 | `rate_limit_tracking` anon | warn | nenhum | Aceito |
| 6 | `settings` leitura pública | warn | nenhum | Aceito |
| 7 | `service_role` em tabelas de referral | warn | nenhum | Aceito |

**Nível de segurança atual: 🟢 ALTO.** Nenhum finding crítico ou alto pendente. A `security-memory` foi atualizada nesta mesma data para refletir estes aceites e evitar reabertura por scanners futuros.
