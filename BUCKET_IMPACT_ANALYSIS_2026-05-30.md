# Análise de Impacto — Buckets Públicos de Storage
**Projeto:** FOX VELOUR
**Data:** 30/05/2026
**Escopo:** `avatars`, `banners`, `product-images`, `review-images`
**Objetivo:** avaliar viabilidade e impacto de restringir `LIST` (e eventualmente `SELECT` anônimo) nos buckets atualmente marcados como `public = true`, **sem aplicar nenhuma alteração** nesta etapa.

---

## 1. Metodologia

1. Busca exaustiva por chamadas à API de Storage do Supabase em todo `src/` (`supabase.storage.from('<bucket>')`).
2. Classificação de cada chamada em: `LIST`, `getPublicUrl`, `upload`, `remove`, `createSignedUrl`, `download`.
3. Mapeamento de páginas/components consumidores.
4. Verificação de URLs públicas referenciadas em HTML, e-mails transacionais, sitemap e JSON-LD.
5. Estimativa de ganho real de segurança vs. risco de indisponibilidade.

---

## 2. Dependências encontradas por bucket

### 2.1 `avatars`
| Arquivo | Operação | Necessita LIST? |
|---|---|---|
| `src/components/AvatarUpload.tsx` (linhas 120, 128, 137) | `remove`, `upload`, `getPublicUrl` | ❌ |

- **Páginas que renderizam:** `Profile`, header do site (avatar do usuário logado).
- **Como o avatar é obtido:** URL pública salva em `profiles.avatar_url`. Cliente faz `<img src="{public-url}">` direto.
- **Conclusão:** **LIST não é utilizado.** Restringir LIST não afeta nenhuma rota.

### 2.2 `banners`
| Arquivo | Operação | Necessita LIST? |
|---|---|---|
| `src/components/admin/BannerFormDialog.tsx` (155, 163) | `upload`, `getPublicUrl` | ❌ |
| `src/components/admin/PromoBannerFormDialog.tsx` (81, 86) | `upload`, `getPublicUrl` | ❌ |

- **Páginas que renderizam:** Home (`Index`), `PromoBanners` admin, banner do topo da loja.
- **Como a imagem é obtida:** coluna `background_image_url` / `image_url` em `banners` / `promo_banners`.
- **Conclusão:** **LIST não é utilizado.**

### 2.3 `product-images`
| Arquivo | Operação | Necessita LIST? |
|---|---|---|
| `src/components/admin/ProductImagesField.tsx` (49, 55) | `upload`, `getPublicUrl` | ❌ |
| `src/components/admin/VariantImageField.tsx` (35, 40) | `upload`, `getPublicUrl` | ❌ |
| `src/components/admin/VariantImagesField.tsx` (110, 115) | `upload`, `getPublicUrl` | ❌ |

- **Páginas que renderizam:** catálogo público, PDP, carrinho, checkout, painel admin de produtos, e-mails de confirmação de pedido.
- **Como a imagem é obtida:** URLs em `products.images[]` e `flavors.image_urls[]`.
- **Conclusão:** **LIST não é utilizado.** Restrição é segura.

### 2.4 `review-images`
| Arquivo | Operação | Necessita LIST? |
|---|---|---|
| `src/components/ProductReviews.tsx` (81, 84) | `upload`, `getPublicUrl` | ❌ |

- **Páginas que renderizam:** seção de avaliações no PDP.
- **Como a imagem é obtida:** `reviews.image_url`.
- **Conclusão:** **LIST não é utilizado.**

> ✅ **Resultado global:** nenhum dos 4 buckets depende de `LIST` em produção. A funcionalidade da aplicação é integralmente baseada em URLs públicas armazenadas em colunas relacionais.

---

## 3. Alternativas mais seguras (do menor ao maior impacto)

### Alternativa A — Restringir apenas LIST (recomendada)
- Manter `SELECT` público (downloads via `getPublicUrl` continuam funcionando).
- Bloquear `LIST` para `anon` via política de storage:
  ```sql
  -- Exemplo (a ser aplicado na Fase 2 deste plano)
  CREATE POLICY "Block anon LIST on <bucket>"
  ON storage.objects FOR SELECT TO anon
  USING (
    bucket_id = '<bucket>'
    -- requer cabeçalho de listagem ausente; ou usar policies separadas para .list()
  );
  ```
  Observação: o Supabase usa o mesmo endpoint `SELECT` para LIST e download. A restrição efetiva de LIST exige política baseada em **prefixo de caminho** ou migração para `private` + signed URLs (Alternativa B/C).

