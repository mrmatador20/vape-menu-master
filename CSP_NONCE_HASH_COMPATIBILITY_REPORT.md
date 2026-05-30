# Relatório de Compatibilidade — CSP Baseada em Nonce/Hash

**Data:** 30/05/2026  
**Escopo:** Avaliar impacto de remover `'unsafe-inline'` e `'unsafe-eval'` da CSP atual e migrar para nonce/hash.

---

## 1. CSP atual (resumida)

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh https://deno.land;
style-src  'self' 'unsafe-inline';
```

Os dois `'unsafe-*'` são o que queremos remover.

---

## 2. Inventário de pontos sensíveis encontrados no projeto

| # | Local | Tipo | Risco se ativarmos nonce/hash | Mitigação |
|---|---|---|---|---|
| 1 | `index.html` linhas 52 e 61 | 2 blocos `<script type="application/ld+json">` (SEO/Schema.org) | **Bloqueados** sem `'unsafe-inline'` | Adicionar `nonce="__CSP_NONCE__"` ou hash SHA-256 |
| 2 | `index.html` linha 73 | `<script type="module" src="/src/main.tsx">` | OK — é script externo (same-origin) | Nenhuma — coberto por `'self'` |
| 3 | `src/components/ui/chart.tsx` (l. 75) | `dangerouslySetInnerHTML` injetando `<style>` inline com CSS vars de tema | **Bloqueado** sem `'unsafe-inline'` em `style-src` | Refatorar para `<style nonce={...}>` ou aplicar `--var` direto no elemento via `style={{ ... }}` |
| 4 | ~25 componentes com `style={{ ... }}` inline (ProductCard, Banner, Chart, Sidebar, etc.) | Atributo `style` inline em JSX | **Não bloqueado** — atributos `style` são permitidos por padrão e **não** exigem `'unsafe-inline'` em CSPs Level 3 modernas | Nenhuma |
| 5 | Vite dev server (`mode=development`) | Injeta HMR client + scripts inline para reload | **Quebra dev** se a CSP for estrita | Manter CSP relaxada em dev / strict só em produção |
| 6 | Lovable preview/tagger (`componentTagger` plugin) | Injeta marcação inline durante dev | **Quebra preview** se strict for aplicada em dev | Idem — só em build de produção |
| 7 | `eval` / `new Function` | **0 ocorrências** | — | `'unsafe-eval'` pode ser removido sem impacto direto |
| 8 | Workers / Service Worker (`public/service-worker.js`) | External same-origin | OK | Nenhuma |
| 9 | Edge functions externas (`esm.sh`, `deno.land`) | Whitelist atual | OK — não é inline | Manter no `script-src` |

> Nenhum uso de `eval`, `new Function`, `setTimeout("string")`, `javascript:`, ou `document.write` foi localizado no código de aplicação.

---

## 3. Impactos por opção

### Opção A — CSP com **hash** (mais simples, sem build customizado)

- Calcula-se o SHA-256 de cada `<script>`/`<style>` inline e adiciona em `script-src 'sha256-...'`.
- **Prós:** estático, funciona sem servidor.
- **Contras:**
  - Cada alteração nos blocos JSON-LD ou no `<style>` do chart **quebra produção** até atualizar os hashes.
  - Vite injeta um pequeno bloco inline no `index.html` durante o build (preload + module shim em alguns plugins) → precisa hash atualizado a cada build (automatizável via plugin Vite).
- **Esforço:** Médio. Requer plugin `vite-plugin-csp` ou script post-build.

### Opção B — CSP com **nonce** (mais robusto, requer renderização dinâmica)

- Servidor (ou Edge/CDN) gera nonce único por request e injeta em `<script nonce>`, `<style nonce>` e no header CSP.
- **Prós:** robusto a alterações de conteúdo.
- **Contras:**
  - **Hospedagem atual é estática** (HostGator + Lovable preview). Nonce exige renderização dinâmica → seria necessário:
    - Edge function/middleware (Cloudflare Worker, Netlify Edge, etc.) para reescrever HTML por request.
    - Ou SSR/Vite SSR — mudança arquitetural significativa.
- **Esforço:** Alto. Requer mudança de hospedagem ou camada edge.

### Opção C — Híbrida (recomendada)

1. Mover o CSS do `chart.tsx` para tokens CSS já existentes em `index.css` (eliminar o `dangerouslySetInnerHTML`).
2. Manter os JSON-LD inline mas via **hash SHA-256** (são estáticos, raramente mudam).
3. Remover `'unsafe-eval'` imediatamente (sem impacto).
4. Manter `style-src 'unsafe-inline'` por mais um ciclo (necessário pelo Radix UI/shadcn que injetam `<style>` dinâmicos em runtime — pode quebrar dialogs, tooltips, scroll-area, sidebar).
5. Aplicar CSP estrita **apenas em produção** (`build` mode); manter relaxada em `dev`.

---

## 4. Bibliotecas que injetam `<style>` dinâmico em runtime

Estas **quebram com `style-src` estrito sem nonce** e são amplamente usadas no projeto:

- `@radix-ui/*` (Dialog, Popover, Select, Tooltip, ScrollArea, Sidebar) — usa `react-remove-scroll` que injeta `<style>` para bloqueio de scroll.
- `embla-carousel-react` — sem injeção runtime, OK.
- `cmdk`, `vaul`, `sonner` — injetam `<style>` na primeira montagem.
- `lovable-tagger` (apenas dev) — inline scripts.

**Conclusão:** Remover `'unsafe-inline'` de `style-src` **vai quebrar a UI** (dropdowns, modais, sidebar) a menos que se use nonce dinâmico OU `style-src-elem 'self' 'unsafe-inline'` mantido enquanto `style-src-attr` é restringido.

---

## 5. Recomendação final

Implementar em **3 fases**, começando pelo de menor risco:

| Fase | Ação | Risco | Ganho de segurança |
|---|---|---|---|
| 1 | Remover `'unsafe-eval'` do `script-src` | Muito baixo (0 usos) | Médio — fecha vetor de `eval()` |
| 2 | Refatorar `chart.tsx` para eliminar `dangerouslySetInnerHTML` + adicionar hashes SHA-256 dos 2 JSON-LD; remover `'unsafe-inline'` de `script-src` | Médio (validar build pipeline) | **Alto** — bloqueia injeção de `<script>` |
| 3 | Migrar para nonce em `script-src` e `style-src` via edge middleware | Alto (mudança arquitetural) | Alto — defesa completa |

**Não recomendado por ora:** remover `'unsafe-inline'` de `style-src` sem nonce dinâmico — quebra Radix/shadcn.

---

## 6. Próximos passos sugeridos

Aguardo sua aprovação para:
- [ ] **Fase 1** apenas (remover `'unsafe-eval'`) — seguro, posso aplicar agora.
- [ ] **Fase 1 + 2** (refator chart + hashes) — preciso ~30 min de implementação e testes em produção.
- [ ] **Fase 3** (nonce dinâmico) — requer decisão sobre camada edge / hospedagem.
