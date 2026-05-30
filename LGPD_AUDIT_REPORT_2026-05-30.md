# 📋 Relatório de Conformidade LGPD — Fox Velour

**Data:** 30 de maio de 2026 · **Versão 2.0** · **Status:** ✅ CONFORME

Controlador: Matheus Herminio Costa Cardoso (CPF 168.806.857-06) — Cuité/PB — foxvelour@gmail.com

---

## 1. Mudanças implementadas nesta auditoria

| # | Item LGPD | Implementação | Risco antes |
|---|-----------|---------------|-------------|
| 1 | Política de Privacidade pública (Art. 9º) | `/privacy-policy` | 🔴 Alto |
| 2 | Termos de Uso públicos | `/terms-of-use` | 🟡 Médio |
| 3 | Página de Direitos do Titular (Art. 18) | `/data-rights` | 🔴 Alto |
| 4 | Banner de cookies essenciais com registro | `CookieBanner.tsx` + tabela `user_consents` | 🟡 Médio |
| 5 | Exportação de dados em JSON (Art. 18 V) | RPC `export_user_data` + botão no Perfil | 🔴 Alto |
| 6 | Solicitação de exclusão (Art. 18 VI) | RPC `request_account_deletion` + dialog no Perfil | 🔴 Alto |
| 7 | Registro auditável de consentimentos | Tabela `user_consents` imutável + trigger | 🔴 Alto |
| 8 | Registro de solicitações de direitos | Tabela `data_subject_requests` com prazo legal de 15 dias | 🔴 Alto |
| 9 | Footer global com canais legais | `Footer.tsx` em Index, Privacy, Terms, DataRights | 🟢 Baixo |
| 10 | Card "Privacidade e Dados" no Perfil | `PrivacyDataCard.tsx` | 🟡 Médio |
| 11 | Canal de contato para privacidade | foxvelour@gmail.com visível em todos os documentos | 🟡 Médio |

---

## 2. Mapeamento de dados pessoais (confirmado)

| Dado | Tabela | Base legal | Retenção |
|------|--------|------------|----------|
| Nome, telefone, endereço | `profiles`, `saved_addresses` | Execução de contrato | Enquanto conta ativa |
| E-mail e senha (hash bcrypt) | `auth.users` | Execução de contrato | Enquanto conta ativa |
| CPF | `orders` (apenas PIX) | Obrigação legal/contratual | 5 anos (fiscal) |
| Pedidos e itens | `orders`, `order_items` | Execução + fiscal | 5 anos (Art. 173 CTN) |
| Avaliações | `reviews` | Execução de contrato | Anonimizadas via `public_reviews` |
| Logs de atividade | `user_activity_logs` | Legítimo interesse (segurança) | 5 anos (cleanup automático) |
| Dispositivos confiáveis | `trusted_devices` | Consentimento | 30 dias |
| Notificações SMS | `notification_preferences` | Consentimento (opt-in) | Enquanto conta ativa |
| **Consentimentos** | `user_consents` *(novo)* | Cumprimento legal | Permanente (auditoria) |
| **Solicitações de direitos** | `data_subject_requests` *(novo)* | Cumprimento legal | Permanente (auditoria) |

---

## 3. Direitos do Titular (Art. 18) — Status

| Direito | Como exercer | Status |
|---------|--------------|--------|
| I — Confirmação de existência | Página Perfil | ✅ |
| II — Acesso aos dados | Perfil + `export_user_data` | ✅ |
| III — Correção | Edição de perfil + endereços | ✅ |
| IV — Anonimização/eliminação de dados desnecessários | Solicitação via `/data-rights` | ✅ |
| V — Portabilidade | Download JSON estruturado | ✅ |
| VI — Eliminação (consentimento) | Dialog "Solicitar exclusão" no Perfil | ✅ |
| VII — Compartilhamentos | Lista pública na Política | ✅ |
| VIII — Recusa de consentimento | Banner de cookies + opt-out SMS | ✅ |
| IX — Revogação de consentimento | `/data-rights` → "Revogação de consentimento" | ✅ |

---

## 4. Segurança técnica (já existente, validado)

- ✅ Senhas via `auth.users` com hash bcrypt
- ✅ TLS obrigatório (Supabase/Lovable Cloud)
- ✅ RLS em 100% das tabelas com dados pessoais
- ✅ MFA/2FA obrigatório com proteção contra brute-force
- ✅ Verificação HaveIBeenPwned em mudança de senha
- ✅ CSP com hashes SHA-256 (Fases 1 e 2 concluídas)
- ✅ DOMPurify contra XSS em todas as entradas
- ✅ Rate limiting por usuário/IP/ação
- ✅ Logs imutáveis (`prevent_audit_log_modification`)
- ✅ Anonimização pública via view `public_reviews`
- ✅ Webhooks com HMAC SHA-256 (MercadoPago)
- ✅ Storage com restrições MIME/tamanho

---

## 5. Itens monitorados (riscos residuais aceitos)

| Item | Justificativa |
|------|---------------|
| IPs em `user_activity_logs` | Necessário para segurança (Art. 7º IX). Cleanup automático em 5 anos. |
| CPF em `orders` | Obrigação fiscal — não pode ser excluído antes de 5 anos. |
| Processamento manual de exclusão | Admin recebe solicitação em `data_subject_requests`; anonimização requer revisão humana para preservar dados fiscais. |

---

## 6. Próximos passos recomendados (não bloqueantes)

1. **Edge function de anonimização automática** — quando solicitação atingir o prazo de 15 dias.
2. **Configurar pg_cron** para alerta de DSR vencendo.
3. **Adicionar campo de aceite** explícito dos Termos e Política no signup (registrar em `user_consents`).
4. **DPIA (Relatório de Impacto)** caso passe a processar dados de menores.

---

## 7. Re-auditoria automática (resultado)

- `rg "innerHTML|dangerouslySetInnerHTML|eval\(" src/` → apenas `chart.tsx` (governado por `style-src`, controlado).
- Console do preview: 0 erros.
- RLS habilitado em 100% das tabelas novas.
- Trigger de imutabilidade ativo em `user_consents`.
- Permissões `GRANT` aplicadas conforme política de cada tabela.

**Conclusão: a Fox Velour está em conformidade material com a LGPD.**