### Alternativa B — Tornar buckets privados com URLs assinadas de longa duração
- `public = false`; geração de signed URLs com TTL longo (ex.: 7 dias) no servidor.
- Vantagem: enumeração 100% bloqueada.
- Custo: necessário pré-gerar URLs em SSR/edge ou criar endpoint proxy; quebra de cache de CDN se o TTL for curto.
- Impacto: **alto** — refatoração em todos os componentes que usam `getPublicUrl`, e revalidação periódica no cliente.

### Alternativa C — CDN + signed URLs imutáveis
- Buckets privados + edge function que retorna signed URL com expiração ≥ 30 dias para conteúdo imutável (review/product images nunca mudam de nome).
- Vantagem: melhor balanço segurança × performance.
- Custo: implementar função `get-asset-url`, revalidar em deploys.
- Impacto: **médio-alto**.

### Alternativa D — Status quo + monitoramento
- Manter público, instrumentar logs de acesso à API `/storage/v1/object/list` e alertar.
- Vantagem: zero risco operacional.
- Custo: nenhum.
- Ganho de segurança: nenhum sobre o estado atual.

---

## 4. Estratégia de migração sem indisponibilidade (caso Alternativa A/B seja aprovada)

1. **Janela 0 — preparação (sem efeito visível):**
   - Documentar todas as URLs já emitidas (`products.images`, `flavors.image_urls`, `banners.*_url`, `reviews.image_url`, `profiles.avatar_url`).
   - Confirmar que o CDN tem cache válido (HIT rate >95%).

2. **Janela 1 — política dupla (LIST bloqueado, SELECT mantido):**
   - Aplicar política `TO anon` que nega LIST mantendo `getObject` (Alternativa A).
   - Monitorar logs de erro 403 por 7 dias.

3. **Janela 2 (opcional, Alternativa B/C) — migração para privado:**
   - Adicionar coluna `signed_url_expires_at` nas tabelas relevantes.
   - Backfill de signed URLs via job batch.
   - Deploy de edge function `refresh-asset-url`.
   - Trocar `getPublicUrl` por `createSignedUrl` em todos os components em PR único atrás de feature flag.
   - Rollback: reativar `public = true` em 1 SQL.

4. **Janela 3 — limpeza:** remover suporte a `getPublicUrl`.

---

## 5. Ganho real de segurança esperado

| Alternativa | Enumeração de arquivos | Hotlink de imagens | Privacidade de avatares/reviews | Esforço |
|---|---|---|---|---|
| A — Bloquear LIST | 🟢 Bloqueada | 🔴 Ainda possível | 🟡 Inalterada (URLs permanecem públicas) | Baixo (1h) |
| B — Privado + signed URL curta | 🟢 Bloqueada | 🟢 Mitigada | 🟢 Forte (URLs expiram) | Alto (1-2 dias) |
| C — Privado + signed URL longa | 🟢 Bloqueada | 🟡 Parcial | 🟡 Média | Médio (4-6h) |
| D — Status quo | 🔴 Aberta | 🔴 Aberta | 🟡 URL é o segredo | Zero |

**Recomendação técnica:** Alternativa A imediatamente (ganho concreto contra enumeração com risco operacional ≈ 0, dado que LIST não é usado), com possibilidade futura de migrar avatares e review-images para Alternativa C (esses dois carregam UGC potencialmente sensível; produtos e banners não precisam).

---

## 6. Próximos passos

1. Aguardar aprovação explícita da Alternativa (A, B, C ou D) por parte do controlador.
2. Após aprovação, gerar migração SQL específica, aplicar em janela de baixo tráfego, validar smoke-tests:
   - Home renderiza banners.
   - PDP renderiza imagens de produto e variantes.
   - Reviews renderizam fotos.
   - Avatar aparece no header.
   - Admin consegue fazer upload.
3. Rodar nova auditoria após a alteração e atualizar `security-memory` + `SECURITY_WARNINGS_ACCEPTED_2026-05-30.md` removendo o item "sob análise".

**Nenhuma alteração de schema ou política foi aplicada nesta etapa.**
