# Fase 2 — Hardening de Storage (Alternativa A) — Aplicado
**Projeto:** FOX VELOUR
**Data:** 30/05/2026
**Migração:** bloqueio de LIST anônimo nos buckets `avatars`, `banners`, `product-images`, `review-images`.

---

## 1. Alterações aplicadas

Substituídas as 4 políticas `SELECT` que permitiam acesso público (`anon + authenticated`) por políticas restritas a `authenticated`. Como os buckets continuam marcados `public = true`, **downloads via CDN (`/storage/v1/object/public/...`) continuam funcionando normalmente sem autenticação** — esses requests não passam por RLS.

| Bucket | Política antiga (removida) | Política nova (vigente) |
|---|---|---|
| `avatars` | `Avatar images are publicly accessible` — SELECT TO public USING (bucket_id='avatars') | `Avatars: authenticated can list/select` — SELECT TO authenticated USING (bucket_id='avatars') |
| `banners` | `Banner images are publicly accessible` — SELECT TO public | `Banners: authenticated can list/select` — SELECT TO authenticated |
| `product-images` | `Product images are publicly accessible` — SELECT TO public | `Product images: authenticated can list/select` — SELECT TO authenticated |
| `review-images` | `Review images publicly readable` — SELECT TO public | `Review images: authenticated can list/select` — SELECT TO authenticated |

As políticas de `INSERT`, `UPDATE`, `DELETE` permanecem inalteradas (admin-only para banners/products, owner-path para avatars/review-images).

---

## 2. Políticas finais por bucket

### avatars
- **SELECT (authenticated)**: pode listar/selecionar metadados.
- **INSERT (authenticated)**: `bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text` + restrições de mime/size.
- **UPDATE/DELETE (authenticated)**: mesmo path do owner.
- **CDN público**: ✅ ativo (download anônimo continua via `getPublicUrl`).

### banners
- **SELECT (authenticated)**.
- **INSERT/UPDATE/DELETE**: admin-only com `has_role(auth.uid(),'admin')`.
- **CDN público**: ✅ ativo.

### product-images
- **SELECT (authenticated)**.
- **INSERT/UPDATE/DELETE**: admin-only.
- **CDN público**: ✅ ativo.

### review-images
- **SELECT (authenticated)**.
- **INSERT (authenticated)**: path = `auth.uid()::text/...`
- **DELETE (authenticated)**: owner-path.
- **CDN público**: ✅ ativo.

---

## 3. Validação pós-migração

| Verificação | Resultado |
|---|---|
| Busca por `.list(` em `src/` | ✅ 0 ocorrências — nenhuma feature depende de LIST |
| `getPublicUrl` em `ProductImagesField`, `VariantImageField`, `VariantImagesField` | ✅ funciona (CDN) |
| `getPublicUrl` em `AvatarUpload` | ✅ funciona |
| `getPublicUrl` em `BannerFormDialog`, `PromoBannerFormDialog` | ✅ funciona |
| `getPublicUrl` em `ProductReviews` | ✅ funciona |
| Uploads admin (banners, produtos) | ✅ políticas INSERT preservadas |
| Upload de avatar pelo usuário | ✅ política preservada |
| Upload de imagem de review | ✅ política preservada |
| Linter Supabase | 4 warnings residuais `0025_public_bucket_allows_listing` — ver §4 |
| Regressão funcional | ❌ nenhuma identificada |

---

## 4. Warnings residuais do linter

O linter Supabase (regra `0025_public_bucket_allows_listing`) continua emitindo `WARN` para os 4 buckets porque a regra dispara sempre que existe **qualquer** política SELECT em `storage.objects` para um bucket `public=true`, independentemente do role. A política agora restringe a `authenticated`, o que efetivamente bloqueia LIST anônimo — que era o vetor real.

**Decisão:** aceitar este warning. Eliminá-lo exigiria tornar os buckets privados (Alternativa B/C), o que foi avaliado no `BUCKET_IMPACT_ANALYSIS_2026-05-30.md` e considerado fora de escopo desta fase. Registrado em `SECURITY_WARNINGS_ACCEPTED_2026-05-30.md`.

Os outros 59 warnings (SECURITY DEFINER e Leaked Password Protection) são pré-existentes e já estavam aceitos formalmente.

---

## 5. Ganho efetivo de segurança

| Antes | Depois |
|---|---|
| `curl https://<project>.supabase.co/storage/v1/object/list/avatars` retornava JSON com lista de **todos** os arquivos (nomes + metadata) sem autenticação. | Mesmo request retorna `[]` (RLS bloqueia anon). |
| Enumeração de avatares de usuários (vetor de OSINT) | 🟢 Bloqueada |
| Enumeração de imagens internas de produtos/banners ainda não publicados | 🟢 Bloqueada |
| Listagem de fotos de avaliações | 🟢 Bloqueada |
| Download direto por URL conhecida | 🟡 Mantido (necessário ao funcionamento da loja) |

**Resultado:** vetor de enumeração de arquivos eliminado para usuários anônimos sem qualquer impacto funcional. Atacantes precisam agora **descobrir** cada URL individualmente (UUIDs/hashes não enumeráveis).

---

## 6. Próximos passos opcionais (não nesta fase)

- Avaliar Alternativa C para `avatars` e `review-images` (signed URLs longas) — UGC potencialmente mais sensível.
- Reforçar hash de filename para `product-images` (já são UUIDs, sem ganho prático).
- Considerar hotlink protection via CDN para reduzir custo de banda.
