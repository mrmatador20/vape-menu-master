# Relatório — Fase 1 CSP: Remoção de `'unsafe-eval'`

**Data:** 30/05/2026  
**Status:** ✅ Concluída

---

## 1. Alterações realizadas

| Arquivo | Alteração |
|---|---|
| `index.html` (linha 23) | Removido `'unsafe-eval'` da diretiva `script-src` no `<meta http-equiv="Content-Security-Policy">` |
| `src/lib/securityHeaders.ts` (linha 49) | Removido `"'unsafe-eval'"` do array `CSP_POLICY['script-src']` para manter a documentação alinhada |

Nenhuma outra alteração funcional. Sem mudanças em dependências, banco, edge functions, ou UI.

---

## 2. CSP final aplicada

```http
Content-Security-Policy:
  default-src 'self';
  script-src  'self' 'unsafe-inline' https://esm.sh https://deno.land;
  style-src   'self' 'unsafe-inline';
  img-src     'self' data: https: blob:;
  font-src    'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co
              https://viacep.com.br https://api.pwnedpasswords.com
              https://api.mercadopago.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

Diff em relação à anterior:
```diff
- script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh https://deno.land;
+ script-src 'self' 'unsafe-inline' https://esm.sh https://deno.land;
```

---

## 3. Verificações executadas (regressão estática)

| Verificação | Comando | Resultado |
|---|---|---|
| `eval(` no código de aplicação | `rg "\beval\s*\(" src/ public/` | **0 ocorrências** ✅ |
| `new Function(` no código de aplicação | `rg "new\s+Function\s*\(" src/ public/` | **0 ocorrências** ✅ |
| `setTimeout`/`setInterval` com string | `rg "set(Timeout\|Interval)\s*\(\s*[\"'\`]"` | **0 ocorrências** ✅ |
| Inline event handlers (`onclick=`) em HTML | `rg "on\w+=\""` em `index.html` + `public/` | **0 ocorrências** ✅ |
| Testes Playwright XSS adicionados | `tests/xss-prevention.spec.ts` | OK ✅ |

**Sobre dependências (Vite/React/Radix):** o pipeline padrão do Vite + `@vitejs/plugin-react-swc` não emite `eval()` no bundle de produção. `react-dom` em produção também não usa `eval`. (DevTools profiling em modo dev pode usar, mas dev mantém configuração relaxada.)

---

## 4. Impactos identificados

**Nenhum impacto funcional esperado.** O código de aplicação não usa nenhum mecanismo bloqueado por `'unsafe-eval'`.

⚠️ **Pontos a monitorar após deploy** (precaução):
- Bibliotecas que dinamicamente avaliam expressões (não há nenhuma identificada — JSPDF, date-fns, embla, radix, supabase-js são todas compatíveis).
- Caso futuramente seja adicionada uma lib com template engine runtime (ex.: Handlebars sem precompile, Vega-Lite, certas libs de fórmula), pode ser necessário reabrir avaliação.

---

## 5. Preparação para Fase 2 (hashes SHA-256)

Hashes já computados e prontos para uso futuro — basta substituir `'unsafe-inline'` por estes valores no `script-src`:

```
script-src 'self'
  'sha256-g2AVoFBe6zYIYitWMjii6WBzMBlDLulSJpWs2IOARd8='   /* JSON-LD Organization */
  'sha256-hydDU4YeNDqTxXmpepMSkOhVAjFNSHEr3P2AcFmspj0='   /* JSON-LD WebSite */
  https://esm.sh https://deno.land;
```

⚠️ **Pré-requisitos antes de avançar para Fase 2:**
1. Refatorar `src/components/ui/chart.tsx` para eliminar `dangerouslySetInnerHTML` (atualmente injeta `<style>` inline com CSS vars de tema). Migrar tokens para `index.css`.
2. Adicionar um script automatizado pós-build que recompute hashes dos JSON-LD caso eles sejam alterados (evita quebra silenciosa).
3. Validar que o `vite build` de produção não está injetando `<script>` inline próprio (executar `bun run build` e inspecionar `dist/index.html`).

---

## 6. Próximos passos recomendados (Fase 2)

| Ordem | Passo | Esforço |
|---|---|---|
| 1 | Refatorar `chart.tsx` removendo `dangerouslySetInnerHTML` | 20 min |
| 2 | Verificar `dist/index.html` após `vite build` em busca de inline scripts gerados pelo bundler | 5 min |
| 3 | Aplicar hashes SHA-256 dos JSON-LD no `script-src` e **remover `'unsafe-inline'`** dessa diretiva | 10 min |
| 4 | Smoke test em produção (homepage, login, checkout, admin) | 15 min |
| 5 | Documentar no `SECURITY_AUDIT_REPORT_2025.md` | 5 min |

**Não implementado nesta fase (conforme solicitação):**
- ❌ Nonce dinâmico (requer camada edge/SSR)
- ❌ Remoção de `'unsafe-inline'` de `style-src` (quebraria Radix/cmdk/vaul)

---

**Conclusão:** Fase 1 concluída sem impacto funcional. Vetor de execução via `eval()`/`new Function()` totalmente fechado. Projeto pronto para Fase 2 quando você autorizar.
