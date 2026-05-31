# Relatório de Segurança — Gerenciamento de Documentos Legais

**Data:** 31 de maio de 2026
**Escopo:** Implementação do CRUD versionado de Política de Privacidade e Termos de Uso pelo painel administrativo + fluxo de reaceite obrigatório integrado à LGPD.

## 1. Resumo das alterações

### Banco de dados (migração)
- Nova tabela `public.legal_documents` (id, doc_type, version, content, change_summary, is_current, published_by, published_at, created_at), com `UNIQUE(doc_type, version)`.
- Índices: parcial em `is_current=true` por tipo + histórico ordenado.
- GRANTs: SELECT para `anon/authenticated` (transparência), INSERT/UPDATE para `authenticated` (filtrado por RLS), ALL para `service_role`.
- RLS ativada:
  - SELECT público (conteúdo não é sensível e versões antigas devem permanecer auditáveis).
  - INSERT apenas para admins (`has_role(auth.uid(),'admin')`) e `published_by = auth.uid()`.
  - UPDATE apenas para admins.
  - DELETE: nenhuma policy → bloqueado por padrão.
- Trigger `prevent_legal_doc_tampering`: bloqueia DELETE e qualquer UPDATE que altere campos além de `is_current` (conteúdo é imutável).
- Funções `SECURITY DEFINER` (search_path travado em `public`):
  - `publish_legal_document(doc_type, version, content, summary)` — valida admin, tamanho mínimo, troca `is_current` atomicamente, grava `user_activity_logs` com severity `warning`.
  - `rollback_legal_document(version_id, new_version)` — cria nova entrada copiando o conteúdo antigo (preserva histórico), audita.
  - `user_needs_legal_reaccept()` — retorna documentos com versão vigente diferente da última aceita pelo usuário.

### Frontend
- Hook `src/hooks/useLegalDocuments.ts` — leituras (versão atual + histórico) + mutations protegidas por RPC.
- Página admin `src/pages/admin/LegalDocuments.tsx`:
  - Abas para Política de Privacidade e Termos de Uso.
  - Editor com versão sugerida automaticamente (incremento minor).
  - **Exige 2FA via `useAAL2Guard` antes de publicar ou fazer rollback** (`MFAVerificationGate`).
  - Histórico completo, visualização modal de qualquer versão antiga, botão de rollback.
  - Sanitização do resumo via `sanitizeUserText` (DOMPurify).
- Componente `src/components/LegalReacceptDialog.tsx` — diálogo bloqueante (sem fechamento por overlay) que aparece após login se `user_needs_legal_reaccept` retornar pendências. Registra o novo aceite em `user_consents` ou faz signOut.
- Páginas públicas `PrivacyPolicy` e `TermsOfUse` agora renderizam o conteúdo vigente do banco como texto literal (`<pre whitespace-pre-wrap>`), com fallback estático enquanto não há versão publicada.
- `AdminSidebar` ganhou a entrada "Documentos Legais" no grupo Sistema.
- Rota `/546498@18/legal-documents` adicionada em `App.tsx`.
- `LegalReacceptDialog` montado globalmente.

## 2. Controles de segurança aplicados

| Vetor | Mitigação |
|------|-----------|
| Acesso indevido à edição | Rota protegida por `ProtectedRoute` + `useUserRole`. RLS exige `has_role(...,'admin')` em INSERT/UPDATE e nas RPCs. |
| Publicação sem 2FA | `useAAL2Guard.verifyAAL2('publish_legal_<type>')` antes de cada publish/rollback. |
| XSS armazenado | Conteúdo é renderizado como texto literal (`<pre>` com `whitespace-pre-wrap`), nunca via `dangerouslySetInnerHTML`. Resumo passa por DOMPurify. |
| SQLi / IDOR | Toda escrita usa RPC `SECURITY DEFINER` com checagem `auth.uid()` e `has_role`. Não há query construída dinamicamente. |
| Adulteração / apagamento de histórico | Trigger `prevent_legal_doc_tampering` bloqueia DELETE e mudanças em qualquer campo imutável. Sem policy DELETE. |
| Replay de aceite antigo | `user_needs_legal_reaccept` compara `consent_version` com `legal_documents.version` atual. Novo aceite é gravado em `user_consents` (tabela já imutável via `prevent_consent_modification`). |
| Auditoria | Cada publish/rollback grava em `user_activity_logs` com severity `warning`, `resource_type='legal_document'`, e payload com tipo/versão/resumo. Logs são imutáveis (`prevent_audit_log_modification`). |

## 3. Conformidade LGPD

- **Art. 8º §5º** — Aceite explícito e por escrito: cada versão é registrada em `user_consents.consent_version` com IP/user-agent.
- **Art. 9º** — Direito de acesso à versão vigente: páginas públicas exibem versão e data, e histórico inteiro é legível.
- **Art. 37 / 38** — Registro de operações: publicação e rollback geram log auditável que sobrevive 5 anos (retention da tabela `user_activity_logs`).

## 4. Riscos residuais aceitos

- Conteúdo dos documentos é **lido publicamente** (anon SELECT) — intencional, pois política e termos devem ser sempre acessíveis sem login.
- Editor é texto puro (sem WYSIWYG/Markdown rendering) — escolha de design para zerar a superfície de XSS armazenado. Pode ser substituído por um renderizador Markdown sanitizado depois, se necessário.

## 5. Passos pós-deploy

1. Acessar **Admin → Sistema → Documentos Legais**.
2. Publicar a primeira versão de cada documento (versão sugerida: `1.0`).
3. A partir do próximo login, novos usuários ou usuários com versão desatualizada verão o diálogo de reaceite obrigatório.

**Status final:** 🟢 Implementação concluída. Sem vulnerabilidades introduzidas.
