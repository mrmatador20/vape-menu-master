## Refatoração completa do Admin de Produtos

Transformar o cadastro/listagem de produtos em um painel profissional escalável, com gestão visual de categorias/subcategorias, modal em abas e variantes em tabela com gerador de combinações.

---

### 1. Banco de dados (migration)

- Criar tabela `subcategories` (id, name, category_id, display_order) — categorias já existem em `categories`.
- Adicionar colunas em `flavors`:
  - `sku` (text, opcional)
  - `size` (text, opcional) — separar tamanho/cor para gerar combinações
- Backfill: popular `categories` e `subcategories` a partir de `products.category` / `products.subcategory` distintos.
- Manter `products.category` / `products.subcategory` como texto (compatibilidade) — sincronizar via select pelos nomes da tabela.

### 2. Hooks novos

- `useCategories` — lista categorias + contagem de produtos (join client-side).
- `useSubcategories(categoryId)` — subcategorias da categoria selecionada + contagem.
- Atualizar `useFlavors` para incluir novos campos.

### 3. Painel de Categorias e Subcategorias

Nova página `src/pages/admin/Categories.tsx` (rota `/admin/categories`, link na sidebar) com:
- Lista visual de categorias (card com nome, contagem, ações).
- Drag handle para reordenar (`display_order`).
- Inline edit, criar, excluir (com confirmação se houver produtos).
- Painel lateral mostrando subcategorias da categoria selecionada (mesmo padrão).
- Busca instantânea.

Substituir `CategoriesSettings.tsx` por link para esta página.

### 4. Modal de produto (`ProductFormDialog`) — novo layout em abas

Largura `max-w-4xl`. `Tabs` verticais à esquerda em desktop:
1. **Informações básicas** — nome, descrição, preço, posição.
2. **Categorização** — Combobox pesquisável de categoria (com botão "+ nova"), Combobox de subcategoria filtrado (com "+ nova").
3. **Imagens** — `ProductImagesField` existente, mantido.
4. **Estoque** — estoque, alerta mínimo, visibilidade.
5. **Variantes** — só habilitada após criar o produto (precisa de id).
6. **Descontos** — tipo + valor.

### 5. Variantes — tabela e gerador

Nova UI dentro da aba Variantes:
- Tabela com colunas: Tamanho, Cor (swatch), SKU, Estoque, Preço, Ações (editar, duplicar, excluir).
- Busca por SKU/nome.
- Botão **"Gerar combinações"** abre dialog: o usuário lista tamanhos (chips) e cores (chips com cor hex). Sistema gera todas as combinações Tamanho×Cor com estoque/preço padrão e SKU autoincremental.
- Botão **Duplicar** clona linha.
- Manter `FlavorFormDialog` para edição manual avançada.

### 6. Listagem (`pages/admin/Products.tsx`)

- Filtros adicionados acima da tabela: Categoria, Subcategoria (depende de categoria), Estoque (todos / em estoque / baixo / esgotado), Promoção (com/sem), Visibilidade.
- Busca por nome/sku/categoria.
- Ordenação por colunas (nome, preço, estoque, posição).
- Paginação client-side (20/pg).
- Cards de KPI no topo: Total, Em estoque, Estoque baixo, Esgotados, Em promoção.
- Visual mais premium (espaçamento, badges, tipografia).

### 7. Visual — paleta Fox Velour

Usar tokens já existentes (`--primary` dourado, `background` branco gelo, `foreground` preto suave). Sem novas cores hardcoded — apenas refinar espaçamento/sombras via classes utilitárias.

---

### Arquivos criados
- `supabase/migrations/...sql`
- `src/hooks/useCategories.ts`
- `src/hooks/useSubcategories.ts`
- `src/pages/admin/Categories.tsx`
- `src/components/admin/CategoryCombobox.tsx`
- `src/components/admin/SubcategoryCombobox.tsx`
- `src/components/admin/VariantsTable.tsx`
- `src/components/admin/GenerateVariantsDialog.tsx`

### Arquivos editados
- `src/components/admin/ProductFormDialog.tsx` (reestrutura em abas)
- `src/pages/admin/Products.tsx` (filtros, KPIs, paginação)
- `src/components/admin/AdminSidebar.tsx` (link Categorias)
- `src/App.tsx` (rota)
- `src/hooks/useFlavors.ts` (novos campos)
- `src/components/admin/FlavorFormDialog.tsx` (campos sku/size)

### Fora de escopo (a confirmar depois)
- SEO por produto (slug/meta) — mencionado mas exige colunas extras; posso adicionar em follow-up.
- Compressão automática de imagens no client (libs adicionais).
- Ícone/cor por categoria — adicionar como follow-up se desejar.
